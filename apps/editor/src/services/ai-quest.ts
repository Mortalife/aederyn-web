import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import * as fs from "fs/promises";
import * as path from "path";
import type { WorldBible, Item, NPC, Tile } from "@aederyn/types";
import { repository } from "../repository/index.js";
import {
  PubSub,
  QUEST_GEN_STARTED,
  QUEST_GEN_PROGRESS,
  QUEST_GEN_REVIEW_REQUIRED,
  QUEST_GEN_REVIEW_COMPLETED,
  QUEST_GEN_ENTITY_CREATED,
  QUEST_GEN_COMPLETED,
  QUEST_GEN_FAILED,
  QUEST_GEN_CANCELLED,
} from "../sse/pubsub.js";
import { isAIConfigured } from "./ai-service.js";
import {
  QuestOutlaySchema,
  EntityPlanSchema,
  GeneratedItemSchema,
  GeneratedNPCSchema,
  GeneratedLocationSchema,
  QuestGenerationStateSchema,
  QuestGenerationRegistrySchema,
  type QuestGenerationState,
  type QuestGenerationRegistry,
  type QuestOutlay,
  type EntityPlan,
  type GeneratedItem,
  type GeneratedNPC,
  type GeneratedLocation,
  type GeneratedEntities,
  type StartQuestGenerationRequest,
  type ReviewAction,
  type PlannedItem,
  type PlannedNPC,
  type PlannedLocation,
} from "./ai-quest-schemas.js";
import {
  buildOutlayPrompt,
  buildEntityPlanPrompt,
  buildItemGenerationPrompt,
  buildNPCGenerationPrompt,
  buildLocationGenerationPrompt,
  SYSTEM_PROMPTS,
} from "./ai-quest-prompts.js";
import {
  createGenerationContext,
  registerIdMapping,
  generateEntityId,
  generateQuestId,
  findExistingNPCMatches,
  findExistingItemMatches,
  findExistingLocationMatches,
  validateGeneratedEntities,
  type QuestGenerationContext,
} from "./ai-quest-context.js";
import {
  buildOutlayReviewData,
  buildEntityPlanReviewData,
  buildEntityReviewData,
  applyOutlayEdits,
  applyEntityPlanEdits,
  applyEntityEdits,
  processReviewAction,
  type OutlayEdits,
  type EntityPlanEdits,
  type EntityEdits,
} from "./ai-quest-review.js";

// ============================================================================
// Configuration
// ============================================================================

const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY || "",
});

const DEFAULT_MODEL = "openai/gpt-4o-mini";

const DATA_DIR = path.join(process.cwd(), "data");
const REGISTRY_FILE = path.join(DATA_DIR, "quest-generations.json");
const GENERATIONS_DIR = path.join(DATA_DIR, "quest-generations");

// ============================================================================
// Generation Steps
// ============================================================================

const GENERATION_STEPS = [
  { name: "Outlay", reviewGate: true },
  { name: "Entity Planning", reviewGate: true },
  { name: "Generate Items", reviewGate: false },
  { name: "Generate NPCs", reviewGate: false },
  { name: "Generate Locations", reviewGate: false },
  { name: "Review Entities", reviewGate: true },
  { name: "Generate Objectives", reviewGate: false },
  { name: "Assembly", reviewGate: false },
];

// ============================================================================
// State Management
// ============================================================================

async function ensureDirectories(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.mkdir(GENERATIONS_DIR, { recursive: true });
}

async function loadRegistry(): Promise<QuestGenerationRegistry> {
  try {
    const content = await fs.readFile(REGISTRY_FILE, "utf-8");
    return QuestGenerationRegistrySchema.parse(JSON.parse(content));
  } catch {
    return { generations: {}, activeCount: 0 };
  }
}

async function saveRegistry(registry: QuestGenerationRegistry): Promise<void> {
  await ensureDirectories();
  await fs.writeFile(REGISTRY_FILE, JSON.stringify(registry, null, 2), "utf-8");
}

async function loadQuestState(questId: string): Promise<QuestGenerationState | null> {
  try {
    const stateFile = path.join(GENERATIONS_DIR, questId, "state.json");
    const content = await fs.readFile(stateFile, "utf-8");
    return QuestGenerationStateSchema.parse(JSON.parse(content));
  } catch {
    return null;
  }
}

async function saveQuestState(state: QuestGenerationState): Promise<void> {
  await ensureDirectories();
  const questDir = path.join(GENERATIONS_DIR, state.questId);
  await fs.mkdir(questDir, { recursive: true });
  await fs.writeFile(
    path.join(questDir, "state.json"),
    JSON.stringify(state, null, 2),
    "utf-8"
  );

  // Update registry
  const registry = await loadRegistry();
  registry.generations[state.questId] = state;
  registry.activeCount = Object.values(registry.generations).filter(
    (g) => g.status === "running" || g.status === "awaiting_review"
  ).length;
  await saveRegistry(registry);
}

function createInitialState(questId: string, questName: string): QuestGenerationState {
  return {
    questId,
    questName,
    status: "idle",
    currentStep: 0,
    totalSteps: GENERATION_STEPS.length,
    steps: GENERATION_STEPS.map((s) => ({
      name: s.name,
      status: "pending",
    })),
  };
}

// ============================================================================
// Public API: Queries
// ============================================================================

export async function getQuestGenerationStatus(questId: string): Promise<QuestGenerationState | null> {
  return loadQuestState(questId);
}

export async function listQuestGenerations(): Promise<QuestGenerationState[]> {
  const registry = await loadRegistry();
  return Object.values(registry.generations);
}

export async function getActiveGenerations(): Promise<QuestGenerationState[]> {
  const registry = await loadRegistry();
  return Object.values(registry.generations).filter(
    (g) => g.status === "running" || g.status === "awaiting_review"
  );
}

// ============================================================================
// Public API: Commands
// ============================================================================

export async function startQuestGeneration(
  request: StartQuestGenerationRequest
): Promise<{ success: boolean; questId?: string; error?: string }> {
  if (!isAIConfigured()) {
    return { success: false, error: "AI not configured. Set OPENROUTER_API_KEY." };
  }

  // Generate placeholder name if not provided
  const questName = request.name?.trim() || `New ${request.type} Quest`;
  const questId = generateQuestId(questName);
  const state = createInitialState(questId, questName);
  state.status = "running";
  state.startedAt = new Date().toISOString();

  await saveQuestState(state);

  PubSub.publish(QUEST_GEN_STARTED, {
    questId,
    questName,
  });

  // Start async generation loop
  runGenerationLoop(questId, request).catch((err) => {
    console.error(`Quest generation ${questId} failed:`, err);
  });

  return { success: true, questId };
}

export async function cancelQuestGeneration(questId: string): Promise<{ success: boolean; error?: string }> {
  const state = await loadQuestState(questId);
  if (!state) {
    return { success: false, error: "Quest generation not found" };
  }

  if (state.status !== "running" && state.status !== "awaiting_review") {
    return { success: false, error: "Quest generation is not active" };
  }

  state.status = "cancelled";
  state.completedAt = new Date().toISOString();
  state.error = "Cancelled by user";
  await saveQuestState(state);

  PubSub.publish(QUEST_GEN_CANCELLED, { questId });

  return { success: true };
}

export async function submitReview(
  questId: string,
  action: ReviewAction,
  edits?: unknown
): Promise<{ success: boolean; error?: string }> {
  const state = await loadQuestState(questId);
  if (!state) {
    return { success: false, error: "Quest generation not found" };
  }

  if (state.status !== "awaiting_review" || !state.pendingReview) {
    return { success: false, error: "No pending review" };
  }

  const reviewType = state.pendingReview.type;
  const result = processReviewAction(action, reviewType, edits);

  if (result.action === "cancel") {
    state.status = "cancelled";
    state.completedAt = new Date().toISOString();
    state.error = "Cancelled during review";
    state.pendingReview = undefined;
    await saveQuestState(state);
    PubSub.publish(QUEST_GEN_CANCELLED, { questId });
    return { success: true };
  }

  if (result.action === "edit") {
    // Apply edits based on review type
    if (reviewType === "outlay" && state.outlay) {
      state.outlay = applyOutlayEdits(state.outlay, result.data as OutlayEdits);
    } else if (reviewType === "entity_plan" && state.entityPlan) {
      state.entityPlan = applyEntityPlanEdits(state.entityPlan, result.data as EntityPlanEdits);
    } else if (reviewType === "entities" && state.generatedEntities) {
      state.generatedEntities = applyEntityEdits(state.generatedEntities, result.data as EntityEdits);
    }
  }

  if (result.action === "regenerate") {
    // Reset to regenerate from this step
    const stepIndex = result.step === "outlay" ? 0 : result.step === "entity_plan" ? 1 : 5;
    state.currentStep = stepIndex;
    for (let i = stepIndex; i < state.steps.length; i++) {
      state.steps[i].status = "pending";
      state.steps[i].startedAt = undefined;
      state.steps[i].completedAt = undefined;
      state.steps[i].error = undefined;
    }
  }

  state.status = "running";
  state.pendingReview = undefined;
  await saveQuestState(state);

  PubSub.publish(QUEST_GEN_REVIEW_COMPLETED, { questId, reviewType });

  // Resume generation
  const worldBible = await repository.worldBible.get();
  resumeGenerationLoop(questId, worldBible).catch((err) => {
    console.error(`Quest generation ${questId} failed after review:`, err);
  });

  return { success: true };
}

// ============================================================================
// Generation Loop
// ============================================================================

async function runGenerationLoop(
  questId: string,
  request: StartQuestGenerationRequest
): Promise<void> {
  const worldBible = await repository.worldBible.get();
  const questName = request.name?.trim() || `New ${request.type} Quest`;
  const context = createGenerationContext(questId, questName, worldBible);

  let state = await loadQuestState(questId);
  if (!state) return;

  try {
    // Step 0: Generate Outlay
    state = await runStep(state, 0, async () => {
      const outlay = await generateOutlay(worldBible, request);
      state!.outlay = outlay;
      return outlay;
    });

    if (state.status !== "running") return;

    // Review Gate 1: Outlay
    state = await pauseForReview(state, "outlay", buildOutlayReviewData(questId, state.outlay!, worldBible));
    if (state.status !== "running") return;

    // Step 1: Entity Planning
    state = await runStep(state, 1, async () => {
      const entityPlan = await generateEntityPlan(worldBible, state!.outlay!, questId);
      state!.entityPlan = entityPlan;
      return entityPlan;
    });

    if (state.status !== "running") return;

    // Review Gate 2: Entity Plan
    const existingMatches = {
      npcs: await findExistingNPCMatches(state.entityPlan!, worldBible),
      items: await findExistingItemMatches(state.entityPlan!, worldBible),
      locations: await findExistingLocationMatches(state.entityPlan!, worldBible),
    };
    state = await pauseForReview(
      state,
      "entity_plan",
      buildEntityPlanReviewData(questId, state.entityPlan!, existingMatches)
    );
    if (state.status !== "running") return;

    // Continue with entity generation
    await continueEntityGeneration(state, context, worldBible);
  } catch (err) {
    await handleGenerationError(state, err);
  }
}

async function resumeGenerationLoop(questId: string, worldBible: WorldBible): Promise<void> {
  let state = await loadQuestState(questId);
  if (!state) return;

  const context = createGenerationContext(questId, state.questName, worldBible);

  // Restore ID maps from generated entities
  if (state.generatedEntities) {
    for (const item of state.generatedEntities.items) {
      registerIdMapping(context, "item", item.tempId, item.realId);
    }
    for (const npc of state.generatedEntities.npcs) {
      registerIdMapping(context, "npc", npc.tempId, npc.realId);
    }
    for (const loc of state.generatedEntities.locations) {
      registerIdMapping(context, "location", loc.tempId, loc.realId);
    }
  }

  try {
    // Resume from current step - need to continue where we left off
    
    // If we just approved outlay review (step 0), generate entity plan next
    if (state.currentStep === 0 && state.outlay && !state.entityPlan) {
      state = await runStep(state, 1, async () => {
        const entityPlan = await generateEntityPlan(worldBible, state!.outlay!, questId);
        state!.entityPlan = entityPlan;
        return entityPlan;
      });
      if (state.status !== "running") return;

      // After generating entity plan, pause for review
      const existingMatches = {
        npcs: await findExistingNPCMatches(state.entityPlan!, worldBible),
        items: await findExistingItemMatches(state.entityPlan!, worldBible),
        locations: await findExistingLocationMatches(state.entityPlan!, worldBible),
      };

      state = await pauseForReview(
        state,
        "entity_plan",
        buildEntityPlanReviewData(questId, state.entityPlan!, existingMatches)
      );
      if (state.status !== "running") return;
    }

    // If we're past entity plan (step > 1), continue entity generation
    // currentStep will be 1 after entity plan review is approved, so advance it
    if (state.currentStep === 1 && state.entityPlan) {
      // Entity plan review was just approved - continue to entity generation
      state.currentStep = 2;
      await saveQuestState(state);
    }

    await continueEntityGeneration(state, context, worldBible);
  } catch (err) {
    await handleGenerationError(state, err);
  }
}

async function continueEntityGeneration(
  state: QuestGenerationState,
  context: QuestGenerationContext,
  worldBible: WorldBible
): Promise<void> {
  // Initialize generated entities if needed
  if (!state.generatedEntities) {
    state.generatedEntities = { items: [], npcs: [], locations: [] };
  }

  // Step 2: Generate Items
  if (state.currentStep <= 2) {
    state = await runStep(state, 2, async () => {
      const items = await generateItems(
        worldBible,
        state!.outlay!,
        state!.entityPlan!,
        context
      );
      state!.generatedEntities!.items = items;
      return items;
    });
    if (state.status !== "running") return;
  }

  // Step 3: Generate NPCs
  if (state.currentStep <= 3) {
    state = await runStep(state, 3, async () => {
      const npcs = await generateNPCs(
        worldBible,
        state!.outlay!,
        state!.entityPlan!,
        context
      );
      state!.generatedEntities!.npcs = npcs;
      return npcs;
    });
    if (state.status !== "running") return;
  }

  // Step 4: Generate Locations
  if (state.currentStep <= 4) {
    state = await runStep(state, 4, async () => {
      const locations = await generateLocations(
        worldBible,
        state!.outlay!,
        state!.entityPlan!,
        context
      );
      state!.generatedEntities!.locations = locations;
      return locations;
    });
    if (state.status !== "running") return;
  }

  // Review Gate 3: Entities - only pause if we haven't reviewed yet
  if (state.currentStep === 5 && state.generatedEntities && 
      state.generatedEntities.items.length > 0 && 
      state.generatedEntities.npcs.length > 0 && 
      state.generatedEntities.locations.length > 0) {
    const validationIssues = validateGeneratedEntities(
      state.entityPlan!,
      state.generatedEntities!.items,
      state.generatedEntities!.npcs,
      state.generatedEntities!.locations
    );

    state = await pauseForReview(
      state,
      "entities",
      buildEntityReviewData(state.questId, state.generatedEntities!, validationIssues)
    );
    if (state.status !== "running") return;
    
    // After entities review is approved, advance step
    state.currentStep = 6;
    await saveQuestState(state);
  }

  // Step 6: Generate Objectives (skip for now, use planned objectives)
  state = await runStep(state, 6, async () => {
    // Objectives are already planned in entityPlan
    return state!.entityPlan!.objectives;
  });
  if (state.status !== "running") return;

  // Step 7: Assembly
  state = await runStep(state, 7, async () => {
    await assembleAndSaveQuest(state!, context, worldBible);
    return state!.finalQuest;
  });

  // Complete
  state.status = "completed";
  state.completedAt = new Date().toISOString();
  await saveQuestState(state);

  PubSub.publish(QUEST_GEN_COMPLETED, {
    questId: state.questId,
    quest: state.finalQuest,
  });
}

// ============================================================================
// Step Execution Helpers
// ============================================================================

async function runStep<T>(
  state: QuestGenerationState,
  stepIndex: number,
  handler: () => Promise<T>
): Promise<QuestGenerationState> {
  // Check if cancelled
  const currentState = await loadQuestState(state.questId);
  if (currentState?.status === "cancelled") {
    return currentState;
  }

  state.currentStep = stepIndex;
  state.steps[stepIndex].status = "running";
  state.steps[stepIndex].startedAt = new Date().toISOString();
  await saveQuestState(state);

  PubSub.publish(QUEST_GEN_PROGRESS, {
    questId: state.questId,
    step: stepIndex,
    stepName: GENERATION_STEPS[stepIndex].name,
    totalSteps: GENERATION_STEPS.length,
  });

  try {
    await handler();
    state.steps[stepIndex].status = "completed";
    state.steps[stepIndex].completedAt = new Date().toISOString();
    await saveQuestState(state);
    return state;
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Unknown error";
    state.steps[stepIndex].status = "failed";
    state.steps[stepIndex].error = errorMsg;
    state.status = "failed";
    state.error = `Step "${GENERATION_STEPS[stepIndex].name}" failed: ${errorMsg}`;
    state.completedAt = new Date().toISOString();
    await saveQuestState(state);
    PubSub.publish(QUEST_GEN_FAILED, { questId: state.questId, error: state.error });
    throw err;
  }
}

async function pauseForReview(
  state: QuestGenerationState,
  reviewType: "outlay" | "entity_plan" | "entities",
  reviewData: unknown
): Promise<QuestGenerationState> {
  state.status = "awaiting_review";
  state.pendingReview = {
    type: reviewType,
    data: reviewData,
    requestedAt: new Date().toISOString(),
  };

  // Mark current step as awaiting review
  const stepIndex = reviewType === "outlay" ? 0 : reviewType === "entity_plan" ? 1 : 5;
  state.steps[stepIndex].status = "awaiting_review";

  await saveQuestState(state);

  PubSub.publish(QUEST_GEN_REVIEW_REQUIRED, {
    questId: state.questId,
    reviewType,
    data: reviewData,
  });

  return state;
}

async function handleGenerationError(state: QuestGenerationState, err: unknown): Promise<void> {
  const errorMsg = err instanceof Error ? err.message : "Unknown error";
  state.status = "failed";
  state.error = errorMsg;
  state.completedAt = new Date().toISOString();
  await saveQuestState(state);
  PubSub.publish(QUEST_GEN_FAILED, { questId: state.questId, error: errorMsg });
}

// ============================================================================
// AI Generation Functions
// ============================================================================

async function generateOutlay(
  worldBible: WorldBible,
  request: StartQuestGenerationRequest
): Promise<QuestOutlay> {
  const prompt = buildOutlayPrompt(worldBible, request);

  const completion = await openai.chat.completions.create({
    model: DEFAULT_MODEL,
    messages: [
      { role: "system", content: SYSTEM_PROMPTS.outlay },
      { role: "user", content: prompt },
    ],
    response_format: zodResponseFormat(QuestOutlaySchema, "quest_outlay"),
    temperature: 0.8,
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) throw new Error("No response from AI for outlay generation");

  return QuestOutlaySchema.parse(JSON.parse(content));
}

async function generateEntityPlan(
  worldBible: WorldBible,
  outlay: QuestOutlay,
  questId: string
): Promise<EntityPlan> {
  const prompt = buildEntityPlanPrompt(worldBible, outlay, questId);

  const completion = await openai.chat.completions.create({
    model: DEFAULT_MODEL,
    messages: [
      { role: "system", content: SYSTEM_PROMPTS.entityPlan },
      { role: "user", content: prompt },
    ],
    response_format: zodResponseFormat(EntityPlanSchema, "entity_plan"),
    temperature: 0.7,
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) throw new Error("No response from AI for entity planning");

  return EntityPlanSchema.parse(JSON.parse(content));
}

async function generateItems(
  worldBible: WorldBible,
  outlay: QuestOutlay,
  entityPlan: EntityPlan,
  context: QuestGenerationContext
): Promise<GeneratedItem[]> {
  const items: GeneratedItem[] = [];

  for (const planned of entityPlan.items) {
    // Skip if using existing
    if (planned.useExistingId) {
      registerIdMapping(context, "item", planned.tempId, planned.useExistingId);
      continue;
    }

    const prompt = buildItemGenerationPrompt(worldBible, outlay, planned, context.questName);

    const completion = await openai.chat.completions.create({
      model: DEFAULT_MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPTS.item },
        { role: "user", content: prompt },
      ],
      response_format: zodResponseFormat(GeneratedItemSchema.omit({ tempId: true, realId: true }), "item"),
      temperature: 0.8,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) throw new Error(`No response for item ${planned.tempId}`);

    const parsed = JSON.parse(content);
    const realId = generateEntityId("item", parsed.name, context.questId);

    const item: GeneratedItem = {
      ...parsed,
      tempId: planned.tempId,
      realId,
      id: realId,
    };

    items.push(item);
    registerIdMapping(context, "item", planned.tempId, realId);

    PubSub.publish(QUEST_GEN_ENTITY_CREATED, {
      questId: context.questId,
      entityType: "item",
      entityId: realId,
      entityName: item.name,
    });
  }

  return items;
}

async function generateNPCs(
  worldBible: WorldBible,
  outlay: QuestOutlay,
  entityPlan: EntityPlan,
  context: QuestGenerationContext
): Promise<GeneratedNPC[]> {
  const npcs: GeneratedNPC[] = [];

  for (const planned of entityPlan.npcs) {
    if (planned.useExistingId) {
      registerIdMapping(context, "npc", planned.tempId, planned.useExistingId);
      continue;
    }

    const prompt = buildNPCGenerationPrompt(
      worldBible,
      outlay,
      planned,
      context.questName,
      context.idMaps.items
    );

    const completion = await openai.chat.completions.create({
      model: DEFAULT_MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPTS.npc },
        { role: "user", content: prompt },
      ],
      response_format: zodResponseFormat(GeneratedNPCSchema.omit({ tempId: true, realId: true }), "npc"),
      temperature: 0.8,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) throw new Error(`No response for NPC ${planned.tempId}`);

    const parsed = JSON.parse(content);
    const realId = generateEntityId("npc", parsed.name, context.questId);

    const npc: GeneratedNPC = {
      ...parsed,
      tempId: planned.tempId,
      realId,
      entity_id: realId,
    };

    npcs.push(npc);
    registerIdMapping(context, "npc", planned.tempId, realId);

    PubSub.publish(QUEST_GEN_ENTITY_CREATED, {
      questId: context.questId,
      entityType: "npc",
      entityId: realId,
      entityName: npc.name,
    });
  }

  return npcs;
}

async function generateLocations(
  worldBible: WorldBible,
  outlay: QuestOutlay,
  entityPlan: EntityPlan,
  context: QuestGenerationContext
): Promise<GeneratedLocation[]> {
  const locations: GeneratedLocation[] = [];

  for (const planned of entityPlan.locations) {
    if (planned.useExistingId) {
      registerIdMapping(context, "location", planned.tempId, planned.useExistingId);
      continue;
    }

    const prompt = buildLocationGenerationPrompt(
      worldBible,
      outlay,
      planned,
      context.questName,
      context.idMaps.npcs,
      context.idMaps.items
    );

    const completion = await openai.chat.completions.create({
      model: DEFAULT_MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPTS.location },
        { role: "user", content: prompt },
      ],
      response_format: zodResponseFormat(GeneratedLocationSchema.omit({ tempId: true, realId: true }), "location"),
      temperature: 0.8,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) throw new Error(`No response for location ${planned.tempId}`);

    const parsed = JSON.parse(content);
    const realId = generateEntityId("location", parsed.name, context.questId);

    const location: GeneratedLocation = {
      ...parsed,
      tempId: planned.tempId,
      realId,
      id: realId,
    };

    locations.push(location);
    registerIdMapping(context, "location", planned.tempId, realId);

    PubSub.publish(QUEST_GEN_ENTITY_CREATED, {
      questId: context.questId,
      entityType: "location",
      entityId: realId,
      entityName: location.name,
    });
  }

  return locations;
}

// ============================================================================
// Quest Assembly
// ============================================================================

async function assembleAndSaveQuest(
  state: QuestGenerationState,
  context: QuestGenerationContext,
  worldBible: WorldBible
): Promise<void> {
  const { outlay, entityPlan, generatedEntities } = state;
  if (!outlay || !entityPlan || !generatedEntities) {
    throw new Error("Missing required data for quest assembly");
  }

  // Save generated items to repository
  for (const item of generatedEntities.items) {
    const itemData: Item = {
      id: item.id,
      name: item.name,
      description: item.description,
      type: item.type,
      rarity: item.rarity,
      stackable: item.stackable,
      maxStackSize: item.maxStackSize,
      equippable: item.equippable,
      equipSlot: item.equipSlot ?? undefined,
      value: item.value,
      weight: item.weight,
    };
    await repository.items.create(itemData);
  }

  // Save generated NPCs to repository
  for (const npc of generatedEntities.npcs) {
    const relationships: Record<string, string[]> = {};
    for (const rel of npc.relationships) {
      relationships[rel.category] = rel.entity_ids;
    }

    const npcData: NPC = {
      entity_id: npc.entity_id,
      name: npc.name,
      backstory: npc.backstory,
      personalMission: npc.personalMission,
      hopes: npc.hopes,
      fears: npc.fears,
      relationships,
    };
    await repository.npcs.create(npcData);
  }

  // Save generated locations/tiles to repository
  for (const loc of generatedEntities.locations) {
    const tileData: Tile = {
      id: loc.id,
      name: loc.name,
      description: loc.description,
      color: loc.color,
      backgroundColor: loc.backgroundColor,
      theme: loc.theme,
      resources: loc.resources,
      rarity: loc.rarity,
      accessible: loc.accessible,
    };
    await repository.tiles.create(tileData);
  }

  // Build full outlay text
  const fullOutlay = [
    `## Quest Hook\n${outlay.questHook}`,
    `## Background & Context\n${outlay.backgroundContext}`,
    `## Core Conflict\n${outlay.coreConflict}`,
    `## Key Characters\n${outlay.keyCharacters}`,
    `## Stakes & Consequences\n${outlay.stakesConsequences}`,
    `## Thematic Connections\n${outlay.thematicConnections}`,
    `## Regional Integration\n${outlay.regionalIntegration}`,
    `## Faction Involvement\n${outlay.factionInvolvement}`,
  ].join("\n\n");

  // Find quest giver (first ally NPC)
  const giverNpc = generatedEntities.npcs[0];
  const giverLocation = generatedEntities.locations[0];
  
  // Build objectives from entity plan
  const objectives = entityPlan.objectives.map((obj, idx) => {
    const base = {
      id: `${context.questId}_obj_${idx}`,
      description: obj.description,
      progress: null,
    };

    switch (obj.type) {
      case "talk":
        return {
          ...base,
          type: "talk" as const,
          entity_id: context.idMaps.npcs.get(obj.targetNpc || "") || giverNpc?.entity_id || "",
          zone_id: context.idMaps.locations.get(obj.targetLocation || "") || giverLocation?.id || "",
          dialog_steps: [],
        };
      case "explore":
        return {
          ...base,
          type: "explore" as const,
          zone_id: context.idMaps.locations.get(obj.targetLocation || "") || giverLocation?.id || "",
          chance: 1,
          found_message: null,
        };
      case "collect":
        return {
          ...base,
          type: "collect" as const,
          item_id: context.idMaps.items.get(obj.targetItem || "") || "",
          amount: obj.targetCount || 1,
        };
      case "craft":
        return {
          ...base,
          type: "craft" as const,
          resource_id: context.idMaps.items.get(obj.targetItem || "") || "",
          amount: obj.targetCount || 1,
        };
      default:
        // Default to talk for kill/deliver/escort/defend/use_item types
        return {
          ...base,
          type: "talk" as const,
          entity_id: giverNpc?.entity_id || "",
          zone_id: giverLocation?.id || "",
          dialog_steps: [],
        };
    }
  });

  // Build rewards from generated items (use reward items if any)
  const rewardItems = generatedEntities.items.filter(i => 
    entityPlan.items.find(p => p.tempId === i.tempId && p.category === "reward")
  );
  const rewards = rewardItems.length > 0 
    ? rewardItems.map(item => ({
        type: "item" as const,
        item_id: item.id,
        amount: 1,
      }))
    : [{ type: "gold" as const, amount: 100 }];

  // Build quest giver reference
  const giver = {
    entity_id: giverNpc?.entity_id || "",
    zone_id: giverLocation?.id || "",
  };

  // Build completion
  const completion = {
    entity_id: giverNpc?.entity_id || "",
    zone_id: giverLocation?.id || "",
    message: "Thank you for your help! The grove is safe once more.",
    return_message: "You have already completed this quest.",
  };

  // Determine quest type from objectives
  const hasExplore = objectives.some(o => o.type === "explore");
  const hasCollect = objectives.some(o => o.type === "collect");
  const hasTalk = objectives.some(o => o.type === "talk");
  const questType: "exploration" | "collection" | "dialog" = hasExplore ? "exploration" : hasCollect ? "collection" : hasTalk ? "dialog" : "exploration";

  // Create final quest object for state (metadata)
  state.finalQuest = {
    id: context.questId,
    name: state.questName,
    description: outlay.questHook.substring(0, 200) + "...",
    outlay: fullOutlay,
    type: "side",
    difficulty: "medium",
    npcs: generatedEntities.npcs.map((n) => n.entity_id),
    items: generatedEntities.items.map((i) => i.id),
    locations: generatedEntities.locations.map((l) => l.id),
    prerequisites: [],
    factions: entityPlan.factionInvolvement.map((f) => f.factionId),
    themes: entityPlan.themeConnections.map((t) => t.themeId),
    region: entityPlan.regionUsage[0]?.regionId || worldBible.regions[0]?.id || "",
  };

  // Create proper Quest object for repository
  const questForRepo = {
    id: context.questId,
    name: state.questName,
    description: outlay.questHook.substring(0, 200) + "...",
    type: questType,
    giver,
    objectives,
    completion,
    rewards,
    prerequisites: [],
  };

  // Save quest to repository
  await repository.quests.create(questForRepo);

  // Save quest state with final quest
  await saveQuestState(state);
}

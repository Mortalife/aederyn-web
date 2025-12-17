import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";
import * as fs from "fs/promises";
import * as path from "path";
import type {
  WorldBible,
  WorldTheme,
  WorldSystem,
  WorldFaction,
  WorldRegion,
  WorldHistoryEvent,
  WorldNaming,
} from "@aederyn/types";
import { repository } from "../repository/index.js";
import {
  PubSub,
  WORLD_BIBLE_GEN_STARTED,
  WORLD_BIBLE_GEN_PROGRESS,
  WORLD_BIBLE_GEN_COMPLETED,
  WORLD_BIBLE_GEN_FAILED,
} from "../sse/pubsub.js";
import { isAIConfigured } from "./ai-service.js";

const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY || "",
});

const DEFAULT_MODEL = "openai/gpt-4o-mini";

const DATA_DIR = path.join(process.cwd(), "data");
const STATE_FILE = path.join(DATA_DIR, "world-bible-generation.json");

// Generation state interface
export interface GenerationStepState {
  name: string;
  status: "pending" | "running" | "completed" | "failed";
  startedAt?: string;
  completedAt?: string;
  error?: string;
}

export interface WorldBibleGenerationState {
  status: "idle" | "running" | "completed" | "failed";
  startedAt?: string;
  completedAt?: string;
  currentStep: number;
  totalSteps: number;
  steps: GenerationStepState[];
  error?: string;
}

const GENERATION_STEPS = [
  "Description",
  "Themes",
  "Systems",
  "Factions",
  "Regions",
  "History",
  "Naming",
];

function createInitialState(): WorldBibleGenerationState {
  return {
    status: "idle",
    currentStep: 0,
    totalSteps: GENERATION_STEPS.length,
    steps: GENERATION_STEPS.map((name) => ({
      name,
      status: "pending",
    })),
  };
}

async function loadState(): Promise<WorldBibleGenerationState> {
  try {
    const content = await fs.readFile(STATE_FILE, "utf-8");
    return JSON.parse(content);
  } catch {
    return createInitialState();
  }
}

async function saveState(state: WorldBibleGenerationState): Promise<void> {
  await fs.writeFile(STATE_FILE, JSON.stringify(state, null, 2), "utf-8");
}

// Query: Get current generation status
export async function getGenerationStatus(): Promise<WorldBibleGenerationState> {
  return loadState();
}

// Command: Start world bible generation
export async function startWorldBibleGeneration(): Promise<{ success: boolean; error?: string }> {
  if (!isAIConfigured()) {
    return { success: false, error: "AI not configured. Set OPENROUTER_API_KEY." };
  }

  const currentState = await loadState();
  if (currentState.status === "running") {
    return { success: false, error: "Generation already in progress." };
  }

  const state: WorldBibleGenerationState = {
    ...createInitialState(),
    status: "running",
    startedAt: new Date().toISOString(),
  };
  await saveState(state);

  PubSub.publish(WORLD_BIBLE_GEN_STARTED, {
    step: 0,
    stepName: GENERATION_STEPS[0],
    totalSteps: GENERATION_STEPS.length,
  });

  // Start async generation loop (don't await)
  runGenerationLoop().catch((err) => {
    console.error("Generation loop failed:", err);
  });

  return { success: true };
}

// Command: Cancel generation
export async function cancelGeneration(): Promise<void> {
  const state = await loadState();
  if (state.status === "running") {
    state.status = "failed";
    state.error = "Cancelled by user";
    state.completedAt = new Date().toISOString();
    await saveState(state);
    PubSub.publish(WORLD_BIBLE_GEN_FAILED, { error: "Cancelled by user" });
  }
}

// Main generation loop
async function runGenerationLoop(): Promise<void> {
  let state = await loadState();
  let worldBible = await repository.worldBible.get();

  const stepHandlers = [
    () => generateDescription(worldBible),
    () => generateThemes(worldBible),
    () => generateSystems(worldBible),
    () => generateFactions(worldBible),
    () => generateRegions(worldBible),
    () => generateHistory(worldBible),
    () => generateNaming(worldBible),
  ];

  for (let i = 0; i < stepHandlers.length; i++) {
    state = await loadState();
    
    // Check if cancelled
    if (state.status !== "running") {
      return;
    }

    state.currentStep = i;
    state.steps[i].status = "running";
    state.steps[i].startedAt = new Date().toISOString();
    await saveState(state);

    PubSub.publish(WORLD_BIBLE_GEN_PROGRESS, {
      step: i,
      stepName: GENERATION_STEPS[i],
      totalSteps: GENERATION_STEPS.length,
    });

    try {
      worldBible = await stepHandlers[i]();
      await repository.worldBible.save(worldBible);

      state.steps[i].status = "completed";
      state.steps[i].completedAt = new Date().toISOString();
      await saveState(state);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Unknown error";
      state.steps[i].status = "failed";
      state.steps[i].error = errorMsg;
      state.status = "failed";
      state.error = `Step "${GENERATION_STEPS[i]}" failed: ${errorMsg}`;
      state.completedAt = new Date().toISOString();
      await saveState(state);

      PubSub.publish(WORLD_BIBLE_GEN_FAILED, { error: state.error });
      return;
    }
  }

  state.status = "completed";
  state.completedAt = new Date().toISOString();
  await saveState(state);

  PubSub.publish(WORLD_BIBLE_GEN_COMPLETED, {
    step: GENERATION_STEPS.length,
    totalSteps: GENERATION_STEPS.length,
  });
}

// Build cumulative context from world bible
function buildContext(worldBible: WorldBible): string {
  let context = `# World: ${worldBible.name}
Setting: ${worldBible.setting.genre} ${worldBible.setting.era}
Tone: ${worldBible.setting.tone}`;

  if (worldBible.setting.description) {
    context += `\n\nDescription:\n${worldBible.setting.description}`;
  }

  if (worldBible.themes.length > 0) {
    context += `\n\nThemes:\n${worldBible.themes.map((t) => `- ${t.name}: ${t.description}`).join("\n")}`;
  }

  if (worldBible.systems.length > 0) {
    context += `\n\nSystems:\n${worldBible.systems.map((s) => `- ${s.name} (${s.type}): ${s.description}`).join("\n")}`;
  }

  if (worldBible.factions.length > 0) {
    context += `\n\nFactions:\n${worldBible.factions.map((f) => `- ${f.name} (${f.alignment}): ${f.description}`).join("\n")}`;
  }

  if (worldBible.regions.length > 0) {
    context += `\n\nRegions:\n${worldBible.regions.map((r) => `- ${r.name}: ${r.description}`).join("\n")}`;
  }

  if (worldBible.history.length > 0) {
    context += `\n\nHistory:\n${worldBible.history.map((h) => `- ${h.name} (${h.era}): ${h.description.substring(0, 100)}...`).join("\n")}`;
  }

  return context;
}

// Zod schemas for AI structured output
const DescriptionSchema = z.object({
  description: z.string().describe("400-1000 word world description covering geography, culture, conflicts, and unique features"),
});

const ThemeSchema = z.object({
  id: z.string().describe("Unique theme ID slug (lowercase, hyphens)"),
  name: z.string().describe("Theme name"),
  description: z.string().describe("100 word theme description"),
  examples: z.array(z.string()).describe("3-5 examples of how this theme manifests in the world"),
});

const ThemesOutputSchema = z.object({
  themes: z.array(ThemeSchema).describe("3 core thematic pillars for the world"),
});

const SystemSchema = z.object({
  id: z.string().describe("Unique system ID slug (lowercase, hyphens)"),
  name: z.string().describe("System name (e.g., religion, magic system)"),
  type: z.enum(["magic", "technology", "hybrid"]).describe("System type"),
  description: z.string().describe("150 word system description"),
  rules: z.array(z.string()).describe("3-5 rules that govern this system"),
  limitations: z.array(z.string()).describe("2-3 limitations or costs"),
});

const SystemsOutputSchema = z.object({
  systems: z.array(SystemSchema).describe("2 major systems (religions, magic, etc.)"),
});

const FactionSchema = z.object({
  id: z.string().describe("Unique faction ID slug (lowercase, hyphens)"),
  name: z.string().describe("Faction name"),
  description: z.string().describe("200 word faction description"),
  alignment: z.enum(["friendly", "neutral", "hostile"]).describe("Default alignment to player"),
  goals: z.array(z.string()).describe("2-3 faction goals"),
  rivals: z.array(z.string()).describe("IDs of rival factions"),
  allies: z.array(z.string()).describe("IDs of allied factions"),
  members: z.array(z.string()).describe("Types of members (not specific NPCs)"),
});

const FactionsOutputSchema = z.object({
  factions: z.array(FactionSchema).describe("4 major factions"),
});

const RegionSchema = z.object({
  id: z.string().describe("Unique region ID slug (lowercase, hyphens)"),
  name: z.string().describe("Region name"),
  description: z.string().describe("200 word region description"),
  climate: z.string().describe("Climate type (e.g., temperate, arid, tropical)"),
  inhabitants: z.array(z.string()).describe("Types of inhabitants"),
  resources: z.array(z.string()).describe("Natural resources found here"),
  themes: z.array(z.string()).describe("Theme IDs that are prominent in this region"),
});

const RegionsOutputSchema = z.object({
  regions: z.array(RegionSchema).describe("4 major regions"),
});

const HistoryEventSchema = z.object({
  id: z.string().describe("Unique event ID slug (lowercase, hyphens)"),
  name: z.string().describe("Event name"),
  description: z.string().describe("300 word event description"),
  era: z.string().describe("Era name (e.g., 'Age of Foundation', 'The Dark Years')"),
  significance: z.string().describe("Why this event matters"),
  relatedEntities: z.array(z.string()).describe("IDs of related factions, regions, or systems"),
});

const HistoryOutputSchema = z.object({
  history: z.array(HistoryEventSchema).describe("10 major historical events in chronological order"),
});

const NamingOutputSchema = z.object({
  characterPatterns: z.array(z.string()).describe("5 naming patterns for characters (e.g., 'Nordic-inspired', 'Two syllables + title')"),
  placePatterns: z.array(z.string()).describe("5 naming patterns for places"),
  itemPatterns: z.array(z.string()).describe("5 naming patterns for items"),
  characterExamples: z.array(z.string()).describe("5 example character names"),
  placeExamples: z.array(z.string()).describe("5 example place names"),
  itemExamples: z.array(z.string()).describe("5 example item names"),
});

// Step generators
async function generateDescription(worldBible: WorldBible): Promise<WorldBible> {
  const prompt = `You are a world-builder creating a rich game world.

Current world setup:
- Name: ${worldBible.name}
- Genre: ${worldBible.setting.genre}
- Era: ${worldBible.setting.era}
- Tone: ${worldBible.setting.tone}
- Initial concept: ${worldBible.setting.description || "No initial description"}

Generate a comprehensive world description (400-1000 words) that:
1. Establishes the core geography and landscapes
2. Hints at major cultures and peoples
3. Suggests underlying conflicts and tensions
4. Introduces unique features that make this world distinctive
5. Sets up hooks for player engagement

The description should serve as the foundation for generating religions, factions, themes, and history.`;

  const completion = await openai.chat.completions.create({
    model: DEFAULT_MODEL,
    messages: [
      { role: "system", content: "You are a creative world-builder for games. Generate rich, evocative content." },
      { role: "user", content: prompt },
    ],
    response_format: zodResponseFormat(DescriptionSchema, "description"),
    temperature: 0.8,
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) throw new Error("No response from AI");

  const parsed = DescriptionSchema.parse(JSON.parse(content));
  
  return {
    ...worldBible,
    setting: {
      ...worldBible.setting,
      description: parsed.description,
    },
  };
}

async function generateThemes(worldBible: WorldBible): Promise<WorldBible> {
  const context = buildContext(worldBible);
  
  const prompt = `${context}

Based on this world, generate 3 core thematic pillars that will run through all content.
These themes should:
1. Reflect the tone and setting
2. Create interesting narrative tensions
3. Provide hooks for quests and character motivations
4. Be broad enough to apply across different regions and factions

Each theme needs a unique ID, name, 100-word description, and 3-5 examples.`;

  const completion = await openai.chat.completions.create({
    model: DEFAULT_MODEL,
    messages: [
      { role: "system", content: "You are a creative world-builder. Generate thematic content that creates narrative depth." },
      { role: "user", content: prompt },
    ],
    response_format: zodResponseFormat(ThemesOutputSchema, "themes"),
    temperature: 0.8,
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) throw new Error("No response from AI");

  const parsed = ThemesOutputSchema.parse(JSON.parse(content));
  
  return {
    ...worldBible,
    themes: parsed.themes,
  };
}

async function generateSystems(worldBible: WorldBible): Promise<WorldBible> {
  const context = buildContext(worldBible);
  
  const prompt = `${context}

Generate 2 major systems for this world (e.g., a religion/belief system and a magic/technology system).
These should:
1. Fit the established themes and tone
2. Have clear rules and limitations
3. Create interesting gameplay possibilities
4. Potentially conflict with each other in interesting ways

Each system needs: ID, name, type (magic/technology/hybrid), 150-word description, 3-5 rules, 2-3 limitations.`;

  const completion = await openai.chat.completions.create({
    model: DEFAULT_MODEL,
    messages: [
      { role: "system", content: "You are a game system designer. Create balanced, interesting systems with clear rules." },
      { role: "user", content: prompt },
    ],
    response_format: zodResponseFormat(SystemsOutputSchema, "systems"),
    temperature: 0.8,
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) throw new Error("No response from AI");

  const parsed = SystemsOutputSchema.parse(JSON.parse(content));
  
  return {
    ...worldBible,
    systems: parsed.systems,
  };
}

async function generateFactions(worldBible: WorldBible): Promise<WorldBible> {
  const context = buildContext(worldBible);
  
  const prompt = `${context}

Generate 4 major factions for this world.
These should:
1. Have different relationships with the established themes and systems
2. Include a mix of alignments (at least one friendly, one hostile, and two neutral)
3. Have clear goals that may conflict with each other
4. Reference the systems (religions, magic) where appropriate

For rivals and allies, use the faction IDs you're creating.
Each faction needs: ID, name, 200-word description, alignment, 2-3 goals, rival IDs, ally IDs, member types.`;

  const completion = await openai.chat.completions.create({
    model: DEFAULT_MODEL,
    messages: [
      { role: "system", content: "You are a political world-builder. Create factions with complex relationships." },
      { role: "user", content: prompt },
    ],
    response_format: zodResponseFormat(FactionsOutputSchema, "factions"),
    temperature: 0.8,
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) throw new Error("No response from AI");

  const parsed = FactionsOutputSchema.parse(JSON.parse(content));
  
  return {
    ...worldBible,
    factions: parsed.factions,
  };
}

async function generateRegions(worldBible: WorldBible): Promise<WorldBible> {
  const context = buildContext(worldBible);
  
  const prompt = `${context}

Generate 4 major regions for this world.
These should:
1. Have diverse climates and landscapes
2. Be home to different factions or mixes of factions
3. Emphasize different themes in each region
4. Have unique resources that encourage exploration and trade

For themes, use the theme IDs from the existing themes: ${worldBible.themes.map((t) => t.id).join(", ")}

Each region needs: ID, name, 200-word description, climate, inhabitant types, resources, theme IDs.`;

  const completion = await openai.chat.completions.create({
    model: DEFAULT_MODEL,
    messages: [
      { role: "system", content: "You are a geographic world-builder. Create diverse, interesting regions." },
      { role: "user", content: prompt },
    ],
    response_format: zodResponseFormat(RegionsOutputSchema, "regions"),
    temperature: 0.8,
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) throw new Error("No response from AI");

  const parsed = RegionsOutputSchema.parse(JSON.parse(content));
  
  return {
    ...worldBible,
    regions: parsed.regions,
  };
}

async function generateHistory(worldBible: WorldBible): Promise<WorldBible> {
  const context = buildContext(worldBible);
  
  const prompt = `${context}

Generate 10 major historical events for this world, in chronological order.
These should:
1. Span different eras (create era names that fit the world)
2. Explain how factions, regions, and systems came to be
3. Create lingering consequences that affect the present
4. Include both triumphs and tragedies
5. Connect to the established themes

For relatedEntities, use IDs from:
- Factions: ${worldBible.factions.map((f) => f.id).join(", ")}
- Regions: ${worldBible.regions.map((r) => r.id).join(", ")}
- Systems: ${worldBible.systems.map((s) => s.id).join(", ")}

Each event needs: ID, name, 300-word description, era name, significance, related entity IDs.`;

  const completion = await openai.chat.completions.create({
    model: DEFAULT_MODEL,
    messages: [
      { role: "system", content: "You are a lore master. Create a rich history that shapes the present world." },
      { role: "user", content: prompt },
    ],
    response_format: zodResponseFormat(HistoryOutputSchema, "history"),
    temperature: 0.8,
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) throw new Error("No response from AI");

  const parsed = HistoryOutputSchema.parse(JSON.parse(content));
  
  return {
    ...worldBible,
    history: parsed.history,
  };
}

async function generateNaming(worldBible: WorldBible): Promise<WorldBible> {
  const context = buildContext(worldBible);
  
  const prompt = `${context}

Generate naming conventions for this world.
These should:
1. Reflect the cultures and factions established
2. Be consistent with the genre and tone
3. Provide practical guidance for creating new names
4. Include variety for different regions or factions

Provide:
- 5 character naming patterns with descriptions
- 5 place naming patterns with descriptions
- 5 item naming patterns with descriptions
- 5 example character names
- 5 example place names
- 5 example item names`;

  const completion = await openai.chat.completions.create({
    model: DEFAULT_MODEL,
    messages: [
      { role: "system", content: "You are a linguistics expert for fantasy worlds. Create evocative naming conventions." },
      { role: "user", content: prompt },
    ],
    response_format: zodResponseFormat(NamingOutputSchema, "naming"),
    temperature: 0.8,
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) throw new Error("No response from AI");

  const parsed = NamingOutputSchema.parse(JSON.parse(content));
  
  return {
    ...worldBible,
    naming: {
      characterPatterns: parsed.characterPatterns,
      placePatterns: parsed.placePatterns,
      itemPatterns: parsed.itemPatterns,
      examples: {
        characters: parsed.characterExamples,
        places: parsed.placeExamples,
        items: parsed.itemExamples,
      },
    },
  };
}

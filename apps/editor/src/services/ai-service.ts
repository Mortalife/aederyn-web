import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";
import type { WorldBible, Item, NPC, Quest } from "@aederyn/types";
import {
  QuestTypeSchema,
  ItemTypeSchema,
  ItemRaritySchema,
  EquipSlotSchema,
} from "@aederyn/types";
import {
  buildAIContext,
  buildItemGenerationPrompt,
  buildQuestGenerationPrompt,
  buildNPCGenerationPrompt,
} from "./ai-context.js";

const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY || "",
});

// Model must support structured output / JSON schema
const DEFAULT_MODEL = "openai/gpt-4o-mini";

export function isAIConfigured(): boolean {
  return !!process.env.OPENROUTER_API_KEY;
}

// AI-specific schemas for structured output
// OpenAI requires .nullable() for optional fields
const AIItemSchema = z.object({
  id: z.string().describe("Unique item identifier slug (lowercase, hyphens)"),
  name: z.string().describe("Display name for the item"),
  description: z.string().describe("2-3 sentence item description"),
  type: ItemTypeSchema.describe("Item category"),
  rarity: ItemRaritySchema.describe("Item rarity tier"),
  stackable: z.boolean().describe("Whether item can stack in inventory"),
  maxStackSize: z.number().min(1).describe("Maximum stack size if stackable"),
  equippable: z.boolean().describe("Whether item can be equipped"),
  equipSlot: EquipSlotSchema.nullable().describe("Equipment slot if equippable, null otherwise"),
  value: z.number().min(0).describe("Gold value based on rarity"),
  weight: z.number().min(0).describe("Weight in inventory units"),
});

const AINPCSchema = z.object({
  entity_id: z.string().describe("Unique NPC identifier slug (lowercase, hyphens)"),
  name: z.string().describe("NPC's full display name"),
  backstory: z.string().describe("2-3 paragraph character backstory"),
  personalMission: z.string().describe("What drives this character"),
  hopes: z.string().describe("What they hope for"),
  fears: z.string().describe("What they fear"),
  relationships: z.record(z.string(), z.array(z.string())).describe("Relationship categories mapped to entity_ids"),
});

// Simplified objective schema for AI generation
const AIObjectiveSchema = z.object({
  id: z.string().describe("Unique objective identifier"),
  type: z.enum(["gather", "collect", "talk", "explore", "craft"]).describe("Objective type"),
  description: z.string().describe("Player-facing objective text"),
  // Type-specific fields - AI provides based on type
  resource_id: z.string().nullable().describe("Resource ID for gather/craft objectives"),
  item_id: z.string().nullable().describe("Item ID for collect objectives"),
  entity_id: z.string().nullable().describe("NPC entity_id for talk objectives"),
  zone_id: z.string().nullable().describe("Zone ID for talk/explore objectives"),
  amount: z.number().nullable().describe("Amount for gather/collect/craft objectives"),
});

const AIRewardSchema = z.object({
  type: z.enum(["item", "gold", "skill"]).describe("Reward type"),
  item_id: z.string().nullable().describe("Item ID for item rewards"),
  skill_id: z.string().nullable().describe("Skill ID for skill rewards"),
  amount: z.number().min(1).describe("Amount/quantity"),
});

const AIQuestSchema = z.object({
  id: z.string().describe("Unique quest identifier slug (lowercase, hyphens)"),
  name: z.string().describe("Quest display title"),
  description: z.string().describe("Quest description for player journal"),
  type: QuestTypeSchema.describe("Quest category type"),
  giver: z.object({
    entity_id: z.string().describe("Quest giver NPC entity_id"),
    zone_id: z.string().describe("Zone where quest giver is located"),
  }),
  objectives: z.array(AIObjectiveSchema).describe("Quest objectives to complete"),
  completion: z.object({
    entity_id: z.string().describe("NPC entity_id to return to"),
    zone_id: z.string().describe("Zone where completion NPC is located"),
    message: z.string().describe("Completion dialog message"),
    return_message: z.string().describe("Message on subsequent visits"),
  }),
  rewards: z.array(AIRewardSchema).describe("Rewards given on completion"),
  is_tutorial: z.boolean().describe("Whether this is a tutorial quest"),
  prerequisites: z.array(z.string()).describe("Quest IDs that must be completed first"),
});

// Type for AI-generated item before mapping
type AIItem = z.infer<typeof AIItemSchema>;
type AINPC = z.infer<typeof AINPCSchema>;
type AIQuest = z.infer<typeof AIQuestSchema>;

// Map AI-generated item to full Item type
function mapAIItemToItem(ai: AIItem): Item {
  return {
    ...ai,
    equipSlot: ai.equipSlot ?? undefined,
  };
}

// Map AI-generated NPC to full NPC type
function mapAINPCToNPC(ai: AINPC): NPC {
  return ai;
}

// Map AI-generated quest to full Quest type
function mapAIQuestToQuest(ai: AIQuest): Quest {
  const objectives = ai.objectives.map((obj) => {
    const base = {
      id: obj.id,
      description: obj.description,
      progress: null,
    };
    
    switch (obj.type) {
      case "gather":
        return { ...base, type: "gather" as const, resource_id: obj.resource_id || "", amount: obj.amount || 1 };
      case "collect":
        return { ...base, type: "collect" as const, item_id: obj.item_id || "", amount: obj.amount || 1 };
      case "talk":
        return { ...base, type: "talk" as const, entity_id: obj.entity_id || "", zone_id: obj.zone_id || "", dialog_steps: [] };
      case "explore":
        return { ...base, type: "explore" as const, zone_id: obj.zone_id || "", chance: 1, found_message: null };
      case "craft":
        return { ...base, type: "craft" as const, resource_id: obj.resource_id || "", amount: obj.amount || 1 };
    }
  });
  
  const rewards = ai.rewards.map((r) => {
    switch (r.type) {
      case "item":
        return { type: "item" as const, item_id: r.item_id || "", amount: r.amount };
      case "skill":
        return { type: "skill" as const, skill_id: r.skill_id || "", amount: r.amount };
      case "gold":
        return { type: "gold" as const, amount: r.amount };
    }
  });
  
  return {
    id: ai.id,
    name: ai.name,
    description: ai.description,
    type: ai.type,
    giver: ai.giver,
    objectives,
    completion: ai.completion,
    rewards,
    is_tutorial: ai.is_tutorial,
    prerequisites: ai.prerequisites,
  };
}

export async function generateItem(
  worldBible: WorldBible,
  request: {
    type: string;
    rarity: string;
    theme?: string;
  }
): Promise<Item> {
  const context = await buildAIContext(worldBible);
  const prompt = buildItemGenerationPrompt(context, request);
  
  const completion = await openai.chat.completions.create({
    model: DEFAULT_MODEL,
    messages: [
      {
        role: "system",
        content: "You are a creative game designer assistant. Generate items that fit the world's theme and lore.",
      },
      { role: "user", content: prompt },
    ],
    response_format: zodResponseFormat(AIItemSchema, "item"),
    temperature: 0.8,
  });
  
  const content = completion.choices[0]?.message?.content;
  if (!content) {
    throw new Error("Failed to get AI response for item generation");
  }
  
  const parsed = AIItemSchema.parse(JSON.parse(content));
  return mapAIItemToItem(parsed);
}

export async function generateQuest(
  worldBible: WorldBible,
  request: {
    type?: string;
    difficulty?: string;
    region?: string;
  }
): Promise<Quest> {
  const context = await buildAIContext(worldBible, request.region);
  const prompt = buildQuestGenerationPrompt(context, request);
  
  const completion = await openai.chat.completions.create({
    model: DEFAULT_MODEL,
    messages: [
      {
        role: "system",
        content: "You are a creative quest designer. Generate quests using ONLY the entity IDs provided in the prompt. Do not invent new IDs.",
      },
      { role: "user", content: prompt },
    ],
    response_format: zodResponseFormat(AIQuestSchema, "quest"),
    temperature: 0.8,
  });
  
  const content = completion.choices[0]?.message?.content;
  if (!content) {
    throw new Error("Failed to get AI response for quest generation");
  }
  
  const parsed = AIQuestSchema.parse(JSON.parse(content));
  return mapAIQuestToQuest(parsed);
}

export async function generateNPC(
  worldBible: WorldBible,
  request: {
    role?: string;
    faction?: string;
    region?: string;
  }
): Promise<NPC> {
  const context = await buildAIContext(
    worldBible,
    request.region || request.faction
  );
  const prompt = buildNPCGenerationPrompt(context, request);
  
  const completion = await openai.chat.completions.create({
    model: DEFAULT_MODEL,
    messages: [
      {
        role: "system",
        content: "You are a creative character designer. Generate NPCs that fit the world's theme and can form interesting relationships.",
      },
      { role: "user", content: prompt },
    ],
    response_format: zodResponseFormat(AINPCSchema, "npc"),
    temperature: 0.8,
  });
  
  const content = completion.choices[0]?.message?.content;
  if (!content) {
    throw new Error("Failed to get AI response for NPC generation");
  }
  
  const parsed = AINPCSchema.parse(JSON.parse(content));
  return mapAINPCToNPC(parsed);
}

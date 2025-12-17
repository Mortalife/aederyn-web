import type { WorldBible } from "@aederyn/types";
import { repository } from "../repository/index.js";
import type {
  EntityPlan,
  GeneratedItem,
  GeneratedNPC,
  GeneratedLocation,
} from "./ai-quest-schemas.js";

// ============================================================================
// Generation Context
// ============================================================================

export interface QuestGenerationContext {
  questId: string;
  questName: string;
  worldBible: WorldBible;
  
  // ID mappings built during generation
  idMaps: {
    items: Map<string, string>;      // tempId → realId
    npcs: Map<string, string>;       // tempId → realId
    locations: Map<string, string>;  // tempId → realId
    objectives: Map<string, string>; // tempId → realId
  };
}

export function createGenerationContext(
  questId: string,
  questName: string,
  worldBible: WorldBible
): QuestGenerationContext {
  return {
    questId,
    questName,
    worldBible,
    idMaps: {
      items: new Map(),
      npcs: new Map(),
      locations: new Map(),
      objectives: new Map(),
    },
  };
}

export function resolveId(
  context: QuestGenerationContext,
  type: "item" | "npc" | "location" | "objective",
  tempId: string
): string {
  const map = context.idMaps[`${type}s`];
  return map.get(tempId) || tempId;
}

export function registerIdMapping(
  context: QuestGenerationContext,
  type: "item" | "npc" | "location" | "objective",
  tempId: string,
  realId: string
): void {
  const map = context.idMaps[`${type}s`];
  map.set(tempId, realId);
}

// ============================================================================
// Existing Entity Matching
// ============================================================================

export interface ExistingEntityMatch<T> {
  planned: { tempId: string; suggestedName?: string; narrativeFunction: string };
  existing: T;
  matchScore: number;
  matchReason: string;
}

export async function findExistingNPCMatches(
  entityPlan: EntityPlan,
  worldBible: WorldBible
): Promise<ExistingEntityMatch<{ entity_id: string; name: string }>[]> {
  const existingNpcs = await repository.npcs.getAll();
  const matches: ExistingEntityMatch<{ entity_id: string; name: string }>[] = [];

  for (const plannedNpc of entityPlan.npcs) {
    if (plannedNpc.useExistingId) continue; // Already assigned

    for (const existing of existingNpcs) {
      let score = 0;
      const reasons: string[] = [];

      // Name similarity
      if (plannedNpc.suggestedName) {
        const nameSimilarity = calculateStringSimilarity(
          plannedNpc.suggestedName.toLowerCase(),
          existing.name.toLowerCase()
        );
        if (nameSimilarity > 0.7) {
          score += nameSimilarity * 50;
          reasons.push(`Name match: ${Math.round(nameSimilarity * 100)}%`);
        }
      }

      // Faction match
      if (plannedNpc.suggestedFaction) {
        const factionMatch = existing.backstory?.toLowerCase().includes(
          plannedNpc.suggestedFaction.toLowerCase()
        );
        if (factionMatch) {
          score += 30;
          reasons.push("Faction mentioned in backstory");
        }
      }

      // Role keywords in backstory
      const roleKeywords = getRoleKeywords(plannedNpc.role);
      for (const keyword of roleKeywords) {
        if (existing.backstory?.toLowerCase().includes(keyword)) {
          score += 10;
          reasons.push(`Role keyword: ${keyword}`);
        }
      }

      if (score > 30) {
        matches.push({
          planned: {
            tempId: plannedNpc.tempId,
            suggestedName: plannedNpc.suggestedName,
            narrativeFunction: plannedNpc.narrativeFunction,
          },
          existing: { entity_id: existing.entity_id, name: existing.name },
          matchScore: Math.min(score, 100),
          matchReason: reasons.join("; "),
        });
      }
    }
  }

  return matches.sort((a, b) => b.matchScore - a.matchScore);
}

export async function findExistingItemMatches(
  entityPlan: EntityPlan,
  worldBible: WorldBible
): Promise<ExistingEntityMatch<{ id: string; name: string; type: string }>[]> {
  const existingItems = await repository.items.getAll();
  const matches: ExistingEntityMatch<{ id: string; name: string; type: string }>[] = [];

  for (const plannedItem of entityPlan.items) {
    if (plannedItem.useExistingId) continue;

    for (const existing of existingItems) {
      let score = 0;
      const reasons: string[] = [];

      // Name similarity
      if (plannedItem.suggestedName) {
        const nameSimilarity = calculateStringSimilarity(
          plannedItem.suggestedName.toLowerCase(),
          existing.name.toLowerCase()
        );
        if (nameSimilarity > 0.7) {
          score += nameSimilarity * 50;
          reasons.push(`Name match: ${Math.round(nameSimilarity * 100)}%`);
        }
      }

      // Category to type mapping
      const categoryTypeMap: Record<string, string[]> = {
        quest_item: ["quest"],
        reward: ["weapon", "armor", "tool"],
        key: ["quest", "item"],
        consumable: ["consumable"],
        equipment: ["weapon", "armor", "tool"],
        material: ["resource"],
        currency: ["item"],
      };

      const expectedTypes = categoryTypeMap[plannedItem.category] || [];
      if (expectedTypes.includes(existing.type)) {
        score += 20;
        reasons.push(`Type match: ${existing.type}`);
      }

      // Rarity match
      if (plannedItem.suggestedRarity === existing.rarity) {
        score += 15;
        reasons.push(`Rarity match: ${existing.rarity}`);
      }

      if (score > 30) {
        matches.push({
          planned: {
            tempId: plannedItem.tempId,
            suggestedName: plannedItem.suggestedName,
            narrativeFunction: plannedItem.narrativeFunction,
          },
          existing: { id: existing.id, name: existing.name, type: existing.type },
          matchScore: Math.min(score, 100),
          matchReason: reasons.join("; "),
        });
      }
    }
  }

  return matches.sort((a, b) => b.matchScore - a.matchScore);
}

export async function findExistingLocationMatches(
  entityPlan: EntityPlan,
  worldBible: WorldBible
): Promise<ExistingEntityMatch<{ id: string; name: string; theme: string }>[]> {
  const existingTiles = await repository.tiles.getAll();
  const matches: ExistingEntityMatch<{ id: string; name: string; theme: string }>[] = [];

  for (const plannedLocation of entityPlan.locations) {
    if (plannedLocation.useExistingId) continue;

    for (const existing of existingTiles) {
      let score = 0;
      const reasons: string[] = [];

      // Name similarity
      if (plannedLocation.suggestedName) {
        const nameSimilarity = calculateStringSimilarity(
          plannedLocation.suggestedName.toLowerCase(),
          existing.name.toLowerCase()
        );
        if (nameSimilarity > 0.7) {
          score += nameSimilarity * 50;
          reasons.push(`Name match: ${Math.round(nameSimilarity * 100)}%`);
        }
      }

      // Theme/biome match
      if (plannedLocation.suggestedBiome) {
        if (existing.theme.toLowerCase().includes(plannedLocation.suggestedBiome.toLowerCase())) {
          score += 25;
          reasons.push(`Theme match: ${existing.theme}`);
        }
      }

      // Region match via theme
      if (plannedLocation.suggestedRegion) {
        const region = worldBible.regions.find((r) => r.id === plannedLocation.suggestedRegion);
        if (region && existing.theme.toLowerCase().includes(region.climate.toLowerCase())) {
          score += 20;
          reasons.push(`Climate match: ${region.climate}`);
        }
      }

      if (score > 30) {
        matches.push({
          planned: {
            tempId: plannedLocation.tempId,
            suggestedName: plannedLocation.suggestedName,
            narrativeFunction: plannedLocation.narrativeFunction,
          },
          existing: { id: existing.id, name: existing.name, theme: existing.theme },
          matchScore: Math.min(score, 100),
          matchReason: reasons.join("; "),
        });
      }
    }
  }

  return matches.sort((a, b) => b.matchScore - a.matchScore);
}

// ============================================================================
// Validation
// ============================================================================

export interface ValidationIssue {
  type: "error" | "warning";
  entityType: "item" | "npc" | "location" | "objective";
  entityId: string;
  message: string;
}

export function validateGeneratedEntities(
  entityPlan: EntityPlan,
  items: GeneratedItem[],
  npcs: GeneratedNPC[],
  locations: GeneratedLocation[]
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // Check all planned items were generated
  for (const planned of entityPlan.items) {
    if (!planned.useExistingId) {
      const generated = items.find((i) => i.tempId === planned.tempId);
      if (!generated) {
        issues.push({
          type: "error",
          entityType: "item",
          entityId: planned.tempId,
          message: `Planned item "${planned.suggestedName || planned.tempId}" was not generated`,
        });
      }
    }
  }

  // Check all planned NPCs were generated
  for (const planned of entityPlan.npcs) {
    if (!planned.useExistingId) {
      const generated = npcs.find((n) => n.tempId === planned.tempId);
      if (!generated) {
        issues.push({
          type: "error",
          entityType: "npc",
          entityId: planned.tempId,
          message: `Planned NPC "${planned.suggestedName || planned.tempId}" was not generated`,
        });
      }
    }
  }

  // Check all planned locations were generated
  for (const planned of entityPlan.locations) {
    if (!planned.useExistingId) {
      const generated = locations.find((l) => l.tempId === planned.tempId);
      if (!generated) {
        issues.push({
          type: "error",
          entityType: "location",
          entityId: planned.tempId,
          message: `Planned location "${planned.suggestedName || planned.tempId}" was not generated`,
        });
      }
    }
  }

  // Check for duplicate IDs
  const itemIds = new Set<string>();
  for (const item of items) {
    if (itemIds.has(item.id)) {
      issues.push({
        type: "error",
        entityType: "item",
        entityId: item.id,
        message: `Duplicate item ID: ${item.id}`,
      });
    }
    itemIds.add(item.id);
  }

  const npcIds = new Set<string>();
  for (const npc of npcs) {
    if (npcIds.has(npc.entity_id)) {
      issues.push({
        type: "error",
        entityType: "npc",
        entityId: npc.entity_id,
        message: `Duplicate NPC ID: ${npc.entity_id}`,
      });
    }
    npcIds.add(npc.entity_id);
  }

  // Check NPC item references
  for (const npc of npcs) {
    const planned = entityPlan.npcs.find((p) => p.tempId === npc.tempId);
    if (planned) {
      for (const itemTempId of [...planned.givesItems, ...planned.wantsItems, ...planned.dropsItems]) {
        const itemExists = items.some((i) => i.tempId === itemTempId) ||
          entityPlan.items.some((i) => i.tempId === itemTempId && i.useExistingId);
        if (!itemExists) {
          issues.push({
            type: "warning",
            entityType: "npc",
            entityId: npc.entity_id,
            message: `NPC references unknown item: ${itemTempId}`,
          });
        }
      }
    }
  }

  return issues;
}

// ============================================================================
// Utility Functions
// ============================================================================

function calculateStringSimilarity(str1: string, str2: string): number {
  if (str1 === str2) return 1;
  if (str1.length === 0 || str2.length === 0) return 0;

  // Simple Jaccard similarity on words
  const words1 = new Set(str1.split(/\s+/));
  const words2 = new Set(str2.split(/\s+/));

  const intersection = new Set([...words1].filter((x) => words2.has(x)));
  const union = new Set([...words1, ...words2]);

  return intersection.size / union.size;
}

function getRoleKeywords(role: string): string[] {
  const keywords: Record<string, string[]> = {
    quest_giver: ["quest", "task", "mission", "help", "need"],
    ally: ["friend", "ally", "help", "support", "companion"],
    antagonist: ["enemy", "villain", "oppose", "threat", "danger"],
    merchant: ["trade", "sell", "buy", "merchant", "shop", "goods"],
    informant: ["information", "secret", "know", "tell", "rumor"],
    victim: ["victim", "help", "save", "rescue", "danger"],
    boss: ["leader", "chief", "boss", "powerful", "command"],
    minion: ["servant", "follower", "minion", "guard", "soldier"],
    bystander: ["witness", "local", "resident", "citizen"],
  };

  return keywords[role] || [];
}

// ============================================================================
// ID Generation
// ============================================================================

export function generateEntityId(type: "item" | "npc" | "location", name: string, questId: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .substring(0, 30);

  const prefix = type === "npc" ? "npc" : type === "location" ? "tile" : "item";
  const questSlug = questId.substring(0, 10);

  return `${prefix}_${questSlug}_${slug}`;
}

export function generateQuestId(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .substring(0, 40);

  const timestamp = Date.now().toString(36).substring(-6);

  return `quest_${slug}_${timestamp}`;
}

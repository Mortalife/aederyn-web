import type { ItemDurability, ItemAttributes, ItemRequirements, ItemEffect, EffectStrength, RequirementReward, Quest, QuestType } from "@aederyn/types";

import {
  QuestSchema,
  ResourcePoolEntrySchema,
  MonsterPoolEntrySchema,
  EffectPoolEntrySchema,
  type ResourcePoolEntry,
  type MonsterPoolEntry,
  type EffectPoolEntry,
} from "@aederyn/types";
import { z } from "zod";

type FormBody = Record<string, string | File | (string | File)[]>;

const parsePool = <T extends z.ZodTypeAny>(body: FormBody, field: string, entry: T): z.infer<T>[] => {
  const raw = typeof body[field] === "string" ? (body[field] as string).trim() : "";
  if (!raw) return [];
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch (e) {
    throw new Error(`${field}: not valid JSON (${(e as Error).message})`);
  }
  const result = z.array(entry).safeParse(json);
  if (!result.success) {
    throw new Error(
      `${field}: ${result.error.issues.map((i) => `${i.path.join(".")} ${i.message}`).join("; ")}`
    );
  }
  return result.data;
};

/** A tile form's pool textareas, as JSON arrays of pool entries. Throws on invalid input. */
export function parseTilePools(body: FormBody): {
  resources: ResourcePoolEntry[];
  monsters?: MonsterPoolEntry[];
  effects?: EffectPoolEntry[];
} {
  const monsters = parsePool(body, "monsters", MonsterPoolEntrySchema);
  const effects = parsePool(body, "effects", EffectPoolEntrySchema);
  return {
    resources: parsePool(body, "resources", ResourcePoolEntrySchema),
    monsters: monsters.length ? monsters : undefined,
    effects: effects.length ? effects : undefined,
  };
}

export interface RewardItemEntry {
  item_id: string;
  qty: number;
}

export interface RequiredItemEntry {
  item_id: string;
  qty: number;
  consumed: boolean;
  itemDurabilityReduction?: number;
}

export function parseItemQuantityList(body: FormBody, fieldName: string): RewardItemEntry[] {
  const items: RewardItemEntry[] = [];
  let index = 0;
  
  while (true) {
    const itemId = body[`${fieldName}[${index}].item_id`];
    const qty = body[`${fieldName}[${index}].qty`];
    
    if (!itemId) break;
    
    if (typeof itemId === 'string' && itemId.trim()) {
      items.push({
        item_id: itemId,
        qty: parseInt(qty as string) || 1,
      });
    }
    index++;
  }
  
  return items;
}

export function parseRequiredItemList(body: FormBody, fieldName: string): RequiredItemEntry[] {
  const items: RequiredItemEntry[] = [];
  let index = 0;
  
  while (true) {
    const itemId = body[`${fieldName}[${index}].item_id`];
    const qty = body[`${fieldName}[${index}].qty`];
    const consumed = body[`${fieldName}[${index}].consumed`];
    const durability = body[`${fieldName}[${index}].itemDurabilityReduction`];
    
    if (!itemId) break;
    
    if (typeof itemId === 'string' && itemId.trim()) {
      items.push({
        item_id: itemId,
        qty: parseInt(qty as string) || 1,
        consumed: consumed === 'on',
        itemDurabilityReduction: parseInt(durability as string) || undefined,
      });
    }
    index++;
  }
  
  return items;
}

export function parseStringArray(body: FormBody, fieldName: string): string[] {
  const items: string[] = [];
  let index = 0;
  
  while (true) {
    const value = body[`${fieldName}[${index}]`];
    
    if (value === undefined) break;
    
    if (typeof value === 'string' && value.trim()) {
      items.push(value);
    }
    index++;
  }
  
  return items;
}

export function parseItemDurability(body: FormBody): ItemDurability | undefined {
  if (body.hasDurability !== 'on') return undefined;
  
  return {
    current: parseInt(body.durability_current as string) || 100,
    max: parseInt(body.durability_max as string) || 100,
  };
}

export function parseItemAttributes(body: FormBody): ItemAttributes | undefined {
  const attrs: ItemAttributes = {};
  
  const damage = parseInt(body.attributes_damage as string);
  const armor = parseInt(body.attributes_armor as string);
  const health = parseInt(body.attributes_health as string);
  const mana = parseInt(body.attributes_mana as string);
  const strength = parseInt(body.attributes_strength as string);
  const dexterity = parseInt(body.attributes_dexterity as string);
  const intelligence = parseInt(body.attributes_intelligence as string);
  
  if (damage > 0) attrs.damage = damage;
  if (armor > 0) attrs.armor = armor;
  if (health > 0) attrs.health = health;
  if (mana > 0) attrs.mana = mana;
  if (strength > 0) attrs.strength = strength;
  if (dexterity > 0) attrs.dexterity = dexterity;
  if (intelligence > 0) attrs.intelligence = intelligence;
  
  return Object.keys(attrs).length > 0 ? attrs : undefined;
}

export function parseItemRequirements(body: FormBody): ItemRequirements | undefined {
  const reqs: ItemRequirements = {};
  
  const level = parseInt(body.requirements_level as string);
  const strength = parseInt(body.requirements_strength as string);
  const dexterity = parseInt(body.requirements_dexterity as string);
  const intelligence = parseInt(body.requirements_intelligence as string);
  
  if (level > 0) reqs.level = level;
  if (strength > 0) reqs.strength = strength;
  if (dexterity > 0) reqs.dexterity = dexterity;
  if (intelligence > 0) reqs.intelligence = intelligence;
  
  return Object.keys(reqs).length > 0 ? reqs : undefined;
}

/** Rows posted as `name[i].id`, `name[i].strength` (and `.duration`), in index order. */
function parseEffectRows(body: FormBody, fieldName: string) {
  const pattern = new RegExp(`^${fieldName}\\[(\\d+)\\]\\.id$`);
  return Object.keys(body)
    .map((key) => key.match(pattern)?.[1])
    .filter((index): index is string => index !== undefined)
    .sort((a, b) => Number(a) - Number(b))
    .map((index) => ({
      id: body[`${fieldName}[${index}].id`],
      strength: parseFloat(body[`${fieldName}[${index}].strength`] as string) || 0,
      duration: parseFloat(body[`${fieldName}[${index}].duration`] as string) || 0,
    }))
    .filter((row): row is { id: string; strength: number; duration: number } =>
      typeof row.id === "string" && row.id.trim() !== ""
    );
}

export function parseEffectStrengths(body: FormBody, fieldName: string): EffectStrength[] | undefined {
  const rows = parseEffectRows(body, fieldName).map(({ id, strength }) => ({ id, strength }));
  return rows.length > 0 ? rows : undefined;
}

export function parseItemEffects(body: FormBody): ItemEffect[] | undefined {
  const rows = parseEffectRows(body, "effects");
  return rows.length > 0 ? rows : undefined;
}

export function parseRelationships(body: FormBody): Record<string, string[]> {
  const relationships: Record<string, string[]> = {};
  const types = ['friends', 'family', 'rivals', 'enemies', 'mentors', 'students', 'acquaintances'];
  
  for (const type of types) {
    const entries: string[] = [];
    let index = 0;
    
    while (true) {
      const value = body[`relationships[${type}][${index}]`];
      if (value === undefined) break;
      
      if (typeof value === 'string' && value.trim()) {
        entries.push(value.trim());
      }
      index++;
    }
    
    if (entries.length > 0) {
      relationships[type] = entries;
    }
  }
  
  return relationships;
}

export function parseRewards(body: FormBody): RequirementReward[] {
  const rewards: RequirementReward[] = [];
  let index = 0;
  
  while (true) {
    const type = body[`rewards[${index}].type`];
    if (!type) break;
    
    const amount = parseInt(body[`rewards[${index}].amount`] as string) || 1;
    
    switch (type) {
      case 'item':
        rewards.push({
          type: 'item',
          item_id: body[`rewards[${index}].item_id`] as string || '',
          amount,
        });
        break;
      case 'gold':
        rewards.push({
          type: 'gold',
          amount,
        });
        break;
      case 'skill':
        rewards.push({
          type: 'skill',
          skill_id: body[`rewards[${index}].skill_id`] as string || '',
          amount,
        });
        break;
    }
    index++;
  }
  
  return rewards;
}

const text = (body: FormBody, field: string) =>
  typeof body[field] === "string" ? (body[field] as string).trim() : "";

/**
 * A quest form: story quests have a giver and a turn-in NPC (each met at
 * their home unless a landmark is given), contracts a board. Objectives are
 * a JSON array. Throws with the schema's complaints if the result is invalid.
 */
export function parseQuestForm(body: FormBody, id: string): Quest {
  let objectives: unknown;
  try {
    objectives = JSON.parse(text(body, "objectives") || "[]");
  } catch (e) {
    throw new Error(`objectives: not valid JSON (${(e as Error).message})`);
  }

  const landmark = (field: string) => text(body, field) || undefined;
  const base = {
    id,
    type: body.type as QuestType,
    name: text(body, "name"),
    description: text(body, "description"),
    objectives,
    rewards: parseRewards(body),
    prerequisites: parseStringArray(body, "prerequisites"),
    is_tutorial: body.is_tutorial === "on" || undefined,
  };
  if (base.prerequisites.length === 0) delete (base as Partial<typeof base>).prerequisites;

  const excludes = parseStringArray(body, "excludes");
  const quest =
    body.kind === "contract"
      ? {
          ...base,
          kind: "contract",
          board: text(body, "board"),
          completion: { message: text(body, "completion_message") },
        }
      : {
          ...base,
          kind: "story",
          giver: { entity_id: text(body, "giver_entity_id"), landmark: landmark("giver_landmark") },
          completion: {
            entity_id: text(body, "completion_entity_id") || text(body, "giver_entity_id"),
            landmark: landmark("completion_landmark"),
            message: text(body, "completion_message"),
            return_message: text(body, "completion_return_message"),
          },
          ...(excludes.length ? { excludes } : {}),
        };

  const result = QuestSchema.safeParse(JSON.parse(JSON.stringify(quest)));
  if (!result.success) {
    throw new Error(result.error.issues.map((i) => `${i.path.join(".")} ${i.message}`).join("; "));
  }
  return result.data;
}

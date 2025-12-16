import type { ItemDurability, ItemAttributes, ItemRequirements, ItemEffect, TileObjective, Objective, RequirementReward, TileCompletion, Completion, DialogStep } from "@aederyn/types";

type FormBody = Record<string, string | File | (string | File)[]>;

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

export function parseItemEffects(body: FormBody): ItemEffect[] {
  const effects: ItemEffect[] = [];
  let index = 0;
  
  while (true) {
    const type = body[`effects[${index}].type`];
    const value = body[`effects[${index}].value`];
    const duration = body[`effects[${index}].duration`];
    
    if (!type) break;
    
    if (typeof type === 'string' && type.trim()) {
      effects.push({
        type,
        value: parseInt(value as string) || 0,
        duration: parseInt(duration as string) || 0,
      });
    }
    index++;
  }
  
  return effects;
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

export function parseObjectives(body: FormBody, isTileQuest = true): (Objective | TileObjective)[] {
  const objectives: (Objective | TileObjective)[] = [];
  let index = 0;
  
  while (true) {
    const type = body[`objectives[${index}].type`];
    if (!type) break;
    
    const id = (body[`objectives[${index}].id`] as string) || `obj_${index + 1}`;
    const description = (body[`objectives[${index}].description`] as string) || '';
    const baseObj = { id, description, progress: null };
    
    switch (type) {
      case 'gather':
        objectives.push({
          ...baseObj,
          type: 'gather',
          resource_id: body[`objectives[${index}].resource_id`] as string || '',
          amount: parseInt(body[`objectives[${index}].amount`] as string) || 1,
        });
        break;
      case 'collect':
        objectives.push({
          ...baseObj,
          type: 'collect',
          item_id: body[`objectives[${index}].item_id`] as string || '',
          amount: parseInt(body[`objectives[${index}].amount`] as string) || 1,
        });
        break;
      case 'talk': {
        const dialogSteps: DialogStep[] = [];
        let stepIndex = 0;
        while (true) {
          const dialog = body[`objectives[${index}].dialog_steps[${stepIndex}].dialog`];
          if (!dialog) break;
          dialogSteps.push({
            entity_id: (body[`objectives[${index}].dialog_steps[${stepIndex}].entity_id`] as string) || null,
            dialog: dialog as string,
          });
          stepIndex++;
        }
        if (isTileQuest) {
          objectives.push({
            ...baseObj,
            type: 'talk',
            entity_id: body[`objectives[${index}].entity_id`] as string || '',
            zone_id: body[`objectives[${index}].zone_id`] as string || '',
            dialog_steps: dialogSteps,
            x: 0,
            y: 0,
          });
        } else {
          objectives.push({
            ...baseObj,
            type: 'talk',
            entity_id: body[`objectives[${index}].entity_id`] as string || '',
            zone_id: body[`objectives[${index}].zone_id`] as string || '',
            dialog_steps: dialogSteps,
          });
        }
        break;
      }
      case 'explore':
        if (isTileQuest) {
          objectives.push({
            ...baseObj,
            type: 'explore',
            zone_id: body[`objectives[${index}].zone_id`] as string || '',
            chance: parseInt(body[`objectives[${index}].chance`] as string) || 100,
            found_message: (body[`objectives[${index}].found_message`] as string) || null,
            x: 0,
            y: 0,
          });
        } else {
          objectives.push({
            ...baseObj,
            type: 'explore',
            zone_id: body[`objectives[${index}].zone_id`] as string || '',
            chance: parseInt(body[`objectives[${index}].chance`] as string) || 100,
            found_message: (body[`objectives[${index}].found_message`] as string) || null,
          });
        }
        break;
      case 'craft':
        objectives.push({
          ...baseObj,
          type: 'craft',
          resource_id: body[`objectives[${index}].resource_id`] as string || '',
          amount: parseInt(body[`objectives[${index}].amount`] as string) || 1,
        });
        break;
    }
    index++;
  }
  
  return objectives;
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

export function parseCompletion(body: FormBody, isTileQuest = true): Completion | TileCompletion {
  const base = {
    entity_id: body.completion_entity_id as string || '',
    zone_id: body.completion_zone_id as string || '',
    message: body.completion_message as string || '',
    return_message: body.completion_return_message as string || '',
  };
  
  if (isTileQuest) {
    return {
      ...base,
      x: parseInt(body.completion_x as string) || 0,
      y: parseInt(body.completion_y as string) || 0,
    };
  }
  
  return base;
}

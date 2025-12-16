import type { WorldBible } from "@aederyn/types";
import { repository } from "../repository/index.js";

export interface AIContext {
  worldSummary: string;
  relevantLore: string[];
  existingEntities: {
    items: string[];
    npcs: string[];
    quests: string[];
  };
  constraints: {
    balanceGuidelines: string;
    namingConventions: string;
    thematicRequirements: string;
  };
}

export async function buildAIContext(
  worldBible: WorldBible,
  focusArea?: string
): Promise<AIContext> {
  const worldSummary = `
Setting: ${worldBible.setting.genre} ${worldBible.setting.era}
Tone: ${worldBible.setting.tone}
Description: ${worldBible.setting.description}

Key Themes:
${worldBible.themes.map((t) => `- ${t.name}: ${t.description}`).join("\n")}

Regions:
${worldBible.regions.map((r) => `- ${r.name}: ${r.description}`).join("\n")}

Factions:
${worldBible.factions.map((f) => `- ${f.name} (${f.alignment}): ${f.description}`).join("\n")}
  `.trim();

  const relevantLore: string[] = [];

  if (focusArea) {
    const matchingRegion = worldBible.regions.find(
      (r) => r.id === focusArea || r.name.toLowerCase().includes(focusArea.toLowerCase())
    );
    if (matchingRegion) {
      relevantLore.push(`Region: ${matchingRegion.name} - ${matchingRegion.description}`);
      relevantLore.push(`Climate: ${matchingRegion.climate}`);
      relevantLore.push(`Themes: ${matchingRegion.themes.join(", ")}`);
    }

    const matchingFaction = worldBible.factions.find(
      (f) => f.id === focusArea || f.name.toLowerCase().includes(focusArea.toLowerCase())
    );
    if (matchingFaction) {
      relevantLore.push(`Faction: ${matchingFaction.name} - ${matchingFaction.description}`);
      relevantLore.push(`Goals: ${matchingFaction.goals.join(", ")}`);
    }

    const matchingHistory = worldBible.history.filter(
      (h) => h.relatedEntities.includes(focusArea) || h.name.toLowerCase().includes(focusArea.toLowerCase())
    );
    for (const event of matchingHistory) {
      relevantLore.push(`Historical Event: ${event.name} - ${event.description}`);
    }
  }

  const [items, npcs, quests] = await Promise.all([
    repository.items.getAll(),
    repository.npcs.getAll(),
    repository.quests.getAll(),
  ]);

  const namingPatterns = [
    ...worldBible.naming.characterPatterns,
    ...worldBible.naming.itemPatterns,
    ...worldBible.naming.placePatterns,
  ].filter(Boolean);

  return {
    worldSummary,
    relevantLore,
    existingEntities: {
      items: items.slice(0, 20).map((i) => `${i.name}: ${i.description}`),
      npcs: npcs.slice(0, 20).map((n) => `${n.name}: ${n.backstory?.substring(0, 100) || ""}`),
      quests: quests.slice(0, 10).map((q) => `${q.name}: ${q.description}`),
    },
    constraints: {
      balanceGuidelines: buildBalanceGuidelines(),
      namingConventions: namingPatterns.length > 0 ? namingPatterns.join(", ") : "Use thematic names fitting the world",
      thematicRequirements: worldBible.themes.map((t) => t.name).join(", ") || "Match the world's tone",
    },
  };
}

function buildBalanceGuidelines(): string {
  return `
- Common items: value 1-50, basic effects
- Uncommon items: value 50-200, minor bonuses
- Rare items: value 200-1000, significant effects
- Epic items: value 1000-5000, powerful abilities
- Legendary items: value 5000+, unique world-changing effects
  `.trim();
}

export function buildItemGenerationPrompt(
  context: AIContext,
  request: {
    type: string;
    rarity: string;
    theme?: string;
    relatedTo?: string;
  }
): string {
  return `
You are a game designer creating items for a ${context.worldSummary}

Existing items in the game (for consistency):
${context.existingEntities.items.slice(0, 10).join("\n")}

Naming conventions: ${context.constraints.namingConventions}
Themes to incorporate: ${context.constraints.thematicRequirements}
Balance guidelines:
${context.constraints.balanceGuidelines}

Generate a ${request.rarity} ${request.type} item.
${request.theme ? `Theme/style: ${request.theme}` : ""}
${request.relatedTo ? `Should relate to: ${request.relatedTo}` : ""}

Respond with JSON in this exact format:
{
  "name": "Item Name",
  "description": "2-3 sentence description",
  "type": "${request.type}",
  "rarity": "${request.rarity}",
  "value": <number based on rarity>,
  "weight": <number>,
  "stackable": <boolean>,
  "maxStackSize": <number if stackable>,
  "equippable": <boolean>,
  "equipSlot": "<slot if equippable>"
}
  `.trim();
}

export function buildQuestGenerationPrompt(
  context: AIContext,
  request: {
    type?: string;
    giver?: string;
    region?: string;
    difficulty?: string;
  }
): string {
  return `
You are a quest designer for a ${context.worldSummary}

Existing quests (for variety):
${context.existingEntities.quests.slice(0, 5).join("\n")}

Relevant lore:
${context.relevantLore.join("\n")}

Generate a quest.
${request.type ? `Quest type: ${request.type}` : ""}
${request.giver ? `Quest giver: ${request.giver}` : ""}
${request.region ? `Takes place in: ${request.region}` : ""}
${request.difficulty ? `Difficulty: ${request.difficulty}` : ""}

The quest should:
- Fit the world's tone and themes
- Have clear objectives
- Offer appropriate rewards
- Connect to existing lore when possible

Respond with JSON in this exact format:
{
  "name": "Quest Name",
  "description": "Quest description for player",
  "type": "main|side|daily|tutorial",
  "objectives": [
    { "type": "collect|talk|explore|craft", "description": "...", "target": "item/npc id", "amount": 1 }
  ],
  "rewards": [
    { "type": "item|currency", "id": "item-id", "amount": 1 }
  ],
  "dialogue": {
    "intro": "Quest giver's introduction",
    "progress": "What they say mid-quest",
    "completion": "What they say on completion"
  }
}
  `.trim();
}

export function buildNPCGenerationPrompt(
  context: AIContext,
  request: {
    role?: string;
    faction?: string;
    region?: string;
  }
): string {
  return `
You are creating an NPC for a ${context.worldSummary}

Existing NPCs (for relationship potential):
${context.existingEntities.npcs.slice(0, 10).join("\n")}

Naming conventions: ${context.constraints.namingConventions}

Generate an NPC.
${request.role ? `Role: ${request.role}` : ""}
${request.faction ? `Faction: ${request.faction}` : ""}
${request.region ? `Lives in: ${request.region}` : ""}

The NPC should have:
- A fitting name
- A backstory that connects to the world
- Clear motivations
- Potential relationships with existing NPCs

Respond with JSON in this exact format:
{
  "name": "NPC Name",
  "entity_id": "npc-id-slug",
  "backstory": "2-3 paragraph backstory",
  "personalMission": "What drives them",
  "hopes": "What they hope for",
  "fears": "What they fear",
  "relationships": {
    "friends": ["Existing NPC - relationship description"],
    "rivals": [],
    "family": []
  }
}
  `.trim();
}

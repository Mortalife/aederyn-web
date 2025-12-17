import type { WorldBible } from "@aederyn/types";
import type {
  QuestOutlay,
  EntityPlan,
  PlannedNPC,
  PlannedItem,
  PlannedLocation,
  GeneratedItem,
  GeneratedNPC,
} from "./ai-quest-schemas.js";

// ============================================================================
// Context Building Helpers
// ============================================================================

export function buildWorldContext(worldBible: WorldBible): string {
  return `
# World: ${worldBible.name}
Setting: ${worldBible.setting.genre} ${worldBible.setting.era}
Tone: ${worldBible.setting.tone}

## Description
${worldBible.setting.description}

## Themes
${worldBible.themes.map((t) => `- **${t.name}**: ${t.description}`).join("\n")}

## Factions
${worldBible.factions.map((f) => `- **${f.name}** (${f.alignment}): ${f.description.substring(0, 200)}...`).join("\n")}

## Regions
${worldBible.regions.map((r) => `- **${r.name}** (${r.climate}): ${r.description.substring(0, 200)}...`).join("\n")}

## Naming Conventions
- Characters: ${worldBible.naming.characterPatterns.slice(0, 3).join(", ")}
- Places: ${worldBible.naming.placePatterns.slice(0, 3).join(", ")}
- Items: ${worldBible.naming.itemPatterns.slice(0, 3).join(", ")}
`.trim();
}

export function buildOutlayContext(outlay: QuestOutlay): string {
  return `
# Quest Narrative

## Hook
${outlay.questHook}

## Background & Context
${outlay.backgroundContext}

## Core Conflict
${outlay.coreConflict}

## Key Characters
${outlay.keyCharacters}

## Stakes & Consequences
${outlay.stakesConsequences}

## Thematic Connections
${outlay.thematicConnections}

## Regional Integration
${outlay.regionalIntegration}

## Faction Involvement
${outlay.factionInvolvement}
`.trim();
}

// ============================================================================
// Phase 1: Outlay Generation Prompt
// ============================================================================

export function buildOutlayPrompt(
  worldBible: WorldBible,
  request: {
    name?: string;
    concept?: string;
    type: string;
    region?: string;
    faction?: string;
  }
): string {
  const worldContext = buildWorldContext(worldBible);

  const regionContext = request.region
    ? worldBible.regions.find((r) => r.id === request.region)
    : undefined;

  const factionContext = request.faction
    ? worldBible.factions.find((f) => f.id === request.faction)
    : undefined;

  const hasName = request.name && request.name.trim();
  const hasConcept = request.concept && request.concept.trim();

  return `
You are a quest designer for a narrative-driven RPG. Create a comprehensive quest narrative document.

${worldContext}

${regionContext ? `## Focus Region: ${regionContext.name}\n${regionContext.description}` : ""}
${factionContext ? `## Focus Faction: ${factionContext.name}\n${factionContext.description}` : ""}

---

## Quest Request
- **Type**: ${request.type}
${hasName ? `- **Name**: ${request.name}` : "- **Name**: Generate an evocative quest name that fits the world"}
${hasConcept ? `- **Concept**: ${request.concept}` : "- **Concept**: Create an original quest concept based on the world's themes, factions, and conflicts"}
${request.region ? `- **Region**: ${request.region}` : ""}
${request.faction ? `- **Faction**: ${request.faction}` : ""}

---

Generate a comprehensive quest outlay (500-1000 words total) with the following sections:

1. **Quest Hook** (100-150 words): What draws the player in? What's the inciting incident?
2. **Background & Context** (100-150 words): How does this quest fit into the world? What history or lore is relevant?
3. **Core Conflict** (100-150 words): What is the central problem or challenge?
4. **Key Characters** (100-150 words): Who are the major players? Describe them narratively, not as game entities.
5. **Stakes & Consequences** (75-100 words): What happens if the player succeeds or fails?
6. **Thematic Connections** (50-75 words): How does this quest reinforce the world's themes?
7. **Regional Integration** (50-75 words): Where does this take place? How does it connect to other areas?
8. **Faction Involvement** (50-75 words): Which factions are affected or involved?

This narrative will serve as the foundation for generating all game entities (NPCs, items, locations).
Make it rich, evocative, and deeply connected to the world's lore.
`.trim();
}

// ============================================================================
// Phase 2: Entity Planning Prompt
// ============================================================================

export function buildEntityPlanPrompt(
  worldBible: WorldBible,
  outlay: QuestOutlay,
  questId: string
): string {
  const worldContext = buildWorldContext(worldBible);
  const outlayContext = buildOutlayContext(outlay);

  return `
You are analyzing a quest narrative to extract required game entities.

${worldContext}

---

${outlayContext}

---

## Task
Analyze the quest narrative above and identify ALL game entities needed to implement this quest.

### NPCs to Identify
For each NPC mentioned or implied in the narrative:
- Assign a tempId (e.g., "npc_1", "npc_2")
- Determine their role: quest_giver, ally, antagonist, merchant, informant, victim, boss, minion, bystander
- Determine importance: critical (quest fails without them), supporting, minor
- Extract any suggested name from the narrative
- Identify their faction affiliation if mentioned
- Note their narrative function (what they do in the story)
- List dialogue requirements (what conversations are needed)
- Note relationships to other NPCs
- List items they give, want, or drop

### Items to Identify
For each item mentioned or implied:
- Assign a tempId (e.g., "item_1", "item_2")
- Categorize: quest_item, reward, key, consumable, equipment, material, currency
- Determine importance: critical, optional, bonus
- Note how it's obtained: given, found, crafted, looted, purchased, quest_reward
- Describe its narrative function
- Note what it's used for in the quest

### Locations to Identify
For each location mentioned or implied:
- Assign a tempId (e.g., "loc_1", "loc_2")
- Categorize: dungeon, town, wilderness, interior, landmark, hub
- Determine importance: primary, secondary, optional
- Identify the region from world bible
- Note NPCs and items present
- Describe quest events that happen there
- Note connections to other locations

### Objectives to Plan
Create a sequence of objectives that guide the player through the quest:
- Assign stage numbers (1, 2, 3, etc.)
- Types: talk, kill, collect, deliver, explore, escort, defend, craft, use_item
- Reference the NPCs, items, and locations by their tempIds

### World Integration
- Identify which factions are involved and their roles
- Connect to world themes
- Map locations to regions

Be thorough - every character, item, and place mentioned in the narrative should be captured.
`.trim();
}

// ============================================================================
// Phase 3: Entity Generation Prompts
// ============================================================================

export function buildItemGenerationPrompt(
  worldBible: WorldBible,
  outlay: QuestOutlay,
  item: PlannedItem,
  questName: string
): string {
  const worldContext = buildWorldContext(worldBible);

  return `
You are creating an item for the quest "${questName}".

${worldContext}

---

## Quest Context
${outlay.questHook}
${outlay.coreConflict}

---

## Item Requirements
- **Role**: ${item.narrativeFunction}
- **Category**: ${item.category}
- **Importance**: ${item.importance}
- **How obtained**: ${item.obtainMethod}
${item.suggestedName ? `- **Suggested name**: ${item.suggestedName}` : ""}
${item.suggestedRarity ? `- **Suggested rarity**: ${item.suggestedRarity}` : ""}
${item.outlayReference ? `- **From narrative**: "${item.outlayReference}"` : ""}
${item.generationNotes ? `- **Notes**: ${item.generationNotes}` : ""}

---

## Naming Conventions
${worldBible.naming.itemPatterns.join("\n")}

## Examples
${worldBible.naming.examples.items.join(", ")}

---

Generate a complete item that:
1. Fits the narrative role described
2. Matches the world's style and naming conventions
3. Has appropriate rarity and value for its importance
4. Has a description that hints at its quest significance
`.trim();
}

export function buildNPCGenerationPrompt(
  worldBible: WorldBible,
  outlay: QuestOutlay,
  npc: PlannedNPC,
  questName: string,
  itemIdMap: Map<string, string>
): string {
  const worldContext = buildWorldContext(worldBible);

  const resolveItemId = (tempId: string) => itemIdMap.get(tempId) || tempId;

  return `
You are creating an NPC for the quest "${questName}".

${worldContext}

---

## Quest Context
${outlay.questHook}
${outlay.keyCharacters}

---

## NPC Requirements
- **Role**: ${npc.role} (${npc.importance})
- **Function**: ${npc.narrativeFunction}
${npc.suggestedName ? `- **Suggested name**: ${npc.suggestedName}` : ""}
${npc.suggestedFaction ? `- **Faction**: ${npc.suggestedFaction}` : ""}
${npc.outlayReference ? `- **From narrative**: "${npc.outlayReference}"` : ""}
${npc.generationNotes ? `- **Notes**: ${npc.generationNotes}` : ""}

## Dialogue Requirements
${npc.dialogueNeeds.map((d) => `- **${d.trigger}**: ${d.purpose}${d.mustReveal ? ` (must reveal: ${d.mustReveal.join(", ")})` : ""}`).join("\n")}

## Item Interactions
- **Gives**: ${npc.givesItems.map(resolveItemId).join(", ") || "none"}
- **Wants**: ${npc.wantsItems.map(resolveItemId).join(", ") || "none"}
- **Drops**: ${npc.dropsItems.map(resolveItemId).join(", ") || "none"}

---

## Naming Conventions
${worldBible.naming.characterPatterns.join("\n")}

## Examples
${worldBible.naming.examples.characters.join(", ")}

---

Generate a complete NPC with:
1. A fitting name following naming conventions
2. A backstory that connects to the quest and world
3. Clear personal mission, hopes, and fears
4. Personality that fits their role
`.trim();
}

export function buildLocationGenerationPrompt(
  worldBible: WorldBible,
  outlay: QuestOutlay,
  location: PlannedLocation,
  questName: string,
  npcIdMap: Map<string, string>,
  itemIdMap: Map<string, string>
): string {
  const worldContext = buildWorldContext(worldBible);

  const resolveNpcId = (tempId: string) => npcIdMap.get(tempId) || tempId;
  const resolveItemId = (tempId: string) => itemIdMap.get(tempId) || tempId;

  const regionContext = location.suggestedRegion
    ? worldBible.regions.find((r) => r.id === location.suggestedRegion)
    : undefined;

  return `
You are creating a location for the quest "${questName}".

${worldContext}

${regionContext ? `## Region: ${regionContext.name}\n${regionContext.description}` : ""}

---

## Quest Context
${outlay.regionalIntegration}
${outlay.coreConflict}

---

## Location Requirements
- **Type**: ${location.locationType}
- **Importance**: ${location.importance}
- **Function**: ${location.narrativeFunction}
- **Atmosphere**: ${location.atmosphere}
${location.suggestedName ? `- **Suggested name**: ${location.suggestedName}` : ""}
${location.suggestedBiome ? `- **Biome**: ${location.suggestedBiome}` : ""}
${location.outlayReference ? `- **From narrative**: "${location.outlayReference}"` : ""}
${location.generationNotes ? `- **Notes**: ${location.generationNotes}` : ""}

## Contents
- **NPCs present**: ${location.npcsPresent.map(resolveNpcId).join(", ") || "none"}
- **Items present**: ${location.itemsPresent.map(resolveItemId).join(", ") || "none"}
${location.enemyTypes ? `- **Enemy types**: ${location.enemyTypes.join(", ")}` : ""}

## Quest Events Here
${location.questEvents.map((e) => `- **${e.trigger}**: ${e.event}`).join("\n")}

---

## Naming Conventions
${worldBible.naming.placePatterns.join("\n")}

## Examples
${worldBible.naming.examples.places.join(", ")}

---

Generate a complete location/tile with:
1. A fitting name following naming conventions
2. Appropriate colors for the biome/atmosphere
3. A description that captures the mood
4. Theme that matches the region
`.trim();
}

// ============================================================================
// Phase 4: Quest Assembly Prompt
// ============================================================================

export function buildQuestAssemblyPrompt(
  worldBible: WorldBible,
  outlay: QuestOutlay,
  entityPlan: EntityPlan,
  generatedItems: GeneratedItem[],
  generatedNpcs: GeneratedNPC[],
  questName: string,
  questType: string
): string {
  const worldContext = buildWorldContext(worldBible);
  const outlayContext = buildOutlayContext(outlay);

  return `
You are assembling a final quest from its generated components.

${worldContext}

---

${outlayContext}

---

## Generated Entities

### NPCs
${generatedNpcs.map((n) => `- **${n.name}** (${n.entity_id}): ${n.backstory.substring(0, 100)}...`).join("\n")}

### Items
${generatedItems.map((i) => `- **${i.name}** (${i.id}): ${i.description}`).join("\n")}

---

## Quest Details
- **Name**: ${questName}
- **Type**: ${questType}

## Planned Objectives
${entityPlan.objectives.map((o) => `- Stage ${o.stage}: ${o.type} - ${o.description}`).join("\n")}

---

Create the final quest assembly with:
1. A concise player-facing description (2-3 sentences)
2. Appropriate difficulty based on the narrative stakes
3. All entity references using the real IDs above
4. Prerequisites if this quest should follow others
5. Faction and theme connections from the world bible
`.trim();
}

// ============================================================================
// System Prompts
// ============================================================================

export const SYSTEM_PROMPTS = {
  outlay: "You are a quest designer for a narrative-driven RPG. Generate rich, evocative quest narratives that integrate deeply with the world's lore, themes, and factions.",
  
  entityPlan: "You are analyzing a quest narrative to extract required game entities. Be thorough and systematic, ensuring every character, item, and location mentioned is captured with proper relationships.",
  
  item: "You are a game item designer. Create items that fit the world's style, have appropriate stats for their rarity, and serve their narrative purpose in the quest.",
  
  npc: "You are a character designer for an RPG. Create NPCs with rich personalities, clear motivations, and backstories that connect to the world and quest narrative.",
  
  location: "You are a level designer for an RPG. Create locations with evocative atmospheres, appropriate visual styling, and clear connections to the quest narrative.",
  
  assembly: "You are assembling a quest from its components. Create a cohesive quest structure that guides players through the narrative while using all generated entities appropriately.",
};

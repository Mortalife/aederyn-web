import type { NPC } from "../../config/types.js";

const npc = (entity_id: string, name: string, changes: Partial<NPC> = {}): NPC => ({
  entity_id,
  name,
  backstory: "",
  personalMission: "",
  hopes: "",
  fears: "",
  relationships: {},
  ...changes,
});

export const npcs: NPC[] = [
  npc("npc_quartermaster", "The Quartermaster", {
    home: "landmark_camp",
    idleLine: "The board is by my tent.",
  }),
  npc("npc_smith", "The Smith", { home: "landmark_stone_yard" }),
  npc("npc_wanderer", "The Wanderer"),
];

export const npcsById = new Map<string, NPC>(npcs.map((n) => [n.entity_id, n]));

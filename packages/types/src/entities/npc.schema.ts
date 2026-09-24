import { z } from "zod";

export const NPCSchema = z.object({
  entity_id: z.string().describe("Unique NPC identifier slug"),
  name: z.string().describe("NPC's full display name"),
  backstory: z.string().describe("2-3 paragraph character backstory"),
  personalMission: z.string().describe("What drives this character"),
  hopes: z.string().describe("What they hope for"),
  fears: z.string().describe("What they fear"),
  relationships: z.record(z.string(), z.array(z.string())).describe("Relationship categories (friends, rivals, family) mapped to descriptions"),
  home: z.string().optional().describe("Landmark ID in map.json where the NPC lives"),
  idleLine: z.string().optional().describe("What they say to a visitor when they have no quest to give"),
  faction: z.string().optional().describe("World bible faction ID"),
});

export const CreateNPCDTOSchema = NPCSchema.partial({ entity_id: true });
export const UpdateNPCDTOSchema = NPCSchema.omit({ entity_id: true }).partial();

// Infer types from schemas
export type NPC = z.infer<typeof NPCSchema>;
export type CreateNPCDTO = z.infer<typeof CreateNPCDTOSchema>;
export type UpdateNPCDTO = z.infer<typeof UpdateNPCDTOSchema>;

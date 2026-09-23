import { z } from "zod";
import { AttackSchema, DefenceSchema } from "./combat.schema.js";

export const MonsterDropSchema = z.object({
  item_id: z.string().describe("Item ID dropped"),
  qty: z.number().int().min(1).describe("Quantity dropped"),
  chance: z.number().min(0).max(1).describe("Chance to drop, from 0 to 1"),
});

export const MonsterSchema = z.object({
  id: z.string().describe("Unique monster identifier slug"),
  name: z.string().describe("Display name for the monster"),
  description: z.string().describe("1-2 sentence monster description"),
  health: z.number().int().min(1).describe("Maximum health"),
  attack: AttackSchema.describe("How the monster fights back"),
  defence: DefenceSchema.describe("Defence against each attack style"),
  respawnTime: z.number().min(0).describe("Seconds after a kill before it respawns"),
  drops: z.array(MonsterDropSchema).describe("Items rolled on a kill"),
});

export const CreateMonsterDTOSchema = MonsterSchema.partial({ id: true });
export const UpdateMonsterDTOSchema = MonsterSchema.omit({ id: true }).partial();

export type MonsterDrop = z.infer<typeof MonsterDropSchema>;
export type Monster = z.infer<typeof MonsterSchema>;
export type CreateMonsterDTO = z.infer<typeof CreateMonsterDTOSchema>;
export type UpdateMonsterDTO = z.infer<typeof UpdateMonsterDTOSchema>;

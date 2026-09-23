import { z } from "zod";

export const AttackStyleSchema = z.enum(["melee", "ranged", "magic"]);

export const DefenceSchema = z.object({
  melee: z.number().min(0).describe("Defence against melee attacks"),
  ranged: z.number().min(0).describe("Defence against ranged attacks"),
  magic: z.number().min(0).describe("Defence against magic attacks"),
});

export const AttackSchema = z.object({
  style: AttackStyleSchema.describe("Combat style of the attack"),
  damage: z.number().int().min(0).describe("Damage per hit, before defence"),
  speed: z.number().int().min(200).describe("Milliseconds between attacks"),
});

export type AttackStyle = z.infer<typeof AttackStyleSchema>;
export type Defence = z.infer<typeof DefenceSchema>;
export type Attack = z.infer<typeof AttackSchema>;

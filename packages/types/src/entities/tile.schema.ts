import { z } from "zod";
import {
  EffectPoolEntrySchema,
  MonsterPoolEntrySchema,
  ResourcePoolEntrySchema,
} from "./pool.schema.js";

export const TileSchema = z.object({
  id: z.string().describe("Unique tile identifier"),
  name: z.string().describe("Display name for the tile"),
  color: z.string().describe("Foreground color (hex or CSS color)"),
  backgroundColor: z.string().describe("Background color (hex or CSS color)"),
  theme: z.string().describe("Theme category for the tile"),
  texture: z.string().optional().describe("Texture asset path"),
  resources: z.array(ResourcePoolEntrySchema).describe("Resource pool, rolled per map cell"),
  monsters: z.array(MonsterPoolEntrySchema).optional().describe("Monster pool, rolled per map cell; `count` spawns several"),
  effects: z.array(EffectPoolEntrySchema).optional().describe("Effect pool, rolled per map cell; active on anyone standing there"),
  accessible: z.boolean().describe("Whether player can walk on this tile"),
  image: z.string().optional().describe("Image asset path"),
  description: z.string().optional().describe("Tile description text"),
});

export const CreateTileDTOSchema = TileSchema.partial({ id: true });
export const UpdateTileDTOSchema = TileSchema.omit({ id: true }).partial();

// Infer types from schemas
export type Tile = z.infer<typeof TileSchema>;
export type CreateTileDTO = z.infer<typeof CreateTileDTOSchema>;
export type UpdateTileDTO = z.infer<typeof UpdateTileDTOSchema>;

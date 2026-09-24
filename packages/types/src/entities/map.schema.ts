import { z } from "zod";
import { EffectStrengthSchema } from "./effect.schema.js";

export const MapPointSchema = z.object({
  x: z.number().int().describe("Column"),
  y: z.number().int().describe("Row; larger is further south"),
});

export const MapBoundsSchema = z
  .object({
    minX: z.number().int().describe("Westmost column, inclusive; may be negative"),
    maxX: z.number().int().describe("Eastmost column, inclusive"),
    minY: z.number().int().describe("Northmost row, inclusive; may be negative"),
    maxY: z.number().int().describe("Southmost row, inclusive"),
  })
  .refine((b) => b.minX <= b.maxX && b.minY <= b.maxY, {
    message: "min must not be greater than max",
  });

export const WeightedTileSchema = z.object({
  id: z.string().describe("Tile ID"),
  weight: z.number().positive().describe("Relative chance of this tile filling a cell of the region"),
});

export const MapRegionSchema = z.object({
  id: z.string().describe("Region slug (lowercase, hyphens), matching a world bible region"),
  tier: z.number().int().min(0).describe("Difficulty tier; 0 is the starting area"),
  anchors: z
    .array(MapPointSchema)
    .min(1)
    .describe("Seed points; a cell belongs to the region of its nearest anchor, with jittered borders"),
  tiles: z.array(WeightedTileSchema).min(1).describe("Tiles that fill the region's cells, by weight"),
  effects: z.array(EffectStrengthSchema).describe("Effects on every cell of the region, added to the tile's"),
});

export const LandmarkSchema = z.object({
  id: z.string().describe("Landmark ID (landmark_ prefix); NPC homes reference it"),
  x: z.number().int(),
  y: z.number().int(),
  tile: z.string().describe("Tile ID pinned at this cell, overriding the region fill"),
  spawn: z
    .boolean()
    .optional()
    .describe("Where players start and return to on death; exactly one landmark has it"),
});

export const MapDataSchema = z.object({
  bounds: MapBoundsSchema,
  regions: z.array(MapRegionSchema),
  landmarks: z.array(LandmarkSchema),
});

export type MapPoint = z.infer<typeof MapPointSchema>;
export type MapBounds = z.infer<typeof MapBoundsSchema>;
export type WeightedTile = z.infer<typeof WeightedTileSchema>;
export type MapRegion = z.infer<typeof MapRegionSchema>;
export type Landmark = z.infer<typeof LandmarkSchema>;
export type MapData = z.infer<typeof MapDataSchema>;

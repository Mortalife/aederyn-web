import { z } from "zod";
import { RequirementRewardSchema } from "./quest.schema.js";

export const ActionRequirementSchema = z.object({
  requirements: z.array(RequirementRewardSchema).optional().describe("Required items/gold/skills"),
  timeToComplete: z.number().optional().describe("Time in ms to complete action"),
  prerequisites: z.object({
    adjacentTiles: z.array(z.string()).optional().describe("Required adjacent tile IDs"),
  }).optional().describe("Prerequisite conditions"),
});

export const ActionResultSchema = z.object({
  resultingTileId: z.string().optional().describe("Tile ID to transform into"),
  yields: z.array(RequirementRewardSchema).optional().describe("Items/gold/skills yielded"),
});

export const TileActionSchema = z.object({
  id: z.string().describe("Unique action identifier"),
  name: z.string().describe("Display name for the action"),
  description: z.string().describe("Action description text"),
  requirements: ActionRequirementSchema.describe("Requirements to perform action"),
  result: ActionResultSchema.describe("Result of performing action"),
  canUndo: z.boolean().describe("Whether action can be undone"),
});

export const HouseTileFlagsSchema = z.object({
  isWalkable: z.boolean().describe("Whether player can walk on tile"),
  isWaterSource: z.boolean().optional().describe("Whether tile provides water"),
  isStructure: z.boolean().optional().describe("Whether tile is a structure"),
}).catchall(z.boolean().optional());

export const HouseTileSchema = z.object({
  id: z.string().describe("Unique house tile identifier"),
  name: z.string().describe("Display name for the tile"),
  description: z.string().describe("Tile description text"),
  sprite: z.string().describe("Sprite asset identifier"),
  bgColor: z.string().describe("Background color (hex or CSS color)"),
  availableActions: z.array(TileActionSchema).describe("Actions available on this tile"),
  availableResources: z.array(z.string()).optional().describe("Resource IDs available"),
  flags: HouseTileFlagsSchema.optional().describe("Tile behavior flags"),
});

export const HouseMapTileSchema = z.object({
  type: HouseTileSchema.describe("The house tile definition"),
  position: z.object({
    x: z.number().describe("X coordinate"),
    y: z.number().describe("Y coordinate"),
  }).describe("Position on the map"),
  actionInProgress: z.object({
    action: TileActionSchema.describe("The action being performed"),
    startedAt: z.number().describe("Timestamp when action started"),
    completesAt: z.number().describe("Timestamp when action completes"),
  }).optional().describe("Currently running action"),
});

export const HouseMapSchema = z.object({
  width: z.number().describe("Map width in tiles"),
  height: z.number().describe("Map height in tiles"),
  tiles: z.array(HouseMapTileSchema).describe("All tiles in the map"),
});

export const CreateHouseTileDTOSchema = HouseTileSchema.partial({ id: true });
export const UpdateHouseTileDTOSchema = HouseTileSchema.omit({ id: true }).partial();

// Infer types from schemas
export type ActionRequirement = z.infer<typeof ActionRequirementSchema>;
export type ActionResult = z.infer<typeof ActionResultSchema>;
export type TileAction = z.infer<typeof TileActionSchema>;
export type HouseTileFlags = z.infer<typeof HouseTileFlagsSchema>;
export type HouseTile = z.infer<typeof HouseTileSchema>;
export type HouseMapTile = z.infer<typeof HouseMapTileSchema>;
export type HouseMap = z.infer<typeof HouseMapSchema>;
export type CreateHouseTileDTO = z.infer<typeof CreateHouseTileDTOSchema>;
export type UpdateHouseTileDTO = z.infer<typeof UpdateHouseTileDTOSchema>;

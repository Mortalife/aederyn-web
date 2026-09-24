import { z } from "zod";

export const EffectKindSchema = z.enum(["health", "gather_speed", "blocks", "protects"]);
export const EffectModeSchema = z.enum(["mitigation", "binary", "none"]);
export const EffectPolaritySchema = z.enum(["positive", "negative"]);
export const BlockableActionSchema = z.enum(["gather", "attack"]);

const effectBase = {
  id: z.string().describe("Unique effect identifier slug"),
  name: z.string().describe("Display name for the effect"),
  description: z.string().describe("1-2 sentence description of what the effect does"),
  mode: EffectModeSchema.describe(
    "How protection counters it: mitigation (protection / (protection + 100) removed, never all), binary (any protection lifts it), none (can't be countered)"
  ),
};

export const HealthEffectSchema = z.object({
  ...effectBase,
  kind: z.literal("health"),
  polarity: EffectPolaritySchema.describe("positive heals, negative drains and stops natural regeneration"),
  interval: z.number().int().min(200).describe("Milliseconds per `strength` HP gained or lost"),
});

export const GatherSpeedEffectSchema = z.object({
  ...effectBase,
  kind: z.literal("gather_speed"),
  polarity: EffectPolaritySchema.describe(
    "negative multiplies gathering time by (1 + strength/100), positive divides it by the same"
  ),
});

export const BlocksEffectSchema = z.object({
  ...effectBase,
  kind: z.literal("blocks"),
  actions: z.array(BlockableActionSchema).min(1).describe("Actions the effect prevents while it has any strength left"),
  message: z.string().optional().describe("Shown when a blocked action is attempted"),
});

export const ProtectsEffectSchema = z.object({
  ...effectBase,
  kind: z.literal("protects"),
  target: z.string().describe("Effect ID this protects against; strength is protection on the defence scale (0-200)"),
});

export const EffectSchema = z.discriminatedUnion("kind", [
  HealthEffectSchema,
  GatherSpeedEffectSchema,
  BlocksEffectSchema,
  ProtectsEffectSchema,
]);

/** An effect applied with a strength, as tiles and worn items carry them. */
export const EffectStrengthSchema = z.object({
  id: z.string().describe("Effect ID"),
  strength: z.number().min(0).describe("Strength; its meaning depends on the effect's kind"),
});

export type EffectKind = z.infer<typeof EffectKindSchema>;
export type EffectMode = z.infer<typeof EffectModeSchema>;
export type EffectPolarity = z.infer<typeof EffectPolaritySchema>;
export type BlockableAction = z.infer<typeof BlockableActionSchema>;
export type Effect = z.infer<typeof EffectSchema>;
export type EffectStrength = z.infer<typeof EffectStrengthSchema>;

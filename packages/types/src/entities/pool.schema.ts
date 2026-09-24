import { z } from "zod";

const ChanceSchema = z
  .number()
  .gt(0)
  .max(1)
  .optional()
  .describe("Probability (0, 1] that the entry rolls for a cell; absent means always");

export const ResourcePoolThingSchema = z.object({
  id: z.string().describe("Resource ID"),
});

export const MonsterPoolThingSchema = z.object({
  id: z.string().describe("Monster ID"),
  count: z.number().int().min(1).optional().describe("How many spawn; absent means one"),
});

export const EffectPoolThingSchema = z.object({
  id: z.string().describe("Effect ID"),
  strength: z.number().min(0).describe("Strength; its meaning depends on the effect's kind"),
});

const oneOfSchema = <T extends z.ZodTypeAny>(thing: T) =>
  z.object({
    oneOf: z.array(thing).min(1).describe("Options; exactly one is picked per cell"),
    chance: ChanceSchema,
  });

/**
 * A pool entry is either the thing itself or `{ oneOf: [...] }`, which picks
 * exactly one of its options. Either can carry a `chance`.
 */
export const ResourcePoolEntrySchema = z.union([
  ResourcePoolThingSchema.extend({ chance: ChanceSchema }),
  oneOfSchema(ResourcePoolThingSchema),
]);
export const MonsterPoolEntrySchema = z.union([
  MonsterPoolThingSchema.extend({ chance: ChanceSchema }),
  oneOfSchema(MonsterPoolThingSchema),
]);
export const EffectPoolEntrySchema = z.union([
  EffectPoolThingSchema.extend({ chance: ChanceSchema }),
  oneOfSchema(EffectPoolThingSchema),
]);

export type PoolEntry<T> = (T & { chance?: number }) | { oneOf: T[]; chance?: number };
export type ResourcePoolThing = z.infer<typeof ResourcePoolThingSchema>;
export type MonsterPoolThing = z.infer<typeof MonsterPoolThingSchema>;
export type EffectPoolThing = z.infer<typeof EffectPoolThingSchema>;
export type ResourcePoolEntry = PoolEntry<ResourcePoolThing>;
export type MonsterPoolEntry = PoolEntry<MonsterPoolThing>;
export type EffectPoolEntry = PoolEntry<EffectPoolThing>;

export const isOneOf = <T>(entry: PoolEntry<T>): entry is { oneOf: T[]; chance?: number } =>
  "oneOf" in entry && Array.isArray((entry as { oneOf?: unknown }).oneOf);

/** Every thing an entry can yield, `oneOf` options included. */
export const poolOptions = <T>(entry: PoolEntry<T>): T[] =>
  isOneOf(entry) ? entry.oneOf : [entry as T];

/** Every thing any entry of a pool can yield. */
export const poolThings = <T>(entries: PoolEntry<T>[] | undefined): T[] =>
  (entries ?? []).flatMap((entry) => poolOptions(entry));

/** Every ID any entry of a pool can yield, deduplicated. */
export const poolIds = <T extends { id: string }>(entries: PoolEntry<T>[] | undefined): string[] => [
  ...new Set(poolThings(entries).map((thing) => thing.id)),
];

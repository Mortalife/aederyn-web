import type { BlockableAction, Effect } from "../config.js";
import { effectsById } from "../config/effects.js";
import { itemsById } from "../config/items.js";
import { reader } from "../db/reader.js";
import { mitigation } from "../lib/mitigation.js";
import { getTileSelection, isOutOfBounds, type Point } from "./index.js";

/** A consumable's effect still running on a player (`active_effects`). */
export type TimedEffect = {
  user_id: string;
  item_id: string;
  effect_id: string;
  strength: number;
  started_at: number;
  expires_at: number;
};

export type EffectSource =
  | { type: "tile"; id: string }
  | { type: "region"; id: string }
  | { type: "item"; id: string }
  | { type: "consumable"; id: string; startedAt: number; expiresAt: number };

export type ActiveEffect = {
  effectId: string;
  strength: number;
  source: EffectSource;
};

export type ResolvedEffect = {
  effect: Effect;
  /** Summed over every source. */
  strength: number;
  /** Summed strength of every active effect that protects against this one. */
  protection: number;
  /** What's left after protection, by the effect's mode. */
  effective: number;
  sources: EffectSource[];
};

const selectTimedEffects = reader.prepare<[string, number], TimedEffect>(
  "SELECT * FROM active_effects WHERE user_id = ? AND expires_at > ? ORDER BY started_at, effect_id"
);

/** A player's unexpired consumable effects, from the reader. */
export const getTimedEffects = (userId: string, now: number) =>
  selectTimedEffects.all(userId, now);

/** Effects on a map cell: its tile's rolled pool, then its region's. */
export const cellEffectsAt = ({ x, y }: Point): ActiveEffect[] => {
  if (isOutOfBounds(x, y)) return [];
  const cell = getTileSelection(x, y);
  return [
    ...cell.effects.map(({ id, strength }) => ({
      effectId: id,
      strength,
      source: { type: "tile", id: cell.id } as const,
    })),
    ...(cell.region?.effects ?? []).map(({ id, strength }) => ({
      effectId: id,
      strength,
      source: { type: "region", id: cell.region!.id } as const,
    })),
  ];
};

/**
 * Every effect acting on a player: their cell's tile and region (in the zone
 * or on the map), each equipped item's worn effects, and unexpired
 * consumables.
 */
export const collectEffects = (
  position: Point,
  equippedItemIds: string[],
  timed: TimedEffect[],
  now: number
): ActiveEffect[] => {
  const active: ActiveEffect[] = cellEffectsAt(position);

  for (const itemId of equippedItemIds) {
    for (const { id, strength } of itemsById.get(itemId)?.wornEffects ?? []) {
      active.push({ effectId: id, strength, source: { type: "item", id: itemId } });
    }
  }
  for (const row of timed) {
    if (row.expires_at <= now) continue;
    active.push({
      effectId: row.effect_id,
      strength: row.strength,
      source: {
        type: "consumable",
        id: row.item_id,
        startedAt: row.started_at,
        expiresAt: row.expires_at,
      },
    });
  }
  return active;
};

export const effectiveStrength = (
  effect: Effect,
  strength: number,
  protection: number
) => {
  switch (effect.mode) {
    case "none":
      return strength;
    case "binary":
      return protection > 0 ? 0 : strength;
    case "mitigation":
      return strength * (1 - mitigation(protection));
  }
};

/**
 * Sums active effects by type, then counters each with the summed strength
 * of the effects that protect against it, using its mode.
 */
export const resolveEffects = (active: ActiveEffect[]): ResolvedEffect[] => {
  const byId = new Map<string, ResolvedEffect>();

  for (const { effectId, strength, source } of active) {
    const effect = effectsById.get(effectId);
    if (!effect) continue;
    let resolved = byId.get(effectId);
    if (!resolved) {
      resolved = { effect, strength: 0, protection: 0, effective: 0, sources: [] };
      byId.set(effectId, resolved);
    }
    resolved.strength += strength;
    resolved.sources.push(source);
  }

  const protection = new Map<string, number>();
  for (const { effect, strength } of byId.values()) {
    if (effect.kind === "protects") {
      protection.set(effect.target, (protection.get(effect.target) ?? 0) + strength);
    }
  }

  for (const resolved of byId.values()) {
    resolved.protection =
      resolved.effect.kind === "protects" ? 0 : protection.get(resolved.effect.id) ?? 0;
    resolved.effective = effectiveStrength(
      resolved.effect,
      resolved.strength,
      resolved.protection
    );
  }

  return [...byId.values()];
};

/** HP per millisecond gained and lost from health effects. */
export const healthRates = (resolved: ResolvedEffect[]) => {
  let gain = 0;
  let loss = 0;
  for (const { effect, effective } of resolved) {
    if (effect.kind !== "health" || effective <= 0) continue;
    if (effect.polarity === "positive") {
      gain += effective / effect.interval;
    } else {
      loss += effective / effect.interval;
    }
  }
  return { gain, loss };
};

/** How much longer (above 1) or shorter (below 1) gathering takes. */
export const gatherDurationMultiplier = (resolved: ResolvedEffect[]) => {
  let slower = 0;
  let faster = 0;
  for (const { effect, effective } of resolved) {
    if (effect.kind !== "gather_speed") continue;
    if (effect.polarity === "positive") {
      faster += effective;
    } else {
      slower += effective;
    }
  }
  return (1 + slower / 100) / (1 + faster / 100);
};

/** The first effect stopping `action`, if any. */
export const blockingEffect = (
  resolved: ResolvedEffect[],
  action: BlockableAction
) =>
  resolved.find(
    ({ effect, effective }) =>
      effect.kind === "blocks" && effective > 0 && effect.actions.includes(action)
  )?.effect;

export const blockedMessage = (effect: Effect, action: BlockableAction) =>
  (effect.kind === "blocks" && effect.message) ||
  `${effect.name} stops you ${action === "gather" ? "gathering" : "fighting"}.`;

/** Protection the player has against `effectId`, whether or not it's active. */
export const protectionAgainst = (resolved: ResolvedEffect[], effectId: string) =>
  resolved.reduce(
    (total, { effect, strength }) =>
      effect.kind === "protects" && effect.target === effectId
        ? total + strength
        : total,
    0
  );

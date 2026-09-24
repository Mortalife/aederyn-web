import { html } from "hono/html";
import type { Effect } from "../config.js";
import type { ResolvedEffect } from "../world/effects.js";
import { animateBetween } from "./animate.js";

const round = (n: number) => String(Math.round(n * 10) / 10);

const isHarmful = (effect: Effect) =>
  effect.kind === "blocks" ||
  ((effect.kind === "health" || effect.kind === "gather_speed") &&
    effect.polarity === "negative");

/** What an effect does at `strength`, in a few words. */
export const describeEffect = (effect: Effect, strength: number) => {
  switch (effect.kind) {
    case "health":
      return `${effect.polarity === "positive" ? "+" : "−"}${round(strength)} HP / ${round(
        effect.interval / 1000
      )}s`;
    case "gather_speed":
      return `gathering ×${round(1 + strength / 100)} ${
        effect.polarity === "positive" ? "faster" : "slower"
      }`;
    case "blocks":
      return strength > 0 ? `no ${effect.actions.join(" or ")}` : "lifted";
    case "protects":
      return `protection ${round(strength)}`;
  }
};

type Chip = {
  effect: Effect;
  strength: number;
  protection?: number;
  expires?: { startedAt: number; expiresAt: number };
};

const EffectChip = ({ effect, strength, protection = 0, expires }: Chip) => {
  const tone = isHarmful(effect)
    ? "bg-red-500/15 text-red-200 border-red-500/30"
    : "bg-emerald-500/15 text-emerald-200 border-emerald-500/30";
  const title = protection > 0
    ? `${effect.description} Protection ${round(protection)}.`
    : effect.description;

  return html`<span
    class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border ${tone}"
    title="${title}"
  >
    <span class="font-semibold">${effect.name}</span>
    <span class="opacity-80">${describeEffect(effect, strength)}</span>
    ${expires
      ? html`<span class="font-mono opacity-80"
          ><span
            id="effect-${effect.id}-${expires.startedAt}"
            class="progress-seconds"
            data-init="${animateBetween(
              { startedAt: expires.startedAt, endsAt: expires.expiresAt },
              [
                { "--progress-seconds": Math.round((expires.expiresAt - expires.startedAt) / 1000) },
                { "--progress-seconds": 0 },
              ]
            )}"
          ></span
          >s</span
        >`
      : null}
  </span>`;
};

/** The latest-ending consumable behind an effect, for its countdown. */
const expiry = ({ sources }: ResolvedEffect) =>
  sources.reduce<Chip["expires"]>(
    (latest, source) =>
      source.type === "consumable" && (!latest || source.expiresAt > latest.expiresAt)
        ? { startedAt: source.startedAt, expiresAt: source.expiresAt }
        : latest,
    undefined
  );

/** Everything acting on the player, after protection, with consumable countdowns. */
export const PlayerEffects = (effects: ResolvedEffect[]) =>
  effects.length === 0
    ? null
    : html`<div id="player-effects" class="flex min-w-0 items-center gap-1 overflow-x-auto whitespace-nowrap text-xs">
        ${effects.map((resolved) =>
          EffectChip({
            effect: resolved.effect,
            strength: resolved.effective,
            protection: resolved.protection,
            expires: expiry(resolved),
          })
        )}
      </div>`;

/** A tile's effects as configured, before anyone's protection. */
export const TileEffects = (effects: Array<{ effect: Effect; strength: number }>) =>
  effects.length === 0
    ? null
    : html`<div class="flex flex-wrap gap-1 text-xs mt-2">
        ${effects.map(({ effect, strength }) => EffectChip({ effect, strength }))}
      </div>`;

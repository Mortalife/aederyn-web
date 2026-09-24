import { effectsById } from "../../config/effects.js";
import { itemsById } from "../../config/items.js";
import { effectiveStrength, protectionAgainst } from "../../world/effects.js";
import { effectsOn, startTimedEffect } from "./effects.js";
import { changeHealth } from "./health.js";
import { addSystemMessage } from "./system-messages.js";
import { loadUser, saveInventory } from "./users.js";

/**
 * Consume one of an inventory stack and apply its on-use effects. A health
 * effect with no duration applies at once; anything else runs for its
 * duration, and using the same item again restarts it.
 */
export const useItem = (userId: string, inventoryId: string, now: number) => {
  const user = loadUser(userId);
  const owned = user?.i.find((i) => i.id === inventoryId);
  const item = owned && itemsById.get(owned.item_id);

  if (!user || !owned || !item) {
    return false;
  }

  const context = { action_type: "inventory", action_id: inventoryId } as const;
  const onUse = (item.effects ?? []).filter((e) => effectsById.has(e.id));

  if (onUse.length === 0) {
    addSystemMessage(userId, `You can't use ${item.name}.`, "error", now, context);
    return false;
  }

  const resolved = effectsOn(user, now);
  owned.qty -= 1;
  saveInventory(user);

  const results: string[] = [];
  for (const { id, strength, duration } of onUse) {
    const effect = effectsById.get(id)!;

    if (duration > 0) {
      startTimedEffect(userId, item.id, id, strength, now, duration * 1000);
      results.push(`${effect.name} for ${duration}s`);
      continue;
    }

    if (effect.kind !== "health") continue;
    const amount = Math.round(
      effectiveStrength(effect, strength, protectionAgainst(resolved, id))
    );
    const sign = effect.polarity === "positive" ? 1 : -1;
    const before = user.h;
    changeHealth(user, sign * amount, now, effect);
    if (user.h !== before) {
      results.push(`${user.h > before ? "+" : ""}${user.h - before} health`);
    }
  }

  addSystemMessage(
    userId,
    `You used ${item.name}${results.length ? `: ${results.join(", ")}` : ""}.`,
    "success",
    now,
    context
  );
  return true;
};

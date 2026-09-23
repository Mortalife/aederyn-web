import { writer } from "../db/writer.js";
import { apply } from "./apply.js";
import { drainQueue, enqueue, type QueuedCommand } from "./commands.js";
import { renderConnections } from "./connections.js";
import { takeEvents } from "./events.js";
import { processActions } from "./systems/actions.js";
import { processCombat } from "./systems/combat.js";
import { regenerateHealth } from "./systems/health.js";
import { respawnMonsters } from "./systems/monsters.js";
import { presentUserIds } from "./systems/presence.js";
import { handleQuestEvents } from "./systems/quests.js";
import { cleanupResources } from "./systems/resources.js";
import { cleanupSystemMessages } from "./systems/system-messages.js";

export const TICK_MS = 200;

type Outcome = { ok: true; result: unknown } | { ok: false; error: unknown };

/** Let systems react to events, until nothing new happens. */
const handleEvents = (now: number) => {
  for (let events = takeEvents(); events.length > 0; events = takeEvents()) {
    handleQuestEvents(events, now);
  }
};

/**
 * Runs a command or system, then whatever its events set off. Nested
 * `writer.transaction` calls run as savepoints, so one that throws rolls
 * back only its own writes, and its events are dropped with them.
 */
const guarded = <T>(label: string, now: number, fn: () => T): Outcome => {
  try {
    const result = writer.transaction(() => {
      const result = fn();
      handleEvents(now);
      return result;
    })();
    return { ok: true, result };
  } catch (error) {
    takeEvents();
    console.error(`${label} failed`, error);
    return { ok: false, error };
  }
};

const runTick = writer.transaction((batch: QueuedCommand[], now: number) => {
  const outcomes = batch.map(({ command }) =>
    guarded(`Command ${command.type}`, now, () => apply(command, now))
  );

  guarded("cleanupResources", now, () => cleanupResources(now));
  guarded("respawnMonsters", now, () => respawnMonsters(now));
  guarded("processActions", now, () => processActions(now));
  guarded("processCombat", now, () => processCombat(now));
  guarded("regenerateHealth", now, () => regenerateHealth(now));
  guarded("cleanupSystemMessages", now, () => cleanupSystemMessages());

  return outcomes;
});

/** One tick: the only place the game database is written. */
export const tick = (now = Date.now()) => {
  const batch = drainQueue();

  let outcomes: Outcome[];
  try {
    outcomes = runTick(batch, now);
  } catch (error) {
    console.error("Tick failed", error);
    outcomes = batch.map(() => ({ ok: false, error }));
  }

  // Committed: now it's safe to tell anyone, and to draw what changed.
  batch.forEach(({ resolve, reject }, i) => {
    const outcome = outcomes[i]!;
    if (outcome.ok) {
      resolve?.(outcome.result);
    } else {
      reject?.(outcome.error);
    }
  });
  renderConnections(now);
};

// Quest rotation: once now (a no-op if this hour already rotated), then just
// after each hour boundary.
const scheduleQuestRotation = () => {
  enqueue({ type: "rotate_quests" });

  const now = Date.now();
  const nextHour = Math.ceil((now + 1) / 3_600_000) * 3_600_000;
  setTimeout(scheduleQuestRotation, nextHour - now + 1000);
};

export const startLoop = () => {
  // No streams survive a restart, so disconnect whoever the last run left
  // behind, ahead of any reconnects.
  for (const userId of presentUserIds()) {
    enqueue({ type: "disconnect", userId });
  }

  scheduleQuestRotation();

  setInterval(() => {
    const start = performance.now();
    tick();
    const elapsed = performance.now() - start;

    if (elapsed > TICK_MS) {
      console.log(`LAG: tick took ${elapsed.toFixed(1)}ms`);
    }
  }, TICK_MS);
};

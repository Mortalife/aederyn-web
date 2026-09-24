import type { UserInventoryItem } from "../config.js";

/**
 * Things that happened during a command or system, for other systems to
 * react to in the same tick. The loop hands them to the quest system after
 * each command and system (see `loop.ts`), inside the same savepoint.
 */
export type GameEvent =
  | { type: "zone_entered"; userId: string; x: number; y: number }
  | {
      type: "inventory_changed";
      userId: string;
      /** Everything the user owns: the inventory and what's equipped. */
      inventory: UserInventoryItem[];
    }
  | {
      type: "resource_completed";
      userId: string;
      resourceId: string;
      x: number;
      y: number;
    }
  | {
      type: "monster_killed";
      userId: string;
      monsterId: string;
      x: number;
      y: number;
    }
  | {
      type: "player_died";
      userId: string;
      /** What did it: a monster in a fight, or an effect such as spores. */
      monsterId?: string;
      effectId?: string;
    };

const pending: GameEvent[] = [];

export const emit = (event: GameEvent) => {
  pending.push(event);
};

/** Take everything emitted so far. */
export const takeEvents = () => pending.splice(0);

import { EQUIP_SLOTS, type EquipSlot } from "../config.js";

export const DIRECTIONS = ["up", "down", "left", "right", "enter", "exit"] as const;
export type Direction = (typeof DIRECTIONS)[number];

export const isDirection = (value: string): value is Direction =>
  (DIRECTIONS as readonly string[]).includes(value);

export const isEquipSlot = (value: string): value is EquipSlot =>
  (EQUIP_SLOTS as readonly string[]).includes(value);

/**
 * Everything a player can ask the game to do. Handlers validate the shape
 * and enqueue; the tick applies commands in order and checks the game rules.
 */
export type Command =
  | { type: "login"; userId: string }
  | { type: "connect"; userId: string }
  | { type: "disconnect"; userId: string }
  | { type: "move"; userId: string; direction: Direction }
  | { type: "gather_start"; userId: string; resourceId: string }
  | { type: "gather_cancel"; userId: string; resourceId: string }
  | { type: "attack"; userId: string; spawn: number }
  | { type: "flee"; userId: string }
  | { type: "chat"; userId: string; message: string }
  | { type: "inventory_drop"; userId: string; inventoryId: string }
  | { type: "equip"; userId: string; inventoryId: string }
  | { type: "unequip"; userId: string; slot: EquipSlot }
  | { type: "system_messages_clear"; userId: string }
  | { type: "system_message_remove"; userId: string; messageId: string }
  | { type: "quest_start"; userId: string; questId: string }
  | {
      type: "quest_advance";
      userId: string;
      questId: string;
      objectiveId: string;
    }
  | { type: "quest_complete"; userId: string; questId: string }
  | { type: "quest_cancel"; userId: string; questId: string }
  | { type: "rotate_quests"; force?: boolean };

/** What `submit` resolves with, per command. Unlisted commands give void. */
export type CommandResults = {
  /** The logged-in user's id, or null if there's no such user. */
  login: string | null;
};

export type CommandResult<C extends Command> =
  C["type"] extends keyof CommandResults
    ? CommandResults[C["type"]]
    : void;

export type QueuedCommand = {
  command: Command;
  resolve?: (result: unknown) => void;
  reject?: (err: unknown) => void;
};

let queue: QueuedCommand[] = [];

/** Queue a command for the next tick. */
export const enqueue = (command: Command) => {
  queue.push({ command });
};

/**
 * Queue a command and wait until the tick that applies it has committed, so
 * the reader connection sees its effects.
 */
export const submit = <C extends Command>(command: C) =>
  new Promise<CommandResult<C>>((resolve, reject) => {
    queue.push({
      command,
      resolve: resolve as (result: unknown) => void,
      reject,
    });
  });

export const drainQueue = () => {
  const drained = queue;
  queue = [];
  return drained;
};

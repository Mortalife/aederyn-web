import { EventEmitter } from "node:events";

type EventTypes = string | symbol;

export class TypedEventEmitter<TEvents extends Record<EventTypes, any>> {
  private emitter = new EventEmitter();

  publish<TEventName extends keyof TEvents & EventTypes>(
    eventName: TEventName,
    ...eventArg: TEvents[TEventName]
  ) {
    this.emitter.emit(eventName, ...(eventArg as []));
  }

  subscribe<TEventName extends keyof TEvents & EventTypes>(
    eventName: TEventName,
    handler: (...eventArg: TEvents[TEventName]) => void
  ) {
    this.emitter.on(eventName, handler as any);
  }

  off<TEventName extends keyof TEvents & EventTypes>(
    eventName: TEventName,
    handler: (...eventArg: TEvents[TEventName]) => void
  ) {
    this.emitter.off(eventName, handler as any);
  }
}

// Editor events
export const EDITOR_EVENT = Symbol("editor");
export const ITEMS_UPDATED = Symbol("items_updated");
export const RESOURCES_UPDATED = Symbol("resources_updated");
export const TILES_UPDATED = Symbol("tiles_updated");
export const NPCS_UPDATED = Symbol("npcs_updated");
export const QUESTS_UPDATED = Symbol("quests_updated");
export const HOUSE_TILES_UPDATED = Symbol("house_tiles_updated");

export type EditorEvent = {
  type: "view_changed" | "data_updated";
  view?: string;
};

export type EntityUpdatedEvent = {
  id?: string;
};

export const PubSub = new TypedEventEmitter<{
  [EDITOR_EVENT]: [EditorEvent];
  [ITEMS_UPDATED]: [EntityUpdatedEvent];
  [RESOURCES_UPDATED]: [EntityUpdatedEvent];
  [TILES_UPDATED]: [EntityUpdatedEvent];
  [NPCS_UPDATED]: [EntityUpdatedEvent];
  [QUESTS_UPDATED]: [EntityUpdatedEvent];
  [HOUSE_TILES_UPDATED]: [EntityUpdatedEvent];
}>();

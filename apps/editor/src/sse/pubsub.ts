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

export const WORLD_BIBLE_GEN_STARTED = Symbol("world_bible_gen_started");
export const WORLD_BIBLE_GEN_PROGRESS = Symbol("world_bible_gen_progress");
export const WORLD_BIBLE_GEN_COMPLETED = Symbol("world_bible_gen_completed");
export const WORLD_BIBLE_GEN_FAILED = Symbol("world_bible_gen_failed");

export const QUEST_GEN_STARTED = Symbol("quest_gen_started");
export const QUEST_GEN_PROGRESS = Symbol("quest_gen_progress");
export const QUEST_GEN_REVIEW_REQUIRED = Symbol("quest_gen_review_required");
export const QUEST_GEN_REVIEW_COMPLETED = Symbol("quest_gen_review_completed");
export const QUEST_GEN_ENTITY_CREATED = Symbol("quest_gen_entity_created");
export const QUEST_GEN_COMPLETED = Symbol("quest_gen_completed");
export const QUEST_GEN_FAILED = Symbol("quest_gen_failed");
export const QUEST_GEN_CANCELLED = Symbol("quest_gen_cancelled");

export type EditorEvent = {
  type: "view_changed" | "data_updated";
  view?: string;
};

export type EntityUpdatedEvent = {
  id?: string;
};

export type WorldBibleGenEvent = {
  step?: number;
  stepName?: string;
  totalSteps?: number;
  error?: string;
};

export type QuestGenEvent = {
  questId?: string;
  questName?: string;
  step?: number;
  stepName?: string;
  totalSteps?: number;
  reviewType?: string;
  entityType?: string;
  entityId?: string;
  entityName?: string;
  data?: unknown;
  quest?: unknown;
  error?: string;
};

export const PubSub = new TypedEventEmitter<{
  [EDITOR_EVENT]: [EditorEvent];
  [ITEMS_UPDATED]: [EntityUpdatedEvent];
  [RESOURCES_UPDATED]: [EntityUpdatedEvent];
  [TILES_UPDATED]: [EntityUpdatedEvent];
  [NPCS_UPDATED]: [EntityUpdatedEvent];
  [QUESTS_UPDATED]: [EntityUpdatedEvent];
  [HOUSE_TILES_UPDATED]: [EntityUpdatedEvent];
  [WORLD_BIBLE_GEN_STARTED]: [WorldBibleGenEvent];
  [WORLD_BIBLE_GEN_PROGRESS]: [WorldBibleGenEvent];
  [WORLD_BIBLE_GEN_COMPLETED]: [WorldBibleGenEvent];
  [WORLD_BIBLE_GEN_FAILED]: [WorldBibleGenEvent];
  [QUEST_GEN_STARTED]: [QuestGenEvent];
  [QUEST_GEN_PROGRESS]: [QuestGenEvent];
  [QUEST_GEN_REVIEW_REQUIRED]: [QuestGenEvent];
  [QUEST_GEN_REVIEW_COMPLETED]: [QuestGenEvent];
  [QUEST_GEN_ENTITY_CREATED]: [QuestGenEvent];
  [QUEST_GEN_COMPLETED]: [QuestGenEvent];
  [QUEST_GEN_FAILED]: [QuestGenEvent];
  [QUEST_GEN_CANCELLED]: [QuestGenEvent];
}>();

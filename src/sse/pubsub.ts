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

export const MESSAGE_EVENT = Symbol("message");
export const CHAT_EVENT = Symbol("chat");
export const ZONE_EVENT = Symbol("zone");
export const USER_EVENT = Symbol("user");

export type MessageEvent = {
  user_id: string;
  message: string;
  type: "error" | "info";
};

export type ChatEvent = {
  user_id: string;
  message: string;
};
export type UserEvent = {
  user_id: string;
};

export type ZoneEvent = {
  x: number;
  y: number;
};

export const PubSub = new TypedEventEmitter<{
  [MESSAGE_EVENT]: [MessageEvent];
  [CHAT_EVENT]: [ChatEvent];
  [ZONE_EVENT]: [ZoneEvent];
  [USER_EVENT]: [UserEvent];
}>();

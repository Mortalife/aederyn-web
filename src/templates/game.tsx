import { html } from "hono/html";
import type { WorldTile } from "../world/index.js";
import { UserInfo, WorldMap, Zone } from "./elements.js";
import type { GameUser, OtherUser } from "../config.js";
import type { UserAction } from "../user/action.js";
import type { ChatMessage } from "../social/chat.js";
import type { SystemMessage, SystemMessageActionType } from "../user/system.js";
import type {
  MapIndicator,
  ZoneInteraction,
  ZoneQuests,
} from "../user/quest-progress-manager.js";

export const Game = (props: {
  map: WorldTile[];
  mapIndicators: MapIndicator[];
  user: GameUser;
  inprogress?: UserAction;
  messages?: SystemMessage[];
  players?: OtherUser[];
  chatMessages?: ChatMessage[];
  quests?: ZoneQuests;
  npcInteractions?: ZoneInteraction[];
  isMobile?: boolean;
  resourceObjectives?: Set<string>;
  contextFlashes?: Map<string, SystemMessage>;
}) => {
  return html`
    <div
      id="game"
      class="md:container md:mx-auto flex flex-col gap-4 h-full"
      data-signals="${JSON.stringify({
        user_id: props.user.id,
      })}"
      data-signals__if-missing="${JSON.stringify({
        _showActions: true,
        _showQuests: true,
        _showInventory: true,
        _showSocial: true,
      })}"
    >
      <div id="info">${UserInfo(props.user, props.messages)}</div>
      <div id="content" class="flex-1 flex flex-col gap-4 overflow-auto">
        ${!props.user.z
          ? WorldMap(props.map, props.mapIndicators, props.isMobile)
          : Zone(
              props.user,
              props.map.find((z) => z.here)!,
              props.inprogress,
              props.players,
              props.chatMessages,
              props.quests,
              props.npcInteractions,
              props.messages,
              props.resourceObjectives,
              props.contextFlashes
            )}
      </div>
    </div>
  `;
};

export const GameContainer = (props: { user_id: string }) => html`
  <div
    id="game-container"
    class="h-full"
    data-signals="{
      isMobile: window.innerWidth < 1024,
    }"
    data-init="@get('/game')"
  >
    <div
      class="md:container md:mx-auto"
      id="game"
      data-signals="${JSON.stringify({ user_id: props.user_id })}"
    ></div>
  </div>
`;

export const GameLogin = (props: { user_id: string; error?: string }) => html`
  <div
    class="container mx-auto"
    id="game"
    data-signals="${JSON.stringify({ user_id: props.user_id })}"
  >
    <div class="grid grid-cols-1 gap-4">
      <h1 class="text-3xl font-bold">Welcome to Aederyn Web!</h1>
      <form
        class="container grid grid-cols-1 gap-4"
        data-on:submit="@post('/game/login')"
      >
        <label class="input input-bordered flex items-center gap-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 16 16"
            fill="currentColor"
            class="h-4 w-4 opacity-70"
          >
            <path
              d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM12.735 14c.618 0 1.093-.561.872-1.139a6.002 6.002 0 0 0-11.215 0c-.22.578.254 1.139.872 1.139h9.47Z"
            />
          </svg>
          <input
            class="grow"
            type="text"
            autocomplete="off"
            data-bind="user_id"
            placeholder="Enter your existing user id or leave blank to create a new one"
          />
        </label>
        ${props.error &&
        html`<div role="alert" class="alert alert-error">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-6 w-6 shrink-0 stroke-current"
            fill="none"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span>${props.error}</span>
        </div>`}
        <button
          class="btn btn-primary"
          data-on:click_once="@post('/game/login')"
        >
          Join
        </button>
      </form>
    </div>
  </div>
`;

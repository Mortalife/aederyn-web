import { html } from "hono/html";
import type { WorldTile } from "../world/index.js";
import { UserInfo, WorldMap, Zone } from "./elements.js";
import type { GameUser, OtherUser } from "../config.js";
import type { UserAction } from "../user/action.js";
import type { ChatMessage } from "../social/chat.js";
import type { SystemMessage } from "../user/system.js";
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
  totalPlayersOnline?: number;
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
      <div id="info">
        ${UserInfo(props.user, props.messages, props.totalPlayersOnline)}
      </div>
      <div id="content" class="flex-1 flex flex-col gap-4 overflow-auto">
        ${!props.user.z
          ? WorldMap(
              props.map,
              props.mapIndicators,
              props.isMobile,
              props.quests
            )
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
    class="container mx-auto flex items-center justify-center min-h-[80vh]"
    id="game"
    data-signals="${JSON.stringify({ user_id: props.user_id })}"
  >
    <div
      class="flex flex-col gap-6 p-6 rounded-xl bg-black/20 border border-white/10 w-full max-w-md"
    >
      <!-- Header -->
      <div class="flex items-center gap-3 pb-4 border-b border-white/10">
        <div class="p-2 rounded-lg bg-white/5">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="1.5"
            stroke="currentColor"
            class="size-6"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
            />
          </svg>
        </div>
        <div>
          <h1 class="text-2xl font-bold">Welcome to Aederyn</h1>
          <p class="text-sm text-gray-400">Enter your adventure</p>
        </div>
      </div>

      <!-- Form -->
      <form class="flex flex-col gap-4" data-on:submit="@post('/game/login')">
        <div class="flex flex-col gap-2">
          <label class="text-sm font-medium text-gray-300">User ID</label>
          <div
            class="flex items-center gap-3 px-4 py-3 rounded-lg bg-white/5 border border-white/10 focus-within:border-white/30 transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 16 16"
              fill="currentColor"
              class="size-4 opacity-50"
            >
              <path
                d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM12.735 14c.618 0 1.093-.561.872-1.139a6.002 6.002 0 0 0-11.215 0c-.22.578.254 1.139.872 1.139h9.47Z"
              />
            </svg>
            <input
              class="flex-grow bg-transparent border-none outline-none placeholder:text-gray-500"
              type="text"
              autocomplete="off"
              data-bind="user_id"
              placeholder="Enter existing ID or leave blank for new"
            />
          </div>
          <p class="text-xs text-gray-500">
            Leave blank to create a new character
          </p>
        </div>

        ${props.error &&
        html`<div
          class="flex items-center gap-3 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="1.5"
            stroke="currentColor"
            class="size-5 shrink-0"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
            />
          </svg>
          <span class="text-sm">${props.error}</span>
        </div>`}

        <button
          class="flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-white/10 border border-white/20 hover:bg-white/20 hover:border-white/30 transition-all duration-200 font-medium"
          data-on:click_once="@post('/game/login')"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="1.5"
            stroke="currentColor"
            class="size-5"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z"
            />
          </svg>
          Begin Adventure
        </button>
      </form>
    </div>
  </div>
`;

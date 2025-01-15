import { html } from "hono/html";
import type { WorldTile } from "../world";
import { Messages, UserInfo, WorldMap, Zone } from "./elements";
import { toHtmlJson } from "../lib/datastar";
import type { GameUser, OtherUser } from "../config";
import type { UserAction } from "../user/action";
import type { ChatMessage } from "../social/chat";
import type { SystemMessage } from "../user/system";
import type {
  MapIndicator,
  ZoneInteraction,
  ZoneQuests,
} from "../user/quest-progress-manager";

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
}) => {
  // const zone = props.map.find((z) => z.here);
  // const theme = zone?.tile?.theme;

  return html`
    <div
      class="md:container md:mx-auto grid grid-rows-[50px_1fr_60px] gap-4 h-full items-between"
      id="game"
    >
      <div id="info">${UserInfo(props.user, props.messages)}</div>
      <div id="content">
        ${!props.user.z && WorldMap(props.map, props.mapIndicators)}
        ${props.user.z &&
        Zone(
          props.user,
          props.map.find((z) => z.here)!,
          props.inprogress,
          props.players,
          props.chatMessages,
          props.quests,
          props.npcInteractions
        )}
      </div>
      <div class="p-4 flex flex-row gap-2 justify-end">
        <button
          class="btn btn-ghost self-end"
          id="game-logout"
          data-on-click="@delete('/game/logout')"
        >
          Logout
        </button>
      </div>
    </div>
  `;
};

export const GameContainer = (props: { user_id: string }) => html`
  <div id="game-container" class="h-full" data-on-load="@get('/game')">
    <div class="md:container md:mx-auto" id="game"></div>
  </div>
`;

export const GameLogin = (props: { user_id: string; error?: string }) => html`
  <div class="container mx-auto" id="game">
    <div
      class="grid grid-cols-1 gap-4"
      data-signals="${toHtmlJson({ user_id: props.user_id })}"
      data-persist-user="user_id"
    >
      <h1 class="text-3xl font-bold">Welcome to Aederyn Web!</h1>
      <form
        class="container grid grid-cols-1 gap-4"
        data-on-submit="@post('/game/login')"
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
          data-on-click_once="@post('/game/login')"
        >
          Join
        </button>
      </form>
    </div>
  </div>
`;

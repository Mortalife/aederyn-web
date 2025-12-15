import { html } from "hono/html";
import { textureMap } from "../config/assets.js";
import type { WorldTile } from "../world/index.js";
import {
  type InventoryItem,
  type GameUser,
  type OtherUser,
  type Resource,
  type RequiredItem,
  MAX_INVENTORY_SIZE,
  type RewardItem,
} from "../config.js";
import { calculateProgress, type UserAction } from "../user/action.js";
import { restrictUserId, type ChatMessage } from "../social/chat.js";
import { formatDistance } from "date-fns";
import type { SystemMessage, SystemMessageActionType } from "../user/system.js";
import type {
  MapIndicator,
  ZoneInteraction,
  ZoneQuests,
} from "../user/quest-progress-manager.js";
import { Quests } from "./quests.js";
import { getPublicPath } from "../config/assets.js";
import {
  GoldIcon,
  ActionsIcon,
  QuestsIcon,
  InventoryIcon,
  SocialIcon,
} from "./icons.js";

export const KeyboardShortcut = (shortcut: string) => html`<span
  class="h-4 hidden md:flex items-center justify-center text-[0.4rem] text-gray-400 font-mono p-[0.2rem] rounded-sm border border-gray-400 mix-blend-color-dodge"
  >${shortcut}</span
>`;

export const MapIndicatorIcons = (indicator: MapIndicator) => html` <div
  class="flex flex-row gap-1.5"
>
  ${indicator.available
    ? html`<div class="tooltip tooltip-top" data-tip="Quest Available">
        <span
          class="flex items-center justify-center size-5 font-black text-yellow-400 drop-shadow-[0_0_6px_rgba(250,204,21,0.8)] animate-pulse select-none"
          style="text-shadow: 0 0 8px rgba(250,204,21,0.6), 0 1px 2px rgba(0,0,0,0.8);"
          >!</span
        >
      </div>`
    : null}
  ${indicator.objective
    ? html`<div class="tooltip tooltip-top" data-tip="Quest Objective">
        <span
          class="flex items-center justify-center size-5 font-black text-orange-400 drop-shadow-[0_0_6px_rgba(251,146,60,0.8)] select-none"
          style="text-shadow: 0 0 8px rgba(251,146,60,0.6), 0 1px 2px rgba(0,0,0,0.8);"
          >◆</span
        >
      </div>`
    : null}
  ${indicator.completable
    ? html`<div class="tooltip tooltip-top" data-tip="Ready to Complete">
        <span
          class="flex items-center justify-center size-5 font-black text-green-500 drop-shadow-[0_0_6px_rgba(74,222,128,0.8)] animate-pulse select-none"
          style="text-shadow: 0 0 8px rgba(74,222,128,0.6), 0 1px 2px rgba(0,0,0,0.8);"
          >?</span
        >
      </div>`
    : null}
</div>`;

export const MobileWorldMap = (
  map: WorldTile[],
  mapIndicators: MapIndicator[],
  quests?: ZoneQuests
) => {
  const totalQuests = quests
    ? quests.availableQuests.length +
      quests.inProgressQuests.length +
      quests.completableQuests.length +
      quests.elsewhereQuests.length +
      quests.discoverableQuests.length
    : 0;

  return html`<div
    id="world-map"
    class="flex flex-col md:flex-row gap-3 px-4 items-center md:justify-between"
    data-signal="${JSON.stringify({ _mapControlIndicator: false })}"
  >
    <!-- Full 5x5 grid with overflow hidden, grid centered in viewport -->
    <div
      class="max-w-[80vw] md:max-w-[60vw] max-h-[80vh] aspect-square overflow-hidden rounded-lg border border-gray-600 flex items-center justify-center"
      style="background-color: #222;"
    >
      ${MapInner(map, mapIndicators)}
    </div>
    <div class="flex flex-col gap-4 items-center">
      ${MapControls()} ${totalQuests > 0 ? MapQuestsSummary(quests!) : null}
    </div>
  </div>`;
};

const getTileTexture = (texture: string | undefined): string | null => {
  return texture ? getPublicPath(textureMap[texture]) ?? null : null;
};

const MapTile = (
  worldTile: WorldTile,
  indicators: MapIndicator | undefined
) => {
  const bgColor = worldTile?.tile?.backgroundColor ?? "#333";
  const textColor = worldTile?.tile?.color ?? "#fff";
  const texture = getTileTexture(worldTile?.tile?.texture);
  const isHere = worldTile.here;

  const baseClasses = `
    relative overflow-hidden
    transition-all duration-300 ease-out
    flex flex-col items-center justify-center text-center
    ${
      isHere
        ? "rounded-2xl scale-110 z-10 ring-4 ring-yellow-400 ring-offset-2 ring-offset-gray-900 shadow-xl shadow-yellow-400/30"
        : "rounded-lg hover:scale-105 hover:z-5"
    }
  `;

  const textureStyle = texture
    ? `background-image: url('${texture}'); background-size: cover; background-position: center;`
    : `background-color: ${bgColor};`;

  return html`
    <div class="${baseClasses}" style="${textureStyle}">
      <!-- Gradient overlay for readability -->
      <div
        class="absolute inset-0 ${isHere ? "rounded-2xl" : "rounded-lg"}"
        style="background: linear-gradient(135deg, ${bgColor}ee 0%, ${bgColor}cc 50%, ${bgColor}aa 100%);"
      ></div>

      <!-- Content layer -->
      <div
        class="relative z-10 flex flex-col items-center justify-center p-2 gap-1"
        style="color: ${textColor};"
      >
        <span
          class="font-bold text-sm leading-tight drop-shadow-md ${isHere
            ? "text-base"
            : ""}"
        >
          ${worldTile?.tile?.name ?? "Unknown"}
        </span>
        <span
          class="text-xs opacity-75 font-mono ${isHere
            ? "font-semibold opacity-100"
            : ""}"
        >
          ${worldTile.x}, ${worldTile.y}
        </span>
        ${indicators ? MapIndicatorIcons(indicators) : null}
      </div>

      <!-- Subtle inner border -->
      <div
        class="absolute inset-0 ${isHere
          ? "rounded-2xl"
          : "rounded-lg"} border border-white/20 pointer-events-none"
      ></div>
    </div>
  `;
};

const MapQuestsSummary = (quests: ZoneQuests) => {
  const {
    availableQuests,
    inProgressQuests,
    completableQuests,
    elsewhereQuests,
    discoverableQuests,
  } = quests;

  return html`
    <div
      class="flex flex-col gap-2 p-3 rounded-xl bg-black/20 border border-white/10 min-w-[220px] max-w-[280px]"
    >
      <div class="flex items-center gap-2 pb-2 border-b border-white/10">
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
            d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"
          />
        </svg>
        <span class="font-semibold text-sm">Quests</span>
      </div>
      <div class="flex flex-col gap-2 text-xs">
        ${availableQuests.length > 0
          ? html`<div class="flex flex-col gap-1">
              <div
                class="flex items-center gap-2 text-yellow-400 font-semibold"
              >
                <span class="font-bold size-4 text-center">!</span>
                <span>Available</span>
              </div>
              ${availableQuests.map(
                (q) =>
                  html`<div
                    class="pl-5 text-yellow-300/80 truncate"
                    title="${q.name}"
                  >
                    ${q.name}
                  </div>`
              )}
            </div>`
          : null}
        ${inProgressQuests.length > 0
          ? html`<div class="flex flex-col gap-1">
              <div
                class="flex items-center gap-2 text-orange-400 font-semibold"
              >
                <span class="font-bold size-4 text-center">◆</span>
                <span>In Progress</span>
              </div>
              ${inProgressQuests.map(
                (q) =>
                  html`<div
                    class="pl-5 text-orange-300/80 truncate"
                    title="${q.name}"
                  >
                    ${q.name}
                  </div>`
              )}
            </div>`
          : null}
        ${completableQuests.length > 0
          ? html`<div class="flex flex-col gap-1">
              <div class="flex items-center gap-2 text-green-400 font-semibold">
                <span class="font-bold size-4 text-center">?</span>
                <span>Ready to Complete</span>
              </div>
              ${completableQuests.map(
                (q) =>
                  html`<div
                    class="pl-5 text-green-300/80 truncate"
                    title="${q.name}"
                  >
                    ${q.name}
                  </div>`
              )}
            </div>`
          : null}
        ${elsewhereQuests.length > 0
          ? html`<div class="flex flex-col gap-1">
              <div class="flex items-center gap-2 text-gray-400 font-semibold">
                <span class="font-bold size-4 text-center">→</span>
                <span>Elsewhere</span>
              </div>
              ${elsewhereQuests.map(
                (q) =>
                  html`<div
                    class="pl-5 text-gray-400/80 truncate"
                    title="${q.name}"
                  >
                    ${q.name}
                  </div>`
              )}
            </div>`
          : null}
        ${discoverableQuests.length > 0
          ? html`<div class="flex flex-col gap-1 pt-2 border-white/10">
              <div
                class="flex items-center gap-2 text-purple-400 font-semibold"
              >
                <span
                  class="flex items-center justify-center size-4 text-xs animate-pulse"
                  >✦</span
                >
                <span class="italic"
                  >${discoverableQuests.length} hidden
                  ${discoverableQuests.length === 1 ? "quest" : "quests"}
                  await...</span
                >
              </div>
              <div class="pl-5 text-purple-300/60 text-[0.65rem] italic">
                Explore the world to find them!
              </div>
            </div>`
          : null}
      </div>
    </div>
  `;
};

export const MapInner = (map: WorldTile[], mapIndicators: MapIndicator[]) => {
  return html`<div
    id="map"
    class="min-w-[500px] relative p-4 grid grid-rows-5 grid-cols-5 grid-flow-col aspect-square gap-2 bg-gray-900 rounded-xl"
  >
    ${map.map((worldTile) => {
      const indicators = mapIndicators.find(
        (indicator) =>
          indicator.x === worldTile.x && indicator.y === worldTile.y
      );
      return MapTile(worldTile, indicators);
    })}
  </div>`;
};

export const MapControls = () => {
  return html`
    <div
      id="map-controls"
      data-signal="${JSON.stringify({
        _mapControlIndicator: false,
      })}"
      class="sticky bg-black/10 p-2 rounded-full w-[172px] h-[172px]  grid grid-cols-3 grid-rows-3 gap-2"
    >
      <button
        class="btn btn-square col-start-2 row-start-1 shadow"
        data-on:click="@post('/game/move/up')"
        data-indicator="_mapControlIndicator"
        data-attr:disabled="$_mapControlIndicator"
        data-on-keys:up="el.click()"
      >
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
            d="M4.5 10.5 12 3m0 0 7.5 7.5M12 3v18"
          />
        </svg>

        <span class="sr-only">Up</span>
      </button>
      <button
        class="btn btn-square col-start-2 row-start-3 shadow"
        data-on:click="@post('/game/move/down')"
        data-indicator="_mapControlIndicator"
        data-attr:disabled="$_mapControlIndicator"
        data-on-keys:down="el.click()"
      >
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
            d="M19.5 13.5 12 21m0 0-7.5-7.5M12 21V3"
          />
        </svg>

        <span class="sr-only">Down</span>
      </button>
      <button
        class="btn btn-square btn-primary col-start-2 row-start-2 shadow"
        data-on:click="@post('/game/move/enter')"
        data-indicator="_mapControlIndicator"
        data-attr:disabled="$_mapControlIndicator"
        data-on-keys:enter="el.click()"
      >
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
            d="M9 8.25H7.5a2.25 2.25 0 0 0-2.25 2.25v9a2.25 2.25 0 0 0 2.25 2.25h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25H15m0-3-3-3m0 0-3 3m3-3V15"
          />
        </svg>

        <span class="sr-only">Enter</span>
      </button>
      <button
        class="btn btn-square col-start-1 row-start-2 shadow"
        data-on:click="@post('/game/move/left')"
        data-indicator="_mapControlIndicator"
        data-attr:disabled="$_mapControlIndicator"
        data-on-keys:left="el.click()"
      >
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
            d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18"
          />
        </svg>

        <span class="sr-only">Left</span>
      </button>
      <button
        class="btn btn-square col-start-3 row-start-2 shadow"
        data-on:click="@post('/game/move/right')"
        data-indicator="_mapControlIndicator"
        data-attr:disabled="$_mapControlIndicator"
        data-on-keys:right="el.click()"
      >
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
            d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3"
          />
        </svg>

        <span class="sr-only">Right</span>
      </button>
    </div>
  `;
};

export const WorldMap = (
  map: WorldTile[],
  mapIndicators: MapIndicator[],
  isMobile = false,
  quests?: ZoneQuests
) => {
  if (isMobile) {
    return MobileWorldMap(map, mapIndicators, quests);
  }

  const totalQuests = quests
    ? quests.availableQuests.length +
      quests.inProgressQuests.length +
      quests.completableQuests.length +
      quests.elsewhereQuests.length
    : 0;

  return html`<div
    id="world-map"
    class="flex flex-col gap-4 justify-center items-center"
  >
    <div
      class="max-w-[50vw] max-h-[50vh] aspect-square overflow-hidden rounded-lg border border-gray-600 flex items-center justify-center"
      style="background-color: #222;"
    >
      ${MapInner(map, mapIndicators)}
    </div>
    <div class="flex flex-col gap-4 items-center">${MapControls()}</div>
    ${totalQuests > 0 ? MapQuestsSummary(quests!) : null}
  </div>`;
};

const getResourceTypeIcon = (type: string) => {
  switch (type) {
    case "resource":
      return html`<svg
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
          d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0l-3-3m3 3l3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"
        />
      </svg>`;
    case "workbench":
      return html`<svg
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
          d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z"
        />
      </svg>`;
    default:
      return html`<svg
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
          d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z"
        />
      </svg>`;
  }
};

const getThemeColors = (theme: string | undefined) => {
  const themes: Record<
    string,
    { bg: string; border: string; accent: string; text: string }
  > = {
    forest: {
      bg: "bg-emerald-950/50",
      border: "border-emerald-700",
      accent: "text-emerald-400",
      text: "text-emerald-100",
    },
    lemonade: {
      bg: "bg-lime-950/50",
      border: "border-lime-600",
      accent: "text-lime-400",
      text: "text-lime-100",
    },
    meadow: {
      bg: "bg-yellow-950/50",
      border: "border-yellow-600",
      accent: "text-yellow-400",
      text: "text-yellow-100",
    },
    swamp: {
      bg: "bg-teal-950/50",
      border: "border-teal-700",
      accent: "text-teal-400",
      text: "text-teal-100",
    },
    mountain: {
      bg: "bg-slate-800/50",
      border: "border-slate-500",
      accent: "text-slate-300",
      text: "text-slate-100",
    },
    cave: {
      bg: "bg-purple-950/50",
      border: "border-purple-700",
      accent: "text-purple-400",
      text: "text-purple-100",
    },
    mine: {
      bg: "bg-amber-950/50",
      border: "border-amber-700",
      accent: "text-amber-400",
      text: "text-amber-100",
    },
    frozen: {
      bg: "bg-cyan-950/50",
      border: "border-cyan-500",
      accent: "text-cyan-300",
      text: "text-cyan-100",
    },
    waterfall: {
      bg: "bg-blue-950/50",
      border: "border-blue-500",
      accent: "text-blue-400",
      text: "text-blue-100",
    },
    city: {
      bg: "bg-violet-950/50",
      border: "border-violet-600",
      accent: "text-violet-400",
      text: "text-violet-100",
    },
    storm: {
      bg: "bg-gray-800/50",
      border: "border-gray-500",
      accent: "text-gray-300",
      text: "text-gray-100",
    },
    retro: {
      bg: "bg-orange-950/50",
      border: "border-orange-600",
      accent: "text-orange-400",
      text: "text-orange-100",
    },
    nord: {
      bg: "bg-indigo-950/50",
      border: "border-indigo-500",
      accent: "text-indigo-400",
      text: "text-indigo-100",
    },
    coffee: {
      bg: "bg-stone-800/50",
      border: "border-stone-500",
      accent: "text-stone-300",
      text: "text-stone-100",
    },
  };
  return (
    themes[theme ?? ""] ?? {
      bg: "bg-gray-900/50",
      border: "border-gray-600",
      accent: "text-gray-300",
      text: "text-gray-100",
    }
  );
};

const ZoneNavButton = (
  label: string,
  shortcut: string,
  signalName: string,
  count: number | null,
  icon: ReturnType<typeof html>,
  hasNotification = false
) => html`
  <button
    class="flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-all duration-200 min-w-[60px] md:min-w-[80px]
           border border-transparent md:hover:bg-white/10 md:hover:border-white/20"
    data-class="{'bg-white/15 border-gray/20 shadow-lg': $${signalName}}"
    data-attr="{'data-active': $${signalName}}"
    data-on:click="$${signalName} = !$${signalName}"
    data-on-keys:${shortcut.toLowerCase()}="el.click()"
  >
    <div class="relative">
      ${icon}
      ${hasNotification
        ? html`<span
            class="absolute -top-1 -right-1 size-2 bg-yellow-400 rounded-full animate-pulse"
          ></span>`
        : null}
    </div>
    <span class="text-xs font-medium hidden md:inline"
      >${label}${count !== null
        ? html` <span class="opacity-60">(${count})</span>`
        : ""}</span
    >
    <span class="text-[0.6rem] text-gray-400 font-mono hidden md:inline"
      >${shortcut}</span
    >
  </button>
`;

const ZoneSectionHeader = (
  title: string,
  subtitle: string | null,
  icon: ReturnType<typeof html>
) => html`
  <div class="flex items-center gap-3 pb-2 border-b border-white/10">
    <div class="p-2 rounded-lg bg-white/5">${icon}</div>
    <div>
      <h2 class="text-xl font-bold">${title}</h2>
      ${subtitle
        ? html`<p class="text-sm text-gray-400">${subtitle}</p>`
        : null}
    </div>
  </div>
`;

export const Zone = (
  user: GameUser,
  worldTile: WorldTile,
  inprogress?: UserAction,
  players: OtherUser[] = [],
  chatMessages: ChatMessage[] = [],
  zoneQuests: ZoneQuests = {
    availableQuests: [],
    inProgressQuests: [],
    completableQuests: [],
    elsewhereQuests: [],
    discoverableQuests: [],
  },
  npcInteractions: ZoneInteraction[] = [],
  messages: SystemMessage[] = [],
  resourceObjectives: Set<string> = new Set([]),
  contextFlashes: Map<string, SystemMessage> = new Map([])
) => {
  const groupedResources = Object.groupBy(
    worldTile.tile?.resources ?? [],
    (resource) => resource.type
  );

  const theme = getThemeColors(worldTile.tile?.theme);
  const totalResources = worldTile.tile?.resources?.length ?? 0;
  const totalQuests =
    zoneQuests.availableQuests.length +
    zoneQuests.inProgressQuests.length +
    zoneQuests.completableQuests.length;
  const hasQuestNotification =
    zoneQuests.availableQuests.length > 0 ||
    zoneQuests.completableQuests.length > 0 ||
    npcInteractions.length > 0;

  return html`<div id="zone" class="flex flex-col gap-4 pr-1">
    <!-- Zone Header -->
    <div class="${theme.bg} ${theme.border} border rounded-xl p-4">
      <div
        class="flex flex-col md:flex-row md:items-center md:justify-between gap-4"
      >
        <div class="flex items-center gap-4">
          <div class="p-3 rounded-xl bg-white/10 ${theme.accent}">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="1.5"
              stroke="currentColor"
              class="size-8"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"
              />
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"
              />
            </svg>
          </div>
          <div>
            <h1 class="text-2xl md:text-3xl font-bold ${theme.text}">
              ${worldTile.tile?.name}
            </h1>
            <p class="text-sm ${theme.accent} opacity-80">
              ${worldTile.tile?.description ??
              `Coordinates: ${worldTile.x}, ${worldTile.y}`}
            </p>
          </div>
        </div>
        <div class="flex items-center gap-3">
          <button
            class="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 border border-white/20 hover:bg-white/20 hover:border-white/30 transition-all duration-200 text-sm font-medium"
            data-on:click="@post('/game/move/exit')"
            data-on-keys:escape="el.click()"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="1.5"
              stroke="currentColor"
              class="size-4"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3"
              />
            </svg>
            Exit Zone ${KeyboardShortcut("esc")}
          </button>
        </div>
      </div>
    </div>

    <!-- Navigation Tabs -->
    <div
      id="zone-nav"
      class="sticky top-0 md:top-auto flex justify-center md:justify-start gap-1 md:gap-2 p-2 rounded-xl bg-[#0d0d0d] md:bg-black/20 border-b border-white/10 md:border"
    >
      ${ZoneNavButton(
        "Actions",
        "A",
        "_showActions",
        totalResources,
        ActionsIcon,
        contextFlashes.has("resource")
      )}
      ${ZoneNavButton(
        "Quests",
        "Q",
        "_showQuests",
        totalQuests,
        QuestsIcon,
        hasQuestNotification || contextFlashes.has("quest")
      )}
      ${ZoneNavButton(
        "Inventory",
        "I",
        "_showInventory",
        user.i.length,
        InventoryIcon,
        contextFlashes.has("inventory")
      )}
      ${ZoneNavButton(
        "Social",
        "S",
        "_showSocial",
        players.length,
        SocialIcon,
        false
      )}
    </div>

    <!-- Actions Panel -->
    <div
      id="resources"
      class="flex flex-col gap-4 p-4 rounded-xl bg-black/20 border border-white/10"
      data-show="$_showActions"
    >
      ${ZoneSectionHeader(
        "Actions",
        totalResources > 0
          ? `${totalResources} activities available`
          : "Nothing to do here",
        ActionsIcon
      )}
      ${Object.entries(groupedResources).length === 0
        ? html`<div class="text-center py-8 text-gray-400">
            <p>No resources or activities available in this area.</p>
            <p class="text-sm mt-2">Try exploring other zones!</p>
          </div>`
        : Object.entries(groupedResources).map(
            ([type, resources]) => html`
              <div class="flex flex-col gap-3">
                <div class="flex items-center gap-2 ${theme.accent}">
                  ${getResourceTypeIcon(type)}
                  <h3 class="text-lg font-semibold capitalize">
                    ${type === "workbench" ? "Crafting" : "Gathering"}
                  </h3>
                  <span class="text-xs opacity-60">(${resources.length})</span>
                </div>
                <div class="grid grid-cols-1 gap-2">
                  ${resources.map((resource) =>
                    ResourceItem({
                      resource,
                      inventory: user.i,
                      inprogress:
                        inprogress?.resource_id === resource.id
                          ? {
                              total: resource.collectionTime,
                              current: calculateProgress(inprogress),
                            }
                          : undefined,
                      flashMessage: contextFlashes.get(
                        `resource:${resource.id}`
                      ),
                      isObjective: resourceObjectives.has(resource.id),
                    })
                  )}
                </div>
              </div>
            `
          )}
    </div>

    <!-- Quests Panel -->
    ${Quests({
      zoneQuests,
      npcInteractions,
      flashMessage: contextFlashes.get("quest"),
    })}

    <!-- Inventory Panel -->
    <div
      id="inventory"
      class="flex flex-col gap-4 p-4 rounded-xl bg-black/20 border border-white/10"
      data-show="$_showInventory"
    >
      ${ZoneSectionHeader(
        "Inventory",
        `${user.i.length}/${MAX_INVENTORY_SIZE} slots used`,
        InventoryIcon
      )}
      <div
        class="flex items-center gap-2 px-3 py-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20 w-fit"
      >
        ${GoldIcon}
        <span class="font-bold text-yellow-400">${user.$}</span>
        <span class="text-sm text-yellow-400/70">Gold</span>
      </div>
      ${user.i.length === 0
        ? html`<div class="text-center py-8 text-gray-400">
            <p>Your inventory is empty.</p>
            <p class="text-sm mt-2">Gather resources to fill it up!</p>
          </div>`
        : html`<div class="grid grid-cols-1 gap-2">
            ${user.i.map((item, index) =>
              InventorySlot({
                slot: item,
                index,
              })
            )}
          </div>`}
    </div>

    <!-- Social Panel -->
    <div
      id="social"
      class="flex flex-col gap-4 p-4 rounded-xl bg-black/20 border border-white/10"
      data-show="$_showSocial"
    >
      ${ZoneSectionHeader(
        "Social",
        players.length > 0
          ? `${players.length} players nearby`
          : "You're alone here",
        SocialIcon
      )}

      <!-- Players Section -->
      <div class="flex flex-col gap-3">
        <h3 class="text-lg font-semibold flex items-center gap-2">
          <span class="size-2 bg-green-500 rounded-full animate-pulse"></span>
          Active Players
        </h3>
        ${players.length === 0
          ? html`<p class="text-gray-400 text-sm">
              No other players in this zone.
            </p>`
          : html`<div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
              ${players.map((player) => OtherPlayerInfo(player))}
            </div>`}
      </div>

      <!-- Chat Section -->
      <div
        id="chat"
        class="flex flex-col gap-3 pt-4 border-t border-white/10"
        data-signals__ifmissing="${JSON.stringify({ message: "" })}"
      >
        <h3 class="text-lg font-semibold">Zone Chat</h3>
        <form
          class="flex flex-row gap-2"
          data-on:submit="@post('/game/chat'); $message = ''"
        >
          <input
            type="text"
            class="flex-grow px-4 py-2 rounded-lg bg-white/5 border border-white/10 focus:border-white/30 focus:outline-none transition-colors"
            autocomplete="off"
            data-bind="message"
            maxlength="100"
            data-on-keys__el__stop="1"
            placeholder="Say something..."
          />
          <button class="btn btn-primary">Send</button>
        </form>
        ${ChatMessages(chatMessages, user)}
      </div>
    </div>
  </div>`;
};

export const ChatMessages = (messages: ChatMessage[], user: GameUser) => {
  const now = new Date();
  return html` <div id="chat-messages" class="max-h-[400px] overflow-auto">
    ${messages.map((message) => {
      const isYou = message.user_id === user.id;

      return html`<div class="chat ${isYou ? "chat-end" : "chat-start"}">
        <div class="chat-bubble">
          <div class="chat-header text-xs">
            ${isYou ? "You" : restrictUserId(message.user_id)}
          </div>
          <div>${message.message}</div>
          <div class="chat-footer opacity-50">
            <time class="text-xs opacity-50"
              >${formatDistance(new Date(message.sent_at), now, {
                addSuffix: true,
              })}</time
            >
          </div>
        </div>
      </div>`;
    })}
  </div>`;
};

export const GameMenu = (user: GameUser, messages?: SystemMessage[]) => {
  const hasMessages = messages && messages.length > 0;
  const recentMessage = messages?.[0];
  const hasRecentAlert =
    recentMessage && recentMessage.sent_at > Date.now() - 10000;

  let alertColor = "";
  if (hasRecentAlert) {
    switch (recentMessage.type) {
      case "error":
        alertColor = "text-red-400";
        break;
      case "warning":
        alertColor = "text-yellow-400";
        break;
      case "success":
        alertColor = "text-green-400";
        break;
    }
  }

  return html`
    <div
      id="game-menu"
      class="relative"
      data-signals__ifmissing="${JSON.stringify({ _menuOpen: false })}"
    >
      <!-- Menu Toggle Button -->
      <button
        class="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10 border border-white/20 hover:bg-white/20 hover:border-white/30 transition-all duration-200"
        data-on:click="$_menuOpen = !$_menuOpen"
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
            d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
          />
        </svg>
        <span class="text-sm font-medium hidden sm:inline">Menu</span>
        ${hasMessages
          ? html`<span
              class="flex items-center justify-center size-5 text-xs font-bold rounded-full ${hasRecentAlert
                ? alertColor + " bg-white/20"
                : "bg-white/10 text-gray-400"}"
            >
              ${messages.length}
            </span>`
          : null}
      </button>

      <!-- Dropdown Menu -->
      <div
        class="absolute right-0 top-full mt-2 w-72 rounded-xl bg-gray-900/95 backdrop-blur-sm border border-white/20 shadow-2xl z-50 overflow-hidden"
        data-show="$_menuOpen"
      >
        <!-- Menu Header -->
        <div class="px-4 py-3 border-b border-white/10 bg-white/5">
          <div class="flex items-center justify-between">
            <span class="text-sm font-semibold text-gray-300">Game Menu</span>
            <span class="text-xs text-gray-500 font-mono"
              >${user.p.x}, ${user.p.y}</span
            >
          </div>
        </div>

        <!-- Menu Items -->
        <div class="p-2 flex flex-col gap-1">
          <!-- Refresh -->
          <button
            class="flex items-center gap-3 w-full px-3 py-2 rounded-lg hover:bg-white/10 transition-colors text-left"
            data-on:click="@get('/game/refresh'); $_menuOpen = false"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="1.5"
              stroke="currentColor"
              class="size-5 text-blue-400"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"
              />
            </svg>
            <div class="flex-1">
              <span class="text-sm font-medium">Refresh</span>
              <p class="text-xs text-gray-500">Reload game state</p>
            </div>
          </button>

          <!-- Messages -->
          ${hasMessages
            ? html`
                <div class="border-t border-white/10 my-1"></div>
                <div class="px-3 py-2">
                  <div class="flex items-center justify-between mb-2">
                    <span
                      class="text-xs font-semibold text-gray-400 uppercase tracking-wide"
                      >Notifications</span
                    >
                    <button
                      class="text-xs text-red-400 hover:text-red-300 transition-colors"
                      data-on:click="@delete('/game/system-messages')"
                    >
                      Clear All
                    </button>
                  </div>
                  <div class="flex flex-col gap-1 max-h-48 overflow-y-auto">
                    ${messages.slice(0, 5).map(
                      (msg) => html`
                        <div
                          class="flex items-start gap-2 p-2 rounded-lg ${msg.type ===
                          "error"
                            ? "bg-red-500/10"
                            : msg.type === "warning"
                            ? "bg-yellow-500/10"
                            : msg.type === "success"
                            ? "bg-green-500/10"
                            : "bg-blue-500/10"}"
                        >
                          <span
                            class="size-2 rounded-full mt-1.5 flex-shrink-0 ${msg.type ===
                            "error"
                              ? "bg-red-400"
                              : msg.type === "warning"
                              ? "bg-yellow-400"
                              : msg.type === "success"
                              ? "bg-green-400"
                              : "bg-blue-400"}"
                          ></span>
                          <p class="text-xs text-gray-300 flex-1">
                            ${msg.message}
                          </p>
                          <button
                            class="text-gray-500 hover:text-gray-300 transition-colors"
                            data-on:click="@delete('/game/system-messages/${msg.id}')"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke-width="1.5"
                              stroke="currentColor"
                              class="size-3"
                            >
                              <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                d="M6 18L18 6M6 6l12 12"
                              />
                            </svg>
                          </button>
                        </div>
                      `
                    )}
                    ${messages.length > 5
                      ? html`<p class="text-xs text-gray-500 text-center py-1">
                          +${messages.length - 5} more
                        </p>`
                      : null}
                  </div>
                </div>
              `
            : null}

          <div class="border-t border-white/10 my-1"></div>

          <!-- User ID -->
          <div class="px-3 py-2">
            <span
              class="text-xs font-semibold text-gray-400 uppercase tracking-wide"
              >Your ID</span
            >
            <div class="mt-1 flex items-center gap-2">
              <input
                type="text"
                value="${user.id}"
                readonly
                class="flex-1 px-2 py-1 text-xs font-mono bg-white/5 border border-white/10 rounded text-gray-400"
              />
              <button
                class="p-1 rounded hover:bg-white/10 transition-colors text-gray-400 hover:text-gray-200"
                onclick="navigator.clipboard.writeText('${user.id}')"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke-width="1.5"
                  stroke="currentColor"
                  class="size-4"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184"
                  />
                </svg>
              </button>
            </div>
          </div>

          <div class="border-t border-white/10 my-1"></div>

          <!-- Logout -->
          <button
            class="flex items-center gap-3 w-full px-3 py-2 rounded-lg hover:bg-red-500/20 transition-colors text-left group"
            data-on:click="@delete('/game/logout')"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="1.5"
              stroke="currentColor"
              class="size-5 text-red-400"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75"
              />
            </svg>
            <div class="flex-1">
              <span
                class="text-sm font-medium text-red-400 group-hover:text-red-300"
                >Logout</span
              >
              <p class="text-xs text-gray-500">End your session</p>
            </div>
          </button>
        </div>
      </div>

      <!-- Click outside to close -->
      <div
        class="fixed inset-0 z-40"
        data-show="$_menuOpen"
        data-on:click="$_menuOpen = false"
      ></div>
    </div>
  `;
};

export const UserInfo = (
  user: GameUser,
  messages?: SystemMessage[],
  totalPlayersOnline?: number
) => html`<div
  id="user-info"
  class="w-full flex flex-row justify-between items-center px-2"
>
  <div class="flex items-center gap-2">
    <span class="text-lg font-bold text-white/90">Aederyn</span>
    ${user.z
      ? html`<span
          class="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 border border-green-500/30"
          >In Zone</span
        >`
      : html`<span
          class="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30"
          >World Map</span
        >`}
    ${totalPlayersOnline !== undefined
      ? html`<span
          class="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center gap-1"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="1.5"
            stroke="currentColor"
            class="size-3"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z"
            />
          </svg>
          ${totalPlayersOnline} online</span
        >`
      : null}
  </div>
  ${GameMenu(user, messages)}
</div>`;
export const OtherPlayerInfo = (otherUser: OtherUser) => html` <div
  id="other-user-${otherUser.id}"
  class="w-full flex flex-row justify-between"
>
  <p>${restrictUserId(otherUser.id)}</p>
  <p>${otherUser.p.x}, ${otherUser.p.y}</p>
</div>`;

export const ContextualFlash = (props: { message?: SystemMessage }) => {
  if (!props.message) return null;

  const latestMessage = props.message;
  const bgColor =
    latestMessage.type === "error"
      ? "bg-red-500/20 border-red-500/40 text-red-300"
      : latestMessage.type === "warning"
      ? "bg-yellow-500/20 border-yellow-500/40 text-yellow-300"
      : latestMessage.type === "success"
      ? "bg-green-500/20 border-green-500/40 text-green-300"
      : "bg-blue-500/20 border-blue-500/40 text-blue-300";

  return html`
    <div
      class="flex items-center gap-2 px-3 py-2 rounded-lg border text-sm animate-pulse ${bgColor}"
    >
      <span class="flex-1">${latestMessage.message}</span>
      <button
        class="opacity-60 hover:opacity-100 transition-opacity"
        data-on:click="@delete('/game/system-messages/${latestMessage.id}')"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke-width="1.5"
          stroke="currentColor"
          class="size-4"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
    </div>
  `;
};

export const ResourceItem = (props: {
  resource: Resource;
  inventory: InventoryItem[];
  inprogress?: {
    total: number;
    current: number;
  };
  flashMessage?: SystemMessage;
  isObjective?: boolean;
}) => {
  const hasRequirements = props.resource.required_items.length > 0;
  const hasRewards = props.resource.reward_items.length > 0;
  const progressPercent = props.inprogress
    ? Math.round((props.inprogress.current / props.inprogress.total) * 100)
    : 0;

  const flashMessage = ContextualFlash({ message: props.flashMessage });

  return html`<div
    id="resources-${props.resource.id}"
    class="rounded-xl flex flex-col gap-3 p-4 bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all duration-200 ${props.inprogress
      ? "ring-2 ring-blue-500/50"
      : props.isObjective
      ? "ring-2 ring-orange-500/50 border-orange-500/30"
      : ""}"
  >
    <!-- Header Row -->
    <div class="flex flex-row items-start justify-between gap-4">
      <div class="flex-1">
        <div class="flex items-center gap-2">
          <span class="font-bold text-lg text-white"
            >${props.resource.name}</span
          >
          ${props.isObjective
            ? html`<span
                class="text-xs px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30"
                >Quest Objective</span
              >`
            : null}
          ${!props.resource.limitless
            ? html`<span
                class="text-xs px-2 py-0.5 rounded-full flex flex-row items-center justify-center gap-1 ${props.resource
                  .amount_remaining > 0
                  ? "bg-green-500/20 text-green-400"
                  : "bg-red-500/20 text-red-400"}"
              >
                ${props.resource.amount_remaining} left
                ${props.resource.amount !== props.resource.amount_remaining
                  ? html`<span
                      class="tooltip tooltip-top"
                      data-tip="Replenishing"
                    >
                      <span class="loading loading-dots loading-xs"></span>
                    </span>`
                  : ""}
              </span>`
            : html`<span
                class="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400"
                >Unlimited</span
              >`}
        </div>
      </div>

      ${props.inprogress
        ? html`<button
            class="btn btn-sm btn-outline btn-warning"
            data-on:click="@delete('/game/resources/${props.resource.id}')"
          >
            Cancel
          </button>`
        : html`<button
            class="btn btn-sm btn-primary"
            data-on:click="@get('/game/resources/${props.resource.id}')"
          >
            ${props.resource.verb}
          </button>`}
    </div>

    <!-- Contextual Flash Message -->
    ${flashMessage}

    <!-- Progress Bar (when active) -->
    ${props.inprogress
      ? html`<div class="flex flex-col gap-1">
          <div class="flex items-center justify-between text-xs text-gray-400">
            <span>In Progress...</span>
            <span class="font-mono"
              >${props.inprogress.current}/${props.inprogress.total}s</span
            >
          </div>
          <div class="w-full h-2 rounded-full bg-white/10 overflow-hidden">
            <div
              class="h-full bg-blue-500 transition-all duration-300"
              style="width: ${progressPercent}%"
            ></div>
          </div>
        </div>`
      : null}

    <!-- Requirements & Rewards -->
    ${hasRequirements || hasRewards
      ? html`<div class="flex flex-wrap gap-4 pt-2 border-t border-white/10">
          ${hasRequirements
            ? (() => {
                const hasItemCheck = (item: RequiredItem) =>
                  props.inventory.find(
                    (inv) => inv.item.id === item.item.id && inv.qty >= item.qty
                  );
                const available =
                  props.resource.required_items.filter(hasItemCheck);
                const missing = props.resource.required_items.filter(
                  (i) => !hasItemCheck(i)
                );
                return html`<div class="flex flex-col gap-2">
                  <span
                    class="text-xs font-semibold text-gray-400 uppercase tracking-wide"
                    >Requires</span
                  >
                  <div class="flex flex-wrap gap-2">
                    ${available.map((a) =>
                      ResourceRequiredItem(a, props.inventory)
                    )}
                    ${missing.map((a) =>
                      ResourceRequiredItem(a, props.inventory)
                    )}
                  </div>
                </div>`;
              })()
            : null}
          ${hasRewards
            ? html`<div class="flex flex-col gap-2">
                <span
                  class="text-xs font-semibold text-gray-400 uppercase tracking-wide"
                  >Rewards</span
                >
                <div class="flex flex-wrap gap-2">
                  ${props.resource.reward_items.map((i) =>
                    ResourceRewardItem(i)
                  )}
                </div>
              </div>`
            : null}
        </div>`
      : null}
  </div>`;
};

export const ResourceRequiredItem = (
  item: RequiredItem,
  inventory: InventoryItem[]
) => {
  const hasItem = inventory.find(
    (inv) => inv.item.id === item.item.id && inv.qty >= item.qty
  );
  const hasDurabilityReduction =
    item.qty === 1 && !item.consumed && item.itemDurabilityReduction;

  return html`<div
    class="flex items-center gap-1.5 px-2 py-1 rounded-lg text-sm ${hasItem
      ? "bg-white/10 border border-white/20"
      : "bg-red-500/10 border border-red-500/30 opacity-70"}"
  >
    <span
      class="${hasItem ? "text-orange-400" : "text-red-400"} font-mono text-xs"
    >
      ${hasDurabilityReduction
        ? html`${DurabilityIcon}-${item.itemDurabilityReduction}`
        : `-${item.qty}`}
    </span>
    <span class="${hasItem ? "text-gray-200" : "text-red-300"}"
      >${item.item.name}</span
    >
    ${!hasItem
      ? html`<span class="text-red-400" title="Missing from inventory">✗</span>`
      : item.consumed
      ? html`<span class="text-orange-400/60" title="Will be consumed">↓</span>`
      : html`<span class="text-green-400/60" title="Required (not consumed)"
          >✓</span
        >`}
  </div>`;
};

export const ResourceRewardItem = (item: RewardItem) => {
  return html`<div
    class="flex items-center gap-1.5 px-2 py-1 rounded-lg text-sm bg-green-500/10 border border-green-500/30"
  >
    <span class="text-green-400 font-mono text-xs">+${item.qty}</span>
    <span class="text-green-300">${item.item.name}</span>
  </div>`;
};

export const InventorySlot = (props: {
  slot: InventoryItem;
  index: number;
}) => {
  const durability = props.slot.item.durability;
  const durabilityPercent = durability
    ? Math.round((durability.current / durability.max) * 100)
    : null;
  const durabilityColor = durabilityPercent
    ? durabilityPercent > 50
      ? "text-green-400"
      : durabilityPercent > 25
      ? "text-yellow-400"
      : "text-red-400"
    : "";

  return html`<div
    id="inventory-${props.slot.id}"
    class="flex flex-row gap-4 items-center p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all duration-200"
  >
    <!-- Quantity Badge -->
    <div
      class="flex items-center justify-center min-w-[48px] h-12 rounded-lg bg-white/10 border border-white/20"
    >
      <span class="text-xl font-bold text-white">${props.slot.qty}</span>
    </div>

    <!-- Item Info -->
    <div class="flex flex-col gap-0.5 flex-1 min-w-0">
      <span class="font-semibold text-white truncate"
        >${props.slot.item.name}</span
      >
      <span class="text-xs text-gray-400 line-clamp-1"
        >${props.slot.item.description}</span
      >
    </div>

    <!-- Durability (if applicable) -->
    ${durability
      ? html`<div class="flex items-center gap-2">
          <div class="flex flex-col items-end gap-0.5">
            <div class="flex items-center gap-1 ${durabilityColor}">
              ${DurabilityIcon}
              <span class="text-sm font-mono"
                >${durability.current}/${durability.max}</span
              >
            </div>
            <div class="w-16 h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div
                class="h-full transition-all duration-300 ${durabilityPercent &&
                durabilityPercent > 50
                  ? "bg-green-500"
                  : durabilityPercent && durabilityPercent > 25
                  ? "bg-yellow-500"
                  : "bg-red-500"}"
                style="width: ${durabilityPercent}%"
              ></div>
            </div>
          </div>
        </div>`
      : null}

    <!-- Delete Button -->
    <button
      class="p-2 rounded-lg text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-colors"
      data-on:click="@delete('/game/inventory/${props.slot.id}')"
      title="Delete item"
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
          d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
        />
      </svg>
    </button>
  </div>`;
};

export const DurabilityIcon = html`<svg
  xmlns="http://www.w3.org/2000/svg"
  fill="none"
  viewBox="0 0 24 24"
  stroke-width="1.5"
  stroke="currentColor"
  class="size-4 inline"
>
  <path
    stroke-linecap="round"
    stroke-linejoin="round"
    d="m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z"
  />
</svg>`;

export const Messages = (messages: SystemMessage[], showLatest = false) => {
  const last = messages[0];

  let alertClass = "";

  if (last && last.sent_at > Date.now() - 10000) {
    switch (last.type) {
      case "error":
        alertClass = "text-red-500";
        break;
      case "warning":
        alertClass = "text-yellow-500";
        break;
      case "success":
        alertClass = "text-green-500";
        break;
      default:
        break;
    }
    if (showLatest) {
      return Message(last);
    }
  }

  if (showLatest) {
    return null;
  }

  return html`
    <div class="drawer w-auto">
      <input id="my-drawer" type="checkbox" class="drawer-toggle" />
      <div class="drawer-content">
        <label for="my-drawer" class="btn btn-ghost drawer-button"
          ><svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="1.5"
            stroke="currentColor"
            class="size-6 ${alertClass}"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0"
            />
          </svg>
        </label>
      </div>
      <div class="drawer-side  z-20">
        <label
          for="my-drawer"
          aria-label="close sidebar"
          class="drawer-overlay"
        ></label>

        <div
          class="menu min-w-[75%] md:min-w-[50%] h-full bg-base-100 flex flex-col gap-2"
        >
          <button
            class="btn btn-sm btn-primary"
            data-on:click="@delete('/game/system-messages')"
          >
            Remove All
          </button>
          <div
            class="flex flex-col h-[90vh] max-h-full overflow-y-scroll gap-4"
          >
            ${messages.map((message) => Message(message))}
          </div>
        </div>
      </div>
      <div class="flex flex-col gap-2"></div>
    </div>
  `;
};

export const Message = (message: SystemMessage) => html`
  <div
    role="alert"
    id="message-${message.id}"
    class="flex flex-row justify-between alert ${message.type === "error"
      ? "alert-error"
      : message.type === "warning"
      ? "alert-warning"
      : message.type === "success"
      ? "alert-success"
      : "alert-info"}"
  >
    <span>${message.message}</span>
    <div>
      <button
        class="btn btn-sm"
        data-on:click="@delete('/game/system-messages/${message.id}')"
      >
        Remove
      </button>
    </div>
  </div>
`;

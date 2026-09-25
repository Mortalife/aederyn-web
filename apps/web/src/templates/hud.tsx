import { html } from "hono/html";
import { BASE_USER, MAX_INVENTORY_SIZE, type GameUser } from "../config.js";
import type { ResolvedEffect } from "../world/effects.js";
import { PlayerEffects } from "./effects.js";
import { GoldIcon } from "./icons.js";
import { ICON_CREDIT, ICON_LICENSE_URL } from "./item-icon.js";
import { everyDensity } from "./ui.js";
import { animateBetween } from "./animate.js";

/** Rarely needed things: refresh, the player's ID, logout. */
export const GameMenu = (user: GameUser) => html`
    <div
      id="game-menu"
      class="relative"
      data-signals__ifmissing="${JSON.stringify({ _menuOpen: false })}"
    >
      <!-- Menu Toggle Button -->
      <button
        class="flex items-center justify-center gap-2 min-h-11 min-w-11 sm:min-h-0 px-3 py-2 rounded-lg bg-white/10 border border-white/20 hover:bg-white/20 hover:border-white/30 transition-all duration-200"
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

          <div class="flex items-center justify-between gap-2 px-3 py-2">
            <span class="text-sm font-medium">Panel detail</span>
            <div class="flex rounded border border-white/10 overflow-hidden text-xs">
              ${(["compact", "full"] as const).map(
                (density) => html`<button
                  class="px-2.5 py-1 capitalize text-gray-400 hover:bg-white/10"
                  data-class="{'bg-white/15 text-white': ${everyDensity.is(density)}}"
                  data-on:click="${everyDensity.set(density)}"
                >
                  ${density}
                </button>`
              )}
            </div>
          </div>

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

          <p class="px-3 pt-1 pb-0.5 text-[0.65rem] leading-snug text-gray-500">
            ${ICON_CREDIT}.
            <a
              class="underline hover:text-gray-300"
              href="${ICON_LICENSE_URL}"
              target="_blank"
              rel="noopener noreferrer"
              >Licence</a
            >
          </p>
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

/** The unit frame along the top: health, effects, gold, who's online, menu. */
export const UserInfo = (
  user: GameUser,
  totalPlayersOnline?: number,
  effects: ResolvedEffect[] = [],
  hit?: { damage: number; at: number }
) => {
  const health = Math.max(0, Math.min(100, (user.h / BASE_USER.h) * 100));
  const beforeHit = Math.max(
    health,
    Math.min(100, ((user.h + (hit?.damage ?? 0)) / BASE_USER.h) * 100)
  );
  const full = user.i.length >= MAX_INVENTORY_SIZE;
  return html`<div
  id="hud"
  class="hud-bar flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 border-b border-white/10 bg-black/40"
>
  <div
    class="flex min-w-32 max-w-56 flex-1 items-center gap-2 text-xs text-red-200"
    aria-label="Health: ${user.h} of ${BASE_USER.h}"
  >
    <span aria-hidden="true">♥</span>
    <div
      class="relative h-2 flex-1 rounded-full bg-red-950/70 overflow-hidden"
      role="progressbar"
      aria-label="Health"
      aria-valuemin="0"
      aria-valuemax="${BASE_USER.h}"
      aria-valuenow="${user.h}"
    >
      <div
        id="hud-health-ghost"
        class="hud-health-ghost"
        style="width: ${health}%"
        ${hit
          ? html`data-init="${animateBetween(
              { startedAt: hit.at, endsAt: hit.at + 1000 },
              [
                { width: `${beforeHit}%` },
                { width: `${beforeHit}%`, offset: 0.4 },
                { width: `${health}%` },
              ]
            )}"`
          : ""}
      ></div>
      <div
        id="hud-health"
        class="relative h-full bg-red-500 transition-[width] duration-200"
        style="width: ${health}%"
      ></div>
    </div>
    <span class="font-mono whitespace-nowrap">${user.h}/${BASE_USER.h}</span>
  </div>
  <div class="order-last basis-full sm:order-none sm:basis-auto min-w-0 sm:flex-1">
    ${PlayerEffects(effects)}
  </div>
  <div class="ml-auto flex items-center gap-2">
    <span
      class="flex items-center gap-1 text-xs font-mono text-yellow-400"
      title="Gold"
      >${GoldIcon}${user.$}</span
    >
    <button
      class="flex items-center min-h-11 sm:min-h-0 px-1 rounded text-xs font-mono tabular-nums hover:bg-white/10 ${full
        ? "text-amber-300"
        : "text-gray-300"}"
      title="Bag: ${user.i.length} of ${MAX_INVENTORY_SIZE} slots used"
      data-on:click="$_tab = 'bag'; $_sheet = 'side'"
    >
      ${user.i.length}/${MAX_INVENTORY_SIZE}
    </button>
    ${totalPlayersOnline !== undefined
      ? html`<span
          class="flex items-center gap-1 text-xs text-purple-300"
          title="${totalPlayersOnline} online"
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
              d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z"
            />
          </svg>
          <span class="font-mono">${totalPlayersOnline}</span>
        </span>`
      : null}
    ${GameMenu(user)}
  </div>
</div>`;
};

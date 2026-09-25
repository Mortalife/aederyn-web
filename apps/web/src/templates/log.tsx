import { html } from "hono/html";
import { restrictUserId, type ChatMessage } from "../social/chat.js";
import type { SystemMessage } from "../user/system.js";
import type { CombatHit } from "../world/monsters.js";
import { animateBetween } from "./animate.js";
import { combatLine } from "./combat.js";

export const LOG_FILTERS = [
  { id: "all", label: "All" },
  { id: "game", label: "Game" },
  { id: "chat", label: "Chat" },
  { id: "combat", label: "Combat" },
] as const;

/**
 * The log's lines come from separate fragments, each patched on its own,
 * and are interleaved by time with CSS `order` (the fragments are
 * `display: contents`). `order` is a 32-bit integer, so times are quarter
 * seconds either side of a fixed epoch, which lasts from 2009 to 2043.
 */
const ORDER_EPOCH = Date.UTC(2026, 0, 1);
export const logOrder = (at: number) => Math.round((at - ORDER_EPOCH) / 250);

const line = (props: {
  id: string;
  kinds: string;
  at: number;
  colour: string;
  by?: string;
  enter?: boolean;
  body: unknown;
}) => html`<div
  id="${props.id}"
  class="log-line ${props.kinds} ${props.colour}"
  style="order: ${logOrder(props.at)}"
  data-at="${props.at}"
  data-attr:title="new Date(${props.at}).toLocaleTimeString()"
  ${props.by ? html`data-by="${props.by}"` : ""}
  ${props.enter
    ? html`data-init="${animateBetween(
        { startedAt: props.at, endsAt: props.at + 300 },
        [
          { opacity: 0, transform: "translateY(0.25rem)" },
          { opacity: 1, transform: "none" },
        ]
      )}"`
    : ""}
>
  ${props.body}
</div>`;

const messageColour = (message: SystemMessage) =>
  message.action_type === "discovery"
    ? "text-purple-300"
    : message.type === "error"
    ? "text-red-300"
    : message.type === "warning"
    ? "text-amber-300"
    : message.type === "success"
    ? "text-emerald-300"
    : "text-gray-300";

export const LogGame = (messages: SystemMessage[]) => html`<div
  id="log-game"
  class="contents"
>
  ${[...messages].reverse().map((message) =>
    line({
      id: `log-m${message.id}`,
      kinds: `log-game ${message.action_type === "combat" ? "log-combat" : ""}`,
      at: message.sent_at,
      colour: messageColour(message),
      body:
        message.action_type === "discovery"
          ? html`<span aria-hidden="true">✦</span> ${message.message}`
          : message.message,
    })
  )}
</div>`;

/**
 * Chat since the player came online. It holds no viewer, so everyone whose
 * history starts at the same message shares a render; `Game` styles the
 * viewer's own name.
 */
export const LogChat = (messages: ChatMessage[]) => html`<div
  id="log-chat"
  class="contents"
>
  ${[...messages].reverse().map((message) =>
    line({
      id: `log-c${message.id}`,
      kinds: "log-chat",
      at: message.sent_at,
      colour: "text-gray-200",
      by: restrictUserId(message.user_id),
      body: html`<span class="log-name font-semibold text-sky-300"
          >${restrictUserId(message.user_id)}:</span
        >
        ${message.message}`,
    })
  )}
</div>`;

const LINE_PX = 22;
export const LOG_LINES = { short: 3, tall: 12, max: 30 };

/**
 * The log panel: filter tabs, the lines of every kind in one list, and the
 * chat input. The filter is only a signal: CSS hides the other kinds, so no
 * render depends on it. `client.ts` keeps the unread counts on the tabs.
 * Its height in lines is the `_layout.logLines` signal, toggled or dragged.
 */
export const LogPanel = (
  userId: string,
  lines: Record<"game" | "chat" | "combat", unknown>
) => html`<section
  id="log"
  class="hud-log"
>
  <div
    class="log-grip"
    title="Drag to resize the log"
    data-on:pointerdown="evt.preventDefault(); $_logDrag = evt.clientY + $_layout.logLines * ${LINE_PX}"
    data-on:pointermove__window="$_logDrag && ($_layout.logLines = Math.max(${LOG_LINES.short}, Math.min(${LOG_LINES.max}, Math.round(($_logDrag - evt.clientY) / ${LINE_PX}))))"
    data-on:pointerup__window="$_logDrag = 0"
  ></div>
  <style>
    .log-chat[data-by="${restrictUserId(userId).replace(/[^\w-]/g, "")}"]
      .log-name {
      color: rgb(253 224 71);
    }
  </style>
  <div role="tablist" class="flex shrink-0 items-center gap-1">
    ${LOG_FILTERS.map(
      ({ id, label }) => html`<button
        role="tab"
        class="relative flex items-center gap-1 min-h-11 sm:min-h-7 px-2 rounded text-xs text-gray-400 hover:text-white transition-colors"
        data-class="{'text-white bg-white/10': $_logFilter === '${id}'}"
        data-attr:aria-selected="$_logFilter === '${id}' ? 'true' : 'false'"
        data-on:click="$_logFilter = '${id}'"
      >
        ${label}<span class="log-unread" data-unread="${id}"></span>
      </button>`
    )}
    <button
      class="ml-auto min-h-11 sm:min-h-7 px-2 rounded text-xs text-gray-500 hover:text-red-300 transition-colors"
      title="Clear game messages"
      data-show="$_logFilter === 'all' || $_logFilter === 'game'"
      data-on:click="@delete('/game/system-messages')"
    >
      Clear
    </button>
    <button
      class="hidden sm:block min-h-7 px-2 rounded text-xs text-gray-400 hover:text-white transition-colors"
      title="Make the log taller or shorter"
      data-attr:aria-expanded="$_layout.logLines > ${LOG_LINES.short} ? 'true' : 'false'"
      data-on:click="$_layout.logLines = $_layout.logLines > ${LOG_LINES.short} ? ${LOG_LINES.short} : ${LOG_LINES.tall}"
    >
      <span aria-hidden="true" data-text="$_layout.logLines > ${LOG_LINES.short} ? '▾' : '▴'">▴</span
      ><span class="sr-only">Resize the log</span>
    </button>
    <button class="sm:hidden min-h-11 min-w-11" data-on:click="$_sheet = ''">
      ✕<span class="sr-only">Close</span>
    </button>
  </div>
  <div class="log-scroll">
    <div class="log-list" data-attr:data-filter="$_logFilter">
      ${lines.game}${lines.chat}${lines.combat}
    </div>
  </div>
  <form
    class="flex flex-row gap-2 shrink-0"
    data-on:submit="@post('/game/chat'); $message = ''"
  >
    <input
      type="text"
      class="flex-grow min-w-0 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 focus:border-white/30 focus:outline-none transition-colors"
      autocomplete="off"
      aria-label="Chat message"
      data-bind="message"
      maxlength="100"
      data-on:keydown="evt.stopPropagation(); evt.key === 'Escape' && el.blur()"
      placeholder="Say something..."
    />
    <button class="btn btn-primary btn-sm">Send</button>
  </form>
</section>`;

export const LogCombat = (
  hits: { hit: CombatHit; monsterName: string }[],
  viewerId: string
) => html`<div id="log-combat" class="contents">
  ${[...hits].reverse().map(({ hit, monsterName }) =>
    line({
      id: `log-h${hit.id}`,
      kinds: "log-combat",
      at: hit.at,
      colour: `${hit.fatal ? "font-semibold " : ""}text-gray-300`,
      enter: true,
      body: html`<span class="${hit.by_monster ? "text-red-400" : "text-amber-300"}"
          >${hit.by_monster ? "▼" : "▲"}</span
        >
        ${combatLine(hit, monsterName, viewerId)}`,
    })
  )}
</div>`;

import { html } from "hono/html";
import type { OtherUser } from "../config.js";
import { restrictUserId } from "../social/chat.js";
import { SidePanel } from "./ui.js";

/**
 * Who's in the zone. Rendered once per zone version and shared by everyone
 * there, so it lists every player, the viewer included, and the client
 * hides the viewer's own entry using the `user_id` signal.
 */
export const ZonePlayers = (players: OtherUser[] | null) => {
  if (!players) {
    return SidePanel({
      id: "zone-players",
      panel: "social",
      title: "Social",
      meta: "On the world map",
      body: html`<p class="text-xs text-gray-400">Enter a zone to see who's there.</p>`,
    });
  }

  const others = Math.max(players.length - 1, 0);

  return SidePanel({
    id: "zone-players",
    panel: "social",
    title: "Social",
    meta: others > 0 ? `${others} nearby` : "You're alone here",
    body:
      others === 0
        ? html`<p class="text-xs text-gray-400">No other players in this zone.</p>`
        : html`<div class="flex flex-col">
            ${players.map((player) => OtherPlayerInfo(player))}
          </div>`,
  });
};

export const OtherPlayerInfo = (otherUser: OtherUser) => html` <div
  id="other-user-${otherUser.id}"
  data-show="$user_id !== '${otherUser.id}'"
  class="flex min-h-7 items-center justify-between gap-2"
>
  <span class="flex min-w-0 items-center gap-2 truncate"
    ><span class="size-1.5 shrink-0 rounded-full bg-green-500"></span
    >${restrictUserId(otherUser.id)}</span
  >
  <span class="shrink-0 font-mono text-xs text-gray-500"
    >${otherUser.p.x}, ${otherUser.p.y}</span
  >
</div>`;

import { html } from "hono/html";
import { BASE_USER } from "../config.js";
import type { Activity as ActivityView } from "../game/view/select.js";
import { animateBetween } from "./animate.js";
import { CombatantBar } from "./combat.js";
import { MonstersIcon } from "./icons.js";
import { ProgressBar } from "./ui.js";
import { pairKey } from "../user/discoveries.js";
import { getResourceTypeIcon } from "./zone.js";

const frame =
  "hud-activity relative flex items-center gap-3 px-3 py-2 border-t border-white/10 bg-black/60";

const button =
  "shrink-0 min-h-11 sm:min-h-0 px-3 py-1.5 rounded-lg text-sm transition-colors";

/**
 * What a gather or craft will give and use up, for its tooltip. A gathering
 * node's outputs the player hasn't had from it yet are "?".
 */
const outcome = (
  resource: NonNullable<Extract<ActivityView, { kind: "gather" }>["resource"]>,
  knownOutputs?: Set<string>
) => {
  const gives = resource.reward_items.map((r) =>
    resource.type === "resource" &&
    knownOutputs &&
    !knownOutputs.has(pairKey(resource.id, r.item.id))
      ? "?"
      : `${r.qty} x ${r.item.name}`
  );
  const uses = resource.required_items.flatMap((r) =>
    r.consumed
      ? [`${r.qty} x ${r.item.name}`]
      : r.itemDurabilityReduction
      ? [`${r.itemDurabilityReduction} durability from ${r.item.name}`]
      : []
  );
  return [
    gives.length ? `Gives ${gives.join(", ")}` : null,
    uses.length ? `Uses ${uses.join(", ")}` : null,
  ]
    .filter(Boolean)
    .join(". ");
};

/**
 * The one thing the player is doing, above the log: a gather or craft with
 * its progress, or a fight with both sides' health and swing timers. Idle,
 * it's a quiet hint on larger screens and nothing on a phone.
 */
export const Activity = (
  activity: ActivityView | null,
  viewer: {
    userId: string;
    health: number;
    weaponSpeed: number;
    knownOutputs?: Set<string>;
  }
) => {
  if (!activity) {
    return html`<div
      id="activity"
      class="hud-activity hidden sm:flex items-center px-3 py-1.5 border-t border-white/10 text-xs text-gray-500"
    >
      Nothing in progress.
    </div>`;
  }

  if (activity.kind === "gather") {
    return html`<div
      id="activity"
      class="${frame}"
      title="${activity.resource ? outcome(activity.resource, viewer.knownOutputs) : ""}"
    >
      <span class="shrink-0 text-blue-300"
        >${getResourceTypeIcon(activity.resource?.type ?? "resource")}</span
      >
      <div class="flex-1 min-w-0">
        ${ProgressBar({
          id: `activity-progress-${activity.startedAt}`,
          label: activity.name,
          startedAt: activity.startedAt,
          endsAt: activity.endsAt,
        })}
      </div>
      <button
        class="${button} border border-amber-400/50 text-amber-200 hover:bg-amber-400/10"
        data-on:click="@delete('/game/resources/${activity.resourceId}')"
      >
        Cancel
      </button>
    </div>`;
  }

  const { fight, active } = activity;
  const hitOnMonster = fight.hits.find((hit) => !hit.by_monster);
  const hitOnViewer = fight.hits.find(
    (hit) => hit.by_monster && hit.user_id === viewer.userId
  );

  return html`<div id="activity" class="${frame}">
    <span class="shrink-0 text-red-300" title="Fighting">${MonstersIcon}</span>
    <div class="grid flex-1 min-w-0 grid-cols-2 gap-3">
      ${CombatantBar({
        id: "activity-monster",
        label: fight.monster.name,
        hp: fight.hp,
        max: fight.monster.health,
        colour: "bg-red-500",
        hit: hitOnMonster ?? null,
        nextSwing:
          active && fight.combat
            ? {
                endsAt: fight.combat.next_monster_at,
                duration: fight.monster.attack.speed,
              }
            : null,
      })}
      ${CombatantBar({
        id: "activity-player",
        label: "You",
        hp: viewer.health,
        max: BASE_USER.h,
        colour: "bg-green-500",
        hit: hitOnViewer ?? null,
        nextSwing:
          active && fight.combat
            ? {
                endsAt: fight.combat.next_player_at,
                duration: viewer.weaponSpeed,
              }
            : null,
      })}
    </div>
    ${active
      ? html`<button
          class="${button} bg-red-700 hover:bg-red-600 text-white"
          data-on:click="@post('/game/combat/flee')"
        >
          Flee
        </button>`
      : html`<span class="shrink-0 text-sm font-semibold text-emerald-300"
          >Victory</span
        >`}
    ${hitOnViewer
      ? html`<div
          id="hurt-${hitOnViewer.id}"
          class="hurt-vignette"
          style="opacity: 0"
          data-init="${animateBetween(
            { startedAt: hitOnViewer.at, endsAt: hitOnViewer.at + 500 },
            [{ opacity: 1 }, { opacity: 0 }]
          )}"
        ></div>`
      : null}
  </div>`;
};

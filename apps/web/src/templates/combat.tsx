import { html } from "hono/html";
import { UNARMED } from "../config.js";
import { itemsById } from "../config/items.js";
import { restrictUserId } from "../social/chat.js";
import type { Discoveries } from "../user/discoveries.js";
import type { SystemMessage } from "../user/system.js";
import type { ZoneMonster } from "../game/view/select.js";
import type { CombatHit } from "../world/monsters.js";
import { animateBetween, type ProgressTimes } from "./animate.js";
import { ItemIcon } from "./item-icon.js";
import { ItemAttrs, ItemTip } from "./bag.js";
import { DiscoveryGlow, FloatingResult, ScenePanel, rowToggle } from "./ui.js";

/**
 * The zone's monsters, with the viewer's attack and flee controls. Empty,
 * but still present for patching, when the zone has none.
 */
type MonsterViewer = {
  userId: string;
  gathering: boolean;
  /** The working weapon in the main hand, or null when fighting barehanded. */
  weapon: { name: string; speed: number; durability: number; maxDurability: number } | null;
  contextFlashes: Map<string, SystemMessage>;
  /** What the player has learned by fighting; nothing is known without it. */
  discoveries?: Pick<Discoveries, "monsters" | "monsterDrops">;
};

export const ZoneMonsters = (monsters: ZoneMonster[], viewer?: MonsterViewer) => {
  if (monsters.length === 0) {
    return html`<div id="monsters"></div>`;
  }

  const alive = monsters.filter((m) => m.respawnAt === null).length;

  return ScenePanel({
    id: "monsters",
    panel: "monsters",
    sections: ["monsters"],
    title: "Monsters",
    meta: alive > 0 ? `${alive} nearby` : "Nothing to fight right now",
    body: monsters.map((monster) => MonsterItem(monster, viewer)),
  });
};

const unknown = html`<span class="text-gray-500" title="Fight it to find out">?</span>`;

/**
 * A monster's row. The fight itself is in the activity bar and the log, so
 * the row stays the same size while it goes on.
 */
const MonsterItem = (
  { spawn, monster, hp, respawnAt, engaged, combat, hits, weakTo }: ZoneMonster,
  viewer?: MonsterViewer
) => {
  const dead = respawnAt !== null;
  const fighting = !!viewer && !dead && combat?.user_id === viewer.userId;
  const hitOnMonster = hits.find((hit) => !hit.by_monster);
  const known = viewer?.discoveries?.monsters.has(monster.id) ?? false;
  const canAct = viewer && !dead && (fighting || (!engaged && !viewer.gathering));
  const weaponWarning = viewer ? weaponProblem(viewer.weapon) : null;

  return html`<div
    id="monsters-${spawn}"
    class="relative cursor-pointer rounded px-1 py-0.5 hover:bg-white/5 data-[open]:bg-white/5 transition-opacity duration-700 ${dead
      ? "opacity-60"
      : ""}"
    data-row
    data-preserve-attr="data-open"
    data-on:click="${rowToggle}"
  >
    <div class="flex min-h-11 items-center gap-2 sm:min-h-8">
      <span class="w-3 shrink-0 text-center text-red-400"
        >${engaged && !dead ? html`<span title="In combat">⚔</span>` : ""}</span
      >
      <span class="min-w-0 flex-1 truncate font-semibold text-white"
        >${monster.name}</span
      >
      ${MiniHpBar({
        id: `monster-${spawn}`,
        hp,
        max: monster.health,
        hit: hitOnMonster ?? null,
      })}
      <span class="hidden w-28 shrink-0 gap-2 text-xs capitalize text-gray-400 sm:flex">
        <span title="Attack style">${known ? monster.attack.style : html`style ${unknown}`}</span>
        <span
          >weak
          ${known
            ? weakTo.length > 0
              ? html`<span class="text-emerald-300">${weakTo.join(", ")}</span>`
              : "none"
            : unknown}</span
        >
      </span>
      ${dead
        ? RespawnCountdown({
            id: `respawn-${spawn}`,
            startedAt: respawnAt - monster.respawnTime * 1000,
            endsAt: respawnAt,
          })
        : engaged && !canAct
        ? html`<span class="shrink-0 text-xs text-red-300"
            >In combat${combat
              ? ` with ${combat.user_id === viewer?.userId ? "you" : restrictUserId(combat.user_id)}`
              : ""}</span
          >`
        : null}
      ${weaponWarning && canAct
        ? html`<span class="shrink-0 text-xs text-amber-300" title="${weaponWarning}"
            >⚠&#xFE0E;</span
          >`
        : null}
      ${canAct
        ? fighting
          ? html`<button
              class="h-11 shrink-0 rounded bg-red-700 px-2.5 text-xs font-medium text-white hover:bg-red-600 sm:h-7"
              title="In combat with you"
              data-on:click="@post('/game/combat/flee')"
            >
              Flee
            </button>`
          : html`<button
              class="h-11 min-w-14 shrink-0 rounded bg-red-700/80 px-2.5 text-xs font-medium text-white hover:bg-red-600 sm:h-7"
              data-on:click="@post('/game/monsters/${spawn}/attack')"
            >
              Attack
            </button>`
        : null}
    </div>
    ${FloatingResult(viewer?.contextFlashes.get(`combat:${spawn}`))}
    <div class="d-full flex flex-col gap-1 pb-1 pl-5 text-xs text-gray-400">
      <p>${monster.description}</p>
      <div class="flex flex-wrap items-center gap-x-3 gap-y-1">
        ${fighting ? html`<span class="text-red-300">In combat with you</span>` : null}
        <span class="sm:hidden capitalize"
          >${known ? monster.attack.style : html`style ${unknown}`} · weak
          ${known ? (weakTo.length ? weakTo.join(", ") : "none") : unknown}</span
        >
        <span class="flex flex-wrap items-center gap-1"
          >Drops ${MonsterDrops(monster.id, monster.drops, viewer?.discoveries)}</span
        >
        ${viewer && !dead ? FightingWith(viewer.weapon) : null}
      </div>
    </div>
    ${DiscoveryGlow(viewer?.contextFlashes.get(`discovery:monster:${monster.id}`))}
  </div>`;
};

const MonsterDrops = (
  monsterId: string,
  drops: ZoneMonster["monster"]["drops"],
  discoveries?: Pick<Discoveries, "monsterDrops">
) => {
  const seen = drops.flatMap(({ item_id }) => {
    const item = itemsById.get(item_id);
    return item && discoveries?.monsterDrops.has(`${monsterId}:${item_id}`)
      ? [item]
      : [];
  });
  return html`${seen.map(
    (item) => html`<span
      tabindex="0"
      ${ItemAttrs(item)}
      class="inline-flex items-center gap-1 rounded border border-white/10 bg-white/5 px-1.5 py-0.5 text-gray-200"
      >${ItemIcon(item, { class: "size-4 rounded-sm text-[0.5rem]" })}${item.name}${ItemTip(item)}</span
    >`
  )}${seen.length < drops.length ? unknown : ""}`;
};

const MiniHpBar = (props: {
  id: string;
  hp: number;
  max: number;
  hit: { id: number; damage: number; at: number } | null;
}) => {
  const percent = Math.max(0, Math.min(100, (props.hp / props.max) * 100));
  return html`<div class="relative flex w-20 shrink-0 flex-col gap-0.5 sm:w-28">
    <div class="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
      <div
        class="h-full bg-red-500 transition-[width] duration-300"
        style="width: ${percent}%"
      ></div>
    </div>
    <span class="text-right font-mono text-[0.65rem] leading-none tabular-nums text-gray-400"
      >${props.hp}/${props.max}</span
    >
    ${props.hit ? HitSplat(props.id, props.hit, "right-0 -top-3") : null}
  </div>`;
};

const HitSplat = (
  id: string,
  hit: { id: number; damage: number; at: number },
  position: string
) => html`<span
  id="hit-${id}-${hit.id}"
  class="pointer-events-none absolute ${position} text-lg font-bold text-red-300 drop-shadow"
  style="opacity: 0"
  data-init="${animateBetween({ startedAt: hit.at, endsAt: hit.at + 1000 }, [
    { opacity: 1, transform: "translateY(0) scale(1.3)" },
    { opacity: 1, transform: "translateY(-0.5rem) scale(1)", offset: 0.3 },
    { opacity: 0, transform: "translateY(-1.5rem) scale(1)" },
  ])}"
  >-${hit.damage}</span
>`;

const weaponProblem = (weapon: MonsterViewer["weapon"]) =>
  !weapon
    ? `Barehanded, ${UNARMED.damage} damage a hit`
    : weapon.durability <= Math.max(3, weapon.maxDurability * 0.1)
    ? `${weapon.name}, ${weapon.durability}/${weapon.maxDurability} durability`
    : null;

const FightingWith = (weapon: MonsterViewer["weapon"]) => {
  if (!weapon) {
    return html`<span class="text-xs text-amber-300"
      >Barehanded, ${UNARMED.damage} damage a hit</span
    >`;
  }
  const worn = weapon.durability <= Math.max(3, weapon.maxDurability * 0.1);
  return html`<span class="text-xs ${worn ? "text-amber-300" : "text-gray-400"}"
    >${weapon.name}, ${weapon.durability}/${weapon.maxDurability} durability</span
  >`;
};

export const combatLine = (hit: CombatHit, monsterName: string, viewerId?: string) => {
  const player = hit.user_id === viewerId ? "you" : restrictUserId(hit.user_id);
  const Player = hit.user_id === viewerId ? "You" : player;
  if (hit.by_monster) {
    return hit.fatal
      ? `${monsterName} knocked ${player} out with ${hit.damage}`
      : `${monsterName} hit ${player} for ${hit.damage}`;
  }
  return hit.fatal
    ? `${Player} finished ${monsterName} off with ${hit.damage}`
    : `${Player} hit ${monsterName} for ${hit.damage}`;
};

/**
 * A fighter's health, with the damage of the last hit on it floating up and
 * a thin bar filling towards their next swing. Both are keyed by time, so
 * each hit or swing is a new element and its animation starts afresh.
 */
export const CombatantBar = (props: {
  id: string;
  label: string;
  hp: number;
  max: number;
  colour: string;
  hit: { id: number; damage: number; at: number } | null;
  nextSwing: { endsAt: number; duration: number } | null;
}) => {
  const percent = Math.max(0, Math.min(100, (props.hp / props.max) * 100));

  return html`<div class="relative flex flex-col gap-1 min-w-0">
    <div class="flex items-center justify-between gap-2 text-xs text-gray-400">
      <span class="truncate">${props.label}</span>
      <span class="font-mono">${props.hp}/${props.max}</span>
    </div>
    <div class="w-full h-2 rounded-full bg-white/10 overflow-hidden">
      <div
        class="h-full ${props.colour} transition-[width] duration-300"
        style="width: ${percent}%"
      ></div>
    </div>
    ${props.nextSwing
      ? html`<div
          class="w-full h-1 rounded-full bg-white/5 overflow-hidden"
          title="Next attack"
        >
          <div
            id="swing-${props.id}-${props.nextSwing.endsAt}"
            class="h-full w-0 bg-amber-400/70"
            data-init="${animateBetween(
              {
                startedAt: props.nextSwing.endsAt - props.nextSwing.duration,
                endsAt: props.nextSwing.endsAt,
              },
              [{ width: "0%" }, { width: "100%" }]
            )}"
          ></div>
        </div>`
      : null}
    ${props.hit ? HitSplat(props.id, props.hit, "right-2 top-3") : null}
  </div>`;
};

const RespawnCountdown = (props: ProgressTimes & { id: string }) => {
  const seconds = Math.round((props.endsAt - props.startedAt) / 1000);

  return html`<div class="shrink-0 text-xs tabular-nums text-gray-400">
    Respawns in
    <span
      id="${props.id}"
      class="progress-seconds font-mono"
      data-init="${animateBetween(props, [
        { "--progress-seconds": seconds },
        { "--progress-seconds": 0 },
      ])}"
    ></span
    >s
  </div>`;
};

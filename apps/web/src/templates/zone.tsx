import { html } from "hono/html";
import type { HtmlEscapedString } from "hono/utils/html";
import type { WorldTile } from "../world/index.js";
import type { PlacedQuest } from "../world/quests.js";
import type {
  GameUser,
  InventoryItem,
  NPC,
  RequiredItem,
  Resource,
  RewardItem,
} from "../config.js";
import type { UserAction } from "../user/action.js";
import type { SystemMessage } from "../user/system.js";
import type { Discoveries } from "../user/discoveries.js";
import type {
  BoardContract,
  ZoneInteraction,
} from "../user/quest-progress-manager.js";
import type { Resident, ZoneMonster } from "../game/view/select.js";
import { effectsById } from "../config/effects.js";
import { animateBetween, type ProgressTimes } from "./animate.js";
import { describeEffect } from "./effects.js";
import {
  DiscoveryGlow,
  FloatingResult,
  KeyboardShortcut,
  ScenePanel,
  isolateShows,
  rowToggle,
} from "./ui.js";
import { DurabilityIcon, ItemAttrs, ItemTip } from "./bag.js";
import { ItemIcon } from "./item-icon.js";
import { Glyph } from "./icons.js";

export const getResourceTypeIcon = (type: string) => {
  switch (type) {
    case "resource":
      return Glyph("gather");
    case "workbench":
    case "campfire":
    case "forge":
    case "kiln":
    case "tanning_rack":
    case "apothecary":
    case "loom":
    case "warding_table":
    case "growing_pit":
    case "keystone":
      return Glyph("station");
    default:
      return Glyph("sparkles");
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


const outputKey = (resourceId: string, itemId: string) => `${resourceId}:${itemId}`;

export const RESOURCE_TYPE_LABELS: Record<Resource["type"], string> = {
  resource: "Gather",
  workbench: "Workbench",
  campfire: "Campfire",
  forge: "Forge",
  kiln: "Kiln",
  tanning_rack: "Tanning Rack",
  apothecary: "Apothecary",
  loom: "Loom",
  warding_table: "Warding Table",
  growing_pit: "Growing Pit",
  keystone: "Keystone",
};

/**
 * The zone scene. Each part is a fragment with a stable id, rendered
 * separately so it can be patched on its own.
 */
export const Zone = (parts: {
  header: HtmlEscapedString;
  nav: HtmlEscapedString;
  npcs: HtmlEscapedString;
  board: HtmlEscapedString;
  resources: HtmlEscapedString;
  monsters: HtmlEscapedString;
}) => html`<div id="zone" class="flex flex-col gap-2 [&>:empty]:hidden">
  ${parts.header} ${parts.nav} ${parts.resources} ${parts.monsters}
  ${parts.npcs} ${parts.board}
</div>`;

const tileEffects = (worldTile: WorldTile) =>
  [
    ...(worldTile.tile?.effects ?? []),
    ...(worldTile.tile?.region?.effects ?? []),
  ].flatMap(({ id, strength }) => {
    const effect = effectsById.get(id);
    return effect ? [`${effect.name}: ${describeEffect(effect, strength)}`] : [];
  });

export const ZoneHeader = (worldTile: WorldTile) => {
  const theme = getThemeColors(worldTile.tile?.theme);
  const effects = tileEffects(worldTile);
  const title = [`(${worldTile.x}, ${worldTile.y})`, ...effects].join("\n");

  return html`<div
    id="zone-header"
    class="flex flex-col gap-0.5 rounded-md border border-white/10 border-l-4 ${theme.border} ${theme.bg} px-3 py-2"
  >
    <div class="flex items-center gap-2">
      <h1
        class="min-w-0 truncate text-lg font-bold ${theme.text}"
        title="${title}"
      >
        ${worldTile.tile?.name}
      </h1>
      ${effects.length
        ? html`<span
            class="shrink-0 rounded-full border border-white/15 px-1.5 text-[0.7rem] ${theme.accent}"
            title="${effects.join("\n")}"
            >✦ ${effects.length}</span
          >`
        : null}
      <button
        class="ml-auto flex shrink-0 items-center gap-1.5 rounded border border-white/20 bg-white/10 px-2 h-11 sm:h-7 text-xs font-medium hover:bg-white/20"
        data-on:click="@post('/game/move/exit')"
        data-on-keys:escape="el.click()"
      >
        Exit ${KeyboardShortcut("esc")}
      </button>
    </div>
    ${worldTile.tile?.description
      ? html`<p class="text-xs ${theme.accent} opacity-80 line-clamp-2">
          ${worldTile.tile.description}
        </p>`
      : null}
  </div>`;
};

type FilterChip = {
  key: string;
  label: string;
  target: string;
  count: number;
  attention: boolean;
  shortcut?: string;
};

const FilterChipButton = (chip: FilterChip) => html`<button
  class="flex shrink-0 items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 h-11 sm:h-7 text-xs font-medium text-gray-300 hover:bg-white/10"
  title="Shift-click or long-press to show only this"
  data-class="{'bg-white/20 border-white/40 text-white': $_isolate === '${chip.key}'}"
  data-on:pointerdown="if (evt.pointerType !== 'mouse') { el.setPointerCapture(evt.pointerId); el._longPress = setTimeout(() => { el._longPress = 0; el._didLongPress = true; $_isolate = $_isolate === '${chip.key}' ? '' : '${chip.key}' }, 500) }"
  data-on:pointerup="if (el._longPress) { clearTimeout(el._longPress); el._longPress = 0 }"
  data-on:pointercancel="if (el._longPress) { clearTimeout(el._longPress); el._longPress = 0 }"
  data-on:pointermove="if (el._longPress && (Math.abs(evt.movementX) > 4 || Math.abs(evt.movementY) > 4)) { clearTimeout(el._longPress); el._longPress = 0 }"
  data-on:click="evt.shiftKey ? ($_isolate = $_isolate === '${chip.key}' ? '' : '${chip.key}') : ($_isolate = $_isolate && $_isolate !== '${chip.key}' ? '' : $_isolate, document.getElementById('${chip.target}')?.scrollIntoView({ behavior: 'smooth', block: 'start' }))"
  data-on:click__capture="if (el._didLongPress) { evt.preventDefault(); evt.stopImmediatePropagation(); el._didLongPress = false }"
  ${chip.shortcut
    ? html`data-on-keys:${chip.shortcut.toLowerCase()}="el.click()"`
    : ""}
>
  ${chip.label}
  <span class="tabular-nums text-gray-500">${chip.count}</span>
  ${chip.attention
    ? html`<span class="size-1.5 rounded-full bg-yellow-400" title="Something for you here"></span>`
    : null}
</button>`;

/**
 * One chip per kind of thing here, with a count and a dot when a quest
 * wants something from it. A click scrolls to it; shift-click or a long
 * press shows only it.
 */
export const ZoneNav = (props: {
  worldTile: WorldTile;
  monsters: ZoneMonster[];
  residents: Resident[];
  board: BoardContract[] | null;
  resourceObjectives: Set<string>;
  monsterObjectives: Set<string>;
  /** NPCs the player has something to say to or hand in to. */
  npcAttention: Set<string>;
}) => {
  const groups = Object.entries(
    Object.groupBy(props.worldTile.tile?.resources ?? [], (r) => r.type)
  ) as [Resource["type"], Resource[]][];

  const chips: FilterChip[] = [
    ...groups.map(([type, resources], index) => ({
      key: type,
      label: RESOURCE_TYPE_LABELS[type],
      target: `sec-${type}`,
      count: resources.length,
      attention: resources.some((r) => props.resourceObjectives.has(r.id)),
      shortcut: index === 0 ? "A" : undefined,
    })),
    ...(props.monsters.length
      ? [
          {
            key: "monsters",
            label: "Monsters",
            target: "monsters",
            count: props.monsters.filter((m) => m.respawnAt === null).length,
            attention: props.monsters.some((m) =>
              props.monsterObjectives.has(m.monster.id)
            ),
            shortcut: "M",
          },
        ]
      : []),
    ...(props.residents.length
      ? [
          {
            key: "people",
            label: "People",
            target: "npcs",
            count: props.residents.length,
            attention: props.residents.some(
              ({ npc, offers }) =>
                offers.length > 0 || props.npcAttention.has(npc.entity_id)
            ),
          },
        ]
      : []),
    ...(props.board
      ? [
          {
            key: "board",
            label: "Board",
            target: "board",
            count: props.board.filter((c) => c.status === "available").length,
            attention: props.board.some((c) => c.status === "available"),
          },
        ]
      : []),
  ];

  if (chips.length === 0) {
    return html`<div id="zone-nav"></div>`;
  }

  return html`<nav
    id="zone-nav"
    class="sticky -top-2 sm:-top-3 z-20 -mx-1 flex gap-1.5 overflow-x-auto bg-base-100/95 px-1 py-1 backdrop-blur"
  >
    ${chips.map(FilterChipButton)}
    <button
      class="shrink-0 rounded-full px-2.5 h-11 sm:h-7 text-xs text-gray-400 hover:text-white"
      data-show="$_isolate"
      data-on:click="$_isolate = ''"
    >
      Show all
    </button>
  </nav>`;
};

type Shortfall = { item: RequiredItem; reason: "missing" | "durability" };

/** What stops the player doing a resource right now. */
export const resourceReadiness = (resource: Resource, owned: InventoryItem[]) => {
  const shortfalls: Shortfall[] = resource.required_items.flatMap((item) => {
    const reason = requiredItemShortfall(item, owned);
    return reason ? [{ item, reason }] : [];
  });
  const depleted = !resource.limitless && resource.amount_remaining <= 0;
  return { shortfalls, depleted, doable: !depleted && shortfalls.length === 0 };
};

type Readiness = ReturnType<typeof resourceReadiness>;

/**
 * Doable first, then quest objectives, then the rest. A row stays out of
 * the fold while it's an objective, at most one item away, or a recipe the
 * player has done before.
 */
export const arrangeResources = (
  resources: Resource[],
  owned: InventoryItem[],
  objectives: Set<string>,
  knownRecipes: Set<string>
) => {
  const rows = resources.map((resource) => ({
    resource,
    readiness: resourceReadiness(resource, owned),
    objective: objectives.has(resource.id),
  }));
  type Row = (typeof rows)[number];
  const rank = (row: Row) =>
    row.readiness.doable ? (row.objective ? 0 : 1) : row.objective ? 2 : 3;
  const sorted = rows.toSorted((a, b) => rank(a) - rank(b));

  const shows = (row: Row) =>
    row.objective ||
    row.readiness.shortfalls.length <= 1 ||
    knownRecipes.has(row.resource.id);

  return {
    shown: sorted.filter(shows),
    folded: sorted.filter((row) => !shows(row)),
  };
};

export const ZoneResources = (props: {
  worldTile: WorldTile;
  user: GameUser;
  inprogress?: UserAction;
  resourceObjectives: Set<string>;
  contextFlashes: Map<string, SystemMessage>;
  discoveries: Pick<Discoveries, "items" | "recipes" | "resourceOutputs">;
}) => {
  const { worldTile, inprogress } = props;
  const resources = worldTile.tile?.resources ?? [];
  const groups = Object.entries(
    Object.groupBy(resources, (resource) => resource.type)
  ) as [Resource["type"], Resource[]][];
  const owned = [...props.user.i, ...Object.values(props.user.e)];

  if (groups.length === 0) {
    return html`<div id="resources"></div>`;
  }

  const row = (resource: Resource, readiness: Readiness, objective: boolean) =>
    ResourceItem({
      resource,
      inventory: owned,
      readiness,
      inprogress:
        inprogress?.resource_id === resource.id
          ? { startedAt: inprogress.inprogress_at, endsAt: inprogress.completed_at }
          : undefined,
      flashMessage: props.contextFlashes.get(`resource:${resource.id}`),
      discovered: props.contextFlashes.get(`discovery:recipe:${resource.id}`),
      isObjective: objective,
      knownOutputs:
        resource.type === "resource" ? props.discoveries.resourceOutputs : null,
      knownItems: props.discoveries.items,
    });

  return ScenePanel({
    id: "resources",
    panel: "actions",
    sections: groups.map(([type]) => type),
    title: "Actions",
    meta: `${resources.length} here`,
    body: groups.map(([type, list]) => {
      const { shown, folded } = arrangeResources(
        list,
        owned,
        props.resourceObjectives,
        props.discoveries.recipes
      );
      const noun =
        type === "resource"
          ? "more"
          : folded.length === 1
          ? "more recipe"
          : "more recipes";

      return html`<div
        id="sec-${type}"
        class="scroll-mt-12 flex flex-col"
        data-show="${isolateShows([type])}"
        data-fold
        data-preserve-attr="data-open"
      >
        <h3
          class="flex h-7 items-center gap-1.5 text-xs font-semibold text-gray-400 [&_svg]:size-4"
        >
          ${getResourceTypeIcon(type)} ${RESOURCE_TYPE_LABELS[type]}
          <span class="font-normal tabular-nums text-gray-500"
            >${list.length}</span
          >
        </h3>
        ${shown.map((r) => row(r.resource, r.readiness, r.objective))}
        ${folded.length
          ? html`<div class="fold-rest flex flex-col">
                ${folded.map((r) => row(r.resource, r.readiness, r.objective))}
              </div>
              <button
                class="self-start px-2 h-11 sm:h-6 text-xs text-gray-400 hover:text-white"
                data-on:click="el.closest('[data-fold]').toggleAttribute('data-open')"
              >
                <span class="fold-more">${folded.length} ${noun}</span
                ><span class="fold-less">Show fewer</span>
              </button>`
          : null}
      </div>`;
    }),
  });
};

const ReadinessIcon = (readiness: Readiness) => {
  const [first] = readiness.shortfalls;
  if (readiness.depleted) {
    return html`<span class="text-gray-500" title="Used up for now. Replenishing."
      >⟳</span
    >`;
  }
  if (!first) {
    return html`<span class="text-emerald-400" title="Ready">✓</span>`;
  }
  const names = readiness.shortfalls
    .map(({ item }) => item.item.name)
    .join(", ");
  if (readiness.shortfalls.every(({ reason }) => reason === "durability")) {
    return html`<span
      class="text-amber-400"
      title="Not enough durability: ${names}"
      >${DurabilityIcon}</span
    >`;
  }
  return html`<span
    class="inline-flex items-center gap-0.5 text-red-400"
    title="Needs ${names}"
    >${ItemIcon(first.item.item, {
      class: "size-4 rounded-sm text-[0.5rem] opacity-70",
    })}${readiness.shortfalls.length > 1
      ? html`<span class="text-[0.65rem] tabular-nums"
          >+${readiness.shortfalls.length - 1}</span
        >`
      : "✗"}</span
  >`;
};

const OutputIcons = (resource: Resource, known: Set<string> | null) =>
  resource.reward_items.map((reward) =>
    !known || known.has(outputKey(resource.id, reward.item.id))
      ? html`<span
          tabindex="0"
          aria-label="${reward.qty} ${reward.item.name}"
          ${ItemAttrs(reward.item)}
          >${ItemIcon(reward.item, {
            class: "size-4 rounded-sm text-[0.5rem] text-gray-200",
          })}${ItemTip(reward.item, { qty: reward.qty })}</span
        >`
      : html`<span
          class="grid size-4 place-items-center rounded-sm bg-white/10 text-[0.65rem] text-gray-400"
          title="Unknown until you get it"
          >?</span
        >`
  );

const amountText = (resource: Resource) =>
  resource.limitless
    ? html`<span title="Unlimited">∞</span>`
    : html`${resource.amount_remaining} left${resource.amount_remaining <
      resource.amount
        ? html` <span title="Replenishing">⟳</span>`
        : ""}`;

export const ResourceItem = (props: {
  resource: Resource;
  inventory: InventoryItem[];
  readiness?: Readiness;
  inprogress?: ProgressTimes;
  flashMessage?: SystemMessage;
  discovered?: SystemMessage;
  isObjective?: boolean;
  /** Outputs the player has seen, or null when they're all shown. */
  knownOutputs?: Set<string> | null;
  knownItems?: ReadonlySet<string> | null;
}) => {
  const { resource } = props;
  const readiness =
    props.readiness ?? resourceReadiness(resource, props.inventory);
  const known = props.knownOutputs ?? null;

  return html`<div
    id="resources-${resource.id}"
    class="relative cursor-pointer rounded px-1 py-0.5 hover:bg-white/5 data-[open]:bg-white/5"
    data-row
    data-preserve-attr="data-open"
    data-on:click="${rowToggle}"
  >
    <div class="flex min-h-11 items-center gap-2 sm:min-h-8">
      <span
        class="w-3 shrink-0 text-center text-objective"
        title="${props.isObjective ? "Quest objective" : ""}"
        >${props.isObjective ? "◆" : ""}</span
      >
      <span
        class="min-w-0 flex-1 truncate font-semibold ${readiness.doable
          ? "text-white"
          : "text-gray-400"}"
        >${resource.name}</span
      >
      <span
        class="shrink-0 font-mono text-xs tabular-nums ${readiness.depleted
          ? "text-red-400"
          : "text-gray-400"}"
        >${amountText(resource)}</span
      >
      <span class="grid w-6 shrink-0 place-items-center"
        >${ReadinessIcon(readiness)}</span
      >
      <span class="hidden shrink-0 items-center gap-0.5 text-gray-500 sm:flex"
        >→ ${OutputIcons(resource, known)}</span
      >
      ${props.inprogress
        ? html`<button
            class="h-11 shrink-0 rounded border border-amber-400/50 px-2.5 text-xs text-amber-200 hover:bg-amber-400/10 sm:h-7"
            data-on:click="@delete('/game/resources/${resource.id}')"
          >
            Cancel
          </button>`
        : html`<button
            class="h-11 min-w-14 shrink-0 rounded px-2.5 text-xs font-medium sm:h-7 ${readiness.doable
              ? "bg-blue-600/80 text-white hover:bg-blue-500"
              : "border border-white/10 bg-white/5 text-gray-400 hover:bg-white/10"}"
            data-on:click="@get('/game/resources/${resource.id}')"
          >
            ${resource.verb}
          </button>`}
    </div>
    ${ResourceDetails(
      resource,
      props.inventory,
      known,
      props.knownItems ?? null
    )}
    ${FloatingResult(props.flashMessage)} ${DiscoveryGlow(props.discovered)}
    ${props.inprogress
      ? html`<div
          class="pointer-events-none absolute inset-x-1 bottom-0 h-0.5 overflow-hidden rounded-full"
        >
          <div
            id="progress-${resource.id}-${props.inprogress.startedAt}"
            class="h-full w-0 bg-blue-500"
            data-init="${animateBetween(props.inprogress, [
              { width: "0%" },
              { width: "100%" },
            ])}"
          ></div>
        </div>`
      : null}
  </div>`;
};

const ResourceDetails = (
  resource: Resource,
  inventory: InventoryItem[],
  known: Set<string> | null,
  knownItems: ReadonlySet<string> | null
) => {
  if (!resource.required_items.length && !resource.reward_items.length) {
    return null;
  }
  return html`<div
    class="d-full flex flex-wrap gap-x-4 gap-y-1 pb-1 pl-5 text-xs"
  >
    ${resource.required_items.length
      ? html`<div class="flex flex-wrap items-center gap-1">
          <span class="text-gray-500">Requires</span>
          ${resource.required_items.map((item) =>
            ResourceRequiredItem(item, inventory, knownItems)
          )}
        </div>`
      : null}
    ${resource.reward_items.length
      ? html`<div class="flex flex-wrap items-center gap-1">
          <span class="text-gray-500">Gives</span>
          ${resource.reward_items.map((item) =>
            !known || known.has(outputKey(resource.id, item.item.id))
              ? ResourceRewardItem(item)
              : html`<span
                  class="rounded border border-white/10 bg-white/5 px-1.5 py-0.5 text-gray-400"
                  title="Unknown until you get it"
                  >?</span
                >`
          )}
        </div>`
      : null}
  </div>`;
};

const requiredItemShortfall = (
  item: RequiredItem,
  owned: InventoryItem[]
): "missing" | "durability" | null => {
  const matching = owned.filter((inv) => inv.item.id === item.item.id);
  const qty = matching.reduce((sum, inv) => sum + inv.qty, 0);
  const durability = matching.reduce(
    (sum, inv) => sum + (inv.item.durability?.current ?? 0),
    0
  );

  if (qty < item.qty) {
    return "missing";
  }
  if (
    item.itemDurabilityReduction &&
    item.itemDurabilityReduction > durability
  ) {
    return "durability";
  }
  return null;
};

const chip = "inline-flex items-center gap-1 rounded border px-1.5 py-0.5";

export const ResourceRequiredItem = (
  item: RequiredItem,
  inventory: InventoryItem[],
  knownItems: ReadonlySet<string> | null = null
) => {
  const shortfall = requiredItemShortfall(item, inventory);
  const usesDurability =
    item.qty === 1 && !item.consumed && item.itemDurabilityReduction;

  return html`<span
    tabindex="0"
    ${ItemAttrs(item.item)}
    class="${chip} ${shortfall
      ? "border-red-500/30 bg-red-500/10 text-red-300"
      : "border-white/15 bg-white/5 text-gray-200"}"
  >
    ${ItemIcon(item.item, { class: "size-4 rounded-sm text-[0.5rem]" })}
    <span
      class="font-mono tabular-nums ${shortfall
        ? "text-red-400"
        : "text-orange-300"}"
      >${usesDurability
        ? html`${DurabilityIcon}-${item.itemDurabilityReduction}`
        : `-${item.qty}`}</span
    >
    ${item.item.name}${shortfall ? " ✗" : ""}
    ${ItemTip(item.item, {
      known: !knownItems || knownItems.has(item.item.id),
      qty: item.qty,
      note: shortfall === "missing"
        ? "Missing from your bag"
        : shortfall === "durability"
        ? "Not enough durability"
        : usesDurability
        ? `Kept, −${item.itemDurabilityReduction} durability`
        : item.consumed
        ? "Used up"
        : "Kept",
    })}
  </span>`;
};

export const ResourceRewardItem = (item: RewardItem) => html`<span
  tabindex="0"
  ${ItemAttrs(item.item)}
  class="${chip} border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
>
  ${ItemIcon(item.item, { class: "size-4 rounded-sm text-[0.5rem]" })}
  <span class="font-mono tabular-nums text-emerald-400">+${item.qty}</span>
  ${item.item.name}
  ${ItemTip(item.item, { qty: item.qty })}
</span>`;

const idle = (npc: NPC) =>
  npc.idleLine
    ? html`<span class="italic text-gray-400">“${npc.idleLine}”</span>`
    : null;

const personButton = "h-11 shrink-0 rounded px-2.5 text-xs font-medium sm:h-7";

/**
 * The people who live here, by name once the player has met them: each
 * offers the story quests they have for the player, or says their idle line
 * when they have none.
 */
export const ZoneNPCs = (
  residents: Resident[],
  props: {
    /** NPCs the player has met. */
    known?: Set<string>;
    /** Quests ready to hand in here. */
    completable?: PlacedQuest[];
    /** Talk objectives here. */
    interactions?: ZoneInteraction[];
    contextFlashes?: Map<string, SystemMessage>;
  } = {}
) => {
  if (residents.length === 0) {
    return html`<div id="npcs"></div>`;
  }

  return ScenePanel({
    id: "npcs",
    panel: "people",
    sections: ["people"],
    title: "People",
    meta:
      residents.length === 1
        ? "Someone lives here"
        : `${residents.length} live here`,
    body: residents.map(({ npc, offers }) => {
      const met = props.known?.has(npc.entity_id) ?? false;
      const handIn = (props.completable ?? []).filter(
        (q) => q.completion.entity_id === npc.entity_id
      );
      const talk = (props.interactions ?? []).find(
        (i) => i.objective.entity_id === npc.entity_id
      );
      const marker = handIn.length
        ? html`<span class="font-bold text-green-400" title="Ready to hand in"
            >?</span
          >`
        : offers.length
        ? html`<span class="font-bold text-yellow-400" title="Has a quest for you"
            >!</span
          >`
        : talk
        ? html`<span class="text-objective" title="Quest objective">◆</span>`
        : "";

      const action = talk
        ? html`<button
            class="${personButton} bg-purple-600/80 text-white hover:bg-purple-500"
            data-on:click="@put('/game/quest/${talk.quest_id}/objective/${talk
              .objective.id}')"
          >
            Talk
          </button>`
        : handIn[0]
        ? html`<button
            class="${personButton} bg-green-700 text-white hover:bg-green-600"
            data-on:click="@post('/game/quest/${handIn[0].id}/complete')"
          >
            Hand in
          </button>`
        : offers[0]
        ? html`<button
            class="${personButton} bg-blue-600/80 text-white hover:bg-blue-500"
            data-on:click="@post('/game/quest/${offers[0].id}')"
          >
            Accept
          </button>`
        : null;

      return html`<div
        id="npc-${npc.entity_id}"
        class="relative cursor-pointer rounded px-1 py-0.5 hover:bg-white/5 data-[open]:bg-white/5"
        data-row
        data-preserve-attr="data-open"
        data-on:click="${rowToggle}"
      >
        <div class="flex min-h-11 items-center gap-2 sm:min-h-8">
          <span class="w-3 shrink-0 text-center">${marker}</span>
          <span
            class="shrink-0 font-semibold ${met ? "text-white" : "text-gray-300"}"
            >${met ? npc.name : "A stranger"}</span
          >
          <span class="min-w-0 flex-1 truncate text-xs"
            >${offers[0]
              ? html`<span class="text-yellow-300">${offers[0].name}</span>`
              : handIn[0]
              ? html`<span class="text-green-300">${handIn[0].name}</span>`
              : idle(npc)}</span
          >
          ${action}
        </div>
        ${offers.length
          ? html`<div class="d-full flex flex-col gap-1 pb-1 pl-5">
              ${offers.map(
                (quest) => html`<div
                  id="offer-${quest.id}"
                  class="flex items-start gap-2 text-xs"
                >
                  <div class="flex min-w-0 flex-1 flex-col">
                    <span class="font-medium text-yellow-300"
                      >${quest.name}</span
                    >
                    <p class="text-gray-400">${quest.description}</p>
                  </div>
                  <button
                    class="${personButton} bg-blue-600/80 text-white hover:bg-blue-500"
                    data-on:click="@post('/game/quest/${quest.id}')"
                  >
                    Accept
                  </button>
                </div>`
              )}
            </div>`
          : npc.idleLine && (handIn.length || talk)
          ? html`<div class="d-full pb-1 pl-5 text-xs">${idle(npc)}</div>`
          : null}
        ${DiscoveryGlow(
          props.contextFlashes?.get(`discovery:npc:${npc.entity_id}`)
        )}
      </div>`;
    }),
  });
};

import { html } from "hono/html";
import type { HtmlEscapedString } from "hono/utils/html";
import {
  EQUIP_SLOTS,
  MAX_INVENTORY_SIZE,
  UNARMED,
  type AttackStyle,
  type EquipSlot,
  type GameUser,
  type InventoryItem,
  type Item,
  type ItemAttributes,
  type ItemDurability,
  type ItemRarity,
  type ItemType,
} from "../config.js";
import { effectsById } from "../config/effects.js";
import { Glyph, GoldIcon } from "./icons.js";
import { ItemIcon } from "./item-icon.js";
import { SidePanel } from "./ui.js";

type Content = HtmlEscapedString | Promise<HtmlEscapedString>;

const RARITY_TEXT: Record<ItemRarity, string> = {
  common: "text-rarity-common",
  uncommon: "text-rarity-uncommon",
  rare: "text-rarity-rare",
  epic: "text-rarity-epic",
  legendary: "text-rarity-legendary",
};

const RARITY_BORDER: Record<ItemRarity, string> = {
  common: "border-rarity-common/60",
  uncommon: "border-rarity-uncommon",
  rare: "border-rarity-rare",
  epic: "border-rarity-epic",
  legendary: "border-rarity-legendary",
};

const TYPE_BG: Record<ItemType, string> = {
  resource: "bg-item-resource/25",
  tool: "bg-item-tool/25",
  weapon: "bg-item-weapon/25",
  armor: "bg-item-armor/30",
  consumable: "bg-item-consumable/25",
  quest: "bg-item-quest/25",
  item: "bg-item-item/25",
};

const EQUIP_SLOT_NAMES: Record<EquipSlot, string> = {
  mainHand: "Main Hand",
  offHand: "Off Hand",
  head: "Head",
  chest: "Chest",
  legs: "Legs",
  feet: "Feet",
  hands: "Hands",
  accessory: "Accessory",
};

const ATTACK_STYLES: AttackStyle[] = ["melee", "ranged", "magic"];

const capitalise = (text: string) => text[0]!.toUpperCase() + text.slice(1);

const seconds = (ms: number) => `${(ms / 1000).toFixed(1)}s`;

/** "+2 damage, +1 armor" for the attributes that are set. */
const formatAttributes = (attributes: ItemAttributes) =>
  Object.entries(attributes)
    .filter(([, value]) => value)
    .map(([name, value]) => `${value > 0 ? "+" : ""}${value} ${name}`)
    .join(", ");

const durabilityTone = ({ current, max }: ItemDurability) => {
  const percent = (current / max) * 100;
  return percent > 50
    ? { text: "text-green-400", bar: "bg-green-500" }
    : percent > 25
    ? { text: "text-yellow-400", bar: "bg-yellow-500" }
    : { text: "text-red-400", bar: "bg-red-500" };
};

/** What's drawn in a slot to stand for the item. */
const ItemGlyph = (item: Item) =>
  ItemIcon(item, { class: "size-3/4 text-sm font-bold text-white/90" });

const selectSlot = (slot: string) =>
  `$_slot = $_slot === '${slot}' ? '' : '${slot}'`;

export const ItemAttrs = (item: Item) =>
  html`data-item="${item.id}" aria-describedby="item-tip"`;

/**
 * A square slot holding one stack. `slot` names it in the `_slot` signal,
 * which picks the action strip below the grid.
 */
const ItemSlot = (props: {
  id: string;
  slot: string;
  owned: InventoryItem;
  marked?: boolean;
  usable?: boolean;
}) => {
  const { item, qty } = props.owned;
  const durability = item.durability;

  return html`<button
    id="${props.id}"
    type="button"
    class="relative aspect-square min-h-11 min-w-0 rounded-md border-2 flex items-center justify-center overflow-hidden hover:brightness-125 sm:min-h-0 ${TYPE_BG[
      item.type
    ]} ${RARITY_BORDER[item.rarity]} ${props.usable ? "slot-usable" : ""}"
    aria-label="${item.name}${props.usable ? ", used here" : ""}"
    ${ItemAttrs(item)}
    data-class="{'ring-2 ring-white/80': $_slot === '${props.slot}'}"
    data-on:click="${selectSlot(props.slot)}"
  >
    ${ItemGlyph(item)}
    ${props.marked
      ? html`<span
          class="absolute top-0 left-0.5 text-[0.65rem] leading-none text-objective"
          title="Needed for a quest"
          >◆</span
        >`
      : null}
    ${qty > 1
      ? html`<span
          class="absolute top-0 right-0.5 text-[0.65rem] leading-tight font-mono tabular-nums text-white [text-shadow:0_0_2px_black]"
          >${qty}</span
        >`
      : null}
    ${durability
      ? html`<span class="absolute inset-x-0 bottom-0 h-1 bg-black/60"
          ><span
            class="block h-full ${durabilityTone(durability).bar}"
            style="width: ${Math.round(
              (durability.current / durability.max) * 100
            )}%"
          ></span
        ></span>`
      : null}
    ${ItemTip(item, {
      qty,
      durability,
      note: [
        props.marked ? "Needed for a quest" : "",
        props.usable ? "Used by something here" : "",
      ]
        .filter(Boolean)
        .join("\n"),
    })}
  </button>`;
};

const EmptySlot = (label?: string) => html`<div
  class="aspect-square min-w-0 rounded-md border border-dashed border-white/10 bg-white/[0.02] flex items-center justify-center"
>
  ${label
    ? html`<span class="text-[0.6rem] text-gray-600 text-center leading-tight"
        >${label}</span
      >`
    : null}
</div>`;

const ActionButton = (props: {
  label: string;
  title: string;
  onClick: string;
  tone?: string;
}) => html`<button
  type="button"
  class="min-h-11 sm:min-h-9 px-3 rounded-md text-sm border transition-colors ${props.tone ??
  "bg-white/10 border-white/20 hover:bg-white/20"}"
  title="${props.title}"
  data-on:click="${props.onClick}"
>
  ${props.label}
</button>`;

/** Drop arms on the first click and drops on a second within 2s, or on shift-click. */
const DropButton = (inventoryId: string) => {
  const drop = `@delete('/game/inventory/${inventoryId}')`;
  return html`<button
    type="button"
    class="min-h-11 sm:min-h-9 px-3 rounded-md text-sm border border-red-500/30 text-red-300 hover:bg-red-500/20 transition-colors"
    title="Drop (shift-click to skip confirming)"
    data-class="{'bg-red-500/30 border-red-400': $_drop === '${inventoryId}'}"
    data-on:click="if (evt.shiftKey || $_drop === '${inventoryId}') { $_drop = ''; ${drop} } else { $_drop = '${inventoryId}'; setTimeout(() => { if ($_drop === '${inventoryId}') $_drop = '' }, 2000) }"
  >
    <span data-show="$_drop !== '${inventoryId}'">Drop</span>
    <span data-show="$_drop === '${inventoryId}'" style="display: none"
      >Drop? tap again</span
    >
  </button>`;
};

const Stat = (label: string, value: Content | string, tone = "") => html`<div
  class="flex gap-2"
>
  <dt class="w-16 shrink-0 text-gray-500">${label}</dt>
  <dd class="min-w-0 ${tone}">${value}</dd>
</div>`;

const effectList = (effects: { id: string; strength: number; duration?: number }[]) =>
  effects
    .map(({ id, strength, duration }) => {
      const name = effectsById.get(id)?.name ?? id;
      return `${name} ${strength}${duration ? ` for ${duration}s` : ""}`;
    })
    .join(", ");

const ItemCard = (item: Item) => html`<div class="flex flex-col gap-2 text-sm">
    <div class="flex items-baseline justify-between gap-2">
      <span class="font-semibold ${RARITY_TEXT[item.rarity]}">${item.name}</span>
      <span class="text-xs text-gray-400 shrink-0"
        >${capitalise(item.rarity)} ${item.type}</span
      >
    </div>
    <p class="text-xs text-gray-400">${item.description}</p>
    <dl class="flex flex-col gap-0.5 text-xs tabular-nums">
      ${item.equipSlot ? Stat("Slot", EQUIP_SLOT_NAMES[item.equipSlot]) : null}
      ${item.weapon
        ? Stat(
            "Attack",
            `${capitalise(item.weapon.style)} · ${item.weapon.damage} dmg · ${seconds(
              item.weapon.speed
            )}`
          )
        : null}
      ${item.defence
        ? Stat(
            "Defence",
            ATTACK_STYLES.map(
              (style) => `${style} ${item.defence![style]}`
            ).join(" · ")
          )
        : null}
      ${item.attributes && formatAttributes(item.attributes)
        ? Stat("Bonus", formatAttributes(item.attributes), "text-green-400")
        : null}
      ${item.effects?.length
        ? Stat("On use", effectList(item.effects), "text-emerald-300")
        : null}
      ${item.wornEffects?.length
        ? Stat("Worn", effectList(item.wornEffects), "text-emerald-300")
        : null}
    </dl>
  </div>`;

const ItemFact = (label: string, value: string) => html`<div
  class="flex gap-2 text-xs tabular-nums"
>
  <dt class="w-16 shrink-0 text-gray-500">${label}</dt>
  <dd class="min-w-0 text-gray-200">${value}</dd>
</div>`;

export const ItemTip = (
  item: Item,
  props: {
    known?: boolean;
    qty?: number;
    durability?: ItemDurability;
    note?: string;
  } = {}
) => html`<template data-item-tip>
  ${props.known === false
    ? html`<div class="flex items-center gap-2">
        ${ItemIcon(item, { class: "size-4 rounded-sm text-[0.5rem]" })}
        <div>
          <p class="font-semibold text-gray-100">${item.name}</p>
          <p class="text-xs text-gray-400">Not found yet</p>
        </div>
      </div>`
    : ItemCard(item)}
  ${props.qty !== undefined || props.durability || props.note
    ? html`<dl class="mt-2 flex flex-col gap-0.5">
        ${props.qty !== undefined
          ? ItemFact("Quantity", String(props.qty))
          : null}
        ${props.durability
          ? ItemFact(
              "Durability",
              `${props.durability.current}/${props.durability.max}`
            )
          : null}
        ${(props.note ?? "")
          .split("\n")
          .filter(Boolean)
          .map((note) => ItemFact("Note", note))}
      </dl>`
    : null}
</template>`;

const ActionStrip = (props: {
  slot: string;
  item: Item;
  actions: Content;
}) => html`<div
  class="flex min-h-12 items-center gap-2 border-t border-white/10 pt-2"
  data-show="$_slot === '${props.slot}'"
  style="display: none"
>
  <span class="min-w-0 flex-1 truncate text-sm font-semibold ${RARITY_TEXT[
    props.item.rarity
  ]}">${props.item.name}</span>
  <div class="flex shrink-0 flex-wrap justify-end gap-2">${props.actions}</div>
</div>`;

/**
 * The bag's slots. Items a quest needs are marked; items the zone's
 * resources and stations use are highlighted.
 */
export const ZoneInventory = (
  user: GameUser,
  {
    objectiveItems = new Set(),
    usableHere = new Set(),
  }: {
    objectiveItems?: ReadonlySet<string>;
    usableHere?: ReadonlySet<string>;
  } = {}
) => {
  const bagSlot = (owned: InventoryItem) => `i:${owned.id}`;
  const marked = (owned: InventoryItem) => objectiveItems.has(owned.item.id);
  const usable = (owned: InventoryItem) => usableHere.has(owned.item.id);

  return SidePanel({
    id: "inventory",
    panel: "bag",
    title: "Bag",
    meta: html`<span class="font-mono text-gray-400" title="Slots used"
        >${user.i.length}/${MAX_INVENTORY_SIZE}</span
      ><span class="flex items-center gap-1 font-mono text-yellow-400" title="Gold"
        >${GoldIcon}${user.$}</span
      >`,
    body: html`<div class="grid grid-cols-5 gap-1">
      ${Array.from({ length: MAX_INVENTORY_SIZE }, (_, index) => {
        const owned = user.i[index];
        return owned
          ? ItemSlot({
              id: `bag-slot-${owned.id}`,
              slot: bagSlot(owned),
              owned,
              marked: marked(owned),
              usable: usable(owned),
            })
          : EmptySlot();
      })}
    </div>
    <div class="min-h-14">${user.i.map((owned) => {
      const { item } = owned;
      return ActionStrip({
        slot: bagSlot(owned),
        item,
        actions: html`${item.effects?.length
          ? ActionButton({
              label: "Use",
              title: `Use one ${item.name}`,
              onClick: `@post('/game/inventory/${owned.id}/use')`,
              tone: "bg-emerald-500/20 border-emerald-500/30 text-emerald-200 hover:bg-emerald-500/30",
            })
          : null}
        ${item.equippable && item.equipSlot
          ? ActionButton({
              label: "Equip",
              title: `Equip to ${EQUIP_SLOT_NAMES[item.equipSlot]}`,
              onClick: `@post('/game/equipment/${owned.id}')`,
            })
          : null}
        ${DropButton(owned.id)}`,
      });
    })}</div>`,
  });
};

/** The paper doll, row by row: a body in a 3-column grid. */
const DOLL: (EquipSlot | null)[] = [
  null, "head", null,
  "offHand", "chest", "mainHand",
  "hands", "legs", "accessory",
  null, "feet", null,
];

/** What the equipment adds up to, as combat uses it. */
export const gearTotals = (equipment: GameUser["e"]) => {
  const attributes: ItemAttributes = {};
  const defence: Record<AttackStyle, number> = { melee: 0, ranged: 0, magic: 0 };

  for (const { item } of Object.values(equipment)) {
    for (const [name, value] of Object.entries(item.attributes ?? {})) {
      const key = name as keyof ItemAttributes;
      attributes[key] = (attributes[key] ?? 0) + (value ?? 0);
    }
    for (const style of ATTACK_STYLES) {
      defence[style] += item.defence?.[style] ?? 0;
    }
  }

  const main = equipment.mainHand?.item;
  const weapon =
    main?.weapon && (main.durability?.current ?? 0) > 0
      ? { name: main.name, ...main.weapon }
      : { name: "Fists", ...UNARMED };

  return { attributes, defence, weapon };
};

export const ZoneEquipment = (user: GameUser) => {
  const totals = gearTotals(user.e);
  const bonuses = formatAttributes(totals.attributes);
  const gearSlot = (slot: EquipSlot) => `g:${slot}`;

  return SidePanel({
    id: "equipment",
    panel: "gear",
    title: "Gear",
    body: html`<div class="grid grid-cols-3 gap-1 w-full max-w-[12rem] mx-auto">
      ${DOLL.map((slot) => {
        if (!slot) {
          return html`<div></div>`;
        }
        const owned = user.e[slot];
        return owned
          ? ItemSlot({ id: `gear-slot-${slot}`, slot: gearSlot(slot), owned })
          : EmptySlot(EQUIP_SLOT_NAMES[slot]);
      })}
    </div>
    <dl
      id="gear-totals"
      class="flex flex-col gap-0.5 p-2 rounded-md border border-white/10 bg-black/40 text-xs tabular-nums"
    >
      ${Stat(
        "Attack",
        `${totals.weapon.name} · ${capitalise(totals.weapon.style)} · ${
          totals.weapon.damage
        } dmg · ${seconds(totals.weapon.speed)}`
      )}
      ${Stat(
        "Defence",
        ATTACK_STYLES.map((style) => `${style} ${totals.defence[style]}`).join(
          " · "
        )
      )}
      ${Stat("Bonus", bonuses || "None", bonuses ? "text-green-400" : "text-gray-500")}
    </dl>
    <div class="min-h-14">${EQUIP_SLOTS.flatMap((slot) => {
      const owned = user.e[slot];
      return owned
        ? [
            ActionStrip({
              slot: gearSlot(slot),
              item: owned.item,
              actions: ActionButton({
                label: "Unequip",
                title: "Move to bag",
                onClick: `@delete('/game/equipment/${slot}')`,
              }),
            }),
          ]
        : [];
    })}</div>`,
  });
};

export const DurabilityIcon = Glyph("bolt", "size-4 inline");

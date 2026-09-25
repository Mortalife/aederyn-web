import { describe, expect, it } from "vitest";
import "../test/config/index.js";

const { ZoneEquipment, ZoneInventory, gearTotals } = await import("./bag.js");
const { BASE_USER, MAX_INVENTORY_SIZE } = await import("../config.js");
const { itemsById } = await import("../config/items.js");
type GameUser = import("../config.js").GameUser;
type Item = import("../config.js").Item;

const item = (id: string) => itemsById.get(id)!;
const owned = (id: string, entity: Item, qty = 1) => ({ id, qty, item: entity });

/** Rendered HTML with attribute quotes unescaped, to match on. */
const text = (rendered: { toString(): string }) =>
  rendered.toString().replaceAll("&#39;", "'").replaceAll("&quot;", '"');

const user = (props: Partial<GameUser>): GameUser => ({
  ...BASE_USER,
  id: "player",
  i: [],
  e: {},
  ...props,
});

const actionStrip = (html: string, slot: string) => {
  const marker = `data-show="$_slot === '${slot}'"`;
  const start = html.indexOf(marker);
  expect(start).toBeGreaterThan(-1);
  const next = html.indexOf('data-show="$_slot ===', start + marker.length);
  return html.slice(start, next === -1 ? undefined : next);
};

const helmet: Item = {
  ...item("item_torch"),
  id: "item_test_helmet",
  name: "Test Helmet",
  type: "armor",
  equipSlot: "head",
  durability: undefined,
  defence: { melee: 4, ranged: 2, magic: 1 },
  attributes: { armor: 2 },
};

const boots: Item = {
  ...helmet,
  id: "item_test_boots",
  name: "Test Boots",
  equipSlot: "feet",
  defence: { melee: 1, ranged: 1, magic: 3 },
  attributes: { armor: 1, dexterity: 1 },
};

describe("ZoneInventory", () => {
  const html = text(ZoneInventory(
    user({
      i: [
        owned("a", item("item_log_01"), 5),
        owned("b", item("item_wooden_club")),
        owned("c", item("item_herb_poultice"), 2),
      ],
      $: 42,
    }),
    {
      objectiveItems: new Set(["item_log_01"]),
      usableHere: new Set(["item_wooden_club"]),
    }
  ));

  it("draws every slot, empty or not", () => {
    expect(html.match(/aspect-square/g)).toHaveLength(MAX_INVENTORY_SIZE);
    expect(html.match(/border-dashed/g)).toHaveLength(MAX_INVENTORY_SIZE - 3);
    expect(html).toContain(`3/${MAX_INVENTORY_SIZE}`);
    expect(html).toContain("42");
  });

  it("shows the quantity only on stacks", () => {
    const slot = (id: string) =>
      html.slice(html.indexOf(`id="bag-slot-${id}"`), html.indexOf("</button>", html.indexOf(`id="bag-slot-${id}"`)));
    expect(slot("a")).toMatch(/>5</);
    expect(slot("b")).not.toMatch(/font-mono/);
    expect(slot("b")).toContain("bg-green-500");
  });

  it("marks items a quest needs", () => {
    expect(html.slice(html.indexOf('id="bag-slot-a"'), html.indexOf("</button>", html.indexOf('id="bag-slot-a"')))).toContain("Needed for a quest");
    expect(html.slice(html.indexOf('id="bag-slot-b"'), html.indexOf("</button>", html.indexOf('id="bag-slot-b"')))).not.toContain("Needed for a quest");
  });

  it("highlights items something here uses, apart from the quest marker", () => {
    const slot = (id: string) =>
      html.slice(html.indexOf(`id="bag-slot-${id}"`), html.indexOf("</button>", html.indexOf(`id="bag-slot-${id}"`)));
    expect(slot("b")).toContain("slot-usable");
    expect(slot("b")).not.toContain("◆");
    expect(slot("a")).not.toContain("slot-usable");
    expect(slot("b")).toContain("Used by something here");
    expect(slot("a")).not.toContain("Used by something here");
  });

  it("keeps each slot's tooltip content with the slot", () => {
    const slot = html.slice(
      html.indexOf('id="bag-slot-a"'),
      html.indexOf("</button>", html.indexOf('id="bag-slot-a"'))
    );
    expect(slot).toContain("<template data-item-tip>");
    expect(slot).toContain("Log");
    expect(slot).toContain("Quantity");
    expect(slot).toContain("5");
  });

  it("keeps selection in a fixed action strip that hover cannot override", () => {
    expect(html).toContain('class="min-h-14"');
    expect(html).not.toContain("$_hover");

    const log = actionStrip(html, "i:a");
    expect(log).not.toContain("/use')");
    expect(log).not.toContain("@post('/game/equipment/a')");
    expect(log).toContain("@delete('/game/inventory/a')");

    const club = actionStrip(html, "i:b");
    expect(club).toContain("@post('/game/equipment/b')");

    const poultice = actionStrip(html, "i:c");
    expect(poultice).toContain("@post('/game/inventory/c/use')");
    expect(poultice).not.toContain("@post('/game/equipment/c')");
  });
});

describe("ZoneEquipment", () => {
  it("adds up what's worn", () => {
    const totals = gearTotals(
      user({
        e: {
          head: owned("h", helmet),
          feet: owned("f", boots),
          mainHand: owned("m", item("item_wooden_club")),
        },
      }).e
    );

    expect(totals.defence).toEqual({ melee: 5, ranged: 3, magic: 4 });
    expect(totals.attributes).toEqual({ armor: 3, dexterity: 1 });
    expect(totals.weapon).toMatchObject({ name: "Wooden Club", damage: 10 });
  });

  it("fights with fists when the weapon is broken", () => {
    const club = item("item_wooden_club");
    const broken = { ...club, durability: { current: 0, max: 60 } };
    expect(gearTotals({ mainHand: owned("m", broken) }).weapon.name).toBe(
      "Fists"
    );
  });

  it("draws the paper doll with an unequip card per item", () => {
    const html = text(ZoneEquipment(user({ e: { head: owned("h", helmet) } })));

    expect(html.match(/aspect-square/g)).toHaveLength(8);
    expect(html).toContain('id="gear-slot-head"');
    expect(html).toContain("@delete('/game/equipment/head')");
    expect(html).toContain("melee 4 · ranged 2 · magic 1");
    expect(html).toContain("Fists");
  });
});

import { describe, expect, it } from "vitest";
import "../test/config/index.js";

const { ZoneResources, arrangeResources, ZoneNPCs } = await import("./zone.js");
const { ZoneMonsters } = await import("./combat.js");
const { ContractBoard, Dialogue } = await import("./quests.js");
const { BASE_USER } = await import("../config.js");
const { itemsById } = await import("../config/items.js");
const { monstersById } = await import("../config/monsters.js");
const { npcs } = await import("../config/npcs.js");
const { weakestStyles } = await import("../game/view/select.js");
type GameUser = import("../config.js").GameUser;
type Resource = import("../config.js").Resource;
type InventoryItem = import("../config.js").InventoryItem;
type WorldTile = import("../world/index.js").WorldTile;
type ZoneMonster = import("../game/view/select.js").ZoneMonster;
type ZoneInteraction = import("../user/quest-progress-manager.js").ZoneInteraction;

const item = (id: string) => itemsById.get(id)!;
const stone = item("item_stone_01");
const log = item("item_log_01");
const grass = item("item_grass_01");
const stick = item("item_stick_01");
const club = item("item_wooden_club");
const torch = item("item_torch");

const text = (rendered: { toString(): string }) =>
  rendered.toString().replaceAll("&#39;", "'").replaceAll("&quot;", '"');

/** The HTML from the element with `id` up to the next resource row. */
const row = (html: string, id: string) => {
  const start = html.indexOf(`id="resources-${id}"`);
  expect(start).toBeGreaterThan(-1);
  const next = html.indexOf('id="resources-', start + 1);
  return html.slice(start, next === -1 ? undefined : next);
};

const resource = (
  id: string,
  props: Partial<Resource> & { needs?: string[] } = {}
): Resource => ({
  id,
  name: `Node ${id}`,
  amount: 5,
  amount_remaining: 5,
  limitless: false,
  collectionTime: 2,
  type: "resource",
  verb: "Gather",
  reward_items: [{ item: log, qty: 1 }],
  required_items: (props.needs ?? []).map((needed) => ({
    item: item(needed),
    qty: 1,
    consumed: true,
  })),
  ...props,
});

const owned = (...ids: string[]): InventoryItem[] =>
  ids.map((id, index) => ({ id: `owned-${index}`, qty: 1, item: item(id) }));

const user = (i: InventoryItem[]): GameUser => ({
  ...BASE_USER,
  id: "player",
  i,
  e: {},
});

const tile = (resources: Resource[]): WorldTile =>
  ({ x: 1, y: 2, here: true, tile: { name: "Test", resources } }) as unknown as WorldTile;

const nothingKnown = {
  items: new Set<string>(),
  recipes: new Set<string>(),
  resourceOutputs: new Set<string>(),
};

describe("resource rows", () => {
  const rows = [
    resource("far", { needs: ["item_stone_01", "item_torch"] }),
    resource("objective", { needs: ["item_torch", "item_wooden_club"] }),
    resource("near", { needs: ["item_torch"] }),
    resource("ready"),
    resource("ready_objective"),
    resource("empty", { amount_remaining: 0 }),
  ];

  it("sorts doable first, then objectives, and folds what's more than one item away", () => {
    const { shown, folded } = arrangeResources(
      rows,
      [],
      new Set(["objective", "ready_objective"]),
      new Set()
    );
    expect(shown.map((r) => r.resource.id)).toEqual([
      "ready_objective",
      "ready",
      "objective",
      "near",
      "empty",
    ]);
    expect(folded.map((r) => r.resource.id)).toEqual(["far"]);
  });

  it("keeps a recipe done before out of the fold", () => {
    const { folded } = arrangeResources(rows, [], new Set(), new Set(["far"]));
    expect(folded.map((r) => r.resource.id)).toEqual(["objective"]);
  });

  it("shows readiness, amounts and the fold", () => {
    const worn = { ...club, durability: { current: 1, max: 60 } };
    const html = text(
      ZoneResources({
        worldTile: tile([
          ...rows,
          resource("chop", {
            limitless: true,
            required_items: [
              { item: club, qty: 1, consumed: false, itemDurabilityReduction: 5 },
            ],
          }),
        ]),
        user: user([{ id: "club", qty: 1, item: worn }]),
        resourceObjectives: new Set(),
        contextFlashes: new Map(),
        discoveries: nothingKnown,
      })
    );

    expect(row(html, "ready")).toContain('title="Ready"');
    expect(row(html, "ready")).toContain("5 left");
    expect(row(html, "near")).toContain(`title="Needs ${torch.name}"`);
    expect(row(html, "empty")).toContain("0 left");
    expect(row(html, "empty")).toContain("Replenishing");
    expect(row(html, "chop")).toContain(`title="Not enough durability: ${club.name}"`);
    expect(row(html, "chop")).toContain("∞");

    expect(html).toContain("1 more");
    const fold = html.slice(html.indexOf('class="fold-rest'));
    expect(fold).toContain('id="resources-far"');
    expect(fold).not.toContain('id="resources-objective"');
  });

  it("hides a gathering node's outputs until the player has had them", () => {
    const worldTile = tile([
      resource("node", { reward_items: [{ item: log, qty: 1 }, { item: stone, qty: 1 }] }),
      resource("recipe", { type: "forge", verb: "Forge" }),
    ]);
    const render = (resourceOutputs: Set<string>) =>
      text(
        ZoneResources({
          worldTile,
          user: user([]),
          resourceObjectives: new Set(),
          contextFlashes: new Map(),
          discoveries: {
            items: new Set([log.id, stone.id]),
            recipes: new Set(),
            resourceOutputs,
          },
        })
      );

    const unknown = render(new Set());
    expect(row(unknown, "node")).not.toContain(log.name);
    expect(row(unknown, "node")).toContain("Unknown until you get it");
    expect(row(unknown, "recipe")).toContain(log.name);

    const one = row(render(new Set([`node:${log.id}`])), "node");
    expect(one).toContain(log.name);
    expect(one).not.toContain(stone.name);
    expect(one).toContain("Unknown until you get it");
  });

  it("renders each known output's tooltip with that resource row", () => {
    const grassNode = resource("grass", {
      reward_items: [{ item: grass, qty: 1 }],
    });
    const stickNode = resource("sticks", {
      reward_items: [{ item: stick, qty: 1 }],
    });
    const html = text(
      ZoneResources({
        worldTile: tile([grassNode, stickNode]),
        user: user([]),
        resourceObjectives: new Set(),
        contextFlashes: new Map(),
        discoveries: {
          items: new Set([grass.id, stick.id]),
          recipes: new Set(),
          resourceOutputs: new Set([
            `${grassNode.id}:${grass.id}`,
            `${stickNode.id}:${stick.id}`,
          ]),
        },
      })
    );

    expect(row(html, grassNode.id)).toContain("<template data-item-tip>");
    expect(row(html, grassNode.id)).toContain(grass.description);
    expect(row(html, grassNode.id)).not.toContain(stick.name);
    expect(row(html, stickNode.id)).toContain(stick.description);
    expect(row(html, stickNode.id)).not.toContain(grass.name);
    expect(html).not.toContain('id="item-cards"');
  });

  it("keeps undiscovered requirement details inside their local fallback", () => {
    const worldTile = tile([resource("recipe", { needs: [torch.id] })]);
    const render = (items: Set<string>) =>
      row(
        text(
          ZoneResources({
            worldTile,
            user: user([]),
            resourceObjectives: new Set(),
            contextFlashes: new Map(),
            discoveries: {
              items,
              recipes: new Set(),
              resourceOutputs: new Set(),
            },
          })
        ),
        "recipe"
      );

    expect(render(new Set())).toContain("Not found yet");
    expect(render(new Set())).not.toContain(torch.description);
    expect(render(new Set([torch.id]))).toContain(torch.description);
  });

  it("renders full detail for the client's density to hide", () => {
    const html = text(
      ZoneResources({
        worldTile: tile([resource("ready", { needs: ["item_stone_01"] })]),
        user: user(owned("item_stone_01")),
        resourceObjectives: new Set(),
        contextFlashes: new Map(),
        discoveries: nothingKnown,
      })
    );
    expect(html).toContain('data-attr:data-density="$_density.actions"');
    expect(row(html, "ready")).toContain('class="d-full');
    expect(row(html, "ready")).toContain('data-preserve-attr="data-open"');
    expect(row(html, "ready")).toContain("Requires");
    expect(html).toContain(`data-show="!$_isolate || ["resource"].includes($_isolate)"`);
  });
});

describe("monster rows", () => {
  const chicken = monstersById.get("monster_chicken")!;
  const monster: ZoneMonster = {
    spawn: 0,
    monster: chicken,
    hp: chicken.health,
    respawnAt: null,
    engaged: false,
    combat: null,
    hits: [],
    weakTo: weakestStyles(chicken.defence),
  };
  const viewer = (monsters: string[], drops: string[] = []) => ({
    userId: "player",
    gathering: false,
    weapon: null,
    contextFlashes: new Map(),
    discoveries: { monsters: new Set(monsters), monsterDrops: new Set(drops) },
  });
  const feather = item(chicken.drops[0]!.item_id);

  it("shows attack style, weakness and drops only once learned", () => {
    const unknown = text(ZoneMonsters([monster], viewer([])));
    expect(unknown).toContain(chicken.name);
    expect(unknown).not.toContain(chicken.attack.style);
    expect(unknown).toContain('title="Fight it to find out"');
    expect(unknown).not.toContain(feather.name);

    const fought = text(ZoneMonsters([monster], viewer([chicken.id])));
    expect(fought).toContain(chicken.attack.style);
    expect(fought).toContain(monster.weakTo.join(", "));
    expect(fought).not.toContain(feather.name);

    const known = text(
      ZoneMonsters([monster], viewer([chicken.id], [`${chicken.id}:${feather.id}`]))
    );
    expect(known).toContain(feather.name);
    expect(known).toContain("Attack");
    expect(known).toContain('class="d-full');
  });
});

describe("people and conversations", () => {
  const npc = npcs.find((n) => n.idleLine)!;
  const interaction = {
    x: 0,
    y: 0,
    quest_id: "quest_x",
    objective: {
      id: "talk_x",
      type: "talk",
      description: "",
      entity_id: npc.entity_id,
      dialog_steps: [
        { entity_id: npc.entity_id, dialog: "First line." },
        { entity_id: null, dialog: "Second line." },
        { entity_id: npc.entity_id, dialog: "Third line." },
      ],
      progress: { current: 2, required: 3, completed: false },
      x: 0,
      y: 0,
    },
  } as unknown as ZoneInteraction;

  it("offers a talk with a resident as the row's action", () => {
    const html = text(
      ZoneNPCs([{ npc, offers: [] }], { interactions: [interaction] })
    );
    expect(html).toContain("A stranger");
    expect(html).toContain("/game/quest/quest_x/objective/talk_x");
  });

  it("shows the conversation so far in the dialogue box", () => {
    const html = text(Dialogue([interaction], new Set([npc.entity_id])));
    expect(html).toContain(npc.name);
    expect(html).toContain("First line.");
    expect(html).toContain("Second line.");
    expect(html).not.toContain("Third line.");
    expect(html).toContain("Finish");

    expect(text(Dialogue([interaction], new Set()))).toContain("A stranger");
    expect(Dialogue([], new Set()).toString()).toBe(
      '<div id="dialogue" class="hud-dialogue"></div>'
    );
  });
});

describe("contract board", () => {
  it("lists contracts as compact rows with time left and status", () => {
    const now = 1_000_000;
    const quest = (id: string) =>
      ({ id, name: `Contract ${id}`, description: "Do it.", ends_at: now + 3_600_000 }) as never;
    const html = text(
      ContractBoard({
        contracts: [
          { quest: quest("a"), status: "available" },
          { quest: quest("b"), status: "done" },
        ],
        now,
      })
    );
    expect(html).toContain('id="contract-a"');
    expect(html).toContain("about 1 hour");
    expect(html).toContain("/game/quest/a");
    expect(html).toMatch(/>\s*Take\s*</);
    expect(html).toMatch(/>\s*Done\s*</);
    expect(html).toContain('data-attr:data-density="$_density.board"');
  });
});

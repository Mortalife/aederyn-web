import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

process.env.DATABASE_PATH = mkdtempSync(join(tmpdir(), "game-content-")) + "/";

const { START_POSITION, worldMap, resources, monsters, npcs, items, tileTypes, UNARMED, BASE_USER } = await import("../config.js");
const { damageAfterDefence } = await import("../game/systems/combat.js");
const { quests } = await import("../config/quests.js");
const { allCells, getTileSelection } = await import("./index.js");
const { npcsAtHome } = await import("../game/view/select.js");
const { blockingEffect, collectEffects, gatherDurationMultiplier, resolveEffects } = await import("./effects.js");
const { healthRate } = await import("../game/systems/health.js");
const { boardLandmarks, contractWindow, landmarkPoint, postContracts, storyQuests } = await import("./quests.js");
const { selectZoneQuests } = await import("../user/quest-progress-manager.js");

describe("the shipped world", () => {
  it("spawns players at the campsite, where they rest", () => {
    const camp = getTileSelection(START_POSITION.x, START_POSITION.y);
    expect(camp).toMatchObject({ id: "tile_campsite", landmark: "landmark_camp", accessible: true });
    expect(camp.effects).toContainEqual({ id: "effect_rest", strength: 3 });
    expect(camp.region?.id).toBe("landing");
  });

  it("puts the camp's cast at their homes", () => {
    const at = (landmark: string) => npcsAtHome(landmark).map((n) => n.entity_id);
    expect(at("landmark_camp")).toEqual(["npc_maren_pike"]);
    expect(at("landmark_workbench")).toEqual(["npc_hobb_carrow"]);
    expect(at("landmark_campfire")).toEqual(["npc_ada_thwaite"]);
    expect(at("landmark_camps_edge")).toEqual(["npc_ansel_morrow"]);
  });

  it("has every region on the map, all open but for the wall round the Heart", () => {
    const regions = new Map<string, { cells: number; open: number }>();
    for (const { tile } of allCells()) {
      const counts = regions.get(tile.region!.id) ?? { cells: 0, open: 0 };
      counts.cells++;
      if (tile.accessible) counts.open++;
      regions.set(tile.region!.id, counts);
    }
    expect([...regions.keys()].sort()).toEqual(worldMap.regions.map((r) => r.id).sort());
    const rim = [...allCells()].filter(({ tile }) => tile.id === "tile_heart_rim").length;
    for (const [id, { cells, open }] of regions) {
      expect(open, id).toBe(id === "heart" ? cells - rim : cells);
    }
  });

  const wardlineStory = [
    "quest_smoke_over_the_wall",
    "quest_the_lane_at_night",
    "quest_your_people_did_this",
    "quest_masks_and_tinctures",
    "quest_what_the_ground_keeps",
    "quest_the_seventh_stone",
    "quest_the_wardstone_focus",
  ];
  const bloomStory = ["quest_inside_the_ring", "quest_something_better_than_either"];
  const sporecraftStory = [
    "quest_ask_their_name",
    "quest_grow_dont_cut",
    "quest_the_sporecraft_wand",
    "quest_davy_reeds_song",
    "quest_over_the_ring",
    "quest_a_line_recut",
    "quest_the_offer",
  ];
  const confession = ["quest_the_keepers_knot", "quest_at_wicks_gate"];
  const reckoning = ["quest_across_the_line"];
  const offer = ["quest_what_the_ground_wants"];
  const mendBranch = ["quest_mend_the_first_line", "quest_the_ring_holds"];
  const breakBranch = ["quest_break_the_first_line", "quest_past_the_stones"];
  const endgameStory = [...confession, ...reckoning, ...offer, ...mendBranch, ...breakBranch];
  const insideTheRing = [...bloomStory, ...sporecraftStory, ...endgameStory];
  const resourcesById = new Map(resources.map((r) => [r.id, r]));
  const monstersById = new Map(monsters.map((m) => [m.id, m]));
  const itemsById = new Map(items.map((i) => [i.id, i]));
  const story = quests.filter((q) => q.kind === "story");
  const homes = new Map(npcs.map((npc) => [npc.entity_id, npc.home]));
  const cellsIn = (...regions: string[]) => [...allCells()].filter(({ tile }) => regions.includes(tile.region!.id));
  const contents = (cells: ReturnType<typeof cellsIn>) => ({
    resources: new Set(cells.flatMap(({ tile }) => tile.resources)),
    monsters: new Set(cells.flatMap(({ tile }) => tile.monsters)),
    landmarks: new Set(cells.flatMap(({ tile }) => tile.landmark ?? [])),
  });

  /** Everything a player can get from these places, starting with `given` (empty-handed by default). */
  const obtainable = (on: ReturnType<typeof contents>, given: Iterable<string> = []) => {
    const have = new Set([...given, ...[...on.monsters].flatMap((id) => monstersById.get(id)!.drops.map((d) => d.item_id))]);
    for (let changed = true; changed; ) {
      changed = false;
      for (const id of on.resources) {
        const resource = resourcesById.get(id)!;
        if (!resource.required_items.every((r) => have.has(r.item_id))) continue;
        for (const { item_id } of resource.reward_items) {
          if (!have.has(item_id)) {
            have.add(item_id);
            changed = true;
          }
        }
      }
    }
    return have;
  };

  /**
   * The story quests a player can finish in order using only these places and
   * earlier quests' rewards, never taking one another has ruled out, and
   * passing over `avoid` to take the other side of a choice.
   */
  const walkStory = (on: ReturnType<typeof contents>, avoid: string[] = []) => {
    let have = obtainable(on);
    const done: string[] = [];
    const doable = (quest: (typeof story)[number]) =>
      quest.objectives.every((objective) => {
        if (objective.type === "gather" || objective.type === "craft") {
          const resource = resourcesById.get(objective.resource_id)!;
          return on.resources.has(resource.id) && resource.required_items.every((r) => have.has(r.item_id));
        }
        if (objective.type === "kill") return on.monsters.has(objective.monster_id);
        if (objective.type === "explore") return on.landmarks.has(objective.landmark!);
        if (objective.type === "talk") return on.landmarks.has(homes.get(objective.entity_id)!);
        if (objective.type === "collect") return have.has(objective.item_id);
        return false;
      }) && [quest.giver, quest.completion].every(({ entity_id }) => on.landmarks.has(homes.get(entity_id)!));

    for (let progressed = true; progressed; ) {
      progressed = false;
      for (const quest of story) {
        if (done.includes(quest.id) || avoid.includes(quest.id)) continue;
        if (!(quest.prerequisites ?? []).every((id) => done.includes(id))) continue;
        if ((quest.excludes ?? []).some((id) => done.includes(id))) continue;
        if (!doable(quest)) continue;
        done.push(quest.id);
        const rewards = quest.rewards.flatMap((r) => (r.type === "item" ? [r.item_id] : []));
        have = obtainable(on, [...have, ...rewards]);
        progressed = true;
      }
    }
    return done;
  };

  const stationRecipes = (...landmarks: string[]) =>
    landmarks.flatMap((id) => {
      const landmark = worldMap.landmarks.find((l) => l.id === id)!;
      return getTileSelection(landmark.x, landmark.y).resources;
    });

  it("groups recipes by the station where they are made", () => {
    const stationTypes = {
      landmark_workbench: ["workbench"],
      landmark_campfire: ["campfire"],
      landmark_camps_edge: ["warding_table"],
      landmark_hunters_lodge: ["campfire", "tanning_rack", "workbench"],
      landmark_forge: ["forge", "workbench"],
      landmark_kiln: ["campfire", "kiln", "workbench"],
      landmark_tanning_rack: ["tanning_rack", "workbench"],
      landmark_apothecary: ["apothecary", "loom", "workbench"],
      landmark_growing_pit: ["growing_pit"],
      landmark_keystone: ["keystone"],
    };
    for (const [landmark, types] of Object.entries(stationTypes)) {
      for (const id of stationRecipes(landmark)) {
        expect(types, `${id} at ${landmark}`).toContain(resourcesById.get(id)!.type);
      }
    }
  });

  type Attack = { style: "melee" | "ranged" | "magic"; damage: number; speed: number };
  const weapon = (id: string) => itemsById.get(id)!.weapon!;
  const linen = ["item_linen_cap", "item_linen_jerkin", "item_linen_leggings", "item_adder_skin_gloves"];
  const bloomMaterials = [
    "item_spore_resin",
    "item_mycelium_mat",
    "item_chitin",
    "item_threaded_heartwood",
    "item_threaded_spine",
    "item_elk_hide",
    "item_moth_down",
    "item_spore_glass",
    "item_mycelium_leather",
  ];
  const beforeBloom = (recipeId: string) =>
    !resourcesById.get(recipeId)!.required_items.some((r) => bloomMaterials.includes(r.item_id));
  const heartMaterials = ["item_heartshell", "item_grown_sinew", "item_humming_thread", "item_cracked_wardens_respirator"];
  const beforeHeart = (recipeId: string) =>
    !resourcesById.get(recipeId)!.required_items.some((r) => heartMaterials.includes(r.item_id));
  const hide = [
    "item_hide_hood",
    "item_hide_jerkin",
    "item_leather_leggings",
    "item_leather_boots",
    "item_adder_skin_gloves",
  ];

  /** A fight to the end with this weapon and armour, as the combat system runs it. */
  const fight = (monsterId: string, attack: Attack, armour: string[] = []) => {
    const monster = monstersById.get(monsterId)!;
    const defence = armour.reduce((sum, id) => sum + (itemsById.get(id)!.defence?.[monster.attack.style] ?? 0), 0);
    const hit = damageAfterDefence(attack.damage, monster.defence[attack.style]);
    const takes = (Math.ceil(monster.health / hit) - 1) * attack.speed;
    const taken = Math.floor(takes / monster.attack.speed) * damageAfterDefence(monster.attack.damage, defence);
    return { wins: takes < monster.respawnTime * 1000 && taken < BASE_USER.h, taken, takes };
  };

  describe("the Landing", () => {
    const landing = cellsIn("landing");
    const onLanding = contents(landing);

    it("is walkable everywhere, with something on every open cell", () => {
      for (const { x, y, tile } of landing) {
        expect(tile.accessible, `${x},${y}`).toBe(true);
        if (tile.landmark) continue;
        expect(tile.resources.length + tile.monsters.length, `${x},${y}`).toBeGreaterThan(0);
      }
    });

    it("hosts the tier-0 monsters", () => {
      expect([...onLanding.monsters].sort()).toEqual(["monster_adder", "monster_chicken", "monster_rabbit"]);
    });

    it("gives a fresh player the whole tier-0 kit", () => {
      const have = obtainable(onLanding);
      const kit = ["item_flint_axe", "item_flint_pick", "item_sickle_01", "item_wooden_club", "item_sling", ...linen];
      for (const id of kit) expect(have.has(id), id).toBe(true);
      const recipes = stationRecipes("landmark_workbench", "landmark_campfire").filter((id) =>
        resourcesById.get(id)!.required_items.every((r) => have.has(r.item_id))
      );
      expect(recipes.length).toBeGreaterThan(10);
    });

    it("walks the tutorial chain in order, using only the Landing", () => {
      expect(walkStory(onLanding)).toEqual(
        expect.arrayContaining([
          "quest_pulling_your_weight",
          "quest_an_edge_to_work_with",
          "quest_something_hot",
          "quest_hen_trouble",
          "quest_lanes_end",
          "quest_dressed_for_the_long_grass",
        ])
      );
      expect(story.find((q) => !q.prerequisites?.length)?.giver.entity_id).toBe("npc_maren_pike");
    });

    it("sets the tier-0 fights up as intended", () => {
      expect(fight("monster_rabbit", UNARMED).wins).toBe(true);
      expect(fight("monster_chicken", UNARMED).wins).toBe(false);
      expect(fight("monster_chicken", weapon("item_wooden_club")).wins).toBe(true);
      expect(fight("monster_chicken", weapon("item_sling")).wins).toBe(true);
      const adder = fight("monster_adder", weapon("item_wooden_club"));
      expect(adder.wins).toBe(true);
      expect(adder.taken).toBeGreaterThanOrEqual(30);
    });
  });

  describe("the Southwood", () => {
    const southwood = cellsIn("southwood");
    const onSouthwood = contents(southwood);
    const open = contents(cellsIn("landing", "southwood"));

    it("is walkable everywhere, with something on every open cell", () => {
      for (const { x, y, tile } of southwood) {
        expect(tile.accessible, `${x},${y}`).toBe(true);
        if (tile.landmark) continue;
        expect(tile.resources.length + tile.monsters.length, `${x},${y}`).toBeGreaterThan(0);
      }
    });

    it("hosts the tier-1 monsters, and Jory Flint at his lodge", () => {
      expect([...onSouthwood.monsters].sort()).toEqual(["monster_boar", "monster_crow_swarm", "monster_wolf"]);
      expect(npcsAtHome("landmark_hunters_lodge").map((n) => n.entity_id)).toEqual(["npc_jory_flint"]);
      expect(onSouthwood.landmarks).toEqual(
        new Set(["landmark_hunters_lodge", "landmark_far_stile", "landmark_sunken_farm"])
      );
    });

    it("gates its best nodes behind tier-1 tools", () => {
      const tools = (id: string) => resourcesById.get(id)!.required_items.map((r) => r.item_id);
      expect(tools("resource_birch")).toEqual(["item_flint_axe"]);
      expect(tools("resource_oak")).toEqual(["item_flint_axe"]);
      expect(tools("resource_pollard_oak")).toEqual(["item_oak_and_bone_axe"]);
      expect(tools("resource_salt_lick")).toEqual(["item_oak_and_bone_pick"]);
      expect(tools("resource_crafting_item_cured_hide")).toContain("item_skinning_knife");
      expect(onSouthwood.resources.has("resource_pollard_oak")).toBe(true);
      expect(onSouthwood.resources.has("resource_salt_lick")).toBe(true);
    });

    it("lets a player make every recipe at camp and the lodge from the Landing and the Southwood", () => {
      const have = obtainable(open);
      const recipes = stationRecipes("landmark_workbench", "landmark_campfire", "landmark_hunters_lodge");
      for (const id of recipes) {
        const recipe = resourcesById.get(id)!;
        expect(recipe.type, id).not.toBe("resource");
        for (const { item_id } of recipe.required_items) {
          expect(have.has(item_id), `${id} needs ${item_id}`).toBe(true);
        }
      }
      const kit = ["item_oak_spear", "item_shortbow", "item_skinning_knife", "item_pitch_torch", ...hide];
      for (const id of kit) expect(have.has(id), id).toBe(true);
      expect(itemsById.get("item_pitch_torch")).toMatchObject({
        equipSlot: "offHand",
        wornEffects: [{ id: "effect_light", strength: expect.any(Number) }],
      });
    });

    it("walks the Southwood's story in order, using the Landing and the Southwood", () => {
      const done = walkStory(open);
      const order = [
        "quest_lanes_end",
        "quest_past_the_tree_line",
        "quest_wolf_sign",
        "quest_what_the_crows_wont_touch",
        "quest_a_light_in_the_cellar",
      ];
      expect(done.filter((id) => order.includes(id))).toEqual(order);
      expect(done).not.toContain("quest_smoke_on_the_scarp");
    });

    it("sets the tier-1 fights up so the style triangle matters", () => {
      const weapons = ["item_wooden_club", "item_sling", "item_oak_spear", "item_shortbow"];
      const [club, sling, spear, bow] = weapons.map(weapon);

      expect(fight("monster_wolf", club, linen).wins).toBe(false);
      const risky = fight("monster_wolf", sling, linen);
      expect(risky.wins).toBe(true);
      expect(risky.taken).toBeGreaterThanOrEqual(60);
      const comfortable = fight("monster_wolf", bow, hide);
      expect(comfortable.wins).toBe(true);
      expect(comfortable.taken).toBeLessThanOrEqual(40);

      expect(fight("monster_boar", club, linen).wins).toBe(false);
      expect(fight("monster_boar", sling, linen).wins).toBe(false);
      expect(fight("monster_boar", bow, linen).wins).toBe(true);
      expect(fight("monster_boar", bow, hide).taken).toBeLessThan(fight("monster_boar", spear, hide).taken);

      expect(fight("monster_crow_swarm", UNARMED).wins).toBe(false);
      expect(fight("monster_crow_swarm", club).wins).toBe(true);
      expect(fight("monster_crow_swarm", spear, hide).taken).toBeLessThan(fight("monster_crow_swarm", bow, hide).taken);
      expect(fight("monster_crow_swarm", spear).takes).toBeLessThan(fight("monster_crow_swarm", bow).takes);
    });
  });

  describe("the Scarp", () => {
    const scarp = cellsIn("scarp");
    const onScarp = contents(scarp);
    const open = contents(cellsIn("landing", "southwood", "scarp"));
    const bronze = [
      "item_bronze_helm",
      "item_bronze_scale_coat",
      "item_bronze_greaves",
      "item_leather_boots",
      "item_stalker_hide_gloves",
    ];
    const isDark = (x: number, y: number) =>
      getTileSelection(x, y).effects.some((e) => e.id === "effect_dark");
    const blocked = (x: number, y: number, equipped: string[], action: "gather" | "attack") =>
      blockingEffect(resolveEffects(collectEffects({ x, y }, equipped, [], 0)), action);

    it("is walkable everywhere, with something on every open cell", () => {
      for (const { x, y, tile } of scarp) {
        expect(tile.accessible, `${x},${y}`).toBe(true);
        if (tile.landmark) continue;
        expect(tile.resources.length + tile.monsters.length, `${x},${y}`).toBeGreaterThan(0);
      }
    });

    it("hosts the tier-2 monsters, and Bett Oakes at her forge by the old mine", () => {
      expect([...onScarp.monsters].sort()).toEqual(["monster_cave_bat", "monster_mine_stalker", "monster_rock_crab"]);
      expect(npcsAtHome("landmark_forge").map((n) => n.entity_id)).toEqual(["npc_bett_oakes"]);
      expect(onScarp.landmarks).toEqual(
        new Set([
          "landmark_forge",
          "landmark_upper_gallery",
          "landmark_lower_gallery",
          "landmark_lined_gallery",
          "landmark_unsealed_level",
          "landmark_iron_level",
          "landmark_tally_cairn",
        ])
      );
    });

    it("gives each ore cell one ore, both ores somewhere, and gates the rich seams behind bronze", () => {
      const tools = (id: string) => resourcesById.get(id)!.required_items.map((r) => r.item_id);
      for (const id of ["resource_copper_outcrop", "resource_tin_outcrop", "resource_soapstone"]) {
        expect(tools(id), id).toEqual(["item_oak_and_bone_pick"]);
        expect(onScarp.resources.has(id), id).toBe(true);
      }
      for (const id of ["resource_copper_seam", "resource_tin_seam", "resource_wardstone_seam"]) {
        expect(tools(id), id).toEqual(["item_bronze_pick"]);
      }
      expect(tools("resource_cliff_yew")).toEqual(["item_bronze_axe"]);
      for (const { x, y, tile } of scarp) {
        const ores = tile.resources.filter((id) => id === "resource_copper_outcrop" || id === "resource_tin_outcrop");
        expect(ores.length, `${x},${y}`).toBeLessThanOrEqual(1);
      }
    });

    it("keeps the rich seams and the wardstone in the dark, where only a light lets you work", () => {
      const deep = ["resource_copper_seam", "resource_tin_seam", "resource_wardstone_seam", "resource_iron_seam"];
      const darkCells = scarp.filter(({ x, y }) => isDark(x, y));
      expect(darkCells.map(({ tile }) => tile.landmark).sort()).toEqual([
        "landmark_iron_level",
        "landmark_lined_gallery",
        "landmark_lower_gallery",
        "landmark_unsealed_level",
        "landmark_upper_gallery",
      ]);
      for (const { x, y, tile } of scarp) {
        if (tile.resources.some((id) => deep.includes(id))) expect(isDark(x, y), `${x},${y}`).toBe(true);
      }
      for (const { x, y } of darkCells) {
        for (const action of ["gather", "attack"] as const) {
          expect(blocked(x, y, [], action), `${x},${y} ${action}`).toBeDefined();
          expect(blocked(x, y, ["item_pitch_torch"], action)).toBeUndefined();
          expect(blocked(x, y, ["item_bat_wing_lantern"], action)).toBeUndefined();
        }
      }
      expect(itemsById.get("item_bat_wing_lantern")).toMatchObject({
        equipSlot: "accessory",
        wornEffects: [{ id: "effect_light", strength: 100 }],
      });
    });

    it("lets a player make every forge recipe from the Landing, the Southwood and the Scarp", () => {
      const have = obtainable(open);
      const tier3 = ["item_iron_ore", "item_iron_ingot", "item_warden_steel"];
      const recipes = stationRecipes("landmark_forge").filter(
        (id) => !resourcesById.get(id)!.required_items.some((r) => tier3.includes(r.item_id))
      );
      expect(recipes.length).toBeGreaterThanOrEqual(10);
      for (const id of recipes) {
        const recipe = resourcesById.get(id)!;
        expect(recipe.type, id).not.toBe("resource");
        for (const { item_id } of recipe.required_items) {
          expect(have.has(item_id), `${id} needs ${item_id}`).toBe(true);
        }
      }
      const kit = [
        "item_bronze_ingot",
        "item_bronze_pick",
        "item_bronze_axe",
        "item_bronze_sword",
        "item_crab_shell_buckler",
        "item_bat_wing_lantern",
        "item_wardstone",
        ...bronze,
      ];
      for (const id of kit) expect(have.has(id), id).toBe(true);
      const withoutScarp = obtainable(contents(cellsIn("landing", "southwood")));
      expect(withoutScarp.has("item_bronze_ingot")).toBe(false);
    });

    it("walks Bett's questline in order after the Southwood's, without the Sinks", () => {
      const done = walkStory(open);
      expect(done).not.toContain("quest_down_to_the_fen");
      expect(done).not.toContain("quest_the_weight_of_a_wardstone");
      const order = [
        "quest_a_light_in_the_cellar",
        "quest_smoke_on_the_scarp",
        "quest_first_pour",
        "quest_the_lined_gallery",
      ];
      expect(done.filter((id) => order.includes(id))).toEqual(order);
      const gallery = story.find((q) => q.id === "quest_the_lined_gallery")!;
      const darkGathers = gallery.objectives.filter(
        (o) => o.type === "gather" && scarp.every(({ x, y, tile }) => !tile.resources.includes(o.resource_id) || isDark(x, y))
      );
      expect(darkGathers.length).toBeGreaterThan(0);
    });

    it("sets the tier-2 fights up so they want bronze, and makes the crab slow to beat without magic", () => {
      const [club, spear, bow, sword] = ["item_wooden_club", "item_oak_spear", "item_shortbow", "item_bronze_sword"].map(weapon);

      const batSword = fight("monster_cave_bat", sword, hide);
      const batBow = fight("monster_cave_bat", bow, hide);
      expect(batSword.wins).toBe(true);
      expect(batBow.wins).toBe(true);
      expect(batBow.taken).toBeGreaterThanOrEqual(50);
      expect(batSword.taken).toBeLessThan(batBow.taken / 3);

      expect(fight("monster_rock_crab", club, linen).wins).toBe(false);
      for (const [attack, armour] of [[sword, bronze], [spear, hide], [bow, hide]] as const) {
        const crab = fight("monster_rock_crab", attack, [...armour]);
        expect(crab.wins).toBe(true);
        expect(crab.takes).toBeLessThanOrEqual(monstersById.get("monster_rock_crab")!.respawnTime * 1000 * 0.35);
        expect(crab.takes).toBeGreaterThanOrEqual(25_000);
      }
      expect(monstersById.get("monster_rock_crab")!.defence.magic).toBeLessThan(monstersById.get("monster_rock_crab")!.defence.melee);

      expect(fight("monster_mine_stalker", club, linen).wins).toBe(false);
      const stalker = fight("monster_mine_stalker", sword, bronze);
      expect(stalker.wins).toBe(true);
      expect(stalker.taken).toBeLessThanOrEqual(45);
      expect(fight("monster_mine_stalker", bow, hide).taken).toBeGreaterThan(stalker.taken * 1.5);
    });
  });

  describe("the Sinks and the warding table", () => {
    const sinks = cellsIn("sinks");
    const onSinks = contents(sinks);
    const withoutScarp = contents(cellsIn("landing", "southwood", "sinks"));
    const open = contents(cellsIn("landing", "southwood", "scarp", "sinks"));
    const bronze = [
      "item_bronze_helm",
      "item_bronze_scale_coat",
      "item_bronze_greaves",
      "item_leather_boots",
      "item_stalker_hide_gloves",
    ];
    const tools = (id: string) => resourcesById.get(id)!.required_items.filter((r) => !r.consumed).map((r) => r.item_id);
    const gatherTime = (x: number, y: number, equipped: string[] = [], broth = false) => {
      const timed = broth
        ? [{ user_id: "u", item_id: "item_fen_broth", effect_id: "effect_cold_ward", strength: 60, started_at: 0, expires_at: 300_000 }]
        : [];
      return gatherDurationMultiplier(resolveEffects(collectEffects({ x, y }, equipped, timed, 0)));
    };

    it("is walkable everywhere, with something on every open cell", () => {
      for (const { x, y, tile } of sinks) {
        expect(tile.accessible, `${x},${y}`).toBe(true);
        if (tile.landmark) continue;
        expect(tile.resources.length + tile.monsters.length, `${x},${y}`).toBeGreaterThan(0);
      }
      expect(worldMap.regions.find((r) => r.id === "sinks")!.tiles.some((t) => t.id.startsWith("tile_uncharted"))).toBe(false);
    });

    it("hosts the Sinks' monsters, and Col Reeve at his kiln with the tanning rack beside it", () => {
      expect([...onSinks.monsters].sort()).toEqual(["monster_colonised_heron", "monster_mossback_toad", "monster_pike"]);
      expect(npcsAtHome("landmark_kiln").map((n) => n.entity_id)).toEqual(["npc_col_reeve"]);
      expect(onSinks.landmarks).toEqual(
        new Set(["landmark_kiln", "landmark_tanning_rack", "landmark_old_causeway", "landmark_heron_carr"])
      );
      const kiln = worldMap.landmarks.find((l) => l.id === "landmark_kiln")!;
      const rack = worldMap.landmarks.find((l) => l.id === "landmark_tanning_rack")!;
      expect(Math.abs(kiln.x - rack.x) + Math.abs(kiln.y - rack.y)).toBe(1);
    });

    it("stocks clay, reeds, peat, sand, moss and fish, gated behind the Sinks' own tools", () => {
      for (const id of [
        "resource_bog_moss",
        "resource_reeds",
        "resource_peat_cutting",
        "resource_clay_bank",
        "resource_lake_sand",
        "resource_reed_margin",
        "resource_open_water",
      ]) {
        expect(onSinks.resources.has(id), id).toBe(true);
      }
      expect(tools("resource_reeds")).toEqual(["item_sickle_01"]);
      expect(tools("resource_peat_cutting")).toEqual(["item_turf_spade"]);
      expect(tools("resource_clay_bank")).toEqual(["item_turf_spade"]);
      expect(tools("resource_reed_margin")).toEqual(["item_withy_fish_trap"]);
      expect(tools("resource_open_water")).toEqual(["item_floated_net"]);
    });

    it("slows gathering in the cold water by half to double, and waders and broth soften it without cancelling it", () => {
      const wading = sinks.filter(({ x, y }) => getTileSelection(x, y).effects.some((e) => e.id === "effect_cold"));
      expect(wading.length).toBeGreaterThan(sinks.length / 3);
      expect(wading.length).toBeLessThan(sinks.length);
      for (const { x, y } of wading) {
        const bare = gatherTime(x, y);
        const waders = gatherTime(x, y, ["item_mossback_waders"]);
        const both = gatherTime(x, y, ["item_mossback_waders"], true);
        expect(bare, `${x},${y}`).toBeGreaterThanOrEqual(1.5);
        expect(bare, `${x},${y}`).toBeLessThanOrEqual(2);
        expect(waders).toBeLessThan(bare);
        expect(waders).toBeGreaterThan(1);
        expect(both).toBeLessThan(waders);
        expect(both).toBeGreaterThan(1);
        expect(gatherTime(x, y, [], true)).toBeLessThan(bare);
      }
      for (const { x, y, tile } of sinks) {
        if (!tile.effects.some((e) => e.id === "effect_cold")) expect(gatherTime(x, y), `${x},${y}`).toBeLessThanOrEqual(1);
      }
      expect(itemsById.get("item_mossback_waders")).toMatchObject({
        equipSlot: "legs",
        wornEffects: [{ id: "effect_cold_ward", strength: expect.any(Number) }],
      });
    });

    it("gives the spores their first protection, a modest one", () => {
      const wrap = itemsById.get("item_spore_wrap")!;
      expect(wrap).toMatchObject({ equipSlot: "head", wornEffects: [{ id: "effect_spore_ward", strength: expect.any(Number) }] });
      const wardline = cellsIn("wardline")[0]!;
      const drain = (equipped: string[]) =>
        resolveEffects(collectEffects(wardline, equipped, [], 0)).find((e) => e.effect.id === "effect_spores")!.effective;
      expect(drain(["item_spore_wrap"])).toBeLessThan(drain([]));
      expect(drain(["item_spore_wrap"])).toBeGreaterThan(drain([]) / 2);
    });

    it("lets a player make every kiln and rack recipe from the open regions, and the Sinks' basics without the Scarp", () => {
      const have = obtainable(open);
      const recipes = stationRecipes("landmark_kiln", "landmark_tanning_rack").filter(beforeBloom);
      expect(recipes.length).toBeGreaterThanOrEqual(12);
      for (const id of recipes) {
        const recipe = resourcesById.get(id)!;
        expect(recipe.type, id).not.toBe("resource");
        for (const { item_id } of recipe.required_items) {
          expect(have.has(item_id), `${id} needs ${item_id}`).toBe(true);
        }
      }
      const kit = [
        "item_clay_jar",
        "item_glass",
        "item_floated_net",
        "item_gut_string",
        "item_fen_leather",
        "item_yew_longbow",
        "item_mossback_waders",
        "item_spore_wrap",
        "item_fen_broth",
      ];
      for (const id of kit) expect(have.has(id), id).toBe(true);
      const flankOnly = obtainable(withoutScarp);
      for (const id of kit.filter((id) => id !== "item_yew_longbow")) expect(flankOnly.has(id), id).toBe(true);
      expect(flankOnly.has("item_yew_longbow")).toBe(false);
      expect(obtainable(contents(cellsIn("landing", "southwood", "scarp"))).has("item_gut_string")).toBe(false);
    });

    it("keeps the warding table shut until Ansel hands over his stylus", () => {
      const table = stationRecipes("landmark_camps_edge").filter(beforeHeart);
      expect(table).toEqual([
        "resource_crafting_item_inscribed_shard",
        "resource_crafting_item_warding_staff",
        "resource_crafting_item_wardstone_focus",
      ]);
      for (const id of table) expect(tools(id), id).toContain("item_wardens_stylus");
      expect(obtainable(open).has("item_wardens_stylus")).toBe(false);
      const givers = story.filter((q) => q.rewards.some((r) => r.type === "item" && r.item_id === "item_wardens_stylus"));
      expect(givers.map((q) => q.giver.entity_id)).toEqual(["npc_ansel_morrow"]);
      expect(itemsById.get("item_warding_staff")!.weapon!.style).toBe("magic");
      const staffInputs = resourcesById.get("resource_crafting_item_warding_staff")!.required_items.map((r) => r.item_id);
      const shardInputs = resourcesById.get("resource_crafting_item_inscribed_shard")!.required_items.map((r) => r.item_id);
      expect(shardInputs).toEqual(expect.arrayContaining(["item_wardstone", "item_pale_growth"]));
      expect(staffInputs).toEqual(expect.arrayContaining(["item_inscribed_shard", "item_yew_log", "item_gut_string"]));
    });

    it("walks Col's questline without the Scarp, and Ansel's only once both flanks are done", () => {
      const cols = ["quest_a_light_in_the_cellar", "quest_down_to_the_fen", "quest_cold_water", "quest_the_fen_breathes"];
      const flank = walkStory(withoutScarp);
      expect(flank.filter((id) => cols.includes(id))).toEqual(cols);
      expect(flank).not.toContain("quest_the_weight_of_a_wardstone");
      expect(flank).not.toContain("quest_smoke_on_the_scarp");

      const done = walkStory(open);
      expect([...done].sort()).toEqual(
        story.filter((q) => !wardlineStory.includes(q.id) && !insideTheRing.includes(q.id)).map((q) => q.id).sort()
      );
      expect(done).toContain("quest_the_unsealed_level");
      const wardens = ["quest_the_weight_of_a_wardstone", "quest_the_warding_staff"];
      const ansel = story.find((q) => q.id === wardens[0])!;
      expect(ansel.prerequisites).toEqual(expect.arrayContaining(["quest_the_lined_gallery", "quest_the_fen_breathes"]));
      for (const before of ["quest_the_lined_gallery", "quest_the_fen_breathes"]) {
        expect(done.indexOf(before)).toBeLessThan(done.indexOf(wardens[0]!));
      }
      expect(done.indexOf(wardens[0]!)).toBeLessThan(done.indexOf(wardens[1]!));
    });

    it("sets the Sinks' fights up around the style triangle, with the heron wanting a blade", () => {
      const [club, spear, bow, sword, longbow] = [
        "item_wooden_club",
        "item_oak_spear",
        "item_shortbow",
        "item_bronze_sword",
        "item_yew_longbow",
      ].map(weapon);

      const pikeLongbow = fight("monster_pike", longbow, bronze);
      expect(pikeLongbow.wins).toBe(true);
      expect(pikeLongbow.taken).toBeLessThan(fight("monster_pike", sword, bronze).taken);
      expect(fight("monster_pike", bow, hide).wins).toBe(true);
      expect(fight("monster_pike", club, linen).wins).toBe(false);

      const toad = fight("monster_mossback_toad", spear, hide);
      expect(toad.wins).toBe(true);
      expect(toad.taken).toBeLessThanOrEqual(50);
      expect(fight("monster_mossback_toad", bow, hide).wins).toBe(true);

      const heron = monstersById.get("monster_colonised_heron")!;
      const heronSpear = fight(heron.id, spear, hide);
      expect(heronSpear.wins).toBe(true);
      expect(heronSpear.taken).toBeGreaterThanOrEqual(40);
      expect(fight(heron.id, sword, bronze).taken).toBeLessThan(heronSpear.taken);
      expect(fight(heron.id, bow, hide).wins).toBe(false);
      expect(fight(heron.id, club, linen).wins).toBe(false);
      expect(fight(heron.id, sword, bronze).takes).toBeLessThan(heron.respawnTime * 1000 * 0.2);
      expect(heron.defence.melee).toBeLessThan(Math.min(heron.defence.ranged, heron.defence.magic));

      expect(longbow.damage).toBeGreaterThan(bow.damage);
      expect(longbow.damage / longbow.speed).toBeGreaterThan(bow.damage / bow.speed);
    });

    it("makes the warding staff beat the rock crab easily, without beating the sword or longbow everywhere", () => {
      const [sword, longbow, staff] = ["item_bronze_sword", "item_yew_longbow", "item_warding_staff"].map(weapon);
      const crab = fight("monster_rock_crab", staff, bronze);
      expect(crab.wins).toBe(true);
      expect(crab.takes).toBeLessThanOrEqual(fight("monster_rock_crab", sword, bronze).takes / 1.8);
      expect(crab.taken).toBeLessThanOrEqual(25);
      expect(fight("monster_mossback_toad", staff, bronze).takes).toBeLessThan(
        fight("monster_mossback_toad", sword, bronze).takes
      );

      for (const id of ["monster_cave_bat", "monster_mine_stalker", "monster_colonised_heron"]) {
        expect(fight(id, staff, bronze).wins, id).toBe(true);
        expect(fight(id, staff, bronze).takes, id).toBeGreaterThanOrEqual(fight(id, sword, bronze).takes);
      }
      expect(fight("monster_pike", staff, bronze).takes).toBeGreaterThan(fight("monster_pike", longbow, bronze).takes);
      expect(staff.damage / staff.speed).toBeLessThan(sword.damage / sword.speed);
    });
  });

  describe("the Wardline and the holdfast", () => {
    const wardline = cellsIn("wardline");
    const onWardline = contents(wardline);
    const open = contents(cellsIn("landing", "southwood", "scarp", "sinks", "wardline"));
    const beforeWardline = contents(cellsIn("landing", "southwood", "scarp", "sinks"));
    const bronze = ["item_spore_wrap", "item_bronze_scale_coat", "item_bronze_greaves", "item_leather_boots", "item_stalker_hide_gloves"];
    const iron = ["item_waxed_mask", "item_iron_mail", "item_iron_chausses", "item_leather_boots", "item_stalker_hide_gloves"];
    const stones = ["landmark_fifth_stone", "landmark_sixth_stone", "landmark_seventh_stone", "landmark_eighth_stone"];
    const landmark = (id: string) => worldMap.landmarks.find((l) => l.id === id)!;
    const tincture = (id = "item_spore_tincture") => {
      const { id: effect_id, strength, duration } = itemsById.get(id)!.effects![0]!;
      return [{ user_id: "u", item_id: id, effect_id, strength, started_at: 0, expires_at: duration * 1000 }];
    };
    const spores = (at: { x: number; y: number }, equipped: string[] = [], drank = false) =>
      resolveEffects(collectEffects(at, equipped, drank ? tincture() : [], 0)).find((e) => e.effect.id === "effect_spores")!;
    const tools = (id: string) => resourcesById.get(id)!.required_items.filter((r) => !r.consumed).map((r) => r.item_id);
    const producers = (itemId: string) =>
      resources.filter((r) => r.reward_items.some((i) => i.item_id === itemId)).map((r) => r.id);
    const hostedAt = (resourceId: string) =>
      [...allCells()].filter(({ tile }) => tile.accessible && tile.resources.includes(resourceId));

    it("is walkable everywhere, with something on every open cell and no placeholder left", () => {
      for (const { x, y, tile } of wardline) {
        expect(tile.accessible, `${x},${y}`).toBe(true);
        if (tile.landmark) continue;
        expect(tile.resources.length + tile.monsters.length, `${x},${y}`).toBeGreaterThan(0);
      }
      const fill = worldMap.regions.find((r) => r.id === "wardline")!.tiles;
      expect(fill.length).toBeGreaterThanOrEqual(4);
      expect(fill.length).toBeLessThanOrEqual(6);
      expect(fill.some((t) => t.id.startsWith("tile_uncharted"))).toBe(false);
      expect(wardline.some(({ tile }) => tile.id === "tile_uncharted_wardline")).toBe(false);
    });

    it("hosts the tier-3 monsters, Wick at the holdfast and Tam at its apothecary, and four stones of the ring on the Bloom's edge", () => {
      expect([...onWardline.monsters].sort()).toEqual(["monster_feral_hounds", "monster_host_wanderer", "monster_mossback_wolf"]);
      expect(npcsAtHome("landmark_holdfast").map((n) => n.entity_id)).toEqual(["npc_old_wick"]);
      expect(npcsAtHome("landmark_apothecary").map((n) => n.entity_id)).toEqual(["npc_tam_reedsdaughter"]);
      expect(onWardline.landmarks).toEqual(new Set(["landmark_holdfast", "landmark_apothecary", ...stones]));
      const holdfast = landmark("landmark_holdfast");
      const apothecary = landmark("landmark_apothecary");
      expect(Math.abs(holdfast.x - apothecary.x) + Math.abs(holdfast.y - apothecary.y)).toBe(1);
      for (const id of stones) {
        const { x, y } = landmark(id);
        const neighbours = [[x, y - 1], [x - 1, y], [x + 1, y]].map(([nx, ny]) => getTileSelection(nx!, ny!).region?.id);
        expect(neighbours, id).toContain("bloom");
      }
      expect(npcsAtHome("landmark_seventh_stone")).toEqual([]);
      expect(npcs.some((n) => n.name.includes("Edith"))).toBe(false);
    });

    it("drains health with spores everywhere, and gear and tinctures soften it without ever stopping it", () => {
      for (const cell of wardline) {
        const bare = spores(cell);
        expect(bare.strength, `${cell.x},${cell.y}`).toBeGreaterThanOrEqual(1);
        if (cell.tile.landmark === "landmark_holdfast" || cell.tile.landmark === "landmark_apothecary") continue;
        const wrap = spores(cell, ["item_spore_wrap"]).effective;
        const mask = spores(cell, ["item_waxed_mask"]).effective;
        const both = spores(cell, ["item_waxed_mask"], true).effective;
        expect(wrap).toBeLessThan(bare.effective);
        expect(wrap).toBeGreaterThan(bare.effective / 2);
        expect(mask).toBeLessThan(wrap);
        expect(mask).toBeGreaterThanOrEqual(bare.effective / 2);
        expect(spores(cell, [], true).effective).toBeLessThan(bare.effective);
        expect(both).toBeLessThan(mask);
        expect(both).toBeGreaterThan(0);
        expect(healthRate(resolveEffects(collectEffects(cell, ["item_waxed_mask"], tincture(), 0)), { fighting: false, online: true })).toBeLessThan(0);
      }
      expect(itemsById.get("item_waxed_mask")).toMatchObject({
        equipSlot: "head",
        wornEffects: [{ id: "effect_spore_ward", strength: 100 }],
      });
      expect(itemsById.get("item_spore_tincture")!.effects).toEqual([{ id: "effect_spore_ward", strength: 80, duration: 300 }]);
      const bloom = cellsIn("bloom")[0]!;
      expect(spores(bloom, ["item_waxed_mask"], true).effective).toBeGreaterThan(spores(wardline[0]!, ["item_waxed_mask"], true).effective);
    });

    it("lets you rest behind the holdfast's walls, where the air is filtered but not clean", () => {
      for (const id of ["landmark_holdfast", "landmark_apothecary"]) {
        const at = landmark(id);
        const resolved = resolveEffects(collectEffects(at, [], [], 0));
        expect(resolved.find((e) => e.effect.id === "effect_spores")!.effective, id).toBeGreaterThan(0);
        expect(healthRate(resolved, { fighting: false, online: true }), id).toBeGreaterThan(0);
      }
      const field = wardline.find(({ tile }) => !tile.landmark)!;
      expect(healthRate(resolveEffects(collectEffects(field, [], [], 0)), { fighting: false, online: true })).toBeLessThan(0);
    });

    it("keeps iron in the Scarp's dark, behind a light and a bronze pick, and Warden steel behind an iron pick", () => {
      expect(producers("item_iron_ore")).toEqual(["resource_iron_seam"]);
      expect(resourcesById.get("resource_iron_seam")!.required_items.map((r) => r.item_id)).toEqual(["item_bronze_pick"]);
      const seams = hostedAt("resource_iron_seam");
      expect(seams.length).toBeGreaterThan(0);
      for (const { x, y, tile } of seams) {
        expect(tile.region!.id).toBe("scarp");
        const blocked = (equipped: string[]) => blockingEffect(resolveEffects(collectEffects({ x, y }, equipped, [], 0)), "gather");
        expect(blocked([]), `${x},${y}`).toBeDefined();
        expect(blocked(["item_pitch_torch"])).toBeUndefined();
        expect(blocked(["item_bat_wing_lantern"])).toBeUndefined();
      }
      const smelt = resourcesById.get("resource_crafting_item_iron_ingot")!;
      const bronzeSmelt = resourcesById.get("resource_crafting_item_bronze_ingot")!;
      const charcoal = (r: typeof smelt) => r.required_items.find((i) => i.item_id === "item_charcoal")!.qty / r.reward_items[0]!.qty;
      expect(charcoal(smelt)).toBeGreaterThan(charcoal(bronzeSmelt));

      expect(producers("item_warden_steel")).toEqual(["resource_warden_salvage"]);
      expect(resourcesById.get("resource_warden_salvage")!.required_items.map((r) => r.item_id)).toEqual(["item_iron_pick"]);
      for (const { tile } of hostedAt("resource_warden_salvage")) expect(tile.region!.id).toBe("wardline");

      const noBronzePick = obtainable(contents(cellsIn("landing", "southwood", "sinks")));
      expect(noBronzePick.has("item_iron_ore")).toBe(false);
      expect(obtainable(beforeWardline).has("item_iron_pick")).toBe(true);
      expect(obtainable(beforeWardline).has("item_warden_steel")).toBe(false);
    });

    it("makes the mask, the tinctures, felt and comfrey salve only at the holdfast's loom and apothecary", () => {
      const apothecary = stationRecipes("landmark_apothecary");
      expect(apothecary.length).toBeGreaterThanOrEqual(4);
      for (const id of ["item_waxed_mask", "item_spore_tincture", "item_comfrey_salve", "item_wool_felt"]) {
        const made = producers(id);
        expect(made.length, id).toBeGreaterThan(0);
        for (const recipe of made) {
          expect(apothecary, `${id} by ${recipe}`).toContain(recipe);
          const elsewhere = [...allCells()].filter(({ tile }) => tile.resources.includes(recipe) && tile.landmark !== "landmark_apothecary");
          expect(elsewhere, recipe).toEqual([]);
        }
      }
      expect(obtainable(beforeWardline).has("item_waxed_mask")).toBe(false);
      expect(obtainable(beforeWardline).has("item_spore_tincture")).toBe(false);
    });

    it("lets a player make every forge, table and apothecary recipe from the open regions", () => {
      const have = obtainable(open, ["item_wardens_stylus"]);
      for (const id of stationRecipes("landmark_forge", "landmark_camps_edge", "landmark_apothecary").filter(beforeBloom)) {
        const recipe = resourcesById.get(id)!;
        expect(recipe.type, id).not.toBe("resource");
        for (const { item_id } of recipe.required_items) expect(have.has(item_id), `${id} needs ${item_id}`).toBe(true);
      }
      const kit = [
        "item_iron_ingot",
        "item_iron_pick",
        "item_iron_sword",
        "item_warden_blade",
        "item_crossbow",
        "item_wardstone_focus",
        "item_warden_mail",
        "item_warden_gauntlets",
        "item_spore_tincture",
        "item_comfrey_salve",
        ...iron,
      ];
      for (const id of kit) expect(have.has(id), id).toBe(true);
      expect(obtainable(open).has("item_wardstone_focus")).toBe(false);
      expect(tools("resource_crafting_item_wardstone_focus")).toContain("item_wardens_stylus");
      const staff = weapon("item_warding_staff");
      const focus = weapon("item_wardstone_focus");
      expect(focus.style).toBe("magic");
      expect(focus.damage / focus.speed).toBeGreaterThan(staff.damage / staff.speed);
      for (const id of ["item_iron_mail", "item_iron_chausses", "item_warden_mail", "item_warden_gauntlets"]) {
        expect(itemsById.get(id)!.defence!.magic, id).toBeGreaterThanOrEqual(10);
      }
      expect(itemsById.get("item_warden_mail")!.defence!.magic).toBeGreaterThan(itemsById.get("item_iron_mail")!.defence!.magic);
    });

    it("opens the Wardline's story after the warding staff, and walks every chain in order", () => {
      expect(walkStory(beforeWardline).filter((id) => wardlineStory.includes(id))).toEqual([]);
      const done = walkStory(open);
      expect([...done].sort()).toEqual(story.filter((q) => !insideTheRing.includes(q.id)).map((q) => q.id).sort());
      const before = (a: string, b: string) => expect(done.indexOf(a), `${a} before ${b}`).toBeLessThan(done.indexOf(b));
      for (const id of ["quest_smoke_over_the_wall", "quest_the_unsealed_level"]) before("quest_the_warding_staff", id);
      before("quest_smoke_over_the_wall", "quest_the_lane_at_night");
      before("quest_the_lane_at_night", "quest_your_people_did_this");
      before("quest_the_unsealed_level", "quest_your_people_did_this");
      before("quest_the_lane_at_night", "quest_masks_and_tinctures");
      before("quest_masks_and_tinctures", "quest_what_the_ground_keeps");
      before("quest_smoke_over_the_wall", "quest_the_seventh_stone");
      before("quest_the_seventh_stone", "quest_the_wardstone_focus");
      before("quest_the_unsealed_level", "quest_the_wardstone_focus");
      const byId = new Map(story.map((q) => [q.id, q]));
      expect(byId.get("quest_smoke_over_the_wall")!.prerequisites).toEqual(["quest_the_warding_staff"]);
      expect(byId.get("quest_your_people_did_this")!.giver.entity_id).toBe("npc_old_wick");
      expect(byId.get("quest_masks_and_tinctures")!.giver.entity_id).toBe("npc_tam_reedsdaughter");
      for (const id of ["quest_the_seventh_stone", "quest_the_wardstone_focus"]) {
        const quest = byId.get(id)!;
        expect(quest.giver.entity_id).toBe("npc_ansel_morrow");
        expect(quest.objectives.some((o) => o.type === "explore" && o.landmark === "landmark_seventh_stone"), id).toBe(true);
      }
      for (const id of wardlineStory) {
        expect(byId.get(id)!.objectives.some((o) => o.type === "collect"), id).toBe(false);
      }
    });

    it("sets the tier-3 fights up so each wants its tier-3 answer, and tier-2 gear is a gamble", () => {
      const [sword, longbow, staff, ironSword, wardenBlade, crossbow, focus] = [
        "item_bronze_sword",
        "item_yew_longbow",
        "item_warding_staff",
        "item_iron_sword",
        "item_warden_blade",
        "item_crossbow",
        "item_wardstone_focus",
      ].map(weapon);
      const intended = [
        ["monster_mossback_wolf", crossbow, longbow],
        ["monster_host_wanderer", focus, staff],
        ["monster_feral_hounds", ironSword, sword],
      ] as const;
      for (const [id, answer, tier2] of intended) {
        const good = fight(id, answer, iron);
        expect(good.wins, id).toBe(true);
        expect(good.taken, id).toBeLessThanOrEqual(45);
        expect(good.takes, id).toBeLessThan(monstersById.get(id)!.respawnTime * 1000 * 0.2);
        const risky = fight(id, tier2, bronze);
        expect(risky.wins && risky.taken < 60, id).toBe(false);
        for (const other of [sword, longbow, staff]) {
          const f = fight(id, other, bronze);
          expect(f.wins && f.taken < 60, `${id} with ${other.style} ${other.damage}`).toBe(false);
        }
      }
      expect(fight("monster_host_wanderer", crossbow, iron).wins).toBe(false);
      expect(fight("monster_host_wanderer", wardenBlade, iron).taken).toBeLessThan(fight("monster_host_wanderer", ironSword, iron).taken);
      expect(fight("monster_feral_hounds", crossbow, iron).taken).toBeGreaterThan(fight("monster_feral_hounds", ironSword, iron).taken);
      const host = monstersById.get("monster_host_wanderer")!;
      expect(host.attack.speed).toBeGreaterThan(3000);
      expect(host.attack.damage).toBeGreaterThanOrEqual(25);
      expect(host.drops.map((d) => d.item_id)).toContain("item_grey_threads");
    });

    it("posts the holdfast's own contracts on its board, scoped to the Wardline and held back until the gate opens", () => {
      const holdfast = quests.filter((q) => q.kind === "contract" && q.board === "landmark_holdfast");
      const scoped = holdfast.filter((q) => q.objectives.some((o) => "region" in o && o.region === "wardline"));
      expect(scoped.length).toBeGreaterThanOrEqual(3);
      expect(boardLandmarks.has("landmark_holdfast")).toBe(true);
      for (const contract of scoped) {
        expect(contract.objectives.map((o) => ("region" in o ? o.region : undefined)), contract.id).toEqual(
          contract.objectives.map(() => "wardline")
        );
        expect(contract.prerequisites, contract.id).toContain("quest_the_lane_at_night");
      }
      const posted = postContracts(
        quests.filter((q) => q.kind === "contract"),
        contractWindow(Date.UTC(2026, 8, 24))
      );
      expect(posted.filter((c) => holdfast.some((h) => h.id === c.id))).toHaveLength(holdfast.length);
    });
  });

  describe("the Bloom", () => {
    const bloom = cellsIn("bloom");
    const onBloom = contents(bloom);
    const open = contents(cellsIn("landing", "southwood", "scarp", "sinks", "wardline", "bloom"));
    const beforeBloom = contents(cellsIn("landing", "southwood", "scarp", "sinks", "wardline"));
    const chitin = ["item_filter_respirator", "item_chitin_cuirass", "item_chitin_greaves", "item_mycelium_boots", "item_mycelium_gloves"];
    const wardenKit = ["item_waxed_mask", "item_warden_mail", "item_iron_chausses", "item_leather_boots", "item_warden_gauntlets"];
    const landmark = (id: string) => worldMap.landmarks.find((l) => l.id === id)!;
    const tincture = () => {
      const { id: effect_id, strength, duration } = itemsById.get("item_spore_tincture")!.effects![0]!;
      return [{ user_id: "u", item_id: "item_spore_tincture", effect_id, strength, started_at: 0, expires_at: duration * 1000 }];
    };
    const spores = (at: { x: number; y: number }, equipped: string[] = [], drank = false) =>
      resolveEffects(collectEffects(at, equipped, drank ? tincture() : [], 0)).find((e) => e.effect.id === "effect_spores")!;
    const tools = (id: string) => resourcesById.get(id)!.required_items.filter((r) => !r.consumed).map((r) => r.item_id);
    const producers = (itemId: string) =>
      resources.filter((r) => r.reward_items.some((i) => i.item_id === itemId)).map((r) => r.id);
    const hostedAt = (resourceId: string) =>
      [...allCells()].filter(({ tile }) => tile.accessible && tile.resources.includes(resourceId));
    const bloomRecipes = () => {
      const have = obtainable(beforeBloom);
      return stationRecipes("landmark_forge", "landmark_kiln", "landmark_tanning_rack", "landmark_apothecary").filter(
        (id) => beforeHeart(id) && !resourcesById.get(id)!.required_items.every((r) => have.has(r.item_id))
      );
    };

    it("is walkable everywhere, with something on every open cell and no placeholder left", () => {
      for (const { x, y, tile } of bloom) {
        expect(tile.accessible, `${x},${y}`).toBe(true);
        if (tile.landmark) continue;
        expect(tile.resources.length + tile.monsters.length, `${x},${y}`).toBeGreaterThan(0);
      }
      const fill = worldMap.regions.find((r) => r.id === "bloom")!.tiles;
      expect(fill.length).toBeGreaterThanOrEqual(4);
      expect(fill.length).toBeLessThanOrEqual(6);
      expect(fill.some((t) => t.id.startsWith("tile_uncharted"))).toBe(false);
      expect(tileTypes.some((t) => t.id === "tile_uncharted_bloom")).toBe(false);
      expect(tileTypes.some((t) => t.id === "tile_uncharted_heart")).toBe(false);
    });

    it("hosts the tier-4 monsters, Gill at the growing pit, and keeps the ring at twelve stones", () => {
      expect([...onBloom.monsters].sort()).toEqual([
        "monster_colonised_elk",
        "monster_host",
        "monster_host_cluster",
        "monster_spore_moths",
      ]);
      expect(onBloom.landmarks).toEqual(
        new Set(["landmark_fourth_stone", "landmark_standing_green", "landmark_growing_pit", "landmark_threaded_wall"])
      );
      expect(npcsAtHome("landmark_growing_pit").map((n) => n.entity_id)).toEqual(["npc_gill"]);
      expect(npcs.find((n) => n.entity_id === "npc_gill")!.faction).toBe("hybrids");
      const stones = worldMap.landmarks.filter((l) => /^landmark_\w+_stone$/.test(l.id));
      expect(stones.map((l) => l.id).sort()).toEqual(
        ["landmark_eighth_stone", "landmark_fifth_stone", "landmark_fourth_stone", "landmark_seventh_stone", "landmark_sixth_stone"]
      );
      const fourth = landmark("landmark_fourth_stone");
      const around = [[0, -1], [0, 1], [-1, 0], [1, 0]].map(([dx, dy]) => getTileSelection(fourth.x + dx!, fourth.y + dy!).region?.id);
      expect(around).toContain("sinks");
      const styles = Object.fromEntries(["monster_host", "monster_host_cluster", "monster_colonised_elk", "monster_spore_moths"].map((id) => [id, monstersById.get(id)!.attack.style]));
      expect(styles).toEqual({
        monster_host: "melee",
        monster_host_cluster: "magic",
        monster_colonised_elk: "melee",
        monster_spore_moths: "magic",
      });
      const onHeart = contents(cellsIn("heart")).monsters;
      for (const m of monsters.filter((m) => !onBloom.monsters.has(m.id) && !onHeart.has(m.id))) expect(m.attack.style, m.id).not.toBe("magic");
    });

    it("drains more than the Wardline everywhere, and no mix of mask, respirator and tincture ever stops it", () => {
      const wardlineField = cellsIn("wardline").find(({ tile }) => !tile.landmark)!;
      for (const cell of bloom) {
        const bare = spores(cell);
        const at = `${cell.x},${cell.y}`;
        expect(bare.strength, at).toBeGreaterThanOrEqual(2);
        const wrap = spores(cell, ["item_spore_wrap"]).effective;
        const mask = spores(cell, ["item_waxed_mask"]).effective;
        const respirator = spores(cell, ["item_filter_respirator"]).effective;
        const maskAndTincture = spores(cell, ["item_waxed_mask"], true).effective;
        const best = spores(cell, ["item_filter_respirator"], true).effective;
        expect(wrap, at).toBeLessThan(bare.effective);
        expect(mask, at).toBeLessThan(wrap);
        expect(respirator, at).toBeLessThan(mask);
        expect(respirator, at).toBeGreaterThan(bare.effective / 3);
        expect(best, at).toBeLessThan(respirator);
        expect(best, at).toBeLessThan(maskAndTincture);
        expect(best, at).toBeGreaterThan(0);
        expect(best, at).toBeGreaterThan(spores(wardlineField, ["item_filter_respirator"], true).effective);
        const rate = healthRate(resolveEffects(collectEffects(cell, ["item_filter_respirator"], tincture(), 0)), { fighting: false, online: true });
        expect(rate, at).toBeLessThan(0);
      }
      const glades = bloom.filter(({ tile }) => tile.id === "tile_puffball_glade");
      expect(glades.length).toBeGreaterThan(0);
      for (const cell of glades) expect(spores(cell).strength).toBeGreaterThan(worldMap.regions.find((r) => r.id === "bloom")!.effects[0]!.strength);
      expect(itemsById.get("item_filter_respirator")).toMatchObject({
        equipSlot: "head",
        wornEffects: [{ id: "effect_spore_ward", strength: 160 }],
      });
      const heart = cellsIn("heart")[0]!;
      expect(spores(heart, ["item_filter_respirator"], true).effective).toBeGreaterThan(spores(bloom[0]!, ["item_filter_respirator"], true).effective);
    });

    it("gates fungal materials behind tier-3 tools and the richest behind chitin-edged ones, all inside the Bloom", () => {
      const gates: Record<string, string[]> = {
        resource_rotten_log: ["item_iron_axe"],
        resource_weeping_birch: ["item_iron_axe"],
        resource_chitin_crust: ["item_iron_pick"],
        resource_threaded_oak: ["item_chitin_axe"],
        resource_crusted_boulder: ["item_chitin_pick"],
      };
      for (const [id, needs] of Object.entries(gates)) {
        expect(tools(id), id).toEqual(needs);
        const hosts = hostedAt(id);
        expect(hosts.length, id).toBeGreaterThan(0);
        for (const { tile } of hosts) expect(tile.region!.id, id).toBe("bloom");
      }
      expect(producers("item_chitin").sort()).toEqual(["resource_chitin_crust", "resource_crusted_boulder"]);
      expect(producers("item_threaded_heartwood")).toEqual(["resource_threaded_oak"]);
      const before = obtainable(beforeBloom);
      expect(before.has("item_iron_axe")).toBe(true);
      expect(before.has("item_iron_pick")).toBe(true);
      for (const id of bloomMaterials) expect(before.has(id), id).toBe(false);
      for (const id of ["item_chitin_axe", "item_chitin_pick"]) {
        expect(before.has(id), id).toBe(false);
        expect(obtainable(open).has(id), id).toBe(true);
      }
    });

    it("lets a player make every tier-4 recipe from the open regions, each at the station that fits it", () => {
      const have = obtainable(open);
      const recipes = bloomRecipes();
      expect(recipes.length).toBeGreaterThanOrEqual(12);
      for (const id of recipes) {
        const recipe = resourcesById.get(id)!;
        expect(recipe.type, id).not.toBe("resource");
        for (const { item_id } of recipe.required_items) expect(have.has(item_id), `${id} needs ${item_id}`).toBe(true);
      }
      const madeAt = (itemId: string) => {
        const [recipe] = producers(itemId);
        return worldMap.landmarks.filter((l) => getTileSelection(l.x, l.y).resources.includes(recipe!)).map((l) => l.id);
      };
      expect(madeAt("item_filter_respirator")).toEqual(["landmark_apothecary"]);
      expect(madeAt("item_spore_glass")).toEqual(["landmark_kiln"]);
      for (const id of ["item_mycelium_leather", "item_spine_bow", "item_mycelium_jerkin", "item_mycelium_boots", "item_mycelium_gloves"]) {
        expect(madeAt(id), id).toEqual(["landmark_tanning_rack"]);
      }
      for (const id of ["item_iron_axe", "item_chitin_axe", "item_chitin_pick", "item_chitin_blade", "item_chitin_cuirass", "item_chitin_greaves"]) {
        expect(madeAt(id), id).toEqual(["landmark_forge"]);
      }
      const respirator = resourcesById.get(producers("item_filter_respirator")[0]!)!.required_items.map((r) => r.item_id);
      expect(respirator).toContain("item_spore_glass");
      expect(resourcesById.get(producers("item_spore_glass")[0]!)!.required_items.map((r) => r.item_id)).toEqual(
        expect.arrayContaining(["item_glass", "item_spore_resin"])
      );
      for (const id of ["item_chitin_blade", "item_spine_bow", "item_mycelium_jerkin", ...chitin]) expect(have.has(id), id).toBe(true);
      const inputs = new Set(recipes.flatMap((id) => resourcesById.get(id)!.required_items.map((r) => r.item_id)));
      for (const id of onBloom.monsters) {
        const drops = monstersById.get(id)!.drops.map((d) => d.item_id);
        expect(drops.some((d) => inputs.has(d)), id).toBe(true);
      }
    });

    it("gives tier-4 armour the first real magic defence", () => {
      const magic = (kit: string[]) => kit.reduce((sum, id) => sum + itemsById.get(id)!.defence!.magic, 0);
      expect(magic(chitin)).toBeGreaterThanOrEqual(2 * magic(wardenKit));
      for (const id of chitin) expect(itemsById.get(id)!.defence!.magic, id).toBeGreaterThanOrEqual(16);
      const tier5 = (id: string) => producers(id).some((r) => !beforeHeart(r));
      const earlier = items.filter((i) => i.defence && !chitin.includes(i.id) && i.id !== "item_mycelium_jerkin" && !tier5(i.id));
      for (const item of earlier) expect(item.defence!.magic, item.id).toBeLessThanOrEqual(32);
      expect(earlier.filter((i) => i.defence!.magic > 14).map((i) => i.id)).toEqual(["item_warden_mail"]);
      expect(weapon("item_chitin_blade").damage).toBeGreaterThan(weapon("item_warden_blade").damage);
      const [bow, crossbow] = [weapon("item_spine_bow"), weapon("item_crossbow")];
      expect(bow.damage / bow.speed).toBeGreaterThan(crossbow.damage / crossbow.speed);
    });

    it("opens after the Wardens' focus, gets the player into the Bloom and ends at the growing pit", () => {
      expect(walkStory(beforeBloom).filter((id) => insideTheRing.includes(id))).toEqual([]);
      const done = walkStory(open);
      expect([...done].sort()).toEqual(story.filter((q) => !endgameStory.includes(q.id)).map((q) => q.id).sort());
      const before = (a: string, b: string) => expect(done.indexOf(a), `${a} before ${b}`).toBeLessThan(done.indexOf(b));
      before("quest_the_wardstone_focus", "quest_inside_the_ring");
      before("quest_inside_the_ring", "quest_something_better_than_either");
      before("quest_what_the_ground_keeps", "quest_something_better_than_either");
      const byId = new Map(story.map((q) => [q.id, q]));
      const [ring, better] = bloomStory.map((id) => byId.get(id)!);
      expect(ring!.giver.entity_id).toBe("npc_ansel_morrow");
      expect(better!.giver.entity_id).toBe("npc_tam_reedsdaughter");
      expect(ring!.objectives.some((o) => o.type === "explore" && o.landmark === "landmark_fourth_stone")).toBe(true);
      const crafts = better!.objectives.flatMap((o) => (o.type === "craft" ? [o.resource_id] : []));
      expect(crafts).toEqual(
        expect.arrayContaining(["resource_crafting_item_filter_respirator", "resource_crafting_item_chitin_axe"])
      );
      const explores = better!.objectives.filter((o) => o.type === "explore");
      expect(explores.at(-1)).toMatchObject({ landmark: "landmark_growing_pit" });
      for (const quest of [ring!, better!]) expect(quest.objectives.some((o) => o.type === "collect"), quest.id).toBe(false);
    });

    it("sets the tier-4 fights up at about 40 health each in tier-4 gear, spores included, and the best tier-3 kit pays noticeably more", () => {
      const tier3 = ["item_iron_sword", "item_warden_blade", "item_crossbow", "item_wardstone_focus"].map(weapon);
      const intended = [
        ["monster_host", "item_chitin_blade"],
        ["monster_host_cluster", "item_sporecraft_wand"],
        ["monster_colonised_elk", "item_spine_bow"],
        ["monster_spore_moths", "item_spine_bow"],
      ] as const;
      const bloomField = bloom.find(({ tile }) => !tile.landmark && !tile.effects.length)!;
      const drainPerMs = (equipped: string[]) => {
        const { effective, effect } = spores(bloomField, equipped);
        return effective / (effect.kind === "health" ? effect.interval : 1);
      };
      for (const [id, answer] of intended) {
        const monster = monstersById.get(id)!;
        const good = fight(id, weapon(answer), chitin);
        const withSpores = good.taken + Math.floor(good.takes * drainPerMs([...chitin, answer]));
        expect(good.wins, id).toBe(true);
        expect(good.taken, id).toBeGreaterThanOrEqual(36);
        expect(withSpores, id).toBeLessThanOrEqual(48);
        expect(good.takes, id).toBeGreaterThanOrEqual(10_000);
        expect(good.takes, id).toBeLessThanOrEqual(16_000);
        expect(good.takes, id).toBeLessThan(monster.respawnTime * 1000 * 0.2);
        const tier3Fights = tier3.map((w) => fight(id, w, wardenKit)).filter((f) => f.wins);
        expect(tier3Fights.length, id).toBeGreaterThan(0);
        const cheapest = Math.min(...tier3Fights.map((f) => f.taken + Math.floor(f.takes * drainPerMs(wardenKit))));
        expect(cheapest, id).toBeGreaterThanOrEqual(withSpores * 1.4);
        expect(cheapest, id).toBeLessThan(BASE_USER.h);
        for (const other of ["item_chitin_blade", "item_spine_bow", "item_sporecraft_wand", "item_wardstone_focus"].filter((w) => w !== answer)) {
          const f = fight(id, weapon(other), chitin);
          expect(f.wins && f.taken <= good.taken, `${id} with ${other}`).toBe(false);
        }
      }
      expect(monstersById.get("monster_host")!.drops.map((d) => d.item_id)).toContain("item_grey_threads");
    });

    it("posts Bloom contracts on the holdfast's board, held back until the player has been inside the ring", () => {
      const holdfast = quests.filter((q) => q.kind === "contract" && q.board === "landmark_holdfast");
      const scoped = holdfast.filter((q) => q.objectives.some((o) => "region" in o && o.region === "bloom"));
      expect(scoped.length).toBeGreaterThanOrEqual(2);
      expect(scoped.length).toBeLessThanOrEqual(3);
      for (const contract of holdfast) {
        const regions = new Set(contract.objectives.map((o) => ("region" in o ? o.region : undefined)));
        expect(regions.size, contract.id).toBe(1);
        expect(["wardline", "bloom"], contract.id).toContain([...regions][0]);
      }
      for (const contract of scoped) {
        expect(contract.prerequisites, contract.id).toContain("quest_inside_the_ring");
        for (const o of contract.objectives) {
          if (o.type === "kill") expect(onBloom.monsters.has(o.monster_id), contract.id).toBe(true);
          if (o.type === "gather") expect(onBloom.resources.has(o.resource_id), contract.id).toBe(true);
        }
      }
      expect(holdfast.length).toBeLessThanOrEqual(6);
      const posted = postContracts(
        quests.filter((q) => q.kind === "contract"),
        contractWindow(Date.UTC(2026, 8, 24))
      );
      expect(posted.filter((c) => holdfast.some((h) => h.id === c.id))).toHaveLength(holdfast.length);
    });
  });

  describe("sporecraft and the hybrids", () => {
    const bloom = cellsIn("bloom");
    const open = contents(cellsIn("landing", "southwood", "scarp", "sinks", "wardline", "bloom"));
    const chitin = ["item_filter_respirator", "item_chitin_cuirass", "item_chitin_greaves", "item_mycelium_boots", "item_mycelium_gloves"];
    const landmark = (id: string) => worldMap.landmarks.find((l) => l.id === id)!;
    const tincture = () => {
      const { id: effect_id, strength, duration } = itemsById.get("item_spore_tincture")!.effects![0]!;
      return [{ user_id: "u", item_id: "item_spore_tincture", effect_id, strength, started_at: 0, expires_at: duration * 1000 }];
    };
    const resolved = (at: { x: number; y: number }, equipped: string[] = [], drank = false) =>
      resolveEffects(collectEffects(at, equipped, drank ? tincture() : [], 0));
    const spores = (at: { x: number; y: number }, equipped: string[] = [], drank = false) =>
      resolved(at, equipped, drank).find((e) => e.effect.id === "effect_spores")?.effective ?? 0;
    const rate = (at: { x: number; y: number }, equipped: string[] = [], drank = false) =>
      healthRate(resolved(at, equipped, drank), { fighting: false, online: true });
    const producers = (itemId: string) =>
      resources.filter((r) => r.reward_items.some((i) => i.item_id === itemId)).map((r) => r.id);
    const wand = "item_sporecraft_wand";
    const pitRecipes = ["resource_crafting_item_sporecraft_wand", "resource_crafting_item_thread_balm"];

    it("grows sporecraft only at the growing pit, and only with the dibber Gill gives", () => {
      expect([...stationRecipes("landmark_growing_pit").filter(beforeHeart)].sort()).toEqual(pitRecipes);
      for (const id of pitRecipes) {
        const recipe = resourcesById.get(id)!;
        expect(recipe.type, id).toBe("growing_pit");
        expect(recipe.required_items.filter((r) => !r.consumed).map((r) => r.item_id), id).toEqual(["item_chitin_dibber"]);
        for (const other of worldMap.landmarks.filter((l) => l.id !== "landmark_growing_pit")) {
          expect(getTileSelection(other.x, other.y).resources, `${id} at ${other.id}`).not.toContain(id);
        }
      }
      expect(producers("item_chitin_dibber")).toEqual([]);
      const givers = story.filter((q) => q.rewards.some((r) => r.type === "item" && r.item_id === "item_chitin_dibber"));
      expect(givers.map((q) => q.id)).toEqual(["quest_grow_dont_cut"]);
      expect(givers[0]!.giver.entity_id).toBe("npc_gill");
      expect(obtainable(open).has(wand)).toBe(false);
      const have = obtainable(open, ["item_chitin_dibber"]);
      for (const id of [wand, "item_thread_balm"]) expect(have.has(id), id).toBe(true);
      const inputs = resourcesById.get(producers(wand)[0]!)!.required_items.map((r) => r.item_id);
      expect(inputs).toEqual(
        expect.arrayContaining(["item_threaded_heartwood", "item_grey_threads", "item_spore_resin", "item_chitin"])
      );
      const beforeBloom = obtainable(contents(cellsIn("landing", "southwood", "scarp", "sinks", "wardline")), ["item_chitin_dibber"]);
      expect(beforeBloom.has(wand)).toBe(false);
    });

    it("makes the wand stronger than the focus, at the cost of a little spores wherever it's carried", () => {
      const [grown, focus] = [weapon(wand), weapon("item_wardstone_focus")];
      expect(grown.style).toBe("magic");
      expect(grown.damage / grown.speed).toBeGreaterThan((focus.damage / focus.speed) * 1.25);
      const worn = itemsById.get(wand)!.wornEffects!;
      expect(worn).toEqual([{ id: "effect_spores", strength: 0.5 }]);
      expect(worn[0]!.strength).toBeLessThan(worldMap.regions.find((r) => r.id === "wardline")!.effects[0]!.strength);
      expect(itemsById.get("item_wardstone_focus")!.wornEffects).toBeUndefined();
    });

    it("adds to the Bloom's spores under any protection, and never lets them reach zero", () => {
      for (const cell of bloom) {
        const at = `${cell.x},${cell.y}`;
        for (const kit of [[], ["item_waxed_mask"], ["item_filter_respirator"]]) {
          for (const drank of [false, true]) {
            const withWand = spores(cell, [...kit, wand], drank);
            expect(withWand, at).toBeGreaterThan(spores(cell, kit, drank));
            expect(withWand, at).toBeGreaterThan(0);
            expect(rate(cell, [...kit, wand], drank), at).toBeLessThan(0);
          }
        }
      }
    });

    it("drains even outside the ring and stops natural healing, but every fire still heals you", () => {
      const field = cellsIn("landing").find(({ tile }) => !tile.landmark)!;
      expect(spores(field)).toBe(0);
      expect(rate(field)).toBeGreaterThan(0);
      for (const kit of [[wand], [wand, "item_filter_respirator"]]) {
        expect(spores(field, kit), kit.join()).toBeGreaterThan(0);
        expect(rate(field, kit), kit.join()).toBeLessThan(0);
      }
      const fires = worldMap.landmarks.filter((l) => getTileSelection(l.x, l.y).effects.some((e) => e.id === "effect_rest"));
      expect(fires.map((l) => l.id)).toEqual(expect.arrayContaining(["landmark_camp", "landmark_holdfast", "landmark_apothecary"]));
      for (const fire of fires) {
        expect(rate(fire, [wand]), fire.id).toBeGreaterThan(0);
        expect(rate(fire, [wand]), fire.id).toBeLessThan(rate(fire));
      }
    });

    it("sets the wand against the host-cluster: about 40 health, well ahead of the focus, without being the answer elsewhere", () => {
      const field = bloom.find(({ tile }) => !tile.landmark && !tile.effects.length)!;
      const drain = (equipped: string[]) => spores(field, equipped) / 5000;
      const withSpores = (f: ReturnType<typeof fight>, equipped: string[]) => f.taken + Math.floor(f.takes * drain(equipped));
      const grown = fight("monster_host_cluster", weapon(wand), chitin);
      const pressed = fight("monster_host_cluster", weapon("item_wardstone_focus"), chitin);
      const grownCost = withSpores(grown, [...chitin, wand]);
      const pressedCost = withSpores(pressed, chitin);
      expect(grown.wins).toBe(true);
      expect(grownCost).toBeGreaterThanOrEqual(36);
      expect(grownCost).toBeLessThanOrEqual(48);
      expect(grown.takes).toBeGreaterThanOrEqual(10_000);
      expect(grown.takes).toBeLessThanOrEqual(16_000);
      expect(pressed.wins).toBe(true);
      expect(pressedCost).toBeGreaterThanOrEqual(grownCost + 8);
      expect(pressed.takes).toBeGreaterThan(grown.takes);
      const answers = { monster_host: "item_chitin_blade", monster_colonised_elk: "item_spine_bow", monster_spore_moths: "item_spine_bow" };
      for (const [id, answer] of Object.entries(answers)) {
        const f = fight(id, weapon(wand), chitin);
        expect(f.wins && f.taken <= fight(id, weapon(answer), chitin).taken, id).toBe(false);
      }
    });

    it("grows a balm that heals harder than comfrey and leaves some of the Bloom behind", () => {
      const balm = itemsById.get("item_thread_balm")!.effects!;
      const comfrey = itemsById.get("item_comfrey_salve")!.effects!;
      const heal = (effects: typeof balm) => effects.find((e) => e.id === "effect_rest" && e.duration === 0)!.strength;
      expect(heal(balm)).toBeGreaterThan(heal(comfrey));
      const cost = balm.find((e) => e.id === "effect_spores")!;
      expect(cost.duration).toBeGreaterThan(0);
      expect(cost.strength * (cost.duration / 5)).toBeLessThan(heal(balm) - heal(comfrey) + 20);
    });

    it("walks Gill's offer, the cousin reveal and the reckoning's middle in order, ending at the wall round the Heart", () => {
      const done = walkStory(open);
      for (const id of sporecraftStory) expect(done, id).toContain(id);
      const before = (a: string, b: string) => expect(done.indexOf(a), `${a} before ${b}`).toBeLessThan(done.indexOf(b));
      before("quest_something_better_than_either", "quest_ask_their_name");
      before("quest_ask_their_name", "quest_grow_dont_cut");
      before("quest_grow_dont_cut", "quest_the_sporecraft_wand");
      before("quest_grow_dont_cut", "quest_davy_reeds_song");
      before("quest_davy_reeds_song", "quest_over_the_ring");
      before("quest_over_the_ring", "quest_a_line_recut");
      before("quest_the_sporecraft_wand", "quest_a_line_recut");
      before("quest_the_sporecraft_wand", "quest_the_offer");
      before("quest_davy_reeds_song", "quest_the_offer");
      const byId = new Map(story.map((q) => [q.id, q]));
      const quest = (id: string) => byId.get(id)!;
      expect(quest("quest_ask_their_name").prerequisites).toEqual(["quest_something_better_than_either"]);
      for (const id of ["quest_ask_their_name", "quest_grow_dont_cut", "quest_the_sporecraft_wand", "quest_the_offer"]) {
        expect(quest(id).giver.entity_id, id).toBe("npc_gill");
      }
      expect(quest("quest_ask_their_name").completion.entity_id).toBe("npc_tam_reedsdaughter");
      expect(quest("quest_the_sporecraft_wand").objectives).toContainEqual(
        expect.objectContaining({ type: "craft", resource_id: "resource_crafting_item_sporecraft_wand" })
      );

      const song = quest("quest_davy_reeds_song");
      expect(song.giver.entity_id).toBe("npc_tam_reedsdaughter");
      const speakers = new Set(song.objectives.flatMap((o) => (o.type === "talk" ? o.dialog_steps.map((d) => d.entity_id) : [])));
      expect(speakers).toEqual(new Set(["npc_tam_reedsdaughter", "npc_gill", null]));
      expect(song.completion).toMatchObject({ entity_id: "npc_tam_reedsdaughter", landmark: "landmark_growing_pit" });

      expect(quest("quest_over_the_ring").giver.entity_id).toBe("npc_old_wick");
      expect(quest("quest_over_the_ring").objectives).toContainEqual(
        expect.objectContaining({ type: "talk", entity_id: "npc_tam_reedsdaughter", landmark: "landmark_sixth_stone" })
      );
      const recut = quest("quest_a_line_recut");
      expect(recut.giver.entity_id).toBe("npc_ansel_morrow");
      expect(recut.objectives).toContainEqual(expect.objectContaining({ type: "explore", landmark: "landmark_sixth_stone" }));

      const offer = quest("quest_the_offer");
      expect(offer.objectives).toContainEqual(expect.objectContaining({ type: "explore", landmark: "landmark_threaded_wall" }));
      const wall = landmark("landmark_threaded_wall");
      expect(getTileSelection(wall.x, wall.y)).toMatchObject({ accessible: true, region: expect.objectContaining({ id: "bloom" }) });
      const around = [[0, -1], [0, 1], [-1, 0], [1, 0]].map(([dx, dy]) => getTileSelection(wall.x + dx!, wall.y + dy!));
      expect(around.filter((cell) => cell.region?.id === "heart").map((cell) => [cell.landmark, cell.accessible])).toEqual([
        ["landmark_the_parting", true],
      ]);
      for (const q of [recut, offer]) {
        const lines = q.objectives.flatMap((o) => (o.type === "talk" ? o.dialog_steps.map((d) => d.dialog) : []));
        expect(lines.some((line) => /\bthe Heart\b/i.test(line)), q.id).toBe(true);
      }
      for (const id of sporecraftStory) {
        expect(quest(id).objectives.some((o) => o.type === "collect"), id).toBe(false);
        expect(quest(id).objectives.some((o) => o.type === "explore" && o.landmark && getTileSelection(landmark(o.landmark).x, landmark(o.landmark).y).region?.id === "heart"), id).toBe(false);
      }
    });

    it("posts the hybrids' own work on a board at the growing pit, scoped to the Bloom", () => {
      const pit = quests.filter((q) => q.kind === "contract" && q.board === "landmark_growing_pit");
      expect(boardLandmarks.has("landmark_growing_pit")).toBe(true);
      expect(pit.length).toBeGreaterThanOrEqual(3);
      expect(pit.length).toBeLessThanOrEqual(6);
      for (const contract of pit) {
        expect(contract.objectives.map((o) => ("region" in o ? o.region : undefined)), contract.id).toEqual(contract.objectives.map(() => "bloom"));
        expect(contract.prerequisites, contract.id).toContain("quest_ask_their_name");
        expect(contract.objectives.some((o) => o.type === "kill"), contract.id).toBe(false);
      }
      const holdfast = quests.filter((q) => q.kind === "contract" && q.board === "landmark_holdfast");
      const posted = postContracts(
        quests.filter((q) => q.kind === "contract"),
        contractWindow(Date.UTC(2026, 8, 24))
      );
      expect(posted.filter((c) => pit.some((p) => p.id === c.id))).toHaveLength(pit.length);
      expect(posted.filter((c) => holdfast.some((h) => h.id === c.id))).toHaveLength(holdfast.length);
    });
  });

  describe("the Heart", () => {
    const heart = cellsIn("heart");
    const onHeart = contents(heart);
    const bloom = cellsIn("bloom");
    const beforeHeartCells = contents(cellsIn("landing", "southwood", "scarp", "sinks", "wardline", "bloom"));
    const open = contents([...allCells()]);
    const tools = ["item_chitin_dibber", "item_wardens_stylus"];
    const heartKit = ["item_wardens_respirator", "item_heartshell_cuirass", "item_heartshell_greaves", "item_mycelium_boots", "item_mycelium_gloves"];
    const chitin = ["item_filter_respirator", "item_chitin_cuirass", "item_chitin_greaves", "item_mycelium_boots", "item_mycelium_gloves"];
    const grown = ["monster_grown_thresher", "monster_grown_slinger", "monster_grown_singer"];
    const heartWeapons = ["item_heartshell_blade", "item_grown_sinew_bow", "item_humming_staff"];
    const bloomWeapons = ["item_chitin_blade", "item_spine_bow", "item_sporecraft_wand", "item_wardstone_focus"];
    const heartRecipes = heartWeapons
      .concat("item_heartshell_cuirass", "item_heartshell_greaves", "item_wardens_respirator")
      .map((id) => `resource_crafting_${id}`);
    const keystoneRecipes = ["resource_crafting_item_keystone_chip", "resource_crafting_item_unpicked_spur"];
    const landmark = (id: string) => worldMap.landmarks.find((l) => l.id === id)!;
    const neighbours = ({ x, y }: { x: number; y: number }) =>
      [[0, -1], [0, 1], [-1, 0], [1, 0]]
        .map(([dx, dy]) => ({ x: x + dx!, y: y + dy! }))
        .filter(({ x, y }) => x >= worldMap.bounds.minX && x <= worldMap.bounds.maxX && y >= worldMap.bounds.minY && y <= worldMap.bounds.maxY)
        .map(({ x, y }) => ({ x, y, tile: getTileSelection(x, y) }));
    /** Shortest walk between two cells over open ground, as a list of the cells stepped on. */
    const walk = (from: { x: number; y: number }, to: { x: number; y: number }) => {
      const key = (p: { x: number; y: number }) => `${p.x},${p.y}`;
      const came = new Map<string, { x: number; y: number } | null>([[key(from), null]]);
      for (const queue = [from]; queue.length; ) {
        const at = queue.shift()!;
        if (key(at) === key(to)) break;
        for (const next of neighbours(at)) {
          if (!next.tile.accessible || came.has(key(next))) continue;
          came.set(key(next), at);
          queue.push(next);
        }
      }
      const path = [];
      for (let at: { x: number; y: number } | null | undefined = to; at; at = came.get(key(at))) path.unshift(at);
      return path[0] && key(path[0]) === key(from) ? path : [];
    };
    const tincture = () => {
      const { id: effect_id, strength, duration } = itemsById.get("item_spore_tincture")!.effects![0]!;
      return [{ user_id: "u", item_id: "item_spore_tincture", effect_id, strength, started_at: 0, expires_at: duration * 1000 }];
    };
    const resolved = (at: { x: number; y: number }, equipped: string[] = [], drank = false) =>
      resolveEffects(collectEffects(at, equipped, drank ? tincture() : [], 0));
    const spores = (at: { x: number; y: number }, equipped: string[] = [], drank = false) =>
      resolved(at, equipped, drank).find((e) => e.effect.id === "effect_spores")?.effective ?? 0;
    const producers = (itemId: string) =>
      resources.filter((r) => r.reward_items.some((i) => i.item_id === itemId)).map((r) => r.id);
    const field = heart.find(({ tile }) => !tile.landmark && !tile.effects.length)!;
    const bloomField = bloom.find(({ tile }) => !tile.landmark && !tile.effects.length)!;
    const withSpores = (f: ReturnType<typeof fight>, equipped: string[], at = field) =>
      f.taken + Math.floor((f.takes * spores(at, equipped)) / 5000);

    it("is ringed by the Threaded Wall with the Parting its only way in, and no placeholder is left on the map", () => {
      expect(tileTypes.filter((t) => t.id.startsWith("tile_uncharted"))).toEqual([]);
      const closed = [...allCells()].filter(({ tile }) => !tile.accessible);
      for (const { x, y, tile } of closed) {
        expect(tile.id, `${x},${y}`).toBe("tile_heart_rim");
        expect(tile.region!.id, `${x},${y}`).toBe("heart");
      }
      const inside = heart.filter(({ tile }) => tile.accessible);
      const doors = inside.filter((cell) => neighbours(cell).some((n) => n.tile.region!.id !== "heart"));
      expect(doors.map((c) => c.tile.landmark)).toEqual(["landmark_the_parting"]);
      const outside = neighbours(doors[0]!).filter((n) => n.tile.region!.id !== "heart");
      expect(outside.map((n) => n.tile.landmark)).toEqual(["landmark_threaded_wall"]);
      for (const cell of inside) expect(walk(START_POSITION, cell).length, `${cell.x},${cell.y}`).toBeGreaterThan(0);
      expect(inside.length).toBeGreaterThanOrEqual(12);
      expect(inside.length).toBeLessThanOrEqual(24);
      expect(worldMap.regions.find((r) => r.id === "heart")).toMatchObject({ tier: 5, effects: [{ id: "effect_spores", strength: 4 }] });
      const fill = worldMap.regions.find((r) => r.id === "heart")!.tiles;
      expect(fill.length).toBeGreaterThanOrEqual(2);
      for (const { tile, x, y } of inside) {
        if (tile.landmark) continue;
        expect(tile.monsters.length, `${x},${y}`).toBeGreaterThan(0);
      }
    });

    it("has nothing to gather: tier-5 materials only drop from the Heart's own monsters", () => {
      for (const { tile, x, y } of heart) {
        const gathered = tile.resources.filter((id) => resourcesById.get(id)!.type === "resource");
        expect(gathered, `${x},${y}`).toEqual([]);
      }
      for (const id of heartMaterials) {
        expect(producers(id), id).toEqual([]);
        const droppers = monsters.filter((m) => m.drops.some((d) => d.item_id === id)).map((m) => m.id);
        expect(droppers.length, id).toBeGreaterThan(0);
        for (const m of droppers) expect(onHeart.monsters.has(m), `${m} drops ${id}`).toBe(true);
        expect(obtainable(beforeHeartCells, tools).has(id), id).toBe(false);
      }
      for (const id of onHeart.monsters) expect(beforeHeartCells.monsters.has(id), id).toBe(false);
    });

    it("keeps the Grown, one per style, the Heart-warden at the Keepers' Camp, and Hollow at the Threadwell", () => {
      expect([...onHeart.monsters].sort()).toEqual([...grown, "monster_heart_warden"].sort());
      expect(grown.map((id) => monstersById.get(id)!.attack.style).sort()).toEqual(["magic", "melee", "ranged"]);
      const places = [...onHeart.landmarks].filter((id) => !id.startsWith("landmark_heart_rim"));
      expect(places.sort()).toEqual(["landmark_keepers_camp", "landmark_keystone", "landmark_the_parting", "landmark_threadwell"]);
      const wardenCells = heart.filter(({ tile }) => tile.monsters.includes("monster_heart_warden"));
      expect(wardenCells.map((c) => [c.tile.landmark, c.tile.monsters.length])).toEqual([["landmark_keepers_camp", 1]]);
      const warden = monstersById.get("monster_heart_warden")!;
      for (const id of grown) {
        const m = monstersById.get(id)!;
        expect(warden.health, id).toBeGreaterThanOrEqual(m.health * 1.8);
        expect(warden.respawnTime, id).toBeGreaterThanOrEqual(m.respawnTime * 3);
      }
      expect(npcsAtHome("landmark_threadwell").map((n) => n.entity_id)).toEqual(["npc_hollow"]);
      const hollow = npcs.find((n) => n.entity_id === "npc_hollow")!;
      expect(hollow.faction).toBe("hybrids");
      expect(hollow.idleLine).toBeTruthy();
      const mentions = quests.filter((q) => JSON.stringify(q).includes("npc_hollow")).map((q) => q.id);
      expect(mentions.every((id) => endgameStory.includes(id))).toBe(true);
      const threadwell = landmark("landmark_threadwell");
      const keystone = landmark("landmark_keystone");
      expect(Math.abs(threadwell.x - keystone.x) + Math.abs(threadwell.y - keystone.y)).toBe(1);
    });

    it("drains harder than anywhere else, and no respirator, tincture or mix of them stops it, with a wand or staff on top", () => {
      const heads = [[], ["item_waxed_mask"], ["item_filter_respirator"], ["item_wardens_respirator"]];
      const held = [[], ["item_sporecraft_wand"], ["item_humming_staff"]];
      const bloomBest = Math.max(...bloom.map((cell) => spores(cell, ["item_filter_respirator"], true)));
      for (const cell of heart.filter(({ tile }) => tile.accessible)) {
        const at = `${cell.x},${cell.y}`;
        expect(resolved(cell).find((e) => e.effect.id === "effect_spores")!.strength, at).toBeGreaterThanOrEqual(4);
        for (const head of heads) {
          for (const hand of held) {
            for (const drank of [false, true]) {
              const kit = [...head, ...hand];
              expect(spores(cell, kit, drank), `${at} ${kit.join()} ${drank}`).toBeGreaterThan(0);
              expect(healthRate(resolved(cell, kit, drank), { fighting: false, online: true }), at).toBeLessThan(0);
              if (hand.length) expect(spores(cell, kit, drank), at).toBeGreaterThan(spores(cell, head, drank));
            }
          }
        }
        expect(spores(cell, ["item_wardens_respirator"]), at).toBeLessThan(spores(cell, ["item_filter_respirator"]));
        expect(spores(cell, ["item_wardens_respirator"], true), at).toBeGreaterThan(bloomBest);
        expect(spores(cell, ["item_wardens_respirator"], true), at).toBeGreaterThan(spores(cell) / 5);
      }
      const well = landmark("landmark_threadwell");
      expect(spores(well, ["item_wardens_respirator"])).toBeGreaterThan(spores(field, ["item_wardens_respirator"]));
      expect(itemsById.get("item_wardens_respirator")).toMatchObject({ equipSlot: "head", wornEffects: [{ id: "effect_spore_ward", strength: 240 }] });
    });

    it("makes every tier-5 recipe from Heart drops at the station that fits it, behind the stylus and the dibber", () => {
      const onStations = worldMap.landmarks.flatMap((l) => getTileSelection(l.x, l.y).resources).filter((id) => !beforeHeart(id));
      expect([...new Set(onStations)].sort()).toEqual([...heartRecipes, ...keystoneRecipes].sort());
      const madeAt = (recipe: string) =>
        worldMap.landmarks.filter((l) => getTileSelection(l.x, l.y).resources.includes(recipe)).map((l) => l.id);
      expect(madeAt("resource_crafting_item_heartshell_blade")).toEqual(["landmark_forge"]);
      expect(madeAt("resource_crafting_item_heartshell_cuirass")).toEqual(["landmark_forge"]);
      expect(madeAt("resource_crafting_item_heartshell_greaves")).toEqual(["landmark_forge"]);
      expect(madeAt("resource_crafting_item_grown_sinew_bow")).toEqual(["landmark_tanning_rack"]);
      expect(madeAt("resource_crafting_item_humming_staff")).toEqual(["landmark_growing_pit"]);
      expect(madeAt("resource_crafting_item_wardens_respirator")).toEqual(["landmark_camps_edge"]);
      const needs = (recipe: string) => resourcesById.get(recipe)!.required_items.filter((r) => !r.consumed).map((r) => r.item_id);
      expect(needs("resource_crafting_item_humming_staff")).toEqual(["item_chitin_dibber"]);
      expect(needs("resource_crafting_item_wardens_respirator")).toEqual(["item_wardens_stylus"]);
      const have = obtainable(open, tools);
      for (const recipe of heartRecipes) {
        const { reward_items } = resourcesById.get(recipe)!;
        expect(have.has(reward_items[0]!.item_id), recipe).toBe(true);
      }
      expect(obtainable(open).has("item_humming_staff")).toBe(false);
      expect(obtainable(open).has("item_wardens_respirator")).toBe(false);
      const inputs = new Set(heartRecipes.flatMap((id) => resourcesById.get(id)!.required_items.map((r) => r.item_id)));
      for (const id of onHeart.monsters) {
        expect(monstersById.get(id)!.drops.some((d) => inputs.has(d.item_id)), id).toBe(true);
      }
      expect(resourcesById.get("resource_crafting_item_wardens_respirator")!.required_items.map((r) => r.item_id)).toContain("item_cracked_wardens_respirator");
      expect(monstersById.get("monster_heart_warden")!.drops).toContainEqual({ item_id: "item_cracked_wardens_respirator", qty: 1, chance: 1 });
    });

    it("gives Heart-grown weapons and armour a clear edge over tier 4", () => {
      const dps = (id: string) => weapon(id).damage / weapon(id).speed;
      for (const id of heartWeapons) {
        const style = weapon(id).style;
        for (const old of bloomWeapons.filter((w) => weapon(w).style === style)) {
          expect(dps(id), `${id} over ${old}`).toBeGreaterThan(dps(old) * 1.15);
        }
      }
      expect(itemsById.get("item_humming_staff")!.wornEffects).toEqual([{ id: "effect_spores", strength: 0.5 }]);
      const sum = (kit: string[], style: "melee" | "ranged" | "magic") => kit.reduce((n, id) => n + itemsById.get(id)!.defence![style], 0);
      for (const style of ["melee", "ranged", "magic"] as const) {
        expect(sum(heartKit, style), style).toBeGreaterThan(sum(chitin, style) * 1.2);
      }
    });

    it("sets each of the Grown at about 40 health in tier-5 gear, spores included, and makes the best tier-4 kit pay clearly more", () => {
      const intended = {
        monster_grown_thresher: "item_grown_sinew_bow",
        monster_grown_slinger: "item_heartshell_blade",
        monster_grown_singer: "item_humming_staff",
      };
      for (const [id, answer] of Object.entries(intended)) {
        const monster = monstersById.get(id)!;
        const good = fight(id, weapon(answer), heartKit);
        const cost = withSpores(good, [...heartKit, answer]);
        expect(good.wins, id).toBe(true);
        expect(good.taken, id).toBeGreaterThanOrEqual(36);
        expect(cost, id).toBeLessThanOrEqual(48);
        expect(good.takes, id).toBeGreaterThanOrEqual(10_000);
        expect(good.takes, id).toBeLessThanOrEqual(16_000);
        expect(good.takes, id).toBeLessThan(monster.respawnTime * 1000 * 0.2);
        for (const other of heartWeapons.filter((w) => w !== answer)) {
          const f = fight(id, weapon(other), heartKit);
          expect(f.wins && f.taken <= good.taken, `${id} with ${other}`).toBe(false);
        }
        const tier4 = bloomWeapons
          .map((w) => ({ w, f: fight(id, weapon(w), chitin) }))
          .filter(({ f }) => f.wins)
          .map(({ w, f }) => withSpores(f, [...chitin, w]));
        expect(tier4.length, id).toBeGreaterThan(0);
        expect(Math.min(...tier4), id).toBeGreaterThanOrEqual(cost * 1.4);
        expect(Math.min(...tier4), id).toBeLessThan(BASE_USER.h);
      }
    });

    it("makes the Heart-warden a real fight for tier-5 gear that tier-4 gear loses, and leaves enough health to walk out", () => {
      const warden = monstersById.get("monster_heart_warden")!;
      const camp = landmark("landmark_keepers_camp");
      const out = walk(camp, landmark("landmark_holdfast"));
      expect(out.length).toBeGreaterThan(0);
      const walkingDrain = (kit: string[]) =>
        out.slice(1).reduce((sum, cell) => sum + (3000 * Math.max(0, -healthRate(resolved(cell, kit), { fighting: false, online: true }))), 0);
      for (const answer of heartWeapons) {
        const kit = [...heartKit, answer];
        const f = fight("monster_heart_warden", weapon(answer), heartKit);
        const cost = withSpores(f, kit, { x: camp.x, y: camp.y, tile: getTileSelection(camp.x, camp.y) });
        expect(f.wins, answer).toBe(true);
        expect(f.takes, answer).toBeGreaterThanOrEqual(30_000);
        expect(f.takes, answer).toBeLessThan(warden.respawnTime * 1000 * 0.1);
        expect(cost, answer).toBeGreaterThanOrEqual(60);
        expect(cost, answer).toBeLessThanOrEqual(90);
        expect(BASE_USER.h - cost - walkingDrain(kit), answer).toBeGreaterThan(5);
      }
      for (const w of bloomWeapons) expect(fight("monster_heart_warden", weapon(w), chitin).wins, w).toBe(false);
      expect(warden.attack.style).toBe("magic");
      expect(warden.respawnTime).toBeGreaterThanOrEqual(600);
    });

    describe("the endgame", () => {
      const byId = new Map(story.map((q) => [q.id, q]));
      const quest = (id: string) => byId.get(id)!;
      const lines = (id: string) =>
        quest(id).objectives.flatMap((o) => (o.type === "talk" ? o.dialog_steps.map((d) => d.dialog) : [])).join(" ");
      const [mend, brk] = ["quest_mend_the_first_line", "quest_break_the_first_line"];
      const [focus, seed] = ["item_keystone_focus", "item_heartseed_wand"];

      it("closes the Wardens' confession, the descendants' reckoning and the hybrids' offer in order, and none of it before the Heart", () => {
        expect(walkStory(beforeHeartCells).filter((id) => endgameStory.includes(id))).toEqual([]);
        const done = walkStory(open);
        for (const id of [...confession, ...reckoning, ...offer]) expect(done, id).toContain(id);
        const before = (a: string, b: string) => expect(done.indexOf(a), `${a} before ${b}`).toBeLessThan(done.indexOf(b));
        before("quest_a_line_recut", "quest_the_keepers_knot");
        before("quest_the_keepers_knot", "quest_at_wicks_gate");
        before("quest_at_wicks_gate", "quest_across_the_line");
        before("quest_the_offer", "quest_what_the_ground_wants");

        const knot = quest("quest_the_keepers_knot");
        expect(knot.giver.entity_id).toBe("npc_ansel_morrow");
        expect(knot.objectives).toContainEqual(expect.objectContaining({ type: "explore", landmark: "landmark_keepers_camp" }));
        expect(knot.objectives).toContainEqual(expect.objectContaining({ type: "kill", monster_id: "monster_heart_warden" }));
        expect(lines(knot.id)).toMatch(/Joss Wicken/);

        const gate = quest("quest_at_wicks_gate");
        expect(gate.completion.entity_id).toBe("npc_old_wick");
        expect(gate.objectives).toContainEqual(expect.objectContaining({ type: "explore", landmark: "landmark_seventh_stone" }));
        expect(gate.objectives).toContainEqual(
          expect.objectContaining({ type: "talk", entity_id: "npc_ansel_morrow", landmark: "landmark_holdfast" })
        );
        for (const told of [/Sister Edith/, /Sixth Stone/, /It was Gill/, /Joss Wicken/]) expect(lines(gate.id)).toMatch(told);

        const across = quest("quest_across_the_line");
        expect([across.giver.entity_id, across.completion.entity_id]).toEqual(["npc_old_wick", "npc_old_wick"]);
        for (const npc of ["npc_ansel_morrow", "npc_gill"]) {
          expect(across.objectives, npc).toContainEqual(
            expect.objectContaining({ type: "talk", entity_id: npc, landmark: "landmark_sixth_stone" })
          );
        }

        const ground = quest("quest_what_the_ground_wants");
        expect([ground.giver.entity_id, ground.completion.entity_id]).toEqual(["npc_gill", "npc_hollow"]);
        expect(ground.objectives).toContainEqual(expect.objectContaining({ type: "explore", landmark: "landmark_threadwell" }));
        for (const id of endgameStory) expect(quest(id).objectives.some((o) => o.type === "collect"), id).toBe(false);
      });

      it("puts the choice at the Keystone: mending takes the stylus, breaking the dibber", () => {
        const keystone = landmark("landmark_keystone");
        expect(getTileSelection(keystone.x, keystone.y).resources.sort()).toEqual([...keystoneRecipes].sort());
        const madeAt = (recipe: string) =>
          worldMap.landmarks.filter((l) => getTileSelection(l.x, l.y).resources.includes(recipe)).map((l) => l.id);
        const tools = (recipe: string) => resourcesById.get(recipe)!.required_items.filter((r) => !r.consumed).map((r) => r.item_id);
        for (const recipe of keystoneRecipes) expect(madeAt(recipe), recipe).toEqual(["landmark_keystone"]);
        expect(tools("resource_crafting_item_keystone_chip")).toEqual(["item_wardens_stylus"]);
        expect(tools("resource_crafting_item_unpicked_spur")).toEqual(["item_chitin_dibber"]);
        expect(quest(mend).objectives).toContainEqual(
          expect.objectContaining({ type: "craft", resource_id: "resource_crafting_item_keystone_chip" })
        );
        expect(quest(brk).objectives).toContainEqual(
          expect.objectContaining({ type: "craft", resource_id: "resource_crafting_item_unpicked_spur" })
        );
        for (const id of [mend, brk]) {
          expect(quest(id).prerequisites, id).toEqual(expect.arrayContaining(["quest_across_the_line", "quest_what_the_ground_wants"]));
        }
        expect([quest(mend).giver.entity_id, quest(brk).giver.entity_id]).toEqual(["npc_ansel_morrow", "npc_hollow"]);
        expect(quest(mend).excludes).toEqual([brk]);
        expect(quest(brk).excludes).toEqual([mend]);
        expect(story.filter((q) => q.excludes?.length).map((q) => q.id).sort()).toEqual([mend, brk].sort());
      });

      it("walks either branch to its epilogue from the open regions, but never both", () => {
        const mending = walkStory(open);
        for (const id of mendBranch) expect(mending, id).toContain(id);
        for (const id of breakBranch) expect(mending, id).not.toContain(id);
        const breaking = walkStory(open, [mend]);
        for (const id of breakBranch) expect(breaking, id).toContain(id);
        for (const id of mendBranch) expect(breaking, id).not.toContain(id);
        expect([...mending].sort()).toEqual(story.filter((q) => !breakBranch.includes(q.id)).map((q) => q.id).sort());
        expect([...breaking].sort()).toEqual(story.filter((q) => !mendBranch.includes(q.id)).map((q) => q.id).sort());
        expect(quest("quest_the_ring_holds").prerequisites).toEqual([mend]);
        expect(quest("quest_past_the_stones").prerequisites).toEqual([brk]);
        expect(quest("quest_past_the_stones").objectives).toContainEqual(
          expect.objectContaining({ type: "talk", entity_id: "npc_gill", landmark: "landmark_holdfast" })
        );
        expect(quest("quest_the_ring_holds").objectives).toContainEqual(
          expect.objectContaining({ type: "talk", entity_id: "npc_tam_reedsdaughter", landmark: "landmark_sixth_stone" })
        );
      });

      it("offers both sides until one is taken, then only that side's road", () => {
        const done = walkStory(open).filter((id) => ![...mendBranch, ...breakBranch].includes(id));
        const state = (extra: Array<[string, "in_progress" | "completed"]> = []) => ({
          quests: new Map(
            [...done.map((id) => [id, "completed"] as const), ...extra].map(([id, status]) => [
              id,
              { user_id: "u", quest_id: id, status, started_at: 0, completed_at: status === "completed" ? 1 : null },
            ])
          ),
          objectives: new Map(),
        });
        const offered = (s: ReturnType<typeof state>, at: string) => {
          const { x, y } = landmarkPoint(at)!;
          return selectZoneQuests(storyQuests, s, x, y).availableQuests.map((q) => q.id);
        };
        expect(offered(state(), "landmark_camps_edge")).toContain(mend);
        expect(offered(state(), "landmark_threadwell")).toContain(brk);

        const mending = state([[mend, "in_progress"]]);
        expect(offered(mending, "landmark_threadwell")).not.toContain(brk);
        const mended = state([[mend, "completed"]]);
        expect(offered(mended, "landmark_threadwell")).not.toContain(brk);
        expect(offered(mended, "landmark_growing_pit")).toEqual(["quest_the_ring_holds"]);

        const broken = state([[brk, "completed"]]);
        expect(offered(broken, "landmark_camps_edge")).not.toContain(mend);
        expect(offered(broken, "landmark_growing_pit")).toEqual(["quest_past_the_stones"]);
      });

      it("rewards each side with a tier-5 magic weapon of about the same power: warding clean, sporecraft stronger but breathing the Heart", () => {
        const rewardedBy = (itemId: string) =>
          story.filter((q) => q.rewards.some((r) => r.type === "item" && r.item_id === itemId)).map((q) => q.id);
        expect(rewardedBy(focus)).toEqual([mend]);
        expect(rewardedBy(seed)).toEqual([brk]);
        for (const id of [focus, seed]) {
          expect(producers(id), id).toEqual([]);
          expect(monsters.some((m) => m.drops.some((d) => d.item_id === id)), id).toBe(false);
          expect(weapon(id).style, id).toBe("magic");
        }
        expect(itemsById.get(focus)!.wornEffects ?? []).toEqual([]);
        expect(itemsById.get(seed)!.wornEffects).toEqual([{ id: "effect_spores", strength: 0.5 }]);
        const dps = (id: string) => weapon(id).damage / weapon(id).speed;
        expect(dps(focus)).toBeGreaterThan(dps("item_humming_staff"));
        expect(dps(seed)).toBeGreaterThan(dps(focus));
        expect(dps(seed)).toBeLessThan(dps(focus) * 1.15);
        expect(dps(focus)).toBeGreaterThan(dps("item_wardstone_focus") * 1.15);
      });

      it("makes the Keystone Focus the Singer's answer and a fair match for the Heart-Warden, but not for the Thresher or Slinger", () => {
        const cost = (monsterId: string, w: string, at = field) => withSpores(fight(monsterId, weapon(w), heartKit), [...heartKit, w], at);
        const singer = fight("monster_grown_singer", weapon(focus), heartKit);
        expect(singer.wins).toBe(true);
        expect(singer.takes).toBeLessThanOrEqual(fight("monster_grown_singer", weapon("item_humming_staff"), heartKit).takes);
        expect(cost("monster_grown_singer", focus)).toBeLessThanOrEqual(cost("monster_grown_singer", "item_humming_staff"));
        expect(cost("monster_grown_singer", focus)).toBeLessThanOrEqual(48);
        const answers = { monster_grown_thresher: "item_grown_sinew_bow", monster_grown_slinger: "item_heartshell_blade" };
        for (const [id, answer] of Object.entries(answers)) {
          expect(fight(id, weapon(focus), heartKit).wins, id).toBe(true);
          expect(cost(id, focus), id).toBeGreaterThan(cost(id, answer));
        }

        const camp = landmark("landmark_keepers_camp");
        const atCamp = { x: camp.x, y: camp.y, tile: getTileSelection(camp.x, camp.y) };
        const warden = fight("monster_heart_warden", weapon(focus), heartKit);
        expect(warden.wins).toBe(true);
        expect(warden.takes).toBeGreaterThanOrEqual(30_000);
        for (const other of heartWeapons) {
          expect(warden.takes, other).toBeLessThanOrEqual(fight("monster_heart_warden", weapon(other), heartKit).takes);
        }
        expect(cost("monster_heart_warden", focus, atCamp)).toBeGreaterThanOrEqual(60);
        expect(cost("monster_heart_warden", focus, atCamp)).toBeLessThanOrEqual(90);

        for (const id of [...grown, "monster_heart_warden"]) {
          const at = id === "monster_heart_warden" ? atCamp : field;
          const [a, b] = [cost(id, focus, at), cost(id, seed, at)];
          expect(Math.abs(a - b), `${id}: focus ${a}, heartseed ${b}`).toBeLessThanOrEqual(12);
        }
      });
    });
  });

  it("posts camp contracts scoped to the open regions, holding each region's back until its story opens it", () => {
    const contracts = quests.filter((q) => q.kind === "contract" && q.board === "landmark_camp");
    const scopes = new Map<string, number>();
    for (const contract of contracts) {
      const regions = new Set(contract.objectives.map((o) => ("region" in o ? o.region : undefined)));
      expect(regions.size, contract.id).toBe(1);
      const [region] = regions;
      expect(["landing", "southwood", "scarp", "sinks"], contract.id).toContain(region);
      scopes.set(region!, (scopes.get(region!) ?? 0) + 1);
      if (region === "southwood") expect(contract.prerequisites, contract.id).toContain("quest_past_the_tree_line");
      if (region === "scarp") expect(contract.prerequisites, contract.id).toContain("quest_smoke_on_the_scarp");
      if (region === "sinks") expect(contract.prerequisites, contract.id).toContain("quest_down_to_the_fen");
    }
    expect(scopes.get("landing")).toBeGreaterThanOrEqual(3);
    expect(scopes.get("southwood")).toBeGreaterThanOrEqual(3);
    expect(scopes.get("scarp")).toBeGreaterThanOrEqual(3);
    expect(scopes.get("sinks")).toBeGreaterThanOrEqual(3);
  });
});

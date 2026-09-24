import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import "../test/config/index.js";

process.env.DATABASE_PATH = mkdtempSync(join(tmpdir(), "game-quests-")) + "/";

const { submit } = await import("./commands.js");
const { tick } = await import("./loop.js");
const { getUser } = await import("../user/user.js");
const { getSystemMessages } = await import("../user/system.js");
const { writer } = await import("../db/writer.js");
const { bumpQuests } = await import("./versions.js");
const { handleQuestEvents } = await import("./systems/quests.js");
const { rotateContracts } = await import("./systems/contract-rotation.js");
const { START_POSITION } = await import("../config.js");
const { questsById } = await import("../config/quests.js");
const { getTileSelection } = await import("../world/index.js");
const {
  questProgressManager,
  selectBoardContracts,
  selectZoneQuests,
} = await import("../user/quest-progress-manager.js");
const {
  CONTRACT_WINDOW_MS,
  contractWindow,
  contracts,
  landmarkPoint,
  npcLocation,
  placeContract,
  placeStoryQuest,
  postContracts,
  regionCells,
  storyQuests,
} = await import("../world/quests.js");
type GameUserModel = import("../config.js").GameUserModel;
type Contract = import("../config.js").Contract;
type StoryQuest = import("../config.js").StoryQuest;
type UserQuestState = import("../user/quest-progress-manager.js").UserQuestState;
type QuestProgress = import("../user/quest-progress-manager.js").QuestProgress;
type PlacedQuest = import("../world/quests.js").PlacedQuest;

let now = 1_000_000_000_000;
let userId: string;

const run = async <C extends Parameters<typeof submit>[0]>(command: C) => {
  const result = submit(command);
  tick(now);
  return result;
};

const setUser = (changes: Partial<GameUserModel>) => {
  const user = getUser(userId)!;
  writer
    .prepare("UPDATE users SET data = ? WHERE id = ?")
    .run(JSON.stringify({ ...user, ...changes }), userId);
};

/** Walk in from the map, so the zone is entered as it would be in play. */
const enterAt = async (x: number, y: number) => {
  setUser({ p: { x, y }, z: false });
  await run({ type: "move", userId, direction: "enter" });
};

const lastMessage = () => getSystemMessages(userId)[0]?.message;

const status = (questId: string) =>
  questProgressManager.getQuestStatus(userId, questId)?.status;

const postContract = (quest: PlacedQuest) => {
  writer
    .prepare(
      "INSERT OR REPLACE INTO contracts (quest_id, starts_at, ends_at, data) VALUES (?, ?, ?, ?)"
    )
    .run(quest.id, quest.starts_at, quest.ends_at, JSON.stringify(quest));
  bumpQuests();
};

const progressState = (
  entries: Array<[string, Partial<QuestProgress> & Pick<QuestProgress, "status">]>
): UserQuestState => ({
  quests: new Map(
    entries.map(([questId, p]) => [
      questId,
      { user_id: "u", quest_id: questId, started_at: 0, completed_at: null, ...p },
    ])
  ),
  objectives: new Map(),
});

const camp = landmarkPoint("landmark_camp")!;
const scouting = contracts.find((c) => c.id === "contract_test_scouting")!;

const story = (changes: Partial<StoryQuest>): StoryQuest => ({
  id: "quest_test_story",
  kind: "story",
  type: "dialog",
  name: "Test story",
  description: "",
  giver: { entity_id: "npc_quartermaster" },
  objectives: [],
  completion: { entity_id: "npc_quartermaster", message: "", return_message: "" },
  rewards: [],
  ...changes,
});

beforeAll(async () => {
  userId = (await run({ type: "login", userId: "" }))!;
  await run({ type: "connect", userId });
});

describe("NPC locations", () => {
  it("meets an NPC at their home landmark", () => {
    expect(npcLocation({ entity_id: "npc_quartermaster" })).toEqual(camp);
    expect(npcLocation({ entity_id: "npc_smith" })).toEqual(
      landmarkPoint("landmark_stone_yard")
    );
  });

  it("meets an NPC at the reference's landmark instead, when it names one", () => {
    expect(
      npcLocation({ entity_id: "npc_quartermaster", landmark: "landmark_stone_yard" })
    ).toEqual(landmarkPoint("landmark_stone_yard"));
    // The wanderer has no home: his quest meets him at the grove.
    expect(npcLocation({ entity_id: "npc_wanderer" })).toBeNull();
    const side = storyQuests.find((q) => q.id === "quest_test_wanderer")!;
    const wanderer = side.objectives.find(
      (o) => o.type === "talk" && o.entity_id === "npc_wanderer"
    )!;
    expect(wanderer).toMatchObject(landmarkPoint("landmark_grove")!);
  });

  it("places a story quest's giver, talk objectives and completion from homes", () => {
    const crafting = storyQuests.find((q) => q.id === "quest_test_crafting")!;
    const yard = landmarkPoint("landmark_stone_yard")!;
    expect(crafting.giver).toMatchObject({ ...yard, entity_id: "npc_smith" });
    expect(crafting.completion).toMatchObject(yard);
    expect(crafting.objectives[0]).toMatchObject({ type: "talk", ...yard });
  });

  it("can't place a story quest whose NPC has neither a home nor an override", () => {
    expect(
      placeStoryQuest(story({ giver: { entity_id: "npc_wanderer" } }))
    ).toBeNull();
  });
});

describe("story quests", () => {
  const first = placeStoryQuest(story({ id: "quest_test_first" }))!;
  const second = placeStoryQuest(
    story({ id: "quest_test_second", prerequisites: ["quest_test_first"] })
  )!;
  const available = (state: UserQuestState, x = camp.x, y = camp.y) =>
    selectZoneQuests([first, second], state, x, y).availableQuests.map((q) => q.id);

  it("are always on offer, at the giver's home only", () => {
    expect(first).toMatchObject({ starts_at: 0, ends_at: Number.MAX_SAFE_INTEGER });
    expect(available(progressState([]))).toEqual(["quest_test_first"]);
    const yard = landmarkPoint("landmark_stone_yard")!;
    expect(available(progressState([]), yard.x, yard.y)).toEqual([]);
  });

  it("wait for their prerequisites to be completed", () => {
    expect(
      available(progressState([["quest_test_first", { status: "in_progress" }]]))
    ).toEqual([]);
    expect(
      available(
        progressState([["quest_test_first", { status: "completed", completed_at: 1 }]])
      )
    ).toEqual(["quest_test_second"]);
  });

  it("are done once: a completion never expires", () => {
    const state = progressState([
      ["quest_test_first", { status: "completed", completed_at: 1 }],
      ["quest_test_second", { status: "completed", completed_at: 2 }],
    ]);
    expect(available(state)).toEqual([]);
  });
});

describe("mutually exclusive story quests", () => {
  const done = { status: "completed" as const, completed_at: 1 };
  const mend = placeStoryQuest(story({ id: "quest_test_mend", excludes: ["quest_test_break"] }))!;
  const brk = placeStoryQuest(story({ id: "quest_test_break", excludes: ["quest_test_mend"] }))!;
  const after = placeStoryQuest(story({ id: "quest_test_after", prerequisites: ["quest_test_mend"] }))!;
  const zone = (state: UserQuestState) =>
    selectZoneQuests([mend, brk, after], state, camp.x, camp.y);
  const available = (state: UserQuestState) =>
    zone(state).availableQuests.map((q) => q.id);

  it("carries its exclusions onto the placed quest", () => {
    expect(mend.excludes).toEqual(["quest_test_break"]);
    expect(placeStoryQuest(story({}))!).not.toHaveProperty("excludes");
  });

  it("offers every side until one is taken", () => {
    expect(available(progressState([]))).toEqual(["quest_test_mend", "quest_test_break"]);
  });

  it("stops offering the others while one is in hand, anywhere on the map", () => {
    for (const status of ["in_progress", "completable"] as const) {
      const state = progressState([["quest_test_mend", { status }]]);
      expect(available(state)).toEqual([]);
      expect(zone(state).discoverableQuests).toEqual([]);
    }
    const yard = landmarkPoint("landmark_stone_yard")!;
    const state = progressState([["quest_test_break", { status: "in_progress" }]]);
    expect(
      selectZoneQuests([mend, brk], state, yard.x, yard.y).discoverableQuests
    ).toEqual([]);
  });

  it("closes the others for good once one is completed, and opens what follows it", () => {
    expect(available(progressState([["quest_test_mend", done]]))).toEqual(["quest_test_after"]);
    expect(available(progressState([["quest_test_break", done]]))).toEqual([]);
  });

  it("frees the choice again when the taken side is abandoned, but not once it's done", async () => {
    writer.prepare("DELETE FROM quest_progress WHERE user_id = ?").run(userId);
    const yard = landmarkPoint("landmark_stone_yard")!;
    const quest = questsById.get("quest_test_crafting")!;
    setUser({ p: yard, z: true });

    await run({ type: "quest_start", userId, questId: quest.id });
    expect(status(quest.id)).toBe("in_progress");
    await run({ type: "quest_cancel", userId, questId: quest.id });
    expect(status(quest.id)).toBeUndefined();

    writer
      .prepare(
        "INSERT INTO quest_progress (user_id, quest_id, status, started_at, completed_at) VALUES (?, ?, 'completed', ?, ?)"
      )
      .run(userId, quest.id, now, now);
    await run({ type: "quest_cancel", userId, questId: quest.id });
    expect(status(quest.id)).toBe("completed");
  });
});

describe("contract rotation", () => {
  it("runs in fixed two-hour windows", () => {
    const window = contractWindow(now);
    expect(window.ends_at - window.starts_at).toBe(CONTRACT_WINDOW_MS);
    expect(window.starts_at % CONTRACT_WINDOW_MS).toBe(0);
    expect(now).toBeGreaterThanOrEqual(window.starts_at);
    expect(now).toBeLessThan(window.ends_at);
    expect(contractWindow(window.ends_at - 1)).toEqual(window);
    expect(contractWindow(window.ends_at).starts_at).toBe(window.ends_at);
  });

  it("posts the same contracts in the same places for a window", () => {
    const window = contractWindow(now);
    expect(postContracts(contracts, window)).toEqual(postContracts(contracts, window));

    const pool: Contract[] = Array.from({ length: 12 }, (_, i) => ({
      ...scouting,
      id: `contract_${i}`,
    }));
    const ids = (starts_at: number) =>
      postContracts(pool, contractWindow(starts_at), 6).map((c) => c.id);
    expect(ids(now)).toHaveLength(6);
    expect(ids(now)).toEqual(ids(now + 1000));
    const later = Array.from({ length: 5 }, (_, i) => ids(now + (i + 1) * CONTRACT_WINDOW_MS).join());
    expect(later.some((set) => set !== ids(now).join())).toBe(true);
  });

  it("caps each board separately, so a small board isn't crowded out by a big one", () => {
    const pool: Contract[] = [
      ...Array.from({ length: 12 }, (_, i) => ({ ...scouting, id: `camp_${i}` })),
      ...Array.from({ length: 2 }, (_, i) => ({ ...scouting, id: `yard_${i}`, board: "landmark_stone_yard" })),
    ];
    for (let i = 0; i < 5; i++) {
      const posted = postContracts(pool, contractWindow(now + i * CONTRACT_WINDOW_MS), 6);
      expect(posted.filter((c) => c.id.startsWith("camp_"))).toHaveLength(6);
      expect(posted.filter((c) => c.id.startsWith("yard_"))).toHaveLength(2);
    }
  });

  it("resolves a region-scoped explore to a cell of that region and tile", () => {
    const cells = regionCells("woods", "tile_enchanted_grove");
    expect(cells.length).toBeGreaterThan(1);

    const targets = new Set<string>();
    for (let i = 0; i < 8; i++) {
      const window = contractWindow(now + i * CONTRACT_WINDOW_MS);
      const placed = placeContract(scouting, window)!;
      const explore = placed.objectives.find((o) => o.type === "explore")!;
      if (explore.type !== "explore") throw new Error();
      const cell = getTileSelection(explore.x, explore.y);
      expect(cell.region?.id).toBe("woods");
      expect(cell.id).toBe("tile_enchanted_grove");
      expect(cell.landmark).toBeNull();
      expect(placed).toMatchObject(window);
      expect(placed.giver).toMatchObject({ ...camp, entity_id: null });
      targets.add(`${explore.x},${explore.y}`);
    }
    expect(targets.size).toBeGreaterThan(1);
  });

  it("rotates once per window unless forced, from the loop or cron", async () => {
    const window = contractWindow(now);
    await run({ type: "rotate_contracts" });
    const posted = questProgressManager
      .getActiveQuests(now)
      .filter((q) => q.kind === "contract");
    expect(posted.map((q) => q.id)).toContain(scouting.id);
    expect(posted[0]).toMatchObject(window);

    expect(writer.transaction(() => rotateContracts(now + 1000))()).toEqual([]);
    expect(writer.transaction(() => rotateContracts(now + 1000, { force: true }))()).toEqual(
      postContracts(contracts, window)
    );

    const next = now + CONTRACT_WINDOW_MS;
    expect(writer.transaction(() => rotateContracts(next))()).not.toEqual([]);
    expect(
      questProgressManager.getActiveQuests(next).find((q) => q.id === scouting.id)
    ).toMatchObject(contractWindow(next));
    // The earlier window's posting has gone with it.
    expect(
      questProgressManager.getActiveQuests(now).find((q) => q.id === scouting.id)
    ).toBeUndefined();
  });

  it("offers a contract again in a later rotation once it's done", () => {
    const w1 = placeContract(scouting, contractWindow(now))!;
    const w2 = placeContract(scouting, contractWindow(now + CONTRACT_WINDOW_MS))!;
    const done = progressState([
      [scouting.id, { status: "completed", completed_at: w1.starts_at + 1 }],
    ]);

    expect(selectBoardContracts([w1], done, camp.x, camp.y)).toEqual([
      { quest: w1, status: "done" },
    ]);
    expect(selectZoneQuests([w1], done, camp.x, camp.y).availableQuests).toEqual([]);
    expect(selectBoardContracts([w2], done, camp.x, camp.y)).toEqual([
      { quest: w2, status: "available" },
    ]);
    expect(selectZoneQuests([w2], done, camp.x, camp.y).availableQuests).toEqual([w2]);

    const taken = progressState([[scouting.id, { status: "in_progress" }]]);
    expect(selectBoardContracts([w2], taken, camp.x, camp.y)[0]?.status).toBe("taken");
  });
});

describe("region-scoped objectives", () => {
  const woods = regionCells("woods")[0]!;
  const landing = regionCells("landing")[0]!;

  const killContract = (): PlacedQuest => ({
    ...placeContract(scouting, contractWindow(now))!,
    id: "quest_test_region_kill",
    objectives: [
      {
        id: "kill",
        type: "kill",
        description: "Cull the woods",
        monster_id: "monster_test",
        count: 2,
        region: "woods",
        progress: null,
      },
    ],
  });

  beforeEach(() => {
    writer.prepare("DELETE FROM quest_progress WHERE user_id = ?").run(userId);
  });

  it("only counts kills made in the region", async () => {
    const quest = killContract();
    postContract(quest);
    setUser({ p: camp, z: true });
    await run({ type: "quest_start", userId, questId: quest.id });
    expect(status(quest.id)).toBe("in_progress");

    const kill = (at: { x: number; y: number }) =>
      writer.transaction(() =>
        handleQuestEvents(
          [{ type: "monster_killed", userId, monsterId: "monster_test", ...at }],
          now
        )
      )();
    const current = () =>
      questProgressManager.getQuestProgress(userId, quest.id)!.objectives[0]!.current;

    kill(landing);
    expect(current()).toBe(0);
    kill(woods);
    kill(woods);
    expect(current()).toBe(2);
    expect(status(quest.id)).toBe("completable");
  });
});

describe("where quests are advanced and handed in", () => {
  beforeEach(() => {
    writer.prepare("DELETE FROM quest_progress WHERE user_id = ?").run(userId);
  });

  it("takes and talks through a story quest only where the NPC lives", async () => {
    const quest = questsById.get("quest_test_crafting")!;
    const yard = landmarkPoint("landmark_stone_yard")!;

    setUser({ p: camp, z: true });
    await run({ type: "quest_start", userId, questId: quest.id });
    expect(lastMessage()).toBe("No such quest");

    setUser({ p: yard, z: true });
    await run({ type: "quest_start", userId, questId: quest.id });
    expect(status(quest.id)).toBe("in_progress");

    const talk = quest.objectives[0]!.id;
    setUser({ p: camp, z: true });
    await run({ type: "quest_advance", userId, questId: quest.id, objectiveId: talk });
    expect(lastMessage()).toBe("Not sure what we're doing here...");

    setUser({ p: yard, z: true });
    await run({ type: "quest_advance", userId, questId: quest.id, objectiveId: talk });
    expect(
      questProgressManager.getQuestProgress(userId, quest.id)!.objectives.find(
        (o) => o.objective_id === talk
      )!.current
    ).toBe(1);
  });

  it("explores a contract's target, then hands it in only at the board", async () => {
    const posted = placeContract(scouting, contractWindow(now))!;
    const target = regionCells("landing")[0]!;
    const quest: PlacedQuest = {
      ...posted,
      objectives: [
        {
          id: "scout",
          type: "explore",
          description: "Scout",
          region: "landing",
          chance: 1,
          found_message: null,
          progress: null,
          ...target,
        },
      ],
    };
    postContract(quest);

    setUser({ p: camp, z: true });
    await run({ type: "quest_start", userId, questId: quest.id });
    expect(status(quest.id)).toBe("in_progress");

    await enterAt(camp.x, camp.y);
    expect(status(quest.id)).toBe("in_progress");
    await enterAt(target.x, target.y);
    expect(status(quest.id)).toBe("completable");

    await run({ type: "quest_complete", userId, questId: quest.id });
    expect(lastMessage()).toBe("This isn't where you hand that in.");
    expect(status(quest.id)).toBe("completable");

    await enterAt(camp.x, camp.y);
    const gold = getUser(userId)!.$;
    await run({ type: "quest_complete", userId, questId: quest.id });
    expect(status(quest.id)).toBe("completed");
    expect(getUser(userId)!.$).toBeGreaterThan(gold);

    // Done for this rotation; the next one posts it again.
    setUser({ p: camp, z: true });
    await run({ type: "quest_start", userId, questId: quest.id });
    expect(lastMessage()).toBe("No such quest");

    postContract({ ...quest, ...contractWindow(now + CONTRACT_WINDOW_MS) });
    now += CONTRACT_WINDOW_MS;
    await run({ type: "quest_start", userId, questId: quest.id });
    expect(status(quest.id)).toBe("in_progress");
  });
});

it("starts at the spawn, where the contract board is", () => {
  expect(START_POSITION).toEqual(camp);
});

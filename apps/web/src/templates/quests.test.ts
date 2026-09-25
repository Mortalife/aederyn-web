import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import "../test/config/index.js";

process.env.DATABASE_PATH = mkdtempSync(join(tmpdir(), "quest-view-")) + "/";

const { Tracker, TrackerLine } = await import("./tracker.js");
const { Quests } = await import("./quests.js");
const { selectTrackedQuests, selectZoneNPCInteractions, selectZoneQuests } =
  await import("../user/quest-progress-manager.js");
const { storyQuests } = await import("../world/quests.js");
type UserQuestState = import("../user/quest-progress-manager.js").UserQuestState;
type QuestProgress = import("../user/quest-progress-manager.js").QuestProgress;

const text = (rendered: { toString(): string }) =>
  rendered.toString().replaceAll("&#39;", "'").replaceAll("&quot;", '"');

const crafting = storyQuests.find((q) => q.id === "quest_test_crafting")!;
const wanderer = storyQuests.find((q) => q.id === "quest_test_wanderer")!;

const progress = (
  questId: string,
  status: QuestProgress["status"],
  startedAt: number
): QuestProgress => ({
  user_id: "player",
  quest_id: questId,
  status,
  started_at: startedAt,
  completed_at: null,
});

/** On the crafting quest's second objective, and done with the wanderer. */
const state: UserQuestState = {
  quests: new Map([
    [crafting.id, progress(crafting.id, "in_progress", 1)],
    [wanderer.id, progress(wanderer.id, "completable", 2)],
  ]),
  objectives: new Map([
    [
      `${crafting.id}-talk_smith`,
      {
        user_id: "player",
        quest_id: crafting.id,
        objective_id: "talk_smith",
        current: 2,
        required: 2,
        completed: true,
        updated_at: 1,
        completed_at: 1,
      },
    ],
  ]),
};

describe("quest tracker", () => {
  const tracked = selectTrackedQuests(storyQuests, state);

  it("puts quests ready to hand in first, then the rest as accepted", () => {
    expect(tracked.map(({ quest }) => quest.id)).toEqual([wanderer.id, crafting.id]);

    const later: UserQuestState = {
      ...state,
      quests: new Map([
        [crafting.id, progress(crafting.id, "in_progress", 5)],
        [wanderer.id, progress(wanderer.id, "in_progress", 2)],
      ]),
    };
    expect(selectTrackedQuests(storyQuests, later).map(({ quest }) => quest.id)).toEqual([
      wanderer.id,
      crafting.id,
    ]);
  });

  it("shows the current objective with its count, or where to hand in", () => {
    const html = text(Tracker(tracked));
    expect(html).toContain("Chop a tree");
    expect(html).toContain("0/1");
    expect(html).not.toContain("Speak with the smith");
    expect(html).toContain(
      `Return to The Smith at (${wanderer.completion.x}, ${wanderer.completion.y})`
    );
    expect(html.indexOf("The Wanderer")).toBeLessThan(html.indexOf("First Tool"));
    expect(html).toContain(`$_quest = '${crafting.id}'`);
  });

  it("folds to one line with a toggle held in a client signal", () => {
    const html = text(Tracker(tracked));
    expect(html).toContain(`data-attr:data-collapsed="$_layout.tracker === 'line'"`);
    expect(html).toContain(
      `data-on:click="$_layout.tracker = $_layout.tracker === 'line' ? 'full' : 'line'"`
    );
    expect(html.indexOf("tracker-toggle")).toBeLessThan(html.indexOf("tracker-quest"));
    expect(html).toContain('class="tracker-name');
    expect(html).toContain('class="tracker-step');
  });

  it("is a single line on a phone, and empty with nothing tracked", () => {
    const line = text(TrackerLine(tracked));
    expect(line).toContain("Return to The Smith");
    expect(line).toContain("+1");
    expect(text(Tracker([]))).toBe('<div id="tracker"></div>');
    expect(text(TrackerLine([]))).toBe('<div id="tracker-line"></div>');
  });
});

describe("quest log", () => {
  it("points at conversations in the scene instead of holding them", () => {
    const talking: UserQuestState = {
      quests: new Map([[crafting.id, progress(crafting.id, "in_progress", 1)]]),
      objectives: new Map(),
    };
    const talk = crafting.objectives[0]! as { x: number; y: number };
    const html = text(
      Quests({
        zoneQuests: selectZoneQuests(storyQuests, talking, talk.x, talk.y),
        npcInteractions: selectZoneNPCInteractions(storyQuests, talking, talk.x, talk.y),
        inZone: true,
        now: 0,
      })
    );

    expect(html).toContain("Talk to The Smith here");
    expect(html).not.toContain("Start Conversation");
    expect(html).not.toContain("/objective/");
    expect(html).toContain("First Tool");
    expect(html).toContain("Abandon");
  });
});

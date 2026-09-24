import { seededUnit } from "@aederyn/types";
import type {
  Contract,
  ExploreObjective,
  NpcReference,
  Objective,
  Quest,
  StoryQuest,
  TalkObjective,
} from "../config.js";
import { worldMap } from "../config/map.js";
import { npcsById } from "../config/npcs.js";
import { quests } from "../config/quests.js";
import { allCells, type Point } from "./index.js";

/** An objective with its location resolved, where it has one. */
export type PlacedObjective =
  | Exclude<Objective, TalkObjective | ExploreObjective>
  | (TalkObjective & Point)
  | (ExploreObjective & Point);

/**
 * A quest as the game runs it: every NPC, landmark and region-scoped target
 * resolved to a cell, and the window it's offered in.
 */
export type PlacedQuest = Omit<Quest, "giver" | "completion" | "objectives" | "board"> & {
  /** Where it's taken: the giver's cell, or the contract board's. */
  giver: Point & { entity_id: string | null };
  /** Where it's handed in. */
  completion: Point & {
    entity_id: string | null;
    message: string;
    return_message: string | null;
  };
  objectives: PlacedObjective[];
  currentObjective?: PlacedObjective;
  excludes?: string[];
  starts_at: number;
  ends_at: number;
};

export type Window = { starts_at: number; ends_at: number };

const landmarksById = new Map(worldMap.landmarks.map((l) => [l.id, l]));

export const landmarkPoint = (id: string): Point | null => {
  const landmark = landmarksById.get(id);
  return landmark ? { x: landmark.x, y: landmark.y } : null;
};

/** Where an NPC is met: the reference's landmark if it has one, otherwise their home. */
export const npcLocation = (ref: NpcReference): Point | null => {
  const landmark = ref.landmark ?? npcsById.get(ref.entity_id)?.home;
  return landmark ? landmarkPoint(landmark) : null;
};

const regionCellCache = new Map<string, Point[]>();

/** A region's accessible cells that aren't landmarks, optionally only those showing `tile`. */
export const regionCells = (region: string, tile?: string): Point[] => {
  const key = `${region}:${tile ?? ""}`;
  let cells = regionCellCache.get(key);

  if (!cells) {
    cells = [];
    for (const { x, y, tile: cell } of allCells()) {
      if (
        cell.region?.id === region &&
        !cell.landmark &&
        cell.accessible &&
        (!tile || cell.id === tile)
      ) {
        cells.push({ x, y });
      }
    }
    regionCellCache.set(key, cells);
  }

  return cells;
};

const placeObjective = (
  objective: Objective,
  seed: string
): PlacedObjective | null => {
  switch (objective.type) {
    case "talk": {
      const at = npcLocation(objective);
      return at && { ...objective, ...at };
    }
    case "explore": {
      if (objective.landmark) {
        const at = landmarkPoint(objective.landmark);
        return at && { ...objective, ...at };
      }
      const cells = objective.region
        ? regionCells(objective.region, objective.tile)
        : [];
      const at = cells[Math.floor(seededUnit(`${seed}:${objective.id}`) * cells.length)];
      return at ? { ...objective, ...at } : null;
    }
    default:
      return objective;
  }
};

const placeObjectives = (quest: Quest, seed: string) => {
  const placed = quest.objectives.map((o) => placeObjective(o, seed));
  return placed.every((o) => o !== null) ? (placed as PlacedObjective[]) : null;
};

const common = ({ id, kind, type, name, description, rewards, prerequisites, is_tutorial }: Quest) => ({
  id,
  kind,
  type,
  name,
  description,
  rewards,
  prerequisites,
  is_tutorial,
});

/** Story quests are always offered, so they span every moment. */
export const STORY_WINDOW: Window = { starts_at: 0, ends_at: Number.MAX_SAFE_INTEGER };

export const placeStoryQuest = (quest: StoryQuest): PlacedQuest | null => {
  const giver = npcLocation(quest.giver);
  const completion = npcLocation(quest.completion);
  const objectives = placeObjectives(quest, quest.id);

  if (!giver || !completion || !objectives) {
    return null;
  }

  return {
    ...common(quest),
    giver: { ...giver, entity_id: quest.giver.entity_id },
    completion: {
      ...completion,
      entity_id: quest.completion.entity_id,
      message: quest.completion.message,
      return_message: quest.completion.return_message,
    },
    objectives,
    ...(quest.excludes?.length ? { excludes: quest.excludes } : {}),
    ...STORY_WINDOW,
  };
};

/**
 * A contract as posted for one rotation. Region-scoped targets are picked
 * from the window's start, so a rotation always places them the same way.
 */
export const placeContract = (contract: Contract, window: Window): PlacedQuest | null => {
  const board = landmarkPoint(contract.board);
  const objectives = placeObjectives(contract, `contract:${contract.id}:${window.starts_at}`);

  if (!board || !objectives) {
    return null;
  }

  return {
    ...common(contract),
    giver: { ...board, entity_id: null },
    completion: {
      ...board,
      entity_id: null,
      message: contract.completion.message,
      return_message: null,
    },
    objectives,
    ...window,
  };
};

export const CONTRACT_WINDOW_MS = 2 * 3_600_000;
export const CONTRACTS_PER_ROTATION = 6;

/** The fixed two-hour rotation `now` falls in. */
export const contractWindow = (now: number): Window => {
  const starts_at = Math.floor(now / CONTRACT_WINDOW_MS) * CONTRACT_WINDOW_MS;
  return { starts_at, ends_at: starts_at + CONTRACT_WINDOW_MS };
};

/**
 * The contracts a rotation posts: a seeded pick of up to `max` per board,
 * each placed for the window.
 */
export const postContracts = (
  pool: Contract[],
  window: Window,
  max = CONTRACTS_PER_ROTATION
): PlacedQuest[] => {
  const perBoard = new Map<string, number>();
  return pool
    .map((contract) => ({
      contract,
      order: seededUnit(`rotation:${window.starts_at}:${contract.id}`),
    }))
    .sort((a, b) => a.order - b.order)
    .flatMap(({ contract }) => {
      const posted = perBoard.get(contract.board) ?? 0;
      if (posted >= max) {
        return [];
      }
      const placed = placeContract(contract, window);
      if (!placed) {
        console.warn("Contract can't be placed", contract.id);
        return [];
      }
      perBoard.set(contract.board, posted + 1);
      return [placed];
    });
};

export const contracts = quests.filter((q): q is Contract => q.kind === "contract");

/** Every story quest, placed once: NPC homes don't move while the game runs. */
export const storyQuests: PlacedQuest[] = quests
  .filter((q): q is StoryQuest => q.kind === "story")
  .flatMap((quest) => {
    const placed = placeStoryQuest(quest);
    if (!placed) {
      console.warn("Story quest can't be placed", quest.id);
    }
    return placed ? [placed] : [];
  });

/** The landmarks with a contract board. */
export const boardLandmarks = new Set(contracts.map((c) => c.board));

import { addHours, startOfHour } from "date-fns";
import { MAP_HEIGHT, MAP_WIDTH, type GameUser, type Tile } from "../config.js";
import { randomIndex } from "../lib/random.js";
import { getTile, getTileSelection } from "../world/index.js";
import type { Task } from "../ai/quests.js";

export type TaskStatus = "available" | "active" | "completed" | "failed";
export type RewardType = "currency" | "item" | "experience";

const tasks: Task[] = [
  {
    id: "task_warming_elixir",
    start_entity_id: "npc_elder_sage",
    start_zone_id: "tile_enchanted_grove",
    name: "The Warming Elixir",
    description:
      "Elara the Elder Sage has foreseen a wintersnap threatening the enchanted trees. She requires a magical elixir to shield them, needing rare ingredients found in the Frozen Wastes.",
    rewards: [
      {
        item_id: "item_fairy_petal",
        qty: 3,
      },
      {
        item_id: "item_ice_shard",
        qty: 2,
      },
    ],
    actions: [
      {
        id: 0,
        type: "resource-completed",
        resource_id: "resource_ice_crystal",
        amount: 3,
        completion_message: "You have collected the Ice Crystal.",
      },
      {
        id: 1,
        type: "resource-completed",
        resource_id: "resource_frozen_rock",
        amount: 2,
        completion_message: "You have collected the Frozen Rock.",
      },
    ],
    completion_message: "You have completed the task.",
    finish_entity_id: "npc_elder_sage",
    finish_zone_id: "tile_enchanted_grove",
  },
];
type TaskId = string;

type TaskTile = {
  id: TaskId;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  actions: {
    type: "npc-found";
    zone_id: string;
    entity_id: string;
    x: number;
    y: number;
  }[];
  starts_at: number;
  ends_at: number;
};

const taskTiles: TaskTile[] = [];

const playerTaskCompletions: {
  user_id: string;
  qty: number;
}[] = [];

const playerTasks: {
  user_id: string;
  tasks: {
    task_id: string;
    started_at: number;
    ended_at: number | null;
    completed_at: number | null;
    actions: (
      | {
          id: string;
          type: "resource-completed";
          resource_id: string;
          amount: number;
          required: number;
        }
      | {
          id: string;
          type: "item-inventory";
          item_id: string;
          amount: number;
          required: number;
        }
      | {
          id: string;
          type: "item-delivered";
          item_id: string;
          amount: number;
          required: number;
        }
      | {
          id: string;
          type: "zone-entered";
          zone_id: string;
          completed: boolean;
        }
      | {
          id: string;
          type: "npc-found";
          entity_id: string;
          zone_id: string;
          x: number;
          y: number;
          completed: boolean;
        }
    )[];
  }[];
}[] = [];

export const generateTasks = async () => {
  const starts_at = addHours(startOfHour(new Date()), 1);
  const ends_at = addHours(starts_at, 1);

  const tiles: Record<string, ({ x: number; y: number } & Tile)[]> = {};
  for (let xAxis = 0; xAxis < MAP_WIDTH; xAxis++) {
    for (let yAxis = 0; yAxis < MAP_HEIGHT; yAxis++) {
      const tile = getTileSelection(xAxis, yAxis);
      tiles[tile.id] = [
        ...(tiles[tile.id] || []),
        { ...tile, x: xAxis, y: yAxis },
      ];
    }
  }

  for (const task of tasks) {
    const startTileIndex = randomIndex(tiles[task.start_zone_id]);

    if (startTileIndex === null) {
      console.warn("No start tile found for task", task);
      continue;
    }

    const finishTileIndex =
      task.start_zone_id === task.finish_zone_id
        ? startTileIndex
        : randomIndex(tiles[task.finish_zone_id]);

    if (finishTileIndex === null) {
      console.warn("No end tile found for task", task);
      continue;
    }

    const startTile = tiles[task.start_zone_id][startTileIndex];
    const finishTile = tiles[task.finish_zone_id][finishTileIndex];

    if (!startTile || !finishTile) {
      console.warn("POST SELECTION: No start or end tile found for task", task);
      continue;
    }

    const actions = task.actions
      .filter((action) => action.type === "npc-found")
      .map((action) => {
        const npcTile = randomIndex(tiles[task.start_zone_id]);

        if (npcTile === null) {
          console.warn("No npc tile found for task", task);
          return null;
        }

        const tile = tiles[task.start_zone_id][npcTile];

        return {
          type: "npc-found",
          zone_id: action.zone_id,
          entity_id: action.entity_id,
          x: tile.x,
          y: tile.y,
        };
      });

    if (actions.some((action) => action === null)) {
      console.warn("No npc tile found for task task", task);
      continue;
    }

    taskTiles.push({
      id: task.id,
      startX: startTile.x,
      startY: startTile.y,
      endX: finishTile.x,
      endY: finishTile.y,
      starts_at: starts_at.getTime(),
      ends_at: ends_at.getTime(),
      actions: actions as (typeof taskTiles)[0]["actions"],
    });
  }

  // find the start and end zone
  // add the entity to the zone
  // add the entity to the finish zone
  // track actions?
  // add each task to the table for each player that accepts the task
  // on resource completion:
  // Check if there is a task action there and in progress
  // Check if the task is complete, if so ignore (if there's more than one, do they all get rewarded for a single action?)
  // If it's not, increment by 1

  // on entering completion zone:
  // check if there is a task which is completed
  // Display it to the user, to complete
  // On completion, remove the actions from the actions table
  // Remove any items which should be given
  // Reward any items which should be rewarded
  // Mark task as completed so it cannot be completed again
  // Increment the users task count by 1

  // we need to know whether a user is on a task
  // we need to know whether how much progress has been made against each action by each user
  // we need to know whether a task has been previously completed
};

const getTasksForTile = (x: number, y: number) => {
  return taskTiles.filter((task) => {
    return (
      ((task.startX === x && task.startY === y) ||
        (task.endX === x && task.endY === y) ||
        task.actions.some((action) => action.x === x && action.y === y)) &&
      task.ends_at > Date.now()
    );
  });
};

const getInprogressTasks = (user: GameUser) => {
  return playerTasks
    .filter((task) => task.user_id === user.id)
    .flatMap((task) => task.tasks)
    .filter((task) => task.ended_at === null);
};

const getFoundNpcsForTile = (x: number, y: number, user: GameUser) => {
  const progress = getInprogressTasks(user);
  const taskIds = progress.map((task) => task.task_id);
  const tasks = getTasksForTile(x, y);

  // Look
  return tasks.flatMap((task) => {
    const playerTask = progress.find(
      (progressTask) => progressTask.task_id === task.id
    );

    if (!playerTask) {
      return [];
    }

    // Filter the task actions for the npc-actions that match the zone
    return task.actions.filter(
      (action) =>
        action.type === "npc-found" &&
        action.x === x &&
        action.y === y &&
        // Ensure the user has the same npc-action and it's not completed
        playerTask.actions.some(
          (pAction) =>
            pAction.type === action.type &&
            pAction.x === x &&
            pAction.y === y &&
            !pAction.completed
        )
    );
  });
};

/**
 *
 * For the current zone
 *
 * All the tasks the user has in progress
 * Get all tasks that a user can start
 * Get all the tasks which have actions they can complete
 */
export const getTasksForUser = async (user: GameUser) => {
  if (!user.z) {
    return [];
  }

  const zone = user.p;

  const tile = await getTile(zone.x, zone.y);

  /**
   * Tasks which start, end or have NPC actions in the current zone
   */
  const taskForTiles = getTasksForTile(zone.x, zone.y);

  //TODO: Replace with table
  const activeTasks = playerTasks
    .filter((task) => task.user_id === user.id)
    .flatMap((task) => task.tasks)
    .filter((task) => task.ended_at === null);
  //

  const activeTaskIds = activeTasks.map((task) => task.task_id);

  return taskForTiles
    .map((tileTask) => {
      const task = tasks.find((task) => task.id === tileTask.id);

      // The task doesn't exist for whatever reason
      if (!task) {
        return null;
      }

      // If this is a task the user is currently doing
      if (activeTaskIds.includes(tileTask.id)) {
        const progress = activeTasks.find((t) => t.task_id === task.id);
        const npcFound = task.actions.some(
          (action) => action.type === "npc-found" && action.zone_id === tile?.id
        );

        // If the task progress doesn't exist for whatever reason
        if (progress) {
          return {
            task: task,
            active: true,
            progress,
            npcFound,
          };
        }
      }

      // If the task is for the npc-found step and it's for this tile
      // This should only be the case if the task is in progress
      if (
        task.actions.some(
          (action) => action.type === "npc-found" && action.zone_id === tile?.id
        )
      ) {
        return {
          task: task,
          active: false,
          progress: null,
        };
      }
      return null;
    })
    .filter((task) => task !== null);
};

const resourceCompletions: {
  user_id: string;
  resource_id: string;
  amount: number;
}[] = [];

export const resourceCompleted = async (
  user_id: string,
  resource_id: string
) => {
  const findIndex = resourceCompletions.findIndex(
    (c) => c.user_id === user_id && c.resource_id === resource_id
  );

  if (findIndex === -1) {
    resourceCompletions.push({
      user_id,
      resource_id,
      amount: 1,
    });

    return;
  }

  //UPDATE product SET price = price + 50
};

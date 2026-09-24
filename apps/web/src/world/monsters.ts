import { reader } from "../db/reader.js";

export type MonsterState = {
  x: number;
  y: number;
  /** The monster's index in its cell's rolled `monsters`. */
  spawn: number;
  monster_id: string;
  /** Current HP while alive. */
  hp: number;
  /** Set while dead. */
  respawn_at: number | null;
};

export type Combat = {
  user_id: string;
  x: number;
  y: number;
  spawn: number;
  monster_id: string;
  started_at: number;
  next_player_at: number;
  next_monster_at: number;
};

/** How long a hit stays in a monster's combat log. */
export const COMBAT_LOG_MS = 10_000;

export type CombatHit = {
  id: number;
  x: number;
  y: number;
  spawn: number;
  monster_id: string;
  user_id: string;
  /** 1 when the monster hit the player, 0 when the player hit the monster. */
  by_monster: number;
  damage: number;
  /** 1 when the hit ended the fight. */
  fatal: number;
  at: number;
};

type Area = { fromX: number; toX: number; fromY: number; toY: number };

const selectAreaState = reader.prepare<Area, MonsterState>(
  "SELECT * FROM monster_state WHERE x BETWEEN :fromX AND :toX AND y BETWEEN :fromY AND :toY"
);
const selectAreaCombat = reader.prepare<Area, Combat>(
  "SELECT * FROM combat WHERE x BETWEEN :fromX AND :toX AND y BETWEEN :fromY AND :toY"
);

const selectAreaHits = reader.prepare<Area & { since: number }, CombatHit>(
  "SELECT * FROM combat_hits WHERE x BETWEEN :fromX AND :toX AND y BETWEEN :fromY AND :toY AND at > :since ORDER BY at DESC, id DESC"
);

/** State for every monster in an area (inclusive) that isn't at full HP. */
export const getMonsterStateInArea = (area: Area) => selectAreaState.all(area);

/** Every fight in an area (inclusive). */
export const getCombatInArea = (area: Area) => selectAreaCombat.all(area);

/** Hits in an area (inclusive) since `since`, newest first. */
export const getCombatHitsInArea = (area: Area, since: number) =>
  selectAreaHits.all({ ...area, since });

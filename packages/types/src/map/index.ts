import type { Landmark, MapBounds, MapData, MapRegion } from "../entities/map.schema.js";
import { isOneOf, type PoolEntry } from "../entities/pool.schema.js";

/** cyrb53: a fast, well-mixed 53-bit string hash. */
const hash53 = (str: string) => {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
};

/** A number in [0, 1) that only depends on `seed`. */
export const seededUnit = (seed: string) => hash53(seed) / 2 ** 53;

export const cellKey = (x: number, y: number) => `${x},${y}`;

export const inBounds = (bounds: MapBounds, x: number, y: number) =>
  x >= bounds.minX && x <= bounds.maxX && y >= bounds.minY && y <= bounds.maxY;

/** Cells per noise lattice step: how long a border's wobbles are. */
export const JITTER_SCALE = 4;
/** How far, in cells, a border can wobble from the true midpoint. */
export const JITTER_AMPLITUDE = 1.75;

const smoothstep = (t: number) => t * t * (3 - 2 * t);

/** Smooth value noise in [-1, 1], so neighbouring cells jitter alike. */
const valueNoise = (x: number, y: number, channel: string) => {
  const fx = x / JITTER_SCALE;
  const fy = y / JITTER_SCALE;
  const x0 = Math.floor(fx);
  const y0 = Math.floor(fy);
  const tx = smoothstep(fx - x0);
  const ty = smoothstep(fy - y0);
  const at = (ix: number, iy: number) => seededUnit(`jitter:${channel}:${ix},${iy}`) * 2 - 1;
  const top = at(x0, y0) + (at(x0 + 1, y0) - at(x0, y0)) * tx;
  const bottom = at(x0, y0 + 1) + (at(x0 + 1, y0 + 1) - at(x0, y0 + 1)) * tx;
  return top + (bottom - top) * ty;
};

/**
 * The region whose anchor is nearest the cell, measured from a jittered copy
 * of the cell so borders wobble. Ties go to the earlier region.
 */
export const regionAt = (map: Pick<MapData, "regions">, x: number, y: number): MapRegion | null => {
  const jx = x + JITTER_AMPLITUDE * valueNoise(x, y, "x");
  const jy = y + JITTER_AMPLITUDE * valueNoise(x, y, "y");
  let best: MapRegion | null = null;
  let bestDistance = Infinity;
  for (const region of map.regions) {
    for (const anchor of region.anchors) {
      const distance = (anchor.x - jx) ** 2 + (anchor.y - jy) ** 2;
      if (distance < bestDistance) {
        best = region;
        bestDistance = distance;
      }
    }
  }
  return best;
};

export const landmarkAt = (map: Pick<MapData, "landmarks">, x: number, y: number): Landmark | null =>
  map.landmarks.find((l) => l.x === x && l.y === y) ?? null;

/** The landmark players start at and return to. */
export const spawnLandmark = (map: Pick<MapData, "landmarks">): Landmark | null =>
  map.landmarks.find((l) => l.spawn) ?? null;

/** Picks by weight with `r` in [0, 1). */
export const pickWeighted = <T extends { weight: number }>(items: T[], r: number): T | null => {
  const total = items.reduce((sum, item) => sum + Math.max(0, item.weight), 0);
  if (total <= 0) return null;
  let target = r * total;
  for (const item of items) {
    target -= Math.max(0, item.weight);
    if (target < 0) return item;
  }
  return items[items.length - 1] ?? null;
};

/** The tile ID at a cell: its landmark's, otherwise one of its region's by weight. */
export const tileIdAt = (map: MapData, x: number, y: number): string | null => {
  const landmark = landmarkAt(map, x, y);
  if (landmark) return landmark.tile;
  const region = regionAt(map, x, y);
  return region ? pickWeighted(region.tiles, seededUnit(`tile:${x},${y}`))?.id ?? null : null;
};

/**
 * Rolls each entry of a pool: `chance` decides whether it's there, and `oneOf`
 * picks one option. Deterministic in `seed` and each entry's index.
 */
export const rollPool = <T extends object>(entries: PoolEntry<T>[] | undefined, seed: string): T[] => {
  const rolled: T[] = [];
  (entries ?? []).forEach((entry, index) => {
    if (entry.chance !== undefined && seededUnit(`${seed}:${index}:chance`) >= entry.chance) {
      return;
    }
    let thing: T | undefined;
    if (isOneOf(entry)) {
      thing = entry.oneOf[Math.floor(seededUnit(`${seed}:${index}:pick`) * entry.oneOf.length)];
    } else {
      const { chance: _chance, ...rest } = entry as T & { chance?: number };
      thing = rest as T;
    }
    if (thing) rolled.push(thing);
  });
  return rolled;
};

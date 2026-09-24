import { describe, expect, it } from "vitest";
import "../test/config/index.js";
import { MAP_BOUNDS } from "../config.js";
import { buildTile, generateMap, getTileSelection, visibleArea } from "./index.js";

const tileWithResources = () => {
  for (let x = MAP_BOUNDS.minX; x <= MAP_BOUNDS.maxX; x++) {
    for (let y = MAP_BOUNDS.minY; y <= MAP_BOUNDS.maxY; y++) {
      if (buildTile(x, y).resources.length > 0) {
        return { x, y };
      }
    }
  }
  throw new Error("No tile with resources");
};

describe("world", () => {
  it("memoizes tile selection", () => {
    expect(getTileSelection(3, 4)).toBe(getTileSelection(3, 4));
  });

  it("applies resource usage without changing the shared tile", () => {
    const { x, y } = tileWithResources();
    const [resource] = buildTile(x, y).resources;
    const usage = [
      { x, y, resource_id: resource!.id, qty: 1, refresh_at: 0 },
      // Another tile's usage doesn't apply here.
      { x: x + 1, y, resource_id: resource!.id, qty: 1, refresh_at: 0 },
    ];

    expect(buildTile(x, y, usage).resources[0]!.amount_remaining).toBe(
      resource!.amount - 1
    );
    expect(buildTile(x, y).resources[0]!.amount_remaining).toBe(
      resource!.amount
    );
  });

  it("generates the visible area around a position", () => {
    const position = { x: 5, y: 5 };
    const area = visibleArea(position);
    const map = generateMap(position, []);

    expect(map[0]).toMatchObject({ x: area.fromX, y: area.fromY });
    expect(map.at(-1)).toMatchObject({ x: area.toX, y: area.toY });
    expect(map.filter((t) => t.here)).toEqual([
      expect.objectContaining(position),
    ]);
  });
});

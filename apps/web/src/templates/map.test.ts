import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import "../test/config/index.js";

process.env.DATABASE_PATH = mkdtempSync(join(tmpdir(), "map-view-")) + "/";

const { WorldMap, Minimap } = await import("./map.js");
const { generateMap } = await import("../world/index.js");
const { START_POSITION } = await import("../config.js");
const { emptyDiscoveries, tileKey } = await import("../user/discoveries.js");
type WorldTile = import("../world/index.js").WorldTile;

const text = (rendered: { toString(): string }) =>
  rendered.toString().replaceAll("&#39;", "'").replaceAll("&quot;", '"');

const map = generateMap(START_POSITION, []);
const here = map.find((tile) => tile.here)!;
const others = map.filter((tile) => tile.tile && !tile.here);
const heard = others.find((tile) => tile.tile!.name !== here.tile!.name)!;
const unvisited = others.find(
  (tile) =>
    tile !== heard &&
    tile.tile!.name !== here.tile!.name &&
    tile.tile!.name !== heard.tile!.name
)!;

const discoveries = emptyDiscoveries();
discoveries.tiles.add(tileKey(here.x, here.y));
discoveries.heardTiles.add(tileKey(heard.x, heard.y));

/** A tile's button on the map, by its tooltip. */
const tileButton = (html: string, tile: WorldTile) => {
  const at = html.indexOf(`(${tile.x}, ${tile.y})"`);
  expect(at).toBeGreaterThan(-1);
  const start = html.lastIndexOf("<button", at);
  return html.slice(start, html.indexOf("</button>", at));
};

const preview = (html: string, tile: WorldTile) => {
  const start = html.indexOf(`id="tile-preview-${tile.x}-${tile.y}"`);
  expect(start).toBeGreaterThan(-1);
  const next = html.indexOf('id="tile-preview-', start + 1);
  return html.slice(start, next === -1 ? undefined : next);
};

describe("world map", () => {
  const html = text(WorldMap({ map, indicators: [], discoveries }));

  it("names visited and heard-of tiles, and shows unvisited ones as terrain", () => {
    expect(tileButton(html, here)).toContain(here.tile!.name);
    expect(tileButton(html, heard)).toContain(heard.tile!.name);
    expect(tileButton(html, heard)).toContain("map-tile-heard");
    expect(tileButton(html, heard)).toContain(" ?");

    const button = tileButton(html, unvisited);
    expect(button).toContain("map-tile-unknown");
    expect(button).toContain(`title="Inspect: Unexplored (${unvisited.x}, ${unvisited.y})"`);
    expect(button).not.toContain(unvisited.tile!.name);
    expect(preview(html, unvisited)).toContain("Unexplored");
    expect(preview(html, unvisited)).not.toContain(unvisited.tile!.name);
  });

  it("keeps coordinates out of the tiles, in the tooltip", () => {
    expect(tileButton(html, here)).toContain(
      `title="Enter: ${here.tile!.name} (${here.x}, ${here.y})"`
    );
    expect(tileButton(html, here).split(">").slice(1).join(">")).not.toContain(
      `${here.x}, ${here.y}`
    );
  });

  it("describes only visited tiles in their preview", () => {
    expect(preview(html, heard)).toContain("heard of this place");
    if (heard.tile!.description) {
      expect(preview(html, heard)).not.toContain(heard.tile!.description);
    }
    if (here.tile!.description) {
      expect(preview(html, here)).toContain(here.tile!.description);
    }
  });

  it("still marks quests on unvisited tiles", () => {
    const withMarker = text(
      WorldMap({
        map,
        indicators: [
          { x: unvisited.x, y: unvisited.y, available: false, objective: true, completable: false },
        ],
        discoveries,
      })
    );
    expect(tileButton(withMarker, unvisited)).toContain("text-quest-objective");
  });

  it("moves onto a neighbour on one tap and enters the tile underfoot", () => {
    const neighbour = map.find(
      (tile) => tile.tile?.accessible && Math.abs(tile.x - here.x) + Math.abs(tile.y - here.y) === 1
    )!;
    expect(tileButton(html, neighbour)).toContain("@post('/game/move/");
    expect(tileButton(html, neighbour)).not.toContain("? ($_mapSel");
    expect(tileButton(html, here)).toContain(
      `data-on:click="$_mapSel = ''; @post('/game/move/enter')"`
    );
    expect(tileButton(html, here)).toContain("data-on-keys:enter");
    expect(preview(html, here)).toContain("@post('/game/move/enter')");
  });

  it("moves directly with the arrow keys", () => {
    const directions = [
      ["up", 0, -1],
      ["down", 0, 1],
      ["left", -1, 0],
      ["right", 1, 0],
    ] as const;

    for (const [direction, dx, dy] of directions) {
      const neighbour = map.find(
        (tile) => tile.x === here.x + dx && tile.y === here.y + dy
      );
      if (neighbour?.tile?.accessible) {
        expect(tileButton(html, neighbour)).toContain(
          `data-on-keys:${direction}="el.click()"`
        );
      }
    }
  });
});

describe("minimap", () => {
  it("shows the selected tile's contents on the world map", () => {
    const html = text(Minimap({ map, indicators: [], discoveries, inZone: false }));
    expect(html).toContain('id="minimap"');
    expect(html).toContain("Selected tile");
    expect(html).not.toContain("@post");
    expect(html).toContain(`data-show="$_mapSel === '${tileKey(heard.x, heard.y)}'"`);
    expect(html).toContain(heard.tile!.name);
    expect(html).not.toContain(unvisited.tile!.name);

    const start = html.indexOf(`$_mapSel === '${tileKey(here.x, here.y)}' ||`);
    expect(start).toBeGreaterThan(-1);
    expect(html.slice(start, html.indexOf("data-show", start + 1))).toContain(here.tile!.name);
  });

  it("is a way out of the zone inside one", () => {
    const html = text(Minimap({ map, indicators: [], discoveries, inZone: true }));
    expect(html).toContain("@post('/game/move/exit')");
    expect(html).not.toContain(unvisited.tile!.name);
  });
});

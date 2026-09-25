import { html } from "hono/html";
import { getPublicPath, textureMap } from "../config/assets.js";
import { effectsById } from "../config/effects.js";
import type { WorldTile } from "../world/index.js";
import type { MapIndicator } from "../user/quest-progress-manager.js";
import { tileKey, type Discoveries } from "../user/discoveries.js";
import type { SystemMessage } from "../user/system.js";
import { tileContents } from "../game/view/select.js";
import type { Direction } from "../game/commands.js";
import { TileEffects } from "./effects.js";
import { ItemIcon } from "./item-icon.js";
import { QuestMarker, type MarkerKind } from "./quests.js";
import { DiscoveryGlow, KeyboardShortcut } from "./ui.js";

export type MapProps = {
  map: WorldTile[];
  indicators: MapIndicator[];
  discoveries: Discoveries;
  /** Tiles just discovered, by `tileKey`, to glow briefly. */
  glows?: Map<string, SystemMessage>;
};

/** Past the edge of the world: nothing to show or go to. */
const Edge = (cls: string) =>
  html`<div class="${cls} map-edge" title="The edge of the world" aria-hidden="true"></div>`;

type Known = "visited" | "heard" | "unknown";

const knownAs = (tile: WorldTile, discoveries: Discoveries): Known => {
  const key = tileKey(tile.x, tile.y);
  return discoveries.tiles.has(key)
    ? "visited"
    : discoveries.heardTiles.has(key)
    ? "heard"
    : "unknown";
};

const markers = (indicator: MapIndicator | undefined): MarkerKind[] =>
  indicator
    ? [
        ...(indicator.available ? (["available"] as const) : []),
        ...(indicator.objective ? (["objective"] as const) : []),
        ...(indicator.completable ? (["completable"] as const) : []),
      ]
    : [];

const MARKER_TEXT: Partial<Record<MarkerKind, string>> = {
  available: "A quest is on offer here",
  objective: "A quest objective is here",
  completable: "A quest is handed in here",
};

/** The one step from `here` onto `tile`: a direction, "enter" for here, or null. */
const stepOnto = (here: WorldTile, tile: WorldTile): Direction | null => {
  const dx = tile.x - here.x;
  const dy = tile.y - here.y;
  if (dx === 0 && dy === 0) return "enter";
  if (dx === 0 && dy === -1) return "up";
  if (dx === 0 && dy === 1) return "down";
  if (dx === -1 && dy === 0) return "left";
  if (dx === 1 && dy === 0) return "right";
  return null;
};

const move = (direction: Direction) => `@post('/game/move/${direction}')`;

const tileStyle = (tile: WorldTile) => {
  const bg = tile.tile?.backgroundColor ?? "#333";
  const texture = tile.tile?.texture ? textureMap[tile.tile.texture] : undefined;
  return [
    `background-color: ${bg}`,
    `color: ${tile.tile?.color ?? "#fff"}`,
    texture
      ? `background-image: linear-gradient(135deg, ${bg}dd, ${bg}88), url('${getPublicPath(texture)}')`
      : null,
  ]
    .filter(Boolean)
    .join("; ");
};

const tileTitle = (tile: WorldTile, known: Known) =>
  `${known === "unknown" ? "Unexplored" : tile.tile!.name} (${tile.x}, ${tile.y})`;

const Glyph = (icon: string, title: string) =>
  html`<span class="map-glyph" title="${title}">${ItemIcon({ name: title, icon }, { class: "size-full" })}</span>`;

/** Small icons for what's at a visited tile. */
const TileGlyphs = (tile: WorldTile) => {
  const contents = tileContents(tile);
  if (!contents) return null;
  const glyphs = [
    contents.stations.length > 0 ? Glyph("chisel", "Crafting") : null,
    contents.monsters.length > 0 ? Glyph("claw", "Creatures") : null,
    contents.people.length > 0 ? Glyph("hood", "People") : null,
    contents.board ? Glyph("broken-tablet", "Contract board") : null,
  ].filter(Boolean);
  return glyphs.length > 0 ? html`<span class="map-tile-glyphs">${glyphs}</span>` : null;
};

const MapTile = (tile: WorldTile, here: WorldTile, props: MapProps) => {
  if (!tile.tile) {
    return Edge("map-tile");
  }

  const key = tileKey(tile.x, tile.y);
  const known = knownAs(tile, props.discoveries);
  const step = tile.tile.accessible ? stepOnto(here, tile) : null;
  const selected = `$_mapSel === '${key}'`;
  const click = step ? `$_mapSel = ''; ${move(step)}` : `$_mapSel = '${key}'`;
  const action = step === "enter" ? "Enter" : step ? `Go ${step}` : "Inspect";
  const indicator = props.indicators.find((i) => i.x === tile.x && i.y === tile.y);

  return html`<button
    type="button"
    class="map-tile map-tile-${known} ${tile.here ? "map-tile-here" : ""}"
    style="${tileStyle(tile)}"
    title="${action}: ${tileTitle(tile, known)}"
    aria-label="${action}: ${tileTitle(tile, known)}"
    data-class="{'map-tile-selected': ${selected}}"
    data-on:pointerenter="$_mapSel = '${key}'"
    data-on:focus="$_mapSel = '${key}'"
    data-on:click="${click}"
    ${step ? html`data-on-keys:${step}="el.click()"` : ""}
  >
    <span class="map-tile-markers">${markers(indicator).map((m) => QuestMarker(m))}</span>
    ${known === "unknown"
      ? null
      : html`<span class="map-tile-name"
          >${tile.tile.name}${known === "heard"
            ? html`<span class="opacity-70"> ?</span>`
            : null}</span
        >`}
    ${known === "visited" ? TileGlyphs(tile) : null}
    ${DiscoveryGlow(props.glows?.get(key))}
  </button>`;
};

/** The tiles on the map, by `tileKey`, as a client expression. */
const visibleKeys = (map: WorldTile[]) =>
  `[${map
    .filter((tile) => tile.tile)
    .map((tile) => `'${tileKey(tile.x, tile.y)}'`)
    .join(",")}]`;

/**
 * True while `tile` is the selected one. With nothing on the map selected,
 * it's where the player stands.
 */
const isShown = (tile: WorldTile, visible: string) => {
  const key = tileKey(tile.x, tile.y);
  return tile.here
    ? `$_mapSel === '${key}' || !${visible}.includes($_mapSel)`
    : `$_mapSel === '${key}'`;
};

const PreviewList = (label: string, items: string[]) =>
  items.length === 0
    ? null
    : html`<div class="flex gap-2">
        <dt class="w-20 shrink-0 text-gray-500">${label}</dt>
        <dd class="min-w-0">${items.join(", ")}</dd>
      </div>`;

const title = (id: string) =>
  id.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());

/** What a visited tile has, from its config. */
const TileContentsList = (tile: WorldTile, discoveries: Discoveries) => {
  const contents = tileContents(tile);
  if (!contents) return null;
  return html`<dl class="flex flex-col gap-1 text-xs">
    ${PreviewList("Crafting", contents.stations.map(title))}
    ${PreviewList(
      "Gathering",
      contents.gather > 0
        ? [`${contents.gather} spot${contents.gather === 1 ? "" : "s"}`]
        : []
    )}
    ${PreviewList(
      "Creatures",
      contents.monsters.map(({ monster, count }) =>
        count > 1 ? `${monster.name} ×${count}` : monster.name
      )
    )}
    ${PreviewList(
      "People",
      contents.people.map((npc) =>
        discoveries.npcs.has(npc.entity_id) ? npc.name : "A stranger"
      )
    )}
    ${PreviewList("Board", contents.board ? ["Contracts posted"] : [])}
  </dl>`;
};

const distance = (a: WorldTile, b: WorldTile) =>
  Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

const PreviewAction = (tile: WorldTile, here: WorldTile) => {
  if (!tile.tile!.accessible) {
    return html`<span class="text-xs text-gray-400">Impassable</span>`;
  }
  const step = stepOnto(here, tile);
  if (step === "enter") {
    return html`<button
      class="btn btn-sm btn-primary"
      data-on:click="${move("enter")}"
    >
      Enter ${KeyboardShortcut("Enter")}
    </button>`;
  }
  if (step) {
    return html`<span class="text-xs text-gray-300">Click the tile to go ${step}</span>`;
  }
  const steps = distance(tile, here);
  return html`<span class="text-xs text-gray-400">${steps} steps away</span>`;
};

/**
 * What the player knows about a tile, and the way onto it. Each tile's is
 * rendered and shown by the client's selection, so the render doesn't
 * depend on it. With nothing selected, it's where the player stands.
 */
const TilePreview = (
  tile: WorldTile,
  here: WorldTile,
  props: MapProps,
  visible: string
) => {
  const known = knownAs(tile, props.discoveries);
  const cell = tile.tile!;
  const indicator = props.indicators.find((i) => i.x === tile.x && i.y === tile.y);

  return html`<div id="tile-preview-${tile.x}-${tile.y}" class="map-preview" data-show="${isShown(tile, visible)}">
    <div class="flex items-baseline gap-2">
      <h2 class="text-base font-semibold">
        ${known === "unknown" ? "Unexplored" : cell.name}
      </h2>
      <span class="font-mono text-xs text-gray-400">(${tile.x}, ${tile.y})</span>
      ${tile.here ? html`<span class="text-xs text-yellow-400">You are here</span>` : null}
    </div>
    ${known === "visited"
      ? html`${cell.description
          ? html`<p class="text-xs text-gray-300">${cell.description}</p>`
          : null}
        ${TileEffects(
          [...cell.effects, ...(cell.region?.effects ?? [])].flatMap(
            ({ id, strength }) => {
              const effect = effectsById.get(id);
              return effect ? [{ effect, strength }] : [];
            }
          )
        )}
        ${TileContentsList(tile, props.discoveries)}`
      : html`<p class="text-xs text-gray-400">
          ${known === "heard"
            ? "You've heard of this place, but haven't been."
            : "You haven't been here yet."}
        </p>`}
    ${markers(indicator).map(
      (m) => html`<p class="flex items-center gap-2 text-xs">
        ${QuestMarker(m)} ${MARKER_TEXT[m]}
      </p>`
    )}
    <div class="mt-auto flex items-center gap-2 pt-1">${PreviewAction(tile, here)}</div>
  </div>`;
};

/**
 * The world map scene: the grid, square and as large as the scene allows,
 * with the selected tile's preview beside it when wide and under it when
 * tall. A neighbour moves in one click; the current tile enters. Hovering,
 * focusing or tapping any other tile previews it.
 */
export const WorldMap = (props: MapProps) => {
  const here = props.map.find((tile) => tile.here)!;
  const visible = visibleKeys(props.map);

  return html`<div id="world-map" class="world-map">
    <div class="world-map-layout">
      <div class="world-map-grid">
        <div id="map" class="map-grid">
          ${props.map.map((tile) => MapTile(tile, here, props))}
        </div>
      </div>
      <div class="world-map-preview">
        ${props.map
          .filter((tile) => tile.tile)
          .map((tile) => TilePreview(tile, here, props, visible))}
      </div>
    </div>
  </div>`;
};

/** What's at the selected tile, for the rail beside the world map. */
const TileSummary = (tile: WorldTile, props: MapProps, visible: string) => {
  const known = knownAs(tile, props.discoveries);
  return html`<div class="flex flex-col gap-1 text-xs" data-show="${isShown(tile, visible)}">
    <div class="flex items-baseline gap-2">
      <span class="min-w-0 truncate font-semibold text-gray-200"
        >${known === "unknown" ? "Unexplored" : tile.tile!.name}</span
      >
      <span class="font-mono text-gray-500">(${tile.x}, ${tile.y})</span>
    </div>
    ${known === "visited"
      ? TileContentsList(tile, props.discoveries)
      : html`<p class="text-gray-400">
          ${known === "heard" ? "Heard of, not visited." : "Not visited yet."}
        </p>`}
  </div>`;
};

/**
 * The same map, small, for the rail while in a zone: colours and markers
 * only. A neighbour is one tap (or arrow key) away, leaving the zone on
 * the way. On the world map, where the scene is the map, it shows what's
 * at the selected tile instead.
 */
export const Minimap = (props: MapProps & { inZone: boolean }) => {
  if (!props.inZone) {
    const visible = visibleKeys(props.map);
    return html`<div id="minimap" class="hud-minimap">
      <p class="text-xs font-semibold text-gray-300">Selected tile</p>
      ${props.map
        .filter((tile) => tile.tile)
        .map((tile) => TileSummary(tile, props, visible))}
    </div>`;
  }
  const here = props.map.find((tile) => tile.here)!;

  return html`<div id="minimap" class="hud-minimap">
    <div class="minimap-grid">
      ${props.map.map((tile) => {
        if (!tile.tile) {
          return Edge("minimap-cell");
        }
        const known = knownAs(tile, props.discoveries);
        const step = tile.tile.accessible ? stepOnto(here, tile) : null;
        const indicator = props.indicators.find(
          (i) => i.x === tile.x && i.y === tile.y
        );
        const inner = html`${markers(indicator)
          .slice(0, 1)
          .map((m) => QuestMarker(m))}${DiscoveryGlow(
          props.glows?.get(tileKey(tile.x, tile.y))
        )}`;
        const cls = `minimap-cell map-tile-${known} ${tile.here ? "map-tile-here" : ""}`;
        return step && step !== "enter"
          ? html`<button
              type="button"
              class="${cls}"
              style="${tileStyle(tile)}"
              title="Go ${step}: ${tileTitle(tile, known)}"
              data-on:click="$_sheet = ''; ${move(step)}"
              data-on-keys:${step}="el.click()"
            >
              ${inner}
            </button>`
          : html`<div class="${cls}" style="${tileStyle(tile)}" title="${tileTitle(tile, known)}">
              ${inner}
            </div>`;
      })}
    </div>
    <div class="flex items-center gap-2 text-xs">
      <span class="min-w-0 flex-1 truncate text-gray-300"
        >${here.tile?.name} <span class="font-mono text-gray-500">(${here.x}, ${here.y})</span></span
      >
      <button
        class="btn btn-xs min-h-11 sm:min-h-0"
        data-on:click="$_sheet = ''; ${move("exit")}"
      >
        Exit
      </button>
    </div>
  </div>`;
};

import { html } from "hono/html";
import { classes } from "../templates/helpers.js";
import { toHtmlJson } from "../lib/datastar.js";
import { HouseMap, HouseMapTile } from "../config/house-tiles.js";

export const HouseContainer = (houseMap?: HouseMap) => html`<div
  class="h-full"
  id="house-container"
  data-on-load="@get('/house/feed')"
>
  ${houseMap
    ? House(houseMap)
    : html` <div id="house">
        We cannot connect to the server or you don't have Javascript installed
      </div>`}
</div>`;

export const House = (
  houseMap: HouseMap,
  tile?: { x: number; y: number }
) => html`<div
  id="house"
  class="w-[700px] h-[700px] grid grid-cols-10 grid-rows-10 grid-flow-col"
>
  ${houseMap.tiles.map((mapTile) =>
    Tile(
      mapTile,
      tile?.x === mapTile.position.x && tile?.y === mapTile.position.y
    )
  )}
</div>`;

export const Tile = (tile: HouseMapTile, isSelected?: boolean) => {
  const { x, y } = tile.position;

  return html`<div
    id="tile-${x}-${y}"
    style="background-color: ${tile.type.bgColor ?? "#fff"};"
    class="${classes(
      "w-[70px] h-[70px] p-1 border  text-xs",
      isSelected || tile.actionInProgress ? "relative" : null,
      isSelected ? "border-2 border-black group" : null
    )}"
    data-on-click="@post('/house/tile/${x}/${y}')"
  >
    ${tile.actionInProgress ? TileActionInProgress(tile) : null}
    ${isSelected ? TileOptions(tile) : null} ${x}/${y}
  </div>`;
};

export const TileActionInProgress = (tile: HouseMapTile) => {
  if (!tile.actionInProgress) {
    return null;
  }

  const elementRef = `_tile_progress_${tile.position.x}_${tile.position.y}`;
  const calculation = `68 * Math.min(1, (${tile.actionInProgress.completesAt} - Date.now()) / (${tile.actionInProgress.completesAt}-${tile.actionInProgress.startedAt}))`;
  return html`<div
    class="absolute bottom-0 left-0 h-2 w-[68px] flex flex-col justify-center items-center"
  >
    <div
      data-ref="${elementRef}"
      data-on-raf="$${elementRef}.style.width = Math.floor(${calculation}) + 'px'"
      class="transition h-2 bg-primary"
    ></div>
  </div>`;
};

export const TileOptions = (tile: HouseMapTile) => html`<div
  id="tile-options"
  data-view-transition
  class="${classes(
    "grid grid-cols-1 w-0 bg-gray-200 rounded p-4 gap-2 shadow z-10",
    "transition duration-500 opacity-0 invisible",
    " group-hover:w-[300px] absolute",
    tile.position.x < 5
      ? "top-[65px] -right-[115px] md:-top-4 md:-right-[295px]"
      : "top-[65px] -left-[115px] md:-top-4 md:-left-[295px]"
  )}"
  data-signals="${toHtmlJson({ _show: false })}"
  data-class="{'group-hover:opacity-100 group-hover:visible': $_show}"
  data-on-load="setTimeout(() => $_show = true, 50)"
>
  <ul>
    ${tile.type.availableActions.map((action) => {
      return html`<li
        class="${classes(
          "flex flex-row justify-between items-center gap-1",
          "rounded p-2 bg-gray-100 text-primary"
        )}"
      >
        <span class="font-bold">${action.description}</span>
        <button
          class="btn btn-sm"
          data-on-click="@post('/house/tile/${tile.position.x}/${tile.position
            .y}/${action.id}')"
        >
          ${action.name}
        </button>
      </li>`;
    })}
  </ul>
</div>`;

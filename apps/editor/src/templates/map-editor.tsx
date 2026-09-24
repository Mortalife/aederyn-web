import type { FC } from "hono/jsx";
import {
  MapDataSchema,
  cellKey,
  inBounds,
  regionAt,
  seededUnit,
  pickWeighted,
  type Landmark,
  type MapData,
  type MapRegion,
} from "@aederyn/types";
import type { Effect, Tile } from "../repository/index.js";

type FormBody = Record<string, string | File | (string | File)[]>;

const inputClass =
  "px-2 py-1 bg-gray-600 border border-gray-500 rounded text-white text-sm focus:outline-none focus:border-cyan-500";

/** A stable colour per region, spread around the hue wheel by list position. */
export const regionColor = (index: number) => `hsl(${Math.round((index * 137.508) % 360)} 55% 42%)`;

const num = (value: unknown) => {
  const n = typeof value === "string" && value.trim() !== "" ? Number(value) : NaN;
  return Number.isFinite(n) ? n : NaN;
};

/**
 * Groups `prefix[i].field` form keys by index, in index order. New rows use
 * large indexes, so they sort after existing ones.
 */
const rows = (body: FormBody, prefix: string) => {
  const escaped = prefix.replace(/[.[\]]/g, "\\$&");
  const pattern = new RegExp(`^${escaped}\\[(\\d+)\\]\\.(.+)$`);
  const byIndex = new Map<number, { index: string; fields: Record<string, string> }>();
  for (const [key, value] of Object.entries(body)) {
    const match = pattern.exec(key);
    if (!match || typeof value !== "string") continue;
    const index = Number(match[1]);
    const row = byIndex.get(index) ?? { index: match[1]!, fields: {} };
    row.fields[match[2]!] = value;
    byIndex.set(index, row);
  }
  return [...byIndex.entries()].sort(([a], [b]) => a - b).map(([, row]) => row);
};

/**
 * Builds the map from the editor form. Lenient, so a half-typed form still
 * previews: incomplete rows are dropped and the validator reports the rest.
 */
export function parseMapForm(body: FormBody): MapData {
  const field = (name: string) => (typeof body[name] === "string" ? (body[name] as string) : "");
  const spawn = field("spawn");

  const regions: MapRegion[] = rows(body, "regions")
    .filter((row) => row.fields.id?.trim())
    .map((row) => {
      const prefix = `regions[${row.index}]`;
      return {
        id: row.fields.id!.trim(),
        tier: Math.max(0, Math.trunc(num(row.fields.tier)) || 0),
        anchors: rows(body, `${prefix}.anchors`)
          .map((a) => ({ x: num(a.fields.x), y: num(a.fields.y) }))
          .filter((a) => Number.isInteger(a.x) && Number.isInteger(a.y)),
        tiles: rows(body, `${prefix}.tiles`)
          .filter((t) => t.fields.id)
          .map((t) => ({ id: t.fields.id!, weight: num(t.fields.weight) || 0 })),
        effects: rows(body, `${prefix}.effects`)
          .filter((e) => e.fields.id)
          .map((e) => ({ id: e.fields.id!, strength: num(e.fields.strength) || 0 })),
      };
    });

  const landmarks: Landmark[] = rows(body, "landmarks")
    .filter((row) => row.fields.id?.trim() && row.fields.tile)
    .map((row) => ({
      id: row.fields.id!.trim(),
      x: Math.trunc(num(row.fields.x)) || 0,
      y: Math.trunc(num(row.fields.y)) || 0,
      tile: row.fields.tile!,
      ...(spawn === row.index ? { spawn: true } : {}),
    }));

  return {
    bounds: {
      minX: Math.trunc(num(field("bounds.minX"))) || 0,
      maxX: Math.trunc(num(field("bounds.maxX"))) || 0,
      minY: Math.trunc(num(field("bounds.minY"))) || 0,
      maxY: Math.trunc(num(field("bounds.maxY"))) || 0,
    },
    regions,
    landmarks,
  };
}

/** Problems in a map draft that the preview can show without saving. */
const draftProblems = (map: MapData, tiles: Tile[]) => {
  const problems: string[] = [];
  const parsed = MapDataSchema.safeParse(map);
  if (!parsed.success) {
    for (const issue of parsed.error.issues.slice(0, 5)) {
      problems.push(`${issue.path.join(".") || "map"}: ${issue.message}`);
    }
  }
  const tileIds = new Set(tiles.map((t) => t.id));
  const spawns = map.landmarks.filter((l) => l.spawn).length;
  if (spawns !== 1) problems.push(`Exactly one landmark must be the spawn (found ${spawns}).`);
  for (const landmark of map.landmarks) {
    if (!inBounds(map.bounds, landmark.x, landmark.y)) problems.push(`${landmark.id} is outside the bounds.`);
    if (!tileIds.has(landmark.tile)) problems.push(`${landmark.id}: unknown tile ${landmark.tile}.`);
  }
  for (const region of map.regions) {
    for (const anchor of region.anchors) {
      if (!inBounds(map.bounds, anchor.x, anchor.y)) {
        problems.push(`${region.id}: anchor ${anchor.x},${anchor.y} is outside the bounds.`);
      }
    }
  }
  return problems;
};

const MAX_PREVIEW_CELLS = 120 * 120;

export const MapPreview: FC<{ map: MapData; tiles: Tile[] }> = ({ map, tiles }) => {
  const { minX, maxX, minY, maxY } = map.bounds;
  const width = maxX - minX + 1;
  const height = maxY - minY + 1;
  const problems = draftProblems(map, tiles);
  const tilesById = new Map(tiles.map((t) => [t.id, t]));
  const colors = new Map(map.regions.map((r, i) => [r, regionColor(i)]));
  const landmarks = new Map(map.landmarks.map((l) => [cellKey(l.x, l.y), l]));
  const anchors = new Set(map.regions.flatMap((r) => r.anchors.map((a) => cellKey(a.x, a.y))));
  const counts = new Map<MapRegion, number>();
  const drawable = width > 0 && height > 0 && width * height <= MAX_PREVIEW_CELLS;

  const cells: Array<{ key: string; region: string; tile: string; title: string; mark: string }> = [];
  if (drawable) {
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const key = cellKey(x, y);
        const region = regionAt(map, x, y);
        const landmark = landmarks.get(key);
        const tileId =
          landmark?.tile ??
          (region ? pickWeighted(region.tiles, seededUnit(`tile:${x},${y}`))?.id : undefined);
        const tile = tileId ? tilesById.get(tileId) : undefined;
        if (region) counts.set(region, (counts.get(region) ?? 0) + 1);
        cells.push({
          key,
          region: region ? colors.get(region)! : "#1f2937",
          tile: tile?.backgroundColor ?? "#1f2937",
          title: [
            key,
            region ? `region ${region.id}` : "no region",
            landmark ? `landmark ${landmark.id}${landmark.spawn ? " (spawn)" : ""}` : null,
            tile ? tile.name : tileId ? `${tileId} (missing)` : null,
          ]
            .filter(Boolean)
            .join(" · "),
          mark: landmark ? (landmark.spawn ? "★" : "◆") : anchors.has(key) ? "•" : "",
        });
      }
    }
  }

  return (
    <div id="map-preview" class="space-y-3">
      {problems.length > 0 && (
        <ul class="text-xs text-red-300 bg-red-900/30 border border-red-800 rounded p-2 space-y-1">
          {problems.map((p) => (
            <li>{p}</li>
          ))}
        </ul>
      )}
      {drawable ? (
        <div
          id="map-grid"
          class="map-grid"
          data-class="{'tile-view': $tileview}"
          style={`grid-template-columns: repeat(${width}, minmax(0, 1fr));`}
        >
          {cells.map((cell) => (
            <div
              class="map-cell"
              title={cell.title}
              style={`--region: ${cell.region}; --tile: ${cell.tile};`}
            >
              {cell.mark}
            </div>
          ))}
        </div>
      ) : (
        <p class="text-sm text-gray-400">Set bounds (up to {MAX_PREVIEW_CELLS} cells) to see the preview.</p>
      )}
      <ul class="grid grid-cols-2 gap-1 text-xs text-gray-300">
        {map.regions.map((region) => (
          <li class="flex items-center gap-2">
            <span class="inline-block w-3 h-3 rounded-sm" style={`background: ${colors.get(region)}`} />
            <span class="font-mono">{region.id}</span>
            <span class="text-gray-500">
              tier {region.tier} · {counts.get(region) ?? 0} cells
            </span>
          </li>
        ))}
      </ul>
      <p class="text-xs text-gray-500">★ spawn landmark · ◆ landmark · • anchor. Hover a cell for details.</p>
    </div>
  );
};

const TileOptions: FC<{ tiles: Tile[]; selected?: string }> = ({ tiles, selected }) => (
  <>
    {selected && !tiles.some((t) => t.id === selected) && (
      <option value={selected} selected>
        {selected} (missing)
      </option>
    )}
    {tiles.map((t) => (
      <option value={t.id} selected={t.id === selected}>
        {t.name} ({t.id})
      </option>
    ))}
  </>
);

const EffectOptions: FC<{ effects: Effect[]; selected?: string }> = ({ effects, selected }) => (
  <>
    {selected && !effects.some((e) => e.id === selected) && (
      <option value={selected} selected>
        {selected} (missing)
      </option>
    )}
    {effects.map((e) => (
      <option value={e.id} selected={e.id === selected}>
        {e.name} ({e.kind})
      </option>
    ))}
  </>
);

const RemoveButton: FC = () => (
  <button type="button" class="px-2 py-1 text-red-400 hover:text-red-300" onclick="window.removeMapRow(this)">
    ✕
  </button>
);

const AddButton: FC<{ label: string; onclick: string }> = ({ label, onclick }) => (
  <button
    type="button"
    class="w-full py-1 border border-dashed border-gray-500 rounded text-gray-400 hover:border-cyan-500 hover:text-cyan-400 transition text-xs"
    onclick={onclick}
  >
    + {label}
  </button>
);

const AnchorRow: FC<{ r: string; i: string; x?: number; y?: number }> = ({ r, i, x, y }) => (
  <div class="flex items-center gap-2" data-row>
    <span class="text-xs text-gray-400 w-4">x</span>
    <input type="number" name={`regions[${r}].anchors[${i}].x`} value={x} step={1} class={`w-20 ${inputClass}`} />
    <span class="text-xs text-gray-400 w-4">y</span>
    <input type="number" name={`regions[${r}].anchors[${i}].y`} value={y} step={1} class={`w-20 ${inputClass}`} />
    <RemoveButton />
  </div>
);

const RegionTileRow: FC<{ r: string; i: string; tiles: Tile[]; id?: string; weight?: number }> = ({
  r,
  i,
  tiles,
  id,
  weight,
}) => (
  <div class="flex items-center gap-2" data-row>
    <select name={`regions[${r}].tiles[${i}].id`} class={`flex-1 ${inputClass}`}>
      <TileOptions tiles={tiles} selected={id} />
    </select>
    <input
      type="number"
      name={`regions[${r}].tiles[${i}].weight`}
      value={weight ?? 1}
      min={0}
      step="any"
      title="Weight"
      class={`w-20 ${inputClass}`}
    />
    <RemoveButton />
  </div>
);

const RegionEffectRow: FC<{ r: string; i: string; effects: Effect[]; id?: string; strength?: number }> = ({
  r,
  i,
  effects,
  id,
  strength,
}) => (
  <div class="flex items-center gap-2" data-row>
    <select name={`regions[${r}].effects[${i}].id`} class={`flex-1 ${inputClass}`}>
      <EffectOptions effects={effects} selected={id} />
    </select>
    <input
      type="number"
      name={`regions[${r}].effects[${i}].strength`}
      value={strength ?? 1}
      min={0}
      step="any"
      title="Strength"
      class={`w-20 ${inputClass}`}
    />
    <RemoveButton />
  </div>
);

const RegionFields: FC<{ r: string; color: string; region?: MapRegion; tiles: Tile[]; effects: Effect[] }> = ({
  r,
  color,
  region,
  tiles,
  effects,
}) => (
  <div class="bg-gray-700/50 rounded-lg p-3 border border-gray-600 space-y-3" data-row>
    <div class="flex items-center gap-2">
      <span class="inline-block w-4 h-4 rounded-sm shrink-0" style={`background: ${color}`} />
      <input
        type="text"
        name={`regions[${r}].id`}
        value={region?.id ?? ""}
        placeholder="region-id"
        pattern="^[a-z0-9-]+$"
        class={`flex-1 font-mono ${inputClass}`}
      />
      <label class="text-xs text-gray-400">tier</label>
      <input
        type="number"
        name={`regions[${r}].tier`}
        value={region?.tier ?? 0}
        min={0}
        step={1}
        class={`w-16 ${inputClass}`}
      />
      <RemoveButton />
    </div>
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-3">
      <div class="space-y-1">
        <h4 class="text-xs font-medium text-gray-300">Anchors</h4>
        <div id={`region-${r}-anchors`} class="space-y-1">
          {(region?.anchors ?? []).map((a, i) => (
            <AnchorRow r={r} i={String(i)} x={a.x} y={a.y} />
          ))}
        </div>
        <AddButton label="Anchor" onclick={`window.addMapRow('tpl-anchor', 'region-${r}-anchors', { R: '${r}' })`} />
      </div>
      <div class="space-y-1">
        <h4 class="text-xs font-medium text-gray-300">Tiles (weight)</h4>
        <div id={`region-${r}-tiles`} class="space-y-1">
          {(region?.tiles ?? []).map((t, i) => (
            <RegionTileRow r={r} i={String(i)} tiles={tiles} id={t.id} weight={t.weight} />
          ))}
        </div>
        <AddButton label="Tile" onclick={`window.addMapRow('tpl-region-tile', 'region-${r}-tiles', { R: '${r}' })`} />
      </div>
      <div class="space-y-1">
        <h4 class="text-xs font-medium text-gray-300">Effects (strength)</h4>
        <div id={`region-${r}-effects`} class="space-y-1">
          {(region?.effects ?? []).map((e, i) => (
            <RegionEffectRow r={r} i={String(i)} effects={effects} id={e.id} strength={e.strength} />
          ))}
        </div>
        <AddButton
          label="Effect"
          onclick={`window.addMapRow('tpl-region-effect', 'region-${r}-effects', { R: '${r}' })`}
        />
      </div>
    </div>
  </div>
);

const LandmarkRow: FC<{ i: string; tiles: Tile[]; landmark?: Landmark }> = ({ i, tiles, landmark }) => (
  <div class="flex flex-wrap items-center gap-2 bg-gray-700/50 p-2 rounded border border-gray-600" data-row>
    <input
      type="text"
      name={`landmarks[${i}].id`}
      value={landmark?.id ?? ""}
      placeholder="landmark_id"
      pattern="^landmark_[a-z0-9_]+$"
      class={`w-48 font-mono ${inputClass}`}
    />
    <span class="text-xs text-gray-400">x</span>
    <input type="number" name={`landmarks[${i}].x`} value={landmark?.x} step={1} class={`w-16 ${inputClass}`} />
    <span class="text-xs text-gray-400">y</span>
    <input type="number" name={`landmarks[${i}].y`} value={landmark?.y} step={1} class={`w-16 ${inputClass}`} />
    <select name={`landmarks[${i}].tile`} class={`flex-1 min-w-40 ${inputClass}`}>
      <TileOptions tiles={tiles} selected={landmark?.tile} />
    </select>
    <label class="flex items-center gap-1 text-xs text-gray-300" title="Players start here and return here on death">
      <input type="radio" name="spawn" value={i} checked={!!landmark?.spawn} />
      spawn
    </label>
    <RemoveButton />
  </div>
);

interface MapEditorProps {
  map: MapData;
  tiles: Tile[];
  effects: Effect[];
}

export const MapEditor: FC<MapEditorProps> = ({ map, tiles, effects }) => {
  const { bounds } = map;

  return (
    <div id="main-content" data-signals="{tileview: false}">
      <div class="flex justify-between items-center mb-6">
        <h1 class="text-2xl font-bold text-white">🧭 Map</h1>
        <p class="text-sm text-gray-400">
          Regions fill cells from their nearest anchor; landmarks pin a tile to one cell.
        </p>
      </div>

      <template id="tpl-anchor">
        <AnchorRow r="__R__" i="__I__" />
      </template>
      <template id="tpl-region-tile">
        <RegionTileRow r="__R__" i="__I__" tiles={tiles} />
      </template>
      <template id="tpl-region-effect">
        <RegionEffectRow r="__R__" i="__I__" effects={effects} />
      </template>
      <template id="tpl-region">
        <RegionFields r="__I__" color="#6b7280" tiles={tiles} effects={effects} />
      </template>
      <template id="tpl-landmark">
        <LandmarkRow i="__I__" tiles={tiles} />
      </template>

      <div class="grid grid-cols-1 xl:grid-cols-5 gap-6">
        <form
          id="map-form"
          data-testid="map-form"
          class="xl:col-span-3 space-y-6"
          method="post"
          action="/commands/map"
          {...{ "data-on:input__debounce.300ms": "@post('/map/preview', {contentType: 'form'})" }}
        >
          <section class="bg-gray-800 rounded-lg p-4 space-y-3">
            <h2 class="text-lg font-semibold text-white">Bounds</h2>
            <p class="text-xs text-gray-400">Inclusive on every side; may be negative, so the map can grow in any direction.</p>
            <div class="grid grid-cols-4 gap-3">
              {(["minX", "maxX", "minY", "maxY"] as const).map((key) => (
                <label class="text-xs text-gray-300 space-y-1">
                  <span class="block">{key}</span>
                  <input
                    type="number"
                    name={`bounds.${key}`}
                    value={bounds[key]}
                    step={1}
                    class={`w-full ${inputClass}`}
                  />
                </label>
              ))}
            </div>
          </section>

          <section class="bg-gray-800 rounded-lg p-4 space-y-3">
            <h2 class="text-lg font-semibold text-white">Regions</h2>
            <p class="text-xs text-gray-400">
              Region effects apply to every cell of the region and add to the tile's own.
            </p>
            <div id="regions-list" class="space-y-3">
              {map.regions.map((region, index) => (
                <RegionFields
                  r={String(index)}
                  color={regionColor(index)}
                  region={region}
                  tiles={tiles}
                  effects={effects}
                />
              ))}
            </div>
            <AddButton label="Region" onclick="window.addMapRow('tpl-region', 'regions-list')" />
          </section>

          <section class="bg-gray-800 rounded-lg p-4 space-y-3">
            <h2 class="text-lg font-semibold text-white">Landmarks</h2>
            <p class="text-xs text-gray-400">
              Pinned tiles that override the region fill: camp, stations, NPC homes. Exactly one is the spawn.
            </p>
            <div id="landmarks-list" class="space-y-2">
              {map.landmarks.map((landmark, index) => (
                <LandmarkRow i={String(index)} tiles={tiles} landmark={landmark} />
              ))}
            </div>
            <AddButton label="Landmark" onclick="window.addMapRow('tpl-landmark', 'landmarks-list')" />
          </section>

          <button
            type="submit"
            class="px-6 py-2 bg-blue-600 hover:bg-blue-500 rounded text-white font-medium transition"
          >
            Save Map
          </button>
        </form>

        <aside class="xl:col-span-2 bg-gray-800 rounded-lg p-4 space-y-3 self-start xl:sticky xl:top-4">
          <div class="flex items-center justify-between">
            <h2 class="text-lg font-semibold text-white">Preview</h2>
            <label class="flex items-center gap-2 text-xs text-gray-300">
              <input type="checkbox" data-bind="tileview" />
              Tile colours
            </label>
          </div>
          <MapPreview map={map} tiles={tiles} />
        </aside>
      </div>
    </div>
  );
};

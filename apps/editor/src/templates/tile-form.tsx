import type { FC } from "hono/jsx";
import type { Tile } from "../repository/index.js";

interface TileFormProps {
  tile?: Tile;
  isNew?: boolean;
}

export const TileForm: FC<TileFormProps> = ({ tile, isNew = true }) => {
  const defaultTile: Partial<Tile> = {
    id: "",
    name: "",
    color: "#ffffff",
    backgroundColor: "#1a1a1a",
    theme: "forest",
    texture: "grass",
    resources: [],
    rarity: 0.5,
    accessible: true,
  };

  const t = tile || defaultTile;

  return (
    <div id="main-content">
      <div class="flex justify-between items-center mb-6">
        <h1 class="text-2xl font-bold text-white">
          {isNew ? "🗺️ New Tile" : `🗺️ Edit: ${t.name}`}
        </h1>
        <a
          href="/tiles"
          class="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-white font-medium transition"
        >
          ← Back to Tiles
        </a>
      </div>

      <form
        data-testid="tile-form"
        class="bg-gray-800 rounded-lg p-6 max-w-2xl"
        method="post"
        action={isNew ? "/commands/tiles" : `/commands/tiles/${t.id}`}
      >
        <div class="grid grid-cols-2 gap-6">
          <div class="col-span-2 md:col-span-1">
            <label class="block text-sm font-medium text-gray-300 mb-2">
              ID <span class="text-red-400">*</span>
            </label>
            <input
              type="text"
              name="id"
              value={t.id}
              required
              pattern="^tile_[a-z0-9_]+$"
              placeholder="tile_example"
              disabled={!isNew}
              class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 disabled:opacity-50"
            />
          </div>

          <div class="col-span-2 md:col-span-1">
            <label class="block text-sm font-medium text-gray-300 mb-2">
              Name <span class="text-red-400">*</span>
            </label>
            <input
              type="text"
              name="name"
              value={t.name}
              required
              placeholder="Example Tile"
              class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">
              Theme
            </label>
            <select
              name="theme"
              class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-blue-500"
            >
              <option value="forest" selected={t.theme === "forest"}>Forest</option>
              <option value="desert" selected={t.theme === "desert"}>Desert</option>
              <option value="mountain" selected={t.theme === "mountain"}>Mountain</option>
              <option value="water" selected={t.theme === "water"}>Water</option>
              <option value="cave" selected={t.theme === "cave"}>Cave</option>
              <option value="town" selected={t.theme === "town"}>Town</option>
            </select>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">
              Texture
            </label>
            <input
              type="text"
              name="texture"
              value={t.texture}
              placeholder="grass"
              class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">
              Text Color
            </label>
            <div class="flex gap-2">
              <input
                type="color"
                name="color"
                value={t.color}
                class="w-12 h-10 bg-gray-700 border border-gray-600 rounded cursor-pointer"
              />
              <input
                type="text"
                value={t.color}
                disabled
                class="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white opacity-50"
              />
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">
              Background Color
            </label>
            <div class="flex gap-2">
              <input
                type="color"
                name="backgroundColor"
                value={t.backgroundColor}
                class="w-12 h-10 bg-gray-700 border border-gray-600 rounded cursor-pointer"
              />
              <input
                type="text"
                value={t.backgroundColor}
                disabled
                class="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white opacity-50"
              />
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">
              Rarity (0-1)
            </label>
            <input
              type="number"
              name="rarity"
              value={t.rarity}
              min={0}
              max={1}
              step={0.01}
              class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <div class="flex items-center gap-4">
            <label class="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                name="accessible"
                checked={t.accessible}
                class="w-4 h-4 rounded bg-gray-700 border-gray-600 text-blue-500 focus:ring-blue-500"
              />
              <span class="text-sm text-gray-300">Accessible (walkable)</span>
            </label>
          </div>

          <div class="col-span-2">
            <label class="block text-sm font-medium text-gray-300 mb-2">
              Resources (JSON array of resource IDs)
            </label>
            <textarea
              name="resources"
              rows={3}
              placeholder='["resource_tree", "resource_rock"]'
              class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 font-mono text-sm"
            >
              {JSON.stringify(t.resources, null, 2)}
            </textarea>
          </div>

          <div class="col-span-2">
            <label class="block text-sm font-medium text-gray-300 mb-2">
              Preview
            </label>
            <div
              class="w-16 h-16 rounded border border-gray-600 flex items-center justify-center text-2xl"
              style={`background-color: ${t.backgroundColor}; color: ${t.color};`}
            >
              ▓
            </div>
          </div>
        </div>

        <div class="mt-6 flex gap-4">
          <button
            type="submit"
            class="px-6 py-2 bg-blue-600 hover:bg-blue-500 rounded text-white font-medium transition"
          >
            {isNew ? "Create Tile" : "Save Changes"}
          </button>
          <a
            href="/tiles"
            class="px-6 py-2 bg-gray-700 hover:bg-gray-600 rounded text-white font-medium transition"
          >
            Cancel
          </a>
        </div>
      </form>
    </div>
  );
};

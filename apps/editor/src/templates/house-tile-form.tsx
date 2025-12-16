import type { FC } from "hono/jsx";
import type { HouseTile } from "../repository/index.js";

interface HouseTileFormProps {
  houseTile?: HouseTile;
  isNew?: boolean;
}

export const HouseTileForm: FC<HouseTileFormProps> = ({ houseTile, isNew = true }) => {
  const defaultHouseTile: Partial<HouseTile> = {
    id: "",
    name: "",
    description: "",
    sprite: "🏠",
    bgColor: "#374151",
    availableActions: [],
    flags: { isWalkable: true },
  };

  const ht = houseTile || defaultHouseTile;

  return (
    <div id="main-content">
      <div class="flex justify-between items-center mb-6">
        <h1 class="text-2xl font-bold text-white">
          {isNew ? "🏠 New House Tile" : `🏠 Edit: ${ht.name}`}
        </h1>
        <a
          href="/house-tiles"
          class="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-white font-medium transition"
        >
          ← Back to House Tiles
        </a>
      </div>

      <form
        data-testid="house-tile-form"
        class="bg-gray-800 rounded-lg p-6 max-w-3xl"
        method="post"
        action={isNew ? "/commands/house-tiles" : `/commands/house-tiles/${ht.id}`}
      >
        {/* Basic Info Section */}
        <div class="mb-8">
          <h2 class="text-lg font-semibold text-cyan-400 mb-4 border-b border-gray-700 pb-2">
            Basic Information
          </h2>
          <div class="grid grid-cols-2 gap-6">
            <div class="col-span-2 md:col-span-1">
              <label class="block text-sm font-medium text-gray-300 mb-2">
                ID <span class="text-red-400">*</span>
              </label>
              <input
                type="text"
                name="id"
                value={ht.id}
                required
                placeholder="grass_empty"
                disabled={!isNew}
                class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500 disabled:opacity-50"
              />
              <p class="text-xs text-gray-500 mt-1">Unique identifier for this house tile</p>
            </div>

            <div class="col-span-2 md:col-span-1">
              <label class="block text-sm font-medium text-gray-300 mb-2">
                Name <span class="text-red-400">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={ht.name}
                required
                placeholder="Empty Grass"
                class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div class="col-span-2">
              <label class="block text-sm font-medium text-gray-300 mb-2">
                Description <span class="text-red-400">*</span>
              </label>
              <textarea
                name="description"
                required
                rows={3}
                placeholder="A patch of grass that can be developed..."
                class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500"
              >
                {ht.description}
              </textarea>
            </div>
          </div>
        </div>

        {/* Appearance Section */}
        <div class="mb-8">
          <h2 class="text-lg font-semibold text-cyan-400 mb-4 border-b border-gray-700 pb-2">
            Appearance
          </h2>
          <div class="grid grid-cols-2 gap-6">
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-2">
                Sprite (Emoji)
              </label>
              <input
                type="text"
                name="sprite"
                value={ht.sprite}
                placeholder="🏠"
                class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500 text-2xl text-center"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-300 mb-2">
                Background Color
              </label>
              <div class="flex gap-2">
                <input
                  type="color"
                  name="bgColor"
                  value={ht.bgColor || "#374151"}
                  class="w-12 h-10 rounded border border-gray-600 bg-gray-700 cursor-pointer"
                />
                <input
                  type="text"
                  name="bgColorText"
                  value={ht.bgColor || "#374151"}
                  placeholder="#374151"
                  class="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>
            </div>

            {/* Preview */}
            <div class="col-span-2">
              <label class="block text-sm font-medium text-gray-300 mb-2">
                Preview
              </label>
              <div class="flex items-center gap-4">
                <div
                  class="w-16 h-16 rounded flex items-center justify-center text-3xl border border-gray-600"
                  style={`background-color: ${ht.bgColor || '#374151'};`}
                >
                  {ht.sprite || "🏠"}
                </div>
                <div class="text-gray-400 text-sm">
                  This is how the tile will appear in the game
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Actions Section */}
        <div class="mb-8">
          <h2 class="text-lg font-semibold text-cyan-400 mb-4 border-b border-gray-700 pb-2">
            Available Actions
          </h2>
          <div data-testid="action-builder" class="space-y-4">
            {/* Visual Action Cards */}
            {(ht.availableActions || []).length > 0 && (
              <div class="space-y-3">
                {(ht.availableActions || []).map((action, index) => (
                  <div key={action.id || index} class="bg-gray-700 rounded-lg p-4 border border-gray-600">
                    <div class="flex items-start justify-between mb-3">
                      <div class="flex items-center gap-2">
                        <span class="text-cyan-400 font-mono text-sm">#{index + 1}</span>
                        <span class="font-semibold text-white">{action.name}</span>
                      </div>
                      <span class="text-xs px-2 py-1 bg-gray-600 rounded text-gray-300 font-mono">
                        {action.id}
                      </span>
                    </div>
                    <p class="text-sm text-gray-400 mb-3">{action.description}</p>
                    <div class="grid grid-cols-2 gap-4 text-sm">
                      <div data-testid="requirements-section">
                        <span class="text-gray-500">Requirements:</span>
                        <pre class="mt-1 text-xs bg-gray-800 p-2 rounded overflow-x-auto text-gray-300">
                          {JSON.stringify(action.requirements || {}, null, 2)}
                        </pre>
                      </div>
                      <div>
                        <span class="text-gray-500">Result:</span>
                        <pre class="mt-1 text-xs bg-gray-800 p-2 rounded overflow-x-auto text-gray-300">
                          {JSON.stringify(action.result || {}, null, 2)}
                        </pre>
                      </div>
                    </div>
                    <div class="mt-2 flex items-center gap-4 text-xs text-gray-400">
                      <span>Can Undo: {action.canUndo ? "Yes" : "No"}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Add Action Button */}
            <button
              type="button"
              data-testid="add-action"
              class="w-full py-3 border-2 border-dashed border-gray-600 rounded-lg text-gray-400 hover:border-cyan-500 hover:text-cyan-400 transition flex items-center justify-center gap-2"
              onclick="document.getElementById('action-json-editor').classList.toggle('hidden')"
            >
              <span>+</span>
              <span>Add/Edit Actions (JSON)</span>
            </button>

            {/* JSON Editor (collapsible) */}
            <div id="action-json-editor" class={`bg-gray-700 rounded p-4 ${(ht.availableActions || []).length > 0 ? 'hidden' : ''}`}>
              <div class="flex items-center justify-between mb-2">
                <label class="text-sm font-medium text-gray-300">Actions JSON</label>
                <span class="text-xs text-gray-500">Edit the raw JSON to add or modify actions</span>
              </div>
              <textarea
                name="availableActions"
                rows={10}
                placeholder={`[
  {
    "id": "plant_seeds",
    "name": "Plant Seeds",
    "description": "Plant seeds in the soil",
    "requirements": { "items": [{ "item_id": "item_seeds", "qty": 1 }] },
    "result": { "transform_to": "garden_planted" },
    "canUndo": false
  }
]`}
                class="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500 font-mono text-sm"
              >
                {JSON.stringify(ht.availableActions || [], null, 2)}
              </textarea>
              <p class="text-xs text-gray-400 mt-2">
                Each action should have: id, name, description, requirements (optional), result (optional), canUndo (boolean)
              </p>
            </div>
          </div>
        </div>

        {/* Flags Section */}
        <div class="mb-8">
          <h2 class="text-lg font-semibold text-cyan-400 mb-4 border-b border-gray-700 pb-2">
            Flags
          </h2>
          <div class="bg-gray-700 rounded p-4">
            <textarea
              name="flags"
              rows={4}
              placeholder='{"walkable": true, "buildable": true}'
              class="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500 font-mono text-sm"
            >
              {JSON.stringify(ht.flags || {}, null, 2)}
            </textarea>
            <p class="text-xs text-gray-400 mt-2">
              JSON object for tile flags and properties.
            </p>
          </div>
        </div>

        <div class="flex gap-4">
          <button
            type="submit"
            class="px-6 py-2 bg-cyan-600 hover:bg-cyan-500 rounded text-white font-medium transition"
          >
            {isNew ? "Create House Tile" : "Save Changes"}
          </button>
          <a
            href="/house-tiles"
            class="px-6 py-2 bg-gray-700 hover:bg-gray-600 rounded text-white font-medium transition"
          >
            Cancel
          </a>
        </div>
      </form>
    </div>
  );
};

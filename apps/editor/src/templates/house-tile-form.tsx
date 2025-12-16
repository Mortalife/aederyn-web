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
                </div>
                <div class="text-gray-400 text-sm">
                  This is how the tile background will appear in the game
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
            {/* Existing Actions */}
            {(ht.availableActions || []).map((action, index) => (
              <div key={action.id || index} class="bg-gray-700 rounded-lg p-4 border border-gray-600">
                <div class="flex items-start justify-between mb-4">
                  <span class="text-cyan-400 font-mono text-sm">Action #{index + 1}</span>
                  <button
                    type="button"
                    class="text-red-400 hover:text-red-300 text-sm"
                    onclick={`this.closest('.bg-gray-700').remove()`}
                  >
                    ✕ Remove
                  </button>
                </div>
                <div class="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label class="block text-xs text-gray-400 mb-1">Action ID</label>
                    <input
                      type="text"
                      name={`action_${index}_id`}
                      value={action.id}
                      placeholder="plant_seeds"
                      class="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded text-white text-sm"
                    />
                  </div>
                  <div>
                    <label class="block text-xs text-gray-400 mb-1">Action Name</label>
                    <input
                      type="text"
                      name={`action_${index}_name`}
                      value={action.name}
                      placeholder="Plant Seeds"
                      class="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded text-white text-sm"
                    />
                  </div>
                </div>
                <div class="mb-4">
                  <label class="block text-xs text-gray-400 mb-1">Description</label>
                  <input
                    type="text"
                    name={`action_${index}_description`}
                    value={action.description}
                    placeholder="What this action does..."
                    class="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded text-white text-sm"
                  />
                </div>
                <div class="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label class="block text-xs text-gray-400 mb-1">Transform To (Tile ID)</label>
                    <input
                      type="text"
                      name={`action_${index}_transformTo`}
                      value={(action.result as any)?.transform_to || ""}
                      placeholder="garden_planted"
                      class="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded text-white text-sm"
                    />
                  </div>
                  <div>
                    <label class="block text-xs text-gray-400 mb-1">Required Item ID</label>
                    <input
                      type="text"
                      name={`action_${index}_requiredItem`}
                      value={(action.requirements as any)?.items?.[0]?.item_id || ""}
                      placeholder="item_seeds"
                      class="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded text-white text-sm"
                    />
                  </div>
                </div>
                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <label class="block text-xs text-gray-400 mb-1">Required Quantity</label>
                    <input
                      type="number"
                      name={`action_${index}_requiredQty`}
                      value={(action.requirements as any)?.items?.[0]?.qty || 1}
                      min="1"
                      class="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded text-white text-sm"
                    />
                  </div>
                  <div class="flex items-end">
                    <label class="flex items-center gap-2 cursor-pointer pb-2">
                      <input
                        type="checkbox"
                        name={`action_${index}_canUndo`}
                        checked={action.canUndo === true}
                        class="w-4 h-4 rounded bg-gray-600 border-gray-500"
                      />
                      <span class="text-sm text-white">Can Undo</span>
                    </label>
                  </div>
                </div>
              </div>
            ))}

            {/* Add New Action Template (hidden, cloned via JS) */}
            <template id="action-template">
              <div class="bg-gray-700 rounded-lg p-4 border border-gray-600 new-action">
                <div class="flex items-start justify-between mb-4">
                  <span class="text-cyan-400 font-mono text-sm">New Action</span>
                  <button
                    type="button"
                    class="text-red-400 hover:text-red-300 text-sm"
                    onclick="this.closest('.new-action').remove()"
                  >
                    ✕ Remove
                  </button>
                </div>
                <div class="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label class="block text-xs text-gray-400 mb-1">Action ID</label>
                    <input
                      type="text"
                      name="new_action_id"
                      placeholder="plant_seeds"
                      class="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded text-white text-sm"
                    />
                  </div>
                  <div>
                    <label class="block text-xs text-gray-400 mb-1">Action Name</label>
                    <input
                      type="text"
                      name="new_action_name"
                      placeholder="Plant Seeds"
                      class="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded text-white text-sm"
                    />
                  </div>
                </div>
                <div class="mb-4">
                  <label class="block text-xs text-gray-400 mb-1">Description</label>
                  <input
                    type="text"
                    name="new_action_description"
                    placeholder="What this action does..."
                    class="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded text-white text-sm"
                  />
                </div>
                <div class="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label class="block text-xs text-gray-400 mb-1">Transform To (Tile ID)</label>
                    <input
                      type="text"
                      name="new_action_transformTo"
                      placeholder="garden_planted"
                      class="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded text-white text-sm"
                    />
                  </div>
                  <div>
                    <label class="block text-xs text-gray-400 mb-1">Required Item ID</label>
                    <input
                      type="text"
                      name="new_action_requiredItem"
                      placeholder="item_seeds"
                      class="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded text-white text-sm"
                    />
                  </div>
                </div>
                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <label class="block text-xs text-gray-400 mb-1">Required Quantity</label>
                    <input
                      type="number"
                      name="new_action_requiredQty"
                      value="1"
                      min="1"
                      class="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded text-white text-sm"
                    />
                  </div>
                  <div class="flex items-end">
                    <label class="flex items-center gap-2 cursor-pointer pb-2">
                      <input
                        type="checkbox"
                        name="new_action_canUndo"
                        class="w-4 h-4 rounded bg-gray-600 border-gray-500"
                      />
                      <span class="text-sm text-white">Can Undo</span>
                    </label>
                  </div>
                </div>
              </div>
            </template>

            {/* Add Action Button */}
            <button
              type="button"
              data-testid="add-action"
              class="w-full py-3 border-2 border-dashed border-gray-600 rounded-lg text-gray-400 hover:border-cyan-500 hover:text-cyan-400 transition flex items-center justify-center gap-2"
              onclick="const t = document.getElementById('action-template'); const clone = t.content.cloneNode(true); this.parentNode.insertBefore(clone, this);"
            >
              <span>+</span>
              <span>Add Action</span>
            </button>
          </div>
        </div>

        {/* Flags Section */}
        <div class="mb-8">
          <h2 class="text-lg font-semibold text-cyan-400 mb-4 border-b border-gray-700 pb-2">
            Flags
          </h2>
          <div class="bg-gray-700 rounded p-4 space-y-3">
            <label class="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                name="flags_isWalkable"
                checked={(ht.flags as any)?.isWalkable !== false}
                class="w-4 h-4 rounded bg-gray-600 border-gray-500"
              />
              <div>
                <span class="text-white">Walkable</span>
                <p class="text-xs text-gray-400">Player can walk on this tile</p>
              </div>
            </label>
            <label class="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                name="flags_isBuildable"
                checked={(ht.flags as any)?.isBuildable === true}
                class="w-4 h-4 rounded bg-gray-600 border-gray-500"
              />
              <div>
                <span class="text-white">Buildable</span>
                <p class="text-xs text-gray-400">Can place structures on this tile</p>
              </div>
            </label>
            <label class="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                name="flags_isInteractable"
                checked={(ht.flags as any)?.isInteractable === true}
                class="w-4 h-4 rounded bg-gray-600 border-gray-500"
              />
              <div>
                <span class="text-white">Interactable</span>
                <p class="text-xs text-gray-400">Player can interact with this tile</p>
              </div>
            </label>
            <label class="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                name="flags_isDestructible"
                checked={(ht.flags as any)?.isDestructible === true}
                class="w-4 h-4 rounded bg-gray-600 border-gray-500"
              />
              <div>
                <span class="text-white">Destructible</span>
                <p class="text-xs text-gray-400">This tile can be destroyed or removed</p>
              </div>
            </label>
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

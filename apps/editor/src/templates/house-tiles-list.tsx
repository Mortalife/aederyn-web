import type { FC } from "hono/jsx";
import type { HouseTile } from "../repository/index.js";

interface HouseTilesListProps {
  houseTiles: Record<string, HouseTile>;
}

export const HouseTilesList: FC<HouseTilesListProps> = ({ houseTiles }) => {
  const tiles = Object.values(houseTiles);

  return (
    <div id="main-content">
      <div class="flex justify-between items-center mb-6">
        <h1 class="text-2xl font-bold text-white">🏠 House Tiles</h1>
        <a
          href="/house-tiles/new"
          data-testid="new-house-tile-btn"
          class="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 rounded text-white font-medium transition"
        >
          + New House Tile
        </a>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="house-tiles-list">
        {tiles.length === 0 ? (
          <div class="col-span-full text-center py-8 text-gray-400">
            No house tiles found. Create your first house tile!
          </div>
        ) : (
          tiles.map((tile) => (
            <div
              key={tile.id}
              data-testid="house-tile-card"
              class="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-cyan-500/50 transition"
            >
              <div class="flex items-start justify-between mb-3">
                <div>
                  <h3 class="text-lg font-semibold text-white">{tile.name}</h3>
                  <p class="text-sm text-gray-400 font-mono">{tile.id}</p>
                </div>
                <div
                  class="w-10 h-10 rounded flex items-center justify-center text-xl"
                  style={`background-color: ${tile.bgColor || '#374151'};`}
                >
                  {tile.sprite || "🏠"}
                </div>
              </div>
              <p class="text-sm text-gray-300 line-clamp-2 mb-3">{tile.description}</p>
              <div data-testid="state-preview" class="mb-3 p-2 bg-gray-700 rounded text-xs">
                <span class="text-gray-400">Actions:</span>{" "}
                <span class="text-cyan-400">{tile.availableActions?.length || 0}</span>
              </div>
              <div class="flex justify-end space-x-2">
                <a
                  href={`/house-tiles/${tile.id}`}
                  class="text-sm text-blue-400 hover:text-blue-300"
                >
                  Edit
                </a>
                <form
                  method="post"
                  action={`/commands/house-tiles/${tile.id}/delete`}
                  class="inline"
                >
                  <button
                    type="submit"
                    data-testid="delete-btn"
                    class="text-sm text-red-400 hover:text-red-300"
                  >
                    Delete
                  </button>
                </form>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

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

      <div class="bg-gray-800 rounded-lg overflow-hidden">
        <table data-testid="house-tiles-list" class="w-full">
          <thead class="bg-gray-700">
            <tr>
              <th class="px-4 py-3 text-left text-sm font-medium text-gray-300">Preview</th>
              <th class="px-4 py-3 text-left text-sm font-medium text-gray-300">Name</th>
              <th class="px-4 py-3 text-left text-sm font-medium text-gray-300">ID</th>
              <th class="px-4 py-3 text-left text-sm font-medium text-gray-300">Description</th>
              <th class="px-4 py-3 text-left text-sm font-medium text-gray-300">Actions</th>
              <th class="px-4 py-3 text-right text-sm font-medium text-gray-300">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-700">
            {tiles.length === 0 ? (
              <tr>
                <td colspan={6} class="px-4 py-8 text-center text-gray-400">
                  No house tiles found. Create your first house tile!
                </td>
              </tr>
            ) : (
              tiles.map((tile) => (
                <tr key={tile.id} data-testid="house-tile-row" class="hover:bg-gray-700/50 transition">
                  <td class="px-4 py-3">
                    <div
                      class="w-10 h-10 rounded"
                      style={`background-color: ${tile.bgColor || '#374151'};`}
                    />
                  </td>
                  <td class="px-4 py-3 text-white font-medium">{tile.name}</td>
                  <td class="px-4 py-3 text-gray-400 font-mono text-sm">{tile.id}</td>
                  <td class="px-4 py-3 text-gray-300 text-sm max-w-xs truncate">{tile.description}</td>
                  <td class="px-4 py-3">
                    <span class="px-2 py-1 rounded text-xs font-medium bg-cyan-500/20 text-cyan-400">
                      {tile.availableActions?.length || 0} actions
                    </span>
                  </td>
                  <td class="px-4 py-3 text-right">
                    <a
                      href={`/house-tiles/${tile.id}`}
                      class="text-blue-400 hover:text-blue-300 mr-3"
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
                        class="text-red-400 hover:text-red-300"
                      >
                        Delete
                      </button>
                    </form>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

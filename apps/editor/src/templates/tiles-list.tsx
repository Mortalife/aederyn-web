import type { FC } from "hono/jsx";
import type { Tile } from "../repository/index.js";

interface TilesListProps {
  tiles: Tile[];
}

export const TilesList: FC<TilesListProps> = ({ tiles }) => {
  return (
    <div id="main-content">
      <div class="flex justify-between items-center mb-6">
        <h1 class="text-2xl font-bold text-white">🗺️ Tiles</h1>
        <a
          href="/tiles/new"
          data-testid="new-tile-btn"
          class="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded text-white font-medium transition"
        >
          + New Tile
        </a>
      </div>

      <div class="bg-gray-800 rounded-lg overflow-hidden">
        <table data-testid="tiles-table" class="w-full">
          <thead class="bg-gray-700">
            <tr>
              <th class="px-4 py-3 text-left text-sm font-medium text-gray-300">Preview</th>
              <th class="px-4 py-3 text-left text-sm font-medium text-gray-300">Name</th>
              <th class="px-4 py-3 text-left text-sm font-medium text-gray-300">ID</th>
              <th class="px-4 py-3 text-left text-sm font-medium text-gray-300">Theme</th>
              <th class="px-4 py-3 text-left text-sm font-medium text-gray-300">Rarity</th>
              <th class="px-4 py-3 text-left text-sm font-medium text-gray-300">Resources</th>
              <th class="px-4 py-3 text-right text-sm font-medium text-gray-300">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-700">
            {tiles.length === 0 ? (
              <tr>
                <td colspan={7} class="px-4 py-8 text-center text-gray-400">
                  No tiles found. Create your first tile!
                </td>
              </tr>
            ) : (
              tiles.map((tile) => (
                <tr key={tile.id} class="hover:bg-gray-700/50 transition">
                  <td class="px-4 py-3">
                    <div
                      class="w-8 h-8 rounded border border-gray-600"
                      style={`background-color: ${tile.backgroundColor}; color: ${tile.color};`}
                    >
                      <span class="flex items-center justify-center h-full text-xs">▓</span>
                    </div>
                  </td>
                  <td class="px-4 py-3 text-white font-medium">{tile.name}</td>
                  <td class="px-4 py-3 text-gray-400 font-mono text-sm">{tile.id}</td>
                  <td class="px-4 py-3 text-gray-300">{tile.theme}</td>
                  <td class="px-4 py-3 text-gray-300">{(tile.rarity * 100).toFixed(0)}%</td>
                  <td class="px-4 py-3 text-gray-300">{tile.resources.length}</td>
                  <td class="px-4 py-3 text-right">
                    <a
                      href={`/tiles/${tile.id}`}
                      class="text-blue-400 hover:text-blue-300 mr-3"
                    >
                      Edit
                    </a>
                    <form
                      method="post"
                      action={`/commands/tiles/${tile.id}/delete`}
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

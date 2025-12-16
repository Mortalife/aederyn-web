import type { FC } from "hono/jsx";
import type { Item } from "../repository/index.js";

interface ItemsListProps {
  items: Item[];
}

export const ItemsList: FC<ItemsListProps> = ({ items }) => {
  return (
    <div id="main-content">
      <div class="flex justify-between items-center mb-6">
        <h1 class="text-2xl font-bold text-white">📦 Items</h1>
        <a
          href="/items/new"
          data-testid="new-item-btn"
          class="px-4 py-2 bg-amber-600 hover:bg-amber-500 rounded text-white font-medium transition"
        >
          + New Item
        </a>
      </div>

      <div class="bg-gray-800 rounded-lg overflow-hidden">
        <table data-testid="items-table" class="w-full">
          <thead class="bg-gray-700">
            <tr>
              <th class="px-4 py-3 text-left text-sm font-medium text-gray-300">Name</th>
              <th class="px-4 py-3 text-left text-sm font-medium text-gray-300">ID</th>
              <th class="px-4 py-3 text-left text-sm font-medium text-gray-300">Type</th>
              <th class="px-4 py-3 text-left text-sm font-medium text-gray-300">Rarity</th>
              <th class="px-4 py-3 text-left text-sm font-medium text-gray-300">Value</th>
              <th class="px-4 py-3 text-right text-sm font-medium text-gray-300">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-700">
            {items.length === 0 ? (
              <tr>
                <td colspan={6} class="px-4 py-8 text-center text-gray-400">
                  No items found. Create your first item!
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id} class="hover:bg-gray-700/50 transition">
                  <td class="px-4 py-3 text-white font-medium">{item.name}</td>
                  <td class="px-4 py-3 text-gray-400 font-mono text-sm">{item.id}</td>
                  <td class="px-4 py-3">
                    <span class={`px-2 py-1 rounded text-xs font-medium ${getTypeColor(item.type)}`}>
                      {item.type}
                    </span>
                  </td>
                  <td class="px-4 py-3">
                    <span class={`px-2 py-1 rounded text-xs font-medium ${getRarityColor(item.rarity)}`}>
                      {item.rarity}
                    </span>
                  </td>
                  <td class="px-4 py-3 text-gray-300">{item.value}g</td>
                  <td class="px-4 py-3 text-right">
                    <a
                      href={`/items/${item.id}`}
                      class="text-blue-400 hover:text-blue-300 mr-3"
                    >
                      Edit
                    </a>
                    <form
                      method="post"
                      action={`/commands/items/${item.id}/delete`}
                      class="inline"
                      data-on-submit="confirm('Delete this item?') || $event.preventDefault()"
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

function getTypeColor(type: string): string {
  const colors: Record<string, string> = {
    resource: "bg-emerald-500/20 text-emerald-400",
    tool: "bg-blue-500/20 text-blue-400",
    weapon: "bg-red-500/20 text-red-400",
    armor: "bg-purple-500/20 text-purple-400",
    consumable: "bg-pink-500/20 text-pink-400",
    quest: "bg-yellow-500/20 text-yellow-400",
    item: "bg-gray-500/20 text-gray-400",
  };
  return colors[type] || colors.item;
}

function getRarityColor(rarity: string): string {
  const colors: Record<string, string> = {
    common: "bg-gray-500/20 text-gray-400",
    uncommon: "bg-green-500/20 text-green-400",
    rare: "bg-blue-500/20 text-blue-400",
    epic: "bg-purple-500/20 text-purple-400",
    legendary: "bg-orange-500/20 text-orange-400",
  };
  return colors[rarity] || colors.common;
}

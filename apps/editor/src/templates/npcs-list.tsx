import type { FC } from "hono/jsx";
import type { NPC } from "../repository/index.js";

interface NPCsListProps {
  npcs: NPC[];
}

export const NPCsList: FC<NPCsListProps> = ({ npcs }) => {
  return (
    <div id="main-content">
      <div class="flex justify-between items-center mb-6">
        <h1 class="text-2xl font-bold text-white">👤 NPCs</h1>
        <a
          href="/npcs/new"
          data-testid="new-npc-btn"
          class="px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded text-white font-medium transition"
        >
          + New NPC
        </a>
      </div>

      <div class="bg-gray-800 rounded-lg overflow-hidden">
        <table data-testid="npcs-list" class="w-full">
          <thead class="bg-gray-700">
            <tr>
              <th class="px-4 py-3 text-left text-sm font-medium text-gray-300">Name</th>
              <th class="px-4 py-3 text-left text-sm font-medium text-gray-300">ID</th>
              <th class="px-4 py-3 text-left text-sm font-medium text-gray-300">Backstory</th>
              <th class="px-4 py-3 text-left text-sm font-medium text-gray-300">Relationships</th>
              <th class="px-4 py-3 text-right text-sm font-medium text-gray-300">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-700">
            {npcs.length === 0 ? (
              <tr>
                <td colspan={5} class="px-4 py-8 text-center text-gray-400">
                  No NPCs found. Create your first NPC!
                </td>
              </tr>
            ) : (
              npcs.map((npc) => (
                <tr key={npc.entity_id} data-testid="npc-row" class="hover:bg-gray-700/50 transition">
                  <td class="px-4 py-3">
                    <div class="flex items-center gap-2">
                      <span class="text-xl">👤</span>
                      <span class="text-white font-medium">{npc.name}</span>
                    </div>
                  </td>
                  <td class="px-4 py-3 text-gray-400 font-mono text-sm">{npc.entity_id}</td>
                  <td class="px-4 py-3 text-gray-300 text-sm max-w-xs truncate">{npc.backstory}</td>
                  <td class="px-4 py-3">
                    <span class="px-2 py-1 rounded text-xs font-medium bg-purple-500/20 text-purple-400">
                      {Object.values(npc.relationships || {}).flat().length} relationships
                    </span>
                  </td>
                  <td class="px-4 py-3 text-right">
                    <a
                      href={`/npcs/${npc.entity_id}`}
                      class="text-blue-400 hover:text-blue-300 mr-3"
                    >
                      Edit
                    </a>
                    <form
                      method="post"
                      action={`/commands/npcs/${npc.entity_id}/delete`}
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

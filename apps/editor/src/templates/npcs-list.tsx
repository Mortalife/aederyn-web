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

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="npcs-list">
        {npcs.length === 0 ? (
          <div class="col-span-full text-center py-8 text-gray-400">
            No NPCs found. Create your first NPC!
          </div>
        ) : (
          npcs.map((npc) => (
            <div key={npc.entity_id} class="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-purple-500/50 transition">
              <div class="flex items-start justify-between mb-3">
                <div>
                  <h3 class="text-lg font-semibold text-white">{npc.name}</h3>
                  <p class="text-sm text-gray-400 font-mono">{npc.entity_id}</p>
                </div>
                <span class="text-2xl">👤</span>
              </div>
              <p class="text-sm text-gray-300 line-clamp-2 mb-3">{npc.backstory}</p>
              <div class="flex justify-between items-center">
                <span class="text-xs text-gray-500">
                  {Object.keys(npc.relationships).length} relationships
                </span>
                <div class="space-x-2">
                  <a
                    href={`/npcs/${npc.entity_id}`}
                    class="text-sm text-blue-400 hover:text-blue-300"
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
                      class="text-sm text-red-400 hover:text-red-300"
                    >
                      Delete
                    </button>
                  </form>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

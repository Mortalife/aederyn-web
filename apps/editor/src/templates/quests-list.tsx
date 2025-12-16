import type { FC } from "hono/jsx";
import type { Quest } from "../repository/index.js";

interface QuestsListProps {
  quests: Quest[];
}

export const QuestsList: FC<QuestsListProps> = ({ quests }) => {
  return (
    <div id="main-content">
      <div class="flex justify-between items-center mb-6">
        <h1 class="text-2xl font-bold text-white">📜 Quests</h1>
        <a
          href="/quests/new"
          data-testid="new-quest-btn"
          class="px-4 py-2 bg-rose-600 hover:bg-rose-500 rounded text-white font-medium transition"
        >
          + New Quest
        </a>
      </div>

      <div class="bg-gray-800 rounded-lg overflow-hidden" data-testid="quests-list">
        <table class="w-full">
          <thead class="bg-gray-700">
            <tr>
              <th class="px-4 py-3 text-left text-sm font-medium text-gray-300">Name</th>
              <th class="px-4 py-3 text-left text-sm font-medium text-gray-300">ID</th>
              <th class="px-4 py-3 text-left text-sm font-medium text-gray-300">Type</th>
              <th class="px-4 py-3 text-left text-sm font-medium text-gray-300">Giver</th>
              <th class="px-4 py-3 text-left text-sm font-medium text-gray-300">Objectives</th>
              <th class="px-4 py-3 text-right text-sm font-medium text-gray-300">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-700">
            {quests.length === 0 ? (
              <tr>
                <td colspan={6} class="px-4 py-8 text-center text-gray-400">
                  No quests found. Create your first quest!
                </td>
              </tr>
            ) : (
              quests.map((quest) => (
                <tr key={quest.id} class="hover:bg-gray-700/50 transition">
                  <td class="px-4 py-3 text-white font-medium">{quest.name}</td>
                  <td class="px-4 py-3 text-gray-400 font-mono text-sm">{quest.id}</td>
                  <td class="px-4 py-3">
                    <span class={`px-2 py-1 rounded text-xs font-medium ${getQuestTypeColor(quest.type)}`}>
                      {quest.type}
                    </span>
                  </td>
                  <td class="px-4 py-3 text-gray-300">{quest.giver.entity_id}</td>
                  <td class="px-4 py-3 text-gray-300">{quest.objectives.length}</td>
                  <td class="px-4 py-3 text-right">
                    <a
                      href={`/quests/${quest.id}`}
                      class="text-blue-400 hover:text-blue-300 mr-3"
                    >
                      Edit
                    </a>
                    <form
                      method="post"
                      action={`/commands/quests/${quest.id}/delete`}
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

function getQuestTypeColor(type: string): string {
  const colors: Record<string, string> = {
    collection: "bg-emerald-500/20 text-emerald-400",
    crafting: "bg-blue-500/20 text-blue-400",
    exploration: "bg-yellow-500/20 text-yellow-400",
    combat: "bg-red-500/20 text-red-400",
    delivery: "bg-purple-500/20 text-purple-400",
    dialog: "bg-pink-500/20 text-pink-400",
  };
  return colors[type] || "bg-gray-500/20 text-gray-400";
}

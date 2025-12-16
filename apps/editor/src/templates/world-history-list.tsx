import type { FC } from "hono/jsx";
import type { WorldHistoryEvent } from "@aederyn/types";

interface WorldHistoryListProps {
  history: WorldHistoryEvent[];
}

export const WorldHistoryList: FC<WorldHistoryListProps> = ({ history }) => {
  return (
    <div id="main-content">
      <div class="flex items-center justify-between mb-6">
        <div class="flex items-center gap-4">
          <a href="/world" class="text-gray-400 hover:text-white">
            ← Back
          </a>
          <h1 class="text-2xl font-bold text-white">📜 History</h1>
        </div>
        <a
          href="/world/history/new"
          class="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-white font-medium"
        >
          + Add Event
        </a>
      </div>

      {history.length === 0 ? (
        <div class="text-center py-12 bg-gray-800 rounded-lg">
          <p class="text-gray-400 mb-4">No historical events recorded yet</p>
          <a href="/world/history/new" class="text-blue-400 hover:underline">
            Create your first historical event
          </a>
        </div>
      ) : (
        <div class="space-y-4">
          {history.map((event) => (
            <a
              key={event.id}
              href={`/world/history/${event.id}`}
              class="block p-4 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"
            >
              <div class="flex items-center justify-between mb-2">
                <h3 class="font-semibold text-white">{event.name}</h3>
                {event.era && (
                  <span class="px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded text-xs">
                    {event.era}
                  </span>
                )}
              </div>
              <p class="text-gray-400 text-sm mb-2 line-clamp-2">
                {event.description || "No description"}
              </p>
              {event.significance && (
                <p class="text-gray-500 text-xs italic">
                  Significance: {event.significance}
                </p>
              )}
            </a>
          ))}
        </div>
      )}
    </div>
  );
};

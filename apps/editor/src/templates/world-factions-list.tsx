import type { FC } from "hono/jsx";
import type { WorldFaction } from "@aederyn/types";

interface WorldFactionsListProps {
  factions: WorldFaction[];
}

export const WorldFactionsList: FC<WorldFactionsListProps> = ({ factions }) => {
  return (
    <div id="main-content">
      <div class="flex items-center justify-between mb-6">
        <div class="flex items-center gap-4">
          <a href="/world" class="text-gray-400 hover:text-white">
            ← Back
          </a>
          <h1 class="text-2xl font-bold text-white">⚔️ Factions</h1>
        </div>
        <a
          href="/world/factions/new"
          class="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-white font-medium"
        >
          + Add Faction
        </a>
      </div>

      {factions.length === 0 ? (
        <div class="text-center py-12 bg-gray-800 rounded-lg">
          <p class="text-gray-400 mb-4">No factions defined yet</p>
          <a href="/world/factions/new" class="text-blue-400 hover:underline">
            Create your first faction
          </a>
        </div>
      ) : (
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {factions.map((faction) => (
            <a
              key={faction.id}
              href={`/world/factions/${faction.id}`}
              class="block p-4 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"
            >
              <div class="flex items-center gap-2 mb-2">
                <h3 class="font-semibold text-white">{faction.name}</h3>
                <span
                  class={`px-2 py-0.5 rounded text-xs ${
                    faction.alignment === "friendly"
                      ? "bg-green-500/20 text-green-400"
                      : faction.alignment === "hostile"
                      ? "bg-red-500/20 text-red-400"
                      : "bg-gray-500/20 text-gray-400"
                  }`}
                >
                  {faction.alignment}
                </span>
              </div>
              <p class="text-gray-400 text-sm mb-2 line-clamp-2">
                {faction.description || "No description"}
              </p>
              <div class="text-xs text-gray-500">
                {faction.members.length} member{faction.members.length !== 1 ? "s" : ""}
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
};

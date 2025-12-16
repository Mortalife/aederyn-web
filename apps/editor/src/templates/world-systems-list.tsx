import type { FC } from "hono/jsx";
import type { WorldSystem } from "@aederyn/types";

interface WorldSystemsListProps {
  systems: WorldSystem[];
}

export const WorldSystemsList: FC<WorldSystemsListProps> = ({ systems }) => {
  return (
    <div id="main-content">
      <div class="flex items-center justify-between mb-6">
        <div class="flex items-center gap-4">
          <a href="/world" class="text-gray-400 hover:text-white">
            ← Back
          </a>
          <h1 class="text-2xl font-bold text-white">✨ Systems</h1>
        </div>
        <a
          href="/world/systems/new"
          class="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-white font-medium"
        >
          + Add System
        </a>
      </div>

      {systems.length === 0 ? (
        <div class="text-center py-12 bg-gray-800 rounded-lg">
          <p class="text-gray-400 mb-4">No systems defined yet</p>
          <a href="/world/systems/new" class="text-blue-400 hover:underline">
            Create your first system (magic, technology, etc.)
          </a>
        </div>
      ) : (
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {systems.map((system) => (
            <a
              key={system.id}
              href={`/world/systems/${system.id}`}
              class="block p-4 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"
            >
              <div class="flex items-center gap-2 mb-2">
                <h3 class="font-semibold text-white">{system.name}</h3>
                <span
                  class={`px-2 py-0.5 rounded text-xs ${
                    system.type === "magic"
                      ? "bg-violet-500/20 text-violet-400"
                      : system.type === "technology"
                      ? "bg-cyan-500/20 text-cyan-400"
                      : "bg-amber-500/20 text-amber-400"
                  }`}
                >
                  {system.type}
                </span>
              </div>
              <p class="text-gray-400 text-sm mb-3 line-clamp-2">
                {system.description || "No description"}
              </p>
              <div class="text-xs text-gray-500">
                {system.rules.length} rule{system.rules.length !== 1 ? "s" : ""} •{" "}
                {system.limitations.length} limitation{system.limitations.length !== 1 ? "s" : ""}
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
};

import type { FC } from "hono/jsx";
import type { WorldRegion } from "@aederyn/types";

interface WorldRegionsListProps {
  regions: WorldRegion[];
}

export const WorldRegionsList: FC<WorldRegionsListProps> = ({ regions }) => {
  return (
    <div id="main-content">
      <div class="flex items-center justify-between mb-6">
        <div class="flex items-center gap-4">
          <a href="/world" class="text-gray-400 hover:text-white">
            ← Back
          </a>
          <h1 class="text-2xl font-bold text-white">🗺️ Regions</h1>
        </div>
        <a
          href="/world/regions/new"
          class="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-white font-medium"
        >
          + Add Region
        </a>
      </div>

      {regions.length === 0 ? (
        <div class="text-center py-12 bg-gray-800 rounded-lg">
          <p class="text-gray-400 mb-4">No regions defined yet</p>
          <a
            href="/world/regions/new"
            class="text-blue-400 hover:underline"
          >
            Create your first region
          </a>
        </div>
      ) : (
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {regions.map((region) => (
            <a
              key={region.id}
              href={`/world/regions/${region.id}`}
              class="block p-4 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"
            >
              <h3 class="font-semibold text-white mb-2">{region.name}</h3>
              <p class="text-gray-400 text-sm mb-2 line-clamp-2">
                {region.description || "No description"}
              </p>
              <div class="flex flex-wrap gap-2 text-xs">
                {region.climate && (
                  <span class="px-2 py-0.5 bg-cyan-500/20 text-cyan-400 rounded">
                    {region.climate}
                  </span>
                )}
                {region.themes.slice(0, 2).map((theme) => (
                  <span key={theme} class="px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded">
                    {theme}
                  </span>
                ))}
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
};

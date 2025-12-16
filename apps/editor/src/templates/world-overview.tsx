import type { FC } from "hono/jsx";
import type { WorldBible } from "@aederyn/types";

interface WorldOverviewProps {
  worldBible: WorldBible;
}

export const WorldOverview: FC<WorldOverviewProps> = ({ worldBible }) => {
  return (
    <div id="main-content">
      <div class="flex items-center justify-between mb-6">
        <h1 class="text-2xl font-bold text-white">🌍 World Bible</h1>
        <span class="text-sm text-gray-500">
          Last updated: {new Date(worldBible.updatedAt).toLocaleDateString()}
        </span>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <a
          href="/world/setting"
          class="block p-6 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"
        >
          <div class="flex items-center gap-3 mb-3">
            <span class="text-2xl">⚙️</span>
            <h2 class="text-lg font-semibold text-white">Setting</h2>
          </div>
          <p class="text-gray-400 text-sm mb-2">
            {worldBible.setting.genre} • {worldBible.setting.tone} •{" "}
            {worldBible.setting.era}
          </p>
          <p class="text-gray-500 text-sm line-clamp-2">
            {worldBible.setting.description || "No description set"}
          </p>
        </a>

        <a
          href="/world/regions"
          class="block p-6 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"
        >
          <div class="flex items-center gap-3 mb-3">
            <span class="text-2xl">🗺️</span>
            <h2 class="text-lg font-semibold text-white">Regions</h2>
          </div>
          <p class="text-gray-400 text-sm">
            {worldBible.regions.length} region
            {worldBible.regions.length !== 1 ? "s" : ""} defined
          </p>
          {worldBible.regions.length > 0 && (
            <div class="mt-2 flex flex-wrap gap-1">
              {worldBible.regions.slice(0, 3).map((r) => (
                <span
                  key={r.id}
                  class="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded text-xs"
                >
                  {r.name}
                </span>
              ))}
              {worldBible.regions.length > 3 && (
                <span class="text-gray-500 text-xs">
                  +{worldBible.regions.length - 3} more
                </span>
              )}
            </div>
          )}
        </a>

        <a
          href="/world/factions"
          class="block p-6 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"
        >
          <div class="flex items-center gap-3 mb-3">
            <span class="text-2xl">⚔️</span>
            <h2 class="text-lg font-semibold text-white">Factions</h2>
          </div>
          <p class="text-gray-400 text-sm">
            {worldBible.factions.length} faction
            {worldBible.factions.length !== 1 ? "s" : ""} defined
          </p>
          {worldBible.factions.length > 0 && (
            <div class="mt-2 flex flex-wrap gap-1">
              {worldBible.factions.slice(0, 3).map((f) => (
                <span
                  key={f.id}
                  class={`px-2 py-0.5 rounded text-xs ${
                    f.alignment === "friendly"
                      ? "bg-green-500/20 text-green-400"
                      : f.alignment === "hostile"
                      ? "bg-red-500/20 text-red-400"
                      : "bg-gray-500/20 text-gray-400"
                  }`}
                >
                  {f.name}
                </span>
              ))}
              {worldBible.factions.length > 3 && (
                <span class="text-gray-500 text-xs">
                  +{worldBible.factions.length - 3} more
                </span>
              )}
            </div>
          )}
        </a>

        <a
          href="/world/history"
          class="block p-6 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"
        >
          <div class="flex items-center gap-3 mb-3">
            <span class="text-2xl">📜</span>
            <h2 class="text-lg font-semibold text-white">History</h2>
          </div>
          <p class="text-gray-400 text-sm">
            {worldBible.history.length} event
            {worldBible.history.length !== 1 ? "s" : ""} recorded
          </p>
          {worldBible.history.length > 0 && (
            <div class="mt-2 space-y-1">
              {worldBible.history.slice(0, 2).map((h) => (
                <p key={h.id} class="text-gray-500 text-xs truncate">
                  • {h.name}
                </p>
              ))}
            </div>
          )}
        </a>

        <a
          href="/world/themes"
          class="block p-6 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"
        >
          <div class="flex items-center gap-3 mb-3">
            <span class="text-2xl">🎭</span>
            <h2 class="text-lg font-semibold text-white">Themes</h2>
          </div>
          <p class="text-gray-400 text-sm">
            {worldBible.themes.length} theme
            {worldBible.themes.length !== 1 ? "s" : ""} defined
          </p>
          {worldBible.themes.length > 0 && (
            <div class="mt-2 flex flex-wrap gap-1">
              {worldBible.themes.slice(0, 4).map((t) => (
                <span
                  key={t.id}
                  class="px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded text-xs"
                >
                  {t.name}
                </span>
              ))}
            </div>
          )}
        </a>

        <a
          href="/world/systems"
          class="block p-6 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"
        >
          <div class="flex items-center gap-3 mb-3">
            <span class="text-2xl">✨</span>
            <h2 class="text-lg font-semibold text-white">Systems</h2>
          </div>
          <p class="text-gray-400 text-sm">
            {worldBible.systems.length} system
            {worldBible.systems.length !== 1 ? "s" : ""} defined
          </p>
          {worldBible.systems.length > 0 && (
            <div class="mt-2 flex flex-wrap gap-1">
              {worldBible.systems.map((s) => (
                <span
                  key={s.id}
                  class={`px-2 py-0.5 rounded text-xs ${
                    s.type === "magic"
                      ? "bg-violet-500/20 text-violet-400"
                      : s.type === "technology"
                      ? "bg-cyan-500/20 text-cyan-400"
                      : "bg-amber-500/20 text-amber-400"
                  }`}
                >
                  {s.name}
                </span>
              ))}
            </div>
          )}
        </a>

        <a
          href="/world/naming"
          class="block p-6 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"
        >
          <div class="flex items-center gap-3 mb-3">
            <span class="text-2xl">📝</span>
            <h2 class="text-lg font-semibold text-white">Naming</h2>
          </div>
          <p class="text-gray-400 text-sm">Naming conventions and patterns</p>
          <div class="mt-2 text-gray-500 text-xs">
            <p>
              {worldBible.naming.characterPatterns.length} character patterns
            </p>
            <p>{worldBible.naming.placePatterns.length} place patterns</p>
            <p>{worldBible.naming.itemPatterns.length} item patterns</p>
          </div>
        </a>
      </div>

      <div class="mt-8 p-6 bg-gray-800 rounded-lg">
        <h2 class="text-lg font-semibold text-white mb-4">World Summary</h2>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <p class="text-2xl font-bold text-blue-400">
              {worldBible.regions.length}
            </p>
            <p class="text-sm text-gray-500">Regions</p>
          </div>
          <div>
            <p class="text-2xl font-bold text-green-400">
              {worldBible.factions.length}
            </p>
            <p class="text-sm text-gray-500">Factions</p>
          </div>
          <div>
            <p class="text-2xl font-bold text-amber-400">
              {worldBible.history.length}
            </p>
            <p class="text-sm text-gray-500">Historical Events</p>
          </div>
          <div>
            <p class="text-2xl font-bold text-purple-400">
              {worldBible.themes.length}
            </p>
            <p class="text-sm text-gray-500">Themes</p>
          </div>
        </div>
      </div>
    </div>
  );
};

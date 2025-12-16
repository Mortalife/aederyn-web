import type { FC } from "hono/jsx";
import type { WorldTheme } from "@aederyn/types";

interface WorldThemesListProps {
  themes: WorldTheme[];
}

export const WorldThemesList: FC<WorldThemesListProps> = ({ themes }) => {
  return (
    <div id="main-content">
      <div class="flex items-center justify-between mb-6">
        <div class="flex items-center gap-4">
          <a href="/world" class="text-gray-400 hover:text-white">
            ← Back
          </a>
          <h1 class="text-2xl font-bold text-white">🎭 Themes</h1>
        </div>
        <a
          href="/world/themes/new"
          class="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-white font-medium"
        >
          + Add Theme
        </a>
      </div>

      {themes.length === 0 ? (
        <div class="text-center py-12 bg-gray-800 rounded-lg">
          <p class="text-gray-400 mb-4">No themes defined yet</p>
          <a href="/world/themes/new" class="text-blue-400 hover:underline">
            Create your first theme
          </a>
        </div>
      ) : (
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {themes.map((theme) => (
            <a
              key={theme.id}
              href={`/world/themes/${theme.id}`}
              class="block p-4 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"
            >
              <h3 class="font-semibold text-white mb-2">{theme.name}</h3>
              <p class="text-gray-400 text-sm mb-3 line-clamp-2">
                {theme.description || "No description"}
              </p>
              {theme.examples.length > 0 && (
                <div class="text-xs text-gray-500">
                  <span class="text-purple-400">{theme.examples.length}</span> example{theme.examples.length !== 1 ? "s" : ""}
                </div>
              )}
            </a>
          ))}
        </div>
      )}
    </div>
  );
};

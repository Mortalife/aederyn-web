import type { FC } from "hono/jsx";
import type { WorldTheme } from "@aederyn/types";

interface WorldThemeFormProps {
  theme?: WorldTheme;
  isNew: boolean;
}

export const WorldThemeForm: FC<WorldThemeFormProps> = ({ theme, isNew }) => {
  const defaultTheme: WorldTheme = {
    id: "",
    name: "",
    description: "",
    examples: [],
  };

  const t = theme || defaultTheme;

  return (
    <div id="main-content">
      <div class="flex items-center gap-4 mb-6">
        <a href="/world/themes" class="text-gray-400 hover:text-white">
          ← Back
        </a>
        <h1 class="text-2xl font-bold text-white">
          {isNew ? "🎭 New Theme" : `🎭 Edit: ${t.name}`}
        </h1>
      </div>

      <form
        method="post"
        action={isNew ? "/commands/world/themes" : `/commands/world/themes/${t.id}`}
        class="max-w-2xl space-y-6"
      >
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">Theme ID</label>
            <input
              type="text"
              name="id"
              value={t.id}
              class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white font-mono focus:ring-2 focus:ring-blue-500"
              required
              readonly={!isNew}
              placeholder="redemption"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">Name</label>
            <input
              type="text"
              name="name"
              value={t.name}
              class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
              required
              placeholder="Redemption"
            />
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-300 mb-2">Description</label>
          <textarea
            name="description"
            rows={4}
            class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
            placeholder="Describe how this theme manifests in your world..."
          >
            {t.description}
          </textarea>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-300 mb-2">
            Examples (one per line)
          </label>
          <textarea
            name="examples"
            rows={4}
            class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
            placeholder="A fallen knight seeking to restore their honor&#10;An ancient curse that can only be broken through sacrifice&#10;A village rebuilding after a devastating war"
          >
            {t.examples.join("\n")}
          </textarea>
          <p class="mt-1 text-sm text-gray-500">
            Concrete examples of how this theme appears in quests, NPCs, or storylines
          </p>
        </div>

        <div class="flex gap-4">
          <button
            type="submit"
            class="px-6 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-white font-medium"
          >
            {isNew ? "Create Theme" : "Save Changes"}
          </button>
          <a
            href="/world/themes"
            class="px-6 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg text-white font-medium"
          >
            Cancel
          </a>
          {!isNew && (
            <form method="post" action={`/commands/world/themes/${t.id}/delete`} class="ml-auto">
              <button
                type="submit"
                class="px-6 py-2 bg-red-600 hover:bg-red-500 rounded-lg text-white font-medium"
                onclick="return confirm('Are you sure you want to delete this theme?')"
              >
                Delete
              </button>
            </form>
          )}
        </div>
      </form>
    </div>
  );
};

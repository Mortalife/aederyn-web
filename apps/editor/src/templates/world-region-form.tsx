import type { FC } from "hono/jsx";
import type { WorldRegion } from "@aederyn/types";

interface WorldRegionFormProps {
  region?: WorldRegion;
  isNew: boolean;
}

export const WorldRegionForm: FC<WorldRegionFormProps> = ({ region, isNew }) => {
  const defaultRegion: WorldRegion = {
    id: "",
    name: "",
    description: "",
    climate: "",
    inhabitants: [],
    resources: [],
    themes: [],
  };

  const r = region || defaultRegion;

  return (
    <div id="main-content">
      <div class="flex items-center gap-4 mb-6">
        <a href="/world/regions" class="text-gray-400 hover:text-white">
          ← Back
        </a>
        <h1 class="text-2xl font-bold text-white">
          {isNew ? "🗺️ New Region" : `🗺️ Edit: ${r.name}`}
        </h1>
      </div>

      <form
        method="post"
        action={isNew ? "/commands/world/regions" : `/commands/world/regions/${r.id}`}
        class="max-w-2xl space-y-6"
      >
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">Region ID</label>
            <input
              type="text"
              name="id"
              value={r.id}
              class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white font-mono focus:ring-2 focus:ring-blue-500"
              required
              readonly={!isNew}
              placeholder="forest-of-shadows"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">Name</label>
            <input
              type="text"
              name="name"
              value={r.name}
              class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
              required
              placeholder="Forest of Shadows"
            />
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-300 mb-2">Description</label>
          <textarea
            name="description"
            rows={4}
            class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
            placeholder="Describe this region's geography, atmosphere, and notable features..."
          >
            {r.description}
          </textarea>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-300 mb-2">Climate</label>
          <input
            type="text"
            name="climate"
            value={r.climate}
            class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
            placeholder="temperate, arid, tropical, arctic..."
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-300 mb-2">
            Themes (comma-separated)
          </label>
          <input
            type="text"
            name="themes"
            value={r.themes.join(", ")}
            class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
            placeholder="dangerous, mysterious, ancient..."
          />
          <p class="mt-1 text-sm text-gray-500">
            Keywords that describe this region's feel
          </p>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-300 mb-2">
            Inhabitants (comma-separated NPC/faction IDs)
          </label>
          <input
            type="text"
            name="inhabitants"
            value={r.inhabitants.join(", ")}
            class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
            placeholder="forest-elves, shadow-guild..."
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-300 mb-2">
            Resources (comma-separated resource IDs)
          </label>
          <input
            type="text"
            name="resources"
            value={r.resources.join(", ")}
            class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
            placeholder="shadow-wood, moonstone..."
          />
        </div>

        <div class="flex gap-4">
          <button
            type="submit"
            class="px-6 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-white font-medium"
          >
            {isNew ? "Create Region" : "Save Changes"}
          </button>
          <a
            href="/world/regions"
            class="px-6 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg text-white font-medium"
          >
            Cancel
          </a>
          {!isNew && (
            <form method="post" action={`/commands/world/regions/${r.id}/delete`} class="ml-auto">
              <button
                type="submit"
                class="px-6 py-2 bg-red-600 hover:bg-red-500 rounded-lg text-white font-medium"
                onclick="return confirm('Are you sure you want to delete this region?')"
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

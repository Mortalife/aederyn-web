import type { FC } from "hono/jsx";
import type { WorldSetting } from "@aederyn/types";

interface WorldSettingFormProps {
  setting: WorldSetting;
  worldName: string;
}

const genres = ["fantasy", "sci-fi", "post-apocalyptic", "steampunk", "horror", "historical", "modern", "cyberpunk"];
const tones = ["heroic", "dark", "whimsical", "gritty", "mysterious", "comedic", "epic", "intimate"];
const eras = ["ancient", "medieval", "renaissance", "industrial", "modern", "futuristic", "timeless"];

export const WorldSettingForm: FC<WorldSettingFormProps> = ({ setting, worldName }) => {
  return (
    <div id="main-content">
      <div class="flex items-center gap-4 mb-6">
        <a href="/world" class="text-gray-400 hover:text-white">
          ← Back
        </a>
        <h1 class="text-2xl font-bold text-white">⚙️ World Setting</h1>
      </div>

      <form method="post" action="/commands/world/setting" class="max-w-2xl space-y-6">
        <div>
          <label class="block text-sm font-medium text-gray-300 mb-2">World Name</label>
          <input
            type="text"
            name="name"
            value={worldName}
            class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">Genre</label>
            <select
              name="genre"
              class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
            >
              {genres.map((g) => (
                <option key={g} value={g} selected={setting.genre === g}>
                  {g.charAt(0).toUpperCase() + g.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">Tone</label>
            <select
              name="tone"
              class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
            >
              {tones.map((t) => (
                <option key={t} value={t} selected={setting.tone === t}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">Era</label>
            <select
              name="era"
              class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
            >
              {eras.map((e) => (
                <option key={e} value={e} selected={setting.era === e}>
                  {e.charAt(0).toUpperCase() + e.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-300 mb-2">World Description</label>
          <textarea
            name="description"
            rows={6}
            class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Describe your world's setting, atmosphere, and key characteristics..."
          >
            {setting.description}
          </textarea>
          <p class="mt-1 text-sm text-gray-500">
            This description will be used to provide context for AI generation.
          </p>
        </div>

        <div class="flex gap-4">
          <button
            type="submit"
            class="px-6 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-white font-medium"
          >
            Save Setting
          </button>
          <a
            href="/world"
            class="px-6 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg text-white font-medium"
          >
            Cancel
          </a>
        </div>
      </form>
    </div>
  );
};

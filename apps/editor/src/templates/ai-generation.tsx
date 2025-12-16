import type { FC } from "hono/jsx";
import type { WorldBible } from "@aederyn/types";

interface AIGenerationViewProps {
  worldBible: WorldBible | null;
}

const itemTypes = ["resource", "tool", "weapon", "armor", "consumable", "quest", "item"];
const rarities = ["common", "uncommon", "rare", "epic", "legendary"];
const questTypes = ["main", "side", "daily", "tutorial"];

export const AIGenerationView: FC<AIGenerationViewProps> = ({ worldBible }) => {
  if (!worldBible || !worldBible.setting.description) {
    return (
      <div id="main-content" class="text-center py-12">
        <h1 class="text-2xl font-bold text-white mb-4">🤖 AI Generation</h1>
        <p class="text-gray-400 mb-6">
          Before generating content, you need to set up your World Bible with at least a world description.
        </p>
        <a
          href="/world"
          class="px-6 py-3 bg-purple-600 hover:bg-purple-500 rounded-lg text-white font-medium"
        >
          Set Up World Bible →
        </a>
      </div>
    );
  }

  return (
    <div id="main-content">
      <h1 class="text-2xl font-bold text-white mb-6">🤖 AI Generation</h1>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div class="lg:col-span-2 space-y-6">
          <div class="bg-gray-800 rounded-lg p-6">
            <div class="flex items-center gap-3 mb-4">
              <span class="text-2xl">📦</span>
              <h2 class="text-lg font-semibold text-white">Generate Item</h2>
            </div>
            <p class="text-gray-400 text-sm mb-4">
              Create a new item that fits your world's theme and balance.
            </p>
            <form method="post" action="/commands/ai/generate/item" class="space-y-4">
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-gray-300 mb-2">Item Type</label>
                  <select
                    name="type"
                    class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  >
                    {itemTypes.map((t) => (
                      <option key={t} value={t}>
                        {t.charAt(0).toUpperCase() + t.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-300 mb-2">Rarity</label>
                  <select
                    name="rarity"
                    class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  >
                    {rarities.map((r) => (
                      <option key={r} value={r}>
                        {r.charAt(0).toUpperCase() + r.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-300 mb-2">Theme (optional)</label>
                <input
                  type="text"
                  name="theme"
                  class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  placeholder="e.g., fire, ancient, cursed..."
                />
              </div>
              <button
                type="submit"
                class="w-full py-2 bg-amber-600 hover:bg-amber-500 rounded-lg text-white font-medium"
              >
                Generate Item
              </button>
            </form>
          </div>

          <div class="bg-gray-800 rounded-lg p-6">
            <div class="flex items-center gap-3 mb-4">
              <span class="text-2xl">📜</span>
              <h2 class="text-lg font-semibold text-white">Generate Quest</h2>
            </div>
            <p class="text-gray-400 text-sm mb-4">
              Create a quest with objectives and rewards that fit your world.
            </p>
            <form method="post" action="/commands/ai/generate/quest" class="space-y-4">
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-gray-300 mb-2">Quest Type</label>
                  <select
                    name="type"
                    class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  >
                    {questTypes.map((t) => (
                      <option key={t} value={t}>
                        {t.charAt(0).toUpperCase() + t.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-300 mb-2">Difficulty</label>
                  <select
                    name="difficulty"
                    class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-300 mb-2">Region (optional)</label>
                <select
                  name="region"
                  class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                >
                  <option value="">Any region</option>
                  {worldBible.regions.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                class="w-full py-2 bg-rose-600 hover:bg-rose-500 rounded-lg text-white font-medium"
              >
                Generate Quest
              </button>
            </form>
          </div>

          <div class="bg-gray-800 rounded-lg p-6">
            <div class="flex items-center gap-3 mb-4">
              <span class="text-2xl">👤</span>
              <h2 class="text-lg font-semibold text-white">Generate NPC</h2>
            </div>
            <p class="text-gray-400 text-sm mb-4">
              Create an NPC with backstory and relationships.
            </p>
            <form method="post" action="/commands/ai/generate/npc" class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-300 mb-2">Role</label>
                <input
                  type="text"
                  name="role"
                  class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  placeholder="e.g., merchant, guard, blacksmith..."
                />
              </div>
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-gray-300 mb-2">Faction (optional)</label>
                  <select
                    name="faction"
                    class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  >
                    <option value="">No faction</option>
                    {worldBible.factions.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-300 mb-2">Region (optional)</label>
                  <select
                    name="region"
                    class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  >
                    <option value="">Any region</option>
                    {worldBible.regions.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <button
                type="submit"
                class="w-full py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-white font-medium"
              >
                Generate NPC
              </button>
            </form>
          </div>
        </div>

        <div>
          <div class="bg-gray-800 rounded-lg p-4 sticky top-4">
            <h2 class="text-lg font-semibold text-white mb-4">World Context</h2>
            <div class="space-y-3 text-sm">
              <div>
                <span class="text-gray-400">World:</span>
                <span class="text-white ml-2">{worldBible.name}</span>
              </div>
              <div>
                <span class="text-gray-400">Setting:</span>
                <span class="text-white ml-2">{worldBible.setting.genre}</span>
              </div>
              <div>
                <span class="text-gray-400">Tone:</span>
                <span class="text-white ml-2">{worldBible.setting.tone}</span>
              </div>
              <div>
                <span class="text-gray-400">Era:</span>
                <span class="text-white ml-2">{worldBible.setting.era}</span>
              </div>
              {worldBible.themes.length > 0 && (
                <div>
                  <span class="text-gray-400">Themes:</span>
                  <div class="flex flex-wrap gap-1 mt-1">
                    {worldBible.themes.map((t) => (
                      <span key={t.id} class="px-2 py-0.5 bg-gray-700 rounded text-xs text-gray-300">
                        {t.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {worldBible.regions.length > 0 && (
                <div>
                  <span class="text-gray-400">Regions:</span>
                  <span class="text-white ml-2">{worldBible.regions.length}</span>
                </div>
              )}
              {worldBible.factions.length > 0 && (
                <div>
                  <span class="text-gray-400">Factions:</span>
                  <span class="text-white ml-2">{worldBible.factions.length}</span>
                </div>
              )}
            </div>
            <a
              href="/world"
              class="block mt-4 text-center text-sm text-blue-400 hover:underline"
            >
              Edit World Bible →
            </a>
          </div>

          <div class="bg-yellow-900/30 border border-yellow-600/50 rounded-lg p-4 mt-4">
            <h3 class="text-sm font-semibold text-yellow-400 mb-2">⚠️ API Key Required</h3>
            <p class="text-xs text-yellow-200/70">
              AI generation requires an OpenRouter API key. Set the <code class="bg-gray-800 px-1 rounded">OPENROUTER_API_KEY</code> environment variable to enable this feature.
            </p>
            <a
              href="https://openrouter.ai/keys"
              target="_blank"
              class="text-xs text-blue-400 hover:underline mt-2 inline-block"
            >
              Get an API key →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

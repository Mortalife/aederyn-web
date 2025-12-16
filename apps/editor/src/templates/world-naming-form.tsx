import type { FC } from "hono/jsx";
import type { WorldNaming } from "@aederyn/types";

interface WorldNamingFormProps {
  naming: WorldNaming;
}

export const WorldNamingForm: FC<WorldNamingFormProps> = ({ naming }) => {
  return (
    <div id="main-content">
      <div class="flex items-center gap-4 mb-6">
        <a href="/world" class="text-gray-400 hover:text-white">
          ← Back
        </a>
        <h1 class="text-2xl font-bold text-white">📝 Naming Conventions</h1>
      </div>

      <form method="post" action="/commands/world/naming" class="max-w-2xl space-y-6">
        <div class="bg-gray-800 rounded-lg p-4 mb-6">
          <p class="text-gray-400 text-sm">
            Define naming patterns and examples to help maintain consistency across your world.
            These patterns will be used by AI generation to create fitting names.
          </p>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-300 mb-2">
            Character Name Patterns (one per line)
          </label>
          <textarea
            name="characterPatterns"
            rows={3}
            class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
            placeholder="[Consonant][vowel][consonant]'[vowel][consonant]&#10;Nordic-inspired names&#10;Two-syllable names ending in -or or -an"
          >
            {naming.characterPatterns.join("\n")}
          </textarea>
          <p class="mt-1 text-sm text-gray-500">
            Describe patterns for NPC and character names
          </p>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-300 mb-2">
            Place Name Patterns (one per line)
          </label>
          <textarea
            name="placePatterns"
            rows={3}
            class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
            placeholder="[Adjective] [Geographical Feature]&#10;[Old word for 'place'] + [descriptor]&#10;Named after historical figures"
          >
            {naming.placePatterns.join("\n")}
          </textarea>
          <p class="mt-1 text-sm text-gray-500">
            Describe patterns for regions, cities, and landmarks
          </p>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-300 mb-2">
            Item Name Patterns (one per line)
          </label>
          <textarea
            name="itemPatterns"
            rows={3}
            class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
            placeholder="[Material] [Item Type]&#10;[Creator's Name]'s [Item]&#10;[Adjective] [Item] of [Power]"
          >
            {naming.itemPatterns.join("\n")}
          </textarea>
          <p class="mt-1 text-sm text-gray-500">
            Describe patterns for weapons, armor, and other items
          </p>
        </div>

        <div class="border-t border-gray-700 pt-6">
          <h3 class="text-lg font-semibold text-white mb-4">Example Names</h3>
          <p class="text-gray-400 text-sm mb-4">
            Provide example names for each category to help establish the style.
          </p>

          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-2">
                Character Examples (comma-separated)
              </label>
              <input
                type="text"
                name="examples_characters"
                value={naming.examples.characters?.join(", ") || ""}
                class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                placeholder="Aldric, Seraphina, Theron, Lyra"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-300 mb-2">
                Place Examples (comma-separated)
              </label>
              <input
                type="text"
                name="examples_places"
                value={naming.examples.places?.join(", ") || ""}
                class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                placeholder="Shadowmere, The Whispering Woods, Ironhold"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-300 mb-2">
                Item Examples (comma-separated)
              </label>
              <input
                type="text"
                name="examples_items"
                value={naming.examples.items?.join(", ") || ""}
                class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                placeholder="Moonblade, Stormcaller's Staff, Dragonscale Armor"
              />
            </div>
          </div>
        </div>

        <div class="flex gap-4">
          <button
            type="submit"
            class="px-6 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-white font-medium"
          >
            Save Naming Conventions
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

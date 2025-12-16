import type { FC } from "hono/jsx";
import type { WorldSystem } from "@aederyn/types";

interface WorldSystemFormProps {
  system?: WorldSystem;
  isNew: boolean;
}

export const WorldSystemForm: FC<WorldSystemFormProps> = ({ system, isNew }) => {
  const defaultSystem: WorldSystem = {
    id: "",
    name: "",
    type: "magic",
    description: "",
    rules: [],
    limitations: [],
  };

  const s = system || defaultSystem;

  return (
    <div id="main-content">
      <div class="flex items-center gap-4 mb-6">
        <a href="/world/systems" class="text-gray-400 hover:text-white">
          ← Back
        </a>
        <h1 class="text-2xl font-bold text-white">
          {isNew ? "✨ New System" : `✨ Edit: ${s.name}`}
        </h1>
      </div>

      <form
        method="post"
        action={isNew ? "/commands/world/systems" : `/commands/world/systems/${s.id}`}
        class="max-w-2xl space-y-6"
      >
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">System ID</label>
            <input
              type="text"
              name="id"
              value={s.id}
              class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white font-mono focus:ring-2 focus:ring-blue-500"
              required
              readonly={!isNew}
              placeholder="arcane-magic"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">Name</label>
            <input
              type="text"
              name="name"
              value={s.name}
              class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
              required
              placeholder="Arcane Magic"
            />
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-300 mb-2">Type</label>
          <select
            name="type"
            class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
          >
            <option value="magic" selected={s.type === "magic"}>Magic</option>
            <option value="technology" selected={s.type === "technology"}>Technology</option>
            <option value="hybrid" selected={s.type === "hybrid"}>Hybrid</option>
          </select>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-300 mb-2">Description</label>
          <textarea
            name="description"
            rows={4}
            class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
            placeholder="Describe how this system works in your world..."
          >
            {s.description}
          </textarea>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-300 mb-2">
            Rules (one per line)
          </label>
          <textarea
            name="rules"
            rows={4}
            class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
            placeholder="Magic requires verbal incantations&#10;Spells consume mana proportional to power&#10;Only those with innate talent can learn magic"
          >
            {s.rules.join("\n")}
          </textarea>
          <p class="mt-1 text-sm text-gray-500">
            The fundamental rules that govern how this system operates
          </p>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-300 mb-2">
            Limitations (one per line)
          </label>
          <textarea
            name="limitations"
            rows={4}
            class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
            placeholder="Cannot resurrect the dead&#10;Fire magic doesn't work underwater&#10;Casting while exhausted is dangerous"
          >
            {s.limitations.join("\n")}
          </textarea>
          <p class="mt-1 text-sm text-gray-500">
            Constraints and restrictions that create interesting gameplay
          </p>
        </div>

        <div class="flex gap-4">
          <button
            type="submit"
            class="px-6 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-white font-medium"
          >
            {isNew ? "Create System" : "Save Changes"}
          </button>
          <a
            href="/world/systems"
            class="px-6 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg text-white font-medium"
          >
            Cancel
          </a>
          {!isNew && (
            <form method="post" action={`/commands/world/systems/${s.id}/delete`} class="ml-auto">
              <button
                type="submit"
                class="px-6 py-2 bg-red-600 hover:bg-red-500 rounded-lg text-white font-medium"
                onclick="return confirm('Are you sure you want to delete this system?')"
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

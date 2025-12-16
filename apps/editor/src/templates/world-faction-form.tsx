import type { FC } from "hono/jsx";
import type { WorldFaction } from "@aederyn/types";

interface WorldFactionFormProps {
  faction?: WorldFaction;
  isNew: boolean;
  allFactions: WorldFaction[];
}

export const WorldFactionForm: FC<WorldFactionFormProps> = ({ faction, isNew, allFactions }) => {
  const defaultFaction: WorldFaction = {
    id: "",
    name: "",
    description: "",
    alignment: "neutral",
    goals: [],
    rivals: [],
    allies: [],
    members: [],
  };

  const f = faction || defaultFaction;
  const otherFactions = allFactions.filter((of) => of.id !== f.id);

  return (
    <div id="main-content">
      <div class="flex items-center gap-4 mb-6">
        <a href="/world/factions" class="text-gray-400 hover:text-white">
          ← Back
        </a>
        <h1 class="text-2xl font-bold text-white">
          {isNew ? "⚔️ New Faction" : `⚔️ Edit: ${f.name}`}
        </h1>
      </div>

      <form
        method="post"
        action={isNew ? "/commands/world/factions" : `/commands/world/factions/${f.id}`}
        class="max-w-2xl space-y-6"
      >
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">Faction ID</label>
            <input
              type="text"
              name="id"
              value={f.id}
              class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white font-mono focus:ring-2 focus:ring-blue-500"
              required
              readonly={!isNew}
              placeholder="shadow-guild"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">Name</label>
            <input
              type="text"
              name="name"
              value={f.name}
              class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
              required
              placeholder="The Shadow Guild"
            />
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-300 mb-2">Alignment</label>
          <select
            name="alignment"
            class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
          >
            <option value="friendly" selected={f.alignment === "friendly"}>Friendly</option>
            <option value="neutral" selected={f.alignment === "neutral"}>Neutral</option>
            <option value="hostile" selected={f.alignment === "hostile"}>Hostile</option>
          </select>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-300 mb-2">Description</label>
          <textarea
            name="description"
            rows={4}
            class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
            placeholder="Describe this faction's history, purpose, and characteristics..."
          >
            {f.description}
          </textarea>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-300 mb-2">
            Goals (one per line)
          </label>
          <textarea
            name="goals"
            rows={3}
            class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
            placeholder="Control the trade routes&#10;Overthrow the king&#10;Protect the ancient secrets"
          >
            {f.goals.join("\n")}
          </textarea>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">
              Allies (comma-separated faction IDs)
            </label>
            <input
              type="text"
              name="allies"
              value={f.allies.join(", ")}
              class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
              placeholder="merchant-guild, royal-guard"
            />
            {otherFactions.length > 0 && (
              <p class="mt-1 text-xs text-gray-500">
                Available: {otherFactions.map((of) => of.id).join(", ")}
              </p>
            )}
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">
              Rivals (comma-separated faction IDs)
            </label>
            <input
              type="text"
              name="rivals"
              value={f.rivals.join(", ")}
              class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
              placeholder="thieves-guild, dark-order"
            />
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-300 mb-2">
            Members (comma-separated NPC IDs)
          </label>
          <input
            type="text"
            name="members"
            value={f.members.join(", ")}
            class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
            placeholder="guild-master, shadow-agent..."
          />
        </div>

        <div class="flex gap-4">
          <button
            type="submit"
            class="px-6 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-white font-medium"
          >
            {isNew ? "Create Faction" : "Save Changes"}
          </button>
          <a
            href="/world/factions"
            class="px-6 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg text-white font-medium"
          >
            Cancel
          </a>
          {!isNew && (
            <form method="post" action={`/commands/world/factions/${f.id}/delete`} class="ml-auto">
              <button
                type="submit"
                class="px-6 py-2 bg-red-600 hover:bg-red-500 rounded-lg text-white font-medium"
                onclick="return confirm('Are you sure you want to delete this faction?')"
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

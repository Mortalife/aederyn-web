import type { FC } from "hono/jsx";
import type { WorldHistoryEvent } from "@aederyn/types";

interface WorldHistoryFormProps {
  event?: WorldHistoryEvent;
  isNew: boolean;
}

export const WorldHistoryForm: FC<WorldHistoryFormProps> = ({ event, isNew }) => {
  const defaultEvent: WorldHistoryEvent = {
    id: "",
    name: "",
    description: "",
    era: "",
    significance: "",
    relatedEntities: [],
  };

  const e = event || defaultEvent;

  return (
    <div id="main-content">
      <div class="flex items-center gap-4 mb-6">
        <a href="/world/history" class="text-gray-400 hover:text-white">
          ← Back
        </a>
        <h1 class="text-2xl font-bold text-white">
          {isNew ? "📜 New Historical Event" : `📜 Edit: ${e.name}`}
        </h1>
      </div>

      <form
        method="post"
        action={isNew ? "/commands/world/history" : `/commands/world/history/${e.id}`}
        class="max-w-2xl space-y-6"
      >
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">Event ID</label>
            <input
              type="text"
              name="id"
              value={e.id}
              class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white font-mono focus:ring-2 focus:ring-blue-500"
              required
              readonly={!isNew}
              placeholder="the-great-war"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">Name</label>
            <input
              type="text"
              name="name"
              value={e.name}
              class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
              required
              placeholder="The Great War"
            />
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-300 mb-2">Era</label>
          <input
            type="text"
            name="era"
            value={e.era}
            class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
            placeholder="Age of Darkness, First Era, etc."
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-300 mb-2">Description</label>
          <textarea
            name="description"
            rows={4}
            class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
            placeholder="Describe what happened during this event..."
          >
            {e.description}
          </textarea>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-300 mb-2">Significance</label>
          <textarea
            name="significance"
            rows={2}
            class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
            placeholder="Why is this event important to the world?"
          >
            {e.significance}
          </textarea>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-300 mb-2">
            Related Entities (comma-separated IDs)
          </label>
          <input
            type="text"
            name="relatedEntities"
            value={e.relatedEntities.join(", ")}
            class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
            placeholder="faction-id, region-id, npc-id..."
          />
          <p class="mt-1 text-sm text-gray-500">
            NPCs, factions, regions, or other entities involved in this event
          </p>
        </div>

        <div class="flex gap-4">
          <button
            type="submit"
            class="px-6 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-white font-medium"
          >
            {isNew ? "Create Event" : "Save Changes"}
          </button>
          <a
            href="/world/history"
            class="px-6 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg text-white font-medium"
          >
            Cancel
          </a>
          {!isNew && (
            <form method="post" action={`/commands/world/history/${e.id}/delete`} class="ml-auto">
              <button
                type="submit"
                class="px-6 py-2 bg-red-600 hover:bg-red-500 rounded-lg text-white font-medium"
                onclick="return confirm('Are you sure you want to delete this event?')"
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

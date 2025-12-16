import type { FC } from "hono/jsx";
import type { Quest, NPC } from "../repository/index.js";

interface QuestFormProps {
  quest?: Quest;
  isNew?: boolean;
  npcs?: NPC[];
}

export const QuestForm: FC<QuestFormProps> = ({ quest, isNew = true, npcs = [] }) => {
  const defaultQuest: Partial<Quest> = {
    id: "",
    name: "",
    description: "",
    type: "collection",
    giver: {
      entity_id: "",
      zone_id: "",
      x: 0,
      y: 0,
    },
    objectives: [],
    completion: {},
    rewards: [],
    is_tutorial: false,
    prerequisites: [],
  };

  const q = quest || defaultQuest;

  return (
    <div id="main-content">
      <div class="flex justify-between items-center mb-6">
        <h1 class="text-2xl font-bold text-white">
          {isNew ? "📜 New Quest" : `📜 Edit: ${q.name}`}
        </h1>
        <a
          href="/quests"
          class="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-white font-medium transition"
        >
          ← Back to Quests
        </a>
      </div>

      <form
        data-testid="quest-form"
        class="bg-gray-800 rounded-lg p-6 max-w-3xl"
        method="post"
        action={isNew ? "/commands/quests" : `/commands/quests/${q.id}`}
      >
        {/* Basic Info Section */}
        <div class="mb-8">
          <h2 class="text-lg font-semibold text-rose-400 mb-4 border-b border-gray-700 pb-2">
            Basic Information
          </h2>
          <div class="grid grid-cols-2 gap-6">
            <div class="col-span-2 md:col-span-1">
              <label class="block text-sm font-medium text-gray-300 mb-2">
                ID <span class="text-red-400">*</span>
              </label>
              <input
                type="text"
                name="id"
                value={q.id}
                required
                pattern="^quest_[a-z0-9_]+$"
                placeholder="quest_example_01"
                disabled={!isNew}
                class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-rose-500 disabled:opacity-50"
              />
              <p class="text-xs text-gray-500 mt-1">Format: quest_[name]_[number]</p>
            </div>

            <div class="col-span-2 md:col-span-1">
              <label class="block text-sm font-medium text-gray-300 mb-2">
                Name <span class="text-red-400">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={q.name}
                required
                placeholder="The Great Adventure"
                class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-rose-500"
              />
            </div>

            <div class="col-span-2">
              <label class="block text-sm font-medium text-gray-300 mb-2">
                Description <span class="text-red-400">*</span>
              </label>
              <textarea
                name="description"
                required
                rows={3}
                placeholder="A brief description of the quest..."
                class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-rose-500"
              >
                {q.description}
              </textarea>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-300 mb-2">
                Type <span class="text-red-400">*</span>
              </label>
              <select
                name="type"
                required
                class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-rose-500"
              >
                <option value="collection" selected={q.type === "collection"}>Collection</option>
                <option value="crafting" selected={q.type === "crafting"}>Crafting</option>
                <option value="exploration" selected={q.type === "exploration"}>Exploration</option>
                <option value="combat" selected={q.type === "combat"}>Combat</option>
                <option value="delivery" selected={q.type === "delivery"}>Delivery</option>
                <option value="dialog" selected={q.type === "dialog"}>Dialog</option>
              </select>
            </div>

            <div class="flex items-center gap-4">
              <label class="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  name="is_tutorial"
                  checked={q.is_tutorial}
                  class="w-4 h-4 rounded bg-gray-700 border-gray-600 text-rose-500 focus:ring-rose-500"
                />
                <span class="text-sm text-gray-300">Tutorial Quest</span>
              </label>
            </div>
          </div>
        </div>

        {/* Quest Giver Section */}
        <div class="mb-8">
          <h2 class="text-lg font-semibold text-rose-400 mb-4 border-b border-gray-700 pb-2">
            Quest Giver
          </h2>
          <div class="grid grid-cols-2 gap-6">
            <div class="col-span-2 md:col-span-1">
              <label class="block text-sm font-medium text-gray-300 mb-2">
                NPC <span class="text-red-400">*</span>
              </label>
              <select
                name="giver_entity_id"
                required
                data-testid="quest-giver"
                class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-rose-500"
              >
                <option value="">Select NPC...</option>
                {npcs.map((npc) => (
                  <option
                    key={npc.entity_id}
                    value={npc.entity_id}
                    selected={q.giver?.entity_id === npc.entity_id}
                  >
                    {npc.name} ({npc.entity_id})
                  </option>
                ))}
              </select>
            </div>

            <div class="col-span-2 md:col-span-1">
              <label class="block text-sm font-medium text-gray-300 mb-2">
                Zone ID
              </label>
              <input
                type="text"
                name="giver_zone_id"
                value={q.giver?.zone_id || ""}
                placeholder="zone_village"
                class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-rose-500"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-300 mb-2">
                X Position
              </label>
              <input
                type="number"
                name="giver_x"
                value={q.giver?.x || 0}
                class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-rose-500"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-300 mb-2">
                Y Position
              </label>
              <input
                type="number"
                name="giver_y"
                value={q.giver?.y || 0}
                class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-rose-500"
              />
            </div>
          </div>
        </div>

        {/* Objectives Section */}
        <div class="mb-8">
          <h2 class="text-lg font-semibold text-rose-400 mb-4 border-b border-gray-700 pb-2">
            Objectives
          </h2>
          <div data-testid="objectives-builder" class="bg-gray-700 rounded p-4">
            <textarea
              name="objectives"
              rows={4}
              placeholder='[{"type": "collect", "item_id": "item_stone_01", "qty": 5}]'
              class="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded text-white placeholder-gray-400 focus:outline-none focus:border-rose-500 font-mono text-sm"
            >
              {JSON.stringify(q.objectives || [], null, 2)}
            </textarea>
            <p class="text-xs text-gray-400 mt-2">
              JSON array of objectives. Each objective should have a type and relevant properties.
            </p>
          </div>
        </div>

        {/* Rewards Section */}
        <div class="mb-8">
          <h2 class="text-lg font-semibold text-rose-400 mb-4 border-b border-gray-700 pb-2">
            Rewards
          </h2>
          <div data-testid="rewards-section" class="bg-gray-700 rounded p-4">
            <textarea
              name="rewards"
              rows={4}
              placeholder='[{"type": "item", "item_id": "item_gold_coin", "qty": 10}]'
              class="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded text-white placeholder-gray-400 focus:outline-none focus:border-rose-500 font-mono text-sm"
            >
              {JSON.stringify(q.rewards || [], null, 2)}
            </textarea>
            <p class="text-xs text-gray-400 mt-2">
              JSON array of rewards. Each reward should have a type and relevant properties.
            </p>
          </div>
        </div>

        {/* Completion Section */}
        <div class="mb-8">
          <h2 class="text-lg font-semibold text-rose-400 mb-4 border-b border-gray-700 pb-2">
            Completion Dialog
          </h2>
          <div class="bg-gray-700 rounded p-4">
            <textarea
              name="completion"
              rows={3}
              placeholder='{"dialog": "Thank you for completing this quest!"}'
              class="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded text-white placeholder-gray-400 focus:outline-none focus:border-rose-500 font-mono text-sm"
            >
              {JSON.stringify(q.completion || {}, null, 2)}
            </textarea>
            <p class="text-xs text-gray-400 mt-2">
              JSON object for completion dialog and effects.
            </p>
          </div>
        </div>

        {/* Prerequisites Section */}
        <div class="mb-8">
          <h2 class="text-lg font-semibold text-rose-400 mb-4 border-b border-gray-700 pb-2">
            Prerequisites
          </h2>
          <div class="bg-gray-700 rounded p-4">
            <textarea
              name="prerequisites"
              rows={2}
              placeholder='["quest_tutorial_01", "quest_intro_02"]'
              class="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded text-white placeholder-gray-400 focus:outline-none focus:border-rose-500 font-mono text-sm"
            >
              {JSON.stringify(q.prerequisites || [], null, 2)}
            </textarea>
            <p class="text-xs text-gray-400 mt-2">
              JSON array of quest IDs that must be completed before this quest.
            </p>
          </div>
        </div>

        <div class="flex gap-4">
          <button
            type="submit"
            class="px-6 py-2 bg-rose-600 hover:bg-rose-500 rounded text-white font-medium transition"
          >
            {isNew ? "Create Quest" : "Save Changes"}
          </button>
          <a
            href="/quests"
            class="px-6 py-2 bg-gray-700 hover:bg-gray-600 rounded text-white font-medium transition"
          >
            Cancel
          </a>
        </div>
      </form>
    </div>
  );
};

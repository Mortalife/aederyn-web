import type { FC } from "hono/jsx";
import type { Resource } from "../repository/index.js";

interface ResourceFormProps {
  resource?: Resource;
  isNew?: boolean;
}

export const ResourceForm: FC<ResourceFormProps> = ({ resource, isNew = true }) => {
  const defaultResource: Partial<Resource> = {
    id: "",
    name: "",
    amount: 1,
    limitless: false,
    reward_items: [],
    required_items: [],
    collectionTime: 5,
    type: "resource",
    verb: "Collect",
  };

  const r = resource || defaultResource;

  return (
    <div id="main-content">
      <div class="flex justify-between items-center mb-6">
        <h1 class="text-2xl font-bold text-white">
          {isNew ? "🪨 New Resource" : `🪨 Edit: ${r.name}`}
        </h1>
        <a
          href="/resources"
          class="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-white font-medium transition"
        >
          ← Back to Resources
        </a>
      </div>

      <form
        data-testid="resource-form"
        class="bg-gray-800 rounded-lg p-6 max-w-2xl"
        method="post"
        action={isNew ? "/commands/resources" : `/commands/resources/${r.id}`}
      >
        <div class="grid grid-cols-2 gap-6">
          <div class="col-span-2 md:col-span-1">
            <label class="block text-sm font-medium text-gray-300 mb-2">
              ID <span class="text-red-400">*</span>
            </label>
            <input
              type="text"
              name="id"
              value={r.id}
              required
              pattern="^resource_[a-z0-9_]+$"
              placeholder="resource_example_01"
              disabled={!isNew}
              class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-emerald-500 disabled:opacity-50"
            />
            <p class="text-xs text-gray-500 mt-1">Format: resource_[name]</p>
          </div>

          <div class="col-span-2 md:col-span-1">
            <label class="block text-sm font-medium text-gray-300 mb-2">
              Name <span class="text-red-400">*</span>
            </label>
            <input
              type="text"
              name="name"
              value={r.name}
              required
              placeholder="Example Resource"
              class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">
              Type <span class="text-red-400">*</span>
            </label>
            <select
              name="type"
              required
              class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-emerald-500"
            >
              <option value="resource" selected={r.type === "resource"}>Resource</option>
              <option value="workbench" selected={r.type === "workbench"}>Workbench</option>
              <option value="furnace" selected={r.type === "furnace"}>Furnace</option>
              <option value="magic" selected={r.type === "magic"}>Magic</option>
            </select>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">
              Verb
            </label>
            <input
              type="text"
              name="verb"
              value={r.verb}
              placeholder="Collect"
              class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">
              Collection Time (seconds)
            </label>
            <input
              type="number"
              name="collectionTime"
              value={r.collectionTime}
              min={1}
              class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">
              Amount
            </label>
            <input
              type="number"
              name="amount"
              value={r.amount}
              min={1}
              class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div class="flex items-center gap-4">
            <label class="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                name="limitless"
                checked={r.limitless}
                class="w-4 h-4 rounded bg-gray-700 border-gray-600 text-emerald-500 focus:ring-emerald-500"
              />
              <span class="text-sm text-gray-300">Limitless (infinite resource)</span>
            </label>
          </div>

          <div class="col-span-2">
            <label class="block text-sm font-medium text-gray-300 mb-2">
              Reward Items (JSON array)
            </label>
            <textarea
              name="reward_items"
              rows={3}
              placeholder='[{"item_id": "item_wood", "quantity": 1, "chance": 1}]'
              class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-emerald-500 font-mono text-sm"
            >
              {JSON.stringify(r.reward_items, null, 2)}
            </textarea>
          </div>

          <div class="col-span-2">
            <label class="block text-sm font-medium text-gray-300 mb-2">
              Required Items (JSON array)
            </label>
            <textarea
              name="required_items"
              rows={3}
              placeholder='[{"item_id": "item_axe", "quantity": 1}]'
              class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-emerald-500 font-mono text-sm"
            >
              {JSON.stringify(r.required_items, null, 2)}
            </textarea>
          </div>
        </div>

        <div class="mt-6 flex gap-4">
          <button
            type="submit"
            class="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 rounded text-white font-medium transition"
          >
            {isNew ? "Create Resource" : "Save Changes"}
          </button>
          <a
            href="/resources"
            class="px-6 py-2 bg-gray-700 hover:bg-gray-600 rounded text-white font-medium transition"
          >
            Cancel
          </a>
        </div>
      </form>
    </div>
  );
};

import type { FC } from "hono/jsx";
import type { NPC } from "../repository/index.js";

function getRelationshipColor(type: string): string {
  const colors: Record<string, string> = {
    friends: "text-green-400",
    family: "text-blue-400",
    rivals: "text-orange-400",
    enemies: "text-red-400",
    mentors: "text-cyan-400",
    students: "text-yellow-400",
    acquaintances: "text-gray-400",
  };
  return colors[type] || "text-gray-400";
}

function getRelationshipIcon(type: string): string {
  const icons: Record<string, string> = {
    friends: "🤝",
    family: "👨‍👩‍👧",
    rivals: "⚔️",
    enemies: "💀",
    mentors: "🎓",
    students: "📚",
    acquaintances: "👋",
  };
  return icons[type] || "👤";
}

interface NPCFormProps {
  npc?: NPC;
  isNew?: boolean;
  allNpcs?: NPC[];
}

export const NPCForm: FC<NPCFormProps> = ({ npc, isNew = true, allNpcs = [] }) => {
  const defaultNPC: Partial<NPC> = {
    entity_id: "",
    name: "",
    backstory: "",
    personalMission: "",
    hopes: "",
    fears: "",
    relationships: {},
  };

  const n = npc || defaultNPC;

  return (
    <div id="main-content">
      <div class="flex justify-between items-center mb-6">
        <h1 class="text-2xl font-bold text-white">
          {isNew ? "👤 New NPC" : `👤 Edit: ${n.name}`}
        </h1>
        <a
          href="/npcs"
          class="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-white font-medium transition"
        >
          ← Back to NPCs
        </a>
      </div>

      <form
        data-testid="npc-form"
        class="bg-gray-800 rounded-lg p-6 max-w-3xl"
        method="post"
        action={isNew ? "/commands/npcs" : `/commands/npcs/${n.entity_id}`}
      >
        <div class="grid grid-cols-2 gap-6">
          <div class="col-span-2 md:col-span-1">
            <label class="block text-sm font-medium text-gray-300 mb-2">
              Entity ID <span class="text-red-400">*</span>
            </label>
            <input
              type="text"
              name="entity_id"
              value={n.entity_id}
              required
              pattern="^npc_[a-z0-9_]+$"
              placeholder="npc_example"
              disabled={!isNew}
              class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 disabled:opacity-50"
            />
            <p class="text-xs text-gray-500 mt-1">Format: npc_[name]</p>
          </div>

          <div class="col-span-2 md:col-span-1">
            <label class="block text-sm font-medium text-gray-300 mb-2">
              Name <span class="text-red-400">*</span>
            </label>
            <input
              type="text"
              name="name"
              value={n.name}
              required
              placeholder="Example NPC"
              class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
            />
          </div>

          <div class="col-span-2">
            <label class="block text-sm font-medium text-gray-300 mb-2">
              Backstory <span class="text-red-400">*</span>
            </label>
            <textarea
              name="backstory"
              required
              rows={4}
              placeholder="The NPC's history and background..."
              class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
            >
              {n.backstory}
            </textarea>
          </div>

          <div class="col-span-2">
            <label class="block text-sm font-medium text-gray-300 mb-2">
              Personal Mission
            </label>
            <textarea
              name="personalMission"
              rows={2}
              placeholder="What drives this NPC..."
              class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
            >
              {n.personalMission}
            </textarea>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">
              Hopes
            </label>
            <textarea
              name="hopes"
              rows={2}
              placeholder="What the NPC hopes for..."
              class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
            >
              {n.hopes}
            </textarea>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">
              Fears
            </label>
            <textarea
              name="fears"
              rows={2}
              placeholder="What the NPC fears..."
              class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
            >
              {n.fears}
            </textarea>
          </div>

          {/* Relationships Section */}
          <div class="col-span-2">
            <h2 class="text-lg font-semibold text-purple-400 mb-4 border-b border-gray-700 pb-2">
              Relationships
            </h2>
            <div data-testid="relationships-editor" class="space-y-4">
              {/* Relationship Categories */}
              {[
                { type: "friends", icon: "\uD83E\uDD1D", color: "green", label: "Friends" },
                { type: "family", icon: "\uD83D\uDC68\u200D\uD83D\uDC69\u200D\uD83D\uDC67", color: "blue", label: "Family" },
                { type: "rivals", icon: "\u2694\uFE0F", color: "orange", label: "Rivals" },
                { type: "enemies", icon: "\uD83D\uDC80", color: "red", label: "Enemies" },
                { type: "mentors", icon: "\uD83C\uDF93", color: "cyan", label: "Mentors" },
                { type: "students", icon: "\uD83D\uDCDA", color: "yellow", label: "Students" },
                { type: "acquaintances", icon: "\uD83D\uDC4B", color: "gray", label: "Acquaintances" },
              ].map(({ type, icon, color, label }) => (
                <div key={type} class={`bg-gray-700 rounded-lg p-4 border-l-4 border-${color}-500`}>
                  <div class="flex items-center justify-between mb-3">
                    <span class="font-medium text-white">
                      {icon} {label}
                    </span>
                    <span class="text-xs text-gray-500">
                      {((n.relationships || {})[type] || []).length} entries
                    </span>
                  </div>

                  {/* Existing relationships */}
                  <div id={`rel-${type}-list`} class="space-y-2 mb-3">
                    {((n.relationships || {})[type] || []).map((relation: string, idx: number) => (
                      <div key={idx} class="flex items-center gap-2">
                        <input
                          type="text"
                          name={`relationships[${type}][${idx}]`}
                          value={relation}
                          placeholder="NPC Name - Description of relationship"
                          class="flex-1 px-3 py-2 bg-gray-600 border border-gray-500 rounded text-white text-sm"
                        />
                        <button
                          type="button"
                          class="px-2 py-1 text-red-400 hover:text-red-300"
                          onclick="this.parentElement.remove()"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Quick-add from existing NPCs */}
                  <div class="flex gap-2">
                    <select
                      class="flex-1 px-3 py-2 bg-gray-600 border border-gray-500 rounded text-white text-sm"
                      onchange={`window.addRelationshipFromSelect(this, '${type}')`}
                    >
                      <option value="">+ Add from existing NPC...</option>
                      {allNpcs
                        .filter(other => other.entity_id !== n.entity_id)
                        .map(npc => (
                          <option key={npc.entity_id} value={npc.name}>
                            {npc.name}
                          </option>
                        ))}
                    </select>
                    <button
                      type="button"
                      class="px-3 py-2 bg-gray-600 hover:bg-gray-500 rounded text-sm text-white"
                      onclick={`window.addRelationshipEntry('${type}')`}
                    >
                      + Custom
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div class="mt-6 flex gap-4">
          <button
            type="submit"
            class="px-6 py-2 bg-purple-600 hover:bg-purple-500 rounded text-white font-medium transition"
          >
            {isNew ? "Create NPC" : "Save Changes"}
          </button>
          <a
            href="/npcs"
            class="px-6 py-2 bg-gray-700 hover:bg-gray-600 rounded text-white font-medium transition"
          >
            Cancel
          </a>
        </div>
      </form>
    </div>
  );
};

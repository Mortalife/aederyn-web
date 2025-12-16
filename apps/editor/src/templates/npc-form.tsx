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
              {/* Visual Relationship Display */}
              {Object.keys(n.relationships || {}).length > 0 && (
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(n.relationships || {}).map(([type, relations]) => (
                    <div key={type} class="bg-gray-700 rounded-lg p-3 border border-gray-600">
                      <div class="flex items-center gap-2 mb-2">
                        <span class={`text-sm font-semibold ${getRelationshipColor(type)}`}>
                          {getRelationshipIcon(type)} {type.charAt(0).toUpperCase() + type.slice(1)}
                        </span>
                        <span class="text-xs text-gray-500">({(relations as string[]).length})</span>
                      </div>
                      <ul class="space-y-1">
                        {(relations as string[]).map((relation, idx) => (
                          <li key={idx} class="text-sm text-gray-300 pl-2 border-l-2 border-gray-600">
                            {relation}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}

              {/* Other NPCs Reference */}
              {allNpcs.length > 0 && (
                <div class="bg-gray-700/50 rounded p-3">
                  <label class="block text-sm font-medium text-gray-400 mb-2">
                    Available NPCs for relationships:
                  </label>
                  <div class="flex flex-wrap gap-2">
                    {allNpcs
                      .filter(other => other.entity_id !== n.entity_id)
                      .map(other => (
                        <span
                          key={other.entity_id}
                          class="text-xs px-2 py-1 bg-gray-600 rounded text-gray-300 font-mono"
                          title={other.entity_id}
                        >
                          {other.name}
                        </span>
                      ))}
                  </div>
                </div>
              )}

              {/* Add Relationship Button */}
              <button
                type="button"
                data-testid="add-relationship"
                class="w-full py-2 border-2 border-dashed border-gray-600 rounded-lg text-gray-400 hover:border-purple-500 hover:text-purple-400 transition flex items-center justify-center gap-2"
                onclick="document.getElementById('relationships-json-editor').classList.toggle('hidden')"
              >
                <span>+</span>
                <span>Edit Relationships (JSON)</span>
              </button>

              {/* JSON Editor */}
              <div id="relationships-json-editor" class={`bg-gray-700 rounded p-4 ${Object.keys(n.relationships || {}).length > 0 ? 'hidden' : ''}`}>
                <div class="flex items-center justify-between mb-2">
                  <label class="text-sm font-medium text-gray-300">Relationships JSON</label>
                  <span class="text-xs text-gray-500">Format: {"{"}"type": ["NPC - description"]{"}"}</span>
                </div>
                <textarea
                  name="relationships"
                  rows={8}
                  data-testid="relationship-type"
                  placeholder={`{
  "friends": ["Elder Thorne - Trusted mentor and advisor"],
  "rivals": ["Blacksmith Grim - Competing for village contracts"],
  "family": ["Young Mira - Daughter, apprentice herbalist"],
  "acquaintances": []
}`}
                  class="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 font-mono text-sm"
                >
                  {JSON.stringify(n.relationships || {}, null, 2)}
                </textarea>
                <p class="text-xs text-gray-400 mt-2">
                  Relationship types: friends, rivals, family, acquaintances, enemies, mentors, students
                </p>
              </div>
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

import type { FC } from "hono/jsx";
import type { QuestGroup, NPC } from "../repository/index.js";
import type { Objective, RequirementReward } from "@aederyn/types";

interface QuestFormProps {
  quest?: QuestGroup;
  isNew?: boolean;
  npcs?: NPC[];
  allQuests?: QuestGroup[];
}

export const QuestForm: FC<QuestFormProps> = ({ quest, isNew = true, npcs = [], allQuests = [] }) => {
  const defaultQuest: Partial<QuestGroup> = {
    id: "",
    name: "",
    description: "",
    type: "collection",
    giver: {
      entity_id: "",
      zone_id: "",
    },
    objectives: [],
    completion: {
      entity_id: "",
      zone_id: "",
      message: "",
      return_message: "",
    },
    rewards: [],
    is_tutorial: false,
    prerequisites: [],
  };

  const q = quest || defaultQuest;
  const isTile = quest && "starts_at" in quest;

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

            <div>
              <label class="block text-sm font-medium text-gray-300 mb-2">
                Quest Mode
              </label>
              <select
                name="quest_mode"
                id="quest-mode-select"
                class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-rose-500"
                onchange="document.querySelectorAll('.tile-quest-fields').forEach(el => el.style.display = this.value === 'tile' ? 'block' : 'none')"
              >
                <option value="base" selected={!isTile}>Quest (Randomized at runtime)</option>
                <option value="tile" selected={isTile}>TileQuest (Fixed map positions)</option>
              </select>
              <p class="text-xs text-gray-500 mt-1">Base quests have positions assigned at runtime. TileQuests have fixed x,y coordinates.</p>
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

            <div class="tile-quest-fields" style={{ display: isTile ? "block" : "none" }}>
              <label class="block text-sm font-medium text-gray-300 mb-2">
                X Position
              </label>
              <input
                type="number"
                name="giver_x"
                value={(q.giver as any)?.x || 0}
                class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-rose-500"
              />
            </div>

            <div class="tile-quest-fields" style={{ display: isTile ? "block" : "none" }}>
              <label class="block text-sm font-medium text-gray-300 mb-2">
                Y Position
              </label>
              <input
                type="number"
                name="giver_y"
                value={(q.giver as any)?.y || 0}
                class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-rose-500"
              />
            </div>
          </div>

          {/* TileQuest timing fields */}
          <div class="tile-quest-fields grid grid-cols-2 gap-6 mt-4" style={{ display: isTile ? "block" : "none" }}>
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-2">
                Starts At (timestamp)
              </label>
              <input
                type="number"
                name="starts_at"
                value={(q as any).starts_at || 0}
                class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-rose-500"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-2">
                Ends At (timestamp)
              </label>
              <input
                type="number"
                name="ends_at"
                value={(q as any).ends_at || 0}
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
          <div data-testid="objectives-builder" class="space-y-4">
            <div id="objectives-list" class="space-y-4">
              {(q.objectives || []).map((obj: Objective, index: number) => (
                <div key={index} class="bg-gray-700 rounded-lg p-4 border border-gray-600" data-objective-index={index}>
                  <div class="flex items-center justify-between mb-4">
                    <div class="flex items-center gap-3">
                      <select
                        name={`objectives[${index}].type`}
                        class="bg-gray-600 rounded px-3 py-1 text-white"
                        onchange={`window.updateObjectiveFields(${index}, this.value)`}
                      >
                        <option value="gather" selected={obj.type === "gather"}>Gather Resource</option>
                        <option value="collect" selected={obj.type === "collect"}>Collect Item</option>
                        <option value="talk" selected={obj.type === "talk"}>Talk to NPC</option>
                        <option value="explore" selected={obj.type === "explore"}>Explore Location</option>
                        <option value="craft" selected={obj.type === "craft"}>Craft at Station</option>
                      </select>
                    </div>
                    <button type="button" onclick="this.closest('[data-objective-index]').remove()" class="text-red-400 hover:text-red-300">Remove</button>
                  </div>
                  <div class="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label class="text-xs text-gray-400">Objective ID</label>
                      <input type="text" name={`objectives[${index}].id`} value={obj.id} placeholder="obj_01" class="w-full px-3 py-2 bg-gray-600 rounded text-white" />
                    </div>
                    <div>
                      <label class="text-xs text-gray-400">Description</label>
                      <input type="text" name={`objectives[${index}].description`} value={obj.description} placeholder="Auto-generated if empty" class="w-full px-3 py-2 bg-gray-600 rounded text-white" />
                    </div>
                  </div>
                  {obj.type === "gather" && (
                    <div class="grid grid-cols-2 gap-4">
                      <div>
                        <label class="text-xs text-gray-400">Resource ID</label>
                        <input type="text" name={`objectives[${index}].resource_id`} value={(obj as any).resource_id} class="w-full px-3 py-2 bg-gray-600 rounded text-white" />
                      </div>
                      <div>
                        <label class="text-xs text-gray-400">Amount</label>
                        <input type="number" name={`objectives[${index}].amount`} value={(obj as any).amount} min={1} class="w-full px-3 py-2 bg-gray-600 rounded text-white" />
                      </div>
                    </div>
                  )}
                  {obj.type === "collect" && (
                    <div class="grid grid-cols-2 gap-4">
                      <div>
                        <label class="text-xs text-gray-400">Item ID</label>
                        <input type="text" name={`objectives[${index}].item_id`} value={(obj as any).item_id} class="w-full px-3 py-2 bg-gray-600 rounded text-white" />
                      </div>
                      <div>
                        <label class="text-xs text-gray-400">Amount</label>
                        <input type="number" name={`objectives[${index}].amount`} value={(obj as any).amount} min={1} class="w-full px-3 py-2 bg-gray-600 rounded text-white" />
                      </div>
                    </div>
                  )}
                  {obj.type === "talk" && (
                    <div class="grid grid-cols-2 gap-4">
                      <div>
                        <label class="text-xs text-gray-400">NPC Entity ID</label>
                        <input type="text" name={`objectives[${index}].entity_id`} value={(obj as any).entity_id} class="w-full px-3 py-2 bg-gray-600 rounded text-white" />
                      </div>
                      <div>
                        <label class="text-xs text-gray-400">Zone ID</label>
                        <input type="text" name={`objectives[${index}].zone_id`} value={(obj as any).zone_id} class="w-full px-3 py-2 bg-gray-600 rounded text-white" />
                      </div>
                    </div>
                  )}
                  {obj.type === "explore" && (
                    <div class="grid grid-cols-3 gap-4">
                      <div>
                        <label class="text-xs text-gray-400">Zone ID</label>
                        <input type="text" name={`objectives[${index}].zone_id`} value={(obj as any).zone_id} class="w-full px-3 py-2 bg-gray-600 rounded text-white" />
                      </div>
                      <div>
                        <label class="text-xs text-gray-400">Chance (%)</label>
                        <input type="number" name={`objectives[${index}].chance`} value={(obj as any).chance} min={1} max={100} class="w-full px-3 py-2 bg-gray-600 rounded text-white" />
                      </div>
                      <div class="col-span-3">
                        <label class="text-xs text-gray-400">Found Message</label>
                        <input type="text" name={`objectives[${index}].found_message`} value={(obj as any).found_message || ""} class="w-full px-3 py-2 bg-gray-600 rounded text-white" />
                      </div>
                    </div>
                  )}
                  {obj.type === "craft" && (
                    <div class="grid grid-cols-2 gap-4">
                      <div>
                        <label class="text-xs text-gray-400">Station Resource ID</label>
                        <input type="text" name={`objectives[${index}].resource_id`} value={(obj as any).resource_id} class="w-full px-3 py-2 bg-gray-600 rounded text-white" />
                      </div>
                      <div>
                        <label class="text-xs text-gray-400">Amount</label>
                        <input type="number" name={`objectives[${index}].amount`} value={(obj as any).amount} min={1} class="w-full px-3 py-2 bg-gray-600 rounded text-white" />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <button
              type="button"
              class="w-full py-3 border-2 border-dashed border-gray-600 rounded-lg text-gray-400 hover:border-rose-500 hover:text-rose-400 transition"
              onclick="window.addObjective()"
            >
              + Add Objective
            </button>
          </div>
        </div>

        {/* Rewards Section */}
        <div class="mb-8">
          <h2 class="text-lg font-semibold text-rose-400 mb-4 border-b border-gray-700 pb-2">
            Rewards
          </h2>
          <div data-testid="rewards-section" class="space-y-4">
            <div id="rewards-list" class="space-y-3">
              {(q.rewards || []).map((reward: RequirementReward, index: number) => (
                <div key={index} class="flex items-center gap-3 bg-gray-700 p-3 rounded" data-reward-index={index}>
                  <select
                    name={`rewards[${index}].type`}
                    class="w-28 px-2 py-1 bg-gray-600 rounded text-white"
                    onchange={`window.updateRewardFields(this, ${index})`}
                  >
                    <option value="item" selected={reward.type === "item"}>Item</option>
                    <option value="gold" selected={reward.type === "gold"}>Gold</option>
                    <option value="skill" selected={reward.type === "skill"}>Skill XP</option>
                  </select>
                  <div id={`reward-fields-${index}`} class="flex-1 flex items-center gap-2">
                    {reward.type === "item" && (
                      <>
                        <input type="text" name={`rewards[${index}].item_id`} value={(reward as any).item_id} placeholder="item_id" class="flex-1 px-2 py-1 bg-gray-600 rounded text-white" />
                        <input type="number" name={`rewards[${index}].amount`} value={reward.amount} min={1} class="w-20 px-2 py-1 bg-gray-600 rounded text-white" />
                      </>
                    )}
                    {reward.type === "gold" && (
                      <input type="number" name={`rewards[${index}].amount`} value={reward.amount} min={1} placeholder="Amount" class="flex-1 px-2 py-1 bg-gray-600 rounded text-white" />
                    )}
                    {reward.type === "skill" && (
                      <>
                        <select name={`rewards[${index}].skill_id`} class="flex-1 px-2 py-1 bg-gray-600 rounded text-white">
                          <option value="mining" selected={(reward as any).skill_id === "mining"}>Mining</option>
                          <option value="woodcutting" selected={(reward as any).skill_id === "woodcutting"}>Woodcutting</option>
                          <option value="fishing" selected={(reward as any).skill_id === "fishing"}>Fishing</option>
                          <option value="crafting" selected={(reward as any).skill_id === "crafting"}>Crafting</option>
                          <option value="cooking" selected={(reward as any).skill_id === "cooking"}>Cooking</option>
                          <option value="combat" selected={(reward as any).skill_id === "combat"}>Combat</option>
                        </select>
                        <input type="number" name={`rewards[${index}].amount`} value={reward.amount} min={1} placeholder="XP" class="w-24 px-2 py-1 bg-gray-600 rounded text-white" />
                      </>
                    )}
                  </div>
                  <button type="button" onclick="this.closest('[data-reward-index]').remove()" class="text-red-400">✕</button>
                </div>
              ))}
            </div>
            <div class="flex gap-2">
              <button type="button" onclick="window.addReward('item')" class="flex-1 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm text-white transition">
                + Item Reward
              </button>
              <button type="button" onclick="window.addReward('gold')" class="flex-1 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm text-white transition">
                + Gold Reward
              </button>
              <button type="button" onclick="window.addReward('skill')" class="flex-1 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm text-white transition">
                + Skill XP
              </button>
            </div>
          </div>
        </div>

        {/* Completion Section */}
        <div class="mb-8">
          <h2 class="text-lg font-semibold text-rose-400 mb-4 border-b border-gray-700 pb-2">
            Completion Dialog
          </h2>
          <div class="bg-gray-700 rounded p-4 space-y-4">
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="text-xs text-gray-400">Turn-in NPC</label>
                <select name="completion_entity_id" class="w-full px-3 py-2 bg-gray-600 rounded text-white">
                  <option value="">Same as Quest Giver</option>
                  {npcs.map(n => (
                    <option value={n.entity_id} selected={q.completion?.entity_id === n.entity_id}>{n.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label class="text-xs text-gray-400">Zone ID</label>
                <input type="text" name="completion_zone_id" value={q.completion?.zone_id || ""} placeholder="zone_village" class="w-full px-3 py-2 bg-gray-600 rounded text-white" />
              </div>
            </div>
            <div class="tile-quest-fields grid grid-cols-2 gap-4" style={{ display: isTile ? "grid" : "none" }}>
              <div>
                <label class="text-xs text-gray-400">X Position</label>
                <input type="number" name="completion_x" value={(q.completion as any)?.x || 0} class="w-full px-3 py-2 bg-gray-600 rounded text-white" />
              </div>
              <div>
                <label class="text-xs text-gray-400">Y Position</label>
                <input type="number" name="completion_y" value={(q.completion as any)?.y || 0} class="w-full px-3 py-2 bg-gray-600 rounded text-white" />
              </div>
            </div>
            <div>
              <label class="text-xs text-gray-400">Completion Message</label>
              <textarea name="completion_message" rows={3} placeholder="What the NPC says when you complete the quest..." class="w-full px-3 py-2 bg-gray-600 rounded text-white">{q.completion?.message || ""}</textarea>
            </div>
            <div>
              <label class="text-xs text-gray-400">Return Message (if player talks again)</label>
              <textarea name="completion_return_message" rows={2} placeholder="What the NPC says if you talk to them after completing..." class="w-full px-3 py-2 bg-gray-600 rounded text-white">{q.completion?.return_message || ""}</textarea>
            </div>
          </div>
        </div>

        {/* Prerequisites Section */}
        <div class="mb-8">
          <h2 class="text-lg font-semibold text-rose-400 mb-4 border-b border-gray-700 pb-2">
            Prerequisites
          </h2>
          <div class="bg-gray-700 rounded p-4 space-y-3">
            {/* Selected prerequisites as chips */}
            <div id="prerequisites-list" class="flex flex-wrap gap-2">
              {(q.prerequisites || []).map((questId: string, index: number) => {
                const prereqQuest = allQuests.find(quest => quest.id === questId);
                return (
                  <span key={questId} class="inline-flex items-center gap-1 px-3 py-1 bg-rose-500/20 text-rose-400 rounded-full text-sm">
                    <input type="hidden" name={`prerequisites[${index}]`} value={questId} />
                    {prereqQuest?.name || questId}
                    <button type="button" onclick="this.parentElement.remove()" class="ml-1 hover:text-rose-300">✕</button>
                  </span>
                );
              })}
            </div>

            {/* Dropdown to add more */}
            <select
              class="w-full px-3 py-2 bg-gray-600 rounded text-white"
              onchange="window.addPrerequisite(this)"
            >
              <option value="">+ Add prerequisite quest...</option>
              {allQuests
                .filter(quest => quest.id !== q.id && !(q.prerequisites || []).includes(quest.id))
                .map(quest => (
                  <option value={quest.id}>{quest.name} ({quest.id})</option>
                ))}
            </select>

            {(q.prerequisites || []).length === 0 && (
              <p class="text-xs text-gray-500">No prerequisites - quest is immediately available.</p>
            )}
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

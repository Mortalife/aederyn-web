import type { FC } from "hono/jsx";
import type { Quest, NPC, MapData } from "../repository/index.js";
import type { RequirementReward } from "@aederyn/types";

interface QuestFormProps {
  quest?: Quest;
  isNew?: boolean;
  npcs?: NPC[];
  allQuests?: Quest[];
  map?: MapData;
}

const inputClass =
  "w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-rose-500";

const OBJECTIVES_HELP = `Each objective: { "id", "type", "description", "progress": null, ... }
gather  { "resource_id", "amount", "region"? }      region: only counts there
collect { "item_id", "amount" }
craft   { "resource_id", "amount" }
kill    { "monster_id", "count", "region"? }
talk    { "entity_id", "landmark"?, "dialog_steps": [{ "entity_id" | null, "dialog" }] }
explore { "landmark" } or, contracts only, { "region", "tile"? }, plus "chance", "found_message"`;

const LandmarkSelect: FC<{ name: string; value?: string; landmarks: MapData["landmarks"]; emptyLabel: string; disabled?: boolean }> = ({
  name,
  value,
  landmarks,
  emptyLabel,
  disabled,
}) => (
  <select name={name} disabled={disabled} class={inputClass}>
    <option value="">{emptyLabel}</option>
    {landmarks.map((l) => (
      <option value={l.id} selected={value === l.id}>
        {l.id} ({l.x},{l.y})
      </option>
    ))}
  </select>
);

export const QuestForm: FC<QuestFormProps> = ({ quest, isNew = true, npcs = [], allQuests = [], map }) => {
  const q: Partial<Quest> & { kind: Quest["kind"] } = quest ?? {
    id: "",
    kind: "story",
    name: "",
    description: "",
    type: "collection",
    objectives: [],
    rewards: [],
  };
  const story = q.kind === "story" ? (q as Extract<Quest, { kind: "story" }>) : null;
  const contract = q.kind === "contract" ? (q as Extract<Quest, { kind: "contract" }>) : null;
  const landmarks = map?.landmarks ?? [];
  const npcLabel = (npc: NPC) => `${npc.name} (${npc.home ? `lives at ${npc.home}` : "no home"})`;
  const questTypes = ["collection", "messenger", "investigation", "crafting", "exploration", "defence", "combat", "delivery", "dialog"];

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
                pattern="^[a-z0-9_]+$"
                placeholder="quest_example"
                disabled={!isNew}
                class={`${inputClass} disabled:opacity-50`}
              />
              <p class="text-xs text-gray-500 mt-1">Format: quest_[name]</p>
            </div>

            <div class="col-span-2 md:col-span-1">
              <label class="block text-sm font-medium text-gray-300 mb-2">
                Name <span class="text-red-400">*</span>
              </label>
              <input type="text" name="name" value={q.name} required placeholder="The Great Adventure" class={inputClass} />
            </div>

            <div class="col-span-2">
              <label class="block text-sm font-medium text-gray-300 mb-2">
                Description <span class="text-red-400">*</span>
              </label>
              <textarea name="description" required rows={3} placeholder="A brief description of the quest..." class={inputClass}>
                {q.description}
              </textarea>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-300 mb-2">
                Kind <span class="text-red-400">*</span>
              </label>
              <select
                name="kind"
                data-testid="quest-kind"
                class={inputClass}
                onchange="window.updateQuestKind(this.value)"
              >
                <option value="story" selected={q.kind === "story"}>Story (one-time, from an NPC)</option>
                <option value="contract" selected={q.kind === "contract"}>Contract (repeatable, from a board)</option>
              </select>
              <p class="text-xs text-gray-500 mt-1">
                Story quests are always available once their prerequisites are done. Contracts rotate on the board every two hours.
              </p>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-300 mb-2">
                Type <span class="text-red-400">*</span>
              </label>
              <select name="type" required class={inputClass}>
                {questTypes.map((type) => (
                  <option value={type} selected={q.type === type}>{type}</option>
                ))}
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

        {/* Story: giver and turn-in */}
        <div class="mb-8" data-quest-kind="story" style={{ display: story ? "" : "none" }}>
          <h2 class="text-lg font-semibold text-rose-400 mb-4 border-b border-gray-700 pb-2">
            Quest Giver and Turn-in
          </h2>
          <p class="text-xs text-gray-500 mb-4">
            NPCs are met at their home landmark. Pick a landmark only to meet them somewhere else for this quest.
          </p>
          <div class="grid grid-cols-2 gap-6">
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-2">
                Giver <span class="text-red-400">*</span>
              </label>
              <select name="giver_entity_id" data-testid="quest-giver" disabled={!story} class={inputClass}>
                <option value="">Select NPC...</option>
                {npcs.map((npc) => (
                  <option value={npc.entity_id} selected={story?.giver.entity_id === npc.entity_id}>
                    {npcLabel(npc)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-2">Met at</label>
              <LandmarkSelect name="giver_landmark" value={story?.giver.landmark} landmarks={landmarks} emptyLabel="Their home" disabled={!story} />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-2">Turn-in NPC</label>
              <select name="completion_entity_id" disabled={!story} class={inputClass}>
                <option value="">Same as giver</option>
                {npcs.map((npc) => (
                  <option value={npc.entity_id} selected={story?.completion.entity_id === npc.entity_id}>
                    {npcLabel(npc)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-2">Met at</label>
              <LandmarkSelect name="completion_landmark" value={story?.completion.landmark} landmarks={landmarks} emptyLabel="Their home" disabled={!story} />
            </div>
            <div class="col-span-2">
              <label class="block text-sm font-medium text-gray-300 mb-2">Return message (if the player talks again)</label>
              <textarea name="completion_return_message" rows={2} disabled={!story} class={inputClass}>{story?.completion.return_message ?? ""}</textarea>
            </div>
          </div>
        </div>

        {/* Contract: board */}
        <div class="mb-8" data-quest-kind="contract" style={{ display: contract ? "" : "none" }}>
          <h2 class="text-lg font-semibold text-rose-400 mb-4 border-b border-gray-700 pb-2">
            Contract Board
          </h2>
          <label class="block text-sm font-medium text-gray-300 mb-2">
            Board <span class="text-red-400">*</span>
          </label>
          <LandmarkSelect name="board" value={contract?.board} landmarks={landmarks} emptyLabel="Select landmark..." disabled={!contract} />
          <p class="text-xs text-gray-500 mt-1">
            Taken and handed in at this landmark. Objectives can be scoped to a map region; explore with a region picks a new cell each rotation.
          </p>
        </div>

        <div class="mb-8">
          <label class="block text-sm font-medium text-gray-300 mb-2">Completion message</label>
          <textarea name="completion_message" rows={3} placeholder="What the player is told when they hand it in..." class={inputClass}>
            {q.completion?.message ?? ""}
          </textarea>
        </div>

        {/* Objectives Section */}
        <div class="mb-8">
          <h2 class="text-lg font-semibold text-rose-400 mb-4 border-b border-gray-700 pb-2">
            Objectives
          </h2>
          <div data-testid="objectives-builder">
            <textarea
              name="objectives"
              rows={16}
              spellcheck={false}
              class={`${inputClass} font-mono text-xs`}
            >
              {JSON.stringify(q.objectives ?? [], null, 2)}
            </textarea>
            <pre class="text-xs text-gray-500 mt-2 whitespace-pre-wrap">{OBJECTIVES_HELP}</pre>
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

        {/* Story: mutually exclusive quests */}
        <div class="mb-8" data-quest-kind="story" style={{ display: story ? "" : "none" }}>
          <h2 class="text-lg font-semibold text-rose-400 mb-4 border-b border-gray-700 pb-2">
            Excludes
          </h2>
          <div class="bg-gray-700 rounded p-4 space-y-3">
            <div id="excludes-list" class="flex flex-wrap gap-2">
              {(story?.excludes || []).map((questId: string, index: number) => (
                <span key={questId} class="inline-flex items-center gap-1 px-3 py-1 bg-rose-500/20 text-rose-400 rounded-full text-sm">
                  <input type="hidden" name={`excludes[${index}]`} value={questId} disabled={!story} />
                  {allQuests.find((quest) => quest.id === questId)?.name || questId}
                  <button type="button" onclick="this.parentElement.remove()" class="ml-1 hover:text-rose-300">✕</button>
                </span>
              ))}
            </div>
            <select
              class="w-full px-3 py-2 bg-gray-600 rounded text-white"
              disabled={!story}
              onchange="window.addPrerequisite(this, 'excludes')"
            >
              <option value="">+ Add excluded story quest...</option>
              {allQuests
                .filter((quest) => quest.kind === "story" && quest.id !== q.id && !(story?.excludes || []).includes(quest.id))
                .map((quest) => (
                  <option value={quest.id}>{quest.name} ({quest.id})</option>
                ))}
            </select>
            <p class="text-xs text-gray-500">
              A choice between story quests: this one isn't offered while the player has any of these taken or completed. List it on each of them too; abandoning frees the choice, completing makes it final.
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

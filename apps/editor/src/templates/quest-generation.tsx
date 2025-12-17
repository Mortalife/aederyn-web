import type { WorldBible } from "@aederyn/types";
import type {
  QuestGenerationState,
  QuestOutlay,
  EntityPlan,
  GeneratedEntities,
} from "../services/ai-quest-schemas.js";

interface Props {
  state: QuestGenerationState | null;
  activeGenerations: QuestGenerationState[];
  worldBible: WorldBible;
  aiConfigured: boolean;
}

export function QuestGeneration({
  state,
  activeGenerations,
  worldBible,
  aiConfigured,
}: Props) {
  const progressPercent =
    state && state.totalSteps > 0
      ? Math.round(
          (state.steps.filter((s) => s.status === "completed").length /
            state.totalSteps) *
            100
        )
      : 0;

  return (
    <div id="main-content" class="space-y-6">
      <div class="flex items-center justify-between">
        <h1 class="text-2xl font-bold text-white">AI Quest Generator</h1>
        <a href="/quests" class="text-blue-400 hover:underline">
          ← Back to Quests
        </a>
      </div>

      {!aiConfigured && (
        <div class="bg-red-900/50 border border-red-500 rounded-lg p-4">
          <p class="text-red-200">
            <strong>AI not configured.</strong> Set the{" "}
            <code class="bg-gray-800 px-1 rounded">OPENROUTER_API_KEY</code>{" "}
            environment variable to enable AI generation.
          </p>
        </div>
      )}

      {/* New Quest Form */}
      {aiConfigured &&
        (!state ||
          state.status === "completed" ||
          state.status === "failed" ||
          state.status === "cancelled") && (
          <div class="bg-gray-800 rounded-lg p-6">
            <h2 class="text-lg font-semibold text-white mb-4">
              Generate New Quest
            </h2>
            <form
              method="post"
              action="/commands/quests/generate"
              class="space-y-4"
            >
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-gray-300 mb-1">
                    Quest Name <span class="text-gray-500">(optional)</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    placeholder="Leave blank to auto-generate"
                    class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-300 mb-1">
                    Quest Type
                  </label>
                  <select
                    name="type"
                    class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                  >
                    <option value="side">Side Quest</option>
                    <option value="main">Main Quest</option>
                    <option value="faction">Faction Quest</option>
                    <option value="daily">Daily Quest</option>
                  </select>
                </div>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-300 mb-1">
                  Quest Concept <span class="text-gray-500">(optional)</span>
                </label>
                <textarea
                  name="concept"
                  rows={3}
                  placeholder="Leave blank to let AI generate based on world bible, or provide a brief concept..."
                  class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-gray-300 mb-1">
                    Region (optional)
                  </label>
                  <select
                    name="region"
                    class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                  >
                    <option value="">Any Region</option>
                    {worldBible.regions.map((r) => (
                      <option value={r.id}>{r.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-300 mb-1">
                    Faction (optional)
                  </label>
                  <select
                    name="faction"
                    class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                  >
                    <option value="">Any Faction</option>
                    {worldBible.factions.map((f) => (
                      <option value={f.id}>{f.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                type="submit"
                class="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
              >
                Start Generation
              </button>
            </form>
          </div>
        )}

      {/* Active Generation Progress */}
      {state &&
        (state.status === "running" || state.status === "awaiting_review") && (
          <div class="bg-gray-800 rounded-lg p-6">
            <div class="flex items-center justify-between mb-4">
              <div>
                <h2 class="text-lg font-semibold text-white">
                  {state.questName}
                </h2>
                <p class="text-gray-400 text-sm">
                  {state.status === "running" &&
                    `Generating: ${
                      state.steps[state.currentStep]?.name || "..."
                    }`}
                  {state.status === "awaiting_review" &&
                    `Awaiting Review: ${state.pendingReview?.type || "..."}`}
                </p>
              </div>
              <form
                method="post"
                action={`/commands/quests/generate/${state.questId}/cancel`}
                data-on:submit__prevent={`@post('/commands/quests/generate/${state.questId}/cancel', {contentType: 'form'})`}
              >
                <button
                  type="submit"
                  class="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </form>
            </div>

            {/* Progress bar */}
            <div class="mb-6">
              <div class="flex justify-between text-sm text-gray-400 mb-1">
                <span>Progress</span>
                <span>{progressPercent}%</span>
              </div>
              <div class="h-3 bg-gray-700 rounded-full overflow-hidden">
                <div
                  class={`h-full transition-all duration-500 ${
                    state.status === "awaiting_review"
                      ? "bg-yellow-500"
                      : "bg-purple-500"
                  }`}
                  style={`width: ${progressPercent}%`}
                />
              </div>
            </div>

            {/* Steps list */}
            <div class="space-y-2 mb-6">
              {state.steps.map((step, index) => (
                <div
                  class={`flex items-center gap-3 p-3 rounded-lg ${
                    step.status === "running"
                      ? "bg-purple-900/30 border border-purple-500"
                      : step.status === "awaiting_review"
                      ? "bg-yellow-900/30 border border-yellow-500"
                      : step.status === "completed"
                      ? "bg-green-900/20"
                      : step.status === "failed"
                      ? "bg-red-900/20"
                      : "bg-gray-700/30"
                  }`}
                >
                  <div class="w-6 h-6 flex items-center justify-center">
                    {step.status === "pending" && (
                      <span class="text-gray-500">{index + 1}</span>
                    )}
                    {step.status === "running" && (
                      <span class="animate-spin text-purple-400">⟳</span>
                    )}
                    {step.status === "awaiting_review" && (
                      <span class="text-yellow-400">⏸</span>
                    )}
                    {step.status === "completed" && (
                      <span class="text-green-400">✓</span>
                    )}
                    {step.status === "failed" && (
                      <span class="text-red-400">✗</span>
                    )}
                  </div>
                  <div class="flex-1">
                    <span
                      class={
                        step.status === "running"
                          ? "text-purple-200"
                          : step.status === "awaiting_review"
                          ? "text-yellow-200"
                          : step.status === "completed"
                          ? "text-green-200"
                          : step.status === "failed"
                          ? "text-red-200"
                          : "text-gray-400"
                      }
                    >
                      {step.name}
                    </span>
                    {step.error && (
                      <p class="text-red-400 text-sm mt-1">{step.error}</p>
                    )}
                  </div>
                  {step.completedAt && (
                    <span class="text-gray-500 text-xs">
                      {new Date(step.completedAt).toLocaleTimeString()}
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* Review Gates */}
            {state.status === "awaiting_review" && state.pendingReview && (
              <ReviewGate state={state} />
            )}

            {state.error && (
              <div class="mt-4 p-3 bg-red-900/30 border border-red-500 rounded-lg">
                <p class="text-red-200">{state.error}</p>
              </div>
            )}
          </div>
        )}

      {/* Completed/Failed State */}
      {state &&
        (state.status === "completed" ||
          state.status === "failed" ||
          state.status === "cancelled") && (
          <div
            class={`bg-gray-800 rounded-lg p-6 border ${
              state.status === "completed"
                ? "border-green-500"
                : state.status === "cancelled"
                ? "border-gray-500"
                : "border-red-500"
            }`}
          >
            <div class="flex items-center gap-3 mb-4">
              <span
                class={`text-2xl ${
                  state.status === "completed"
                    ? "text-green-400"
                    : state.status === "cancelled"
                    ? "text-gray-400"
                    : "text-red-400"
                }`}
              >
                {state.status === "completed"
                  ? "✓"
                  : state.status === "cancelled"
                  ? "⊘"
                  : "✗"}
              </span>
              <div>
                <h2 class="text-lg font-semibold text-white">
                  {state.questName}
                </h2>
                <p
                  class={`text-sm ${
                    state.status === "completed"
                      ? "text-green-400"
                      : state.status === "cancelled"
                      ? "text-gray-400"
                      : "text-red-400"
                  }`}
                >
                  {state.status === "completed" &&
                    "Quest generated successfully!"}
                  {state.status === "cancelled" && "Generation cancelled"}
                  {state.status === "failed" &&
                    `Generation failed: ${state.error}`}
                </p>
              </div>
            </div>

            {state.status === "completed" && state.generatedEntities && (
              <div class="grid grid-cols-3 gap-4 text-center">
                <div class="bg-gray-700/50 rounded-lg p-3">
                  <div class="text-2xl font-bold text-purple-400">
                    {state.generatedEntities.items.length}
                  </div>
                  <div class="text-sm text-gray-400">Items</div>
                </div>
                <div class="bg-gray-700/50 rounded-lg p-3">
                  <div class="text-2xl font-bold text-purple-400">
                    {state.generatedEntities.npcs.length}
                  </div>
                  <div class="text-sm text-gray-400">NPCs</div>
                </div>
                <div class="bg-gray-700/50 rounded-lg p-3">
                  <div class="text-2xl font-bold text-purple-400">
                    {state.generatedEntities.locations.length}
                  </div>
                  <div class="text-sm text-gray-400">Locations</div>
                </div>
              </div>
            )}
          </div>
        )}

      {/* Active Generations List */}
      {activeGenerations.length > 0 && (
        <div class="bg-gray-800 rounded-lg p-6">
          <h3 class="text-lg font-semibold text-white mb-4">
            Active Generations
          </h3>
          <div class="space-y-2">
            {activeGenerations.map((gen) => (
              <a
                href={`/quests/generate/${gen.questId}`}
                class="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg hover:bg-gray-700 transition-colors"
              >
                <div>
                  <span class="text-white">{gen.questName}</span>
                  <span
                    class={`ml-2 text-xs px-2 py-0.5 rounded ${
                      gen.status === "running"
                        ? "bg-purple-600"
                        : gen.status === "awaiting_review"
                        ? "bg-yellow-600"
                        : "bg-gray-600"
                    }`}
                  >
                    {gen.status}
                  </span>
                </div>
                <span class="text-gray-400 text-sm">
                  Step {gen.currentStep + 1}/{gen.totalSteps}
                </span>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Info section */}
      <div class="bg-gray-800 rounded-lg p-6">
        <h3 class="text-lg font-semibold text-white mb-3">
          Generation Pipeline
        </h3>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-gray-300">
          <div>
            <h4 class="font-medium text-purple-300">1. Outlay</h4>
            <p class="text-sm text-gray-400">
              500-1000 word narrative foundation
            </p>
          </div>
          <div>
            <h4 class="font-medium text-purple-300">2. Entity Planning</h4>
            <p class="text-sm text-gray-400">
              Identify NPCs, items, locations needed
            </p>
          </div>
          <div>
            <h4 class="font-medium text-purple-300">3. Entity Generation</h4>
            <p class="text-sm text-gray-400">Create items → NPCs → locations</p>
          </div>
          <div>
            <h4 class="font-medium text-purple-300">4. Assembly</h4>
            <p class="text-sm text-gray-400">Combine into final quest</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ReviewGate({ state }: { state: QuestGenerationState }) {
  const review = state.pendingReview;
  if (!review) return null;

  return (
    <div class="bg-yellow-900/20 border border-yellow-500 rounded-lg p-4">
      <h3 class="text-lg font-semibold text-yellow-200 mb-4">
        Review Required:{" "}
        {review.type === "outlay"
          ? "Quest Narrative"
          : review.type === "entity_plan"
          ? "Entity Plan"
          : "Generated Entities"}
      </h3>

      {review.type === "outlay" && (
        <OutlayReview
          data={review.data as OutlayReviewData}
          questId={state.questId}
        />
      )}
      {review.type === "entity_plan" && (
        <EntityPlanReview
          data={review.data as EntityPlanReviewData}
          questId={state.questId}
        />
      )}
      {review.type === "entities" && (
        <EntitiesReview
          data={review.data as EntitiesReviewData}
          questId={state.questId}
        />
      )}
    </div>
  );
}

interface OutlayReviewData {
  questId: string;
  outlay: QuestOutlay;
  wordCount: number;
  detectedThemes: string[];
  detectedFactions: string[];
  detectedRegions: string[];
}

function OutlayReview({
  data,
  questId,
}: {
  data: OutlayReviewData;
  questId: string;
}) {
  const {
    outlay,
    wordCount,
    detectedThemes,
    detectedFactions,
    detectedRegions,
  } = data;

  return (
    <div class="space-y-4">
      <div class="flex gap-4 text-sm text-gray-400">
        <span>
          Word count: <strong class="text-white">{wordCount}</strong>
        </span>
        {detectedThemes.length > 0 && (
          <span>
            Themes:{" "}
            <strong class="text-purple-300">{detectedThemes.join(", ")}</strong>
          </span>
        )}
        {detectedFactions.length > 0 && (
          <span>
            Factions:{" "}
            <strong class="text-blue-300">{detectedFactions.join(", ")}</strong>
          </span>
        )}
        {detectedRegions.length > 0 && (
          <span>
            Regions:{" "}
            <strong class="text-green-300">{detectedRegions.join(", ")}</strong>
          </span>
        )}
      </div>

      <div class="space-y-3 max-h-96 overflow-y-auto">
        <OutlaySection title="Quest Hook" content={outlay.questHook} />
        <OutlaySection
          title="Background & Context"
          content={outlay.backgroundContext}
        />
        <OutlaySection title="Core Conflict" content={outlay.coreConflict} />
        <OutlaySection title="Key Characters" content={outlay.keyCharacters} />
        <OutlaySection
          title="Stakes & Consequences"
          content={outlay.stakesConsequences}
        />
        <OutlaySection
          title="Thematic Connections"
          content={outlay.thematicConnections}
        />
        <OutlaySection
          title="Regional Integration"
          content={outlay.regionalIntegration}
        />
        <OutlaySection
          title="Faction Involvement"
          content={outlay.factionInvolvement}
        />
      </div>

      <ReviewActions questId={questId} />
    </div>
  );
}

function OutlaySection({ title, content }: { title: string; content: string }) {
  return (
    <div class="bg-gray-800/50 rounded p-3">
      <h4 class="text-sm font-medium text-purple-300 mb-1">{title}</h4>
      <p class="text-gray-300 text-sm whitespace-pre-wrap">{content}</p>
    </div>
  );
}

interface EntityPlanReviewData {
  questId: string;
  entityPlan: EntityPlan;
  existingMatches: {
    npcs: Array<{
      planned: { tempId: string; suggestedName?: string };
      existing: { entity_id: string; name: string };
      matchScore: number;
    }>;
    items: Array<{
      planned: { tempId: string; suggestedName?: string };
      existing: { id: string; name: string };
      matchScore: number;
    }>;
    locations: Array<{
      planned: { tempId: string; suggestedName?: string };
      existing: { id: string; name: string };
      matchScore: number;
    }>;
  };
  summary: {
    npcCount: number;
    itemCount: number;
    locationCount: number;
    objectiveCount: number;
  };
}

function EntityPlanReview({
  data,
  questId,
}: {
  data: EntityPlanReviewData;
  questId: string;
}) {
  const { entityPlan, existingMatches, summary } = data;

  return (
    <div class="space-y-4">
      <div class="grid grid-cols-4 gap-4 text-center">
        <div class="bg-gray-800/50 rounded p-2">
          <div class="text-xl font-bold text-blue-400">{summary.npcCount}</div>
          <div class="text-xs text-gray-400">NPCs</div>
        </div>
        <div class="bg-gray-800/50 rounded p-2">
          <div class="text-xl font-bold text-green-400">
            {summary.itemCount}
          </div>
          <div class="text-xs text-gray-400">Items</div>
        </div>
        <div class="bg-gray-800/50 rounded p-2">
          <div class="text-xl font-bold text-orange-400">
            {summary.locationCount}
          </div>
          <div class="text-xs text-gray-400">Locations</div>
        </div>
        <div class="bg-gray-800/50 rounded p-2">
          <div class="text-xl font-bold text-purple-400">
            {summary.objectiveCount}
          </div>
          <div class="text-xs text-gray-400">Objectives</div>
        </div>
      </div>

      <div class="max-h-96 overflow-y-auto space-y-4">
        {/* NPCs */}
        <div>
          <h4 class="text-sm font-medium text-blue-300 mb-2">NPCs</h4>
          <div class="space-y-1">
            {entityPlan.npcs.map((npc) => (
              <div class="flex items-center justify-between bg-gray-800/50 rounded p-2 text-sm">
                <div>
                  <span class="text-white">
                    {npc.suggestedName || npc.tempId}
                  </span>
                  <span class="text-gray-500 ml-2">({npc.role})</span>
                </div>
                <span
                  class={`text-xs px-2 py-0.5 rounded ${
                    npc.importance === "critical"
                      ? "bg-red-600"
                      : npc.importance === "supporting"
                      ? "bg-yellow-600"
                      : "bg-gray-600"
                  }`}
                >
                  {npc.importance}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Items */}
        <div>
          <h4 class="text-sm font-medium text-green-300 mb-2">Items</h4>
          <div class="space-y-1">
            {entityPlan.items.map((item) => (
              <div class="flex items-center justify-between bg-gray-800/50 rounded p-2 text-sm">
                <div>
                  <span class="text-white">
                    {item.suggestedName || item.tempId}
                  </span>
                  <span class="text-gray-500 ml-2">({item.category})</span>
                </div>
                <span
                  class={`text-xs px-2 py-0.5 rounded ${
                    item.importance === "critical"
                      ? "bg-red-600"
                      : item.importance === "optional"
                      ? "bg-yellow-600"
                      : "bg-gray-600"
                  }`}
                >
                  {item.importance}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Locations */}
        <div>
          <h4 class="text-sm font-medium text-orange-300 mb-2">Locations</h4>
          <div class="space-y-1">
            {entityPlan.locations.map((loc) => (
              <div class="flex items-center justify-between bg-gray-800/50 rounded p-2 text-sm">
                <div>
                  <span class="text-white">
                    {loc.suggestedName || loc.tempId}
                  </span>
                  <span class="text-gray-500 ml-2">({loc.locationType})</span>
                </div>
                <span
                  class={`text-xs px-2 py-0.5 rounded ${
                    loc.importance === "primary"
                      ? "bg-red-600"
                      : loc.importance === "secondary"
                      ? "bg-yellow-600"
                      : "bg-gray-600"
                  }`}
                >
                  {loc.importance}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {existingMatches.npcs.length +
        existingMatches.items.length +
        existingMatches.locations.length >
        0 && (
        <div class="bg-blue-900/20 border border-blue-500 rounded p-3">
          <h4 class="text-sm font-medium text-blue-300 mb-2">
            Potential Existing Matches
          </h4>
          <p class="text-xs text-gray-400 mb-2">
            These existing entities could be reused instead of generating new
            ones.
          </p>
          <div class="space-y-1 text-sm">
            {existingMatches.npcs.slice(0, 3).map((m) => (
              <div class="text-gray-300">
                NPC "{m.planned.suggestedName}" → existing "{m.existing.name}" (
                {m.matchScore}% match)
              </div>
            ))}
            {existingMatches.items.slice(0, 3).map((m) => (
              <div class="text-gray-300">
                Item "{m.planned.suggestedName}" → existing "{m.existing.name}"
                ({m.matchScore}% match)
              </div>
            ))}
          </div>
        </div>
      )}

      <ReviewActions questId={questId} />
    </div>
  );
}

interface EntitiesReviewData {
  questId: string;
  entities: GeneratedEntities;
  validationIssues: Array<{
    type: "error" | "warning";
    entityType: string;
    entityId: string;
    message: string;
  }>;
  summary: {
    itemsGenerated: number;
    npcsGenerated: number;
    locationsGenerated: number;
    errorsCount: number;
    warningsCount: number;
  };
}

function EntitiesReview({
  data,
  questId,
}: {
  data: EntitiesReviewData;
  questId: string;
}) {
  const { entities, validationIssues, summary } = data;

  return (
    <div class="space-y-4">
      <div class="grid grid-cols-5 gap-4 text-center">
        <div class="bg-gray-800/50 rounded p-2">
          <div class="text-xl font-bold text-green-400">
            {summary.itemsGenerated}
          </div>
          <div class="text-xs text-gray-400">Items</div>
        </div>
        <div class="bg-gray-800/50 rounded p-2">
          <div class="text-xl font-bold text-blue-400">
            {summary.npcsGenerated}
          </div>
          <div class="text-xs text-gray-400">NPCs</div>
        </div>
        <div class="bg-gray-800/50 rounded p-2">
          <div class="text-xl font-bold text-orange-400">
            {summary.locationsGenerated}
          </div>
          <div class="text-xs text-gray-400">Locations</div>
        </div>
        <div class="bg-gray-800/50 rounded p-2">
          <div class="text-xl font-bold text-red-400">
            {summary.errorsCount}
          </div>
          <div class="text-xs text-gray-400">Errors</div>
        </div>
        <div class="bg-gray-800/50 rounded p-2">
          <div class="text-xl font-bold text-yellow-400">
            {summary.warningsCount}
          </div>
          <div class="text-xs text-gray-400">Warnings</div>
        </div>
      </div>

      {validationIssues.length > 0 && (
        <div class="bg-red-900/20 border border-red-500 rounded p-3">
          <h4 class="text-sm font-medium text-red-300 mb-2">
            Validation Issues
          </h4>
          <div class="space-y-1 text-sm">
            {validationIssues.map((issue) => (
              <div
                class={
                  issue.type === "error" ? "text-red-300" : "text-yellow-300"
                }
              >
                [{issue.type}] {issue.entityType} "{issue.entityId}":{" "}
                {issue.message}
              </div>
            ))}
          </div>
        </div>
      )}

      <div class="max-h-96 overflow-y-auto space-y-4">
        {/* Generated Items */}
        <div>
          <h4 class="text-sm font-medium text-green-300 mb-2">
            Generated Items
          </h4>
          <div class="space-y-1">
            {entities.items.map((item) => (
              <div class="bg-gray-800/50 rounded p-2 text-sm">
                <div class="flex items-center justify-between">
                  <span class="text-white font-medium">{item.name}</span>
                  <span
                    class={`text-xs px-2 py-0.5 rounded ${
                      item.rarity === "legendary"
                        ? "bg-yellow-600"
                        : item.rarity === "epic"
                        ? "bg-purple-600"
                        : item.rarity === "rare"
                        ? "bg-blue-600"
                        : "bg-gray-600"
                    }`}
                  >
                    {item.rarity}
                  </span>
                </div>
                <p class="text-gray-400 text-xs mt-1">{item.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Generated NPCs */}
        <div>
          <h4 class="text-sm font-medium text-blue-300 mb-2">Generated NPCs</h4>
          <div class="space-y-1">
            {entities.npcs.map((npc) => (
              <div class="bg-gray-800/50 rounded p-2 text-sm">
                <span class="text-white font-medium">{npc.name}</span>
                <p class="text-gray-400 text-xs mt-1 line-clamp-2">
                  {npc.backstory}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Generated Locations */}
        <div>
          <h4 class="text-sm font-medium text-orange-300 mb-2">
            Generated Locations
          </h4>
          <div class="space-y-1">
            {entities.locations.map((loc) => (
              <div class="bg-gray-800/50 rounded p-2 text-sm">
                <div class="flex items-center gap-2">
                  <span
                    class="w-4 h-4 rounded"
                    style={`background-color: ${loc.backgroundColor}`}
                  />
                  <span class="text-white font-medium">{loc.name}</span>
                </div>
                <p class="text-gray-400 text-xs mt-1">{loc.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <ReviewActions questId={questId} />
    </div>
  );
}

function ReviewActions({ questId }: { questId: string }) {
  return (
    <div class="flex gap-2 pt-4 border-t border-gray-700">
      <form
        method="post"
        action={`/commands/quests/generate/${questId}/review`}
        data-on:submit__prevent={`@post('/commands/quests/generate/${questId}/review', {contentType: 'form'})`}
      >
        <input type="hidden" name="action" value="approve" />
        <button
          type="submit"
          class="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
        >
          Approve & Continue
        </button>
      </form>
      <form
        method="post"
        action={`/commands/quests/generate/${questId}/review`}
        data-on:submit__prevent={`@post('/commands/quests/generate/${questId}/review', {contentType: 'form'})`}
      >
        <input type="hidden" name="action" value="regenerate" />
        <button
          type="submit"
          class="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors"
        >
          Regenerate
        </button>
      </form>
      <form
        method="post"
        action={`/commands/quests/generate/${questId}/review`}
        data-on:submit__prevent={`@post('/commands/quests/generate/${questId}/review', {contentType: 'form'})`}
      >
        <input type="hidden" name="action" value="cancel" />
        <button
          type="submit"
          class="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
        >
          Cancel
        </button>
      </form>
    </div>
  );
}

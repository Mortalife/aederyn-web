import type { WorldBibleGenerationState } from "../services/ai-world-bible.js";

interface Props {
  state: WorldBibleGenerationState;
  aiConfigured: boolean;
}

export function WorldBibleGeneration({ state, aiConfigured }: Props) {
  const progressPercent = state.totalSteps > 0 
    ? Math.round((state.steps.filter(s => s.status === "completed").length / state.totalSteps) * 100)
    : 0;

  return (
    <div id="main-content" class="space-y-6">
      <div class="flex items-center justify-between">
        <h1 class="text-2xl font-bold text-white">AI World Bible Generator</h1>
        <a href="/world" class="text-blue-400 hover:underline">← Back to World Overview</a>
      </div>

      {!aiConfigured && (
        <div class="bg-red-900/50 border border-red-500 rounded-lg p-4">
          <p class="text-red-200">
            <strong>AI not configured.</strong> Set the <code class="bg-gray-800 px-1 rounded">OPENROUTER_API_KEY</code> environment variable to enable AI generation.
          </p>
        </div>
      )}

      <div class="bg-gray-800 rounded-lg p-6">
        <div class="flex items-center justify-between mb-4">
          <div>
            <h2 class="text-lg font-semibold text-white">Generation Status</h2>
            <p class="text-gray-400 text-sm">
              {state.status === "idle" && "Ready to generate world content"}
              {state.status === "running" && `Generating: ${state.steps[state.currentStep]?.name || "..."}`}
              {state.status === "completed" && "Generation complete!"}
              {state.status === "failed" && "Generation failed"}
            </p>
          </div>
          <div class="flex gap-2">
            {(state.status === "idle" || state.status === "completed" || state.status === "failed") && aiConfigured && (
              <form method="post" action="/api/world-bible/generate">
                <button
                  type="submit"
                  class="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                >
                  {state.status === "idle" ? "Start Generation" : "Regenerate"}
                </button>
              </form>
            )}
            {state.status === "running" && (
              <form method="post" action="/api/world-bible/cancel">
                <button
                  type="submit"
                  class="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </form>
            )}
          </div>
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
                state.status === "failed" ? "bg-red-500" : 
                state.status === "completed" ? "bg-green-500" : "bg-purple-500"
              }`}
              style={`width: ${progressPercent}%`}
            />
          </div>
        </div>

        {/* Steps list */}
        <div class="space-y-2">
          {state.steps.map((step, index) => (
            <div 
              class={`flex items-center gap-3 p-3 rounded-lg ${
                step.status === "running" ? "bg-purple-900/30 border border-purple-500" :
                step.status === "completed" ? "bg-green-900/20" :
                step.status === "failed" ? "bg-red-900/20" :
                "bg-gray-700/30"
              }`}
            >
              <div class="w-6 h-6 flex items-center justify-center">
                {step.status === "pending" && (
                  <span class="text-gray-500">{index + 1}</span>
                )}
                {step.status === "running" && (
                  <span class="animate-spin text-purple-400">⟳</span>
                )}
                {step.status === "completed" && (
                  <span class="text-green-400">✓</span>
                )}
                {step.status === "failed" && (
                  <span class="text-red-400">✗</span>
                )}
              </div>
              <div class="flex-1">
                <span class={
                  step.status === "running" ? "text-purple-200" :
                  step.status === "completed" ? "text-green-200" :
                  step.status === "failed" ? "text-red-200" :
                  "text-gray-400"
                }>
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

        {state.error && (
          <div class="mt-4 p-3 bg-red-900/30 border border-red-500 rounded-lg">
            <p class="text-red-200">{state.error}</p>
          </div>
        )}
      </div>

      {/* Info section */}
      <div class="bg-gray-800 rounded-lg p-6">
        <h3 class="text-lg font-semibold text-white mb-3">What will be generated?</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-300">
          <div>
            <h4 class="font-medium text-purple-300">Description</h4>
            <p class="text-sm text-gray-400">400-1000 word world description as foundation</p>
          </div>
          <div>
            <h4 class="font-medium text-purple-300">Themes (3)</h4>
            <p class="text-sm text-gray-400">Core thematic pillars with examples</p>
          </div>
          <div>
            <h4 class="font-medium text-purple-300">Systems (2)</h4>
            <p class="text-sm text-gray-400">Religion, magic, or technology systems</p>
          </div>
          <div>
            <h4 class="font-medium text-purple-300">Factions (4)</h4>
            <p class="text-sm text-gray-400">Political/social groups with relationships</p>
          </div>
          <div>
            <h4 class="font-medium text-purple-300">Regions (4)</h4>
            <p class="text-sm text-gray-400">Geographic areas with resources</p>
          </div>
          <div>
            <h4 class="font-medium text-purple-300">History (10)</h4>
            <p class="text-sm text-gray-400">300 words each, major historical events</p>
          </div>
          <div>
            <h4 class="font-medium text-purple-300">Naming</h4>
            <p class="text-sm text-gray-400">Patterns for characters, places, items</p>
          </div>
        </div>
      </div>
    </div>
  );
}

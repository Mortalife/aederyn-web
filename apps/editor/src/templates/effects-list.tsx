import type { FC } from "hono/jsx";
import type { Effect } from "../repository/index.js";

interface EffectsListProps {
  effects: Effect[];
}

const KIND_LABELS: Record<Effect["kind"], string> = {
  health: "Health over time",
  gather_speed: "Gather speed",
  blocks: "Blocks actions",
  protects: "Protects",
};

const detail = (effect: Effect, effects: Effect[]) => {
  switch (effect.kind) {
    case "health":
      return `${effect.polarity === "positive" ? "+" : "−"}strength HP / ${effect.interval / 1000}s`;
    case "gather_speed":
      return effect.polarity === "positive" ? "Faster gathering" : "Slower gathering";
    case "blocks":
      return `Blocks ${effect.actions.join(", ")}`;
    case "protects":
      return `Against ${effects.find((e) => e.id === effect.target)?.name ?? effect.target}`;
  }
};

export const EffectsList: FC<EffectsListProps> = ({ effects }) => {
  return (
    <div id="main-content">
      <div class="flex justify-between items-center mb-6">
        <h1 class="text-2xl font-bold text-white">✨ Effects</h1>
        <a
          href="/effects/new"
          data-testid="new-effect-btn"
          class="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded text-white font-medium transition"
        >
          + New Effect
        </a>
      </div>

      <div class="bg-gray-800 rounded-lg overflow-hidden">
        <table data-testid="effects-table" class="w-full">
          <thead class="bg-gray-700">
            <tr>
              <th class="px-4 py-3 text-left text-sm font-medium text-gray-300">Name</th>
              <th class="px-4 py-3 text-left text-sm font-medium text-gray-300">ID</th>
              <th class="px-4 py-3 text-left text-sm font-medium text-gray-300">Kind</th>
              <th class="px-4 py-3 text-left text-sm font-medium text-gray-300">Mode</th>
              <th class="px-4 py-3 text-left text-sm font-medium text-gray-300">Detail</th>
              <th class="px-4 py-3 text-right text-sm font-medium text-gray-300">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-700">
            {effects.length === 0 ? (
              <tr>
                <td colspan={6} class="px-4 py-8 text-center text-gray-400">
                  No effects found. Create your first effect!
                </td>
              </tr>
            ) : (
              effects.map((effect) => (
                <tr key={effect.id} class="hover:bg-gray-700/50 transition">
                  <td class="px-4 py-3 text-white font-medium">{effect.name}</td>
                  <td class="px-4 py-3 text-gray-400 font-mono text-sm">{effect.id}</td>
                  <td class="px-4 py-3 text-gray-300">{KIND_LABELS[effect.kind]}</td>
                  <td class="px-4 py-3 text-gray-300">{effect.mode}</td>
                  <td class="px-4 py-3 text-gray-300 text-sm">{detail(effect, effects)}</td>
                  <td class="px-4 py-3 text-right">
                    <a
                      href={`/effects/${effect.id}`}
                      class="text-blue-400 hover:text-blue-300 mr-3"
                    >
                      Edit
                    </a>
                    <form
                      method="post"
                      action={`/commands/effects/${effect.id}/delete`}
                      class="inline"
                    >
                      <button
                        type="submit"
                        data-testid="delete-btn"
                        class="text-red-400 hover:text-red-300"
                      >
                        Delete
                      </button>
                    </form>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

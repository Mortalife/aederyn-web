import type { FC } from "hono/jsx";
import type { Effect } from "../repository/index.js";

interface EffectListProps {
  name: string;
  label: string;
  hint?: string;
  effects: Effect[];
  value: Array<{ id: string; strength: number; duration?: number }>;
  withDuration?: boolean;
}

const inputClass =
  "px-2 py-1 bg-gray-600 border border-gray-500 rounded text-white text-sm focus:outline-none focus:border-cyan-500";

const EffectOptions: FC<{ effects: Effect[]; selected?: string }> = ({ effects, selected }) => (
  <>
    {effects.map((e) => (
      <option value={e.id} selected={e.id === selected}>
        {e.name} ({e.kind})
      </option>
    ))}
  </>
);

/** Rows of effect + strength (+ duration), posted as `name[i].id` etc. */
export const EffectList: FC<EffectListProps> = ({
  name,
  label,
  hint,
  effects,
  value,
  withDuration = false,
}) => {
  const listId = `${name}-list`;

  return (
    <div class="col-span-2 bg-gray-700/50 rounded-lg p-4 border border-gray-600">
      <h3 class="text-sm font-medium text-cyan-400 mb-1">{label}</h3>
      {hint && <p class="text-xs text-gray-400 mb-3">{hint}</p>}
      <template id={`${listId}-options`}>
        <EffectOptions effects={effects} />
      </template>
      <div id={listId} class="space-y-2 mb-3" data-name={name} data-duration={withDuration ? "1" : "0"}>
        {value.map((entry, index) => (
          <div class="flex items-center gap-2 bg-gray-600/50 p-2 rounded" data-effect-row>
            <select name={`${name}[${index}].id`} class={`flex-1 ${inputClass}`}>
              {!effects.some((e) => e.id === entry.id) && (
                <option value={entry.id} selected>
                  {entry.id} (missing)
                </option>
              )}
              <EffectOptions effects={effects} selected={entry.id} />
            </select>
            <input
              type="number"
              name={`${name}[${index}].strength`}
              value={entry.strength}
              min={0}
              step="any"
              title="Strength"
              class={`w-24 ${inputClass}`}
            />
            {withDuration && (
              <input
                type="number"
                name={`${name}[${index}].duration`}
                value={entry.duration ?? 0}
                min={0}
                title="Duration (seconds, 0 = instant)"
                class={`w-24 ${inputClass}`}
              />
            )}
            <button
              type="button"
              class="px-2 py-1 text-red-400 hover:text-red-300"
              onclick="this.closest('[data-effect-row]').remove()"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        class="w-full py-2 border-2 border-dashed border-gray-500 rounded text-gray-400 hover:border-cyan-500 hover:text-cyan-400 transition text-sm"
        onclick={`window.addEffectRow('${listId}')`}
      >
        + Add Effect
      </button>
    </div>
  );
};

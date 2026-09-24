import type { FC } from "hono/jsx";
import type { BlockableAction, EffectMode, EffectPolarity } from "@aederyn/types";
import { BlockableActionSchema } from "@aederyn/types";
import type { Effect } from "../repository/index.js";
import type { UsedByReference } from "../services/references.js";
import { UsedBySection } from "./components/used-by-section.js";

interface EffectFormProps {
  effect?: Effect;
  isNew?: boolean;
  effects?: Effect[];
  usedBy?: UsedByReference[];
}

const inputClass =
  "w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-blue-500";

const KINDS: Array<{ value: Effect["kind"]; label: string; help: string }> = [
  { value: "health", label: "Health over time", help: "Strength is HP gained or lost per interval." },
  { value: "gather_speed", label: "Gather speed", help: "Strength is a percentage: 50 makes gathering 1.5× slower (negative) or 1.5× faster (positive)." },
  { value: "blocks", label: "Blocks actions", help: "Any strength left after protection blocks the actions." },
  { value: "protects", label: "Protects", help: "Strength is protection against the target effect, on the defence scale (100 halves a mitigation effect)." },
];

const toggleScript =
  "document.querySelectorAll('[data-kind]').forEach(el => el.hidden = !el.dataset.kind.split(' ').includes(this.value))";

type FormBody = Record<string, string | File | (string | File)[]>;

/** Builds an effect from the form, keeping only the fields its kind uses. */
export function parseEffectForm(body: FormBody): Effect {
  const base = {
    id: body.id as string,
    name: body.name as string,
    description: (body.description as string) || "",
  };
  const mode = body.mode as EffectMode;
  const polarity = body.polarity as EffectPolarity;

  switch (body.kind) {
    case "gather_speed":
      return { ...base, kind: "gather_speed", polarity, mode };
    case "blocks": {
      const selected = ([] as unknown[]).concat(body.actions ?? []);
      const message = (body.message as string)?.trim();
      return {
        ...base,
        kind: "blocks",
        actions: BlockableActionSchema.options.filter((a) => selected.includes(a)),
        ...(message ? { message } : {}),
        mode,
      };
    }
    case "protects":
      return { ...base, kind: "protects", target: body.target as string, mode };
    default:
      return {
        ...base,
        kind: "health",
        polarity,
        interval: parseInt(body.interval as string) || 5000,
        mode,
      };
  }
}

export const EffectForm: FC<EffectFormProps> = ({ effect, isNew = true, effects = [], usedBy = [] }) => {
  const e: Partial<Effect> & { kind: Effect["kind"] } = effect ?? {
    id: "",
    name: "",
    description: "",
    kind: "health",
    mode: "mitigation",
    polarity: "negative",
    interval: 5000,
  };
  const polarity = "polarity" in e ? e.polarity : "negative";
  const interval = "interval" in e ? e.interval : 5000;
  const actions: BlockableAction[] = "actions" in e && e.actions ? e.actions : [];
  const message = "message" in e ? e.message : "";
  const target = "target" in e ? e.target : "";
  const shown = (kinds: string) => kinds.split(" ").includes(e.kind);

  return (
    <div id="main-content">
      <div class="flex justify-between items-center mb-6">
        <h1 class="text-2xl font-bold text-white">
          {isNew ? "✨ New Effect" : `✨ Edit: ${e.name}`}
        </h1>
        <div class="flex gap-2">
          {!isNew && (
            <a
              href={`/impact/effect/${e.id}`}
              class="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-white font-medium transition"
            >
              Impact
            </a>
          )}
          <a
            href="/effects"
            class="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-white font-medium transition"
          >
            ← Back to Effects
          </a>
        </div>
      </div>

      <form
        data-testid="effect-form"
        class="bg-gray-800 rounded-lg p-6 max-w-2xl"
        method="post"
        action={isNew ? "/commands/effects" : `/commands/effects/${e.id}`}
      >
        <div class="grid grid-cols-2 gap-6">
          <div class="col-span-2 md:col-span-1">
            <label class="block text-sm font-medium text-gray-300 mb-2">
              ID <span class="text-red-400">*</span>
            </label>
            <input
              type="text"
              name="id"
              value={e.id}
              required
              pattern="^effect_[a-z0-9_]+$"
              placeholder="effect_example"
              disabled={!isNew}
              class={`${inputClass} disabled:opacity-50`}
            />
          </div>

          <div class="col-span-2 md:col-span-1">
            <label class="block text-sm font-medium text-gray-300 mb-2">
              Name <span class="text-red-400">*</span>
            </label>
            <input type="text" name="name" value={e.name} required placeholder="Spores" class={inputClass} />
          </div>

          <div class="col-span-2">
            <label class="block text-sm font-medium text-gray-300 mb-2">Description</label>
            <textarea name="description" rows={2} class={inputClass}>
              {e.description}
            </textarea>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">Kind</label>
            <select name="kind" class={inputClass} onchange={toggleScript}>
              {KINDS.map((k) => (
                <option value={k.value} selected={e.kind === k.value}>
                  {k.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">Protection mode</label>
            <select name="mode" class={inputClass}>
              <option value="mitigation" selected={e.mode === "mitigation"}>
                Mitigation (reduced, never removed)
              </option>
              <option value="binary" selected={e.mode === "binary"}>
                Binary (any protection removes it)
              </option>
              <option value="none" selected={e.mode === "none"}>
                None (can't be countered)
              </option>
            </select>
          </div>

          {KINDS.map((k) => (
            <p class="col-span-2 text-xs text-gray-400" data-kind={k.value} hidden={!shown(k.value)}>
              {k.help}
            </p>
          ))}

          <div data-kind="health gather_speed" hidden={!shown("health gather_speed")}>
            <label class="block text-sm font-medium text-gray-300 mb-2">Polarity</label>
            <select name="polarity" class={inputClass}>
              <option value="negative" selected={polarity === "negative"}>
                Negative
              </option>
              <option value="positive" selected={polarity === "positive"}>
                Positive
              </option>
            </select>
          </div>

          <div data-kind="health" hidden={!shown("health")}>
            <label class="block text-sm font-medium text-gray-300 mb-2">Interval (ms)</label>
            <input type="number" name="interval" value={interval} min={200} step={100} class={inputClass} />
          </div>

          <div class="col-span-2" data-kind="blocks" hidden={!shown("blocks")}>
            <label class="block text-sm font-medium text-gray-300 mb-2">Blocked actions</label>
            <div class="flex gap-4">
              {BlockableActionSchema.options.map((action) => (
                <label class="flex items-center gap-2 text-sm text-gray-300">
                  <input type="checkbox" name="actions" value={action} checked={actions.includes(action)} />
                  {action}
                </label>
              ))}
            </div>
            <label class="block text-sm font-medium text-gray-300 mt-4 mb-2">Message when blocked</label>
            <input type="text" name="message" value={message} placeholder="It's too dark to see." class={inputClass} />
          </div>

          <div class="col-span-2" data-kind="protects" hidden={!shown("protects")}>
            <label class="block text-sm font-medium text-gray-300 mb-2">Protects against</label>
            <select name="target" class={inputClass}>
              {effects
                .filter((other) => other.kind !== "protects")
                .map((other) => (
                  <option value={other.id} selected={other.id === target}>
                    {other.name} ({other.id})
                  </option>
                ))}
            </select>
          </div>
        </div>

        <div class="mt-6 flex gap-4">
          <button
            type="submit"
            class="px-6 py-2 bg-blue-600 hover:bg-blue-500 rounded text-white font-medium transition"
          >
            {isNew ? "Create Effect" : "Save Changes"}
          </button>
          <a
            href="/effects"
            class="px-6 py-2 bg-gray-700 hover:bg-gray-600 rounded text-white font-medium transition"
          >
            Cancel
          </a>
        </div>
      </form>

      {!isNew && <UsedBySection references={usedBy} entityName={e.name || "this effect"} />}
    </div>
  );
};

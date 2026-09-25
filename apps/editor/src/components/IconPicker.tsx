import type { FC } from "hono/jsx";
import { ICON_CREDIT, ICON_IDS, ICON_SPRITE } from "../../../web/src/assets/icons.js";

interface IconPickerProps {
  name: string;
  value?: string;
}

const Icon: FC<{ id?: string; class: string }> = ({ id, class: className }) => (
  <svg class={className} aria-hidden="true">
    <use href={id ? `#icon-${id}` : ""} />
  </svg>
);

/** A searchable grid of the web app's sprite icons, posted as `name`. */
export const IconPicker: FC<IconPickerProps> = ({ name, value = "" }) => {
  const missing = value !== "" && !(ICON_IDS as readonly string[]).includes(value);

  return (
    <div data-icon-picker data-testid="icon-picker" class="col-span-2 bg-gray-700/50 rounded-lg p-4 border border-gray-600">
      <div dangerouslySetInnerHTML={{ __html: ICON_SPRITE }} />
      <input type="hidden" name={name} value={value} />

      <div class="flex items-center gap-4 mb-3">
        <div data-icon-preview class="size-16 shrink-0 flex items-center justify-center rounded bg-gray-800 border border-gray-600 text-amber-300">
          <Icon id={value} class="size-12" />
        </div>
        <div class="flex-1 min-w-0">
          <h3 class="text-sm font-medium text-amber-400">Icon</h3>
          <p data-icon-label class={`text-sm truncate ${missing ? "text-red-400" : "text-gray-300"}`}>
            {value ? (missing ? `${value} (missing from sprite)` : value) : "None (shows a monogram)"}
          </p>
        </div>
        <button
          type="button"
          class="px-3 py-1 text-sm bg-gray-600 hover:bg-gray-500 rounded text-white transition"
          onclick="window.pickIcon(this, '')"
        >
          Clear
        </button>
      </div>

      <input
        type="search"
        placeholder={`Search ${ICON_IDS.length} icons...`}
        data-testid="icon-search"
        class="w-full mb-2 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-amber-500"
        oninput="window.filterIcons(this)"
        onkeydown="if (event.key === 'Enter') event.preventDefault()"
      />

      <div class="grid grid-cols-[repeat(auto-fill,minmax(3rem,1fr))] gap-1 max-h-64 overflow-y-auto pr-1">
        {ICON_IDS.map((id) => (
          <button
            type="button"
            title={id}
            data-icon={id}
            aria-pressed={id === value ? "true" : "false"}
            class="aspect-square flex items-center justify-center rounded text-gray-300 hover:bg-gray-600 hover:text-white aria-pressed:bg-amber-600/40 aria-pressed:text-amber-200 aria-pressed:ring-1 aria-pressed:ring-amber-500"
            onclick={`window.pickIcon(this, '${id}')`}
          >
            <Icon id={id} class="size-8" />
          </button>
        ))}
      </div>
      <p class="text-xs text-gray-500 mt-2">
        {ICON_CREDIT}. Add icons in apps/web/scripts/build-icons.ts.
      </p>
    </div>
  );
};

import type { FC } from "hono/jsx";
import type { Resource } from "../repository/index.js";

interface ResourceSelectorProps {
  name: string;
  label: string;
  resources: Resource[];
  value: string[];
  placeholder?: string;
}

export const ResourceSelector: FC<ResourceSelectorProps> = ({
  name,
  label,
  resources,
  value,
  placeholder = "Select resources...",
}) => {
  const listId = `${name}-list`;

  return (
    <div class="col-span-2">
      <label class="block text-sm font-medium text-gray-300 mb-2">
        {label}
      </label>
      
      <div id={listId} class="space-y-2 mb-3">
        {value.map((resourceId, index) => {
          const resource = resources.find((r) => r.id === resourceId);
          return (
            <div class="flex items-center gap-2 bg-gray-700/50 p-2 rounded" data-index={index}>
              <select
                name={`${name}[${index}]`}
                class="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="">{placeholder}</option>
                {resources.map((r) => (
                  <option value={r.id} selected={r.id === resourceId}>
                    {r.name} ({r.id})
                  </option>
                ))}
              </select>
              <button
                type="button"
                class="px-3 py-2 bg-red-600/20 hover:bg-red-600/40 text-red-400 rounded transition"
                onclick={`this.closest('[data-index]').remove()`}
              >
                ✕
              </button>
            </div>
          );
        })}
      </div>

      <button
        type="button"
        class="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-white text-sm transition"
        onclick={`
          const list = document.getElementById('${listId}');
          const index = list.children.length;
          const template = document.getElementById('${name}-template');
          const clone = template.content.cloneNode(true);
          clone.querySelectorAll('[name]').forEach(el => {
            el.name = el.name.replace('INDEX', index);
          });
          list.appendChild(clone);
        `}
      >
        + Add Resource
      </button>

      <template id={`${name}-template`}>
        <div class="flex items-center gap-2 bg-gray-700/50 p-2 rounded" data-index="new">
          <select
            name={`${name}[INDEX]`}
            class="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-emerald-500"
          >
            <option value="">{placeholder}</option>
            {resources.map((r) => (
              <option value={r.id}>
                {r.name} ({r.id})
              </option>
            ))}
          </select>
          <button
            type="button"
            class="px-3 py-2 bg-red-600/20 hover:bg-red-600/40 text-red-400 rounded transition"
            onclick={`this.closest('[data-index]').remove()`}
          >
            ✕
          </button>
        </div>
      </template>

      <input type="hidden" name={`${name}_json`} id={`${name}-json`} />
    </div>
  );
};

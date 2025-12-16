import type { FC } from "hono/jsx";
import type { Item } from "../repository/index.js";

export interface ItemQuantityEntry {
  item_id: string;
  qty: number;
}

interface ItemQuantityListProps {
  name: string;
  label: string;
  items: Item[];
  value: ItemQuantityEntry[];
  placeholder?: string;
}

export const ItemQuantityList: FC<ItemQuantityListProps> = ({
  name,
  label,
  items,
  value,
  placeholder = "Select an item...",
}) => {
  const listId = `${name}-list`;

  return (
    <div class="col-span-2">
      <label class="block text-sm font-medium text-gray-300 mb-2">
        {label}
      </label>
      
      <div id={listId} class="space-y-2 mb-3">
        {value.map((entry, index) => {
          const item = items.find((i) => i.id === entry.item_id);
          return (
            <div class="flex items-center gap-2 bg-gray-700/50 p-2 rounded" data-index={index}>
              <select
                name={`${name}[${index}].item_id`}
                class="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="">{placeholder}</option>
                {items.map((i) => (
                  <option value={i.id} selected={i.id === entry.item_id}>
                    {i.name} ({i.id})
                  </option>
                ))}
              </select>
              <input
                type="number"
                name={`${name}[${index}].qty`}
                value={entry.qty}
                min={1}
                class="w-20 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-emerald-500"
                placeholder="Qty"
              />
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
        + Add Item
      </button>

      <template id={`${name}-template`}>
        <div class="flex items-center gap-2 bg-gray-700/50 p-2 rounded" data-index="new">
          <select
            name={`${name}[INDEX].item_id`}
            class="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-emerald-500"
          >
            <option value="">{placeholder}</option>
            {items.map((i) => (
              <option value={i.id}>
                {i.name} ({i.id})
              </option>
            ))}
          </select>
          <input
            type="number"
            name={`${name}[INDEX].qty`}
            value={1}
            min={1}
            class="w-20 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-emerald-500"
            placeholder="Qty"
          />
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

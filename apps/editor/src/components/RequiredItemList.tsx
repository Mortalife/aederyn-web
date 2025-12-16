import type { FC } from "hono/jsx";
import type { Item } from "../repository/index.js";

export interface RequiredItemEntry {
  item_id: string;
  qty: number;
  consumed: boolean;
  itemDurabilityReduction?: number;
}

interface RequiredItemListProps {
  name: string;
  label: string;
  items: Item[];
  value: RequiredItemEntry[];
  placeholder?: string;
}

export const RequiredItemList: FC<RequiredItemListProps> = ({
  name,
  label,
  items,
  value,
  placeholder = "Select an item...",
}) => {
  const listId = `${name}-list`;
  
  // Create a map of item IDs to whether they have durability
  const itemHasDurability: Record<string, boolean> = {};
  items.forEach(item => {
    itemHasDurability[item.id] = !!item.durability;
  });
  const durabilityMapJson = JSON.stringify(itemHasDurability);

  return (
    <div class="col-span-2">
      <label class="block text-sm font-medium text-gray-300 mb-2">
        {label}
      </label>
      
      <div id={listId} class="space-y-2 mb-3">
        {value.map((entry, index) => {
          const selectedItem = items.find(i => i.id === entry.item_id);
          const showDurability = selectedItem?.durability !== undefined;
          
          return (
            <div class="flex items-center gap-2 bg-gray-700/50 p-2 rounded flex-wrap" data-index={index}>
              <select
                name={`${name}[${index}].item_id`}
                class="flex-1 min-w-[200px] px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-emerald-500"
                data-durability-map={durabilityMapJson}
                onchange="window.updateDurabilityVisibility(this)"
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
              <label class="flex items-center gap-1 text-sm text-gray-300">
                <input
                  type="checkbox"
                  name={`${name}[${index}].consumed`}
                  checked={entry.consumed}
                  class="w-4 h-4 rounded bg-gray-700 border-gray-600 text-emerald-500"
                />
                Consumed
              </label>
              <div 
                class={`flex items-center gap-1 ${showDurability ? '' : 'hidden'}`}
                data-durability-container
              >
                <input
                  type="number"
                  name={`${name}[${index}].itemDurabilityReduction`}
                  value={entry.itemDurabilityReduction || 0}
                  min={0}
                  class="w-24 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-emerald-500"
                  placeholder="Durability"
                  title="Durability reduction per use"
                />
                <span class="text-xs text-gray-400">durability</span>
              </div>
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
        + Add Required Item
      </button>

      <template id={`${name}-template`}>
        <div class="flex items-center gap-2 bg-gray-700/50 p-2 rounded flex-wrap" data-index="new">
          <select
            name={`${name}[INDEX].item_id`}
            class="flex-1 min-w-[200px] px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-emerald-500"
            data-durability-map={durabilityMapJson}
            onchange="window.updateDurabilityVisibility(this)"
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
          <label class="flex items-center gap-1 text-sm text-gray-300">
            <input
              type="checkbox"
              name={`${name}[INDEX].consumed`}
              class="w-4 h-4 rounded bg-gray-700 border-gray-600 text-emerald-500"
            />
            Consumed
          </label>
          <div 
            class="flex items-center gap-1 hidden"
            data-durability-container
          >
            <input
              type="number"
              name={`${name}[INDEX].itemDurabilityReduction`}
              value={0}
              min={0}
              class="w-24 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-emerald-500"
              placeholder="Durability"
              title="Durability reduction per use"
            />
            <span class="text-xs text-gray-400">durability</span>
          </div>
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

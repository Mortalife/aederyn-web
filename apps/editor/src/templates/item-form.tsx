import type { FC } from "hono/jsx";
import type { Item } from "../repository/index.js";
import type { ItemAttributes, ItemRequirements, ItemEffect } from "@aederyn/types";
import type { UsedByReference } from "../services/references.js";
import { UsedBySection } from "./components/used-by-section.js";

const EFFECT_TYPES = [
  { value: "heal", label: "Heal HP" },
  { value: "restore_mana", label: "Restore Mana" },
  { value: "buff_strength", label: "Buff Strength" },
  { value: "buff_dexterity", label: "Buff Dexterity" },
  { value: "buff_intelligence", label: "Buff Intelligence" },
  { value: "damage_over_time", label: "Damage Over Time" },
  { value: "poison", label: "Poison" },
  { value: "speed_boost", label: "Speed Boost" },
];

interface ItemFormProps {
  item?: Item;
  isNew?: boolean;
  usedBy?: UsedByReference[];
}

export const ItemForm: FC<ItemFormProps> = ({ item, isNew = true, usedBy = [] }) => {
  const defaultItem: Partial<Item> = {
    id: "",
    name: "",
    description: "",
    type: "resource",
    rarity: "common",
    stackable: true,
    maxStackSize: 99,
    equippable: false,
    value: 1,
    weight: 0.1,
  };

  const i = item || defaultItem;

  return (
    <div id="main-content">
      <div class="flex justify-between items-center mb-6">
        <h1 class="text-2xl font-bold text-white">
          {isNew ? "📦 New Item" : `📦 Edit: ${i.name}`}
        </h1>
        <a
          href="/items"
          class="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-white font-medium transition"
        >
          ← Back to Items
        </a>
      </div>

      <form
        data-testid="item-form"
        class="bg-gray-800 rounded-lg p-6 max-w-2xl"
        method="post"
        action={isNew ? "/commands/items" : `/commands/items/${i.id}`}
      >
        <div class="grid grid-cols-2 gap-6">
          <div class="col-span-2 md:col-span-1">
            <label class="block text-sm font-medium text-gray-300 mb-2">
              ID <span class="text-red-400">*</span>
            </label>
            <input
              type="text"
              name="id"
              value={i.id}
              required
              pattern="^item_[a-z0-9_]+$"
              placeholder="item_example_01"
              disabled={!isNew}
              class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-amber-500 disabled:opacity-50"
            />
            <p class="text-xs text-gray-500 mt-1">Format: item_[name]_[number]</p>
          </div>

          <div class="col-span-2 md:col-span-1">
            <label class="block text-sm font-medium text-gray-300 mb-2">
              Name <span class="text-red-400">*</span>
            </label>
            <input
              type="text"
              name="name"
              value={i.name}
              required
              placeholder="Example Item"
              class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div class="col-span-2">
            <label class="block text-sm font-medium text-gray-300 mb-2">
              Description <span class="text-red-400">*</span>
            </label>
            <textarea
              name="description"
              required
              rows={3}
              placeholder="A brief description of the item..."
              class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-amber-500"
            >
              {i.description}
            </textarea>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">
              Type <span class="text-red-400">*</span>
            </label>
            <select
              name="type"
              required
              class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-amber-500"
            >
              <option value="resource" selected={i.type === "resource"}>Resource</option>
              <option value="tool" selected={i.type === "tool"}>Tool</option>
              <option value="weapon" selected={i.type === "weapon"}>Weapon</option>
              <option value="armor" selected={i.type === "armor"}>Armor</option>
              <option value="consumable" selected={i.type === "consumable"}>Consumable</option>
              <option value="quest" selected={i.type === "quest"}>Quest</option>
              <option value="item" selected={i.type === "item"}>Item</option>
            </select>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">
              Rarity <span class="text-red-400">*</span>
            </label>
            <select
              name="rarity"
              required
              class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-amber-500"
            >
              <option value="common" selected={i.rarity === "common"}>Common</option>
              <option value="uncommon" selected={i.rarity === "uncommon"}>Uncommon</option>
              <option value="rare" selected={i.rarity === "rare"}>Rare</option>
              <option value="epic" selected={i.rarity === "epic"}>Epic</option>
              <option value="legendary" selected={i.rarity === "legendary"}>Legendary</option>
            </select>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">
              Value (gold)
            </label>
            <input
              type="number"
              name="value"
              value={i.value}
              min={0}
              class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">
              Weight
            </label>
            <input
              type="number"
              name="weight"
              value={i.weight}
              min={0}
              step={0.1}
              class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-amber-500"
            />
          </div>

          <div class="flex items-center gap-4">
            <label class="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                name="stackable"
                checked={i.stackable}
                class="w-4 h-4 rounded bg-gray-700 border-gray-600 text-amber-500 focus:ring-amber-500"
              />
              <span class="text-sm text-gray-300">Stackable</span>
            </label>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">
              Max Stack Size
            </label>
            <input
              type="number"
              name="maxStackSize"
              value={i.maxStackSize}
              min={1}
              class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-amber-500"
            />
          </div>

          <div class="flex items-center gap-4">
            <label class="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                name="equippable"
                checked={i.equippable}
                class="w-4 h-4 rounded bg-gray-700 border-gray-600 text-amber-500 focus:ring-amber-500"
              />
              <span class="text-sm text-gray-300">Equippable</span>
            </label>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">
              Equip Slot
            </label>
            <select
              name="equipSlot"
              class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-amber-500"
            >
              <option value="">None</option>
              <option value="mainHand" selected={i.equipSlot === "mainHand"}>Main Hand</option>
              <option value="offHand" selected={i.equipSlot === "offHand"}>Off Hand</option>
              <option value="head" selected={i.equipSlot === "head"}>Head</option>
              <option value="chest" selected={i.equipSlot === "chest"}>Chest</option>
              <option value="legs" selected={i.equipSlot === "legs"}>Legs</option>
              <option value="feet" selected={i.equipSlot === "feet"}>Feet</option>
              <option value="hands" selected={i.equipSlot === "hands"}>Hands</option>
              <option value="accessory" selected={i.equipSlot === "accessory"}>Accessory</option>
            </select>
          </div>

          {/* Durability Section */}
          {(i.type === "tool" || i.type === "weapon" || i.type === "armor") && (
            <div class="col-span-2 bg-gray-700/50 rounded-lg p-4 border border-gray-600">
              <div class="flex items-center gap-2 mb-3">
                <input
                  type="checkbox"
                  name="hasDurability"
                  id="hasDurability"
                  checked={!!i.durability}
                  class="w-4 h-4 rounded bg-gray-700 border-gray-600 text-amber-500 focus:ring-amber-500"
                  onchange="document.getElementById('durability-fields').classList.toggle('hidden', !this.checked)"
                />
                <label for="hasDurability" class="text-sm font-medium text-gray-300 cursor-pointer">
                  Has Durability
                </label>
              </div>
              <div id="durability-fields" class={`grid grid-cols-2 gap-4 ${!i.durability ? 'hidden' : ''}`}>
                <div>
                  <label class="block text-xs text-gray-400 mb-1">Current</label>
                  <input
                    type="number"
                    name="durability_current"
                    value={i.durability?.current || 100}
                    min={0}
                    class="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label class="block text-xs text-gray-400 mb-1">Max</label>
                  <input
                    type="number"
                    name="durability_max"
                    value={i.durability?.max || 100}
                    min={1}
                    class="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Attributes Section */}
          <div class="col-span-2 bg-gray-700/50 rounded-lg p-4 border border-gray-600">
            <h3 class="text-sm font-medium text-amber-400 mb-3">Attributes</h3>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label class="block text-xs text-gray-400 mb-1">Damage</label>
                <input
                  type="number"
                  name="attributes_damage"
                  value={i.attributes?.damage || 0}
                  min={0}
                  class="w-full px-2 py-1 bg-gray-600 border border-gray-500 rounded text-white text-sm focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label class="block text-xs text-gray-400 mb-1">Armor</label>
                <input
                  type="number"
                  name="attributes_armor"
                  value={i.attributes?.armor || 0}
                  min={0}
                  class="w-full px-2 py-1 bg-gray-600 border border-gray-500 rounded text-white text-sm focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label class="block text-xs text-gray-400 mb-1">Health</label>
                <input
                  type="number"
                  name="attributes_health"
                  value={i.attributes?.health || 0}
                  min={0}
                  class="w-full px-2 py-1 bg-gray-600 border border-gray-500 rounded text-white text-sm focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label class="block text-xs text-gray-400 mb-1">Mana</label>
                <input
                  type="number"
                  name="attributes_mana"
                  value={i.attributes?.mana || 0}
                  min={0}
                  class="w-full px-2 py-1 bg-gray-600 border border-gray-500 rounded text-white text-sm focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label class="block text-xs text-gray-400 mb-1">Strength</label>
                <input
                  type="number"
                  name="attributes_strength"
                  value={i.attributes?.strength || 0}
                  min={0}
                  class="w-full px-2 py-1 bg-gray-600 border border-gray-500 rounded text-white text-sm focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label class="block text-xs text-gray-400 mb-1">Dexterity</label>
                <input
                  type="number"
                  name="attributes_dexterity"
                  value={i.attributes?.dexterity || 0}
                  min={0}
                  class="w-full px-2 py-1 bg-gray-600 border border-gray-500 rounded text-white text-sm focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label class="block text-xs text-gray-400 mb-1">Intelligence</label>
                <input
                  type="number"
                  name="attributes_intelligence"
                  value={i.attributes?.intelligence || 0}
                  min={0}
                  class="w-full px-2 py-1 bg-gray-600 border border-gray-500 rounded text-white text-sm focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
          </div>

          {/* Requirements Section */}
          {i.equippable && (
            <div class="col-span-2 bg-gray-700/50 rounded-lg p-4 border border-gray-600">
              <h3 class="text-sm font-medium text-red-400 mb-3">Equip Requirements</h3>
              <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label class="block text-xs text-gray-400 mb-1">Level</label>
                  <input
                    type="number"
                    name="requirements_level"
                    value={i.requirements?.level || 0}
                    min={0}
                    class="w-full px-2 py-1 bg-gray-600 border border-gray-500 rounded text-white text-sm focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label class="block text-xs text-gray-400 mb-1">Strength</label>
                  <input
                    type="number"
                    name="requirements_strength"
                    value={i.requirements?.strength || 0}
                    min={0}
                    class="w-full px-2 py-1 bg-gray-600 border border-gray-500 rounded text-white text-sm focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label class="block text-xs text-gray-400 mb-1">Dexterity</label>
                  <input
                    type="number"
                    name="requirements_dexterity"
                    value={i.requirements?.dexterity || 0}
                    min={0}
                    class="w-full px-2 py-1 bg-gray-600 border border-gray-500 rounded text-white text-sm focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label class="block text-xs text-gray-400 mb-1">Intelligence</label>
                  <input
                    type="number"
                    name="requirements_intelligence"
                    value={i.requirements?.intelligence || 0}
                    min={0}
                    class="w-full px-2 py-1 bg-gray-600 border border-gray-500 rounded text-white text-sm focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Effects Section */}
          <div class="col-span-2 bg-gray-700/50 rounded-lg p-4 border border-gray-600">
            <h3 class="text-sm font-medium text-cyan-400 mb-3">Effects</h3>
            <div id="effects-list" class="space-y-2 mb-3">
              {(i.effects || []).map((effect, index) => (
                <div class="flex items-center gap-2 bg-gray-600/50 p-2 rounded" data-effect-index={index}>
                  <select
                    name={`effects[${index}].type`}
                    class="flex-1 px-2 py-1 bg-gray-600 border border-gray-500 rounded text-white text-sm focus:outline-none focus:border-cyan-500"
                  >
                    {EFFECT_TYPES.map((t) => (
                      <option value={t.value} selected={effect.type === t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    name={`effects[${index}].value`}
                    value={effect.value}
                    placeholder="Value"
                    class="w-20 px-2 py-1 bg-gray-600 border border-gray-500 rounded text-white text-sm focus:outline-none focus:border-cyan-500"
                  />
                  <input
                    type="number"
                    name={`effects[${index}].duration`}
                    value={effect.duration}
                    placeholder="Duration"
                    class="w-24 px-2 py-1 bg-gray-600 border border-gray-500 rounded text-white text-sm focus:outline-none focus:border-cyan-500"
                  />
                  <button
                    type="button"
                    class="px-2 py-1 text-red-400 hover:text-red-300"
                    onclick="this.closest('[data-effect-index]').remove()"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              class="w-full py-2 border-2 border-dashed border-gray-500 rounded text-gray-400 hover:border-cyan-500 hover:text-cyan-400 transition text-sm"
              onclick="window.addItemEffect()"
            >
              + Add Effect
            </button>
          </div>
        </div>

        <div class="mt-6 flex gap-4">
          <button
            type="submit"
            class="px-6 py-2 bg-amber-600 hover:bg-amber-500 rounded text-white font-medium transition"
          >
            {isNew ? "Create Item" : "Save Changes"}
          </button>
          <a
            href="/items"
            class="px-6 py-2 bg-gray-700 hover:bg-gray-600 rounded text-white font-medium transition"
          >
            Cancel
          </a>
        </div>
      </form>

      {/* Used By Section - only show for existing items */}
      {!isNew && <UsedBySection references={usedBy} entityName={i.name || "this item"} />}
    </div>
  );
};

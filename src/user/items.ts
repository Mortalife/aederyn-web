import { itemsMap } from "../config/items.js";

export const getItemName = (id: string) => {
  const item = itemsMap.get(id);
  return item ? item.name : "Unknown Item";
};

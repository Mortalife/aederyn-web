import { itemsById } from "../config/items.js";

export const getItemName = (id: string) => {
  const item = itemsById.get(id);
  return item ? item.name : "Unknown Item";
};

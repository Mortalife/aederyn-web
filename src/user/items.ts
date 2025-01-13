import { items } from "../config";

export const getItemName = (id: string) => {
  const item = items.find((i) => i.id === id);
  return item ? item.name : "Unknown Item";
};

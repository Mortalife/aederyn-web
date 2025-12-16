import { items } from "./items.js";
import { resources, resourcesMap } from "./resources.js";
import { tileTypes } from "./tiles.js";
import type { ResourceModel } from "./types.js";

const itemsWithoutSources = items.filter(
  (i) =>
    !resources.some((r) => r.reward_items.some((ri) => ri.item_id === i.id))
);

console.log(
  "Items without sources:",
  itemsWithoutSources.map((i) => i.id),
  `${itemsWithoutSources.length}/${items.length}`
);

const itemsWithoutUses = items.filter((i) => {
  const hasEffects = i.effects && i.effects.length > 0;
  const usedInRecipes = resources.some((r) =>
    r.required_items.some((ri) => ri.item_id === i.id)
  );

  return !hasEffects && !usedInRecipes;
});

console.log(
  "Items without uses:",
  itemsWithoutUses.map((i) => i.id),
  `${itemsWithoutUses.length}/${items.length}`
);

function checkCircularDependencies(resources: ResourceModel[]): boolean {
  const visited = new Set<string>();

  function dfs(resourceId: string, path: Set<string>): boolean {
    visited.add(resourceId);
    path.add(resourceId);

    const resource = resourcesMap.get(resourceId);
    if (!resource) return false;

    for (const requiredItem of resource.required_items) {
      const itemId = requiredItem.item_id;

      // Check if this item is a reward of any resource
      const resourceThatRewardsThisItem = resources.find((r) =>
        r.reward_items.some((ri) => ri.item_id === itemId)
      );

      if (resourceThatRewardsThisItem) {
        if (path.has(resourceThatRewardsThisItem.id)) {
          console.log(
            `Circular dependency found: ${Array.from(path).join(" -> ")} -> ${
              resourceThatRewardsThisItem.id
            }`
          );
          return true; // Circular dependency found
        }

        if (!visited.has(resourceThatRewardsThisItem.id)) {
          if (dfs(resourceThatRewardsThisItem.id, new Set(path))) {
            return true;
          }
        }
      }
    }

    path.delete(resourceId);
    return false;
  }

  for (const resource of resources) {
    if (!visited.has(resource.id)) {
      if (dfs(resource.id, new Set<string>())) {
        return true; // Circular dependency found
      }
    }
  }

  return false; // No circular dependencies
}

// Example usage:
const hasCircular = checkCircularDependencies(resources);
console.log(`Circular dependency found: ${hasCircular}`);

const resourcesWithoutTiles = resources.filter(
  (r) => !tileTypes.some((t) => t.resources.includes(r.id))
);
console.log(
  "Resources without tiles:",
  resourcesWithoutTiles.map((r) => r.id),
  `${resourcesWithoutTiles.length}/${resources.length}`
);

const tilesWithoutUses = tileTypes.filter(
  (t) => t.resources.length === 0 && t.accessible
);
console.log(
  "Tiles without uses (empty & accessible):",
  tilesWithoutUses.map((t) => t.id),
  `${tilesWithoutUses.length}/${tileTypes.length}`
);

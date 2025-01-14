import { items } from "./items";
import { resources } from "./resources";
import { tileTypes } from "./tiles";
import type { ResourceModel } from "./types";

const itemsWithoutSources = items.filter(
  (i) =>
    !resources.some((r) => r.reward_items.some((ri) => ri.item_id === i.id))
);

console.log(
  "Items without sources:",
  itemsWithoutSources.map((i) => i.id),
  `${itemsWithoutSources.length}/${items.length}`
);

function checkCircularDependencies(resources: ResourceModel[]): boolean {
  const visited = new Set<string>();

  function dfs(resourceId: string, path: Set<string>): boolean {
    visited.add(resourceId);
    path.add(resourceId);

    const resource = resources.find((r) => r.id === resourceId);
    if (!resource) return false;

    for (const requiredItem of resource.required_items) {
      const itemId = requiredItem.item_id;
      if (path.has(itemId)) {
        console.log(
          `Circular dependency found: ${Array.from(path).join(
            " -> "
          )} -> ${itemId}`
        );
        return true; // Circular dependency found
      }

      // Check if this item is a reward of any resource
      const resourceThatRewardsThisItem = resources.find((r) =>
        r.reward_items.some((ri) => ri.item_id === itemId)
      );

      if (
        resourceThatRewardsThisItem &&
        !visited.has(resourceThatRewardsThisItem.id)
      ) {
        if (dfs(resourceThatRewardsThisItem.id, new Set(path))) {
          return true;
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

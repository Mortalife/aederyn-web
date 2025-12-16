import type { FC } from "hono/jsx";
import type { UsedByReference } from "../../services/references.js";
import { getEntityEditUrl, getEntityTypeColor } from "../../services/references.js";

interface UsedBySectionProps {
  references: UsedByReference[];
  entityName: string;
}

export const UsedBySection: FC<UsedBySectionProps> = ({ references, entityName }) => {
  if (references.length === 0) {
    return (
      <div data-testid="used-by-section" class="mt-6 p-4 bg-gray-700/50 rounded-lg">
        <h3 class="text-sm font-semibold text-gray-400 mb-2">Used By</h3>
        <p class="text-sm text-gray-500">No other entities reference {entityName}</p>
      </div>
    );
  }

  // Group references by entity type
  const groupedRefs = references.reduce((acc, ref) => {
    const type = ref.entityType;
    if (!acc[type]) acc[type] = [];
    acc[type].push(ref);
    return acc;
  }, {} as Record<string, UsedByReference[]>);

  const typeLabels: Record<string, string> = {
    item: "Items",
    resource: "Resources",
    tile: "Tiles",
    npc: "NPCs",
    quest: "Quests",
    "house-tile": "House Tiles",
  };

  return (
    <div data-testid="used-by-section" class="mt-6 p-4 bg-gray-700/50 rounded-lg">
      <h3 class="text-sm font-semibold text-gray-400 mb-3">
        Used By ({references.length} reference{references.length !== 1 ? "s" : ""})
      </h3>
      <div class="space-y-4">
        {Object.entries(groupedRefs).map(([type, refs]) => (
          <div key={type}>
            <h4 class={`text-xs font-semibold mb-2 ${getEntityTypeColor(type as UsedByReference["entityType"])}`}>
              {typeLabels[type] || type} ({refs.length})
            </h4>
            <div class="space-y-1">
              {refs.map((ref) => (
                <a
                  key={`${ref.entityId}-${ref.context}`}
                  href={getEntityEditUrl(ref)}
                  data-testid="used-by-item"
                  class="flex items-center justify-between p-2 bg-gray-700 rounded hover:bg-gray-600 transition text-sm"
                >
                  <div class="flex items-center gap-2">
                    <span class={getEntityTypeColor(ref.entityType)}>{ref.entityName}</span>
                    <span class="text-xs text-gray-500 font-mono">{ref.entityId}</span>
                  </div>
                  <span class="text-xs text-gray-400">{ref.context}</span>
                </a>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

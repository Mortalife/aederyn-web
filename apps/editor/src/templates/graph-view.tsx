import type { FC } from "hono/jsx";
import type { GraphData, GraphNode, GraphEdge } from "../services/graph-builder.js";
import { getNodeColor, getEdgeColor } from "../services/graph-builder.js";

interface GraphViewProps {
  graphData: GraphData;
  filters?: {
    items: boolean;
    resources: boolean;
    tiles: boolean;
    npcs: boolean;
    quests: boolean;
    houseTiles: boolean;
  };
}

export const GraphView: FC<GraphViewProps> = ({ graphData, filters }) => {
  const defaultFilters = {
    items: true,
    resources: true,
    tiles: true,
    npcs: true,
    quests: true,
    houseTiles: true,
  };
  const activeFilters = filters || defaultFilters;

  // Filter nodes based on active filters
  const filteredNodes = graphData.nodes.filter((node) => {
    if (node.type === "item") return activeFilters.items;
    if (node.type === "resource") return activeFilters.resources;
    if (node.type === "tile") return activeFilters.tiles;
    if (node.type === "npc") return activeFilters.npcs;
    if (node.type === "quest") return activeFilters.quests;
    if (node.type === "house-tile") return activeFilters.houseTiles;
    return true;
  });

  const filteredNodeIds = new Set(filteredNodes.map((n) => n.id));

  // Filter edges to only include those between visible nodes
  const filteredEdges = graphData.edges.filter(
    (edge) => filteredNodeIds.has(edge.source) && filteredNodeIds.has(edge.target)
  );

  // Group nodes by type for statistics
  const nodesByType = {
    items: filteredNodes.filter((n) => n.type === "item").length,
    resources: filteredNodes.filter((n) => n.type === "resource").length,
    tiles: filteredNodes.filter((n) => n.type === "tile").length,
    npcs: filteredNodes.filter((n) => n.type === "npc").length,
    quests: filteredNodes.filter((n) => n.type === "quest").length,
    houseTiles: filteredNodes.filter((n) => n.type === "house-tile").length,
  };

  return (
    <div id="main-content">
      <div class="flex justify-between items-center mb-6">
        <h1 class="text-2xl font-bold text-white">🔗 Relationship Graph</h1>
        <div class="flex gap-2">
          <button
            data-testid="zoom-in"
            class="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-white text-sm"
            onclick="window.graphZoomIn && window.graphZoomIn()"
          >
            + Zoom In
          </button>
          <button
            data-testid="zoom-out"
            class="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-white text-sm"
            onclick="window.graphZoomOut && window.graphZoomOut()"
          >
            - Zoom Out
          </button>
          <button
            data-testid="fit-screen"
            class="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-white text-sm"
            onclick="window.graphFit && window.graphFit()"
          >
            Fit
          </button>
        </div>
      </div>

      <div class="grid grid-cols-4 gap-6">
        {/* Filters Panel */}
        <div class="col-span-1">
          <div class="bg-gray-800 rounded-lg p-4" data-testid="graph-filters">
            <h2 class="text-lg font-semibold text-white mb-4">Filters</h2>
            <div class="space-y-3">
              <FilterCheckbox
                id="filter-items"
                label="Items"
                count={nodesByType.items}
                color="amber"
                checked={activeFilters.items}
              />
              <FilterCheckbox
                id="filter-resources"
                label="Resources"
                count={nodesByType.resources}
                color="emerald"
                checked={activeFilters.resources}
              />
              <FilterCheckbox
                id="filter-tiles"
                label="Tiles"
                count={nodesByType.tiles}
                color="blue"
                checked={activeFilters.tiles}
              />
              <FilterCheckbox
                id="filter-npcs"
                label="NPCs"
                count={nodesByType.npcs}
                color="purple"
                checked={activeFilters.npcs}
              />
              <FilterCheckbox
                id="filter-quests"
                label="Quests"
                count={nodesByType.quests}
                color="rose"
                checked={activeFilters.quests}
              />
              <FilterCheckbox
                id="filter-house-tiles"
                label="House Tiles"
                count={nodesByType.houseTiles}
                color="cyan"
                checked={activeFilters.houseTiles}
              />
            </div>

            <div class="mt-6 pt-4 border-t border-gray-700">
              <h3 class="text-sm font-semibold text-gray-400 mb-2">Statistics</h3>
              <div class="text-sm text-gray-300 space-y-1">
                <div>Nodes: {filteredNodes.length}</div>
                <div>Edges: {filteredEdges.length}</div>
              </div>
            </div>

            <div class="mt-6 pt-4 border-t border-gray-700">
              <h3 class="text-sm font-semibold text-gray-400 mb-2">Edge Types</h3>
              <div class="space-y-1 text-xs">
                <EdgeLegend type="yields" label="Yields" />
                <EdgeLegend type="requires" label="Requires" />
                <EdgeLegend type="found_on" label="Found On" />
                <EdgeLegend type="giver" label="Quest Giver" />
                <EdgeLegend type="rewards" label="Rewards" />
                <EdgeLegend type="transforms_to" label="Transforms To" />
              </div>
            </div>
          </div>
        </div>

        {/* Graph Container */}
        <div class="col-span-3">
          <div
            data-testid="graph-container"
            class="bg-gray-800 rounded-lg h-[600px] overflow-hidden relative"
            style="background: #1f2937;"
          >
            {filteredNodes.length > 0 ? (
              <cytoscape-graph
                graph-data={JSON.stringify({ nodes: filteredNodes, edges: filteredEdges })}
                class="w-full h-full block"
              />
            ) : (
              <div class="absolute inset-0 flex items-center justify-center text-gray-400">
                No nodes to display. Adjust filters or add more entities.
              </div>
            )}
          </div>

          {/* Edges Summary */}
          <div class="mt-4 bg-gray-800 rounded-lg p-4">
            <h3 class="text-sm font-semibold text-white mb-3">Recent Connections</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-48 overflow-auto">
              {filteredEdges.slice(0, 15).map((edge) => (
                <div
                  key={edge.id}
                  class="text-xs p-2 bg-gray-700 rounded flex items-center gap-2"
                >
                  <span
                    class="w-2 h-2 rounded-full flex-shrink-0"
                    style={`background-color: ${getEdgeColor(edge.type)};`}
                  />
                  <span class="text-gray-300 truncate">
                    {getNodeLabel(edge.source, filteredNodes)}
                  </span>
                  <span class="text-gray-500">→</span>
                  <span class="text-gray-300 truncate">
                    {getNodeLabel(edge.target, filteredNodes)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

interface FilterCheckboxProps {
  id: string;
  label: string;
  count: number;
  color: string;
  checked: boolean;
}

const FilterCheckbox: FC<FilterCheckboxProps> = ({ id, label, count, color, checked }) => {
  const colorClasses: Record<string, string> = {
    amber: "text-amber-400",
    emerald: "text-emerald-400",
    blue: "text-blue-400",
    purple: "text-purple-400",
    rose: "text-rose-400",
    cyan: "text-cyan-400",
  };

  const filterKey = id.replace("filter-", "").replace("-", "T");
  const paramName = filterKey === "houseTiles" ? "houseTiles" : filterKey;

  return (
    <label class="flex items-center justify-between cursor-pointer">
      <div class="flex items-center gap-2">
        <input
          type="checkbox"
          data-testid={id}
          checked={checked}
          class="w-4 h-4 rounded bg-gray-700 border-gray-600"
          onchange={`window.location.href = window.location.pathname + '?' + new URLSearchParams({...Object.fromEntries(new URLSearchParams(window.location.search)), '${paramName}': this.checked}).toString()`}
        />
        <span class={`text-sm ${colorClasses[color]}`}>{label}</span>
      </div>
      <span class="text-xs text-gray-500">{count}</span>
    </label>
  );
};

interface EdgeLegendProps {
  type: string;
  label: string;
}

const EdgeLegend: FC<EdgeLegendProps> = ({ type, label }) => {
  return (
    <div class="flex items-center gap-2">
      <span
        class="w-4 h-0.5"
        style={`background-color: ${getEdgeColor(type as any)};`}
      />
      <span class="text-gray-400">{label}</span>
    </div>
  );
};

function getNodeEditUrl(node: GraphNode): string {
  const typeToPath: Record<GraphNode["type"], string> = {
    item: "items",
    resource: "resources",
    tile: "tiles",
    npc: "npcs",
    quest: "quests",
    "house-tile": "house-tiles",
  };
  return `/${typeToPath[node.type]}/${node.id}`;
}

function getConnectionCount(nodeId: string, edges: GraphEdge[]): number {
  return edges.filter((e) => e.source === nodeId || e.target === nodeId).length;
}

function getNodeLabel(nodeId: string, nodes: GraphNode[]): string {
  const node = nodes.find((n) => n.id === nodeId);
  return node?.label || nodeId;
}

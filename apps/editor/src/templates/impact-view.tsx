import type { FC } from "hono/jsx";
import type { ImpactAnalysis, ImpactNode } from "../services/impact-analysis.js";

interface ImpactViewProps {
  analysis: ImpactAnalysis;
}

const ImpactNodeCard: FC<{ node: ImpactNode }> = ({ node }) => {
  const typeColors: Record<string, string> = {
    item: "bg-amber-600/20 text-amber-400 border-amber-600/30",
    resource: "bg-emerald-600/20 text-emerald-400 border-emerald-600/30",
    tile: "bg-blue-600/20 text-blue-400 border-blue-600/30",
    npc: "bg-purple-600/20 text-purple-400 border-purple-600/30",
    quest: "bg-cyan-600/20 text-cyan-400 border-cyan-600/30",
    houseTile: "bg-pink-600/20 text-pink-400 border-pink-600/30",
  };

  const typeIcons: Record<string, string> = {
    item: "📦",
    resource: "🪨",
    tile: "🗺️",
    npc: "👤",
    quest: "📜",
    houseTile: "🏠",
  };

  return (
    <a
      href={`/${node.type}s/${node.id}`}
      class={`block p-3 rounded border ${typeColors[node.type] || "bg-gray-700"} hover:opacity-80 transition`}
    >
      <div class="flex items-center gap-2 mb-1">
        <span>{typeIcons[node.type] || "📄"}</span>
        <span class="font-medium">{node.name}</span>
        <span class="text-xs opacity-60">({node.id})</span>
      </div>
      <div class="text-sm opacity-80">{node.relationship}</div>
    </a>
  );
};

export const ImpactView: FC<ImpactViewProps> = ({ analysis }) => {
  const typeIcons: Record<string, string> = {
    item: "📦",
    resource: "🪨",
    tile: "🗺️",
    npc: "👤",
    quest: "📜",
    houseTile: "🏠",
  };

  return (
    <div id="main-content">
      <div class="flex justify-between items-center mb-6">
        <h1 class="text-2xl font-bold text-white">
          🔍 Impact Analysis: {typeIcons[analysis.entity.type]} {analysis.entity.name}
        </h1>
        <a
          href={`/${analysis.entity.type}s/${analysis.entity.id}`}
          class="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-white font-medium transition"
        >
          ← Back to {analysis.entity.type}
        </a>
      </div>

      <div class="grid gap-6">
        {/* Summary */}
        <div class="bg-gray-800 rounded-lg p-6">
          <h2 class="text-lg font-semibold text-white mb-4">Summary</h2>
          <div class="grid grid-cols-3 gap-4">
            <div class="bg-gray-700/50 rounded p-4 text-center">
              <div class="text-3xl font-bold text-red-400">{analysis.directImpacts.length}</div>
              <div class="text-sm text-gray-400">Direct Impacts</div>
            </div>
            <div class="bg-gray-700/50 rounded p-4 text-center">
              <div class="text-3xl font-bold text-yellow-400">{analysis.indirectImpacts.length}</div>
              <div class="text-sm text-gray-400">Indirect Impacts</div>
            </div>
            <div class="bg-gray-700/50 rounded p-4 text-center">
              <div class="text-3xl font-bold text-white">{analysis.totalAffected}</div>
              <div class="text-sm text-gray-400">Total Affected</div>
            </div>
          </div>
        </div>

        {/* Direct Impacts */}
        {analysis.directImpacts.length > 0 && (
          <div class="bg-gray-800 rounded-lg p-6">
            <h2 class="text-lg font-semibold text-red-400 mb-4 flex items-center gap-2">
              <span>⚠️</span> Direct Impacts
            </h2>
            <p class="text-sm text-gray-400 mb-4">
              These entities directly reference this {analysis.entity.type}. Changes will immediately affect them.
            </p>
            <div class="grid gap-3">
              {analysis.directImpacts.map((node) => (
                <ImpactNodeCard node={node} />
              ))}
            </div>
          </div>
        )}

        {/* Indirect Impacts */}
        {analysis.indirectImpacts.length > 0 && (
          <div class="bg-gray-800 rounded-lg p-6">
            <h2 class="text-lg font-semibold text-yellow-400 mb-4 flex items-center gap-2">
              <span>📎</span> Indirect Impacts
            </h2>
            <p class="text-sm text-gray-400 mb-4">
              These entities are indirectly related and may be affected by changes.
            </p>
            <div class="grid gap-3">
              {analysis.indirectImpacts.map((node) => (
                <ImpactNodeCard node={node} />
              ))}
            </div>
          </div>
        )}

        {/* No impacts */}
        {analysis.totalAffected === 0 && (
          <div class="bg-gray-800 rounded-lg p-6 text-center">
            <div class="text-4xl mb-4">✅</div>
            <h2 class="text-lg font-semibold text-green-400 mb-2">No Dependencies Found</h2>
            <p class="text-gray-400">
              This {analysis.entity.type} is not referenced by any other entities.
              It can be safely modified or deleted.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

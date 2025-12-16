import type { FC } from "hono/jsx";
import type { ValidationResult, ValidationError, ValidationWarning } from "../services/validation.js";
import { getErrorTypeLabel, getEntityEditUrl } from "../services/validation.js";

interface ValidationViewProps {
  validation: ValidationResult;
}

export const ValidationView: FC<ValidationViewProps> = ({ validation }) => {
  const { errors, warnings, balance, summary } = validation;

  return (
    <div id="main-content">
      <div class="flex justify-between items-center mb-6">
        <h1 class="text-2xl font-bold text-white">✅ Validation Results</h1>
        <div class="flex items-center gap-4">
          <div class={`px-4 py-2 rounded-lg ${getHealthScoreColor(summary.healthScore)}`}>
            <span class="text-sm">Health Score:</span>
            <span class="text-xl font-bold ml-2">{summary.healthScore}%</span>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div class="grid grid-cols-3 gap-4 mb-6">
        <div class="bg-gray-800 rounded-lg p-4 border-l-4 border-red-500">
          <div class="text-3xl font-bold text-red-400">{summary.totalErrors}</div>
          <div class="text-sm text-gray-400">Errors</div>
        </div>
        <div class="bg-gray-800 rounded-lg p-4 border-l-4 border-yellow-500">
          <div class="text-3xl font-bold text-yellow-400">{summary.totalWarnings}</div>
          <div class="text-sm text-gray-400">Warnings</div>
        </div>
        <div class="bg-gray-800 rounded-lg p-4 border-l-4 border-green-500">
          <div class="text-3xl font-bold text-green-400">{summary.healthScore}%</div>
          <div class="text-sm text-gray-400">Health Score</div>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Errors Section */}
        <div data-testid="errors-section" class="bg-gray-800 rounded-lg p-4">
          <h2 class="text-lg font-semibold text-red-400 mb-4 flex items-center gap-2">
            <span>❌</span>
            <span>Errors ({errors.length})</span>
          </h2>
          {errors.length === 0 ? (
            <div class="text-gray-400 text-center py-8">
              <span class="text-4xl">🎉</span>
              <p class="mt-2">No errors found!</p>
            </div>
          ) : (
            <div class="space-y-2 max-h-96 overflow-auto">
              {errors.map((error, idx) => (
                <ErrorCard key={idx} error={error} />
              ))}
            </div>
          )}
        </div>

        {/* Warnings Section */}
        <div data-testid="warnings-section" class="bg-gray-800 rounded-lg p-4">
          <h2 class="text-lg font-semibold text-yellow-400 mb-4 flex items-center gap-2">
            <span>⚠️</span>
            <span>Warnings ({warnings.length})</span>
          </h2>
          {warnings.length === 0 ? (
            <div class="text-gray-400 text-center py-8">
              <span class="text-4xl">✨</span>
              <p class="mt-2">No warnings!</p>
            </div>
          ) : (
            <div class="space-y-2 max-h-96 overflow-auto">
              {warnings.map((warning, idx) => (
                <WarningCard key={idx} warning={warning} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Balance Analysis Section */}
      <div data-testid="balance-section" class="mt-6 bg-gray-800 rounded-lg p-4">
        <h2 class="text-lg font-semibold text-blue-400 mb-4 flex items-center gap-2">
          <span>⚖️</span>
          <span>Balance Analysis</span>
        </h2>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Rarity Distribution */}
          <div>
            <h3 class="text-sm font-semibold text-gray-400 mb-3">Item Rarity Distribution</h3>
            <div class="space-y-2">
              {Object.entries(balance.rarityDistribution).map(([rarity, count]) => (
                <div key={rarity} class="flex items-center justify-between">
                  <span class={`text-sm ${getRarityColor(rarity)}`}>
                    {rarity.charAt(0).toUpperCase() + rarity.slice(1)}
                  </span>
                  <div class="flex items-center gap-2">
                    <div class="w-24 h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div
                        class={`h-full ${getRarityBgColor(rarity)}`}
                        style={`width: ${Math.min(100, (count / 20) * 100)}%`}
                      />
                    </div>
                    <span class="text-xs text-gray-400 w-8">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Average Value by Rarity */}
          <div>
            <h3 class="text-sm font-semibold text-gray-400 mb-3">Avg Value by Rarity</h3>
            <div class="space-y-2">
              {Object.entries(balance.itemValueDistribution).map(([rarity, avgValue]) => (
                <div key={rarity} class="flex items-center justify-between">
                  <span class={`text-sm ${getRarityColor(rarity)}`}>
                    {rarity.charAt(0).toUpperCase() + rarity.slice(1)}
                  </span>
                  <span class="text-sm text-gray-300">{avgValue} gold</span>
                </div>
              ))}
            </div>
          </div>

          {/* Top Value/Time Resources */}
          <div>
            <h3 class="text-sm font-semibold text-gray-400 mb-3">Best Value/Time Resources</h3>
            <div class="space-y-2">
              {balance.collectionTimeVsReward.slice(0, 5).map((resource) => (
                <div key={resource.resource} class="flex items-center justify-between text-sm">
                  <span class="text-gray-300 truncate max-w-[120px]">{resource.resource}</span>
                  <span class="text-emerald-400">{resource.ratio} g/s</span>
                </div>
              ))}
              {balance.collectionTimeVsReward.length === 0 && (
                <p class="text-gray-500 text-sm">No data available</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const ErrorCard: FC<{ error: ValidationError }> = ({ error }) => {
  return (
    <a
      href={getEntityEditUrl(error.sourceType, error.source)}
      data-testid="validation-error-link"
      class="block p-3 bg-red-500/10 border border-red-500/30 rounded hover:bg-red-500/20 transition"
    >
      <div class="flex items-start justify-between">
        <div>
          <span class="text-sm font-medium text-red-400">{getErrorTypeLabel(error.type)}</span>
          <p class="text-xs text-gray-400 mt-1">
            <span class="text-gray-300">{error.sourceName}</span>
            <span class="text-gray-500"> references missing </span>
            <span class="text-red-300 font-mono">{error.reference}</span>
          </p>
          <p class="text-xs text-gray-500 mt-1">Location: {error.location}</p>
        </div>
        <span class="text-xs text-gray-500">→</span>
      </div>
    </a>
  );
};

const WarningCard: FC<{ warning: ValidationWarning }> = ({ warning }) => {
  const getWarningLabel = () => {
    if (warning.type === "orphaned") {
      const typeLabels: Record<string, string> = {
        item: "Orphaned Item",
        resource: "Orphaned Resource",
        tile: "Orphaned Tile",
        npc: "Orphaned NPC",
        quest: "Orphaned Quest",
        "house-tile": "Orphaned House Tile",
      };
      return typeLabels[warning.entityType] || `Orphaned ${warning.entityType}`;
    }
    if (warning.type === "duplicate_id") return "Duplicate ID";
    return "Balance Issue";
  };

  return (
    <a
      href={getEntityEditUrl(warning.entityType, warning.entity)}
      data-testid="validation-warning-link"
      class="block p-3 bg-yellow-500/10 border border-yellow-500/30 rounded hover:bg-yellow-500/20 transition"
    >
      <div class="flex items-start justify-between">
        <div>
          <span class="text-sm font-medium text-yellow-400">
            {getWarningLabel()}
          </span>
          <p class="text-xs text-gray-400 mt-1">
            <span class="text-gray-300">{warning.entityName}</span>
            <span class="text-gray-500 font-mono ml-1">({warning.entity})</span>
          </p>
          <p class="text-xs text-gray-500 mt-1">{warning.message}</p>
        </div>
        <span class="text-xs text-gray-500">→</span>
      </div>
    </a>
  );
};

function getHealthScoreColor(score: number): string {
  if (score >= 90) return "bg-green-500/20 text-green-400";
  if (score >= 70) return "bg-yellow-500/20 text-yellow-400";
  if (score >= 50) return "bg-orange-500/20 text-orange-400";
  return "bg-red-500/20 text-red-400";
}

function getRarityColor(rarity: string): string {
  const colors: Record<string, string> = {
    common: "text-gray-400",
    uncommon: "text-green-400",
    rare: "text-blue-400",
    epic: "text-purple-400",
    legendary: "text-amber-400",
  };
  return colors[rarity] || "text-gray-400";
}

function getRarityBgColor(rarity: string): string {
  const colors: Record<string, string> = {
    common: "bg-gray-400",
    uncommon: "bg-green-400",
    rare: "bg-blue-400",
    epic: "bg-purple-400",
    legendary: "bg-amber-400",
  };
  return colors[rarity] || "bg-gray-400";
}

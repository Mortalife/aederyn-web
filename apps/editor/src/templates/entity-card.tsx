import type { FC } from "hono/jsx";

type EntityType = "item" | "resource" | "tile" | "npc" | "quest" | "house-tile";

interface EntityCardProps {
  type: EntityType;
  id: string;
  name: string;
  description?: string;
  editUrl: string;
  deleteUrl: string;
  metadata?: Record<string, string | number>;
  icon?: string;
  color?: string;
}

const typeConfig: Record<EntityType, { icon: string; accent: string; bg: string; border: string }> = {
  item: {
    icon: "📦",
    accent: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/30 hover:border-amber-500/60",
  },
  resource: {
    icon: "🪨",
    accent: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30 hover:border-emerald-500/60",
  },
  tile: {
    icon: "🗺️",
    accent: "text-blue-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/30 hover:border-blue-500/60",
  },
  npc: {
    icon: "👤",
    accent: "text-purple-400",
    bg: "bg-purple-500/10",
    border: "border-purple-500/30 hover:border-purple-500/60",
  },
  quest: {
    icon: "📜",
    accent: "text-rose-400",
    bg: "bg-rose-500/10",
    border: "border-rose-500/30 hover:border-rose-500/60",
  },
  "house-tile": {
    icon: "🏠",
    accent: "text-cyan-400",
    bg: "bg-cyan-500/10",
    border: "border-cyan-500/30 hover:border-cyan-500/60",
  },
};

export const EntityCard: FC<EntityCardProps> = ({
  type,
  id,
  name,
  description,
  editUrl,
  deleteUrl,
  metadata = {},
  icon,
  color,
}) => {
  const config = typeConfig[type];

  return (
    <div
      data-testid="entity-card"
      data-type={type}
      class={`rounded-lg p-4 border transition-all ${config.bg} ${config.border}`}
    >
      <div class="flex items-start justify-between mb-2">
        <div class="flex items-center gap-3">
          {color ? (
            <div
              class="w-10 h-10 rounded flex items-center justify-center text-xl"
              style={`background-color: ${color};`}
            >
              {icon || config.icon}
            </div>
          ) : (
            <span class={`text-2xl ${config.accent}`}>{icon || config.icon}</span>
          )}
          <div>
            <h3 class="font-semibold text-white">{name}</h3>
            <p class="text-xs text-gray-500 font-mono">{id}</p>
          </div>
        </div>
        <span class={`text-xs px-2 py-1 rounded ${config.bg} ${config.accent} font-medium`}>
          {type}
        </span>
      </div>

      {description && (
        <p class="text-sm text-gray-400 line-clamp-2 mb-3">{description}</p>
      )}

      {Object.keys(metadata).length > 0 && (
        <div class="flex flex-wrap gap-2 mb-3">
          {Object.entries(metadata).map(([key, value]) => (
            <span key={key} class="text-xs px-2 py-1 bg-gray-700 rounded text-gray-300">
              <span class="text-gray-500">{key}:</span> {value}
            </span>
          ))}
        </div>
      )}

      <div class="flex justify-end gap-2 pt-2 border-t border-gray-700">
        <a
          href={editUrl}
          class={`text-sm ${config.accent} hover:underline`}
        >
          Edit
        </a>
        <form method="post" action={deleteUrl} class="inline">
          <button
            type="submit"
            data-testid="delete-btn"
            class="text-sm text-red-400 hover:text-red-300"
          >
            Delete
          </button>
        </form>
      </div>
    </div>
  );
};

export const EntityCardGrid: FC<{ children: any }> = ({ children }) => {
  return (
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {children}
    </div>
  );
};

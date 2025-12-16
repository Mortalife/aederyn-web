import type { FC } from "hono/jsx";

interface StatusBarProps {
  counts?: {
    items: number;
    resources: number;
    tiles: number;
    npcs: number;
    quests: number;
    houseTiles: number;
  };
}

export const StatusBar: FC<StatusBarProps> = ({ counts }) => {
  const c = counts || { items: 0, resources: 0, tiles: 0, npcs: 0, quests: 0, houseTiles: 0 };
  
  return (
    <footer
      data-testid="status-bar"
      class="h-8 bg-gray-800 border-t border-gray-700 flex items-center px-4 text-xs text-gray-400"
    >
      <div class="flex items-center gap-4">
        <span class="flex items-center gap-1" data-testid="stat-items">
          <span class="text-amber-400">📦</span>
          <span>{c.items} Items</span>
        </span>
        <span class="text-gray-600">|</span>
        <span class="flex items-center gap-1" data-testid="stat-resources">
          <span class="text-emerald-400">🪨</span>
          <span>{c.resources} Resources</span>
        </span>
        <span class="text-gray-600">|</span>
        <span class="flex items-center gap-1" data-testid="stat-tiles">
          <span class="text-blue-400">🗺️</span>
          <span>{c.tiles} Tiles</span>
        </span>
        <span class="text-gray-600">|</span>
        <span class="flex items-center gap-1" data-testid="stat-npcs">
          <span class="text-purple-400">👤</span>
          <span>{c.npcs} NPCs</span>
        </span>
        <span class="text-gray-600">|</span>
        <span class="flex items-center gap-1" data-testid="stat-quests">
          <span class="text-rose-400">📜</span>
          <span>{c.quests} Quests</span>
        </span>
      </div>
    </footer>
  );
};

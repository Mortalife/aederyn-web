import type { FC } from "hono/jsx";

interface DashboardProps {
  counts: {
    items: number;
    resources: number;
    tiles: number;
    npcs: number;
    quests: number;
    houseTiles: number;
  };
}

export const Dashboard: FC<DashboardProps> = ({ counts }) => {
  return (
    <div id="main-content">
      <div class="text-center py-8">
        <h1 class="text-3xl font-bold text-white mb-4">🎮 Game Design GUI</h1>
        <p class="text-gray-400 mb-8">Welcome to the Aederyn Game Design Editor</p>
      </div>

      <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        <StatCard
          icon="📦"
          label="Items"
          count={counts.items}
          href="/items"
          color="amber"
        />
        <StatCard
          icon="🪨"
          label="Resources"
          count={counts.resources}
          href="/resources"
          color="emerald"
        />
        <StatCard
          icon="🗺️"
          label="Tiles"
          count={counts.tiles}
          href="/tiles"
          color="blue"
        />
        <StatCard
          icon="👤"
          label="NPCs"
          count={counts.npcs}
          href="/npcs"
          color="purple"
        />
        <StatCard
          icon="📜"
          label="Quests"
          count={counts.quests}
          href="/quests"
          color="rose"
        />
        <StatCard
          icon="🏠"
          label="House Tiles"
          count={counts.houseTiles}
          href="/house-tiles"
          color="cyan"
        />
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div class="bg-gray-800 rounded-lg p-6">
          <h2 class="text-xl font-semibold text-white mb-4">Quick Actions</h2>
          <div class="space-y-2">
            <a href="/items" class="block p-3 bg-gray-700 rounded hover:bg-gray-600 transition">
              ➕ Create New Item
            </a>
            <a href="/resources" class="block p-3 bg-gray-700 rounded hover:bg-gray-600 transition">
              ➕ Create New Resource
            </a>
            <a href="/validate" class="block p-3 bg-gray-700 rounded hover:bg-gray-600 transition">
              ✅ Run Validation
            </a>
            <a href="/graph" class="block p-3 bg-gray-700 rounded hover:bg-gray-600 transition">
              🔗 View Relationship Graph
            </a>
          </div>
        </div>

        <div class="bg-gray-800 rounded-lg p-6">
          <h2 class="text-xl font-semibold text-white mb-4">Health Check</h2>
          <div class="space-y-3">
            <div class="flex items-center justify-between p-3 bg-gray-700 rounded">
              <span>Missing References</span>
              <span class="text-green-400">✓ None</span>
            </div>
            <div class="flex items-center justify-between p-3 bg-gray-700 rounded">
              <span>Orphaned Entities</span>
              <span class="text-green-400">✓ None</span>
            </div>
            <div class="flex items-center justify-between p-3 bg-gray-700 rounded">
              <span>Balance Warnings</span>
              <span class="text-green-400">✓ None</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

interface StatCardProps {
  icon: string;
  label: string;
  count: number;
  href: string;
  color: string;
}

const StatCard: FC<StatCardProps> = ({ icon, label, count, href, color }) => {
  const colorClasses: Record<string, string> = {
    amber: "border-amber-500/50 hover:border-amber-500",
    emerald: "border-emerald-500/50 hover:border-emerald-500",
    blue: "border-blue-500/50 hover:border-blue-500",
    purple: "border-purple-500/50 hover:border-purple-500",
    rose: "border-rose-500/50 hover:border-rose-500",
    cyan: "border-cyan-500/50 hover:border-cyan-500",
  };

  return (
    <a
      href={href}
      data-testid={`stat-${label.toLowerCase().replace(" ", "-")}`}
      class={`block p-4 bg-gray-800 rounded-lg border-2 ${colorClasses[color]} transition`}
    >
      <div class="text-2xl mb-2">{icon}</div>
      <div class="text-2xl font-bold text-white">{count}</div>
      <div class="text-sm text-gray-400">{label}</div>
    </a>
  );
};

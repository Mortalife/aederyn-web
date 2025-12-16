import type { FC } from "hono/jsx";

interface NavItem {
  href: string;
  icon: string;
  label: string;
  color?: string;
}

const navItems: NavItem[] = [
  { href: "/items", icon: "📦", label: "Items", color: "text-item" },
  { href: "/resources", icon: "🪨", label: "Resources", color: "text-resource" },
  { href: "/tiles", icon: "🗺️", label: "Tiles", color: "text-tile" },
  { href: "/house-tiles", icon: "🏠", label: "House", color: "text-house" },
  { href: "/npcs", icon: "👤", label: "NPCs", color: "text-npc" },
  { href: "/quests", icon: "📜", label: "Quests", color: "text-quest" },
];

const toolItems: NavItem[] = [
  { href: "/graph", icon: "🔗", label: "Graph" },
  { href: "/validate", icon: "✅", label: "Validate" },
  { href: "/ai", icon: "🤖", label: "AI Gen" },
  { href: "/export", icon: "📤", label: "Export" },
];

export const Sidebar: FC = () => {
  return (
    <nav
      data-testid="sidebar"
      class="w-48 bg-gray-800 border-r border-gray-700 flex flex-col"
    >
      <a
        href="/"
        class="p-4 text-xl font-bold text-white border-b border-gray-700 hover:bg-gray-700 transition-colors"
      >
        🎮 Editor
      </a>

      <div class="flex-1 py-2">
        <div class="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Entities
        </div>
        {navItems.map((item) => (
          <a
            href={item.href}
            class={`flex items-center gap-3 px-4 py-2 text-gray-300 hover:bg-gray-700 hover:text-white transition-colors ${item.color || ""}`}
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </a>
        ))}

        <div class="my-2 border-t border-gray-700" />

        <div class="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Tools
        </div>
        {toolItems.map((item) => (
          <a
            href={item.href}
            class="flex items-center gap-3 px-4 py-2 text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </a>
        ))}
      </div>
    </nav>
  );
};

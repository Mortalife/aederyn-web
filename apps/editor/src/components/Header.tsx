import type { FC } from "hono/jsx";

export const Header: FC = () => {
  return (
    <header
      data-testid="header"
      class="h-14 bg-gray-800 border-b border-gray-700 flex items-center justify-between px-6"
    >
      <div class="flex-1" />

      <div class="flex items-center gap-4">
        <div class="relative">
          <input
            type="text"
            placeholder="Search... (Ctrl+K)"
            class="w-64 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <button
          class="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
          title="Settings"
        >
          ⚙️
        </button>
      </div>
    </header>
  );
};

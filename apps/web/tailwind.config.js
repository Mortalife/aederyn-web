/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.tsx"],
  theme: {
    extend: {
      colors: {
        rarity: {
          common: "#9ca3af",
          uncommon: "#22c55e",
          rare: "#3b82f6",
          epic: "#a855f7",
          legendary: "#f59e0b",
        },
        item: {
          resource: "#a16207",
          tool: "#0891b2",
          weapon: "#dc2626",
          armor: "#64748b",
          consumable: "#059669",
          quest: "#d97706",
          item: "#6b7280",
        },
        objective: "#fb923c",
        quest: {
          available: "#facc15",
          objective: "#fb923c",
          completable: "#4ade80",
          elsewhere: "#9ca3af",
          hidden: "#c084fc",
        },
      },
    },
  },
  daisyui: {
    themes: ["dark"],
  },
  plugins: [require("daisyui")],
};

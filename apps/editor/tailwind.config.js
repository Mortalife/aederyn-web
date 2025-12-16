/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Entity-specific accent colors
        item: {
          DEFAULT: "#f59e0b", // amber-500
          light: "#fbbf24",   // amber-400
          dark: "#d97706",    // amber-600
        },
        resource: {
          DEFAULT: "#10b981", // emerald-500
          light: "#34d399",   // emerald-400
          dark: "#059669",    // emerald-600
        },
        tile: {
          DEFAULT: "#3b82f6", // blue-500
          light: "#60a5fa",   // blue-400
          dark: "#2563eb",    // blue-600
        },
        npc: {
          DEFAULT: "#a855f7", // purple-500
          light: "#c084fc",   // purple-400
          dark: "#9333ea",    // purple-600
        },
        quest: {
          DEFAULT: "#f43f5e", // rose-500
          light: "#fb7185",   // rose-400
          dark: "#e11d48",    // rose-600
        },
        house: {
          DEFAULT: "#06b6d4", // cyan-500
          light: "#22d3ee",   // cyan-400
          dark: "#0891b2",    // cyan-600
        },
      },
    },
  },
  plugins: [],
};

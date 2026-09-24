import type { Effect } from "./types.js";

export const effects: Effect[] = [
  {
    id: "effect_spores",
    name: "Spores",
    description:
      "Fungal spores hang in the air and settle in the lungs. They drain health over time and stop natural healing.",
    kind: "health",
    polarity: "negative",
    interval: 5000,
    mode: "mitigation",
  },
  {
    id: "effect_rest",
    name: "Rest",
    description:
      "Somewhere safe and warm to sit by a fire. Health comes back faster.",
    kind: "health",
    polarity: "positive",
    interval: 10000,
    mode: "none",
  },
  {
    id: "effect_cold",
    name: "Cold",
    description:
      "Cold fen water and wet clothes. Numb fingers make gathering slower.",
    kind: "gather_speed",
    polarity: "negative",
    mode: "mitigation",
  },
  {
    id: "effect_bountiful",
    name: "Bountiful",
    description: "Everything comes easily to hand. Gathering is quicker.",
    kind: "gather_speed",
    polarity: "positive",
    mode: "none",
  },
  {
    id: "effect_dark",
    name: "Dark",
    description: "Pitch black. Without a light you can't gather or fight.",
    kind: "blocks",
    actions: ["gather", "attack"],
    message: "It's too dark to see what you're doing. You need a light.",
    mode: "binary",
  },
  {
    id: "effect_spore_ward",
    name: "Spore Filter",
    description:
      "A mask or respirator that filters the air. Cuts how much spores drain, though some always gets through.",
    kind: "protects",
    target: "effect_spores",
    mode: "none",
  },
  {
    id: "effect_cold_ward",
    name: "Warmth",
    description:
      "Waders, dry layers or something hot inside you against the cold water. Cuts how much it slows you down.",
    kind: "protects",
    target: "effect_cold",
    mode: "none",
  },
  {
    id: "effect_light",
    name: "Light",
    description: "A torch or lantern to see by in the dark.",
    kind: "protects",
    target: "effect_dark",
    mode: "none",
  },
];

export const effectsById = new Map<string, Effect>(
  effects.map((e) => [e.id, e]),
);

import type { Monster } from "../../config/types.js";

export const monsters: Monster[] = [
  {
    id: "monster_chicken",
    name: "Chicken",
    description: "A chicken.",
    health: 50,
    attack: { style: "melee", damage: 5, speed: 3000 },
    defence: { melee: 0, ranged: 20, magic: 0 },
    respawnTime: 30,
    drops: [{ item_id: "item_feather", qty: 3, chance: 1 }],
  },
];

export const monstersById = new Map<string, Monster>(monsters.map((m) => [m.id, m]));

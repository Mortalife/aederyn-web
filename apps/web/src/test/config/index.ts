import { vi } from "vitest";

/**
 * Swaps the game content for this small fixture world, so tests don't
 * depend on what the real content happens to contain.
 */
vi.mock("../../config/items.js", () => import("./items.js"));
vi.mock("../../config/resources.js", () => import("./resources.js"));
vi.mock("../../config/monsters.js", () => import("./monsters.js"));
vi.mock("../../config/tiles.js", () => import("./tiles.js"));
vi.mock("../../config/map.js", () => import("./map.js"));
vi.mock("../../config/npcs.js", () => import("./npcs.js"));
vi.mock("../../config/quests.js", () => import("./quests.js"));

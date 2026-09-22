import { z } from "zod";

export const WorldSettingSchema = z.object({
  genre: z.string().describe("Genre, e.g. fantasy"),
  tone: z.string().describe("Overall tone, e.g. mysterious, heroic"),
  era: z.string().describe("Era, e.g. medieval"),
  description: z.string().describe("400-1000 word world overview"),
});

export const WorldRegionSchema = z.object({
  id: z.string().describe("Unique region slug (lowercase, hyphens)"),
  name: z.string().describe("Region name"),
  description: z.string().describe("~200 word region description"),
  climate: z.string().describe("Climate type, e.g. temperate, arid"),
  inhabitants: z.array(z.string()).describe("Types of inhabitants"),
  resources: z.array(z.string()).describe("Natural resources found here (prose, not resource IDs)"),
  themes: z.array(z.string()).describe("Theme IDs prominent in this region"),
});

export const WorldFactionSchema = z.object({
  id: z.string().describe("Unique faction slug (lowercase, hyphens)"),
  name: z.string().describe("Faction name"),
  description: z.string().describe("~200 word faction description"),
  alignment: z.enum(["friendly", "neutral", "hostile"]).describe("Default alignment toward the player"),
  goals: z.array(z.string()).describe("2-3 faction goals"),
  rivals: z.array(z.string()).describe("Rival faction IDs"),
  allies: z.array(z.string()).describe("Allied faction IDs"),
  members: z.array(z.string()).describe("Types of members (not specific NPCs)"),
});

export const WorldHistoryEventSchema = z.object({
  id: z.string().describe("Unique event slug (lowercase, hyphens)"),
  name: z.string().describe("Event name"),
  description: z.string().describe("~300 word event description"),
  era: z.string().describe("Era name, e.g. 'Age of Foundation'"),
  significance: z.string().describe("Why this event matters today"),
  relatedEntities: z.array(z.string()).describe("IDs of related factions, regions, systems or themes"),
});

export const WorldThemeSchema = z.object({
  id: z.string().describe("Unique theme slug (lowercase, hyphens)"),
  name: z.string().describe("Theme name"),
  description: z.string().describe("~100 word theme description"),
  examples: z.array(z.string()).describe("3-5 ways the theme shows up in the world"),
});

export const WorldSystemSchema = z.object({
  id: z.string().describe("Unique system slug (lowercase, hyphens)"),
  name: z.string().describe("System name, e.g. a magic system or religion"),
  type: z.enum(["magic", "technology", "hybrid"]).describe("System type"),
  description: z.string().describe("~150 word system description"),
  rules: z.array(z.string()).describe("3-5 rules that govern the system"),
  limitations: z.array(z.string()).describe("2-3 limitations or costs"),
});

export const WorldNamingSchema = z.object({
  characterPatterns: z.array(z.string()).describe("Naming patterns for characters"),
  placePatterns: z.array(z.string()).describe("Naming patterns for places"),
  itemPatterns: z.array(z.string()).describe("Naming patterns for items"),
  examples: z.record(z.string(), z.array(z.string())).describe("Example names keyed by category (characters, places, items)"),
});

export const WorldBibleSchema = z.object({
  id: z.string().describe("Always 'world-bible'"),
  name: z.string().describe("World name"),
  setting: WorldSettingSchema,
  regions: z.array(WorldRegionSchema),
  factions: z.array(WorldFactionSchema),
  history: z.array(WorldHistoryEventSchema).describe("Major events in chronological order"),
  themes: z.array(WorldThemeSchema),
  systems: z.array(WorldSystemSchema),
  naming: WorldNamingSchema,
  createdAt: z.string().describe("ISO timestamp"),
  updatedAt: z.string().describe("ISO timestamp"),
});

// Infer types from schemas
export type WorldSetting = z.infer<typeof WorldSettingSchema>;
export type WorldRegion = z.infer<typeof WorldRegionSchema>;
export type WorldFaction = z.infer<typeof WorldFactionSchema>;
export type WorldHistoryEvent = z.infer<typeof WorldHistoryEventSchema>;
export type WorldTheme = z.infer<typeof WorldThemeSchema>;
export type WorldSystem = z.infer<typeof WorldSystemSchema>;
export type WorldNaming = z.infer<typeof WorldNamingSchema>;
export type WorldBible = z.infer<typeof WorldBibleSchema>;

export function createDefaultWorldBible(): WorldBible {
  const now = new Date().toISOString();
  return {
    id: "world-bible",
    name: "My World",
    setting: {
      genre: "fantasy",
      tone: "heroic",
      era: "medieval",
      description: "",
    },
    regions: [],
    factions: [],
    history: [],
    themes: [],
    systems: [],
    naming: {
      characterPatterns: [],
      placePatterns: [],
      itemPatterns: [],
      examples: {},
    },
    createdAt: now,
    updatedAt: now,
  };
}

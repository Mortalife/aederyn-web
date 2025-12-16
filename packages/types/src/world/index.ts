export interface WorldBible {
  id: string;
  name: string;

  setting: WorldSetting;
  regions: WorldRegion[];
  factions: WorldFaction[];
  history: WorldHistoryEvent[];
  themes: WorldTheme[];
  systems: WorldSystem[];
  naming: WorldNaming;

  createdAt: string;
  updatedAt: string;
}

export interface WorldSetting {
  genre: string;
  tone: string;
  era: string;
  description: string;
}

export interface WorldRegion {
  id: string;
  name: string;
  description: string;
  climate: string;
  inhabitants: string[];
  resources: string[];
  themes: string[];
}

export interface WorldFaction {
  id: string;
  name: string;
  description: string;
  alignment: "friendly" | "neutral" | "hostile";
  goals: string[];
  rivals: string[];
  allies: string[];
  members: string[];
}

export interface WorldHistoryEvent {
  id: string;
  name: string;
  description: string;
  era: string;
  significance: string;
  relatedEntities: string[];
}

export interface WorldTheme {
  id: string;
  name: string;
  description: string;
  examples: string[];
}

export interface WorldSystem {
  id: string;
  name: string;
  type: "magic" | "technology" | "hybrid";
  description: string;
  rules: string[];
  limitations: string[];
}

export interface WorldNaming {
  characterPatterns: string[];
  placePatterns: string[];
  itemPatterns: string[];
  examples: Record<string, string[]>;
}

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

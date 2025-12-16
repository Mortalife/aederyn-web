export interface SchemaManifest {
  version: number;
  entities: {
    item: number;
    resource: number;
    tile: number;
    npc: number;
    quest: number;
    houseTile: number;
  };
  lastMigration: string;
}

export const CURRENT_SCHEMA: SchemaManifest = {
  version: 1,
  entities: {
    item: 1,
    resource: 1,
    tile: 1,
    npc: 1,
    quest: 1,
    houseTile: 1,
  },
  lastMigration: new Date().toISOString(),
};

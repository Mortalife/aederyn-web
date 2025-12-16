export interface Tile {
  id: string;
  name: string;
  color: string;
  backgroundColor: string;
  theme: string;
  texture?: string;
  resources: string[];
  rarity: number;
  accessible: boolean;
  image?: string;
  description?: string;
}

export interface CreateTileDTO extends Omit<Tile, 'id'> {
  id?: string;
}

export interface UpdateTileDTO extends Partial<Omit<Tile, 'id'>> {}

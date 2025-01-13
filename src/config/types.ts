export type GameUserModel = {
  id: string;
  p: {
    x: number;
    y: number;
  };
  z: boolean;
  s: {};
  i: UserInventoryItem[];
  e: {
    mh?: string;
  };
  h: number;
  po: number;
  m: number;
};

export type GameUser = Omit<GameUserModel, "i"> & {
  i: InventoryItem[];
};
export type OtherUser = Pick<
  GameUserModel,
  "id" | "p" | "e" | "h" | "po" | "m"
>;

export type Item = {
  id: string;
  name: string;
  description: string;
  type: string;
  rarity: string;
  stackable: boolean;
  maxStackSize: number;
  equippable: boolean;
  equipSlot?: string;
  durability?: {
    current: number;
    max: number;
  };
  attributes?: {
    damage?: number;
    armor?: number;
    health?: number;
    mana?: number;
    strength?: number;
    dexterity?: number;
    intelligence?: number;
  };
  requirements?: {
    level: number;
    strength: number;
    dexterity: number;
    intelligence: number;
  };
  effects?: [
    {
      type: string;
      value: number;
      duration: number;
    }
  ];
  value: number;
  weight: number;
  iconUrl?: string;
};

export type InventoryItem = {
  id: string;
  qty: number;
  item: Item;
};
export type UserInventoryItem = {
  id: string;
  qty: number;
  item_id: string;
};

export type RewardItemModel = {
  item_id: string;
  qty: number;
};
export type RewardItem = {
  item: Item;
  qty: number;
};

export type RequiredItemModel = {
  item_id: string;
  qty: number;
  consumed: boolean;
  itemDurabilityReduction?: number;
};

export type RequiredItem = {
  item: Item;
  qty: number;
  consumed: boolean;
};

export type ResourceModel = {
  id: string;
  name: string;
  amount: number;
  limitless: boolean;
  collectionTime: number;
  reward_items: RewardItemModel[];
  required_items: RequiredItemModel[];
  type: "resource" | "workbench" | "furnace" | "magic";
  verb: string;
};

export type Resource = Omit<
  ResourceModel,
  "reward_items" | "required_items"
> & {
  reward_items: RewardItem[];
  required_items: RequiredItem[];
};

export type Tile = {
  id: string;
  name: string;
  color: string;
  theme?: string;
  resources: string[];
  rarity: number;
};

export type Npc = {
  entity_id: string;
  name: string;
  backstory: string;
  personalMission: string;
  hopes: string;
  fears: string;
  relationships: Record<string, string[]>;
};

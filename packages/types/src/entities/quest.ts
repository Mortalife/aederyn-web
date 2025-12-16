export type QuestType =
  | "collection"
  | "messenger"
  | "investigation"
  | "crafting"
  | "exploration"
  | "defence"
  | "combat"
  | "delivery"
  | "dialog";

export interface NpcReference {
  entity_id: string;
  zone_id: string;
}

export interface TileNpcReference extends NpcReference {
  x: number;
  y: number;
}

export interface Progress {
  current: number;
  required: number;
  completed: boolean;
  updated_at: number | null;
  completed_at: number | null;
}

export interface DialogStep {
  entity_id: string | null;
  dialog: string;
}

export interface BaseObjective {
  id: string;
  description: string;
  progress: Progress | null;
}

export interface GatherObjective extends BaseObjective {
  type: "gather";
  resource_id: string;
  amount: number;
}

export interface CollectObjective extends BaseObjective {
  type: "collect";
  item_id: string;
  amount: number;
}

export interface TalkObjective extends BaseObjective {
  type: "talk";
  entity_id: string;
  zone_id: string;
  dialog_steps: DialogStep[];
}

export interface TileTalkObjective extends TalkObjective {
  x: number;
  y: number;
}

export interface ExploreObjective extends BaseObjective {
  type: "explore";
  zone_id: string;
  chance: number;
  found_message: string | null;
}

export interface TileExploreObjective extends ExploreObjective {
  x: number;
  y: number;
}

export interface CraftObjective extends BaseObjective {
  type: "craft";
  resource_id: string;
  amount: number;
}

export type Objective =
  | GatherObjective
  | CollectObjective
  | TalkObjective
  | ExploreObjective
  | CraftObjective;

export type TileObjective =
  | GatherObjective
  | CollectObjective
  | TileTalkObjective
  | TileExploreObjective
  | CraftObjective;

export interface ItemReward {
  type: "item";
  item_id: string;
  amount: number;
}

export interface GoldReward {
  type: "gold";
  amount: number;
}

export interface SkillReward {
  type: "skill";
  skill_id: string;
  amount: number;
}

export type RequirementReward = ItemReward | GoldReward | SkillReward;

export interface Completion {
  entity_id: string;
  zone_id: string;
  message: string;
  return_message: string;
}

export interface TileCompletion extends Completion {
  x: number;
  y: number;
}

export interface Quest {
  id: string;
  type: QuestType;
  name: string;
  giver: NpcReference | TileNpcReference;
  description: string;
  objectives: (Objective | TileObjective)[];
  completion: Completion | TileCompletion;
  rewards: RequirementReward[];
  prerequisites?: string[];
  is_tutorial?: boolean;
}

export interface TileQuest
  extends Omit<Quest, "giver" | "objectives" | "completion"> {
  giver: TileNpcReference;
  objectives: TileObjective[];
  currentObjective?: TileObjective;
  completion: TileCompletion;
  starts_at: number;
  ends_at: number;
}

export type QuestGroup = Quest | TileQuest;

export interface CreateQuestDTO extends Omit<Quest, "id"> {
  id?: string;
}

export interface UpdateQuestDTO extends Partial<Omit<Quest, "id">> {}

export function isTileQuest(quest: QuestGroup): quest is TileQuest {
  return "starts_at" in quest && "ends_at" in quest;
}

export function isTileTalkObjective(
  objective: Objective | TileObjective
): objective is TileTalkObjective {
  return objective.type === "talk" && "x" in objective && "y" in objective;
}

export function isTileExploreObjective(
  objective: Objective | TileObjective
): objective is TileExploreObjective {
  return objective.type === "explore" && "x" in objective && "y" in objective;
}

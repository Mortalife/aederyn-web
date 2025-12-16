export interface NPC {
  entity_id: string;
  name: string;
  backstory: string;
  personalMission: string;
  hopes: string;
  fears: string;
  relationships: Record<string, string[]>;
}

export interface CreateNPCDTO extends Omit<NPC, 'entity_id'> {
  entity_id?: string;
}

export interface UpdateNPCDTO extends Partial<Omit<NPC, 'entity_id'>> {}

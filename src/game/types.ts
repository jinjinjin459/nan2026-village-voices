export type ResidentId = "lulu" | "moka" | "dubu";
export type FacilityId = "park" | "arcade" | "shop";
export type Phase = "before" | "after";
export type Emotion = "neutral" | "happy" | "annoyed" | "worried";
export type RelationshipKey = "lulu:moka" | "lulu:dubu" | "moka:dubu";

export type Topic =
  | "shared_space"
  | "quiet_space"
  | "relationship_lulu_moka"
  | "park"
  | "arcade"
  | "shop"
  | "village_change";

export interface ResidentProfile {
  id: ResidentId;
  name: string;
  species: string;
  role: string;
  personality: string[];
  speechStyle: string;
  desire: string;
  accent: string;
  accentSoft: string;
  questions: string[];
}

export interface FacilityDefinition {
  id: FacilityId;
  name: string;
  icon: string;
  eyebrow: string;
  description: string;
  flavor: string;
}

export interface VillageState {
  phase: Phase;
  facilities: Record<"cafe" | FacilityId, boolean>;
  happiness: Record<ResidentId, number>;
  relationships: Record<RelationshipKey, number>;
  recentEvents: string[];
  talkedBefore: Record<ResidentId, boolean>;
  talkedAfter: Record<ResidentId, boolean>;
  selectedFacility: FacilityId | null;
}

export interface DialoguePayload {
  residentId: ResidentId;
  question: string;
  state: VillageState;
}

export interface DialogueResult {
  dialogue: string;
  emotion: Emotion;
  topic: Topic;
  source: "ai" | "fallback";
}

export interface Clue {
  id: string;
  residentId: ResidentId;
  icon: string;
  text: string;
  phase: Phase;
}

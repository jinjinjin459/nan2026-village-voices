export type NpcId = "lulu" | "moka" | "dubu";

export type BuildableId = "path" | "flower" | "tree" | "bench" | "lamp" | "pond";

export type ResourceKey = "wood" | "stone" | "coins";

export type Direction = "up" | "down" | "left" | "right";

export type LocationId = "world" | "home";

export type TimePhase = "day" | "night";

export interface Point {
  x: number;
  y: number;
}

export interface Resources {
  wood: number;
  stone: number;
  coins: number;
}

export interface PlacedItem extends Point {
  id: string;
  type: BuildableId;
}

export type TreeState = "standing" | "falling" | "stump";

export interface TreeNode extends Point {
  id: string;
  state: TreeState;
  hits: number;
  choppedDay: number | null;
}

export interface NpcMemory {
  id: string;
  text: string;
  day: number;
  source: "player" | "event";
}

export type VillageEventType = "fishing_festival" | "garden_party" | "campfire_night";

export interface VillageEventRequirements {
  fish: number;
  flower: number;
  lamp: number;
}

export interface VillageEvent {
  id: string;
  type: VillageEventType;
  title: string;
  description: string;
  createdDay: number;
  status: "active" | "complete";
  requirements: VillageEventRequirements;
}

export interface VillageMindState {
  relationships: Record<NpcId, number>;
  memories: Record<NpcId, NpcMemory[]>;
  villageLog: string[];
  activeEvent: VillageEvent | null;
  provider: "luna" | "local";
}

export interface AiTurn {
  dialogue: string;
  emotion: "neutral" | "happy" | "curious" | "worried";
  memory: string;
  relationshipDelta: number;
  action: "remember" | "plan_event" | "share_rumor";
  eventType: VillageEventType | "none";
  eventTitle: string;
  eventDescription: string;
  requirements: VillageEventRequirements;
  provider: "luna" | "local";
}

export type QuestStage =
  | "talk-lulu"
  | "place-flower"
  | "talk-moka"
  | "visit-fishing"
  | "catch-fish"
  | "complete";

export interface PixelSave {
  version: 3;
  day: number;
  phase: TimePhase;
  phaseStartedAt: number;
  location: LocationId;
  player: Point;
  direction: Direction;
  resources: Resources;
  placements: PlacedItem[];
  trees: TreeNode[];
  mind: VillageMindState;
  talkCounts: Record<NpcId, number>;
  fishCaught: number;
  questStage: QuestStage;
}

export interface NpcWaypoint extends Point {
  label: string;
}

export interface NpcDefinition extends Point {
  id: NpcId;
  name: string;
  role: string;
  personality: string;
  speed: number;
  lines: string[];
  dayRoute: NpcWaypoint[];
  nightRoute: NpcWaypoint[];
}

export interface NpcRuntime extends Point {
  id: NpcId;
  direction: Direction;
  routeIndex: number;
  activity: "walking" | "resting" | "chatting";
  goal: string;
  bubble: string | null;
  waitUntil: number;
  chatUntil: number;
  socialCooldownUntil: number;
}

export interface BuildableDefinition {
  id: BuildableId;
  name: string;
  description: string;
  cost: Partial<Resources>;
  width: number;
  height: number;
  solid: boolean;
  atlasColumn: 0 | 1 | 2;
  atlasRow: 0 | 1;
}

export type FishingReward = "silver" | "carp" | "bass" | "treasure";

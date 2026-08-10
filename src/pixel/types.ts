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

export type QuestStage =
  | "talk-lulu"
  | "place-flower"
  | "talk-moka"
  | "visit-fishing"
  | "catch-fish"
  | "complete";

export interface PixelSave {
  version: 2;
  day: number;
  phase: TimePhase;
  phaseStartedAt: number;
  location: LocationId;
  player: Point;
  direction: Direction;
  resources: Resources;
  placements: PlacedItem[];
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

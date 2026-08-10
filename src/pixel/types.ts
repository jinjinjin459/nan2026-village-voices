export type NpcId = "lulu" | "moka" | "dubu";

export type BuildableId = "path" | "flower" | "tree" | "bench" | "lamp" | "pond";

export type ResourceKey = "wood" | "stone" | "coins";

export type Direction = "up" | "down" | "left" | "right";

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

export type QuestStage = "talk-lulu" | "place-flower" | "talk-moka" | "complete";

export interface PixelSave {
  version: 1;
  day: number;
  player: Point;
  direction: Direction;
  resources: Resources;
  placements: PlacedItem[];
  talkCounts: Record<NpcId, number>;
  questStage: QuestStage;
}

export interface NpcDefinition extends Point {
  id: NpcId;
  name: string;
  role: string;
  lines: string[];
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

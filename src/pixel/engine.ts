import {
  BUILDABLES,
  HOME_HEIGHT,
  HOME_WIDTH,
  NPCS,
  TIME_PHASE_MS,
  WORLD_HEIGHT,
  WORLD_START,
  WORLD_WIDTH,
  createInitialSave,
} from "./data";
import type {
  BuildableId,
  LocationId,
  NpcId,
  PixelSave,
  PlacedItem,
  Point,
  ResourceKey,
  Resources,
} from "./types";

export const PIXEL_SAVE_KEY = "village-voices-pixel-v2";
export const LEGACY_PIXEL_SAVE_KEY = "village-voices-pixel-v1";

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

const WORLD_BLOCKERS: Rect[] = [
  // Fishing lake. The horizontal dock at y 570-720 remains walkable.
  { x: 0, y: 300, width: 805, height: 255 },
  { x: 420, y: 555, width: 385, height: 180 },
  { x: 0, y: 735, width: 805, height: 230 },
  // River; the bridge at y 570-735 is the only crossing.
  { x: 820, y: 0, width: 300, height: 565 },
  { x: 820, y: 735, width: 300, height: 630 },
  // Buildings and fixed structures.
  { x: 60, y: 185, width: 275, height: 270 },
  { x: 1135, y: 55, width: 340, height: 330 },
  { x: 1500, y: 150, width: 205, height: 205 },
  { x: 1770, y: 120, width: 278, height: 545 },
  { x: 390, y: 135, width: 220, height: 115 },
  // Outer forest boundary.
  { x: 0, y: 0, width: WORLD_WIDTH, height: 38 },
  { x: 0, y: WORLD_HEIGHT - 42, width: WORLD_WIDTH, height: 42 },
  { x: 0, y: 0, width: 38, height: WORLD_HEIGHT },
  { x: WORLD_WIDTH - 38, y: 0, width: 38, height: WORLD_HEIGHT },
];

const HOME_BLOCKERS: Rect[] = [
  { x: 0, y: 0, width: HOME_WIDTH, height: 58 },
  { x: 0, y: HOME_HEIGHT - 42, width: 500, height: 42 },
  { x: 700, y: HOME_HEIGHT - 42, width: 500, height: 42 },
  { x: 0, y: 0, width: 48, height: HOME_HEIGHT },
  { x: HOME_WIDTH - 48, y: 0, width: 48, height: HOME_HEIGHT },
  { x: 70, y: 90, width: 235, height: 360 },
  { x: 500, y: 60, width: 260, height: 205 },
  { x: 765, y: 55, width: 205, height: 220 },
  { x: 865, y: 300, width: 265, height: 340 },
  { x: 75, y: 490, width: 210, height: 175 },
];

const PLAYER_RADIUS = 24;

function isFinitePoint(value: unknown): value is Point {
  if (!value || typeof value !== "object") return false;
  const point = value as Point;
  return Number.isFinite(point.x) && Number.isFinite(point.y);
}

function clampResource(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, Math.min(99999, Math.trunc(value)))
    : fallback;
}

function isBuildableId(value: unknown): value is BuildableId {
  return typeof value === "string" && value in BUILDABLES;
}

function parsePlacements(value: unknown): PlacedItem[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is PlacedItem =>
    Boolean(
      item &&
        typeof item.id === "string" &&
        isBuildableId(item.type) &&
        Number.isFinite(item.x) &&
        Number.isFinite(item.y),
    ),
  ).slice(0, 240);
}

function migrateLegacySave(raw: string, now: number): PixelSave {
  const fallback = createInitialSave(now);
  try {
    const legacy = JSON.parse(raw) as Partial<PixelSave> & { version?: number };
    const placements = parsePlacements(legacy.placements).map((item) => ({
      ...item,
      id: `migrated-${item.id}`,
      x: Math.min(WORLD_WIDTH - 80, item.x + 650),
      y: Math.min(WORLD_HEIGHT - 80, item.y + 120),
    }));
    return {
      ...fallback,
      day: typeof legacy.day === "number" ? Math.max(1, Math.trunc(legacy.day)) : 1,
      resources: {
        wood: clampResource(legacy.resources?.wood, fallback.resources.wood),
        stone: clampResource(legacy.resources?.stone, fallback.resources.stone),
        coins: clampResource(legacy.resources?.coins, fallback.resources.coins),
      },
      placements,
      talkCounts: {
        lulu: clampResource(legacy.talkCounts?.lulu, 0),
        moka: clampResource(legacy.talkCounts?.moka, 0),
        dubu: clampResource(legacy.talkCounts?.dubu, 0),
      },
      questStage: legacy.questStage === "complete" ? "visit-fishing" : fallback.questStage,
    };
  } catch {
    return fallback;
  }
}

export function loadPixelSave(now = Date.now()): PixelSave {
  const fallback = createInitialSave(now);
  try {
    const saved = window.localStorage.getItem(PIXEL_SAVE_KEY);
    if (!saved) {
      const legacy = window.localStorage.getItem(LEGACY_PIXEL_SAVE_KEY);
      return legacy ? migrateLegacySave(legacy, now) : fallback;
    }
    const parsed = JSON.parse(saved) as Partial<PixelSave>;
    const location: LocationId = parsed.location === "home" ? "home" : "world";
    const placements = parsePlacements(parsed.placements);
    const player = isFinitePoint(parsed.player) && canStandAt(parsed.player, placements, location)
      ? parsed.player
      : location === "home" ? { x: 600, y: 780 } : fallback.player;
    const questStages = ["talk-lulu", "place-flower", "talk-moka", "visit-fishing", "catch-fish", "complete"];
    const state: PixelSave = {
      ...fallback,
      day: typeof parsed.day === "number" ? Math.max(1, Math.trunc(parsed.day)) : 1,
      phase: parsed.phase === "night" ? "night" : "day",
      phaseStartedAt: typeof parsed.phaseStartedAt === "number" && Number.isFinite(parsed.phaseStartedAt)
        ? parsed.phaseStartedAt
        : now,
      location,
      player,
      direction: ["up", "down", "left", "right"].includes(parsed.direction || "")
        ? parsed.direction!
        : "down",
      resources: {
        wood: clampResource(parsed.resources?.wood, fallback.resources.wood),
        stone: clampResource(parsed.resources?.stone, fallback.resources.stone),
        coins: clampResource(parsed.resources?.coins, fallback.resources.coins),
      },
      placements,
      talkCounts: {
        lulu: clampResource(parsed.talkCounts?.lulu, 0),
        moka: clampResource(parsed.talkCounts?.moka, 0),
        dubu: clampResource(parsed.talkCounts?.dubu, 0),
      },
      fishCaught: clampResource(parsed.fishCaught, 0),
      questStage: questStages.includes(parsed.questStage || "") ? parsed.questStage! : fallback.questStage,
    };
    return advanceTime(state, now);
  } catch {
    return fallback;
  }
}

export function savePixelState(state: PixelSave): void {
  window.localStorage.setItem(PIXEL_SAVE_KEY, JSON.stringify(state));
}

function pointInRect(point: Point, rect: Rect, radius = PLAYER_RADIUS): boolean {
  return (
    point.x + radius > rect.x &&
    point.x - radius < rect.x + rect.width &&
    point.y + radius > rect.y &&
    point.y - radius < rect.y + rect.height
  );
}

function placementRect(item: PlacedItem): Rect {
  const definition = BUILDABLES[item.type];
  return {
    x: item.x - definition.width * 0.3,
    y: item.y - definition.height * 0.15,
    width: definition.width * 0.6,
    height: definition.height * 0.45,
  };
}

export function canStandAt(point: Point, placements: PlacedItem[], location: LocationId = "world"): boolean {
  const blockers = location === "world" ? WORLD_BLOCKERS : HOME_BLOCKERS;
  if (blockers.some((rect) => pointInRect(point, rect))) return false;
  if (location === "home") return true;
  return !placements.some(
    (item) => BUILDABLES[item.type].solid && pointInRect(point, placementRect(item)),
  );
}

export function movePlayer(
  current: Point,
  delta: Point,
  placements: PlacedItem[],
  location: LocationId = "world",
): Point {
  const xOnly = { x: current.x + delta.x, y: current.y };
  const yOnly = { x: current.x, y: current.y + delta.y };
  const both = { x: current.x + delta.x, y: current.y + delta.y };
  if (canStandAt(both, placements, location)) return both;
  if (canStandAt(xOnly, placements, location)) return xOnly;
  if (canStandAt(yOnly, placements, location)) return yOnly;
  return current;
}

export function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function nearestNpc(
  point: Point,
  positions: Partial<Record<NpcId, Point>> = NPCS,
  maximumDistance = 125,
): NpcId | null {
  let result: NpcId | null = null;
  let nearest = maximumDistance;
  for (const id of Object.keys(NPCS) as NpcId[]) {
    const position = positions[id];
    if (!position) continue;
    const nextDistance = distance(point, position);
    if (nextDistance < nearest) {
      nearest = nextDistance;
      result = id;
    }
  }
  return result;
}

export function advanceTime(state: PixelSave, now: number): PixelSave {
  const elapsed = Math.max(0, now - state.phaseStartedAt);
  const transitions = Math.floor(elapsed / TIME_PHASE_MS);
  if (transitions === 0) return state;
  let phase = state.phase;
  let day = state.day;
  for (let index = 0; index < transitions; index += 1) {
    if (phase === "day") phase = "night";
    else {
      phase = "day";
      day += 1;
    }
  }
  return {
    ...state,
    day,
    phase,
    phaseStartedAt: state.phaseStartedAt + transitions * TIME_PHASE_MS,
  };
}

export function sleepUntilMorning(state: PixelSave, now: number): PixelSave {
  return {
    ...state,
    day: state.day + 1,
    phase: "day",
    phaseStartedAt: now,
    resources: {
      wood: state.resources.wood + 2,
      stone: state.resources.stone + 1,
      coins: state.resources.coins,
    },
  };
}

export function canAfford(resources: Resources, buildableId: BuildableId): boolean {
  const cost = BUILDABLES[buildableId].cost;
  return (Object.keys(cost) as ResourceKey[]).every((key) => resources[key] >= (cost[key] || 0));
}

export function spendResources(resources: Resources, buildableId: BuildableId): Resources {
  const cost = BUILDABLES[buildableId].cost;
  return {
    wood: resources.wood - (cost.wood || 0),
    stone: resources.stone - (cost.stone || 0),
    coins: resources.coins - (cost.coins || 0),
  };
}

export function refundResources(resources: Resources, item: PlacedItem): Resources {
  const cost = BUILDABLES[item.type].cost;
  return {
    wood: resources.wood + Math.ceil((cost.wood || 0) / 2),
    stone: resources.stone + Math.ceil((cost.stone || 0) / 2),
    coins: resources.coins + Math.ceil((cost.coins || 0) / 2),
  };
}

export function canPlaceAt(point: Point, buildableId: BuildableId, placements: PlacedItem[]): boolean {
  const definition = BUILDABLES[buildableId];
  const margin = Math.max(definition.width, definition.height) * 0.42;
  if (point.x < margin || point.x > WORLD_WIDTH - margin || point.y < margin || point.y > WORLD_HEIGHT - margin) return false;
  if (WORLD_BLOCKERS.some((rect) => pointInRect(point, rect, margin * 0.45))) return false;
  return placements.every((item) => distance(point, item) > margin + 24);
}

export function makePlacement(type: BuildableId, point: Point): PlacedItem {
  const snap = type === "path" ? 40 : 20;
  return {
    id: `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    type,
    x: Math.round(point.x / snap) * snap,
    y: Math.round(point.y / snap) * snap,
  };
}

export function resetToWorld(state: PixelSave): PixelSave {
  return { ...state, location: "world", player: { x: 1295, y: 450 }, direction: "down" };
}

export function enterHome(state: PixelSave): PixelSave {
  return { ...state, location: "home", player: { x: 600, y: 780 }, direction: "up" };
}

export function safeWorldStart(state: PixelSave): PixelSave {
  return { ...state, location: "world", player: WORLD_START, direction: "down" };
}

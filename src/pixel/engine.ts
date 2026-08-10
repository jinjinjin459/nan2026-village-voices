import { BUILDABLES, NPCS, WORLD_HEIGHT, WORLD_WIDTH, createInitialSave } from "./data";
import type {
  BuildableId,
  NpcId,
  PixelSave,
  PlacedItem,
  Point,
  ResourceKey,
  Resources,
} from "./types";

export const PIXEL_SAVE_KEY = "village-voices-pixel-v1";

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

const STATIC_BLOCKERS: Rect[] = [
  { x: 40, y: 0, width: 205, height: 220 },
  { x: 70, y: 160, width: 285, height: 370 },
  { x: 195, y: 650, width: 205, height: 374 },
  { x: 305, y: 0, width: 320, height: 345 },
  { x: 765, y: 105, width: 190, height: 210 },
  { x: 1115, y: 90, width: 375, height: 510 },
  { x: 0, y: 0, width: 45, height: WORLD_HEIGHT },
  { x: WORLD_WIDTH - 45, y: 0, width: 45, height: WORLD_HEIGHT },
  { x: 0, y: 0, width: WORLD_WIDTH, height: 42 },
  { x: 0, y: WORLD_HEIGHT - 45, width: WORLD_WIDTH, height: 45 },
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

export function loadPixelSave(): PixelSave {
  const fallback = createInitialSave();
  try {
    const raw = window.localStorage.getItem(PIXEL_SAVE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<PixelSave>;
    const placements = Array.isArray(parsed.placements)
      ? parsed.placements.filter((item): item is PlacedItem =>
          Boolean(
            item &&
              typeof item.id === "string" &&
              item.type in BUILDABLES &&
              Number.isFinite(item.x) &&
              Number.isFinite(item.y),
          ),
        ).slice(0, 180)
      : [];
    const player = isFinitePoint(parsed.player) && canStandAt(parsed.player, placements)
      ? parsed.player
      : fallback.player;
    return {
      ...fallback,
      day: typeof parsed.day === "number" ? Math.max(1, Math.trunc(parsed.day)) : 1,
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
      questStage: ["talk-lulu", "place-flower", "talk-moka", "complete"].includes(
        parsed.questStage || "",
      )
        ? parsed.questStage!
        : fallback.questStage,
    };
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

export function canStandAt(point: Point, placements: PlacedItem[]): boolean {
  if (STATIC_BLOCKERS.some((rect) => pointInRect(point, rect))) return false;
  return !placements.some(
    (item) => BUILDABLES[item.type].solid && pointInRect(point, placementRect(item)),
  );
}

export function movePlayer(
  current: Point,
  delta: Point,
  placements: PlacedItem[],
): Point {
  const xOnly = { x: current.x + delta.x, y: current.y };
  const yOnly = { x: current.x, y: current.y + delta.y };
  const both = { x: current.x + delta.x, y: current.y + delta.y };
  if (canStandAt(both, placements)) return both;
  if (canStandAt(xOnly, placements)) return xOnly;
  if (canStandAt(yOnly, placements)) return yOnly;
  return current;
}

export function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function nearestNpc(point: Point, maximumDistance = 125): NpcId | null {
  let result: NpcId | null = null;
  let nearest = maximumDistance;
  for (const npc of Object.values(NPCS)) {
    const nextDistance = distance(point, npc);
    if (nextDistance < nearest) {
      nearest = nextDistance;
      result = npc.id;
    }
  }
  return result;
}

export function canAfford(resources: Resources, buildableId: BuildableId): boolean {
  const cost = BUILDABLES[buildableId].cost;
  return (Object.keys(cost) as ResourceKey[]).every(
    (key) => resources[key] >= (cost[key] || 0),
  );
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

export function canPlaceAt(
  point: Point,
  buildableId: BuildableId,
  placements: PlacedItem[],
): boolean {
  const definition = BUILDABLES[buildableId];
  const margin = Math.max(definition.width, definition.height) * 0.42;
  if (
    point.x < margin ||
    point.x > WORLD_WIDTH - margin ||
    point.y < margin ||
    point.y > WORLD_HEIGHT - margin
  ) return false;
  if (STATIC_BLOCKERS.some((rect) => pointInRect(point, rect, margin * 0.45))) return false;
  if (Object.values(NPCS).some((npc) => distance(point, npc) < margin + 42)) return false;
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

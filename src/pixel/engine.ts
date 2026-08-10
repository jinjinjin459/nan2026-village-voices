import {
  BUILDABLES,
  HOME_HEIGHT,
  HOME_WIDTH,
  NPCS,
  TIME_PHASE_MS,
  WORLD_HEIGHT,
  WORLD_START,
  WORLD_WIDTH,
  createInitialMind,
  createInitialSave,
  createInitialTrees,
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
  TreeNode,
  VillageEvent,
  VillageMindState,
} from "./types";

export const PIXEL_SAVE_KEY = "village-voices-pixel-v3";
export const V2_PIXEL_SAVE_KEY = "village-voices-pixel-v2";
export const LEGACY_PIXEL_SAVE_KEY = "village-voices-pixel-v1";

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

const WORLD_BOUNDARY_BLOCKERS: Rect[] = [
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

function parseTrees(value: unknown): TreeNode[] {
  if (!Array.isArray(value)) return createInitialTrees();
  const fallbackById = new Map(createInitialTrees().map((tree) => [tree.id, tree]));
  return value.flatMap((candidate) => {
    if (!candidate || typeof candidate !== "object") return [];
    const tree = candidate as Partial<TreeNode>;
    const fallback = typeof tree.id === "string" ? fallbackById.get(tree.id) : undefined;
    if (!fallback || !Number.isFinite(tree.x) || !Number.isFinite(tree.y)) return [];
    return [{
      ...fallback,
      x: tree.x!,
      y: tree.y!,
      state: tree.state === "stump" || tree.state === "falling" ? tree.state : "standing",
      hits: clampResource(tree.hits, 0) % 3,
      choppedDay: typeof tree.choppedDay === "number" ? Math.max(1, Math.trunc(tree.choppedDay)) : null,
    } satisfies TreeNode];
  });
}

function parseVillageEvent(value: unknown): VillageEvent | null {
  if (!value || typeof value !== "object") return null;
  const event = value as Partial<VillageEvent>;
  const types = ["fishing_festival", "garden_party", "campfire_night"];
  if (typeof event.id !== "string" || !types.includes(event.type || "") || typeof event.title !== "string" || typeof event.description !== "string") return null;
  return {
    id: event.id.slice(0, 80),
    type: event.type!,
    title: event.title.slice(0, 40),
    description: event.description.slice(0, 120),
    createdDay: typeof event.createdDay === "number" ? Math.max(1, Math.trunc(event.createdDay)) : 1,
    status: event.status === "complete" ? "complete" : "active",
    requirements: {
      fish: clampResource(event.requirements?.fish, 0),
      flower: clampResource(event.requirements?.flower, 0),
      lamp: clampResource(event.requirements?.lamp, 0),
    },
  };
}

function parseMind(value: unknown): VillageMindState {
  const fallback = createInitialMind();
  if (!value || typeof value !== "object") return fallback;
  const mind = value as Partial<VillageMindState>;
  const memories = Object.fromEntries((Object.keys(NPCS) as NpcId[]).map((id) => [id,
    Array.isArray(mind.memories?.[id]) ? mind.memories![id].filter((memory) =>
      memory && typeof memory.id === "string" && typeof memory.text === "string" && typeof memory.day === "number",
    ).slice(-8).map((memory) => ({ ...memory, text: memory.text.slice(0, 120) })) : [],
  ])) as VillageMindState["memories"];
  return {
    relationships: {
      lulu: clampResource(mind.relationships?.lulu, fallback.relationships.lulu),
      moka: clampResource(mind.relationships?.moka, fallback.relationships.moka),
      dubu: clampResource(mind.relationships?.dubu, fallback.relationships.dubu),
    },
    memories,
    villageLog: Array.isArray(mind.villageLog) ? mind.villageLog.filter((entry): entry is string => typeof entry === "string").slice(-12).map((entry) => entry.slice(0, 140)) : fallback.villageLog,
    activeEvent: parseVillageEvent(mind.activeEvent),
    provider: mind.provider === "luna" ? "luna" : "local",
  };
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
      const legacy = window.localStorage.getItem(V2_PIXEL_SAVE_KEY) || window.localStorage.getItem(LEGACY_PIXEL_SAVE_KEY);
      return legacy ? migrateLegacySave(legacy, now) : fallback;
    }
    const parsed = JSON.parse(saved) as Partial<PixelSave>;
    const location: LocationId = parsed.location === "home" ? "home" : "world";
    const placements = parsePlacements(parsed.placements);
    const trees = parseTrees(parsed.trees);
    const player = isFinitePoint(parsed.player) && canStandAt(parsed.player, placements, location, trees)
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
      trees,
      mind: parseMind(parsed.mind),
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

export function canStandAt(point: Point, placements: PlacedItem[], location: LocationId = "world", trees: TreeNode[] = []): boolean {
  const blockers = location === "world" ? WORLD_BOUNDARY_BLOCKERS : HOME_BLOCKERS;
  if (blockers.some((rect) => pointInRect(point, rect))) return false;
  if (location === "home") return true;
  if (trees.some((tree) => tree.state !== "stump" && distance(point, tree) < 62)) return false;
  return !placements.some(
    (item) => item.type === "tree" && pointInRect(point, placementRect(item)),
  );
}

export function movePlayer(
  current: Point,
  delta: Point,
  placements: PlacedItem[],
  location: LocationId = "world",
  trees: TreeNode[] = [],
): Point {
  const xOnly = { x: current.x + delta.x, y: current.y };
  const yOnly = { x: current.x, y: current.y + delta.y };
  const both = { x: current.x + delta.x, y: current.y + delta.y };
  if (canStandAt(both, placements, location, trees)) return both;
  if (canStandAt(xOnly, placements, location, trees)) return xOnly;
  if (canStandAt(yOnly, placements, location, trees)) return yOnly;
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
    trees: state.trees.map((tree) => tree.choppedDay !== null && day - tree.choppedDay >= 2
      ? { ...tree, state: "standing", hits: 0, choppedDay: null }
      : tree.state === "falling" ? { ...tree, state: "stump" } : tree),
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

export function canPlaceAt(point: Point, buildableId: BuildableId, placements: PlacedItem[], trees: TreeNode[] = []): boolean {
  const definition = BUILDABLES[buildableId];
  const margin = Math.max(definition.width, definition.height) * 0.42;
  if (point.x < margin || point.x > WORLD_WIDTH - margin || point.y < margin || point.y > WORLD_HEIGHT - margin) return false;
  if (WORLD_BOUNDARY_BLOCKERS.some((rect) => pointInRect(point, rect, margin * 0.45))) return false;
  if (trees.some((tree) => tree.state !== "stump" && distance(point, tree) < margin + 54)) return false;
  return placements.every((item) => distance(point, item) > margin + 24);
}

export function nearestHarvestTree(point: Point, trees: TreeNode[], maximumDistance = 145): TreeNode | null {
  let nearest: TreeNode | null = null;
  let nearestDistance = maximumDistance;
  for (const tree of trees) {
    if (tree.state !== "standing") continue;
    const nextDistance = distance(point, tree);
    if (nextDistance < nearestDistance) {
      nearest = tree;
      nearestDistance = nextDistance;
    }
  }
  return nearest;
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

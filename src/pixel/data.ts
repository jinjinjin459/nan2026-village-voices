import type {
  BuildableDefinition,
  BuildableId,
  FishingReward,
  LocationId,
  NpcDefinition,
  NpcId,
  PixelSave,
  Point,
  QuestStage,
  TreeNode,
  VillageMindState,
} from "./types";

export const WORLD_WIDTH = 2048;
export const WORLD_HEIGHT = 1365;
export const HOME_WIDTH = 1200;
export const HOME_HEIGHT = 900;
export const TIME_PHASE_MS = 5 * 60 * 1000;

export const WORLD_START: Point = { x: 1450, y: 650 };
export const HOME_START: Point = { x: 600, y: 780 };
export const HOUSE_DOOR: Point = { x: 1295, y: 405 };
export const HOME_EXIT: Point = { x: 600, y: 815 };
export const BED_POINT: Point = { x: 305, y: 300 };
export const FISHING_SPOT: Point = { x: 205, y: 665 };

const HARVEST_TREE_POSITIONS: Array<Point & { id: string }> = [
  { id: "oak-meadow", x: 1450, y: 910 },
  { id: "oak-orchard", x: 1660, y: 920 },
  { id: "oak-east", x: 1850, y: 800 },
  { id: "oak-south-east", x: 1780, y: 1110 },
  { id: "oak-river", x: 1210, y: 1010 },
  { id: "oak-south", x: 980, y: 1110 },
  { id: "oak-west-path", x: 720, y: 1040 },
  { id: "oak-west", x: 500, y: 1140 },
  { id: "oak-lakeside", x: 360, y: 1010 },
];

export function createInitialTrees(): TreeNode[] {
  return HARVEST_TREE_POSITIONS.map((tree) => ({ ...tree, state: "standing", hits: 0, choppedDay: null }));
}

export function createInitialMind(): VillageMindState {
  return {
    relationships: { lulu: 20, moka: 10, dubu: 25 },
    memories: { lulu: [], moka: [], dubu: [] },
    villageLog: ["새로운 주민이 마을에 도착했다."],
    activeEvent: null,
    provider: "local",
  };
}

export const SCENE_SIZE: Record<LocationId, { width: number; height: number }> = {
  world: { width: WORLD_WIDTH, height: WORLD_HEIGHT },
  home: { width: HOME_WIDTH, height: HOME_HEIGHT },
};

export const NPCS: Record<NpcId, NpcDefinition> = {
  lulu: {
    id: "lulu",
    name: "루루",
    role: "햇살 같은 산책가",
    personality: "새로운 풍경을 먼저 발견하고 친구에게 알려주는 낙천적인 탐험가",
    x: 1460,
    y: 700,
    speed: 62,
    lines: [
      "다리 너머에 반짝이는 호수가 생겼어! 같이 달려가 볼래?",
      "아침에는 꽃밭을 돌고, 오후에는 낚시터까지 산책하는 게 내 일과야!",
      "모카도 낚시할 때는 꽤 신나 보여. 티를 안 내서 그렇지!",
    ],
    dayRoute: [
      { x: 1460, y: 700, label: "광장에서 친구를 찾는 중" },
      { x: 1710, y: 790, label: "꽃밭을 산책하는 중" },
      { x: 1570, y: 570, label: "분수 소리를 듣는 중" },
      { x: 1260, y: 690, label: "다리 쪽을 구경하는 중" },
    ],
    nightRoute: [
      { x: 1450, y: 560, label: "밝은 가로등을 따라 걷는 중" },
      { x: 1300, y: 470, label: "집으로 돌아갈 준비 중" },
      { x: 1580, y: 600, label: "저녁 인사를 나누는 중" },
    ],
  },
  moka: {
    id: "moka",
    name: "모카",
    role: "조용한 낚시 애호가",
    personality: "혼자 있는 시간을 좋아하지만 마음에 든 장소는 은근히 함께 나누는 관찰자",
    x: 1510,
    y: 805,
    speed: 48,
    lines: [
      "낚시터 끝 부두가 조용해서 마음에 들어. 물고기가 물면 바로 당겨야 해.",
      "두부가 잡은 물고기마다 이름을 붙이고 있어… 말리진 않았어.",
      "밤 호수는 예쁘지만 늦기 전에 집에 들어가. 감기 걸리면 귀찮으니까.",
    ],
    dayRoute: [
      { x: 1510, y: 805, label: "벤치에서 호수를 생각하는 중" },
      { x: 1370, y: 700, label: "다리로 향하는 중" },
      { x: 1110, y: 665, label: "다리를 건너는 중" },
      { x: 840, y: 590, label: "낚시터 길을 걷는 중" },
      { x: 620, y: 360, label: "물고기 표지판을 확인하는 중" },
      { x: 390, y: 410, label: "낚시 준비를 하는 중" },
      { x: 230, y: 650, label: "부두에서 낚시하는 중" },
      { x: 390, y: 410, label: "마을로 돌아가는 중" },
      { x: 840, y: 590, label: "다리로 돌아가는 중" },
      { x: 1110, y: 665, label: "다리를 건너는 중" },
    ],
    nightRoute: [
      { x: 1390, y: 750, label: "조용한 벤치를 찾는 중" },
      { x: 1305, y: 470, label: "집 불빛을 바라보는 중" },
      { x: 1500, y: 650, label: "저녁 산책 중" },
    ],
  },
  dubu: {
    id: "dubu",
    name: "두부",
    role: "마을의 다정한 중재자",
    personality: "주민들의 기분과 동선을 살피고 자연스럽게 만남을 만드는 다정한 연결자",
    x: 1580,
    y: 820,
    speed: 54,
    lines: [
      "모카와 루루가 어디 있는지 늘 살펴봐. 둘이 마주치면 재미있는 일이 생기거든!",
      "낚시터 캠프파이어 옆에 앉으면 다들 평소보다 솔직해지는 것 같아.",
      "밤이 되면 주민들도 집 가까이 돌아와. 너도 침대에서 푹 쉬어!",
    ],
    dayRoute: [
      { x: 1580, y: 820, label: "모카에게 인사하는 중" },
      { x: 1500, y: 790, label: "친구들의 기분을 살피는 중" },
      { x: 1650, y: 590, label: "광장을 정리하는 중" },
      { x: 1470, y: 700, label: "루루를 만나러 가는 중" },
      { x: 1350, y: 850, label: "마을 산책 중" },
    ],
    nightRoute: [
      { x: 1500, y: 650, label: "모두에게 저녁 인사를 하는 중" },
      { x: 1360, y: 520, label: "집 주변을 살피는 중" },
      { x: 1580, y: 720, label: "마지막 산책 중" },
    ],
  },
};

export const BUILDABLES: Record<BuildableId, BuildableDefinition> = {
  path: { id: "path", name: "흙길", description: "걷기 좋은 작은 길", cost: { stone: 1 }, width: 88, height: 78, solid: false, atlasColumn: 0, atlasRow: 0 },
  flower: { id: "flower", name: "들꽃", description: "마을을 환하게 만드는 꽃밭", cost: { coins: 10 }, width: 82, height: 70, solid: false, atlasColumn: 1, atlasRow: 0 },
  tree: { id: "tree", name: "어린나무", description: "시원한 그늘을 만드는 나무", cost: { wood: 4, coins: 15 }, width: 118, height: 128, solid: true, atlasColumn: 2, atlasRow: 0 },
  bench: { id: "bench", name: "나무 벤치", description: "주민들이 쉬어 가는 자리", cost: { wood: 6, coins: 20 }, width: 126, height: 84, solid: true, atlasColumn: 0, atlasRow: 1 },
  lamp: { id: "lamp", name: "가로등", description: "저녁길을 밝히는 등불", cost: { stone: 3, coins: 25 }, width: 76, height: 122, solid: true, atlasColumn: 1, atlasRow: 1 },
  pond: { id: "pond", name: "작은 연못", description: "개구리도 찾아오는 쉼터", cost: { stone: 8, coins: 40 }, width: 150, height: 112, solid: true, atlasColumn: 2, atlasRow: 1 },
};

export const BUILDABLE_ORDER = Object.keys(BUILDABLES) as BuildableId[];

export const QUEST_COPY: Record<QuestStage, { title: string; detail: string }> = {
  "talk-lulu": { title: "루루에게 말을 걸어보자", detail: "가까이 다가가 E키를 눌러요." },
  "place-flower": { title: "마을에 들꽃을 심어보자", detail: "가꾸기에서 들꽃을 고르고 빈 땅을 눌러요." },
  "talk-moka": { title: "모카에게 새 풍경을 물어보자", detail: "주민들은 자신의 일과에 따라 이동해요." },
  "visit-fishing": { title: "다리 건너 낚시터를 찾아가자", detail: "서쪽 다리를 건너 호숫가 부두로 가요." },
  "catch-fish": { title: "부두 끝에서 물고기를 잡아보자", detail: "낚시 포인트 가까이에서 E키를 눌러요." },
  complete: { title: "나만의 마을 생활을 즐겨보자", detail: "낚시하고, 주민을 만나고, 집에서 잠들 수 있어요." },
};

export const FISH_REWARDS: Record<FishingReward, { name: string; coins: number; atlasColumn: 0 | 1 | 2; atlasRow: 0 | 1 }> = {
  silver: { name: "은빛 피라미", coins: 8, atlasColumn: 2, atlasRow: 0 },
  carp: { name: "황금 잉어", coins: 16, atlasColumn: 0, atlasRow: 1 },
  bass: { name: "큰입 배스", coins: 24, atlasColumn: 1, atlasRow: 1 },
  treasure: { name: "낡은 보물상자", coins: 50, atlasColumn: 2, atlasRow: 1 },
};

export function createInitialSave(now = Date.now()): PixelSave {
  return {
    version: 3,
    day: 1,
    phase: "day",
    phaseStartedAt: now,
    location: "world",
    player: WORLD_START,
    direction: "down",
    resources: { wood: 20, stone: 12, coins: 150 },
    placements: [],
    trees: createInitialTrees(),
    mind: createInitialMind(),
    talkCounts: { lulu: 0, moka: 0, dubu: 0 },
    fishCaught: 0,
    questStage: "talk-lulu",
  };
}

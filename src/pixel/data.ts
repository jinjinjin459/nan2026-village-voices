import type {
  BuildableDefinition,
  BuildableId,
  NpcDefinition,
  NpcId,
  PixelSave,
  QuestStage,
} from "./types";

export const WORLD_WIDTH = 1536;
export const WORLD_HEIGHT = 1024;

export const NPCS: Record<NpcId, NpcDefinition> = {
  lulu: {
    id: "lulu",
    name: "루루",
    role: "햇살 같은 산책가",
    x: 690,
    y: 500,
    lines: [
      "안녕! 이 넓은 공터에 꽃이 피면 산책할 맛이 날 것 같아.",
      "모카도 꽃 향기는 좋아해. 너무 시끄러운 건 싫어하지만 말이야.",
      "네가 꾸민 마을을 매일 한 바퀴씩 돌아볼 거야!",
    ],
  },
  moka: {
    id: "moka",
    name: "모카",
    role: "조용한 카페 단골",
    x: 985,
    y: 535,
    lines: [
      "길은 반듯하지 않아도 돼. 걷다가 잠깐 멈출 곳만 있으면 좋겠어.",
      "꽃을 심었네. 루루가 종일 자랑하던데… 나쁘지 않아.",
      "연못 옆에 벤치 하나쯤 두면, 가끔 앉아 있을지도 몰라.",
    ],
  },
  dubu: {
    id: "dubu",
    name: "두부",
    role: "마을의 다정한 중재자",
    x: 845,
    y: 680,
    lines: [
      "마을은 한 번에 완성되지 않아. 마음에 드는 자리부터 천천히 꾸며보자.",
      "나무와 벤치를 가까이 두면 주민들이 자연스럽게 모일 거야.",
      "오늘 만든 풍경은 자동으로 기록되고 있어. 안심하고 돌아다녀!",
    ],
  },
};

export const BUILDABLES: Record<BuildableId, BuildableDefinition> = {
  path: {
    id: "path",
    name: "흙길",
    description: "걷기 좋은 작은 길",
    cost: { stone: 1 },
    width: 80,
    height: 72,
    solid: false,
    atlasColumn: 0,
    atlasRow: 0,
  },
  flower: {
    id: "flower",
    name: "들꽃",
    description: "마을을 환하게 만드는 꽃밭",
    cost: { coins: 10 },
    width: 76,
    height: 66,
    solid: false,
    atlasColumn: 1,
    atlasRow: 0,
  },
  tree: {
    id: "tree",
    name: "어린나무",
    description: "시원한 그늘을 만드는 나무",
    cost: { wood: 4, coins: 15 },
    width: 108,
    height: 118,
    solid: true,
    atlasColumn: 2,
    atlasRow: 0,
  },
  bench: {
    id: "bench",
    name: "나무 벤치",
    description: "주민들이 쉬어 가는 자리",
    cost: { wood: 6, coins: 20 },
    width: 116,
    height: 78,
    solid: true,
    atlasColumn: 0,
    atlasRow: 1,
  },
  lamp: {
    id: "lamp",
    name: "가로등",
    description: "저녁길을 밝히는 등불",
    cost: { stone: 3, coins: 25 },
    width: 70,
    height: 112,
    solid: true,
    atlasColumn: 1,
    atlasRow: 1,
  },
  pond: {
    id: "pond",
    name: "작은 연못",
    description: "개구리도 찾아오는 쉼터",
    cost: { stone: 8, coins: 40 },
    width: 140,
    height: 104,
    solid: true,
    atlasColumn: 2,
    atlasRow: 1,
  },
};

export const BUILDABLE_ORDER = Object.keys(BUILDABLES) as BuildableId[];

export const QUEST_COPY: Record<QuestStage, { title: string; detail: string }> = {
  "talk-lulu": {
    title: "루루에게 말을 걸어보자",
    detail: "가까이 다가가 E키를 눌러요.",
  },
  "place-flower": {
    title: "마을에 들꽃을 심어보자",
    detail: "가꾸기에서 들꽃을 고르고 빈 땅을 눌러요.",
  },
  "talk-moka": {
    title: "모카에게 새 풍경을 물어보자",
    detail: "모카는 광장 오른쪽에 있어요.",
  },
  complete: {
    title: "나만의 마을을 가꿔보자",
    detail: "배치와 철거는 언제든 자동 저장돼요.",
  },
};

export function createInitialSave(): PixelSave {
  return {
    version: 1,
    day: 1,
    player: { x: 800, y: 565 },
    direction: "down",
    resources: { wood: 20, stone: 12, coins: 150 },
    placements: [],
    talkCounts: { lulu: 0, moka: 0, dubu: 0 },
    questStage: "talk-lulu",
  };
}

import type {
  Clue,
  DialogueResult,
  FacilityDefinition,
  FacilityId,
  ResidentId,
  ResidentProfile,
  VillageState,
  VillageStateSnapshot,
} from "./types";

export const RESIDENTS: Record<ResidentId, ResidentProfile> = {
  lulu: {
    id: "lulu",
    name: "루루",
    species: "토끼",
    role: "햇살 같은 산책가",
    personality: ["활발함", "사교적", "솔직함"],
    speechStyle: "밝고 적극적인 반말. 느낌표를 가끔 사용한다.",
    desire: "친구들과 몸을 움직이며 함께 놀고 싶다.",
    accent: "#e96f73",
    accentSoft: "#ffe1de",
    questions: ["요즘 마을은 어때?", "누구와 자주 놀아?", "새 장소가 생긴다면?"],
  },
  moka: {
    id: "moka",
    name: "모카",
    species: "고양이",
    role: "조용한 카페 단골",
    personality: ["무뚝뚝함", "자존심이 강함", "섬세함"],
    speechStyle: "짧고 시니컬한 반말. 속마음을 에둘러 말한다.",
    desire: "사람들과 너무 부딪히지 않고 편하게 쉬고 싶다.",
    accent: "#82635d",
    accentSoft: "#eadbd2",
    questions: ["요즘 마을은 어때?", "루루랑 무슨 일 있었어?", "어디서 쉬고 싶어?"],
  },
  dubu: {
    id: "dubu",
    name: "두부",
    species: "강아지",
    role: "마을의 다정한 중재자",
    personality: ["다정함", "눈치가 빠름", "중재자"],
    speechStyle: "부드럽고 조심스러운 반말. 다른 주민의 마음을 살핀다.",
    desire: "세 주민이 다시 자연스럽게 어울리길 바란다.",
    accent: "#d0933b",
    accentSoft: "#ffedc7",
    questions: ["요즘 마을 분위기는 어때?", "둘 사이가 왜 어색해?", "뭘 만들면 좋을까?"],
  },
};

export const FACILITIES: Record<FacilityId, FacilityDefinition> = {
  park: {
    id: "park",
    name: "느티나무 공원",
    icon: "tree",
    eyebrow: "함께 머무는 곳",
    description: "나무 그늘과 긴 벤치가 있는 열린 쉼터",
    flavor: "서로 다른 속도로 쉬어도, 같은 풍경을 나눌 수 있어요.",
  },
  arcade: {
    id: "arcade",
    name: "별빛 오락실",
    icon: "joystick",
    eyebrow: "신나게 노는 곳",
    description: "반짝이는 게임과 음악이 가득한 놀이 공간",
    flavor: "즐거움은 커지지만, 조용한 주민은 피곤할지도 몰라요.",
  },
  shop: {
    id: "shop",
    name: "마을 잡화점",
    icon: "bag",
    eyebrow: "새 물건을 만나는 곳",
    description: "작은 선물과 생활용품을 파는 아담한 가게",
    flavor: "생활은 편리해져도, 어색한 사이는 그대로일 수 있어요.",
  },
};

const residentIds: ResidentId[] = ["lulu", "moka", "dubu"];
const facilityIds: FacilityId[] = ["park", "arcade", "shop"];
const relationshipKeys: Array<keyof VillageState["relationships"]> = [
  "lulu:moka",
  "lulu:dubu",
  "moka:dubu",
];

const clampInteger = (value: unknown, fallback: number, minimum: number, maximum: number) => {
  const numeric = typeof value === "number" && Number.isFinite(value) ? value : fallback;
  return Math.max(minimum, Math.min(maximum, Math.trunc(numeric)));
};

const clampScore = (value: unknown, fallback: number) => clampInteger(value, fallback, 0, 100);

const isFacilityId = (value: unknown): value is FacilityId =>
  typeof value === "string" && facilityIds.includes(value as FacilityId);

function baseVillageState(): VillageState {
  return {
    day: 1,
    phase: "before",
    facilities: { cafe: true, park: false, arcade: false, shop: false },
    happiness: { lulu: 50, moka: 45, dubu: 60 },
    relationships: { "lulu:moka": 25, "lulu:dubu": 80, "moka:dubu": 55 },
    recentEvents: [
      "루루와 모카가 붐비는 카페 이용 문제로 말다툼했다.",
      "두부가 둘 사이를 걱정하고 있다.",
    ],
    talkedBefore: { lulu: false, moka: false, dubu: false },
    talkedAfter: { lulu: false, moka: false, dubu: false },
    selectedFacility: null,
    lastBuiltFacility: null,
    talkCounts: { lulu: 0, moka: 0, dubu: 0 },
  };
}

export function createInitialState(snapshot: VillageStateSnapshot | null = null): VillageState {
  const base = baseVillageState();
  if (!snapshot || typeof snapshot !== "object") return base;

  const selectedFacility = isFacilityId(snapshot.selectedFacility) ? snapshot.selectedFacility : null;
  const lastBuiltFacility = isFacilityId(snapshot.lastBuiltFacility)
    ? snapshot.lastBuiltFacility
    : selectedFacility;

  const facilities: VillageState["facilities"] = {
    cafe: typeof snapshot.facilities?.cafe === "boolean" ? snapshot.facilities.cafe : base.facilities.cafe,
    park: typeof snapshot.facilities?.park === "boolean" ? snapshot.facilities.park : base.facilities.park,
    arcade:
      typeof snapshot.facilities?.arcade === "boolean"
        ? snapshot.facilities.arcade
        : base.facilities.arcade,
    shop: typeof snapshot.facilities?.shop === "boolean" ? snapshot.facilities.shop : base.facilities.shop,
  };
  if (selectedFacility) facilities[selectedFacility] = true;
  if (lastBuiltFacility) facilities[lastBuiltFacility] = true;

  const talkedBefore = { ...base.talkedBefore };
  const talkedAfter = { ...base.talkedAfter };
  const happiness = { ...base.happiness };
  const talkCounts = { ...base.talkCounts };

  for (const residentId of residentIds) {
    talkedBefore[residentId] =
      typeof snapshot.talkedBefore?.[residentId] === "boolean"
        ? snapshot.talkedBefore[residentId]
        : base.talkedBefore[residentId];
    talkedAfter[residentId] =
      typeof snapshot.talkedAfter?.[residentId] === "boolean"
        ? snapshot.talkedAfter[residentId]
        : base.talkedAfter[residentId];
    happiness[residentId] = clampScore(snapshot.happiness?.[residentId], base.happiness[residentId]);
    const inferredTalkCount = Number(talkedBefore[residentId] || talkedAfter[residentId]);
    talkCounts[residentId] = clampInteger(
      snapshot.talkCounts?.[residentId],
      inferredTalkCount,
      0,
      Number.MAX_SAFE_INTEGER,
    );
  }

  const relationships = { ...base.relationships };
  for (const relationshipKey of relationshipKeys) {
    relationships[relationshipKey] = clampScore(
      snapshot.relationships?.[relationshipKey],
      base.relationships[relationshipKey],
    );
  }

  const recentEvents = Array.isArray(snapshot.recentEvents)
    ? snapshot.recentEvents.filter(
        (event): event is string => typeof event === "string" && event.trim().length > 0,
      ).slice(0, 12)
    : base.recentEvents;
  const phase = snapshot.phase === "after" && selectedFacility ? "after" : "before";

  return {
    day: clampInteger(snapshot.day, base.day, 1, Number.MAX_SAFE_INTEGER),
    phase,
    facilities,
    happiness,
    relationships,
    recentEvents,
    talkedBefore,
    talkedAfter,
    selectedFacility: phase === "after" ? selectedFacility : null,
    lastBuiltFacility,
    talkCounts,
  };
}

export const BEFORE_CLUES: Record<ResidentId, Clue> = {
  lulu: {
    id: "lulu-before",
    residentId: "lulu",
    icon: "spark",
    text: "친구들과 마음껏 어울릴 곳을 찾고 있다.",
    phase: "before",
  },
  moka: {
    id: "moka-before",
    residentId: "moka",
    icon: "leaf",
    text: "붐비는 카페 말고 편히 숨 돌릴 곳이 필요해 보인다.",
    phase: "before",
  },
  dubu: {
    id: "dubu-before",
    residentId: "dubu",
    icon: "heart",
    text: "루루와 모카가 자연스럽게 마주칠 계기를 바란다.",
    phase: "before",
  },
};

const beforeDialogue: Record<ResidentId, DialogueResult> = {
  lulu: {
    dialogue:
      "두부랑 걷는 건 좋은데, 요즘은 길 한 바퀴 돌고 나면 바로 헤어져. 여럿이 오래 머물 만한 곳이 있으면 좋을 텐데!",
    emotion: "worried",
    topic: "shared_space",
    source: "fallback",
  },
  moka: {
    dialogue:
      "카페에 모두 몰리니까 조용할 날이 없잖아. 루루랑 마주치면 또 시끄러워질 것 같고… 그냥 바람 쐴 곳이나 있었으면 좋겠어.",
    emotion: "annoyed",
    topic: "quiet_space",
    source: "fallback",
  },
  dubu: {
    dialogue:
      "둘 다 화가 났다기보다 편하게 다시 말 걸 계기가 없는 것 같아. 같은 곳에 있어도 각자 편할 수 있다면 자연히 풀리지 않을까?",
    emotion: "worried",
    topic: "relationship_lulu_moka",
    source: "fallback",
  },
};

const afterDialogue: Record<FacilityId, Record<ResidentId, DialogueResult>> = {
  park: {
    lulu: {
      dialogue:
        "느티나무 아래서 두부랑 놀다가 모카도 만났어! 처음엔 어색했는데, 같이 앉아 있으니 어느새 이야기가 나오더라.",
      emotion: "happy",
      topic: "park",
      source: "fallback",
    },
    moka: {
      dialogue:
        "공원, 생각보다 나쁘지 않더라. 루루도 나무 그늘에선 조금 조용했고… 어제는 꽤 오래 이야기했어.",
      emotion: "happy",
      topic: "relationship_lulu_moka",
      source: "fallback",
    },
    dubu: {
      dialogue:
        "어제 둘이 같은 벤치에 앉아 있는 걸 봤어! 억지로 화해시키지 않아도 함께 머물 곳이 생기니까 분위기가 달라졌어.",
      emotion: "happy",
      topic: "village_change",
      source: "fallback",
    },
  },
  arcade: {
    lulu: {
      dialogue:
        "오락실 최고야! 두부랑 기록 경쟁도 했어. 모카도 같이 하면 좋겠는데, 음악이 시끄럽다며 금방 가버렸어.",
      emotion: "happy",
      topic: "arcade",
      source: "fallback",
    },
    moka: {
      dialogue:
        "번쩍이고 시끄러운 곳을 왜 만든 건지 모르겠어. 이제 루루는 더 들떠 있고… 난 카페 구석이나 찾아야겠네.",
      emotion: "annoyed",
      topic: "arcade",
      source: "fallback",
    },
    dubu: {
      dialogue:
        "루루는 정말 즐거워 보여. 그런데 모카와 마주칠 기회는 오히려 줄었어. 모두에게 같은 즐거움은 아니었나 봐.",
      emotion: "worried",
      topic: "village_change",
      source: "fallback",
    },
  },
  shop: {
    lulu: {
      dialogue:
        "새 간식을 살 수 있는 건 좋아! 그래도 다 같이 시간을 보낼 곳이 생긴 건 아니라서, 저녁엔 또 각자 집으로 갔어.",
      emotion: "neutral",
      topic: "shop",
      source: "fallback",
    },
    moka: {
      dialogue:
        "필요한 걸 가까이서 살 수 있는 건 편하네. 하지만 카페가 붐비는 것도, 루루랑 어색한 것도 달라진 건 없어.",
      emotion: "neutral",
      topic: "shop",
      source: "fallback",
    },
    dubu: {
      dialogue:
        "마을은 조금 편리해졌어. 하지만 둘이 함께 웃는 모습은 아직 못 봤네. 우리가 문제를 살짝 비껴간 걸지도 몰라.",
      emotion: "worried",
      topic: "village_change",
      source: "fallback",
    },
  },
};

export function getFallbackDialogue(state: VillageState, residentId: ResidentId): DialogueResult {
  if (state.phase === "before" || !state.selectedFacility) {
    const latest = state.lastBuiltFacility;
    if (latest && state.day > 1) return afterDialogue[latest][residentId];
    return beforeDialogue[residentId];
  }
  return afterDialogue[state.selectedFacility][residentId];
}

export const RESULT_COPY: Record<FacilityId, { title: string; summary: string; verdict: string }> = {
  park: {
    title: "서로의 속도가 만나는 곳",
    summary: "쉬고 싶은 모카와 어울리고 싶은 루루가 같은 공간에서 자연스럽게 다시 말을 나눴습니다.",
    verdict: "주민들의 말 사이에 숨은 공통점을 정확히 읽었어요.",
  },
  arcade: {
    title: "한 사람의 즐거움, 다른 사람의 피로",
    summary: "루루의 행복은 크게 늘었지만 모카가 더 멀어지며 두 주민의 거리는 좁혀지지 않았습니다.",
    verdict: "가장 큰 목소리뿐 아니라 조용한 목소리도 함께 들어야 해요.",
  },
  shop: {
    title: "편리해졌지만 그대로인 사이",
    summary: "생활은 조금 편리해졌지만 함께 머물 장소가 없어 루루와 모카의 관계는 그대로입니다.",
    verdict: "표면의 불편보다 관계를 만든 원인을 살펴볼 필요가 있어요.",
  },
};

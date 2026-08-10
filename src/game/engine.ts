import type { FacilityId, ResidentId, VillageState } from "./types";
import { createInitialState } from "./data";

const outcomeByFacility = {
  park: {
    happiness: { lulu: 15, moka: 10, dubu: 10 },
    relationships: { "lulu:moka": 25, "lulu:dubu": 5, "moka:dubu": 5 },
    events: [
      "마을에 느티나무 공원이 생겼다.",
      "루루와 모카가 공원 벤치에서 오랜만에 이야기를 나눴다.",
    ],
  },
  arcade: {
    happiness: { lulu: 15, moka: -5, dubu: 5 },
    relationships: { "lulu:moka": -5, "lulu:dubu": 8, "moka:dubu": -2 },
    events: [
      "마을에 별빛 오락실이 생겼다.",
      "루루와 두부는 함께 게임했지만 모카는 소음 때문에 자리를 피했다.",
    ],
  },
  shop: {
    happiness: { lulu: 5, moka: 5, dubu: 5 },
    relationships: { "lulu:moka": 0, "lulu:dubu": 0, "moka:dubu": 0 },
    events: [
      "마을에 작은 잡화점이 생겼다.",
      "주민들의 생활은 편리해졌지만 함께 머무는 시간은 달라지지 않았다.",
    ],
  },
} satisfies Record<FacilityId, {
  happiness: Record<ResidentId, number>;
  relationships: Record<keyof VillageState["relationships"], number>;
  events: string[];
}>;

const MAX_RECENT_EVENTS = 12;

const clampScore = (value: number) => Math.max(0, Math.min(100, Math.round(value)));
const clampCount = (value: number) =>
  Math.max(0, Math.min(Number.MAX_SAFE_INTEGER, Math.trunc(value)));

export function markTalked(state: VillageState, residentId: ResidentId): VillageState {
  const current = createInitialState(state);
  const key = current.phase === "before" ? "talkedBefore" : "talkedAfter";
  return {
    ...current,
    [key]: { ...current[key], [residentId]: true },
    talkCounts: {
      ...current.talkCounts,
      [residentId]: clampCount(current.talkCounts[residentId] + 1),
    },
    happiness: {
      ...current.happiness,
      [residentId]: clampScore(current.happiness[residentId] + 1),
    },
  };
}

export function applyFacility(state: VillageState, facilityId: FacilityId): VillageState {
  if (!canDevelop(state) || state.facilities[facilityId]) return state;
  const current = createInitialState(state);
  const outcome = outcomeByFacility[facilityId];
  return {
    ...current,
    phase: "after",
    selectedFacility: facilityId,
    lastBuiltFacility: facilityId,
    facilities: { ...current.facilities, [facilityId]: true },
    happiness: {
      lulu: clampScore(current.happiness.lulu + outcome.happiness.lulu),
      moka: clampScore(current.happiness.moka + outcome.happiness.moka),
      dubu: clampScore(current.happiness.dubu + outcome.happiness.dubu),
    },
    relationships: {
      "lulu:moka": clampScore(
        current.relationships["lulu:moka"] + outcome.relationships["lulu:moka"],
      ),
      "lulu:dubu": clampScore(
        current.relationships["lulu:dubu"] + outcome.relationships["lulu:dubu"],
      ),
      "moka:dubu": clampScore(
        current.relationships["moka:dubu"] + outcome.relationships["moka:dubu"],
      ),
    },
    talkedAfter: { lulu: false, moka: false, dubu: false },
    recentEvents: [...outcome.events, ...current.recentEvents].slice(0, MAX_RECENT_EVENTS),
  };
}

export function countTalked(state: VillageState): number {
  const talked = state.phase === "before" ? state.talkedBefore : state.talkedAfter;
  return Object.values(talked).filter(Boolean).length;
}

export function canDevelop(state: VillageState): boolean {
  return (
    state.phase === "before" &&
    (["park", "arcade", "shop"] as FacilityId[]).some((id) => !state.facilities[id])
  );
}

export function canSeeResult(state: VillageState): boolean {
  return state.phase === "after";
}

export function startNextDay(state: VillageState): VillageState {
  const allFacilitiesBuilt = (["park", "arcade", "shop"] as FacilityId[]).every(
    (id) => state.facilities[id],
  );
  if (state.phase !== "after" && !allFacilitiesBuilt) return state;
  const current = createInitialState(state);
  const nextDay = Math.max(1, clampCount(current.day + 1));
  return {
    ...current,
    day: nextDay,
    phase: "before",
    selectedFacility: null,
    talkedBefore: { lulu: false, moka: false, dubu: false },
    talkedAfter: { lulu: false, moka: false, dubu: false },
    recentEvents: [`${nextDay}일 차 아침이 밝았다.`, ...current.recentEvents].slice(
      0,
      MAX_RECENT_EVENTS,
    ),
  };
}

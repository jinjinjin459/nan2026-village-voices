import type { FacilityId, ResidentId, VillageState } from "./types";

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

const clamp = (value: number) => Math.max(0, Math.min(100, value));

export function markTalked(state: VillageState, residentId: ResidentId): VillageState {
  const key = state.phase === "before" ? "talkedBefore" : "talkedAfter";
  return { ...state, [key]: { ...state[key], [residentId]: true } };
}

export function applyFacility(state: VillageState, facilityId: FacilityId): VillageState {
  if (state.phase !== "before" || state.selectedFacility) return state;
  const outcome = outcomeByFacility[facilityId];
  return {
    ...state,
    phase: "after",
    selectedFacility: facilityId,
    facilities: { ...state.facilities, [facilityId]: true },
    happiness: {
      lulu: clamp(state.happiness.lulu + outcome.happiness.lulu),
      moka: clamp(state.happiness.moka + outcome.happiness.moka),
      dubu: clamp(state.happiness.dubu + outcome.happiness.dubu),
    },
    relationships: {
      "lulu:moka": clamp(state.relationships["lulu:moka"] + outcome.relationships["lulu:moka"]),
      "lulu:dubu": clamp(state.relationships["lulu:dubu"] + outcome.relationships["lulu:dubu"]),
      "moka:dubu": clamp(state.relationships["moka:dubu"] + outcome.relationships["moka:dubu"]),
    },
    recentEvents: [...outcome.events],
  };
}

export function countTalked(state: VillageState): number {
  const talked = state.phase === "before" ? state.talkedBefore : state.talkedAfter;
  return Object.values(talked).filter(Boolean).length;
}

export function canDevelop(state: VillageState): boolean {
  return state.phase === "before" && countTalked(state) >= 2;
}

export function canSeeResult(state: VillageState): boolean {
  return state.phase === "after" && countTalked(state) >= 2;
}

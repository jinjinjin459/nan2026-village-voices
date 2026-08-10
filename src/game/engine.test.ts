import { describe, expect, it } from "vitest";
import { createInitialState } from "./data";
import {
  applyFacility,
  canDevelop,
  canSeeResult,
  markTalked,
  startNextDay,
} from "./engine";
import type { FacilityId, VillageState, VillageStateSnapshot } from "./types";

function buildAndAdvance(state: VillageState, facilityId: FacilityId): VillageState {
  return startNextDay(applyFacility(state, facilityId));
}

describe("village state reducer", () => {
  it("allows free construction without forcing a conversation order", () => {
    const state = createInitialState();
    expect(canDevelop(state)).toBe(true);
    expect(applyFacility(state, "park").facilities.park).toBe(true);
  });

  it("applies the park outcome deterministically and preserves earlier events", () => {
    const initial = createInitialState();
    const firstEvent = initial.recentEvents[0];
    const state = applyFacility(initial, "park");

    expect(state.phase).toBe("after");
    expect(state.facilities.park).toBe(true);
    expect(state.happiness).toEqual({ lulu: 65, moka: 55, dubu: 70 });
    expect(state.relationships["lulu:moka"]).toBe(50);
    expect(state.recentEvents[1]).toContain("이야기");
    expect(state.recentEvents).toContain(firstEvent);
  });

  it("keeps every facility outcome distinct", () => {
    const park = applyFacility(createInitialState(), "park");
    const arcade = applyFacility(createInitialState(), "arcade");
    const shop = applyFacility(createInitialState(), "shop");

    expect(park.relationships["lulu:moka"]).toBeGreaterThan(25);
    expect(arcade.relationships["lulu:moka"]).toBeLessThan(25);
    expect(shop.relationships["lulu:moka"]).toBe(25);
  });

  it("lets the player review or end the day immediately after construction", () => {
    const state = applyFacility(createInitialState(), "shop");
    expect(canSeeResult(state)).toBe(true);
    expect(startNextDay(state).day).toBe(2);
  });

  it.each([
    ["park", "arcade", "shop"],
    ["park", "shop", "arcade"],
    ["arcade", "park", "shop"],
    ["arcade", "shop", "park"],
    ["shop", "park", "arcade"],
    ["shop", "arcade", "park"],
  ] satisfies FacilityId[][])("builds all facilities cumulatively in order %j", (...order) => {
    let state = createInitialState();
    for (const facilityId of order) state = buildAndAdvance(state, facilityId);

    expect(state.day).toBe(4);
    expect(state.facilities).toEqual({ cafe: true, park: true, arcade: true, shop: true });
    expect(state.lastBuiltFacility).toBe(order[2]);
    expect(state.happiness).toEqual({ lulu: 85, moka: 55, dubu: 80 });
    expect(state.relationships).toEqual({
      "lulu:moka": 45,
      "lulu:dubu": 93,
      "moka:dubu": 58,
    });
    expect(canDevelop(state)).toBe(false);
  });

  it("does not rebuild an existing facility on a later day", () => {
    let state = buildAndAdvance(createInitialState(), "park");
    const attempted = applyFacility(state, "park");

    expect(attempted).toBe(state);
    expect(attempted.happiness).toEqual(state.happiness);
    expect(attempted.recentEvents).toEqual(state.recentEvents);
  });

  it("increments persistent talk counts and happiness while clamping both", () => {
    const state = createInitialState({
      happiness: { lulu: 100 },
      talkCounts: { lulu: Number.MAX_SAFE_INTEGER },
    });
    const talked = markTalked(state, "lulu");

    expect(talked.talkCounts.lulu).toBe(Number.MAX_SAFE_INTEGER);
    expect(talked.happiness.lulu).toBe(100);
    expect(talked.talkedBefore.lulu).toBe(true);
  });

  it("clamps facility outcomes to the zero-to-one-hundred score range", () => {
    let state = createInitialState({
      happiness: { lulu: 99, moka: 2, dubu: 100 },
      relationships: { "lulu:moka": 1, "lulu:dubu": 99, "moka:dubu": 1 },
    });
    state = applyFacility(state, "arcade");

    expect(state.happiness).toEqual({ lulu: 100, moka: 0, dubu: 100 });
    expect(state.relationships).toEqual({
      "lulu:moka": 0,
      "lulu:dubu": 100,
      "moka:dubu": 0,
    });
  });

  it("hydrates an older partial save with defaults and clamps unsafe values", () => {
    const legacySave: VillageStateSnapshot = {
      phase: "after",
      facilities: { park: false },
      happiness: { lulu: 140, moka: -20 },
      relationships: { "lulu:moka": 125 },
      recentEvents: ["예전 저장의 사건"],
      talkedBefore: { lulu: true },
      talkedAfter: { moka: true },
      selectedFacility: "park",
    };
    const state = createInitialState(legacySave);

    expect(state.day).toBe(1);
    expect(state.lastBuiltFacility).toBe("park");
    expect(state.facilities).toEqual({ cafe: true, park: true, arcade: false, shop: false });
    expect(state.happiness).toEqual({ lulu: 100, moka: 0, dubu: 60 });
    expect(state.relationships["lulu:moka"]).toBe(100);
    expect(state.talkCounts).toEqual({ lulu: 1, moka: 1, dubu: 0 });
    expect(state.recentEvents).toEqual(["예전 저장의 사건"]);
  });

  it("keeps construction history when advancing to the next day", () => {
    const initialEvent = createInitialState().recentEvents[0];
    const built = applyFacility(createInitialState(), "shop");
    const nextDay = startNextDay(built);

    expect(nextDay.day).toBe(2);
    expect(nextDay.phase).toBe("before");
    expect(nextDay.selectedFacility).toBeNull();
    expect(nextDay.lastBuiltFacility).toBe("shop");
    expect(nextDay.facilities.shop).toBe(true);
    expect(nextDay.recentEvents[0]).toContain("2일 차");
    expect(nextDay.recentEvents).toContain(initialEvent);
    expect(nextDay.talkedBefore).toEqual({ lulu: false, moka: false, dubu: false });
    expect(nextDay.talkedAfter).toEqual({ lulu: false, moka: false, dubu: false });
  });

  it("does not advance the day before any daily construction", () => {
    const state = createInitialState();
    expect(startNextDay(state)).toBe(state);
  });

  it("keeps the sandbox day loop running after every facility is complete", () => {
    let state = createInitialState();
    for (const facility of ["park", "arcade", "shop"] as FacilityId[]) {
      state = buildAndAdvance(state, facility);
    }
    const next = startNextDay(state);
    expect(next.day).toBe(5);
    expect(next.facilities).toEqual(state.facilities);
  });
});

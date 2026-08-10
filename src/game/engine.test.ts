import { describe, expect, it } from "vitest";
import { createInitialState } from "./data";
import { applyFacility, canDevelop, canSeeResult, markTalked } from "./engine";

describe("village state reducer", () => {
  it("unlocks development after listening to two residents", () => {
    let state = createInitialState();
    state = markTalked(state, "lulu");
    expect(canDevelop(state)).toBe(false);
    state = markTalked(state, "moka");
    expect(canDevelop(state)).toBe(true);
  });

  it("applies the park outcome deterministically", () => {
    const state = applyFacility(createInitialState(), "park");
    expect(state.phase).toBe("after");
    expect(state.facilities.park).toBe(true);
    expect(state.happiness).toEqual({ lulu: 65, moka: 55, dubu: 70 });
    expect(state.relationships["lulu:moka"]).toBe(50);
    expect(state.recentEvents[1]).toContain("이야기");
  });

  it("keeps every facility outcome distinct", () => {
    const park = applyFacility(createInitialState(), "park");
    const arcade = applyFacility(createInitialState(), "arcade");
    const shop = applyFacility(createInitialState(), "shop");
    expect(park.relationships["lulu:moka"]).toBeGreaterThan(25);
    expect(arcade.relationships["lulu:moka"]).toBeLessThan(25);
    expect(shop.relationships["lulu:moka"]).toBe(25);
  });

  it("reveals the result after two post-decision conversations", () => {
    let state = applyFacility(createInitialState(), "shop");
    state = markTalked(state, "moka");
    expect(canSeeResult(state)).toBe(false);
    state = markTalked(state, "dubu");
    expect(canSeeResult(state)).toBe(true);
  });
});

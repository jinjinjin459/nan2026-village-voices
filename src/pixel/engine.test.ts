import { describe, expect, it } from "vitest";
import { createInitialSave } from "./data";
import {
  canAfford,
  canPlaceAt,
  canStandAt,
  makePlacement,
  movePlayer,
  refundResources,
  spendResources,
} from "./engine";

describe("pixel village engine", () => {
  it("blocks the cottage and lets the player cross the central square", () => {
    expect(canStandAt({ x: 450, y: 180 }, [])).toBe(false);
    expect(canStandAt({ x: 760, y: 600 }, [])).toBe(true);
  });

  it("moves on free ground and stops at blocked terrain", () => {
    const moved = movePlayer({ x: 760, y: 600 }, { x: 20, y: 0 }, []);
    expect(moved.x).toBe(780);
    const blocked = movePlayer({ x: 650, y: 230 }, { x: -30, y: 0 }, []);
    expect(blocked.x).toBe(650);
  });

  it("spends the exact build cost", () => {
    const state = createInitialSave();
    expect(canAfford(state.resources, "bench")).toBe(true);
    expect(spendResources(state.resources, "bench")).toEqual({ wood: 14, stone: 12, coins: 130 });
  });

  it("refunds half of a removed item's cost rounded up", () => {
    const resources = { wood: 0, stone: 0, coins: 0 };
    const item = makePlacement("tree", { x: 760, y: 760 });
    expect(refundResources(resources, item)).toEqual({ wood: 2, stone: 0, coins: 8 });
  });

  it("allows decoration on open grass but not inside the river", () => {
    expect(canPlaceAt({ x: 760, y: 790 }, "flower", [])).toBe(true);
    expect(canPlaceAt({ x: 170, y: 350 }, "flower", [])).toBe(false);
  });

  it("keeps solid placed objects collidable", () => {
    const tree = makePlacement("tree", { x: 760, y: 790 });
    expect(canStandAt({ x: 760, y: 800 }, [tree])).toBe(false);
  });
});

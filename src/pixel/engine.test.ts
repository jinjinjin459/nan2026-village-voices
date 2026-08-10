import { describe, expect, it } from "vitest";
import { TIME_PHASE_MS, createInitialSave } from "./data";
import {
  advanceTime,
  canAfford,
  canPlaceAt,
  canStandAt,
  makePlacement,
  movePlayer,
  refundResources,
  spendResources,
  sleepUntilMorning,
} from "./engine";
import { createNpcRuntime, stepNpcSimulation } from "./npcSimulation";

describe("pixel village engine", () => {
  it("blocks the cottage and water but keeps the central bridge walkable", () => {
    expect(canStandAt({ x: 1295, y: 260 }, [])).toBe(false);
    expect(canStandAt({ x: 940, y: 350 }, [])).toBe(false);
    expect(canStandAt({ x: 1000, y: 650 }, [])).toBe(true);
  });

  it("moves on free ground and stops at blocked terrain", () => {
    const moved = movePlayer({ x: 1450, y: 700 }, { x: 20, y: 0 }, []);
    expect(moved.x).toBe(1470);
    const blocked = movePlayer({ x: 1135, y: 280 }, { x: 30, y: 0 }, []);
    expect(blocked.x).toBe(1135);
  });

  it("keeps a continuous walking route from the village to the fishing dock", () => {
    let player = { x: 1450, y: 650 };
    let guard = 0;
    while (player.x > 205 && guard < 500) {
      const next = movePlayer(player, { x: -Math.min(8, player.x - 205), y: 0 }, []);
      expect(next).not.toEqual(player);
      player = next;
      guard += 1;
    }

    expect(guard).toBeLessThan(500);
    expect(Math.hypot(player.x - 205, player.y - 650)).toBeLessThan(2);
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
    expect(canPlaceAt({ x: 1510, y: 900 }, "flower", [])).toBe(true);
    expect(canPlaceAt({ x: 950, y: 850 }, "flower", [])).toBe(false);
  });

  it("keeps solid placed objects collidable", () => {
    const tree = makePlacement("tree", { x: 1510, y: 900 });
    expect(canStandAt({ x: 1510, y: 910 }, [tree])).toBe(false);
  });

  it("switches day and night every five minutes", () => {
    const state = createInitialSave(1_000);
    const night = advanceTime(state, 1_000 + TIME_PHASE_MS);
    expect(night.phase).toBe("night");
    expect(night.day).toBe(1);
    const nextMorning = advanceTime(night, 1_000 + TIME_PHASE_MS * 2);
    expect(nextMorning.phase).toBe("day");
    expect(nextMorning.day).toBe(2);
  });

  it("sleeping advances to a fresh morning", () => {
    const state = { ...createInitialSave(1_000), phase: "night" as const };
    const rested = sleepUntilMorning(state, 5_000);
    expect(rested.day).toBe(2);
    expect(rested.phase).toBe("day");
    expect(rested.phaseStartedAt).toBe(5_000);
  });

  it("lets nearby residents stop and talk to each other", () => {
    const residents = createNpcRuntime();
    const next = stepNpcSimulation(residents, "day", [], 10_000, 0.1);
    expect([next.moka.activity, next.dubu.activity]).toContain("chatting");
    expect(Boolean(next.moka.bubble || next.dubu.bubble)).toBe(true);
  });
});

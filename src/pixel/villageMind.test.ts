import { describe, expect, it } from "vitest";
import { createInitialSave } from "./data";
import { makePlacement } from "./engine";
import { createLocalNpcTurn, createVillageEvent, isVillageEventReady } from "./villageMind";

describe("living village mind", () => {
  it("turns a free-form fishing festival suggestion into a playable event", () => {
    const turn = createLocalNpcTurn("lulu", "내일 낚시 축제를 열자");
    expect(turn.action).toBe("plan_event");
    expect(turn.eventType).toBe("fishing_festival");
    expect(turn.requirements).toEqual({ fish: 3, flower: 0, lamp: 1 });
    expect(turn.memory).toContain("낚시 축제");
  });

  it("remembers ordinary conversation without inventing an event", () => {
    const turn = createLocalNpcTurn("moka", "밤 호수가 정말 예쁘다");
    expect(turn.action).toBe("remember");
    expect(turn.eventType).toBe("none");
    expect(turn.dialogue).toContain("기억");
  });

  it("completes an event only when its real game requirements are met", () => {
    const state = createInitialSave();
    const turn = createLocalNpcTurn("dubu", "낚시 축제를 열자");
    const event = createVillageEvent(turn, state.day);
    const withEvent = { ...state, mind: { ...state.mind, activeEvent: event }, fishCaught: 3 };
    expect(isVillageEventReady(withEvent)).toBe(false);
    const withLamp = { ...withEvent, placements: [makePlacement("lamp", { x: 1400, y: 900 })] };
    expect(isVillageEventReady(withLamp)).toBe(true);
  });
});

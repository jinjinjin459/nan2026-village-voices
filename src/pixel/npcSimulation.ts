import { NPCS } from "./data";
import { canStandAt, distance } from "./engine";
import type { NpcId, NpcRuntime, PlacedItem, TimePhase, TreeNode } from "./types";

const SOCIAL_LINES: Record<string, [string, string]> = {
  "dubu:lulu": ["루루, 오늘은 어디까지 뛰어갈 거야?", "낚시터까지! 두부도 같이 가자!"],
  "dubu:moka": ["모카, 오늘 물고기는 좀 잡았어?", "한 마리. 조용히 기다리면 더 올 거야."],
  "lulu:moka": ["모카! 다리 건너 풍경 봤어?", "봤어. 네가 조용히 보면 더 예쁠걸."],
};

export function createNpcRuntime(): Record<NpcId, NpcRuntime> {
  return Object.fromEntries(
    (Object.keys(NPCS) as NpcId[]).map((id) => {
      const npc = NPCS[id];
      return [id, {
        id,
        x: npc.x,
        y: npc.y,
        direction: "down",
        routeIndex: 1,
        activity: "walking",
        goal: npc.dayRoute[1]?.label || npc.dayRoute[0].label,
        bubble: null,
        waitUntil: 0,
        chatUntil: 0,
        socialCooldownUntil: 0,
      } satisfies NpcRuntime];
    }),
  ) as Record<NpcId, NpcRuntime>;
}

function pairKey(first: NpcId, second: NpcId) {
  return [first, second].sort().join(":");
}

export function stepNpcSimulation(
  current: Record<NpcId, NpcRuntime>,
  phase: TimePhase,
  placements: PlacedItem[],
  trees: TreeNode[],
  now: number,
  elapsedSeconds: number,
): Record<NpcId, NpcRuntime> {
  const next = {} as Record<NpcId, NpcRuntime>;

  for (const id of Object.keys(NPCS) as NpcId[]) {
    const runtime = current[id];
    const definition = NPCS[id];
    const route = phase === "day" ? definition.dayRoute : definition.nightRoute;

    if (runtime.chatUntil > now) {
      next[id] = { ...runtime, activity: "chatting" };
      continue;
    }

    if (runtime.waitUntil > now) {
      next[id] = { ...runtime, bubble: null, activity: "resting" };
      continue;
    }

    const routeIndex = runtime.routeIndex % route.length;
    const target = route[routeIndex];
    const targetDistance = distance(runtime, target);
    if (targetDistance < 14) {
      const nextRouteIndex = (routeIndex + 1) % route.length;
      next[id] = {
        ...runtime,
        routeIndex: nextRouteIndex,
        waitUntil: now + 1200 + routeIndex * 180,
        activity: "resting",
        goal: route[nextRouteIndex].label,
        bubble: null,
      };
      continue;
    }

    const step = Math.min(targetDistance, definition.speed * elapsedSeconds);
    const dx = ((target.x - runtime.x) / targetDistance) * step;
    const dy = ((target.y - runtime.y) / targetDistance) * step;
    const candidate = { x: runtime.x + dx, y: runtime.y + dy };
    const direction = Math.abs(dx) > Math.abs(dy)
      ? dx < 0 ? "left" : "right"
      : dy < 0 ? "up" : "down";

    next[id] = canStandAt(candidate, placements, "world", trees)
      ? { ...runtime, ...candidate, direction, activity: "walking", goal: target.label, bubble: null }
      : {
          ...runtime,
          routeIndex: (routeIndex + 1) % route.length,
          waitUntil: now + 600,
          activity: "resting",
          goal: route[(routeIndex + 1) % route.length].label,
          bubble: null,
        };
  }

  const ids = Object.keys(NPCS) as NpcId[];
  for (let firstIndex = 0; firstIndex < ids.length; firstIndex += 1) {
    for (let secondIndex = firstIndex + 1; secondIndex < ids.length; secondIndex += 1) {
      const firstId = ids[firstIndex];
      const secondId = ids[secondIndex];
      const first = next[firstId];
      const second = next[secondId];
      if (
        first.socialCooldownUntil > now ||
        second.socialCooldownUntil > now ||
        first.chatUntil > now ||
        second.chatUntil > now ||
        distance(first, second) > 105
      ) continue;

      const key = pairKey(firstId, secondId);
      const lines = SOCIAL_LINES[key];
      if (!lines) continue;
      const [firstLine, secondLine] = firstId < secondId ? lines : [lines[1], lines[0]];
      const chatUntil = now + 3600;
      const cooldown = now + 16000;
      next[firstId] = {
        ...first,
        activity: "chatting",
        goal: `${NPCS[secondId].name}와 이야기하는 중`,
        bubble: firstLine,
        chatUntil,
        socialCooldownUntil: cooldown,
      };
      next[secondId] = {
        ...second,
        activity: "chatting",
        goal: `${NPCS[firstId].name}와 이야기하는 중`,
        bubble: secondLine,
        chatUntil,
        socialCooldownUntil: cooldown,
      };
      return next;
    }
  }

  return next;
}

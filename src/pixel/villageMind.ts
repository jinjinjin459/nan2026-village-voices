import { NPCS } from "./data";
import type { AiTurn, BuildableId, NpcId, PixelSave, VillageEvent, VillageEventType } from "./types";

const EVENT_COPY: Record<VillageEventType, {
  title: string;
  description: string;
  requirements: AiTurn["requirements"];
}> = {
  fishing_festival: {
    title: "달빛 낚시 축제",
    description: "부두에 불을 밝히고 주민들과 나눌 물고기를 준비해요.",
    requirements: { fish: 3, flower: 0, lamp: 1 },
  },
  garden_party: {
    title: "들꽃 정원 파티",
    description: "광장 주변을 꽃으로 꾸미고 주민들을 초대해요.",
    requirements: { fish: 0, flower: 3, lamp: 0 },
  },
  campfire_night: {
    title: "별빛 모닥불 밤",
    description: "따뜻한 등불과 간식을 준비해 밤 산책을 열어요.",
    requirements: { fish: 1, flower: 0, lamp: 2 },
  },
};

function detectEvent(message: string): VillageEventType | "none" {
  if (/(낚시|물고기).*(축제|대회|파티)|(?:축제|대회|파티).*(낚시|물고기)/.test(message)) return "fishing_festival";
  if (/(꽃|정원|가꾸).*(파티|축제|모임)|(?:파티|축제|모임).*(꽃|정원)/.test(message)) return "garden_party";
  if (/(밤|모닥불|캠프).*(파티|산책|모임)|(?:파티|산책|모임).*(밤|모닥불|캠프)/.test(message)) return "campfire_night";
  return "none";
}

function localDialogue(npcId: NpcId, message: string, eventType: VillageEventType | "none") {
  if (eventType !== "none") {
    const event = EVENT_COPY[eventType];
    if (npcId === "lulu") return `좋아! ${event.title}, 이름부터 신난다! 내가 주민들에게 먼저 알려볼게.`;
    if (npcId === "moka") return `${event.title}라… 너무 시끄럽지만 않으면 괜찮아. 준비할 건 확실히 하자.`;
    return `좋은 생각이야. ${event.title} 준비를 모두가 나눠서 하면 즐거울 것 같아.`;
  }
  const shortMessage = message.length > 34 ? `${message.slice(0, 34)}…` : message;
  if (npcId === "lulu") return `“${shortMessage}”라고 한 거 기억할게! 그 생각으로 마을에서 뭘 해볼지 같이 찾아보자.`;
  if (npcId === "moka") return `“${shortMessage}”… 알겠어. 기억할게. 말보다 행동으로도 보여줘.`;
  return `응, “${shortMessage}”라고 말한 마음을 기억할게. 다른 주민들과도 자연스럽게 이어볼게.`;
}

export function createLocalNpcTurn(npcId: NpcId, rawMessage: string): AiTurn {
  const message = rawMessage.normalize("NFKC").replace(/\s+/g, " ").trim().slice(0, 160);
  const eventType = detectEvent(message);
  const event = eventType === "none" ? null : EVENT_COPY[eventType];
  return {
    dialogue: localDialogue(npcId, message, eventType),
    emotion: eventType === "none" ? "curious" : "happy",
    memory: `${NPCS[npcId].name}에게 “${message.slice(0, 72)}”라고 말함`,
    relationshipDelta: eventType === "none" ? 1 : 3,
    action: eventType === "none" ? "remember" : "plan_event",
    eventType,
    eventTitle: event?.title || "",
    eventDescription: event?.description || "",
    requirements: event?.requirements || { fish: 0, flower: 0, lamp: 0 },
    provider: "local",
  };
}

function isAiTurn(value: unknown): value is AiTurn {
  if (!value || typeof value !== "object") return false;
  const turn = value as Partial<AiTurn>;
  const eventTypes = ["none", "fishing_festival", "garden_party", "campfire_night"];
  return typeof turn.dialogue === "string" && turn.dialogue.length > 0 && turn.dialogue.length <= 240 &&
    typeof turn.memory === "string" && turn.memory.length <= 140 &&
    typeof turn.relationshipDelta === "number" && eventTypes.includes(turn.eventType || "") &&
    Boolean(turn.requirements && Number.isFinite(turn.requirements.fish) && Number.isFinite(turn.requirements.flower) && Number.isFinite(turn.requirements.lamp));
}

export async function requestNpcTurn(npcId: NpcId, message: string, game: PixelSave): Promise<AiTurn> {
  const fallback = createLocalNpcTurn(npcId, message);
  try {
    const response = await fetch("/api/village-chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        residentId: npcId,
        message,
        state: {
          day: game.day,
          phase: game.phase,
          resources: game.resources,
          fishCaught: game.fishCaught,
          buildables: game.placements.reduce<Record<BuildableId, number>>((counts, placement) => {
            counts[placement.type] += 1;
            return counts;
          }, { path: 0, flower: 0, tree: 0, bench: 0, lamp: 0, pond: 0 }),
          memories: game.mind.memories[npcId].slice(-6).map((memory) => memory.text),
          villageLog: game.mind.villageLog.slice(-8),
          relationship: game.mind.relationships[npcId],
          activeEvent: game.mind.activeEvent,
        },
      }),
    });
    if (!response.ok) return fallback;
    const result: unknown = await response.json();
    return isAiTurn(result) ? result : fallback;
  } catch {
    return fallback;
  }
}

export function createVillageEvent(turn: AiTurn, day: number): VillageEvent | null {
  if (turn.action !== "plan_event" || turn.eventType === "none") return null;
  return {
    id: `${turn.eventType}-${day}-${Date.now().toString(36)}`,
    type: turn.eventType,
    title: turn.eventTitle,
    description: turn.eventDescription,
    createdDay: day,
    status: "active",
    requirements: turn.requirements,
  };
}

export function countBuildable(game: PixelSave, type: BuildableId) {
  return game.placements.reduce((count, placement) => count + (placement.type === type ? 1 : 0), 0);
}

export function isVillageEventReady(game: PixelSave) {
  const event = game.mind.activeEvent;
  if (!event || event.status !== "active") return false;
  return game.fishCaught >= event.requirements.fish &&
    countBuildable(game, "flower") >= event.requirements.flower &&
    countBuildable(game, "lamp") >= event.requirements.lamp;
}

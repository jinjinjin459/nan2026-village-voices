import { getFallbackDialogue } from "../game/data";
import type { DialoguePayload, DialogueResult, Emotion, Topic } from "../game/types";

const emotions: Emotion[] = ["neutral", "happy", "annoyed", "worried"];
const topics: Topic[] = [
  "shared_space",
  "quiet_space",
  "relationship_lulu_moka",
  "park",
  "arcade",
  "shop",
  "village_change",
];

const apiBase = (import.meta.env.VITE_API_BASE_URL || ".").replace(/\/$/, "");

function isDialogueResult(value: unknown): value is Omit<DialogueResult, "source"> {
  if (!value || typeof value !== "object") return false;
  const result = value as Record<string, unknown>;
  return (
    typeof result.dialogue === "string" &&
    result.dialogue.length >= 2 &&
    result.dialogue.length <= 180 &&
    emotions.includes(result.emotion as Emotion) &&
    topics.includes(result.topic as Topic)
  );
}

export async function requestDialogue(payload: DialoguePayload): Promise<DialogueResult> {
  const fallback = getFallbackDialogue(payload.state, payload.residentId);
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 13_000);
  try {
    const response = await fetch(`${apiBase}/api/dialogue`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    if (!response.ok) return fallback;
    const body: unknown = await response.json();
    if (!isDialogueResult(body)) return fallback;
    return { ...body, source: "ai" };
  } catch {
    return fallback;
  } finally {
    window.clearTimeout(timeout);
  }
}

export async function getAiHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${apiBase}/api/health`, { signal: AbortSignal.timeout(1800) });
    if (!response.ok) return false;
    const body = (await response.json()) as { ai?: boolean };
    return body.ai === true;
  } catch {
    return false;
  }
}

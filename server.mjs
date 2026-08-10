import { createServer as createHttpServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL(".", import.meta.url));
const isDev = process.argv.includes("--dev");
const port = Number(process.env.PORT || (isDev ? 5173 : 4173));
const host = process.env.HOST || "0.0.0.0";
const model = "gemini-3.6-flash";
const cache = new Map();
const requestWindows = new Map();
let inFlightAiRequests = 0;
let hourlyWindowStartedAt = Date.now();
let hourlyRequestCount = 0;
const MAX_CACHE_ENTRIES = 120;
const CACHE_TTL_MS = 10 * 60 * 1000;
const MAX_REQUESTS_PER_MINUTE = 12;
const MAX_REQUESTS_PER_HOUR = 240;
const MAX_CONCURRENT_AI_REQUESTS = 4;

const residentProfiles = {
  lulu: {
    name: "루루",
    species: "토끼",
    personality: ["활발함", "사교적", "솔직함"],
    speechStyle: "밝고 적극적인 반말. 느낌표를 가끔 사용한다.",
    desire: "친구들과 몸을 움직이며 함께 놀고 싶다.",
  },
  moka: {
    name: "모카",
    species: "고양이",
    personality: ["무뚝뚝함", "자존심이 강함", "섬세함"],
    speechStyle: "짧고 시니컬한 반말. 속마음을 에둘러 말한다.",
    desire: "사람들과 너무 부딪히지 않고 편하게 쉬고 싶다.",
  },
  dubu: {
    name: "두부",
    species: "강아지",
    personality: ["다정함", "눈치가 빠름", "중재자"],
    speechStyle: "부드럽고 조심스러운 반말. 다른 주민의 마음을 살핀다.",
    desire: "세 주민이 다시 자연스럽게 어울리길 바란다.",
  },
};

const allowedEmotions = new Set(["neutral", "happy", "annoyed", "worried"]);
const allowedTopics = new Set([
  "shared_space",
  "quiet_space",
  "relationship_lulu_moka",
  "park",
  "arcade",
  "shop",
  "village_change",
]);

const responseSchema = {
  type: "object",
  properties: {
    dialogue: { type: "string", description: "한국어 2~3문장, 120자 이내의 NPC 대사" },
    emotion: { type: "string", enum: [...allowedEmotions] },
    topic: { type: "string", enum: [...allowedTopics] },
  },
  required: ["dialogue", "emotion", "topic"],
  additionalProperties: false,
};

const systemInstruction = `너는 생활 시뮬레이션 게임의 NPC 대사 작가다.
게임이 제공한 사실만 사용하고 새로운 시설, 사건, 관계, 약속, 과거를 만들지 마라.
관계도와 행복도 숫자를 직접 말하지 마라.
상태를 설명하는 안내자가 아니라 지정된 주민 자신으로만 말하라.
성격과 관계를 자연스럽게 반영하고 모든 답을 노골적으로 알려주지 마라.
플레이어 질문에 답하되 한국어 반말 2~3문장, 최대 120자로 짧게 말하라.
출력은 제공된 JSON schema만 따른다.`;

const trustedScenario = {
  before: {
    facilities: ["cafe"],
    events: ["루루와 모카가 붐비는 카페 이용 문제로 말다툼했다.", "두부가 둘 사이를 걱정하고 있다."],
    luluMoka: "사이가 좋지 않음",
  },
  park: {
    facilities: ["cafe", "park"],
    events: ["마을에 느티나무 공원이 생겼다.", "루루와 모카가 공원 벤치에서 오랜만에 이야기를 나눴다."],
    luluMoka: "전보다 가까워짐",
  },
  arcade: {
    facilities: ["cafe", "arcade"],
    events: ["마을에 별빛 오락실이 생겼다.", "루루와 두부는 함께 게임했지만 모카는 소음 때문에 자리를 피했다."],
    luluMoka: "전보다 더 불편해짐",
  },
  shop: {
    facilities: ["cafe", "shop"],
    events: ["마을에 작은 잡화점이 생겼다.", "생활은 편리해졌지만 주민들이 함께 머무는 시간은 달라지지 않았다."],
    luluMoka: "여전히 어색함",
  },
};

function getTrustedScenario(state) {
  if (state.phase === "before") return trustedScenario.before;
  return trustedScenario[state.selectedFacility];
}

function buildContext(payload) {
  const profile = residentProfiles[payload.residentId];
  const state = payload.state;
  const scenario = getTrustedScenario(state);
  const relationshipSummary = {
    lulu: payload.residentId === "lulu" ? "본인" : payload.residentId === "moka" ? scenario.luluMoka : "사이가 좋음",
    moka: payload.residentId === "moka" ? "본인" : payload.residentId === "lulu" ? scenario.luluMoka : "평범함",
    dubu: payload.residentId === "dubu" ? "본인" : payload.residentId === "lulu" ? "사이가 좋음" : "평범함",
  };
  return JSON.stringify({
    role: `${profile.species} 주민 ${profile.name}`,
    personality: profile.personality,
    speechStyle: profile.speechStyle,
    personalDesire: profile.desire,
    phase: state.phase,
    existingFacilities: scenario.facilities,
    relationships: relationshipSummary,
    recentEvents: scenario.events,
    playerQuestion: String(payload.question || "요즘 마을은 어때?").slice(0, 60),
  });
}

function isValidPayload(payload) {
  if (!payload || !residentProfiles[payload.residentId] || !payload.state || typeof payload.question !== "string") return false;
  if (payload.question.length < 1 || payload.question.length > 60) return false;
  if (payload.state.phase === "before") return payload.state.selectedFacility == null;
  return payload.state.phase === "after" && ["park", "arcade", "shop"].includes(payload.state.selectedFacility);
}

function isValidResult(result) {
  return result && typeof result.dialogue === "string" && result.dialogue.length >= 2 &&
    result.dialogue.length <= 180 && allowedEmotions.has(result.emotion) && allowedTopics.has(result.topic) &&
    !/\b\d{1,3}\b/.test(result.dialogue);
}

function parseStructuredText(text) {
  const trimmed = String(text || "").replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start < 0 || end <= start) throw new Error("INVALID_AI_JSON");
    return JSON.parse(trimmed.slice(start, end + 1));
  }
}

async function callGemini(payload) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("AI_NOT_CONFIGURED");
  const context = buildContext(payload);
  const cacheKey = `${payload.residentId}:${payload.state.phase}:${payload.state.selectedFacility || "none"}:${payload.question}`;
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.value;
  if (cached) cache.delete(cacheKey);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: "POST",
        headers: { "content-type": "application/json", "x-goog-api-key": apiKey },
        signal: controller.signal,
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemInstruction }] },
          contents: [{ role: "user", parts: [{ text: `다음 JSON은 게임 코드가 제공한 사실이다. 이 주민으로 질문에 답하라.\n${context}` }] }],
          generationConfig: {
            // The current v1beta REST surface expects the protobuf enum value.
            responseFormat: { text: { mimeType: "APPLICATION_JSON", schema: responseSchema } },
          },
        }),
      },
    );
    if (!response.ok) throw new Error(`GEMINI_${response.status}`);
    const body = await response.json();
    const text = body?.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("");
    if (process.env.DEBUG_AI === "1") console.warn("Gemini raw text:", String(text).slice(0, 500));
    const result = parseStructuredText(text);
    if (!isValidResult(result)) throw new Error("INVALID_AI_OUTPUT");
    if (cache.size >= MAX_CACHE_ENTRIES) cache.delete(cache.keys().next().value);
    cache.set(cacheKey, { value: result, expiresAt: Date.now() + CACHE_TTL_MS });
    return result;
  } finally {
    clearTimeout(timeout);
  }
}

async function readJsonBody(request) {
  let raw = "";
  for await (const chunk of request) {
    raw += chunk;
    if (raw.length > 16_384) throw new Error("BODY_TOO_LARGE");
  }
  return JSON.parse(raw || "{}");
}

function sendJson(response, status, body, extraHeaders = {}) {
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
    "referrer-policy": "no-referrer",
    ...extraHeaders,
  });
  response.end(JSON.stringify(body));
}

function getCorsHeaders(request) {
  const origin = request.headers.origin;
  const allowed = process.env.ALLOWED_ORIGIN;
  if (!origin || !allowed || origin !== allowed) return {};
  return { "access-control-allow-origin": allowed, "access-control-allow-methods": "GET, POST, OPTIONS", "access-control-allow-headers": "content-type", vary: "origin" };
}

function isOriginAllowed(request) {
  const origin = request.headers.origin;
  if (!origin) return true;
  const allowed = process.env.ALLOWED_ORIGIN;
  if (allowed) return origin === allowed;
  return origin === `http://${request.headers.host}` || origin === `https://${request.headers.host}`;
}

function admitAiRequest(request) {
  const now = Date.now();
  if (now - hourlyWindowStartedAt >= 60 * 60 * 1000) {
    hourlyWindowStartedAt = now;
    hourlyRequestCount = 0;
  }
  if (hourlyRequestCount >= MAX_REQUESTS_PER_HOUR || inFlightAiRequests >= MAX_CONCURRENT_AI_REQUESTS) return false;
  const ip = request.socket.remoteAddress || "unknown";
  const window = requestWindows.get(ip);
  if (!window || now - window.startedAt >= 60_000) requestWindows.set(ip, { startedAt: now, count: 1 });
  else {
    if (window.count >= MAX_REQUESTS_PER_MINUTE) return false;
    window.count += 1;
  }
  hourlyRequestCount += 1;
  inFlightAiRequests += 1;
  return true;
}

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".webp": "image/webp",
  ".json": "application/json; charset=utf-8",
};

let vite;
if (isDev) {
  const { createServer } = await import("vite");
  vite = await createServer({ root, server: { middlewareMode: true }, appType: "spa" });
}

const server = createHttpServer(async (request, response) => {
  const url = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`);
  const corsHeaders = getCorsHeaders(request);
  if (url.pathname.startsWith("/api/") && request.method === "OPTIONS") {
    if (!isOriginAllowed(request)) return sendJson(response, 403, { error: "ORIGIN_DENIED" });
    response.writeHead(204, corsHeaders);
    return response.end();
  }
  if (url.pathname.startsWith("/api/") && !isOriginAllowed(request)) return sendJson(response, 403, { error: "ORIGIN_DENIED" });
  if (url.pathname === "/api/health" && request.method === "GET") {
    return sendJson(response, 200, { ai: Boolean(process.env.GEMINI_API_KEY), model }, corsHeaders);
  }
  if (url.pathname === "/api/dialogue" && request.method === "POST") {
    if (!admitAiRequest(request)) return sendJson(response, 429, { error: "AI_BUSY" }, corsHeaders);
    try {
      const payload = await readJsonBody(request);
      if (!isValidPayload(payload)) return sendJson(response, 400, { error: "INVALID_REQUEST" }, corsHeaders);
      const result = await callGemini(payload);
      return sendJson(response, 200, result, corsHeaders);
    } catch {
      return sendJson(response, process.env.GEMINI_API_KEY ? 502 : 503, { error: "AI_UNAVAILABLE" }, corsHeaders);
    } finally {
      inFlightAiRequests = Math.max(0, inFlightAiRequests - 1);
    }
  }
  if (vite) return vite.middlewares(request, response, () => sendJson(response, 404, { error: "NOT_FOUND" }));

  try {
    const requested = url.pathname === "/" ? "index.html" : url.pathname.replace(/^\//, "");
    const safePath = normalize(requested).replace(/^(\.\.(\\|\/|$))+/, "");
    let filePath = join(root, "dist", safePath);
    try {
      if (!(await stat(filePath)).isFile()) filePath = join(root, "dist", "index.html");
    } catch {
      filePath = join(root, "dist", "index.html");
    }
    const file = await readFile(filePath);
    response.writeHead(200, {
      "content-type": mimeTypes[extname(filePath)] || "application/octet-stream",
      "x-content-type-options": "nosniff",
      "content-security-policy": "default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'; img-src 'self' data:; connect-src 'self'",
    });
    response.end(file);
  } catch {
    sendJson(response, 404, { error: "BUILD_NOT_FOUND" });
  }
});

server.listen(port, host, () => {
  console.log(`Village Voices ${isDev ? "dev" : "production"} server: http://${host}:${port}`);
  console.log(`Gemini ${model}: ${process.env.GEMINI_API_KEY ? "configured" : "fallback only"}`);
});

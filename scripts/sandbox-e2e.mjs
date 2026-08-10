import { strict as assert } from "node:assert";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

/**
 * NAN 2026 자유 진행(sandbox) UX acceptance test.
 *
 * Expected public DOM contract (the fallback selectors keep it usable while UI
 * class names are being finalized):
 *   player        [data-testid="player"] | [data-player="true"] | .player-character
 *   village       [data-testid="village-stage"] | .village-stage
 *   facility      [data-facility-id="park|arcade|shop"] | .facility-scene--<id>
 *   day label     [data-testid="day-label"] | .day-chip
 *
 * Run against an already-started server:
 *   SANDBOX_BASE_URL=http://127.0.0.1:4187 node scripts/sandbox-e2e.mjs
 */

const baseUrl = process.env.SANDBOX_BASE_URL || "http://127.0.0.1:4187";
const executablePath = process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const outputDir = new URL("../.runtime/sandbox-e2e/", import.meta.url);
await mkdir(outputDir, { recursive: true });
const outputPath = (name) => fileURLToPath(new URL(name, outputDir));

const browser = await chromium.launch({ executablePath, headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 960 }, deviceScaleFactor: 1 });
const page = await context.newPage();
const consoleErrors = [];
const pageErrors = [];

page.on("console", (message) => {
  if (message.type() === "error") consoleErrors.push(message.text());
});
page.on("pageerror", (error) => pageErrors.push(error.message));

function playerLocator() {
  return page.locator('[data-testid="player"], [data-player="true"], .player-character').first();
}

function facilityLocator(id) {
  return page.locator(`[data-facility-id="${id}"], .facility-scene--${id}`).first();
}

function dayLocator() {
  return page.locator('[data-testid="day-label"], .day-chip').first();
}

async function dismissIntroIfVisible() {
  const start = page.getByRole("button", { name: /마을의 이야기 듣기|게임 시작|시작하기/ }).first();
  if (await start.isVisible().catch(() => false)) await start.click();
}

async function finishDialogue() {
  const finish = page.getByRole("button", { name: /대화 마치기|대화 닫기|닫기/ }).last();
  await finish.waitFor({ state: "visible", timeout: 5_000 });
  await finish.click();
}

async function talkTo(name) {
  const npc = page.getByRole("button", { name: new RegExp(`${name}.*말 걸기|${name}.*대화|${name}`) }).first();
  await npc.waitFor({ state: "visible", timeout: 6_000 });
  await npc.click();
  const bubble = page.locator(".dialogue-bubble:not(.is-loading), [data-testid='dialogue-text']").first();
  await bubble.waitFor({ state: "visible", timeout: 16_000 });
  const text = (await bubble.innerText()).replace(/[“”\s]/g, "");
  assert.ok(text.length >= 8, `${name}의 대사가 비어 있거나 지나치게 짧습니다.`);
  await finishDialogue();
}

async function openDevelopment() {
  const button = page.getByRole("button", { name: /마을 개발 회의|시설 건설|개발하기/ }).first();
  await button.waitFor({ state: "visible", timeout: 6_000 });
  assert.equal(await button.isEnabled(), true, "필요한 대화를 마쳤지만 개발 회의가 활성화되지 않았습니다.");
  await button.click();
}

async function buildFacility(id, accessibleName) {
  await openDevelopment();
  const choice = page.getByRole("button", { name: accessibleName }).first();
  await choice.waitFor({ state: "visible", timeout: 5_000 });
  await choice.click();
  await facilityLocator(id).waitFor({ state: "visible", timeout: 7_000 });
}

async function goToNextDay() {
  const next = page.getByRole("button", { name: /다음 날|다음날|하루 마치기|새로운 하루/ }).first();
  await next.waitFor({ state: "visible", timeout: 7_000 });
  assert.equal(await next.isEnabled(), true, "시설 건설 후 다음 날 진행 버튼이 비활성입니다.");
  await next.click();
}

function parseSaveCandidates(entries) {
  return entries.flatMap(([key, value]) => {
    try {
      return [{ key, value, parsed: JSON.parse(value) }];
    } catch {
      return [];
    }
  });
}

function hasSandboxProgress(candidate) {
  const serialized = JSON.stringify(candidate.parsed);
  const day = candidate.parsed?.day ?? candidate.parsed?.village?.day ?? candidate.parsed?.state?.day;
  return Number(day) >= 2 && serialized.includes("park") && serialized.includes("arcade");
}

try {
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await dismissIntroIfVisible();

  // 1. Keyboard movement changes the actual player position.
  const player = playerLocator();
  await player.waitFor({ state: "visible", timeout: 6_000 });
  const initialPosition = await player.boundingBox();
  assert.ok(initialPosition, "플레이어의 시작 위치를 읽을 수 없습니다.");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowDown");
  await page.waitForTimeout(350);
  const movedPosition = await player.boundingBox();
  assert.ok(movedPosition, "이동 후 플레이어 위치를 읽을 수 없습니다.");
  assert.ok(
    Math.hypot(movedPosition.x - initialPosition.x, movedPosition.y - initialPosition.y) >= 6,
    "방향키를 입력했지만 플레이어의 화면 위치가 변하지 않았습니다.",
  );

  // 2. NPC order is free and the same NPC can be revisited.
  await talkTo("모카");
  await talkTo("루루");
  await talkTo("모카");

  // 3. Only one facility is built per day; two different days accumulate two facilities.
  const firstDayText = (await dayLocator().innerText()).trim();
  await buildFacility("park", /느티나무 공원/);
  await goToNextDay();
  const secondDayText = (await dayLocator().innerText()).trim();
  assert.notEqual(secondDayText, firstDayText, "다음 날 진행 후 날짜 표시가 바뀌지 않았습니다.");

  await talkTo("두부");
  await talkTo("모카");
  await buildFacility("arcade", /별빛 오락실/);
  assert.equal(await facilityLocator("park").isVisible(), true, "이전 날에 지은 공원이 사라졌습니다.");
  assert.equal(await facilityLocator("arcade").isVisible(), true, "둘째 날 오락실이 마을에 표시되지 않았습니다.");

  // 4. Save data must contain the day and both facilities before reload.
  const storageEntries = await page.evaluate(() => Object.entries(localStorage));
  const saves = parseSaveCandidates(storageEntries);
  const sandboxSave = saves.find(hasSandboxProgress);
  assert.ok(sandboxSave, "localStorage에서 날짜와 누적 시설을 포함한 저장 상태를 찾지 못했습니다.");

  const savedDayText = (await dayLocator().innerText()).trim();
  await page.reload({ waitUntil: "networkidle" });
  await dismissIntroIfVisible();
  assert.equal((await dayLocator().innerText()).trim(), savedDayText, "새로고침 후 날짜가 복원되지 않았습니다.");
  assert.equal(await facilityLocator("park").isVisible(), true, "새로고침 후 공원이 복원되지 않았습니다.");
  assert.equal(await facilityLocator("arcade").isVisible(), true, "새로고침 후 오락실이 복원되지 않았습니다.");

  assert.deepEqual(pageErrors, [], `페이지 예외가 발생했습니다: ${pageErrors.join(" | ")}`);
  assert.deepEqual(consoleErrors, [], `콘솔 오류가 발생했습니다: ${consoleErrors.join(" | ")}`);
  await page.screenshot({ path: outputPath("sandbox-pass.png"), fullPage: true });
  console.log(JSON.stringify({
    status: "PASS",
    route: "intro→keyboard move→moka→lulu→moka→park→next day→dubu→moka→arcade→reload",
    day: savedDayText,
    facilities: ["park", "arcade"],
    storageKey: sandboxSave.key,
    consoleErrors: 0,
  }));
} catch (error) {
  await page.screenshot({ path: outputPath("sandbox-red.png"), fullPage: true }).catch(() => {});
  const message = error instanceof Error ? error.message : String(error);
  console.error(JSON.stringify({ status: "RED", failedRequirement: message, screenshot: "sandbox-red.png" }));
  throw error;
} finally {
  await context.close();
  await browser.close();
}

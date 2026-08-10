import { strict as assert } from "node:assert";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

/** Mobile touch-movement acceptance check for the sandbox village. */
const baseUrl = process.env.MOBILE_BASE_URL || process.env.SANDBOX_BASE_URL || "http://127.0.0.1:4187";
const executablePath = process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const outputDir = new URL("../.runtime/sandbox-e2e/", import.meta.url);
await mkdir(outputDir, { recursive: true });
const outputPath = (name) => fileURLToPath(new URL(name, outputDir));

const browser = await chromium.launch({ executablePath, headless: true });
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  screen: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
});
const page = await context.newPage();
const consoleErrors = [];
const pageErrors = [];
page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
page.on("pageerror", (error) => pageErrors.push(error.message));

const player = page.locator('[data-testid="player"], [data-player="true"], .player-character').first();
const stage = page.locator('[data-testid="village-stage"], .village-stage').first();

try {
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  const start = page.getByRole("button", { name: /마을의 이야기 듣기|게임 시작|시작하기/ }).first();
  if (await start.isVisible().catch(() => false)) await start.tap();

  await player.waitFor({ state: "visible", timeout: 6_000 });
  await stage.waitFor({ state: "visible", timeout: 6_000 });
  const before = await player.boundingBox();
  assert.ok(before, "모바일 화면에서 플레이어 위치를 읽을 수 없습니다.");

  // Prefer a visible touch control. If there is none, touch the village to the
  // right of the player; both interaction designs satisfy touch movement.
  const rightControl = page.locator('[data-testid="touch-right"], [data-move="right"], button[aria-label*="오른쪽 이동"]').first();
  if (await rightControl.isVisible().catch(() => false)) {
    await rightControl.tap();
    await rightControl.tap();
  } else {
    const stageBox = await stage.boundingBox();
    assert.ok(stageBox, "모바일 마을 영역의 위치를 읽을 수 없습니다.");
    const targetX = Math.min(stageBox.x + stageBox.width - 20, before.x + before.width + 90);
    const targetY = Math.max(stageBox.y + 20, Math.min(stageBox.y + stageBox.height - 20, before.y + before.height / 2));
    await page.touchscreen.tap(targetX, targetY);
  }

  await page.waitForTimeout(650);
  const after = await player.boundingBox();
  assert.ok(after, "터치 이동 후 플레이어 위치를 읽을 수 없습니다.");
  assert.ok(
    Math.hypot(after.x - before.x, after.y - before.y) >= 6,
    "터치 입력 후 플레이어의 화면 위치가 변하지 않았습니다.",
  );

  // Confirm a real touch can also begin NPC interaction.
  const npc = page.getByRole("button", { name: /모카.*말 걸기|모카.*대화|모카/ }).first();
  await npc.tap();
  await page.locator(".dialogue-bubble:not(.is-loading), [data-testid='dialogue-text']").first().waitFor({ state: "visible", timeout: 16_000 });

  assert.deepEqual(pageErrors, [], `모바일 페이지 예외: ${pageErrors.join(" | ")}`);
  assert.deepEqual(consoleErrors, [], `모바일 콘솔 오류: ${consoleErrors.join(" | ")}`);
  await page.screenshot({ path: outputPath("mobile-pass.png"), fullPage: true });
  console.log(JSON.stringify({ status: "PASS", viewport: "390x844@2x", touchMovement: true, touchDialogue: true, consoleErrors: 0 }));
} catch (error) {
  await page.screenshot({ path: outputPath("mobile-red.png"), fullPage: true }).catch(() => {});
  const message = error instanceof Error ? error.message : String(error);
  console.error(JSON.stringify({ status: "RED", failedRequirement: message, screenshot: "mobile-red.png" }));
  throw error;
} finally {
  await context.close();
  await browser.close();
}

import { mkdir } from "node:fs/promises";
import { resolve, join } from "node:path";
import { chromium } from "playwright-core";

const baseUrl = process.env.CAPTURE_BASE_URL || "https://jinjinjin459.github.io/nan2026-village-voices/";
const executablePath = process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const projectRoot = resolve(new URL("..", import.meta.url).pathname.replace(/^\/(?:([A-Za-z]:))/, "$1"));
const outputDir = join(projectRoot, "docs", "assets");
await mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({ executablePath, headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  screen: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
  colorScheme: "light",
});
const page = await context.newPage();
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });

async function screenshot(name) {
  await page.screenshot({ path: join(outputDir, name), animations: "disabled" });
}

async function waitForLiveDialogue() {
  await page.locator(".dialogue-bubble:not(.is-loading)").waitFor({ state: "visible", timeout: 16_000 });
  const source = (await page.locator(".source-badge").last().innerText()).trim();
  if (source !== "AI") throw new Error("Submission captures require a live Gemma response.");
  await page.waitForTimeout(450);
}

try {
  await page.goto(baseUrl, { waitUntil: "networkidle", timeout: 30_000 });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "networkidle", timeout: 30_000 });
  await page.getByRole("button", { name: /게임 시작|마을로 이사 오기/ }).click();
  await page.locator(".ai-status--online").waitFor({ state: "visible", timeout: 5_000 });
  await screenshot("01-village.png");

  await page.getByRole("button", { name: /모카.*말 걸기/ }).click();
  await waitForLiveDialogue();
  await screenshot("05-live-ai.png");
  await page.getByRole("button", { name: "대화 마치기" }).click();

  await page.getByRole("button", { name: /시설 건설/ }).click();
  await screenshot("02-decision.png");
  await page.getByRole("button", { name: /느티나무 공원/ }).click();
  await page.locator('[data-facility-id="park"]').waitFor({ state: "visible", timeout: 7_000 });
  await page.waitForTimeout(1_500);

  await page.getByRole("button", { name: /모카.*말 걸기/ }).click();
  await waitForLiveDialogue();
  await screenshot("03-after-dialogue.png");
  await page.getByRole("button", { name: "대화 마치기" }).click();

  await page.getByRole("button", { name: "하루 기록" }).click();
  await screenshot("04-result.png");

  if (errors.length) throw new Error(`Browser errors: ${errors.join(" | ")}`);
  console.log(JSON.stringify({ status: "PASS", source: baseUrl, captures: 5, liveAi: true }));
} finally {
  await context.close();
  await browser.close();
}

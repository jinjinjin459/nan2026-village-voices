import { mkdir, copyFile, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join, resolve } from "node:path";
import { chromium } from "playwright-core";

const baseUrl = process.env.HIGHLIGHT_BASE_URL || "https://jinjinjin459.github.io/nan2026-village-voices/";
const executablePath = process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const projectRoot = resolve(new URL("..", import.meta.url).pathname.replace(/^\/(?:([A-Za-z]:))/, "$1"));
const runtimeDir = join(projectRoot, ".runtime", "highlight-video");
const submissionDir = join(projectRoot, "docs", "submission");
const finalPath = join(submissionDir, "Village_Voices_40s_Gameplay.webm");

await mkdir(runtimeDir, { recursive: true });
await mkdir(submissionDir, { recursive: true });

const browser = await chromium.launch({ executablePath, headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  screen: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
  colorScheme: "light",
  recordVideo: { dir: runtimeDir, size: { width: 1440, height: 900 } },
});
const page = await context.newPage();
const video = page.video();
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
page.on("console", (message) => {
  if (message.type() === "error") errors.push(message.text());
});

const wait = (milliseconds) => page.waitForTimeout(milliseconds);
const startedAt = Date.now();

async function waitForDialogue() {
  await page.locator(".dialogue-bubble:not(.is-loading)").waitFor({ state: "visible", timeout: 16_000 });
  await wait(3_400);
}

try {
  await page.goto(baseUrl, { waitUntil: "networkidle", timeout: 30_000 });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "networkidle", timeout: 30_000 });
  await wait(2_300);

  await page.getByRole("button", { name: /게임 시작|마을로 이사 오기/ }).click();
  await wait(1_400);

  for (const key of ["ArrowRight", "ArrowRight", "ArrowUp", "ArrowLeft"]) {
    await page.keyboard.press(key);
    await wait(260);
  }
  await wait(900);

  await page.getByRole("button", { name: /모카.*말 걸기/ }).click();
  await waitForDialogue();
  await page.getByRole("button", { name: "대화 마치기" }).click();
  await wait(900);

  await page.getByRole("button", { name: /루루.*말 걸기/ }).click();
  await waitForDialogue();
  await page.getByRole("button", { name: "대화 마치기" }).click();
  await wait(700);

  await page.getByRole("button", { name: /시설 건설/ }).click();
  await wait(1_100);
  await page.getByRole("button", { name: /느티나무 공원/ }).click();
  await page.locator('[data-facility-id="park"]').waitFor({ state: "visible", timeout: 7_000 });
  await wait(2_100);

  await page.getByRole("button", { name: /모카.*말 걸기/ }).click();
  await waitForDialogue();
  await page.getByRole("button", { name: "대화 마치기" }).click();
  await wait(900);

  await page.getByRole("button", { name: "하루 기록" }).click();
  await wait(3_300);
  await page.getByRole("button", { name: /다음 날 시작하기/ }).click();
  await wait(1_200);

  await page.getByRole("button", { name: /두부.*말 걸기/ }).click();
  await waitForDialogue();

  const minimumCaptureMs = 40_500;
  const remaining = minimumCaptureMs - (Date.now() - startedAt);
  if (remaining > 0) await wait(remaining);
  await page.screenshot({ path: join(runtimeDir, "highlight-final-frame.png") });
} finally {
  await context.close();
  await browser.close();
}

if (errors.length) throw new Error(`Browser errors during recording: ${errors.join(" | ")}`);
const rawPath = await video.path();

async function findPlaywrightFfmpeg() {
  const localAppData = process.env.LOCALAPPDATA;
  if (!localAppData) return null;
  const root = join(localAppData, "ms-playwright");
  if (!existsSync(root)) return null;
  const entries = await readdir(root, { withFileTypes: true });
  const ffmpegDir = entries.find((entry) => entry.isDirectory() && entry.name.startsWith("ffmpeg-"));
  if (!ffmpegDir) return null;
  const candidate = join(root, ffmpegDir.name, "ffmpeg-win64.exe");
  return existsSync(candidate) ? candidate : null;
}

const ffmpeg = await findPlaywrightFfmpeg();
if (ffmpeg) {
  const result = spawnSync(ffmpeg, [
    "-y", "-i", rawPath, "-t", "40", "-an", "-c:v", "copy", finalPath,
  ], { encoding: "utf8" });
  if (result.status !== 0) {
    await copyFile(rawPath, finalPath);
    console.warn("Could not trim with bundled ffmpeg; copied the complete real-play capture instead.");
  }
} else {
  await copyFile(rawPath, finalPath);
}

console.log(JSON.stringify({
  status: "PASS",
  kind: "continuous real gameplay capture",
  targetSeconds: 40,
  source: baseUrl,
  output: finalPath,
}));

import { strict as assert } from "node:assert";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { chromium } from "playwright-core";

const baseUrl = process.env.PIXEL_BASE_URL || "http://127.0.0.1:4173";
const executablePath = process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const desktopShot = join(tmpdir(), "nan-pixel-desktop.png");
const mobileShot = join(tmpdir(), "nan-pixel-mobile.png");

const browser = await chromium.launch({ executablePath, headless: true });

async function captureErrors(page) {
  const errors = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`console: ${message.text()}`);
  });
  page.on("pageerror", (error) => errors.push(`page: ${error.message}`));
  return errors;
}

async function runDesktop() {
  const context = await browser.newContext({ viewport: { width: 1536, height: 1024 } });
  const page = await context.newPage();
  const errors = await captureErrors(page);
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "networkidle" });

  await page.locator('[data-testid="pixel-world"]').waitFor({ state: "visible" });
  assert.equal(await page.title(), "마을의 목소리 · 픽셀 빌리지");
  assert.match(await page.locator("body").innerText(), /루루에게 말을 걸어보자/);

  const player = page.locator('[data-testid="player"]');
  const startTop = Number.parseFloat((await player.getAttribute("style")).match(/top:\s*([\d.]+)px/)?.[1] || "0");
  await page.keyboard.down("ArrowDown");
  await page.waitForTimeout(420);
  await page.keyboard.up("ArrowDown");
  const movedTop = Number.parseFloat((await player.getAttribute("style")).match(/top:\s*([\d.]+)px/)?.[1] || "0");
  assert.ok(movedTop > startTop + 20, "방향키 입력으로 플레이어가 이동해야 합니다.");

  await page.evaluate(() => {
    const raw = localStorage.getItem("village-voices-pixel-v1");
    const save = raw ? JSON.parse(raw) : null;
    if (save) {
      save.player = { x: 690, y: 590 };
      localStorage.setItem("village-voices-pixel-v1", JSON.stringify(save));
    }
  });
  await page.reload({ waitUntil: "networkidle" });
  await page.keyboard.press("e");
  await page.getByRole("dialog").waitFor({ state: "visible" });
  assert.match(await page.getByRole("dialog").innerText(), /꽃이 피면 산책할 맛/);
  await page.keyboard.press("e");
  await page.getByRole("button", { name: "들꽃" }).click();
  const world = page.locator('[data-testid="pixel-world"]');
  const box = await world.boundingBox();
  assert.ok(box, "월드 좌표를 읽을 수 없습니다.");
  await page.mouse.click(box.x + (760 / 1536) * box.width, box.y + (790 / 1024) * box.height);
  await page.locator('[data-placement="flower"]').waitFor({ state: "visible" });
  assert.match(await page.locator("body").innerText(), /모카에게 새 풍경을 물어보자/);

  await page.waitForTimeout(250);
  await page.reload({ waitUntil: "networkidle" });
  assert.equal(await page.locator('[data-placement="flower"]').count(), 1, "배치 결과가 저장되어야 합니다.");
  assert.deepEqual(errors, [], errors.join(" | "));
  await page.screenshot({ path: desktopShot, fullPage: false });
  await context.close();
}

async function runMobile() {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    screen: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  const errors = await captureErrors(page);
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "networkidle" });
  const player = page.locator('[data-testid="player"]');
  const startLeft = Number.parseFloat((await player.getAttribute("style")).match(/left:\s*([\d.]+)px/)?.[1] || "0");
  const right = page.getByRole("button", { name: "오른쪽으로 이동" });
  await right.dispatchEvent("pointerdown", { pointerId: 1, pointerType: "touch", isPrimary: true });
  await page.waitForTimeout(420);
  await right.dispatchEvent("pointerup", { pointerId: 1, pointerType: "touch", isPrimary: true });
  const movedLeft = Number.parseFloat((await player.getAttribute("style")).match(/left:\s*([\d.]+)px/)?.[1] || "0");
  assert.ok(movedLeft > startLeft + 20, "모바일 이동 패드가 플레이어를 이동시켜야 합니다.");
  assert.ok(await page.getByRole("button", { name: /마을 가꾸기/ }).isVisible());
  assert.deepEqual(errors, [], errors.join(" | "));
  await page.screenshot({ path: mobileShot, fullPage: false });
  await context.close();
}

try {
  await runDesktop();
  await runMobile();
  console.log(JSON.stringify({
    status: "PASS",
    desktop: desktopShot,
    mobile: mobileShot,
    flow: "move -> talk to Lulu -> place flower -> reload persisted save",
  }));
} finally {
  await browser.close();
}

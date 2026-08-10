import { strict as assert } from "node:assert";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { chromium } from "playwright-core";

const baseUrl = process.env.PIXEL_BASE_URL || "http://127.0.0.1:4173";
const executablePath = process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const expandedShot = join(tmpdir(), "nan-pixel-expanded.png");
const fishingShot = join(tmpdir(), "nan-pixel-fishing.png");
const homeShot = join(tmpdir(), "nan-pixel-home.png");
const mobileShot = join(tmpdir(), "nan-pixel-mobile.png");
const saveKey = "village-voices-pixel-v2";

const browser = await chromium.launch({ executablePath, headless: true });

function captureErrors(page) {
  const errors = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`console: ${message.text()}`);
  });
  page.on("pageerror", (error) => errors.push(`page: ${error.message}`));
  return errors;
}

async function updateSave(page, update) {
  await page.evaluate(({ key, updateValue }) => {
    const save = JSON.parse(localStorage.getItem(key));
    Object.assign(save, updateValue);
    localStorage.setItem(key, JSON.stringify(save));
  }, { key: saveKey, updateValue: update });
}

async function runDesktop() {
  const context = await browser.newContext({ viewport: { width: 1536, height: 1024 } });
  const page = await context.newPage();
  const errors = captureErrors(page);
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "networkidle" });

  const world = page.locator('[data-testid="pixel-world"]');
  const player = page.locator('[data-testid="player"]');
  await world.waitFor({ state: "visible" });
  assert.equal(await page.title(), "마을의 목소리 · 픽셀 빌리지");
  assert.equal(await world.getAttribute("data-location"), "world");
  await page.locator(".npc-social-bubble").first().waitFor({ state: "visible", timeout: 4_000 });

  const startTop = Number.parseFloat((await player.getAttribute("style")).match(/top:\s*([\d.]+)px/)?.[1] || "0");
  await page.keyboard.down("ArrowDown");
  await page.waitForTimeout(380);
  await page.keyboard.up("ArrowDown");
  const movedTop = Number.parseFloat((await player.getAttribute("style")).match(/top:\s*([\d.]+)px/)?.[1] || "0");
  assert.ok(movedTop > startTop + 20, "방향키 입력으로 플레이어가 이동해야 합니다.");

  await updateSave(page, { player: { x: 1460, y: 760 }, location: "world" });
  await page.reload({ waitUntil: "networkidle" });
  await page.keyboard.press("e");
  await page.getByRole("dialog").waitFor({ state: "visible" });
  assert.match(await page.getByRole("dialog").innerText(), /다리 너머|낚시터/);
  await page.keyboard.press("e");

  await page.getByRole("button", { name: "들꽃" }).click();
  const worldBox = await world.boundingBox();
  assert.ok(worldBox, "월드 좌표를 읽을 수 없습니다.");
  await page.mouse.click(worldBox.x + (1510 / 2048) * worldBox.width, worldBox.y + (940 / 1365) * worldBox.height);
  await page.locator('[data-placement="flower"]').waitFor({ state: "visible" });

  await updateSave(page, { player: { x: 1450, y: 650 }, location: "world", questStage: "visit-fishing" });
  await page.reload({ waitUntil: "networkidle" });
  await page.keyboard.down("ArrowLeft");
  await page.waitForTimeout(5_050);
  await page.keyboard.up("ArrowLeft");
  const dockX = Number.parseFloat((await player.getAttribute("style")).match(/left:\s*([\d.]+)px/)?.[1] || "9999");
  const dockY = Number.parseFloat((await player.getAttribute("style")).match(/top:\s*([\d.]+)px/)?.[1] || "9999");
  assert.ok(dockX < 250 && dockY > 610 && dockY < 700, "시작 지점에서 새 목재 보행로를 따라 서쪽 부두 끝에 도착해야 합니다.");

  await page.waitForTimeout(2_900);
  const fishingLandmark = page.locator('[data-landmark="fish"]');
  assert.ok(await fishingLandmark.isVisible(), "낚시 포인트 표지판이 보여야 합니다.");
  assert.ok(await fishingLandmark.isEnabled(), "낚시 포인트 가까이에서 표지판이 활성화되어야 합니다.");
  await page.screenshot({ path: expandedShot, fullPage: false });
  await page.keyboard.press("e");
  await page.getByRole("button", { name: "낚싯줄 던지기" }).waitFor({ state: "visible" });
  await page.waitForTimeout(250);
  await page.screenshot({ path: fishingShot, fullPage: false });
  await page.keyboard.press("e");
  const pull = page.getByRole("button", { name: "지금 당기기!" });
  await pull.waitFor({ state: "visible", timeout: 3_000 });
  await page.keyboard.press("e");
  assert.match(await page.getByRole("dialog").innerText(), /잡았다/);
  await page.keyboard.press("e");
  assert.match(await page.locator("body").innerText(), /낚시\s+1/);
  await page.waitForTimeout(350);

  await updateSave(page, {
    player: { x: 1295, y: 450 },
    location: "world",
    phase: "night",
    phaseStartedAt: Date.now(),
    day: 1,
  });
  await page.reload({ waitUntil: "networkidle" });
  assert.match(await page.getByTestId("time-phase").innerText(), /밤/);
  const homeLandmark = page.locator('[data-landmark="enter-home"]');
  assert.ok(await homeLandmark.isVisible(), "우리 집 문 표지판이 보여야 합니다.");
  assert.ok(await homeLandmark.isEnabled(), "집 문 가까이에서 입장 표지판이 활성화되어야 합니다.");
  await page.keyboard.press("e");
  await page.locator('[data-location="home"]').waitFor({ state: "visible" });
  await updateSave(page, { player: { x: 350, y: 300 }, location: "home", phase: "night", day: 1 });
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(1_000);
  const bedLandmark = page.locator('[data-landmark="sleep"]');
  assert.ok(await bedLandmark.isVisible(), "집 안에서 침대 표지판이 보여야 합니다.");
  assert.ok(await bedLandmark.isEnabled(), "침대 가까이에서 수면 표지판이 활성화되어야 합니다.");
  await page.screenshot({ path: homeShot, fullPage: false });
  await page.keyboard.press("e");
  await page.locator(".sleep-transition").waitFor({ state: "visible" });
  await page.locator(".sleep-transition").waitFor({ state: "hidden", timeout: 3_000 });
  assert.match(await page.getByTestId("time-phase").innerText(), /2일 차 · 낮/);

  await page.reload({ waitUntil: "networkidle" });
  assert.equal(await page.locator('[data-placement="flower"]').count(), 0, "집 내부에서는 야외 장식이 렌더되지 않아야 합니다.");
  const saved = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)), saveKey);
  assert.equal(saved.fishCaught, 1, "낚시 결과가 저장되어야 합니다.");
  assert.deepEqual(errors, [], errors.join(" | "));
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
  const errors = captureErrors(page);
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
    expanded: expandedShot,
    fishing: fishingShot,
    home: homeShot,
    mobile: mobileShot,
    flow: "start -> walk across causeway -> fish -> enter home -> sleep -> next morning",
  }));
} finally {
  await browser.close();
}

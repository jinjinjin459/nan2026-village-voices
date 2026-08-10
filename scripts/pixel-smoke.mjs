import { strict as assert } from "node:assert";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { chromium } from "playwright-core";

const baseUrl = process.env.PIXEL_BASE_URL || "http://127.0.0.1:4173";
const executablePath = process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const expandedShot = join(tmpdir(), "nan-pixel-expanded.png");
const aiShot = join(tmpdir(), "nan-pixel-ai-dialogue.png");
const treeShot = join(tmpdir(), "nan-pixel-tree-chopped.png");
const nightShot = join(tmpdir(), "nan-pixel-living-night.png");
const fishingShot = join(tmpdir(), "nan-pixel-fishing.png");
const homeShot = join(tmpdir(), "nan-pixel-home.png");
const mobileShot = join(tmpdir(), "nan-pixel-mobile.png");
const saveKey = "village-voices-pixel-v3";

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

async function readSave(page) {
  return page.evaluate((key) => JSON.parse(localStorage.getItem(key)), saveKey);
}

async function reload(page) {
  await page.reload({ waitUntil: "networkidle" });
  await page.locator('[data-testid="pixel-world"]').waitFor({ state: "visible" });
}

async function runDesktop() {
  const context = await browser.newContext({ viewport: { width: 1536, height: 1024 } });
  const page = await context.newPage();
  const errors = captureErrors(page);
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.evaluate(() => localStorage.clear());
  await reload(page);

  const world = page.locator('[data-testid="pixel-world"]');
  const player = page.locator('[data-testid="player"]');
  assert.equal(await page.title(), "마을의 목소리 · 픽셀 빌리지");
  assert.equal(await world.getAttribute("data-location"), "world");
  assert.equal((await readSave(page)).version, 3);
  await page.locator(".npc-social-bubble").first().waitFor({ state: "visible", timeout: 4_000 });

  const startTop = Number.parseFloat((await player.getAttribute("style")).match(/top:\s*([\d.]+)px/)?.[1] || "0");
  await page.keyboard.down("ArrowDown");
  await page.waitForTimeout(380);
  await page.keyboard.up("ArrowDown");
  const movedTop = Number.parseFloat((await player.getAttribute("style")).match(/top:\s*([\d.]+)px/)?.[1] || "0");
  assert.ok(movedTop > startTop + 20, "keyboard movement should move the player");

  // Free-form resident conversation creates a persistent village event and memory.
  await updateSave(page, { player: { x: 1460, y: 760 }, location: "world" });
  await reload(page);
  await page.keyboard.press("e");
  const dialogue = page.locator(".ai-dialogue");
  await dialogue.waitFor({ state: "visible" });
  await dialogue.locator("input").fill("내일 낚시 축제를 열자");
  await dialogue.locator('button[type="submit"]').click();
  await page.locator('[data-testid="village-event"]').waitFor({ state: "visible", timeout: 8_000 });
  await page.locator(".npc-memory-line").waitFor({ state: "visible" });
  await page.waitForFunction((key) => {
    const save = JSON.parse(localStorage.getItem(key));
    return save?.mind?.activeEvent?.type === "fishing_festival" && save?.mind?.memories?.lulu?.length > 0;
  }, saveKey);
  const afterTalk = await readSave(page);
  assert.equal(afterTalk.mind.activeEvent.type, "fishing_festival");
  assert.ok(afterTalk.mind.memories.lulu.length > 0, "resident memory should persist");
  await page.screenshot({ path: aiShot, fullPage: false });
  await page.keyboard.press("Escape");

  // A harvest tree is the blocking resource: three axe hits leave a stump and award wood.
  const woodBefore = (await readSave(page)).resources.wood;
  await updateSave(page, { player: { x: 1210, y: 880 }, location: "world" });
  await reload(page);
  const tree = page.locator('[data-tree="oak-river"]');
  await tree.click();
  await page.waitForTimeout(120);
  await tree.click();
  await page.waitForTimeout(120);
  await tree.click();
  await page.waitForTimeout(800);
  assert.equal(await tree.getAttribute("data-tree-state"), "stump");
  const afterTree = await readSave(page);
  assert.equal(afterTree.resources.wood, woodBefore + 5);
  await page.screenshot({ path: treeShot, fullPage: false });

  // Walk the previously blocked west causeway all the way to the dock.
  await updateSave(page, { player: { x: 1450, y: 650 }, location: "world", questStage: "visit-fishing" });
  await reload(page);
  await page.keyboard.down("ArrowLeft");
  await page.waitForTimeout(5_050);
  await page.keyboard.up("ArrowLeft");
  const dockX = Number.parseFloat((await player.getAttribute("style")).match(/left:\s*([\d.]+)px/)?.[1] || "9999");
  const dockY = Number.parseFloat((await player.getAttribute("style")).match(/top:\s*([\d.]+)px/)?.[1] || "9999");
  assert.ok(dockX < 250 && dockY > 610 && dockY < 700, "west causeway should be directly walkable");
  await page.screenshot({ path: expandedShot, fullPage: false });

  const fishingLandmark = page.locator('[data-landmark="fish"]');
  assert.ok(await fishingLandmark.isVisible());
  assert.ok(await fishingLandmark.isEnabled());
  await page.keyboard.press("e");
  const fishing = page.locator(".fishing-panel");
  await fishing.waitFor({ state: "visible" });
  await page.screenshot({ path: fishingShot, fullPage: false });
  await fishing.locator(".fishing-action").click();
  const pull = fishing.locator(".fishing-action.is-biting");
  await pull.waitFor({ state: "visible", timeout: 4_000 });
  await pull.click();
  await page.locator(".fishing-panel.fishing-status-caught").waitFor({ state: "visible" });
  await page.keyboard.press("e");
  await page.waitForFunction((key) => JSON.parse(localStorage.getItem(key))?.fishCaught === 1, saveKey);
  assert.equal((await readSave(page)).fishCaught, 1);

  // Night is visibly illuminated before entering the home.
  await updateSave(page, {
    player: { x: 1295, y: 450 },
    location: "world",
    phase: "night",
    phaseStartedAt: Date.now(),
    day: 1,
  });
  await reload(page);
  assert.match(await page.getByTestId("time-phase").innerText(), /밤/);
  assert.ok(await page.locator(".night-effects i").count() >= 5, "night should render several warm light pools");
  await page.screenshot({ path: nightShot, fullPage: false });

  const homeLandmark = page.locator('[data-landmark="enter-home"]');
  assert.ok(await homeLandmark.isVisible());
  assert.ok(await homeLandmark.isEnabled());
  await page.keyboard.press("e");
  await page.locator('[data-location="home"]').waitFor({ state: "visible" });
  await updateSave(page, { player: { x: 350, y: 300 }, location: "home", phase: "night", day: 1 });
  await reload(page);
  const bedLandmark = page.locator('[data-landmark="sleep"]');
  assert.ok(await bedLandmark.isVisible());
  assert.ok(await bedLandmark.isEnabled());
  await page.screenshot({ path: homeShot, fullPage: false });
  await page.keyboard.press("e");
  await page.locator(".sleep-transition").waitFor({ state: "visible" });
  await page.locator(".sleep-transition").waitFor({ state: "hidden", timeout: 3_000 });
  assert.match(await page.getByTestId("time-phase").innerText(), /2일\s*차.*낮/s);

  const finalSave = await readSave(page);
  assert.equal(finalSave.fishCaught, 1);
  assert.equal(finalSave.mind.activeEvent.status, "active");
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
  await reload(page);
  const player = page.locator('[data-testid="player"]');
  const startLeft = Number.parseFloat((await player.getAttribute("style")).match(/left:\s*([\d.]+)px/)?.[1] || "0");
  const right = page.locator(".touch-right");
  await right.dispatchEvent("pointerdown", { pointerId: 1, pointerType: "touch", isPrimary: true });
  await page.waitForTimeout(420);
  await right.dispatchEvent("pointerup", { pointerId: 1, pointerType: "touch", isPrimary: true });
  const movedLeft = Number.parseFloat((await player.getAttribute("style")).match(/left:\s*([\d.]+)px/)?.[1] || "0");
  assert.ok(movedLeft > startLeft + 20, "mobile movement pad should move the player");
  assert.ok(await page.locator(".build-toggle").isVisible());
  assert.deepEqual(errors, [], errors.join(" | "));
  await page.screenshot({ path: mobileShot, fullPage: false });
  await context.close();
}

try {
  await runDesktop();
  await runMobile();
  console.log(JSON.stringify({
    status: "PASS",
    ai: aiShot,
    tree: treeShot,
    expanded: expandedShot,
    fishing: fishingShot,
    night: nightShot,
    home: homeShot,
    mobile: mobileShot,
    flow: "free talk -> village event -> chop tree -> cross west causeway -> fish -> night lights -> enter home -> sleep",
  }));
} finally {
  await browser.close();
}

import { strict as assert } from "node:assert";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const baseUrl = process.env.E2E_BASE_URL || "http://127.0.0.1:4187";
const outputDir = new URL("../.runtime/e2e/", import.meta.url);
await mkdir(outputDir, { recursive: true });
const screenshotPath = (name) => fileURLToPath(new URL(name, outputDir));

const browser = await chromium.launch({
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  headless: true,
});

const page = await browser.newPage({ viewport: { width: 1440, height: 960 }, deviceScaleFactor: 1 });
const consoleErrors = [];
page.on("console", (message) => {
  if (message.type() === "error" && !message.text().includes("503")) consoleErrors.push(message.text());
});

try {
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /마을의 이야기 듣기/ }).click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: screenshotPath("01-village.png"), fullPage: true });

  await page.getByRole("button", { name: "루루에게 말 걸기" }).click();
  await page.locator(".dialogue-bubble:not(.is-loading)").waitFor();
  assert.match(await page.locator(".dialogue-bubble").innerText(), /여럿이|머물/);
  await page.getByRole("button", { name: "대화 마치기" }).click();

  await page.getByRole("button", { name: "모카에게 말 걸기" }).click();
  await page.locator(".dialogue-bubble:not(.is-loading)").waitFor();
  assert.match(await page.locator(".dialogue-bubble").innerText(), /카페|바람/);
  await page.getByRole("button", { name: "대화 마치기" }).click();

  const development = page.getByRole("button", { name: /마을 개발 회의/ });
  assert.equal(await development.isEnabled(), true);
  await development.click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: screenshotPath("02-decision.png"), fullPage: true });
  await page.getByRole("button", { name: /느티나무 공원/ }).click();
  await page.getByText(/완성되었습니다/).waitFor({ timeout: 4_000 });

  await page.getByRole("button", { name: "모카에게 말 걸기" }).click();
  await page.locator(".dialogue-bubble:not(.is-loading)").waitFor();
  assert.match(await page.locator(".dialogue-bubble").innerText(), /공원|루루/);
  await page.waitForTimeout(450);
  await page.screenshot({ path: screenshotPath("03-after-dialogue.png"), fullPage: true });
  await page.getByRole("button", { name: "대화 마치기" }).click();

  await page.getByRole("button", { name: "루루에게 말 걸기" }).click();
  await page.locator(".dialogue-bubble:not(.is-loading)").waitFor();
  await page.getByRole("button", { name: "대화 마치기" }).click();

  const result = page.getByRole("button", { name: /변화 돌아보기/ });
  assert.equal(await result.isEnabled(), true);
  await result.click();
  await page.getByText("서로의 속도가 만나는 곳").waitFor();
  await page.waitForTimeout(500);
  await page.screenshot({ path: screenshotPath("04-result.png"), fullPage: true });

  assert.deepEqual(consoleErrors, []);
  console.log(JSON.stringify({ status: "PASS", route: "intro→lulu→moka→park→moka→lulu→result", screenshots: 4 }));
} finally {
  await browser.close();
}

import { strict as assert } from "node:assert";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const baseUrl = process.env.AI_BASE_URL || "http://127.0.0.1:4188";
const output = fileURLToPath(new URL("../.runtime/e2e/05-live-ai.png", import.meta.url));
await mkdir(new URL("../.runtime/e2e/", import.meta.url), { recursive: true });
const browser = await chromium.launch({ executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });

try {
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /마을의 이야기 듣기/ }).click();
  await page.getByRole("button", { name: "모카에게 말 걸기" }).click();
  await page.locator(".dialogue-bubble:not(.is-loading)").waitFor({ timeout: 15_000 });
  assert.equal(await page.locator(".source-badge").innerText(), "AI");
  assert.ok((await page.locator(".dialogue-bubble").innerText()).length > 10);
  await page.waitForTimeout(400);
  await page.screenshot({ path: output, fullPage: true });
  console.log(JSON.stringify({ status: "PASS", model: "gemini-3.6-flash", uiSourceBadge: "AI" }));
} finally {
  await browser.close();
}

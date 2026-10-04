#!/usr/bin/env node
// Real browser, synthetic HA data: layout and operator workflow, not a HA install test.
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile, mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const require = createRequire(process.env.PLAYWRIGHT_PACKAGE_ROOT
  ? resolve(process.env.PLAYWRIGHT_PACKAGE_ROOT, "package.json") : import.meta.url);
const { chromium } = require("playwright");
const output = resolve(process.env.UI_SCREENSHOT_DIR || "/tmp/ha-forensic-ui");
await mkdir(output, { recursive: true });
const server = createServer(async (request, response) => {
  const path = new URL(request.url, "http://localhost").pathname;
  const relative = path === "/" ? "tests/fixtures/panel.html" : path.slice(1);
  if (relative !== "tests/fixtures/panel.html" &&
      !/^custom_components\/ha_forensic_lab\/frontend\/[a-z-]+\.(mjs|js)$/.test(relative)) {
    response.writeHead(404).end();
    return;
  }
  try {
    const content = await readFile(resolve(root, relative));
    response.writeHead(200, { "Content-Type": relative.endsWith("html") ? "text/html" : "text/javascript" }).end(content);
  } catch {
    response.writeHead(404).end();
  }
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
let browser;
let page;
try {
  browser = await chromium.launch({
    headless: true,
    ...(process.env.PANEL_BROWSER_EXECUTABLE ? { executablePath: process.env.PANEL_BROWSER_EXECUTABLE } : {}),
  });
  page = await browser.newPage({ viewport: { width: 1360, height: 960 } });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.setDefaultTimeout(10000);
  await page.goto(`http://127.0.0.1:${server.address().port}/`);
  await page.locator(".event-row").first().waitFor();
  assert.equal(await page.locator(".health-panel").count(), 0);
  assert.equal(await page.locator(".incidents-panel").count(), 0);
  assert.ok((await page.locator(".event-row").first().boundingBox()).y < 450);
  await page.locator('[data-explain-id="isolated"]').click();
  await page.getByRole("heading", { name: "Cause not captured" }).waitFor();
  assert.equal(await page.getByText("Context evidence complete", { exact: true }).count(), 0);
  const rowBox = await page.locator(".event-row").first().boundingBox();
  const detailBox = await page.locator("#investigation-detail").boundingBox();
  assert.ok(detailBox.x >= rowBox.x + rowBox.width);
  await page.screenshot({ path: resolve(output, "desktop-isolated.png"), fullPage: true });

  // An asynchronous trace response must preserve a partially edited filter.
  await page.evaluate(() => { window.traceDelay = 350; });
  await page.locator('[data-explain-id="target"]').click();
  await page.locator("#entity-filter").fill("light.hall");
  await page.waitForFunction(() => !window.panel._traceLoading);
  assert.equal(await page.locator("#entity-filter").inputValue(), "light.hall");
  assert.equal(await page.locator("#entity-filter").evaluate((el) => el.getRootNode().activeElement === el), true);
  await page.evaluate(() => { window.traceDelay = 0; });
  await page.locator('[data-view="diagnostics"]').click();
  await page.getByRole("heading", { name: "Recorder health" }).waitFor();
  await page.locator('[data-view="timeline"]').click();
  assert.equal(await page.locator("#entity-filter").inputValue(), "light.hall");
  await page.locator("#entity-filter").fill("light.hallway");
  await page.getByRole("button", { name: "Apply", exact: true }).click();
  await page.waitForFunction(() => window.panel._data.events.length === 1);
  await page.locator("#clear-filters").click();
  await page.waitForFunction(() => window.panel._data.events.length === 60);

  const list = page.locator("#timeline-list");
  await list.evaluate((el) => { el.scrollTop = 280; });
  await page.locator("#metadata-target > summary").click();
  await page.evaluate(() => window.panel._render());
  assert.equal(await list.evaluate((el) => el.scrollTop), 280);
  assert.equal(await page.locator("#metadata-target").getAttribute("open"), "");
  await page.locator("#metadata-target > summary").click();
  await list.evaluate((el) => { el.scrollTop = 0; });
  await page.locator("#investigation-detail").evaluate((el) => { el.scrollTop = 0; });
  await page.screenshot({ path: resolve(output, "desktop-linked.png"), fullPage: true });

  // Exercise actual form bindings, busy-window limits and retry preservation.
  await page.locator(".save-incident-button").click();
  await page.waitForFunction(() => window.panel._incidentDraft.preview !== null);
  assert.equal(await page.locator("#confirm-save-incident").isDisabled(), true);
  await page.locator("#incident-title").fill("Hallway investigation");
  await page.locator("#incident-before").fill("30");
  await page.locator("#incident-after").fill("10");
  await page.locator("#preview-incident").click();
  await page.waitForFunction(() => window.panel._incidentDraft.preview?.can_save);
  await page.evaluate(() => { window.failNextSave = true; });
  await page.locator("#confirm-save-incident").click();
  await page.getByText("incident contains 501 events; limit is 500", { exact: true }).waitFor();
  assert.equal(await page.locator("#incident-title").inputValue(), "Hallway investigation");
  assert.equal(await page.locator("#incident-before").inputValue(), "30");
  await page.locator("#preview-incident").click();
  await page.waitForFunction(() => window.panel._incidentDraft.preview?.can_save);
  await page.locator("#confirm-save-incident").click();
  await page.locator(".incident-title").waitFor();
  assert.equal(await page.locator('[data-view="incidents"]').getAttribute("aria-pressed"), "true");
  await page.getByRole("button", { name: "Review", exact: true }).click();
  await page.locator("#saved-review-panel .evidence-overview").waitFor();

  // Check narrow and light layouts using the same production component.
  await page.locator('[data-view="timeline"]').click();
  await page.setViewportSize({ width: 390, height: 844 });
  const recorderTab = await page.locator('[data-view="diagnostics"]').boundingBox();
  assert.ok(recorderTab.x + recorderTab.width <= 390);
  await page.locator('[data-explain-id="isolated"]').click();
  await page.getByRole("heading", { name: "Cause not captured" }).waitFor();
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  await page.screenshot({ path: resolve(output, "mobile-isolated.png"), fullPage: true });
  await page.locator("#close-explanation").click();
  assert.equal(await page.locator(".inspector-empty").count(), 1);
  await page.setViewportSize({ width: 1360, height: 960 });
  await page.evaluate(() => document.documentElement.classList.add("light"));
  await page.locator('[data-explain-id="target"]').click();
  await page.getByRole("heading", { name: "Linked activity found" }).waitFor();
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  await page.screenshot({ path: resolve(output, "desktop-light.png"), fullPage: true });
  assert.deepEqual(errors, []);
  console.log("Browser checks passed: desktop/mobile, light/dark, evidence semantics, filter focus, saved incident workflow.");
} catch (error) {
  if (page && !page.isClosed()) {
    await page.screenshot({ path: resolve(output, "failure.png"), fullPage: true }).catch(() => {});
  }
  throw error;
} finally {
  if (browser) await browser.close();
  await new Promise((resolve) => server.close(resolve));
}

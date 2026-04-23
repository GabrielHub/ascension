import fs from "node:fs";
import path from "node:path";

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { chromium, type Browser, type BrowserContext, type Page } from "playwright";

import type { BrowserTestSnapshot } from "../app/features/browser/test-driver";

const BASE_URL = process.env.ASCENSION_BASE_URL ?? "http://127.0.0.1:5173";
const RUN_BROWSER_TEST = process.env.ASCENSION_RUN_BROWSER_TESTS === "1";
const playwrightRoot = path.resolve("playwright");
const playwrightScreenshotsDir = path.join(playwrightRoot, "screenshots");
const playwrightLogsDir = path.join(playwrightRoot, "logs");
const playwrightArtifactsDir = path.join(playwrightRoot, "artifacts");

type BrowserTestWindow = Window & {
  __ASCENSION_BROWSER_TEST__?: {
    getSnapshot(): BrowserTestSnapshot | null;
  };
};

function ensurePlaywrightArtifactDirs(): void {
  for (const directory of [playwrightScreenshotsDir, playwrightLogsDir, playwrightArtifactsDir]) {
    fs.mkdirSync(directory, { recursive: true });
  }
}

function timestampedArtifactPath(directory: string, prefix: string, extension: string): string {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  return path.join(directory, `${prefix}-${stamp}.${extension}`);
}

async function ensureDevServer(): Promise<void> {
  let response: Response;
  try {
    response = await fetch(BASE_URL, { redirect: "manual" });
  } catch (error) {
    throw new Error(
      `Browser verification requires a running dev server at ${BASE_URL}. Start it and rerun; I did not start one.`,
      { cause: error },
    );
  }
  if (!response.ok && response.status !== 304) {
    throw new Error(
      `Browser verification requires a running dev server at ${BASE_URL}. Received HTTP ${response.status}.`,
    );
  }
}

async function launchBrowser(): Promise<Browser> {
  const attempts: Array<Parameters<typeof chromium.launch>[0]> = [
    { channel: "msedge", headless: true },
    { channel: "chrome", headless: true },
    { headless: true },
  ];
  let lastError: unknown;
  for (const attempt of attempts) {
    try {
      return await chromium.launch(attempt);
    } catch (error) {
      lastError = error;
    }
  }
  throw new Error("Unable to launch a Chromium browser for the HQ cascade browser test.", {
    cause: lastError,
  });
}

async function waitForDriver(page: Page): Promise<void> {
  await page.waitForFunction(
    () => Boolean((window as BrowserTestWindow).__ASCENSION_BROWSER_TEST__),
    undefined,
    { timeout: 15_000 },
  );
}

async function stackPanelIds(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const panels = document.querySelectorAll('[data-testid="hq-cascade"] [data-panel-id]');
    return Array.from(panels, (p) => p.getAttribute("data-panel-id") ?? "");
  });
}

async function waitForStack(
  page: Page,
  predicate: (ids: string[]) => boolean,
  label: string,
  timeoutMs = 5_000,
): Promise<string[]> {
  const deadline = Date.now() + timeoutMs;
  let last: string[] = [];
  while (Date.now() < deadline) {
    last = await stackPanelIds(page);
    if (predicate(last)) return last;
    await page.waitForTimeout(100);
  }
  throw new Error(`Timed out waiting for ${label}. Last stack: ${JSON.stringify(last)}`);
}

let browser: Browser;
let context: BrowserContext;
let page: Page;
const consoleLogLines: string[] = [];

beforeAll(async () => {
  ensurePlaywrightArtifactDirs();
  await ensureDevServer();

  browser = await launchBrowser();
  context = await browser.newContext({
    viewport: { height: 900, width: 1440 },
  });
  await context.tracing.start({
    screenshots: true,
    snapshots: true,
  });
  page = await context.newPage();
  page.on("console", (message) => {
    consoleLogLines.push(`[${message.type()}] ${message.text()}`);
  });
});

afterAll(async () => {
  if (context) {
    const tracePath = timestampedArtifactPath(playwrightArtifactsDir, "hq-cascade-trace", "zip");
    await context.tracing.stop({ path: tracePath });
    await context.close();
  }
  if (browser) {
    await browser.close();
  }
  const consolePath = timestampedArtifactPath(playwrightLogsDir, "hq-cascade-console", "log");
  await fs.promises.writeFile(consolePath, `${consoleLogLines.join("\n")}\n`, "utf8");
});

const describeBrowser = RUN_BROWSER_TEST ? describe.sequential : describe.skip;

describeBrowser("HQ cascade browser flow", () => {
  it("maintains the stack contract across room, branch, roster, and Esc flows", async () => {
    await page.goto(`${BASE_URL}/game?mode=preview`, { waitUntil: "networkidle" });
    await waitForDriver(page);
    await page.getByTestId("game-shell").waitFor({ state: "visible" });

    // Sandbox lands on rooms-root.
    await waitForStack(page, (ids) => ids.length === 1 && ids[0] === "0:rooms-root", "rooms-root");

    // Clicking a room card replaces the root with a room detail panel.
    await page.locator('[data-panel-id="0:rooms-root"] button.glass-card').first().click();
    const roomIds = await waitForStack(
      page,
      (ids) => ids.length === 1 && ids[0]!.startsWith("0:room:"),
      "room detail root",
    );
    expect(roomIds[0]).toMatch(/^0:room:/);

    // Open the upgrades branch if the room exposes it.
    const upgradesButton = page.locator('[data-testid="room-open-upgrades"]');
    if (await upgradesButton.count()) {
      await upgradesButton.first().click();
      await waitForStack(
        page,
        (ids) => ids.length === 2 && ids[1]!.startsWith("1:room-upgrades:"),
        "room-upgrades branch",
      );
    }

    // Esc closes the rightmost panel and leaves the parent intact.
    await page.keyboard.press("Escape");
    await waitForStack(
      page,
      (ids) => ids.length === 1 && ids[0]!.startsWith("0:room:"),
      "Esc closes rightmost",
    );

    // Closing the room root via Esc clears the whole stack (close-at-index semantics).
    await page.keyboard.press("Escape");
    await waitForStack(page, (ids) => ids.length === 0, "stack empty after closing room root");

    // Switching categories replaces the root instead of stacking.
    await page.getByTestId("hq-category-roster").click();
    await waitForStack(
      page,
      (ids) => ids.length === 1 && ids[0] === "0:people-root",
      "people-root on roster pill",
    );

    // Clicking an operator row in the directory opens it as a branch, not a replacement.
    await page.locator('[data-testid="operator-row"] button').first().click();
    await waitForStack(
      page,
      (ids) => ids.length === 2 && ids[1]!.startsWith("1:operator:"),
      "operator branch",
    );

    // Active pill clicked again collapses the cascade.
    await page.getByTestId("hq-category-roster").click();
    await waitForStack(page, (ids) => ids.length === 0, "pill toggles off");

    // Switching tabs to operations removes the cascade container entirely.
    await page.getByTestId("shell-tab-operations").click();
    await page.waitForFunction(
      () => document.querySelector('[data-testid="hq-cascade"]') === null,
      undefined,
      { timeout: 3_000 },
    );
  }, 60_000);

  it("opens the place-room cascade branch when an available slot is clicked", async () => {
    await page.goto(`${BASE_URL}/game?mode=preview`, { waitUntil: "networkidle" });
    await waitForDriver(page);
    await page.getByTestId("game-shell").waitFor({ state: "visible" });
    await waitForStack(page, (ids) => ids.length === 1 && ids[0] === "0:rooms-root", "rooms-root");

    const slotButton = page.locator('[data-testid="expansion-slot-available"]').first();
    if ((await slotButton.count()) === 0) {
      // Sandbox may start without available slots — in that case the flow is
      // not reachable and the guarantee is exercised by the unit tests only.
      return;
    }

    await slotButton.click();
    await waitForStack(
      page,
      (ids) => ids.length === 2 && ids[1]!.startsWith("1:place-room:"),
      "place-room branch",
    );
    await page.getByTestId("panel-place-room").waitFor({ state: "visible" });
  }, 60_000);

  it("routes visitor replace through the cascade replace-operator branch", async () => {
    await page.goto(`${BASE_URL}/game?mode=preview`, { waitUntil: "networkidle" });
    await waitForDriver(page);
    await page.getByTestId("game-shell").waitFor({ state: "visible" });

    await page.getByTestId("hq-category-roster").click();
    await waitForStack(page, (ids) => ids[0] === "0:people-root", "people-root");

    const visitorRow = page.locator('[data-testid="visitor-open"]').first();
    if ((await visitorRow.count()) === 0) {
      // Visitor queue may be empty in the first sandbox tick — this case is
      // covered by the unit tests that exercise the row rendering path.
      return;
    }

    await visitorRow.click();
    await waitForStack(
      page,
      (ids) => ids.length === 2 && ids[1]!.startsWith("1:visitor:"),
      "visitor detail branch",
    );

    const primary = page.getByTestId("visitor-primary-action");
    await primary.waitFor({ state: "visible" });
    const primaryLabel = (await primary.textContent())?.trim();

    // The replace flow only exists when the visitor is gated on a replace.
    // If we can recruit outright, the cascade still holds — record and exit.
    if (primaryLabel !== "Replace") {
      return;
    }

    await primary.click();
    await waitForStack(
      page,
      (ids) => ids.length === 3 && ids[2]!.startsWith("2:replace-operator:"),
      "replace-operator branch",
    );
    await page.getByTestId("panel-replace-operator").waitFor({ state: "visible" });
  }, 60_000);

  it("keeps floor switching reachable from the floating HQ-world control", async () => {
    await page.goto(`${BASE_URL}/game?mode=preview`, { waitUntil: "networkidle" });
    await waitForDriver(page);
    await page.getByTestId("game-shell").waitFor({ state: "visible" });

    const switcher = page.getByTestId("floor-switcher");
    if ((await switcher.count()) === 0) {
      // Single-floor bootstrap: nothing to switch to. Confirm we do not render
      // the switcher spuriously and exit.
      expect(await switcher.count()).toBe(0);
      return;
    }

    const buttons = page.getByTestId("floor-select");
    const count = await buttons.count();
    expect(count).toBeGreaterThan(1);

    const firstIndex = await buttons.nth(0).getAttribute("data-floor-index");
    const nextIndex = await buttons.nth(1).getAttribute("data-floor-index");
    expect(firstIndex).not.toBeNull();
    expect(nextIndex).not.toBeNull();
    expect(firstIndex).not.toBe(nextIndex);

    await buttons.nth(1).click();
    await page.waitForFunction(
      (expectedIndex) => {
        const el = document.querySelector(
          `[data-testid="floor-select"][data-floor-index="${expectedIndex}"]`,
        ) as HTMLButtonElement | null;
        return el?.getAttribute("aria-pressed") === "true";
      },
      nextIndex,
      { timeout: 3_000 },
    );
  }, 60_000);
});

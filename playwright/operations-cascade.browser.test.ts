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
    resetSaveSlots(): Promise<void>;
    seedPortersUpgradeCampaignSave(slotId?: string): Promise<void>;
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
  throw new Error("Unable to launch a Chromium browser for the Operations cascade test.", {
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

async function getSnapshot(page: Page): Promise<BrowserTestSnapshot> {
  const snapshot = await page.evaluate(
    () => (window as BrowserTestWindow).__ASCENSION_BROWSER_TEST__?.getSnapshot() ?? null,
  );
  if (!snapshot) {
    throw new Error("No browser test snapshot available.");
  }
  return snapshot;
}

async function waitForSnapshot(
  page: Page,
  label: string,
  predicate: (snapshot: BrowserTestSnapshot) => boolean,
  timeoutMs = 20_000,
): Promise<BrowserTestSnapshot> {
  const startedAt = Date.now();
  let lastSnapshot: BrowserTestSnapshot | null = null;
  while (Date.now() - startedAt < timeoutMs) {
    try {
      lastSnapshot = await getSnapshot(page);
      if (predicate(lastSnapshot)) {
        return lastSnapshot;
      }
    } catch {
      lastSnapshot = null;
    }
    await page.waitForTimeout(200);
  }

  throw new Error(
    `Timed out waiting for ${label}.${lastSnapshot ? ` Last navigation snapshot: ${JSON.stringify(lastSnapshot.navigation)}` : ""}`,
  );
}

async function loadSeededPortersSave(page: Page): Promise<BrowserTestSnapshot> {
  await page.goto(BASE_URL, { waitUntil: "networkidle" });
  await waitForDriver(page);
  await page.evaluate(async () => {
    const driver = (window as BrowserTestWindow).__ASCENSION_BROWSER_TEST__;
    await driver?.resetSaveSlots();
    await driver?.seedPortersUpgradeCampaignSave("slot/1");
  });

  await page.goto(BASE_URL, { waitUntil: "networkidle" });
  await waitForDriver(page);
  await page.locator('[data-testid="slot-load"][data-slot-id="slot/1"]').click();
  await page.getByTestId("game-shell").waitFor({ state: "visible" });

  return waitForSnapshot(
    page,
    "Porters save loaded",
    (snapshot) =>
      snapshot.building.activeBuildingId === "building/porters" &&
      snapshot.contracts.postedContractIds.length > 0 &&
      snapshot.contracts.raidSummaryCount > 0,
  );
}

async function openOperationsCategory(
  page: Page,
  category: "contract" | "active" | "opportunities" | "history",
): Promise<BrowserTestSnapshot> {
  let snapshot = await getSnapshot(page);
  if (snapshot.navigation.activeTab !== "operations") {
    await page.getByTestId("shell-tab-operations").click({ force: true });
  }
  snapshot = await getSnapshot(page);
  if (snapshot.navigation.opsCategory !== category) {
    await page.getByTestId(`ops-category-${category}`).click({ force: true });
  }

  return waitForSnapshot(
    page,
    `operations ${category}`,
    (next) =>
      next.navigation.activeTab === "operations" && next.navigation.opsCategory === category,
  );
}

async function stackPanelIds(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const panels = document.querySelectorAll('[data-testid="ops-cascade"] [data-panel-id]');
    return Array.from(panels, (panel) => panel.getAttribute("data-panel-id") ?? "");
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
    if (predicate(last)) {
      return last;
    }
    await page.waitForTimeout(100);
  }
  throw new Error(`Timed out waiting for ${label}. Last stack: ${JSON.stringify(last)}`);
}

async function clearInterruptions(page: Page, maxAttempts = 5): Promise<BrowserTestSnapshot> {
  let snapshot = await getSnapshot(page);
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    if (!snapshot.interruption) {
      break;
    }

    if (snapshot.interruption.ctaLabel) {
      await page.getByRole("button", { exact: true, name: snapshot.interruption.ctaLabel }).click();
    } else if (snapshot.interruption.choiceLabels.length > 0) {
      await page
        .getByRole("button", { name: snapshot.interruption.choiceLabels[0] })
        .first()
        .click();
    } else {
      const dismissButton = page.locator('[role="dialog"] button').first();
      if (await dismissButton.isVisible().catch(() => false)) {
        await dismissButton.click();
      } else {
        break;
      }
    }

    const previousId = snapshot.interruption.instanceId;
    snapshot = await waitForSnapshot(
      page,
      "interruption cleared",
      (next) => next.interruption?.instanceId !== previousId,
    );
  }
  return snapshot;
}

async function advanceHour(page: Page): Promise<BrowserTestSnapshot> {
  const before = await getSnapshot(page);
  await page.getByTestId("advance-hour").click({ force: true });
  let snapshot = await waitForSnapshot(
    page,
    "hour advanced",
    (next) => next.clock.absoluteMinute > before.clock.absoluteMinute || next.interruption !== null,
  );
  if (snapshot.interruption) {
    snapshot = await clearInterruptions(page);
  }
  return snapshot;
}

async function advanceRaidUntilDeparted(page: Page): Promise<BrowserTestSnapshot> {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    await advanceHour(page);
    let snapshot = await advanceHour(page);
    if (
      snapshot.contracts.activeRaidIds.length > 0 &&
      snapshot.eventLog.some((entry) => entry.kind === "team_departure" && entry.targetId)
    ) {
      return snapshot;
    }
  }

  throw new Error("Timed out waiting for a raid to launch after securing the contract.");
}

function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function findLatestEventMessage(
  snapshot: BrowserTestSnapshot,
  kind: BrowserTestSnapshot["eventLog"][number]["kind"],
): string {
  for (let index = snapshot.eventLog.length - 1; index >= 0; index -= 1) {
    const entry = snapshot.eventLog[index];
    if (entry?.kind === kind && entry.targetId) {
      return entry.message;
    }
  }
  return "";
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
    viewport: { height: 960, width: 1440 },
  });
  await context.tracing.start({ screenshots: true, snapshots: true });
  page = await context.newPage();
  page.on("console", (message) => {
    consoleLogLines.push(`[${message.type()}] ${message.text()}`);
  });
});

afterAll(async () => {
  if (context) {
    const tracePath = timestampedArtifactPath(
      playwrightArtifactsDir,
      "operations-cascade-trace",
      "zip",
    );
    await context.tracing.stop({ path: tracePath });
    await context.close();
  }
  if (browser) {
    await browser.close();
  }
  const consolePath = timestampedArtifactPath(
    playwrightLogsDir,
    "operations-cascade-console",
    "log",
  );
  await fs.promises.writeFile(consolePath, `${consoleLogLines.join("\n")}\n`, "utf8");
});

const describeBrowser = RUN_BROWSER_TEST ? describe.sequential : describe.skip;

describeBrowser("Operations cascade browser flow", () => {
  it("covers contract, active, opportunity, and history stack flows", async () => {
    const snapshot = await loadSeededPortersSave(page);
    expect(snapshot.contracts.postedContractIds.length).toBeGreaterThan(0);
    expect(snapshot.contracts.raidSummaryCount).toBeGreaterThan(0);

    await openOperationsCategory(page, "contract");
    await waitForStack(
      page,
      (ids) => ids.length === 1 && ids[0] === "0:contract-root",
      "contract-root",
    );

    await page
      .getByTestId("panel-contract-root")
      .getByRole("button", { name: /browse postings/i })
      .click();
    await waitForStack(
      page,
      (ids) => ids.length === 2 && ids[1] === "1:posting-board",
      "posting board branch",
    );

    await page.getByTestId("panel-posting-board").getByTestId("contract-card").first().click();
    await waitForStack(
      page,
      (ids) => ids.length === 3 && ids[2]!.startsWith("2:posting:"),
      "posting detail branch",
    );

    await page.keyboard.press("Escape");
    await waitForStack(
      page,
      (ids) => ids.length === 2 && ids[1] === "1:posting-board",
      "Esc closes posting detail",
    );

    await page.getByTestId("panel-posting-board").getByTestId("contract-card").first().click();
    await waitForStack(
      page,
      (ids) => ids.length === 3 && ids[2]!.startsWith("2:posting:"),
      "posting detail reopened",
    );
    await page.getByTestId("contract-bid-button").click();

    await waitForSnapshot(
      page,
      "contract activated",
      (next) => next.contracts.contractLifecycle === "active",
    );
    await advanceRaidUntilDeparted(page);
    await page.getByTestId("contract-active-open").click();
    await waitForStack(
      page,
      (ids) => ids.length === 1 && ids[0] === "0:active-root",
      "active-root",
    );

    await page.getByTestId("active-raid-card").first().click();
    await waitForStack(
      page,
      (ids) => ids.length === 2 && ids[1]!.startsWith("1:team:"),
      "team detail branch",
    );
    await page.getByTestId("panel-team-detail-close").click();
    await waitForStack(
      page,
      (ids) => ids.length === 1 && ids[0] === "0:active-root",
      "team close truncates to active root",
    );

    await openOperationsCategory(page, "opportunities");
    await waitForStack(
      page,
      (ids) => ids.length === 1 && ids[0] === "0:opportunities-root",
      "opportunities-root",
    );
    if ((await page.getByTestId("opportunity-card").count()) > 0) {
      await page.getByTestId("opportunity-card").first().click();
      await waitForStack(
        page,
        (ids) => ids.length === 2 && ids[1]!.startsWith("1:opportunity:"),
        "opportunity detail branch",
      );
    }

    await openOperationsCategory(page, "history");
    await waitForStack(
      page,
      (ids) => ids.length === 1 && ids[0] === "0:history-root",
      "history-root",
    );
    await page.getByTestId("raid-summary-card").first().click();
    await waitForStack(
      page,
      (ids) => ids.length === 2 && ids[1]!.startsWith("1:raid-summary:"),
      "history detail branch",
    );
  }, 120_000);

  it("routes event-log team clicks into the operations active cascade", async () => {
    await loadSeededPortersSave(page);
    await openOperationsCategory(page, "contract");

    await page
      .getByTestId("panel-contract-root")
      .getByRole("button", { name: /browse postings/i })
      .click();
    await page.getByTestId("panel-posting-board").getByTestId("contract-card").first().click();
    await page.getByTestId("contract-bid-button").click();

    let snapshot = await advanceRaidUntilDeparted(page);

    await page.getByRole("button", { name: /event log/i }).click();
    const departureMessage = findLatestEventMessage(snapshot, "team_departure");
    expect(departureMessage).not.toBe("");
    await page.getByRole("button", { name: new RegExp(escapeRegex(departureMessage)) }).click();
    await waitForStack(
      page,
      (ids) => ids.length === 2 && ids[0] === "0:active-root" && ids[1]!.startsWith("1:team:"),
      "event log opens active team detail",
    );
  }, 120_000);
});

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
    runDevCommand(command: string): { detail?: string; message: string; status: string } | null;
    seedNewGameSave(slotId?: string, seed?: number): Promise<void>;
    seedRelocationReadySave(slotId?: string): Promise<void>;
    seedPortersUpgradeCampaignSave(slotId?: string): Promise<void>;
  };
};

// ---------------------------------------------------------------------------
// Balance ledger types
// ---------------------------------------------------------------------------

interface BalanceCheckpoint {
  label: string;
  day: number;
  minute: number;
  cash: number;
  reputation: number;
  intel: number;
  operatorCount: number;
  roomCount: number;
  raidCount: number;
  buildingTier: number;
  buildingName: string;
  contractLifecycle: string;
  postedContractCount: number;
  upgradesApplied: number;
}

const balanceLedger: BalanceCheckpoint[] = [];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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
    throw new Error(`Browser test requires a running dev server at ${BASE_URL}. Start it first.`, {
      cause: error,
    });
  }
  if (!response.ok && response.status !== 304) {
    throw new Error(`Dev server at ${BASE_URL} returned HTTP ${response.status}.`);
  }
}

async function launchBrowser(): Promise<Browser> {
  const attempts: Array<Parameters<typeof chromium.launch>[0]> = [
    { channel: "msedge", headless: false },
    { channel: "chrome", headless: false },
    { headless: false },
  ];
  let lastError: unknown;
  for (const attempt of attempts) {
    try {
      return await chromium.launch(attempt);
    } catch (error) {
      lastError = error;
    }
  }
  throw new Error("Unable to launch a Chromium browser.", { cause: lastError });
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
  if (!snapshot) throw new Error("No browser test snapshot available.");
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
      if (predicate(lastSnapshot)) return lastSnapshot;
    } catch {
      lastSnapshot = null;
    }
    await page.waitForTimeout(200);
  }
  throw new Error(
    `Timed out waiting for ${label}.${lastSnapshot ? ` Resources: cash=${lastSnapshot.resources.cash}, rep=${lastSnapshot.resources.reputation}` : ""}`,
  );
}

async function captureScreenshot(page: Page, prefix: string): Promise<void> {
  const target = timestampedArtifactPath(playwrightScreenshotsDir, prefix, "png");
  await page.screenshot({ path: target, fullPage: true });
}

function recordCheckpoint(label: string, snapshot: BrowserTestSnapshot): void {
  balanceLedger.push({
    label,
    day: snapshot.clock.day,
    minute: snapshot.clock.absoluteMinute,
    cash: snapshot.resources.cash,
    reputation: snapshot.resources.reputation,
    intel: snapshot.resources.intel,
    operatorCount: snapshot.roster.livingOperatorIds.length,
    roomCount: snapshot.rooms.length,
    raidCount: snapshot.contracts.raidSummaryCount,
    buildingTier: snapshot.building.tier,
    buildingName: snapshot.building.activeBuildingName,
    contractLifecycle: snapshot.contracts.contractLifecycle,
    postedContractCount: snapshot.contracts.postedContractIds.length,
    upgradesApplied: snapshot.upgrades.appliedIds.length,
  });
}

async function runDevConsoleCommand(page: Page, command: string): Promise<void> {
  const result = await page.evaluate(
    (input) =>
      (window as BrowserTestWindow).__ASCENSION_BROWSER_TEST__?.runDevCommand(input) ?? null,
    command,
  );
  if (!result || result.status === "error") {
    throw new Error(
      `Dev command failed: ${command}${result?.message ? ` (${result.message})` : ""}`,
    );
  }
  await page.waitForTimeout(200);
}

async function runDevConsoleCommandAndReadOutput(page: Page, command: string): Promise<string> {
  const result = await page.evaluate(
    (input) =>
      (window as BrowserTestWindow).__ASCENSION_BROWSER_TEST__?.runDevCommand(input) ?? null,
    command,
  );
  await page.waitForTimeout(200);
  if (!result || result.status === "error") {
    throw new Error(
      `Dev command failed: ${command}${result?.message ? ` (${result.message})` : ""}`,
    );
  }
  return result.detail ?? result.message;
}

async function clearInterruptions(page: Page, maxAttempts = 5): Promise<BrowserTestSnapshot> {
  let snapshot = await getSnapshot(page);
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (!snapshot.interruption) break;

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
      (s) => s.interruption?.instanceId !== previousId,
    );
  }
  return snapshot;
}

async function bidOnFirstPostedContract(page: Page): Promise<BrowserTestSnapshot> {
  let snapshot = await getSnapshot(page);
  if (snapshot.navigation.activeTab !== "operations") {
    await page.getByTestId("shell-tab-operations").click({ force: true });
  }
  snapshot = await getSnapshot(page);
  if (snapshot.navigation.opsCategory !== "contract") {
    await page.getByTestId("ops-category-contract").click({ force: true });
  }
  await waitForSnapshot(
    page,
    "operations contract board",
    (s) => s.navigation.activeTab === "operations" && s.navigation.opsCategory === "contract",
  );

  await page
    .getByTestId("panel-contract-root")
    .getByRole("button", { name: /browse postings/i })
    .click();
  await page.getByTestId("panel-posting-board").getByTestId("contract-card").first().click();
  await page.getByTestId("contract-bid-button").click();
  return waitForSnapshot(
    page,
    "contract active after bid",
    (s) => s.contracts.contractLifecycle === "active",
  );
}

async function forceCompleteContract(
  page: Page,
  outcome: "mission_complete" | "boss_defeated",
): Promise<BrowserTestSnapshot> {
  const before = await getSnapshot(page);
  const raidCountBefore = before.contracts.raidSummaryCount;

  await runDevConsoleCommand(page, `contract outcome ${outcome}`);

  // Wait for the outcome to register (raid count increases or result appears)
  let snapshot = await waitForSnapshot(
    page,
    `contract ended (${outcome})`,
    (s) =>
      s.contracts.contractResult !== null ||
      s.contracts.raidSummaryCount > raidCountBefore ||
      s.contracts.contractLifecycle === "bidding",
    30_000,
  );

  // Clear any result interruptions
  snapshot = await clearInterruptions(page);

  // Tick time to let the lifecycle reset to bidding
  if (snapshot.contracts.contractLifecycle !== "bidding") {
    await runDevConsoleCommand(page, "tick 2h");
    snapshot = await clearInterruptions(page);
    snapshot = await getSnapshot(page);
  }

  return snapshot;
}

// ---------------------------------------------------------------------------
// Test setup
// ---------------------------------------------------------------------------

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
  // Write balance ledger
  const ledgerPath = timestampedArtifactPath(playwrightLogsDir, "economy-balance-ledger", "json");
  await fs.promises.writeFile(ledgerPath, JSON.stringify(balanceLedger, null, 2), "utf8");

  // Write human-readable summary
  const summaryLines = [
    "=== Economy Balance Ledger ===",
    "",
    "Checkpoint".padEnd(40) +
      "Day".padStart(5) +
      "Cash".padStart(8) +
      "Rep".padStart(6) +
      "Intel".padStart(7) +
      "Ops".padStart(5) +
      "Rooms".padStart(7) +
      "Raids".padStart(7) +
      "Tier".padStart(6),
    "-".repeat(91),
    ...balanceLedger.map(
      (cp) =>
        cp.label.padEnd(40) +
        String(cp.day).padStart(5) +
        String(cp.cash).padStart(8) +
        String(cp.reputation).padStart(6) +
        String(cp.intel).padStart(7) +
        String(cp.operatorCount).padStart(5) +
        String(cp.roomCount).padStart(7) +
        String(cp.raidCount).padStart(7) +
        String(cp.buildingTier).padStart(6),
    ),
    "",
  ];
  const summaryPath = timestampedArtifactPath(playwrightLogsDir, "economy-balance-summary", "txt");
  await fs.promises.writeFile(summaryPath, summaryLines.join("\n"), "utf8");

  if (context) {
    const tracePath = timestampedArtifactPath(
      playwrightArtifactsDir,
      "economy-balance-trace",
      "zip",
    );
    await context.tracing.stop({ path: tracePath });
    await context.close();
  }
  if (browser) await browser.close();

  const consolePath = timestampedArtifactPath(playwrightLogsDir, "economy-balance-console", "log");
  await fs.promises.writeFile(consolePath, `${consoleLogLines.join("\n")}\n`, "utf8");
});

const describeBrowser = RUN_BROWSER_TEST ? describe.sequential : describe.skip;

// ---------------------------------------------------------------------------
// Early game → mid game balance test
// ---------------------------------------------------------------------------

describeBrowser("Economy balance: early game through midgame", () => {
  it("tracks economy progression from new game through early-game days", async () => {
    // ── Seed and load a new game ──────────────────────────────────────
    await page.goto(BASE_URL, { waitUntil: "networkidle" });
    await waitForDriver(page);
    await page.evaluate(async () => {
      const driver = (window as BrowserTestWindow).__ASCENSION_BROWSER_TEST__;
      await driver?.resetSaveSlots();
      await driver?.seedNewGameSave("slot/1", 42);
    });
    await page.goto(BASE_URL, { waitUntil: "networkidle" });
    await waitForDriver(page);
    await page.locator('[data-testid="slot-load"][data-slot-id="slot/1"]').click();
    await page.getByTestId("game-shell").waitFor({ state: "visible" });

    let snapshot = await waitForSnapshot(
      page,
      "new game loaded",
      (s) => s.building.activeBuildingId === "building/bodega" && s.resources.cash > 0,
    );

    recordCheckpoint("New game start", snapshot);
    await captureScreenshot(page, "balance-01-new-game");

    // ── Skip opening tutorial ────────────────────────────────────────
    snapshot = await clearInterruptions(page);
    await runDevConsoleCommand(page, "guidance reset-opening");
    snapshot = await clearInterruptions(page);

    // ── Jump through several days to simulate early progression ──────
    for (const targetDay of [3, 5, 8, 12]) {
      await runDevConsoleCommand(page, `day ${targetDay}`);
      snapshot = await clearInterruptions(page);
      snapshot = await getSnapshot(page);
      recordCheckpoint(`Day ${targetDay}`, snapshot);
    }
    await captureScreenshot(page, "balance-02-day-12");

    // ── Give resources to simulate a few contract completions ────────
    await runDevConsoleCommand(page, "cash +500");
    await runDevConsoleCommand(page, "rep +15");
    snapshot = await getSnapshot(page);
    recordCheckpoint("After simulated early contracts (rep 15)", snapshot);
    await captureScreenshot(page, "balance-03-early-contracts");

    // ── Jump further: E-rank unlocked (rep >= 5) ─────────────────────
    await runDevConsoleCommand(page, "rep 25");
    await runDevConsoleCommand(page, "day 20");
    snapshot = await clearInterruptions(page);
    snapshot = await getSnapshot(page);
    recordCheckpoint("Day 20 (E+D contracts unlocked)", snapshot);
    await captureScreenshot(page, "balance-04-e-rank-unlocked");

    // ── Assertions on early game balance ─────────────────────────────
    expect(snapshot.building.activeBuildingId).toBe("building/bodega");
    expect(snapshot.resources.reputation).toBeGreaterThanOrEqual(20);
  }, 120_000);

  it("validates the relocation-ready late-bodega economy state", async () => {
    // ── Seed relocation-ready save ───────────────────────────────────
    await page.goto(BASE_URL, { waitUntil: "networkidle" });
    await waitForDriver(page);
    await page.evaluate(async () => {
      const driver = (window as BrowserTestWindow).__ASCENSION_BROWSER_TEST__;
      await driver?.resetSaveSlots();
      await driver?.seedRelocationReadySave("slot/1");
    });
    await page.goto(BASE_URL, { waitUntil: "networkidle" });
    await waitForDriver(page);
    await page.locator('[data-testid="slot-load"][data-slot-id="slot/1"]').click();
    await page.getByTestId("game-shell").waitFor({ state: "visible" });

    let snapshot = await waitForSnapshot(
      page,
      "relocation save loaded",
      (s) => s.building.activeBuildingId === "building/bodega" && s.resources.reputation >= 20,
    );

    recordCheckpoint("Relocation-ready bodega", snapshot);
    await captureScreenshot(page, "balance-07-relocation-ready");

    // ── Inspect the late-bodega economy state ────────────────────────
    const contractOutput = await runDevConsoleCommandAndReadOutput(page, "inspect contracts");
    consoleLogLines.push(`[balance-inspect] contracts: ${contractOutput}`);

    const roomOutput = await runDevConsoleCommandAndReadOutput(page, "inspect rooms");
    consoleLogLines.push(`[balance-inspect] rooms: ${roomOutput}`);

    const operatorOutput = await runDevConsoleCommandAndReadOutput(page, "inspect operators");
    consoleLogLines.push(`[balance-inspect] operators: ${operatorOutput}`);

    // ── Validate late bodega state ───────────────────────────────────
    expect(snapshot.resources.reputation).toBeGreaterThanOrEqual(20);
    expect(snapshot.roster.livingOperatorIds.length).toBeGreaterThanOrEqual(4);
    expect(snapshot.rooms.length).toBeGreaterThanOrEqual(4);
    expect(snapshot.building.tier).toBeGreaterThanOrEqual(3);

    // Check relocation gate visibility
    expect(snapshot.relocation.visible).toBe(true);
    await captureScreenshot(page, "balance-08-relocation-gate");
  }, 120_000);

  it("validates the Porter's midgame economy and room breadth", async () => {
    // ── Seed Porter's campaign save ─────────────────────────────────
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

    let snapshot = await waitForSnapshot(
      page,
      "Porter's save loaded",
      (s) =>
        s.building.activeBuildingId === "building/porters" &&
        s.contracts.postedContractIds.length > 0,
    );

    recordCheckpoint("Porter's midgame start", snapshot);
    await captureScreenshot(page, "balance-09-porters-start");

    // ── Inspect mid-game economy ─────────────────────────────────────
    const contractOutput = await runDevConsoleCommandAndReadOutput(page, "inspect contracts");
    consoleLogLines.push(`[midgame-inspect] contracts: ${contractOutput}`);

    const roomOutput = await runDevConsoleCommandAndReadOutput(page, "inspect rooms");
    consoleLogLines.push(`[midgame-inspect] rooms: ${roomOutput}`);

    const operatorOutput = await runDevConsoleCommandAndReadOutput(page, "inspect operators");
    consoleLogLines.push(`[midgame-inspect] operators: ${operatorOutput}`);

    // ── Run a midgame contract cycle ─────────────────────────────────
    const preBidCash = snapshot.resources.cash;
    snapshot = await bidOnFirstPostedContract(page);
    const postBidCash = snapshot.resources.cash;
    const bidCost = preBidCash - postBidCash;
    consoleLogLines.push(
      `[midgame-balance] Bid cost: ${bidCost} (pre: ${preBidCash}, post: ${postBidCash})`,
    );
    recordCheckpoint("Midgame contract bid", snapshot);
    await captureScreenshot(page, "balance-10-midgame-contract-bid");

    // Force complete the contract
    snapshot = await forceCompleteContract(page, "mission_complete");
    recordCheckpoint("Midgame contract 1 (mission complete)", snapshot);
    await captureScreenshot(page, "balance-11-midgame-contract-done");

    const cashGainFromContract = snapshot.resources.cash - postBidCash;
    consoleLogLines.push(`[midgame-balance] Cash gain from contract: ${cashGainFromContract}`);

    snapshot = await clearInterruptions(page);

    // ── Validate midgame economy ─────────────────────────────────────
    expect(snapshot.building.activeBuildingId).toBe("building/porters");
    expect(snapshot.resources.cash).toBeGreaterThan(0);

    await captureScreenshot(page, "balance-12-final-state");

    // ── Log final summary ────────────────────────────────────────────
    consoleLogLines.push("");
    consoleLogLines.push("=== ECONOMY BALANCE SUMMARY ===");
    for (const cp of balanceLedger) {
      consoleLogLines.push(
        `  ${cp.label}: day=${cp.day} cash=${cp.cash} rep=${cp.reputation} intel=${cp.intel} ops=${cp.operatorCount} rooms=${cp.roomCount} raids=${cp.raidCount} tier=${cp.buildingTier}`,
      );
    }
  }, 300_000);
});

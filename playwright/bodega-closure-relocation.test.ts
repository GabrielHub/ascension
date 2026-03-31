import fs from "node:fs/promises";

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { chromium, type Browser, type BrowserContext, type Page } from "playwright";

import type { BrowserTestSnapshot } from "../app/features/browser/test-driver";
import {
  ensurePlaywrightArtifactDirs,
  playwrightArtifactsDir,
  playwrightLogsDir,
  playwrightScreenshotsDir,
  timestampedArtifactPath,
} from "./paths";

const BASE_URL = process.env.ASCENSION_BASE_URL ?? "http://127.0.0.1:5173";
const RELOCATION_COST = 600;
const RUN_BROWSER_TEST = process.env.ASCENSION_RUN_BROWSER_TESTS === "1";
const EXPECTED_PORTERS_STARTER_ROOMS = [
  "room/bar:tier_1",
  "room/floor:tier_1",
  "room/gym:tier_1",
  "room/infirmary:tier_1",
  "room/office:tier_1",
  "room/prep_room:tier_1",
  "room/stockroom:tier_1",
] as const;

interface RelocationSummary {
  activeBuildingId: string;
  activeFloorIndex: number;
  blockerCount: number;
  cash: number;
  contractLifecycle: string;
  interruptionTitle: string | null;
  inventory: BrowserTestSnapshot["inventory"];
  operatorIds: string[];
  postedContractIds: string[];
  reputation: number;
  roomTemplates: string[];
  slotId?: string;
  staffIds: string[];
  status: BrowserTestSnapshot["relocation"]["status"];
}

interface RelocationRunReport {
  baseUrl: string;
  checkpoints: {
    afterRefresh: RelocationSummary;
    midMove: RelocationSummary;
    postMove: RelocationSummary;
    preMove: RelocationSummary;
  };
}

type BrowserTestWindow = Window & {
  __ASCENSION_BROWSER_TEST__?: {
    getSnapshot(): BrowserTestSnapshot | null;
    resetSaveSlots(): Promise<void>;
    seedRelocationReadySave(slotId?: string): Promise<void>;
  };
};

function summarizeSnapshot(snapshot: BrowserTestSnapshot): RelocationSummary {
  return {
    activeBuildingId: snapshot.building.activeBuildingId,
    activeFloorIndex: snapshot.building.activeFloorIndex,
    blockerCount: snapshot.relocation.blockers.length,
    cash: snapshot.resources.cash,
    contractLifecycle: snapshot.contracts.contractLifecycle,
    interruptionTitle: snapshot.interruption?.title ?? null,
    inventory: snapshot.inventory,
    operatorIds: [...snapshot.roster.operatorIds],
    postedContractIds: [...snapshot.contracts.postedContractIds],
    reputation: snapshot.resources.reputation,
    roomTemplates: snapshot.rooms.map((room) => room.templateId).sort(),
    slotId: snapshot.session.slotId,
    staffIds: [...snapshot.roster.staffIds],
    status: snapshot.relocation.status,
  };
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

  throw new Error("Unable to launch a Chromium browser for the bodega closure test.", {
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
    throw new Error("The browser test driver did not publish a runtime snapshot.");
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
    `Timed out waiting for ${label}.${lastSnapshot ? ` Last snapshot: ${JSON.stringify(summarizeSnapshot(lastSnapshot))}` : ""}`,
  );
}

async function captureScreenshot(page: Page, prefix: string): Promise<void> {
  const target = timestampedArtifactPath(playwrightScreenshotsDir, prefix, "png");
  await page.screenshot({ path: target, fullPage: true });
}

async function openManagement(page: Page): Promise<void> {
  const snapshot = await getSnapshot(page);
  if (snapshot.navigation.activeTab !== "hq") {
    await page.getByTestId("shell-tab-hq").click({ force: true });
  }
  if (snapshot.navigation.hqCategory !== "management") {
    await page.getByTestId("hq-category-management").click({ force: true });
  }
  await page.getByTestId("management-panel").waitFor({ state: "visible" });
  await page.getByTestId("management-relocation").waitFor({ state: "visible" });
}

async function openOperations(page: Page): Promise<void> {
  const snapshot = await getSnapshot(page);
  if (snapshot.navigation.activeTab !== "operations") {
    await page.getByTestId("shell-tab-operations").click({ force: true });
  }
  if (snapshot.navigation.opsCategory !== "contract") {
    await page.getByTestId("ops-category-contract").click({ force: true });
  }
}

let browser: Browser;
let context: BrowserContext;
let page: Page;
let runReport: RelocationRunReport | null = null;
const consoleLogLines: string[] = [];

beforeAll(async () => {
  ensurePlaywrightArtifactDirs();
  await ensureDevServer();

  browser = await launchBrowser();
  context = await browser.newContext({
    viewport: {
      height: 960,
      width: 1440,
    },
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
    const tracePath = timestampedArtifactPath(
      playwrightArtifactsDir,
      "bodega-closure-relocation-trace",
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
    "bodega-closure-relocation-console",
    "log",
  );
  await fs.writeFile(consolePath, `${consoleLogLines.join("\n")}\n`, "utf8");

  if (runReport) {
    const reportPath = timestampedArtifactPath(
      playwrightLogsDir,
      "bodega-closure-relocation-report",
      "json",
    );
    await fs.writeFile(reportPath, `${JSON.stringify(runReport, null, 2)}\n`, "utf8");
  }
});

const describeBrowser = RUN_BROWSER_TEST ? describe.sequential : describe.skip;

describeBrowser("bodega closure relocation browser path", () => {
  it("verifies the late-bodega relocation handoff into Porter's and survives refresh", async () => {
    await page.goto(BASE_URL, { waitUntil: "networkidle" });
    await waitForDriver(page);
    await page.evaluate(() =>
      (window as BrowserTestWindow).__ASCENSION_BROWSER_TEST__!.resetSaveSlots(),
    );
    await page.evaluate(() =>
      (window as BrowserTestWindow).__ASCENSION_BROWSER_TEST__!.seedRelocationReadySave("slot/1"),
    );

    await page.goto(BASE_URL, { waitUntil: "networkidle" });
    await waitForDriver(page);
    await page.locator('[data-testid="slot-load"][data-slot-id="slot/1"]').click();
    await page.getByTestId("game-shell").waitFor({ state: "visible" });

    const preMove = await waitForSnapshot(
      page,
      "relocation-ready late bodega state",
      (next) =>
        next.session.slotId === "slot/1" &&
        next.building.activeBuildingId === "building/bodega" &&
        next.relocation.visible &&
        next.relocation.status === "ready" &&
        next.relocation.blockers.length === 0 &&
        next.roster.livingOperatorIds.length >= 8,
    );
    await captureScreenshot(page, "bodega-closure-pre-move");

    expect(preMove.building.tier).toBe(4);
    expect(preMove.resources.cash).toBe(1400);
    expect(preMove.resources.reputation).toBe(55);
    expect(preMove.contracts.contractLifecycle).toBe("bidding");
    expect(preMove.contracts.raidSummaryCount).toBe(20);
    expect(preMove.roster.operatorIds.length).toBeGreaterThanOrEqual(8);
    expect(preMove.roster.staffIds.length).toBeGreaterThanOrEqual(2);
    expect(preMove.relocation.prerequisiteStates.every((state) => state.met)).toBe(true);
    expect(preMove.rooms.map((room) => room.templateId)).toEqual(
      expect.arrayContaining([
        "room/alley_staging:tier_1",
        "room/back_office:tier_1",
        "room/backstock:tier_1",
        "room/counter:tier_1",
      ]),
    );

    await openManagement(page);
    const relocationCard = page.getByTestId("management-relocation");
    await relocationCard.getByText(/^Building fully upgraded$/).waitFor({ state: "visible" });
    await relocationCard.getByText(/^Reputation$/).waitFor({ state: "visible" });
    await relocationCard.getByText(/^Treasury$/).waitFor({ state: "visible" });
    await relocationCard.getByText(/^Contracts completed$/).waitFor({ state: "visible" });
    await relocationCard.getByText(/^Active roster$/).waitFor({ state: "visible" });
    await relocationCard.getByText(/^Boss encounters completed$/).waitFor({ state: "visible" });
    await relocationCard.getByText(/^Ready$/).waitFor({ state: "visible" });

    const startRelocationButton = page.getByRole("button", { name: "Start Relocation Review" });
    expect(await startRelocationButton.isEnabled()).toBe(true);

    await startRelocationButton.click();
    const initiatedRelocation = await waitForSnapshot(
      page,
      "relocation review initiation",
      (next) => next.relocation.status === "blocked" && next.relocation.blockers.length > 0,
    );
    expect(initiatedRelocation.building.activeBuildingId).toBe("building/bodega");
    await page.getByText("Facility Upgrade Notice").waitFor({ state: "visible" });
    await page.getByRole("button", { exact: true, name: "Review Offer" }).waitFor({
      state: "visible",
    });
    const offerBeat = await getSnapshot(page);
    expect(offerBeat.resources.cash).toBe(preMove.resources.cash);
    expect(offerBeat.building.activeBuildingId).toBe("building/bodega");
    await captureScreenshot(page, "bodega-closure-offer-beat");

    await page.getByRole("button", { exact: true, name: "Review Offer" }).click();
    await page.getByText("Relocate to Porter's?").waitFor({ state: "visible" });
    await page.getByRole("button", { exact: true, name: "Accept and Relocate" }).waitFor({
      state: "visible",
    });
    const decisionBeat = await getSnapshot(page);
    expect(decisionBeat.resources.cash).toBe(preMove.resources.cash);
    expect(decisionBeat.building.activeBuildingId).toBe("building/bodega");
    await captureScreenshot(page, "bodega-closure-decision-beat");

    await page.getByRole("button", { exact: true, name: "Accept and Relocate" }).dblclick();
    await page.getByText("Welcome to Porter's").waitFor({ state: "visible" });
    await page.getByRole("button", { exact: true, name: "Begin" }).waitFor({
      state: "visible",
    });
    const midMove = await getSnapshot(page);
    expect(midMove.building.activeBuildingId).toBe("building/bodega");
    expect(midMove.resources.cash).toBe(preMove.resources.cash - RELOCATION_COST);
    expect(midMove.resources.reputation).toBe(preMove.resources.reputation);
    await captureScreenshot(page, "bodega-closure-moving-beat");

    await page.getByRole("button", { exact: true, name: "Begin" }).click();
    const postMove = await waitForSnapshot(
      page,
      "post-relocation Porter's arrival",
      (next) =>
        next.building.activeBuildingId === "building/porters" &&
        next.interruption === null &&
        next.contracts.contractLifecycle === "bidding" &&
        next.contracts.contractSiteId === null &&
        next.contracts.contractResult === null &&
        next.contracts.activeRaidIds.length === 0 &&
        next.contracts.postedContractIds.length > 0,
    );
    const settledPostMove = await waitForSnapshot(
      page,
      "post-relocation save settle",
      (next) =>
        next.building.activeBuildingId === "building/porters" &&
        next.session.persistenceStatus === "idle",
      15_000,
    );
    await captureScreenshot(page, "bodega-closure-post-move");

    expect(postMove.building.activeBuildingName).toBe("Porter's");
    expect(postMove.building.floorCount).toBe(2);
    expect(postMove.building.activeFloorIndex).toBe(0);
    expect(postMove.building.tier).toBe(1);
    expect(postMove.rooms).toHaveLength(7);
    expect(postMove.rooms.map((room) => room.templateId).sort()).toEqual(
      EXPECTED_PORTERS_STARTER_ROOMS,
    );
    expect(postMove.rooms.filter((room) => room.floorIndex === 0)).toHaveLength(2);
    expect(postMove.rooms.filter((room) => room.floorIndex === 1)).toHaveLength(5);
    expect(postMove.roster.operatorIds).toEqual(preMove.roster.operatorIds);
    expect(postMove.roster.staffIds).toEqual(preMove.roster.staffIds);
    expect(postMove.inventory).toEqual(preMove.inventory);
    expect(postMove.resources.cash).toBe(preMove.resources.cash - RELOCATION_COST);
    expect(postMove.resources.reputation).toBe(preMove.resources.reputation);
    expect(postMove.contracts.contractLifecycle).toBe("bidding");
    expect(postMove.contracts.activeRaidIds).toEqual([]);
    expect(postMove.contracts.postedContractIds.length).toBeGreaterThan(0);
    expect(postMove.contracts.postedContractIds).not.toEqual(preMove.contracts.postedContractIds);

    await openOperations(page);
    const postMoveOperations = await getSnapshot(page);
    expect(postMoveOperations.contracts.contractLifecycle).toBe("bidding");
    expect(postMoveOperations.contracts.contractSiteId).toBeNull();
    expect(postMoveOperations.contracts.activeRaidIds).toEqual([]);
    expect(postMoveOperations.contracts.postedContractIds.length).toBeGreaterThan(0);

    await openManagement(page);
    await page.getByTestId("management-relocation").getByText("Completed").waitFor({
      state: "visible",
    });

    await page.reload({ waitUntil: "networkidle" });
    await waitForDriver(page);
    const afterRefresh = await waitForSnapshot(
      page,
      "post-relocation refresh restore",
      (next) =>
        next.session.slotId === "slot/1" &&
        next.building.activeBuildingId === "building/porters" &&
        next.contracts.contractLifecycle === "bidding" &&
        next.interruption === null,
    );
    await captureScreenshot(page, "bodega-closure-after-refresh");

    expect(afterRefresh.rooms.map((room) => room.templateId).sort()).toEqual(
      EXPECTED_PORTERS_STARTER_ROOMS,
    );
    expect(afterRefresh.roster.operatorIds).toEqual(preMove.roster.operatorIds);
    expect(afterRefresh.roster.staffIds).toEqual(preMove.roster.staffIds);
    expect(afterRefresh.inventory).toEqual(preMove.inventory);
    expect(afterRefresh.resources.cash).toBe(preMove.resources.cash - RELOCATION_COST);
    expect(afterRefresh.resources.reputation).toBe(preMove.resources.reputation);
    expect(afterRefresh.contracts.postedContractIds).toEqual(postMove.contracts.postedContractIds);

    await openManagement(page);
    await page.getByTestId("management-relocation").getByText("Completed").waitFor({
      state: "visible",
    });

    runReport = {
      baseUrl: BASE_URL,
      checkpoints: {
        afterRefresh: summarizeSnapshot(afterRefresh),
        midMove: summarizeSnapshot(midMove),
        postMove: summarizeSnapshot(settledPostMove),
        preMove: summarizeSnapshot(preMove),
      },
    };
  }, 60_000);
});

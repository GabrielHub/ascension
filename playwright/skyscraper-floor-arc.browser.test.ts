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
  throw new Error(
    "Unable to launch a Chromium browser for the skyscraper floor arc browser test.",
    {
      cause: lastError,
    },
  );
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
    `Timed out waiting for ${label}.${lastSnapshot ? ` Last snapshot building: ${JSON.stringify(lastSnapshot.building)}` : ""}`,
  );
}

async function captureScreenshot(page: Page, prefix: string): Promise<void> {
  const target = timestampedArtifactPath(playwrightScreenshotsDir, prefix, "png");
  await page.screenshot({ path: target, fullPage: true });
}

async function openHqCategory(
  page: Page,
  category: "rooms" | "management",
): Promise<BrowserTestSnapshot> {
  let snapshot = await getSnapshot(page);
  if (snapshot.navigation.activeTab !== "hq") {
    await page.getByTestId("shell-tab-hq").click({ force: true });
  }
  snapshot = await getSnapshot(page);
  if (snapshot.navigation.hqCategory !== category) {
    await page.getByTestId(`hq-category-${category}`).click({ force: true });
  }
  return waitForSnapshot(page, `hq ${category}`, (next) => next.navigation.hqCategory === category);
}

async function selectRoom(page: Page, roomName: string): Promise<void> {
  const roomButton = page.locator("button.glass-card").filter({ hasText: roomName }).first();
  const className = await roomButton.evaluate((element) => element.className);
  if (!className.includes("border-[rgba(200,168,76,0.3)]")) {
    await roomButton.click();
  }
}

async function purchaseBuildingUpgrade(
  page: Page,
  roomName: string,
  upgradeName: string,
  upgradeId: string,
): Promise<BrowserTestSnapshot> {
  await openHqCategory(page, "rooms");
  await selectRoom(page, roomName);
  const purchaseButton = page
    .locator(".glass-card-inset")
    .filter({ hasText: upgradeName })
    .getByRole("button", { exact: true, name: "Purchase" });
  await purchaseButton.click();
  return waitForSnapshot(page, `${upgradeName} purchased`, (snapshot) =>
    snapshot.upgrades.appliedIds.includes(upgradeId),
  );
}

/**
 * Seed the save slot with a fresh Ascension Tower world: skyscraper baseline
 * (tier 1, 11 starter rooms across five floors), with cash and reputation
 * tuned high enough to buy at least one floor expansion.
 */
async function loadSkyscraperBaselineSave(page: Page): Promise<BrowserTestSnapshot> {
  await page.goto(BASE_URL, { waitUntil: "networkidle" });
  await waitForDriver(page);
  await page.evaluate(async () => {
    const driver = (window as BrowserTestWindow).__ASCENSION_BROWSER_TEST__;
    await driver?.resetSaveSlots();
    const importModule = (specifier: string) => (0, eval)(`import("${specifier}")`);
    const [saveModule, layoutModule, simModule, templateModule, roomStateModule, portersModule] =
      await Promise.all([
        importModule("/save/index.ts"),
        importModule("/content/building-layouts.ts"),
        importModule("/sim/index.ts"),
        importModule("/content/templates/index.ts"),
        importModule("/lib/hq-room-state.ts"),
        importModule("/sim/tools/porters-upgrade-campaign.ts"),
      ]);

    const portersWorld = portersModule.createPortersUpgradeCampaignSeedWorld();
    const skyscraperWorld = structuredClone(portersWorld);
    const starterFloors = layoutModule.getBuildingFloors("building/skyscraper", 1);

    skyscraperWorld.building = {
      activeBuildingId: "building/skyscraper",
      activeBuildingTier: 1,
      activeFloorIndex: 0,
      roomSlotCount: 11,
      operatorSlotCount: 18,
    };
    skyscraperWorld.appliedUpgradeIds = [];
    skyscraperWorld.rooms = starterFloors.flatMap((floor) =>
      floor.slots.flatMap((slot) => {
        if (!slot.startingTemplateId) {
          return [];
        }
        const template = templateModule.templateRegistry.roomById.get(slot.startingTemplateId);
        if (!template) {
          return [];
        }
        const reservedFootprint = {
          col: slot.col,
          row: slot.row,
          cols: slot.cols,
          rows: slot.rows,
        };
        return [
          {
            id: `room-instance/${template.id.replace("room/", "").replace(":tier_1", "")}`,
            templateId: template.id,
            tier: template.tier,
            floorIndex: floor.floorIndex,
            slotId: slot.slotId,
            roomStateId: roomStateModule.getRoomStateId(template.id, []),
            capacity: template.baseCapacity,
            occupancy: 0,
            isActive: true,
            reservedFootprint,
            activeFootprint: roomStateModule.getRoomActiveFootprint(
              template.id,
              reservedFootprint,
              [],
            ),
          },
        ];
      }),
    );
    skyscraperWorld.guild.treasury = 12_000;
    skyscraperWorld.guild.reputation = 800;
    skyscraperWorld.activeRaidPackets = [];
    skyscraperWorld.contractSite = null;
    skyscraperWorld.contractResult = null;
    skyscraperWorld.contractLifecycle = "idle";
    skyscraperWorld.fogOfWar = null;
    skyscraperWorld.activeEncounter = null;
    skyscraperWorld.interruptionQueue = null;
    skyscraperWorld.incidentState = null;
    skyscraperWorld.visitors = [];
    skyscraperWorld.operators = (skyscraperWorld.operators ?? []).map(
      (operator: { assignment?: unknown }) => ({
        ...operator,
        assignment: { kind: "idle", targetId: "" },
      }),
    );

    // Run one tick through the simulation so derived authority state is
    // consistent with the freshly-seeded skyscraper baseline.
    const simulation = simModule.createAscensionSimulation(
      skyscraperWorld,
      templateModule.templateRegistry,
    );
    simulation.tick(0);
    const ready = simulation.getWorldSnapshot();

    await saveModule.saveStorage.writeSaveGame({
      slotId: "slot/1",
      schemaVersion: saveModule.CURRENT_SAVE_SCHEMA_VERSION,
      compatibilityVersion: saveModule.CURRENT_CONTENT_COMPATIBILITY,
      metadata: {
        guildName: ready.guild.guildName,
        playerName: ready.guild.playerName,
        createdAt: new Date().toISOString(),
        lastPlayedAt: new Date().toISOString(),
      },
      world: ready,
    });
  });

  await page.goto(BASE_URL, { waitUntil: "networkidle" });
  await waitForDriver(page);
  await page.locator('[data-testid="slot-load"][data-slot-id="slot/1"]').click();
  await page.getByTestId("game-shell").waitFor({ state: "visible" });

  return waitForSnapshot(
    page,
    "skyscraper baseline seed",
    (next) => next.building.activeBuildingId === "building/skyscraper",
  );
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
      "skyscraper-floor-arc-trace",
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
    "skyscraper-floor-arc-console",
    "log",
  );
  await fs.promises.writeFile(consolePath, `${consoleLogLines.join("\n")}\n`, "utf8");
});

const describeBrowser = RUN_BROWSER_TEST ? describe.sequential : describe.skip;

describeBrowser("Skyscraper floor expansion browser path", () => {
  it("buys the Nightlife floor, seeds its starter rooms, and persists the new floor across reload", async () => {
    let snapshot = await loadSkyscraperBaselineSave(page);
    expect(snapshot.building.activeBuildingId).toBe("building/skyscraper");
    expect(snapshot.building.floorCount).toBe(5);
    expect(snapshot.upgrades.appliedIds).toEqual([]);

    await openHqCategory(page, "management");
    await page.getByTestId("management-skyscraper-floor-arc").waitFor({ state: "visible" });
    expect(await page.getByTestId("management-skyscraper-floor-arc").textContent()).toContain(
      "Nightlife Floor",
    );
    await captureScreenshot(page, "skyscraper-baseline-management");

    snapshot = await purchaseBuildingUpgrade(
      page,
      "The Lobby",
      "Nightlife Floor",
      "upgrade/building/skyscraper:nightlife_floor",
    );
    expect(snapshot.upgrades.appliedIds).toContain("upgrade/building/skyscraper:nightlife_floor");
    expect(snapshot.building.floorCount).toBe(6);
    expect(snapshot.rooms.some((room) => room.templateId === "room/club:tier_1")).toBe(true);
    expect(snapshot.rooms.some((room) => room.templateId === "room/green_room:tier_1")).toBe(true);

    await openHqCategory(page, "rooms");
    await page.getByText("Floor 6/6", { exact: true }).waitFor({ state: "visible" });
    await captureScreenshot(page, "skyscraper-nightlife-applied");

    await page.reload({ waitUntil: "networkidle" });
    await waitForDriver(page);
    snapshot = await waitForSnapshot(
      page,
      "skyscraper Nightlife persists after reload",
      (next) =>
        next.building.activeBuildingId === "building/skyscraper" &&
        next.upgrades.appliedIds.includes("upgrade/building/skyscraper:nightlife_floor"),
    );
    expect(snapshot.building.floorCount).toBe(6);
    expect(snapshot.rooms.some((room) => room.templateId === "room/club:tier_1")).toBe(true);
    expect(snapshot.rooms.some((room) => room.templateId === "room/green_room:tier_1")).toBe(true);
  }, 180_000);
});

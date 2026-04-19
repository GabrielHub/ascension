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
    listSlots(): Promise<
      Array<{
        slotId: string;
        state: string;
      }>
    >;
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

  throw new Error("Unable to launch a Chromium browser for the Porters campaign browser test.", {
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
    `Timed out waiting for ${label}.${lastSnapshot ? ` Last snapshot: ${JSON.stringify(lastSnapshot.contracts)}` : ""}`,
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
  const panelByCategory = {
    management: "panel-management-root",
    rooms: "panel-rooms-root",
  } as const;
  const panel = page.getByTestId(panelByCategory[category]);
  const snapshot = await getSnapshot(page);
  if (snapshot.navigation.activeTab !== "hq") {
    await page.getByTestId("shell-tab-hq").click({ force: true });
  }
  const panelVisible = await panel.isVisible().catch(() => false);
  if (!panelVisible) {
    await page.getByTestId(`hq-category-${category}`).click({ force: true });
    try {
      await panel.waitFor({ state: "visible", timeout: 5_000 });
    } catch {
      await closeRoomPanels(page);
      await page.getByTestId(`hq-category-${category}`).click({ force: true });
      await panel.waitFor({ state: "visible", timeout: 15_000 });
    }
  }

  return getSnapshot(page);
}

async function openOperationsContractBoard(page: Page): Promise<BrowserTestSnapshot> {
  let snapshot = await getSnapshot(page);
  if (snapshot.navigation.activeTab !== "operations") {
    await page.getByTestId("shell-tab-operations").click({ force: true });
  }
  snapshot = await getSnapshot(page);
  if (snapshot.navigation.opsCategory !== "contract") {
    await page.getByTestId("ops-category-contract").click({ force: true });
  }

  return waitForSnapshot(
    page,
    "operations contract board",
    (next) =>
      next.navigation.activeTab === "operations" && next.navigation.opsCategory === "contract",
  );
}

async function waitForRoomCard(page: Page, roomName: string): Promise<void> {
  await page.locator("button.glass-card").filter({ hasText: roomName }).first().waitFor({
    state: "visible",
    timeout: 15_000,
  });
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
  await closeRoomPanels(page);
  await openHqCategory(page, "rooms");
  await selectRoom(page, roomName);
  await page.getByTestId("room-open-upgrades").waitFor({ state: "visible", timeout: 15_000 });
  await page.getByTestId("room-open-upgrades").click();
  const purchaseButton = page
    .getByTestId("panel-room-upgrades")
    .locator(".glass-card-inset")
    .filter({ hasText: upgradeName })
    .getByRole("button", { exact: true, name: "Purchase" });
  await purchaseButton.click();

  return waitForSnapshot(page, `${upgradeName} purchased`, (snapshot) =>
    snapshot.upgrades.appliedIds.includes(upgradeId),
  );
}

async function setFloor(page: Page, floorNumber: number): Promise<void> {
  const targetFloorIndex = floorNumber - 1;
  const before = await getSnapshot(page);
  if (before.building.activeFloorIndex === targetFloorIndex) {
    return;
  }
  const portersLabels: Record<number, string> = { 1: "Ground", 2: "Upper", 3: "Waterfront" };
  const namedLabel = portersLabels[floorNumber];
  const button = namedLabel
    ? page.getByRole("button", { exact: true, name: namedLabel })
    : page.getByRole("button", { exact: true, name: String(floorNumber) });
  await button.first().click();
  await waitForSnapshot(
    page,
    `floor ${floorNumber}`,
    (snapshot) => snapshot.building.activeFloorIndex === targetFloorIndex,
  );
}

async function closeRoomPanels(page: Page): Promise<void> {
  const upgradesClose = page.getByTestId("panel-room-upgrades-close");
  if (await upgradesClose.isVisible().catch(() => false)) {
    await upgradesClose.click();
  }

  const roomClose = page.getByRole("button", { name: "Close room detail" });
  if (await roomClose.isVisible().catch(() => false)) {
    await roomClose.click();
  }
}

async function placeNextRoom(page: Page, roomName: string): Promise<BrowserTestSnapshot> {
  await closeRoomPanels(page);
  await openHqCategory(page, "rooms");
  await page.getByTestId("expansion-slot-available").first().click();
  await page.getByRole("button", { exact: true, name: roomName }).click();
  return waitForSnapshot(page, `${roomName} placed`, (snapshot) =>
    snapshot.rooms.some((room) => room.name === roomName),
  );
}

async function placeNextRoomOnFloors(
  page: Page,
  roomName: string,
  floors: number[],
): Promise<BrowserTestSnapshot> {
  await closeRoomPanels(page);
  await openHqCategory(page, "rooms");
  for (const floorNumber of floors) {
    await setFloor(page, floorNumber);
    const expansionSlot = page.getByTestId("expansion-slot-available").first();
    if ((await expansionSlot.count()) === 0) {
      continue;
    }

    await expansionSlot.click();
    await page.getByRole("button", { exact: true, name: roomName }).click();
    return waitForSnapshot(page, `${roomName} placed`, (snapshot) =>
      snapshot.rooms.some((room) => room.name === roomName),
    );
  }

  throw new Error(`Unable to find a placement slot for ${roomName}.`);
}

async function activateRoom(
  page: Page,
  floorNumber: number,
  roomName: string,
): Promise<BrowserTestSnapshot> {
  await openHqCategory(page, "rooms");
  await setFloor(page, floorNumber);
  await selectRoom(page, roomName);

  const activateButton = page.getByRole("button", { exact: true, name: "Activate room" });
  if ((await activateButton.count()) > 0) {
    await activateButton.click();
  } else {
    const snapshot = await getSnapshot(page);
    const room = snapshot.rooms.find((entry) => entry.name === roomName);
    if (room?.isActive) {
      return snapshot;
    }
    throw new Error(`Expected an activation control for ${roomName}.`);
  }

  return waitForSnapshot(page, `${roomName} activated`, (snapshot) =>
    snapshot.rooms.some((room) => room.name === roomName && room.isActive),
  );
}

async function advanceOneHour(page: Page): Promise<BrowserTestSnapshot> {
  const before = await getSnapshot(page);

  if (before.interruption?.payloadKind === "incident") {
    const incidentChoice = before.interruption.choiceLabels[0];
    if (!incidentChoice) {
      throw new Error("Encountered an incident interruption without any available choices.");
    }
    await page.getByRole("button", { name: incidentChoice }).first().click();
    return waitForSnapshot(
      page,
      "incident resolution",
      (snapshot) => snapshot.interruption?.instanceId !== before.interruption?.instanceId,
    );
  }

  if (before.interruption?.payloadKind === "guidance" && before.interruption.ctaLabel) {
    await page.getByRole("button", { exact: true, name: before.interruption.ctaLabel }).click();
    return waitForSnapshot(
      page,
      "guidance resolution",
      (snapshot) => snapshot.interruption?.instanceId !== before.interruption?.instanceId,
    );
  }

  await page.getByTestId("advance-hour").click({ force: true });
  return waitForSnapshot(
    page,
    "manual hour advance",
    (snapshot) => snapshot.clock.absoluteMinute > before.clock.absoluteMinute,
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
    "Porters campaign seed",
    (next) =>
      next.building.activeBuildingId === "building/porters" &&
      next.contracts.postedContractIds.length > 0,
  );
}

async function loadSkyscraperReadyPortersSave(page: Page): Promise<BrowserTestSnapshot> {
  await page.goto(BASE_URL, { waitUntil: "networkidle" });
  await waitForDriver(page);
  await page.evaluate(async () => {
    const driver = (window as BrowserTestWindow).__ASCENSION_BROWSER_TEST__;
    await driver?.resetSaveSlots();
    const importModule = (specifier: string) => (0, eval)(`import("${specifier}")`);

    const [saveModule, portersModule, simModule, templateModule] = await Promise.all([
      importModule("/save/index.ts"),
      importModule("/sim/tools/porters-upgrade-campaign.ts"),
      importModule("/sim/index.ts"),
      importModule("/content/templates/index.ts"),
    ]);

    const world = portersModule.createPortersUpgradeCampaignSeedWorld();
    const simulation = simModule.createAscensionSimulation(world, templateModule.templateRegistry);
    for (const upgradeId of [
      ...portersModule.PORTERS_CAMPAIGN_UPGRADE_SEQUENCE,
      "upgrade/building/porters:machine_shop",
    ]) {
      simulation.dispatch({ type: "sim/purchase-building-upgrade", upgradeId });
    }
    simulation.tick(0);

    const upgraded = structuredClone(simulation.getWorldSnapshot());
    upgraded.guild.treasury = 9_999;
    upgraded.guild.reputation = 999;

    while ((upgraded.operators?.length ?? 0) < 12) {
      const clone = structuredClone(upgraded.operators?.[0]);
      if (!clone) {
        throw new Error("Expected the Porters seed world to include operators.");
      }
      const nextIndex = (upgraded.operators?.length ?? 0) + 1;
      clone.id = `operator/skyscraper-ready-${nextIndex}`;
      clone.identity = {
        ...clone.identity,
        name: `Testing ${nextIndex}`,
      };
      clone.assignment = { kind: "idle", targetId: "" };
      clone.lifecycle = { status: "active" };
      upgraded.operators?.push(clone);
    }

    const raidSummaries = upgraded.raidSummaries ?? [];
    for (let index = raidSummaries.length; index < 60; index += 1) {
      raidSummaries.push({
        id: `raid/skyscraper-ready-${index + 1}`,
        contractSiteId: `contract/skyscraper-ready-${index + 1}`,
        missionId: "mission/clearance",
        startedAt: `2026-03-${String((index % 28) + 1).padStart(2, "0")}T18:00:00.000Z`,
        endedAt: `2026-03-${String((index % 28) + 1).padStart(2, "0")}T20:00:00.000Z`,
        result: "success",
        reputationDelta: 5,
        cashDelta: 150,
        threat: 55,
        intel: 65,
        reward: 180,
        cohesion: 70,
        operatorOutcomes: [],
        narrativeTags: [],
        intelMismatchTags: [],
        bossDefeated: index < 27,
        contributingFactors: ["phase:porters", "promotion:ready"],
      });
    }
    upgraded.raidSummaries = raidSummaries;

    await saveModule.saveStorage.writeSaveGame({
      slotId: "slot/1",
      schemaVersion: saveModule.CURRENT_SAVE_SCHEMA_VERSION,
      compatibilityVersion: saveModule.CURRENT_CONTENT_COMPATIBILITY,
      metadata: {
        guildName: upgraded.guild.guildName,
        playerName: upgraded.guild.playerName,
        createdAt: new Date().toISOString(),
        lastPlayedAt: new Date().toISOString(),
      },
      world: upgraded,
    });
  });

  await page.goto(BASE_URL, { waitUntil: "networkidle" });
  await waitForDriver(page);
  await page.locator('[data-testid="slot-load"][data-slot-id="slot/1"]').click();
  await page.getByTestId("game-shell").waitFor({ state: "visible" });

  return waitForSnapshot(
    page,
    "skyscraper-ready Porters seed",
    (next) =>
      next.building.activeBuildingId === "building/porters" && next.relocation.status === "ready",
  );
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
  if (!result || result.status === "error") {
    throw new Error(
      `Dev command failed: ${command}${result?.message ? ` (${result.message})` : ""}`,
    );
  }
  await page.waitForTimeout(200);
  return result.detail ?? result.message;
}

function getInventoryQuantity(snapshot: BrowserTestSnapshot, itemId: string): number {
  return snapshot.inventory.find((stack) => stack.itemId === itemId)?.quantity ?? 0;
}

async function getLogisticsStaffIds(page: Page): Promise<string[]> {
  const transcript = await runDevConsoleCommandAndReadOutput(page, "inspect staff");
  return [...transcript.matchAll(/(staff\/[^\s]+).*?\[staff:logistics\]/g)].map(
    (match) => match[1],
  );
}

async function resolveInterruptionWithFirstChoice(page: Page): Promise<BrowserTestSnapshot> {
  const before = await getSnapshot(page);
  if (!before.interruption || before.interruption.choiceLabels.length === 0) {
    throw new Error("Expected an active interruption with at least one choice.");
  }

  await page.locator('[role="dialog"] button').first().click();
  return waitForSnapshot(
    page,
    "interruption resolved",
    (snapshot) => snapshot.interruption?.instanceId !== before.interruption?.instanceId,
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
      "porters-upgrade-campaign-trace",
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
    "porters-upgrade-campaign-console",
    "log",
  );
  await fs.promises.writeFile(consolePath, `${consoleLogLines.join("\n")}\n`, "utf8");
});

const describeBrowser = RUN_BROWSER_TEST ? describe.sequential : describe.skip;

describeBrowser("Porters upgrade campaign browser path", () => {
  it("verifies the Porter's to skyscraper relocation flow, tower presentation, and reload persistence", async () => {
    let snapshot = await loadSkyscraperReadyPortersSave(page);
    expect(snapshot.relocation.status).toBe("ready");

    await openHqCategory(page, "management");
    await page.getByTestId("management-relocation").waitFor({ state: "visible" });
    expect(await page.getByTestId("management-relocation").textContent()).toContain(
      "Ascension Tower",
    );
    await captureScreenshot(page, "skyscraper-relocation-ready");

    await page.getByRole("button", { exact: true, name: "Start Relocation Review" }).click();
    await page.getByText("Facility Upgrade Notice", { exact: true }).waitFor({ state: "visible" });
    expect(await page.locator('[role="dialog"]').textContent()).toContain("Midtown Manhattan");
    await page.getByRole("button", { exact: true, name: "Review Offer" }).click();

    await page
      .getByText("Relocate to Ascension Tower?", { exact: true })
      .waitFor({ state: "visible" });
    const decisionText = await page.locator('[role="dialog"]').textContent();
    expect(decisionText).toContain("Porter's closes as headquarters");
    expect(decisionText).toContain("11 rooms across five floors");
    await captureScreenshot(page, "skyscraper-relocation-decision");

    await page.getByRole("button", { exact: true, name: "Accept and Relocate" }).click();
    await page
      .getByText("Welcome to Ascension Tower", { exact: true })
      .waitFor({ state: "visible" });
    expect(await page.locator('[role="dialog"]').textContent()).toContain("Midtown, Manhattan");
    await page.getByRole("button", { exact: true, name: "Begin" }).click();

    snapshot = await waitForSnapshot(
      page,
      "skyscraper relocation landed",
      (next) => next.building.activeBuildingId === "building/skyscraper",
    );
    expect(snapshot.building.floorCount).toBe(5);

    await openHqCategory(page, "rooms");
    await page.getByRole("button", { exact: true, name: "Rooftop" }).click();
    snapshot = await waitForSnapshot(
      page,
      "skyscraper rooftop selected",
      (next) => next.building.activeFloorIndex === 4,
    );
    await waitForRoomCard(page, "The Helipad");
    await waitForRoomCard(page, "The Sky Garden");
    await captureScreenshot(page, "skyscraper-relocation-landed");

    await page.reload({ waitUntil: "networkidle" });
    await waitForDriver(page);
    snapshot = await waitForSnapshot(
      page,
      "skyscraper persists after reload",
      (next) => next.building.activeBuildingId === "building/skyscraper",
    );
    expect(snapshot.building.floorCount).toBe(5);
  }, 180_000);

  it("verifies Porter's floor stepper controls switch the visible floor stack", async () => {
    await loadSeededPortersSave(page);
    await openHqCategory(page, "rooms");

    const previousFloorButton = page.getByTestId("floor-step-previous");
    const nextFloorButton = page.getByTestId("floor-step-next");

    let snapshot = await getSnapshot(page);
    expect(snapshot.building.activeFloorIndex).toBe(0);
    await waitForRoomCard(page, "The Floor");
    await waitForRoomCard(page, "The Bar");
    expect(await previousFloorButton.isDisabled()).toBe(true);
    expect(await nextFloorButton.isDisabled()).toBe(false);
    await captureScreenshot(page, "porters-floor-stepper-ground");

    await nextFloorButton.click();
    snapshot = await waitForSnapshot(
      page,
      "Porters upper floor",
      (next) => next.building.activeFloorIndex === 1,
    );
    await waitForRoomCard(page, "The Office");
    await waitForRoomCard(page, "The Prep Room");
    expect(await previousFloorButton.isDisabled()).toBe(false);
    expect(await nextFloorButton.isDisabled()).toBe(true);
    await captureScreenshot(page, "porters-floor-stepper-upper");

    await previousFloorButton.click();
    snapshot = await waitForSnapshot(
      page,
      "Porters ground floor",
      (next) => next.building.activeFloorIndex === 0,
    );
    await waitForRoomCard(page, "The Floor");
    expect(await previousFloorButton.isDisabled()).toBe(true);
    expect(await nextFloorButton.isDisabled()).toBe(false);
  }, 120_000);

  it("verifies the post-relocation Porters upgrade arc and room usage in the real browser runtime", async () => {
    let snapshot = await loadSeededPortersSave(page);
    expect(snapshot.upgrades.appliedIds).toEqual([]);
    expect(snapshot.contracts.contractBriefing).toBeNull();

    await openHqCategory(page, "management");
    await page.getByTestId("management-porters-campaign").waitFor({ state: "visible" });
    expect(await page.getByTestId("management-porters-campaign").textContent()).toContain(
      "Kitchen Overhaul",
    );
    await captureScreenshot(page, "porters-campaign-seed");

    snapshot = await purchaseBuildingUpgrade(
      page,
      "The Bar",
      "Kitchen Overhaul",
      "upgrade/building/porters:kitchen_overhaul",
    );
    expect(snapshot.upgrades.appliedIds).toContain("upgrade/building/porters:kitchen_overhaul");

    await openHqCategory(page, "management");
    expect(await page.getByTestId("management-porters-campaign").textContent()).toContain(
      "Upstairs Conversion",
    );

    await purchaseBuildingUpgrade(
      page,
      "The Bar",
      "Upstairs Conversion",
      "upgrade/building/porters:upstairs_conversion",
    );

    await setFloor(page, 2);
    snapshot = await placeNextRoom(page, "The Briefing Room");
    expect(snapshot.rooms.some((room) => room.templateId === "room/briefing_room:tier_1")).toBe(
      true,
    );
    snapshot = await placeNextRoom(page, "The Break Room");
    expect(snapshot.rooms.some((room) => room.templateId === "room/break_room:tier_1")).toBe(true);
    snapshot = await activateRoom(page, 2, "The Briefing Room");
    await captureScreenshot(page, "porters-campaign-upstairs");

    await purchaseBuildingUpgrade(
      page,
      "The Office",
      "The Remodel",
      "upgrade/building/porters:remodel",
    );
    await purchaseBuildingUpgrade(
      page,
      "The Office",
      "The Waterfront",
      "upgrade/building/porters:waterfront",
    );
    snapshot = await purchaseBuildingUpgrade(
      page,
      "The Office",
      "Machine Shop",
      "upgrade/building/porters:machine_shop",
    );
    expect(snapshot.upgrades.appliedIds).toContain("upgrade/building/porters:machine_shop");

    await setFloor(page, 3);
    snapshot = await placeNextRoom(page, "The Dock");
    expect(snapshot.rooms.some((room) => room.templateId === "room/dock:tier_1")).toBe(true);
    snapshot = await placeNextRoom(page, "The Deck");
    expect(snapshot.rooms.some((room) => room.templateId === "room/deck:tier_1")).toBe(true);
    snapshot = await placeNextRoomOnFloors(page, "The Workshop", [3, 2, 1]);
    expect(snapshot.rooms.some((room) => room.templateId === "room/workshop:tier_1")).toBe(true);
    await activateRoom(page, 3, "The Dock");
    await activateRoom(page, 3, "The Deck");
    const workshopFloorNumber =
      (snapshot.rooms.find((room) => room.templateId === "room/workshop:tier_1")?.floorIndex ?? 0) +
      1;
    snapshot = await activateRoom(page, workshopFloorNumber, "The Workshop");
    await captureScreenshot(page, "porters-campaign-waterfront");

    await openHqCategory(page, "rooms");
    await setFloor(page, workshopFloorNumber);
    await selectRoom(page, "The Workshop");
    const breachHammerCard = page
      .locator(".glass-card-inset")
      .filter({ hasText: "Breach Hammer Assembly" })
      .first();
    await breachHammerCard.getByText("Blocked by:", { exact: false }).waitFor({ state: "visible" });
    expect(await breachHammerCard.textContent()).toContain("assigned logistics staff");

    const workshopRoomId = snapshot.rooms.find(
      (room) => room.templateId === "room/workshop:tier_1",
    )?.id;
    expect(workshopRoomId).toBeTruthy();
    const logisticsStaffIds = await getLogisticsStaffIds(page);
    expect(logisticsStaffIds.length).toBeGreaterThan(0);
    await runDevConsoleCommand(page, `staff assign ${logisticsStaffIds[0]} ${workshopRoomId}`);
    snapshot = await waitForSnapshot(page, "workshop staffed", (next) =>
      next.rooms.some((room) => room.id === workshopRoomId && room.isOperational),
    );

    const breachHammerBefore = getInventoryQuantity(snapshot, "weapon/breach-hammer");
    const fangBefore = getInventoryQuantity(snapshot, "loot/monster-part/fang");
    await openHqCategory(page, "rooms");
    await setFloor(page, workshopFloorNumber);
    await selectRoom(page, "The Workshop");
    await page.getByRole("button", { name: "Craft 1x Breach Hammer" }).click();
    snapshot = await waitForSnapshot(
      page,
      "breach hammer crafted",
      (next) => getInventoryQuantity(next, "weapon/breach-hammer") > breachHammerBefore,
    );
    expect(getInventoryQuantity(snapshot, "weapon/breach-hammer")).toBe(breachHammerBefore + 1);
    expect(getInventoryQuantity(snapshot, "loot/monster-part/fang")).toBeLessThan(fangBefore);

    await openOperationsContractBoard(page);
    await page
      .getByTestId("panel-contract-root")
      .getByRole("button", { name: /browse postings/i })
      .click();
    await page.getByTestId("panel-posting-board").getByTestId("contract-card").first().click();
    await page.getByTestId("contract-bid-button").click();
    snapshot = await waitForSnapshot(
      page,
      "Porters contract with briefing",
      (next) =>
        next.contracts.contractLifecycle === "active" && next.contracts.contractBriefing !== null,
    );
    expect(snapshot.contracts.contractBriefing).not.toBeNull();

    await runDevConsoleCommand(page, "incident trigger");
    snapshot = await waitForSnapshot(
      page,
      "incident interruption",
      (next) => next.interruption?.payloadKind === "incident",
    );
    expect(snapshot.interruption?.title).toBeTruthy();
    snapshot = await resolveInterruptionWithFirstChoice(page);
    expect(snapshot.eventLog.some((entry) => entry.kind === "incident_resolved")).toBe(true);

    const baselineRaidSummaryCount = snapshot.contracts.raidSummaryCount;
    for (let hour = 0; hour < 48; hour += 1) {
      snapshot = await advanceOneHour(page);
      if (
        snapshot.contracts.raidSummaryCount > baselineRaidSummaryCount &&
        snapshot.contracts.latestRaidSummaryFactors.includes("dock:staged") &&
        snapshot.contracts.latestRaidSummaryFactors.includes("deck:aired_out")
      ) {
        break;
      }
    }

    expect(snapshot.contracts.raidSummaryCount).toBeGreaterThan(baselineRaidSummaryCount);
    expect(snapshot.contracts.latestRaidSummaryFactors).toEqual(
      expect.arrayContaining(["dock:staged", "deck:aired_out"]),
    );

    await runDevConsoleCommand(page, "boss-commitment");
    snapshot = await waitForSnapshot(
      page,
      "boss commitment interruption",
      (next) => next.interruption?.payloadKind === "raid_boss_commitment",
    );
    await page.getByRole("button", { name: /Commit/i }).click();
    const encounterSurface = page.getByTestId("encounter-surface");
    await encounterSurface.waitFor({ state: "visible" });
    expect(await encounterSurface.textContent()).toContain("Phase");

    await captureScreenshot(page, "porters-campaign-proof");
  }, 180_000);

  it("verifies the encounter expansion flow in the real browser runtime", async () => {
    await loadSeededPortersSave(page);

    await runDevConsoleCommand(page, "encounter force-site site/collapsed-customs-house");

    const encounterSurface = page.getByTestId("encounter-surface");
    await encounterSurface.waitFor({ state: "visible" });
    expect(await encounterSurface.textContent()).toContain("The Excise Officer");
    expect(await encounterSurface.textContent()).toContain("Phase 1/3");

    const priorityTargetCard = page
      .locator("button.enc-intervention-card")
      .filter({ hasText: "Priority Target Designation" });
    await priorityTargetCard.click();
    expect(await priorityTargetCard.isDisabled()).toBe(true);

    await page.getByRole("button", { exact: true, name: "Pause" }).click();
    await page.waitForFunction(() => {
      const surface = document.querySelector('[data-testid="encounter-surface"]');
      return surface?.textContent?.includes("Paused") ?? false;
    });

    await captureScreenshot(page, "encounter-expansion-proof");
  }, 120_000);
});

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

async function setFloor(page: Page, floorNumber: number): Promise<void> {
  const portersLabels: Record<number, string> = { 1: "Ground", 2: "Upper", 3: "Waterfront" };
  const namedLabel = portersLabels[floorNumber];
  const button = namedLabel
    ? page.getByRole("button", { exact: true, name: namedLabel })
    : page.getByRole("button", { exact: true, name: String(floorNumber) });
  await button.first().click();
  await page.waitForTimeout(200);
}

async function placeNextRoom(page: Page, roomName: string): Promise<BrowserTestSnapshot> {
  const buildCardText = roomName.startsWith("The ") ? roomName.slice(4) : roomName;
  await page.locator("button.glass-card-inset").filter({ hasText: buildCardText }).first().click();
  await page.getByRole("button", { exact: true, name: roomName }).click();
  return waitForSnapshot(page, `${roomName} placed`, (snapshot) =>
    snapshot.rooms.some((room) => room.name === roomName),
  );
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

async function openDevConsole(page: Page): Promise<void> {
  await page.keyboard.press("`");
  await page.getByTestId("dev-console").waitFor({ state: "visible" });
}

async function runDevConsoleCommand(page: Page, command: string): Promise<void> {
  await openDevConsole(page);
  const input = page.getByTestId("dev-console-input");
  const transcript = page.getByTestId("dev-console-transcript");
  await input.fill(command);
  await input.press("Enter");
  await expect(transcript).toContainText(command);

  const consolePanel = page.getByTestId("dev-console");
  if (await consolePanel.isVisible().catch(() => false)) {
    await page.keyboard.press("Escape");
    await consolePanel.waitFor({ state: "hidden" });
  }
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

    await setFloor(page, 3);
    snapshot = await placeNextRoom(page, "The Dock");
    expect(snapshot.rooms.some((room) => room.templateId === "room/dock:tier_1")).toBe(true);
    snapshot = await placeNextRoom(page, "The Deck");
    expect(snapshot.rooms.some((room) => room.templateId === "room/deck:tier_1")).toBe(true);
    await activateRoom(page, 3, "The Dock");
    await activateRoom(page, 3, "The Deck");
    await captureScreenshot(page, "porters-campaign-waterfront");

    await openOperationsContractBoard(page);
    await page.getByTestId("contract-bid-button").first().click();
    snapshot = await waitForSnapshot(
      page,
      "Porters contract with briefing",
      (next) =>
        next.contracts.contractLifecycle === "active" && next.contracts.contractBriefing !== null,
    );
    expect(snapshot.contracts.contractBriefing).not.toBeNull();

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

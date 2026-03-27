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
const FIRST_INCOME_UPGRADE_ID = "upgrade/room/register:records_wall";
const RUN_BROWSER_TEST = process.env.ASCENSION_RUN_BROWSER_TESTS === "1";

interface Observation {
  activeBeatId: string | null;
  activeInterruption: string | null;
  cash: number;
  contractLifecycle: string;
  day: number;
  hourLabel: string;
  incidentInstanceId: string | null;
  incidentTemplateId: string | null;
  label: string;
  postedContracts: string[];
  raidSummaryCount: number;
  securedContractCount: number;
  upgradeIds: string[];
  visitorIds: string[];
}

interface RunReport {
  baseUrl: string;
  beatSequence: string[];
  captures: Observation[];
  checks: {
    earlyRuntimeIncident?: Observation;
    firstRecruitObserved: Observation;
    firstUpgradeAffordableObserved: Observation;
    firstUpgradePurchased?: Observation;
    incidentArrival: Observation;
    refreshAfter?: Observation;
    refreshBefore: Observation;
  };
  finalSnapshot: Observation;
  seed: {
    inventory: BrowserTestSnapshot["inventory"];
    operatorIds: string[];
    staffIds: string[];
    treasury: number;
    visitorIds: string[];
  };
}

type BrowserTestWindow = Window & {
  __ASCENSION_BROWSER_TEST__?: {
    getSnapshot(): BrowserTestSnapshot | null;
    resetSaveSlots(): Promise<void>;
  };
};

function formatMinuteOfDay(minuteOfDay: number): string {
  const hour = Math.floor(minuteOfDay / 60)
    .toString()
    .padStart(2, "0");
  const minute = (minuteOfDay % 60).toString().padStart(2, "0");
  return `${hour}:${minute}`;
}

function summarizeSnapshot(label: string, snapshot: BrowserTestSnapshot): Observation {
  return {
    activeBeatId: snapshot.guidance.activeBeatId,
    activeInterruption: snapshot.interruption?.type ?? null,
    cash: snapshot.resources.cash,
    contractLifecycle: snapshot.contracts.contractLifecycle,
    day: snapshot.clock.day,
    hourLabel: formatMinuteOfDay(snapshot.clock.minuteOfDay),
    incidentInstanceId: snapshot.incident.instanceId,
    incidentTemplateId: snapshot.incident.templateId,
    label,
    postedContracts: [...snapshot.contracts.postedContractNames],
    raidSummaryCount: snapshot.contracts.raidSummaryCount,
    securedContractCount: snapshot.guidance.openingTiming.securedContractCount,
    upgradeIds: [...snapshot.upgrades.appliedIds],
    visitorIds: [...snapshot.roster.visitorIds],
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

  throw new Error("Unable to launch a Chromium browser for the canonical opening test.", {
    cause: lastError,
  });
}

async function waitForDriver(page: Page): Promise<void> {
  await page.waitForFunction(
    () => Boolean((window as BrowserTestWindow).__ASCENSION_BROWSER_TEST__),
    undefined,
    {
      timeout: 15_000,
    },
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
    `Timed out waiting for ${label}.${lastSnapshot ? ` Last snapshot: ${JSON.stringify(summarizeSnapshot(label, lastSnapshot))}` : ""}`,
  );
}

async function openRooms(page: Page): Promise<void> {
  const snapshot = await getSnapshot(page);
  if (snapshot.navigation.activeTab !== "hq") {
    await page.getByTestId("shell-tab-hq").click({ force: true });
  }
  if (snapshot.navigation.hqCategory !== "rooms") {
    await page.getByTestId("hq-category-rooms").click({ force: true });
  }
  await page.getByText("The Register").waitFor({ state: "visible" });
}

async function openRoster(page: Page): Promise<void> {
  const snapshot = await getSnapshot(page);
  if (snapshot.navigation.activeTab !== "hq") {
    await page.getByTestId("shell-tab-hq").click({ force: true });
  }
  if (snapshot.navigation.hqCategory !== "roster") {
    await page.getByTestId("hq-category-roster").click({ force: true });
  }
  await page.getByTestId("roster-panel").waitFor({ state: "visible" });
}

async function openMarket(page: Page): Promise<void> {
  const snapshot = await getSnapshot(page);
  if (snapshot.navigation.activeTab !== "hq") {
    await page.getByTestId("shell-tab-hq").click({ force: true });
  }
  if (snapshot.navigation.hqCategory !== "market") {
    await page.getByTestId("hq-category-market").click({ force: true });
  }
}

async function openContractBoard(page: Page): Promise<void> {
  const snapshot = await getSnapshot(page);
  if (snapshot.navigation.activeTab !== "operations") {
    await page.getByTestId("shell-tab-operations").click({ force: true });
  }
  if (snapshot.navigation.opsCategory !== "contract") {
    await page.getByTestId("ops-category-contract").click({ force: true });
  }
  await page.getByTestId("operations-panel").waitFor({ state: "visible" });
}

async function clickGuidanceAction(page: Page, snapshot: BrowserTestSnapshot): Promise<void> {
  const ctaLabel = snapshot.interruption?.ctaLabel ?? snapshot.guidance.activeBeatCtaLabel;
  if (!ctaLabel) {
    throw new Error(
      `No guidance CTA was available for ${snapshot.guidance.activeBeatId ?? "unknown beat"}.`,
    );
  }

  await page.getByRole("button", { exact: true, name: ctaLabel }).click();
}

async function clickGuidanceActionAndWait(
  page: Page,
  snapshot: BrowserTestSnapshot,
): Promise<BrowserTestSnapshot> {
  const activeBeatId = snapshot.guidance.activeBeatId;
  const interruptionId = snapshot.interruption?.instanceId ?? null;

  await clickGuidanceAction(page, snapshot);

  const nextSnapshot = await waitForSnapshot(
    page,
    `guidance completion for ${activeBeatId ?? "unknown beat"}`,
    (next) =>
      next.guidance.activeBeatId !== activeBeatId ||
      (interruptionId !== null && next.interruption?.instanceId !== interruptionId),
  );

  await page.waitForTimeout(1000);
  return nextSnapshot;
}

async function advanceOneHour(page: Page): Promise<BrowserTestSnapshot> {
  const before = await getSnapshot(page);
  try {
    await page.getByTestId("advance-hour").click({ force: true });
  } catch (error) {
    throw new Error(
      `Unable to advance time from ${JSON.stringify(summarizeSnapshot("advance-blocked", before))}`,
      { cause: error },
    );
  }
  return waitForSnapshot(
    page,
    "manual hour advance",
    (snapshot) => snapshot.clock.absoluteMinute > before.clock.absoluteMinute,
    10_000,
  );
}

async function advanceUntil(
  page: Page,
  hours: number,
  predicate: (snapshot: BrowserTestSnapshot) => boolean,
  captures: Observation[],
  labelPrefix: string,
): Promise<BrowserTestSnapshot> {
  let snapshot = await getSnapshot(page);
  if (predicate(snapshot)) {
    captures.push(summarizeSnapshot(`${labelPrefix}+0h`, snapshot));
    return snapshot;
  }

  for (let hour = 1; hour <= hours; hour += 1) {
    if (snapshot.interruption?.payloadKind === "guidance") {
      snapshot = await clickGuidanceActionAndWait(page, snapshot);
      captures.push(summarizeSnapshot(`${labelPrefix}:guidance`, snapshot));
      if (predicate(snapshot)) {
        return snapshot;
      }
      continue;
    }

    if (snapshot.interruption?.payloadKind === "incident") {
      const incidentChoice = snapshot.interruption.choiceLabels[0];
      if (!incidentChoice) {
        throw new Error("Encountered an incident interruption without any available choices.");
      }
      const incidentInstanceId = snapshot.interruption.instanceId;
      await page.getByRole("button", { name: incidentChoice }).first().click();
      snapshot = await waitForSnapshot(
        page,
        `${labelPrefix} incident resolution`,
        (next) => next.interruption?.instanceId !== incidentInstanceId,
      );
      captures.push(summarizeSnapshot(`${labelPrefix}:incident`, snapshot));
      if (predicate(snapshot)) {
        return snapshot;
      }
      continue;
    }

    snapshot = await advanceOneHour(page);
    captures.push(summarizeSnapshot(`${labelPrefix}+${hour}h`, snapshot));
    if (predicate(snapshot)) {
      return snapshot;
    }
  }

  throw new Error(`Condition not met within ${hours} in-game hours for ${labelPrefix}.`);
}

async function captureScreenshot(page: Page, prefix: string): Promise<void> {
  const target = timestampedArtifactPath(playwrightScreenshotsDir, prefix, "png");
  await page.screenshot({ path: target, fullPage: true });
}

async function clickRoomCard(page: Page, roomName: string): Promise<void> {
  await page.getByRole("button", { name: roomName }).first().click();
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
      "canonical-opening-path-trace",
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
    "canonical-opening-path-console",
    "log",
  );
  await fs.writeFile(consolePath, `${consoleLogLines.join("\n")}\n`, "utf8");
});

const describeBrowser = RUN_BROWSER_TEST ? describe.sequential : describe.skip;

describeBrowser("canonical opening browser path", () => {
  it("verifies the canonical new-game opening flow in the real browser runtime", async () => {
    await page.goto(BASE_URL, { waitUntil: "networkidle" });
    await waitForDriver(page);
    await page.evaluate(() =>
      (window as BrowserTestWindow).__ASCENSION_BROWSER_TEST__!.resetSaveSlots(),
    );

    await page.goto(BASE_URL, { waitUntil: "networkidle" });
    await waitForDriver(page);
    await page.getByTestId("slot-new").first().click();
    await page.getByTestId("game-shell").waitFor({ state: "visible" });

    const captures: Observation[] = [];
    const beatSequence = new Set<string>();
    const remember = (label: string, snapshot: BrowserTestSnapshot) => {
      if (snapshot.guidance.activeBeatId) {
        beatSequence.add(snapshot.guidance.activeBeatId);
      }
      captures.push(summarizeSnapshot(label, snapshot));
    };

    let snapshot = await waitForSnapshot(
      page,
      "canonical new-game seed",
      (next) => next.session.mode === "new" && next.resources.cash === 400,
    );
    const seedSnapshot = snapshot;
    remember("seed", snapshot);
    await captureScreenshot(page, "canonical-opening-seed");

    expect(snapshot.session.isPreview).toBe(false);
    expect(snapshot.resources.cash).toBe(400);
    expect(snapshot.roster.operatorIds).toEqual([
      "operator/rose-vega",
      "operator/milo-hart",
      "operator/jin-tanaka",
      "operator/vera-santos",
    ]);
    expect(snapshot.roster.staffIds).toEqual(["staff/aina", "staff/boris"]);
    expect(snapshot.roster.visitorIds).toEqual(["visitor/nika"]);
    expect(snapshot.inventory).toEqual([
      { itemId: "weapon/pipe-wrench", quantity: 2 },
      { itemId: "weapon/kitchen-knife", quantity: 1 },
      { itemId: "outfit-overlay/padded-jacket", quantity: 1 },
      { itemId: "accessory/comm-earpiece", quantity: 1 },
    ]);
    expect(snapshot.guidance.activeBeatId).toBe("guidance/opening/board-briefing");
    expect(snapshot.interruption?.payloadKind).toBe("guidance");

    let firstUpgradeAffordableObserved: Observation | undefined;
    let firstRecruitObserved: Observation | undefined;
    expect(snapshot.upgrades.affordableIds).not.toContain(FIRST_INCOME_UPGRADE_ID);
    expect(snapshot.upgrades.affordableIds).toHaveLength(0);

    await clickGuidanceAction(page, snapshot);
    snapshot = await waitForSnapshot(
      page,
      "first contract choice",
      (next) => next.guidance.activeBeatId === "guidance/opening/first-contract-choice",
    );
    remember("first-contract-choice", snapshot);

    await openContractBoard(page);
    await page.getByTestId("contract-bid-button").first().click();
    snapshot = await waitForSnapshot(
      page,
      "first contract secured",
      (next) =>
        next.contracts.contractLifecycle === "active" &&
        next.guidance.activeBeatId === "guidance/opening/bodega-overview",
    );
    remember("first-contract-secured", snapshot);

    await openRooms(page);
    await clickRoomCard(page, "The Register");
    snapshot = await waitForSnapshot(
      page,
      "bodega overview complete",
      (next) => next.guidance.activeBeatId === "guidance/opening/roster-and-equip",
    );
    remember("roster-and-equip", snapshot);

    await openRoster(page);
    const recruitButton = page.getByTestId("visitor-recruit").first();
    expect(await recruitButton.isEnabled()).toBe(true);
    remember("recruit-available-during-opening", await getSnapshot(page));
    await page.locator("[data-testid='operator-row'] button").first().click();
    snapshot = await waitForSnapshot(
      page,
      "operator inspected",
      (next) =>
        next.guidance.activeBeatId === null ||
        next.guidance.activeBeatId === "guidance/opening/first-team-departure",
    );
    remember("operator-inspected", snapshot);

    snapshot = await advanceUntil(
      page,
      6,
      (next) =>
        next.guidance.activeBeatId === "guidance/opening/first-team-departure" &&
        next.contracts.activeRaidIds.length > 0,
      captures,
      "await-first-team-departure",
    );
    remember("first-team-departure", snapshot);
    snapshot = await clickGuidanceActionAndWait(page, snapshot);
    remember("first-team-departure-complete", snapshot);

    let earlyRuntimeIncident: Observation | undefined;
    for (let hour = 1; hour <= 8; hour += 1) {
      snapshot = await getSnapshot(page);
      if (snapshot.interruption?.type === "incident") {
        earlyRuntimeIncident ??= summarizeSnapshot("early-runtime-incident", snapshot);
        remember(`early-runtime-incident-${hour}`, snapshot);
        await page
          .getByRole("button", { name: snapshot.interruption.choiceLabels[0] })
          .first()
          .click();
        snapshot = await waitForSnapshot(
          page,
          "runtime incident resolution before first raid return",
          (next) => next.interruption?.type !== "incident",
        );
        remember(`early-runtime-incident-resolved-${hour}`, snapshot);
        continue;
      }

      if (snapshot.guidance.activeBeatId === "guidance/opening/first-raid-return") {
        break;
      }

      snapshot = await advanceOneHour(page);
      remember(`await-first-raid-return+${hour}h`, snapshot);
    }
    expect(snapshot.guidance.activeBeatId).toBe("guidance/opening/first-raid-return");
    remember("first-raid-return", snapshot);
    snapshot = await clickGuidanceActionAndWait(page, snapshot);
    remember("first-raid-return-complete", snapshot);

    snapshot = await waitForSnapshot(
      page,
      "roster condition",
      (next) => next.guidance.activeBeatId === "guidance/opening/roster-condition",
    );
    remember("roster-condition", snapshot);
    snapshot = await clickGuidanceActionAndWait(page, snapshot);
    remember("roster-condition-complete", snapshot);

    for (let hour = 1; hour <= 6; hour += 1) {
      snapshot = await getSnapshot(page);
      if (
        snapshot.guidance.activeBeatId === "guidance/opening/first-incident" &&
        snapshot.interruption?.payloadKind === "guidance" &&
        snapshot.incident.templateId !== null
      ) {
        break;
      }

      if (snapshot.interruption?.type === "incident") {
        earlyRuntimeIncident ??= summarizeSnapshot("early-runtime-incident", snapshot);
        remember(`runtime-incident-before-guidance-${hour}`, snapshot);
        await page
          .getByRole("button", { name: snapshot.interruption.choiceLabels[0] })
          .first()
          .click();
        snapshot = await waitForSnapshot(
          page,
          "runtime incident resolution before guided first incident",
          (next) => next.interruption?.type !== "incident",
        );
        remember(`runtime-incident-before-guidance-resolved-${hour}`, snapshot);
        continue;
      }

      snapshot = await advanceOneHour(page);
      remember(`await-first-incident+${hour}h`, snapshot);
    }
    expect(snapshot.guidance.activeBeatId).toBe("guidance/opening/first-incident");
    remember("first-incident", snapshot);
    const incidentSnapshot = snapshot;
    await captureScreenshot(page, "canonical-opening-first-incident");

    const refreshBefore = summarizeSnapshot("refresh-before", snapshot);
    await page.reload({ waitUntil: "networkidle" });
    await waitForDriver(page);
    snapshot = await waitForSnapshot(
      page,
      "restored first incident",
      (next) =>
        next.guidance.activeBeatId === refreshBefore.activeBeatId &&
        next.incident.instanceId === refreshBefore.incidentInstanceId &&
        next.incident.templateId === refreshBefore.incidentTemplateId &&
        next.interruption?.payloadKind === "guidance",
    );
    const refreshAfterSnapshot = snapshot;
    remember("refresh-after", snapshot);
    await captureScreenshot(page, "canonical-opening-first-incident-restored");

    await clickGuidanceAction(page, snapshot);
    snapshot = await waitForSnapshot(
      page,
      "incident modal",
      (next) => next.interruption?.payloadKind === "incident",
    );
    remember("incident-modal", snapshot);

    const incidentChoice = snapshot.interruption?.choiceLabels[0];
    expect(incidentChoice).toBeTruthy();
    await page.getByRole("button", { name: incidentChoice! }).first().click();

    snapshot = await waitForSnapshot(
      page,
      "loot and market guidance",
      (next) => next.guidance.activeBeatId === "guidance/opening/loot-and-market",
    );
    remember("loot-and-market", snapshot);

    await openRoster(page);
    const stillLockedRecruitButton = page.getByTestId("visitor-recruit").first();
    expect(await stillLockedRecruitButton.isEnabled()).toBe(true);
    remember("recruit-still-available-before-upgrade", await getSnapshot(page));

    await openMarket(page);
    snapshot = await waitForSnapshot(
      page,
      "staffing and rooms guidance",
      (next) => next.guidance.activeBeatId === "guidance/opening/staffing-and-rooms",
    );
    remember("staffing-and-rooms", snapshot);

    await openRooms(page);
    await clickRoomCard(page, "Supply Closet");
    await page.getByRole("button", { exact: true, name: "Activate room" }).click();

    let cadenceSnapshot = snapshot;
    try {
      cadenceSnapshot = await advanceUntil(
        page,
        24,
        (next) =>
          next.guidance.activeBeatId === "guidance/opening/first-upgrade" ||
          next.contracts.raidSummaryCount >= 2 ||
          next.interruption?.type === "raid_boss_commitment",
        captures,
        "post-staffing-cadence",
      );
      remember("post-staffing-cadence", cadenceSnapshot);
    } catch {
      cadenceSnapshot = await getSnapshot(page);
      remember("post-staffing-cadence-timeout", cadenceSnapshot);
    }

    expect(cadenceSnapshot.guidance.activeBeatId).not.toBe("guidance/opening/first-upgrade");
    firstUpgradeAffordableObserved = summarizeSnapshot("first-upgrade-deferred", cadenceSnapshot);
    firstRecruitObserved = summarizeSnapshot("recruit-still-available", cadenceSnapshot);

    const report: RunReport = {
      baseUrl: BASE_URL,
      beatSequence: [...beatSequence],
      captures,
      checks: {
        ...(earlyRuntimeIncident ? { earlyRuntimeIncident } : {}),
        firstRecruitObserved:
          firstRecruitObserved ?? summarizeSnapshot("first-recruit-missing", snapshot),
        firstUpgradeAffordableObserved:
          firstUpgradeAffordableObserved ?? summarizeSnapshot("first-upgrade-missing", snapshot),
        incidentArrival: summarizeSnapshot("incident-arrival", incidentSnapshot),
        refreshAfter: summarizeSnapshot("refresh-after", refreshAfterSnapshot),
        refreshBefore,
      },
      finalSnapshot: summarizeSnapshot("final", cadenceSnapshot),
      seed: {
        inventory: seedSnapshot.inventory,
        operatorIds: seedSnapshot.roster.operatorIds,
        staffIds: seedSnapshot.roster.staffIds,
        treasury: seedSnapshot.resources.cash,
        visitorIds: seedSnapshot.roster.visitorIds,
      },
    };

    const logPath = timestampedArtifactPath(playwrightLogsDir, "canonical-opening-path", "json");
    await fs.writeFile(logPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

    const requiredBeats = [
      "guidance/opening/board-briefing",
      "guidance/opening/first-contract-choice",
      "guidance/opening/bodega-overview",
      "guidance/opening/roster-and-equip",
      "guidance/opening/first-team-departure",
      "guidance/opening/first-raid-return",
      "guidance/opening/roster-condition",
      "guidance/opening/first-incident",
      "guidance/opening/loot-and-market",
      "guidance/opening/staffing-and-rooms",
    ];
    for (const beatId of requiredBeats) {
      expect(report.beatSequence).toContain(beatId);
    }
    const beatIndices = new Map(report.beatSequence.map((beatId, index) => [beatId, index]));
    for (let index = 1; index < requiredBeats.length; index += 1) {
      expect(
        (beatIndices.get(requiredBeats[index - 1]) ?? -1) <
          (beatIndices.get(requiredBeats[index]) ?? -1),
      ).toBe(true);
    }

    expect(earlyRuntimeIncident).toBeUndefined();
    expect(refreshBefore.activeBeatId).toBe("guidance/opening/first-incident");
    expect(refreshAfterSnapshot.interruption?.payloadKind).toBe("guidance");
  }, 180_000);
});

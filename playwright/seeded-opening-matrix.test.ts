import fs from "node:fs/promises";

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { chromium, type Browser, type BrowserContext, type Page } from "playwright";

import type { BrowserTestSnapshot } from "../app/features/browser/test-driver";
import {
  ensurePlaywrightArtifactDirs,
  playwrightArtifactsDir,
  playwrightLogsDir,
  timestampedArtifactPath,
} from "./paths";

const BASE_URL = process.env.ASCENSION_BASE_URL ?? "http://127.0.0.1:5173";
const RUN_BROWSER_TEST = process.env.ASCENSION_RUN_BROWSER_TESTS === "1";
const SEEDED_OPENING_SEEDS = [2, 3, 4, 5] as const;

type BrowserTestWindow = Window & {
  __ASCENSION_BROWSER_TEST__?: {
    getSnapshot(): BrowserTestSnapshot | null;
    resetSaveSlots(): Promise<void>;
    seedNewGameSave(slotId?: string, seed?: number): Promise<void>;
  };
};

interface SeedObservation {
  cash: number;
  inventoryIds: string[];
  operatorIds: string[];
  operatorRoleTags: string[];
  postedContractNames: string[];
  seed: number;
  visitorIds: string[];
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

  throw new Error("Unable to launch a Chromium browser for the seeded opening matrix test.", {
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
    `Timed out waiting for ${label}.${lastSnapshot ? ` Last snapshot: ${JSON.stringify({ beat: lastSnapshot.guidance.activeBeatId, cash: lastSnapshot.resources.cash, operators: lastSnapshot.roster.operatorIds, visitors: lastSnapshot.roster.visitorIds })}` : ""}`,
  );
}

async function clickGuidanceActionAndWait(page: Page, snapshot: BrowserTestSnapshot) {
  const ctaLabel = snapshot.interruption?.ctaLabel ?? snapshot.guidance.activeBeatCtaLabel;
  if (!ctaLabel) {
    throw new Error(`Missing guidance CTA for seed matrix beat ${snapshot.guidance.activeBeatId}.`);
  }

  await page.getByRole("button", { exact: true, name: ctaLabel }).click();
  return waitForSnapshot(
    page,
    "first contract choice after board briefing",
    (next) => next.guidance.activeBeatId === "guidance/opening/first-contract-choice",
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
      "seeded-opening-matrix-trace",
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
    "seeded-opening-matrix-console",
    "log",
  );
  await fs.writeFile(consolePath, `${consoleLogLines.join("\n")}\n`, "utf8");
});

const describeBrowser = RUN_BROWSER_TEST ? describe.sequential : describe.skip;

describeBrowser("seeded opening browser matrix", () => {
  it("loads a small randomized new-game matrix through the real start screen", async () => {
    const observations: SeedObservation[] = [];

    for (const seed of SEEDED_OPENING_SEEDS) {
      await page.goto(BASE_URL, { waitUntil: "networkidle" });
      await waitForDriver(page);
      await page.evaluate(() =>
        (window as BrowserTestWindow).__ASCENSION_BROWSER_TEST__!.resetSaveSlots(),
      );
      await page.evaluate(
        (value) =>
          (window as BrowserTestWindow).__ASCENSION_BROWSER_TEST__!.seedNewGameSave(
            "slot/1",
            value,
          ),
        seed,
      );

      await page.goto(BASE_URL, { waitUntil: "networkidle" });
      await waitForDriver(page);
      await page.locator('[data-testid="slot-load"][data-slot-id="slot/1"]').click();
      await page.getByTestId("game-shell").waitFor({ state: "visible" });

      const snapshot = await waitForSnapshot(
        page,
        `seed ${seed} load`,
        (next) =>
          next.session.slotId === "slot/1" &&
          next.guidance.activeBeatId === "guidance/opening/board-briefing",
      );

      expect(snapshot.session.isSaveBacked).toBe(true);
      expect(snapshot.resources.cash).toBeGreaterThanOrEqual(320);
      expect(snapshot.resources.cash).toBeLessThanOrEqual(340);
      expect(snapshot.roster.operatorIds.length).toBeGreaterThanOrEqual(3);
      expect(snapshot.roster.operatorIds.length).toBeLessThanOrEqual(4);
      expect(snapshot.roster.staffIds).toEqual(["staff/aina", "staff/boris"]);
      expect(snapshot.roster.visitorIds).toContain("visitor/nika");
      expect(snapshot.roster.visitorIds.length).toBeGreaterThanOrEqual(1);
      expect(snapshot.roster.visitorIds.length).toBeLessThanOrEqual(2);
      expect(snapshot.roster.operatorRoleTags).toEqual(
        expect.arrayContaining(["role:field_lead", "role:scout", "role:medic"]),
      );
      expect(snapshot.contracts.postedContractNames.length).toBeGreaterThanOrEqual(3);
      expect(snapshot.interruption?.payloadKind).toBe("guidance");

      const afterBoardBriefing = await clickGuidanceActionAndWait(page, snapshot);
      expect(afterBoardBriefing.guidance.activeBeatId).toBe(
        "guidance/opening/first-contract-choice",
      );

      observations.push({
        cash: snapshot.resources.cash,
        inventoryIds: snapshot.inventory.map((stack) => `${stack.itemId}:${stack.quantity}`),
        operatorIds: [...snapshot.roster.operatorIds],
        operatorRoleTags: [...snapshot.roster.operatorRoleTags],
        postedContractNames: [...snapshot.contracts.postedContractNames],
        seed,
        visitorIds: [...snapshot.roster.visitorIds],
      });
    }

    const distinctSignatures = new Set(
      observations.map((observation) =>
        JSON.stringify({
          cash: observation.cash,
          inventoryIds: observation.inventoryIds,
          operatorIds: observation.operatorIds,
          visitorIds: observation.visitorIds,
        }),
      ),
    );
    expect(distinctSignatures.size).toBeGreaterThanOrEqual(2);

    const logPath = timestampedArtifactPath(playwrightLogsDir, "seeded-opening-matrix", "json");
    await fs.writeFile(logPath, `${JSON.stringify(observations, null, 2)}\n`, "utf8");
  }, 180_000);
});

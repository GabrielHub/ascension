import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { CURRENT_CONTENT_COMPATIBILITY, CURRENT_SAVE_SCHEMA_VERSION, type SaveSlotId } from "save";
import { createBootstrapWorldSnapshot } from "sim";
import { templateRegistry } from "content/templates";

import { TauriDesktopHarness } from "./harness";
import {
  clearTauriArtifactDirs,
  ensureTauriArtifactDirs,
  tauriArtifactsDir,
  tauriLogsDir,
} from "./paths";

function createFixtureSave(slotId: SaveSlotId) {
  return {
    slotId,
    schemaVersion: CURRENT_SAVE_SCHEMA_VERSION,
    compatibilityVersion: CURRENT_CONTENT_COMPATIBILITY,
    metadata: {
      guildName: `Desktop Fixture ${slotId}`,
      playerName: "Boss",
      createdAt: "2026-03-24T00:00:00.000Z",
      lastPlayedAt: "2026-03-24T00:00:00.000Z",
    },
    world: createBootstrapWorldSnapshot(templateRegistry),
  };
}

async function waitForCondition(
  predicate: () => Promise<boolean>,
  options: { timeoutMs?: number; intervalMs?: number; message: string },
) {
  const timeoutMs = options.timeoutMs ?? 15_000;
  const intervalMs = options.intervalMs ?? 250;
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    if (await predicate()) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error(options.message);
}

function parseCurrency(text: string | null): number {
  if (!text) {
    throw new Error("Expected a currency value but the element was empty.");
  }

  const numeric = Number.parseInt(text.replace(/[^0-9-]/g, ""), 10);
  if (Number.isNaN(numeric)) {
    throw new Error(`Unable to parse currency from "${text}".`);
  }

  return numeric;
}

async function main() {
  clearTauriArtifactDirs();
  ensureTauriArtifactDirs();
  const harness = new TauriDesktopHarness();

  try {
    await harness.launch();
    await harness.setWindowSize(1600, 980);

    const initialSlots = await harness.runScenario("start-screen");
    for (const slotId of ["slot/1", "slot/2", "slot/3"] as const) {
      const slotState = (
        initialSlots as Array<{ slotId: SaveSlotId; state: "empty" | "occupied" | "error" }>
      ).find((slot) => slot.slotId === slotId)?.state;
      if (slotState && slotState !== "empty") {
        await harness.runScenario("delete-slot", { slotId });
      }
    }
    await harness.takeScreenshot(path.join("tauri-test", "screenshots", "start-screen.png"));

    const environment = await harness.runScript<{
      appLocalDataDir: string;
      exportDir: string;
      logDir: string;
      saveDir: string;
    }>("return window.__ASCENSION_DESKTOP_TEST__.getEnvironment();");

    fs.writeFileSync(
      path.join(tauriLogsDir, "environment.json"),
      JSON.stringify(environment, null, 2),
      "utf8",
    );

    const importFixturePath = path.join(tauriArtifactsDir, "slot-1-import.json");
    fs.writeFileSync(
      importFixturePath,
      JSON.stringify(createFixtureSave("slot/1"), null, 2),
      "utf8",
    );

    await harness.runScenario("import-slot", {
      slotId: "slot/1",
      sourcePath: importFixturePath,
    });

    const slotsAfterImport = await harness.runScript<
      Array<{ slotId: SaveSlotId; state: "empty" | "occupied" | "error" }>
    >("return window.__ASCENSION_DESKTOP_TEST__.listSlots();");
    assert.equal(slotsAfterImport.find((slot) => slot.slotId === "slot/1")?.state, "occupied");

    const exportPath = path.join(tauriArtifactsDir, "slot-1-export.json");
    await harness.runScenario("export-slot", {
      slotId: "slot/1",
      destinationPath: exportPath,
    });
    assert.equal(fs.existsSync(exportPath), true);

    await harness.runScenario("new-game", { slotId: "slot/2" });
    await harness.takeScreenshot(path.join("tauri-test", "screenshots", "new-game.png"));
    await harness.waitForSelector('[data-testid="game-shell"]');

    await harness.click('[data-testid="hq-category-roster"]');
    await harness.waitForSelector('[data-testid="roster-panel"]');

    const operatorCountBeforeRecruit = await harness.count('[data-testid="operator-row"]');

    await waitForCondition(
      async () => {
        if ((await harness.count('[data-testid="visitor-row"]')) > 0) {
          return true;
        }

        await harness.click('[data-testid="advance-hour"]');
        return (await harness.count('[data-testid="visitor-row"]')) > 0;
      },
      {
        timeoutMs: 20_000,
        message: "Timed out waiting for a recruitable visitor in the desktop playthrough.",
      },
    );

    await harness.click('[data-testid="visitor-recruit"]');
    await waitForCondition(
      async () =>
        (await harness.count('[data-testid="operator-row"]')) === operatorCountBeforeRecruit + 1,
      {
        message: "Recruit action did not increase the operator roster.",
      },
    );

    await harness.click('[data-testid="hq-category-market"]');
    await harness.waitForSelector('[data-testid="market-panel"]');
    const cashBeforeMarket = parseCurrency(
      await harness.getText('[data-testid="market-treasury"]'),
    );
    assert.ok(
      (await harness.count('[data-testid="market-buy-button"]')) > 0,
      "Expected at least one buyable market item.",
    );
    await harness.click('[data-testid="market-buy-button"]');
    await waitForCondition(
      async () =>
        parseCurrency(await harness.getText('[data-testid="market-treasury"]')) < cashBeforeMarket,
      {
        message: "Market purchase did not reduce treasury.",
      },
    );

    await harness.click('[data-testid="shell-tab-operations"]');
    await harness.waitForSelector('[data-testid="ops-category-contract"]');
    const isContractCategoryActive = await harness.runScript<boolean>(`
      const button = document.querySelector('[data-testid="ops-category-contract"]');
      return button?.getAttribute("data-active") === "true";
    `);
    if (!isContractCategoryActive) {
      await harness.click('[data-testid="ops-category-contract"]');
    }
    await harness.waitForSelector('[data-testid="operations-panel"][data-category="contract"]');

    await harness.waitForSelector('[data-testid="panel-contract-root"] button:not([disabled])');
    await harness.runScript(`
      const root = document.querySelector('[data-testid="panel-contract-root"]');
      const browseButton = root
        ? Array.from(root.querySelectorAll("button")).find((btn) => /browse postings/i.test(btn.textContent ?? ""))
        : null;
      if (!browseButton) throw new Error("Browse postings action missing from contract root.");
      browseButton.click();
    `);
    await harness.waitForSelector(
      '[data-testid="panel-posting-board"] [data-testid="contract-card"]',
    );
    await harness.click('[data-testid="panel-posting-board"] [data-testid="contract-card"]');
    await harness.waitForSelector('[data-testid="contract-bid-button"]');
    assert.equal(
      await harness.exists('[data-testid="contract-bid-button"]'),
      true,
      "Expected a contract bid action inside the posting detail panel.",
    );
    await harness.click('[data-testid="contract-bid-button"]');
    await waitForCondition(
      async () =>
        (await harness.exists('[data-testid="contract-status"]')) ||
        (await harness.exists('[data-testid="contract-review"]')),
      {
        message: "Contract bid did not transition the operations panel.",
      },
    );

    await waitForCondition(
      async () => {
        const persistenceLabel = await harness.getText('[data-testid="persistence-label"]');
        return Boolean(
          persistenceLabel && persistenceLabel !== "Saving..." && persistenceLabel !== "Save error",
        );
      },
      {
        message: "Desktop session did not settle into a saved state.",
      },
    );

    const cashAfterPlaythrough = parseCurrency(
      await harness.getText('[data-testid="resource-cash-value"]'),
    );
    await harness.takeScreenshot(path.join("tauri-test", "screenshots", "playthrough.png"));

    await harness.click('[data-testid="exit-to-start"]');
    await harness.waitForSelector('[data-testid="start-screen"]');
    await harness.click('[data-testid="slot-load"][data-slot-id="slot/2"]');
    await harness.waitForSelector('[data-testid="game-shell"]');

    await harness.click('[data-testid="hq-category-roster"]');
    await harness.waitForSelector('[data-testid="roster-panel"]');
    assert.equal(
      await harness.count('[data-testid="operator-row"]'),
      operatorCountBeforeRecruit + 1,
      "Reloaded save did not preserve the recruited operator.",
    );

    await harness.click('[data-testid="hq-category-market"]');
    await harness.waitForSelector('[data-testid="market-panel"]');
    assert.equal(
      parseCurrency(await harness.getText('[data-testid="market-treasury"]')),
      cashAfterPlaythrough,
      "Reloaded save did not preserve treasury after the playthrough.",
    );

    await harness.click('[data-testid="shell-tab-operations"]');
    await harness.waitForSelector('[data-testid="ops-category-contract"]');
    const isReloadContractCategoryActive = await harness.runScript<boolean>(`
      const button = document.querySelector('[data-testid="ops-category-contract"]');
      return button?.getAttribute("data-active") === "true";
    `);
    if (!isReloadContractCategoryActive) {
      await harness.click('[data-testid="ops-category-contract"]');
    }
    await harness.waitForSelector('[data-testid="operations-panel"][data-category="contract"]');
    assert.equal(
      await harness.exists('[data-testid="contract-status"]'),
      true,
      "Reloaded save did not preserve the active contract state.",
    );

    const recoveryBackup = JSON.stringify(createFixtureSave("slot/3"), null, 2);
    fs.writeFileSync(path.join(environment.saveDir, "slot-3.json"), "{broken-json", "utf8");
    fs.writeFileSync(path.join(environment.saveDir, "slot-3.bak.json"), recoveryBackup, "utf8");
    await harness.runScript("window.location.assign('/'); return true;");
    const slotsAfterRecovery = await harness.runScenario("start-screen");
    const recoveredSlot = (
      slotsAfterRecovery as Array<{
        slotId: SaveSlotId;
        state: string;
        diagnostic?: { level: string };
      }>
    ).find((slot) => slot.slotId === "slot/3");
    assert.equal(recoveredSlot?.state, "occupied");
    assert.equal(recoveredSlot?.diagnostic?.level, "warning");

    await harness.runScenario("delete-slot", { slotId: "slot/1" });
    const slotsAfterDelete = await harness.runScript<
      Array<{ slotId: SaveSlotId; state: "empty" | "occupied" | "error" }>
    >("return window.__ASCENSION_DESKTOP_TEST__.listSlots();");
    assert.equal(slotsAfterDelete.find((slot) => slot.slotId === "slot/1")?.state, "empty");

    fs.writeFileSync(
      path.join(tauriLogsDir, "console.json"),
      JSON.stringify(await harness.readConsole(), null, 2),
      "utf8",
    );
  } finally {
    await harness.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

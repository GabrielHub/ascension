import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  buildEarlyCampaignEconomyArtifacts,
  buildEarlyCampaignEconomyLedger,
  earlyCampaignEconomyLedgerSchema,
} from "./early-campaign-economy-ledger";

describe("early campaign economy ledger", () => {
  it("validates the generated ledger schema and opening snapshot", () => {
    const ledger = buildEarlyCampaignEconomyLedger();

    expect(() => earlyCampaignEconomyLedgerSchema.parse(ledger)).not.toThrow();
    expect(ledger.meta.startingState.treasury).toBe(400);
    expect(ledger.meta.startingState.dailyStorefrontIncomeBase).toBe(50);
    expect(ledger.meta.startingState.dailyPayroll).toBe(81);
    expect(ledger.meta.startingState.dailyNetCashBeforeUpgrades).toBe(-31);
  });

  it("covers the required early-game sources and sinks", () => {
    const ledger = buildEarlyCampaignEconomyLedger();

    expect(ledger.ledgers.storefrontIncome.length).toBeGreaterThan(0);
    expect(ledger.ledgers.payroll.length).toBeGreaterThan(0);
    expect(ledger.ledgers.contractPostings.length).toBeGreaterThan(0);
    expect(ledger.ledgers.contractPayouts.length).toBeGreaterThan(0);
    expect(ledger.ledgers.lootSaleConversion.recoverableItems.length).toBeGreaterThan(0);
    expect(ledger.ledgers.lootSaleConversion.missionResultEnvelopes.length).toBeGreaterThan(0);
    expect(ledger.ledgers.upgradeCosts.length).toBeGreaterThan(0);
    expect(ledger.ledgers.treatmentOrRepairCosts.length).toBeGreaterThan(0);
    expect(ledger.ledgers.incidentTreasuryDeltas.length).toBeGreaterThan(0);
  });

  it("matches the checked-in generated artifacts", () => {
    const artifacts = buildEarlyCampaignEconomyArtifacts();
    const ledgerPath = path.resolve("reports/economy/early-campaign-ledger.v1.json");
    const reportPath = path.resolve("reports/economy/early-campaign-report.md");
    const report = fs.readFileSync(reportPath, "utf8");

    expect(JSON.parse(fs.readFileSync(ledgerPath, "utf8"))).toEqual(artifacts.ledger);
    expect(report).toContain("# Early Campaign Economy Report");
    expect(report).toContain("## Contract Board Envelope");
    expect(report).toContain("## Phase 2 Gaps");
    expect(report).toContain("No standalone treatment or repair spend system");
  });
});

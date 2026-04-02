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
    expect(ledger.meta.startingState.dailyPayroll).toBe(73);
    expect(ledger.meta.startingState.dailyNetCashBeforeUpgrades).toBe(-23);
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

  it("renders self-consistent economy artifacts", () => {
    const artifacts = buildEarlyCampaignEconomyArtifacts();

    expect(JSON.parse(artifacts.json)).toEqual(artifacts.ledger);
    expect(artifacts.report).toContain("# Early Campaign Economy Report");
    expect(artifacts.report).toContain("## Contract Board Envelope");
    expect(artifacts.report).toContain("## Phase 2 Gaps");
    expect(artifacts.report).toContain("Direct treatment spend is present but still coarse");
  });
});

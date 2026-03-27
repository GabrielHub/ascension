import { describe, expect, it } from "vitest";

import {
  buildEarlyCampaignSimulationArtifacts,
  buildEarlyCampaignSimulationSuite,
  earlyCampaignSimulationSchema,
} from "./early-campaign-simulation";

describe("early campaign simulation harness", () => {
  it("is deterministic for the same seed window", async () => {
    const first = await buildEarlyCampaignSimulationSuite({ seedCount: 1, contractLimit: 1 });
    const second = await buildEarlyCampaignSimulationSuite({ seedCount: 1, contractLimit: 1 });

    expect(first).toEqual(second);
  });

  it("captures required metrics and threshold summaries", async () => {
    const suite = await buildEarlyCampaignSimulationSuite({ seedCount: 2, contractLimit: 1 });
    const firstRun = suite.runs[0];

    expect(() => earlyCampaignSimulationSchema.parse(suite)).not.toThrow();
    expect(firstRun.contractCycles.length).toBeGreaterThan(0);
    expect(firstRun.contractCycles[0].raidCount).toBeGreaterThan(0);
    expect(firstRun.evaluation.m1TreasuryFlow.overall).toMatch(
      /pass|out_of_band|fail|not_measurable/,
    );
    expect(firstRun.evaluation.m6DeadlockRate.checks.deadlock.status).toMatch(/pass|fail/);
    expect(suite.aggregate.metrics.m2PayrollBurden.passRate).toBeGreaterThanOrEqual(0);
    expect(suite.aggregate.watchItems.lootSellVariance.status).toMatch(/pass|fail/);
  });

  it("does not invert lower-bound threshold checks for positive measurements", async () => {
    const suite = await buildEarlyCampaignSimulationSuite({ seedCount: 1, contractLimit: 1 });
    const firstRun = suite.runs[0];

    expect(firstRun.contractCycles[0]?.operatingNetTreasury).toBeGreaterThan(0);
    expect(firstRun.evaluation.m1TreasuryFlow.checks.mean_cycle_net.status).not.toBe("fail");
    expect(firstRun.evaluation.m1TreasuryFlow.checks.mixed_cycle_net.status).not.toBe("fail");
    expect(
      firstRun.evaluation.m7OpeningStability.checks.treasury_after_three_contracts.status,
    ).not.toBe("fail");
  });

  it("records boss contact whenever a contract records a boss clear", async () => {
    const suite = await buildEarlyCampaignSimulationSuite({ seedCount: 1, contractLimit: 1 });
    const firstRun = suite.runs[0];

    if (firstRun.firstBossClearContract !== null) {
      expect(firstRun.firstBossContactContract).not.toBeNull();
      expect(firstRun.firstBossContactContract).toBeLessThanOrEqual(
        firstRun.firstBossClearContract,
      );
    }
  });

  it("renders self-consistent simulation artifacts", async () => {
    const artifacts = await buildEarlyCampaignSimulationArtifacts();

    expect(JSON.parse(artifacts.json)).toEqual(artifacts.suite);
    expect(artifacts.report).toContain("# Early Campaign Deterministic Simulation Report");
    expect(artifacts.report).toContain("## Threshold Summary");
    expect(artifacts.report).toContain("## Watch Items");
  }, 60_000);
});

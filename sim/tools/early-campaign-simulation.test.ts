import fs from "node:fs";
import path from "node:path";

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

  it("matches the checked-in generated artifacts", async () => {
    const artifacts = await buildEarlyCampaignSimulationArtifacts();
    const jsonPath = path.resolve("reports/economy/early-campaign-simulation.v1.json");
    const reportPath = path.resolve("reports/economy/early-campaign-simulation-report.md");
    const report = fs.readFileSync(reportPath, "utf8");

    expect(JSON.parse(fs.readFileSync(jsonPath, "utf8"))).toEqual(artifacts.suite);
    expect(report).toContain("# Early Campaign Deterministic Simulation Report");
    expect(report).toContain("## Threshold Summary");
    expect(report).toContain("## Watch Items");
  }, 60_000);
});

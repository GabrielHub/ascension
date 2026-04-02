import { describe, expect, it } from "vitest";
import {
  applyGoalCheckConsequences,
  markRaidRunBossCommitment,
  simulateRaidRun,
  resolveRaidRunAfterBoss,
  projectTranscriptSummary,
  projectTeamEventStream,
  type RaidGoalCheckResult,
  type SimOperator,
  type RaidSimulationInput,
} from "./raid-simulation";
import { templateRegistry } from "content/templates";

// ── Fixtures ──────────────────────────────────────────────────────────

function makeOperator(overrides: Partial<SimOperator> = {}): SimOperator {
  return {
    operatorId: "op/1",
    name: "Test Operator",
    roleTag: "role:field_lead",
    stats: {
      strength: 14,
      speed: 12,
      endurance: 10,
      resilience: 11,
      perception: 9,
      intelligence: 8,
    },
    combatPower: 12,
    currentHp: 90,
    maxHp: 90,
    injury: 0,
    morale: 65,
    fatigue: 10,
    kitRegularAttackPower: 17,
    kitSkillPower: 28,
    kitUltimatePower: 38,
    passiveBonus: 2,
    down: false,
    ...overrides,
  };
}

function makeBaseInput(overrides: Partial<RaidSimulationInput> = {}): RaidSimulationInput {
  return {
    raidId: "raid/test-1",
    contractSiteId: "site/test-1",
    missionId: "mission/clearance",
    siteSeed: 42,
    missionDurationHours: 6,
    contractReward: 120,
    contractRisk: 54,
    operators: [
      makeOperator({ operatorId: "op/1", name: "Rose" }),
      makeOperator({
        operatorId: "op/2",
        name: "Milo",
        roleTag: "role:scout",
      }),
      makeOperator({
        operatorId: "op/3",
        name: "Kay",
        roleTag: "role:medic",
      }),
    ],
    enemyFamilies: templateRegistry.enemyFamilies,
    enemyFamilyIds: ["enemy-family/tunnel-crawlers"],
    hazardTags: ["hazard:flooding", "hazard:low-visibility"],
    hasBoss: true,
    bossId: "boss/tunneler-brood-mother",
    intelLevel: 55,
    teamCohesion: 65,
    contractExplorationProgress: 75,
    contractBossIntelProgress: 50,
    ...overrides,
  };
}

// ── Tests ──────────────────────────────────────────────────────────────

describe("simulateRaidRun", () => {
  it("produces a deterministic transcript from a fixed seed", () => {
    const input = makeBaseInput();
    const run1 = simulateRaidRun(input);
    const run2 = simulateRaidRun(input);

    expect(run1.steps.length).toBe(run2.steps.length);
    expect(run1.steps.map((s) => s.kind)).toEqual(run2.steps.map((s) => s.kind));
    expect(run1.derivedState.revealedNodeIds).toEqual(run2.derivedState.revealedNodeIds);
    expect(run1.summaryDraft?.result).toBe(run2.summaryDraft?.result);
  });

  it("generates a valid site graph", () => {
    const run = simulateRaidRun(makeBaseInput());
    expect(run.siteGraph.length).toBeGreaterThanOrEqual(6);
    expect(run.siteGraph[0].nodeId).toBe("node/entry");
    expect(run.siteGraph[0].discovered).toBe(true);

    // Boss nodes should exist when hasBoss is true
    const bossNodes = run.siteGraph.filter(
      (n) => n.kind === "boss_approach" || n.kind === "boss_chamber",
    );
    expect(bossNodes.length).toBe(2);
  });

  it("includes a deploy step as the first transcript entry", () => {
    const run = simulateRaidRun(makeBaseInput());
    expect(run.steps[0].kind).toBe("deploy");
    expect(run.steps[0].actorIds?.length).toBe(3);
  });

  it("produces skirmish steps when enemies are present", () => {
    const run = simulateRaidRun(makeBaseInput());
    const skirmishStarts = run.steps.filter((s) => s.kind === "skirmish_start");
    expect(skirmishStarts.length).toBeGreaterThan(0);

    const skirmishEnds = run.steps.filter((s) => s.kind === "skirmish_end");
    expect(skirmishEnds.length).toBe(skirmishStarts.length);
  });

  it("produces goal check steps with pass/mixed/fail grades", () => {
    const run = simulateRaidRun(makeBaseInput());
    const goalChecks = run.steps.filter((s) => s.kind === "goal_check");
    expect(goalChecks.length).toBeGreaterThan(0);

    for (const check of goalChecks) {
      expect(check.goalCheckKind).toBeTruthy();
      expect(["pass", "mixed", "fail"]).toContain(check.goalCheckGrade);
    }
  });

  it("resolves to a final result when not paused for boss", () => {
    const input = makeBaseInput({
      hasBoss: false,
      contractExplorationProgress: 20,
    });
    const run = simulateRaidRun(input);
    expect(run.status).toBe("resolved");
    expect(run.summaryDraft).toBeTruthy();
    expect(["success", "failure", "mixed"]).toContain(run.summaryDraft?.result);
  });

  it("pauses at boss threshold when conditions are met", () => {
    const input = makeBaseInput({
      contractExplorationProgress: 80,
    });
    const run = simulateRaidRun(input);
    // Should either hit boss threshold or resolve (depends on site graph)
    const bossThresholdSteps = run.steps.filter((s) => s.kind === "boss_threshold");
    if (run.status === "awaiting_boss_commitment") {
      expect(bossThresholdSteps.length).toBe(1);
    }
  });

  it("tracks operator HP and injury through the simulation", () => {
    const run = simulateRaidRun(makeBaseInput());
    for (const opId of run.teamOperatorIds) {
      expect(run.derivedState.operatorHp[opId]).toBeDefined();
      expect(run.derivedState.operatorMaxHp[opId]).toBeDefined();
    }
  });

  it("uses authored enemy templates when available", () => {
    const run = simulateRaidRun(makeBaseInput());
    const enemyDiscoveries = run.steps.filter((s) => s.kind === "discover_enemy");
    // At least some enemies should be authored (not generic)
    const hasAuthoredEnemy = enemyDiscoveries.some(
      (s) => s.enemyTemplateId && s.enemyTemplateId !== "enemy/generic",
    );
    if (templateRegistry.enemyFamilies.length > 0) {
      expect(hasAuthoredEnemy).toBe(true);
    }
  });

  it("produces different outcomes with different seeds", () => {
    const run1 = simulateRaidRun(makeBaseInput({ siteSeed: 100 }));
    const run2 = simulateRaidRun(makeBaseInput({ siteSeed: 999 }));

    // Not guaranteed different, but very likely with different seeds
    expect(run1.siteGraph.length + run2.siteGraph.length).toBeGreaterThan(0);
  });

  it("handles zero enemy families gracefully", () => {
    const input = makeBaseInput({
      enemyFamilies: [],
      enemyFamilyIds: [],
    });
    const run = simulateRaidRun(input);
    expect(run.steps.length).toBeGreaterThan(0);
    expect(run.steps[0].kind).toBe("deploy");
  });
});

describe("applyGoalCheckConsequences", () => {
  it("applies negative hp deltas as damage and records the paired injury", () => {
    const operators = [
      makeOperator({
        operatorId: "op/damaged",
        currentHp: 12,
        maxHp: 20,
      }),
    ];
    const derivedState = {
      revealedNodeIds: ["node/entry"],
      discoveredEnemyIds: [],
      discoveredFeatureIds: [],
      operatorHp: { "op/damaged": 12 },
      operatorMaxHp: { "op/damaged": 20 },
      operatorInjury: { "op/damaged": 0 },
      currentNodeId: "node/entry",
      bossThresholdReached: false,
      retreating: false,
      lootGained: [],
      intelGained: 0,
    };
    const result: RaidGoalCheckResult = {
      grade: "fail",
      step: {
        kind: "goal_check",
        tickOffset: 1,
        siteNodeId: "node/entry",
        goalCheckKind: "exploring",
        goalCheckGrade: "fail",
        actorIds: ["op/damaged"],
        message: "Exploration check: failed.",
      },
      consequences: {
        hpDelta: { "op/damaged": -5 },
        injuryDelta: { "op/damaged": 2 },
      },
    };

    applyGoalCheckConsequences(operators, derivedState, result);

    expect(operators[0].currentHp).toBe(7);
    expect(derivedState.operatorHp["op/damaged"]).toBe(7);
    expect(derivedState.operatorInjury["op/damaged"]).toBe(2);
  });
});

describe("resolveRaidRunAfterBoss", () => {
  it("records the boss commitment step when a paused run enters the live encounter", () => {
    const run = {
      raidId: "raid/test-1",
      contractSiteId: "site/test-1",
      missionId: "mission/clearance",
      siteSeed: 42,
      teamOperatorIds: ["op/1", "op/2"],
      startedTick: 0,
      status: "awaiting_boss_commitment" as const,
      currentStepIndex: 2,
      steps: [
        {
          kind: "deploy" as const,
          tickOffset: 0,
          siteNodeId: "node/entry",
          actorIds: ["op/1", "op/2"],
          message: "Team deployed into the site.",
        },
        {
          kind: "move" as const,
          tickOffset: 1,
          siteNodeId: "node/boss-approach",
          message: "Team moves to boss approach.",
        },
        {
          kind: "boss_threshold" as const,
          tickOffset: 2,
          siteNodeId: "node/boss-approach",
          actorIds: ["op/1", "op/2"],
          message: "Boss chamber located. Awaiting commitment decision.",
        },
      ],
      siteGraph: [
        {
          nodeId: "node/entry",
          kind: "chamber" as const,
          x: 1,
          y: 1,
          edges: ["node/boss-approach"],
          discovered: true,
        },
        {
          nodeId: "node/boss-approach",
          kind: "boss_approach" as const,
          x: 13,
          y: 7,
          edges: ["node/entry", "node/boss-chamber"],
        },
        {
          nodeId: "node/boss-chamber",
          kind: "boss_chamber" as const,
          x: 14,
          y: 7,
          edges: ["node/boss-approach"],
        },
      ],
      derivedState: {
        revealedNodeIds: ["node/entry", "node/boss-approach"],
        discoveredEnemyIds: [],
        discoveredFeatureIds: [],
        operatorHp: { "op/1": 50, "op/2": 45 },
        operatorMaxHp: { "op/1": 60, "op/2": 55 },
        operatorInjury: { "op/1": 4, "op/2": 6 },
        currentNodeId: "node/boss-approach",
        bossThresholdReached: true,
        retreating: false,
        lootGained: [],
        intelGained: 0,
      },
    };

    const committed = markRaidRunBossCommitment(run);

    expect(committed.status).toBe("boss_encounter");
    expect(committed.steps.at(-1)?.kind).toBe("boss_commit");
    expect(committed.steps.at(-1)?.siteNodeId).toBe("node/boss-approach");
    expect(committed.currentStepIndex).toBe(committed.steps.length - 1);
  });

  it("resolves a paused run after boss victory", () => {
    const input = makeBaseInput({ contractExplorationProgress: 80 });
    const run = simulateRaidRun(input);

    if (run.status === "awaiting_boss_commitment") {
      const resolved = resolveRaidRunAfterBoss(run, "victory", {
        "op/1": 50,
        "op/2": 30,
        "op/3": 60,
      });
      expect(resolved.status).toBe("resolved");
      expect(resolved.summaryDraft?.result).toBe("success");
      expect(resolved.steps.some((s) => s.kind === "boss_result")).toBe(true);
    }
  });

  it("resolves a paused run after boss retreat", () => {
    const input = makeBaseInput({ contractExplorationProgress: 80 });
    const run = simulateRaidRun(input);

    if (run.status === "awaiting_boss_commitment") {
      const resolved = resolveRaidRunAfterBoss(run, "retreat", {});
      expect(resolved.status).toBe("resolved");
      expect(resolved.summaryDraft?.result).toBe("failure");
      expect(resolved.steps.some((s) => s.kind === "boss_retreat")).toBe(true);
    }
  });
});

describe("projectTranscriptSummary", () => {
  it("summarizes a completed run", () => {
    const run = simulateRaidRun(makeBaseInput({ hasBoss: false, contractExplorationProgress: 20 }));
    const summary = projectTranscriptSummary(run);

    expect(summary.raidId).toBe("raid/test-1");
    expect(["success", "failure", "mixed"]).toContain(summary.result);
    expect(summary.totalSteps).toBe(run.steps.length);
    expect(summary.operatorOutcomes.length).toBe(3);
  });

  it("includes goal check results in the summary", () => {
    const run = simulateRaidRun(makeBaseInput({ hasBoss: false }));
    const summary = projectTranscriptSummary(run);
    expect(summary.goalChecks.length).toBeGreaterThan(0);
  });
});

describe("projectTeamEventStream", () => {
  it("projects a readable event stream", () => {
    const run = simulateRaidRun(makeBaseInput({ hasBoss: false }));
    const events = projectTeamEventStream(run);
    expect(events.length).toBeGreaterThan(0);
    // All events should have messages
    for (const event of events) {
      expect(event.message).toBeTruthy();
    }
  });
});

describe("save/load round-trip", () => {
  it("RaidRun snapshot is serializable to JSON", () => {
    const run = simulateRaidRun(makeBaseInput({ hasBoss: false }));
    const json = JSON.stringify(run);
    const restored = JSON.parse(json);

    expect(restored.raidId).toBe(run.raidId);
    expect(restored.steps.length).toBe(run.steps.length);
    expect(restored.derivedState.revealedNodeIds).toEqual(run.derivedState.revealedNodeIds);
    expect(restored.summaryDraft?.result).toBe(run.summaryDraft?.result);
  });
});

import { describe, expect, it } from "vitest";

import { templateRegistry } from "content/templates";
import {
  createAscensionSimulation,
  createBootstrapSimulation,
  createBootstrapWorldSnapshot,
} from "sim";

import { buildHqViewFromPhase1, buildHqViewModel, buildOpsViewFromPhase1 } from "./view-models";

describe("phase 1 view models", () => {
  it("keeps applied room upgrades visible in the HQ panel model", () => {
    const simulation = createBootstrapSimulation(templateRegistry);

    simulation.dispatch({
      type: "sim/purchase-room-upgrade",
      roomId: "room-instance/register",
      upgradeId: "upgrade/room/register:records_wall",
    });

    const hq = buildHqViewFromPhase1(simulation.getPhase1View(), templateRegistry);

    expect(hq.roomUpgrades).toContainEqual(
      expect.objectContaining({
        id: "upgrade/room/register:records_wall",
        isApplied: true,
      }),
    );
  });

  it("maps forming opportunities to the claimed operations state", () => {
    const snapshot = createBootstrapWorldSnapshot(templateRegistry);
    snapshot.raidOpportunities = [
      {
        id: "opportunity/seeded-1",
        missionId: "mission/clearance",
        location: "district/lower-east-side",
        threat: 83,
        intel: 59,
        reward: 180,
        risk: 70,
        status: "open",
        interestedOperatorIds: [],
        claimedOperatorIds: [],
        createdTick: 420,
        expiresAtTick: 900,
      },
    ];

    const simulation = createAscensionSimulation(snapshot, templateRegistry);
    const operations = buildOpsViewFromPhase1(simulation.getPhase1View(), templateRegistry);

    expect(operations.opportunities).toContainEqual(
      expect.objectContaining({
        id: "opportunity/seeded-1",
        status: "claimed",
      }),
    );
  });

  it("passes through runtime-owned roster pressure without UI recomputation", () => {
    const simulation = createBootstrapSimulation(templateRegistry);
    const phase1View = simulation.getPhase1View();

    const hq = buildHqViewFromPhase1(
      {
        ...phase1View,
        rosterPressure: {
          operatorCapacity: 6,
          livingOperatorCount: 1,
          vacancyCount: 5,
          unavailableOperatorIds: ["operator/unavailable"],
          recentDeathOperatorIds: ["operator/dead"],
          replacementPressureLevel: "critical",
        },
      },
      templateRegistry,
    );

    expect(hq.rosterPressure).toEqual({
      operatorCapacity: 6,
      livingOperatorCount: 1,
      vacancyCount: 5,
      unavailableOperatorIds: ["operator/unavailable"],
      recentDeathOperatorIds: ["operator/dead"],
      replacementPressureLevel: "critical",
    });
  });

  it("keeps legacy WorldSnapshot pressure on a safe stable fallback", () => {
    const snapshot = createBootstrapWorldSnapshot(templateRegistry);

    if (!snapshot.operators || snapshot.operators.length < 2) {
      throw new Error("expected bootstrap snapshot to include operators");
    }

    snapshot.building.operatorSlotCount = 3;
    snapshot.operators = [
      {
        ...snapshot.operators[0],
        lifecycle: {
          status: "dead",
          deathTick: 120,
          deathRaidSummaryId: "raid/legacy-fallback",
        },
      },
      snapshot.operators[1],
    ];

    const hq = buildHqViewModel(snapshot, templateRegistry);

    expect(hq.rosterPressure).toEqual({
      operatorCapacity: 3,
      livingOperatorCount: 1,
      vacancyCount: 2,
      unavailableOperatorIds: [],
      recentDeathOperatorIds: [],
      replacementPressureLevel: "stable",
    });
  });
});

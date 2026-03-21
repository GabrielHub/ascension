import { describe, expect, it } from "vitest";

import { templateRegistry } from "content/templates";
import {
  createAscensionSimulation,
  createBootstrapSimulation,
  createBootstrapWorldSnapshot,
} from "sim";

import { buildHqViewFromPhase1, buildOpsViewFromPhase1 } from "./view-models";

describe("phase 1 view models", () => {
  it("keeps applied room upgrades visible in the HQ panel model", () => {
    const simulation = createBootstrapSimulation(templateRegistry);

    simulation.dispatch({
      type: "sim/purchase-room-upgrade",
      roomId: "room-instance/front_desk",
      upgradeId: "upgrade/room/front_desk:records_wall",
    });

    const hq = buildHqViewFromPhase1(simulation.getPhase1View(), templateRegistry);

    expect(hq.roomUpgrades).toContainEqual(
      expect.objectContaining({
        id: "upgrade/room/front_desk:records_wall",
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
});

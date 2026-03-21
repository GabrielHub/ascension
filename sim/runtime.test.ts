import { describe, expect, it } from "vitest";

import {
  createAscensionSimulation,
  createBootstrapSimulation,
  createBootstrapWorldSnapshot,
} from "./index";
import { STABLE_SIM_COMMAND_TYPES } from "./commands";
import { templateRegistry } from "content/templates";
import { OPERATOR_APPEARANCE_PRESET_IDS } from "save";

describe("phase 1 runtime", () => {
  it("exposes the stable autonomous command surface and runtime selectors", () => {
    const simulation = createBootstrapSimulation(templateRegistry);
    const phase1View = simulation.getPhase1View();

    expect(simulation.stableCommandTypes).toEqual(STABLE_SIM_COMMAND_TYPES);
    expect(STABLE_SIM_COMMAND_TYPES).not.toContain("sim/dispatch-raid");
    expect(phase1View.building.activeBuildingId).toBe("building/bodega");
    expect(phase1View.operators).toHaveLength(2);
    expect(phase1View.operators.map((operator) => operator.appearance.presetId)).toEqual([
      "female-flowing",
      "male-undercut",
    ]);
    expect(phase1View.operatorIntentReadiness).toHaveLength(2);
    expect(phase1View.relationshipSignals).toHaveLength(1);
    expect(phase1View.raidOpportunities).toHaveLength(0);
  });

  it("applies building and room upgrades through the locked commands", () => {
    const roomUpgradeSimulation = createBootstrapSimulation(templateRegistry);

    roomUpgradeSimulation.dispatch({
      type: "sim/purchase-room-upgrade",
      roomId: "room-instance/front_desk",
      upgradeId: "upgrade/room/front_desk:records_wall",
    });
    expect(
      roomUpgradeSimulation
        .getPhase1View()
        .rooms.find((room) => room.id === "room-instance/front_desk")?.capacity,
    ).toBe(3);

    const simulation = createBootstrapSimulation(templateRegistry);
    simulation.dispatch({
      type: "sim/purchase-building-upgrade",
      upgradeId: "upgrade/building/bodega:annex",
    });

    let phase1View = simulation.getPhase1View();
    expect(phase1View.building.appliedUpgradeIds).toContain("upgrade/building/bodega:annex");
    expect(phase1View.building.unlockedRoomTemplateIds).toContain("room/infirmary:tier_1");
    expect(phase1View.building.operatorSlotCount).toBe(3);

    simulation.dispatch({
      type: "sim/place-room",
      templateId: "room/infirmary:tier_1",
    });

    phase1View = simulation.getPhase1View();
    expect(
      phase1View.rooms.find((room) => room.templateId === "room/infirmary:tier_1"),
    ).toBeTruthy();
    expect(
      phase1View.rooms
        .find((room) => room.id === "room-instance/front_desk")
        ?.availableUpgradeIds.includes("upgrade/room/front_desk:records_wall"),
    ).toBe(false);
  });

  it("supports staffing, recruiting, and operator relationship seeding", () => {
    const simulation = createBootstrapSimulation(templateRegistry);

    simulation.dispatch({
      type: "sim/purchase-building-upgrade",
      upgradeId: "upgrade/building/bodega:annex",
    });
    simulation.dispatch({
      type: "sim/hire-staff",
      roleTag: "role:recruitment",
    });

    const recruiter = simulation
      .getPhase1View()
      .staff.find((staff) => staff.roleTag === "role:recruitment");

    expect(recruiter).toBeTruthy();

    simulation.dispatch({
      type: "sim/assign-staff",
      staffId: recruiter!.id,
      roomId: "room-instance/recruitment_space",
    });
    simulation.dispatch({
      type: "sim/set-room-active",
      roomId: "room-instance/recruitment_space",
      isActive: true,
    });
    simulation.dispatch({
      type: "sim/accept-recruit",
      visitorId: "visitor/preview-1",
    });

    const phase1View = simulation.getPhase1View();
    expect(phase1View.operators).toHaveLength(3);
    expect(phase1View.visitors).toHaveLength(0);
    expect(
      OPERATOR_APPEARANCE_PRESET_IDS.includes(
        phase1View.operators.find((operator) => operator.id === "operator/3")!.appearance.presetId,
      ),
    ).toBe(true);
    expect(
      phase1View.relationshipSignals.some((relationship) => {
        return (
          relationship.operatorAId === "operator/nika-voss" ||
          relationship.operatorBId === "operator/nika-voss"
        );
      }),
    ).toBe(false);
    expect(phase1View.relationshipSignals).toHaveLength(3);
  });

  it("claims aged raid opportunities deterministically before launching the formed team", () => {
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

    let phase1View = simulation.getPhase1View();

    expect(phase1View.raidOpportunities).toHaveLength(1);
    expect(phase1View.raidOpportunities[0]).toMatchObject({
      id: "opportunity/seeded-1",
      status: "forming",
      interestedOperatorIds: ["operator/milo-hart", "operator/rose-vega"],
      claimedOperatorIds: ["operator/milo-hart", "operator/rose-vega"],
    });
    expect(phase1View.activeRaids).toHaveLength(0);

    simulation.tick(60000);

    phase1View = simulation.getPhase1View();

    expect(phase1View.raidOpportunities).toHaveLength(0);
    expect(phase1View.activeRaids).toHaveLength(1);
    expect(phase1View.activeRaids[0].operatorIds).toEqual([
      "operator/milo-hart",
      "operator/rose-vega",
    ]);
  });

  it("re-plans operators after raid return and updates relationship memory from outcomes", () => {
    const simulation = createBootstrapSimulation(templateRegistry);

    simulation.tick(180000);

    let phase1View = simulation.getPhase1View();

    expect(phase1View.raidOpportunities).toHaveLength(1);
    expect(phase1View.raidOpportunities[0].interestedOperatorIds).toEqual([
      "operator/milo-hart",
      "operator/rose-vega",
    ]);
    expect(phase1View.operatorIntentReadiness.map((operator) => operator.operatorId)).toEqual([
      "operator/rose-vega",
      "operator/milo-hart",
    ]);

    simulation.tick(60000);

    phase1View = simulation.getPhase1View();

    expect(phase1View.activeRaids).toHaveLength(1);
    expect(phase1View.activeRaids[0].operatorIds).toEqual([
      "operator/milo-hart",
      "operator/rose-vega",
    ]);

    const relationshipBeforeReturn = phase1View.relationshipSignals[0];

    simulation.tick(360000);

    phase1View = simulation.getPhase1View();

    expect(phase1View.activeRaids).toHaveLength(0);
    expect(phase1View.raidSummaries).toHaveLength(1);
    expect(
      phase1View.operatorIntentReadiness.every((operator) => operator.currentBlock !== "raid"),
    ).toBe(true);
    expect(phase1View.operators.every((operator) => operator.assignment.kind !== "raid")).toBe(
      true,
    );
    expect(phase1View.relationshipSignals[0].familiarity).toBeGreaterThan(
      relationshipBeforeReturn.familiarity,
    );
    expect(phase1View.relationshipSignals[0].recentSharedOutcome).not.toBe(
      relationshipBeforeReturn.recentSharedOutcome,
    );
    expect(phase1View.relationshipSignals[0].historyTags).toContain(
      `outcome:${phase1View.raidSummaries[0].result}`,
    );
    expect(phase1View.relationshipSignals[0].historyTags).toContain(
      `mission:${phase1View.raidSummaries[0].missionId.slice("mission/".length)}`,
    );
  });
});

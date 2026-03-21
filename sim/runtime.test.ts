import { describe, expect, it } from "vitest";

import {
  createAscensionSimulation,
  createBootstrapSimulation,
  createBootstrapWorldSnapshot,
} from "./index";
import { STABLE_SIM_COMMAND_TYPES } from "./commands";
import { RUNTIME_OPERATOR_APPEARANCE_PRESET_IDS } from "./systems/commands";
import { templateRegistry } from "content/templates";

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
    expect(phase1View.operators.map((operator) => operator.appearance.visibleGear)).toEqual([
      {
        weaponPartId: "weapon/tactical-rifle",
        outfitOverlayPartId: "outfit-overlay/tactical-vest",
      },
      {
        weaponPartId: "weapon/dual-daggers",
        accessoryPartId: "accessory/comm-earpiece",
      },
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
      RUNTIME_OPERATOR_APPEARANCE_PRESET_IDS.includes(
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

  it("ignores dead operators when computing event pressure from morale and injuries", () => {
    const createSnapshotWithDeadOperator = () => {
      const snapshot = createBootstrapWorldSnapshot(templateRegistry);

      snapshot.operators = snapshot.operators?.map((operator) =>
        operator.id === "operator/rose-vega"
          ? {
              ...operator,
              lifecycle: {
                status: "dead" as const,
                deathTick: 100,
                deathRaidSummaryId: "raid/test",
              },
            }
          : operator,
      );

      return snapshot;
    };

    const baselineSnapshot = createSnapshotWithDeadOperator();
    const frozenSeveritySnapshot = createSnapshotWithDeadOperator();

    frozenSeveritySnapshot.operators = frozenSeveritySnapshot.operators?.map((operator) =>
      operator.id === "operator/rose-vega"
        ? {
            ...operator,
            morale: {
              ...operator.morale,
              current: 0,
            },
            injury: {
              ...operator.injury,
              severity: 100,
            },
          }
        : operator,
    );

    const baselineSimulation = createAscensionSimulation(baselineSnapshot, templateRegistry);
    const frozenSeveritySimulation = createAscensionSimulation(
      frozenSeveritySnapshot,
      templateRegistry,
    );

    baselineSimulation.tick(60000);
    frozenSeveritySimulation.tick(60000);

    const baselineView = baselineSimulation.getPhase1View();
    const frozenSeverityView = frozenSeveritySimulation.getPhase1View();

    expect(baselineView.resources.pressure).toBe(0);
    expect(frozenSeverityView.resources.pressure).toBe(baselineView.resources.pressure);
    expect(frozenSeverityView.activeEvents).toEqual(baselineView.activeEvents);
  });

  it("ignores dead-operator relationship history when planning the living operator schedule", () => {
    const createSnapshotWithDeadRelationship = (relationship: {
      trust: number;
      friction: number;
      familiarity: number;
      recentSharedOutcome: number;
    }) => {
      const snapshot = createBootstrapWorldSnapshot(templateRegistry);

      snapshot.time = {
        ...snapshot.time,
        minuteOfDay: 1200,
      };
      snapshot.rooms = snapshot.rooms.map((room) =>
        room.id === "room-instance/recruitment_space"
          ? {
              ...room,
              isActive: true,
            }
          : room,
      );
      snapshot.staff = [
        ...(snapshot.staff ?? []),
        {
          id: "staff/recruiter-test",
          name: "Inez Vale",
          roleTag: "role:recruitment",
          status: "assigned",
          wage: 20,
          assignment: {
            kind: "room",
            targetId: "room-instance/recruitment_space",
          },
        },
      ];
      snapshot.operators = snapshot.operators?.map((operator) =>
        operator.id === "operator/milo-hart"
          ? {
              ...operator,
              lifecycle: {
                status: "dead" as const,
                deathTick: 100,
                deathRaidSummaryId: "raid/test",
              },
            }
          : operator,
      );
      snapshot.operatorRelationships = [
        {
          operatorAId: "operator/milo-hart",
          operatorBId: "operator/rose-vega",
          historyTags: ["history:test"],
          ...relationship,
        },
      ];

      return snapshot;
    };

    const optimisticSimulation = createAscensionSimulation(
      createSnapshotWithDeadRelationship({
        trust: 100,
        friction: 0,
        familiarity: 100,
        recentSharedOutcome: 30,
      }),
      templateRegistry,
    );
    const hostileSimulation = createAscensionSimulation(
      createSnapshotWithDeadRelationship({
        trust: 0,
        friction: 100,
        familiarity: 0,
        recentSharedOutcome: -30,
      }),
      templateRegistry,
    );

    optimisticSimulation.tick(0);
    hostileSimulation.tick(0);

    const optimisticRose = optimisticSimulation
      .getPhase1View()
      .operators.find((operator) => operator.id === "operator/rose-vega");
    const hostileRose = hostileSimulation
      .getPhase1View()
      .operators.find((operator) => operator.id === "operator/rose-vega");

    expect(optimisticRose?.schedule.currentBlock).toBe("rest");
    expect(hostileRose?.schedule.currentBlock).toBe("rest");
  });

  it("preserves approved visible gear ids through runtime snapshot and view reconstruction", () => {
    const bootstrapSnapshot = createBootstrapWorldSnapshot(templateRegistry);
    const simulation = createAscensionSimulation(bootstrapSnapshot, templateRegistry);
    const phase1View = simulation.getPhase1View();

    expect(simulation.getWorldSnapshot().operators?.map((operator) => operator.appearance)).toEqual(
      phase1View.operators.map((operator) => operator.appearance),
    );
    expect(
      phase1View.operators.find((operator) => operator.id === "operator/rose-vega")?.appearance,
    ).toEqual({
      presetId: "female-flowing",
      visibleGear: {
        weaponPartId: "weapon/tactical-rifle",
        outfitOverlayPartId: "outfit-overlay/tactical-vest",
      },
    });
  });

  it("ignores legacy appearance seeds during runtime snapshot reconstruction", () => {
    const bootstrapSnapshot = createBootstrapWorldSnapshot(templateRegistry);
    const roseVega = bootstrapSnapshot.operators?.find(
      (operator) => operator.id === "operator/rose-vega",
    );

    expect(roseVega).toBeTruthy();

    const createPresetIdFromLegacySeed = (legacySeed: number) => {
      const snapshot = createBootstrapWorldSnapshot(templateRegistry);
      snapshot.operators = snapshot.operators?.map((operator) =>
        operator.id === "operator/rose-vega"
          ? ({
              ...operator,
              appearance: { seed: legacySeed },
            } as typeof operator)
          : operator,
      );

      return createAscensionSimulation(snapshot, templateRegistry)
        .getWorldSnapshot()
        .operators?.find((operator) => operator.id === "operator/rose-vega")?.appearance.presetId;
    };

    const presetFromFirstSeed = createPresetIdFromLegacySeed(1);
    const presetFromSecondSeed = createPresetIdFromLegacySeed(999);

    expect(presetFromFirstSeed).toBeDefined();
    expect(presetFromFirstSeed).toBe(presetFromSecondSeed);
    expect(RUNTIME_OPERATOR_APPEARANCE_PRESET_IDS).toContain(presetFromFirstSeed);
  });

  it("preserves unknown visible gear ids but drops malformed slot values", () => {
    const snapshot = createBootstrapWorldSnapshot(templateRegistry);
    snapshot.operators = snapshot.operators?.map((operator) =>
      operator.id === "operator/rose-vega"
        ? ({
            ...operator,
            appearance: {
              presetId: "female-flowing",
              visibleGear: {
                weaponPartId: "weapon/unknown-prototype",
                outfitOverlayPartId: 42,
                accessoryPartId: "",
              },
            },
          } as typeof operator)
        : operator,
    );

    const simulation = createAscensionSimulation(snapshot, templateRegistry);
    const worldAppearance = simulation
      .getWorldSnapshot()
      .operators?.find((operator) => operator.id === "operator/rose-vega")?.appearance;
    const viewAppearance = simulation
      .getPhase1View()
      .operators.find((operator) => operator.id === "operator/rose-vega")?.appearance;

    // Unknown gear-id validation stays outside runtime ownership; runtime preserves only typed slot strings.
    expect(worldAppearance).toEqual({
      presetId: "female-flowing",
      visibleGear: {
        weaponPartId: "weapon/unknown-prototype",
      },
    });
    expect(viewAppearance).toEqual(worldAppearance);
  });

  it("bootstrap operators start with active lifecycle", () => {
    const simulation = createBootstrapSimulation(templateRegistry);
    const phase1View = simulation.getPhase1View();

    phase1View.operators.forEach((operator) => {
      expect(operator.lifecycle).toEqual({ status: "active" });
    });
    expect(phase1View.rosterPressure.livingOperatorCount).toBe(2);
    expect(phase1View.rosterPressure.vacancyCount).toBe(0);
    expect(phase1View.rosterPressure.replacementPressureLevel).toBe("stable");
    expect(phase1View.rosterPressure.recentDeathOperatorIds).toEqual([]);
  });

  it("rosterPressure reports strained when one slot is open without a recent death", () => {
    const simulation = createBootstrapSimulation(templateRegistry);
    simulation.dispatch({
      type: "sim/purchase-building-upgrade",
      upgradeId: "upgrade/building/bodega:annex",
    });
    const phase1View = simulation.getPhase1View();

    expect(phase1View.rosterPressure.operatorCapacity).toBe(3);
    expect(phase1View.rosterPressure.livingOperatorCount).toBe(2);
    expect(phase1View.rosterPressure.vacancyCount).toBe(1);
    expect(phase1View.rosterPressure.recentDeathOperatorIds).toEqual([]);
    expect(phase1View.rosterPressure.replacementPressureLevel).toBe("strained");
  });

  it("dead operators persist in operators[] but are excluded from living roster and availability", () => {
    const snapshot = createBootstrapWorldSnapshot(templateRegistry);
    snapshot.operators = snapshot.operators?.map((operator, index) =>
      index === 0
        ? {
            ...operator,
            lifecycle: {
              status: "dead" as const,
              deathTick: 100,
              deathRaidSummaryId: "raid/1",
            },
          }
        : operator,
    );

    const simulation = createAscensionSimulation(snapshot, templateRegistry);
    const phase1View = simulation.getPhase1View();
    const worldSnapshot = simulation.getWorldSnapshot();

    // Dead operator still in operators[]
    expect(worldSnapshot.operators).toHaveLength(2);
    expect(phase1View.operators).toHaveLength(2);

    // Dead operator has correct lifecycle
    const deadOperator = phase1View.operators.find((op) => op.lifecycle.status === "dead");
    expect(deadOperator).toBeTruthy();
    expect(deadOperator!.lifecycle.deathTick).toBe(100);
    expect(deadOperator!.lifecycle.deathRaidSummaryId).toBe("raid/1");

    // Dead operator excluded from intent readiness
    expect(phase1View.operatorIntentReadiness).toHaveLength(1);
    expect(phase1View.operatorIntentReadiness[0].operatorId).not.toBe(deadOperator!.id);

    // Building operatorCount reflects living only
    expect(phase1View.building.operatorCount).toBe(1);

    // rosterPressure reflects vacancy and recent death
    expect(phase1View.rosterPressure.livingOperatorCount).toBe(1);
    expect(phase1View.rosterPressure.vacancyCount).toBe(1);
    expect(phase1View.rosterPressure.recentDeathOperatorIds).toHaveLength(1);
    expect(phase1View.rosterPressure.recentDeathOperatorIds[0]).toBe(deadOperator!.id);
    expect(phase1View.rosterPressure.replacementPressureLevel).toBe("critical");
  });

  it("raid resolution applies death when resolution packet marks operator as died", () => {
    const snapshot = createBootstrapWorldSnapshot(templateRegistry);
    const targetOperatorId = "operator/rose-vega";

    // Pre-assign operator to the raid
    snapshot.operators = snapshot.operators?.map((operator) =>
      operator.id === targetOperatorId
        ? {
            ...operator,
            assignment: { kind: "raid", targetId: "raid/death-test" },
            schedule: { currentBlock: "raid", workStartMinute: 480, workEndMinute: 1080 },
          }
        : operator,
    );

    // Seed an active raid about to resolve with a death outcome
    snapshot.activeRaidPackets = [
      {
        id: "raid/death-test",
        opportunityId: "opportunity/death-setup",
        missionId: "mission/clearance",
        location: "district/lower-east-side",
        startedAt: "day-1 08:00",
        startedTick: 480,
        revealProgress: 100,
        operatorIds: [targetOperatorId],
        returnTick: 481,
        durationHours: 1,
        threat: 95,
        intel: 10,
        reward: 40,
        cohesion: 50,
        resolutionPacket: {
          result: "failure",
          reputationDelta: -5,
          cashDelta: -45,
          operatorOutcomes: [
            {
              operatorId: targetOperatorId,
              injuryDelta: 40,
              moraleDelta: -10,
              loyaltyDelta: -7,
              status: "hurt",
              died: true,
            },
          ],
          narrativeTags: ["result:failure"],
          intelMismatchTags: [],
        },
      },
    ];

    const simulation = createAscensionSimulation(snapshot, templateRegistry);

    // Tick to trigger raid resolution
    simulation.tick(60000);

    const phase1View = simulation.getPhase1View();

    // Raid should be resolved
    expect(phase1View.activeRaids).toHaveLength(0);
    expect(phase1View.raidSummaries).toHaveLength(1);

    const summary = phase1View.raidSummaries[0];
    expect(summary.id).toBe("raid/death-test");
    expect(summary.operatorOutcomes[0].died).toBe(true);

    // Dead operator still in operators[] with correct lifecycle
    const deadOperator = phase1View.operators.find((op) => op.id === targetOperatorId);
    expect(deadOperator).toBeTruthy();
    expect(deadOperator!.lifecycle.status).toBe("dead");
    expect(deadOperator!.lifecycle.deathTick).toBeDefined();
    expect(deadOperator!.lifecycle.deathRaidSummaryId).toBe("raid/death-test");

    // Dead operator excluded from intent readiness
    expect(
      phase1View.operatorIntentReadiness.find((entry) => entry.operatorId === targetOperatorId),
    ).toBeUndefined();

    // Dead operator still in operators[] and world snapshot
    const worldSnapshot = simulation.getWorldSnapshot();
    expect(worldSnapshot.operators?.find((op) => op.id === targetOperatorId)).toBeTruthy();
    expect(
      worldSnapshot.operators?.find((op) => op.id === targetOperatorId)!.lifecycle.status,
    ).toBe("dead");

    // rosterPressure reflects the death
    expect(phase1View.rosterPressure.recentDeathOperatorIds).toContain(targetOperatorId);
    expect(phase1View.rosterPressure.livingOperatorCount).toBe(1);
    expect(phase1View.rosterPressure.vacancyCount).toBe(1);
  });

  it("autonomous raid resolution generates death when failure injury crosses the fatal threshold", () => {
    const snapshot = createBootstrapWorldSnapshot(templateRegistry);
    const targetOperatorId = "operator/rose-vega";

    snapshot.operators = snapshot.operators?.map((operator) =>
      operator.id === targetOperatorId
        ? {
            ...operator,
            injury: {
              ...operator.injury,
              severity: 66,
            },
          }
        : operator,
    );
    snapshot.raidOpportunities = [
      {
        id: "opportunity/high-risk-death",
        missionId: "mission/clearance",
        location: "district/red-hook-waterfront",
        threat: 95,
        intel: 10,
        reward: 120,
        risk: 90,
        status: "open",
        interestedOperatorIds: [],
        claimedOperatorIds: [],
        createdTick: 400,
        expiresAtTick: 1000,
      },
    ];

    const simulation = createAscensionSimulation(snapshot, templateRegistry);

    simulation.tick(60000);

    let phase1View = simulation.getPhase1View();

    expect(phase1View.activeRaids).toHaveLength(1);
    expect(phase1View.activeRaids[0].operatorIds).toContain(targetOperatorId);

    simulation.tick(360000);

    phase1View = simulation.getPhase1View();

    expect(phase1View.activeRaids).toHaveLength(0);
    expect(phase1View.raidSummaries).toHaveLength(1);
    expect(phase1View.raidSummaries[0].result).toBe("failure");
    expect(
      phase1View.raidSummaries[0].operatorOutcomes.find(
        (outcome) => outcome.operatorId === targetOperatorId,
      )?.died,
    ).toBe(true);
    expect(
      phase1View.operators.find((operator) => operator.id === targetOperatorId)?.lifecycle,
    ).toMatchObject({
      status: "dead",
      deathRaidSummaryId: phase1View.raidSummaries[0].id,
    });
  });

  it("rosterPressure reports critical when vacancy ratio is high", () => {
    const snapshot = createBootstrapWorldSnapshot(templateRegistry);

    // Kill both operators to create maximum pressure
    snapshot.operators = snapshot.operators?.map((operator) => ({
      ...operator,
      lifecycle: {
        status: "dead" as const,
        deathTick: 100,
        deathRaidSummaryId: "raid/test",
      },
    }));

    const simulation = createAscensionSimulation(snapshot, templateRegistry);
    const phase1View = simulation.getPhase1View();

    expect(phase1View.rosterPressure.livingOperatorCount).toBe(0);
    expect(phase1View.rosterPressure.vacancyCount).toBe(2);
    expect(phase1View.rosterPressure.replacementPressureLevel).toBe("critical");
    expect(phase1View.rosterPressure.operatorCapacity).toBe(2);
  });

  it("normalizes missing lifecycle to active during snapshot reconstruction", () => {
    const snapshot = createBootstrapWorldSnapshot(templateRegistry);

    // Remove lifecycle to simulate legacy data
    snapshot.operators = snapshot.operators?.map((operator) => {
      const { lifecycle: _, ...rest } = operator;
      return rest as typeof operator;
    });

    const simulation = createAscensionSimulation(snapshot, templateRegistry);
    const worldSnapshot = simulation.getWorldSnapshot();

    worldSnapshot.operators?.forEach((operator) => {
      expect(operator.lifecycle).toEqual({ status: "active" });
    });
  });
});

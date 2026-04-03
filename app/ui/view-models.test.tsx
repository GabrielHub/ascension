import { describe, expect, it } from "vitest";

import { templateRegistry } from "content/templates";
import {
  createAscensionSimulation,
  createBootstrapSimulation,
  createPreviewWorldSnapshot,
  createBootstrapWorldSnapshot,
} from "sim";

import { buildHqViewFromPhase1, buildHqViewModel, buildOpsViewFromPhase1 } from "./view-models";

describe("phase 1 view models", () => {
  it("keeps applied room upgrades visible in the HQ panel model", () => {
    const simulation = createBootstrapSimulation(templateRegistry);
    simulation.dispatch({
      type: "sim/dev-set-resource",
      resourceId: "resource/reputation",
      amount: 300,
    });

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
    expect(hq.rooms.find((room) => room.id === "room-instance/register")).toEqual(
      expect.objectContaining({
        floorIndex: 0,
        slotId: "slot/register",
        roomStateId: expect.stringMatching(/^room-state\//),
        appliedUpgradeIds: ["upgrade/room/register:records_wall"],
        reservedFootprint: expect.objectContaining({ cols: 4, rows: 3 }),
        activeFootprint: expect.objectContaining({ cols: 4, rows: 3 }),
      }),
    );
  });

  it("exposes explicit floor-aware slots instead of dead empty slots", () => {
    const simulation = createBootstrapSimulation(templateRegistry);
    simulation.dispatch({
      type: "sim/dev-set-resource",
      resourceId: "resource/cash",
      amount: 5000,
    });
    simulation.dispatch({
      type: "sim/dev-set-resource",
      resourceId: "resource/reputation",
      amount: 300,
    });
    simulation.dispatch({
      type: "sim/purchase-building-upgrade",
      upgradeId: "upgrade/building/bodega:frontage",
    });
    simulation.dispatch({
      type: "sim/purchase-building-upgrade",
      upgradeId: "upgrade/building/bodega:annex",
    });

    const hq = buildHqViewFromPhase1(simulation.getPhase1View(), templateRegistry);

    expect(hq.expansionSlots).toContainEqual(
      expect.objectContaining({
        kind: "available",
        slotId: "slot/back-room-right",
        floorIndex: 0,
      }),
    );
    expect(hq.expansionSlots).toContainEqual(
      expect.objectContaining({
        kind: "locked",
        slotId: "slot/storage-right",
        floorIndex: 0,
      }),
    );
    expect(hq.expansionSlots.every((slot) => slot.floorIndex === 0)).toBe(true);
    expect(hq.expansionSlots).toHaveLength(3);
    expect(hq.placeableRoomTemplates).toContainEqual(
      expect.objectContaining({
        id: "room/back_office:tier_1",
        name: "The Back Office",
      }),
    );
    expect(hq.placeableRoomTemplates).toContainEqual(
      expect.objectContaining({
        id: "room/backstock:tier_1",
        name: "The Backstock",
      }),
    );
  });

  it("maps forming opportunities to the claimed operations state", () => {
    const snapshot = createPreviewWorldSnapshot(templateRegistry);
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
    simulation.tick(0);
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
          deferredVisitorCapacity: 1,
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
      deferredVisitorCapacity: 1,
      unavailableOperatorIds: ["operator/unavailable"],
      recentDeathOperatorIds: ["operator/dead"],
      replacementPressureLevel: "critical",
    });
  });

  it("maps operator and gym training state into the HQ view model", () => {
    const simulation = createBootstrapSimulation(templateRegistry);
    const phase1View = simulation.getPhase1View();
    const firstOperator = phase1View.operators[0];

    if (!firstOperator) {
      throw new Error("expected bootstrap simulation to include an operator");
    }

    const hq = buildHqViewFromPhase1(
      {
        ...phase1View,
        building: {
          ...phase1View.building,
          trainingRateModifier: 0.2,
        },
        rooms: [
          ...phase1View.rooms,
          {
            id: "room-instance/gym",
            templateId: "room/gym:tier_1",
            name: "The Gym",
            tier: 1,
            floorIndex: 1,
            slotId: "slot/gym",
            roomStateId: "room-state/gym",
            isRequestedActive: true,
            isOperational: true,
            capacity: 3,
            occupancy: 0,
            requiredStaffTag: "",
            assignedStaffCount: 0,
            appliedUpgradeIds: [],
            availableUpgradeIds: [],
            reservedFootprint: { col: 6, row: 8, cols: 4, rows: 3 },
            activeFootprint: { col: 6, row: 8, cols: 4, rows: 3 },
          },
        ],
        operators: [
          {
            ...firstOperator,
            schedule: {
              ...firstOperator.schedule,
              currentBlock: "training",
            },
            training: {
              strength: 52,
              speed: 31,
              endurance: 46,
              resilience: 22,
            },
          },
          ...phase1View.operators.slice(1),
        ],
      },
      templateRegistry,
    );

    expect(hq.operators[0].training).toEqual(
      expect.objectContaining({
        average: 38,
        statusLabel: "Conditioning",
        bonuses: expect.objectContaining({
          strength: 2,
          speed: 1,
        }),
      }),
    );
    expect(hq.rooms.find((room) => room.id === "room-instance/gym")?.training).toEqual(
      expect.objectContaining({
        currentTraineeCount: 1,
        currentTraineeNames: [firstOperator.identity.name],
        rateModifier: 20,
      }),
    );
  });

  it("passes through runtime-owned recruit projections without recomputing them in UI", () => {
    const simulation = createBootstrapSimulation(templateRegistry);
    const phase1View = simulation.getPhase1View();
    const [firstVisitor, ...restVisitors] = phase1View.visitors;

    if (!firstVisitor) {
      throw new Error("expected bootstrap simulation to include a visitor");
    }

    const hq = buildHqViewFromPhase1(
      {
        ...phase1View,
        visitors: [
          {
            ...firstVisitor,
            projectedMorale: 61,
            projectedLoyalty: 77,
          },
          ...restVisitors,
        ],
      },
      templateRegistry,
    );

    expect(hq.visitors[0]).toEqual(
      expect.objectContaining({
        queueState: firstVisitor.queueState,
        projectedMorale: 61,
        projectedLoyalty: 77,
        canAccept: firstVisitor.canAccept,
        canReplace: firstVisitor.canReplace,
      }),
    );
  });

  it("uses runtime-owned secured-contract prep instead of rebuilding the site read in UI", () => {
    const simulation = createAscensionSimulation(
      createPreviewWorldSnapshot(templateRegistry),
      templateRegistry,
    );
    const phase1View = simulation.getPhase1View();

    if (!phase1View.contractSite) {
      throw new Error("expected preview snapshot to include an active contract");
    }

    const operations = buildOpsViewFromPhase1(
      {
        ...phase1View,
        contractSite: {
          ...phase1View.contractSite,
          siteSummary: "Runtime-owned briefing packet.",
          neighborhoodLabel: "Red Hook Waterfront",
          boardIntel: { source: "office", quality: "dossier" },
          briefing: {
            source: "briefing_room",
            status: "briefed",
            opportunityIntelBonus: 8,
            bossIntelBonus: 15,
          },
          knownTraits: ["threat:ambush"],
          enemyHints: ["enemy-family/mannequin-stalkers"],
          lootFamilyHints: ["Industrial Salvage"],
          bossName: "The Referee",
          bossTags: ["boss:area-damage"],
          bossWeaknesses: [{ kind: "stat", target: "perception" }],
        },
      },
      templateRegistry,
    );

    expect(operations.contractSite).toEqual(
      expect.objectContaining({
        siteSummary: "Runtime-owned briefing packet.",
        neighborhoodLabel: "Red Hook Waterfront",
        knownTraits: ["threat:ambush"],
        enemyHints: ["enemy-family/mannequin-stalkers"],
        lootFamilyHints: ["Industrial Salvage"],
        bossName: "The Referee",
        bossTags: ["boss:area-damage"],
        bossWeaknesses: [{ kind: "stat", target: "perception" }],
      }),
    );
  });

  it("passes raid contributing factors through to history and resolved contract summaries", () => {
    const simulation = createBootstrapSimulation(templateRegistry);
    const phase1View = simulation.getPhase1View();

    const operations = buildOpsViewFromPhase1(
      {
        ...phase1View,
        contractLifecycle: "resolved",
        contractResult: {
          contractSiteId: "contract/policy",
          missionId: "mission/clearance",
          siteConceptId: "site-concept/test",
          siteConceptName: "Basement Annex",
          location: "district/lower-east-side",
          rank: "f",
          outcome: "boss_defeated",
          totalRaids: 1,
          totalCashEarned: 120,
          totalReputationEarned: 8,
          operatorDeaths: 0,
        },
        raidSummaries: [
          {
            id: "raid/policy",
            contractSiteId: "contract/policy",
            opportunityId: "opportunity/policy",
            missionId: "mission/clearance",
            location: "district/lower-east-side",
            startedAt: "day-1 09:00",
            endedAt: "day-1 12:00",
            result: "success",
            reputationDelta: 8,
            cashDelta: 120,
            threat: 60,
            intel: 55,
            reward: 120,
            cohesion: 70,
            operatorOutcomes: [],
            narrativeTags: [],
            intelMismatchTags: [],
            contributingFactors: [
              "policy:contract_posture:aggressive",
              "policy:staffing_priority:welfare_priority",
            ],
          },
        ],
      },
      templateRegistry,
    );

    expect(operations.raidHistory[0]).toEqual(
      expect.objectContaining({
        contractSiteId: "contract/policy",
        contributingFactors: [
          "policy:contract_posture:aggressive",
          "policy:staffing_priority:welfare_priority",
        ],
      }),
    );
    expect(operations.contractResult).toEqual(
      expect.objectContaining({
        contributingFactors: [
          "policy:contract_posture:aggressive",
          "policy:staffing_priority:welfare_priority",
        ],
      }),
    );
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
      deferredVisitorCapacity: 1,
      unavailableOperatorIds: [],
      recentDeathOperatorIds: [],
      replacementPressureLevel: "stable",
    });
  });
});

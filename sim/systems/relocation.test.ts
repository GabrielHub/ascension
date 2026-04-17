import { describe, expect, it } from "vitest";
import { addEntity, addComponent } from "bitecs";

import { templateRegistry } from "content/templates";
import {
  BuildingAuthority,
  EquipmentAssignment,
  GuildState,
  InventoryStack,
  NotableTie,
  OperatorDisposition,
  RaidParticipationState,
  RecurringTeam,
  RoomInstance,
  AssignmentState,
  StaffState,
  VisitorState,
} from "../components";
import type { SimSystemContext } from "./types";
import {
  evaluateRelocationGate,
  getRelocationBlockers,
  initiateRelocation,
  advanceRelocationBeat,
  RELOCATION_THRESHOLDS,
  SKYSCRAPER_RELOCATION_THRESHOLDS,
} from "./relocation";
import type { RelocationPayload } from "./interruptions";
import { resolveActiveInterruption } from "./interruptions";
import {
  BODEGA_SPECIFIC_BEAT_IDS,
  OPENING_BEAT_IDS,
  PORTERS_CAMPAIGN_BEAT_IDS,
} from "./guidance-beats";
import { addActiveTestOperators, createSimTestContext } from "./test-context";

// ── Test helpers ──────────────────────────────────────────────────────────

function createTestContext(overrides?: {
  buildingTier?: number;
  reputation?: number;
  treasury?: number;
  contractLifecycle?: string;
  activeRoster?: number;
  raidSummaries?: Array<{ id: string; contractSiteId?: string; bossDefeated?: boolean }>;
}): SimSystemContext {
  const bodegaIndex = templateRegistry.buildingIndexById.get("building/bodega") ?? 0;
  const rosterSize = overrides?.activeRoster ?? 0;
  const context = createSimTestContext({
    registry: templateRegistry,
    guild: {
      guildName: "Relocation Test Guild",
      playerName: "Boss",
      reputation: overrides?.reputation ?? 0,
      treasury: overrides?.treasury ?? 0,
      intel: 0,
    },
    time: {
      tick: 1440,
      day: 1,
      minuteOfDay: 0,
    },
    building: {
      activeBuildingTemplateIndex: bodegaIndex,
      activeBuildingTier: overrides?.buildingTier ?? 1,
      activeFloorIndex: 0,
      roomSlotCount: 7,
      operatorSlotCount: 10,
      contractLifecycle:
        (overrides?.contractLifecycle as "idle" | "bidding" | "active" | "resolved") ?? "bidding",
      raidSummaries: (overrides?.raidSummaries ?? []).map((summary) => ({
        id: summary.id,
        missionId: "mission/clearance",
        startedAt: "2026-01-01",
        endedAt: "2026-01-01",
        result: "success" as const,
        reputationDelta: 2,
        cashDelta: 50,
        contractSiteId: summary.contractSiteId,
        bossDefeated: summary.bossDefeated,
      })),
      policies: {},
    },
  });

  addActiveTestOperators(context, rosterSize);
  return context;
}

function generateRaidSummaries(count: number, bossCount: number) {
  const summaries: Array<{ id: string; contractSiteId: string; bossDefeated: boolean }> = [];
  for (let i = 0; i < count; i++) {
    summaries.push({
      id: `raid-${i}`,
      contractSiteId: `site-${i}`,
      bossDefeated: i < bossCount,
    });
  }
  return summaries;
}

function createReadyRelocationContext() {
  const context = createTestContext({
    buildingTier: 4,
    reputation: 50,
    treasury: 800,
    activeRoster: 8,
    raidSummaries: generateRaidSummaries(20, 3),
  });

  const staffEntity = addEntity(context.world);
  addComponent(context.world, staffEntity, StaffState);
  addComponent(context.world, staffEntity, AssignmentState);
  StaffState.id[staffEntity] = "staff-1";
  StaffState.name[staffEntity] = "Test Staff";
  StaffState.roleTag[staffEntity] = "staff:logistics";
  AssignmentState.kind[staffEntity] = "room";
  AssignmentState.targetId[staffEntity] = "room-instance/test";
  context.runtimeState.staffEntities.push(staffEntity);

  return context;
}

function runFullAcceptance(context: SimSystemContext) {
  initiateRelocation(context);

  const offerResolved = resolveActiveInterruption(context.runtimeState.interruptionQueue);
  advanceRelocationBeat(context, offerResolved!.payload as RelocationPayload, "continue");

  const decisionResolved = resolveActiveInterruption(context.runtimeState.interruptionQueue);
  advanceRelocationBeat(context, decisionResolved!.payload as RelocationPayload, "accept");

  const movingResolved = resolveActiveInterruption(context.runtimeState.interruptionQueue);
  advanceRelocationBeat(context, movingResolved!.payload as RelocationPayload, "acknowledge");
}

// ── Gate visibility tests ────────────────────────────────────────────────

describe("relocation gate visibility", () => {
  it("gate is hidden when no prerequisites are met", () => {
    const context = createTestContext();
    const gate = evaluateRelocationGate(context);
    expect(gate.visible).toBe(false);
    expect(gate.allPrerequisitesMet).toBe(false);
  });

  it("gate is visible when at least one prerequisite is met", () => {
    const context = createTestContext({ reputation: 40 });
    const gate = evaluateRelocationGate(context);
    expect(gate.visible).toBe(true);
    expect(gate.allPrerequisitesMet).toBe(false);
  });

  it("gate is not visible when no skyscraper prerequisite is met at Porter's", () => {
    const context = createTestContext({ reputation: 40 });
    const portersIndex = templateRegistry.buildingIndexById.get("building/porters");
    if (portersIndex !== undefined) {
      BuildingAuthority.activeBuildingTemplateIndex[context.singletonEntities.building] =
        portersIndex;
    }
    const gate = evaluateRelocationGate(context);
    expect(gate.visible).toBe(false);
  });
});

// ── Gate threshold tests ─────────────────────────────────────────────────

describe("relocation gate thresholds", () => {
  it("all prerequisites are met when thresholds are reached", () => {
    const context = createTestContext({
      buildingTier: 4,
      reputation: 40,
      treasury: 600,
      activeRoster: 8,
      raidSummaries: generateRaidSummaries(20, 3),
    });
    const gate = evaluateRelocationGate(context);
    expect(gate.visible).toBe(true);
    expect(gate.allPrerequisitesMet).toBe(true);
    expect(gate.prerequisites.every((p) => p.met)).toBe(true);
  });

  it("prerequisite is not met when below threshold", () => {
    const context = createTestContext({
      buildingTier: 3,
      reputation: 39,
      treasury: 599,
      activeRoster: 7,
      raidSummaries: generateRaidSummaries(19, 2),
    });
    const gate = evaluateRelocationGate(context);
    expect(gate.allPrerequisitesMet).toBe(false);
    expect(gate.prerequisites.find((p) => p.key === "buildingTier")?.met).toBe(false);
    expect(gate.prerequisites.find((p) => p.key === "reputation")?.met).toBe(false);
    expect(gate.prerequisites.find((p) => p.key === "treasury")?.met).toBe(false);
    expect(gate.prerequisites.find((p) => p.key === "activeRoster")?.met).toBe(false);
    expect(gate.prerequisites.find((p) => p.key === "contractsCompleted")?.met).toBe(false);
    expect(gate.prerequisites.find((p) => p.key === "bossEncountersCompleted")?.met).toBe(false);
  });

  it("reports current values and targets", () => {
    const context = createTestContext({
      buildingTier: 2,
      reputation: 25,
      treasury: 300,
    });
    const gate = evaluateRelocationGate(context);
    const tierPre = gate.prerequisites.find((p) => p.key === "buildingTier");
    expect(tierPre?.current).toBe(2);
    expect(tierPre?.target).toBe(RELOCATION_THRESHOLDS.buildingTier);
  });
});

// ── Acceptance blocker tests ─────────────────────────────────────────────

describe("relocation acceptance blockers", () => {
  it("blocks when there is an active contract", () => {
    const context = createTestContext({ contractLifecycle: "active" });
    const blockers = getRelocationBlockers(context);
    expect(blockers.some((b) => b.key === "active_contract")).toBe(true);
  });

  it("blocks when operators are mid-raid", () => {
    const context = createTestContext({ activeRoster: 3 });
    RaidParticipationState.activeRaidId[context.runtimeState.operatorEntities[0]] = "raid-1";
    const blockers = getRelocationBlockers(context);
    expect(blockers.some((b) => b.key === "mid_raid")).toBe(true);
  });

  it("blocks when there is a pending incident", () => {
    const context = createTestContext();
    context.runtimeState.incidentState.pendingIncident = { templateId: "test" } as never;
    const blockers = getRelocationBlockers(context);
    expect(blockers.some((b) => b.key === "blocking_incident")).toBe(true);
  });

  it("blocks when there is a blocking interruption", () => {
    const context = createTestContext();
    context.runtimeState.interruptionQueue.active = {
      instanceId: "int-1",
      type: "announcement",
      payload: { kind: "announcement", title: "Test", message: "test" },
      sourceSystem: "test",
      timestamp: 0,
      blockingMode: "blocking",
      persistence: "transient",
      dismissible: false,
    } as never;
    const blockers = getRelocationBlockers(context);
    expect(blockers.some((b) => b.key === "blocking_interruption")).toBe(true);
  });

  it("no blockers when state is clean", () => {
    const context = createTestContext({ contractLifecycle: "bidding" });
    const blockers = getRelocationBlockers(context);
    expect(blockers.length).toBe(0);
  });
});

// ── Defer tests ──────────────────────────────────────────────────────────

describe("relocation defer", () => {
  it("defer has no side effects", () => {
    const context = createTestContext({
      buildingTier: 4,
      reputation: 50,
      treasury: 800,
      activeRoster: 8,
      raidSummaries: generateRaidSummaries(20, 3),
    });

    const treasuryBefore = GuildState.treasury[context.singletonEntities.guild];
    const buildingBefore =
      BuildingAuthority.activeBuildingTemplateIndex[context.singletonEntities.building];

    // Initiate relocation
    initiateRelocation(context);
    expect(context.runtimeState.interruptionQueue.active).not.toBeNull();

    // Resolve offer beat
    const offerResolved = resolveActiveInterruption(context.runtimeState.interruptionQueue);
    expect(offerResolved?.payload.kind).toBe("relocation");
    advanceRelocationBeat(context, offerResolved!.payload as RelocationPayload, "continue");

    // Resolve decision beat with defer
    const decisionResolved = resolveActiveInterruption(context.runtimeState.interruptionQueue);
    expect(decisionResolved?.payload.kind).toBe("relocation");
    expect((decisionResolved!.payload as RelocationPayload).beat).toBe("decision");
    advanceRelocationBeat(context, decisionResolved!.payload as RelocationPayload, "defer");

    // Verify no side effects
    expect(GuildState.treasury[context.singletonEntities.guild]).toBe(treasuryBefore);
    expect(BuildingAuthority.activeBuildingTemplateIndex[context.singletonEntities.building]).toBe(
      buildingBefore,
    );
    expect(context.runtimeState.interruptionQueue.active).toBeNull();
  });
});

// ── Accept and handoff tests ─────────────────────────────────────────────

describe("relocation accept and handoff", () => {
  it("swaps bodega to Porter's", () => {
    const context = createReadyRelocationContext();
    runFullAcceptance(context);

    const portersIndex = templateRegistry.buildingIndexById.get("building/porters");
    expect(BuildingAuthority.activeBuildingTemplateIndex[context.singletonEntities.building]).toBe(
      portersIndex,
    );
  });

  it("resets building tier to 1", () => {
    const context = createReadyRelocationContext();
    runFullAcceptance(context);
    expect(BuildingAuthority.activeBuildingTier[context.singletonEntities.building]).toBe(1);
  });

  it("sets Porter's starter room and operator slots", () => {
    const context = createReadyRelocationContext();
    runFullAcceptance(context);
    expect(BuildingAuthority.roomSlotCount[context.singletonEntities.building]).toBe(7);
    expect(BuildingAuthority.operatorSlotCount[context.singletonEntities.building]).toBe(12);
  });

  it("places 7 starter rooms", () => {
    const context = createReadyRelocationContext();
    runFullAcceptance(context);
    expect(context.runtimeState.roomEntities.length).toBe(7);
  });

  it("debits treasury by relocation cost", () => {
    const context = createReadyRelocationContext();
    const treasuryBefore = GuildState.treasury[context.singletonEntities.guild];
    runFullAcceptance(context);
    expect(GuildState.treasury[context.singletonEntities.guild]).toBe(treasuryBefore - 600);
  });

  it("preserves operators", () => {
    const context = createReadyRelocationContext();
    const operatorCountBefore = context.runtimeState.operatorEntities.length;
    runFullAcceptance(context);
    expect(context.runtimeState.operatorEntities.length).toBe(operatorCountBefore);
  });

  it("preserves reputation", () => {
    const context = createReadyRelocationContext();
    const repBefore = GuildState.reputation[context.singletonEntities.guild];
    runFullAcceptance(context);
    expect(GuildState.reputation[context.singletonEntities.guild]).toBe(repBefore);
  });

  it("clears staff assignments", () => {
    const context = createReadyRelocationContext();
    runFullAcceptance(context);
    for (const staffEntity of context.runtimeState.staffEntities) {
      expect(AssignmentState.kind[staffEntity]).toBe("idle");
      expect(AssignmentState.targetId[staffEntity]).toBe("");
    }
  });

  it("clears active operator assignments during the handoff", () => {
    const context = createReadyRelocationContext();
    const operatorEntity = context.runtimeState.operatorEntities[0];
    AssignmentState.kind[operatorEntity] = "room";
    AssignmentState.targetId[operatorEntity] = "room-instance/register";
    RaidParticipationState.returnTick[operatorEntity] = 9999;

    runFullAcceptance(context);

    expect(AssignmentState.kind[operatorEntity]).toBe("idle");
    expect(AssignmentState.targetId[operatorEntity]).toBe("");
    expect(RaidParticipationState.activeRaidId[operatorEntity]).toBe("");
    expect(RaidParticipationState.returnTick[operatorEntity]).toBe(0);
  });

  it("clears applied upgrade ids", () => {
    const context = createReadyRelocationContext();
    runFullAcceptance(context);
    expect(BuildingAuthority.appliedUpgradeIds[context.singletonEntities.building]).toEqual([]);
  });

  it("sets active floor to 0", () => {
    const context = createReadyRelocationContext();
    runFullAcceptance(context);
    expect(BuildingAuthority.activeFloorIndex[context.singletonEntities.building]).toBe(0);
  });

  it("places rooms with the expected Porter's starter template IDs", () => {
    const context = createReadyRelocationContext();
    runFullAcceptance(context);

    const templateIds = context.runtimeState.roomEntities
      .map((e) => templateRegistry.rooms[RoomInstance.templateIndex[e]]?.id)
      .sort();

    expect(templateIds).toEqual([
      "room/bar:tier_1",
      "room/floor:tier_1",
      "room/gym:tier_1",
      "room/infirmary:tier_1",
      "room/office:tier_1",
      "room/prep_room:tier_1",
      "room/stockroom:tier_1",
    ]);
  });

  it("places ground-floor rooms on floor 0 and upper-floor rooms on floor 1", () => {
    const context = createReadyRelocationContext();
    runFullAcceptance(context);

    const roomsByFloor = new Map<number, string[]>();
    for (const entity of context.runtimeState.roomEntities) {
      const floorIndex = RoomInstance.floorIndex[entity] ?? 0;
      const templateId = templateRegistry.rooms[RoomInstance.templateIndex[entity]]?.id;
      if (!roomsByFloor.has(floorIndex)) roomsByFloor.set(floorIndex, []);
      roomsByFloor.get(floorIndex)!.push(templateId);
    }

    expect(roomsByFloor.get(0)?.sort()).toEqual(["room/bar:tier_1", "room/floor:tier_1"]);
    expect(roomsByFloor.get(1)?.sort()).toEqual([
      "room/gym:tier_1",
      "room/infirmary:tier_1",
      "room/office:tier_1",
      "room/prep_room:tier_1",
      "room/stockroom:tier_1",
    ]);
  });

  it("clears visitors on relocation", () => {
    const context = createReadyRelocationContext();

    // Add a visitor entity
    const visitorEntity = addEntity(context.world);
    addComponent(context.world, visitorEntity, VisitorState);
    VisitorState.id[visitorEntity] = "visitor-1";
    context.runtimeState.visitorEntities.push(visitorEntity);
    expect(context.runtimeState.visitorEntities.length).toBe(1);

    runFullAcceptance(context);
    expect(context.runtimeState.visitorEntities.length).toBe(0);
  });

  it("creates room culture entities for new rooms", () => {
    const context = createReadyRelocationContext();
    runFullAcceptance(context);
    expect(context.runtimeState.roomCultureEntities.length).toBe(7);
  });
});

// ── Initiation guard tests ───────────────────────────────────────────────

describe("relocation initiation guards", () => {
  it("refuses to initiate when prerequisites not met", () => {
    const context = createTestContext({ buildingTier: 1 });
    const result = initiateRelocation(context);
    expect(result).toBe(false);
    expect(context.runtimeState.interruptionQueue.active).toBeNull();
  });

  it("refuses to initiate when blockers exist", () => {
    const context = createTestContext({
      buildingTier: 4,
      reputation: 50,
      treasury: 800,
      activeRoster: 8,
      contractLifecycle: "active",
      raidSummaries: generateRaidSummaries(20, 3),
    });
    const result = initiateRelocation(context);
    expect(result).toBe(false);
  });

  it("successfully initiates when all conditions met", () => {
    const context = createTestContext({
      buildingTier: 4,
      reputation: 50,
      treasury: 800,
      activeRoster: 8,
      raidSummaries: generateRaidSummaries(20, 3),
    });
    const result = initiateRelocation(context);
    expect(result).toBe(true);
    expect(context.runtimeState.interruptionQueue.active).not.toBeNull();
    expect(context.runtimeState.interruptionQueue.active?.payload.kind).toBe("relocation");
    const activePayload = context.runtimeState.interruptionQueue.active!
      .payload as RelocationPayload;
    expect(activePayload.beat).toBe("offer");
    expect(activePayload.presenterId).toBe("presenter/assistant");
    expect(activePayload.presenterExpression).toBe("serious");
    expect(context.runtimeState.pendingCueIds).toContain("hq.relocation.offer");
  });
});

// ── Save/load during interruption sequence ───────────────────────────────

describe("relocation save/load stability", () => {
  it("relocation interruption survives snapshot/restore", () => {
    const context = createTestContext({
      buildingTier: 4,
      reputation: 50,
      treasury: 800,
      activeRoster: 8,
      raidSummaries: generateRaidSummaries(20, 3),
    });
    initiateRelocation(context);

    // Simulate save: the interruption queue holds a persistent relocation interruption
    const queueState = context.runtimeState.interruptionQueue;
    expect(queueState.active).not.toBeNull();
    expect(queueState.active!.persistence).toBe("persistent");
    expect(queueState.active!.payload.kind).toBe("relocation");

    // Simulate round-trip through JSON
    const serialized = JSON.parse(JSON.stringify(queueState));
    expect(serialized.active.payload.kind).toBe("relocation");
    expect(serialized.active.payload.beat).toBe("offer");
    expect(serialized.active.payload.treasuryCost).toBe(600);
    expect(serialized.active.payload.buildingToId).toBe("building/porters");
  });

  it("decision beat payload round-trips through JSON", () => {
    const context = createTestContext({
      buildingTier: 4,
      reputation: 50,
      treasury: 800,
      activeRoster: 8,
      raidSummaries: generateRaidSummaries(20, 3),
    });
    initiateRelocation(context);

    // Advance to decision beat
    const offerResolved = resolveActiveInterruption(context.runtimeState.interruptionQueue);
    advanceRelocationBeat(context, offerResolved!.payload as RelocationPayload, "continue");

    const queueState = context.runtimeState.interruptionQueue;
    const serialized = JSON.parse(JSON.stringify(queueState));
    expect(serialized.active.payload.beat).toBe("decision");
    expect(serialized.active.payload.presenterExpression).toBe("concerned");
  });

  it("moving beat payload round-trips through JSON and completes handoff", () => {
    const context = createTestContext({
      buildingTier: 4,
      reputation: 50,
      treasury: 800,
      activeRoster: 8,
      raidSummaries: generateRaidSummaries(20, 3),
    });
    initiateRelocation(context);

    // Advance to decision beat
    const offerResolved = resolveActiveInterruption(context.runtimeState.interruptionQueue);
    advanceRelocationBeat(context, offerResolved!.payload as RelocationPayload, "continue");

    // Accept — advances to moving beat
    const decisionResolved = resolveActiveInterruption(context.runtimeState.interruptionQueue);
    advanceRelocationBeat(context, decisionResolved!.payload as RelocationPayload, "accept");

    // At this point treasury has been debited and moving beat is queued but
    // handoff has not executed. Simulate save/load by round-tripping through JSON.
    const queueSnapshot = JSON.parse(JSON.stringify(context.runtimeState.interruptionQueue));
    expect(queueSnapshot.active.payload.beat).toBe("moving");
    expect(queueSnapshot.active.payload.buildingToId).toBe("building/porters");
    expect(queueSnapshot.active.payload.presenterExpression).toBe("neutral");

    // Restore the queue from JSON (simulates load)
    context.runtimeState.interruptionQueue.active = queueSnapshot.active;
    context.runtimeState.interruptionQueue.queue = queueSnapshot.queue;

    // Resolve the moving beat — this should execute the handoff deterministically
    const movingResolved = resolveActiveInterruption(context.runtimeState.interruptionQueue);
    expect(movingResolved).not.toBeNull();
    advanceRelocationBeat(context, movingResolved!.payload as RelocationPayload, "acknowledge");

    // Verify handoff completed
    const portersIndex = templateRegistry.buildingIndexById.get("building/porters");
    expect(BuildingAuthority.activeBuildingTemplateIndex[context.singletonEntities.building]).toBe(
      portersIndex,
    );
    expect(context.runtimeState.roomEntities.length).toBe(7);
    expect(GuildState.treasury[context.singletonEntities.guild]).toBe(200); // 800 - 600
  });
});

// ── Carryover / reset contract tests ────────────────────────────────────

describe("relocation carryover/reset contract", () => {
  // ── Treasury debit timing ───────────────────────────────────────────

  it("debits treasury at the decision beat, not the moving beat", () => {
    const context = createReadyRelocationContext();
    const treasuryBefore = GuildState.treasury[context.singletonEntities.guild];

    initiateRelocation(context);

    // After offer — treasury unchanged
    const offerResolved = resolveActiveInterruption(context.runtimeState.interruptionQueue);
    advanceRelocationBeat(context, offerResolved!.payload as RelocationPayload, "continue");
    expect(GuildState.treasury[context.singletonEntities.guild]).toBe(treasuryBefore);

    // After accept — treasury debited
    const decisionResolved = resolveActiveInterruption(context.runtimeState.interruptionQueue);
    advanceRelocationBeat(context, decisionResolved!.payload as RelocationPayload, "accept");
    expect(GuildState.treasury[context.singletonEntities.guild]).toBe(treasuryBefore - 600);
    expect(context.runtimeState.pendingCueIds).toContain("hq.relocation.confirm");

    // After moving — treasury unchanged from post-accept
    const movingResolved = resolveActiveInterruption(context.runtimeState.interruptionQueue);
    advanceRelocationBeat(context, movingResolved!.payload as RelocationPayload, "acknowledge");
    expect(GuildState.treasury[context.singletonEntities.guild]).toBe(treasuryBefore - 600);
    expect(context.runtimeState.pendingCueIds).toContain("hq.relocation.land");
  });

  it("refuses the accept step if the treasury drops below the deposit", () => {
    const context = createReadyRelocationContext();

    initiateRelocation(context);
    const offerResolved = resolveActiveInterruption(context.runtimeState.interruptionQueue);
    advanceRelocationBeat(context, offerResolved!.payload as RelocationPayload, "continue");

    GuildState.treasury[context.singletonEntities.guild] = 500;

    const decisionResolved = resolveActiveInterruption(context.runtimeState.interruptionQueue);
    advanceRelocationBeat(context, decisionResolved!.payload as RelocationPayload, "accept");

    expect(GuildState.treasury[context.singletonEntities.guild]).toBe(500);
    expect(context.runtimeState.interruptionQueue.active).toBeNull();
    expect(BuildingAuthority.activeBuildingTemplateIndex[context.singletonEntities.building]).toBe(
      templateRegistry.buildingIndexById.get("building/bodega"),
    );
    expect(context.runtimeState.pendingEvents.at(-1)?.message).toContain(
      "relocation deposit is no longer covered",
    );
  });

  // ── Carryover: inventory ────────────────────────────────────────────

  it("preserves inventory through relocation", () => {
    const context = createReadyRelocationContext();

    const itemEntity = addEntity(context.world);
    addComponent(context.world, itemEntity, InventoryStack);
    InventoryStack.itemId[itemEntity] = "item/medkit";
    InventoryStack.quantity[itemEntity] = 5;
    context.runtimeState.inventoryEntities.push(itemEntity);

    const itemEntity2 = addEntity(context.world);
    addComponent(context.world, itemEntity2, InventoryStack);
    InventoryStack.itemId[itemEntity2] = "item/ration";
    InventoryStack.quantity[itemEntity2] = 3;
    context.runtimeState.inventoryEntities.push(itemEntity2);

    runFullAcceptance(context);

    expect(context.runtimeState.inventoryEntities.length).toBe(2);
    expect(InventoryStack.itemId[context.runtimeState.inventoryEntities[0]]).toBe("item/medkit");
    expect(InventoryStack.quantity[context.runtimeState.inventoryEntities[0]]).toBe(5);
    expect(InventoryStack.itemId[context.runtimeState.inventoryEntities[1]]).toBe("item/ration");
    expect(InventoryStack.quantity[context.runtimeState.inventoryEntities[1]]).toBe(3);
  });

  // ── Carryover: equipment ────────────────────────────────────────────

  it("preserves equipment assignments through relocation", () => {
    const context = createReadyRelocationContext();

    const equipEntity = addEntity(context.world);
    addComponent(context.world, equipEntity, EquipmentAssignment);
    EquipmentAssignment.operatorId[equipEntity] = "operator-0";
    EquipmentAssignment.weaponId[equipEntity] = "item/baton";
    context.runtimeState.equipmentEntities.push(equipEntity);

    runFullAcceptance(context);

    expect(context.runtimeState.equipmentEntities.length).toBe(1);
    expect(EquipmentAssignment.operatorId[context.runtimeState.equipmentEntities[0]]).toBe(
      "operator-0",
    );
    expect(EquipmentAssignment.weaponId[context.runtimeState.equipmentEntities[0]]).toBe(
      "item/baton",
    );
  });

  // ── Carryover: policies ─────────────────────────────────────────────

  it("preserves policies through relocation", () => {
    const context = createReadyRelocationContext();
    const buildingEntity = context.singletonEntities.building;

    BuildingAuthority.policies[buildingEntity] = {
      contractPosture: "aggressive",
      objectiveBias: "loot",
      recoveryTriage: "strict",
      staffingPriority: "coverage",
      rosterFlow: "open",
    } as never;

    runFullAcceptance(context);

    const policies = BuildingAuthority.policies[buildingEntity] as Record<string, string>;
    expect(policies.contractPosture).toBe("aggressive");
    expect(policies.objectiveBias).toBe("loot");
    expect(policies.recoveryTriage).toBe("strict");
    expect(policies.staffingPriority).toBe("coverage");
    expect(policies.rosterFlow).toBe("open");
  });

  // ── Carryover: raid summaries / contract history ────────────────────

  it("preserves raid summaries through relocation", () => {
    const context = createReadyRelocationContext();
    const buildingEntity = context.singletonEntities.building;

    const summaries = BuildingAuthority.raidSummaries[buildingEntity] ?? [];
    const summaryCount = summaries.length;
    expect(summaryCount).toBeGreaterThan(0);

    runFullAcceptance(context);

    const afterSummaries = BuildingAuthority.raidSummaries[buildingEntity] ?? [];
    expect(afterSummaries.length).toBe(summaryCount);
  });

  // ── Carryover: recurring teams ──────────────────────────────────────

  it("preserves recurring teams through relocation", () => {
    const context = createReadyRelocationContext();

    const teamEntity = addEntity(context.world);
    addComponent(context.world, teamEntity, RecurringTeam);
    RecurringTeam.id[teamEntity] = "team-1";
    RecurringTeam.memberIds[teamEntity] = ["operator-0", "operator-1"];
    RecurringTeam.cohesion[teamEntity] = 30;
    RecurringTeam.raidCount[teamEntity] = 5;
    context.runtimeState.recurringTeamEntities.push(teamEntity);

    runFullAcceptance(context);

    expect(context.runtimeState.recurringTeamEntities.length).toBe(1);
    expect(RecurringTeam.id[context.runtimeState.recurringTeamEntities[0]]).toBe("team-1");
    expect(RecurringTeam.cohesion[context.runtimeState.recurringTeamEntities[0]]).toBe(30);
  });

  // ── Carryover: social state ─────────────────────────────────────────

  it("preserves operator dispositions through relocation", () => {
    const context = createReadyRelocationContext();

    const dispEntity = addEntity(context.world);
    addComponent(context.world, dispEntity, OperatorDisposition);
    OperatorDisposition.operatorId[dispEntity] = "operator-0";
    OperatorDisposition.sociability[dispEntity] = 65;
    OperatorDisposition.grievanceLevel[dispEntity] = 10;
    context.runtimeState.dispositionEntities.push(dispEntity);

    runFullAcceptance(context);

    expect(context.runtimeState.dispositionEntities.length).toBe(1);
    expect(OperatorDisposition.operatorId[context.runtimeState.dispositionEntities[0]]).toBe(
      "operator-0",
    );
    expect(OperatorDisposition.sociability[context.runtimeState.dispositionEntities[0]]).toBe(65);
  });

  it("preserves notable ties through relocation", () => {
    const context = createReadyRelocationContext();

    const tieEntity = addEntity(context.world);
    addComponent(context.world, tieEntity, NotableTie);
    NotableTie.operatorAId[tieEntity] = "operator-0";
    NotableTie.operatorBId[tieEntity] = "operator-1";
    NotableTie.stance[tieEntity] = "trust";
    NotableTie.strength[tieEntity] = 40;
    context.runtimeState.notableTieEntities.push(tieEntity);

    runFullAcceptance(context);

    expect(context.runtimeState.notableTieEntities.length).toBe(1);
    expect(NotableTie.stance[context.runtimeState.notableTieEntities[0]]).toBe("trust");
    expect(NotableTie.strength[context.runtimeState.notableTieEntities[0]]).toBe(40);
  });

  // ── Carryover: staff entities survive (only assignments clear) ──────

  it("preserves staff entities through relocation", () => {
    const context = createReadyRelocationContext();
    expect(context.runtimeState.staffEntities.length).toBe(1);

    runFullAcceptance(context);

    expect(context.runtimeState.staffEntities.length).toBe(1);
    expect(StaffState.id[context.runtimeState.staffEntities[0]]).toBe("staff-1");
  });

  // ── Reset: building modifiers ───────────────────────────────────────

  it("resets building modifiers to zero on relocation", () => {
    const context = createReadyRelocationContext();
    const buildingEntity = context.singletonEntities.building;

    // Set non-zero modifiers on the bodega
    BuildingAuthority.recoveryRateModifier[buildingEntity] = 0.15;
    BuildingAuthority.trainingRateModifier[buildingEntity] = 0.1;
    BuildingAuthority.moraleModifier[buildingEntity] = 5;
    BuildingAuthority.loyaltyModifier[buildingEntity] = 3;

    runFullAcceptance(context);

    expect(BuildingAuthority.recoveryRateModifier[buildingEntity]).toBe(0);
    expect(BuildingAuthority.trainingRateModifier[buildingEntity]).toBe(0);
    expect(BuildingAuthority.moraleModifier[buildingEntity]).toBe(0);
    expect(BuildingAuthority.loyaltyModifier[buildingEntity]).toBe(0);
  });

  // ── Reset: contract state ──────────────────────────────────────────

  it("resets contract state on relocation", () => {
    const context = createReadyRelocationContext();
    const buildingEntity = context.singletonEntities.building;

    // Simulate residual contract-board state (bidding, with posted contracts)
    BuildingAuthority.postedContracts[buildingEntity] = [{ id: "posted-1" }] as never;

    runFullAcceptance(context);

    expect(BuildingAuthority.contractLifecycle[buildingEntity]).toBe("idle");
    expect(BuildingAuthority.postedContracts[buildingEntity]).toEqual([]);
    expect(BuildingAuthority.contractSite[buildingEntity]).toBeNull();
    expect(BuildingAuthority.contractResult[buildingEntity]).toBeNull();
    expect(BuildingAuthority.fogOfWar[buildingEntity]).toBeNull();
    expect(BuildingAuthority.activeRaidPackets[buildingEntity]).toEqual([]);
  });

  // ── Reset: pressure ────────────────────────────────────────────────

  it("resets pressure to zero on relocation", () => {
    const context = createReadyRelocationContext();
    const buildingEntity = context.singletonEntities.building;

    BuildingAuthority.pressure[buildingEntity] = 25;

    runFullAcceptance(context);

    expect(BuildingAuthority.pressure[buildingEntity]).toBe(0);
  });

  // ── Guidance state: carryover and retirement ──────────────────────

  it("preserves completed opening guidance beats through relocation", () => {
    const context = createReadyRelocationContext();

    // Simulate completed opening path with several beats done
    const nonBodegaBeats = OPENING_BEAT_IDS.filter(
      (id) => !BODEGA_SPECIFIC_BEAT_IDS.includes(id),
    ).slice(0, 5);
    context.runtimeState.guidanceState.completedBeatIds = [...nonBodegaBeats];
    context.runtimeState.guidanceState.seenBeatIds = [...nonBodegaBeats];
    context.runtimeState.guidanceState.openingPathState = "completed";

    runFullAcceptance(context);

    // All non-bodega completed beats survive
    for (const beatId of nonBodegaBeats) {
      expect(context.runtimeState.guidanceState.completedBeatIds).toContain(beatId);
      expect(context.runtimeState.guidanceState.seenBeatIds).toContain(beatId);
    }
    expect(context.runtimeState.guidanceState.openingPathState).toBe("completed");
  });

  it("retires bodega-specific guidance beats on relocation", () => {
    const context = createReadyRelocationContext();

    // Bodega-specific beats are not yet completed
    context.runtimeState.guidanceState.completedBeatIds = [];
    context.runtimeState.guidanceState.seenBeatIds = [];
    context.runtimeState.guidanceState.openingPathState = "completed";

    runFullAcceptance(context);

    // Every bodega-specific beat is now in completedBeatIds (retired)
    for (const beatId of BODEGA_SPECIFIC_BEAT_IDS) {
      expect(context.runtimeState.guidanceState.completedBeatIds).toContain(beatId);
    }
  });

  it("clears an active bodega-specific guidance beat on relocation", () => {
    const context = createReadyRelocationContext();

    const bodegaBeat = BODEGA_SPECIFIC_BEAT_IDS[0];
    expect(bodegaBeat).toBeDefined();

    context.runtimeState.guidanceState.activeBeatId = bodegaBeat;
    context.runtimeState.guidanceState.activeBeatView = {
      beatId: bodegaBeat,
      track: "opening",
      deliveryMode: "focused",
      target: null,
      fallbackIntent: null,
      copy: { title: "test", body: "test", ctaLabel: "test" },
      milestoneOrder: 1,
      totalMilestones: 13,
      completionKind: "acknowledged",
      pauseWorld: false,
      allowSkip: false,
    };
    context.runtimeState.guidanceState.activeBeatProgressBaseline = 0;

    runFullAcceptance(context);

    expect(context.runtimeState.guidanceState.activeBeatId).toBeNull();
    expect(context.runtimeState.guidanceState.activeBeatView).toBeNull();
    expect(context.runtimeState.guidanceState.activeBeatProgressBaseline).toBeNull();
    expect(context.runtimeState.guidanceState.completedBeatIds).toContain(bodegaBeat);
  });

  it("removes queued bodega-specific guidance beats on relocation", () => {
    const context = createReadyRelocationContext();

    const bodegaBeat = BODEGA_SPECIFIC_BEAT_IDS[0];
    expect(bodegaBeat).toBeDefined();

    context.runtimeState.guidanceState.queuedBeatIds = [bodegaBeat, "guidance/opening/other"];

    runFullAcceptance(context);

    expect(context.runtimeState.guidanceState.queuedBeatIds).not.toContain(bodegaBeat);
    // Non-bodega queued beats are untouched
    expect(context.runtimeState.guidanceState.queuedBeatIds).toContain("guidance/opening/other");
  });
});

// ── Porter's → Skyscraper relocation ─────────────────────────────────────

function createSkyscraperTestContext(overrides?: {
  buildingTier?: number;
  reputation?: number;
  treasury?: number;
  contractLifecycle?: string;
  activeRoster?: number;
  raidSummaries?: Array<{ id: string; contractSiteId?: string; bossDefeated?: boolean }>;
}): SimSystemContext {
  const portersIndex = templateRegistry.buildingIndexById.get("building/porters") ?? 0;
  const rosterSize = overrides?.activeRoster ?? 0;
  const context = createSimTestContext({
    registry: templateRegistry,
    guild: {
      guildName: "Skyscraper Test Guild",
      playerName: "Boss",
      reputation: overrides?.reputation ?? 0,
      treasury: overrides?.treasury ?? 0,
      intel: 0,
    },
    time: {
      tick: 1440,
      day: 1,
      minuteOfDay: 0,
    },
    building: {
      activeBuildingTemplateIndex: portersIndex,
      activeBuildingTier: overrides?.buildingTier ?? 1,
      activeFloorIndex: 0,
      roomSlotCount: 7,
      operatorSlotCount: 12,
      contractLifecycle:
        (overrides?.contractLifecycle as "idle" | "bidding" | "active" | "resolved") ?? "bidding",
      raidSummaries: (overrides?.raidSummaries ?? []).map((summary) => ({
        id: summary.id,
        missionId: "mission/clearance",
        startedAt: "2026-02-01",
        endedAt: "2026-02-01",
        result: "success" as const,
        reputationDelta: 2,
        cashDelta: 50,
        contractSiteId: summary.contractSiteId,
        bossDefeated: summary.bossDefeated,
      })),
      policies: {},
    },
  });

  addActiveTestOperators(context, rosterSize);
  return context;
}

function generateSkyscraperRaidSummaries(count: number, bossCount: number) {
  const summaries: Array<{ id: string; contractSiteId: string; bossDefeated: boolean }> = [];
  for (let i = 0; i < count; i++) {
    summaries.push({
      id: `raid-porters-${i}`,
      contractSiteId: `site-porters-${i}`,
      bossDefeated: i < bossCount,
    });
  }
  return summaries;
}

function createReadySkyscraperRelocationContext() {
  const context = createSkyscraperTestContext({
    buildingTier: SKYSCRAPER_RELOCATION_THRESHOLDS.buildingTier,
    reputation: SKYSCRAPER_RELOCATION_THRESHOLDS.reputation + 10,
    treasury: SKYSCRAPER_RELOCATION_THRESHOLDS.treasury + 500,
    activeRoster: SKYSCRAPER_RELOCATION_THRESHOLDS.activeRoster,
    raidSummaries: generateSkyscraperRaidSummaries(
      SKYSCRAPER_RELOCATION_THRESHOLDS.contractsCompleted,
      SKYSCRAPER_RELOCATION_THRESHOLDS.bossEncountersCompleted,
    ),
  });

  const staffEntity = addEntity(context.world);
  addComponent(context.world, staffEntity, StaffState);
  addComponent(context.world, staffEntity, AssignmentState);
  StaffState.id[staffEntity] = "staff/porters-1";
  StaffState.name[staffEntity] = "Porter's Staff";
  StaffState.roleTag[staffEntity] = "staff:logistics";
  AssignmentState.kind[staffEntity] = "room";
  AssignmentState.targetId[staffEntity] = "room-instance/stockroom";
  context.runtimeState.staffEntities.push(staffEntity);

  return context;
}

function runFullSkyscraperAcceptance(context: SimSystemContext) {
  initiateRelocation(context);

  const offerResolved = resolveActiveInterruption(context.runtimeState.interruptionQueue);
  advanceRelocationBeat(context, offerResolved!.payload as RelocationPayload, "continue");

  const decisionResolved = resolveActiveInterruption(context.runtimeState.interruptionQueue);
  advanceRelocationBeat(context, decisionResolved!.payload as RelocationPayload, "accept");

  const movingResolved = resolveActiveInterruption(context.runtimeState.interruptionQueue);
  advanceRelocationBeat(context, movingResolved!.payload as RelocationPayload, "acknowledge");
}

describe("skyscraper relocation gate", () => {
  it("is hidden when Porter's has not proven it can scale", () => {
    const context = createSkyscraperTestContext();
    const gate = evaluateRelocationGate(context);
    expect(gate.visible).toBe(false);
    expect(gate.allPrerequisitesMet).toBe(false);
  });

  it("reports Porter's-specific tier label and higher thresholds", () => {
    const context = createSkyscraperTestContext({
      buildingTier: 5,
      reputation: SKYSCRAPER_RELOCATION_THRESHOLDS.reputation,
    });
    const gate = evaluateRelocationGate(context);
    expect(gate.visible).toBe(true);
    const tierPrereq = gate.prerequisites.find((p) => p.key === "buildingTier");
    expect(tierPrereq?.label).toBe("Porter's fully upgraded");
    expect(tierPrereq?.target).toBe(SKYSCRAPER_RELOCATION_THRESHOLDS.buildingTier);
    const treasuryPrereq = gate.prerequisites.find((p) => p.key === "treasury");
    expect(treasuryPrereq?.target).toBe(SKYSCRAPER_RELOCATION_THRESHOLDS.treasury);
  });

  it("unlocks only when every skyscraper prerequisite is met", () => {
    const context = createSkyscraperTestContext({
      buildingTier: SKYSCRAPER_RELOCATION_THRESHOLDS.buildingTier,
      reputation: SKYSCRAPER_RELOCATION_THRESHOLDS.reputation,
      treasury: SKYSCRAPER_RELOCATION_THRESHOLDS.treasury,
      activeRoster: SKYSCRAPER_RELOCATION_THRESHOLDS.activeRoster,
      raidSummaries: generateSkyscraperRaidSummaries(
        SKYSCRAPER_RELOCATION_THRESHOLDS.contractsCompleted,
        SKYSCRAPER_RELOCATION_THRESHOLDS.bossEncountersCompleted,
      ),
    });
    const gate = evaluateRelocationGate(context);
    expect(gate.allPrerequisitesMet).toBe(true);
  });

  it("hides the relocation gate once the skyscraper is active", () => {
    const context = createSkyscraperTestContext();
    const skyscraperIndex = templateRegistry.buildingIndexById.get("building/skyscraper");
    if (skyscraperIndex !== undefined) {
      BuildingAuthority.activeBuildingTemplateIndex[context.singletonEntities.building] =
        skyscraperIndex;
    }
    const gate = evaluateRelocationGate(context);
    expect(gate.visible).toBe(false);
  });

  it("uses different reputation thresholds than the bodega relocation", () => {
    expect(SKYSCRAPER_RELOCATION_THRESHOLDS.reputation).toBeGreaterThan(
      RELOCATION_THRESHOLDS.reputation,
    );
    expect(SKYSCRAPER_RELOCATION_THRESHOLDS.treasury).toBeGreaterThan(
      RELOCATION_THRESHOLDS.treasury,
    );
    expect(SKYSCRAPER_RELOCATION_THRESHOLDS.contractsCompleted).toBeGreaterThan(
      RELOCATION_THRESHOLDS.contractsCompleted,
    );
    expect(SKYSCRAPER_RELOCATION_THRESHOLDS.activeRoster).toBeGreaterThan(
      RELOCATION_THRESHOLDS.activeRoster,
    );
    expect(SKYSCRAPER_RELOCATION_THRESHOLDS.bossEncountersCompleted).toBeGreaterThan(
      RELOCATION_THRESHOLDS.bossEncountersCompleted,
    );
    expect(SKYSCRAPER_RELOCATION_THRESHOLDS.buildingTier).toBeGreaterThan(
      RELOCATION_THRESHOLDS.buildingTier,
    );
  });
});

describe("skyscraper relocation handoff", () => {
  it("swaps Porter's for the skyscraper on full acceptance", () => {
    const context = createReadySkyscraperRelocationContext();
    runFullSkyscraperAcceptance(context);

    const skyscraperIndex = templateRegistry.buildingIndexById.get("building/skyscraper");
    expect(BuildingAuthority.activeBuildingTemplateIndex[context.singletonEntities.building]).toBe(
      skyscraperIndex,
    );
  });

  it("resets the skyscraper tier and slot counts to base values", () => {
    const context = createReadySkyscraperRelocationContext();
    runFullSkyscraperAcceptance(context);

    const skyscraperTemplate = templateRegistry.buildingById.get("building/skyscraper");
    expect(BuildingAuthority.activeBuildingTier[context.singletonEntities.building]).toBe(
      skyscraperTemplate!.baseTier,
    );
    expect(BuildingAuthority.roomSlotCount[context.singletonEntities.building]).toBe(
      skyscraperTemplate!.baseRoomSlots,
    );
    expect(BuildingAuthority.operatorSlotCount[context.singletonEntities.building]).toBe(
      skyscraperTemplate!.baseOperatorSlots,
    );
  });

  it("places every skyscraper starter room across the five starter floors", () => {
    const context = createReadySkyscraperRelocationContext();
    runFullSkyscraperAcceptance(context);

    const placedTemplateIds = context.runtimeState.roomEntities
      .map((e) => templateRegistry.rooms[RoomInstance.templateIndex[e]]?.id)
      .sort();
    expect(placedTemplateIds).toEqual([
      "room/bullpen:tier_1",
      "room/clinic:tier_1",
      "room/crew_lounge:tier_1",
      "room/dojo:tier_1",
      "room/fabrication_bay:tier_1",
      "room/lobby:tier_1",
      "room/reception:tier_1",
      "room/rooftop_helipad:tier_1",
      "room/situation_room:tier_1",
      "room/sky_garden:tier_1",
      "room/supply_hall:tier_1",
    ]);

    const floorIndices = new Set(
      context.runtimeState.roomEntities.map((e) => RoomInstance.floorIndex[e]),
    );
    expect(floorIndices).toEqual(new Set([0, 1, 2, 3, 4]));
  });

  it("debits the skyscraper deposit from the treasury", () => {
    const context = createReadySkyscraperRelocationContext();
    const treasuryBefore = GuildState.treasury[context.singletonEntities.guild];
    runFullSkyscraperAcceptance(context);
    // The deposit is declared on the PORTERS_TO_SKYSCRAPER config.
    expect(GuildState.treasury[context.singletonEntities.guild]).toBe(treasuryBefore - 3000);
  });

  it("retires Porter's campaign guidance beats on the skyscraper landing", () => {
    const context = createReadySkyscraperRelocationContext();
    context.runtimeState.guidanceState.completedBeatIds = [];

    runFullSkyscraperAcceptance(context);

    for (const beatId of PORTERS_CAMPAIGN_BEAT_IDS) {
      expect(context.runtimeState.guidanceState.completedBeatIds).toContain(beatId);
    }
  });

  it("preserves operator dispositions and inventory through the skyscraper move", () => {
    const context = createReadySkyscraperRelocationContext();

    const itemEntity = addEntity(context.world);
    addComponent(context.world, itemEntity, InventoryStack);
    InventoryStack.itemId[itemEntity] = "item/medkit";
    InventoryStack.quantity[itemEntity] = 7;
    context.runtimeState.inventoryEntities.push(itemEntity);

    const dispEntity = addEntity(context.world);
    addComponent(context.world, dispEntity, OperatorDisposition);
    OperatorDisposition.operatorId[dispEntity] = "operator-0";
    OperatorDisposition.sociability[dispEntity] = 72;
    context.runtimeState.dispositionEntities.push(dispEntity);

    const tieEntity = addEntity(context.world);
    addComponent(context.world, tieEntity, NotableTie);
    NotableTie.operatorAId[tieEntity] = "operator-0";
    NotableTie.operatorBId[tieEntity] = "operator-1";
    NotableTie.stance[tieEntity] = "trust";
    NotableTie.strength[tieEntity] = 45;
    context.runtimeState.notableTieEntities.push(tieEntity);

    const teamEntity = addEntity(context.world);
    addComponent(context.world, teamEntity, RecurringTeam);
    RecurringTeam.id[teamEntity] = "team-porters-1";
    RecurringTeam.memberIds[teamEntity] = ["operator-0"];
    RecurringTeam.cohesion[teamEntity] = 40;
    context.runtimeState.recurringTeamEntities.push(teamEntity);

    const equipEntity = addEntity(context.world);
    addComponent(context.world, equipEntity, EquipmentAssignment);
    EquipmentAssignment.operatorId[equipEntity] = "operator-0";
    EquipmentAssignment.weaponId[equipEntity] = "weapon/kitchen-knife";
    context.runtimeState.equipmentEntities.push(equipEntity);

    runFullSkyscraperAcceptance(context);

    expect(context.runtimeState.inventoryEntities.length).toBe(1);
    expect(InventoryStack.quantity[context.runtimeState.inventoryEntities[0]]).toBe(7);
    expect(context.runtimeState.dispositionEntities.length).toBe(1);
    expect(OperatorDisposition.sociability[context.runtimeState.dispositionEntities[0]]).toBe(72);
    expect(context.runtimeState.notableTieEntities.length).toBe(1);
    expect(context.runtimeState.recurringTeamEntities.length).toBe(1);
    expect(context.runtimeState.equipmentEntities.length).toBe(1);
  });

  it("clears active raid and visitor state during the skyscraper handoff", () => {
    const context = createReadySkyscraperRelocationContext();

    const visitorEntity = addEntity(context.world);
    addComponent(context.world, visitorEntity, VisitorState);
    VisitorState.id[visitorEntity] = "visitor-porters-1";
    context.runtimeState.visitorEntities.push(visitorEntity);

    const operatorEntity = context.runtimeState.operatorEntities[0];
    RaidParticipationState.activeRaidId[operatorEntity] = "";
    AssignmentState.kind[operatorEntity] = "room";
    AssignmentState.targetId[operatorEntity] = "room-instance/bar";

    runFullSkyscraperAcceptance(context);

    expect(context.runtimeState.visitorEntities.length).toBe(0);
    expect(AssignmentState.kind[operatorEntity]).toBe("idle");
    expect(AssignmentState.targetId[operatorEntity]).toBe("");
  });

  it("wires the Porter's → skyscraper relocation event id into the moving beat", () => {
    const context = createReadySkyscraperRelocationContext();

    initiateRelocation(context);
    const offerResolved = resolveActiveInterruption(context.runtimeState.interruptionQueue);
    advanceRelocationBeat(context, offerResolved!.payload as RelocationPayload, "continue");
    const decisionResolved = resolveActiveInterruption(context.runtimeState.interruptionQueue);
    advanceRelocationBeat(context, decisionResolved!.payload as RelocationPayload, "accept");

    const movingActive = context.runtimeState.interruptionQueue.active!;
    expect(movingActive.payload.kind).toBe("relocation");
    const movingPayload = movingActive.payload as RelocationPayload;
    expect(movingPayload.beat).toBe("moving");
    expect(movingPayload.eventId).toBe("event/relocation/porters-to-skyscraper");
    expect(movingPayload.buildingFromId).toBe("building/porters");
    expect(movingPayload.buildingToId).toBe("building/skyscraper");
    expect(movingPayload.treasuryCost).toBe(3000);
  });
});

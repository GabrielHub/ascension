import { describe, expect, it } from "vitest";
import { createWorld, addEntity, addComponent } from "bitecs";

import {
  CURRENT_SAVE_SCHEMA_VERSION,
  CURRENT_CONTENT_COMPATIBILITY,
  type PersistedSaveGame,
} from "save/types";
import { hydratePersistedSaveGame } from "save/codec";
import { templateRegistry } from "content/templates";
import {
  createAscensionSimulation,
  createBootstrapSimulation,
  createPreviewWorldSnapshot,
  createBootstrapWorldSnapshot,
} from "./index";
import {
  EquipmentAssignment,
  GuildState,
  InventoryStack,
  MoraleState,
  LoyaltyState,
  InjuryState,
  NeedState,
  NotableTie,
  OperatorDisposition,
  OperatorIdentity,
  PreferenceState,
  RecurringTeam,
  RoomCulture,
} from "./components";
import { computeAutonomyFlags } from "./systems/morale";
import { computeNeedReadinessFlags } from "./systems/needs";
import {
  addToInventory,
  removeFromInventory,
  getInventoryCount,
  equipItem,
  unequipItem,
  autoSelectAccessory,
} from "./systems/inventory";
import { getMarketItems, sellItem } from "./systems/market";
import { generateLootDrops } from "./systems/raids";
import { updateSocialStateAfterSharedOutcome } from "./systems/social";
import { SeededRng, seedFromKey, weightedChoice } from "./uncertainty";
import type { SimSystemContext } from "./systems/types";

// ── Test helpers ──────────────────────────────────────────────────────────

function createMinimalSave(): PersistedSaveGame {
  return {
    slotId: "slot/1",
    schemaVersion: CURRENT_SAVE_SCHEMA_VERSION,
    compatibilityVersion: CURRENT_CONTENT_COMPATIBILITY,
    metadata: {
      guildName: "Phase 2 Test Guild",
      createdAt: "2026-03-22T12:00:00.000Z",
      lastPlayedAt: "2026-03-22T12:00:00.000Z",
    },
    world: {
      guild: { reputation: 3, treasury: 1250, intel: 7 },
      time: { tick: 42, day: 3, minuteOfDay: 720 },
      building: {
        activeBuildingId: "building/bodega",
        activeBuildingTier: 2,
        roomSlotCount: 4,
        operatorSlotCount: 3,
      },
      rooms: [
        {
          id: "room-instance/register",
          templateId: "room/register:tier_1",
          tier: 1,
          capacity: 2,
          occupancy: 1,
          isActive: true,
          footprint: { col: 0, row: 0, cols: 4, rows: 3 },
        },
      ],
      activeRaidPackets: [],
      raidSummaries: [],
      appliedUpgradeIds: [],
      operators: [
        {
          id: "operator/1",
          lifecycle: { status: "active" },
          identity: { name: "Rose Vega", roleTag: "field_lead", specialtyTag: "combat" },
          morale: { current: 65, baseline: 60 },
          loyalty: { current: 55, baseline: 50 },
          appearance: { presetId: "vera-004" },
        },
        {
          id: "operator/2",
          lifecycle: { status: "active" },
          identity: { name: "Milo Hart", roleTag: "scout", specialtyTag: "recon" },
          morale: { current: 45, baseline: 50 },
          loyalty: { current: 40, baseline: 45 },
          appearance: { presetId: "dax-008" },
        },
      ],
      operatorRelationships: [
        {
          operatorAId: "operator/1",
          operatorBId: "operator/2",
          trust: 55,
          friction: 10,
          familiarity: 25,
          recentSharedOutcome: 8,
          historyTags: [],
        },
      ],
    },
  };
}

function createPhase2TestContext(): SimSystemContext {
  const world = createWorld();
  return {
    world,
    registry: templateRegistry,
    singletonEntities: {
      guild: addEntity(world),
      time: addEntity(world),
      building: addEntity(world),
    },
    runtimeState: {
      roomEntities: [],
      operatorEntities: [],
      raidOpportunityEntities: [],
      staffEntities: [],
      visitorEntities: [],
      eventEntities: [],
      dispositionEntities: [],
      notableTieEntities: [],
      recurringTeamEntities: [],
      roomCultureEntities: [],
      inventoryEntities: [],
      equipmentEntities: [],
      nextRoomSequence: 1,
      nextOperatorSequence: 1,
      nextOpportunitySequence: 1,
      nextStaffSequence: 1,
      nextVisitorSequence: 1,
      nextRaidSequence: 1,
      nextEventSequence: 1,
      nextTeamSequence: 1,
      pendingCueIds: [],
      pendingEvents: [],
      raidPresentation: {
        contractSiteId: null,
        teams: [],
        enemies: [],
        features: [],
      },
    },
  };
}

// ── Component tests ───────────────────────────────────────────────────────

describe("Phase 2 components", () => {
  it("creates OperatorDisposition with correct data access", () => {
    const world = createWorld();
    const entity = addEntity(world);
    addComponent(world, entity, OperatorDisposition);

    OperatorDisposition.operatorId[entity] = "operator/1";
    OperatorDisposition.sociability[entity] = 60;
    OperatorDisposition.temperament[entity] = 45;
    OperatorDisposition.grievanceLevel[entity] = 12;
    OperatorDisposition.satisfactionLevel[entity] = 72;

    expect(OperatorDisposition.operatorId[entity]).toBe("operator/1");
    expect(OperatorDisposition.sociability[entity]).toBe(60);
    expect(OperatorDisposition.temperament[entity]).toBe(45);
    expect(OperatorDisposition.grievanceLevel[entity]).toBe(12);
    expect(OperatorDisposition.satisfactionLevel[entity]).toBe(72);
  });

  it("creates NotableTie with stance and strength", () => {
    const world = createWorld();
    const entity = addEntity(world);
    addComponent(world, entity, NotableTie);

    NotableTie.operatorAId[entity] = "operator/1";
    NotableTie.operatorBId[entity] = "operator/2";
    NotableTie.stance[entity] = "trusted";
    NotableTie.strength[entity] = 80;

    expect(NotableTie.stance[entity]).toBe("trusted");
    expect(NotableTie.strength[entity]).toBe(80);
  });

  it("creates RecurringTeam with member tracking", () => {
    const world = createWorld();
    const entity = addEntity(world);
    addComponent(world, entity, RecurringTeam);

    RecurringTeam.id[entity] = "team/1";
    RecurringTeam.memberIds[entity] = ["operator/1", "operator/2"];
    RecurringTeam.cohesion[entity] = 65;
    RecurringTeam.raidCount[entity] = 3;
    RecurringTeam.lastRaidTick[entity] = 500;
    RecurringTeam.damaged[entity] = 0;
    RecurringTeam.damageReason[entity] = "";

    expect(RecurringTeam.memberIds[entity]).toEqual(["operator/1", "operator/2"]);
    expect(RecurringTeam.cohesion[entity]).toBe(65);
    expect(RecurringTeam.raidCount[entity]).toBe(3);
  });

  it("creates RoomCulture with tone tracking", () => {
    const world = createWorld();
    const entity = addEntity(world);
    addComponent(world, entity, RoomCulture);

    RoomCulture.roomInstanceId[entity] = "room-instance/front-desk";
    RoomCulture.comfort[entity] = 70;
    RoomCulture.tension[entity] = 20;
    RoomCulture.camaraderie[entity] = 55;
    RoomCulture.tone[entity] = "calm";

    expect(RoomCulture.tone[entity]).toBe("calm");
    expect(RoomCulture.comfort[entity]).toBe(70);
  });

  it("creates InventoryStack and EquipmentAssignment", () => {
    const world = createWorld();

    const stackEntity = addEntity(world);
    addComponent(world, stackEntity, InventoryStack);
    InventoryStack.itemId[stackEntity] = "weapon/katana";
    InventoryStack.quantity[stackEntity] = 3;
    expect(InventoryStack.itemId[stackEntity]).toBe("weapon/katana");
    expect(InventoryStack.quantity[stackEntity]).toBe(3);

    const equipEntity = addEntity(world);
    addComponent(world, equipEntity, EquipmentAssignment);
    EquipmentAssignment.operatorId[equipEntity] = "operator/1";
    EquipmentAssignment.weaponId[equipEntity] = "weapon/katana";
    EquipmentAssignment.outfitOverlayId[equipEntity] = "";
    EquipmentAssignment.accessoryId[equipEntity] = "accessory/medkit";
    expect(EquipmentAssignment.weaponId[equipEntity]).toBe("weapon/katana");
    expect(EquipmentAssignment.accessoryId[equipEntity]).toBe("accessory/medkit");
  });
});

// ── Save migration tests ──────────────────────────────────────────────────

describe("Phase 2 save migration", () => {
  it("migrates schema 7 save to the current schema with defaults", () => {
    const save = createMinimalSave();
    save.schemaVersion = 7;

    const result = hydratePersistedSaveGame(save);

    expect(result.save.schemaVersion).toBe(CURRENT_SAVE_SCHEMA_VERSION);
    expect(result.changed).toBe(true);
    expect(result.save.world.operatorDispositions).toBeDefined();
    expect(result.save.world.operatorDispositions!.length).toBe(2);
    expect(result.save.world.notableTies).toEqual([]);
    expect(result.save.world.recurringTeams).toEqual([]);
    expect(result.save.world.roomCultures).toEqual([]);
    expect(result.save.world.inventoryStacks).toEqual([]);
    expect(result.save.world.equipmentAssignments).toEqual([]);
  });

  it("derives disposition from operator morale/loyalty on migration", () => {
    const save = createMinimalSave();
    save.schemaVersion = 7;

    const result = hydratePersistedSaveGame(save);
    const dispositions = result.save.world.operatorDispositions!;

    expect(dispositions[0].operatorId).toBe("operator/1");
    // satisfactionLevel should be average of morale (65) and loyalty (55) = 60
    expect(dispositions[0].satisfactionLevel).toBe(60);
    // grievanceLevel from morale (65): max(0, round(50 - 65*0.5)) = max(0, round(17.5)) = 18
    expect(dispositions[0].grievanceLevel).toBe(18);
  });

  it("round-trips prior Phase 2 saves through the current schema", () => {
    const save = createMinimalSave();
    save.schemaVersion = 8;
    save.world.operatorDispositions = [
      {
        operatorId: "operator/1",
        sociability: 60,
        temperament: 50,
        grievanceLevel: 5,
        satisfactionLevel: 70,
      },
    ];
    save.world.notableTies = [];
    save.world.recurringTeams = [];
    save.world.roomCultures = [];
    save.world.inventoryStacks = [];
    save.world.equipmentAssignments = [];

    const result = hydratePersistedSaveGame(save);

    expect(result.save.schemaVersion).toBe(CURRENT_SAVE_SCHEMA_VERSION);
    expect(result.save.world.operatorDispositions!.length).toBe(1);
    expect(result.save.world.operatorDispositions![0].operatorId).toBe("operator/1");
    expect(result.save.world.operatorDispositions![0].sociability).toBe(60);
  });
});

// ── Morale/loyalty consequence tests ──────────────────────────────────────

describe("Phase 2 morale/loyalty consequences", () => {
  it("computes refusal_risk flag when morale < 30", () => {
    const world = createWorld();
    const entity = addEntity(world);
    addComponent(world, entity, MoraleState);
    addComponent(world, entity, LoyaltyState);

    MoraleState.current[entity] = 25;
    LoyaltyState.current[entity] = 50;

    const flags = computeAutonomyFlags(entity);
    expect(flags.refusalRisk).toBe(true);
    expect(flags.quitRisk).toBe(false);
    expect(flags.retentionRisk).toBe(false);
  });

  it("computes quit_risk flag when morale < 15", () => {
    const world = createWorld();
    const entity = addEntity(world);
    addComponent(world, entity, MoraleState);
    addComponent(world, entity, LoyaltyState);

    MoraleState.current[entity] = 10;
    LoyaltyState.current[entity] = 50;

    const flags = computeAutonomyFlags(entity);
    expect(flags.refusalRisk).toBe(true);
    expect(flags.quitRisk).toBe(true);
  });

  it("computes retention_risk flag when loyalty < 25", () => {
    const world = createWorld();
    const entity = addEntity(world);
    addComponent(world, entity, MoraleState);
    addComponent(world, entity, LoyaltyState);

    MoraleState.current[entity] = 50;
    LoyaltyState.current[entity] = 20;

    const flags = computeAutonomyFlags(entity);
    expect(flags.retentionRisk).toBe(true);
    expect(flags.refusalRisk).toBe(false);
  });
});

// ── Needs threshold tests ─────────────────────────────────────────────────

describe("Phase 2 needs thresholds", () => {
  it("injury > 60 prevents raid assignment", () => {
    const world = createWorld();
    const entity = addEntity(world);
    addComponent(world, entity, InjuryState);
    addComponent(world, entity, NeedState);

    InjuryState.severity[entity] = 65;
    NeedState.fatigue[entity] = 50;
    NeedState.stress[entity] = 50;
    NeedState.hunger[entity] = 50;

    const flags = computeNeedReadinessFlags(entity);
    expect(flags.injuryPreventsRaid).toBe(true);
  });

  it("fatigue > 80 adds exhaustion penalty", () => {
    const world = createWorld();
    const entity = addEntity(world);
    addComponent(world, entity, InjuryState);
    addComponent(world, entity, NeedState);

    InjuryState.severity[entity] = 0;
    NeedState.fatigue[entity] = 85;
    NeedState.stress[entity] = 50;
    NeedState.hunger[entity] = 50;

    const flags = computeNeedReadinessFlags(entity);
    expect(flags.exhaustionPenalty).toBe(true);
  });

  it("stress > 70 adds stress penalty", () => {
    const world = createWorld();
    const entity = addEntity(world);
    addComponent(world, entity, InjuryState);
    addComponent(world, entity, NeedState);

    InjuryState.severity[entity] = 0;
    NeedState.fatigue[entity] = 50;
    NeedState.stress[entity] = 75;
    NeedState.hunger[entity] = 50;

    const flags = computeNeedReadinessFlags(entity);
    expect(flags.stressPenalty).toBe(true);
  });

  it("hunger > 70 reduces training effectiveness", () => {
    const world = createWorld();
    const entity = addEntity(world);
    addComponent(world, entity, InjuryState);
    addComponent(world, entity, NeedState);

    InjuryState.severity[entity] = 0;
    NeedState.fatigue[entity] = 50;
    NeedState.stress[entity] = 50;
    NeedState.hunger[entity] = 80;

    const flags = computeNeedReadinessFlags(entity);
    expect(flags.hungerReducesTraining).toBe(true);
  });
});

// ── Inventory tests ───────────────────────────────────────────────────────

describe("Phase 2 inventory system", () => {
  function createInventoryContext(): SimSystemContext {
    const world = createWorld();
    const context: SimSystemContext = {
      world,
      registry: templateRegistry,
      singletonEntities: {
        guild: addEntity(world),
        time: addEntity(world),
        building: addEntity(world),
      },
      runtimeState: {
        roomEntities: [],
        operatorEntities: [],
        raidOpportunityEntities: [],
        staffEntities: [],
        visitorEntities: [],
        eventEntities: [],
        dispositionEntities: [],
        notableTieEntities: [],
        recurringTeamEntities: [],
        roomCultureEntities: [],
        inventoryEntities: [],
        equipmentEntities: [],
        nextRoomSequence: 1,
        nextOperatorSequence: 1,
        nextOpportunitySequence: 1,
        nextStaffSequence: 1,
        nextVisitorSequence: 1,
        nextRaidSequence: 1,
        nextEventSequence: 1,
        nextTeamSequence: 1,
        pendingCueIds: [],
        pendingEvents: [],
        raidPresentation: {
          contractSiteId: null,
          teams: [],
          enemies: [],
          features: [],
        },
      },
    };

    const operatorEntity = addEntity(world);
    addComponent(world, operatorEntity, OperatorIdentity);
    addComponent(world, operatorEntity, NeedState);
    addComponent(world, operatorEntity, InjuryState);
    addComponent(world, operatorEntity, PreferenceState);
    OperatorIdentity.id[operatorEntity] = "operator/1";
    OperatorIdentity.name[operatorEntity] = "Test Operator";
    OperatorIdentity.roleTag[operatorEntity] = "role:scout";
    OperatorIdentity.specialtyTag[operatorEntity] = "specialty:test";
    NeedState.hunger[operatorEntity] = 0;
    NeedState.fatigue[operatorEntity] = 0;
    NeedState.stress[operatorEntity] = 0;
    InjuryState.severity[operatorEntity] = 0;
    PreferenceState.riskTolerance[operatorEntity] = 50;
    PreferenceState.rewardFocus[operatorEntity] = 50;
    PreferenceState.recoveryBias[operatorEntity] = 50;
    PreferenceState.socialBias[operatorEntity] = 50;
    PreferenceState.trainingBias[operatorEntity] = 50;
    PreferenceState.comfortBias[operatorEntity] = 50;
    context.runtimeState.operatorEntities.push(operatorEntity);

    return context;
  }

  it("adds to and removes from inventory", () => {
    const context = createInventoryContext();

    addToInventory(context, "weapon/katana", 3);
    expect(getInventoryCount(context, "weapon/katana")).toBe(3);

    addToInventory(context, "weapon/katana", 2);
    expect(getInventoryCount(context, "weapon/katana")).toBe(5);

    const removed = removeFromInventory(context, "weapon/katana", 2);
    expect(removed).toBe(true);
    expect(getInventoryCount(context, "weapon/katana")).toBe(3);
  });

  it("returns false when removing more than available", () => {
    const context = createInventoryContext();

    addToInventory(context, "accessory/medkit", 1);
    const removed = removeFromInventory(context, "accessory/medkit", 5);
    expect(removed).toBe(false);
    expect(getInventoryCount(context, "accessory/medkit")).toBe(1);
  });

  it("removes stack entity when quantity reaches zero", () => {
    const context = createInventoryContext();

    addToInventory(context, "loot/monster-part/fang", 2);
    expect(context.runtimeState.inventoryEntities.length).toBe(1);

    removeFromInventory(context, "loot/monster-part/fang", 2);
    expect(context.runtimeState.inventoryEntities.length).toBe(0);
    expect(getInventoryCount(context, "loot/monster-part/fang")).toBe(0);
  });

  it("equips and unequips items", () => {
    const context = createInventoryContext();

    addToInventory(context, "accessory/medkit", 1);
    const equipped = equipItem(context, "operator/1", "accessory", "accessory/medkit");
    expect(equipped).toBe(true);
    expect(getInventoryCount(context, "accessory/medkit")).toBe(0);

    const unequipped = unequipItem(context, "operator/1", "accessory");
    expect(unequipped).toBe(true);
    expect(getInventoryCount(context, "accessory/medkit")).toBe(1);
  });

  it("fails to equip when item not in inventory", () => {
    const context = createInventoryContext();

    const equipped = equipItem(context, "operator/1", "weapon", "weapon/katana");
    expect(equipped).toBe(false);
  });

  it("keeps an already equipped accessory during auto-selection", () => {
    const context = createInventoryContext();

    addToInventory(context, "accessory/comm-earpiece", 1);
    equipItem(context, "operator/1", "accessory", "accessory/comm-earpiece");

    expect(autoSelectAccessory(context, "operator/1", "role:scout")).toEqual({
      itemId: "accessory/comm-earpiece",
      reason: "already_equipped",
    });
  });

  it("prefers role-matching accessories over generic stock", () => {
    const context = createInventoryContext();

    addToInventory(context, "accessory/comm-earpiece", 1);
    addToInventory(context, "accessory/field-lead-badge", 1);

    expect(autoSelectAccessory(context, "operator/1", "role:field_lead")).toEqual({
      itemId: "accessory/field-lead-badge",
      reason: "role_match",
    });
  });

  it("falls back to the best available generic accessory", () => {
    const context = createInventoryContext();

    addToInventory(context, "accessory/comm-earpiece", 1);
    addToInventory(context, "accessory/tactical-scarf", 1);

    expect(autoSelectAccessory(context, "operator/1", "role:unknown")).toEqual({
      itemId: "accessory/comm-earpiece",
      reason: "best_available",
    });
  });

  it("returns null when no accessory inventory exists", () => {
    const context = createInventoryContext();

    expect(autoSelectAccessory(context, "operator/1", "role:scout")).toBeNull();
  });

  it("rejects non-positive sell quantities without mutating inventory or cash", () => {
    const context = createInventoryContext();
    const guildEntity = context.singletonEntities.guild;

    addToInventory(context, "accessory/comm-earpiece", 2);
    GuildState.treasury[guildEntity] = 100;

    expect(sellItem(context, "accessory/comm-earpiece", 0, 8)).toBe(false);
    expect(sellItem(context, "accessory/comm-earpiece", -1, 8)).toBe(false);
    expect(getInventoryCount(context, "accessory/comm-earpiece")).toBe(2);
    expect(GuildState.treasury[guildEntity]).toBe(100);
  });
});

// ── Market tests ──────────────────────────────────────────────────────────

describe("Phase 2 market system", () => {
  it("lists available market items from template registry", () => {
    const items = getMarketItems(templateRegistry);
    expect(items.length).toBeGreaterThan(0);

    const katana = items.find((item) => item.itemId === "weapon/katana");
    expect(katana).toBeDefined();
    expect(katana!.buyPrice).toBe(150);
    expect(katana!.sellPrice).toBe(60);
    expect(katana!.available).toBe(true);

    // Loot items shouldn't be buyable
    const fang = items.find((item) => item.itemId === "loot/monster-part/fang");
    expect(fang).toBeDefined();
    expect(fang!.buyPrice).toBe(0);
    expect(fang!.available).toBe(false);
  });

  it("rejects selling non-positive quantities through the runtime command surface", () => {
    const simulation = createBootstrapSimulation(templateRegistry);
    const beforePhase1 = simulation.getPhase1View();
    const beforePhase2 = simulation.getPhase2View();
    const beforeCash = beforePhase1.resources.cash;
    const beforeQuantity =
      beforePhase2.inventory.find((stack) => stack.itemId === "loot/monster-part/fang")?.quantity ??
      0;

    simulation.dispatch({
      type: "sim/sell-item",
      itemId: "loot/monster-part/fang",
      quantity: -1,
    });

    expect(simulation.getPhase1View().resources.cash).toBe(beforeCash);
    expect(
      simulation
        .getPhase2View()
        .inventory.find((stack) => stack.itemId === "loot/monster-part/fang")?.quantity,
    ).toBe(beforeQuantity);
  });

  it("emits resource swing events for successful market transactions", () => {
    const simulation = createBootstrapSimulation(templateRegistry);

    simulation.dispatch({
      type: "sim/buy-item",
      itemId: "weapon/pipe-wrench",
    });
    simulation.dispatch({
      type: "sim/sell-item",
      itemId: "loot/monster-part/fang",
      quantity: 1,
    });

    expect(simulation.drainRuntimeEvents()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "resource_swing",
          message: "Bought Pipe Wrench for $30",
        }),
        expect.objectContaining({
          kind: "resource_swing",
          message: "Sold 1 Fang for $8",
        }),
      ]),
    );
  });
});

// ── Loot drop test ────────────────────────────────────────────────────────

describe("Phase 2 loot drops", () => {
  it("generates loot using weighted choice from uncertainty", () => {
    const rng = new SeededRng(seedFromKey("test-loot"));
    const lootTable = [
      { item: "loot/monster-part/fang", weight: 30 },
      { item: "loot/monster-part/carapace", weight: 25 },
      { item: "loot/rare/crystal-shard", weight: 5 },
    ];

    const result = weightedChoice(rng, lootTable);
    expect(lootTable.map((entry) => entry.item)).toContain(result.outcome);
    expect(result.modifiers.length).toBe(lootTable.length);
  });

  it("only emits authored item ids from registered drop tables", () => {
    const context = createPhase2TestContext();

    for (const result of ["success", "mixed", "failure"] as const) {
      const loot = generateLootDrops(context, new SeededRng(seedFromKey(`loot:${result}`)), result);
      loot.forEach((itemId) => {
        expect(templateRegistry.itemById.has(itemId)).toBe(true);
      });
    }
  });
});

// ── Runtime Phase 2 view test ─────────────────────────────────────────────

describe("Phase 2 runtime view", () => {
  it("exposes Phase 2 view data from bootstrap simulation", () => {
    const simulation = createBootstrapSimulation(templateRegistry);
    const phase2View = simulation.getPhase2View();

    expect(phase2View.teams).toBeDefined();
    expect(phase2View.roomCultures).toBeDefined();
    expect(phase2View.inventory).toBeDefined();
    expect(phase2View.equipment).toBeDefined();
    expect(phase2View.operatorAutonomy).toBeDefined();
    expect(phase2View.marketItems.length).toBeGreaterThan(0);
    expect(phase2View.dispositions).toBeDefined();
    expect(phase2View.notableTies).toBeDefined();
    expect(phase2View.dispositions).toHaveLength(6);
    expect(phase2View.equipment).toHaveLength(6);
    expect(
      phase2View.inventory.some(
        (stack) => stack.itemId === "loot/monster-part/fang" && stack.quantity === 3,
      ),
    ).toBe(true);
    expect(
      phase2View.equipment.some(
        (assignment) =>
          assignment.operatorId === "operator/rose-vega" &&
          assignment.weaponId === "weapon/tactical-rifle" &&
          assignment.outfitOverlayId === "outfit-overlay/tactical-vest",
      ),
    ).toBe(true);

    // Bootstrap has 6 operators, should have 6 autonomy entries
    expect(phase2View.operatorAutonomy.length).toBe(6);
  });

  it("derives compatibility social signals from Phase 2 ties even with no legacy relationships", () => {
    const snapshot = createBootstrapWorldSnapshot(templateRegistry);
    snapshot.operatorRelationships = [];
    snapshot.notableTies = [
      {
        operatorAId: "operator/milo-hart",
        operatorBId: "operator/rose-vega",
        stance: "trusted",
        strength: 82,
      },
    ];

    const simulation = createAscensionSimulation(snapshot, templateRegistry);
    const phase1View = simulation.getPhase1View();

    expect(
      phase1View.relationshipSignals.find(
        (relationship) =>
          relationship.operatorAId === "operator/milo-hart" &&
          relationship.operatorBId === "operator/rose-vega",
      ),
    ).toMatchObject({
      cohesion: expect.any(Number),
      historyTags: ["bond:trusted"],
    });
  });

  it("publishes autonomy explanations for morale, loyalty, and injury pressure", () => {
    const snapshot = createBootstrapWorldSnapshot(templateRegistry);
    snapshot.operators = snapshot.operators?.map((operator) =>
      operator.id === "operator/rose-vega"
        ? {
            ...operator,
            morale: { ...operator.morale, current: 10 },
            loyalty: { ...operator.loyalty, current: 18 },
            injury: { ...operator.injury, severity: 42 },
          }
        : operator,
    );

    const simulation = createAscensionSimulation(snapshot, templateRegistry);
    const roseAutonomy = simulation
      .getPhase2View()
      .operatorAutonomy.find((entry) => entry.operatorId === "operator/rose-vega");

    expect(roseAutonomy).toBeDefined();
    expect(roseAutonomy!.quitRisk).toBe(true);
    expect(roseAutonomy!.retentionRisk).toBe(true);
    expect(roseAutonomy!.explanationReasons.map((reason) => reason.factor)).toEqual(
      expect.arrayContaining(["critical_morale", "low_loyalty", "injury"]),
    );
  });

  it("auto-selects accessories during raid launch and exposes the explanation in Phase 2 view", () => {
    const snapshot = createPreviewWorldSnapshot(templateRegistry);
    snapshot.operators = snapshot.operators?.filter((operator) =>
      ["operator/rose-vega", "operator/milo-hart"].includes(operator.id),
    );
    snapshot.inventoryStacks = [
      { itemId: "accessory/field-lead-badge", quantity: 1 },
      { itemId: "accessory/scout-binocs", quantity: 1 },
    ];
    snapshot.equipmentAssignments = [];
    snapshot.raidOpportunities = [
      {
        id: "opportunity/accessory-fit",
        missionId: "mission/clearance",
        location: "district/lower-east-side",
        threat: 62,
        intel: 70,
        reward: 120,
        risk: 48,
        status: "open",
        interestedOperatorIds: [],
        claimedOperatorIds: [],
        createdTick: 300,
        expiresAtTick: 1200,
      },
    ];

    const simulation = createAscensionSimulation(snapshot, templateRegistry);
    simulation.tick(60000);

    const phase2View = simulation.getPhase2View();
    expect(
      phase2View.equipment.find((entry) => entry.operatorId === "operator/rose-vega"),
    ).toMatchObject({
      accessoryId: "accessory/field-lead-badge",
      accessoryReason: "role_match",
      accessorySummary: "Selected for role fit",
    });
    expect(
      phase2View.equipment.find((entry) => entry.operatorId === "operator/milo-hart"),
    ).toMatchObject({
      accessoryId: "accessory/scout-binocs",
      accessoryReason: "role_match",
    });
  });

  it("supports manual accessory auto-assignment and clearing through sim commands", () => {
    const snapshot = createBootstrapWorldSnapshot(templateRegistry);
    snapshot.operators = snapshot.operators?.filter(
      (operator) => operator.id === "operator/rose-vega",
    );
    snapshot.inventoryStacks = [{ itemId: "accessory/field-lead-badge", quantity: 1 }];
    snapshot.equipmentAssignments = [];

    const simulation = createAscensionSimulation(snapshot, templateRegistry);

    expect(simulation.getPhase2View().equipment).toHaveLength(1);
    expect(simulation.getPhase2View().equipment[0]).toMatchObject({
      operatorId: "operator/rose-vega",
      accessoryId: "",
      accessoryReason: "no_eligible_accessory",
    });

    simulation.dispatch({
      type: "sim/auto-assign-accessory",
      operatorId: "operator/rose-vega",
    });

    expect(simulation.getPhase2View().equipment[0]).toMatchObject({
      operatorId: "operator/rose-vega",
      accessoryId: "accessory/field-lead-badge",
      accessoryReason: "role_match",
    });

    simulation.dispatch({
      type: "sim/unequip-item",
      operatorId: "operator/rose-vega",
      slot: "accessory",
    });

    expect(simulation.getPhase2View().equipment[0]).toMatchObject({
      operatorId: "operator/rose-vega",
      accessoryId: "",
      accessoryReason: "no_eligible_accessory",
    });
  });

  it("forms recurring teams after successful raids and carries their history forward", () => {
    const snapshot = createPreviewWorldSnapshot(templateRegistry);
    snapshot.operators = snapshot.operators?.filter((operator) =>
      ["operator/rose-vega", "operator/milo-hart"].includes(operator.id),
    );
    const simulation = createAscensionSimulation(snapshot, templateRegistry);

    simulation.tick(10_800_000);
    simulation.tick(3_600_000);
    simulation.tick(21_600_000);

    if (simulation.getPhase1View().contractLifecycle === "resolved") {
      simulation.dispatch({
        type: "sim/advance-contract",
      });
      const postingId = simulation.getPhase1View().postedContracts[0]?.postingId;
      if (postingId) {
        simulation.dispatch({
          type: "sim/bid-contract",
          postingId,
        });
      }
    }

    simulation.tick(14_400_000);
    simulation.tick(3_600_000);
    simulation.tick(21_600_000);

    const recurringTeam = simulation
      .getPhase2View()
      .teams.find((team) => team.raidCount >= 1 && team.members.length >= 2);

    expect(recurringTeam).toBeDefined();
    expect(recurringTeam!.statusSummary.length).toBeGreaterThan(0);
    expect(recurringTeam!.explanationReasons.length).toBeGreaterThan(0);
  });

  it("does not process damaged team recovery on non-midnight ticks", () => {
    const snapshot = createBootstrapWorldSnapshot(templateRegistry);
    snapshot.time.minuteOfDay = 480;
    snapshot.operators = snapshot.operators?.map((operator) =>
      ["operator/rose-vega", "operator/milo-hart"].includes(operator.id)
        ? {
            ...operator,
            morale: { ...operator.morale, current: 10, baseline: 20 },
            loyalty: { ...operator.loyalty, current: 10, baseline: 20 },
          }
        : operator,
    );
    snapshot.recurringTeams = [
      {
        id: "team/damaged-night-cycle",
        memberIds: ["operator/rose-vega", "operator/milo-hart"],
        cohesion: 50,
        raidCount: 2,
        lastRaidTick: 0,
        damaged: true,
        damageReason: "death",
      },
    ];

    const simulation = createAscensionSimulation(snapshot, templateRegistry);
    simulation.tick(60000);

    expect(simulation.getPhase2View().teams).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "team/damaged-night-cycle",
          cohesion: 50,
          damaged: true,
          damageReason: "death",
        }),
      ]),
    );
  });

  it("emits team return events when raid survivors come home", () => {
    const simulation = createAscensionSimulation(
      createPreviewWorldSnapshot(templateRegistry),
      templateRegistry,
    );

    simulation.tick(10_800_000);
    simulation.tick(3_600_000);
    simulation.tick(21_600_000);

    expect(simulation.drainRuntimeEvents()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "team_return",
          message: expect.stringContaining("returned from"),
        }),
        expect.objectContaining({
          kind: "raid_result",
        }),
      ]),
    );
  });

  it("persists operator departures when quit pressure resolves into an actual exit", () => {
    const snapshot = createBootstrapWorldSnapshot(templateRegistry);
    snapshot.time.minuteOfDay = 1439;
    snapshot.operators = snapshot.operators?.map((operator) =>
      operator.id === "operator/rose-vega"
        ? {
            ...operator,
            morale: { ...operator.morale, current: 0, baseline: 40 },
            loyalty: { ...operator.loyalty, current: 0, baseline: 35 },
            injury: { ...operator.injury, severity: 80 },
          }
        : operator,
    );

    const simulation = createAscensionSimulation(snapshot, templateRegistry);
    simulation.tick(1000);

    const departed = simulation
      .getWorldSnapshot()
      .operators?.find((operator) => operator.id === "operator/rose-vega");
    expect(departed?.lifecycle.status).toBe("departed");
    expect(departed?.lifecycle.departureReason).toBeTruthy();
    expect(
      simulation
        .getPhase2View()
        .inventory.some((stack) => stack.itemId === "weapon/tactical-rifle" && stack.quantity >= 1),
    ).toBe(true);
    expect(simulation.drainRuntimeEvents()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "staffing_change",
          message: expect.stringContaining("Rose Vega left the guild"),
        }),
      ]),
    );
  });
});

describe("Phase 2 social cleanup", () => {
  it("removes weak negative ties instead of leaving zero-strength residue", () => {
    const context = createPhase2TestContext();

    const operatorA = addEntity(context.world);
    addComponent(context.world, operatorA, OperatorIdentity);
    addComponent(context.world, operatorA, MoraleState);
    addComponent(context.world, operatorA, LoyaltyState);
    addComponent(context.world, operatorA, PreferenceState);
    OperatorIdentity.id[operatorA] = "operator/1";
    OperatorIdentity.name[operatorA] = "Operator One";
    OperatorIdentity.roleTag[operatorA] = "role:field_lead";
    OperatorIdentity.specialtyTag[operatorA] = "specialty:combat";
    MoraleState.current[operatorA] = 60;
    LoyaltyState.current[operatorA] = 60;
    PreferenceState.riskTolerance[operatorA] = 50;
    PreferenceState.rewardFocus[operatorA] = 50;
    PreferenceState.socialBias[operatorA] = 50;
    PreferenceState.recoveryBias[operatorA] = 50;
    context.runtimeState.operatorEntities.push(operatorA);

    const operatorB = addEntity(context.world);
    addComponent(context.world, operatorB, OperatorIdentity);
    addComponent(context.world, operatorB, MoraleState);
    addComponent(context.world, operatorB, LoyaltyState);
    addComponent(context.world, operatorB, PreferenceState);
    OperatorIdentity.id[operatorB] = "operator/2";
    OperatorIdentity.name[operatorB] = "Operator Two";
    OperatorIdentity.roleTag[operatorB] = "role:scout";
    OperatorIdentity.specialtyTag[operatorB] = "specialty:recon";
    MoraleState.current[operatorB] = 60;
    LoyaltyState.current[operatorB] = 60;
    PreferenceState.riskTolerance[operatorB] = 50;
    PreferenceState.rewardFocus[operatorB] = 50;
    PreferenceState.socialBias[operatorB] = 50;
    PreferenceState.recoveryBias[operatorB] = 50;
    context.runtimeState.operatorEntities.push(operatorB);

    const tieEntity = addEntity(context.world);
    addComponent(context.world, tieEntity, NotableTie);
    NotableTie.operatorAId[tieEntity] = "operator/1";
    NotableTie.operatorBId[tieEntity] = "operator/2";
    NotableTie.stance[tieEntity] = "resented";
    NotableTie.strength[tieEntity] = 17;
    context.runtimeState.notableTieEntities.push(tieEntity);

    updateSocialStateAfterSharedOutcome(context, ["operator/1", "operator/2"], "success");

    expect(context.runtimeState.notableTieEntities).toHaveLength(0);
  });
});

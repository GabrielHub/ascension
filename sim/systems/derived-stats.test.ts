import { describe, expect, it } from "vitest";
import { createWorld, addEntity, addComponent } from "bitecs";

import { EquipmentAssignment, InjuryState, OperatorIdentity } from "../components";
import type { SimSystemContext } from "./types";
import type { ItemTemplate, TemplateRegistry } from "content/templates/shared";
import { buildCombatPackageRegistry } from "content/templates/combat-packages";
import { readOperatorBaseStats, collectStatModifiers, computeDerivedStats } from "./derived-stats";

// ── Test helpers ──────────────────────────────────────────────────────────

function createMockItemTemplate(
  id: string,
  statEffects: readonly { stat: string; value: number }[],
): ItemTemplate {
  return {
    id,
    kind: "item",
    name: id,
    tags: [],
    category: "weapon",
    rank: "f",
    rankTone: "grounded",
    buyPrice: 10,
    sellPrice: 5,
    statEffects,
  };
}

function createMinimalRegistry(items: ItemTemplate[]): TemplateRegistry {
  const itemById = new Map<string, ItemTemplate>();
  for (const item of items) {
    itemById.set(item.id, item);
  }

  return {
    resources: [],
    buildings: [],
    rooms: [],
    upgrades: [],
    missions: [],
    events: [],
    items,
    dropTables: [],
    resourceById: new Map(),
    buildingById: new Map(),
    roomById: new Map(),
    upgradeById: new Map(),
    missionById: new Map(),
    eventById: new Map(),
    itemById,
    dropTableById: new Map(),
    resourceIndexById: new Map(),
    buildingIndexById: new Map(),
    roomIndexById: new Map(),
    upgradeIndexById: new Map(),
  };
}

function createTestContext(items: ItemTemplate[] = []): SimSystemContext {
  const world = createWorld();
  return {
    world,
    registry: createMinimalRegistry(items),
    singletonEntities: {
      guild: addEntity(world),
      time: addEntity(world),
      building: addEntity(world),
    },
    runtimeState: {
      roomEntities: [],
      operatorEntities: [],
      raidOpportunityEntities: [],
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
      activeEncounter: null,
      interruptionQueue: { active: null, queue: [], nextInstanceId: 1 },
      incidentState: {
        pendingIncident: null,
        history: [],
        cooldowns: {},
        nextInstanceId: 1,
        lastEvaluationMinute: 0,
        pressureModifier: 0,
      },
      guidanceState: {
        seenBeatIds: [],
        completedBeatIds: [],
        dismissedBeatIds: [],
        activeBeatId: null,
        activeBeatView: null,
        queuedBeatIds: [],
        lastEvaluationMinute: 0,
        openingPathState: "completed",
        anchorResolutionFailures: [],
        activeBeatProgressBaseline: null,
        interactionCounts: {
          staffingActions: 0,
          upgradesPurchased: 0,
        },
        lastPurchasedUpgradeId: null,
      },
      combatPackageRegistry: buildCombatPackageRegistry([]),
      worldTimeFrozen: false,
      presenterUnlocks: [],
    },
  };
}

function addOperatorEntity(
  context: SimSystemContext,
  id: string,
  stats: {
    strength: number;
    speed: number;
    endurance: number;
    resilience: number;
    perception: number;
    intelligence: number;
  },
): number {
  const entity = addEntity(context.world);
  addComponent(context.world, entity, OperatorIdentity);
  OperatorIdentity.id[entity] = id;
  OperatorIdentity.name[entity] = id;
  OperatorIdentity.baseStrength[entity] = stats.strength;
  OperatorIdentity.baseSpeed[entity] = stats.speed;
  OperatorIdentity.baseEndurance[entity] = stats.endurance;
  OperatorIdentity.baseResilience[entity] = stats.resilience;
  OperatorIdentity.basePerception[entity] = stats.perception;
  OperatorIdentity.baseIntelligence[entity] = stats.intelligence;

  addComponent(context.world, entity, InjuryState);
  InjuryState.severity[entity] = 0;

  context.runtimeState.operatorEntities.push(entity);
  return entity;
}

function addEquipmentEntity(
  context: SimSystemContext,
  operatorId: string,
  equipment: { weaponId?: string; outfitOverlayId?: string; accessoryId?: string },
): number {
  const entity = addEntity(context.world);
  addComponent(context.world, entity, EquipmentAssignment);
  EquipmentAssignment.operatorId[entity] = operatorId;
  EquipmentAssignment.weaponId[entity] = equipment.weaponId ?? "";
  EquipmentAssignment.outfitOverlayId[entity] = equipment.outfitOverlayId ?? "";
  EquipmentAssignment.accessoryId[entity] = equipment.accessoryId ?? "";
  context.runtimeState.equipmentEntities.push(entity);
  return entity;
}

// ── Tests ─────────────────────────────────────────────────────────────────

describe("readOperatorBaseStats", () => {
  it("returns correct values from ECS component", () => {
    const context = createTestContext();
    const entity = addOperatorEntity(context, "operator/1", {
      strength: 10,
      speed: 8,
      endurance: 12,
      resilience: 6,
      perception: 9,
      intelligence: 7,
    });

    const stats = readOperatorBaseStats(entity);

    expect(stats).toEqual({
      strength: 10,
      speed: 8,
      endurance: 12,
      resilience: 6,
      perception: 9,
      intelligence: 7,
    });
  });
});

describe("collectStatModifiers", () => {
  it("includes gear stat effects correctly", () => {
    const weapon = createMockItemTemplate("weapon/pipe-wrench", [{ stat: "strength", value: 3 }]);
    const outfit = createMockItemTemplate("outfit-overlay/padded-jacket", [
      { stat: "resilience", value: 2 },
      { stat: "endurance", value: 1 },
    ]);
    const accessory = createMockItemTemplate("accessory/comm-earpiece", [
      { stat: "perception", value: 2 },
    ]);

    const context = createTestContext([weapon, outfit, accessory]);
    const entity = addOperatorEntity(context, "operator/1", {
      strength: 10,
      speed: 8,
      endurance: 12,
      resilience: 6,
      perception: 9,
      intelligence: 7,
    });

    addEquipmentEntity(context, "operator/1", {
      weaponId: "weapon/pipe-wrench",
      outfitOverlayId: "outfit-overlay/padded-jacket",
      accessoryId: "accessory/comm-earpiece",
    });

    const modifiers = collectStatModifiers(context, entity);

    expect(modifiers).toEqual(
      expect.arrayContaining([
        { source: "weapon/pipe-wrench", stat: "strength", value: 3 },
        { source: "outfit-overlay/padded-jacket", stat: "resilience", value: 2 },
        { source: "outfit-overlay/padded-jacket", stat: "endurance", value: 1 },
        { source: "accessory/comm-earpiece", stat: "perception", value: 2 },
      ]),
    );

    // Only gear modifiers — no injury modifiers since severity is 0
    const gearModifiers = modifiers.filter((m) => m.source !== "injury");
    expect(gearModifiers).toHaveLength(4);
  });

  it("returns no gear modifiers for empty equipment", () => {
    const context = createTestContext();
    const entity = addOperatorEntity(context, "operator/1", {
      strength: 10,
      speed: 8,
      endurance: 12,
      resilience: 6,
      perception: 9,
      intelligence: 7,
    });

    // No equipment entity at all
    const modifiers = collectStatModifiers(context, entity);
    expect(modifiers).toHaveLength(0);
  });

  it("returns no gear modifiers when equipment slots are empty strings", () => {
    const context = createTestContext();
    const entity = addOperatorEntity(context, "operator/1", {
      strength: 10,
      speed: 8,
      endurance: 12,
      resilience: 6,
      perception: 9,
      intelligence: 7,
    });

    addEquipmentEntity(context, "operator/1", {});

    const modifiers = collectStatModifiers(context, entity);
    expect(modifiers).toHaveLength(0);
  });

  it("includes injury penalty modifiers when severity > 0", () => {
    const context = createTestContext();
    const entity = addOperatorEntity(context, "operator/1", {
      strength: 10,
      speed: 8,
      endurance: 12,
      resilience: 6,
      perception: 9,
      intelligence: 7,
    });

    InjuryState.severity[entity] = 40;

    const modifiers = collectStatModifiers(context, entity);
    const injuryModifiers = modifiers.filter((m) => m.source === "injury");

    // -floor(40 * 0.15) = -floor(6) = -6
    expect(injuryModifiers).toHaveLength(6); // one per stat
    for (const modifier of injuryModifiers) {
      expect(modifier.value).toBe(-6);
    }
  });
});

describe("computeDerivedStats", () => {
  it("injury penalty reduces effective stats", () => {
    const context = createTestContext();
    const entity = addOperatorEntity(context, "operator/1", {
      strength: 10,
      speed: 8,
      endurance: 12,
      resilience: 6,
      perception: 9,
      intelligence: 7,
    });

    // No injury
    const healthy = computeDerivedStats(context, entity);

    // Apply injury
    InjuryState.severity[entity] = 60;
    const injured = computeDerivedStats(context, entity);

    // -floor(60 * 0.15) = -floor(9) = -9 per stat, clamped to minimum 1
    expect(injured.effective.strength).toBe(1); // 10 - 9 = 1
    expect(injured.effective.speed).toBe(1); // 8 - 9 = -1, clamped to 1
    expect(injured.effective.endurance).toBe(3); // 12 - 9 = 3
    expect(injured.effective.resilience).toBe(1); // 6 - 9 = -3, clamped to 1
    expect(injured.effective.perception).toBe(1); // 9 - 9 = 0, clamped to 1
    expect(injured.effective.intelligence).toBe(1); // 7 - 9 = -2, clamped to 1

    expect(injured.combatPower).toBeLessThan(healthy.combatPower);
  });

  it("gear changes produce different combatPower values", () => {
    const weapon = createMockItemTemplate("weapon/pipe-wrench", [{ stat: "strength", value: 3 }]);
    const betterWeapon = createMockItemTemplate("weapon/katana", [
      { stat: "speed", value: 4 },
      { stat: "strength", value: 5 },
    ]);

    const context = createTestContext([weapon, betterWeapon]);
    const entity = addOperatorEntity(context, "operator/1", {
      strength: 10,
      speed: 8,
      endurance: 12,
      resilience: 6,
      perception: 9,
      intelligence: 7,
    });

    const equipEntity = addEquipmentEntity(context, "operator/1", {
      weaponId: "weapon/pipe-wrench",
    });

    const withBasicWeapon = computeDerivedStats(context, entity);

    // Upgrade weapon
    EquipmentAssignment.weaponId[equipEntity] = "weapon/katana";
    const withBetterWeapon = computeDerivedStats(context, entity);

    expect(withBetterWeapon.combatPower).toBeGreaterThan(withBasicWeapon.combatPower);
  });

  it("empty equipment returns only base stats (no gear modifiers)", () => {
    const context = createTestContext();
    const entity = addOperatorEntity(context, "operator/1", {
      strength: 10,
      speed: 8,
      endurance: 12,
      resilience: 6,
      perception: 9,
      intelligence: 7,
    });

    const result = computeDerivedStats(context, entity);

    expect(result.modifiers).toHaveLength(0);
    expect(result.base).toEqual(result.effective);

    // Verify combatPower formula: (10*1.2 + 8*1.0 + 12*0.8 + 6*1.0 + 9*0.7 + 7*0.5) / 5.2
    const expected = (10 * 1.2 + 8 * 1.0 + 12 * 0.8 + 6 * 1.0 + 9 * 0.7 + 7 * 0.5) / 5.2;
    expect(result.combatPower).toBeCloseTo(expected, 10);
  });

  it("effective stats never go below 1", () => {
    const context = createTestContext();
    const entity = addOperatorEntity(context, "operator/1", {
      strength: 1,
      speed: 1,
      endurance: 1,
      resilience: 1,
      perception: 1,
      intelligence: 1,
    });

    // Max injury: severity 100 yields -floor(100 * 0.15) = -15 per stat
    InjuryState.severity[entity] = 100;

    const result = computeDerivedStats(context, entity);

    expect(result.effective.strength).toBe(1);
    expect(result.effective.speed).toBe(1);
    expect(result.effective.endurance).toBe(1);
    expect(result.effective.resilience).toBe(1);
    expect(result.effective.perception).toBe(1);
    expect(result.effective.intelligence).toBe(1);

    // Combat power should be the minimum viable: (1*1.2 + 1*1.0 + 1*0.8 + 1*1.0 + 1*0.7 + 1*0.5) / 5.2
    const minCombatPower = (1.2 + 1.0 + 0.8 + 1.0 + 0.7 + 0.5) / 5.2;
    expect(result.combatPower).toBeCloseTo(minCombatPower, 10);
    expect(result.combatPower).toBe(1);
  });

  it("combines gear bonuses and injury penalties correctly", () => {
    const weapon = createMockItemTemplate("weapon/big-sword", [{ stat: "strength", value: 10 }]);

    const context = createTestContext([weapon]);
    const entity = addOperatorEntity(context, "operator/1", {
      strength: 5,
      speed: 5,
      endurance: 5,
      resilience: 5,
      perception: 5,
      intelligence: 5,
    });

    addEquipmentEntity(context, "operator/1", {
      weaponId: "weapon/big-sword",
    });

    // Injury severity 20 => -floor(20 * 0.15) = -3 per stat
    InjuryState.severity[entity] = 20;

    const result = computeDerivedStats(context, entity);

    // strength: 5 + 10 (weapon) - 3 (injury) = 12
    expect(result.effective.strength).toBe(12);
    // speed: 5 - 3 (injury) = 2
    expect(result.effective.speed).toBe(2);
    // endurance: 5 - 3 (injury) = 2
    expect(result.effective.endurance).toBe(2);
  });
});

import { addComponent, addEntity } from "bitecs";
import { describe, expect, it } from "vitest";

import { templateRegistry as registry } from "content/templates";
import { getBuildingFloors, getBuildingLayout } from "content/building-layouts";
import {
  getHqBackdropManifestForBuilding,
  getHqEnvironmentRenderConfigForBuilding,
} from "lib/hq-environment-manifest";
import { DEFAULT_POLICY_STATE } from "lib/policies";
import { getAvailableContractRanksForReputation } from "./contract-economy";
import { applyEncounterCommand, type BossEncounterInstance } from "./encounter-commands";
import { advanceEconomySystem } from "./economy";
import { addToInventory, getInventoryCount } from "./inventory";
import { applySimCommand } from "./commands";
import { createSimTestContext } from "./test-context";
import type { SimSystemContext } from "./types";
import { advanceVisitorPoolSystem } from "./visitors";
import {
  BuildingAuthority,
  GuildState,
  RoomInstance,
  VisitorState,
  WorldTimeState,
} from "../components";

// ── Porter's building template ──────────────────────────────────────────

describe("Porter's building template", () => {
  it("has correct base stats", () => {
    const porters = registry.buildingById.get("building/porters");
    expect(porters).toBeTruthy();
    expect(porters!.baseRoomSlots).toBe(7);
    expect(porters!.baseOperatorSlots).toBe(12);
    expect(porters!.contractRankCeiling).toBe("d");
    expect(porters!.baseIncome).toBe(35);
    expect(porters!.recruitmentQualityBonus).toBe(1);
  });

  it("has four upgrades in correct order", () => {
    const porters = registry.buildingById.get("building/porters");
    expect(porters!.upgradeIds).toEqual([
      "upgrade/building/porters:kitchen_overhaul",
      "upgrade/building/porters:upstairs_conversion",
      "upgrade/building/porters:remodel",
      "upgrade/building/porters:waterfront",
    ]);
  });
});

// ── Porter's rooms ──────────────────────────────────────────────────────

describe("Porter's room templates", () => {
  const starterRoomIds = [
    "room/floor:tier_1",
    "room/bar:tier_1",
    "room/office:tier_1",
    "room/stockroom:tier_1",
    "room/infirmary:tier_1",
    "room/gym:tier_1",
    "room/prep_room:tier_1",
  ];

  const upgradedRoomIds = ["room/break_room:tier_1", "room/briefing_room:tier_1"];

  const waterfrontRoomIds = ["room/dock:tier_1", "room/deck:tier_1"];

  it("all starter rooms exist in registry", () => {
    for (const id of starterRoomIds) {
      expect(registry.roomById.has(id)).toBe(true);
    }
  });

  it("all upgrade-gated rooms exist in registry", () => {
    for (const id of [...upgradedRoomIds, ...waterfrontRoomIds]) {
      expect(registry.roomById.has(id)).toBe(true);
    }
  });

  it("all Porter's rooms are available in building/porters", () => {
    const allIds = [...starterRoomIds, ...upgradedRoomIds, ...waterfrontRoomIds];
    for (const id of allIds) {
      const room = registry.roomById.get(id)!;
      expect(room.availableInBuildings).toContain("building/porters");
    }
  });

  it("The Bar has recruitment tag", () => {
    const bar = registry.roomById.get("room/bar:tier_1")!;
    expect(bar.tags).toContain("ops:recruitment");
  });

  it("The Prep Room has staging tag", () => {
    const prepRoom = registry.roomById.get("room/prep_room:tier_1")!;
    expect(prepRoom.tags).toContain("ops:staging");
  });

  it("The Gym has training tag", () => {
    const gym = registry.roomById.get("room/gym:tier_1")!;
    expect(gym.tags).toContain("room:training");
  });

  it("The Infirmary has recovery and medical tags", () => {
    const infirmary = registry.roomById.get("room/infirmary:tier_1")!;
    expect(infirmary.tags).toContain("room:recovery");
    expect(infirmary.tags).toContain("staff:medical");
  });
});

// ── Porter's layout and floor support ───────────────────────────────────

describe("Porter's multi-floor layout", () => {
  it("starter layout has 2 floors", () => {
    const floors = getBuildingFloors("building/porters", 1);
    expect(floors).toHaveLength(2);
    expect(floors[0]!.floorIndex).toBe(0);
    expect(floors[1]!.floorIndex).toBe(1);
  });

  it("ground floor has 2 starter rooms", () => {
    const ground = getBuildingLayout("building/porters", 0, 1)!;
    const starterSlots = ground.slots.filter((s) => s.startingTemplateId);
    expect(starterSlots).toHaveLength(2);
  });

  it("upper floor has 5 starter rooms", () => {
    const upper = getBuildingLayout("building/porters", 1, 1)!;
    const starterSlots = upper.slots.filter((s) => s.startingTemplateId);
    expect(starterSlots).toHaveLength(5);
  });

  it("waterfront unlocks at tier 5", () => {
    const floorsTier4 = getBuildingFloors("building/porters", 4);
    expect(floorsTier4).toHaveLength(2);

    const floorsTier5 = getBuildingFloors("building/porters", 5);
    expect(floorsTier5).toHaveLength(3);
    expect(floorsTier5[2]!.floorIndex).toBe(2);
    expect(floorsTier5[2]!.elevationBandId).toBe("waterfront");
  });
});

// ── Porter's upgrade path ───────────────────────────────────────────────

describe("Porter's upgrade progression", () => {
  it("Kitchen Overhaul is quality only (no slot/cap changes)", () => {
    const upgrade = registry.upgradeById.get("upgrade/building/porters:kitchen_overhaul")!;
    const hasSlots = upgrade.effects.some(
      (e) => e.type === "add_room_slot" || e.type === "grant_operator_slot",
    );
    expect(hasSlots).toBe(false);
  });

  it("Upstairs Conversion adds 2 rooms, 2 ops, unlocks Break Room + Briefing Room", () => {
    const upgrade = registry.upgradeById.get("upgrade/building/porters:upstairs_conversion")!;

    const roomSlotEffect = upgrade.effects.find((e) => e.type === "add_room_slot");
    const opSlotEffect = upgrade.effects.find((e) => e.type === "grant_operator_slot");
    const unlockEffects = upgrade.effects.filter((e) => e.type === "unlock_room_template");

    expect(roomSlotEffect).toBeTruthy();
    expect((roomSlotEffect as { amount: number }).amount).toBe(2);
    expect(opSlotEffect).toBeTruthy();
    expect((opSlotEffect as { amount: number }).amount).toBe(2);
    expect(unlockEffects).toHaveLength(2);
  });

  it("The Remodel is quality only", () => {
    const upgrade = registry.upgradeById.get("upgrade/building/porters:remodel")!;
    const hasSlots = upgrade.effects.some(
      (e) => e.type === "add_room_slot" || e.type === "grant_operator_slot",
    );
    expect(hasSlots).toBe(false);
  });

  it("The Waterfront adds 2 rooms, 4 ops, unlocks Dock + Deck", () => {
    const upgrade = registry.upgradeById.get("upgrade/building/porters:waterfront")!;

    const roomSlotEffect = upgrade.effects.find((e) => e.type === "add_room_slot");
    const opSlotEffect = upgrade.effects.find((e) => e.type === "grant_operator_slot");
    const unlockEffects = upgrade.effects.filter((e) => e.type === "unlock_room_template");

    expect(roomSlotEffect).toBeTruthy();
    expect((roomSlotEffect as { amount: number }).amount).toBe(2);
    expect(opSlotEffect).toBeTruthy();
    expect((opSlotEffect as { amount: number }).amount).toBe(4);
    expect(unlockEffects).toHaveLength(2);
  });

  it("fully upgraded Porter's reaches 11 rooms and 18 operators", () => {
    let rooms = 7;
    let ops = 12;

    for (const upgradeId of registry.buildingById.get("building/porters")!.upgradeIds) {
      const upgrade = registry.upgradeById.get(upgradeId)!;
      for (const effect of upgrade.effects) {
        if (effect.type === "add_room_slot") rooms += effect.amount;
        if (effect.type === "grant_operator_slot") ops += effect.amount;
      }
    }

    expect(rooms).toBe(11);
    expect(ops).toBe(18);
  });
});

// ── Contract rank ceiling ───────────────────────────────────────────────

describe("contract rank ceiling", () => {
  it("bodega ceiling limits to F-rank only", () => {
    const ranks = getAvailableContractRanksForReputation(100, "f");
    expect(ranks).toEqual(["f"]);
  });

  it("Porter's ceiling allows up to D-rank", () => {
    const ranks = getAvailableContractRanksForReputation(100, "d");
    expect(ranks).toEqual(["f", "e", "d"]);
  });

  it("no ceiling returns all reputation-eligible ranks", () => {
    const ranks = getAvailableContractRanksForReputation(100);
    expect(ranks).toContain("s");
  });
});

// ── Prep Room consumable system ─────────────────────────────────────────

describe("Prep Room consumables", () => {
  it("consumable items exist in registry", () => {
    expect(registry.itemById.has("consumable/rift-tonic")).toBe(true);
    expect(registry.itemById.has("consumable/recovery-salve")).toBe(true);
    expect(registry.itemById.has("consumable/phase-ward")).toBe(true);
    expect(registry.itemById.has("consumable/endurance-draught")).toBe(true);
  });

  it("all consumables have category 'consumable'", () => {
    for (const item of registry.items) {
      if (item.id.startsWith("consumable/")) {
        expect(item.category).toBe("consumable");
      }
    }
  });

  it("all consumables have a consumable buff", () => {
    for (const item of registry.items) {
      if (item.category === "consumable") {
        expect(item.consumableBuff).toBeTruthy();
        expect(item.consumableBuff!.stat).toBeTruthy();
        expect(item.consumableBuff!.value).toBeGreaterThan(0);
        expect(item.consumableBuff!.durationMinutes).toBeGreaterThan(0);
      }
    }
  });

  it("prep recipes exist in registry", () => {
    expect(registry.prepRecipes).toHaveLength(4);
    expect(registry.prepRecipeById.has("prep-recipe/rift-tonic")).toBe(true);
    expect(registry.prepRecipeById.has("prep-recipe/recovery-salve")).toBe(true);
    expect(registry.prepRecipeById.has("prep-recipe/phase-ward")).toBe(true);
    expect(registry.prepRecipeById.has("prep-recipe/endurance-draught")).toBe(true);
  });

  it("all prep recipes reference valid items", () => {
    for (const recipe of registry.prepRecipes) {
      for (const input of recipe.inputs) {
        expect(registry.itemById.has(input.itemId)).toBe(true);
      }
      expect(registry.itemById.has(recipe.outputItemId)).toBe(true);
    }
  });

  it("all prep recipes require ops:staging room tag", () => {
    for (const recipe of registry.prepRecipes) {
      expect(recipe.requiredRoomTag).toBe("ops:staging");
    }
  });
});

// ── Prep Room staffing gate ────────────────────────────────────────────

describe("Prep Room staffing requirement", () => {
  it("Prep Room has staff:logistics tag", () => {
    const prepRoom = registry.roomById.get("room/prep_room:tier_1")!;
    expect(prepRoom.tags).toContain("staff:logistics");
  });
});

// ── Consumable raid-aid integration ───────────────────────────────────

describe("consumable items as raid aids", () => {
  it("all consumables have a consumableBuff with stat, value, and duration", () => {
    for (const item of registry.items) {
      if (item.category === "consumable") {
        expect(item.consumableBuff).toBeTruthy();
        expect(typeof item.consumableBuff!.stat).toBe("string");
        expect(item.consumableBuff!.value).toBeGreaterThan(0);
        expect(item.consumableBuff!.durationMinutes).toBeGreaterThan(0);
      }
    }
  });

  it("consumable items are not purchasable (prep only)", () => {
    for (const item of registry.items) {
      if (item.category === "consumable") {
        expect(item.buyPrice).toBe(0);
      }
    }
  });
});

// ── Porter's tuning hooks ─────────────────────────────────────────────

describe("Porter's tuning hooks are wired", () => {
  it("Porter's baseIncome is higher than bodega", () => {
    const bodega = registry.buildingById.get("building/bodega")!;
    const porters = registry.buildingById.get("building/porters")!;
    expect(porters.baseIncome).toBeGreaterThan(bodega.baseIncome ?? 0);
  });

  it("Porter's has a positive recruitmentQualityBonus", () => {
    const porters = registry.buildingById.get("building/porters")!;
    expect(porters.recruitmentQualityBonus).toBeGreaterThan(0);
  });

  it("bodega has no recruitmentQualityBonus", () => {
    const bodega = registry.buildingById.get("building/bodega")!;
    expect(bodega.recruitmentQualityBonus).toBeUndefined();
  });
});

// ── Behavior tests: prep production, consumable use, economy, visitors ──

function createPortersBehaviorContext(buildingIndex = 0): SimSystemContext {
  return createSimTestContext({
    registry,
    guild: {
      guildName: "Porters Test Guild",
      playerName: "Boss",
      reputation: 20,
      treasury: 1000,
      intel: 5,
    },
    time: {
      tick: 0,
      day: 2,
      minuteOfDay: 600,
    },
    building: {
      activeBuildingTemplateIndex: buildingIndex,
      policies: DEFAULT_POLICY_STATE,
      resourceIncomeModifiers: {},
      attractionWeightByTag: {
        "role:field_lead": 0,
        "role:scout": 0,
        "role:medic": 0,
      },
    },
  });
}

function addTestRoom(
  context: SimSystemContext,
  templateId: string,
  id: string,
  options: { operational?: boolean; staffed?: boolean } = {},
): number {
  const { operational = true, staffed = false } = options;
  const templateIndex = context.registry.rooms.findIndex((t) => t.id === templateId);
  if (templateIndex < 0) throw new Error(`Missing room template ${templateId}`);

  const template = context.registry.rooms[templateIndex];
  const entity = addEntity(context.world);
  addComponent(context.world, entity, RoomInstance);

  RoomInstance.id[entity] = id;
  RoomInstance.templateIndex[entity] = templateIndex;
  RoomInstance.tier[entity] = template.tier;
  RoomInstance.floorIndex[entity] = 0;
  RoomInstance.slotId[entity] = `${id}/slot`;
  RoomInstance.roomStateId[entity] = `${id}/state`;
  RoomInstance.capacity[entity] = template.baseCapacity;
  RoomInstance.occupancy[entity] = 0;
  RoomInstance.isRequestedActive[entity] = operational ? 1 : 0;
  RoomInstance.isOperational[entity] = operational ? 1 : 0;
  RoomInstance.assignedStaffCount[entity] = staffed ? 1 : 0;

  context.runtimeState.roomEntities.push(entity);
  return entity;
}

function runEconomyDay(buildingIndex: number): number {
  const context = createPortersBehaviorContext(buildingIndex);
  const building = context.singletonEntities.building;
  BuildingAuthority.lastPayrollDay[building] = 1;
  BuildingAuthority.resourceIncomeModifiers[building] = {};

  addTestRoom(context, "room/register:tier_1", "reception-room", { operational: true });

  const startCash = GuildState.treasury[context.singletonEntities.guild];
  advanceEconomySystem(context, 1);
  return GuildState.treasury[context.singletonEntities.guild] - startCash;
}

function spawnVisitorQuality(buildingIndex: number): number {
  const context = createPortersBehaviorContext(buildingIndex);
  const building = context.singletonEntities.building;
  BuildingAuthority.lastVisitorSpawnTick[building] = 0;

  const recruitTemplateId = buildingIndex === 0 ? "room/counter:tier_1" : "room/bar:tier_1";
  addTestRoom(context, recruitTemplateId, "recruit-room", {
    operational: true,
    staffed: true,
  });

  WorldTimeState.tick[context.singletonEntities.time] = 500_000;
  advanceVisitorPoolSystem(context, 60_000 * 400);

  const visitorEntities = context.runtimeState.visitorEntities;
  if (visitorEntities.length === 0) {
    return 0;
  }
  return VisitorState.quality[visitorEntities[0]];
}

describe("Prep Room production (behavior)", () => {
  it("succeeds when room is staffed and inputs are available", () => {
    const context = createPortersBehaviorContext(1);
    addTestRoom(context, "room/prep_room:tier_1", "prep-room", {
      operational: true,
      staffed: true,
    });

    // Stock the required inputs for Rift Tonic: 2 fang + 1 ichor
    addToInventory(context, "loot/monster-part/fang", 5);
    addToInventory(context, "loot/monster-part/ichor", 3);

    applySimCommand(context, { type: "sim/prep-consumable", recipeId: "prep-recipe/rift-tonic" });

    // Output produced
    expect(getInventoryCount(context, "consumable/rift-tonic")).toBe(1);
    // Inputs consumed
    expect(getInventoryCount(context, "loot/monster-part/fang")).toBe(3);
    expect(getInventoryCount(context, "loot/monster-part/ichor")).toBe(2);
  });

  it("fails silently when room is operational but not staffed", () => {
    const context = createPortersBehaviorContext(1);
    addTestRoom(context, "room/prep_room:tier_1", "prep-room", {
      operational: true,
      staffed: false,
    });

    addToInventory(context, "loot/monster-part/fang", 5);
    addToInventory(context, "loot/monster-part/ichor", 3);

    applySimCommand(context, { type: "sim/prep-consumable", recipeId: "prep-recipe/rift-tonic" });

    // No output produced, inputs untouched
    expect(getInventoryCount(context, "consumable/rift-tonic")).toBe(0);
    expect(getInventoryCount(context, "loot/monster-part/fang")).toBe(5);
  });

  it("fails silently when inputs are insufficient", () => {
    const context = createPortersBehaviorContext(1);
    addTestRoom(context, "room/prep_room:tier_1", "prep-room", {
      operational: true,
      staffed: true,
    });

    // Only 1 fang, recipe needs 2
    addToInventory(context, "loot/monster-part/fang", 1);
    addToInventory(context, "loot/monster-part/ichor", 3);

    applySimCommand(context, { type: "sim/prep-consumable", recipeId: "prep-recipe/rift-tonic" });

    expect(getInventoryCount(context, "consumable/rift-tonic")).toBe(0);
    expect(getInventoryCount(context, "loot/monster-part/fang")).toBe(1);
    expect(getInventoryCount(context, "loot/monster-part/ichor")).toBe(3);
  });
});

describe("Consumable encounter intervention (behavior)", () => {
  function createMinimalEncounter(): BossEncounterInstance {
    return {
      encounterId: "test-encounter",
      contractSiteId: "test-site",
      activeRaidId: "test-raid",
      missionId: "test-mission",
      teamId: "test-team",
      participatingOperatorIds: ["op-1"],
      bossDefinitionId: "test-boss",
      currentRound: 2,
      currentPhaseIndex: 0,
      status: "active",
      elapsedMinutes: 10,
      rngSeed: 42,
      rngCursor: 0,
      initiativeQueue: ["ally-1", "boss-1"],
      pendingRoundStart: false,
      actors: {
        "ally-1": {
          actorId: "ally-1",
          side: "ally",
          kind: "operator",
          label: "Test Op",
          sourceEntityId: "op-1",
          currentHp: 80,
          maxHp: 100,
          shield: 0,
          initiative: 10,
          baseAttack: 15,
          baseDefense: 10,
          baseSpeed: 12,
          baseThreat: 5,
          condition: "alive",
          activeStatuses: [],
          cooldowns: [],
          temporaryStatModifiers: {},
          actionHistory: [],
          operatorId: "op-1",
          roleTag: "role:field_lead",
        },
        "boss-1": {
          actorId: "boss-1",
          side: "enemy",
          kind: "boss",
          label: "Test Boss",
          sourceEntityId: "boss-def",
          currentHp: 500,
          maxHp: 500,
          shield: 0,
          initiative: 8,
          baseAttack: 20,
          baseDefense: 15,
          baseSpeed: 10,
          baseThreat: 10,
          condition: "alive",
          activeStatuses: [],
          cooldowns: [],
          temporaryStatModifiers: {},
          actionHistory: [],
        },
      },
      interventions: [{ interventionId: "consumable_boost", usesRemaining: 1 }],
      encounterLog: [],
      debugTraceEnabled: false,
      autoplayEnabled: false,
      autoplayIntervalMs: 500,
    };
  }

  it("consumes the specific item from inventory and applies its buff", () => {
    const context = createPortersBehaviorContext(1);
    context.runtimeState.activeEncounter = createMinimalEncounter();

    // Stock a specific consumable
    addToInventory(context, "consumable/recovery-salve", 2);

    applyEncounterCommand(context, "sim/encounter-use-intervention", {
      interventionId: "consumable_boost",
    });

    // One consumed
    expect(getInventoryCount(context, "consumable/recovery-salve")).toBe(1);

    // The encounter log should reflect the intervention was used
    const log = context.runtimeState.activeEncounter!.encounterLog;
    const interventionEntry = log.find((e) => e.actionKind === "intervention");
    expect(interventionEntry).toBeTruthy();

    // The ally should have received a resilience stat modifier (from recovery-salve buff)
    const ally = context.runtimeState.activeEncounter!.actors["ally-1"];
    expect(ally.temporaryStatModifiers["resilience"]).toBe(3);
  });

  it("does nothing when no consumable is in inventory", () => {
    const context = createPortersBehaviorContext(1);
    context.runtimeState.activeEncounter = createMinimalEncounter();

    applyEncounterCommand(context, "sim/encounter-use-intervention", {
      interventionId: "consumable_boost",
    });

    // Intervention not consumed (still available)
    const usage = context.runtimeState.activeEncounter!.interventions.find(
      (i) => i.interventionId === "consumable_boost",
    );
    expect(usage!.usesRemaining).toBe(1);
    expect(context.runtimeState.activeEncounter!.encounterLog).toHaveLength(0);
  });
});

describe("Porter's economy tuning (behavior)", () => {
  it("Porter's produces more income per reception room than bodega", () => {
    const bodegaIncome = runEconomyDay(0);
    const portersIncome = runEconomyDay(1);
    expect(portersIncome).toBeGreaterThan(bodegaIncome);
  });
});

describe("Porter's recruitment quality tuning (behavior)", () => {
  it("Porter's visitors spawn with higher quality than bodega baseline", () => {
    const bodegaQuality = spawnVisitorQuality(0);
    const portersQuality = spawnVisitorQuality(1);
    expect(portersQuality).toBeGreaterThan(bodegaQuality);
  });
});

describe("Porter's environment (data-driven)", () => {
  it("Porter's backdrop manifest has all four phases", () => {
    const manifest = getHqBackdropManifestForBuilding("building/porters");
    expect(manifest).toBeTruthy();
    expect(manifest!.profileId).toBe("porters-waterfront");
    expect(manifest!.phases.sunrise).toBeTruthy();
    expect(manifest!.phases.day).toBeTruthy();
    expect(manifest!.phases.sunset).toBeTruthy();
    expect(manifest!.phases.night).toBeTruthy();
  });

  it("Porter's backdrop is loaded from data index, not hardcoded", () => {
    const manifest = getHqBackdropManifestForBuilding("building/porters");
    expect(manifest!.elevationBandId).toBe("ground-floor");
  });

  it("Porter's render config has correct asset roots", () => {
    const config = getHqEnvironmentRenderConfigForBuilding("building/porters");
    expect(config.building).toBe("porters");
    expect(config.paths.partsRoot).toContain("porters");
  });

  it("bodega backdrop still loads correctly", () => {
    const manifest = getHqBackdropManifestForBuilding("building/bodega");
    expect(manifest).toBeTruthy();
    expect(manifest!.profileId).toBe("bodega-ground");
  });
});

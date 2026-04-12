import { describe, expect, it } from "vitest";
import { createWorld, addEntity, addComponent } from "bitecs";

import { templateRegistry } from "content/templates";
import type { BossTag, BossWeakness } from "content/templates/shared";
import { BuildingAuthority, OperatorIdentity } from "../components";
import { SeededRng, seedFromKey } from "../uncertainty";
import type { SimSystemContext } from "./types";
import { computeBossTagPenalty, computeBossWeaknessBonus, generateLootDrops } from "./raids";

// ── Test helpers ──────────────────────────────────────────────────────────

function createMinimalContext(): SimSystemContext {
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
      kitRegistry: {
        regularAttacks: [],
        skills: [],
        ultimates: [],
        passives: [],
        regularAttackById: new Map(),
        skillById: new Map(),
        ultimateById: new Map(),
        passiveById: new Map(),
      },
      worldTimeFrozen: false,
    },
  };
}

function createOperatorEntity(context: SimSystemContext, id: string, roleTag: string): number {
  const entity = addEntity(context.world);
  addComponent(context.world, entity, OperatorIdentity);
  OperatorIdentity.id[entity] = id;
  OperatorIdentity.name[entity] = id;
  OperatorIdentity.roleTag[entity] = roleTag;
  OperatorIdentity.specialtyTag[entity] = "";
  OperatorIdentity.lifecycleStatus[entity] = "active";
  context.runtimeState.operatorEntities.push(entity);
  return entity;
}

// ── Boss tag penalty tests ───────────────────────────────────────────────

describe("computeBossTagPenalty", () => {
  it("returns zero for an empty tag list", () => {
    expect(computeBossTagPenalty([])).toBe(0);
  });

  it("sums penalties for each recognized boss tag", () => {
    const tags: BossTag[] = ["boss:area-damage", "boss:summon-pressure"];
    // area-damage = 9, summon-pressure = 7
    expect(computeBossTagPenalty(tags)).toBe(16);
  });

  it("applies all six tag types correctly", () => {
    const allTags: BossTag[] = [
      "boss:resilience-pierce",
      "boss:recovery-suppress",
      "boss:speed-drain",
      "boss:summon-pressure",
      "boss:intel-resist",
      "boss:area-damage",
    ];
    // 8 + 6 + 5 + 7 + 4 + 9 = 39
    expect(computeBossTagPenalty(allTags)).toBe(39);
  });

  it("handles a single tag", () => {
    expect(computeBossTagPenalty(["boss:intel-resist"])).toBe(4);
    expect(computeBossTagPenalty(["boss:resilience-pierce"])).toBe(8);
  });
});

// ── Boss weakness bonus tests ────────────────────────────────────────────

describe("computeBossWeaknessBonus", () => {
  it("returns zero bonus when no operators match role weaknesses", () => {
    const context = createMinimalContext();
    const op = createOperatorEntity(context, "op/1", "role:medic");
    const weaknesses: BossWeakness[] = [
      { kind: "role", target: "role:field_lead", multiplier: 1.3 },
    ];

    const result = computeBossWeaknessBonus(weaknesses, [op]);
    expect(result.bonus).toBe(0);
    expect(result.exploitedWeaknesses).toHaveLength(0);
  });

  it("grants bonus when an operator has the matching role", () => {
    const context = createMinimalContext();
    const op = createOperatorEntity(context, "op/1", "role:field_lead");
    const weaknesses: BossWeakness[] = [
      { kind: "role", target: "role:field_lead", multiplier: 1.3 },
    ];

    const result = computeBossWeaknessBonus(weaknesses, [op]);
    expect(result.bonus).toBeCloseTo(8 * 1.3, 5);
    expect(result.exploitedWeaknesses).toContain("role:role:field_lead");
  });

  it("grants stat bonus when team has enough members", () => {
    const context = createMinimalContext();
    const op1 = createOperatorEntity(context, "op/1", "role:scout");
    const op2 = createOperatorEntity(context, "op/2", "role:medic");
    const weaknesses: BossWeakness[] = [{ kind: "stat", target: "resilience", multiplier: 1.25 }];

    const result = computeBossWeaknessBonus(weaknesses, [op1, op2]);
    expect(result.bonus).toBeCloseTo(4 * 1.25, 5);
    expect(result.exploitedWeaknesses).toContain("stat:resilience");
  });

  it("skips stat bonus for a single-operator team", () => {
    const context = createMinimalContext();
    const op = createOperatorEntity(context, "op/1", "role:scout");
    const weaknesses: BossWeakness[] = [{ kind: "stat", target: "resilience", multiplier: 1.25 }];

    const result = computeBossWeaknessBonus(weaknesses, [op]);
    expect(result.bonus).toBe(0);
    expect(result.exploitedWeaknesses).toHaveLength(0);
  });

  it("skips tag-type weaknesses (future feature)", () => {
    const context = createMinimalContext();
    const op = createOperatorEntity(context, "op/1", "role:scout");
    const weaknesses: BossWeakness[] = [{ kind: "tag", target: "tag:prepared", multiplier: 1.5 }];

    const result = computeBossWeaknessBonus(weaknesses, [op]);
    expect(result.bonus).toBe(0);
    expect(result.exploitedWeaknesses).toHaveLength(0);
  });

  it("stacks multiple weakness bonuses", () => {
    const context = createMinimalContext();
    const op1 = createOperatorEntity(context, "op/1", "role:scout");
    const op2 = createOperatorEntity(context, "op/2", "role:medic");
    const weaknesses: BossWeakness[] = [
      { kind: "role", target: "role:scout", multiplier: 1.35 },
      { kind: "stat", target: "perception", multiplier: 1.2 },
    ];

    const result = computeBossWeaknessBonus(weaknesses, [op1, op2]);
    // role bonus: 8 * 1.35 = 10.8, stat bonus: 4 * 1.2 = 4.8
    expect(result.bonus).toBeCloseTo(8 * 1.35 + 4 * 1.2, 5);
    expect(result.exploitedWeaknesses).toHaveLength(2);
  });
});

// ── Loot generation tests ────────────────────────────────────────────────

describe("generateLootDrops", () => {
  it("generates valid item ids for all result types without mission context", () => {
    const context = createMinimalContext();
    for (const result of ["success", "failure", "mixed"] as const) {
      const rng = new SeededRng(seedFromKey(`loot-test:${result}`));
      const loot = generateLootDrops(context, rng, result);
      loot.forEach((itemId) => {
        expect(templateRegistry.itemById.has(itemId)).toBe(true);
      });
    }
  });

  it("generates loot using combat profile drop tables when missionId is provided", () => {
    const context = createMinimalContext();
    const rng = new SeededRng(seedFromKey("loot-test:boss-clearance"));
    const loot = generateLootDrops(context, rng, "success", "mission/clearance");
    // On success with combat profile, we should get enemy group loot plus boss loot
    expect(loot.length).toBeGreaterThan(0);
    loot.forEach((itemId) => {
      expect(templateRegistry.itemById.has(itemId)).toBe(true);
    });
  });

  it("generates more loot on success than failure with combat profiles", () => {
    const context = createMinimalContext();
    const successLoot: string[] = [];
    const failureLoot: string[] = [];

    // Run multiple trials to smooth out RNG variance
    for (let i = 0; i < 20; i++) {
      const successRng = new SeededRng(seedFromKey(`loot-volume:success:${i}`));
      const failureRng = new SeededRng(seedFromKey(`loot-volume:failure:${i}`));
      successLoot.push(...generateLootDrops(context, successRng, "success", "mission/clearance"));
      failureLoot.push(...generateLootDrops(context, failureRng, "failure", "mission/clearance"));
    }

    expect(successLoot.length).toBeGreaterThan(failureLoot.length);
  });

  it("includes boss drop table loot on success with combat profile", () => {
    const context = createMinimalContext();
    // Run enough trials that boss loot appears at least once
    const allLoot: string[] = [];
    for (let i = 0; i < 30; i++) {
      const rng = new SeededRng(seedFromKey(`boss-loot:${i}`));
      allLoot.push(...generateLootDrops(context, rng, "success", "mission/clearance"));
    }
    // The boss drop table items should appear in the loot pool
    expect(allLoot.length).toBeGreaterThan(0);
  });

  it("falls back to legacy drop tables when no missionId is given", () => {
    const context = createMinimalContext();
    const rng = new SeededRng(seedFromKey("loot-test:legacy"));
    const loot = generateLootDrops(context, rng, "success");
    loot.forEach((itemId) => {
      expect(templateRegistry.itemById.has(itemId)).toBe(true);
    });
  });

  it("produces family-themed loot when a contract site is active", () => {
    const context = createMinimalContext();
    const buildingEntity = context.singletonEntities.building;
    addComponent(context.world, buildingEntity, BuildingAuthority);

    // Set up an active contract at the flooded subway tunnel
    BuildingAuthority.contractSite[buildingEntity] = {
      contractSiteId: "contract/test-themed",
      missionId: "mission/clearance",
      siteConceptId: "site/flooded-subway-tunnel",
      location: "district/lower-east-side",
      rank: "f",
      bossDefeated: false,
      contractLost: false,
      threat: 40,
      intel: 50,
      reward: 80,
      securedAtTick: 0,
      explorationProgress: 0,
      bossIntelProgress: 0,
      bossPressureProgress: 0,
      bossAvailable: false,
    };

    // Run enough trials to see themed loot from tunnel-crawlers
    const tunnelItems = new Set(["loot/monster-part/drain-sludge", "loot/monster-part/pipe-scale"]);
    const allLoot: string[] = [];
    for (let i = 0; i < 50; i++) {
      const rng = new SeededRng(seedFromKey(`themed-loot:${i}`));
      allLoot.push(...generateLootDrops(context, rng, "success", "mission/clearance"));
    }

    const themedDrops = allLoot.filter((id) => tunnelItems.has(id));
    expect(themedDrops.length).toBeGreaterThan(0);
  });
});

// ── Mission combat profile template tests ────────────────────────────────

describe("mission combat profiles", () => {
  it("all three missions have combat profiles", () => {
    for (const missionId of ["mission/clearance", "mission/containment", "mission/extraction"]) {
      const mission = templateRegistry.missionById.get(missionId);
      expect(mission).toBeDefined();
      expect(mission!.combatProfile).toBeDefined();
      expect(mission!.combatProfile!.boss).toBeDefined();
      expect(mission!.combatProfile!.enemyGroups.length).toBeGreaterThan(0);
    }
  });

  it("clearance mission has the Tunneler Brood-Mother boss", () => {
    const mission = templateRegistry.missionById.get("mission/clearance")!;
    const boss = mission.combatProfile!.boss!;
    expect(boss.bossId).toBe("boss/tunneler-brood-mother");
    expect(boss.phases).toBe(2);
    expect(boss.tags).toContain("boss:area-damage");
    expect(boss.tags).toContain("boss:summon-pressure");
    expect(boss.weaknesses).toHaveLength(1);
    expect(boss.weaknesses[0].kind).toBe("role");
  });

  it("containment mission has the Sewer Warden boss", () => {
    const mission = templateRegistry.missionById.get("mission/containment")!;
    const boss = mission.combatProfile!.boss!;
    expect(boss.bossId).toBe("boss/sewer-warden");
    expect(boss.phases).toBe(1);
    expect(boss.tags).toContain("boss:resilience-pierce");
    expect(boss.weaknesses[0].kind).toBe("stat");
    expect(boss.weaknesses[0].target).toBe("resilience");
  });

  it("extraction mission has the Phantom Stalker boss", () => {
    const mission = templateRegistry.missionById.get("mission/extraction")!;
    const boss = mission.combatProfile!.boss!;
    expect(boss.bossId).toBe("boss/phantom-stalker");
    expect(boss.phases).toBe(2);
    expect(boss.tags).toContain("boss:speed-drain");
    expect(boss.tags).toContain("boss:intel-resist");
    expect(boss.weaknesses).toHaveLength(2);
    expect(boss.weaknesses[0].kind).toBe("role");
    expect(boss.weaknesses[1].kind).toBe("stat");
  });

  it("boss drop tables reference valid drop table ids in the registry", () => {
    for (const mission of templateRegistry.missions) {
      const profile = mission.combatProfile;
      if (!profile) continue;
      for (const group of profile.enemyGroups) {
        expect(templateRegistry.dropTableById.has(group.dropTableId)).toBe(true);
      }
      if (profile.boss) {
        expect(templateRegistry.dropTableById.has(profile.boss.dropTableId)).toBe(true);
      }
    }
  });

  it("boss tag penalties match expected values for each mission boss", () => {
    const clearanceBoss =
      templateRegistry.missionById.get("mission/clearance")!.combatProfile!.boss!;
    // area-damage(9) + summon-pressure(7) = 16
    expect(computeBossTagPenalty(clearanceBoss.tags)).toBe(16);

    const containmentBoss =
      templateRegistry.missionById.get("mission/containment")!.combatProfile!.boss!;
    // resilience-pierce(8) + recovery-suppress(6) = 14
    expect(computeBossTagPenalty(containmentBoss.tags)).toBe(14);

    const extractionBoss =
      templateRegistry.missionById.get("mission/extraction")!.combatProfile!.boss!;
    // speed-drain(5) + intel-resist(4) = 9
    expect(computeBossTagPenalty(extractionBoss.tags)).toBe(9);
  });
});

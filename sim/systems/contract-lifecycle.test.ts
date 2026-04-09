import { describe, expect, it } from "vitest";
import { createWorld, addEntity, addComponent } from "bitecs";

import { templateRegistry } from "content/templates";
import { siteConceptTemplates, siteConceptById } from "content/templates/site-concepts";
import { BuildingAuthority, GuildState, WorldTimeState } from "../components";
import type { BossEncounterInstance } from "./encounter-types";
import type { SimSystemContext } from "./types";
import {
  advanceContractPhase,
  bidOnContract,
  resolveRaidBossEncounter,
  resolveRaidSystem,
} from "./raids";

// ── Test helpers ──────────────────────────────────────────────────────────

function createFullContext(): SimSystemContext {
  const world = createWorld();
  const guildEntity = addEntity(world);
  const timeEntity = addEntity(world);
  const buildingEntity = addEntity(world);

  addComponent(world, guildEntity, GuildState);
  addComponent(world, timeEntity, WorldTimeState);
  addComponent(world, buildingEntity, BuildingAuthority);

  GuildState.reputation[guildEntity] = 10;
  GuildState.treasury[guildEntity] = 500;
  GuildState.intel[guildEntity] = 2;

  WorldTimeState.tick[timeEntity] = 1440;
  WorldTimeState.day[timeEntity] = 1;
  WorldTimeState.minuteOfDay[timeEntity] = 0;

  BuildingAuthority.contractSite[buildingEntity] = null;
  BuildingAuthority.fogOfWar[buildingEntity] = null;
  BuildingAuthority.contractLifecycle[buildingEntity] = "bidding";
  BuildingAuthority.postedContracts[buildingEntity] = [];
  BuildingAuthority.contractResult[buildingEntity] = null;
  BuildingAuthority.raidSummaries[buildingEntity] = [];
  BuildingAuthority.activeRaidPackets[buildingEntity] = [];
  BuildingAuthority.lastRaidOpportunityTick[buildingEntity] = 0;
  BuildingAuthority.pressure[buildingEntity] = 0;

  return {
    world,
    registry: templateRegistry,
    singletonEntities: { guild: guildEntity, time: timeEntity, building: buildingEntity },
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

// ── Site concept template tests ──────────────────────────────────────────

describe("site concept templates", () => {
  it("has at least 6 site concepts", () => {
    expect(siteConceptTemplates.length).toBeGreaterThanOrEqual(6);
  });

  it("all site concepts have required fields", () => {
    for (const concept of siteConceptTemplates) {
      expect(concept.siteConceptId).toBeTruthy();
      expect(concept.name).toBeTruthy();
      expect(concept.districtPool.length).toBeGreaterThan(0);
      expect(concept.rankPool.length).toBeGreaterThan(0);
      expect(concept.enemyFamilyIds.length).toBeGreaterThan(0);
      expect(concept.bossId).toBeTruthy();
      expect(concept.lootThemeLabels.length).toBeGreaterThan(0);
      expect(concept.visualTheme.accentPalette).toBeTruthy();
    }
  });

  it("has both F and E rank concepts", () => {
    const fRankConcepts = siteConceptTemplates.filter((c) => c.rankPool.includes("f"));
    const eRankConcepts = siteConceptTemplates.filter((c) => c.rankPool.includes("e"));
    expect(fRankConcepts.length).toBeGreaterThanOrEqual(2);
    expect(eRankConcepts.length).toBeGreaterThanOrEqual(2);
  });

  it("different concepts have different loot families", () => {
    const lootSets = siteConceptTemplates.map((c) => c.lootThemeLabels.join(","));
    const uniqueSets = new Set(lootSets);
    expect(uniqueSets.size).toBeGreaterThanOrEqual(4);
  });

  it("lookup map contains all concepts", () => {
    for (const concept of siteConceptTemplates) {
      expect(siteConceptById.get(concept.siteConceptId)).toBe(concept);
    }
  });
});

// ── Contract bidding tests ───────────────────────────────────────────────

describe("bidOnContract", () => {
  it("secures a posted contract and enters active phase", () => {
    const context = createFullContext();
    const buildingEntity = context.singletonEntities.building;

    // Set up a posting
    BuildingAuthority.postedContracts[buildingEntity] = [
      {
        postingId: "posting/test/0",
        missionId: "mission/clearance",
        siteConceptId: "site/flooded-subway-tunnel",
        location: "district/lower-east-side",
        rank: "f",
        threat: 40,
        intel: 50,
        reward: 80,
        risk: 35,
        bidCost: 6,
        minReputation: 0,
        generatedAtTick: 1440,
        knownTraits: ["threat:clustered"],
        hiddenTraitCount: 1,
        enemyHints: ["enemy-family/tunnel-crawlers"],
        lootFamilyHints: ["Tunnel Salvage"],
        bossHint: null,
        neighborhoodLabel: "lower east side",
        boardIntel: { source: "street", quality: "rough" },
      },
    ];

    const result = bidOnContract(context, "posting/test/0");

    expect(result).toBe(true);
    expect(BuildingAuthority.contractLifecycle[buildingEntity]).toBe("active");
    expect(BuildingAuthority.contractSite[buildingEntity]).not.toBeNull();
    expect(BuildingAuthority.contractSite[buildingEntity]!.siteConceptId).toBe(
      "site/flooded-subway-tunnel",
    );
    expect(BuildingAuthority.contractSite[buildingEntity]!.rank).toBe("f");
    expect(BuildingAuthority.contractSite[buildingEntity]!.explorationProgress).toBe(0);
    expect(BuildingAuthority.contractSite[buildingEntity]!.bossAvailable).toBe(false);
    expect(BuildingAuthority.postedContracts[buildingEntity]).toHaveLength(0);
    expect(BuildingAuthority.fogOfWar[buildingEntity]).not.toBeNull();
  });

  it("deducts bid cost from treasury", () => {
    const context = createFullContext();
    const buildingEntity = context.singletonEntities.building;
    const guildEntity = context.singletonEntities.guild;
    const initialTreasury = GuildState.treasury[guildEntity];

    BuildingAuthority.postedContracts[buildingEntity] = [
      {
        postingId: "posting/test/0",
        missionId: "mission/clearance",
        siteConceptId: "site/flooded-subway-tunnel",
        location: "district/lower-east-side",
        rank: "f",
        threat: 40,
        intel: 50,
        reward: 80,
        risk: 35,
        bidCost: 10,
        minReputation: 0,
        generatedAtTick: 1440,
        knownTraits: [],
        hiddenTraitCount: 0,
        enemyHints: [],
        lootFamilyHints: [],
        bossHint: null,
        neighborhoodLabel: "lower east side",
        boardIntel: { source: "street", quality: "rough" },
      },
    ];

    bidOnContract(context, "posting/test/0");
    expect(GuildState.treasury[guildEntity]).toBe(initialTreasury - 10);
  });

  it("rejects bid when reputation is insufficient", () => {
    const context = createFullContext();
    const buildingEntity = context.singletonEntities.building;

    GuildState.reputation[context.singletonEntities.guild] = 0;

    BuildingAuthority.postedContracts[buildingEntity] = [
      {
        postingId: "posting/test/0",
        missionId: "mission/clearance",
        siteConceptId: "site/flooded-subway-tunnel",
        location: "district/lower-east-side",
        rank: "e",
        threat: 50,
        intel: 50,
        reward: 100,
        risk: 45,
        bidCost: 8,
        minReputation: 3,
        generatedAtTick: 1440,
        knownTraits: [],
        hiddenTraitCount: 0,
        enemyHints: [],
        lootFamilyHints: [],
        bossHint: null,
        neighborhoodLabel: "lower east side",
        boardIntel: { source: "street", quality: "rough" },
      },
    ];

    const result = bidOnContract(context, "posting/test/0");
    expect(result).toBe(false);
    expect(BuildingAuthority.contractLifecycle[buildingEntity]).toBe("bidding");
  });

  it("rejects bid when treasury is insufficient", () => {
    const context = createFullContext();
    const buildingEntity = context.singletonEntities.building;

    GuildState.treasury[context.singletonEntities.guild] = 2;

    BuildingAuthority.postedContracts[buildingEntity] = [
      {
        postingId: "posting/test/0",
        missionId: "mission/clearance",
        siteConceptId: "site/flooded-subway-tunnel",
        location: "district/lower-east-side",
        rank: "f",
        threat: 40,
        intel: 50,
        reward: 80,
        risk: 35,
        bidCost: 10,
        minReputation: 0,
        generatedAtTick: 1440,
        knownTraits: [],
        hiddenTraitCount: 0,
        enemyHints: [],
        lootFamilyHints: [],
        bossHint: null,
        neighborhoodLabel: "lower east side",
        boardIntel: { source: "street", quality: "rough" },
      },
    ];

    const result = bidOnContract(context, "posting/test/0");
    expect(result).toBe(false);
  });

  it("rejects bid for unknown posting id", () => {
    const context = createFullContext();
    const result = bidOnContract(context, "posting/nonexistent");
    expect(result).toBe(false);
  });

  it("rejects bid when not in bidding phase", () => {
    const context = createFullContext();
    const buildingEntity = context.singletonEntities.building;

    BuildingAuthority.contractLifecycle[buildingEntity] = "active";
    BuildingAuthority.postedContracts[buildingEntity] = [
      {
        postingId: "posting/test/0",
        missionId: "mission/clearance",
        siteConceptId: "site/flooded-subway-tunnel",
        location: "district/lower-east-side",
        rank: "f",
        threat: 40,
        intel: 50,
        reward: 80,
        risk: 35,
        bidCost: 6,
        minReputation: 0,
        generatedAtTick: 1440,
        knownTraits: [],
        hiddenTraitCount: 0,
        enemyHints: [],
        lootFamilyHints: [],
        bossHint: null,
        neighborhoodLabel: "lower east side",
        boardIntel: { source: "street", quality: "rough" },
      },
    ];

    const result = bidOnContract(context, "posting/test/0");
    expect(result).toBe(false);
  });
});

// ── Contract lifecycle advancement tests ─────────────────────────────────

describe("advanceContractPhase", () => {
  it("advances from resolved to bidding", () => {
    const context = createFullContext();
    const buildingEntity = context.singletonEntities.building;

    BuildingAuthority.contractLifecycle[buildingEntity] = "resolved";
    BuildingAuthority.contractResult[buildingEntity] = {
      contractSiteId: "contract/test",
      missionId: "mission/clearance",
      siteConceptId: "site/flooded-subway-tunnel",
      location: "district/lower-east-side",
      rank: "f",
      outcome: "boss_defeated",
      totalRaids: 2,
      totalCashEarned: 160,
      totalReputationEarned: 6,
      operatorDeaths: 0,
      resolvedAtTick: 1440,
    };

    advanceContractPhase(context);

    expect(BuildingAuthority.contractLifecycle[buildingEntity]).toBe("bidding");
    expect(BuildingAuthority.postedContracts[buildingEntity].length).toBeGreaterThan(0);
    expect(BuildingAuthority.contractResult[buildingEntity]?.contractSiteId).toBe("contract/test");
  });

  it("does nothing when already in bidding phase", () => {
    const context = createFullContext();
    const buildingEntity = context.singletonEntities.building;

    BuildingAuthority.contractLifecycle[buildingEntity] = "bidding";

    advanceContractPhase(context);

    // Should not regenerate board
    expect(BuildingAuthority.contractLifecycle[buildingEntity]).toBe("bidding");
  });

  it("does nothing when in active phase", () => {
    const context = createFullContext();
    const buildingEntity = context.singletonEntities.building;

    BuildingAuthority.contractLifecycle[buildingEntity] = "active";

    advanceContractPhase(context);

    expect(BuildingAuthority.contractLifecycle[buildingEntity]).toBe("active");
  });
});

// ── No raids during bidding ──────────────────────────────────────────────

describe("no raids during bidding", () => {
  it("bid phase has no contract site", () => {
    const context = createFullContext();
    const buildingEntity = context.singletonEntities.building;

    BuildingAuthority.contractLifecycle[buildingEntity] = "bidding";

    // Contract site should remain null during bidding
    expect(BuildingAuthority.contractSite[buildingEntity]).toBeNull();
  });

  it("generates a contract board without auto-securing a contract", () => {
    const context = createFullContext();
    const buildingEntity = context.singletonEntities.building;

    resolveRaidSystem(context, 0);

    expect(BuildingAuthority.contractLifecycle[buildingEntity]).toBe("bidding");
    expect(BuildingAuthority.contractSite[buildingEntity]).toBeNull();
    expect(BuildingAuthority.postedContracts[buildingEntity].length).toBeGreaterThan(0);
  });
});

describe("resolved contract handoff", () => {
  it("enters resolved phase, clears the active site, and waits for player advance", () => {
    const context = createFullContext();
    const buildingEntity = context.singletonEntities.building;

    BuildingAuthority.contractLifecycle[buildingEntity] = "active";
    BuildingAuthority.contractSite[buildingEntity] = {
      contractSiteId: "contract/test",
      missionId: "mission/clearance",
      siteConceptId: "site/flooded-subway-tunnel",
      location: "district/lower-east-side",
      rank: "f",
      bossDefeated: true,
      contractLost: false,
      threat: 40,
      intel: 55,
      reward: 90,
      securedAtTick: 1200,
      explorationProgress: 84,
      bossIntelProgress: 60,
      bossPressureProgress: 75,
      bossAvailable: true,
    };

    resolveRaidSystem(context, 0);

    expect(BuildingAuthority.contractLifecycle[buildingEntity]).toBe("resolved");
    expect(BuildingAuthority.contractSite[buildingEntity]).toBeNull();
    expect(BuildingAuthority.contractResult[buildingEntity]).not.toBeNull();
    expect(BuildingAuthority.postedContracts[buildingEntity]).toHaveLength(0);
  });

  it("resolves the contract immediately after a boss encounter victory writes back", () => {
    const context = createFullContext();
    const buildingEntity = context.singletonEntities.building;

    BuildingAuthority.contractLifecycle[buildingEntity] = "active";
    BuildingAuthority.contractSite[buildingEntity] = {
      contractSiteId: "contract/test",
      missionId: "mission/clearance",
      siteConceptId: "site/flooded-subway-tunnel",
      location: "district/lower-east-side",
      rank: "f",
      bossDefeated: false,
      missionCompleted: false,
      contractLost: false,
      threat: 40,
      intel: 55,
      reward: 90,
      boardIntel: { source: "street", quality: "rough" },
      briefing: null,
      securedAtTick: 1200,
      explorationProgress: 84,
      closureProgress: 92,
      closureThreshold: 100,
      bossIntelProgress: 60,
      bossPressureProgress: 75,
      requiresBossClear: true,
      bossAvailable: true,
    };
    BuildingAuthority.activeRaidPackets[buildingEntity] = [
      {
        id: "raid/test",
        contractSiteId: "contract/test",
        opportunityId: "opportunity/test",
        missionId: "mission/clearance",
        location: "district/lower-east-side",
        startedAt: "Day 1 11:00",
        startedTick: 1380,
        revealProgress: 100,
        operatorIds: [],
        returnTick: 1500,
        durationHours: 2,
        threat: 40,
        intel: 55,
        reward: 90,
        cohesion: 60,
        briefingSource: null,
        briefingStatus: null,
        resolutionPacket: {
          result: "mixed",
          reputationDelta: 0,
          cashDelta: 0,
          operatorOutcomes: [],
          narrativeTags: [],
          intelMismatchTags: [],
        },
      },
    ];

    const encounter: BossEncounterInstance = {
      encounterId: "encounter/test",
      contractSiteId: "contract/test",
      activeRaidId: "raid/test",
      missionId: "mission/clearance",
      teamId: "team/test",
      participatingOperatorIds: [],
      bossDefinitionId: "boss/tunneler-brood-mother",
      currentRound: 3,
      currentPhaseIndex: 0,
      status: "victory",
      elapsedMinutes: 12,
      rngSeed: 1,
      rngCursor: 0,
      initiativeQueue: [],
      pendingRoundStart: false,
      actors: {
        "actor:boss:test": {
          actorId: "actor:boss:test",
          side: "enemy",
          kind: "boss",
          label: "Tunneler Brood-Mother",
          sourceEntityId: "boss/tunneler-brood-mother",
          currentHp: 0,
          maxHp: 100,
          shield: 0,
          initiative: 10,
          baseAttack: 20,
          baseDefense: 12,
          baseSpeed: 8,
          baseThreat: 50,
          condition: "incapacitated",
          activeStatuses: [],
          cooldowns: [],
          temporaryStatModifiers: {},
          actionHistory: [],
          bossDefinitionId: "boss/tunneler-brood-mother",
          encounterActions: [],
        },
      },
      interventions: [],
      encounterLog: [],
      debugTraceEnabled: false,
      autoplayEnabled: false,
      autoplayIntervalMs: 800,
    };

    expect(resolveRaidBossEncounter(context, encounter)).toBe(true);
    expect(BuildingAuthority.contractLifecycle[buildingEntity]).toBe("resolved");
    expect(BuildingAuthority.contractSite[buildingEntity]).toBeNull();
    expect(BuildingAuthority.contractResult[buildingEntity]?.outcome).toBe("boss_defeated");
    expect(BuildingAuthority.raidSummaries[buildingEntity]).toHaveLength(1);
  });
});

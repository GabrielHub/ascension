import { describe, expect, it } from "vitest";
import { getRoomActiveFootprint, getRoomStateId } from "lib/hq-room-state";
import { DEFAULT_POLICY_STATE } from "lib/policies";
import { readyToWireRivals } from "content/templates/rivals";

import {
  CURRENT_CONTENT_COMPATIBILITY,
  CURRENT_SAVE_SCHEMA_VERSION,
  type PersistedSaveGame,
} from "./types";
import {
  SaveValidationError,
  hydratePersistedSaveGame,
  preparePersistedSaveGameForStorage,
} from "./codec";

function createBaseSave(): PersistedSaveGame {
  return {
    slotId: "slot/1",
    schemaVersion: CURRENT_SAVE_SCHEMA_VERSION,
    compatibilityVersion: CURRENT_CONTENT_COMPATIBILITY,
    metadata: {
      guildName: "Bodega Guild",
      playerName: "Boss",
      createdAt: "2026-03-20T12:00:00.000Z",
      lastPlayedAt: "2026-03-20T12:00:00.000Z",
    },
    world: {
      simulationSeed: 0,
      guild: {
        guildName: "Bodega Guild",
        playerName: "Boss",
        reputation: 3,
        treasury: 1250,
        intel: 7,
      },
      time: {
        tick: 42,
        day: 3,
        minuteOfDay: 720,
      },
      building: {
        activeBuildingId: "building/bodega",
        activeBuildingTier: 2,
        activeFloorIndex: 0,
        roomSlotCount: 4,
        operatorSlotCount: 3,
      },
      rooms: [
        {
          id: "room-instance/front-desk",
          templateId: "room/register:tier_1",
          tier: 1,
          floorIndex: 0,
          slotId: "slot/register",
          roomStateId: getRoomStateId("room/register:tier_1", []),
          capacity: 2,
          occupancy: 1,
          isActive: true,
          reservedFootprint: {
            col: 0,
            row: 0,
            cols: 4,
            rows: 3,
          },
          activeFootprint: getRoomActiveFootprint(
            "room/register:tier_1",
            {
              col: 0,
              row: 0,
              cols: 4,
              rows: 3,
            },
            [],
          ),
        },
      ],
      activeRaidPackets: [
        {
          id: "raid/1",
          opportunityId: "opportunity/1",
          contractSiteId: "contract/42",
          missionId: "mission/clearance",
          location: "district/lower-east-side",
          startedAt: "2026-03-20T12:05:00.000Z",
          startedTick: 3005,
          revealProgress: 45,
          operatorIds: ["operator/1"],
          returnTick: 3185,
          durationHours: 3,
          threat: 83,
          intel: 59,
          reward: 180,
          cohesion: 64,
          resolutionPacket: {
            result: "success",
            reputationDelta: 7,
            cashDelta: 132,
            operatorOutcomes: [
              {
                operatorId: "operator/1",
                injuryDelta: 2,
                moraleDelta: 6,
                loyaltyDelta: 3,
                status: "steady",
              },
            ],
            narrativeTags: ["mission:clearance", "result:success"],
            intelMismatchTags: [],
          },
        },
      ],
      raidSummaries: [
        {
          id: "raid/0",
          opportunityId: "opportunity/legacy-0",
          contractSiteId: "contract/legacy-0",
          missionId: "mission/extraction",
          location: "district/bronx-overpass",
          startedAt: "2026-03-20T11:00:00.000Z",
          endedAt: "2026-03-20T11:20:00.000Z",
          result: "success",
          reputationDelta: 2,
          cashDelta: 180,
          threat: 54,
          intel: 47,
          reward: 180,
          cohesion: 58,
          operatorOutcomes: [
            {
              operatorId: "operator/1",
              injuryDelta: 0,
              moraleDelta: 4,
              loyaltyDelta: 1,
              status: "steady",
            },
          ],
          narrativeTags: ["raid:clean_exit"],
          intelMismatchTags: ["intel:underestimated_resistance"],
        },
      ],
      appliedUpgradeIds: ["upgrade/building/bodega:frontage"],
      operators: [
        {
          id: "operator/1",
          lifecycle: { status: "active" as const },
          identity: {
            displayName: "Rook",
            roleTag: "role:field_lead",
          },
          preferences: {
            preferredMissionTags: ["mission:clearance"],
          },
          schedule: {
            workStartMinute: 480,
            workEndMinute: 1080,
            currentBlock: "raid",
          },
          needs: {
            rest: 0.2,
          },
          morale: {
            value: 7,
          },
          loyalty: {
            value: 6,
          },
          injury: {
            state: "none",
          },
          assignment: {
            kind: "raid",
            targetId: "raid/1",
          },
          appearance: {
            presetId: "mira-002",
          },
          combat: {
            rank: "f",
            attunementTag: "attunement:kinetic",
            traits: ["trait:steady"],
            combatPackageId: "package/field-lead/kinetic/standard",
            blocks: 0,
            baseStats: {
              strength: 14,
              speed: 8,
              endurance: 13,
              resilience: 10,
              perception: 7,
              intelligence: 8,
            },
          },
        },
      ],
      operatorRelationships: [
        {
          operatorAId: "operator/1",
          operatorBId: "operator/2",
          trust: 18,
          friction: 4,
          familiarity: 9,
          recentSharedOutcome: 3,
          historyTags: ["history:trained_together"],
        },
      ],
      visitors: [
        {
          id: "visitor/1",
          queueStage: "register",
        },
      ],
      raidOpportunities: [
        {
          id: "opportunity/1",
          missionId: "mission/containment",
          location: "district/harbor",
          threat: 46,
          intel: 38,
          reward: 92,
          risk: 44,
          status: "open",
          interestedOperatorIds: ["operator/1"],
          claimedOperatorIds: [],
          createdTick: 2800,
          expiresAtTick: 3240,
        },
      ],
      activeEvents: [
        {
          id: "event/personnel_conflict",
          templateId: "event/personnel_conflict",
          severity: 2,
          remainingHours: 6,
          pressureContribution: 12,
        },
      ],
      contractLifecycle: "active",
      contractSite: {
        contractSiteId: "contract/42",
        missionId: "mission/clearance",
        siteConceptId: "site/flooded-subway-tunnel",
        location: "district/lower-east-side",
        rank: "f",
        bossDefeated: false,
        contractLost: false,
        threat: 83,
        intel: 59,
        reward: 180,
        securedAtTick: 3000,
        explorationProgress: 45,
        bossIntelProgress: 18,
        bossPressureProgress: 12,
        bossAvailable: false,
      },
      fogOfWar: {
        gridWidth: 16,
        gridHeight: 16,
        revealed: Array.from({ length: 16 * 16 }, () => false),
        revealedCount: 0,
      },
      policies: { ...DEFAULT_POLICY_STATE },
      scheduler: {
        lastPayrollDay: 3,
        lastVisitorSpawnTick: 42,
        lastEventTick: 42,
        lastRaidOpportunityTick: 42,
      },
    },
  };
}

function createOperatorAppearancePartsIndex() {
  return {
    parts: [
      {
        id: "weapon/cleaver",
        category: "weapon",
        tags: ["weapon", "melee"],
        paletteTags: ["metal"],
        roleTags: ["role:bruiser"],
        bodyCompatibility: ["broad"],
        poseCompatibility: ["raid"],
        rarity: "common",
      },
      {
        id: "outfit-overlay/apron",
        category: "outfit-overlay",
        tags: ["outfit", "utility"],
        paletteTags: ["cloth"],
        roleTags: ["role:staff"],
        bodyCompatibility: ["medium"],
        poseCompatibility: ["hq", "raid"],
        rarity: "common",
      },
      {
        id: "accessory/chain",
        category: "accessory",
        tags: ["accessory"],
        paletteTags: ["metal"],
        roleTags: ["role:scout"],
        bodyCompatibility: ["lean"],
        poseCompatibility: ["raid"],
        rarity: "uncommon",
      },
    ],
  };
}

function createCodecOptions() {
  return {
    operatorAppearancePartsIndex: createOperatorAppearancePartsIndex(),
  };
}

describe("save codec", () => {
  it("normalizes current-schema saves with missing Phase 1 collections", () => {
    const base = createBaseSave();
    const normalized = preparePersistedSaveGameForStorage({
      ...base,
      world: {
        guild: base.world.guild,
        time: base.world.time,
        building: base.world.building,
        rooms: base.world.rooms,
        activeRaidPackets: [],
        raidSummaries: [],
        appliedUpgradeIds: [],
      },
    });

    expect(normalized.schemaVersion).toBe(CURRENT_SAVE_SCHEMA_VERSION);
    expect(normalized.world.operators).toBeUndefined();
    expect(normalized.world.operatorRelationships).toBeUndefined();
    expect(normalized.world.visitors).toBeUndefined();
    expect(normalized.world.raidOpportunities).toBeUndefined();
    expect(normalized.world.activeEvents).toBeUndefined();
  });

  it("persists simulationSeed through storage preparation and hydration", () => {
    const base = createBaseSave();

    const normalized = preparePersistedSaveGameForStorage({
      ...base,
      world: {
        ...base.world,
        simulationSeed: 4242,
      },
    });

    expect(normalized.world.simulationSeed).toBe(4242);

    const hydrated = hydratePersistedSaveGame(normalized);

    expect(hydrated.save.world.simulationSeed).toBe(4242);
  });

  it("migrates schema 2 saves by deriving raid membership and flattening legacy outcomes", () => {
    const hydrated = hydratePersistedSaveGame({
      slotId: "slot/1",
      schemaVersion: 2,
      compatibilityVersion: CURRENT_CONTENT_COMPATIBILITY,
      metadata: {
        guildName: "Legacy Guild",
        playerName: "Boss",
        createdAt: "2026-03-19T08:00:00.000Z",
        lastPlayedAt: "2026-03-19T09:00:00.000Z",
      },
      world: {
        guild: {
          guildName: "Legacy Guild",
          playerName: "Boss",
          reputation: 1,
          treasury: 300,
          intel: 2,
        },
        time: {
          tick: 12,
          day: 1,
          minuteOfDay: 480,
        },
        building: {
          activeBuildingId: "building/bodega",
          activeBuildingTier: 1,
          roomSlotCount: 2,
          operatorSlotCount: 2,
        },
        rooms: [
          {
            id: "room-instance/front-desk",
            templateId: "room/register:tier_1",
            tier: 1,
            capacity: 2,
            occupancy: 0,
            footprint: {
              col: 0,
              row: 0,
              cols: 4,
              rows: 3,
            },
          },
        ],
        activeRaidPackets: [
          {
            id: "raid/legacy",
            missionId: "mission/clearance",
            startedAt: "2026-03-19T09:15:00.000Z",
            startedTick: 555,
            revealProgress: 10,
            returnTick: 735,
            durationHours: 3,
            resolutionPacket: {
              result: "mixed",
              reputationDelta: 1,
              cashDelta: 65,
              operatorOutcomes: [],
              narrativeTags: ["result:mixed"],
              intelMismatchTags: [],
            },
          },
        ],
        raidSummaries: [
          {
            id: "raid/completed",
            missionId: "mission/extraction",
            startedAt: "2026-03-19T07:00:00.000Z",
            endedAt: "2026-03-19T07:30:00.000Z",
            result: "mixed",
            reputationDelta: -1,
            cashDelta: 60,
            operatorOutcomes: [
              {
                operatorId: "operator/7",
                outcome: {
                  status: "steady",
                  loyaltyDelta: 2,
                },
              },
            ],
          },
        ],
        appliedUpgradeIds: ["upgrade/building/bodega:frontage"],
        operators: [
          {
            id: "operator/7",
            assignment: {
              kind: "raid",
              targetId: "raid/legacy",
            },
            appearance: {
              presetId: "mira-002",
            },
          },
        ],
      },
    });

    expect(hydrated.changed).toBe(true);
    expect(hydrated.save.schemaVersion).toBe(CURRENT_SAVE_SCHEMA_VERSION);
    expect(hydrated.save.world.activeRaidPackets).toEqual([
      {
        id: "raid/legacy",
        contractSiteId: "",
        missionId: "mission/clearance",
        startedAt: "2026-03-19T09:15:00.000Z",
        startedTick: 555,
        revealProgress: 10,
        operatorIds: ["operator/7"],
        returnTick: 735,
        durationHours: 3,
        briefingSource: null,
        briefingStatus: null,
        resolutionPacket: {
          result: "mixed",
          reputationDelta: 1,
          cashDelta: 65,
          operatorOutcomes: [],
          narrativeTags: ["result:mixed"],
          intelMismatchTags: [],
        },
      },
    ]);
    expect(hydrated.save.world.raidSummaries).toEqual([
      {
        id: "raid/completed",
        contractSiteId: "",
        opportunityId: "raid/completed",
        missionId: "mission/extraction",
        location: "",
        startedAt: "2026-03-19T07:00:00.000Z",
        endedAt: "2026-03-19T07:30:00.000Z",
        result: "mixed",
        reputationDelta: -1,
        cashDelta: 60,
        reward: 0,
        threat: 0,
        intel: 0,
        cohesion: 0,
        operatorOutcomes: [
          {
            operatorId: "operator/7",
            status: "steady",
            loyaltyDelta: 2,
          },
        ],
        narrativeTags: [],
        intelMismatchTags: [],
      },
    ]);
    expect(hydrated.save.world.operatorRelationships).toBeUndefined();
    expect(hydrated.save.world.raidOpportunities).toBeUndefined();
    expect(hydrated.save.world.activeEvents).toBeUndefined();
  });

  it("maps legacy bodega room footprints onto canonical slot ids and derived room state", () => {
    const base = createBaseSave();
    const hydrated = hydratePersistedSaveGame({
      ...base,
      schemaVersion: 10,
      world: {
        ...base.world,
        rooms: [
          {
            id: "room-instance/front-desk",
            templateId: "room/register:tier_1",
            tier: 1,
            capacity: 2,
            occupancy: 1,
            footprint: {
              col: 0,
              row: 10,
              cols: 4,
              rows: 3,
            },
            appliedUpgradeIds: [
              "upgrade/room/register:records_wall",
              "upgrade/room/register:ghost",
            ],
          },
        ],
      },
    });

    expect(hydrated.changed).toBe(true);
    expect(hydrated.save.world.rooms[0]).toMatchObject({
      floorIndex: 0,
      slotId: "slot/register",
      roomStateId: "room-state/register:2",
      appliedUpgradeIds: ["upgrade/room/register:records_wall"],
      activeFootprint: {
        col: 0,
        row: 10,
        cols: 4,
        rows: 3,
      },
    });
  });

  it("migrates schema 3 relationship memory saves by defaulting missing fields", () => {
    const base = createBaseSave();
    const hydrated = hydratePersistedSaveGame({
      ...base,
      schemaVersion: 3,
      world: {
        ...base.world,
        operatorRelationships: [
          {
            operatorAId: "operator/1",
            operatorBId: "operator/2",
            trust: 18,
            friction: 4,
            historyTags: ["history:trained_together"],
          },
        ],
      },
    });

    expect(hydrated.changed).toBe(true);
    expect(hydrated.save.schemaVersion).toBe(CURRENT_SAVE_SCHEMA_VERSION);
    expect(hydrated.save.world.operatorRelationships).toEqual([
      {
        operatorAId: "operator/1",
        operatorBId: "operator/2",
        trust: 18,
        friction: 4,
        familiarity: 0,
        recentSharedOutcome: 0,
        historyTags: ["history:trained_together"],
      },
    ]);
  });

  it("strips legacy seed appearance keys and marks changed", () => {
    const base = createBaseSave();

    const hydrated = hydratePersistedSaveGame({
      ...base,
      schemaVersion: 4,
      world: {
        ...base.world,
        operators: [
          {
            ...base.world.operators?.[0],
            appearance: {
              seed: 7,
            },
          },
        ],
      },
    });

    expect(hydrated.changed).toBe(true);
    expect(hydrated.save.world.operators?.[0]?.appearance.presetId).toBeTruthy();
  });

  it("strips legacy portraitId appearance keys and marks changed", () => {
    const base = createBaseSave();

    const hydrated = hydratePersistedSaveGame({
      ...base,
      schemaVersion: 4,
      world: {
        ...base.world,
        operators: [
          {
            id: "operator/2",
            identity: {
              displayName: "Milo Hart",
              roleTag: "role:scout",
            },
            appearance: {
              portraitId: "portrait/milo",
            },
          },
        ],
      },
    });

    expect(hydrated.changed).toBe(true);
    expect(hydrated.save.world.operators?.[0]?.appearance.presetId).toBeTruthy();
  });

  it("migrates schema 5 appearance saves and preserves approved visible gear ids", () => {
    const base = createBaseSave();
    const hydrated = hydratePersistedSaveGame(
      {
        ...base,
        schemaVersion: 5,
        world: {
          ...base.world,
          operators: [
            {
              ...base.world.operators?.[0],
              appearance: {
                presetId: "mira-002",
                visibleGear: {
                  weaponPartId: "weapon/cleaver",
                  outfitOverlayPartId: "outfit-overlay/apron",
                  accessoryPartId: "accessory/chain",
                },
              },
            } as unknown as NonNullable<PersistedSaveGame["world"]["operators"]>[number],
          ],
        },
      },
      createCodecOptions(),
    );

    expect(hydrated.changed).toBe(true);
    expect(hydrated.save.schemaVersion).toBe(CURRENT_SAVE_SCHEMA_VERSION);
    expect(hydrated.save.world.operators?.[0]?.appearance).toEqual({
      presetId: "mira-002",
      visibleGear: {
        weaponPartId: "weapon/cleaver",
        outfitOverlayPartId: "outfit-overlay/apron",
        accessoryPartId: "accessory/chain",
      },
    });
  });

  it("rewrites current-schema legacy raid outcome wrappers during normalization", () => {
    const base = createBaseSave();
    const hydrated = hydratePersistedSaveGame({
      ...base,
      world: {
        ...base.world,
        raidSummaries: [
          {
            ...base.world.raidSummaries[0],
            operatorOutcomes: [
              {
                operatorId: "operator/1",
                status: "steady",
                outcome: {
                  operatorId: "operator/legacy",
                  injuryDelta: 0,
                  moraleDelta: 4,
                  loyaltyDelta: 1,
                },
              },
            ],
          },
        ],
      },
    });

    expect(hydrated.changed).toBe(true);
    expect(hydrated.save.world.raidSummaries[0]?.operatorOutcomes).toEqual([
      {
        operatorId: "operator/1",
        status: "steady",
        injuryDelta: 0,
        moraleDelta: 4,
        loyaltyDelta: 1,
      },
    ]);
  });

  it("preserves active raid resolution packets and direct operator outcomes", () => {
    const hydrated = hydratePersistedSaveGame(createBaseSave());

    expect(hydrated.changed).toBe(true);
    expect(hydrated.save.world.activeRaidPackets[0]).toMatchObject({
      startedTick: 3005,
      returnTick: 3185,
      durationHours: 3,
      resolutionPacket: {
        result: "success",
        reputationDelta: 7,
        cashDelta: 132,
      },
    });
    expect(hydrated.save.world.raidSummaries[0]?.operatorOutcomes).toEqual([
      {
        operatorId: "operator/1",
        injuryDelta: 0,
        moraleDelta: 4,
        loyaltyDelta: 1,
        status: "steady",
      },
    ]);
  });

  it("backfills missing combat data even on current-schema saves", () => {
    const base = createBaseSave();
    const hydrated = hydratePersistedSaveGame({
      ...base,
      world: {
        ...base.world,
        operators: base.world.operators?.map((operator) => {
          const { combat: _combat, ...rest } = operator;
          return rest;
        }),
      },
    });

    expect(hydrated.changed).toBe(true);
    expect(hydrated.save.world.operators?.[0]?.combat).toEqual({
      rank: "f",
      attunementTag: "attunement:kinetic",
      traits: ["trait:steady"],
      combatPackageId: "package/field-lead/kinetic/standard",
      blocks: 0,
      baseStats: {
        strength: 14,
        speed: 8,
        endurance: 13,
        resilience: 10,
        perception: 7,
        intelligence: 8,
      },
    });
  });

  it("round-trips relationship and raid opportunity state", () => {
    const normalized = preparePersistedSaveGameForStorage(createBaseSave());

    expect(normalized.world.operators?.[0]?.preferences).toEqual({
      preferredMissionTags: ["mission:clearance"],
    });
    expect(normalized.world.operators?.[0]?.schedule).toEqual({
      workStartMinute: 480,
      workEndMinute: 1080,
      currentBlock: "raid",
    });
    expect(normalized.world.operators?.[0]?.appearance).toEqual({
      presetId: "mira-002",
    });
    expect(normalized.world.operatorRelationships).toEqual([
      {
        operatorAId: "operator/1",
        operatorBId: "operator/2",
        trust: 18,
        friction: 4,
        familiarity: 9,
        recentSharedOutcome: 3,
        historyTags: ["history:trained_together"],
      },
    ]);
    expect(normalized.world.raidOpportunities).toEqual([
      {
        id: "opportunity/1",
        missionId: "mission/containment",
        location: "district/harbor",
        threat: 46,
        intel: 38,
        reward: 92,
        risk: 44,
        status: "open",
        interestedOperatorIds: ["operator/1"],
        claimedOperatorIds: [],
        createdTick: 2800,
        expiresAtTick: 3240,
      },
    ]);
  });

  it("round-trips contract, fog, scheduler, and room upgrade state", () => {
    const base = createBaseSave();
    const normalized = preparePersistedSaveGameForStorage({
      ...base,
      world: {
        ...base.world,
        rooms: [
          {
            ...base.world.rooms[0],
            appliedUpgradeIds: ["upgrade/room/register:records_wall"],
          },
        ],
        contractLifecycle: "bidding",
        contractSite: {
          contractSiteId: "contract/test-site",
          missionId: "mission/clearance",
          siteConceptId: "site/flooded-subway-tunnel",
          location: "district/lower-east-side",
          rank: "f",
          bossDefeated: false,
          contractLost: false,
          threat: 80,
          intel: 44,
          reward: 150,
          securedAtTick: 480,
          explorationProgress: 32,
          bossIntelProgress: 18,
          bossPressureProgress: 24,
          bossAvailable: false,
          boardIntel: {
            source: "office",
            quality: "dossier",
          },
          briefing: {
            source: "briefing_room",
            status: "briefed",
            opportunityIntelBonus: 8,
            bossIntelBonus: 15,
          },
        },
        postedContracts: [
          {
            postingId: "posting/test/0",
            missionId: "mission/clearance",
            siteConceptId: "site/flooded-subway-tunnel",
            location: "district/lower-east-side",
            rank: "f",
            threat: 42,
            intel: 48,
            reward: 92,
            risk: 34,
            bidCost: 7,
            minReputation: 0,
            generatedAtTick: 481,
            knownTraits: ["threat:clustered"],
            hiddenTraitCount: 1,
            enemyHints: ["enemy-family/tunnel-crawlers"],
            lootFamilyHints: ["Tunnel Salvage"],
            bossHint: "boss/tunneler-brood-mother",
            neighborhoodLabel: "lower east side",
            boardIntel: {
              source: "office",
              quality: "dossier",
            },
          },
        ],
        contractResult: {
          contractSiteId: "contract/old-site",
          missionId: "mission/extraction",
          siteConceptId: "site/abandoned-school",
          location: "district/bronx-overpass",
          rank: "e",
          outcome: "contract_lost",
          totalRaids: 3,
          totalCashEarned: 150,
          totalReputationEarned: 2,
          operatorDeaths: 1,
          resolvedAtTick: 470,
        },
        fogOfWar: {
          gridWidth: 4,
          gridHeight: 4,
          revealed: [
            true,
            false,
            false,
            false,
            false,
            true,
            false,
            false,
            false,
            false,
            false,
            false,
            false,
            false,
            false,
            false,
          ],
          revealedCount: 2,
        },
        scheduler: {
          lastPayrollDay: 3,
          lastVisitorSpawnTick: 660,
          lastEventTick: 720,
          lastRaidOpportunityTick: 780,
        },
      },
    });

    expect(normalized.world.rooms[0]?.appliedUpgradeIds).toEqual([
      "upgrade/room/register:records_wall",
    ]);
    expect(normalized.world.contractLifecycle).toBe("bidding");
    expect(normalized.world.contractSite).toEqual({
      contractSiteId: "contract/test-site",
      missionId: "mission/clearance",
      siteConceptId: "site/flooded-subway-tunnel",
      location: "district/lower-east-side",
      rank: "f",
      bossDefeated: false,
      missionCompleted: false,
      contractLost: false,
      threat: 80,
      intel: 44,
      reward: 150,
      securedAtTick: 480,
      explorationProgress: 32,
      closureProgress: 0,
      closureThreshold: 100,
      bossIntelProgress: 18,
      bossPressureProgress: 24,
      requiresBossClear: false,
      bossAvailable: false,
      boardIntel: {
        source: "office",
        quality: "dossier",
      },
      briefing: {
        source: "briefing_room",
        status: "briefed",
        opportunityIntelBonus: 8,
        bossIntelBonus: 15,
      },
    });
    expect(normalized.world.postedContracts).toEqual([
      {
        postingId: "posting/test/0",
        missionId: "mission/clearance",
        siteConceptId: "site/flooded-subway-tunnel",
        location: "district/lower-east-side",
        rank: "f",
        threat: 42,
        intel: 48,
        reward: 92,
        risk: 34,
        bidCost: 7,
        minReputation: 0,
        generatedAtTick: 481,
        knownTraits: ["threat:clustered"],
        hiddenTraitCount: 1,
        enemyHints: ["enemy-family/tunnel-crawlers"],
        lootFamilyHints: ["Tunnel Salvage"],
        bossHint: "boss/tunneler-brood-mother",
        neighborhoodLabel: "lower east side",
        boardIntel: {
          source: "office",
          quality: "dossier",
        },
      },
    ]);
    expect(normalized.world.contractResult).toEqual({
      contractSiteId: "contract/old-site",
      missionId: "mission/extraction",
      siteConceptId: "site/abandoned-school",
      location: "district/bronx-overpass",
      rank: "e",
      outcome: "contract_lost",
      totalRaids: 3,
      totalCashEarned: 150,
      totalReputationEarned: 2,
      operatorDeaths: 1,
      resolvedAtTick: 470,
    });
    expect(normalized.world.fogOfWar?.revealedCount).toBe(2);
    expect(normalized.world.scheduler).toEqual({
      lastPayrollDay: 3,
      lastVisitorSpawnTick: 660,
      lastEventTick: 720,
      lastRaidOpportunityTick: 780,
    });
  });

  it("round-trips approved visible gear without changing recipe ids", () => {
    const base = createBaseSave();
    const normalized = preparePersistedSaveGameForStorage(
      {
        ...base,
        world: {
          ...base.world,
          operators: [
            {
              ...base.world.operators?.[0],
              appearance: {
                presetId: "mira-002",
                visibleGear: {
                  weaponPartId: "weapon/cleaver",
                  outfitOverlayPartId: "outfit-overlay/apron",
                  accessoryPartId: "accessory/chain",
                },
              },
            } as unknown as NonNullable<PersistedSaveGame["world"]["operators"]>[number],
          ],
        },
      },
      createCodecOptions(),
    );

    expect(normalized.world.operators?.[0]?.appearance).toEqual({
      presetId: "mira-002",
      visibleGear: {
        weaponPartId: "weapon/cleaver",
        outfitOverlayPartId: "outfit-overlay/apron",
        accessoryPartId: "accessory/chain",
      },
    });
  });

  it("keeps completed raid state collapsed into summaries without inventing active packets", () => {
    const base = createBaseSave();
    const hydrated = hydratePersistedSaveGame({
      ...base,
      world: {
        ...base.world,
        activeRaidPackets: [],
      },
    });

    expect(hydrated.save.world.activeRaidPackets).toEqual([]);
    expect(hydrated.save.world.raidSummaries).toHaveLength(1);
  });

  it("rejects incompatible content versions", () => {
    expect(() =>
      hydratePersistedSaveGame({
        ...createBaseSave(),
        compatibilityVersion: "preproduction-track-z",
      }),
    ).toThrowError(
      /save\.compatibilityVersion must match current compatibility version "preproduction-track-b"\./,
    );
  });

  it("rejects legacy active raids that cannot be migrated safely", () => {
    expect(() =>
      hydratePersistedSaveGame({
        ...createBaseSave(),
        schemaVersion: 2,
        world: {
          ...createBaseSave().world,
          activeRaidPackets: [
            {
              id: "raid/1",
              missionId: "mission/clearance",
              startedAt: "2026-03-20T12:05:00.000Z",
              revealProgress: 45,
            },
          ],
        },
      }),
    ).toThrowError(
      /save\.world\.activeRaidPackets\[0\]\.startedTick must be present for active raid durability\./,
    );
  });

  it("rejects active raids that reference unknown living operators", () => {
    const base = createBaseSave();

    expect(() =>
      hydratePersistedSaveGame({
        ...base,
        world: {
          ...base.world,
          activeRaidPackets: [
            {
              ...base.world.activeRaidPackets[0],
              operatorIds: ["operator/missing"],
              resolutionPacket: {
                ...base.world.activeRaidPackets[0].resolutionPacket,
                operatorOutcomes: [
                  {
                    operatorId: "operator/missing",
                    injuryDelta: 0,
                    moraleDelta: 0,
                    loyaltyDelta: 0,
                    status: "steady",
                  },
                ],
              },
            },
          ],
        },
      }),
    ).toThrowError(
      /save\.world\.activeRaidPackets\[0\]\.operatorIds\[0\] must reference an existing active operator id, got "operator\/missing"\./,
    );
  });

  it("rejects malformed saves with clear validation errors", () => {
    expect(() =>
      hydratePersistedSaveGame({
        slotId: "slot/1",
        compatibilityVersion: CURRENT_CONTENT_COMPATIBILITY,
        metadata: {
          guildName: "Broken Guild",
          playerName: "Boss",
          createdAt: "2026-03-20T12:00:00.000Z",
          lastPlayedAt: "2026-03-20T12:00:00.000Z",
        },
        world: createBaseSave().world,
      }),
    ).toThrowError(SaveValidationError);

    expect(() =>
      hydratePersistedSaveGame({
        ...createBaseSave(),
        world: {
          ...createBaseSave().world,
          raidOpportunities: [
            {
              missionId: "mission/containment",
              claimedOperatorIds: "operator/1",
            },
          ],
        },
      }),
    ).toThrowError(/save\.world\.raidOpportunities\[0\]\.claimedOperatorIds must be an array\./);
  });

  it("normalizes invalid presetIds via stableKey and rejects unknown visibleGear fields", () => {
    const base = createBaseSave();

    // Invalid presetId gets normalized to a valid recipe via stableKey
    const hydrated = hydratePersistedSaveGame({
      ...base,
      world: {
        ...base.world,
        operators: [
          {
            ...base.world.operators?.[0],
            appearance: {
              presetId: "portrait/debug",
            },
          },
        ],
      },
    });
    expect(hydrated.changed).toBe(true);
    expect(hydrated.save.world.operators?.[0]?.appearance.presetId).not.toBe("portrait/debug");

    // Unknown visibleGear fields still fail
    expect(() =>
      hydratePersistedSaveGame(
        {
          ...base,
          world: {
            ...base.world,
            operators: [
              {
                ...base.world.operators?.[0],
                appearance: {
                  presetId: "mira-002",
                  visibleGear: {
                    weaponPartId: "weapon/cleaver",
                    cloakPartId: "accessory/chain",
                  },
                },
              },
            ],
          },
        },
        createCodecOptions(),
      ),
    ).toThrowError(
      /save\.world\.operators\[0\]\.appearance\.visibleGear contains unknown field "cloakPartId"\./,
    );
  });

  it("rejects unknown referenced visible gear ids", () => {
    const base = createBaseSave();

    expect(() =>
      hydratePersistedSaveGame(
        {
          ...base,
          world: {
            ...base.world,
            operators: [
              {
                ...base.world.operators?.[0],
                appearance: {
                  presetId: "mira-002",
                  visibleGear: {
                    weaponPartId: "weapon/unknown",
                  },
                },
              },
            ],
          },
        },
        createCodecOptions(),
      ),
    ).toThrowError(
      /save\.world\.operators\[0\]\.appearance\.visibleGear\.weaponPartId must reference a known weapon part id\./,
    );
  });

  it("rejects category-mismatched visible gear ids", () => {
    const base = createBaseSave();

    expect(() =>
      hydratePersistedSaveGame(
        {
          ...base,
          world: {
            ...base.world,
            operators: [
              {
                ...base.world.operators?.[0],
                appearance: {
                  presetId: "mira-002",
                  visibleGear: {
                    weaponPartId: "accessory/chain",
                  },
                },
              },
            ],
          },
        },
        createCodecOptions(),
      ),
    ).toThrowError(
      /save\.world\.operators\[0\]\.appearance\.visibleGear\.weaponPartId must reference a weapon part id, but "accessory\/chain" is "accessory"\./,
    );
  });

  it("rejects empty-string visible gear ids", () => {
    const base = createBaseSave();

    expect(() =>
      hydratePersistedSaveGame(
        {
          ...base,
          world: {
            ...base.world,
            operators: [
              {
                ...base.world.operators?.[0],
                appearance: {
                  presetId: "mira-002",
                  visibleGear: {
                    weaponPartId: "",
                  },
                },
              },
            ],
          },
        },
        createCodecOptions(),
      ),
    ).toThrowError(
      /save\.world\.operators\[0\]\.appearance\.visibleGear\.weaponPartId must be a non-empty string\./,
    );
  });

  it("rejects duplicate appearance part ids in the referenced index", () => {
    const base = createBaseSave();

    expect(() =>
      hydratePersistedSaveGame(
        {
          ...base,
          world: {
            ...base.world,
            operators: [
              {
                ...base.world.operators?.[0],
                appearance: {
                  presetId: "mira-002",
                  visibleGear: {
                    weaponPartId: "weapon/cleaver",
                  },
                },
              },
            ],
          },
        },
        {
          operatorAppearancePartsIndex: {
            parts: [
              {
                id: "weapon/cleaver",
                category: "weapon",
                tags: ["weapon"],
                paletteTags: ["metal"],
                roleTags: ["role:bruiser"],
                bodyCompatibility: ["broad"],
                poseCompatibility: ["raid"],
                rarity: "common",
              },
              {
                id: "weapon/cleaver",
                category: "weapon",
                tags: ["weapon"],
                paletteTags: ["metal"],
                roleTags: ["role:bruiser"],
                bodyCompatibility: ["broad"],
                poseCompatibility: ["raid"],
                rarity: "common",
              },
            ],
          },
        },
      ),
    ).toThrowError(
      /save\.appearancePartsIndex operator appearance parts index\[1\]\.id duplicates operator appearance part "weapon\/cleaver"\./,
    );
  });

  it("rejects malformed appearance part metadata when validating references", () => {
    const base = createBaseSave();

    expect(() =>
      hydratePersistedSaveGame(
        {
          ...base,
          world: {
            ...base.world,
            operators: [
              {
                ...base.world.operators?.[0],
                appearance: {
                  presetId: "mira-002",
                  visibleGear: {
                    weaponPartId: "weapon/cleaver",
                  },
                },
              },
            ],
          },
        },
        {
          operatorAppearancePartsIndex: {
            parts: [
              {
                id: "weapon/cleaver",
                category: "weapon",
                tags: "weapon",
                paletteTags: ["metal"],
                roleTags: ["role:bruiser"],
                bodyCompatibility: ["broad"],
                poseCompatibility: ["raid"],
                rarity: "common",
              },
            ],
          },
        },
      ),
    ).toThrowError(
      /save\.appearancePartsIndex operator appearance parts index\[0\]\.tags must be an array\./,
    );
  });

  it("retains dead operators in operators[] with lifecycle fields intact", () => {
    const base = createBaseSave();
    const deadOperator = {
      id: "operator/dead-1",
      lifecycle: {
        status: "dead" as const,
        deathTick: 100,
        deathRaidSummaryId: "raid/0",
      },
      identity: { displayName: "Fallen" },
      appearance: { presetId: "mira-002" },
    };
    const hydrated = hydratePersistedSaveGame({
      ...base,
      world: {
        ...base.world,
        operators: [...(base.world.operators ?? []), deadOperator],
      },
    });

    const dead = hydrated.save.world.operators?.find((op) => op.id === "operator/dead-1");
    expect(dead).toBeDefined();
    expect(dead?.lifecycle).toEqual({
      status: "dead",
      deathTick: 100,
      deathRaidSummaryId: "raid/0",
    });
  });

  it("preserves deathTick and deathRaidSummaryId through round trips", () => {
    const base = createBaseSave();
    const deadOperator = {
      id: "operator/dead-1",
      lifecycle: {
        status: "dead" as const,
        deathTick: 250,
        deathRaidSummaryId: "raid/0",
      },
      identity: { displayName: "Ghost" },
      appearance: { presetId: "mira-002" },
    };
    const normalized = preparePersistedSaveGameForStorage({
      ...base,
      world: {
        ...base.world,
        operators: [...(base.world.operators ?? []), deadOperator],
      },
    });
    const dead = normalized.world.operators?.find((op) => op.id === "operator/dead-1");
    expect(dead?.lifecycle.status).toBe("dead");
    expect(dead?.lifecycle.deathTick).toBe(250);
    expect(dead?.lifecycle.deathRaidSummaryId).toBe("raid/0");
  });

  it("does not remap legitimate Porter's rooms during storage normalization", () => {
    const base = createBaseSave();
    const portersRooms = [
      {
        id: "room-instance/floor",
        templateId: "room/floor:tier_1",
        tier: 1,
        floorIndex: 0,
        slotId: "slot/floor",
        roomStateId: getRoomStateId("room/floor:tier_1", []),
        capacity: 8,
        occupancy: 0,
        isActive: true,
        reservedFootprint: { col: 1, row: 12, cols: 10, rows: 6 },
        activeFootprint: getRoomActiveFootprint(
          "room/floor:tier_1",
          { col: 1, row: 12, cols: 10, rows: 6 },
          [],
        ),
      },
      {
        id: "room-instance/bar",
        templateId: "room/bar:tier_1",
        tier: 1,
        floorIndex: 0,
        slotId: "slot/bar",
        roomStateId: getRoomStateId("room/bar:tier_1", []),
        capacity: 4,
        occupancy: 0,
        isActive: true,
        reservedFootprint: { col: 1, row: 6, cols: 10, rows: 4 },
        activeFootprint: getRoomActiveFootprint(
          "room/bar:tier_1",
          { col: 1, row: 6, cols: 10, rows: 4 },
          [],
        ),
      },
      {
        id: "room-instance/office",
        templateId: "room/office:tier_1",
        tier: 1,
        floorIndex: 1,
        slotId: "slot/office",
        roomStateId: getRoomStateId("room/office:tier_1", []),
        capacity: 2,
        occupancy: 0,
        isActive: true,
        reservedFootprint: { col: 0, row: 12, cols: 4, rows: 3 },
        activeFootprint: getRoomActiveFootprint(
          "room/office:tier_1",
          { col: 0, row: 12, cols: 4, rows: 3 },
          [],
        ),
      },
      {
        id: "room-instance/stockroom",
        templateId: "room/stockroom:tier_1",
        tier: 1,
        floorIndex: 1,
        slotId: "slot/stockroom",
        roomStateId: getRoomStateId("room/stockroom:tier_1", []),
        capacity: 2,
        occupancy: 0,
        isActive: true,
        reservedFootprint: { col: 6, row: 12, cols: 4, rows: 3 },
        activeFootprint: getRoomActiveFootprint(
          "room/stockroom:tier_1",
          { col: 6, row: 12, cols: 4, rows: 3 },
          [],
        ),
      },
      {
        id: "room-instance/infirmary",
        templateId: "room/infirmary:tier_1",
        tier: 1,
        floorIndex: 1,
        slotId: "slot/infirmary",
        roomStateId: getRoomStateId("room/infirmary:tier_1", []),
        capacity: 2,
        occupancy: 0,
        isActive: true,
        reservedFootprint: { col: 0, row: 8, cols: 4, rows: 3 },
        activeFootprint: getRoomActiveFootprint(
          "room/infirmary:tier_1",
          { col: 0, row: 8, cols: 4, rows: 3 },
          [],
        ),
      },
      {
        id: "room-instance/gym",
        templateId: "room/gym:tier_1",
        tier: 1,
        floorIndex: 1,
        slotId: "slot/gym",
        roomStateId: getRoomStateId("room/gym:tier_1", []),
        capacity: 2,
        occupancy: 0,
        isActive: true,
        reservedFootprint: { col: 6, row: 8, cols: 4, rows: 3 },
        activeFootprint: getRoomActiveFootprint(
          "room/gym:tier_1",
          { col: 6, row: 8, cols: 4, rows: 3 },
          [],
        ),
      },
      {
        id: "room-instance/prep-room",
        templateId: "room/prep_room:tier_1",
        tier: 1,
        floorIndex: 1,
        slotId: "slot/prep-room",
        roomStateId: getRoomStateId("room/prep_room:tier_1", []),
        capacity: 2,
        occupancy: 0,
        isActive: true,
        reservedFootprint: { col: 0, row: 4, cols: 4, rows: 3 },
        activeFootprint: getRoomActiveFootprint(
          "room/prep_room:tier_1",
          { col: 0, row: 4, cols: 4, rows: 3 },
          [],
        ),
      },
    ] as const;

    const normalized = preparePersistedSaveGameForStorage({
      ...base,
      world: {
        ...base.world,
        building: {
          activeBuildingId: "building/porters",
          activeBuildingTier: 1,
          activeFloorIndex: 0,
          roomSlotCount: 7,
          operatorSlotCount: 12,
        },
        rooms: [...portersRooms],
        appliedUpgradeIds: [],
      },
    });

    expect(normalized.world.building.activeBuildingId).toBe("building/porters");
    expect(normalized.world.rooms).toHaveLength(7);
    expect(normalized.world.rooms.map((room) => room.templateId)).toEqual(
      portersRooms.map((room) => room.templateId),
    );
    expect(normalized.world.rooms.map((room) => room.slotId)).toEqual(
      portersRooms.map((room) => room.slotId),
    );
  });

  it("preserves raid summary death outcome marker through round trips", () => {
    const base = createBaseSave();
    const deadOperator = {
      id: "operator/dead-1",
      lifecycle: {
        status: "dead" as const,
        deathTick: 100,
        deathRaidSummaryId: "raid/0",
      },
      identity: { displayName: "Fallen" },
      appearance: { presetId: "mira-002" },
    };
    const normalized = preparePersistedSaveGameForStorage({
      ...base,
      world: {
        ...base.world,
        operators: [...(base.world.operators ?? []), deadOperator],
        raidSummaries: [
          {
            ...base.world.raidSummaries[0],
            operatorOutcomes: [
              ...(base.world.raidSummaries[0]?.operatorOutcomes ?? []),
              { operatorId: "operator/dead-1", died: true },
            ],
          },
        ],
      },
    });

    const outcome = normalized.world.raidSummaries[0]?.operatorOutcomes?.find(
      (o) => o.operatorId === "operator/dead-1",
    );
    expect(outcome?.died).toBe(true);
  });

  it("living operators remain active without invented death fields", () => {
    const hydrated = hydratePersistedSaveGame(createBaseSave());
    const living = hydrated.save.world.operators?.find((op) => op.id === "operator/1");

    expect(living?.lifecycle).toEqual({ status: "active" });
    expect(living?.lifecycle.deathTick).toBeUndefined();
    expect(living?.lifecycle.deathRaidSummaryId).toBeUndefined();
  });

  it("migrates schema 6 saves to schema 7 with all operators set to active", () => {
    const base = createBaseSave();
    const hydrated = hydratePersistedSaveGame({
      ...base,
      schemaVersion: 6,
      world: {
        ...base.world,
        operators: [
          {
            id: "operator/1",
            identity: { displayName: "Rook" },
            assignment: { kind: "raid", targetId: "raid/1" },
            appearance: { presetId: "mira-002" },
          },
          {
            id: "operator/2",
            identity: { displayName: "Bishop" },
            appearance: { presetId: "mira-002" },
          },
        ],
        raidSummaries: [
          {
            ...base.world.raidSummaries[0],
            operatorOutcomes: [{ operatorId: "operator/1", status: "steady" }],
          },
        ],
      },
    });

    expect(hydrated.changed).toBe(true);
    expect(hydrated.save.schemaVersion).toBe(CURRENT_SAVE_SCHEMA_VERSION);

    hydrated.save.world.operators?.forEach((op) => {
      expect(op.lifecycle).toEqual({ status: "active" });
      expect(op.lifecycle.deathTick).toBeUndefined();
      expect(op.lifecycle.deathRaidSummaryId).toBeUndefined();
    });

    const outcomes = hydrated.save.world.raidSummaries[0]?.operatorOutcomes;
    expect(outcomes?.some((o) => "died" in o)).toBe(false);
  });

  it("strips legacy died markers while migrating schema 6 raid summaries", () => {
    const base = createBaseSave();
    const hydrated = hydratePersistedSaveGame({
      ...base,
      schemaVersion: 6,
      world: {
        ...base.world,
        raidSummaries: [
          {
            ...base.world.raidSummaries[0],
            operatorOutcomes: [{ operatorId: "operator/nonexistent", died: true }],
          },
        ],
      },
    });

    expect(hydrated.changed).toBe(true);
    expect(hydrated.save.world.raidSummaries[0]?.operatorOutcomes).toEqual([
      { operatorId: "operator/nonexistent" },
    ]);
  });

  it("rejects current-schema lifecycle status outside the supported set", () => {
    const base = createBaseSave();

    expect(() =>
      hydratePersistedSaveGame({
        ...base,
        world: {
          ...base.world,
          operators: [
            {
              id: "operator/bad",
              lifecycle: { status: "injured" },
              appearance: { presetId: "mira-002" },
            },
          ],
        },
      }),
    ).toThrowError(
      /save\.world\.operators\[0\]\.lifecycle\.status must be "active", "dead", or "departed"\./,
    );
  });

  it("preserves departed operators with departure metadata through round trips", () => {
    const base = createBaseSave();
    const normalized = preparePersistedSaveGameForStorage({
      ...base,
      world: {
        ...base.world,
        operators: [
          ...(base.world.operators ?? []),
          {
            id: "operator/departed-1",
            lifecycle: {
              status: "departed",
              departureTick: 360,
              departureReason: "morale collapse",
            },
            identity: { displayName: "Gone" },
            appearance: { presetId: "mira-002" },
          },
        ],
      },
    });

    const departed = normalized.world.operators?.find((op) => op.id === "operator/departed-1");
    expect(departed?.lifecycle).toEqual({
      status: "departed",
      departureTick: 360,
      departureReason: "morale collapse",
    });
  });

  it("rejects departed operators missing departure metadata", () => {
    const base = createBaseSave();

    expect(() =>
      hydratePersistedSaveGame({
        ...base,
        world: {
          ...base.world,
          operators: [
            {
              id: "operator/bad",
              lifecycle: { status: "departed", departureTick: 50 },
              appearance: { presetId: "mira-002" },
            },
          ],
        },
      }),
    ).toThrowError(/departed operator must have both departureTick and departureReason/);
  });

  it("rejects current-schema dead operator missing deathTick", () => {
    const base = createBaseSave();

    expect(() =>
      hydratePersistedSaveGame({
        ...base,
        world: {
          ...base.world,
          operators: [
            {
              id: "operator/bad",
              lifecycle: { status: "dead", deathRaidSummaryId: "raid/0" },
              appearance: { presetId: "mira-002" },
            },
          ],
        },
      }),
    ).toThrowError(/dead operator must have both deathTick and deathRaidSummaryId/);
  });

  it("rejects current-schema dead operator missing deathRaidSummaryId", () => {
    const base = createBaseSave();

    expect(() =>
      hydratePersistedSaveGame({
        ...base,
        world: {
          ...base.world,
          operators: [
            {
              id: "operator/bad",
              lifecycle: { status: "dead", deathTick: 100 },
              appearance: { presetId: "mira-002" },
            },
          ],
        },
      }),
    ).toThrowError(/dead operator must have both deathTick and deathRaidSummaryId/);
  });

  it("rejects current-schema dead operator with negative deathTick", () => {
    const base = createBaseSave();

    expect(() =>
      hydratePersistedSaveGame({
        ...base,
        world: {
          ...base.world,
          operators: [
            {
              id: "operator/bad",
              lifecycle: {
                status: "dead",
                deathTick: -1,
                deathRaidSummaryId: "raid/0",
              },
              appearance: { presetId: "mira-002" },
            },
          ],
        },
      }),
    ).toThrowError(
      /save\.world\.operators\[0\]\.lifecycle\.deathTick must be greater than or equal to 0\./,
    );
  });

  it("rejects invalid world time and inconsistent fog snapshots", () => {
    const base = createBaseSave();

    expect(() =>
      hydratePersistedSaveGame({
        ...base,
        world: {
          ...base.world,
          time: {
            tick: -1,
            day: 1,
            minuteOfDay: 720,
          },
        },
      }),
    ).toThrowError(/save\.world\.time\.tick must be greater than or equal to 0\./);

    expect(() =>
      hydratePersistedSaveGame({
        ...base,
        world: {
          ...base.world,
          fogOfWar: {
            gridWidth: 2,
            gridHeight: 2,
            revealed: [true, false, false],
            revealedCount: 1,
          },
        },
      }),
    ).toThrowError(/save\.world\.fogOfWar\.revealed must contain exactly 4 cells\./);

    expect(() =>
      hydratePersistedSaveGame({
        ...base,
        world: {
          ...base.world,
          fogOfWar: {
            gridWidth: 2,
            gridHeight: 2,
            revealed: [true, false, false, false],
            revealedCount: 2,
          },
        },
      }),
    ).toThrowError(/save\.world\.fogOfWar\.revealedCount must match the 1 revealed cells\./);
  });

  it("rejects current-schema dead operator referencing an unknown raid summary", () => {
    const base = createBaseSave();

    expect(() =>
      hydratePersistedSaveGame({
        ...base,
        world: {
          ...base.world,
          operators: [
            ...(base.world.operators ?? []),
            {
              id: "operator/dead-1",
              lifecycle: {
                status: "dead",
                deathTick: 100,
                deathRaidSummaryId: "raid/nonexistent",
              },
              appearance: { presetId: "mira-002" },
            },
          ],
        },
      }),
    ).toThrowError(
      /save\.world\.operators\[1\]\.lifecycle\.deathRaidSummaryId must reference an existing raid summary id, got "raid\/nonexistent"\./,
    );
  });

  it("rejects current-schema active operator carrying partial death data", () => {
    const base = createBaseSave();

    expect(() =>
      hydratePersistedSaveGame({
        ...base,
        world: {
          ...base.world,
          operators: [
            {
              id: "operator/bad",
              lifecycle: { status: "active", deathTick: 50 },
              appearance: { presetId: "mira-002" },
            },
          ],
        },
      }),
    ).toThrowError(
      /active operator must not carry deathTick, deathRaidSummaryId, departureTick, or departureReason/,
    );
  });

  it("rejects raid summary claiming death for unknown operator", () => {
    const base = createBaseSave();

    expect(() =>
      hydratePersistedSaveGame({
        ...base,
        world: {
          ...base.world,
          raidSummaries: [
            {
              ...base.world.raidSummaries[0],
              operatorOutcomes: [{ operatorId: "operator/nonexistent", died: true }],
            },
          ],
        },
      }),
    ).toThrowError(/claims died for unknown operatorId "operator\/nonexistent"/);
  });

  it("migrates v9 save without combat data to v10 with deterministic defaults", () => {
    const base = createBaseSave();
    const hydrated = hydratePersistedSaveGame({
      ...base,
      schemaVersion: 9,
      world: {
        ...base.world,
        operators: [
          {
            id: "operator/1",
            lifecycle: { status: "active" as const },
            identity: { roleTag: "role:field_lead" },
            appearance: { presetId: "mira-002" },
          },
          {
            id: "operator/2",
            lifecycle: { status: "active" as const },
            identity: { roleTag: "role:scout" },
            appearance: { presetId: "mira-002" },
          },
          {
            id: "operator/3",
            lifecycle: { status: "active" as const },
            identity: { roleTag: "role:medic" },
            appearance: { presetId: "mira-002" },
          },
        ],
      },
    });

    expect(hydrated.changed).toBe(true);
    expect(hydrated.save.schemaVersion).toBe(CURRENT_SAVE_SCHEMA_VERSION);

    const ops = hydrated.save.world.operators;
    expect(ops).toBeDefined();
    expect(ops).toHaveLength(3);

    // field_lead gets kinetic attunement with higher strength/endurance
    const fieldLead = ops?.find((op) => op.id === "operator/1");
    expect(fieldLead?.combat).toBeDefined();
    expect(fieldLead?.combat?.rank).toBe("f");
    expect(fieldLead?.combat?.attunementTag).toBe("attunement:kinetic");
    expect(fieldLead?.combat?.traits).toEqual(["trait:steady"]);
    expect(fieldLead?.combat?.combatPackageId).toBe("package/field-lead/kinetic/standard");
    expect(fieldLead?.combat?.blocks).toBe(0);
    expect(fieldLead?.combat?.baseStats.strength).toBe(14);
    expect(fieldLead?.combat?.baseStats.endurance).toBe(13);

    // scout gets void attunement with higher speed/perception
    const scout = ops?.find((op) => op.id === "operator/2");
    expect(scout?.combat).toBeDefined();
    expect(scout?.combat?.rank).toBe("f");
    expect(scout?.combat?.attunementTag).toBe("attunement:void");
    expect(scout?.combat?.traits).toEqual(["trait:alert"]);
    expect(scout?.combat?.combatPackageId).toBe("package/scout/void/standard");
    expect(scout?.combat?.baseStats.speed).toBe(14);
    expect(scout?.combat?.baseStats.perception).toBe(13);

    // medic gets vital attunement with higher resilience/intelligence
    const medic = ops?.find((op) => op.id === "operator/3");
    expect(medic?.combat).toBeDefined();
    expect(medic?.combat?.rank).toBe("f");
    expect(medic?.combat?.attunementTag).toBe("attunement:vital");
    expect(medic?.combat?.traits).toEqual(["trait:resilient"]);
    expect(medic?.combat?.combatPackageId).toBe("package/medic/vital/standard");
    expect(medic?.combat?.baseStats.resilience).toBe(14);
    expect(medic?.combat?.baseStats.intelligence).toBe(13);
  });

  it("v9 migration produces deterministic defaults based on roleTag", () => {
    const base = createBaseSave();

    // Run migration twice for the same operator -- results should be identical
    const makeV9Save = () => ({
      ...base,
      schemaVersion: 9,
      world: {
        ...base.world,
        activeRaidPackets: [],
        operators: [
          {
            id: "operator/x",
            lifecycle: { status: "active" as const },
            identity: { roleTag: "role:scout" },
            appearance: { presetId: "mira-002" },
          },
        ],
      },
    });

    const hydrated1 = hydratePersistedSaveGame(makeV9Save());
    const hydrated2 = hydratePersistedSaveGame(makeV9Save());

    expect(hydrated1.save.world.operators?.[0]?.combat).toEqual(
      hydrated2.save.world.operators?.[0]?.combat,
    );
  });

  it("normalizes legacy kit migrations to the package-derived attunement and traits", () => {
    const base = createBaseSave();
    const hydrated = hydratePersistedSaveGame({
      ...base,
      schemaVersion: 18,
      world: {
        ...base.world,
        operators: [
          {
            ...base.world.operators![0],
            identity: {
              displayName: "Rook",
              roleTag: "role:medic",
            },
            combat: {
              rank: "f",
              attunementTag: "attunement:kinetic",
              traits: ["trait:steady"],
              kit: {
                regularAttackId: "legacy/attack",
                skillId: "legacy/skill",
                ultimateId: "legacy/ultimate",
                passiveIds: [],
              },
              baseStats: {
                strength: 6,
                speed: 7,
                endurance: 9,
                resilience: 14,
                perception: 8,
                intelligence: 13,
              },
            },
          },
        ],
      },
    });

    expect(hydrated.changed).toBe(true);
    expect(hydrated.save.world.operators?.[0].combat).toMatchObject({
      attunementTag: "attunement:vital",
      traits: ["trait:resilient"],
      combatPackageId: "package/medic/vital/standard",
    });
  });

  it("round-trips v10 save with combat data correctly", () => {
    const base = createBaseSave();
    const combat = {
      rank: "e",
      attunementTag: "attunement:kinetic",
      traits: ["trait:aggressive", "trait:alert"],
      combatPackageId: "package/field-lead/kinetic/standard",
      blocks: 1,
      baseStats: {
        strength: 18,
        speed: 12,
        endurance: 15,
        resilience: 10,
        perception: 8,
        intelligence: 9,
      },
    };

    const normalized = preparePersistedSaveGameForStorage({
      ...base,
      world: {
        ...base.world,
        operators: [
          {
            ...base.world.operators![0],
            combat,
          },
        ],
      },
    });

    expect(normalized.schemaVersion).toBe(CURRENT_SAVE_SCHEMA_VERSION);
    const op = normalized.world.operators?.[0];
    expect(op?.combat).toEqual(combat);
  });

  it("hydrates missing operator training state with zeroed readiness defaults", () => {
    const base = createBaseSave();
    const hydrated = hydratePersistedSaveGame({
      ...base,
      schemaVersion: 16,
      world: {
        ...base.world,
        operators: [
          {
            ...base.world.operators![0],
            training: undefined,
          },
        ],
      },
    });

    expect(hydrated.changed).toBe(true);
    expect(hydrated.save.world.operators?.[0].training).toEqual({
      strength: 0,
      speed: 0,
      endurance: 0,
      resilience: 0,
    });
  });

  it("round-trips explicit operator training state through storage preparation", () => {
    const base = createBaseSave();
    const training = {
      strength: 62,
      speed: 44,
      endurance: 58,
      resilience: 36,
    };

    const normalized = preparePersistedSaveGameForStorage({
      ...base,
      world: {
        ...base.world,
        operators: [
          {
            ...base.world.operators![0],
            training,
          },
        ],
      },
    });

    expect(normalized.schemaVersion).toBe(CURRENT_SAVE_SCHEMA_VERSION);
    expect(normalized.world.operators?.[0].training).toEqual(training);
  });

  it("hydrates missing policy state with migration-safe defaults", () => {
    const base = createBaseSave();
    const hydrated = hydratePersistedSaveGame({
      ...base,
      schemaVersion: 14,
      world: {
        ...base.world,
        policies: undefined,
      },
    });

    expect(hydrated.changed).toBe(true);
    expect(hydrated.save.world.policies).toEqual(DEFAULT_POLICY_STATE);
  });

  it("round-trips explicit policy state through storage preparation", () => {
    const base = createBaseSave();
    const policies = {
      contractPosture: "aggressive" as const,
      objectiveBias: "boss_rush" as const,
      recoveryTriage: "full_recovery" as const,
      staffingPriority: "welfare_priority" as const,
      rosterFlow: "retention_focus" as const,
    };

    const normalized = preparePersistedSaveGameForStorage({
      ...base,
      world: {
        ...base.world,
        policies,
      },
    });

    expect(normalized.world.policies).toEqual(policies);
  });

  it("migrates missing presenter unlocks by seeding Mara and inferring room-based unlocks", () => {
    const base = createBaseSave();

    const hydrated = hydratePersistedSaveGame({
      ...base,
      schemaVersion: 18,
      world: {
        ...base.world,
        building: {
          activeBuildingId: "building/porters",
          activeBuildingTier: 1,
          activeFloorIndex: 0,
          roomSlotCount: 7,
          operatorSlotCount: 12,
        },
        rooms: [
          {
            id: "room-instance/floor-tier-1-1",
            templateId: "room/floor:tier_1",
            tier: 1,
            floorIndex: 0,
            slotId: "slot/floor",
            roomStateId: getRoomStateId("room/floor:tier_1", []),
            capacity: 8,
            occupancy: 0,
            reservedFootprint: { col: 1, row: 12, cols: 10, rows: 6 },
            activeFootprint: getRoomActiveFootprint(
              "room/floor:tier_1",
              { col: 1, row: 12, cols: 10, rows: 6 },
              [],
            ),
          },
          {
            id: "room-instance/dining-area-tier-1-2",
            templateId: "room/dining_area:tier_1",
            tier: 1,
            floorIndex: 0,
            slotId: "slot/dining-area",
            roomStateId: getRoomStateId("room/dining_area:tier_1", []),
            capacity: 4,
            occupancy: 0,
            reservedFootprint: { col: 12, row: 6, cols: 10, rows: 4 },
            activeFootprint: getRoomActiveFootprint(
              "room/dining_area:tier_1",
              { col: 12, row: 6, cols: 10, rows: 4 },
              [],
            ),
          },
          {
            id: "room-instance/bar-tier-1-3",
            templateId: "room/bar:tier_1",
            tier: 1,
            floorIndex: 0,
            slotId: "slot/bar",
            roomStateId: getRoomStateId("room/bar:tier_1", []),
            capacity: 4,
            occupancy: 0,
            reservedFootprint: { col: 1, row: 6, cols: 10, rows: 4 },
            activeFootprint: getRoomActiveFootprint(
              "room/bar:tier_1",
              { col: 1, row: 6, cols: 10, rows: 4 },
              [],
            ),
          },
        ],
        presenterUnlocks: undefined,
      },
    });

    expect(hydrated.changed).toBe(true);
    expect(hydrated.save.world.presenterUnlocks).toEqual([
      { presenterId: "presenter/assistant", unlockedAtTick: 0, unlockedAtDay: 1 },
      { presenterId: "presenter/cook", unlockedAtTick: 42, unlockedAtDay: 3 },
      { presenterId: "presenter/bartender", unlockedAtTick: 42, unlockedAtDay: 3 },
    ]);
  });

  it("hydrates missing loot automation state as disabled by default", () => {
    const base = createBaseSave();
    const hydrated = hydratePersistedSaveGame({
      ...base,
      world: {
        ...base.world,
        lootAutomation: undefined,
      },
    });

    expect(hydrated.save.world.lootAutomation).toEqual({
      autoSellEnabled: false,
    });
  });

  it("round-trips explicit loot automation state through storage preparation", () => {
    const base = createBaseSave();

    const normalized = preparePersistedSaveGameForStorage({
      ...base,
      world: {
        ...base.world,
        lootAutomation: {
          autoSellEnabled: true,
        },
      },
    });

    expect(normalized.world.lootAutomation).toEqual({
      autoSellEnabled: true,
    });
  });

  // ── Relocation save/load through real codec path ────────────────────

  it("preserves post-relocation guidance state through codec hydration", () => {
    const base = createBaseSave();
    const guidanceState = {
      seenBeatIds: [
        "guidance/opening/board-briefing",
        "guidance/opening/first-contract-choice",
        "guidance/opening/bodega-overview",
      ],
      completedBeatIds: [
        "guidance/opening/board-briefing",
        "guidance/opening/first-contract-choice",
        "guidance/opening/bodega-overview",
      ],
      dismissedBeatIds: [],
      activeBeatId: null,
      activeBeatView: {
        beatId: "guidance/opening/board-briefing",
        track: "opening",
        deliveryMode: "blocking",
        target: null,
        fallbackIntent: null,
        presenterId: "presenter/assistant",
        presenterExpression: "serious",
        copy: {
          title: "Welcome, Boss",
          body: "Test",
          ctaLabel: "Understood",
        },
        milestoneOrder: 1,
        totalMilestones: 13,
        completionKind: "acknowledged",
        pauseWorld: true,
        allowSkip: false,
      },
      queuedBeatIds: [],
      lastEvaluationMinute: 2000,
      openingPathState: "completed",
      activeBeatProgressBaseline: null,
      interactionCounts: { staffingActions: 4, upgradesPurchased: 2 },
      anchorResolutionFailures: [],
      openingTiming: {
        firstRaidReturnCompletedAtMinute: 500,
        firstIncidentSeededAtMinute: 600,
        securedContractCount: 20,
        lastTrackedContractSiteId: "contract/last",
      },
    };

    const hydrated = hydratePersistedSaveGame({
      ...base,
      world: {
        ...base.world,
        building: {
          activeBuildingId: "building/porters",
          activeBuildingTier: 1,
          activeFloorIndex: 0,
          roomSlotCount: 7,
          operatorSlotCount: 12,
        },
        guidanceState,
      },
    });

    const world = hydrated.save.world as Record<string, unknown>;
    const restoredGuidance = world.guidanceState as Record<string, unknown>;
    expect(restoredGuidance).toBeDefined();
    expect(restoredGuidance.openingPathState).toBe("completed");
    expect(restoredGuidance.completedBeatIds).toEqual(guidanceState.completedBeatIds);
    expect(restoredGuidance.seenBeatIds).toEqual(guidanceState.seenBeatIds);
    expect((restoredGuidance.activeBeatView as Record<string, string>).presenterId).toBe(
      "presenter/assistant",
    );
    expect((restoredGuidance.interactionCounts as Record<string, number>).staffingActions).toBe(4);
    expect((restoredGuidance.interactionCounts as Record<string, number>).upgradesPurchased).toBe(
      2,
    );
  });

  it("preserves mid-relocation interruption queue through codec hydration", () => {
    const base = createBaseSave();
    const interruptionQueue = {
      active: {
        instanceId: "int-reloc-1",
        type: "relocation",
        payload: {
          kind: "relocation",
          eventId: "event/relocation/bodega-to-next-hq",
          beat: "moving",
          buildingFromId: "building/bodega",
          buildingToId: "building/porters",
          treasuryCost: 600,
          presenterId: "presenter/assistant",
          presenterExpression: "neutral",
        },
        sourceSystem: "relocation-system",
        timestamp: 5000,
        blockingMode: "blocking",
        persistence: "persistent",
        dismissible: false,
        priority: 0,
      },
      queue: [],
      nextInstanceId: 2,
    };

    const hydrated = hydratePersistedSaveGame({
      ...base,
      world: {
        ...base.world,
        guild: { ...base.world.guild, treasury: 200 },
        interruptionQueue,
      },
    });

    const world = hydrated.save.world as Record<string, unknown>;
    const restoredQueue = world.interruptionQueue as Record<string, unknown>;
    expect(restoredQueue).toBeDefined();
    const active = restoredQueue.active as Record<string, unknown>;
    expect(active).not.toBeNull();
    expect(active.type).toBe("relocation");
    const payload = active.payload as Record<string, unknown>;
    expect(payload.kind).toBe("relocation");
    expect(payload.beat).toBe("moving");
    expect(payload.buildingToId).toBe("building/porters");
    expect(payload.treasuryCost).toBe(600);
    expect(payload.presenterId).toBe("presenter/assistant");
    expect(payload.presenterExpression).toBe("neutral");
  });

  it("round-trips post-relocation Porter's state through storage normalization", () => {
    const base = createBaseSave();
    const portersRooms = [
      {
        id: "room-instance/floor-tier-1-1",
        templateId: "room/floor:tier_1",
        tier: 1,
        floorIndex: 0,
        slotId: "slot/floor",
        roomStateId: getRoomStateId("room/floor:tier_1", []),
        capacity: 8,
        occupancy: 0,
        isActive: true,
        reservedFootprint: { col: 1, row: 12, cols: 10, rows: 6 },
        activeFootprint: getRoomActiveFootprint(
          "room/floor:tier_1",
          { col: 1, row: 12, cols: 10, rows: 6 },
          [],
        ),
      },
      {
        id: "room-instance/bar-tier-1-2",
        templateId: "room/bar:tier_1",
        tier: 1,
        floorIndex: 0,
        slotId: "slot/bar",
        roomStateId: getRoomStateId("room/bar:tier_1", []),
        capacity: 4,
        occupancy: 0,
        isActive: true,
        reservedFootprint: { col: 1, row: 6, cols: 10, rows: 4 },
        activeFootprint: getRoomActiveFootprint(
          "room/bar:tier_1",
          { col: 1, row: 6, cols: 10, rows: 4 },
          [],
        ),
      },
    ];

    const normalized = preparePersistedSaveGameForStorage({
      ...base,
      world: {
        ...base.world,
        building: {
          activeBuildingId: "building/porters",
          activeBuildingTier: 1,
          activeFloorIndex: 0,
          roomSlotCount: 7,
          operatorSlotCount: 12,
        },
        rooms: portersRooms,
        appliedUpgradeIds: [],
        contractLifecycle: "idle",
        contractSite: null,
        contractResult: null,
        postedContracts: [],
        activeRaidPackets: [],
        guidanceState: {
          seenBeatIds: ["guidance/opening/board-briefing"],
          completedBeatIds: ["guidance/opening/board-briefing", "guidance/opening/bodega-overview"],
          dismissedBeatIds: [],
          activeBeatId: null,
          activeBeatView: null,
          queuedBeatIds: [],
          lastEvaluationMinute: 3000,
          openingPathState: "completed",
          activeBeatProgressBaseline: null,
          interactionCounts: { staffingActions: 0, upgradesPurchased: 0 },
          anchorResolutionFailures: [],
        },
      },
    });

    expect(normalized.world.building.activeBuildingId).toBe("building/porters");
    expect(normalized.world.rooms).toHaveLength(2);
    expect(normalized.world.rooms.map((r) => r.templateId)).toEqual([
      "room/floor:tier_1",
      "room/bar:tier_1",
    ]);
    const worldRecord = normalized.world as Record<string, unknown>;
    const guidance = worldRecord.guidanceState as Record<string, unknown>;
    expect(guidance.openingPathState).toBe("completed");
    expect(guidance.completedBeatIds).toContain("guidance/opening/bodega-overview");
  });

  it("hydrates saves to default public pressure", () => {
    const base = createBaseSave();
    const result = hydratePersistedSaveGame(base);
    expect(result.save.world.publicPressure).toBeDefined();
    expect(result.save.world.publicPressure!.score).toBe(0);
    expect(result.save.world.factionRelationships).toHaveLength(4);
    expect(result.save.world.rivalPressure).toEqual({
      active: false,
      currentPrimaryRivalId: null,
      rivals: [],
    });
  });

  it("migrates legacy city pressure into public pressure and faction relationships", () => {
    const base = createBaseSave();
    const legacySave = {
      ...base,
      schemaVersion: 19,
      world: {
        ...base.world,
        publicPressure: undefined,
        factionRelationships: undefined,
        cityPressure: {
          districts: [
            {
              districtId: "district/lower-east-side",
              attention: 36,
              trust: 42,
              containmentDebt: 18,
              recentContractCount: 2,
              lastResolvedTick: 1200,
            },
          ],
          factions: [
            {
              factionId: "faction/city-licensing",
              standing: -12,
              scrutiny: 44,
              leverage: 3,
              cooldownUntilTick: 3000,
            },
          ],
        },
      },
    } as unknown as PersistedSaveGame;

    const result = hydratePersistedSaveGame(legacySave);

    expect(result.changed).toBe(true);
    expect(result.save.world.publicPressure).toEqual(
      expect.objectContaining({
        score: 44,
        dominantSource: "regulator",
      }),
    );
    expect(
      result.save.world.publicPressure!.districts.find(
        (district) => district.districtId === "district/lower-east-side",
      ),
    ).toEqual(
      expect.objectContaining({
        standing: 42,
        heat: 36,
        containment: 18,
        recentContractCount: 2,
        lastResolvedTick: 1200,
      }),
    );
    expect(
      result.save.world.factionRelationships!.find(
        (faction) => faction.factionId === "faction/city-licensing",
      ),
    ).toEqual(
      expect.objectContaining({
        standing: -12,
        cooldownUntilTick: 3000,
      }),
    );
  });

  it("round-trips rival recent-move ids through hydration", () => {
    const primary = readyToWireRivals[0];
    const base = createBaseSave();
    const prepared = preparePersistedSaveGameForStorage({
      ...base,
      world: {
        ...base.world,
        rivalPressure: {
          active: true,
          currentPrimaryRivalId: primary.id,
          rivals: [
            {
              rivalId: primary.id,
              ladderPosition: 1,
              strengthBand: "peer",
              intensity: 45,
              aggression: 30,
              trend: "rising",
              isPrimary: true,
              introducedAtTick: 1000,
              lastMoveTick: 2400,
              recentMoveIds: [primary.moves[0].id],
              departedOperatorId: null,
              missedProspectId: null,
              sourceTick: 1000,
              sourceReason: "war_room_unlock",
            },
          ],
        },
      },
    });

    const result = hydratePersistedSaveGame(prepared);
    const restored = result.save.world.rivalPressure!;
    expect(restored.active).toBe(true);
    expect(restored.currentPrimaryRivalId).toBe(primary.id);
    expect(restored.rivals).toHaveLength(1);
    expect(restored.rivals[0].recentMoveIds).toEqual([primary.moves[0].id]);
  });

  it("hydrates pre-schema-21 rival instances with an empty recentMoveIds list", () => {
    const primary = readyToWireRivals[0];
    const base = createBaseSave();
    const legacyRival = {
      rivalId: primary.id,
      ladderPosition: 1,
      strengthBand: "peer",
      intensity: 40,
      aggression: 25,
      trend: "stable",
      isPrimary: true,
      introducedAtTick: 500,
      lastMoveTick: null,
      departedOperatorId: null,
      missedProspectId: null,
      sourceTick: 500,
      sourceReason: "war_room_unlock",
    };
    const legacyWorld = {
      ...base.world,
      rivalPressure: {
        active: true,
        currentPrimaryRivalId: primary.id,
        rivals: [legacyRival],
      },
    } as unknown as PersistedSaveGame["world"];

    const result = hydratePersistedSaveGame({ ...base, world: legacyWorld });
    const restored = result.save.world.rivalPressure!;
    expect(result.changed).toBe(true);
    expect(restored.rivals[0].recentMoveIds).toEqual([]);
  });

  it("normalizes rival primary flags to the current primary id", () => {
    const first = readyToWireRivals[0];
    const second = readyToWireRivals[1];
    const base = createBaseSave();
    const result = hydratePersistedSaveGame({
      ...base,
      world: {
        ...base.world,
        rivalPressure: {
          active: true,
          currentPrimaryRivalId: second.id,
          rivals: [
            {
              rivalId: first.id,
              ladderPosition: 1,
              strengthBand: "above",
              intensity: 45,
              aggression: 30,
              trend: "stable",
              isPrimary: true,
              introducedAtTick: 1000,
              lastMoveTick: null,
              recentMoveIds: [],
              departedOperatorId: null,
              missedProspectId: null,
              sourceTick: 1000,
              sourceReason: "war_room_unlock",
            },
            {
              rivalId: second.id,
              ladderPosition: 2,
              strengthBand: "peer",
              intensity: 55,
              aggression: 35,
              trend: "rising",
              isPrimary: false,
              introducedAtTick: 1000,
              lastMoveTick: null,
              recentMoveIds: [],
              departedOperatorId: null,
              missedProspectId: null,
              sourceTick: 1000,
              sourceReason: "war_room_unlock",
            },
          ],
        },
      },
    });

    expect(result.changed).toBe(true);
    expect(result.save.world.rivalPressure!.rivals.map((rival) => rival.isPrimary)).toEqual([
      false,
      true,
    ]);
  });
});

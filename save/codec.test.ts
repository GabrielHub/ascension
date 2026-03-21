import { describe, expect, it } from "vitest";

import {
  CURRENT_CONTENT_COMPATIBILITY,
  CURRENT_SAVE_SCHEMA_VERSION,
  type PersistedSaveGame,
} from "./types";
import { OPERATOR_APPEARANCE_PRESET_IDS } from "./appearance";
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
      createdAt: "2026-03-20T12:00:00.000Z",
      lastPlayedAt: "2026-03-20T12:00:00.000Z",
    },
    world: {
      guild: {
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
        roomSlotCount: 4,
        operatorSlotCount: 3,
      },
      rooms: [
        {
          id: "room-instance/front-desk",
          templateId: "room/front_desk:tier_1",
          tier: 1,
          capacity: 2,
          occupancy: 1,
          isActive: true,
          position: {
            x: 0,
            y: 0,
            width: 4,
            height: 3,
          },
        },
      ],
      activeRaidPackets: [
        {
          id: "raid/1",
          missionId: "mission/clearance",
          startedAt: "2026-03-20T12:05:00.000Z",
          startedTick: 3005,
          revealProgress: 45,
          operatorIds: ["operator/1"],
          returnTick: 3185,
          durationHours: 3,
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
          missionId: "mission/extraction",
          startedAt: "2026-03-20T11:00:00.000Z",
          endedAt: "2026-03-20T11:20:00.000Z",
          result: "success",
          reputationDelta: 2,
          cashDelta: 180,
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
          identity: {
            displayName: "Rook",
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
            presetId: "female-flowing",
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
      staff: [
        {
          id: "staff/1",
          assignment: {
            roomId: "room-instance/front-desk",
          },
          status: {
            employed: true,
          },
        },
      ],
      visitors: [
        {
          id: "visitor/1",
          queueStage: "front_desk",
        },
      ],
      raidOpportunities: [
        {
          missionId: "mission/containment",
          location: {
            district: "harbor",
          },
          threat: {
            rank: 2,
            tags: ["threat:armed"],
          },
          intel: {
            confidence: "medium",
          },
          status: "open",
          interestedOperatorIds: ["operator/1"],
          claimedOperatorIds: [],
        },
      ],
      activeEvents: [
        {
          id: "event/personnel_conflict",
          severity: "medium",
        },
      ],
    },
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
    expect(normalized.world.operators).toEqual([]);
    expect(normalized.world.operatorRelationships).toEqual([]);
    expect(normalized.world.staff).toEqual([]);
    expect(normalized.world.visitors).toEqual([]);
    expect(normalized.world.raidOpportunities).toEqual([]);
    expect(normalized.world.activeEvents).toEqual([]);
  });

  it("migrates schema 2 saves by deriving raid membership and flattening legacy outcomes", () => {
    const hydrated = hydratePersistedSaveGame({
      slotId: "slot/1",
      schemaVersion: 2,
      compatibilityVersion: CURRENT_CONTENT_COMPATIBILITY,
      metadata: {
        guildName: "Legacy Guild",
        createdAt: "2026-03-19T08:00:00.000Z",
        lastPlayedAt: "2026-03-19T09:00:00.000Z",
      },
      world: {
        guild: {
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
            templateId: "room/front_desk:tier_1",
            tier: 1,
            capacity: 2,
            occupancy: 0,
            position: {
              x: 0,
              y: 0,
              width: 4,
              height: 3,
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
          },
        ],
      },
    });

    expect(hydrated.changed).toBe(true);
    expect(hydrated.save.schemaVersion).toBe(CURRENT_SAVE_SCHEMA_VERSION);
    expect(hydrated.save.world.activeRaidPackets).toEqual([
      {
        id: "raid/legacy",
        missionId: "mission/clearance",
        startedAt: "2026-03-19T09:15:00.000Z",
        startedTick: 555,
        revealProgress: 10,
        operatorIds: ["operator/7"],
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
    ]);
    expect(hydrated.save.world.raidSummaries).toEqual([
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
            status: "steady",
            loyaltyDelta: 2,
          },
        ],
        narrativeTags: [],
        intelMismatchTags: [],
      },
    ]);
    expect(hydrated.save.world.operatorRelationships).toEqual([]);
    expect(hydrated.save.world.raidOpportunities).toEqual([]);
    expect(hydrated.save.world.activeEvents).toEqual([]);
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

  it("migrates schema 4 operator appearance saves to preset ids", () => {
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
    expect(hydrated.save.schemaVersion).toBe(CURRENT_SAVE_SCHEMA_VERSION);
    expect(hydrated.save.world.operators?.[0]?.appearance.presetId).toBe(
      OPERATOR_APPEARANCE_PRESET_IDS[7 % OPERATOR_APPEARANCE_PRESET_IDS.length],
    );
    expect(hydrated.save.world.operators?.[1]?.appearance.presetId).toBeTruthy();
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

    expect(hydrated.changed).toBe(false);
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
      presetId: "female-flowing",
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
        missionId: "mission/containment",
        location: {
          district: "harbor",
        },
        threat: {
          rank: 2,
          tags: ["threat:armed"],
        },
        intel: {
          confidence: "medium",
        },
        status: "open",
        interestedOperatorIds: ["operator/1"],
        claimedOperatorIds: [],
      },
    ]);
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
      /save\.compatibilityVersion must match current compatibility version "preproduction-track-a"\./,
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

  it("rejects malformed saves with clear validation errors", () => {
    expect(() =>
      hydratePersistedSaveGame({
        slotId: "slot/1",
        compatibilityVersion: CURRENT_CONTENT_COMPATIBILITY,
        metadata: {
          guildName: "Broken Guild",
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
});

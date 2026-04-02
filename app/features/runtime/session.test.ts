import { afterEach, describe, expect, it, vi } from "vitest";

import { templateRegistry } from "content/templates";
import { getRoomActiveFootprint, getRoomStateId } from "lib/hq-room-state";
import {
  CURRENT_CONTENT_COMPATIBILITY,
  CURRENT_SAVE_SCHEMA_VERSION,
  saveStorage,
  type PersistedSaveGame,
} from "save";
import { hydratePersistedSaveGame } from "save/codec";
import {
  createBootstrapWorldSnapshot,
  createNewGameWorldSnapshot,
  createPreviewWorldSnapshot,
} from "sim";
import { createAscensionSimulation } from "sim";
import { OPENING_BEAT_BY_ID, OPENING_BEAT_IDS } from "sim/systems/guidance-beats";

import { parseRuntimeRouteRequest, resolveRuntimeSession } from "./session";

function createDeferredPromise<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;

  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });

  return {
    promise,
    resolve,
    reject,
  };
}

const AUTOSAVE_INTERVAL_MS = 10 * 60 * 1000;
const AUTONOMOUS_TICK_INTERVAL_MS = 1000;

function createRoomSnapshot(
  templateId: string,
  id: string,
  slotId: string,
  reservedFootprint: {
    col: number;
    row: number;
    cols: number;
    rows: number;
  },
  activeFootprint = getRoomActiveFootprint(templateId, reservedFootprint, []),
) {
  const template = templateRegistry.roomById.get(templateId);
  if (!template) {
    throw new Error(`Missing room template ${templateId}`);
  }

  return {
    id,
    templateId: template.id,
    tier: template.tier,
    floorIndex: 0,
    slotId,
    roomStateId: getRoomStateId(template.id, []),
    capacity: template.baseCapacity,
    occupancy: 0,
    isActive: true,
    reservedFootprint,
    activeFootprint,
  };
}

function createBodegaWorldSnapshot() {
  const world = createBootstrapWorldSnapshot(templateRegistry);

  world.building = {
    activeBuildingId: "building/bodega",
    activeBuildingTier: 1,
    activeFloorIndex: 0,
    roomSlotCount: 4,
    operatorSlotCount: 7,
  };
  world.appliedUpgradeIds = [];
  world.rooms = [
    createRoomSnapshot("room/register:tier_1", "room-instance/register", "slot/register", {
      col: 0,
      row: 0,
      cols: 4,
      rows: 3,
    }),
    createRoomSnapshot(
      "room/counter:tier_1",
      "room-instance/counter",
      "slot/counter",
      {
        col: 4,
        row: 0,
        cols: 4,
        rows: 3,
      },
      {
        col: 4,
        row: 1,
        cols: 4,
        rows: 2,
      },
    ),
    createRoomSnapshot("room/dining_area:tier_1", "room-instance/dining_area", "slot/dining-area", {
      col: 0,
      row: 3,
      cols: 4,
      rows: 3,
    }),
    createRoomSnapshot(
      "room/supply_closet:tier_1",
      "room-instance/supply_closet",
      "slot/supply-closet",
      {
        col: 4,
        row: 3,
        cols: 4,
        rows: 3,
      },
    ),
  ];
  world.staff = world.staff?.map((staff) =>
    staff.roleTag === "staff:reception"
      ? {
          ...staff,
          assignment: {
            kind: "room",
            targetId: "room-instance/register",
          },
        }
      : {
          ...staff,
          assignment: {
            kind: "idle",
            targetId: "",
          },
        },
  );

  return world;
}

function createOpeningActiveBeatView(beatId: string) {
  const beat = OPENING_BEAT_BY_ID.get(beatId);
  if (!beat) {
    throw new Error(`Missing opening beat ${beatId}`);
  }

  return {
    beatId: beat.id,
    track: beat.track,
    deliveryMode: beat.delivery.mode,
    target: beat.delivery.target ?? null,
    fallbackIntent: beat.delivery.fallbackIntent ?? null,
    presenterId: beat.presenterId,
    presenterExpression: beat.presenterExpression,
    copy: beat.copy,
    milestoneOrder: beat.milestoneOrder,
    totalMilestones: OPENING_BEAT_IDS.length,
    completionKind: beat.completion.kind,
    requiresManualCompletion: beat.completion.requiresManualCompletion,
    pauseWorld: beat.delivery.pauseWorld,
    allowSkip: beat.delivery.allowSkip,
  };
}

function createPersistedSave(
  slotId: "slot/1" | "slot/2" | "slot/3",
  world: PersistedSaveGame["world"],
) {
  return {
    slotId,
    schemaVersion: CURRENT_SAVE_SCHEMA_VERSION,
    compatibilityVersion: CURRENT_CONTENT_COMPATIBILITY,
    metadata: {
      guildName: `Guild ${slotId}`,
      playerName: "Boss",
      createdAt: "2026-03-21T00:00:00.000Z",
      lastPlayedAt: "2026-03-21T00:00:00.000Z",
    },
    world,
  } satisfies PersistedSaveGame;
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("runtime route request parsing", () => {
  it("defaults to new-game mode for empty search params", () => {
    expect(parseRuntimeRouteRequest("")).toEqual({
      mode: "new",
      slotId: undefined,
    });
  });

  it("parses valid slot-backed requests", () => {
    expect(parseRuntimeRouteRequest("?mode=load&slot=slot/2")).toEqual({
      mode: "load",
      slotId: "slot/2",
    });
  });
});

describe("legacy save hydration", () => {
  it("maps removed union hall content onto live bodega content", () => {
    const baseWorld = createBootstrapWorldSnapshot(templateRegistry);

    const legacySave = {
      slotId: "slot/1",
      schemaVersion: CURRENT_SAVE_SCHEMA_VERSION,
      compatibilityVersion: CURRENT_CONTENT_COMPATIBILITY,
      metadata: {
        guildName: "Guild Slot 1",
        playerName: "Boss",
        createdAt: "2026-03-21T00:00:00.000Z",
        lastPlayedAt: "2026-03-21T00:00:00.000Z",
      },
      world: {
        ...baseWorld,
        building: {
          activeBuildingId: "building/union_hall",
          activeBuildingTier: 2,
          roomSlotCount: 5,
          operatorSlotCount: 6,
        },
        rooms: [
          {
            id: "room-instance/front_desk",
            templateId: "room/front_desk:tier_1",
            tier: 1,
            capacity: 2,
            occupancy: 0,
            isActive: true,
            footprint: {
              col: 0,
              row: 0,
              cols: 4,
              rows: 3,
            },
          },
          {
            id: "room-instance/recruitment_office",
            templateId: "room/recruitment_office:tier_1",
            tier: 1,
            capacity: 2,
            occupancy: 0,
            isActive: true,
            footprint: {
              col: 4,
              row: 0,
              cols: 4,
              rows: 3,
            },
          },
          {
            id: "room-instance/infirmary",
            templateId: "room/infirmary:tier_1",
            tier: 1,
            capacity: 3,
            occupancy: 0,
            isActive: true,
            footprint: {
              col: 0,
              row: 3,
              cols: 4,
              rows: 3,
            },
          },
          {
            id: "room-instance/lounge",
            templateId: "room/lounge:tier_1",
            tier: 1,
            capacity: 4,
            occupancy: 0,
            isActive: true,
            footprint: {
              col: 4,
              row: 3,
              cols: 4,
              rows: 3,
            },
          },
          {
            id: "room-instance/gym",
            templateId: "room/gym:tier_1",
            tier: 1,
            capacity: 2,
            occupancy: 0,
            isActive: true,
            footprint: {
              col: 8,
              row: 3,
              cols: 4,
              rows: 3,
            },
          },
        ],
      },
    } satisfies PersistedSaveGame;

    const hydrated = hydratePersistedSaveGame(legacySave);

    expect(hydrated.changed).toBe(true);
    expect(hydrated.save.world.building.activeBuildingId).toBe("building/bodega");
    expect(hydrated.save.world.building.roomSlotCount).toBe(4);
    expect(hydrated.save.world.rooms).toEqual([
      expect.objectContaining({
        templateId: "room/register:tier_1",
        slotId: "slot/register",
      }),
      expect.objectContaining({
        templateId: "room/counter:tier_1",
        slotId: "slot/counter",
      }),
      expect.objectContaining({
        templateId: "room/dining_area:tier_1",
        slotId: "slot/dining-area",
      }),
      expect.objectContaining({
        templateId: "room/supply_closet:tier_1",
        slotId: "slot/supply-closet",
      }),
    ]);
    expect(() => createAscensionSimulation(hydrated.save.world, templateRegistry)).not.toThrow();
  });
});

describe("runtime session lifecycle", () => {
  it("creates new-game sessions from the seeded opening envelope", async () => {
    vi.spyOn(saveStorage, "readSaveGame").mockResolvedValue(undefined);
    vi.spyOn(saveStorage, "writeSaveGame").mockResolvedValue();

    const session = await resolveRuntimeSession({
      mode: "new",
      slotId: "slot/1",
    });

    expect(session.mode).toBe("new");
    expect([320, 340]).toContain(session.worldSnapshot.guild.treasury);
    expect(session.worldSnapshot.operators?.length).toBeGreaterThanOrEqual(3);
    expect(session.worldSnapshot.operators?.length).toBeLessThanOrEqual(4);
    expect(
      new Set(session.worldSnapshot.operators?.map((operator) => operator.identity.roleTag)),
    ).toEqual(new Set(["role:field_lead", "role:scout", "role:medic"]));
    expect(session.worldSnapshot.staff?.map((staff) => staff.id)).toEqual([
      "staff/aina",
      "staff/boris",
    ]);
    expect(session.worldSnapshot.visitors?.map((visitor) => visitor.id)).toContain("visitor/nika");
    expect(session.worldSnapshot.visitors?.length).toBeGreaterThanOrEqual(1);
    expect(session.worldSnapshot.visitors?.length).toBeLessThanOrEqual(2);
    expect(session.worldSnapshot.inventoryStacks).toEqual(
      expect.arrayContaining([
        { itemId: "weapon/pipe-wrench", quantity: 2 },
        { itemId: "weapon/kitchen-knife", quantity: 1 },
      ]),
    );
    expect(session.state.phase1View.guidance.openingPathState).toBe("active");
    expect(
      (createNewGameWorldSnapshot(templateRegistry) as Record<string, unknown>).guidanceState,
    ).toEqual(
      expect.objectContaining({
        openingPathState: "active",
      }),
    );

    session.dispose();
  });

  it("restores representative opening checkpoints through save-backed load sessions", async () => {
    let currentSave: PersistedSaveGame | undefined;
    vi.spyOn(saveStorage, "readSaveGame").mockImplementation(async () => currentSave);
    vi.spyOn(saveStorage, "writeSaveGame").mockResolvedValue();

    const checkpoints = [
      {
        name: "before first contract",
        beatId: "guidance/opening/first-contract-choice",
        configure(world: PersistedSaveGame["world"]) {
          (world as Record<string, unknown>).guidanceState = {
            seenBeatIds: ["guidance/opening/board-briefing"],
            completedBeatIds: ["guidance/opening/board-briefing"],
            dismissedBeatIds: [],
            activeBeatId: "guidance/opening/first-contract-choice",
            activeBeatView: createOpeningActiveBeatView("guidance/opening/first-contract-choice"),
            queuedBeatIds: [],
            lastEvaluationMinute: 480,
            openingPathState: "active",
            anchorResolutionFailures: [],
            activeBeatProgressBaseline: null,
            interactionCounts: {
              staffingActions: 0,
              upgradesPurchased: 0,
            },
            openingTiming: {
              firstRaidReturnCompletedAtMinute: null,
              firstIncidentSeededAtMinute: null,
            },
          };
        },
      },
      {
        name: "after first contract secured",
        beatId: "guidance/opening/bodega-overview",
        configure(world: PersistedSaveGame["world"]) {
          world.contractSite = {
            contractSiteId: "contract/test-1",
            missionId: "mission/clearance",
            siteConceptId: "site/flooded-subway-tunnel",
            location: "district/lower-east-side",
            rank: "f",
            bossDefeated: false,
            contractLost: false,
            threat: 40,
            intel: 45,
            reward: 90,
            securedAtTick: 540,
            explorationProgress: 0,
            bossIntelProgress: 0,
            bossPressureProgress: 0,
            bossAvailable: false,
          };
          world.contractLifecycle = "active";
          world.postedContracts = [];
          (world as Record<string, unknown>).guidanceState = {
            seenBeatIds: [
              "guidance/opening/board-briefing",
              "guidance/opening/first-contract-choice",
            ],
            completedBeatIds: [
              "guidance/opening/board-briefing",
              "guidance/opening/first-contract-choice",
            ],
            dismissedBeatIds: [],
            activeBeatId: "guidance/opening/bodega-overview",
            activeBeatView: createOpeningActiveBeatView("guidance/opening/bodega-overview"),
            queuedBeatIds: [],
            lastEvaluationMinute: 540,
            openingPathState: "active",
            anchorResolutionFailures: [],
            activeBeatProgressBaseline: null,
            interactionCounts: {
              staffingActions: 0,
              upgradesPurchased: 0,
            },
            openingTiming: {
              firstRaidReturnCompletedAtMinute: null,
              firstIncidentSeededAtMinute: null,
            },
          };
        },
      },
      {
        name: "after first raid departure",
        expectedRaidCount: 1,
        configure(world: PersistedSaveGame["world"]) {
          world.contractSite = {
            contractSiteId: "contract/test-2",
            missionId: "mission/clearance",
            siteConceptId: "site/flooded-subway-tunnel",
            location: "district/lower-east-side",
            rank: "f",
            bossDefeated: false,
            contractLost: false,
            threat: 42,
            intel: 40,
            reward: 92,
            securedAtTick: 600,
            explorationProgress: 12,
            bossIntelProgress: 0,
            bossPressureProgress: 0,
            bossAvailable: false,
          };
          world.contractLifecycle = "active";
          world.activeRaidPackets = [
            {
              id: "raid/test-2",
              opportunityId: "opportunity/test-2",
              missionId: "mission/clearance",
              location: "district/lower-east-side",
              startedAt: "day-1 10:00",
              startedTick: 600,
              revealProgress: 22,
              operatorIds: ["operator/rose-vega", "operator/milo-hart", "operator/jin-tanaka"],
              returnTick: 840,
              durationHours: 4,
              threat: 42,
              intel: 40,
              reward: 92,
              cohesion: 58,
            },
          ];
          (world as Record<string, unknown>).guidanceState = {
            seenBeatIds: OPENING_BEAT_IDS.slice(0, 5),
            completedBeatIds: OPENING_BEAT_IDS.slice(0, 4),
            dismissedBeatIds: [],
            activeBeatId: "guidance/opening/first-team-departure",
            activeBeatView: createOpeningActiveBeatView("guidance/opening/first-team-departure"),
            queuedBeatIds: [],
            lastEvaluationMinute: 600,
            openingPathState: "active",
            anchorResolutionFailures: [],
            activeBeatProgressBaseline: null,
            interactionCounts: {
              staffingActions: 0,
              upgradesPurchased: 0,
            },
            openingTiming: {
              firstRaidReturnCompletedAtMinute: null,
              firstIncidentSeededAtMinute: null,
            },
          };
        },
      },
      {
        name: "after first raid return",
        beatId: "guidance/opening/first-raid-return",
        configure(world: PersistedSaveGame["world"]) {
          world.contractSite = {
            contractSiteId: "contract/test-3",
            missionId: "mission/clearance",
            siteConceptId: "site/flooded-subway-tunnel",
            location: "district/lower-east-side",
            rank: "f",
            bossDefeated: false,
            contractLost: false,
            threat: 45,
            intel: 44,
            reward: 95,
            securedAtTick: 660,
            explorationProgress: 40,
            bossIntelProgress: 15,
            bossPressureProgress: 20,
            bossAvailable: false,
          };
          world.contractLifecycle = "active";
          world.raidSummaries = [
            {
              id: "raid/test-3",
              contractSiteId: "contract/test-3",
              missionId: "mission/clearance",
              location: "district/lower-east-side",
              result: "mixed",
              reward: 95,
              cashDelta: 38,
              reputationDelta: 2,
              returnedAtTick: 900,
              operatorIds: ["operator/rose-vega", "operator/milo-hart", "operator/jin-tanaka"],
              operatorOutcomes: [
                {
                  operatorId: "operator/jin-tanaka",
                  injuryDelta: 18,
                  moraleDelta: -8,
                  loyaltyDelta: -3,
                  status: "hurt",
                },
              ],
              loot: [{ itemId: "loot/monster-part/fang", quantity: 2 }],
              narrativeTags: ["result:mixed"],
              intelMismatchTags: [],
              bossDefeated: false,
            },
          ];
          (world as Record<string, unknown>).guidanceState = {
            seenBeatIds: OPENING_BEAT_IDS.slice(0, 6),
            completedBeatIds: OPENING_BEAT_IDS.slice(0, 5),
            dismissedBeatIds: [],
            activeBeatId: "guidance/opening/first-raid-return",
            activeBeatView: createOpeningActiveBeatView("guidance/opening/first-raid-return"),
            queuedBeatIds: [],
            lastEvaluationMinute: 900,
            openingPathState: "active",
            anchorResolutionFailures: [],
            activeBeatProgressBaseline: null,
            interactionCounts: {
              staffingActions: 0,
              upgradesPurchased: 0,
            },
            openingTiming: {
              firstRaidReturnCompletedAtMinute: null,
              firstIncidentSeededAtMinute: null,
            },
          };
        },
      },
      {
        name: "during the first incident",
        beatId: "guidance/opening/first-incident",
        expectedInterruptionKind: "guidance",
        configure(world: PersistedSaveGame["world"]) {
          (world as Record<string, unknown>).guidanceState = {
            seenBeatIds: OPENING_BEAT_IDS.slice(0, 8),
            completedBeatIds: OPENING_BEAT_IDS.slice(0, 6),
            dismissedBeatIds: [],
            activeBeatId: "guidance/opening/first-incident",
            activeBeatView: createOpeningActiveBeatView("guidance/opening/first-incident"),
            queuedBeatIds: [],
            lastEvaluationMinute: 960,
            openingPathState: "active",
            anchorResolutionFailures: [],
            activeBeatProgressBaseline: null,
            interactionCounts: {
              staffingActions: 0,
              upgradesPurchased: 0,
            },
            openingTiming: {
              firstRaidReturnCompletedAtMinute: 900,
              firstIncidentSeededAtMinute: 960,
            },
          };
          (world as Record<string, unknown>).incidentState = {
            pendingIncident: {
              instanceId: "incident-1",
              templateId: "incident/team-friction-brief",
              triggerFamily: "operator_conflict",
              boundContext: {
                operatorIds: ["operator/rose-vega", "operator/vera-santos"],
              },
              choices: [
                {
                  choiceId: "cool_off",
                  label: "Mandate a Cool-Off",
                  description: "Split the pair up for the rest of the day.",
                  consequenceSummary: "Small morale recovery, no dramatic fallout.",
                  effects: [],
                },
              ],
              createdAtMinute: 960,
            },
            history: [],
            cooldowns: {},
            nextInstanceId: 2,
            lastEvaluationMinute: 960,
          };
          (world as Record<string, unknown>).interruptionQueue = {
            active: {
              instanceId: "interruption-guidance-1",
              type: "guidance",
              priority: 71,
              blockingMode: "blocking",
              createdAtMinute: 960,
              sourceSystem: "guidance",
              dismissible: false,
              persistence: "persistent",
              payload: {
                kind: "guidance",
                beatId: "guidance/opening/first-incident",
                track: "opening",
                title: "Incident Report",
                body: "Incidents stop the clock because Boss has to choose.",
                subtitle: "Management decision required",
                ctaLabel: "Handle it",
                deliveryMode: "blocking",
                milestoneOrder: 8,
                totalMilestones: OPENING_BEAT_IDS.length,
                completionKind: "incident_resolved",
                fallbackBody:
                  "An incident has landed and the simulation is paused until Boss responds.",
              },
            },
            queue: [
              {
                instanceId: "interruption-incident-1",
                type: "incident",
                priority: 70,
                blockingMode: "blocking",
                createdAtMinute: 960,
                sourceSystem: "guidance-system",
                dismissible: false,
                persistence: "persistent",
                payload: {
                  kind: "incident",
                  incidentInstanceId: "incident-1",
                  templateId: "incident/team-friction-brief",
                  category: "team_friction",
                  title: "Team Friction Brief",
                  briefing:
                    "Rose Vega and Vera Santos are grinding on each other after the last run.",
                  subjectSummary: "Rose Vega, Vera Santos",
                  choices: [
                    {
                      choiceId: "cool_off",
                      label: "Mandate a Cool-Off",
                      description: "Split the pair up for the rest of the day.",
                      consequenceSummary: "Small morale recovery, no dramatic fallout.",
                    },
                  ],
                  boundContext: {
                    operatorIds: ["operator/rose-vega", "operator/vera-santos"],
                  },
                },
              },
            ],
            nextInstanceId: 3,
          };
        },
      },
    ] as const;

    for (const checkpoint of checkpoints) {
      const world = createNewGameWorldSnapshot(templateRegistry);
      checkpoint.configure(world);
      currentSave = createPersistedSave("slot/1", world);

      const session = await resolveRuntimeSession({
        mode: "load",
        slotId: "slot/1",
      });

      if ("beatId" in checkpoint) {
        expect(session.state.phase1View.guidance.activeBeat?.beatId).toBe(checkpoint.beatId);
      }
      expect(session.state.phase1View.guidance.openingPathState).toBe("active");
      if ("expectedRaidCount" in checkpoint) {
        expect(session.state.phase1View.activeRaids).toHaveLength(checkpoint.expectedRaidCount);
      }
      if (checkpoint.expectedInterruptionKind) {
        expect(session.state.phase1View.activeInterruption?.payload.kind).toBe(
          checkpoint.expectedInterruptionKind,
        );
      }

      session.dispose();
    }
  });

  it("resolves preview mode to a seeded interactive session", async () => {
    const session = await resolveRuntimeSession({
      mode: "preview",
    });

    expect(session.mode).toBe("preview");
    expect(session.isPreview).toBe(true);
    expect(session.isSaveBacked).toBe(false);
    expect(session.state.phase1View.rooms.length).toBeGreaterThan(0);
    expect(session.state.phase1View.operators.length).toBe(6);
    expect(session.state.phase1View.operatorIntentReadiness.length).toBeGreaterThan(0);
    expect(session.state.phase1View.relationshipSignals.length).toBeGreaterThan(0);
    expect(session.state.phase1View.staff.length).toBeGreaterThan(0);
    expect(session.state.phase1View.visitors.length).toBe(3);
    expect(session.worldSnapshot.guild.treasury).toBe(500);
    expect(
      session.worldSnapshot.inventoryStacks.some(
        (entry) => entry.itemId === "loot/monster-part/fang",
      ),
    ).toBe(true);
    expect(
      session.state.phase1View.operators.find((operator) => operator.id === "operator/rose-vega")
        ?.appearance.presetId,
    ).toBe("vera-004");
    expect(
      session.state.phase1View.operators.find((operator) => operator.id === "operator/milo-hart")
        ?.appearance.presetId,
    ).toBe("dax-008");
    expect(
      session.state.phase1View.operators.find((operator) => operator.id === "operator/rose-vega")
        ?.appearance.visibleGear,
    ).toEqual({
      weaponPartId: "weapon/tactical-rifle",
      outfitOverlayPartId: "outfit-overlay/tactical-vest",
    });
    expect(session.state.phase1View.rooms.every((room) => room.reservedFootprint.cols > 0)).toBe(
      true,
    );
    expect(session.state.raidWorldSnapshot?.features.length ?? 0).toBeGreaterThan(0);
    expect(session.state.raidWorldSnapshot?.enemies.length ?? 0).toBeGreaterThan(0);
    expect("svgCatalog" in session).toBe(false);
    expect("operatorDetailRecipe" in session.state).toBe(false);
    expect(session.registry.missions.length).toBeGreaterThan(0);
    expect(session.stableCommandTypes).toContain("sim/place-room");
    expect(session.stableCommandTypes).toContain("sim/accept-recruit");
    expect(session.stableCommandTypes).toContain("sim/assign-staff");

    session.dispose();
  });

  it("resumes an occupied new-game slot instead of erroring", async () => {
    const world = createBootstrapWorldSnapshot(templateRegistry);
    world.time = {
      ...world.time,
      tick: 4321,
      minuteOfDay: 555,
    };
    world.guild = {
      ...world.guild,
      treasury: 321,
    };

    const existingSave: PersistedSaveGame = {
      slotId: "slot/1",
      schemaVersion: CURRENT_SAVE_SCHEMA_VERSION,
      compatibilityVersion: CURRENT_CONTENT_COMPATIBILITY,
      metadata: {
        guildName: "Guild Slot 1",
        playerName: "Boss",
        createdAt: "2026-03-21T00:00:00.000Z",
        lastPlayedAt: "2026-03-22T00:00:00.000Z",
      },
      world,
    };

    vi.spyOn(saveStorage, "readSaveGame").mockResolvedValue(existingSave);
    const writeSaveGame = vi.spyOn(saveStorage, "writeSaveGame").mockResolvedValue();

    const session = await resolveRuntimeSession({
      mode: "new",
      slotId: "slot/1",
    });

    expect(session.mode).toBe("load");
    expect(session.isSaveBacked).toBe(true);
    expect(session.worldSnapshot.time.tick).toBe(4321);
    expect(session.worldSnapshot.guild.treasury).toBe(321);
    expect(writeSaveGame).toHaveBeenCalledTimes(1);
    expect(writeSaveGame).toHaveBeenCalledWith(
      expect.objectContaining({
        slotId: "slot/1",
        metadata: expect.objectContaining({
          createdAt: "2026-03-21T00:00:00.000Z",
        }),
        world: expect.objectContaining({
          time: expect.objectContaining({
            tick: 4321,
          }),
          guild: expect.objectContaining({
            treasury: 321,
          }),
        }),
      }),
    );

    session.dispose();
  });

  it("derives live room state changes from HQ upgrades without inventing expansion bays", async () => {
    const session = await resolveRuntimeSession({
      mode: "preview",
    });
    const initialExpansionSlotCount = session.state.hqWorldSnapshot?.expansionSlots.length ?? 0;
    await session.commands.dispatch({
      type: "sim/dev-set-resource",
      resourceId: "resource/reputation",
      amount: 300,
    });
    await session.commands.dispatch({
      type: "sim/dev-set-resource",
      resourceId: "resource/cash",
      amount: 1000,
    });

    await session.commands.purchaseBuildingUpgrade({
      upgradeId: "upgrade/building/bodega:frontage",
    });
    await session.commands.purchaseRoomUpgrade({
      roomId: "room-instance/register",
      upgradeId: "upgrade/room/register:records_wall",
    });

    expect(session.state.phase1View.building.tier).toBe(2);
    expect(session.state.hqWorldSnapshot?.expansionSlots.length).toBe(initialExpansionSlotCount);
    expect(session.worldSnapshot.appliedUpgradeIds).toContain("upgrade/building/bodega:frontage");
    expect(
      session.state.phase1View.rooms.find((room) => room.id === "room-instance/register")
        ?.roomStateId,
    ).toBe("room-state/register:2");
    expect(
      session.state.hqWorldSnapshot?.rooms.find((room) => room.id === "room-instance/register")
        ?.roomStateId,
    ).toBe("room-state/register:2");

    session.dispose();
  });

  it("keeps deployed operators out of the HQ world snapshot", async () => {
    const world = createBodegaWorldSnapshot();
    const missionId = templateRegistry.missions[0]?.id ?? "mission/test";
    world.activeRaidPackets = [
      {
        id: "raid/seeded-1",
        opportunityId: "opportunity/seeded-1",
        contractSiteId: "contract/site-1",
        missionId,
        location: "district/test-site",
        startedAt: "Day 1, 08:00",
        startedTick: 0,
        revealProgress: 0,
        operatorIds: ["operator/rose-vega"],
        returnTick: 99999,
        durationHours: 12,
        threat: 80,
        intel: 45,
        reward: 120,
        cohesion: 60,
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
    world.operators = world.operators?.map((operator) =>
      operator.id === "operator/rose-vega"
        ? {
            ...operator,
            assignment: { kind: "raid", targetId: "raid/seeded-1" },
          }
        : operator,
    );

    vi.spyOn(saveStorage, "readSaveGame").mockResolvedValue({
      slotId: "slot/1",
      schemaVersion: CURRENT_SAVE_SCHEMA_VERSION,
      compatibilityVersion: CURRENT_CONTENT_COMPATIBILITY,
      metadata: {
        guildName: "Guild Slot 1",
        playerName: "Boss",
        createdAt: "2026-03-21T00:00:00.000Z",
        lastPlayedAt: "2026-03-21T00:00:00.000Z",
      },
      world,
    });
    vi.spyOn(saveStorage, "writeSaveGame").mockResolvedValue();

    const session = await resolveRuntimeSession({
      mode: "load",
      slotId: "slot/1",
    });

    expect(
      session.state.hqWorldSnapshot?.actors.some((actor) => actor.id === "operator/rose-vega"),
    ).toBe(false);

    session.dispose();
  });

  it("places recovering operators in the recovery room instead of falling back to the first room", async () => {
    const world = createBodegaWorldSnapshot();
    const recoveryRoom = world.rooms.find((room) => room.id === "room-instance/dining_area");
    expect(recoveryRoom).toBeTruthy();
    world.operators = world.operators?.map((operator) =>
      operator.id === "operator/rose-vega"
        ? {
            ...operator,
            injury: {
              ...operator.injury,
              severity: 35,
              recoveryHoursRemaining: 8,
              treated: true,
            },
          }
        : operator,
    );

    vi.spyOn(saveStorage, "readSaveGame").mockResolvedValue({
      slotId: "slot/1",
      schemaVersion: CURRENT_SAVE_SCHEMA_VERSION,
      compatibilityVersion: CURRENT_CONTENT_COMPATIBILITY,
      metadata: {
        guildName: "Guild Slot 1",
        playerName: "Boss",
        createdAt: "2026-03-21T00:00:00.000Z",
        lastPlayedAt: "2026-03-21T00:00:00.000Z",
      },
      world,
    });
    vi.spyOn(saveStorage, "writeSaveGame").mockResolvedValue();

    const session = await resolveRuntimeSession({
      mode: "load",
      slotId: "slot/1",
    });

    expect(
      session.state.hqWorldSnapshot?.actors.find((actor) => actor.id === "operator/rose-vega")
        ?.roomId,
    ).toBe("room-instance/dining_area");

    session.dispose();
  });

  it("keeps unknown visible gear ids intact when loading a save-backed runtime session", async () => {
    const world = createBootstrapWorldSnapshot(templateRegistry);
    world.operators = world.operators?.map((operator) =>
      operator.id === "operator/rose-vega"
        ? ({
            ...operator,
            appearance: {
              presetId: "mira-002",
              visibleGear: {
                weaponPartId: "weapon/unknown-prototype",
                outfitOverlayPartId: 42,
              },
            },
          } as typeof operator)
        : operator,
    );

    vi.spyOn(saveStorage, "readSaveGame").mockResolvedValue({
      slotId: "slot/1",
      schemaVersion: CURRENT_SAVE_SCHEMA_VERSION,
      compatibilityVersion: CURRENT_CONTENT_COMPATIBILITY,
      metadata: {
        guildName: "Guild Slot 1",
        playerName: "Boss",
        createdAt: "2026-03-21T00:00:00.000Z",
        lastPlayedAt: "2026-03-21T00:00:00.000Z",
      },
      world,
    });
    vi.spyOn(saveStorage, "writeSaveGame").mockResolvedValue();

    const session = await resolveRuntimeSession({
      mode: "load",
      slotId: "slot/1",
    });

    expect(
      session.worldSnapshot.operators?.find((operator) => operator.id === "operator/rose-vega")
        ?.appearance,
    ).toEqual({
      presetId: "mira-002",
      visibleGear: {
        weaponPartId: "weapon/unknown-prototype",
      },
    });
    expect(
      session.state.phase1View.operators.find((operator) => operator.id === "operator/rose-vega")
        ?.appearance,
    ).toEqual({
      presetId: "mira-002",
      visibleGear: {
        weaponPartId: "weapon/unknown-prototype",
      },
    });

    session.dispose();
  });

  it("does not invent HQ placement for staff when no rooms exist", async () => {
    const world = createBootstrapWorldSnapshot(templateRegistry);
    world.rooms = [];
    world.staff = [
      {
        id: "staff/unplaced",
        name: "Jules Mora",
        roleTag: "staff:maintenance",
        status: "available",
        wage: 20,
        assignment: {
          kind: "idle",
          targetId: "",
        },
      },
    ];

    vi.spyOn(saveStorage, "readSaveGame").mockResolvedValue({
      slotId: "slot/1",
      schemaVersion: CURRENT_SAVE_SCHEMA_VERSION,
      compatibilityVersion: CURRENT_CONTENT_COMPATIBILITY,
      metadata: {
        guildName: "Guild Slot 1",
        playerName: "Boss",
        createdAt: "2026-03-21T00:00:00.000Z",
        lastPlayedAt: "2026-03-21T00:00:00.000Z",
      },
      world,
    });
    vi.spyOn(saveStorage, "writeSaveGame").mockResolvedValue();

    const session = await resolveRuntimeSession({
      mode: "load",
      slotId: "slot/1",
    });

    expect(session.state.hqWorldSnapshot?.actors.some((actor) => actor.kind === "staff")).toBe(
      false,
    );

    session.dispose();
  });

  it("places recovering operators into recovery rooms in the HQ world snapshot", async () => {
    const world = createBootstrapWorldSnapshot(templateRegistry);
    const recoveryRoom = world.rooms.find((room) => room.id === "room-instance/dining_area");
    const recoveringOperator = world.operators?.find(
      (operator) => operator.id === "operator/rose-vega",
    );

    expect(recoveryRoom).toBeTruthy();
    expect(recoveringOperator).toBeTruthy();

    world.operators = world.operators?.map((operator) =>
      operator.id === recoveringOperator?.id
        ? {
            ...operator,
            injury: {
              ...operator.injury,
              severity: 42,
              recoveryHoursRemaining: 8,
            },
            assignment: {
              kind: "idle",
              targetId: "",
            },
          }
        : operator,
    );

    vi.spyOn(saveStorage, "readSaveGame").mockResolvedValue({
      slotId: "slot/1",
      schemaVersion: CURRENT_SAVE_SCHEMA_VERSION,
      compatibilityVersion: CURRENT_CONTENT_COMPATIBILITY,
      metadata: {
        guildName: "Guild Slot 1",
        playerName: "Boss",
        createdAt: "2026-03-21T00:00:00.000Z",
        lastPlayedAt: "2026-03-21T00:00:00.000Z",
      },
      world,
    });
    vi.spyOn(saveStorage, "writeSaveGame").mockResolvedValue();

    const session = await resolveRuntimeSession({
      mode: "load",
      slotId: "slot/1",
    });

    const actor = session.state.hqWorldSnapshot?.actors.find(
      (candidate) => candidate.id === recoveringOperator?.id,
    );

    expect(actor?.roomId).toBe(recoveryRoom?.id);

    session.dispose();
  });

  it("advances HQ actor movement between simulation ticks using presentation time", async () => {
    vi.useFakeTimers();

    const world = createBootstrapWorldSnapshot(templateRegistry);
    world.time = {
      ...world.time,
      minuteOfDay: 1079,
    };

    vi.spyOn(saveStorage, "readSaveGame").mockResolvedValue({
      slotId: "slot/1",
      schemaVersion: CURRENT_SAVE_SCHEMA_VERSION,
      compatibilityVersion: CURRENT_CONTENT_COMPATIBILITY,
      metadata: {
        guildName: "Guild Slot 1",
        playerName: "Boss",
        createdAt: "2026-03-21T00:00:00.000Z",
        lastPlayedAt: "2026-03-21T00:00:00.000Z",
      },
      world,
    });
    vi.spyOn(saveStorage, "writeSaveGame").mockResolvedValue();

    const session = await resolveRuntimeSession({
      mode: "load",
      slotId: "slot/1",
    });

    await session.commands.tick(60000);

    const actorAtStart = session.state.hqWorldSnapshot?.actors.find(
      (actor) => actor.id === "operator/rose-vega",
    );

    expect(actorAtStart?.state).toBe("moving");

    const startX = actorAtStart?.x;
    const startY = actorAtStart?.y;
    const startProgress = actorAtStart?.moveProgress ?? 0;

    await vi.advanceTimersByTimeAsync(150);

    const actorInFlight = session.state.hqWorldSnapshot?.actors.find(
      (actor) => actor.id === "operator/rose-vega",
    );

    expect(actorInFlight?.moveProgress ?? 0).toBeGreaterThan(startProgress);
    expect(actorInFlight?.x !== startX || actorInFlight?.y !== startY).toBe(true);

    session.dispose();
  });

  it("drains an already-queued command after dispose closes the session", async () => {
    const session = await resolveRuntimeSession({
      mode: "preview",
    });
    const initialTick = session.worldSnapshot.time.tick;

    const queuedTick = session.commands.tick();
    session.dispose();

    await queuedTick;

    expect(session.worldSnapshot.time.tick).toBeGreaterThan(initialTick);
  });

  it("emits audio cues for place-room commands and drains them", async () => {
    const world = createBodegaWorldSnapshot();
    world.rooms = world.rooms.filter((room) => room.id !== "room-instance/supply_closet");

    vi.spyOn(saveStorage, "readSaveGame").mockResolvedValue({
      slotId: "slot/1",
      schemaVersion: CURRENT_SAVE_SCHEMA_VERSION,
      compatibilityVersion: CURRENT_CONTENT_COMPATIBILITY,
      metadata: {
        guildName: "Guild Slot 1",
        playerName: "Boss",
        createdAt: "2026-03-21T00:00:00.000Z",
        lastPlayedAt: "2026-03-21T00:00:00.000Z",
      },
      world,
    });
    vi.spyOn(saveStorage, "writeSaveGame").mockResolvedValue();

    const session = await resolveRuntimeSession({
      mode: "load",
      slotId: "slot/1",
    });

    session.drainPendingCues();
    await session.commands.placeRoom({ templateId: "room/supply_closet:tier_1" });

    const cues = session.drainPendingCues();
    expect(cues).toEqual(["room.place"]);

    // Second drain returns empty
    expect(session.drainPendingCues()).toEqual([]);

    session.dispose();
  });

  it("emits staff cues only for successful hire and assignment changes", async () => {
    const world = createBodegaWorldSnapshot();

    vi.spyOn(saveStorage, "readSaveGame").mockResolvedValue({
      slotId: "slot/1",
      schemaVersion: CURRENT_SAVE_SCHEMA_VERSION,
      compatibilityVersion: CURRENT_CONTENT_COMPATIBILITY,
      metadata: {
        guildName: "Guild Slot 1",
        playerName: "Boss",
        createdAt: "2026-03-21T00:00:00.000Z",
        lastPlayedAt: "2026-03-21T00:00:00.000Z",
      },
      world,
    });
    vi.spyOn(saveStorage, "writeSaveGame").mockResolvedValue();

    const session = await resolveRuntimeSession({
      mode: "load",
      slotId: "slot/1",
    });

    session.drainPendingCues();

    await session.commands.hireStaff({ roleTag: "staff:reception" });
    expect(session.drainPendingCues()).toEqual(["staff.hire"]);

    const recruitDeskStaff = session.state.phase1View.staff.find(
      (staff) =>
        staff.roleTag === "staff:reception" &&
        staff.assignment.kind === "idle" &&
        staff.assignment.targetId === "",
    );

    expect(recruitDeskStaff).toBeTruthy();

    await session.commands.assignStaff({
      staffId: recruitDeskStaff!.id,
      roomId: "room-instance/register",
    });
    expect(session.drainPendingCues()).toEqual(["staff.assign"]);

    await session.commands.assignStaff({
      staffId: recruitDeskStaff!.id,
      roomId: "room-instance/register",
    });
    expect(session.drainPendingCues()).toEqual([]);

    session.dispose();
  });

  it("emits room.activate and room.deactivate cues based on isActive", async () => {
    const session = await resolveRuntimeSession({ mode: "preview" });
    const roomId = session.state.phase1View.rooms.find((room) => room.isOperational)?.id;
    expect(roomId).toBeTruthy();

    // Deactivate an existing room
    await session.commands.setRoomActive({ roomId: roomId!, isActive: false });
    expect(session.drainPendingCues()).toEqual(["room.deactivate"]);

    // Reactivate it
    await session.commands.setRoomActive({ roomId: roomId!, isActive: true });
    expect(session.drainPendingCues()).toEqual(["room.activate"]);

    session.dispose();
  });

  it("emits hq.floor.switch only when the active floor changes", async () => {
    const world = createBodegaWorldSnapshot();
    world.building = {
      activeBuildingId: "building/porters",
      activeBuildingTier: 1,
      activeFloorIndex: 0,
      roomSlotCount: 7,
      operatorSlotCount: 12,
    };

    vi.spyOn(saveStorage, "readSaveGame").mockResolvedValue(createPersistedSave("slot/1", world));
    vi.spyOn(saveStorage, "writeSaveGame").mockResolvedValue();

    const session = await resolveRuntimeSession({
      mode: "load",
      slotId: "slot/1",
    });

    session.drainPendingCues();

    await session.commands.setActiveFloor({ floorIndex: 1 });
    expect(session.state.phase1View.building.activeFloorIndex).toBe(1);
    expect(session.drainPendingCues()).toEqual(["hq.floor.switch"]);

    await session.commands.setActiveFloor({ floorIndex: 1 });
    expect(session.drainPendingCues()).toEqual([]);

    session.dispose();
  });

  it("supports buying, auto-equipping, unequipping, and reselling items through the runtime session", async () => {
    const itemId = "accessory/field-lead-badge";
    const item = templateRegistry.itemById.get(itemId);
    expect(item).toBeTruthy();

    const world = createBootstrapWorldSnapshot(templateRegistry);
    world.inventoryStacks = [];
    world.operators = world.operators?.map((operator) =>
      operator.id === "operator/rose-vega"
        ? {
            ...operator,
            appearance: {
              presetId: "vera-004",
              visibleGear: {
                weaponPartId: "weapon/tactical-rifle",
                outfitOverlayPartId: "outfit-overlay/tactical-vest",
              },
            },
          }
        : operator,
    );

    vi.spyOn(saveStorage, "readSaveGame").mockResolvedValue({
      slotId: "slot/1",
      schemaVersion: CURRENT_SAVE_SCHEMA_VERSION,
      compatibilityVersion: CURRENT_CONTENT_COMPATIBILITY,
      metadata: {
        guildName: "Guild Slot 1",
        playerName: "Boss",
        createdAt: "2026-03-21T00:00:00.000Z",
        lastPlayedAt: "2026-03-21T00:00:00.000Z",
      },
      world,
    });
    vi.spyOn(saveStorage, "writeSaveGame").mockResolvedValue();

    const session = await resolveRuntimeSession({
      mode: "load",
      slotId: "slot/1",
    });

    const treasuryBefore = session.worldSnapshot.guild.treasury;
    session.drainPendingCues();

    await session.commands.buyItem({ itemId });
    expect(session.worldSnapshot.guild.treasury).toBe(treasuryBefore - item!.buyPrice);
    expect(session.worldSnapshot.inventoryStacks).toEqual([{ itemId, quantity: 1 }]);
    expect(session.drainPendingCues()).toEqual(["hq.market.buy"]);

    await session.commands.autoAssignAccessory({ operatorId: "operator/rose-vega" });
    expect(
      session.state.phase1View.operators.find((operator) => operator.id === "operator/rose-vega")
        ?.appearance.visibleGear,
    ).toEqual({
      weaponPartId: "weapon/tactical-rifle",
      outfitOverlayPartId: "outfit-overlay/tactical-vest",
    });
    expect(session.worldSnapshot.inventoryStacks).toEqual([]);
    expect(session.drainPendingCues()).toEqual(["hq.equip"]);

    await session.commands.unequipItem({
      operatorId: "operator/rose-vega",
      slot: "accessory",
    });
    expect(
      session.state.phase1View.operators.find((operator) => operator.id === "operator/rose-vega")
        ?.appearance.visibleGear,
    ).toEqual({
      weaponPartId: "weapon/tactical-rifle",
      outfitOverlayPartId: "outfit-overlay/tactical-vest",
    });
    expect(session.worldSnapshot.inventoryStacks).toEqual([{ itemId, quantity: 1 }]);
    expect(session.drainPendingCues()).toEqual(["hq.unequip"]);

    await session.commands.sellItem({ itemId, quantity: 1 });
    expect(session.worldSnapshot.guild.treasury).toBe(
      treasuryBefore - item!.buyPrice + item.sellPrice,
    );
    expect(session.worldSnapshot.inventoryStacks).toEqual([]);
    expect(session.drainPendingCues()).toEqual(["hq.market.sell"]);

    session.dispose();
  });

  it("keeps canonical new-game sessions on the sparse starter loadout and supports manual weapon equips", async () => {
    vi.spyOn(saveStorage, "readSaveGame").mockResolvedValue(undefined);
    vi.spyOn(saveStorage, "writeSaveGame").mockResolvedValue();

    const session = await resolveRuntimeSession({
      mode: "new",
      slotId: "slot/1",
    });

    const targetOperator = session.state.phase1View.operators[0];
    expect(targetOperator).toBeDefined();
    expect(targetOperator?.appearance.visibleGear).toBeUndefined();
    expect(session.worldSnapshot.equipmentAssignments).toEqual([]);
    expect(session.worldSnapshot.inventoryStacks).toEqual(
      expect.arrayContaining([
        { itemId: "weapon/pipe-wrench", quantity: 2 },
        { itemId: "weapon/kitchen-knife", quantity: 1 },
      ]),
    );
    session.drainPendingCues();

    await session.commands.equipItem({
      operatorId: targetOperator!.id,
      slot: "weapon",
      itemId: "weapon/pipe-wrench",
    });

    expect(
      session.state.phase1View.operators.find((operator) => operator.id === targetOperator!.id)
        ?.appearance.visibleGear,
    ).toBeUndefined();
    expect(session.worldSnapshot.inventoryStacks).toEqual(
      expect.arrayContaining([
        { itemId: "weapon/pipe-wrench", quantity: 1 },
        { itemId: "weapon/kitchen-knife", quantity: 1 },
      ]),
    );
    expect(session.drainPendingCues()).toEqual(["hq.equip", "event.guidance.beat"]);

    session.dispose();
  });

  it("does not emit cues for failed or idempotent audio-mapped commands", async () => {
    const session = await resolveRuntimeSession({ mode: "preview" });

    await session.commands.placeRoom({ templateId: "room/does-not-exist" });
    expect(session.drainPendingCues()).toEqual([]);

    await session.commands.acceptRecruit({ visitorId: "visitor/does-not-exist" });
    expect(session.drainPendingCues()).toEqual([]);

    const room = session.state.phase1View.rooms[0];
    expect(room).toBeTruthy();
    await session.commands.setRoomActive({ roomId: room!.id, isActive: room!.isOperational });
    expect(session.drainPendingCues()).toEqual([]);

    const staff = session.state.phase1View.staff[0];
    expect(staff).toBeTruthy();
    if (staff?.assignment.targetId) {
      await session.commands.assignStaff({
        staffId: staff.id,
        roomId: staff.assignment.targetId,
      });
    } else {
      await session.commands.assignStaff({ staffId: staff!.id });
    }
    expect(session.drainPendingCues()).toEqual([]);

    await session.commands.setActiveFloor({
      floorIndex: session.state.phase1View.building.activeFloorIndex,
    });
    expect(session.drainPendingCues()).toEqual([]);

    await session.commands.sellItem({ itemId: "accessory/field-lead-badge", quantity: 1 });
    expect(session.drainPendingCues()).toEqual([]);

    await session.commands.autoAssignAccessory({ operatorId: "operator/does-not-exist" });
    expect(session.drainPendingCues()).toEqual([]);

    await session.commands.unequipItem({
      operatorId: "operator/does-not-exist",
      slot: "accessory",
    });
    expect(session.drainPendingCues()).toEqual([]);

    session.dispose();
  });

  it("emits generic interruption transition cues when announcement or warning interruptions rotate", async () => {
    const world = createNewGameWorldSnapshot(templateRegistry);
    (world as Record<string, unknown>).interruptionQueue = {
      active: {
        instanceId: "interruption-1",
        type: "announcement",
        priority: 50,
        blockingMode: "blocking",
        createdAtMinute: 120,
        sourceSystem: "test",
        dismissible: false,
        persistence: "transient",
        payload: {
          kind: "announcement",
          title: "Heads Up",
          message: "Testing generic interruption cues.",
        },
      },
      queue: [
        {
          instanceId: "interruption-2",
          type: "warning",
          priority: 100,
          blockingMode: "blocking",
          createdAtMinute: 121,
          sourceSystem: "test",
          dismissible: false,
          persistence: "persistent",
          payload: {
            kind: "warning",
            title: "Danger",
            message: "Testing generic interruption promotion.",
            severity: "critical",
          },
        },
      ],
      nextInstanceId: 3,
    };

    vi.spyOn(saveStorage, "readSaveGame").mockResolvedValue(createPersistedSave("slot/1", world));
    vi.spyOn(saveStorage, "writeSaveGame").mockResolvedValue();

    const session = await resolveRuntimeSession({
      mode: "load",
      slotId: "slot/1",
    });

    session.drainPendingCues();
    await session.commands.dispatch({
      type: "sim/interruption-resolve",
      instanceId: "interruption-1",
    });

    expect(session.drainPendingCues()).toEqual([
      "event.interruption.resolve",
      "event.interruption.open",
    ]);

    session.dispose();
  });

  it("emits operator.recruit cue on accept-recruit", async () => {
    const session = await resolveRuntimeSession({ mode: "preview" });

    const visitor = session.state.phase1View.visitors[0];
    if (visitor) {
      await session.commands.dispatch({
        type: "sim/dev-set-resource",
        resourceId: "resource/reputation",
        amount: 12,
      });
      await session.commands.purchaseBuildingUpgrade({
        upgradeId: "upgrade/building/bodega:frontage",
      });
      session.drainPendingCues();

      await session.commands.acceptRecruit({ visitorId: visitor.id });
      expect(session.drainPendingCues()).toContain("operator.recruit");
    }

    session.dispose();
  });

  it("places recovering operators and recruitment staff into matching room functions", async () => {
    const world = createBodegaWorldSnapshot();
    const recoveryRoom = world.rooms.find((room) => room.id === "room-instance/dining_area");
    expect(recoveryRoom).toBeTruthy();
    world.operators = world.operators?.map((operator) =>
      operator.id === "operator/rose-vega"
        ? {
            ...operator,
            assignment: {
              kind: "idle",
              targetId: "",
            },
            injury: {
              ...operator.injury,
              severity: 40,
              recoveryHoursRemaining: 6,
            },
            schedule: {
              ...operator.schedule,
              currentBlock: "recovery",
            },
          }
        : operator,
    );
    world.staff = world.staff?.map((staff) =>
      staff.id === "staff/aina"
        ? {
            ...staff,
            roleTag: "staff:admin",
            assignment: {
              kind: "room",
              targetId: "room-instance/register",
            },
          }
        : staff,
    );

    vi.spyOn(saveStorage, "readSaveGame").mockResolvedValue({
      slotId: "slot/1",
      schemaVersion: CURRENT_SAVE_SCHEMA_VERSION,
      compatibilityVersion: CURRENT_CONTENT_COMPATIBILITY,
      metadata: {
        guildName: "Guild Slot 1",
        playerName: "Boss",
        createdAt: "2026-03-21T00:00:00.000Z",
        lastPlayedAt: "2026-03-21T00:00:00.000Z",
      },
      world,
    });
    vi.spyOn(saveStorage, "writeSaveGame").mockResolvedValue();

    const session = await resolveRuntimeSession({
      mode: "load",
      slotId: "slot/1",
    });

    expect(
      session.state.hqWorldSnapshot?.actors.find((actor) => actor.id === "operator/rose-vega")
        ?.roomId,
    ).toBe("room-instance/dining_area");
    expect(
      session.state.hqWorldSnapshot?.actors.find(
        (actor) => actor.kind === "staff" && actor.roleTag === "staff:admin",
      )?.roomId,
    ).toBe("room-instance/register");

    session.dispose();
  });

  it("does not emit cues for tick commands", async () => {
    const session = await resolveRuntimeSession({ mode: "preview" });

    await session.commands.tick();
    expect(session.drainPendingCues()).toEqual([]);

    session.dispose();
  });

  it("emits autonomous raid launch cues from simulation-owned raid formation", async () => {
    const world = createPreviewWorldSnapshot(templateRegistry);
    const missionId = templateRegistry.missions[0]?.id ?? "mission/test";
    world.raidOpportunities = [
      {
        id: "opportunity/seeded-1",
        missionId,
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

    vi.spyOn(saveStorage, "readSaveGame").mockResolvedValue({
      slotId: "slot/1",
      schemaVersion: CURRENT_SAVE_SCHEMA_VERSION,
      compatibilityVersion: CURRENT_CONTENT_COMPATIBILITY,
      metadata: {
        guildName: "Guild Slot 1",
        playerName: "Boss",
        createdAt: "2026-03-21T00:00:00.000Z",
        lastPlayedAt: "2026-03-21T00:00:00.000Z",
      },
      world,
    });
    vi.spyOn(saveStorage, "writeSaveGame").mockResolvedValue();

    const session = await resolveRuntimeSession({
      mode: "load",
      slotId: "slot/1",
    });

    session.drainPendingCues();
    expect(session.state.phase1View.raidOpportunities[0]?.status).toBe("forming");

    await session.commands.tick(60000);

    const cues = session.drainPendingCues();
    expect(cues).toContain("raid.launch");
    expect(session.state.phase1View.activeRaids.length).toBeGreaterThan(0);

    session.dispose();
  });

  it("emits autonomous raid failure and death cues when a due raid resolves with fatalities", async () => {
    const world = createBootstrapWorldSnapshot(templateRegistry);
    const missionId = templateRegistry.missions[0]?.id ?? "mission/test";
    world.activeRaidPackets = [
      {
        id: "raid/1",
        opportunityId: "opportunity/1",
        missionId,
        location: "district/test-site",
        startedAt: "Day 1, 08:00",
        startedTick: 0,
        revealProgress: 95,
        operatorIds: ["operator/rose-vega"],
        returnTick: 0,
        durationHours: 1,
        threat: 90,
        intel: 12,
        reward: 80,
        cohesion: 41,
        resolutionPacket: {
          result: "failure",
          reputationDelta: -5,
          cashDelta: -12,
          operatorOutcomes: [
            {
              operatorId: "operator/rose-vega",
              injuryDelta: 100,
              moraleDelta: -10,
              loyaltyDelta: -7,
              status: "hurt",
              died: true,
            },
          ],
          narrativeTags: [],
          intelMismatchTags: [],
        },
      },
    ];

    vi.spyOn(saveStorage, "readSaveGame").mockResolvedValue({
      slotId: "slot/1",
      schemaVersion: CURRENT_SAVE_SCHEMA_VERSION,
      compatibilityVersion: CURRENT_CONTENT_COMPATIBILITY,
      metadata: {
        guildName: "Guild Slot 1",
        playerName: "Boss",
        createdAt: "2026-03-21T00:00:00.000Z",
        lastPlayedAt: "2026-03-21T00:00:00.000Z",
      },
      world,
    });
    vi.spyOn(saveStorage, "writeSaveGame").mockResolvedValue();

    const session = await resolveRuntimeSession({
      mode: "load",
      slotId: "slot/1",
    });

    session.drainPendingCues();
    await session.commands.tick(60 * 60 * 1000);

    const cues = session.drainPendingCues();
    expect(cues).toContain("raid.return.failure");
    expect(cues).toContain("raid.death");
    expect(
      session.state.phase1View.operators.find((operator) => operator.id === "operator/rose-vega")
        ?.lifecycle.status,
    ).toBe("dead");

    session.dispose();
  });

  it("emits pressure-event cues when a new pressure event surfaces on tick", async () => {
    const world = createBootstrapWorldSnapshot(templateRegistry);
    world.guild.treasury = 0;
    world.operators = world.operators?.map((operator) =>
      operator.id === "operator/rose-vega"
        ? {
            ...operator,
            injury: {
              ...operator.injury,
              severity: 45,
              recoveryHoursRemaining: 6,
            },
          }
        : operator,
    );

    vi.spyOn(saveStorage, "readSaveGame").mockResolvedValue({
      slotId: "slot/1",
      schemaVersion: CURRENT_SAVE_SCHEMA_VERSION,
      compatibilityVersion: CURRENT_CONTENT_COMPATIBILITY,
      metadata: {
        guildName: "Guild Slot 1",
        playerName: "Boss",
        createdAt: "2026-03-21T00:00:00.000Z",
        lastPlayedAt: "2026-03-21T00:00:00.000Z",
      },
      world,
    });
    vi.spyOn(saveStorage, "writeSaveGame").mockResolvedValue();

    const session = await resolveRuntimeSession({
      mode: "load",
      slotId: "slot/1",
    });

    session.drainPendingCues();
    await session.commands.tick(60 * 60 * 1000);

    expect(session.state.phase1View.activeEvents.length).toBeGreaterThan(0);
    expect(session.drainPendingCues()).toContain("event.pressure");

    session.dispose();
  });

  it("never includes audio cues in persisted save state", async () => {
    vi.spyOn(saveStorage, "readSaveGame").mockResolvedValue(undefined);
    const persistedWrites: PersistedSaveGame[] = [];
    vi.spyOn(saveStorage, "writeSaveGame").mockImplementation(async (save) => {
      persistedWrites.push(save);
    });

    const session = await resolveRuntimeSession({
      mode: "new",
      slotId: "slot/1",
    });

    await session.commands.placeRoom({ templateId: "room/break-room" });
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Verify persisted writes never contain pendingCues
    for (const write of persistedWrites) {
      expect("pendingCues" in write).toBe(false);
      expect("pendingCues" in write.world).toBe(false);
    }

    session.dispose();
  });

  it("tracks persistence errors after a save-backed mutation fails to write", async () => {
    vi.spyOn(saveStorage, "readSaveGame").mockResolvedValue(undefined);
    vi.spyOn(saveStorage, "writeSaveGame")
      .mockResolvedValueOnce()
      .mockRejectedValueOnce(new Error("disk full"));

    const session = await resolveRuntimeSession({
      mode: "new",
      slotId: "slot/1",
    });

    await session.commands.placeRoom({ templateId: "room/break-room" });
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(session.persistence.status).toBe("error");
    expect(session.persistence.errorMessage).toBe("disk full");
    expect(session.state.persistence.status).toBe("error");
    expect(session.state.persistence.errorMessage).toBe("disk full");

    session.dispose();
  });

  it("delays tick-driven autosaves until the autosave interval elapses", async () => {
    vi.useFakeTimers();

    vi.spyOn(saveStorage, "readSaveGame").mockResolvedValue(undefined);
    const writeSaveGame = vi.spyOn(saveStorage, "writeSaveGame").mockResolvedValue();

    const session = await resolveRuntimeSession({
      mode: "new",
      slotId: "slot/1",
    });

    expect(writeSaveGame).toHaveBeenCalledTimes(1);

    await session.commands.tick();
    await vi.advanceTimersByTimeAsync(0);

    expect(writeSaveGame).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(AUTOSAVE_INTERVAL_MS);

    expect(writeSaveGame).toHaveBeenCalledTimes(2);
    expect(writeSaveGame.mock.calls[1]?.[0].world.time.tick).toBe(session.worldSnapshot.time.tick);

    session.dispose();
  });

  it("flushes the latest queued save writeback after dispose during an in-flight save", async () => {
    vi.spyOn(saveStorage, "readSaveGame").mockResolvedValue(undefined);

    const inFlightPersist = createDeferredPromise<void>();
    const persistedWrites: PersistedSaveGame[] = [];
    let writeCallCount = 0;

    vi.spyOn(saveStorage, "writeSaveGame").mockImplementation(async (save) => {
      writeCallCount += 1;
      persistedWrites.push(save);

      if (writeCallCount === 2) {
        await inFlightPersist.promise;
      }
    });

    const session = await resolveRuntimeSession({
      mode: "new",
      slotId: "slot/1",
    });

    await session.commands.placeRoom({ templateId: "room/break-room" });
    await session.commands.tick();
    const latestTick = session.worldSnapshot.time.tick;

    session.dispose();
    inFlightPersist.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(persistedWrites).toHaveLength(3);
    expect(persistedWrites[2]?.world.time.tick).toBe(latestTick);
  });

  it("pauses and resumes autonomous ticking when a modal freeze reason is active", async () => {
    vi.useFakeTimers();

    const session = await resolveRuntimeSession({ mode: "preview" });
    session.lifecycle.startAutoTick();

    expect(session.isPaused).toBe(false);
    expect(session.isAutoTicking).toBe(true);
    expect(session.state.isPaused).toBe(false);
    expect(session.state.isAutoTicking).toBe(true);

    await vi.advanceTimersByTimeAsync(AUTONOMOUS_TICK_INTERVAL_MS);
    const tickBeforePause = session.worldSnapshot.time.tick;

    session.lifecycle.pause("modal");
    expect(session.isPaused).toBe(true);
    expect(session.isAutoTicking).toBe(false);
    expect(session.state.isPaused).toBe(true);
    expect(session.state.isAutoTicking).toBe(false);

    await vi.advanceTimersByTimeAsync(AUTONOMOUS_TICK_INTERVAL_MS * 3);
    expect(session.worldSnapshot.time.tick).toBe(tickBeforePause);

    session.lifecycle.resume("modal");
    expect(session.isPaused).toBe(false);
    expect(session.isAutoTicking).toBe(true);
    expect(session.state.isPaused).toBe(false);
    expect(session.state.isAutoTicking).toBe(true);

    await vi.advanceTimersByTimeAsync(AUTONOMOUS_TICK_INTERVAL_MS);
    expect(session.worldSnapshot.time.tick).toBeGreaterThan(tickBeforePause);

    session.dispose();
  });
});

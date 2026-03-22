import { afterEach, describe, expect, it, vi } from "vitest";

import { templateRegistry } from "content/templates";
import {
  CURRENT_CONTENT_COMPATIBILITY,
  CURRENT_SAVE_SCHEMA_VERSION,
  saveStorage,
  type PersistedSaveGame,
} from "save";
import { createBootstrapWorldSnapshot } from "sim";

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

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("runtime route request parsing", () => {
  it("defaults to preview mode for empty search params", () => {
    expect(parseRuntimeRouteRequest("")).toEqual({
      mode: "preview",
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

describe("runtime session lifecycle", () => {
  it("resolves preview mode to a seeded interactive session", async () => {
    const session = await resolveRuntimeSession({
      mode: "preview",
    });

    expect(session.mode).toBe("preview");
    expect(session.isPreview).toBe(true);
    expect(session.isSaveBacked).toBe(false);
    expect(session.state.phase1View.rooms.length).toBeGreaterThan(0);
    expect(session.state.phase1View.operators.length).toBeGreaterThan(0);
    expect(session.state.phase1View.operatorIntentReadiness.length).toBeGreaterThan(0);
    expect(session.state.phase1View.relationshipSignals.length).toBeGreaterThan(0);
    expect(session.state.phase1View.staff.length).toBeGreaterThan(0);
    expect(session.state.phase1View.visitors.length).toBeGreaterThan(0);
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
    expect(session.state.phase1View.rooms.every((room) => room.footprint.cols > 0)).toBe(true);
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

  it("keeps deployed operators out of the HQ world snapshot", async () => {
    const world = createBootstrapWorldSnapshot(templateRegistry);
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
    const world = createBootstrapWorldSnapshot(templateRegistry);
    world.rooms.push({
      id: "room-instance/infirmary",
      templateId: "room/infirmary:tier_1",
      tier: 1,
      capacity: 2,
      occupancy: 0,
      isActive: true,
      footprint: {
        col: 8,
        row: 0,
        cols: 4,
        rows: 3,
      },
    });
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
    ).toBe("room-instance/infirmary");

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
    world.rooms.push({
      id: "room-instance/infirmary",
      templateId: "room/infirmary:tier_1",
      tier: 1,
      capacity: 2,
      occupancy: 0,
      isActive: true,
      footprint: {
        col: 8,
        row: 0,
        cols: 4,
        rows: 3,
      },
    });
    const recoveryRoom = world.rooms.find((room) => room.id === "room-instance/infirmary");
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
    const session = await resolveRuntimeSession({ mode: "preview" });

    await session.commands.purchaseBuildingUpgrade({
      upgradeId: "upgrade/building/bodega:annex",
    });
    session.drainPendingCues();
    await session.commands.placeRoom({ templateId: "room/infirmary:tier_1" });

    const cues = session.drainPendingCues();
    expect(cues).toEqual(["room.place"]);

    // Second drain returns empty
    expect(session.drainPendingCues()).toEqual([]);

    session.dispose();
  });

  it("emits staff cues only for successful hire and assignment changes", async () => {
    const session = await resolveRuntimeSession({ mode: "preview" });

    await session.commands.purchaseBuildingUpgrade({
      upgradeId: "upgrade/building/bodega:annex",
    });
    session.drainPendingCues();

    await session.commands.hireStaff({ roleTag: "staff:admin" });
    expect(session.drainPendingCues()).toEqual(["staff.hire"]);

    const recruiter = session.state.phase1View.staff.find(
      (staff) =>
        staff.roleTag === "staff:admin" &&
        staff.assignment.kind === "idle" &&
        staff.assignment.targetId === "",
    );

    expect(recruiter).toBeTruthy();

    await session.commands.assignStaff({
      staffId: recruiter!.id,
      roomId: "room-instance/recruitment_space",
    });
    expect(session.drainPendingCues()).toEqual(["staff.assign"]);

    await session.commands.assignStaff({
      staffId: recruiter!.id,
      roomId: "room-instance/recruitment_space",
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

    session.dispose();
  });

  it("emits operator.recruit cue on accept-recruit", async () => {
    const session = await resolveRuntimeSession({ mode: "preview" });

    const visitor = session.state.phase1View.visitors[0];
    if (visitor) {
      await session.commands.purchaseBuildingUpgrade({
        upgradeId: "upgrade/building/bodega:annex",
      });
      session.drainPendingCues();

      await session.commands.hireStaff({ roleTag: "staff:admin" });
      session.drainPendingCues();

      const recruiter = session.state.phase1View.staff.find(
        (staff) =>
          staff.roleTag === "staff:admin" &&
          staff.assignment.kind === "idle" &&
          staff.assignment.targetId === "",
      );

      expect(recruiter).toBeTruthy();

      await session.commands.assignStaff({
        staffId: recruiter!.id,
        roomId: "room-instance/recruitment_space",
      });
      session.drainPendingCues();

      await session.commands.setRoomActive({
        roomId: "room-instance/recruitment_space",
        isActive: true,
      });
      session.drainPendingCues();

      await session.commands.acceptRecruit({ visitorId: visitor.id });
      expect(session.drainPendingCues()).toContain("operator.recruit");
    }

    session.dispose();
  });

  it("places recovering operators and recruitment staff into matching room functions", async () => {
    const world = createBootstrapWorldSnapshot(templateRegistry);
    const infirmaryTemplate = templateRegistry.roomById.get("room/infirmary:tier_1");
    expect(infirmaryTemplate).toBeTruthy();

    world.rooms = [
      ...(world.rooms ?? []),
      {
        id: "room-instance/infirmary",
        templateId: infirmaryTemplate!.id,
        tier: infirmaryTemplate!.tier,
        capacity: infirmaryTemplate!.baseCapacity,
        occupancy: 0,
        isActive: true,
        footprint: {
          col: 8,
          row: 0,
          cols: 4,
          rows: 3,
        },
      },
    ];
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
              kind: "idle",
              targetId: "",
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
    ).toBe("room-instance/infirmary");
    expect(
      session.state.hqWorldSnapshot?.actors.find(
        (actor) => actor.kind === "staff" && actor.roleTag === "staff:admin",
      )?.roomId,
    ).toBe("room-instance/recruitment_space");

    session.dispose();
  });

  it("does not emit cues for tick commands", async () => {
    const session = await resolveRuntimeSession({ mode: "preview" });

    await session.commands.tick();
    expect(session.drainPendingCues()).toEqual([]);

    session.dispose();
  });

  it("emits autonomous raid launch cues from simulation-owned raid formation", async () => {
    const world = createBootstrapWorldSnapshot(templateRegistry);
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

    await session.commands.tick();
    await session.commands.tick();
    const latestTick = session.worldSnapshot.time.tick;

    session.dispose();
    inFlightPersist.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(persistedWrites).toHaveLength(3);
    expect(persistedWrites[2]?.world.time.tick).toBe(latestTick);
  });
});

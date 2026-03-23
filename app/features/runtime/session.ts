import { templateRegistry } from "content/templates";
import { buildRaidWorldSnapshot, composeHqWorldGeometry, createHqWorldSnapshot } from "render";
import type {
  ActorMarker,
  ActorState,
  FogCell,
  HqWorldSnapshot,
  NavAnchorKind,
  RaidTeamMarker,
  RaidWorldSnapshot,
} from "render";
import {
  CURRENT_CONTENT_COMPATIBILITY,
  CURRENT_SAVE_SCHEMA_VERSION,
  SAVE_SLOT_IDS,
  saveStorage,
  type PersistedSaveGame,
  type SaveSlotId,
  type WorldSnapshot,
} from "save";
import {
  STABLE_SIM_COMMAND_TYPES,
  createAscensionSimulation,
  createBootstrapWorldSnapshot,
  findPath,
  interpolatePathPosition,
  resolveRoomAnchor,
  type AscensionSimulation,
  type NavPath,
  type RuntimeEvent,
  type SimCommand,
  type StableSimCommandType,
} from "sim";
import { stableStringHash } from "lib/stable-hash";
import type { AudioCueId } from "app/features/audio";

const AUTONOMOUS_TICK_INTERVAL_MS = 1000;
const PRESENTATION_FRAME_INTERVAL_MS = 50;

/** Duration for an actor to travel between rooms (ms). */
const ACTOR_MOVE_DURATION_MS = 800;

/**
 * Transient per-actor movement state.
 * Not persisted; purely presentation-layer animation.
 */
interface ActorMovement {
  fromRoomId: string;
  toRoomId: string;
  path: NavPath;
  startedAtMs: number;
  durationMs: number;
}

type RuntimePhase1View = ReturnType<AscensionSimulation["getPhase1View"]>;
type RuntimeSessionListener = (session: RuntimeSession) => void;

export type RuntimeRouteMode = "preview" | "new" | "load";

export interface RuntimeRouteRequest {
  mode: RuntimeRouteMode;
  slotId?: SaveSlotId;
}

export interface RuntimeSessionPersistenceState {
  status: "idle" | "saving" | "error";
  lastSavedAt?: string;
  errorMessage?: string;
}

export interface RuntimeSessionViewState {
  worldSnapshot: WorldSnapshot;
  phase1View: RuntimePhase1View;
  hqWorldSnapshot: HqWorldSnapshot | null;
  raidWorldSnapshot: RaidWorldSnapshot | null;
  isPreview: boolean;
  isSaveBacked: boolean;
  isAutoTicking: boolean;
  persistence: RuntimeSessionPersistenceState;
}

export interface RuntimeSessionLifecycle {
  autoTickIntervalMs: number;
  startAutoTick(): void;
  stopAutoTick(): void;
  refresh(): void;
}

export interface RuntimeSessionCommands {
  dispatch(command: SimCommand): Promise<void>;
  tick(deltaMs?: number): Promise<void>;
  placeRoom(input: Omit<Extract<SimCommand, { type: "sim/place-room" }>, "type">): Promise<void>;
  setRoomActive(
    input: Omit<Extract<SimCommand, { type: "sim/set-room-active" }>, "type">,
  ): Promise<void>;
  purchaseBuildingUpgrade(
    input: Omit<Extract<SimCommand, { type: "sim/purchase-building-upgrade" }>, "type">,
  ): Promise<void>;
  purchaseRoomUpgrade(
    input: Omit<Extract<SimCommand, { type: "sim/purchase-room-upgrade" }>, "type">,
  ): Promise<void>;
  acceptRecruit(
    input: Omit<Extract<SimCommand, { type: "sim/accept-recruit" }>, "type">,
  ): Promise<void>;
  rejectRecruit(
    input: Omit<Extract<SimCommand, { type: "sim/reject-recruit" }>, "type">,
  ): Promise<void>;
  hireStaff(input: Omit<Extract<SimCommand, { type: "sim/hire-staff" }>, "type">): Promise<void>;
  assignStaff(
    input: Omit<Extract<SimCommand, { type: "sim/assign-staff" }>, "type">,
  ): Promise<void>;
  buyItem(input: Omit<Extract<SimCommand, { type: "sim/buy-item" }>, "type">): Promise<void>;
  sellItem(input: Omit<Extract<SimCommand, { type: "sim/sell-item" }>, "type">): Promise<void>;
  autoAssignAccessory(
    input: Omit<Extract<SimCommand, { type: "sim/auto-assign-accessory" }>, "type">,
  ): Promise<void>;
  unequipItem(
    input: Omit<Extract<SimCommand, { type: "sim/unequip-item" }>, "type">,
  ): Promise<void>;
}

export interface RuntimeSession {
  mode: RuntimeRouteMode;
  slotId?: SaveSlotId;
  save?: PersistedSaveGame;
  registry: typeof templateRegistry;
  simulation: AscensionSimulation;
  stableCommandTypes: readonly StableSimCommandType[];
  state: RuntimeSessionViewState;
  phase1View: RuntimePhase1View;
  worldSnapshot: WorldSnapshot;
  isPreview: boolean;
  isSaveBacked: boolean;
  isAutoTicking: boolean;
  persistence: RuntimeSessionPersistenceState;
  commands: RuntimeSessionCommands;
  lifecycle: RuntimeSessionLifecycle;
  subscribe(listener: RuntimeSessionListener): () => void;
  drainPendingCues(): readonly AudioCueId[];
  drainPendingEvents(): readonly RuntimeEvent[];
  dispose(): void;
}

function getTimestamp(): string {
  return new Date().toISOString();
}

function getSlotNumber(slotId: SaveSlotId): number {
  return SAVE_SLOT_IDS.indexOf(slotId) + 1;
}

function getPersistenceErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unable to persist the runtime session.";
}

function createNewSaveGame(slotId: SaveSlotId): PersistedSaveGame {
  const timestamp = getTimestamp();

  return {
    slotId,
    schemaVersion: CURRENT_SAVE_SCHEMA_VERSION,
    compatibilityVersion: CURRENT_CONTENT_COMPATIBILITY,
    metadata: {
      guildName: `Guild Slot ${getSlotNumber(slotId)}`,
      createdAt: timestamp,
      lastPlayedAt: timestamp,
    },
    world: createBootstrapWorldSnapshot(templateRegistry),
  };
}

function assertSlotId(slotId: SaveSlotId | undefined): SaveSlotId {
  if (!slotId) {
    throw new Error("No save slot was selected.");
  }

  return slotId;
}

function assertCompatibleSave(save: PersistedSaveGame): void {
  if (save.schemaVersion !== CURRENT_SAVE_SCHEMA_VERSION) {
    throw new Error(
      `Save schema ${save.schemaVersion} is not compatible with schema ${CURRENT_SAVE_SCHEMA_VERSION}.`,
    );
  }

  if (save.compatibilityVersion !== CURRENT_CONTENT_COMPATIBILITY) {
    throw new Error(
      `Save compatibility "${save.compatibilityVersion}" does not match "${CURRENT_CONTENT_COMPATIBILITY}".`,
    );
  }
}

function buildRuntimeSessionState(session: RuntimeSession): RuntimeSessionViewState {
  return {
    worldSnapshot: session.worldSnapshot,
    phase1View: session.phase1View,
    hqWorldSnapshot: session.state.hqWorldSnapshot,
    raidWorldSnapshot: session.state.raidWorldSnapshot,
    isPreview: session.isPreview,
    isSaveBacked: session.isSaveBacked,
    isAutoTicking: session.isAutoTicking,
    persistence: { ...session.persistence },
  };
}

function createPersistedSessionSave(session: RuntimeSession): PersistedSaveGame {
  if (!session.save) {
    throw new Error("Cannot persist a runtime session that is not save-backed.");
  }

  return {
    ...session.save,
    metadata: {
      ...session.save.metadata,
      lastPlayedAt: getTimestamp(),
    },
    world: session.worldSnapshot,
  };
}

function resolveCuesForCommand(
  command: SimCommand,
  beforeWorldSnapshot: WorldSnapshot,
  afterWorldSnapshot: WorldSnapshot,
  beforePhase1View: RuntimePhase1View,
  afterPhase1View: RuntimePhase1View,
): AudioCueId[] {
  switch (command.type) {
    case "sim/place-room": {
      return afterPhase1View.rooms.length > beforePhase1View.rooms.length ? ["room.place"] : [];
    }
    case "sim/set-room-active": {
      const previousRoom = beforePhase1View.rooms.find((room) => room.id === command.roomId);
      const nextRoom = afterPhase1View.rooms.find((room) => room.id === command.roomId);
      if (!previousRoom || !nextRoom || previousRoom.isOperational === nextRoom.isOperational) {
        return [];
      }

      return [nextRoom.isOperational ? "room.activate" : "room.deactivate"];
    }
    case "sim/accept-recruit": {
      const previousOperatorCount = beforePhase1View.operators.filter(
        (operator) => operator.lifecycle.status === "active",
      ).length;
      const nextOperatorCount = afterPhase1View.operators.filter(
        (operator) => operator.lifecycle.status === "active",
      ).length;
      return nextOperatorCount > previousOperatorCount ? ["operator.recruit"] : [];
    }
    case "sim/hire-staff": {
      return afterWorldSnapshot.staff.length > beforeWorldSnapshot.staff.length
        ? ["staff.hire"]
        : [];
    }
    case "sim/assign-staff": {
      const previousStaff = beforeWorldSnapshot.staff.find((staff) => staff.id === command.staffId);
      const nextStaff = afterWorldSnapshot.staff.find((staff) => staff.id === command.staffId);
      if (
        !previousStaff ||
        !nextStaff ||
        (previousStaff.assignment.kind === nextStaff.assignment.kind &&
          previousStaff.assignment.targetId === nextStaff.assignment.targetId)
      ) {
        return [];
      }

      return ["staff.assign"];
    }
    case "sim/purchase-building-upgrade": {
      return afterWorldSnapshot.appliedUpgradeIds.length >
        beforeWorldSnapshot.appliedUpgradeIds.length
        ? ["hq.upgrade"]
        : [];
    }
    case "sim/purchase-room-upgrade": {
      const previousRoom = beforeWorldSnapshot.rooms.find((room) => room.id === command.roomId);
      const nextRoom = afterWorldSnapshot.rooms.find((room) => room.id === command.roomId);
      if (!previousRoom || !nextRoom) return [];
      const prevCount = previousRoom.appliedUpgradeIds?.length ?? 0;
      const nextCount = nextRoom.appliedUpgradeIds?.length ?? 0;
      return nextCount > prevCount ? ["hq.upgrade"] : [];
    }
    case "sim/reject-recruit": {
      return afterPhase1View.visitors.length < beforePhase1View.visitors.length
        ? ["hq.dismiss"]
        : [];
    }
    default:
      return [];
  }
}

function createRuntimeSession(
  worldSnapshot: WorldSnapshot,
  options: {
    mode: RuntimeRouteMode;
    slotId?: SaveSlotId;
    save?: PersistedSaveGame;
  },
): RuntimeSession {
  const simulation = createAscensionSimulation(worldSnapshot, templateRegistry);
  const listeners = new Set<RuntimeSessionListener>();
  const isPreview = options.mode === "preview";
  const isSaveBacked = !isPreview && options.save !== undefined;

  let closed = false;
  let autoTickInterval: ReturnType<typeof setInterval> | undefined;
  let presentationRefreshInterval: ReturnType<typeof setInterval> | undefined;
  let autoTickPending = false;
  let mutationQueue = Promise.resolve();
  let persistQueued = false;
  let persistPromise: Promise<void> | undefined;
  const pendingCues: AudioCueId[] = [];
  const pendingEvents: RuntimeEvent[] = [];
  /** Transient movement state per actor. Key is actor id. */
  const actorMovements = new Map<string, ActorMovement>();
  /** Previous room assignment per actor. Key is actor id. */
  const actorPreviousRoomId = new Map<string, string>();
  let session!: RuntimeSession;

  const syncPresentationRefresh = () => {
    if (closed || actorMovements.size === 0) {
      if (presentationRefreshInterval) {
        clearInterval(presentationRefreshInterval);
        presentationRefreshInterval = undefined;
      }
      return;
    }

    if (presentationRefreshInterval) {
      return;
    }

    presentationRefreshInterval = setInterval(() => {
      if (closed) {
        clearInterval(presentationRefreshInterval);
        presentationRefreshInterval = undefined;
        return;
      }

      session.state.hqWorldSnapshot = deriveHqWorldSnapshot(session.phase1View, Date.now());
      session.state = buildRuntimeSessionState(session);
      notifyListeners();

      if (actorMovements.size === 0 && presentationRefreshInterval) {
        clearInterval(presentationRefreshInterval);
        presentationRefreshInterval = undefined;
      }
    }, PRESENTATION_FRAME_INTERVAL_MS);
  };

  const refreshDerivedState = (nowMs = Date.now()) => {
    const nextWorldSnapshot = simulation.getWorldSnapshot();
    const nextPhase1View = simulation.getPhase1View(nextWorldSnapshot);

    session.worldSnapshot = nextWorldSnapshot;
    session.phase1View = nextPhase1View;
    session.state.hqWorldSnapshot = deriveHqWorldSnapshot(nextPhase1View, nowMs);
    session.state.raidWorldSnapshot = deriveRaidWorldSnapshot(nextPhase1View);
    syncPresentationRefresh();
    session.state = buildRuntimeSessionState(session);
  };

  function resolveActorState(scheduleBlock: string): ActorState {
    switch (scheduleBlock) {
      case "raid":
        return "deployed";
      case "recovery":
        return "recovering";
      case "social":
        return "socializing";
      case "work":
        return "working";
      case "rest":
        return "resting";
      case "training":
        return "training";
      default:
        return "idle";
    }
  }

  function computeRoomAnchorPosition(
    roomId: string,
    actorId: string,
    navGraph: ReturnType<typeof composeHqWorldGeometry>["navGraph"],
    preferredKind: NavAnchorKind = "idle",
  ): { x: number; y: number } {
    const roomAnchors = navGraph.anchors.filter((anchor) => anchor.roomId === roomId);
    if (roomAnchors.length === 0) {
      // Fallback: use any available anchor, or the center of the first room.
      const anyAnchor = navGraph.anchors[0];
      if (anyAnchor) return { x: anyAnchor.x, y: anyAnchor.y + 26 };
      return { x: 400, y: 400 };
    }

    const orderedAnchors = [
      ...roomAnchors.filter((anchor) => anchor.kind === preferredKind),
      ...roomAnchors.filter((anchor) => anchor.kind === "work" && preferredKind !== "work"),
      ...roomAnchors.filter((anchor) => anchor.kind === "social" && preferredKind !== "social"),
      ...roomAnchors.filter((anchor) => anchor.kind === "recovery" && preferredKind !== "recovery"),
      ...roomAnchors.filter((anchor) => anchor.kind === "idle" && preferredKind !== "idle"),
      ...roomAnchors.filter((anchor) => anchor.kind === "entry" && preferredKind !== "entry"),
    ];
    const hash = stableStringHash(actorId);
    const anchor = orderedAnchors[hash % orderedAnchors.length] ?? roomAnchors[0];
    // Apply deterministic jitter so co-located actors don't stack exactly.
    // Use separate prime-derived offsets to minimize collisions.
    const jitterX = ((hash % 13) - 6) * 14;
    const jitterY = (((hash >>> 4) % 11) - 5) * 12;
    return { x: anchor.x + jitterX, y: anchor.y + 26 + jitterY };
  }

  function getPreferredAnchorKind(scheduleBlock: string): NavAnchorKind {
    switch (scheduleBlock) {
      case "work":
      case "training":
        return "work";
      case "social":
        return "social";
      case "recovery":
        return "recovery";
      default:
        return "idle";
    }
  }

  type RoomEntry = {
    id: string;
    isOperational: boolean;
    functionTag: string;
    functionTags: string[];
  };

  function pickRoom(
    rooms: ReadonlyArray<RoomEntry>,
    hash: number,
    predicate: (room: RoomEntry) => boolean,
  ): string | null {
    const matches = rooms.filter(predicate);
    return matches.length === 0 ? null : (matches[hash % matches.length]?.id ?? null);
  }

  function pickByTagPreference(
    rooms: ReadonlyArray<RoomEntry>,
    hash: number,
    preferredTags: string[],
  ): string | null {
    for (const functionTag of preferredTags) {
      const roomId =
        pickRoom(rooms, hash, (r) => r.isOperational && r.functionTags.includes(functionTag)) ??
        pickRoom(rooms, hash, (r) => r.functionTags.includes(functionTag));
      if (roomId) return roomId;
    }
    return pickRoom(rooms, hash, (r) => r.isOperational) ?? pickRoom(rooms, hash, () => true);
  }

  function resolveOperatorRoomId(
    operator: RuntimePhase1View["operators"][number],
    rooms: ReadonlyArray<RoomEntry>,
  ): string | null {
    if (operator.schedule.currentBlock === "raid" || operator.assignment.kind === "raid") {
      return null;
    }

    if (
      operator.assignment.targetId &&
      rooms.some((room) => room.id === operator.assignment.targetId)
    ) {
      return operator.assignment.targetId;
    }

    const needsRecovery =
      operator.schedule.currentBlock === "recovery" ||
      operator.injury.recoveryHoursRemaining > 0 ||
      operator.injury.severity >= 25;
    if (needsRecovery) {
      const dedicatedRecoveryRoomId =
        pickRoom(
          rooms,
          stableStringHash(operator.id),
          (room) =>
            room.isOperational &&
            room.functionTags.includes("room:recovery") &&
            room.functionTags.length === 1,
        ) ??
        pickRoom(
          rooms,
          stableStringHash(operator.id),
          (room) => room.functionTags.includes("room:recovery") && room.functionTags.length === 1,
        );
      if (dedicatedRecoveryRoomId) {
        return dedicatedRecoveryRoomId;
      }
    }

    const preferredRoomTags = needsRecovery
      ? ["room:recovery", "room:social"]
      : operator.schedule.currentBlock === "social"
        ? ["room:social", "room:staffing"]
        : operator.schedule.currentBlock === "work" ||
            operator.schedule.currentBlock === "training" ||
            operator.schedule.currentBlock === "raid"
          ? ["room:operations", "room:training", "room:staffing"]
          : ["room:social", "room:staffing", "room:operations", "room:recovery"];

    return pickByTagPreference(rooms, stableStringHash(operator.id), preferredRoomTags);
  }

  function resolveStaffRoomId(
    staff: RuntimePhase1View["staff"][number],
    rooms: ReadonlyArray<RoomEntry>,
  ): string | null {
    if (staff.assignment.targetId && rooms.some((room) => room.id === staff.assignment.targetId)) {
      return staff.assignment.targetId;
    }

    const preferredRoomTags =
      staff.roleTag === "staff:medical"
        ? ["room:recovery", "room:operations"]
        : staff.roleTag === "staff:reception"
          ? ["room:operations", "room:staffing"]
          : staff.roleTag === "staff:admin" ||
              staff.roleTag === "staff:logistics" ||
              staff.roleTag === "staff:maintenance"
            ? ["room:staffing", "room:operations", "room:social"]
            : ["room:operations", "room:staffing", "room:social"];

    return pickByTagPreference(rooms, stableStringHash(staff.id), preferredRoomTags);
  }

  function deriveHqWorldSnapshot(view: RuntimePhase1View, nowMs = Date.now()): HqWorldSnapshot {
    const rooms = view.rooms.map((room) => {
      const template = templateRegistry.roomById.get(room.templateId) ?? templateRegistry.rooms[0];
      const functionTags = template.tags.filter((tag) => tag.startsWith("room:"));
      const functionTag = functionTags[0] ?? "room:operations";
      return {
        id: room.id,
        templateId: room.templateId,
        name: room.name,
        tier: room.tier,
        isOperational: room.isOperational,
        functionTag,
        functionTags,
        footprint: room.footprint,
      };
    });

    const buildingName =
      templateRegistry.buildingById.get(view.building.activeBuildingId)?.name ?? "Bodega HQ";
    const geometry = composeHqWorldGeometry(rooms);
    const navGraph = geometry.navGraph;

    const operatorActors: ActorMarker[] = view.operators
      .filter((op) => op.lifecycle.status === "active")
      .flatMap((op) => {
        const currentRoomId = resolveOperatorRoomId(op, rooms);
        if (!currentRoomId) {
          actorPreviousRoomId.delete(op.id);
          actorMovements.delete(op.id);
          return [];
        }

        const preferredAnchorKind = getPreferredAnchorKind(op.schedule.currentBlock);
        const previousRoomId = actorPreviousRoomId.get(op.id);

        // Detect room change and initiate movement.
        // Skip if the actor already has an in-progress movement to prevent
        // rapid re-pathing when the schedule oscillates between ticks.
        const existingMovement = actorMovements.get(op.id);
        const isCurrentlyMoving =
          existingMovement !== undefined &&
          nowMs - existingMovement.startedAtMs < existingMovement.durationMs;

        if (
          previousRoomId !== undefined &&
          previousRoomId !== currentRoomId &&
          currentRoomId !== "" &&
          !isCurrentlyMoving
        ) {
          const fromAnchor = resolveRoomAnchor(navGraph, previousRoomId, "idle");
          const toAnchor = resolveRoomAnchor(navGraph, currentRoomId, preferredAnchorKind);
          if (fromAnchor && toAnchor) {
            const path = findPath(navGraph, fromAnchor.id, toAnchor.id);
            if (path && path.totalMs > 0) {
              actorMovements.set(op.id, {
                fromRoomId: previousRoomId,
                toRoomId: currentRoomId,
                path,
                startedAtMs: nowMs,
                durationMs: Math.max(ACTOR_MOVE_DURATION_MS, path.totalMs),
              });
            }
          }
        }

        // Only update the previous room when not mid-movement, so the
        // movement completes before a new destination is considered.
        if (!isCurrentlyMoving) {
          actorPreviousRoomId.set(op.id, currentRoomId);
        }

        // Apply movement animation
        const movement = actorMovements.get(op.id);
        if (movement) {
          const progress = Math.min(1, (nowMs - movement.startedAtMs) / movement.durationMs);

          if (progress >= 1) {
            actorMovements.delete(op.id);
          } else {
            const pos = interpolatePathPosition(navGraph, movement.path, progress);
            const targetPos = computeRoomAnchorPosition(
              currentRoomId,
              op.id,
              navGraph,
              preferredAnchorKind,
            );
            return {
              id: op.id,
              kind: "operator" as const,
              x: pos.x,
              y: pos.y,
              targetX: targetPos.x,
              targetY: targetPos.y,
              roomId: currentRoomId,
              label: op.identity.name,
              presetId: op.appearance.presetId,
              roleTag: op.identity.roleTag,
              state: "moving" as ActorState,
              moveProgress: progress,
            };
          }
        }

        // Static position at current room anchor
        const pos = computeRoomAnchorPosition(currentRoomId, op.id, navGraph, preferredAnchorKind);
        return {
          id: op.id,
          kind: "operator" as const,
          x: pos.x,
          y: pos.y,
          targetX: pos.x,
          targetY: pos.y,
          roomId: currentRoomId,
          label: op.identity.name,
          presetId: op.appearance.presetId,
          roleTag: op.identity.roleTag,
          state: resolveActorState(op.schedule.currentBlock),
          moveProgress: 1,
        };
      });

    // Clean up stale entries for operators no longer alive
    const liveOperatorIds = new Set(operatorActors.map((a) => a.id));
    for (const id of actorPreviousRoomId.keys()) {
      if (!liveOperatorIds.has(id)) {
        actorPreviousRoomId.delete(id);
        actorMovements.delete(id);
      }
    }

    // ── Staff actors ─────────────────────────────────────────────────
    const staffActors: ActorMarker[] = view.staff.flatMap((staff) => {
      const roomId = resolveStaffRoomId(staff, rooms);
      if (!roomId) {
        return [];
      }
      const pos = computeRoomAnchorPosition(
        roomId,
        staff.id,
        navGraph,
        staff.assignment.kind === "room" ? "work" : "idle",
      );
      return {
        id: staff.id,
        kind: "staff" as const,
        x: pos.x,
        y: pos.y,
        targetX: pos.x,
        targetY: pos.y,
        roomId,
        label: staff.name,
        presetId: "",
        roleTag: staff.roleTag,
        state: staff.assignment.kind === "room" ? "working" : ("idle" as ActorState),
        moveProgress: 1,
      };
    });

    // ── Visitor actors ────────────────────────────────────────────────
    const recruitmentRoom = rooms.find(
      (r) => r.isOperational && r.functionTags.includes("ops:recruitment"),
    );
    const visitorActors: ActorMarker[] = recruitmentRoom
      ? view.visitors.map((visitor) => {
          const pos = computeRoomAnchorPosition(recruitmentRoom.id, visitor.id, navGraph, "social");
          return {
            id: visitor.id,
            kind: "visitor" as const,
            x: pos.x,
            y: pos.y,
            targetX: pos.x,
            targetY: pos.y,
            roomId: recruitmentRoom.id,
            label: visitor.name,
            presetId: "",
            roleTag: visitor.desiredRoleTag,
            state: "idle" as ActorState,
            moveProgress: 1,
          };
        })
      : [];

    const actors: ActorMarker[] = [...operatorActors, ...staffActors, ...visitorActors];

    return createHqWorldSnapshot(buildingName, geometry, actors);
  }

  function deriveRaidWorldSnapshot(view: RuntimePhase1View): RaidWorldSnapshot | null {
    if (!view.contractSite || !view.fogOfWar) {
      return null;
    }

    const teams: RaidTeamMarker[] = view.activeRaids.map((raid) => ({
      teamId: raid.id,
      raidId: raid.id,
      operatorIds: raid.operatorIds,
      x: raid.x,
      y: raid.y,
      goal: raid.teamGoal,
      state: raid.teamState,
    }));

    // Derive fog-of-war from authoritative simulation state
    const fog = view.fogOfWar;
    const fogCells: FogCell[] = [];
    for (let y = 0; y < fog.gridHeight; y++) {
      for (let x = 0; x < fog.gridWidth; x++) {
        fogCells.push({ x, y, revealed: fog.revealed[y * fog.gridWidth + x] ?? false });
      }
    }

    return buildRaidWorldSnapshot(
      view.contractSite.location,
      view.contractSite.contractSiteId,
      fog.gridWidth * 32,
      fog.gridHeight * 32,
      teams,
      view.raidWorld?.enemyMarkers ?? [],
      view.raidWorld?.featureMarkers ?? [],
      fogCells,
    );
  }

  function appendSimulationCues(): void {
    const runtimeCues = simulation.drainRuntimeCues();
    if (runtimeCues.length > 0) {
      pendingCues.push(...runtimeCues);
    }

    const runtimeEvents = simulation.drainRuntimeEvents();
    if (runtimeEvents.length > 0) {
      pendingEvents.push(...runtimeEvents);
    }
  }

  const notifyListeners = () => {
    listeners.forEach((listener) => listener(session));
  };

  const schedulePersist = () => {
    if (!session.isSaveBacked || !session.save) {
      return;
    }

    persistQueued = true;

    if (persistPromise) {
      return;
    }

    persistPromise = (async () => {
      while (persistQueued) {
        persistQueued = false;
        session.persistence = {
          status: "saving",
          lastSavedAt: session.persistence.lastSavedAt,
        };
        session.state = buildRuntimeSessionState(session);
        notifyListeners();

        try {
          const nextSave = createPersistedSessionSave(session);
          await saveStorage.writeSaveGame(nextSave);

          session.save = nextSave;
          session.persistence = {
            status: "idle",
            lastSavedAt: nextSave.metadata.lastPlayedAt,
          };
        } catch (error) {
          session.persistence = {
            status: "error",
            lastSavedAt: session.persistence.lastSavedAt,
            errorMessage: getPersistenceErrorMessage(error),
          };
        }

        if (!closed) {
          session.state = buildRuntimeSessionState(session);
          notifyListeners();
        }
      }

      persistPromise = undefined;
    })();
  };

  const queueSimulationMutation = (command: SimCommand): Promise<void> => {
    if (closed) {
      return Promise.resolve();
    }

    const nextMutation = mutationQueue
      .catch(() => undefined)
      .then(() => {
        const beforeWorldSnapshot = session.worldSnapshot;
        const beforePhase1View = session.phase1View;

        simulation.dispatch(command);
        refreshDerivedState();
        pendingCues.push(
          ...resolveCuesForCommand(
            command,
            beforeWorldSnapshot,
            session.worldSnapshot,
            beforePhase1View,
            session.phase1View,
          ),
        );
        appendSimulationCues();
        notifyListeners();
        schedulePersist();
      });

    mutationQueue = nextMutation.catch(() => undefined);

    return nextMutation;
  };

  const commands: RuntimeSessionCommands = {
    dispatch(command) {
      return queueSimulationMutation(command);
    },

    tick(deltaMs = AUTONOMOUS_TICK_INTERVAL_MS) {
      return queueSimulationMutation({
        type: "sim/tick",
        deltaMs,
      });
    },

    placeRoom(input) {
      return commands.dispatch({
        type: "sim/place-room",
        ...input,
      });
    },

    setRoomActive(input) {
      return commands.dispatch({
        type: "sim/set-room-active",
        ...input,
      });
    },

    purchaseBuildingUpgrade(input) {
      return commands.dispatch({
        type: "sim/purchase-building-upgrade",
        ...input,
      });
    },

    purchaseRoomUpgrade(input) {
      return commands.dispatch({
        type: "sim/purchase-room-upgrade",
        ...input,
      });
    },

    acceptRecruit(input) {
      return commands.dispatch({
        type: "sim/accept-recruit",
        ...input,
      });
    },

    rejectRecruit(input) {
      return commands.dispatch({
        type: "sim/reject-recruit",
        ...input,
      });
    },

    hireStaff(input) {
      return commands.dispatch({
        type: "sim/hire-staff",
        ...input,
      });
    },

    assignStaff(input) {
      return commands.dispatch({
        type: "sim/assign-staff",
        ...input,
      });
    },

    buyItem(input) {
      return commands.dispatch({
        type: "sim/buy-item",
        ...input,
      });
    },

    sellItem(input) {
      return commands.dispatch({
        type: "sim/sell-item",
        ...input,
      });
    },

    autoAssignAccessory(input) {
      return commands.dispatch({
        type: "sim/auto-assign-accessory",
        ...input,
      });
    },

    unequipItem(input) {
      return commands.dispatch({
        type: "sim/unequip-item",
        ...input,
      });
    },
  };

  const lifecycle: RuntimeSessionLifecycle = {
    autoTickIntervalMs: AUTONOMOUS_TICK_INTERVAL_MS,

    startAutoTick() {
      if (closed || autoTickInterval) {
        return;
      }

      session.isAutoTicking = true;
      session.state = buildRuntimeSessionState(session);
      notifyListeners();

      autoTickInterval = setInterval(() => {
        if (autoTickPending || closed) {
          return;
        }

        autoTickPending = true;

        void commands.tick(AUTONOMOUS_TICK_INTERVAL_MS).finally(() => {
          autoTickPending = false;
        });
      }, AUTONOMOUS_TICK_INTERVAL_MS);
    },

    stopAutoTick() {
      if (autoTickInterval) {
        clearInterval(autoTickInterval);
        autoTickInterval = undefined;
      }

      if (!session.isAutoTicking) {
        return;
      }

      session.isAutoTicking = false;
      session.state = buildRuntimeSessionState(session);
      notifyListeners();
    },

    refresh() {
      if (closed) {
        return;
      }

      refreshDerivedState();
      notifyListeners();
    },
  };

  const initialWorldSnapshot = simulation.getWorldSnapshot();
  const initialPhase1View = simulation.getPhase1View();
  const initialPersistence: RuntimeSessionPersistenceState =
    isSaveBacked && options.save
      ? {
          status: "idle",
          lastSavedAt: options.save.metadata.lastPlayedAt,
        }
      : {
          status: "idle",
        };

  const initialHqWorld = deriveHqWorldSnapshot(initialPhase1View);
  const initialRaidWorld = deriveRaidWorldSnapshot(initialPhase1View);

  session = {
    mode: options.mode,
    slotId: options.slotId,
    save: options.save,
    registry: templateRegistry,
    simulation,
    stableCommandTypes: STABLE_SIM_COMMAND_TYPES,
    state: {
      worldSnapshot: initialWorldSnapshot,
      phase1View: initialPhase1View,
      hqWorldSnapshot: initialHqWorld,
      raidWorldSnapshot: initialRaidWorld,
      isPreview,
      isSaveBacked,
      isAutoTicking: false,
      persistence: { ...initialPersistence },
    },
    phase1View: initialPhase1View,
    worldSnapshot: initialWorldSnapshot,
    isPreview,
    isSaveBacked,
    isAutoTicking: false,
    persistence: initialPersistence,
    commands,
    lifecycle,
    subscribe(listener) {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    },
    drainPendingCues() {
      const drained = pendingCues.slice();
      pendingCues.length = 0;
      return drained;
    },
    drainPendingEvents() {
      const drained = pendingEvents.slice();
      pendingEvents.length = 0;
      return drained;
    },
    dispose() {
      if (closed) {
        return;
      }

      closed = true;
      if (presentationRefreshInterval) {
        clearInterval(presentationRefreshInterval);
        presentationRefreshInterval = undefined;
      }
      lifecycle.stopAutoTick();
      listeners.clear();
    },
  };

  refreshDerivedState();

  return session;
}

async function loadSaveGameIntoSession(slotId: SaveSlotId): Promise<RuntimeSession> {
  const save = await saveStorage.readSaveGame(slotId);

  if (!save) {
    throw new Error(`Save slot ${getSlotNumber(slotId)} is empty.`);
  }

  assertCompatibleSave(save);

  const updatedSave = {
    ...save,
    metadata: {
      ...save.metadata,
      lastPlayedAt: getTimestamp(),
    },
  };

  await saveStorage.writeSaveGame(updatedSave);

  return createRuntimeSession(updatedSave.world, {
    mode: "load",
    slotId,
    save: updatedSave,
  });
}

async function createNewSaveSession(slotId: SaveSlotId): Promise<RuntimeSession> {
  const existingSave = await saveStorage.readSaveGame(slotId);
  if (existingSave) {
    throw new Error(`Save slot ${getSlotNumber(slotId)} is already occupied.`);
  }

  const save = createNewSaveGame(slotId);
  await saveStorage.writeSaveGame(save);

  return createRuntimeSession(save.world, {
    mode: "new",
    slotId,
    save,
  });
}

export function buildGameShellHref(request: RuntimeRouteRequest): string {
  const params = new URLSearchParams();
  params.set("mode", request.mode);

  if (request.slotId) {
    params.set("slot", request.slotId);
  }

  return `/game?${params.toString()}`;
}

export function parseRuntimeRouteRequest(search: string): RuntimeRouteRequest {
  const params = new URLSearchParams(search);
  const rawMode = params.get("mode");
  const rawSlotId = params.get("slot");

  const mode: RuntimeRouteMode =
    rawMode === "new" || rawMode === "load" || rawMode === "preview" ? rawMode : "preview";
  const slotId = SAVE_SLOT_IDS.find((candidate) => candidate === rawSlotId);

  return { mode, slotId };
}

export async function resolveRuntimeSession(request: RuntimeRouteRequest): Promise<RuntimeSession> {
  switch (request.mode) {
    case "preview":
      return createRuntimeSession(createBootstrapWorldSnapshot(templateRegistry), {
        mode: "preview",
      });
    case "new":
      return createNewSaveSession(assertSlotId(request.slotId));
    case "load":
      return loadSaveGameIntoSession(assertSlotId(request.slotId));
  }
}

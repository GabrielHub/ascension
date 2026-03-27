import { getBuildingFloors } from "content/building-layouts";
import { templateRegistry } from "content/templates";
import {
  buildRaidWorldSnapshot,
  composeHqWorldGeometry,
  createHqWorldSnapshot,
  findPath,
  getBoundsFromPoints,
  interpolatePathPosition,
  resolveRoomAnchor,
} from "render";
import type {
  ActorMarker,
  ActorState,
  FogCell,
  HqWorldSnapshot,
  NavAnchorKind,
  NavPath,
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
  createNewGameWorldSnapshot,
  createPreviewWorldSnapshot,
  type AscensionSimulation,
  type RuntimeEvent,
  type SimCommand,
  type StableSimCommandType,
} from "sim";
import { selectOperatorAppearanceRecipeId } from "save/appearance";
import { getSlotKey } from "lib/hq-room-state";
import { stableStringHash } from "lib/stable-hash";
import { visitorQualityToRank } from "lib/visitor-rank";
import type { AudioCueId } from "app/features/audio";

const AUTONOMOUS_TICK_INTERVAL_MS = 1000;
const AUTOSAVE_INTERVAL_MS = 10 * 60 * 1000;
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
  isPaused: boolean;
  isAutoTicking: boolean;
  persistence: RuntimeSessionPersistenceState;
}

export interface RuntimeSessionLifecycle {
  autoTickIntervalMs: number;
  startAutoTick(): void;
  stopAutoTick(): void;
  pause(reason: string): void;
  resume(reason: string): void;
  refresh(): void;
}

export interface RuntimeSessionCommands {
  dispatch(command: SimCommand): Promise<void>;
  tick(deltaMs?: number): Promise<void>;
  placeRoom(input: Omit<Extract<SimCommand, { type: "sim/place-room" }>, "type">): Promise<void>;
  setActiveFloor(
    input: Omit<Extract<SimCommand, { type: "sim/set-active-floor" }>, "type">,
  ): Promise<void>;
  setRoomActive(
    input: Omit<Extract<SimCommand, { type: "sim/set-room-active" }>, "type">,
  ): Promise<void>;
  setPolicy(input: Omit<Extract<SimCommand, { type: "sim/set-policy" }>, "type">): Promise<void>;
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
  isPaused: boolean;
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
    world: createNewGameWorldSnapshot(templateRegistry),
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
    isPaused: session.isPaused,
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
  let autosaveTimeout: ReturnType<typeof setTimeout> | undefined;
  let presentationRefreshInterval: ReturnType<typeof setInterval> | undefined;
  let autoTickEnabled = false;
  let autoTickPending = false;
  let mutationQueue = Promise.resolve();
  let persistDirty = false;
  let persistQueued = false;
  let persistPromise: Promise<void> | undefined;
  let presentationPausedAtMs: number | undefined;
  const pendingCues: AudioCueId[] = [];
  const pendingEvents: RuntimeEvent[] = [];
  /** Transient movement state per actor. Key is actor id. */
  const actorMovements = new Map<string, ActorMovement>();
  /** Previous room assignment per actor. Key is actor id. */
  const actorPreviousRoomId = new Map<string, string>();
  const pauseReasons = new Set<string>();
  let session!: RuntimeSession;

  const notifyListeners = () => {
    listeners.forEach((listener) => listener(session));
  };

  const clearAutoTickInterval = () => {
    if (!autoTickInterval) {
      return;
    }

    clearInterval(autoTickInterval);
    autoTickInterval = undefined;
  };

  const syncPresentationRefresh = () => {
    if (closed || actorMovements.size === 0 || session.isPaused) {
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

  const syncAutoTickState = () => {
    const shouldRun = !closed && autoTickEnabled && pauseReasons.size === 0;

    if (shouldRun && !autoTickInterval) {
      autoTickInterval = setInterval(() => {
        if (autoTickPending || closed || pauseReasons.size > 0) {
          return;
        }

        autoTickPending = true;

        void commands.tick(AUTONOMOUS_TICK_INTERVAL_MS).finally(() => {
          autoTickPending = false;
        });
      }, AUTONOMOUS_TICK_INTERVAL_MS);
    } else if (!shouldRun) {
      clearAutoTickInterval();
    }

    const nextIsAutoTicking = shouldRun;
    if (session.isAutoTicking === nextIsAutoTicking) {
      return false;
    }

    session.isAutoTicking = nextIsAutoTicking;
    return true;
  };

  const syncPauseState = () => {
    const nextIsPaused = pauseReasons.size > 0;
    if (session.isPaused === nextIsPaused) {
      return false;
    }

    if (nextIsPaused) {
      presentationPausedAtMs = Date.now();
    } else if (presentationPausedAtMs !== undefined) {
      const pausedDurationMs = Date.now() - presentationPausedAtMs;
      if (pausedDurationMs > 0) {
        actorMovements.forEach((movement) => {
          movement.startedAtMs += pausedDurationMs;
        });
      }
      presentationPausedAtMs = undefined;
    }

    session.isPaused = nextIsPaused;
    return true;
  };

  const syncRuntimeActivity = () => {
    const pauseChanged = syncPauseState();
    const autoTickChanged = syncAutoTickState();
    syncPresentationRefresh();

    if (!pauseChanged && !autoTickChanged) {
      return;
    }

    session.state = buildRuntimeSessionState(session);
    notifyListeners();
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

  type NavAnchor = ReturnType<typeof composeHqWorldGeometry>["navGraph"]["anchors"][number];

  function computeRoomAnchorPosition(
    roomId: string,
    actorId: string,
    anchorsByRoomId: ReadonlyMap<string, NavAnchor[]>,
    fallbackAnchor: NavAnchor | undefined,
    preferredKind: NavAnchorKind = "idle",
  ): { x: number; y: number } {
    const roomAnchors = anchorsByRoomId.get(roomId) ?? [];
    if (roomAnchors.length === 0) {
      if (fallbackAnchor) return { x: fallbackAnchor.x, y: fallbackAnchor.y + 26 };
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

  type RoomGeometryNode = ReturnType<typeof composeHqWorldGeometry>["rooms"][number];
  type StageBounds = { x: number; y: number; width: number; height: number };
  type RoomOccupants = {
    operatorIds: string[];
    staffIds: string[];
    visitorIds: string[];
  };

  type RoomEntry = {
    id: string;
    floorIndex: number;
    slotId: string;
    roomStateId: string;
    isOperational: boolean;
    functionTag: string;
    functionTags: string[];
    allTags: string[];
    reservedFootprint: RuntimePhase1View["rooms"][number]["reservedFootprint"];
    activeFootprint: RuntimePhase1View["rooms"][number]["activeFootprint"];
  };

  function getRoomArea(room: RoomEntry): number {
    return room.activeFootprint.cols * room.activeFootprint.rows;
  }

  function pickLargestRoomId(
    rooms: ReadonlyArray<RoomEntry>,
    predicate: (room: RoomEntry) => boolean,
  ): string | null {
    const matches = rooms
      .filter(predicate)
      .sort(
        (left, right) => getRoomArea(right) - getRoomArea(left) || left.id.localeCompare(right.id),
      );
    return matches[0]?.id ?? null;
  }

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

  function getPrimaryCommonRoomId(rooms: ReadonlyArray<RoomEntry>): string | null {
    return (
      pickLargestRoomId(
        rooms,
        (room) =>
          room.isOperational &&
          room.functionTags.includes("room:social") &&
          room.functionTags.includes("room:recovery"),
      ) ??
      pickLargestRoomId(
        rooms,
        (room) =>
          room.functionTags.includes("room:social") && room.functionTags.includes("room:recovery"),
      ) ??
      pickLargestRoomId(
        rooms,
        (room) => room.isOperational && room.functionTags.includes("room:social"),
      ) ??
      pickLargestRoomId(rooms, (room) => room.functionTags.includes("room:social"))
    );
  }

  function insetBounds(
    bounds: StageBounds,
    insets: { left: number; right: number; top: number; bottom: number },
  ): StageBounds {
    const width = Math.max(24, bounds.width - insets.left - insets.right);
    const height = Math.max(24, bounds.height - insets.top - insets.bottom);
    return {
      x: bounds.x + insets.left,
      y: bounds.y + insets.top,
      width,
      height,
    };
  }

  function createGridStagePositions(
    bounds: StageBounds,
    count: number,
    columns: number,
    rowBias = 0.55,
  ): { x: number; y: number }[] {
    const safeCount = Math.max(1, count);
    const safeColumns = Math.max(1, Math.min(columns, safeCount));
    const rows = Math.max(1, Math.ceil(safeCount / safeColumns));

    return Array.from({ length: safeCount }, (_, index) => {
      const columnIndex = index % safeColumns;
      const rowIndex = Math.floor(index / safeColumns);
      const xRatio = safeColumns === 1 ? 0.5 : (columnIndex + 1) / (safeColumns + 1);
      const yRatio = rows === 1 ? rowBias : 0.25 + ((rowIndex + 1) / (rows + 1)) * 0.55;
      return {
        x: bounds.x + bounds.width * xRatio + (index % 2 === 0 ? -10 : 10),
        y: bounds.y + bounds.height * yRatio + ((index % 3) - 1) * 6,
      };
    });
  }

  function createQueueStagePositions(
    bounds: StageBounds,
    count: number,
  ): { x: number; y: number }[] {
    const safeCount = Math.max(1, count);
    return Array.from({ length: safeCount }, (_, index) => {
      const xRatio = (index + 1) / (safeCount + 1);
      const yRatio = 0.62 + (index % 2) * 0.12;
      return {
        x: bounds.x + bounds.width * xRatio,
        y: bounds.y + bounds.height * yRatio,
      };
    });
  }

  function getRoomStagePosition(
    room: RoomEntry,
    roomNode: RoomGeometryNode | undefined,
    roomOccupants: RoomOccupants | undefined,
    actorId: string,
    actorKind: ActorMarker["kind"],
    fallback: { x: number; y: number },
  ): { x: number; y: number } {
    if (!roomNode) {
      return fallback;
    }

    const actorIds =
      actorKind === "operator"
        ? (roomOccupants?.operatorIds ?? [])
        : actorKind === "staff"
          ? (roomOccupants?.staffIds ?? [])
          : (roomOccupants?.visitorIds ?? []);
    const actorIndex = Math.max(0, actorIds.indexOf(actorId));
    const actorCount = Math.max(1, actorIds.length);
    const reservedFloorBounds = insetBounds(getBoundsFromPoints(roomNode.floorPoints), {
      left: 20,
      right: 20,
      top: 26,
      bottom: 18,
    });
    const activeBounds = insetBounds(roomNode.activeBounds, {
      left: 14,
      right: 14,
      top: 12,
      bottom: 12,
    });

    const positions = room.allTags.includes("ops:recruitment")
      ? actorKind === "visitor"
        ? createQueueStagePositions(reservedFloorBounds, actorCount)
        : actorKind === "staff"
          ? createGridStagePositions(
              insetBounds(activeBounds, {
                left: 0,
                right: 0,
                top: 0,
                bottom: Math.max(18, Math.round(activeBounds.height * 0.45)),
              }),
              actorCount,
              Math.min(2, actorCount),
              0.25,
            )
          : createGridStagePositions(
              insetBounds(reservedFloorBounds, {
                left: 16,
                right: 16,
                top: 10,
                bottom: Math.max(18, Math.round(reservedFloorBounds.height * 0.3)),
              }),
              actorCount,
              Math.min(2, actorCount),
              0.4,
            )
      : room.functionTags.includes("room:social") && room.functionTags.includes("room:recovery")
        ? createGridStagePositions(reservedFloorBounds, actorCount, Math.min(3, actorCount), 0.58)
        : room.functionTags.includes("room:social")
          ? createGridStagePositions(reservedFloorBounds, actorCount, Math.min(2, actorCount), 0.62)
          : room.functionTags.includes("room:operations") ||
              room.functionTags.includes("room:staffing")
            ? createGridStagePositions(activeBounds, actorCount, Math.min(2, actorCount), 0.42)
            : createGridStagePositions(activeBounds, actorCount, Math.min(2, actorCount), 0.55);

    return positions[actorIndex] ?? positions[0] ?? fallback;
  }

  function resolveOperatorRoomId(
    operator: RuntimePhase1View["operators"][number],
    rooms: ReadonlyArray<RoomEntry>,
    commonRoomId: string | null,
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

      if (commonRoomId) {
        return commonRoomId;
      }
    }

    if (operator.schedule.currentBlock === "social" || operator.schedule.currentBlock === "rest") {
      if (commonRoomId) {
        return commonRoomId;
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
    const activeBuildingId = view.building.activeBuildingId;
    const activeFloorIndex = view.building.activeFloorIndex;
    const allRooms = view.rooms.map((room) => {
      const template = templateRegistry.roomById.get(room.templateId) ?? templateRegistry.rooms[0];
      const functionTags = template.tags.filter((tag) => tag.startsWith("room:"));
      const functionTag = functionTags[0] ?? "room:operations";
      return {
        id: room.id,
        templateId: room.templateId,
        roomStateId: room.roomStateId,
        slotId: room.slotId,
        floorIndex: room.floorIndex,
        name: room.name,
        tier: room.tier,
        isRequestedActive: room.isRequestedActive,
        isOperational: room.isOperational,
        functionTag,
        functionTags,
        allTags: [...template.tags],
        appliedUpgradeIds: room.appliedUpgradeIds,
        reservedFootprint: room.reservedFootprint,
        activeFootprint: room.activeFootprint,
      };
    });
    const rooms = allRooms.filter((room) => room.floorIndex === activeFloorIndex);
    const visibleRoomIds = new Set(rooms.map((room) => room.id));
    const orderedSlots = getBuildingFloors(activeBuildingId, view.building.tier)
      .flatMap((floor) =>
        floor.slots.map((slot) => ({
          floorIndex: floor.floorIndex,
          slotId: slot.slotId,
          col: slot.col,
          row: slot.row,
          cols: slot.cols,
          rows: slot.rows,
        })),
      )
      .map((slot, index) => ({ ...slot, orderIndex: index }));
    const occupiedSlotKeys = new Set(
      view.rooms.map((room) => getSlotKey(room.floorIndex, room.slotId)),
    );
    const unlockedSlotKeys = new Set(
      orderedSlots
        .slice(0, Math.max(view.building.roomSlotCount, view.rooms.length))
        .map((slot) => getSlotKey(slot.floorIndex, slot.slotId)),
    );
    const reservedSlots = orderedSlots
      .filter(
        (slot) =>
          slot.floorIndex === activeFloorIndex &&
          !occupiedSlotKeys.has(getSlotKey(slot.floorIndex, slot.slotId)),
      )
      .map((slot) => {
        const kind = unlockedSlotKeys.has(getSlotKey(slot.floorIndex, slot.slotId))
          ? "available"
          : "locked";
        return {
          id: `room-slot/${slot.floorIndex}/${slot.slotId}`,
          label: `${kind === "available" ? "Open" : "Locked"} Slot ${slot.orderIndex + 1}`,
          kind,
          floorIndex: slot.floorIndex,
          footprint: { col: slot.col, row: slot.row, cols: slot.cols, rows: slot.rows },
        };
      });

    const buildingName = templateRegistry.buildingById.get(activeBuildingId)?.name ?? "Bodega HQ";
    const geometry = composeHqWorldGeometry(rooms, {
      reservedSlots,
      buildingId: activeBuildingId,
      buildingTier: view.building.tier,
      floorIndex: activeFloorIndex,
    });
    const navGraph = geometry.navGraph;
    const anchorsByRoomId = new Map<string, NavAnchor[]>();
    for (const anchor of navGraph.anchors) {
      let list = anchorsByRoomId.get(anchor.roomId);
      if (!list) {
        list = [];
        anchorsByRoomId.set(anchor.roomId, list);
      }
      list.push(anchor);
    }
    const fallbackAnchor = navGraph.anchors[0] as NavAnchor | undefined;
    const roomsById = new Map(rooms.map((room) => [room.id, room]));
    const roomNodesById = new Map(geometry.rooms.map((room) => [room.id, room]));
    const roomOccupants = new Map<string, RoomOccupants>();
    const ensureRoomOccupants = (roomId: string): RoomOccupants => {
      const existing = roomOccupants.get(roomId);
      if (existing) {
        return existing;
      }

      const created: RoomOccupants = {
        operatorIds: [],
        staffIds: [],
        visitorIds: [],
      };
      roomOccupants.set(roomId, created);
      return created;
    };
    const allRoomsCommonRoomId = getPrimaryCommonRoomId(allRooms);
    const commonRoomId = getPrimaryCommonRoomId(rooms);
    const recruitmentRoom =
      rooms.find((room) => room.isOperational && room.allTags.includes("ops:recruitment")) ??
      rooms.find((room) => room.allTags.includes("ops:recruitment")) ??
      (commonRoomId ? roomsById.get(commonRoomId) : undefined);

    const operatorAssignments = view.operators
      .filter((operator) => operator.lifecycle.status === "active")
      .map((operator) => {
        const roomId = resolveOperatorRoomId(operator, allRooms, allRoomsCommonRoomId);
        if (!roomId || !visibleRoomIds.has(roomId)) {
          actorPreviousRoomId.delete(operator.id);
          actorMovements.delete(operator.id);
          return null;
        }

        return {
          operator,
          roomId,
          preferredAnchorKind: getPreferredAnchorKind(operator.schedule.currentBlock),
        };
      })
      .filter(
        (
          assignment,
        ): assignment is {
          operator: RuntimePhase1View["operators"][number];
          roomId: string;
          preferredAnchorKind: NavAnchorKind;
        } => assignment !== null,
      );

    // Density-aware redistribution: spill idle operators from small
    // operational rooms into the common room so the dining area reads
    // as the main lived-in space and small rooms stay visually clear.
    // Only redirects operators in rest/social blocks — work-block
    // operators stay in their assigned operational rooms.
    if (commonRoomId) {
      const roomOperatorCounts = new Map<string, number>();
      for (const a of operatorAssignments) {
        roomOperatorCounts.set(a.roomId, (roomOperatorCounts.get(a.roomId) ?? 0) + 1);
      }

      for (const a of operatorAssignments) {
        if (a.roomId === commonRoomId) continue;
        const block = a.operator.schedule.currentBlock;
        if (block === "work" || block === "training" || block === "raid") continue;

        const room = roomsById.get(a.roomId);
        if (!room) continue;

        // Only spill from small operational/staffing rooms, not social rooms.
        const isSmallWorkRoom =
          (room.functionTags.includes("room:operations") ||
            room.functionTags.includes("room:staffing")) &&
          getRoomArea(room) < 20;
        if (!isSmallWorkRoom) continue;

        // Allow up to 2 idle operators in small rooms for visual clarity.
        const maxVisualDensity = 2;
        const currentCount = roomOperatorCounts.get(a.roomId) ?? 0;
        if (currentCount <= maxVisualDensity) continue;

        // Spill this operator to the common room.
        roomOperatorCounts.set(a.roomId, currentCount - 1);
        roomOperatorCounts.set(commonRoomId, (roomOperatorCounts.get(commonRoomId) ?? 0) + 1);
        a.roomId = commonRoomId;
        a.preferredAnchorKind = "social";
      }
    }
    const staffAssignments = view.staff
      .map((staff) => {
        const roomId = resolveStaffRoomId(staff, allRooms);
        return roomId && visibleRoomIds.has(roomId) ? { staff, roomId } : null;
      })
      .filter(
        (assignment): assignment is { staff: RuntimePhase1View["staff"][number]; roomId: string } =>
          assignment !== null,
      );
    const visitorAssignments = recruitmentRoom
      ? view.visitors.map((visitor) => ({ visitor, roomId: recruitmentRoom.id }))
      : [];

    operatorAssignments.forEach(({ operator, roomId }) => {
      ensureRoomOccupants(roomId).operatorIds.push(operator.id);
    });
    staffAssignments.forEach(({ staff, roomId }) => {
      ensureRoomOccupants(roomId).staffIds.push(staff.id);
    });
    visitorAssignments.forEach(({ visitor, roomId }) => {
      ensureRoomOccupants(roomId).visitorIds.push(visitor.id);
    });
    roomOccupants.forEach((occupants) => {
      occupants.operatorIds.sort();
      occupants.staffIds.sort();
      occupants.visitorIds.sort();
    });

    const getStagedPositionForActor = (
      roomId: string,
      actorId: string,
      actorKind: ActorMarker["kind"],
      fallback: { x: number; y: number },
    ) => {
      const room = roomsById.get(roomId);
      return room
        ? getRoomStagePosition(
            room,
            roomNodesById.get(roomId),
            roomOccupants.get(roomId),
            actorId,
            actorKind,
            fallback,
          )
        : fallback;
    };

    const operatorActors: ActorMarker[] = operatorAssignments.flatMap(
      ({ operator, roomId: currentRoomId, preferredAnchorKind }) => {
        const previousRoomId = actorPreviousRoomId.get(operator.id);

        const existingMovement = actorMovements.get(operator.id);
        const isCurrentlyMoving =
          existingMovement !== undefined &&
          nowMs - existingMovement.startedAtMs < existingMovement.durationMs;

        if (
          previousRoomId !== undefined &&
          previousRoomId !== currentRoomId &&
          visibleRoomIds.has(previousRoomId) &&
          !isCurrentlyMoving
        ) {
          const fromAnchor = resolveRoomAnchor(navGraph, previousRoomId, "idle");
          const toAnchor = resolveRoomAnchor(navGraph, currentRoomId, preferredAnchorKind);
          if (fromAnchor && toAnchor) {
            const path = findPath(navGraph, fromAnchor.id, toAnchor.id);
            if (path && path.totalMs > 0) {
              actorMovements.set(operator.id, {
                fromRoomId: previousRoomId,
                toRoomId: currentRoomId,
                path,
                startedAtMs: nowMs,
                durationMs: Math.max(ACTOR_MOVE_DURATION_MS, path.totalMs),
              });
            }
          }
        }

        if (!isCurrentlyMoving) {
          actorPreviousRoomId.set(operator.id, currentRoomId);
        }

        const fallbackPos = computeRoomAnchorPosition(
          currentRoomId,
          operator.id,
          anchorsByRoomId,
          fallbackAnchor,
          preferredAnchorKind,
        );
        const stagedPos = getStagedPositionForActor(
          currentRoomId,
          operator.id,
          "operator",
          fallbackPos,
        );
        const movement = actorMovements.get(operator.id);
        if (movement) {
          const progress = Math.min(1, (nowMs - movement.startedAtMs) / movement.durationMs);

          if (progress >= 1) {
            actorMovements.delete(operator.id);
          } else {
            const pos = interpolatePathPosition(navGraph, movement.path, progress);
            return {
              id: operator.id,
              kind: "operator" as const,
              x: pos.x,
              y: pos.y,
              targetX: stagedPos.x,
              targetY: stagedPos.y,
              roomId: currentRoomId,
              label: operator.identity.name,
              presetId: operator.appearance.presetId,
              roleTag: operator.identity.roleTag,
              state: "moving" as ActorState,
              moveProgress: progress,
            };
          }
        }

        return {
          id: operator.id,
          kind: "operator" as const,
          x: stagedPos.x,
          y: stagedPos.y,
          targetX: stagedPos.x,
          targetY: stagedPos.y,
          roomId: currentRoomId,
          label: operator.identity.name,
          presetId: operator.appearance.presetId,
          roleTag: operator.identity.roleTag,
          state: resolveActorState(operator.schedule.currentBlock),
          moveProgress: 1,
        };
      },
    );

    // Clean up stale entries for operators no longer alive
    const liveOperatorIds = new Set(operatorAssignments.map(({ operator }) => operator.id));
    for (const id of actorPreviousRoomId.keys()) {
      if (!liveOperatorIds.has(id)) {
        actorPreviousRoomId.delete(id);
        actorMovements.delete(id);
      }
    }

    // ── Staff actors ─────────────────────────────────────────────────
    const staffActors: ActorMarker[] = staffAssignments.map(({ staff, roomId }) => {
      const fallbackPos = computeRoomAnchorPosition(
        roomId,
        staff.id,
        anchorsByRoomId,
        fallbackAnchor,
        staff.assignment.kind === "room" ? "work" : "idle",
      );
      const pos = getStagedPositionForActor(roomId, staff.id, "staff", fallbackPos);
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
    const visitorActors: ActorMarker[] = visitorAssignments.map(({ visitor, roomId }) => {
      const fallbackPos = computeRoomAnchorPosition(
        roomId,
        visitor.id,
        anchorsByRoomId,
        fallbackAnchor,
        "social",
      );
      const pos = getStagedPositionForActor(roomId, visitor.id, "visitor", fallbackPos);
      return {
        id: visitor.id,
        kind: "visitor" as const,
        x: pos.x,
        y: pos.y,
        targetX: pos.x,
        targetY: pos.y,
        roomId,
        label: visitor.name,
        presetId: selectOperatorAppearanceRecipeId({ stableKey: visitor.id }),
        roleTag: visitor.desiredRoleTag,
        rank: visitorQualityToRank(visitor.quality),
        state: "idle" as ActorState,
        moveProgress: 1,
      };
    });

    const actors: ActorMarker[] = [...operatorActors, ...staffActors, ...visitorActors];

    return createHqWorldSnapshot(buildingName, geometry, actors, view.clock.minuteOfDay);
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

  const clearAutosaveTimeout = () => {
    if (autosaveTimeout) {
      clearTimeout(autosaveTimeout);
      autosaveTimeout = undefined;
    }
  };

  const startPersistWorker = () => {
    if (persistPromise) {
      return;
    }

    persistPromise = (async () => {
      while (persistQueued) {
        persistQueued = false;

        if (!persistDirty) {
          continue;
        }

        persistDirty = false;
        session.persistence = {
          status: "saving",
          lastSavedAt: session.persistence.lastSavedAt,
        };

        if (!closed) {
          session.state = buildRuntimeSessionState(session);
          notifyListeners();
        }

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

  const queuePersistNow = () => {
    if (!session.isSaveBacked || !session.save) {
      return;
    }

    if (!persistDirty) {
      return;
    }

    clearAutosaveTimeout();
    persistQueued = true;
    startPersistWorker();
  };

  const schedulePersist = (command: SimCommand) => {
    if (!session.isSaveBacked || !session.save) {
      return;
    }

    persistDirty = true;

    if (closed || command.type !== "sim/tick") {
      queuePersistNow();
      return;
    }

    if (autosaveTimeout) {
      return;
    }

    autosaveTimeout = setTimeout(() => {
      autosaveTimeout = undefined;
      queuePersistNow();
    }, AUTOSAVE_INTERVAL_MS);
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
        schedulePersist(command);
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

    setActiveFloor(input) {
      return commands.dispatch({
        type: "sim/set-active-floor",
        ...input,
      });
    },

    setRoomActive(input) {
      return commands.dispatch({
        type: "sim/set-room-active",
        ...input,
      });
    },

    setPolicy(input) {
      return commands.dispatch({
        type: "sim/set-policy",
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
      if (closed) {
        return;
      }

      autoTickEnabled = true;
      syncRuntimeActivity();
    },

    stopAutoTick() {
      if (closed) {
        return;
      }

      autoTickEnabled = false;
      syncRuntimeActivity();
    },

    pause(reason) {
      if (closed || pauseReasons.has(reason)) {
        return;
      }

      pauseReasons.add(reason);
      syncRuntimeActivity();
    },

    resume(reason) {
      if (closed || !pauseReasons.delete(reason)) {
        return;
      }

      syncRuntimeActivity();
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
      isPaused: false,
      isAutoTicking: false,
      persistence: { ...initialPersistence },
    },
    phase1View: initialPhase1View,
    worldSnapshot: initialWorldSnapshot,
    isPreview,
    isSaveBacked,
    isPaused: false,
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
      clearAutosaveTimeout();
      if (presentationRefreshInterval) {
        clearInterval(presentationRefreshInterval);
        presentationRefreshInterval = undefined;
      }
      lifecycle.stopAutoTick();
      queuePersistNow();
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

  return restoreSaveSession(save, {
    mode: "load",
    slotId,
  });
}

async function restoreSaveSession(
  save: PersistedSaveGame,
  options: {
    mode: "load" | "new";
    slotId: SaveSlotId;
  },
): Promise<RuntimeSession> {
  const { mode, slotId } = options;

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
    mode,
    slotId,
    save: updatedSave,
  });
}

async function createNewSaveSession(slotId: SaveSlotId): Promise<RuntimeSession> {
  const existingSave = await saveStorage.readSaveGame(slotId);
  if (existingSave) {
    // Refreshing a freshly-started game keeps the original route, so resume the slot instead
    // of surfacing a spurious "already occupied" error.
    return restoreSaveSession(existingSave, {
      mode: "load",
      slotId,
    });
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
    rawMode === "new" || rawMode === "load" || rawMode === "preview" ? rawMode : "new";
  const slotId = SAVE_SLOT_IDS.find((candidate) => candidate === rawSlotId);

  return { mode, slotId };
}

export async function resolveRuntimeSession(request: RuntimeRouteRequest): Promise<RuntimeSession> {
  switch (request.mode) {
    case "preview": {
      const session = createRuntimeSession(createPreviewWorldSnapshot(templateRegistry), {
        mode: "preview",
      });
      await session.commands.tick(0);
      return session;
    }
    case "new":
      return createNewSaveSession(assertSlotId(request.slotId));
    case "load":
      return loadSaveGameIntoSession(assertSlotId(request.slotId));
  }
}

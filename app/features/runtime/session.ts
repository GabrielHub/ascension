import { getBuildingFloors, getVisibleBuildingFloors } from "content/building-layouts";
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
  type EquipmentAssignmentSnapshot,
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
import { normalizeGameIdentity } from "lib/game-identity";
import { stableStringHash } from "lib/stable-hash";
import { visitorQualityToRank } from "lib/visitor-rank";
import type { AudioCueId } from "app/features/audio";
import type {
  AiConnectionStatus,
  AiGenerationProgress,
  AiGenerationSurface,
  AiRequestRecord,
  AiRequestTriggerSource,
  AiRuntimeProbeResult,
  LocalAiTransportConfig,
} from "app/features/ai";
import {
  buildIncidentFramingPayload,
  buildOperatorIdentityPayload,
  localAiClient,
} from "app/features/ai";
import { readGameSettings } from "app/features/settings/storage";

const AUTONOMOUS_TICK_INTERVAL_MS = 1000;
const AUTOSAVE_INTERVAL_MS = 10 * 60 * 1000;
const PRESENTATION_FRAME_INTERVAL_MS = 50;
const FIRST_INCIDENT_OPENING_BEAT_ID = "guidance/opening/first-incident";

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
  guildName?: string;
  playerName?: string;
}

function getInventoryQuantity(snapshot: WorldSnapshot, itemId: string): number {
  return snapshot.inventoryStacks?.find((stack) => stack.itemId === itemId)?.quantity ?? 0;
}

function getEquipmentAssignment(
  snapshot: WorldSnapshot,
  operatorId: string,
): EquipmentAssignmentSnapshot | undefined {
  return snapshot.equipmentAssignments?.find((assignment) => assignment.operatorId === operatorId);
}

function hasGenericInterruptionCue(interruption: RuntimePhase1View["activeInterruption"]): boolean {
  return interruption?.type === "announcement" || interruption?.type === "warning";
}

function resolveInterruptionTransitionCues(
  beforePhase1View: RuntimePhase1View,
  afterPhase1View: RuntimePhase1View,
): AudioCueId[] {
  const beforeInterruption = beforePhase1View.activeInterruption;
  const afterInterruption = afterPhase1View.activeInterruption;
  if (beforeInterruption?.instanceId === afterInterruption?.instanceId) {
    return [];
  }

  const cues: AudioCueId[] = [];
  if (hasGenericInterruptionCue(beforeInterruption)) {
    cues.push("event.interruption.resolve");
  }
  if (hasGenericInterruptionCue(afterInterruption)) {
    cues.push("event.interruption.open");
  }
  return cues;
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
  initiateRelocation(): Promise<void>;
  placeRoom(input: Omit<Extract<SimCommand, { type: "sim/place-room" }>, "type">): Promise<void>;
  setActiveFloor(
    input: Omit<Extract<SimCommand, { type: "sim/set-active-floor" }>, "type">,
  ): Promise<void>;
  setRoomActive(
    input: Omit<Extract<SimCommand, { type: "sim/set-room-active" }>, "type">,
  ): Promise<void>;
  setPolicy(input: Omit<Extract<SimCommand, { type: "sim/set-policy" }>, "type">): Promise<void>;
  setLootFilter(
    input: Omit<Extract<SimCommand, { type: "sim/set-loot-filter" }>, "type">,
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
  deferRecruit(
    input: Omit<Extract<SimCommand, { type: "sim/defer-recruit" }>, "type">,
  ): Promise<void>;
  rejectRecruit(
    input: Omit<Extract<SimCommand, { type: "sim/reject-recruit" }>, "type">,
  ): Promise<void>;
  replaceRecruit(
    input: Omit<Extract<SimCommand, { type: "sim/replace-recruit" }>, "type">,
  ): Promise<void>;
  dismissRecruit(
    input: Omit<Extract<SimCommand, { type: "sim/dismiss-recruit" }>, "type">,
  ): Promise<void>;
  hireStaff(input: Omit<Extract<SimCommand, { type: "sim/hire-staff" }>, "type">): Promise<void>;
  assignStaff(
    input: Omit<Extract<SimCommand, { type: "sim/assign-staff" }>, "type">,
  ): Promise<void>;
  buyItem(input: Omit<Extract<SimCommand, { type: "sim/buy-item" }>, "type">): Promise<void>;
  sellItem(input: Omit<Extract<SimCommand, { type: "sim/sell-item" }>, "type">): Promise<void>;
  equipItem(input: Omit<Extract<SimCommand, { type: "sim/equip-item" }>, "type">): Promise<void>;
  autoAssignAccessory(
    input: Omit<Extract<SimCommand, { type: "sim/auto-assign-accessory" }>, "type">,
  ): Promise<void>;
  unequipItem(
    input: Omit<Extract<SimCommand, { type: "sim/unequip-item" }>, "type">,
  ): Promise<void>;
  prepConsumable(
    input: Omit<Extract<SimCommand, { type: "sim/prep-consumable" }>, "type">,
  ): Promise<void>;
  craftDurable(
    input: Omit<Extract<SimCommand, { type: "sim/craft-durable" }>, "type">,
  ): Promise<void>;
  probeAiRuntime(): Promise<AiRuntimeProbeResult>;
  generateAiSurface(input: {
    surface: AiGenerationSurface;
    subjectId: string;
    payload: Record<string, unknown>;
    triggerSource?: AiRequestTriggerSource;
  }): Promise<AiRequestRecord>;
  regenerateAiSurface(input: {
    surface: AiGenerationSurface;
    subjectId: string;
    payload: Record<string, unknown>;
    triggerSource?: AiRequestTriggerSource;
  }): Promise<AiRequestRecord>;
}

export interface RuntimeSessionAiState {
  connectionStatus: AiConnectionStatus;
  lastProbe: AiRuntimeProbeResult | null;
  requests: ReadonlyMap<string, AiRequestRecord>;
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
  ai: RuntimeSessionAiState;
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

function createNewSaveGame(
  slotId: SaveSlotId,
  identityInput: Pick<RuntimeRouteRequest, "guildName" | "playerName">,
): PersistedSaveGame {
  const timestamp = getTimestamp();
  const identity = normalizeGameIdentity(identityInput, {
    guildNameFallback: `Guild Slot ${getSlotNumber(slotId)}`,
  });

  const seed = Math.max(
    2,
    stableStringHash(`${slotId}:${timestamp}:${identity.guildName}:${identity.playerName}`),
  );

  return {
    slotId,
    schemaVersion: CURRENT_SAVE_SCHEMA_VERSION,
    compatibilityVersion: CURRENT_CONTENT_COMPATIBILITY,
    metadata: {
      guildName: identity.guildName,
      playerName: identity.playerName,
      createdAt: timestamp,
      lastPlayedAt: timestamp,
    },
    world: createNewGameWorldSnapshot(templateRegistry, identity, { seed }),
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
      guildName: session.worldSnapshot.guild.guildName,
      playerName: session.worldSnapshot.guild.playerName,
      lastPlayedAt: getTimestamp(),
    },
    world: session.worldSnapshot,
  };
}

function getStructuredRecordSlice(
  snapshot: WorldSnapshot,
  key: "guidanceState" | "incidentState" | "interruptionQueue",
): Record<string, unknown> | null {
  const value = snapshot[key];
  return value && typeof value === "object" ? value : null;
}

function buildOpeningFirstIncidentPersistenceSignature(snapshot: WorldSnapshot): string | null {
  const guidanceState = getStructuredRecordSlice(snapshot, "guidanceState");
  const incidentState = getStructuredRecordSlice(snapshot, "incidentState");
  const interruptionQueue = getStructuredRecordSlice(snapshot, "interruptionQueue");
  const activeBeatId =
    typeof guidanceState?.activeBeatId === "string" ? guidanceState.activeBeatId : null;
  const completedBeatIds = Array.isArray(guidanceState?.completedBeatIds)
    ? guidanceState.completedBeatIds.filter((value): value is string => typeof value === "string")
    : [];
  const openingPathState =
    typeof guidanceState?.openingPathState === "string" ? guidanceState.openingPathState : null;
  const pendingIncident =
    incidentState?.pendingIncident && typeof incidentState.pendingIncident === "object"
      ? (incidentState.pendingIncident as Record<string, unknown>)
      : null;
  const interruptionSnapshot = {
    active:
      interruptionQueue?.active && typeof interruptionQueue.active === "object"
        ? interruptionQueue.active
        : null,
    queue: Array.isArray(interruptionQueue?.queue) ? interruptionQueue.queue : [],
  };
  const firstIncidentSequenceActive =
    openingPathState === "active" &&
    !completedBeatIds.includes(FIRST_INCIDENT_OPENING_BEAT_ID) &&
    (activeBeatId === FIRST_INCIDENT_OPENING_BEAT_ID || pendingIncident !== null);

  if (!firstIncidentSequenceActive) {
    return null;
  }

  return JSON.stringify({
    activeBeatId,
    activeBeatView:
      guidanceState?.activeBeatView && typeof guidanceState.activeBeatView === "object"
        ? guidanceState.activeBeatView
        : null,
    interruptionQueue: interruptionSnapshot,
    pendingIncident,
  });
}

export function shouldImmediatelyPersistTickMutation(
  beforeWorldSnapshot: WorldSnapshot,
  afterWorldSnapshot: WorldSnapshot,
): boolean {
  const beforeSignature = buildOpeningFirstIncidentPersistenceSignature(beforeWorldSnapshot);
  const afterSignature = buildOpeningFirstIncidentPersistenceSignature(afterWorldSnapshot);
  return (
    (beforeSignature !== null || afterSignature !== null) && beforeSignature !== afterSignature
  );
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
    case "sim/defer-recruit": {
      const previousVisitor = beforePhase1View.visitors.find(
        (visitor) => visitor.id === command.visitorId,
      );
      const nextVisitor = afterPhase1View.visitors.find(
        (visitor) => visitor.id === command.visitorId,
      );
      return previousVisitor?.queueState === "active" && nextVisitor?.queueState === "deferred"
        ? ["hq.dismiss"]
        : [];
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
    case "sim/replace-recruit": {
      return afterPhase1View.visitors.length < beforePhase1View.visitors.length
        ? ["hq.dismiss", "operator.recruit"]
        : [];
    }
    case "sim/dismiss-recruit": {
      return afterPhase1View.visitors.length < beforePhase1View.visitors.length
        ? ["hq.dismiss"]
        : [];
    }
    case "sim/set-active-floor": {
      return beforePhase1View.building.activeFloorIndex !==
        afterPhase1View.building.activeFloorIndex
        ? ["hq.floor.switch"]
        : [];
    }
    case "sim/buy-item": {
      return getInventoryQuantity(afterWorldSnapshot, command.itemId) >
        getInventoryQuantity(beforeWorldSnapshot, command.itemId)
        ? ["hq.market.buy"]
        : [];
    }
    case "sim/sell-item": {
      return getInventoryQuantity(afterWorldSnapshot, command.itemId) <
        getInventoryQuantity(beforeWorldSnapshot, command.itemId)
        ? ["hq.market.sell"]
        : [];
    }
    case "sim/equip-item": {
      const previousAssignment = getEquipmentAssignment(beforeWorldSnapshot, command.operatorId);
      const nextAssignment = getEquipmentAssignment(afterWorldSnapshot, command.operatorId);
      const previousItemId = previousAssignment?.[`${command.slot}Id`];
      const nextItemId = nextAssignment?.[`${command.slot}Id`];
      return previousItemId !== nextItemId && (nextItemId?.length ?? 0) > 0 ? ["hq.equip"] : [];
    }
    case "sim/auto-assign-accessory": {
      const previousAssignment = getEquipmentAssignment(beforeWorldSnapshot, command.operatorId);
      const nextAssignment = getEquipmentAssignment(afterWorldSnapshot, command.operatorId);
      return previousAssignment?.accessoryId !== nextAssignment?.accessoryId &&
        (nextAssignment?.accessoryId?.length ?? 0) > 0
        ? ["hq.equip"]
        : [];
    }
    case "sim/unequip-item": {
      const previousAssignment = getEquipmentAssignment(beforeWorldSnapshot, command.operatorId);
      const nextAssignment = getEquipmentAssignment(afterWorldSnapshot, command.operatorId);
      const previousItemId = previousAssignment?.[`${command.slot}Id`];
      const nextItemId = nextAssignment?.[`${command.slot}Id`];
      return (previousItemId?.length ?? 0) > 0 && (nextItemId?.length ?? 0) === 0
        ? ["hq.unequip"]
        : [];
    }
    case "sim/prep-consumable": {
      const before = beforeWorldSnapshot.inventoryStacks ?? [];
      const after = afterWorldSnapshot.inventoryStacks ?? [];
      const sumBefore = before.reduce((s, e) => s + e.quantity, 0);
      const sumAfter = after.reduce((s, e) => s + e.quantity, 0);
      return sumBefore !== sumAfter ? ["hq.prep"] : [];
    }
    case "sim/bid-contract": {
      return beforePhase1View.contractLifecycle !== "active" &&
        afterPhase1View.contractLifecycle === "active"
        ? ["raid.contract.bid"]
        : [];
    }
    case "sim/advance-contract": {
      return beforePhase1View.contractLifecycle === "resolved" &&
        afterPhase1View.contractLifecycle === "bidding"
        ? ["raid.contract.advance"]
        : [];
    }
    case "sim/incident-resolve": {
      return beforePhase1View.activeInterruption?.payload.kind === "incident" &&
        beforePhase1View.activeInterruption.instanceId !==
          afterPhase1View.activeInterruption?.instanceId
        ? ["event.incident.resolve"]
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
  simulation.runtimeState.deferIncidentPresentation = true;
  const listeners = new Set<RuntimeSessionListener>();
  const isPreview = options.mode === "preview";
  const isSaveBacked = !isPreview && options.save !== undefined;

  let closed = false;
  let autoTickInterval: ReturnType<typeof setInterval> | undefined;
  let autosaveTimeout: ReturnType<typeof setTimeout> | undefined;
  let presentationRefreshInterval: ReturnType<typeof setInterval> | undefined;
  let aiProgressRefreshInterval: ReturnType<typeof setInterval> | undefined;
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

  const clearAiProgressRefreshInterval = () => {
    if (!aiProgressRefreshInterval) {
      return;
    }

    clearInterval(aiProgressRefreshInterval);
    aiProgressRefreshInterval = undefined;
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

  type HqWorldStaticContext = {
    view: RuntimePhase1View;
    activeBuildingId: string;
    buildingName: string;
    allRooms: RoomEntry[];
    rooms: RoomEntry[];
    visibleRoomIds: Set<string>;
    geometry: ReturnType<typeof composeHqWorldGeometry>;
    anchorsByRoomId: Map<string, NavAnchor[]>;
    fallbackAnchor: NavAnchor | undefined;
    roomsById: Map<string, RoomEntry>;
    roomNodesById: Map<string, RoomGeometryNode>;
  };

  let cachedHqWorldStaticContext: HqWorldStaticContext | null = null;

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

  function getHqWorldStaticContext(view: RuntimePhase1View): HqWorldStaticContext {
    if (cachedHqWorldStaticContext?.view === view) {
      return cachedHqWorldStaticContext;
    }

    const activeBuildingId = view.building.activeBuildingId;
    const activeFloorIndex = view.building.activeFloorIndex;
    const visibleFloorIndexes = new Set(
      getVisibleBuildingFloors(activeBuildingId, activeFloorIndex, view.building.tier).map(
        (floor) => floor.floorIndex,
      ),
    );
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
    const visibleGeometryRooms = allRooms.filter((room) =>
      visibleFloorIndexes.has(room.floorIndex),
    );
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
          visibleFloorIndexes.has(slot.floorIndex) &&
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
    const geometry = composeHqWorldGeometry(visibleGeometryRooms, {
      reservedSlots,
      buildingId: activeBuildingId,
      buildingTier: view.building.tier,
      floorIndex: activeFloorIndex,
    });
    const anchorsByRoomId = new Map<string, NavAnchor[]>();
    for (const anchor of geometry.navGraph.anchors) {
      let list = anchorsByRoomId.get(anchor.roomId);
      if (!list) {
        list = [];
        anchorsByRoomId.set(anchor.roomId, list);
      }
      list.push(anchor);
    }

    cachedHqWorldStaticContext = {
      view,
      activeBuildingId,
      buildingName,
      allRooms,
      rooms,
      visibleRoomIds,
      geometry,
      anchorsByRoomId,
      fallbackAnchor: geometry.navGraph.anchors[0] as NavAnchor | undefined,
      roomsById: new Map(rooms.map((room) => [room.id, room])),
      roomNodesById: new Map(geometry.rooms.map((room) => [room.id, room])),
    };

    return cachedHqWorldStaticContext;
  }

  function deriveHqWorldSnapshot(view: RuntimePhase1View, nowMs = Date.now()): HqWorldSnapshot {
    const {
      activeBuildingId,
      allRooms,
      rooms,
      visibleRoomIds,
      geometry,
      anchorsByRoomId,
      fallbackAnchor,
      roomsById,
      roomNodesById,
      buildingName,
    } = getHqWorldStaticContext(view);
    const navGraph = geometry.navGraph;
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
      ? view.visitors
          .filter((visitor) => visitor.queueState === "active")
          .map((visitor) => ({ visitor, roomId: recruitmentRoom.id }))
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
    const activeBuildingTemplate = templateRegistry.buildingById.get(activeBuildingId);
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
        presetId:
          visitor.appearance?.presetId ??
          selectOperatorAppearanceRecipeId({ stableKey: visitor.id }),
        roleTag: visitor.desiredRoleTag,
        rank: visitorQualityToRank(visitor.quality, activeBuildingTemplate?.contractRankCeiling),
        state: "idle" as ActorState,
        moveProgress: 1,
      };
    });

    const actors: ActorMarker[] = [...operatorActors, ...staffActors, ...visitorActors];

    return createHqWorldSnapshot(
      buildingName,
      geometry,
      actors,
      view.clock.minuteOfDay,
      activeBuildingId,
    );
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

  const schedulePersist = (
    command: SimCommand,
    beforeWorldSnapshot: WorldSnapshot,
    afterWorldSnapshot: WorldSnapshot,
  ): Promise<void> | undefined => {
    if (!session.isSaveBacked || !session.save) {
      return undefined;
    }

    persistDirty = true;

    if (closed || command.type !== "sim/tick") {
      queuePersistNow();
      return undefined;
    }

    if (shouldImmediatelyPersistTickMutation(beforeWorldSnapshot, afterWorldSnapshot)) {
      queuePersistNow();
      return persistPromise;
    }

    if (autosaveTimeout) {
      return undefined;
    }

    autosaveTimeout = setTimeout(() => {
      autosaveTimeout = undefined;
      queuePersistNow();
    }, AUTOSAVE_INTERVAL_MS);

    return undefined;
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
        schedulePendingIncidentPresentation();
        schedulePendingVisitorIdentityGeneration();
        pendingCues.push(
          ...resolveCuesForCommand(
            command,
            beforeWorldSnapshot,
            session.worldSnapshot,
            beforePhase1View,
            session.phase1View,
          ),
          ...resolveInterruptionTransitionCues(beforePhase1View, session.phase1View),
        );
        appendSimulationCues();
        notifyListeners();
        return schedulePersist(command, beforeWorldSnapshot, session.worldSnapshot);
      });

    mutationQueue = nextMutation.catch(() => undefined);

    return nextMutation;
  };

  // ── AI request registry ──────────────────────────────────────────────

  const aiRequests = new Map<string, AiRequestRecord>();
  const aiRequestPromises = new Map<string, Promise<AiRequestRecord>>();
  let aiConnectionStatus: AiConnectionStatus = "unknown";
  let aiLastProbe: AiRuntimeProbeResult | null = null;

  function hasAnyPendingAiRequest(): boolean {
    for (const record of aiRequests.values()) {
      if (record.status === "pending") return true;
    }
    return false;
  }

  function syncAiProgressRefresh(): void {
    if (closed || !hasAnyPendingAiRequest()) {
      clearAiProgressRefreshInterval();
      return;
    }

    if (aiProgressRefreshInterval) {
      return;
    }

    aiProgressRefreshInterval = setInterval(() => {
      if (closed || !hasAnyPendingAiRequest()) {
        clearAiProgressRefreshInterval();
        return;
      }

      notifyListeners();
    }, 250);
  }

  function makeAiRequestKey(surface: AiGenerationSurface, subjectId: string): string {
    return `${surface}:${subjectId}`;
  }

  function normalizeAiPayloadValue(value: unknown): unknown {
    if (Array.isArray(value)) {
      return value.map((entry) => normalizeAiPayloadValue(entry));
    }

    if (value && typeof value === "object") {
      const normalized: Record<string, unknown> = {};
      for (const key of Object.keys(value as Record<string, unknown>).sort()) {
        normalized[key] = normalizeAiPayloadValue((value as Record<string, unknown>)[key]);
      }
      return normalized;
    }

    return value;
  }

  function stableStringifyAiPayload(payload: Record<string, unknown>): string {
    return JSON.stringify(normalizeAiPayloadValue(payload));
  }

  function cloneAiPayload(payload: Record<string, unknown>): Record<string, unknown> {
    return JSON.parse(stableStringifyAiPayload(payload)) as Record<string, unknown>;
  }

  function getAiPayloadVersion(surface: AiGenerationSurface): number {
    switch (surface) {
      case "incident-framing":
        return 3;
      case "operator-identity":
        return 3;
      default:
        return 1;
    }
  }

  function getUnsupportedAiSurfaceError(surface: AiGenerationSurface): string | null {
    switch (surface) {
      case "incident-framing":
        return null;
      case "operator-identity":
        return null;
      default:
        return `Unknown AI surface "${surface}".`;
    }
  }

  function getAiTransportConfig(): LocalAiTransportConfig {
    const settings = readGameSettings();
    return {
      runtimeKind: settings.ai.runtimeKind,
      baseUrl: settings.ai.baseUrl,
      modelId: settings.ai.modelId,
    };
  }

  function getAiConfigFingerprint(config: LocalAiTransportConfig): string {
    return `${config.runtimeKind}|${config.baseUrl}|${config.modelId}`;
  }

  const autoIncidentPresentationRequests = new Set<string>();
  const autoVisitorIdentityAttempts = new Map<string, string>();
  const autoVisitorIdentityInFlight = new Set<string>();
  let autoVisitorIdentityQueueActive = false;

  function hasQueuedIncidentPresentation(incidentInstanceId: string): boolean {
    const active = simulation.runtimeState.interruptionQueue.active;
    if (
      active?.payload.kind === "incident" &&
      active.payload.incidentInstanceId === incidentInstanceId
    ) {
      return true;
    }

    return simulation.runtimeState.interruptionQueue.queue.some(
      (instance) =>
        instance.payload.kind === "incident" &&
        instance.payload.incidentInstanceId === incidentInstanceId,
    );
  }

  function readPendingIncident() {
    return simulation.runtimeState.incidentState.pendingIncident;
  }

  function schedulePendingVisitorIdentityGeneration(): void {
    const settings = readGameSettings().ai;
    if (!settings.enabled) {
      return;
    }

    const configFingerprint = getAiConfigFingerprint(getAiTransportConfig());
    const currentVisitorIds = new Set(session.phase1View.visitors.map((v) => v.id));
    for (const id of autoVisitorIdentityAttempts.keys()) {
      if (!currentVisitorIds.has(id)) {
        autoVisitorIdentityAttempts.delete(id);
        autoVisitorIdentityInFlight.delete(id);
      }
    }
    if (autoVisitorIdentityQueueActive) {
      return;
    }

    const nextVisitor = session.phase1View.visitors.find((visitor) => {
      if (visitor.identitySource === "generated") {
        autoVisitorIdentityAttempts.delete(visitor.id);
        autoVisitorIdentityInFlight.delete(visitor.id);
        return false;
      }

      if (autoVisitorIdentityInFlight.has(visitor.id)) {
        return false;
      }

      return autoVisitorIdentityAttempts.get(visitor.id) !== configFingerprint;
    });

    if (!nextVisitor) {
      return;
    }

    autoVisitorIdentityAttempts.set(nextVisitor.id, configFingerprint);
    autoVisitorIdentityInFlight.add(nextVisitor.id);
    autoVisitorIdentityQueueActive = true;

    void (async () => {
      try {
        const latestVisitor = session.phase1View.visitors.find(
          (entry) => entry.id === nextVisitor.id,
        );
        if (!latestVisitor || latestVisitor.identitySource === "generated") {
          return;
        }

        const generationResult = await commands.generateAiSurface({
          surface: "operator-identity",
          subjectId: nextVisitor.id,
          payload: buildOperatorIdentityPayload(session, latestVisitor),
          triggerSource: "auto",
        });

        if (generationResult.status !== "succeeded" || !generationResult.result) {
          console.error("[ai operator identity] generation failed", {
            visitorId: nextVisitor.id,
            roleTag: nextVisitor.desiredRoleTag,
            error: generationResult.error,
          });
          return;
        }

        const output = generationResult.result.output as {
          specialtyTag: string;
          appearance: {
            presetId: string;
            visibleGear?: {
              weaponPartId?: string;
              outfitOverlayPartId?: string;
              accessoryPartId?: string;
            };
          };
          preferences: {
            riskTolerance: number;
            rewardFocus: number;
            recoveryBias: number;
            socialBias: number;
            trainingBias: number;
            comfortBias: number;
            preferredMissionTags: string[];
          };
          personaSummary: string;
          personaHooks: string[];
        };

        const currentVisitor = session.phase1View.visitors.find(
          (entry) => entry.id === nextVisitor.id,
        );
        if (!currentVisitor || currentVisitor.identitySource === "generated") {
          return;
        }

        await commands.dispatch({
          type: "sim/visitor-update-identity",
          visitorId: nextVisitor.id,
          specialtyTag: output.specialtyTag,
          appearance: output.appearance,
          preferences: output.preferences,
          personaSummary: output.personaSummary,
          personaHooks: output.personaHooks,
        });
      } catch (error) {
        console.error("[ai operator identity] unexpected generation error", {
          visitorId: nextVisitor.id,
          roleTag: nextVisitor.desiredRoleTag,
          error,
        });
      } finally {
        autoVisitorIdentityInFlight.delete(nextVisitor.id);
        autoVisitorIdentityQueueActive = false;
        schedulePendingVisitorIdentityGeneration();
      }
    })();
  }

  function buildGeneratedIncidentPresentation(output: Record<string, unknown>) {
    const title = typeof output.title === "string" ? output.title.trim() : "";
    const briefing = typeof output.briefing === "string" ? output.briefing.trim() : "";
    const choices = Array.isArray(output.choices)
      ? output.choices
          .filter((choice): choice is Record<string, unknown> =>
            Boolean(choice && typeof choice === "object"),
          )
          .map((choice) => ({
            choiceId: String(choice.choiceId ?? ""),
            label: String(choice.label ?? ""),
            description: String(choice.description ?? ""),
            consequenceSummary: String(choice.consequenceSummary ?? ""),
            resolutionSummary:
              typeof choice.resolutionSummary === "string"
                ? choice.resolutionSummary.trim()
                : undefined,
          }))
      : [];

    return {
      title,
      briefing,
      choices,
      copySource: "generated" as const,
    };
  }

  function schedulePendingIncidentPresentation(): void {
    const incident = readPendingIncident();
    if (!incident || hasQueuedIncidentPresentation(incident.instanceId)) {
      return;
    }

    const requestKey = incident.instanceId;
    if (autoIncidentPresentationRequests.has(requestKey)) {
      return;
    }

    autoIncidentPresentationRequests.add(requestKey);

    const fallbackToAuthored = async (reason: string, error?: unknown) => {
      if (error) {
        console.error(`[ai incident] ${reason}`, {
          incidentInstanceId: incident.instanceId,
          templateId: incident.templateId,
          error,
        });
      } else {
        console.warn(`[ai incident] ${reason}`, {
          incidentInstanceId: incident.instanceId,
          templateId: incident.templateId,
        });
      }

      const latestIncident = readPendingIncident();
      if (
        closed ||
        !latestIncident ||
        latestIncident.instanceId !== incident.instanceId ||
        hasQueuedIncidentPresentation(incident.instanceId)
      ) {
        return;
      }

      await commands.dispatch({
        type: "sim/incident-materialize",
        incidentInstanceId: incident.instanceId,
        presentation: {
          copySource: "authored",
        },
      });
    };

    void (async () => {
      try {
        const pendingIncident = readPendingIncident();
        if (!pendingIncident) {
          return;
        }
        const payload = buildIncidentFramingPayload(session, pendingIncident);

        const settings = readGameSettings().ai;
        if (!settings.enabled) {
          await fallbackToAuthored("AI generation disabled; using authored incident copy.");
          return;
        }

        const generationResult = await commands.generateAiSurface({
          surface: "incident-framing",
          subjectId: incident.instanceId,
          payload,
          triggerSource: "auto",
        });

        if (generationResult.status !== "succeeded" || !generationResult.result) {
          await fallbackToAuthored(
            "Generation failed; using authored incident copy.",
            generationResult.error ?? undefined,
          );
          return;
        }

        const latestIncident = readPendingIncident();
        if (
          closed ||
          !latestIncident ||
          latestIncident.instanceId !== incident.instanceId ||
          hasQueuedIncidentPresentation(incident.instanceId)
        ) {
          return;
        }

        await commands.dispatch({
          type: "sim/incident-materialize",
          incidentInstanceId: incident.instanceId,
          presentation: buildGeneratedIncidentPresentation(generationResult.result.output),
        });
      } catch (error) {
        await fallbackToAuthored(
          "Unexpected generation error; using authored incident copy.",
          error,
        );
      } finally {
        autoIncidentPresentationRequests.delete(requestKey);
      }
    })();
  }

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

    initiateRelocation() {
      return commands.dispatch({
        type: "sim/initiate-relocation",
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

    setLootFilter(input) {
      return commands.dispatch({
        type: "sim/set-loot-filter",
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

    deferRecruit(input) {
      return commands.dispatch({
        type: "sim/defer-recruit",
        ...input,
      });
    },

    rejectRecruit(input) {
      return commands.dispatch({
        type: "sim/reject-recruit",
        ...input,
      });
    },

    replaceRecruit(input) {
      return commands.dispatch({
        type: "sim/replace-recruit",
        ...input,
      });
    },

    dismissRecruit(input) {
      return commands.dispatch({
        type: "sim/dismiss-recruit",
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

    equipItem(input) {
      return commands.dispatch({
        type: "sim/equip-item",
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

    prepConsumable(input) {
      return commands.dispatch({
        type: "sim/prep-consumable",
        ...input,
      });
    },

    craftDurable(input) {
      return commands.dispatch({
        type: "sim/craft-durable",
        ...input,
      });
    },

    async probeAiRuntime() {
      const config = getAiTransportConfig();
      const result = await localAiClient.probe(config);
      aiConnectionStatus = result.status;
      aiLastProbe = result;
      notifyListeners();
      return result;
    },

    async generateAiSurface(input) {
      const key = makeAiRequestKey(input.surface, input.subjectId);
      const existing = aiRequests.get(key);
      const config = getAiTransportConfig();
      const payload = cloneAiPayload(input.payload);
      const payloadFingerprint = stableStringifyAiPayload(payload);
      const payloadVersion = getAiPayloadVersion(input.surface);

      const hasMatchingPayload =
        existing?.payloadVersion === payloadVersion &&
        existing.payloadFingerprint === payloadFingerprint &&
        existing.runtimeKind === config.runtimeKind &&
        existing.baseUrl === config.baseUrl &&
        existing.modelId === config.modelId;

      // If a valid result already exists for the same payload version, reuse it.
      if (existing?.status === "succeeded" && existing.result && hasMatchingPayload) {
        return existing;
      }

      // If a request is already pending for the same payload, reuse its in-flight promise.
      if (existing?.status === "pending" && hasMatchingPayload) {
        return aiRequestPromises.get(key) ?? existing;
      }

      const record: AiRequestRecord = {
        requestKey: key,
        subjectId: input.subjectId,
        surface: input.surface,
        triggerSource: input.triggerSource ?? "dev-menu",
        status: "pending",
        runtimeKind: config.runtimeKind,
        baseUrl: config.baseUrl,
        modelId: config.modelId,
        payload,
        payloadFingerprint,
        payloadVersion,
        startedAt: Date.now(),
        finishedAt: null,
        progress: {
          phase: "queued",
          attempt: 1,
          message: "Queued for generation…",
          receivedCharacters: 0,
          partialText: null,
          updatedAt: Date.now(),
        },
        result: null,
        error: null,
      };

      aiRequests.set(key, record);
      syncAiProgressRefresh();
      notifyListeners();

      const updateProgress = (progress: AiGenerationProgress): void => {
        record.progress = progress;
        if (aiRequests.get(key) === record) {
          syncAiProgressRefresh();
        }
      };

      const finalizeRecord = (
        status: AiRequestRecord["status"],
        overrides: Pick<AiRequestRecord, "finishedAt" | "result" | "error">,
      ): AiRequestRecord => {
        record.status = status;
        record.finishedAt = overrides.finishedAt;
        record.result = overrides.result;
        record.error = overrides.error;
        syncAiProgressRefresh();
        if (aiRequests.get(key) === record) {
          notifyListeners();
        }
        return record;
      };

      const requestPromise = (async (): Promise<AiRequestRecord> => {
        const unsupportedSurfaceError = getUnsupportedAiSurfaceError(input.surface);
        if (unsupportedSurfaceError) {
          updateProgress({
            phase: "queued",
            attempt: 1,
            message: unsupportedSurfaceError,
            receivedCharacters: 0,
            partialText: null,
            updatedAt: Date.now(),
          });
          return finalizeRecord("failed", {
            finishedAt: Date.now(),
            result: null,
            error: unsupportedSurfaceError,
          });
        }

        try {
          const result = await localAiClient.generate(
            {
              surface: input.surface,
              subjectId: input.subjectId,
              payload,
              payloadVersion,
              config,
            },
            {
              onProgress: updateProgress,
            },
          );

          updateProgress({
            phase: "validating",
            attempt: record.progress?.attempt === 2 ? 2 : 1,
            message: "Validated JSON successfully.",
            receivedCharacters: record.progress?.receivedCharacters ?? 0,
            partialText: record.progress?.partialText ?? null,
            updatedAt: Date.now(),
          });

          return finalizeRecord("succeeded", {
            finishedAt: Date.now(),
            result,
            error: null,
          });
        } catch (err) {
          return finalizeRecord("failed", {
            finishedAt: Date.now(),
            result: null,
            error: err instanceof Error ? err.message : "Unknown error",
          });
        }
      })();

      aiRequestPromises.set(key, requestPromise);

      try {
        return await requestPromise;
      } finally {
        if (aiRequestPromises.get(key) === requestPromise) {
          aiRequestPromises.delete(key);
        }
      }
    },

    async regenerateAiSurface(input) {
      const key = makeAiRequestKey(input.surface, input.subjectId);
      // Clear existing record to force a new request
      aiRequests.delete(key);
      return commands.generateAiSurface(input);
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
      schedulePendingIncidentPresentation();
      schedulePendingVisitorIdentityGeneration();
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
    ai: {
      get connectionStatus() {
        return aiConnectionStatus;
      },
      get lastProbe() {
        return aiLastProbe;
      },
      get requests() {
        return aiRequests as ReadonlyMap<string, AiRequestRecord>;
      },
    },
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
      clearAiProgressRefreshInterval();
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
  schedulePendingIncidentPresentation();
  schedulePendingVisitorIdentityGeneration();

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

async function createNewSaveSession(
  slotId: SaveSlotId,
  identityInput: Pick<RuntimeRouteRequest, "guildName" | "playerName">,
): Promise<RuntimeSession> {
  const existingSave = await saveStorage.readSaveGame(slotId);
  if (existingSave) {
    // Refreshing a freshly-started game keeps the original route, so resume the slot instead
    // of surfacing a spurious "already occupied" error.
    return restoreSaveSession(existingSave, {
      mode: "load",
      slotId,
    });
  }

  const save = createNewSaveGame(slotId, identityInput);
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

  if (request.guildName) {
    params.set("guildName", request.guildName);
  }

  if (request.playerName) {
    params.set("playerName", request.playerName);
  }

  return `/game?${params.toString()}`;
}

export function parseRuntimeRouteRequest(search: string): RuntimeRouteRequest {
  const params = new URLSearchParams(search);
  const rawMode = params.get("mode");
  const rawSlotId = params.get("slot");
  const rawGuildName = params.get("guildName") ?? undefined;
  const rawPlayerName = params.get("playerName") ?? undefined;

  const mode: RuntimeRouteMode =
    rawMode === "new" || rawMode === "load" || rawMode === "preview" ? rawMode : "new";
  const slotId = SAVE_SLOT_IDS.find((candidate) => candidate === rawSlotId);

  return {
    mode,
    slotId,
    ...(rawGuildName ? { guildName: rawGuildName } : {}),
    ...(rawPlayerName ? { playerName: rawPlayerName } : {}),
  };
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
      return createNewSaveSession(assertSlotId(request.slotId), request);
    case "load":
      return loadSaveGameIntoSession(assertSlotId(request.slotId));
  }
}

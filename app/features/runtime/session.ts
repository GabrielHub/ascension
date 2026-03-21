import { templateRegistry } from "content/templates";
import { buildWorldRenderSnapshot } from "render";
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
  type AscensionSimulation,
  type SimCommand,
  type StableSimCommandType,
} from "sim";

const AUTONOMOUS_TICK_INTERVAL_MS = 1000;

type RuntimePhase1View = ReturnType<AscensionSimulation["getPhase1View"]>;
type RuntimeWorldRenderSnapshot = ReturnType<typeof buildWorldRenderSnapshot>;
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
  worldRenderSnapshot: RuntimeWorldRenderSnapshot;
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
  worldRenderSnapshot: RuntimeWorldRenderSnapshot;
  isPreview: boolean;
  isSaveBacked: boolean;
  isAutoTicking: boolean;
  persistence: RuntimeSessionPersistenceState;
  commands: RuntimeSessionCommands;
  lifecycle: RuntimeSessionLifecycle;
  subscribe(listener: RuntimeSessionListener): () => void;
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
    worldRenderSnapshot: session.worldRenderSnapshot,
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
  let autoTickPending = false;
  let mutationQueue = Promise.resolve();
  let persistQueued = false;
  let persistPromise: Promise<void> | undefined;
  let session!: RuntimeSession;

  const refreshDerivedState = () => {
    const nextWorldSnapshot = simulation.getWorldSnapshot();

    session.worldSnapshot = nextWorldSnapshot;
    session.phase1View = simulation.getPhase1View(nextWorldSnapshot);
    session.worldRenderSnapshot = buildWorldRenderSnapshot(nextWorldSnapshot, templateRegistry);
    session.state = buildRuntimeSessionState(session);
  };

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
        simulation.dispatch(command);
        refreshDerivedState();
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
  const initialWorldRenderSnapshot = buildWorldRenderSnapshot(
    initialWorldSnapshot,
    templateRegistry,
  );
  const initialPersistence: RuntimeSessionPersistenceState =
    isSaveBacked && options.save
      ? {
          status: "idle",
          lastSavedAt: options.save.metadata.lastPlayedAt,
        }
      : {
          status: "idle",
        };

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
      worldRenderSnapshot: initialWorldRenderSnapshot,
      isPreview,
      isSaveBacked,
      isAutoTicking: false,
      persistence: { ...initialPersistence },
    },
    phase1View: initialPhase1View,
    worldSnapshot: initialWorldSnapshot,
    worldRenderSnapshot: initialWorldRenderSnapshot,
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
    dispose() {
      if (closed) {
        return;
      }

      closed = true;
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

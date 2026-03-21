import { templateRegistry } from "content/templates";
import {
  buildPreviewDetailRecipe,
  buildWorldRenderSnapshot,
  createPreviewSvgCatalog,
  validateSvgPartCatalog,
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
  createAscensionSimulation,
  createBootstrapWorldSnapshot,
  type AscensionSimulation,
} from "sim";

const svgCatalog = createPreviewSvgCatalog();
const svgCatalogIssues = validateSvgPartCatalog(svgCatalog);

if (svgCatalogIssues.length > 0) {
  throw new Error(`SVG part validation failed.\n${svgCatalogIssues.join("\n")}`);
}

export type RuntimeRouteMode = "preview" | "new" | "load";

export interface RuntimeRouteRequest {
  mode: RuntimeRouteMode;
  slotId?: SaveSlotId;
}

export interface RuntimeSession {
  mode: RuntimeRouteMode;
  slotId?: SaveSlotId;
  save?: PersistedSaveGame;
  registry: typeof templateRegistry;
  simulation: AscensionSimulation;
  svgCatalog: typeof svgCatalog;
  worldSnapshot: WorldSnapshot;
  worldRenderSnapshot: ReturnType<typeof buildWorldRenderSnapshot>;
  operatorDetailRecipe: ReturnType<typeof buildPreviewDetailRecipe>;
}

function getTimestamp(): string {
  return new Date().toISOString();
}

function getSlotNumber(slotId: SaveSlotId): number {
  return SAVE_SLOT_IDS.indexOf(slotId) + 1;
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

function createRuntimeSession(
  worldSnapshot: WorldSnapshot,
  options: {
    mode: RuntimeRouteMode;
    slotId?: SaveSlotId;
    save?: PersistedSaveGame;
  },
): RuntimeSession {
  const simulation = createAscensionSimulation(worldSnapshot, templateRegistry);

  return {
    mode: options.mode,
    slotId: options.slotId,
    save: options.save,
    registry: templateRegistry,
    simulation,
    svgCatalog,
    worldSnapshot,
    worldRenderSnapshot: buildWorldRenderSnapshot(worldSnapshot, templateRegistry),
    operatorDetailRecipe: buildPreviewDetailRecipe(),
  };
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

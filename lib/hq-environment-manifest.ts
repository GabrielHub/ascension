import hqEnvironmentIndexData from "content/data/hq-environment-index.json";

import type { HqTimeOfDayPhase } from "./hq-time-phase";

export interface HqEnvironmentAssetRoots {
  partsRoot: string;
  referenceRoot: string;
  recipesRoot: string;
}

export interface HqSceneViewBox {
  minX: number;
  minY: number;
  width: number;
  height: number;
}

export interface HqSceneSystemConfig {
  canonicalOrigin: readonly [number, number];
  canonicalViewBox: HqSceneViewBox;
  roomFootprint: Readonly<{ cols: number; rows: number }>;
}

export interface HqEnvironmentRenderConfig {
  building: string;
  paths: HqEnvironmentAssetRoots;
  composition: Readonly<{
    tileWidth: number;
    tileHeight: number;
    wallHeight: number;
    sceneSystem: HqSceneSystemConfig;
  }>;
}

interface RawBackdropPhaseProfile {
  ambientTint?: string;
  fogColor?: string;
  shadowIntensity?: number;
  zones?: Partial<Record<string, readonly string[]>>;
}

interface RawBackdropManifest {
  profileId?: string;
  elevationBandId?: string | null;
  phases?: Partial<Record<string, RawBackdropPhaseProfile>>;
}

interface RawHqEnvironmentManifest {
  building?: string;
  paths?: Partial<HqEnvironmentAssetRoots>;
  composition?: {
    tileWidth?: number;
    tileHeight?: number;
    wallHeight?: number;
    sceneSystem?: {
      canonicalOrigin?: readonly [number, number];
      canonicalViewBox?: string;
      roomFootprint?: {
        cols?: number;
        rows?: number;
      };
    };
  };
  backdrop?: RawBackdropManifest;
}

const DEFAULT_BUILDING = "bodega";
const DEFAULT_TILE_WIDTH = 96;
const DEFAULT_TILE_HEIGHT = 48;
const DEFAULT_WALL_HEIGHT = 84;
const DEFAULT_CANONICAL_ORIGIN = [200, 100] as const;
const DEFAULT_CANONICAL_VIEWBOX: HqSceneViewBox = {
  minX: 20,
  minY: 0,
  width: 420,
  height: 310,
};
const DEFAULT_ROOM_FOOTPRINT = { cols: 4, rows: 3 } as const;

function parsePositiveNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : fallback;
}

function parseCoordinateNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function parseCanonicalViewBox(value: string | undefined): HqSceneViewBox {
  if (!value) {
    return DEFAULT_CANONICAL_VIEWBOX;
  }

  const [minX, minY, width, height] = value
    .trim()
    .split(/\s+/)
    .map((token) => Number.parseFloat(token));

  if (![minX, minY, width, height].every((token) => Number.isFinite(token))) {
    return DEFAULT_CANONICAL_VIEWBOX;
  }

  return {
    minX,
    minY,
    width,
    height,
  };
}

function getDefaultRoots(building: string): HqEnvironmentAssetRoots {
  return {
    partsRoot: `/data/svg-environments/hq/${building}/parts`,
    referenceRoot: `/data/svg-environments/hq/${building}/reference`,
    recipesRoot: `/data/svg-environments/hq/${building}/recipes`,
  };
}

interface RawBuildingsIndex {
  buildings?: Record<string, RawHqEnvironmentManifest>;
}

function getLoadedBuildingsIndex(): RawBuildingsIndex {
  return hqEnvironmentIndexData as unknown as RawBuildingsIndex;
}

export function getLoadedHqEnvironmentManifest(): RawHqEnvironmentManifest {
  const index = getLoadedBuildingsIndex();
  return (
    index.buildings?.["building/bodega"] ??
    (hqEnvironmentIndexData as unknown as RawHqEnvironmentManifest)
  );
}

function getManifestForBuilding(buildingId: string): RawHqEnvironmentManifest | undefined {
  const index = getLoadedBuildingsIndex();
  return index.buildings?.[buildingId];
}

export function getHqEnvironmentRenderConfig(): HqEnvironmentRenderConfig {
  const manifest = getLoadedHqEnvironmentManifest();
  const building = manifest.building?.trim() || DEFAULT_BUILDING;
  const defaultRoots = getDefaultRoots(building);
  const sceneSystem = manifest.composition?.sceneSystem;
  const canonicalOrigin = sceneSystem?.canonicalOrigin;

  return {
    building,
    paths: {
      partsRoot: manifest.paths?.partsRoot?.trim() || defaultRoots.partsRoot,
      referenceRoot: manifest.paths?.referenceRoot?.trim() || defaultRoots.referenceRoot,
      recipesRoot: manifest.paths?.recipesRoot?.trim() || defaultRoots.recipesRoot,
    },
    composition: {
      tileWidth: parsePositiveNumber(manifest.composition?.tileWidth, DEFAULT_TILE_WIDTH),
      tileHeight: parsePositiveNumber(manifest.composition?.tileHeight, DEFAULT_TILE_HEIGHT),
      wallHeight: parsePositiveNumber(manifest.composition?.wallHeight, DEFAULT_WALL_HEIGHT),
      sceneSystem: {
        canonicalOrigin: [
          parseCoordinateNumber(canonicalOrigin?.[0], DEFAULT_CANONICAL_ORIGIN[0]),
          parseCoordinateNumber(canonicalOrigin?.[1], DEFAULT_CANONICAL_ORIGIN[1]),
        ] as const,
        canonicalViewBox: parseCanonicalViewBox(sceneSystem?.canonicalViewBox),
        roomFootprint: {
          cols: parsePositiveNumber(sceneSystem?.roomFootprint?.cols, DEFAULT_ROOM_FOOTPRINT.cols),
          rows: parsePositiveNumber(sceneSystem?.roomFootprint?.rows, DEFAULT_ROOM_FOOTPRINT.rows),
        },
      },
    },
  };
}

// ── Backdrop profile types ──────────────────────────────────────────────

export type HqBackdropZone =
  | "belowShell"
  | "rear"
  | "leftFlank"
  | "rightFlank"
  | "fore"
  | "aboveShell"
  | "fxOverlay";

const ALL_BACKDROP_ZONES: readonly HqBackdropZone[] = [
  "belowShell",
  "rear",
  "leftFlank",
  "rightFlank",
  "fore",
  "aboveShell",
  "fxOverlay",
];

const ALL_PHASES: readonly HqTimeOfDayPhase[] = ["sunrise", "day", "sunset", "night"];

export interface HqBackdropPhaseProfile {
  ambientTint: string;
  fogColor: string;
  shadowIntensity: number;
  zones: Readonly<Record<HqBackdropZone, readonly string[]>>;
}

export interface HqBackdropManifest {
  profileId: string;
  elevationBandId: string | null;
  phases: Readonly<Record<HqTimeOfDayPhase, HqBackdropPhaseProfile>>;
}

const DEFAULT_PHASE_PROFILE: HqBackdropPhaseProfile = {
  ambientTint: "rgba(0, 0, 0, 0)",
  fogColor: "rgba(0, 0, 0, 0)",
  shadowIntensity: 0.15,
  zones: {
    belowShell: [],
    rear: [],
    leftFlank: [],
    rightFlank: [],
    fore: [],
    aboveShell: [],
    fxOverlay: [],
  },
};

function parseBackdropPhaseProfile(
  raw: RawBackdropPhaseProfile | undefined,
): HqBackdropPhaseProfile {
  if (!raw) return DEFAULT_PHASE_PROFILE;

  const zones = {} as Record<HqBackdropZone, readonly string[]>;
  for (const zone of ALL_BACKDROP_ZONES) {
    const rawZone = raw.zones?.[zone];
    zones[zone] = Array.isArray(rawZone)
      ? rawZone.filter((v): v is string => typeof v === "string")
      : [];
  }

  return {
    ambientTint:
      typeof raw.ambientTint === "string" ? raw.ambientTint : DEFAULT_PHASE_PROFILE.ambientTint,
    fogColor: typeof raw.fogColor === "string" ? raw.fogColor : DEFAULT_PHASE_PROFILE.fogColor,
    shadowIntensity:
      typeof raw.shadowIntensity === "number" && Number.isFinite(raw.shadowIntensity)
        ? raw.shadowIntensity
        : DEFAULT_PHASE_PROFILE.shadowIntensity,
    zones,
  };
}

let _cachedBackdropManifest: HqBackdropManifest | null | undefined;

export function getHqBackdropManifest(): HqBackdropManifest | null {
  if (_cachedBackdropManifest !== undefined) return _cachedBackdropManifest;
  _cachedBackdropManifest = parseBackdropManifestFromRaw(getLoadedHqEnvironmentManifest().backdrop);
  return _cachedBackdropManifest;
}

// ── Per-building backdrop resolution ──────────────────────────────────

const _backdropByBuilding = new Map<string, HqBackdropManifest | null>();

function parseBackdropManifestFromRaw(
  raw: RawBackdropManifest | undefined,
): HqBackdropManifest | null {
  if (!raw || typeof raw !== "object") return null;

  const profileId = typeof raw.profileId === "string" ? raw.profileId : "unknown";
  const elevationBandId = typeof raw.elevationBandId === "string" ? raw.elevationBandId : null;

  const rawPhases = raw.phases;
  if (!rawPhases || typeof rawPhases !== "object") return null;

  for (const phase of ALL_PHASES) {
    if (!(phase in rawPhases)) return null;
  }

  const phases = {} as Record<HqTimeOfDayPhase, HqBackdropPhaseProfile>;
  for (const phase of ALL_PHASES) {
    phases[phase] = parseBackdropPhaseProfile(rawPhases[phase]);
  }

  return { profileId, elevationBandId, phases };
}

/**
 * Return the backdrop manifest for a specific building.
 * Reads from the data-driven hq-environment-index.json buildings map.
 * Falls back to the bodega manifest for unknown buildings.
 */
export function getHqBackdropManifestForBuilding(buildingId: string): HqBackdropManifest | null {
  if (_backdropByBuilding.has(buildingId)) return _backdropByBuilding.get(buildingId)!;

  const buildingManifest = getManifestForBuilding(buildingId);
  let result: HqBackdropManifest | null;
  if (buildingManifest?.backdrop) {
    result = parseBackdropManifestFromRaw(buildingManifest.backdrop);
  } else {
    result = getHqBackdropManifest();
  }

  _backdropByBuilding.set(buildingId, result);
  return result;
}

/**
 * Return the render config for a specific building.
 * Reads from the data-driven hq-environment-index.json buildings map.
 * Falls back to the bodega config for unknown buildings.
 */
export function getHqEnvironmentRenderConfigForBuilding(
  buildingId: string,
): HqEnvironmentRenderConfig {
  const buildingManifest = getManifestForBuilding(buildingId);
  if (buildingManifest) {
    const buildingSlug = buildingId.replace("building/", "");
    const defaultRoots = getDefaultRoots(buildingSlug);
    const sceneSystem = buildingManifest.composition?.sceneSystem;
    const canonicalOrigin = sceneSystem?.canonicalOrigin;

    return {
      building: buildingSlug,
      paths: {
        partsRoot: buildingManifest.paths?.partsRoot?.trim() || defaultRoots.partsRoot,
        referenceRoot: buildingManifest.paths?.referenceRoot?.trim() || defaultRoots.referenceRoot,
        recipesRoot: buildingManifest.paths?.recipesRoot?.trim() || defaultRoots.recipesRoot,
      },
      composition: {
        tileWidth: parsePositiveNumber(buildingManifest.composition?.tileWidth, DEFAULT_TILE_WIDTH),
        tileHeight: parsePositiveNumber(
          buildingManifest.composition?.tileHeight,
          DEFAULT_TILE_HEIGHT,
        ),
        wallHeight: parsePositiveNumber(
          buildingManifest.composition?.wallHeight,
          DEFAULT_WALL_HEIGHT,
        ),
        sceneSystem: {
          canonicalOrigin: [
            parseCoordinateNumber(canonicalOrigin?.[0], DEFAULT_CANONICAL_ORIGIN[0]),
            parseCoordinateNumber(canonicalOrigin?.[1], DEFAULT_CANONICAL_ORIGIN[1]),
          ] as const,
          canonicalViewBox: parseCanonicalViewBox(sceneSystem?.canonicalViewBox),
          roomFootprint: {
            cols: parsePositiveNumber(
              sceneSystem?.roomFootprint?.cols,
              DEFAULT_ROOM_FOOTPRINT.cols,
            ),
            rows: parsePositiveNumber(
              sceneSystem?.roomFootprint?.rows,
              DEFAULT_ROOM_FOOTPRINT.rows,
            ),
          },
        },
      },
    };
  }
  return getHqEnvironmentRenderConfig();
}

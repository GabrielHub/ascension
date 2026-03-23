import hqEnvironmentIndexData from "content/data/hq-environment-index.json";

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

export function getLoadedHqEnvironmentManifest(): RawHqEnvironmentManifest {
  return hqEnvironmentIndexData as unknown as RawHqEnvironmentManifest;
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

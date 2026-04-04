/**
 * HQ environment parts metadata — typed asset index, tagged search, and validation.
 *
 * Design-owned. Consumes the shipped metadata index for the HQ environment art sets.
 * Does not invent gameplay logic.
 */

import {
  getHqEnvironmentRenderConfig,
  getHqEnvironmentRenderConfigForBuilding,
  getLoadedHqEnvironmentManifest,
  getLoadedHqEnvironmentManifestForBuilding,
  type HqEnvironmentAssetRoots,
} from "lib/hq-environment-manifest";

// ── Types matching the environment asset metadata shape ──────────────

export type EnvPartCategory =
  | "shell"
  | "structure"
  | "prop"
  | "scene"
  | "actor-marker"
  | "background";
export type EnvPartScale = "building" | "structure" | "prop" | "room" | "marker" | "backdrop";
export type EnvPartStatus = "exploration" | "approved";
export interface EnvPartMeta {
  id: string;
  category: EnvPartCategory;
  tags: readonly string[];
  scale: EnvPartScale;
  roomFamily: string | null;
  status: EnvPartStatus;
}

// ── Environment lighting presets for review ─────────────────────────

export interface EnvLightingPreset {
  id: string;
  label: string;
  /** CSS background for the preview container */
  background: string;
  /** CSS border color for the preview container */
  border: string;
  /** Optional CSS mix-blend overlay color (applied as a semi-transparent layer) */
  overlay: string | null;
}

export const ENV_LIGHTING_PRESETS: readonly EnvLightingPreset[] = [
  {
    id: "neutral",
    label: "Neutral Review",
    background: "rgba(6,6,8,0.5)",
    border: "rgba(200,168,76,0.04)",
    overlay: null,
  },
  {
    id: "daylight",
    label: "Daylight",
    background: "rgba(220,210,190,0.15)",
    border: "rgba(200,180,140,0.12)",
    overlay: "rgba(255,248,230,0.06)",
  },
  {
    id: "dusk",
    label: "Dusk",
    background: "rgba(30,18,40,0.6)",
    border: "rgba(120,80,160,0.1)",
    overlay: "rgba(80,40,100,0.05)",
  },
  {
    id: "night",
    label: "Night",
    background: "rgba(4,4,10,0.8)",
    border: "rgba(40,50,80,0.1)",
    overlay: "rgba(20,30,60,0.08)",
  },
  {
    id: "cool-fluorescent",
    label: "Cool Fluorescent",
    background: "rgba(18,22,28,0.5)",
    border: "rgba(120,140,170,0.08)",
    overlay: "rgba(160,180,210,0.04)",
  },
  {
    id: "warm-interior",
    label: "Warm Interior",
    background: "rgba(24,16,8,0.5)",
    border: "rgba(200,160,80,0.08)",
    overlay: "rgba(200,160,80,0.04)",
  },
] as const;

export function getEnvLightingPreset(id: string): EnvLightingPreset {
  return ENV_LIGHTING_PRESETS.find((p) => p.id === id) ?? ENV_LIGHTING_PRESETS[0];
}

export interface EnvPartsIndex {
  description: string;
  locked: string | null;
  style: string;
  building: string;
  paths: HqEnvironmentAssetRoots;
  parts: readonly EnvPartMeta[];
}

export interface EnvSceneReviewContract {
  building: string;
  tileWidth: number;
  tileHeight: number;
  wallHeight: number;
  canonicalOrigin: readonly [number, number];
  canonicalViewBox: Readonly<{
    minX: number;
    minY: number;
    width: number;
    height: number;
  }>;
  roomFootprint: Readonly<{
    cols: number;
    rows: number;
  }>;
}

export interface EnvSceneReviewStep {
  index: number;
  label: string;
  part: EnvPartMeta | null;
  isPlaceholder: boolean;
}

export interface EnvSceneReviewGroup {
  seriesKey: string;
  label: string;
  roomFamily: string | null;
  steps: readonly EnvSceneReviewStep[];
}

// ── Validation ──────────────────────────────────────────────────────

const VALID_CATEGORIES: ReadonlySet<string> = new Set<EnvPartCategory>([
  "shell",
  "structure",
  "prop",
  "scene",
  "actor-marker",
  "background",
]);
const VALID_SCALES: ReadonlySet<string> = new Set<EnvPartScale>([
  "building",
  "structure",
  "prop",
  "room",
  "marker",
  "backdrop",
]);
const VALID_STATUSES: ReadonlySet<string> = new Set<EnvPartStatus>(["exploration", "approved"]);
const SCENE_SERIES_TAG_BLACKLIST = new Set([
  "room",
  "interior",
  "props-only",
  "bodega",
  "operations",
  "social",
  "approved",
]);

export interface EnvValidationError {
  partId: string;
  message: string;
}

/** Validate an entire environment parts index. Returns an empty array if valid. */
export function validateEnvPartsIndex(index: EnvPartsIndex): EnvValidationError[] {
  const errors: EnvValidationError[] = [];
  const seenIds = new Set<string>();
  const assetRoots: ReadonlyArray<keyof HqEnvironmentAssetRoots> = [
    "partsRoot",
    "referenceRoot",
    "recipesRoot",
  ];

  assetRoots.forEach((key) => {
    if (!index.paths[key]?.trim()) {
      errors.push({
        partId: "(index)",
        message: `Missing ${key} asset root.`,
      });
    }
  });

  for (const part of index.parts) {
    if (seenIds.has(part.id)) {
      errors.push({ partId: part.id, message: "Duplicate part id" });
    }
    seenIds.add(part.id);

    if (!part.id) {
      errors.push({ partId: part.id ?? "(empty)", message: "Missing id" });
    }
    if (!VALID_CATEGORIES.has(part.category)) {
      errors.push({ partId: part.id, message: `Invalid category: ${part.category}` });
    }
    if (!VALID_SCALES.has(part.scale)) {
      errors.push({ partId: part.id, message: `Invalid scale: ${part.scale}` });
    }
    if (!VALID_STATUSES.has(part.status)) {
      errors.push({ partId: part.id, message: `Invalid status: ${part.status}` });
    }
    if (!Array.isArray(part.tags) || part.tags.length === 0) {
      errors.push({ partId: part.id, message: "tags must be a non-empty array" });
    }

    if (part.category === "scene") {
      if (part.scale !== "room") {
        errors.push({ partId: part.id, message: "scene assets must use room scale." });
      }

      if (part.status !== "approved") {
        errors.push({ partId: part.id, message: "scene assets must be approved." });
      }

      if (part.roomFamily === null || part.roomFamily.trim().length === 0) {
        errors.push({ partId: part.id, message: "scene assets must declare a room family." });
      }

      if (!part.tags.some((tag) => tag === "room")) {
        errors.push({ partId: part.id, message: 'scene assets must carry the "room" tag.' });
      }

      if (!part.tags.some((tag) => tag === "props-only")) {
        errors.push({
          partId: part.id,
          message: 'scene assets must carry the "props-only" tag.',
        });
      }

      if (!envPartSvgPath(part, index).includes("/recipes/")) {
        errors.push({ partId: part.id, message: "scene assets must resolve from recipes/." });
      }
    }
  }

  return errors;
}

// ── Tagged search ───────────────────────────────────────────────────

export interface EnvPartSearchQuery {
  category?: EnvPartCategory;
  scale?: EnvPartScale;
  roomFamily?: string;
  tags?: readonly string[];
  status?: EnvPartStatus;
}

/** Search environment parts by category, scale, room family, tags, and status. */
export function searchEnvParts(
  parts: readonly EnvPartMeta[],
  query: EnvPartSearchQuery,
): EnvPartMeta[] {
  return parts.filter((part) => {
    if (query.category && part.category !== query.category) return false;
    if (query.scale && part.scale !== query.scale) return false;
    if (query.status && part.status !== query.status) return false;

    if (query.roomFamily !== undefined) {
      if (query.roomFamily === "" && part.roomFamily !== null) return false;
      if (query.roomFamily !== "" && part.roomFamily !== query.roomFamily) return false;
    }

    if (query.tags && query.tags.length > 0) {
      const queryTagSet = new Set(query.tags.map((t) => t.toLowerCase()));
      if (!part.tags.some((t) => queryTagSet.has(t.toLowerCase()))) return false;
    }

    return true;
  });
}

/** Look up a single environment part by id. */
export function findEnvPartById(
  parts: readonly EnvPartMeta[],
  id: string,
): EnvPartMeta | undefined {
  return parts.find((p) => p.id === id);
}

export function formatSceneSeriesLabel(seriesKey: string): string {
  return seriesKey
    .replace(/^[^a-zA-Z0-9]+/, "")
    .replace(/[_-]/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getSceneSeriesKey(part: EnvPartMeta): string {
  const slug = part.id.split("/").pop() ?? part.id;
  const sceneSlug = slug.replace(/^scene-(the-)?/, "");
  if (sceneSlug && sceneSlug !== slug) {
    // Strip trailing state number suffix (e.g. "-2", "-3") so progressive
    // room states group into the same review series.
    return sceneSlug.replace(/-\d+$/, "");
  }

  const tagKey = part.tags.find((tag) => !SCENE_SERIES_TAG_BLACKLIST.has(tag));
  if (tagKey) {
    return tagKey;
  }

  if (part.roomFamily && part.roomFamily.trim().length > 0) {
    return part.roomFamily;
  }

  return part.id.split("/").pop() ?? part.id;
}

export function getSceneReviewContract(buildingId = "building/bodega"): EnvSceneReviewContract {
  const renderConfig =
    getHqEnvironmentRenderConfigForBuilding(buildingId) ?? getHqEnvironmentRenderConfig();

  return {
    building: renderConfig.building,
    tileWidth: renderConfig.composition.tileWidth,
    tileHeight: renderConfig.composition.tileHeight,
    wallHeight: renderConfig.composition.wallHeight,
    canonicalOrigin: renderConfig.composition.sceneSystem.canonicalOrigin,
    canonicalViewBox: renderConfig.composition.sceneSystem.canonicalViewBox,
    roomFootprint: renderConfig.composition.sceneSystem.roomFootprint,
  };
}

export function buildSceneReviewGroups(
  parts: readonly EnvPartMeta[],
): readonly EnvSceneReviewGroup[] {
  const sceneParts = parts
    .filter((part) => part.category === "scene")
    .filter((part) => part.status === "approved")
    .slice()
    .sort((left, right) => {
      const leftKey = getSceneSeriesKey(left);
      const rightKey = getSceneSeriesKey(right);
      return leftKey.localeCompare(rightKey) || left.id.localeCompare(right.id);
    });

  const groups = new Map<string, EnvPartMeta[]>();
  sceneParts.forEach((part) => {
    const key = getSceneSeriesKey(part);
    const entries = groups.get(key) ?? [];
    entries.push(part);
    groups.set(key, entries);
  });

  return [...groups.entries()]
    .map(([seriesKey, sceneGroup]) => {
      const sortedGroup = sceneGroup.slice().sort((left, right) => left.id.localeCompare(right.id));
      const stepCount = Math.max(3, sortedGroup.length);
      return {
        seriesKey,
        label: formatSceneSeriesLabel(seriesKey),
        roomFamily: sortedGroup[0]?.roomFamily ?? null,
        steps: Array.from({ length: stepCount }, (_, index) => {
          const part = sortedGroup[index] ?? null;
          return {
            index: index + 1,
            label: `State ${index + 1}`,
            part,
            isPlaceholder: part === null,
          } satisfies EnvSceneReviewStep;
        }),
      } satisfies EnvSceneReviewGroup;
    })
    .sort((left, right) => left.label.localeCompare(right.label));
}

/** Resolve the public asset path for an environment part SVG.
 *  Exploration assets live in reference/. Approved scene assets live in recipes/.
 *  Other approved assets live in parts/. */
export function envPartSvgPath(
  part: EnvPartMeta,
  index: EnvPartsIndex = getLoadedEnvPartsIndex(),
): string {
  const filename = part.id.split("/").pop() ?? part.id;
  if (part.status === "approved") {
    if (part.category === "scene") {
      return `${index.paths.recipesRoot}/${filename}.svg`;
    }

    return `${index.paths.partsRoot}/${part.id}.svg`;
  }

  return `${index.paths.referenceRoot}/${filename}.svg`;
}

// ── Loaded index access ─────────────────────────────────────────────

/** Returns the shipped HQ environment parts index, parsed and typed. */
export function getLoadedEnvPartsIndex(buildingId = "building/bodega"): EnvPartsIndex {
  const fallbackIndex = getLoadedHqEnvironmentManifest() as unknown as EnvPartsIndex;
  const manifest = getLoadedHqEnvironmentManifestForBuilding(buildingId) as
    | (Partial<EnvPartsIndex> & Pick<EnvPartsIndex, "paths">)
    | undefined;
  const renderConfig =
    getHqEnvironmentRenderConfigForBuilding(buildingId) ?? getHqEnvironmentRenderConfig();

  if (!manifest) {
    return fallbackIndex;
  }

  return {
    description: manifest.description ?? fallbackIndex.description,
    locked: manifest.locked ?? null,
    style: manifest.style ?? fallbackIndex.style,
    building: manifest.building ?? renderConfig.building,
    paths: manifest.paths,
    parts: manifest.parts ?? [],
  };
}

/** Returns the parts array from the shipped environment index. */
export function getLoadedEnvParts(buildingId = "building/bodega"): readonly EnvPartMeta[] {
  return getLoadedEnvPartsIndex(buildingId).parts;
}

/** Returns the default preset id. */
export function defaultPresetId(): string {
  return ENV_LIGHTING_PRESETS[0].id;
}

/** Resolve the retained building shell asset URL. */
export function resolveShellAssetUrl(buildingId = "building/bodega"): string {
  const parts = getLoadedEnvParts(buildingId);
  const renderConfig =
    getHqEnvironmentRenderConfigForBuilding(buildingId) ?? getHqEnvironmentRenderConfig();
  const shell = parts.find((part) => part.category === "shell");
  if (shell) {
    return envPartSvgPath(shell, getLoadedEnvPartsIndex(buildingId));
  }

  const buildingShellUrl = `${renderConfig.paths.partsRoot}/shell/iso-${renderConfig.building}-shell.svg`;
  return renderConfig.building === "bodega"
    ? buildingShellUrl
    : `${renderConfig.paths.partsRoot}/shell/iso-bodega-shell.svg`;
}

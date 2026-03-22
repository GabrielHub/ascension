/**
 * HQ environment parts metadata — typed asset index, tagged search, and validation.
 *
 * Design-owned. Consumes the shipped metadata index for the bodega HQ art set.
 * Does not invent gameplay logic.
 */

import envIndexData from "../../content/data/hq-environment-index.json";

// ── Types matching the environment asset metadata shape ──────────────

export type EnvPartCategory = "shell" | "structure" | "prop" | "actor-marker" | "background";
export type EnvPartScale = "building" | "structure" | "prop" | "marker" | "backdrop";
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
  parts: readonly EnvPartMeta[];
}

// ── Validation ──────────────────────────────────────────────────────

const VALID_CATEGORIES: ReadonlySet<string> = new Set<EnvPartCategory>([
  "shell",
  "structure",
  "prop",
  "actor-marker",
  "background",
]);
const VALID_SCALES: ReadonlySet<string> = new Set<EnvPartScale>([
  "building",
  "structure",
  "prop",
  "marker",
  "backdrop",
]);
const VALID_STATUSES: ReadonlySet<string> = new Set<EnvPartStatus>(["exploration", "approved"]);

export interface EnvValidationError {
  partId: string;
  message: string;
}

/** Validate an entire environment parts index. Returns an empty array if valid. */
export function validateEnvPartsIndex(index: EnvPartsIndex): EnvValidationError[] {
  const errors: EnvValidationError[] = [];
  const seenIds = new Set<string>();

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

/** Resolve the public asset path for an environment part SVG.
 *  All exploration assets live in reference/; approved assets are in parts/. */
export function envPartSvgPath(part: EnvPartMeta): string {
  const filename = part.id.split("/").pop() ?? part.id;
  if (part.status === "approved") {
    return `/data/svg-environments/hq/bodega/parts/${part.id}.svg`;
  }
  return `/data/svg-environments/hq/bodega/reference/${filename}.svg`;
}

// ── Loaded index access ─────────────────────────────────────────────

/** Returns the shipped HQ environment parts index, parsed and typed. */
export function getLoadedEnvPartsIndex(): EnvPartsIndex {
  return envIndexData as unknown as EnvPartsIndex;
}

/** Returns the parts array from the shipped environment index. */
export function getLoadedEnvParts(): readonly EnvPartMeta[] {
  return getLoadedEnvPartsIndex().parts;
}

/** Returns the default preset id. */
export function defaultPresetId(): string {
  return ENV_LIGHTING_PRESETS[0].id;
}

/** Resolve the retained building shell asset URL. */
export function resolveShellAssetUrl(): string {
  const parts = getLoadedEnvParts();
  const shell = findEnvPartById(parts, "shell/iso-bodega-shell");
  return shell
    ? envPartSvgPath(shell)
    : "/data/svg-environments/hq/bodega/parts/shell/iso-bodega-shell.svg";
}

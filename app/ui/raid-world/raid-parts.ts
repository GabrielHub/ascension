/**
 * Raid environment parts — types, tagged search, and validation.
 *
 * Design-owned. Consumes the metadata index at
 * public/data/svg-environments/raids/manifest.json.
 * Does not invent gameplay logic.
 */

import raidManifestData from "../../../content/data/raid-environment-index.json";
import { resolveRaidPartAssetUrl } from "lib/svg-asset-contract";

// ── Types matching the raid asset metadata shape ─────────────────────

export type RaidPartCategory = "tile" | "feature" | "fog-treatment" | "marker" | "enemy";
export type RaidPartScale = "tile" | "feature" | "marker" | "detail";
export type RaidPartStatus = "exploration" | "approved";

export interface RaidPartMeta {
  id: string;
  category: RaidPartCategory;
  tags: readonly string[];
  scale: RaidPartScale;
  concept: string | null;
  status: RaidPartStatus;
}

export interface RaidPartsIndex {
  description: string;
  locked: string | null;
  style: string;
  concept: string;
  parts: readonly RaidPartMeta[];
}

// ── Validation ──────────────────────────────────────────────────────

const VALID_CATEGORIES: ReadonlySet<string> = new Set<RaidPartCategory>([
  "tile",
  "feature",
  "fog-treatment",
  "marker",
  "enemy",
]);
const VALID_SCALES: ReadonlySet<string> = new Set<RaidPartScale>([
  "tile",
  "feature",
  "marker",
  "detail",
]);
const VALID_STATUSES: ReadonlySet<string> = new Set<RaidPartStatus>(["exploration", "approved"]);

export interface RaidValidationError {
  partId: string;
  message: string;
}

const CATEGORY_PREFIX: Record<RaidPartCategory, string> = {
  tile: "tile",
  feature: "feature",
  "fog-treatment": "fog",
  marker: "marker",
  enemy: "enemy",
};

/** Validate an entire raid parts index. Returns an empty array if valid. */
export function validateRaidPartsIndex(index: RaidPartsIndex): RaidValidationError[] {
  const errors: RaidValidationError[] = [];
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
    const expectedPrefix = CATEGORY_PREFIX[part.category];
    if (expectedPrefix && !part.id.startsWith(`${expectedPrefix}/`)) {
      errors.push({
        partId: part.id,
        message: `Part id must start with ${expectedPrefix}/ for category ${part.category}`,
      });
    }
  }

  return errors;
}

// ── Tagged search ───────────────────────────────────────────────────

export interface RaidPartSearchQuery {
  category?: RaidPartCategory;
  scale?: RaidPartScale;
  concept?: string;
  tags?: readonly string[];
  status?: RaidPartStatus;
}

/** Search raid parts by category, scale, concept, tags, and status. */
export function searchRaidParts(
  parts: readonly RaidPartMeta[],
  query: RaidPartSearchQuery,
): RaidPartMeta[] {
  return parts.filter((part) => {
    if (query.category && part.category !== query.category) return false;
    if (query.scale && part.scale !== query.scale) return false;
    if (query.status && part.status !== query.status) return false;

    if (query.concept !== undefined) {
      if (query.concept === "" && part.concept !== null) return false;
      if (query.concept !== "" && part.concept !== query.concept) return false;
    }

    if (query.tags && query.tags.length > 0) {
      const queryTagSet = new Set(query.tags.map((t) => t.toLowerCase()));
      if (!part.tags.some((t) => queryTagSet.has(t.toLowerCase()))) return false;
    }

    return true;
  });
}

/** Look up a single raid part by id. */
export function findRaidPartById(
  parts: readonly RaidPartMeta[],
  id: string,
): RaidPartMeta | undefined {
  return parts.find((p) => p.id === id);
}

/** Resolve the public asset path for a raid part SVG.
 *  Exploration assets live in reference/; approved assets are in parts/. */
export function raidPartSvgPath(part: RaidPartMeta): string {
  const assetUrl = resolveRaidPartAssetUrl(part.id);
  if (!assetUrl) {
    throw new Error(`Missing contracted raid SVG asset for ${part.id}`);
  }
  return assetUrl;
}

// ── Loaded index access ─────────────────────────────────────────────

/** Returns the shipped raid environment parts index, parsed and typed. */
export function getLoadedRaidPartsIndex(): RaidPartsIndex {
  return raidManifestData as unknown as RaidPartsIndex;
}

/** Returns the parts array from the shipped raid environment index. */
export function getLoadedRaidParts(): readonly RaidPartMeta[] {
  return getLoadedRaidPartsIndex().parts;
}

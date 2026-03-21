/**
 * Operator modular parts — types, tagged search, and validation.
 *
 * Design-owned. Consumes the metadata index at
 * public/data/svg-parts/operators/parts/index.json.
 * Does not invent gameplay logic or substitute equipment state.
 */

// Imported via content mirror; the canonical copy in public/ is served at runtime by URL.
import partsIndexData from "../../content/data/operator-parts-index.json";

// ── Types matching the locked metadata shape ─────────────────────────────

export type PartCategory = "weapon" | "outfit-overlay" | "accessory";
export type PartRarity = "common" | "uncommon" | "rare";
export type BodyBuild = "broad" | "medium" | "lean";

export interface OperatorPartMeta {
  id: string;
  category: PartCategory;
  tags: readonly string[];
  paletteTags: readonly string[];
  roleTags: readonly string[];
  bodyCompatibility: readonly BodyBuild[];
  poseCompatibility: readonly string[];
  rarity: PartRarity;
}

export interface OperatorPartsIndex {
  description: string;
  locked: string;
  style: string;
  viewBox: string;
  parts: readonly OperatorPartMeta[];
}

// ── Visible gear contract (matches appearance-contract-lock) ─────────────

export interface VisibleGear {
  weaponPartId?: string;
  outfitOverlayPartId?: string;
  accessoryPartId?: string;
}

// ── Validation ───────────────────────────────────────────────────────────

const VALID_CATEGORIES: ReadonlySet<string> = new Set<PartCategory>([
  "weapon",
  "outfit-overlay",
  "accessory",
]);
const VALID_RARITIES: ReadonlySet<string> = new Set<PartRarity>(["common", "uncommon", "rare"]);
const VALID_BUILDS: ReadonlySet<string> = new Set<BodyBuild>(["broad", "medium", "lean"]);

export interface PartValidationError {
  partId: string;
  message: string;
}

/** Validate an entire parts index. Returns an empty array if valid. */
export function validatePartsIndex(index: OperatorPartsIndex): PartValidationError[] {
  const errors: PartValidationError[] = [];
  const seenIds = new Set<string>();

  for (const part of index.parts) {
    // Duplicate id
    if (seenIds.has(part.id)) {
      errors.push({ partId: part.id, message: "Duplicate part id" });
    }
    seenIds.add(part.id);

    // Required fields present
    if (!part.id) {
      errors.push({ partId: part.id ?? "(empty)", message: "Missing id" });
    }
    if (!VALID_CATEGORIES.has(part.category)) {
      errors.push({ partId: part.id, message: `Invalid category: ${part.category}` });
    }
    if (!VALID_RARITIES.has(part.rarity)) {
      errors.push({ partId: part.id, message: `Invalid rarity: ${part.rarity}` });
    }

    // Tag arrays must be non-empty arrays
    if (!Array.isArray(part.tags) || part.tags.length === 0) {
      errors.push({ partId: part.id, message: "tags must be a non-empty array" });
    }
    if (!Array.isArray(part.paletteTags) || part.paletteTags.length === 0) {
      errors.push({ partId: part.id, message: "paletteTags must be a non-empty array" });
    }
    if (!Array.isArray(part.roleTags) || part.roleTags.length === 0) {
      errors.push({ partId: part.id, message: "roleTags must be a non-empty array" });
    }
    if (!Array.isArray(part.bodyCompatibility) || part.bodyCompatibility.length === 0) {
      errors.push({ partId: part.id, message: "bodyCompatibility must be a non-empty array" });
    }
    if (!Array.isArray(part.poseCompatibility) || part.poseCompatibility.length === 0) {
      errors.push({ partId: part.id, message: "poseCompatibility must be a non-empty array" });
    }

    // Body compatibility values must be valid builds
    for (const build of part.bodyCompatibility) {
      if (!VALID_BUILDS.has(build)) {
        errors.push({ partId: part.id, message: `Invalid body compatibility value: ${build}` });
      }
    }
  }

  return errors;
}

// ── Tagged search ────────────────────────────────────────────────────────

export interface PartSearchQuery {
  category?: PartCategory;
  roleTag?: string;
  bodyBuild?: BodyBuild;
  tags?: readonly string[];
  rarity?: PartRarity;
}

/** Search parts by tags, category, role, build, and rarity. */
export function searchParts(
  parts: readonly OperatorPartMeta[],
  query: PartSearchQuery,
): OperatorPartMeta[] {
  return parts.filter((part) => {
    if (query.category && part.category !== query.category) return false;

    if (query.roleTag) {
      const normalized = query.roleTag.replace("role:", "").toLowerCase();
      if (!part.roleTags.some((t) => t.toLowerCase() === normalized)) return false;
    }

    if (query.bodyBuild && !part.bodyCompatibility.includes(query.bodyBuild)) return false;

    if (query.rarity && part.rarity !== query.rarity) return false;

    if (query.tags && query.tags.length > 0) {
      const queryTagSet = new Set(query.tags.map((t) => t.toLowerCase()));
      if (!part.tags.some((t) => queryTagSet.has(t.toLowerCase()))) return false;
    }

    return true;
  });
}

/** Look up a single part by id. Returns undefined for unknown ids. */
export function findPartById(
  parts: readonly OperatorPartMeta[],
  id: string,
): OperatorPartMeta | undefined {
  return parts.find((p) => p.id === id);
}

/** Resolve the public asset path for a part SVG. */
export function partSvgPath(partId: string): string {
  return `/data/svg-parts/operators/parts/${partId}.svg`;
}

// ── Composition helpers ──────────────────────────────────────────────────

/** Resolve which gear overlay part ids are valid given the parts index.
 *  Returns only ids that exist in the index; unknown ids are dropped silently
 *  per the contract rule (fail normalization, don't fabricate replacements). */
export function resolveVisibleGear(
  gear: VisibleGear | undefined,
  parts: readonly OperatorPartMeta[],
): VisibleGear {
  if (!gear) return {};

  const idSet = new Set(parts.map((p) => p.id));
  return {
    weaponPartId: gear.weaponPartId && idSet.has(gear.weaponPartId) ? gear.weaponPartId : undefined,
    outfitOverlayPartId:
      gear.outfitOverlayPartId && idSet.has(gear.outfitOverlayPartId)
        ? gear.outfitOverlayPartId
        : undefined,
    accessoryPartId:
      gear.accessoryPartId && idSet.has(gear.accessoryPartId) ? gear.accessoryPartId : undefined,
  };
}

// ── Loaded index access ──────────────────────────────────────────────────

/** Returns the shipped operator parts index, parsed and typed. */
export function getLoadedPartsIndex(): OperatorPartsIndex {
  return partsIndexData as unknown as OperatorPartsIndex;
}

/** Returns the parts array from the shipped index. */
export function getLoadedParts(): readonly OperatorPartMeta[] {
  return getLoadedPartsIndex().parts;
}

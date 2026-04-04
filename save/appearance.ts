import { stableStringHash } from "lib/stable-hash";

import type { OperatorAppearanceSnapshot } from "./types";
import operatorRecipesManifest from "../content/data/operator-recipes.json";
// Imported via content mirror; the canonical copy in public/ is served at runtime by URL.
import operatorAppearancePartsIndex from "../content/data/operator-parts-index.json";

interface OperatorRecipeEntry {
  id: string;
  name: string;
  headShape: string;
  hair: string;
  eyes: string;
  faceDetail: string;
  bodySilhouette: string;
  palette: string;
  skinTone: string;
}

interface OperatorRecipeManifest {
  recipes: OperatorRecipeEntry[];
}

export interface OperatorAppearancePartIndexEntry {
  id: string;
  category: string;
  tags: string[];
  paletteTags: string[];
  roleTags: string[];
  bodyCompatibility: string[];
  poseCompatibility: string[];
  rarity: string;
}

export interface OperatorAppearanceProfileSelection {
  presetId: string;
  visibleGear?: OperatorAppearanceSnapshot["visibleGear"];
}

const manifest = operatorRecipesManifest as OperatorRecipeManifest;
const recipeIds = manifest.recipes.map((recipe) => recipe.id);
const recipeEntries = manifest.recipes ?? [];
const fallbackRecipeId = recipeIds[0] ?? "kael-001";
const recipeIdSet = new Set(recipeIds);
const recipeEntryById = new Map(recipeEntries.map((recipe) => [recipe.id, recipe]));

export const OPERATOR_VISIBLE_GEAR_SLOT_IDS = [
  "weaponPartId",
  "outfitOverlayPartId",
  "accessoryPartId",
] as const;

export type OperatorVisibleGearSlotId = (typeof OPERATOR_VISIBLE_GEAR_SLOT_IDS)[number];

const OPERATOR_VISIBLE_GEAR_SLOT_CATEGORY: Record<OperatorVisibleGearSlotId, string> = {
  weaponPartId: "weapon",
  outfitOverlayPartId: "outfit-overlay",
  accessoryPartId: "accessory",
};

function fail(message: string): never {
  throw new Error(message);
}

function expectRecord(value: unknown, path: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    fail(`${path} must be an object.`);
  }

  return value as Record<string, unknown>;
}

function expectString(value: unknown, path: string): string {
  if (typeof value !== "string" || value.length === 0) {
    fail(`${path} must be a non-empty string.`);
  }

  return value;
}

function expectStringArray(value: unknown, path: string): string[] {
  if (!Array.isArray(value)) {
    fail(`${path} must be an array.`);
  }

  return value.map((entry, index) => expectString(entry, `${path}[${index}]`));
}

function parseOperatorAppearancePartEntries(value: unknown, path: string): unknown[] {
  if (Array.isArray(value)) {
    return value;
  }

  const record = expectRecord(value, path);
  return Array.isArray(record.parts)
    ? record.parts
    : fail(`${path} must be an array or an object with a parts array.`);
}

export const OPERATOR_APPEARANCE_RECIPE_IDS = [...recipeIds] as readonly string[];

const BODY_SILHOUETTE_TO_BUILD: Record<string, string> = {
  "armored-structured": "broad",
  "elegant-light": "lean",
  "clean-simple": "medium",
  "lithe-agile": "lean",
  "balanced-tailored": "medium",
};

const ROLE_TAG_TO_VISUAL_ARCHETYPE: Record<string, string> = {
  "role:field_lead": "bruiser",
  "role:scout": "infiltrator",
  "role:medic": "strategist",
};

export function isOperatorAppearanceRecipeId(value: unknown): value is string {
  return typeof value === "string" && recipeIdSet.has(value);
}

export function getLoadedOperatorAppearanceRecipes(): readonly OperatorRecipeEntry[] {
  return recipeEntries;
}

export function getOperatorAppearanceRecipeEntry(
  recipeId: string,
): OperatorRecipeEntry | undefined {
  return recipeEntryById.get(recipeId);
}

export function selectOperatorAppearanceRecipeId(input: { stableKey?: string }): string {
  const stableKey = input.stableKey?.trim();
  if (!stableKey) {
    return fallbackRecipeId;
  }

  return recipeIds[stableStringHash(stableKey) % recipeIds.length] ?? fallbackRecipeId;
}

export function getOperatorVisibleGearPartCategory(slot: OperatorVisibleGearSlotId): string {
  return OPERATOR_VISIBLE_GEAR_SLOT_CATEGORY[slot];
}

export function getDefaultOperatorAppearancePartsIndex(): unknown | undefined {
  return operatorAppearancePartsIndex;
}

function normalizeRoleTag(roleTag: string): string {
  return roleTag.trim().toLowerCase();
}

function resolveRecipeBuild(recipeId: string): string {
  const bodySilhouette = recipeEntryById.get(recipeId)?.bodySilhouette;
  return BODY_SILHOUETTE_TO_BUILD[bodySilhouette ?? ""] ?? "medium";
}

function pickStableEntry<T>(entries: readonly T[], stableKey: string): T | undefined {
  if (entries.length === 0) {
    return undefined;
  }

  return entries[stableStringHash(stableKey) % entries.length];
}

function filterCompatibleGearParts(input: {
  category: string;
  roleTag: string;
  recipeId: string;
  maxRarity?: OperatorAppearancePartIndexEntry["rarity"];
}): OperatorAppearancePartIndexEntry[] {
  const visualArchetype =
    ROLE_TAG_TO_VISUAL_ARCHETYPE[normalizeRoleTag(input.roleTag)] ?? "strategist";
  const bodyBuild = resolveRecipeBuild(input.recipeId);
  const rarityOrder: Record<OperatorAppearancePartIndexEntry["rarity"], number> = {
    common: 0,
    uncommon: 1,
    rare: 2,
  };
  const maxRarityRank = input.maxRarity ? rarityOrder[input.maxRarity] : Infinity;

  return Array.from(parseOperatorAppearancePartIndex(operatorAppearancePartsIndex).values()).filter(
    (part) =>
      part.category === input.category &&
      part.roleTags.includes(visualArchetype) &&
      part.bodyCompatibility.includes(bodyBuild) &&
      rarityOrder[part.rarity] <= maxRarityRank,
  );
}

export function getCompatibleOperatorGearOptions(input: {
  category: string;
  roleTag: string;
  recipeId: string;
  maxRarity?: OperatorAppearancePartIndexEntry["rarity"];
}): readonly OperatorAppearancePartIndexEntry[] {
  return filterCompatibleGearParts(input);
}

export function selectOperatorAppearanceProfile(input: {
  stableKey?: string;
  roleTag: string;
  quality?: number;
  presetId?: string;
}): OperatorAppearanceProfileSelection {
  const presetId = isOperatorAppearanceRecipeId(input.presetId)
    ? input.presetId
    : selectOperatorAppearanceRecipeId({ stableKey: input.stableKey });
  const stableKey = input.stableKey?.trim() || presetId;
  const quality = input.quality ?? 50;
  const maxRarity: OperatorAppearancePartIndexEntry["rarity"] =
    quality >= 72 ? "uncommon" : "common";

  const includeOverlay = quality >= 62;
  const includeAccessory = quality >= 56;
  const includeWeapon = quality >= 68;

  const visibleGear: NonNullable<OperatorAppearanceSnapshot["visibleGear"]> = {};
  if (includeWeapon) {
    visibleGear.weaponPartId = pickStableEntry(
      filterCompatibleGearParts({
        category: "weapon",
        roleTag: input.roleTag,
        recipeId: presetId,
        maxRarity,
      }).map((part) => part.id),
      `${stableKey}:weapon`,
    );
  }
  if (includeOverlay) {
    visibleGear.outfitOverlayPartId = pickStableEntry(
      filterCompatibleGearParts({
        category: "outfit-overlay",
        roleTag: input.roleTag,
        recipeId: presetId,
        maxRarity,
      }).map((part) => part.id),
      `${stableKey}:outfit-overlay`,
    );
  }
  if (includeAccessory) {
    visibleGear.accessoryPartId = pickStableEntry(
      filterCompatibleGearParts({
        category: "accessory",
        roleTag: input.roleTag,
        recipeId: presetId,
        maxRarity,
      }).map((part) => part.id),
      `${stableKey}:accessory`,
    );
  }

  const hasVisibleGear =
    Boolean(visibleGear.weaponPartId) ||
    Boolean(visibleGear.outfitOverlayPartId) ||
    Boolean(visibleGear.accessoryPartId);

  return {
    presetId,
    ...(hasVisibleGear ? { visibleGear } : {}),
  };
}

export function parseOperatorAppearancePartIndex(
  value: unknown,
): Map<string, OperatorAppearancePartIndexEntry> {
  if (value === undefined) {
    return new Map();
  }

  const entries = parseOperatorAppearancePartEntries(value, "operator appearance parts index");
  const index = new Map<string, OperatorAppearancePartIndexEntry>();

  entries.forEach((entry, entryIndex) => {
    const path = `operator appearance parts index[${entryIndex}]`;
    const record = expectRecord(entry, path);
    const partId = expectString(record.id, `${path}.id`);

    if (index.has(partId)) {
      fail(`${path}.id duplicates operator appearance part "${partId}".`);
    }

    index.set(partId, {
      id: partId,
      category: expectString(record.category, `${path}.category`),
      tags: expectStringArray(record.tags, `${path}.tags`),
      paletteTags: expectStringArray(record.paletteTags, `${path}.paletteTags`),
      roleTags: expectStringArray(record.roleTags, `${path}.roleTags`),
      bodyCompatibility: expectStringArray(record.bodyCompatibility, `${path}.bodyCompatibility`),
      poseCompatibility: expectStringArray(record.poseCompatibility, `${path}.poseCompatibility`),
      rarity: expectString(record.rarity, `${path}.rarity`),
    });
  });

  return index;
}

export function normalizeOperatorAppearance(input: { presetId?: unknown; stableKey?: string }): {
  appearance: OperatorAppearanceSnapshot;
  changed: boolean;
} {
  if (isOperatorAppearanceRecipeId(input.presetId)) {
    return {
      appearance: {
        presetId: input.presetId,
      },
      changed: false,
    };
  }

  return {
    appearance: {
      presetId: selectOperatorAppearanceRecipeId({
        stableKey: input.stableKey,
      }),
    },
    changed: true,
  };
}

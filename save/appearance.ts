import { stableStringHash } from "lib/stable-hash";

import presetsManifest from "../content/data/operator-presets.json";
// Imported via content mirror; the canonical copy in public/ is served at runtime by URL.
import operatorAppearancePartsIndex from "../content/data/operator-parts-index.json";

interface OperatorPresetManifest {
  presets: Array<{
    id: string;
  }>;
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

const manifest = presetsManifest as OperatorPresetManifest;
const presetIds = manifest.presets.map((preset) => preset.id);
const fallbackPresetId = presetIds[0] ?? "male-swept";
const presetIdSet = new Set(presetIds);

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

export interface OperatorAppearanceSnapshot {
  presetId: string;
  visibleGear?: OperatorVisibleGearSnapshot;
}

export interface OperatorVisibleGearSnapshot {
  weaponPartId?: string;
  outfitOverlayPartId?: string;
  accessoryPartId?: string;
}

export const OPERATOR_APPEARANCE_PRESET_IDS = [...presetIds] as readonly string[];

export function isOperatorAppearancePresetId(value: unknown): value is string {
  return typeof value === "string" && presetIdSet.has(value);
}

export function selectOperatorAppearancePresetId(input: {
  stableKey?: string;
  legacySeed?: number;
}): string {
  if (input.legacySeed !== undefined && Number.isFinite(input.legacySeed)) {
    return presetIds[Math.abs(Math.trunc(input.legacySeed)) % presetIds.length] ?? fallbackPresetId;
  }

  const stableKey = input.stableKey?.trim();
  if (!stableKey) {
    return fallbackPresetId;
  }

  return presetIds[stableStringHash(stableKey) % presetIds.length] ?? fallbackPresetId;
}

export function getOperatorVisibleGearPartCategory(slot: OperatorVisibleGearSlotId): string {
  return OPERATOR_VISIBLE_GEAR_SLOT_CATEGORY[slot];
}

export function getDefaultOperatorAppearancePartsIndex(): unknown | undefined {
  return operatorAppearancePartsIndex;
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

export function normalizeOperatorAppearance(input: {
  presetId?: unknown;
  stableKey?: string;
  legacySeed?: unknown;
}): { appearance: OperatorAppearanceSnapshot; changed: boolean } {
  if (isOperatorAppearancePresetId(input.presetId)) {
    return {
      appearance: {
        presetId: input.presetId,
      },
      changed: false,
    };
  }

  return {
    appearance: {
      presetId: selectOperatorAppearancePresetId({
        stableKey: input.stableKey,
        legacySeed:
          typeof input.legacySeed === "number" && Number.isFinite(input.legacySeed)
            ? input.legacySeed
            : undefined,
      }),
    },
    changed: true,
  };
}

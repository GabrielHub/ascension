import { stableStringHash } from "lib/stable-hash";

import presetsManifest from "../content/data/operator-presets.json";

interface OperatorPresetManifest {
  presets: Array<{
    id: string;
  }>;
}

const manifest = presetsManifest as OperatorPresetManifest;
const presetIds = manifest.presets.map((preset) => preset.id);
const fallbackPresetId = presetIds[0] ?? "male-swept";
const presetIdSet = new Set(presetIds);

export interface OperatorAppearanceSnapshot {
  presetId: string;
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

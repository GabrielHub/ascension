import type { AiGenerationSurface } from "./types";

export interface IncidentFramingOperatorPayload {
  id: string;
  name: string;
  roleTag: string;
  specialtyTag: string;
  attunementTag: string;
  rank: string;
  traits: string[];
  morale: {
    current: number;
    baseline: number;
  };
  loyalty: {
    current: number;
    baseline: number;
  };
  needs: {
    stress: number;
    fatigue: number;
    hunger: number;
  };
  injury: {
    severity: number;
    recoveryHoursRemaining: number;
    treated: boolean;
  };
  preferences: {
    riskTolerance: number;
    rewardFocus: number;
    recoveryBias: number;
    socialBias: number;
    trainingBias: number;
    comfortBias: number;
    preferredMissionTags: string[];
    preferredPartnerIds: string[];
  };
}

export interface IncidentFramingRelationshipPayload {
  operatorAId: string;
  operatorBId: string;
  trust: number;
  friction: number;
  familiarity: number;
  recentSharedOutcome: number;
  historyTags: string[];
}

export interface IncidentFramingChoicePayload {
  choiceId: string;
  defaultLabel: string;
  defaultDescription: string;
  defaultConsequenceSummary: string;
  deterministicEffects: Array<{
    kind: string;
    targetRef: string;
    value: number;
  }>;
}

export interface IncidentFramingPayload {
  incidentId: string;
  templateId: string;
  templateName: string;
  category: string;
  tags: string[];
  triggerFamily: string;
  guildName: string;
  buildingId: string;
  buildingName: string;
  dayNumber: number;
  minuteOfDay: number;
  subjectSummary: string;
  operators: IncidentFramingOperatorPayload[];
  relationship?: IncidentFramingRelationshipPayload;
  room?: {
    id: string;
    name: string;
    templateId: string;
    functionTag: string;
    cultureSummary?: string;
    cultureSignals?: string[];
  };
  choices: IncidentFramingChoicePayload[];
}

export interface IncidentFramingChoiceOutput {
  choiceId: string;
  label: string;
  description: string;
  consequenceSummary: string;
  resolutionSummary: string;
}

export interface IncidentFramingOutput {
  title: string;
  briefing: string;
  choices: IncidentFramingChoiceOutput[];
}

export interface OperatorIdentityPreferencesPayload {
  riskTolerance: number;
  rewardFocus: number;
  recoveryBias: number;
  socialBias: number;
  trainingBias: number;
  comfortBias: number;
  preferredMissionTags: string[];
}

export interface OperatorIdentityAppearancePayload {
  presetId: string;
  visibleGear?: {
    weaponPartId?: string;
    outfitOverlayPartId?: string;
    accessoryPartId?: string;
  };
}

export interface OperatorIdentityRecipePayload {
  id: string;
  name: string;
  bodySilhouette: string;
  palette: string;
  skinTone: string;
}

export interface OperatorIdentityGearOptionPayload {
  id: string;
  tags: string[];
  rarity: string;
}

export interface OperatorIdentityPayload {
  candidateId: string;
  guildName: string;
  buildingName: string;
  dayNumber: number;
  name: string;
  roleTag: string;
  quality: number;
  expectedLoyalty: number;
  allowedSpecialtyTags: string[];
  allowedPreferredMissionTags: string[];
  allowedRecipes: OperatorIdentityRecipePayload[];
  allowedVisibleGearByRecipe: Array<{
    recipeId: string;
    weaponPartIds: string[];
    outfitOverlayPartIds: string[];
    accessoryPartIds: string[];
  }>;
  gearCatalog: {
    weapon: OperatorIdentityGearOptionPayload[];
    outfitOverlay: OperatorIdentityGearOptionPayload[];
    accessory: OperatorIdentityGearOptionPayload[];
  };
  fallbackIdentity: {
    specialtyTag: string;
    appearance: OperatorIdentityAppearancePayload;
    preferences: OperatorIdentityPreferencesPayload;
    personaSummary: string;
    personaHooks: string[];
  };
}

export interface OperatorIdentityOutput {
  specialtyTag: string;
  appearance: OperatorIdentityAppearancePayload;
  preferences: OperatorIdentityPreferencesPayload;
  personaSummary: string;
  personaHooks: string[];
}

function readNonEmptyString(record: Record<string, unknown>, key: string): string | null {
  const value = record[key];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function readStringArray(value: unknown): string[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const normalized = value
    .filter((entry): entry is string => typeof entry === "string")
    .map((entry) => entry.trim())
    .filter(Boolean);
  return normalized;
}

function validateIncidentChoiceOutput(
  record: Record<string, unknown>,
  expectedChoiceIds: ReadonlySet<string>,
): IncidentFramingChoiceOutput | string {
  const choiceId = readNonEmptyString(record, "choiceId");
  if (!choiceId) {
    return "Missing or empty choiceId";
  }
  if (!expectedChoiceIds.has(choiceId)) {
    return `Unexpected choiceId "${choiceId}"`;
  }

  const label = readNonEmptyString(record, "label");
  if (!label) {
    return `Missing or empty label for ${choiceId}`;
  }

  const description = readNonEmptyString(record, "description");
  if (!description) {
    return `Missing or empty description for ${choiceId}`;
  }

  const consequenceSummary = readNonEmptyString(record, "consequenceSummary");
  if (!consequenceSummary) {
    return `Missing or empty consequenceSummary for ${choiceId}`;
  }

  const resolutionSummary = readNonEmptyString(record, "resolutionSummary");
  if (!resolutionSummary) {
    return `Missing or empty resolutionSummary for ${choiceId}`;
  }

  return {
    choiceId,
    label,
    description,
    consequenceSummary,
    resolutionSummary,
  };
}

function readBoundedNumber(
  record: Record<string, unknown>,
  key: string,
  min: number,
  max: number,
): number | string {
  const value = record[key];
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return `Missing or invalid ${key}`;
  }

  if (value < min || value > max) {
    return `${key} must be between ${min} and ${max}`;
  }

  return Math.round(value);
}

function validateOperatorIdentityAppearance(
  appearanceValue: unknown,
  payload: OperatorIdentityPayload,
): OperatorIdentityAppearancePayload | string {
  if (!appearanceValue || typeof appearanceValue !== "object") {
    return "Missing appearance object";
  }

  const appearanceRecord = appearanceValue as Record<string, unknown>;
  const presetId = readNonEmptyString(appearanceRecord, "presetId");
  if (!presetId) {
    return "Missing or empty appearance.presetId";
  }

  const allowedRecipeIds = new Set(payload.allowedRecipes.map((recipe) => recipe.id));
  if (!allowedRecipeIds.has(presetId)) {
    return `appearance.presetId "${presetId}" is not approved`;
  }

  const allowedVisibleGear = payload.allowedVisibleGearByRecipe.find(
    (entry) => entry.recipeId === presetId,
  );
  const visibleGearValue = appearanceRecord.visibleGear;
  if (!visibleGearValue) {
    return { presetId };
  }
  if (typeof visibleGearValue !== "object") {
    return "appearance.visibleGear must be an object when present";
  }
  if (!allowedVisibleGear) {
    return `No approved visible gear catalog found for recipe "${presetId}"`;
  }

  const visibleGearRecord = visibleGearValue as Record<string, unknown>;
  const visibleGear: NonNullable<OperatorIdentityAppearancePayload["visibleGear"]> = {};
  const slotEntries = [
    ["weaponPartId", allowedVisibleGear.weaponPartIds],
    ["outfitOverlayPartId", allowedVisibleGear.outfitOverlayPartIds],
    ["accessoryPartId", allowedVisibleGear.accessoryPartIds],
  ] as const;

  for (const [slotKey, allowedIds] of slotEntries) {
    const value = visibleGearRecord[slotKey];
    if (value === undefined || value === null || value === "") {
      continue;
    }
    if (typeof value !== "string" || value.trim().length === 0) {
      return `appearance.visibleGear.${slotKey} must be a non-empty string when present`;
    }
    if (!allowedIds.includes(value)) {
      return `appearance.visibleGear.${slotKey} "${value}" is not approved for recipe "${presetId}"`;
    }
    visibleGear[slotKey] = value;
  }

  return Object.keys(visibleGear).length > 0 ? { presetId, visibleGear } : { presetId };
}

function validateOperatorIdentityPreferences(
  preferencesValue: unknown,
  payload: OperatorIdentityPayload,
): OperatorIdentityPreferencesPayload | string {
  if (!preferencesValue || typeof preferencesValue !== "object") {
    return "Missing preferences object";
  }

  const preferencesRecord = preferencesValue as Record<string, unknown>;
  const riskTolerance = readBoundedNumber(preferencesRecord, "riskTolerance", 0, 100);
  if (typeof riskTolerance === "string") {
    return riskTolerance;
  }
  const rewardFocus = readBoundedNumber(preferencesRecord, "rewardFocus", 0, 100);
  if (typeof rewardFocus === "string") {
    return rewardFocus;
  }
  const recoveryBias = readBoundedNumber(preferencesRecord, "recoveryBias", 0, 100);
  if (typeof recoveryBias === "string") {
    return recoveryBias;
  }
  const socialBias = readBoundedNumber(preferencesRecord, "socialBias", 0, 100);
  if (typeof socialBias === "string") {
    return socialBias;
  }
  const trainingBias = readBoundedNumber(preferencesRecord, "trainingBias", 0, 100);
  if (typeof trainingBias === "string") {
    return trainingBias;
  }
  const comfortBias = readBoundedNumber(preferencesRecord, "comfortBias", 0, 100);
  if (typeof comfortBias === "string") {
    return comfortBias;
  }

  const preferredMissionTagsRaw = readStringArray(preferencesRecord.preferredMissionTags);
  if (!preferredMissionTagsRaw || preferredMissionTagsRaw.length === 0) {
    return "preferences.preferredMissionTags must contain at least one approved mission tag";
  }

  const allowedMissionTags = new Set(payload.allowedPreferredMissionTags);
  const preferredMissionTags = [...new Set(preferredMissionTagsRaw)];
  if (preferredMissionTags.length > 3) {
    return "preferences.preferredMissionTags must contain at most 3 tags";
  }
  for (const tag of preferredMissionTags) {
    if (!allowedMissionTags.has(tag)) {
      return `preferences.preferredMissionTags includes unapproved tag "${tag}"`;
    }
  }

  return {
    riskTolerance,
    rewardFocus,
    recoveryBias,
    socialBias,
    trainingBias,
    comfortBias,
    preferredMissionTags,
  };
}

function validateOperatorIdentityOutput(
  record: Record<string, unknown>,
  payload: OperatorIdentityPayload,
): OperatorIdentityOutput | string {
  const specialtyTag = readNonEmptyString(record, "specialtyTag");
  if (!specialtyTag) {
    return "Missing or empty specialtyTag";
  }

  const allowedSpecialtyTags = new Set(payload.allowedSpecialtyTags);
  if (!allowedSpecialtyTags.has(specialtyTag)) {
    return `specialtyTag "${specialtyTag}" is not approved for ${payload.roleTag}`;
  }

  const appearance = validateOperatorIdentityAppearance(record.appearance, payload);
  if (typeof appearance === "string") {
    return appearance;
  }

  const preferences = validateOperatorIdentityPreferences(record.preferences, payload);
  if (typeof preferences === "string") {
    return preferences;
  }

  const personaSummary = readNonEmptyString(record, "personaSummary");
  if (!personaSummary) {
    return "Missing or empty personaSummary";
  }
  if (personaSummary.length > 220) {
    return "personaSummary must be 220 characters or fewer";
  }

  const personaHooksRaw = readStringArray(record.personaHooks);
  if (!personaHooksRaw || personaHooksRaw.length < 2) {
    return "personaHooks must contain at least 2 short hooks";
  }

  const personaHooks = [...new Set(personaHooksRaw)].slice(0, 4);
  if (personaHooks.some((hook) => hook.length > 120)) {
    return "personaHooks entries must be 120 characters or fewer";
  }

  return {
    specialtyTag,
    appearance,
    preferences,
    personaSummary,
    personaHooks,
  };
}

// ── Schema validation ───────────────────────────────────────────────

export function validateGenerationOutput(
  surface: AiGenerationSurface,
  raw: unknown,
  payload?: Record<string, unknown>,
): { ok: true; output: Record<string, unknown> } | { ok: false; error: string } {
  if (!raw || typeof raw !== "object") {
    return { ok: false, error: "Output is not an object" };
  }

  const record = raw as Record<string, unknown>;

  switch (surface) {
    case "incident-framing": {
      const title = readNonEmptyString(record, "title");
      if (!title) {
        return { ok: false, error: "Missing or empty title" };
      }

      const briefing = readNonEmptyString(record, "briefing");
      if (!briefing) {
        return { ok: false, error: "Missing or empty briefing" };
      }

      if (!Array.isArray(record.choices) || record.choices.length === 0) {
        return { ok: false, error: "Missing or empty choices array" };
      }

      const incidentPayload = payload as IncidentFramingPayload | undefined;
      const expectedChoices = incidentPayload?.choices ?? [];
      const expectedChoiceIds = new Set(expectedChoices.map((choice) => choice.choiceId));
      if (expectedChoiceIds.size === 0) {
        return { ok: false, error: "Incident payload did not provide expected choices" };
      }

      const choices: IncidentFramingChoiceOutput[] = [];
      for (const rawChoice of record.choices) {
        if (!rawChoice || typeof rawChoice !== "object") {
          return { ok: false, error: "Incident choice output is not an object" };
        }

        const validated = validateIncidentChoiceOutput(
          rawChoice as Record<string, unknown>,
          expectedChoiceIds,
        );
        if (typeof validated === "string") {
          return { ok: false, error: validated };
        }
        choices.push(validated);
      }

      const returnedChoiceIds = new Set(choices.map((choice) => choice.choiceId));
      if (returnedChoiceIds.size !== expectedChoiceIds.size) {
        return {
          ok: false,
          error: `Expected ${expectedChoiceIds.size} choices but received ${returnedChoiceIds.size}`,
        };
      }

      for (const choiceId of expectedChoiceIds) {
        if (!returnedChoiceIds.has(choiceId)) {
          return { ok: false, error: `Missing choice output for ${choiceId}` };
        }
      }

      return {
        ok: true,
        output: {
          title,
          briefing,
          choices: expectedChoices.map((expectedChoice) => {
            return choices.find((choice) => choice.choiceId === expectedChoice.choiceId)!;
          }),
        },
      };
    }
    case "operator-identity": {
      const operatorPayload = payload as OperatorIdentityPayload | undefined;
      if (!operatorPayload) {
        return { ok: false, error: "Operator identity payload is missing" };
      }

      const validated = validateOperatorIdentityOutput(record, operatorPayload);
      if (typeof validated === "string") {
        return { ok: false, error: validated };
      }

      return {
        ok: true,
        output: validated,
      };
    }
    default:
      return { ok: false, error: `Unknown surface: ${surface}` };
  }
}

import {
  getCompatibleOperatorGearOptions,
  getLoadedOperatorAppearanceRecipes,
} from "save/appearance";
import { getAllowedPreferredMissionTags, getSpecialtyOptionsForRole } from "sim/systems/commands";

import type { RuntimeSession } from "app/features/runtime/session";

type PayloadRuntimeSession = Pick<RuntimeSession, "phase1View" | "registry" | "simulation">;
type PreviewRuntimeSession = Pick<PayloadRuntimeSession, "phase1View">;
type PreviewVisitor = RuntimeSession["phase1View"]["visitors"][number];
type PendingIncident = NonNullable<
  RuntimeSession["simulation"]["runtimeState"]["incidentState"]["pendingIncident"]
>;

interface PreviewIncidentSource extends Pick<
  PendingIncident,
  "instanceId" | "templateId" | "templateName" | "category" | "tags" | "triggerFamily" | "choices"
> {
  boundContext: {
    operatorIds: string[];
    roomId?: string;
  };
}

function getOperatorIdentityMaxRarity(quality: number): "common" | "uncommon" | "rare" {
  if (quality >= 82) return "rare";
  if (quality >= 72) return "uncommon";
  return "common";
}

function getAllowedOperatorRecipes() {
  return getLoadedOperatorAppearanceRecipes().map((recipe) => ({
    id: recipe.id,
    name: recipe.name,
    bodySilhouette: recipe.bodySilhouette,
    palette: recipe.palette,
    skinTone: recipe.skinTone,
  }));
}

function buildGearByRecipe(visitor: PreviewVisitor, maxRarity: "common" | "uncommon" | "rare") {
  return getAllowedOperatorRecipes().map((recipe) => {
    const commonArgs = { roleTag: visitor.desiredRoleTag, recipeId: recipe.id, maxRarity };
    return {
      recipeId: recipe.id,
      weapon: getCompatibleOperatorGearOptions({ ...commonArgs, category: "weapon" }),
      outfitOverlay: getCompatibleOperatorGearOptions({
        ...commonArgs,
        category: "outfit-overlay",
      }),
      accessory: getCompatibleOperatorGearOptions({ ...commonArgs, category: "accessory" }),
    };
  });
}

function buildGearCatalog(
  gearByRecipe: ReturnType<typeof buildGearByRecipe>,
  key: "weapon" | "outfitOverlay" | "accessory",
) {
  return [
    ...new Map(
      gearByRecipe.flatMap((entry) =>
        entry[key].map(
          (part) => [part.id, { id: part.id, tags: [...part.tags], rarity: part.rarity }] as const,
        ),
      ),
    ).values(),
  ];
}

export function buildOperatorIdentityPayload(
  session: PreviewRuntimeSession,
  visitor: PreviewVisitor,
): Record<string, unknown> {
  const allowedRecipes = getAllowedOperatorRecipes();
  const maxRarity = getOperatorIdentityMaxRarity(visitor.quality ?? 50);
  const gearByRecipe = buildGearByRecipe(visitor, maxRarity);

  const allowedVisibleGearByRecipe = gearByRecipe.map((entry) => ({
    recipeId: entry.recipeId,
    weaponPartIds: entry.weapon.map((part) => part.id),
    outfitOverlayPartIds: entry.outfitOverlay.map((part) => part.id),
    accessoryPartIds: entry.accessory.map((part) => part.id),
  }));

  return {
    candidateId: visitor.id,
    guildName: session.phase1View.identity.guildName,
    buildingName: session.phase1View.building.activeBuildingName,
    dayNumber: session.phase1View.clock.day,
    name: visitor.name,
    roleTag: visitor.desiredRoleTag,
    quality: visitor.quality ?? 50,
    expectedLoyalty: visitor.expectedLoyalty ?? 50,
    allowedSpecialtyTags: [...getSpecialtyOptionsForRole(visitor.desiredRoleTag)],
    allowedPreferredMissionTags: [...getAllowedPreferredMissionTags()],
    allowedRecipes,
    allowedVisibleGearByRecipe,
    gearCatalog: {
      weapon: buildGearCatalog(gearByRecipe, "weapon"),
      outfitOverlay: buildGearCatalog(gearByRecipe, "outfitOverlay"),
      accessory: buildGearCatalog(gearByRecipe, "accessory"),
    },
    fallbackIdentity: {
      specialtyTag: visitor.specialtyTag ?? `focus:${visitor.desiredRoleTag.replace(/^role:/, "")}`,
      appearance: {
        presetId: visitor.appearance?.presetId ?? allowedRecipes[0]?.id ?? "kael-001",
        ...(visitor.appearance?.visibleGear
          ? { visibleGear: { ...visitor.appearance.visibleGear } }
          : {}),
      },
      preferences: {
        riskTolerance: visitor.preferences?.riskTolerance ?? 50,
        rewardFocus: visitor.preferences?.rewardFocus ?? 50,
        recoveryBias: visitor.preferences?.recoveryBias ?? 50,
        socialBias: visitor.preferences?.socialBias ?? 50,
        trainingBias: visitor.preferences?.trainingBias ?? 50,
        comfortBias: visitor.preferences?.comfortBias ?? 50,
        preferredMissionTags: [...(visitor.preferences?.preferredMissionTags ?? [])],
      },
      personaSummary:
        visitor.personaSummary ??
        `${visitor.name} reads like a plausible ${visitor.desiredRoleTag.replace(/^role:/, "").replaceAll("_", " ")} hire.`,
      personaHooks: [...(visitor.personaHooks ?? [])],
    },
  };
}

export function buildOperatorIdentityPreviewPayload(
  session: PreviewRuntimeSession,
  visitor: PreviewVisitor,
): Record<string, unknown> | null {
  if (getAllowedOperatorRecipes().length === 0) {
    return null;
  }

  return buildOperatorIdentityPayload(session, visitor);
}

export interface IncidentFramingPreviewOrigin {
  incidentId: string;
  templateId: string;
  originTag: string;
}

export function buildIncidentFramingPayload(
  session: PayloadRuntimeSession,
  source: PreviewIncidentSource,
): Record<string, unknown> {
  const pv = session.phase1View;
  const operatorsById = new Map(pv.operators.map((operator) => [operator.id, operator]));
  const boundOperators = source.boundContext.operatorIds
    .map((operatorId) => operatorsById.get(operatorId))
    .filter((operator): operator is RuntimeSession["phase1View"]["operators"][number] =>
      Boolean(operator),
    );
  const relationship =
    source.boundContext.operatorIds.length === 2
      ? pv.relationshipSignals.find((signal) => {
          const ids = [signal.operatorAId, signal.operatorBId];
          return source.boundContext.operatorIds.every((operatorId) => ids.includes(operatorId));
        })
      : undefined;
  const phase2View = session.simulation.getPhase2View();
  const room =
    source.boundContext.roomId !== undefined
      ? pv.rooms.find((entry) => entry.id === source.boundContext.roomId)
      : undefined;
  const roomTemplate = room ? session.registry.roomById.get(room.templateId) : undefined;
  const roomCulture =
    source.boundContext.roomId !== undefined
      ? phase2View.roomCultures.find((entry) => entry.roomId === source.boundContext.roomId)
      : undefined;

  return {
    incidentId: source.instanceId,
    templateId: source.templateId,
    templateName: source.templateName,
    category: source.category,
    tags: [...source.tags],
    triggerFamily: source.triggerFamily,
    guildName: pv.identity.guildName,
    buildingId: pv.building.activeBuildingId,
    buildingName: pv.building.activeBuildingName,
    dayNumber: pv.clock.day,
    minuteOfDay: pv.clock.minuteOfDay,
    subjectSummary: source.boundContext.operatorIds
      .map((operatorId) => operatorsById.get(operatorId)?.identity.name ?? operatorId)
      .concat(room ? [room.name] : [])
      .join(", "),
    operators: boundOperators.map((operator) => ({
      id: operator.id,
      name: operator.identity.name,
      roleTag: operator.identity.roleTag,
      specialtyTag: operator.identity.specialtyTag,
      attunementTag: operator.combat?.attunementTag ?? "",
      rank: operator.combat?.rank ?? "f",
      traits: [...(operator.combat?.traits ?? [])],
      morale: { ...operator.morale },
      loyalty: { ...operator.loyalty },
      needs: { ...operator.needs },
      injury: { ...operator.injury },
      preferences: {
        ...operator.preferences,
        preferredMissionTags: [...operator.preferences.preferredMissionTags],
        preferredPartnerIds: [...operator.preferences.preferredPartnerIds],
      },
    })),
    ...(relationship
      ? {
          relationship: {
            operatorAId: relationship.operatorAId,
            operatorBId: relationship.operatorBId,
            trust: relationship.trust,
            friction: relationship.friction,
            familiarity: relationship.familiarity,
            recentSharedOutcome: relationship.recentSharedOutcome,
            historyTags: [...relationship.historyTags],
          },
        }
      : {}),
    ...(room
      ? {
          room: {
            id: room.id,
            name: room.name,
            templateId: room.templateId,
            functionTag:
              roomTemplate?.tags.find((tag) => tag.startsWith("room:")) ??
              room.requiredStaffTag ??
              room.templateId,
            ...(roomCulture ? { cultureSummary: roomCulture.summary } : {}),
            ...(roomCulture && roomCulture.signals.length > 0
              ? { cultureSignals: [...roomCulture.signals] }
              : {}),
          },
        }
      : {}),
    choices: source.choices.map((choice) => ({
      choiceId: choice.choiceId,
      defaultLabel: choice.label,
      defaultDescription: choice.description,
      defaultConsequenceSummary: choice.consequenceSummary,
      deterministicEffects: choice.effects.map((effect) => ({
        kind: effect.kind,
        targetRef: effect.targetRef,
        value: effect.value,
      })),
    })),
  };
}

export function buildIncidentFramingPreviewPayload(
  session: PayloadRuntimeSession,
  origin: IncidentFramingPreviewOrigin,
): Record<string, unknown> {
  const [primaryOperator, secondaryOperator] = session.phase1View.operators;

  return buildIncidentFramingPayload(session, {
    instanceId: origin.incidentId,
    templateId: origin.templateId,
    templateName: "Personnel Friction Report",
    category: "personnel_conflict",
    tags: ["conflict", "morale", origin.originTag],
    triggerFamily: "operator_conflict",
    boundContext: {
      operatorIds: [primaryOperator?.id, secondaryOperator?.id].filter(
        (operatorId): operatorId is string => Boolean(operatorId),
      ),
    },
    choices: [
      {
        choiceId: "mediate",
        label: "Mediate Directly",
        description: "Sit both operators down and work through the friction point.",
        consequenceSummary: "Minor morale boost for both, slight loyalty increase.",
        effects: [
          { kind: "morale_delta", targetRef: "subject_a", value: 5 },
          { kind: "morale_delta", targetRef: "subject_b", value: 5 },
          { kind: "loyalty_delta", targetRef: "subject_a", value: 3 },
          { kind: "loyalty_delta", targetRef: "subject_b", value: 3 },
        ],
      },
      {
        choiceId: "ignore",
        label: "File and Move On",
        description: "Document the incident and let them sort it out.",
        consequenceSummary: "No immediate cost, but unresolved tension persists.",
        effects: [
          { kind: "morale_delta", targetRef: "subject_a", value: -2 },
          { kind: "morale_delta", targetRef: "subject_b", value: -2 },
        ],
      },
    ],
  });
}

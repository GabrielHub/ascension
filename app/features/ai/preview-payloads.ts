import {
  getCompatibleOperatorGearOptions,
  getLoadedOperatorAppearanceRecipes,
} from "save/appearance";
import { getAllowedPreferredMissionTags, getSpecialtyOptionsForRole } from "sim/systems/commands";

import type { RuntimeSession } from "app/features/runtime";

type PreviewRuntimeSession = Pick<RuntimeSession, "phase1View">;
type PreviewVisitor = RuntimeSession["phase1View"]["visitors"][number];

function getOperatorIdentityMaxRarity(quality: number): "common" | "uncommon" | "rare" {
  if (quality >= 82) return "rare";
  if (quality >= 72) return "uncommon";
  return "common";
}

export function buildOperatorIdentityPreviewPayload(
  session: PreviewRuntimeSession,
  visitor: PreviewVisitor,
): Record<string, unknown> | null {
  const allowedRecipes = getLoadedOperatorAppearanceRecipes().map((recipe) => ({
    id: recipe.id,
    name: recipe.name,
    bodySilhouette: recipe.bodySilhouette,
    palette: recipe.palette,
    skinTone: recipe.skinTone,
  }));
  if (allowedRecipes.length === 0) {
    return null;
  }

  const maxRarity = getOperatorIdentityMaxRarity(visitor.quality ?? 50);

  const gearByRecipe = allowedRecipes.map((recipe) => {
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

  const allowedVisibleGearByRecipe = gearByRecipe.map((entry) => ({
    recipeId: entry.recipeId,
    weaponPartIds: entry.weapon.map((part) => part.id),
    outfitOverlayPartIds: entry.outfitOverlay.map((part) => part.id),
    accessoryPartIds: entry.accessory.map((part) => part.id),
  }));

  const toCatalog = (key: "weapon" | "outfitOverlay" | "accessory") => [
    ...new Map(
      gearByRecipe.flatMap((entry) =>
        entry[key].map(
          (part) => [part.id, { id: part.id, tags: [...part.tags], rarity: part.rarity }] as const,
        ),
      ),
    ).values(),
  ];

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
      weapon: toCatalog("weapon"),
      outfitOverlay: toCatalog("outfitOverlay"),
      accessory: toCatalog("accessory"),
    },
    fallbackIdentity: {
      specialtyTag: visitor.specialtyTag ?? `focus:${visitor.desiredRoleTag.replace(/^role:/, "")}`,
      appearance: {
        presetId: visitor.appearance?.presetId ?? allowedRecipes[0].id,
      },
      preferences: {
        riskTolerance: 50,
        rewardFocus: 50,
        recoveryBias: 50,
        socialBias: 50,
        trainingBias: 50,
        comfortBias: 50,
        preferredMissionTags: ["mission:stability"],
      },
      personaSummary:
        visitor.personaSummary ??
        `${visitor.name} reads like a plausible ${visitor.desiredRoleTag.replace(/^role:/, "").replaceAll("_", " ")} hire.`,
      personaHooks: visitor.personaHooks?.length
        ? [...visitor.personaHooks]
        : ["Dry under pressure.", "Treats chaos like a management problem."],
    },
  };
}

export interface IncidentFramingPreviewOrigin {
  incidentId: string;
  templateId: string;
  originTag: string;
}

export function buildIncidentFramingPreviewPayload(
  session: PreviewRuntimeSession,
  origin: IncidentFramingPreviewOrigin,
): Record<string, unknown> {
  const pv = session.phase1View;
  const [primaryOperator, secondaryOperator] = pv.operators;
  const relationship =
    primaryOperator && secondaryOperator
      ? pv.relationshipSignals.find((signal) => {
          const ids = [signal.operatorAId, signal.operatorBId];
          return ids.includes(primaryOperator.id) && ids.includes(secondaryOperator.id);
        })
      : undefined;

  return {
    incidentId: origin.incidentId,
    templateId: origin.templateId,
    templateName: "Personnel Friction Report",
    category: "personnel_conflict",
    tags: ["conflict", "morale", origin.originTag],
    triggerFamily: "operator_conflict",
    guildName: pv.identity.guildName,
    buildingId: pv.building.activeBuildingId,
    buildingName: pv.building.activeBuildingName,
    dayNumber: pv.clock.day,
    minuteOfDay: pv.clock.minuteOfDay,
    subjectSummary:
      [primaryOperator?.identity.name, secondaryOperator?.identity.name]
        .filter(Boolean)
        .join(", ") || "Unknown subject",
    operators: [primaryOperator, secondaryOperator]
      .filter((operator): operator is NonNullable<typeof primaryOperator> => Boolean(operator))
      .map((operator) => ({
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
    choices: [
      {
        choiceId: "mediate",
        defaultLabel: "Mediate Directly",
        defaultDescription: "Sit both operators down and work through the friction point.",
        defaultConsequenceSummary: "Minor morale boost for both, slight loyalty increase.",
        deterministicEffects: [
          { kind: "morale_delta", targetRef: "subject_a", value: 5 },
          { kind: "morale_delta", targetRef: "subject_b", value: 5 },
          { kind: "loyalty_delta", targetRef: "subject_a", value: 3 },
          { kind: "loyalty_delta", targetRef: "subject_b", value: 3 },
        ],
      },
      {
        choiceId: "ignore",
        defaultLabel: "File and Move On",
        defaultDescription: "Document the incident and let them sort it out.",
        defaultConsequenceSummary: "No immediate cost, but unresolved tension persists.",
        deterministicEffects: [
          { kind: "morale_delta", targetRef: "subject_a", value: -2 },
          { kind: "morale_delta", targetRef: "subject_b", value: -2 },
        ],
      },
    ],
  };
}

import type { BuildType } from "./_svg-shared";
import { getRecipeById } from "./operator-parts";

const DEFAULT_OPERATOR_BUILD: BuildType = "medium";

const ROLE_TO_BUILD: Record<string, BuildType> = {
  field_lead: "broad",
  scout: "lean",
  medic: "medium",
  bruiser: "broad",
  infiltrator: "lean",
  strategist: "medium",
};

/** Map a body-silhouette recipe key to a BuildType. */
const BODY_SILHOUETTE_TO_BUILD: Record<string, BuildType> = {
  "armored-structured": "broad",
  "elegant-light": "lean",
  "clean-simple": "medium",
};

/**
 * Resolve an operator's build type, preferring the recipe's body-silhouette
 * when a valid presetId is given, and falling back to role-based mapping.
 */
export function resolveOperatorBuild(roleTag: string, presetId?: string): BuildType {
  // Phase 2: Check recipe body-silhouette first
  if (presetId) {
    const recipe = getRecipeById(presetId);
    if (recipe) {
      const recipeBodyBuild = BODY_SILHOUETTE_TO_BUILD[recipe.bodySilhouette];
      if (recipeBodyBuild) return recipeBodyBuild;
    }
  }

  // Fall back to role-based mapping
  const rawRole = roleTag.replace(/^(role|archetype):/, "").toLowerCase();
  return ROLE_TO_BUILD[rawRole] ?? DEFAULT_OPERATOR_BUILD;
}

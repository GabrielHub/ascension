import type { ActorTokenPalette } from "./types";

import operatorRecipesData from "content/data/operator-recipes.json";

export type BuildType = "broad" | "lean" | "medium";

export interface AppearanceRecipeData {
  id: string;
  bodySilhouette: string;
  palette: string;
  skinTone: string;
}

interface PortraitPalette {
  hair: string;
  clothing: string;
  accent: string;
}

interface SkinTone {
  skin: string;
}

const DEFAULT_OPERATOR_BUILD: BuildType = "medium";

const ROLE_TO_BUILD: Record<string, BuildType> = {
  field_lead: "broad",
  scout: "lean",
  medic: "medium",
  bruiser: "broad",
  infiltrator: "lean",
  strategist: "medium",
};

const BODY_SILHOUETTE_TO_BUILD: Record<string, BuildType> = {
  "armored-structured": "broad",
  "elegant-light": "lean",
  "clean-simple": "medium",
};

const SKIN_TONES: Record<string, SkinTone> = {
  "fair-warm": { skin: "#f0d4b8" },
  "fair-cool": { skin: "#e8d0c0" },
  "light-warm": { skin: "#e0c8a8" },
  "light-cool": { skin: "#d8c0a8" },
  "medium-warm": { skin: "#d4b896" },
  "medium-cool": { skin: "#c4a882" },
  "tan-warm": { skin: "#b89070" },
  "tan-cool": { skin: "#a88068" },
  "deep-warm": { skin: "#8a6848" },
  "deep-cool": { skin: "#6a5040" },
};

const PORTRAIT_PALETTES: Record<string, PortraitPalette> = {
  "warm-earth": { hair: "#2a1f18", clothing: "#3d2c20", accent: "#c8a84c" },
  "cool-dark": { hair: "#1a1a20", clothing: "#1a2440", accent: "#2a3555" },
  "balanced-warm": { hair: "#4a3628", clothing: "#2a3555", accent: "#c8a84c" },
  "crimson-edge": { hair: "#1a1014", clothing: "#4a1828", accent: "#c84848" },
  "steel-gray": { hair: "#2a2830", clothing: "#30303c", accent: "#8898a8" },
  "forest-teal": { hair: "#1a2820", clothing: "#1a3830", accent: "#48a888" },
  "navy-silver": { hair: "#181828", clothing: "#1a1a38", accent: "#a8b0c8" },
  "amber-warm": { hair: "#3a2818", clothing: "#4a3020", accent: "#d4a040" },
  "sakura-pink": { hair: "#e87098", clothing: "#2a2040", accent: "#e87098" },
  "ocean-blue": { hair: "#4888d8", clothing: "#141830", accent: "#4888d8" },
  "violet-storm": { hair: "#8858c8", clothing: "#1a1428", accent: "#a878e0" },
  "frost-silver": { hair: "#c8d0e0", clothing: "#182838", accent: "#88c8e8" },
  "ember-red": { hair: "#d84030", clothing: "#281410", accent: "#f86840" },
  "neon-lime": { hair: "#68c848", clothing: "#141c14", accent: "#68c848" },
  "golden-sun": { hair: "#e8c040", clothing: "#2a2018", accent: "#e8c040" },
  "midnight-rose": { hair: "#c83878", clothing: "#180c18", accent: "#e848a0" },
};

const loadedRecipes = (operatorRecipesData as { recipes?: AppearanceRecipeData[] }).recipes ?? [];
const recipeById = new Map(loadedRecipes.map((recipe) => [recipe.id, recipe]));

export interface ActorMarkerColors {
  hairColor: string;
  clothingColor: string;
  accentColor: string;
  skinColor: string;
  build: BuildType;
}

export function getRecipeById(recipeId: string): AppearanceRecipeData | undefined {
  return recipeById.get(recipeId);
}

export function getDefaultRecipe(): AppearanceRecipeData {
  return (
    recipeById.get("kael-001") ??
    loadedRecipes[0] ?? {
      id: "fallback",
      bodySilhouette: "clean-simple",
      palette: "warm-earth",
      skinTone: "medium-warm",
    }
  );
}

export function resolveOperatorBuild(roleTag: string, presetId?: string): BuildType {
  if (presetId) {
    const recipe = getRecipeById(presetId);
    if (recipe) {
      const buildFromRecipe = BODY_SILHOUETTE_TO_BUILD[recipe.bodySilhouette];
      if (buildFromRecipe) {
        return buildFromRecipe;
      }
    }
  }

  const rawRole = roleTag.replace(/^(role|archetype):/, "").toLowerCase();
  return ROLE_TO_BUILD[rawRole] ?? DEFAULT_OPERATOR_BUILD;
}

export function deriveActorMarker(
  recipe: AppearanceRecipeData,
  build: BuildType,
): ActorMarkerColors {
  const palette = PORTRAIT_PALETTES[recipe.palette] ?? PORTRAIT_PALETTES["warm-earth"];
  const skinTone = SKIN_TONES[recipe.skinTone] ?? SKIN_TONES["medium-warm"];
  return {
    hairColor: palette.hair,
    clothingColor: palette.clothing,
    accentColor: palette.accent,
    skinColor: skinTone.skin,
    build,
  };
}

export function resolveActorTokenPalette(presetId: string): ActorTokenPalette | undefined {
  const recipe = getRecipeById(presetId);
  if (!recipe) {
    return undefined;
  }

  const palette = PORTRAIT_PALETTES[recipe.palette];
  const skinTone = SKIN_TONES[recipe.skinTone];
  if (!palette || !skinTone) {
    return undefined;
  }

  return {
    skin: skinTone.skin,
    hair: palette.hair,
    clothing: palette.clothing,
    accent: palette.accent,
  };
}

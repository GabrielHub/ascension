import { deriveActorMarker } from "app/ui/_portrait-parts";
import { PORTRAIT_PALETTES, SKIN_TONES, type BuildType } from "app/ui/_svg-shared";
import type { AppearanceRecipeData } from "app/ui/operator-parts";
import { resolveOperatorBuild } from "app/ui/operator-build";
import { getDefaultRecipe, getRecipeById } from "app/ui/operator-parts";

import type { ActorTokenPalette } from "./types";

const tokenUrlCache = new Map<string, string>();

function buildChibiSvg(
  hairColor: string,
  clothingColor: string,
  accentColor: string,
  skinColor: string,
  build: BuildType,
): string {
  const bodyPath =
    build === "broad"
      ? "M8 22 Q8 20 10 19 L22 19 Q24 20 24 22 L24 34 Q24 36 22 36 L10 36 Q8 36 8 34 Z"
      : build === "lean"
        ? "M11 22 Q11 20 12 19 L20 19 Q21 20 21 22 L21 34 Q21 36 20 36 L12 36 Q11 36 11 34 Z"
        : "M9.5 22 Q9.5 20 11 19 L21 19 Q22.5 20 22.5 22 L22.5 34 Q22.5 36 21 36 L11 36 Q9.5 36 9.5 34 Z";
  const accentX = build === "broad" ? 10 : build === "lean" ? 12 : 11;
  const accentW = build === "broad" ? 12 : build === "lean" ? 8 : 10;
  const shadowRx = build === "broad" ? 9 : build === "lean" ? 6.5 : 7.5;
  const headR = build === "broad" ? 8 : build === "lean" ? 7 : 7.5;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 40" width="64" height="80">
  <ellipse cx="16" cy="37" rx="${shadowRx}" ry="2.2" fill="#000" opacity="0.18"/>
  <path d="${bodyPath}" fill="${clothingColor}" stroke="#0a0a0c" stroke-width="0.8"/>
  <rect x="${accentX}" y="19" width="${accentW}" height="2.5" rx="1" fill="${accentColor}" opacity="0.85"/>
  <rect x="13.5" y="16" width="5" height="4" rx="1.5" fill="${skinColor}"/>
  <circle cx="16" cy="12" r="${headR}" fill="${skinColor}" stroke="#0a0a0c" stroke-width="0.8"/>
  <path d="M10.5 14 Q16 17.5 21.5 14 Q20 8.5 16 6.5 Q12 8.5 10.5 14" fill="#000" opacity="0.08"/>
  <path d="M9 10 Q8.5 4.5 16 3.5 Q23.5 4.5 23 10 Q21.5 7.5 16 7 Q10.5 7.5 9 10" fill="${hairColor}" stroke="#0a0a0c" stroke-width="0.6"/>
  <circle cx="13" cy="12.5" r="1.1" fill="#0a0a0c"/>
  <circle cx="19" cy="12.5" r="1.1" fill="#0a0a0c"/>
  <circle cx="13.5" cy="12" r="0.35" fill="#fff" opacity="0.7"/>
  <circle cx="19.5" cy="12" r="0.35" fill="#fff" opacity="0.7"/>
</svg>`;
}

export function resolveActorTokenPalette(presetId: string): ActorTokenPalette | undefined {
  const recipe = getRecipeById(presetId);
  if (!recipe) {
    return undefined;
  }

  const palette = PORTRAIT_PALETTES[recipe.palette];
  if (!palette) {
    return undefined;
  }

  const skinTone = SKIN_TONES[recipe.skinTone];
  return {
    skin: skinTone?.skin ?? palette.skin,
    hair: palette.hair,
    clothing: palette.clothing,
    accent: palette.accent,
  };
}

export function getActorPortraitUrl(presetId: string, roleTag: string): string {
  const cacheKey = `${presetId}:${roleTag}`;
  const cached = tokenUrlCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const recipe = (getRecipeById(presetId) ?? getDefaultRecipe()) as AppearanceRecipeData;
  const build: BuildType = resolveOperatorBuild(roleTag);
  const marker = deriveActorMarker(recipe, build);
  const svgMarkup = buildChibiSvg(
    marker.hairColor,
    marker.clothingColor,
    marker.accentColor,
    marker.skinColor,
    marker.build,
  );

  const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgMarkup)}`;
  tokenUrlCache.set(cacheKey, url);
  return url;
}

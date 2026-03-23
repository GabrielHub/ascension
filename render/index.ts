import { composeSvgRecipe, searchSvgParts } from "./svg-parts";
import type { RaidWorldSnapshot, SvgPartDefinition } from "./types";
import { createDefaultEffects } from "./world-effects";

export * from "./camera";
export * from "./actor-tokens";
export * from "./hq-world";
export * from "./operator-detail-svg";
export * from "./svg-parts";
export * from "./types";
export * from "./world-canvas";
export * from "./world-effects";

export function buildRaidWorldSnapshot(
  dungeonName: string,
  contractSiteId: string,
  dungeonWidth: number,
  dungeonHeight: number,
  teams: RaidWorldSnapshot["teams"],
  enemies: RaidWorldSnapshot["enemies"],
  features: RaidWorldSnapshot["features"],
  fogMask: RaidWorldSnapshot["fogMask"],
): RaidWorldSnapshot {
  return {
    dungeonName,
    contractSiteId,
    dungeonWidth,
    dungeonHeight,
    teams,
    enemies,
    features,
    fogMask,
    effects: createDefaultEffects(),
    focus: null,
  };
}

export function createPreviewSvgCatalog(): readonly SvgPartDefinition[] {
  return [
    {
      id: "svg/body/base",
      category: "body",
      tags: ["body:base", "shape:human"],
      paletteTags: ["palette:stone"],
      roleTags: [],
      bodyCompatibility: ["body:standard"],
      poseCompatibility: ["pose:idle"],
      rarity: "common",
      markup:
        '<rect x="46" y="38" width="68" height="96" rx="28" fill="#d6c7b4" /><rect x="58" y="82" width="44" height="44" rx="18" fill="#26211d" opacity="0.22" />',
    },
    {
      id: "svg/face/calm",
      category: "face",
      tags: ["face:calm", "expression:neutral"],
      paletteTags: ["palette:stone"],
      roleTags: [],
      bodyCompatibility: ["body:standard"],
      poseCompatibility: ["pose:idle"],
      rarity: "common",
      markup:
        '<circle cx="80" cy="54" r="24" fill="#f2ddc6" /><circle cx="72" cy="52" r="2.4" fill="#18181b" /><circle cx="88" cy="52" r="2.4" fill="#18181b" /><path d="M72 64c5 4 11 4 16 0" stroke="#18181b" stroke-width="2.2" fill="none" stroke-linecap="round" />',
    },
    {
      id: "svg/clothing/coat",
      category: "clothing",
      tags: ["clothing:coat", "silhouette:formal"],
      paletteTags: ["palette:ember"],
      roleTags: ["role:recruitment"],
      bodyCompatibility: ["body:standard"],
      poseCompatibility: ["pose:idle"],
      rarity: "common",
      markup:
        '<path d="M54 78h52l10 52H44l10-52Z" fill="#7c2d12" /><path d="M80 78v52" stroke="#fef3c7" stroke-width="3" opacity="0.5" />',
    },
    {
      id: "svg/accessory/badge",
      category: "accessory",
      tags: ["accessory:badge", "accent:gold"],
      paletteTags: ["palette:ember"],
      roleTags: ["role:recruitment"],
      bodyCompatibility: ["body:standard"],
      poseCompatibility: ["pose:idle"],
      rarity: "common",
      markup:
        '<circle cx="98" cy="92" r="7" fill="#f59e0b" /><circle cx="98" cy="92" r="3" fill="#451a03" />',
    },
  ];
}

export function buildPreviewDetailRecipe() {
  const catalog = createPreviewSvgCatalog();
  const clothingMatch = searchSvgParts(catalog, {
    category: "clothing",
    roleTags: ["role:recruitment"],
    bodyCompatibility: "body:standard",
    poseCompatibility: "pose:idle",
  })[0];

  return composeSvgRecipe(catalog, [
    "svg/body/base",
    "svg/face/calm",
    clothingMatch?.part.id ?? "svg/clothing/coat",
    "svg/accessory/badge",
  ]);
}

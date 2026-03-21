export interface WorldRenderNode {
  id: string;
  label: string;
  detail: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fill: string;
  isOccupied: boolean;
}

export interface WorldRenderSnapshot {
  title: string;
  subtitle: string;
  nodes: readonly WorldRenderNode[];
}

export interface SvgPartDefinition {
  id: string;
  category: "body" | "face" | "hair" | "clothing" | "accessory";
  tags: readonly string[];
  paletteTags: readonly string[];
  roleTags: readonly string[];
  bodyCompatibility: readonly string[];
  poseCompatibility: readonly string[];
  rarity: "common" | "uncommon" | "rare";
  markup: string;
}

export interface SvgPartQuery {
  category?: SvgPartDefinition["category"];
  tags?: readonly string[];
  roleTags?: readonly string[];
  bodyCompatibility?: string;
  poseCompatibility?: string;
  paletteTag?: string;
}

export interface SvgPartMatch {
  part: SvgPartDefinition;
  score: number;
}

export interface SvgCompositionLayer {
  partId: string;
  markup: string;
  zIndex: number;
}

export interface SvgCompositionRecipe {
  viewBox: string;
  layers: readonly SvgCompositionLayer[];
}

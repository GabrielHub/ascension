import type { EnvPartCategory, EnvSceneReviewContract } from "../environment-parts";
import type { HqPlacementKind, HqScenePlacementOrigin, HqSvgPlacementMeta } from "render/types";

const VIEWBOX_PATTERN = /<svg\b[^>]*\bviewBox=(["'])([^"']+)\1/i;

export function placementKindForAssetCategory(category: EnvPartCategory): HqPlacementKind {
  switch (category) {
    case "scene":
      return "room-scene";
    case "background":
      return "exterior";
    default:
      return "decoration";
  }
}

export function defaultZIndexForAssetCategory(category: EnvPartCategory): number {
  switch (category) {
    case "background":
      return 2;
    case "shell":
      return 4;
    case "structure":
      return 6;
    case "scene":
      return 30;
    default:
      return 10;
  }
}

export function parseSvgViewBox(svgText: string): readonly [number, number, number, number] | null {
  const match = svgText.match(VIEWBOX_PATTERN);
  if (!match) {
    return null;
  }

  const tokens = match[2]
    .trim()
    .split(/[,\s]+/)
    .map((token) => Number.parseFloat(token));

  if (tokens.length !== 4 || !tokens.every((token) => Number.isFinite(token))) {
    return null;
  }

  const [minX, minY, width, height] = tokens;
  if (width <= 0 || height <= 0) {
    return null;
  }

  return [minX, minY, width, height];
}

export function buildSvgPlacementMeta(
  viewBox: readonly [number, number, number, number],
): HqSvgPlacementMeta {
  const [minX, minY, width, height] = viewBox;

  return {
    svgAnchorX: minX + width / 2,
    svgAnchorY: minY + height,
    viewBox,
  };
}

export function buildScenePlacementOrigin(
  contract: EnvSceneReviewContract,
): HqScenePlacementOrigin {
  return {
    svgOriginX: contract.canonicalOrigin[0],
    svgOriginY: contract.canonicalOrigin[1],
    viewBoxMinX: contract.canonicalViewBox.minX,
    viewBoxMinY: contract.canonicalViewBox.minY,
  };
}

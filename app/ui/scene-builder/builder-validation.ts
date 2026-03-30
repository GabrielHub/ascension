/**
 * Scene builder validation — surfaces invalid assets and placements.
 */

import type { BuildingFloorLayout } from "content/building-layouts";
import type { EnvPartMeta } from "../environment-parts";
import type { BuilderPlacement, BuilderWarning } from "./builder-types";

export function validatePlacements(
  placements: readonly BuilderPlacement[],
  parts: readonly EnvPartMeta[],
  layout: BuildingFloorLayout | undefined,
): BuilderWarning[] {
  const warnings: BuilderWarning[] = [];
  const partsById = new Map(parts.map((p) => [p.id, p]));
  const seenIds = new Set<string>();

  for (const placement of placements) {
    // Duplicate id check
    if (seenIds.has(placement.id)) {
      warnings.push({
        id: `dup-${placement.id}`,
        placementId: placement.id,
        level: "error",
        message: `Duplicate placement id: ${placement.id}`,
      });
    }
    seenIds.add(placement.id);

    // Asset existence check
    const part = partsById.get(placement.assetId);
    if (!part) {
      warnings.push({
        id: `missing-asset-${placement.id}`,
        placementId: placement.id,
        level: "warning",
        message: `Asset not found in index: ${placement.assetId}`,
      });
      continue;
    }

    // Exploration asset used in scene
    if (part.status === "exploration") {
      warnings.push({
        id: `exploration-${placement.id}`,
        placementId: placement.id,
        level: "warning",
        message: `Uses exploration asset: ${placement.assetId} (not approved)`,
      });
    }

    // Scale validation
    if (placement.scale <= 0) {
      warnings.push({
        id: `scale-${placement.id}`,
        placementId: placement.id,
        level: "error",
        message: `Invalid scale: ${placement.scale}`,
      });
    }

    // Opacity validation
    if (placement.opacity < 0 || placement.opacity > 1) {
      warnings.push({
        id: `opacity-${placement.id}`,
        placementId: placement.id,
        level: "error",
        message: `Opacity out of range: ${placement.opacity}`,
      });
    }

    // Off-grid warning (very far from shell)
    if (layout) {
      const shell = layout.shell;
      const margin = 20;
      if (
        placement.col < shell.col - margin ||
        placement.col > shell.col + shell.cols + margin ||
        placement.row < shell.row - margin ||
        placement.row > shell.row + shell.rows + margin
      ) {
        warnings.push({
          id: `off-grid-${placement.id}`,
          placementId: placement.id,
          level: "info",
          message: `Placement is far from the building shell`,
        });
      }
    }

    // Missing svgMeta on non-scene-origin placements
    if (!placement.svgMeta && placement.anchorMode !== "scene-origin") {
      warnings.push({
        id: `no-meta-${placement.id}`,
        placementId: placement.id,
        level: "info",
        message: `No SVG metadata — size derived from explicit width/height`,
      });
    }
  }

  return warnings;
}

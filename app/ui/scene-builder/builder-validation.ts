/**
 * Scene builder validation — surfaces invalid assets and placements.
 */

import {
  isFootprintInsideBuildingShell,
  type BuildingFloorLayout,
  type BuildingRoomSlot,
  type BuildingShellFootprint,
} from "content/building-layouts";
import type { EnvPartMeta } from "../environment-parts";
import type {
  BuilderPlacement,
  BuilderRoomSlotState,
  BuilderShell,
  BuilderWarning,
} from "./builder-types";

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
        targetType: "placement",
        targetId: placement.id,
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
        targetType: "placement",
        targetId: placement.id,
        level: "warning",
        message: `Asset not found in index: ${placement.assetId}`,
      });
      continue;
    }

    // Exploration asset used in scene
    if (part.status === "exploration") {
      warnings.push({
        id: `exploration-${placement.id}`,
        targetType: "placement",
        targetId: placement.id,
        level: "warning",
        message: `Uses exploration asset: ${placement.assetId} (not approved)`,
      });
    }

    // Scale validation
    if (placement.scale <= 0) {
      warnings.push({
        id: `scale-${placement.id}`,
        targetType: "placement",
        targetId: placement.id,
        level: "error",
        message: `Invalid scale: ${placement.scale}`,
      });
    }

    // Opacity validation
    if (placement.opacity < 0 || placement.opacity > 1) {
      warnings.push({
        id: `opacity-${placement.id}`,
        targetType: "placement",
        targetId: placement.id,
        level: "error",
        message: `Opacity out of range: ${placement.opacity}`,
      });
    }

    if (layout) {
      const shell = layout.shell;
      if (placementOverlapsShell(placement, shell)) {
        warnings.push({
          id: `decoration-inside-shell-${placement.id}`,
          targetType: "placement",
          targetId: placement.id,
          level: "error",
          message: "Decorations cannot overlap the HQ shell footprint",
        });
      }

      // Off-grid warning (very far from shell)
      const margin = 20;
      if (
        placement.col < shell.col - margin ||
        placement.col > shell.col + shell.cols + margin ||
        placement.row < shell.row - margin ||
        placement.row > shell.row + shell.rows + margin
      ) {
        warnings.push({
          id: `off-grid-${placement.id}`,
          targetType: "placement",
          targetId: placement.id,
          level: "info",
          message: `Placement is far from the building shell`,
        });
      }
    }

    // Missing svgMeta on non-scene-origin placements
    if (!placement.svgMeta && placement.anchorMode !== "scene-origin") {
      warnings.push({
        id: `no-meta-${placement.id}`,
        targetType: "placement",
        targetId: placement.id,
        level: "info",
        message: `No SVG metadata — size derived from explicit width/height`,
      });
    }
  }

  return warnings;
}

export function placementOverlapsShell(
  placement: Pick<BuilderPlacement, "kind" | "col" | "row" | "footprintCols" | "footprintRows">,
  shell: BuildingShellFootprint | null,
): boolean {
  if (!shell || placement.kind !== "decoration") {
    return false;
  }

  const footprintCols = Math.max(placement.footprintCols ?? 1, 1);
  const footprintRows = Math.max(placement.footprintRows ?? 1, 1);

  const overlapsRect = rectsOverlap(
    placement.col,
    placement.row,
    footprintCols,
    footprintRows,
    shell.col,
    shell.row,
    shell.cols,
    shell.rows,
  );
  if (!overlapsRect) return false;

  for (let col = placement.col; col < placement.col + footprintCols; col++) {
    for (let row = placement.row; row < placement.row + footprintRows; row++) {
      if (isFootprintInsideBuildingShell(shell, { col, row, cols: 1, rows: 1 })) {
        return true;
      }
    }
  }

  return false;
}

function rectsOverlap(
  leftCol: number,
  leftRow: number,
  leftCols: number,
  leftRows: number,
  rightCol: number,
  rightRow: number,
  rightCols: number,
  rightRows: number,
): boolean {
  return (
    leftCol < rightCol + rightCols &&
    leftCol + leftCols > rightCol &&
    leftRow < rightRow + rightRows &&
    leftRow + leftRows > rightRow
  );
}

function slotsOverlap(left: BuildingRoomSlot, right: BuildingRoomSlot): boolean {
  return rectsOverlap(
    left.col,
    left.row,
    left.cols,
    left.rows,
    right.col,
    right.row,
    right.cols,
    right.rows,
  );
}

export function validateLayout(
  shell: BuilderShell | null,
  slots: readonly BuilderRoomSlotState[],
): BuilderWarning[] {
  const warnings: BuilderWarning[] = [];

  if (!shell) {
    warnings.push({
      id: "missing-shell",
      targetType: "shell",
      targetId: null,
      level: "error",
      message: "No shell footprint is loaded for this floor",
    });
    return warnings;
  }

  if (shell.cols <= 0 || shell.rows <= 0) {
    warnings.push({
      id: "invalid-shell-size",
      targetType: "shell",
      targetId: null,
      level: "error",
      message: "Shell width and height must both be greater than zero",
    });
  }

  const seenSlotIds = new Set<string>();
  for (const slot of slots) {
    if (seenSlotIds.has(slot.slotId)) {
      warnings.push({
        id: `duplicate-slot-${slot.slotId}`,
        targetType: "slot",
        targetId: slot.slotId,
        level: "error",
        message: `Duplicate room slot id: ${slot.slotId}`,
      });
    }
    seenSlotIds.add(slot.slotId);

    if (slot.cols <= 0 || slot.rows <= 0) {
      warnings.push({
        id: `invalid-slot-size-${slot.slotId}`,
        targetType: "slot",
        targetId: slot.slotId,
        level: "error",
        message: `Room slot ${slot.slotId} must span at least one tile`,
      });
    }

    if (!isFootprintInsideBuildingShell(shell, slot)) {
      warnings.push({
        id: `slot-outside-shell-${slot.slotId}`,
        targetType: "slot",
        targetId: slot.slotId,
        level: "warning",
        message: `Room slot ${slot.slotId} extends beyond the shell footprint`,
      });
    }
  }

  for (let index = 0; index < slots.length; index++) {
    for (let compareIndex = index + 1; compareIndex < slots.length; compareIndex++) {
      if (slotsOverlap(slots[index], slots[compareIndex])) {
        warnings.push({
          id: `slot-overlap-${slots[index].slotId}-${slots[compareIndex].slotId}`,
          targetType: "slot",
          targetId: slots[index].slotId,
          level: "warning",
          message: `Room slots ${slots[index].slotId} and ${slots[compareIndex].slotId} overlap`,
        });
      }
    }
  }

  if (slots.length === 0) {
    warnings.push({
      id: "no-slots",
      targetType: "shell",
      targetId: null,
      level: "info",
      message: "No room slots are defined for this floor yet",
    });
  }

  return warnings;
}

/**
 * Scene builder export — produces canonical scene data as TypeScript or JSON.
 */

import type { BuildingFloorLayout } from "content/building-layouts";
import type { HqStaticPlacementDef } from "render/types";
import type { BuilderPlacement, BuilderRoomSlotState, BuilderShell } from "./builder-types";

function cleanPlacement(p: BuilderPlacement): HqStaticPlacementDef {
  const def: HqStaticPlacementDef = {
    id: p.id,
    assetId: p.assetId,
    assetUrl: p.assetUrl,
    kind: p.kind,
    col: p.col,
    row: p.row,
    anchorMode: p.anchorMode,
    width: p.width,
    height: p.height,
    zIndex: p.zIndex,
    opacity: p.opacity,
    scale: p.scale,
  };

  if (p.offsetX !== undefined && p.offsetX !== 0) def.offsetX = p.offsetX;
  if (p.offsetY !== undefined && p.offsetY !== 0) def.offsetY = p.offsetY;
  if (p.svgMeta) def.svgMeta = p.svgMeta;
  if (p.footprintCols !== undefined) def.footprintCols = p.footprintCols;
  if (p.footprintRows !== undefined) def.footprintRows = p.footprintRows;
  if (p.sceneOrigin) def.sceneOrigin = p.sceneOrigin;
  if (p.tags && p.tags.length > 0) def.tags = p.tags;

  return def;
}

export function exportAsJson(
  buildingId: string,
  sceneId: string,
  placements: readonly BuilderPlacement[],
): string {
  const composition = {
    buildingId,
    sceneId,
    placements: placements.map(cleanPlacement),
  };
  return JSON.stringify(composition, null, 2);
}

function cleanShell(shell: BuilderShell) {
  return {
    col: shell.col,
    row: shell.row,
    cols: shell.cols,
    rows: shell.rows,
  };
}

function cleanSlot(slot: BuilderRoomSlotState) {
  return {
    slotId: slot.slotId,
    col: slot.col,
    row: slot.row,
    cols: slot.cols,
    rows: slot.rows,
    ...(slot.startingTemplateId ? { startingTemplateId: slot.startingTemplateId } : {}),
  };
}

export function exportLayoutAsJson(
  buildingId: string,
  floorIndex: number,
  elevationBandId: string | null,
  shell: BuilderShell,
  slots: readonly BuilderRoomSlotState[],
): string {
  return JSON.stringify(
    {
      buildingId,
      floorLayout: {
        floorIndex,
        elevationBandId,
        shell: cleanShell(shell),
        slots: slots.map(cleanSlot),
      },
    },
    null,
    2,
  );
}

function stringifyValue(value: unknown, indent: number): string {
  const pad = "  ".repeat(indent);
  const padInner = "  ".repeat(indent + 1);

  if (value === null || value === undefined) return "undefined";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "number" || typeof value === "boolean") return String(value);

  if (Array.isArray(value)) {
    if (value.length === 0) return "[]";
    if (value.every((v) => typeof v === "number" || typeof v === "string")) {
      return `[${value.map((v) => (typeof v === "string" ? JSON.stringify(v) : String(v))).join(", ")}]`;
    }
    const items = value.map((v) => `${padInner}${stringifyValue(v, indent + 1)}`);
    return `[\n${items.join(",\n")}\n${pad}]`;
  }

  if (typeof value === "object") {
    const entries = Object.entries(value).filter(([, v]) => v !== undefined);
    if (entries.length === 0) return "{}";
    const props = entries.map(([k, v]) => `${padInner}${k}: ${stringifyValue(v, indent + 1)}`);
    return `{\n${props.join(",\n")}\n${pad}}`;
  }

  return String(value);
}

export function exportAsTypeScript(
  buildingId: string,
  sceneId: string,
  placements: readonly BuilderPlacement[],
): string {
  const cleanPlacements = placements.map(cleanPlacement);

  const lines: string[] = [
    `import type { HqSceneComposition, HqStaticPlacementDef } from "render/types";`,
    ``,
    `const PLACEMENTS: readonly HqStaticPlacementDef[] = ${stringifyValue(cleanPlacements, 0)};`,
    ``,
    `export const SCENE: HqSceneComposition = {`,
    `  buildingId: ${JSON.stringify(buildingId)},`,
    `  sceneId: ${JSON.stringify(sceneId)},`,
    `  placements: PLACEMENTS,`,
    `};`,
    ``,
  ];

  return lines.join("\n");
}

function toLayoutConstName(buildingId: string, floorIndex: number): string {
  return `${buildingId
    .replace(/^building\//, "")
    .replace(/[^a-z0-9]+/gi, "_")
    .toUpperCase()}_FLOOR_${floorIndex}`;
}

export function exportLayoutAsTypeScript(
  buildingId: string,
  floorIndex: number,
  elevationBandId: string | null,
  shell: BuilderShell,
  slots: readonly BuilderRoomSlotState[],
): string {
  const constName = toLayoutConstName(buildingId, floorIndex);
  const layout: BuildingFloorLayout = {
    floorIndex,
    elevationBandId,
    shell: cleanShell(shell),
    slots: slots.map(cleanSlot),
  };

  return [
    `import type { BuildingFloorLayout } from "content/building-layouts";`,
    ``,
    `export const ${constName}: BuildingFloorLayout = ${stringifyValue(layout, 0)};`,
    ``,
  ].join("\n");
}

export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

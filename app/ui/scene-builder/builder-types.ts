/**
 * Scene builder types — editor state separate from runtime types.
 * The builder operates on HqStaticPlacementDef from render/types.ts directly.
 */

import type {
  BuildingFloorLayout,
  BuildingRoomSlot,
  BuildingShellFootprint,
} from "content/building-layouts";
import type {
  HqPlacementAnchor,
  HqPlacementKind,
  HqScenePlacementOrigin,
  HqStaticPlacementDef,
  HqSvgPlacementMeta,
} from "render/types";
import type { HqTimeOfDayPhase } from "lib/hq-time-phase";
import type { EnvPartMeta } from "../environment-parts";

// ── Overlay visibility toggles ──────────────────────────────────────────

export interface BuilderOverlays {
  grid: boolean;
  shell: boolean;
  rooms: boolean;
  perimeter: boolean;
  anchors: boolean;
  zIndex: boolean;
}

export const DEFAULT_OVERLAYS: BuilderOverlays = {
  grid: true,
  shell: true,
  rooms: true,
  perimeter: false,
  anchors: true,
  zIndex: false,
};

// ── Builder placement (mutable copy of HqStaticPlacementDef) ────────────

export interface BuilderPlacement extends HqStaticPlacementDef {
  /** Marks whether this placement has been modified from the canonical source. */
  dirty: boolean;
}

// ── Asset browser entry ─────────────────────────────────────────────────

export interface AssetBrowserEntry {
  part: EnvPartMeta;
  svgUrl: string;
  displayName: string;
}

export type AssetFilterCategory = "all" | "prop" | "background" | "scene" | "structure" | "shell";
export type AssetFilterStatus = "all" | "approved" | "exploration";

// ── Builder warnings ────────────────────────────────────────────────────

export type WarningLevel = "error" | "warning" | "info";
export type BuilderMode = "scene" | "layout";
export type BuilderWarningTarget = "placement" | "slot" | "shell" | null;

export interface BuilderWarning {
  id: string;
  targetType: BuilderWarningTarget;
  targetId: string | null;
  level: WarningLevel;
  message: string;
}

// ── Core builder state ──────────────────────────────────────────────────

export interface BuilderShell extends BuildingShellFootprint {
  dirty: boolean;
}

export interface BuilderRoomSlotState extends BuildingRoomSlot {
  dirty: boolean;
}

export interface SceneBuilderState {
  buildingId: string;
  floorIndex: number;
  buildingTier: number;
  editorMode: BuilderMode;
  previewPhase: HqTimeOfDayPhase;

  placements: BuilderPlacement[];
  selectedPlacementId: string | null;
  shell: BuilderShell | null;
  slots: BuilderRoomSlotState[];
  selectedSlotId: string | null;
  isShellSelected: boolean;

  overlays: BuilderOverlays;

  camera: { x: number; y: number; zoom: number };

  warnings: BuilderWarning[];

  sceneDirty: boolean;
  layoutDirty: boolean;
  isDirty: boolean;
}

// ── Action types ────────────────────────────────────────────────────────

export type BuilderAction =
  | { type: "SET_BUILDING"; buildingId: string }
  | { type: "SET_BUILDING_TIER"; buildingTier: number }
  | { type: "SET_FLOOR"; floorIndex: number }
  | { type: "SET_EDITOR_MODE"; mode: BuilderMode }
  | { type: "SET_PREVIEW_PHASE"; phase: HqTimeOfDayPhase }
  | { type: "CYCLE_PREVIEW_PHASE"; direction: -1 | 1 }
  | { type: "LOAD_PLACEMENTS"; placements: HqStaticPlacementDef[] }
  | { type: "LOAD_LAYOUT"; layout: BuildingFloorLayout | null }
  | { type: "SELECT_PLACEMENT"; id: string | null }
  | { type: "SELECT_SLOT"; id: string | null }
  | { type: "SELECT_SHELL" }
  | { type: "ADD_PLACEMENT"; placement: BuilderPlacement }
  | { type: "UPDATE_PLACEMENT"; id: string; changes: Partial<HqStaticPlacementDef> }
  | { type: "DELETE_PLACEMENT"; id: string }
  | { type: "DUPLICATE_PLACEMENT"; id: string }
  | { type: "REORDER_PLACEMENT"; id: string; direction: "up" | "down" }
  | { type: "MOVE_PLACEMENT"; id: string; col: number; row: number }
  | { type: "NUDGE_PLACEMENT"; id: string; dCol: number; dRow: number }
  | { type: "ADD_SLOT"; slot: BuilderRoomSlotState }
  | { type: "UPDATE_SLOT"; id: string; changes: Partial<BuildingRoomSlot> }
  | { type: "DELETE_SLOT"; id: string }
  | { type: "DUPLICATE_SLOT"; id: string }
  | { type: "MOVE_SLOT"; id: string; col: number; row: number }
  | { type: "NUDGE_SLOT"; id: string; dCol: number; dRow: number }
  | { type: "UPDATE_SHELL"; changes: Partial<BuildingShellFootprint> }
  | { type: "MOVE_SHELL"; col: number; row: number }
  | { type: "NUDGE_SHELL"; dCol: number; dRow: number }
  | { type: "TOGGLE_OVERLAY"; overlay: keyof BuilderOverlays }
  | { type: "SET_CAMERA"; camera: Partial<SceneBuilderState["camera"]> }
  | { type: "SET_WARNINGS"; warnings: BuilderWarning[] }
  | { type: "MARK_CLEAN"; scope: "scene" | "layout" | "all" };

// ── Default placement factory ───────────────────────────────────────────

let nextPlacementCounter = 0;
let nextSlotCounter = 0;

interface CreatePlacementOptions {
  anchorMode?: HqPlacementAnchor;
  width?: number;
  height?: number;
  zIndex?: number;
  opacity?: number;
  scale?: number;
  offsetX?: number;
  offsetY?: number;
  svgMeta?: HqSvgPlacementMeta;
  footprintCols?: number;
  footprintRows?: number;
  sceneOrigin?: HqScenePlacementOrigin;
  tags?: readonly string[];
}

export function createPlacement(
  assetId: string,
  assetUrl: string,
  kind: HqPlacementKind,
  col: number,
  row: number,
  options: CreatePlacementOptions = {},
): BuilderPlacement {
  nextPlacementCounter++;
  const svgMeta = options.svgMeta;
  const width = options.width ?? (svgMeta ? svgMeta.viewBox[2] : 96);
  const height = options.height ?? (svgMeta ? svgMeta.viewBox[3] : 48);
  const id = `placement/${assetId.replace(/\//g, "-")}-${nextPlacementCounter}`;

  return {
    id,
    assetId,
    assetUrl,
    kind,
    col,
    row,
    anchorMode: options.anchorMode ?? (options.sceneOrigin ? "scene-origin" : "iso-bottom"),
    width,
    height,
    zIndex: options.zIndex ?? 10,
    opacity: options.opacity ?? 1,
    scale: options.scale ?? 1,
    offsetX: options.offsetX,
    offsetY: options.offsetY,
    svgMeta,
    footprintCols: options.footprintCols,
    footprintRows: options.footprintRows,
    sceneOrigin: options.sceneOrigin,
    tags: options.tags,
    dirty: true,
  };
}

interface CreateSlotOptions {
  slotId?: string;
  cols?: number;
  rows?: number;
  startingTemplateId?: string;
}

export function createSlot(
  col: number,
  row: number,
  options: CreateSlotOptions = {},
): BuilderRoomSlotState {
  nextSlotCounter++;

  return {
    slotId: options.slotId ?? `slot/custom-${nextSlotCounter}`,
    col,
    row,
    cols: options.cols ?? 4,
    rows: options.rows ?? 3,
    startingTemplateId: options.startingTemplateId,
    dirty: true,
  };
}

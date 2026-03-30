/**
 * Scene builder types — editor state separate from runtime types.
 * The builder operates on HqStaticPlacementDef from render/types.ts directly.
 */

import type {
  HqPlacementAnchor,
  HqPlacementKind,
  HqScenePlacementOrigin,
  HqStaticPlacementDef,
  HqSvgPlacementMeta,
} from "render/types";
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

export interface BuilderWarning {
  id: string;
  placementId: string | null;
  level: WarningLevel;
  message: string;
}

// ── Core builder state ──────────────────────────────────────────────────

export interface SceneBuilderState {
  buildingId: string;
  floorIndex: number;
  buildingTier: number;

  placements: BuilderPlacement[];
  selectedPlacementId: string | null;

  overlays: BuilderOverlays;

  camera: { x: number; y: number; zoom: number };

  warnings: BuilderWarning[];

  isDirty: boolean;
}

// ── Action types ────────────────────────────────────────────────────────

export type BuilderAction =
  | { type: "SET_BUILDING"; buildingId: string }
  | { type: "SET_FLOOR"; floorIndex: number }
  | { type: "LOAD_PLACEMENTS"; placements: HqStaticPlacementDef[] }
  | { type: "SELECT_PLACEMENT"; id: string | null }
  | { type: "ADD_PLACEMENT"; placement: BuilderPlacement }
  | { type: "UPDATE_PLACEMENT"; id: string; changes: Partial<HqStaticPlacementDef> }
  | { type: "DELETE_PLACEMENT"; id: string }
  | { type: "DUPLICATE_PLACEMENT"; id: string }
  | { type: "REORDER_PLACEMENT"; id: string; direction: "up" | "down" }
  | { type: "MOVE_PLACEMENT"; id: string; col: number; row: number }
  | { type: "NUDGE_PLACEMENT"; id: string; dCol: number; dRow: number }
  | { type: "TOGGLE_OVERLAY"; overlay: keyof BuilderOverlays }
  | { type: "SET_CAMERA"; camera: Partial<SceneBuilderState["camera"]> }
  | { type: "SET_WARNINGS"; warnings: BuilderWarning[] }
  | { type: "MARK_CLEAN" };

// ── Default placement factory ───────────────────────────────────────────

let nextPlacementCounter = 0;

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

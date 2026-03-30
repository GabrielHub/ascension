/**
 * Scene builder reducer — pure state management for the editor.
 */

import type { BuilderAction, BuilderPlacement, SceneBuilderState } from "./builder-types";
import { DEFAULT_OVERLAYS } from "./builder-types";

export const INITIAL_STATE: SceneBuilderState = {
  buildingId: "building/bodega",
  floorIndex: 0,
  buildingTier: 1,
  placements: [],
  selectedPlacementId: null,
  overlays: { ...DEFAULT_OVERLAYS },
  camera: { x: 600, y: 420, zoom: 1 },
  warnings: [],
  isDirty: false,
};

export function builderReducer(state: SceneBuilderState, action: BuilderAction): SceneBuilderState {
  switch (action.type) {
    case "SET_BUILDING":
      return {
        ...state,
        buildingId: action.buildingId,
        floorIndex: 0,
        placements: [],
        selectedPlacementId: null,
        isDirty: false,
      };

    case "SET_FLOOR":
      return { ...state, floorIndex: action.floorIndex };

    case "LOAD_PLACEMENTS":
      return {
        ...state,
        placements: action.placements.map((p) => ({ ...p, dirty: false })),
        selectedPlacementId: null,
        isDirty: false,
      };

    case "SELECT_PLACEMENT":
      return { ...state, selectedPlacementId: action.id };

    case "ADD_PLACEMENT":
      return {
        ...state,
        placements: [...state.placements, action.placement],
        selectedPlacementId: action.placement.id,
        isDirty: true,
      };

    case "UPDATE_PLACEMENT":
      return {
        ...state,
        placements: state.placements.map((p) =>
          p.id === action.id ? { ...p, ...action.changes, dirty: true } : p,
        ),
        isDirty: true,
      };

    case "DELETE_PLACEMENT":
      return {
        ...state,
        placements: state.placements.filter((p) => p.id !== action.id),
        selectedPlacementId:
          state.selectedPlacementId === action.id ? null : state.selectedPlacementId,
        isDirty: true,
      };

    case "DUPLICATE_PLACEMENT": {
      const source = state.placements.find((p) => p.id === action.id);
      if (!source) return state;
      const dupe: BuilderPlacement = {
        ...source,
        id: `${source.id}-copy-${Date.now()}`,
        col: source.col + 1,
        row: source.row + 1,
        dirty: true,
      };
      return {
        ...state,
        placements: [...state.placements, dupe],
        selectedPlacementId: dupe.id,
        isDirty: true,
      };
    }

    case "REORDER_PLACEMENT": {
      const idx = state.placements.findIndex((p) => p.id === action.id);
      if (idx < 0) return state;
      const swapIdx = action.direction === "up" ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= state.placements.length) return state;
      const next = [...state.placements];
      [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
      return { ...state, placements: next, isDirty: true };
    }

    case "MOVE_PLACEMENT":
      return {
        ...state,
        placements: state.placements.map((p) =>
          p.id === action.id ? { ...p, col: action.col, row: action.row, dirty: true } : p,
        ),
        isDirty: true,
      };

    case "NUDGE_PLACEMENT":
      return {
        ...state,
        placements: state.placements.map((p) =>
          p.id === action.id
            ? { ...p, col: p.col + action.dCol, row: p.row + action.dRow, dirty: true }
            : p,
        ),
        isDirty: true,
      };

    case "TOGGLE_OVERLAY":
      return {
        ...state,
        overlays: {
          ...state.overlays,
          [action.overlay]: !state.overlays[action.overlay],
        },
      };

    case "SET_CAMERA":
      return { ...state, camera: { ...state.camera, ...action.camera } };

    case "SET_WARNINGS":
      return { ...state, warnings: action.warnings };

    case "MARK_CLEAN":
      return {
        ...state,
        isDirty: false,
        placements: state.placements.map((p) => ({ ...p, dirty: false })),
      };

    default:
      return state;
  }
}

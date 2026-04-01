/**
 * Scene builder reducer — pure state management for the editor.
 */

import type {
  BuilderAction,
  BuilderPlacement,
  BuilderRoomSlotState,
  SceneBuilderState,
} from "./builder-types";
import { HQ_TIME_OF_DAY_PHASES } from "lib/hq-time-phase";
import { placementOverlapsShell } from "./builder-validation";
import { DEFAULT_OVERLAYS } from "./builder-types";

export const INITIAL_STATE: SceneBuilderState = {
  buildingId: "building/bodega",
  floorIndex: 0,
  buildingTier: 1,
  editorMode: "scene",
  previewPhase: "day",
  placements: [],
  selectedPlacementId: null,
  shell: null,
  slots: [],
  selectedSlotId: null,
  isShellSelected: false,
  overlays: { ...DEFAULT_OVERLAYS },
  camera: { x: 600, y: 420, zoom: 1 },
  warnings: [],
  sceneDirty: false,
  layoutDirty: false,
  isDirty: false,
};

function canUsePlacement(state: SceneBuilderState, placement: BuilderPlacement): boolean {
  return !placementOverlapsShell(placement, state.shell);
}

function withDirty(
  state: SceneBuilderState,
  changes: Partial<SceneBuilderState>,
  sceneDirty = changes.sceneDirty ?? state.sceneDirty,
  layoutDirty = changes.layoutDirty ?? state.layoutDirty,
): SceneBuilderState {
  return {
    ...state,
    ...changes,
    sceneDirty,
    layoutDirty,
    isDirty: sceneDirty || layoutDirty,
  };
}

export function builderReducer(state: SceneBuilderState, action: BuilderAction): SceneBuilderState {
  switch (action.type) {
    case "SET_BUILDING":
      return withDirty(
        state,
        {
          buildingId: action.buildingId,
          floorIndex: 0,
          buildingTier: 1,
          placements: [],
          selectedPlacementId: null,
          shell: null,
          slots: [],
          selectedSlotId: null,
          isShellSelected: false,
        },
        false,
        false,
      );

    case "SET_BUILDING_TIER":
      return withDirty(
        state,
        {
          buildingTier: action.buildingTier,
          floorIndex: 0,
          shell: null,
          slots: [],
          selectedSlotId: null,
          isShellSelected: false,
        },
        false,
        false,
      );

    case "SET_FLOOR":
      return withDirty(
        state,
        {
          floorIndex: action.floorIndex,
          shell: null,
          slots: [],
          selectedSlotId: null,
          isShellSelected: false,
        },
        state.sceneDirty,
        false,
      );

    case "SET_EDITOR_MODE":
      return { ...state, editorMode: action.mode };

    case "SET_PREVIEW_PHASE":
      return { ...state, previewPhase: action.phase };

    case "CYCLE_PREVIEW_PHASE": {
      const currentIndex = HQ_TIME_OF_DAY_PHASES.indexOf(state.previewPhase);
      const nextIndex =
        (currentIndex + action.direction + HQ_TIME_OF_DAY_PHASES.length) %
        HQ_TIME_OF_DAY_PHASES.length;
      return { ...state, previewPhase: HQ_TIME_OF_DAY_PHASES[nextIndex] };
    }

    case "LOAD_PLACEMENTS":
      return withDirty(
        state,
        {
          placements: action.placements.map((p) => ({ ...p, dirty: false })),
          selectedPlacementId: null,
        },
        false,
        state.layoutDirty,
      );

    case "LOAD_LAYOUT":
      return withDirty(
        state,
        {
          shell: action.layout ? { ...action.layout.shell, dirty: false } : null,
          slots:
            action.layout?.slots.map<BuilderRoomSlotState>((slot) => ({ ...slot, dirty: false })) ??
            [],
          selectedSlotId: null,
          isShellSelected: false,
        },
        state.sceneDirty,
        false,
      );

    case "SELECT_PLACEMENT":
      return {
        ...state,
        selectedPlacementId: action.id,
        selectedSlotId: null,
        isShellSelected: false,
      };

    case "SELECT_SLOT":
      return {
        ...state,
        selectedPlacementId: null,
        selectedSlotId: action.id,
        isShellSelected: false,
      };

    case "SELECT_SHELL":
      return {
        ...state,
        selectedPlacementId: null,
        selectedSlotId: null,
        isShellSelected: true,
      };

    case "ADD_PLACEMENT":
      if (!canUsePlacement(state, action.placement)) {
        return state;
      }
      return withDirty(
        state,
        {
          placements: [...state.placements, action.placement],
          selectedPlacementId: action.placement.id,
          selectedSlotId: null,
          isShellSelected: false,
        },
        true,
        state.layoutDirty,
      );

    case "UPDATE_PLACEMENT": {
      let didChange = false;
      const placements = state.placements.map((p) => {
        if (p.id !== action.id) {
          return p;
        }

        const nextPlacement = { ...p, ...action.changes, dirty: true };
        if (!canUsePlacement(state, nextPlacement)) {
          return p;
        }

        didChange = true;
        return nextPlacement;
      });

      return didChange
        ? withDirty(
            state,
            {
              placements,
            },
            true,
            state.layoutDirty,
          )
        : state;
    }

    case "DELETE_PLACEMENT":
      return withDirty(
        state,
        {
          placements: state.placements.filter((p) => p.id !== action.id),
          selectedPlacementId:
            state.selectedPlacementId === action.id ? null : state.selectedPlacementId,
        },
        true,
        state.layoutDirty,
      );

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
      if (!canUsePlacement(state, dupe)) {
        return state;
      }
      return withDirty(
        state,
        {
          placements: [...state.placements, dupe],
          selectedPlacementId: dupe.id,
          selectedSlotId: null,
          isShellSelected: false,
        },
        true,
        state.layoutDirty,
      );
    }

    case "REORDER_PLACEMENT": {
      const idx = state.placements.findIndex((p) => p.id === action.id);
      if (idx < 0) return state;
      const swapIdx = action.direction === "up" ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= state.placements.length) return state;
      const next = [...state.placements];
      [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
      return withDirty(state, { placements: next }, true, state.layoutDirty);
    }

    case "MOVE_PLACEMENT": {
      let didChange = false;
      const placements = state.placements.map((p) => {
        if (p.id !== action.id) {
          return p;
        }

        const nextPlacement = { ...p, col: action.col, row: action.row, dirty: true };
        if (!canUsePlacement(state, nextPlacement)) {
          return p;
        }

        didChange = true;
        return nextPlacement;
      });

      return didChange
        ? withDirty(
            state,
            {
              placements,
            },
            true,
            state.layoutDirty,
          )
        : state;
    }

    case "NUDGE_PLACEMENT": {
      let didChange = false;
      const placements = state.placements.map((p) => {
        if (p.id !== action.id) {
          return p;
        }

        const nextPlacement = {
          ...p,
          col: p.col + action.dCol,
          row: p.row + action.dRow,
          dirty: true,
        };
        if (!canUsePlacement(state, nextPlacement)) {
          return p;
        }

        didChange = true;
        return nextPlacement;
      });

      return didChange
        ? withDirty(
            state,
            {
              placements,
            },
            true,
            state.layoutDirty,
          )
        : state;
    }

    case "ADD_SLOT":
      return withDirty(
        state,
        {
          slots: [...state.slots, action.slot],
          selectedSlotId: action.slot.slotId,
          selectedPlacementId: null,
          isShellSelected: false,
        },
        state.sceneDirty,
        true,
      );

    case "UPDATE_SLOT":
      return withDirty(
        state,
        {
          slots: state.slots.map((slot) =>
            slot.slotId === action.id ? { ...slot, ...action.changes, dirty: true } : slot,
          ),
        },
        state.sceneDirty,
        true,
      );

    case "DELETE_SLOT":
      return withDirty(
        state,
        {
          slots: state.slots.filter((slot) => slot.slotId !== action.id),
          selectedSlotId: state.selectedSlotId === action.id ? null : state.selectedSlotId,
        },
        state.sceneDirty,
        true,
      );

    case "DUPLICATE_SLOT": {
      const source = state.slots.find((slot) => slot.slotId === action.id);
      if (!source) return state;

      const duplicate: BuilderRoomSlotState = {
        ...source,
        slotId: `${source.slotId}-copy-${Date.now()}`,
        col: source.col + 1,
        row: source.row + 1,
        dirty: true,
      };

      return withDirty(
        state,
        {
          slots: [...state.slots, duplicate],
          selectedSlotId: duplicate.slotId,
          selectedPlacementId: null,
          isShellSelected: false,
        },
        state.sceneDirty,
        true,
      );
    }

    case "MOVE_SLOT":
      return withDirty(
        state,
        {
          slots: state.slots.map((slot) =>
            slot.slotId === action.id
              ? { ...slot, col: action.col, row: action.row, dirty: true }
              : slot,
          ),
        },
        state.sceneDirty,
        true,
      );

    case "NUDGE_SLOT":
      return withDirty(
        state,
        {
          slots: state.slots.map((slot) =>
            slot.slotId === action.id
              ? {
                  ...slot,
                  col: slot.col + action.dCol,
                  row: slot.row + action.dRow,
                  dirty: true,
                }
              : slot,
          ),
        },
        state.sceneDirty,
        true,
      );

    case "UPDATE_SHELL":
      if (!state.shell) return state;
      return withDirty(
        state,
        {
          shell: { ...state.shell, ...action.changes, dirty: true },
          selectedPlacementId: null,
          selectedSlotId: null,
          isShellSelected: true,
        },
        state.sceneDirty,
        true,
      );

    case "MOVE_SHELL":
      if (!state.shell) return state;
      return withDirty(
        state,
        { shell: { ...state.shell, col: action.col, row: action.row, dirty: true } },
        state.sceneDirty,
        true,
      );

    case "NUDGE_SHELL":
      if (!state.shell) return state;
      return withDirty(
        state,
        {
          shell: {
            ...state.shell,
            col: state.shell.col + action.dCol,
            row: state.shell.row + action.dRow,
            dirty: true,
          },
        },
        state.sceneDirty,
        true,
      );

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
      return withDirty(
        state,
        {
          placements:
            action.scope === "layout"
              ? state.placements
              : state.placements.map((placement) => ({ ...placement, dirty: false })),
          shell:
            action.scope === "scene"
              ? state.shell
              : state.shell
                ? { ...state.shell, dirty: false }
                : null,
          slots:
            action.scope === "scene"
              ? state.slots
              : state.slots.map((slot) => ({ ...slot, dirty: false })),
        },
        action.scope === "layout" ? state.sceneDirty : false,
        action.scope === "scene" ? state.layoutDirty : false,
      );

    default:
      return state;
  }
}

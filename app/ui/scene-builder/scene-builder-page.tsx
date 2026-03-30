/**
 * HQ Scene Builder — dedicated engine/editor route for HQ scene authoring.
 *
 * Edits the same canonical static-scene data used by runtime rendering.
 * Not a player-facing gameplay feature.
 */

import { useCallback, useEffect, useMemo, useReducer, useState } from "react";
import { Link, unstable_usePrompt as usePrompt, useBeforeUnload } from "react-router";

import {
  getBuildingFloors,
  getBuildingLayout,
  getBuildingLayoutDefinition,
} from "content/building-layouts";
import { getExteriorScene } from "render/hq-scene-data";

import { getLoadedEnvParts } from "../environment-parts";
import { glassPanelClass } from "../styles";

import type { BuilderMode, BuilderOverlays, SceneBuilderState } from "./builder-types";
import { builderReducer, INITIAL_STATE } from "./builder-state";
import { validateLayout, validatePlacements } from "./builder-validation";
import {
  downloadFile,
  exportAsJson,
  exportAsTypeScript,
  exportLayoutAsJson,
  exportLayoutAsTypeScript,
} from "./builder-export";
import { BuilderCanvas } from "./builder-canvas";
import { AssetBrowser } from "./asset-browser";
import { LayoutSidebar } from "./layout-sidebar";
import { LayoutToolsPanel } from "./layout-tools-panel";
import { RightSidebar } from "./placement-inspector";

const UNSAVED_CHANGES_MESSAGE = "Discard unsaved scene-builder changes?";

// ── Building / floor selectors ──────────────────────────────────────────

const BUILDINGS: { id: string; label: string }[] = [
  { id: "building/bodega", label: "Bodega" },
  { id: "building/porters", label: "Porter's" },
];

// ── Overlay toggle button ───────────────────────────────────────────────

function OverlayToggle({
  label,
  active,
  onToggle,
}: {
  label: string;
  active: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className={`rounded border px-2 py-1 text-xs font-medium uppercase tracking-wider transition-all ${
        active
          ? "border-gold/25 bg-gold/12 text-gold"
          : "border-gold/8 bg-transparent text-gold/30 hover:border-gold/15 hover:text-gold/50"
      }`}
    >
      {label}
    </button>
  );
}

// ── Export dialog ────────────────────────────────────────────────────────

function ExportDialog({
  state,
  elevationBandId,
  defaultKind,
  onClose,
  onMarkClean,
}: {
  state: SceneBuilderState;
  elevationBandId: string | null;
  defaultKind: BuilderMode;
  onClose: () => void;
  onMarkClean: (scope: "scene" | "layout") => void;
}) {
  const [kind, setKind] = useState<"scene" | "layout">(
    defaultKind === "layout" ? "layout" : "scene",
  );
  const [format, setFormat] = useState<"json" | "typescript">("typescript");
  const sceneId = `${state.buildingId.split("/")[1]}-exterior`;

  const content = useMemo(() => {
    if (kind === "layout") {
      if (!state.shell) {
        return "// No floor layout is loaded for the current selection.";
      }

      return format === "json"
        ? exportLayoutAsJson(
            state.buildingId,
            state.floorIndex,
            elevationBandId,
            state.shell,
            state.slots,
          )
        : exportLayoutAsTypeScript(
            state.buildingId,
            state.floorIndex,
            elevationBandId,
            state.shell,
            state.slots,
          );
    }

    return format === "json"
      ? exportAsJson(state.buildingId, sceneId, state.placements)
      : exportAsTypeScript(state.buildingId, sceneId, state.placements);
  }, [
    elevationBandId,
    format,
    kind,
    sceneId,
    state.buildingId,
    state.floorIndex,
    state.placements,
    state.shell,
    state.slots,
  ]);

  const handleDownload = () => {
    const ext = format === "json" ? "json" : "ts";
    const filename =
      kind === "layout"
        ? `${state.buildingId.split("/")[1]}-floor-${state.floorIndex}-layout.${ext}`
        : `${sceneId}-scene.${ext}`;
    const mimeType = format === "json" ? "application/json" : "text/typescript";
    downloadFile(content, filename, mimeType);
    onMarkClean(kind);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    onMarkClean(kind);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-void/80 backdrop-blur-sm">
      <div
        className={`${glassPanelClass} w-[700px] max-h-[80vh] flex flex-col rounded-xl border border-gold/15 shadow-[0_8px_32px_rgba(0,0,0,0.6)]`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gold/8 px-4 py-3">
          <h2 className="font-display text-sm font-medium text-gold">Export Scene Data</h2>
          <button onClick={onClose} className="text-xs text-gold/40 hover:text-gold/70">
            Close
          </button>
        </div>

        {/* Format tabs */}
        <div className="flex gap-2 border-b border-gold/8 px-4 py-2">
          <button
            onClick={() => setKind("scene")}
            className={`rounded px-3 py-1 text-xs ${
              kind === "scene" ? "bg-gold/12 text-gold" : "text-gold/40 hover:text-gold/60"
            }`}
          >
            Scene
          </button>
          <button
            onClick={() => setKind("layout")}
            className={`rounded px-3 py-1 text-xs ${
              kind === "layout" ? "bg-gold/12 text-gold" : "text-gold/40 hover:text-gold/60"
            }`}
          >
            Layout
          </button>
          <div className="mx-1 h-5 w-px bg-gold/10" />
          <button
            onClick={() => setFormat("json")}
            className={`rounded px-3 py-1 text-xs ${
              format === "json" ? "bg-gold/12 text-gold" : "text-gold/40 hover:text-gold/60"
            }`}
          >
            JSON
          </button>
          <button
            onClick={() => setFormat("typescript")}
            className={`rounded px-3 py-1 text-xs ${
              format === "typescript" ? "bg-gold/12 text-gold" : "text-gold/40 hover:text-gold/60"
            }`}
          >
            TypeScript
          </button>
        </div>

        {/* Content preview */}
        <div className="flex-1 overflow-auto p-4">
          <pre className="rounded-lg bg-void/60 p-3 text-xs leading-relaxed text-silver/70">
            {content}
          </pre>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 border-t border-gold/8 px-4 py-3">
          <button
            onClick={handleCopy}
            className="rounded border border-gold/15 bg-gold/5 px-4 py-1.5 text-xs text-gold/70 transition-colors hover:bg-gold/10 hover:text-gold"
          >
            Copy to Clipboard
          </button>
          <button
            onClick={handleDownload}
            className="rounded border border-gold/25 bg-gold/12 px-4 py-1.5 text-xs font-medium text-gold transition-colors hover:bg-gold/20"
          >
            Download .{format === "json" ? "json" : "ts"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main page ───────────────────────────────────────────────────────────

export function SceneBuilderPage() {
  const [state, dispatch] = useReducer(builderReducer, INITIAL_STATE);
  const [showExport, setShowExport] = useState(false);

  usePrompt({
    message: UNSAVED_CHANGES_MESSAGE,
    when: ({ currentLocation, nextLocation }) =>
      state.isDirty && currentLocation.pathname !== nextLocation.pathname,
  });

  useBeforeUnload(
    useCallback(
      (event) => {
        if (!state.isDirty) {
          return;
        }

        event.preventDefault();
        event.returnValue = UNSAVED_CHANGES_MESSAGE;
      },
      [state.isDirty],
    ),
  );

  // Load initial placements from canonical scene data
  useEffect(() => {
    const scene = getExteriorScene(state.buildingId);
    if (scene) {
      dispatch({ type: "LOAD_PLACEMENTS", placements: [...scene.placements] });
    } else {
      dispatch({ type: "LOAD_PLACEMENTS", placements: [] });
    }
  }, [state.buildingId]);

  const canonicalLayout = useMemo(
    () => getBuildingLayout(state.buildingId, state.floorIndex, state.buildingTier),
    [state.buildingId, state.floorIndex, state.buildingTier],
  );

  useEffect(() => {
    dispatch({ type: "LOAD_LAYOUT", layout: canonicalLayout ?? null });
  }, [canonicalLayout]);

  const allParts = useMemo(() => getLoadedEnvParts(state.buildingId), [state.buildingId]);
  const layoutDefinition = useMemo(
    () => getBuildingLayoutDefinition(state.buildingId),
    [state.buildingId],
  );
  const stageOptions = useMemo(
    () =>
      [...(layoutDefinition?.stages ?? [])].sort(
        (left, right) => left.minimumTier - right.minimumTier,
      ),
    [layoutDefinition],
  );

  const workingLayout = useMemo(
    () =>
      state.shell
        ? {
            floorIndex: state.floorIndex,
            elevationBandId: canonicalLayout?.elevationBandId ?? null,
            shell: state.shell,
            slots: state.slots,
          }
        : undefined,
    [canonicalLayout?.elevationBandId, state.floorIndex, state.shell, state.slots],
  );

  useEffect(() => {
    const warnings = [
      ...validatePlacements(state.placements, allParts, workingLayout),
      ...validateLayout(state.shell, state.slots),
    ];
    dispatch({ type: "SET_WARNINGS", warnings });
  }, [allParts, state.placements, state.shell, state.slots, workingLayout]);

  // Floor options
  const floors = useMemo(
    () => getBuildingFloors(state.buildingId, state.buildingTier),
    [state.buildingId, state.buildingTier],
  );

  const handleMarkClean = useCallback((scope: "scene" | "layout") => {
    dispatch({ type: "MARK_CLEAN", scope });
  }, []);

  const confirmDiscardChanges = useCallback(() => {
    return !state.isDirty || window.confirm(UNSAVED_CHANGES_MESSAGE);
  }, [state.isDirty]);

  const handleBuildingChange = useCallback(
    (nextBuildingId: string) => {
      if (nextBuildingId === state.buildingId || !confirmDiscardChanges()) {
        return;
      }

      dispatch({ type: "SET_BUILDING", buildingId: nextBuildingId });
    },
    [confirmDiscardChanges, state.buildingId],
  );

  const handleFloorChange = useCallback(
    (nextFloorIndex: number) => {
      if (nextFloorIndex === state.floorIndex || !confirmDiscardChanges()) {
        return;
      }

      dispatch({ type: "SET_FLOOR", floorIndex: nextFloorIndex });
    },
    [confirmDiscardChanges, state.floorIndex],
  );

  const handleTierChange = useCallback(
    (nextTier: number) => {
      if (nextTier === state.buildingTier || !confirmDiscardChanges()) {
        return;
      }

      dispatch({ type: "SET_BUILDING_TIER", buildingTier: nextTier });
    },
    [confirmDiscardChanges, state.buildingTier],
  );

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-void text-silver">
      {/* ── Top toolbar ─────────────────────────────────────────────── */}
      <header
        className={`${glassPanelClass} flex items-center gap-3 border-b border-gold/10 px-4 py-2`}
      >
        {/* Logo / title */}
        <Link
          to="/"
          className="font-display text-sm font-light tracking-[0.2em] text-gold/60 transition-colors hover:text-gold"
        >
          ASCENSION
        </Link>
        <div className="h-4 w-px bg-gold/15" />
        <h1 className="font-display text-sm font-medium tracking-[0.15em] text-gold">
          SCENE BUILDER
        </h1>

        <div className="h-4 w-px bg-gold/15" />

        {/* Building selector */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs uppercase tracking-wider text-gold/35">Building</span>
          <select
            value={state.buildingId}
            onChange={(e) => handleBuildingChange(e.target.value)}
            className="rounded border border-gold/15 bg-void/60 px-2 py-1 text-xs text-silver focus:border-gold/30 focus:outline-none"
          >
            {BUILDINGS.map((b) => (
              <option key={b.id} value={b.id}>
                {b.label}
              </option>
            ))}
          </select>
        </div>

        {/* Floor selector */}
        {floors.length > 1 && (
          <>
            <div className="h-4 w-px bg-gold/15" />
            <div className="flex items-center gap-1.5">
              <span className="text-xs uppercase tracking-wider text-gold/35">Floor</span>
              <select
                value={state.floorIndex}
                onChange={(e) => handleFloorChange(Number(e.target.value))}
                className="rounded border border-gold/15 bg-void/60 px-2 py-1 text-xs text-silver focus:border-gold/30 focus:outline-none"
              >
                {floors.map((f) => (
                  <option key={f.floorIndex} value={f.floorIndex}>
                    {f.elevationBandId ?? `Floor ${f.floorIndex}`}
                  </option>
                ))}
              </select>
            </div>
          </>
        )}

        <div className="h-4 w-px bg-gold/15" />

        {stageOptions.length > 1 && (
          <>
            <div className="flex items-center gap-1.5">
              <span className="text-xs uppercase tracking-wider text-gold/35">Stage</span>
              <select
                value={state.buildingTier}
                onChange={(e) => handleTierChange(Number(e.target.value))}
                className="rounded border border-gold/15 bg-void/60 px-2 py-1 text-xs text-silver focus:border-gold/30 focus:outline-none"
              >
                {stageOptions.map((stage) => (
                  <option key={stage.stageId} value={stage.minimumTier}>
                    {stage.stageId.split("/").pop()?.replace(/-/g, " ") ?? stage.stageId} (tier{" "}
                    {stage.minimumTier})
                  </option>
                ))}
              </select>
            </div>
            <div className="h-4 w-px bg-gold/15" />
          </>
        )}

        {/* Overlay toggles */}
        <div className="flex items-center gap-1">
          {(Object.keys(state.overlays) as (keyof BuilderOverlays)[]).map((key) => (
            <OverlayToggle
              key={key}
              label={key}
              active={state.overlays[key]}
              onToggle={() => dispatch({ type: "TOGGLE_OVERLAY", overlay: key })}
            />
          ))}
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Status indicators */}
        {state.isDirty && (
          <span className="flex items-center gap-1.5 text-xs text-ember/70">
            <span className="h-1.5 w-1.5 rounded-full bg-ember/60" />
            Unsaved changes
          </span>
        )}

        <span className="text-xs tabular-nums text-gold/25">
          {state.placements.length} placements
        </span>
        <span className="text-xs tabular-nums text-gold/25">{state.slots.length} slots</span>

        {state.warnings.length > 0 && (
          <span className="text-xs text-ember/50">
            {state.warnings.length} warning{state.warnings.length !== 1 ? "s" : ""}
          </span>
        )}

        {/* Export */}
        <button
          onClick={() => setShowExport(true)}
          className="rounded border border-gold/25 bg-gold/10 px-3 py-1.5 text-xs font-medium text-gold transition-colors hover:bg-gold/20"
        >
          Export
        </button>

        <div className="flex gap-1">
          {(["scene", "layout"] as BuilderMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => dispatch({ type: "SET_EDITOR_MODE", mode })}
              className={`rounded px-2 py-1 text-xs uppercase tracking-[0.12em] ${
                state.editorMode === mode
                  ? "bg-gold/12 text-gold"
                  : "text-gold/35 hover:bg-gold/5 hover:text-gold/55"
              }`}
            >
              {mode}
            </button>
          ))}
        </div>

        {/* Tool links */}
        <div className="flex gap-1">
          <Link
            to="/svg-playground"
            className="rounded px-2 py-1 text-xs text-gold/30 transition-colors hover:bg-gold/5 hover:text-gold/50"
          >
            SVG Playground
          </Link>
          <Link
            to="/game"
            className="rounded px-2 py-1 text-xs text-gold/30 transition-colors hover:bg-gold/5 hover:text-gold/50"
          >
            Game
          </Link>
        </div>
      </header>

      {/* ── Main content area ───────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar: Asset browser */}
        <aside
          className={`${glassPanelClass} w-64 flex-shrink-0 border-r border-gold/8 overflow-hidden`}
        >
          {state.editorMode === "scene" ? (
            <AssetBrowser buildingId={state.buildingId} shell={state.shell} dispatch={dispatch} />
          ) : (
            <LayoutToolsPanel state={state} dispatch={dispatch} />
          )}
        </aside>

        {/* Center: Canvas */}
        <main className="relative flex-1 overflow-hidden">
          <BuilderCanvas state={state} dispatch={dispatch} />

          {/* Canvas HUD overlay */}
          <div className="pointer-events-none absolute bottom-3 left-3 flex items-center gap-2">
            <span className="rounded bg-void/60 px-2 py-1 text-xs tabular-nums text-gold/30 backdrop-blur-sm">
              Zoom: {(state.camera.zoom * 100).toFixed(0)}%
            </span>
            <span className="rounded bg-void/60 px-2 py-1 text-xs text-gold/20 backdrop-blur-sm">
              Right-drag to pan | Scroll to zoom at cursor | Click+drag to move
            </span>
          </div>
        </main>

        {/* Right sidebar: Inspector + Placements */}
        <aside
          className={`${glassPanelClass} w-72 flex-shrink-0 border-l border-gold/8 overflow-hidden`}
        >
          {state.editorMode === "scene" ? (
            <RightSidebar state={state} dispatch={dispatch} />
          ) : (
            <LayoutSidebar state={state} dispatch={dispatch} />
          )}
        </aside>
      </div>

      {/* Export dialog */}
      {showExport && (
        <ExportDialog
          state={state}
          elevationBandId={canonicalLayout?.elevationBandId ?? null}
          defaultKind={state.editorMode}
          onClose={() => setShowExport(false)}
          onMarkClean={handleMarkClean}
        />
      )}
    </div>
  );
}

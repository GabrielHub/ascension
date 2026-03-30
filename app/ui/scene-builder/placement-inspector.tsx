/**
 * Placement inspector — selection properties editor and placement list.
 */

import { useEffect, useState } from "react";

import type { HqPlacementAnchor } from "render/types";

import type {
  BuilderAction,
  BuilderPlacement,
  BuilderWarning,
  SceneBuilderState,
} from "./builder-types";
import { glassPanelSubtleClass } from "../styles";

// ── Number input with label ─────────────────────────────────────────────

function PropField({
  label,
  value,
  step = 1,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  step?: number;
  min?: number;
  max?: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <label className="w-16 text-right text-xs uppercase tracking-wider text-gold/40">
        {label}
      </label>
      <input
        type="number"
        value={value}
        step={step}
        min={min}
        max={max}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full rounded border border-gold/10 bg-void/60 px-2 py-1 text-xs tabular-nums text-silver focus:border-gold/30 focus:outline-none"
      />
    </div>
  );
}

// ── Anchor mode selector ────────────────────────────────────────────────

const ANCHOR_OPTIONS: { value: HqPlacementAnchor; label: string }[] = [
  { value: "iso-bottom", label: "Iso Bottom" },
  { value: "iso-center", label: "Iso Center" },
  { value: "scene-origin", label: "Scene Origin" },
];

function AnchorSelect({
  value,
  onChange,
}: {
  value: HqPlacementAnchor;
  onChange: (v: HqPlacementAnchor) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <label className="w-16 text-right text-xs uppercase tracking-wider text-gold/40">
        Anchor
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as HqPlacementAnchor)}
        className="w-full rounded border border-gold/10 bg-void/60 px-2 py-1 text-xs text-silver focus:border-gold/30 focus:outline-none"
      >
        {ANCHOR_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

// ── Selection inspector ─────────────────────────────────────────────────

function SelectionInspector({
  placement,
  dispatch,
}: {
  placement: BuilderPlacement;
  dispatch: React.Dispatch<BuilderAction>;
}) {
  const update = (changes: Partial<BuilderPlacement>) => {
    dispatch({ type: "UPDATE_PLACEMENT", id: placement.id, changes });
  };

  return (
    <div className="space-y-3 p-3">
      {/* ID display */}
      <div>
        <div className="mb-1 text-xs uppercase tracking-wider text-gold/40">Placement ID</div>
        <div className="truncate rounded bg-void/40 px-2 py-1 text-xs text-silver/70">
          {placement.id}
        </div>
      </div>

      {/* Asset info */}
      <div>
        <div className="mb-1 text-xs uppercase tracking-wider text-gold/40">Asset</div>
        <div className="truncate rounded bg-void/40 px-2 py-1 text-xs text-frost/70">
          {placement.assetId}
        </div>
      </div>

      {/* Kind badge */}
      <div className="flex items-center gap-2">
        <span className="text-xs uppercase tracking-wider text-gold/40">Kind</span>
        <span className="rounded bg-gold/10 px-1.5 py-0.5 text-xs text-gold/60">
          {placement.kind}
        </span>
        {placement.dirty && (
          <span className="rounded bg-ember/10 px-1.5 py-0.5 text-xs text-ember/60">modified</span>
        )}
      </div>

      <div className="border-t border-gold/8 pt-3" />

      {/* Position */}
      <div className="text-xs uppercase tracking-wider text-gold/50">Position</div>
      <div className="grid grid-cols-2 gap-2">
        <PropField
          label="Col"
          value={placement.col}
          step={0.5}
          onChange={(v) => update({ col: v })}
        />
        <PropField
          label="Row"
          value={placement.row}
          step={0.5}
          onChange={(v) => update({ row: v })}
        />
      </div>

      <AnchorSelect value={placement.anchorMode} onChange={(v) => update({ anchorMode: v })} />

      <div className="border-t border-gold/8 pt-3" />

      {/* Visual properties */}
      <div className="text-xs uppercase tracking-wider text-gold/50">Visual</div>
      <PropField
        label="Scale"
        value={placement.scale}
        step={0.05}
        min={0.01}
        max={10}
        onChange={(v) => update({ scale: v })}
      />
      <PropField
        label="Opacity"
        value={placement.opacity}
        step={0.05}
        min={0}
        max={1}
        onChange={(v) => update({ opacity: v })}
      />
      <PropField
        label="Z-Index"
        value={placement.zIndex}
        step={1}
        min={0}
        max={100}
        onChange={(v) => update({ zIndex: v })}
      />

      <div className="border-t border-gold/8 pt-3" />

      {/* Fine offset */}
      <div className="text-xs uppercase tracking-wider text-gold/50">Fine Offset (px)</div>
      <div className="grid grid-cols-2 gap-2">
        <PropField
          label="X"
          value={placement.offsetX ?? 0}
          step={1}
          onChange={(v) => update({ offsetX: v })}
        />
        <PropField
          label="Y"
          value={placement.offsetY ?? 0}
          step={1}
          onChange={(v) => update({ offsetY: v })}
        />
      </div>

      {/* Footprint (optional metadata) */}
      <div className="border-t border-gold/8 pt-3" />
      <div className="text-xs uppercase tracking-wider text-gold/50">Footprint (metadata)</div>
      <div className="grid grid-cols-2 gap-2">
        <PropField
          label="Cols"
          value={placement.footprintCols ?? 1}
          step={1}
          min={1}
          onChange={(v) => update({ footprintCols: v })}
        />
        <PropField
          label="Rows"
          value={placement.footprintRows ?? 1}
          step={1}
          min={1}
          onChange={(v) => update({ footprintRows: v })}
        />
      </div>

      <div className="border-t border-gold/8 pt-3" />

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={() => dispatch({ type: "DUPLICATE_PLACEMENT", id: placement.id })}
          className="flex-1 rounded border border-gold/15 bg-gold/5 px-2 py-1.5 text-xs text-gold/70 transition-colors hover:bg-gold/10 hover:text-gold"
        >
          Duplicate
        </button>
        <button
          onClick={() => dispatch({ type: "DELETE_PLACEMENT", id: placement.id })}
          className="flex-1 rounded border border-danger/20 bg-danger/5 px-2 py-1.5 text-xs text-danger/70 transition-colors hover:bg-danger/10 hover:text-danger"
        >
          Delete
        </button>
      </div>

      {/* Keyboard shortcuts hint */}
      <div className="space-y-0.5 rounded bg-void/30 p-2 text-xs text-gold/25">
        <div>Arrow keys = nudge (Shift = 0.25)</div>
        <div>Ctrl+D = duplicate</div>
        <div>Delete = remove</div>
        <div>Esc = deselect</div>
      </div>
    </div>
  );
}

// ── Placement list ──────────────────────────────────────────────────────

function PlacementList({
  state,
  dispatch,
}: {
  state: SceneBuilderState;
  dispatch: React.Dispatch<BuilderAction>;
}) {
  if (state.placements.length === 0) {
    return (
      <div className="p-4 text-center text-xs text-gold/25">
        No placements yet. Use the asset browser to place assets.
      </div>
    );
  }

  return (
    <div className="space-y-px p-1">
      {state.placements.map((p, idx) => (
        <div
          key={p.id}
          role="button"
          tabIndex={0}
          onClick={() => dispatch({ type: "SELECT_PLACEMENT", id: p.id })}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ")
              dispatch({ type: "SELECT_PLACEMENT", id: p.id });
          }}
          className={`${glassPanelSubtleClass} group flex w-full cursor-pointer items-center gap-2 rounded-lg p-2 text-left transition-all ${
            state.selectedPlacementId === p.id
              ? "border-gold/25 bg-gold/8"
              : "hover:border-gold/10 hover:bg-gold/3"
          }`}
        >
          <div className="flex h-6 w-6 items-center justify-center rounded bg-void/40 text-xs tabular-nums text-gold/30">
            {idx + 1}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1">
              <span className="truncate text-xs text-silver/80">{p.assetId.split("/").pop()}</span>
              {p.dirty && <span className="h-1.5 w-1.5 rounded-full bg-ember/60" />}
            </div>
            <div className="text-xs text-gold/25">
              ({p.col}, {p.row}) z:{p.zIndex}
            </div>
          </div>
          <div className="flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
            <button
              onClick={(e) => {
                e.stopPropagation();
                dispatch({ type: "REORDER_PLACEMENT", id: p.id, direction: "up" });
              }}
              className="rounded px-1 py-0.5 text-xs text-gold/30 hover:bg-gold/10 hover:text-gold/60"
              title="Move up in list"
            >
              ^
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                dispatch({ type: "REORDER_PLACEMENT", id: p.id, direction: "down" });
              }}
              className="rounded px-1 py-0.5 text-xs text-gold/30 hover:bg-gold/10 hover:text-gold/60"
              title="Move down in list"
            >
              v
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Warnings panel ──────────────────────────────────────────────────────

function WarningsPanel({
  warnings,
  dispatch,
}: {
  warnings: BuilderWarning[];
  dispatch: React.Dispatch<BuilderAction>;
}) {
  if (warnings.length === 0) {
    return <div className="p-3 text-center text-xs text-gold/25">No warnings</div>;
  }

  const levelColors = {
    error: "border-danger/30 bg-danger/8 text-danger/80",
    warning: "border-ember/30 bg-ember/8 text-ember/80",
    info: "border-frost/20 bg-frost/5 text-frost/60",
  };

  return (
    <div className="space-y-1 p-2">
      {warnings.map((w) => (
        <button
          key={w.id}
          onClick={() => {
            if (w.placementId) {
              dispatch({ type: "SELECT_PLACEMENT", id: w.placementId });
            }
          }}
          className={`w-full rounded border p-2 text-left text-xs leading-relaxed ${levelColors[w.level]}`}
        >
          <span className="font-medium uppercase">{w.level}</span>: {w.message}
        </button>
      ))}
    </div>
  );
}

// ── Right sidebar ───────────────────────────────────────────────────────

type RightTab = "placements" | "inspector" | "warnings";

interface RightSidebarProps {
  state: SceneBuilderState;
  dispatch: React.Dispatch<BuilderAction>;
}

export function RightSidebar({ state, dispatch }: RightSidebarProps) {
  const selected = state.placements.find((p) => p.id === state.selectedPlacementId) ?? null;
  const [overrideTab, setOverrideTab] = useState<RightTab | null>(null);

  // Auto-switch to inspector when selection changes; clear manual override
  useEffect(() => {
    if (selected) setOverrideTab(null);
  }, [selected]);

  const activeTab: RightTab = overrideTab ?? (selected ? "inspector" : "placements");

  return (
    <div className="flex h-full flex-col">
      {/* Tab bar */}
      <div className="flex border-b border-gold/8">
        {(["placements", "inspector", "warnings"] as RightTab[]).map((tab) => {
          const isActive = tab === activeTab;
          const count =
            tab === "warnings"
              ? state.warnings.length
              : tab === "placements"
                ? state.placements.length
                : 0;
          return (
            <button
              key={tab}
              onClick={() => {
                if (tab === "placements") {
                  dispatch({ type: "SELECT_PLACEMENT", id: null });
                  setOverrideTab(null);
                } else {
                  setOverrideTab(tab);
                }
              }}
              className={`flex-1 border-b-2 px-2 py-2 text-xs font-medium uppercase tracking-[0.12em] transition-colors ${
                isActive
                  ? "border-b-gold text-gold"
                  : "border-b-transparent text-gold/40 hover:text-gold/60"
              }`}
            >
              {tab}
              {count > 0 && (
                <span
                  className={`ml-1 text-xs ${tab === "warnings" && count > 0 ? "text-ember/60" : "text-gold/30"}`}
                >
                  ({count})
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === "inspector" && selected ? (
          <SelectionInspector placement={selected} dispatch={dispatch} />
        ) : activeTab === "warnings" ? (
          <WarningsPanel warnings={state.warnings} dispatch={dispatch} />
        ) : (
          <PlacementList state={state} dispatch={dispatch} />
        )}
      </div>
    </div>
  );
}

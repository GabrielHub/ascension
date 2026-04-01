import { useEffect, useState } from "react";

import type {
  BuilderAction,
  BuilderRoomSlotState,
  BuilderWarning,
  SceneBuilderState,
} from "./builder-types";
import { glassPanelSubtleClass } from "../styles";

function NumberField({
  label,
  value,
  step = 1,
  min,
  onChange,
}: {
  label: string;
  value: number;
  step?: number;
  min?: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <label className="w-16 text-right text-xs uppercase tracking-wider text-gold/60">
        {label}
      </label>
      <input
        type="number"
        value={value}
        step={step}
        min={min}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full rounded border border-gold/10 bg-void/60 px-2 py-1 text-xs tabular-nums text-silver focus:border-gold/30 focus:outline-none"
      />
    </div>
  );
}

function TextField({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <label className="w-16 text-right text-xs uppercase tracking-wider text-gold/60">
        {label}
      </label>
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded border border-gold/10 bg-void/60 px-2 py-1 text-xs text-silver focus:border-gold/30 focus:outline-none"
      />
    </div>
  );
}

function LayoutWarningsPanel({
  warnings,
  dispatch,
}: {
  warnings: BuilderWarning[];
  dispatch: React.Dispatch<BuilderAction>;
}) {
  if (warnings.length === 0) {
    return <div className="p-3 text-center text-xs text-gold/50">No warnings</div>;
  }

  const levelColors = {
    error: "border-danger/30 bg-danger/8 text-danger/80",
    warning: "border-ember/30 bg-ember/8 text-ember/80",
    info: "border-frost/20 bg-frost/5 text-frost/60",
  };

  return (
    <div className="space-y-1 p-2">
      {warnings.map((warning) => (
        <button
          key={warning.id}
          onClick={() => {
            if (warning.targetType === "shell") {
              dispatch({ type: "SELECT_SHELL" });
            } else if (warning.targetType === "slot" && warning.targetId) {
              dispatch({ type: "SELECT_SLOT", id: warning.targetId });
            } else if (warning.targetType === "placement" && warning.targetId) {
              dispatch({ type: "SELECT_PLACEMENT", id: warning.targetId });
            }
          }}
          className={`w-full rounded border p-2 text-left text-xs leading-relaxed ${levelColors[warning.level]}`}
        >
          <span className="font-medium uppercase">{warning.level}</span>: {warning.message}
        </button>
      ))}
    </div>
  );
}

function ShellInspector({
  state,
  dispatch,
}: {
  state: SceneBuilderState;
  dispatch: React.Dispatch<BuilderAction>;
}) {
  if (!state.shell) {
    return <div className="p-4 text-center text-xs text-gold/50">No shell loaded</div>;
  }

  return (
    <div className="space-y-3 p-3">
      <div className="rounded bg-void/30 px-2 py-1 text-xs text-silver/70">Shell footprint</div>

      <div className="grid grid-cols-2 gap-2">
        <NumberField
          label="Col"
          value={state.shell.col}
          onChange={(value) => dispatch({ type: "UPDATE_SHELL", changes: { col: value } })}
        />
        <NumberField
          label="Row"
          value={state.shell.row}
          onChange={(value) => dispatch({ type: "UPDATE_SHELL", changes: { row: value } })}
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <NumberField
          label="Cols"
          value={state.shell.cols}
          min={1}
          onChange={(value) => dispatch({ type: "UPDATE_SHELL", changes: { cols: value } })}
        />
        <NumberField
          label="Rows"
          value={state.shell.rows}
          min={1}
          onChange={(value) => dispatch({ type: "UPDATE_SHELL", changes: { rows: value } })}
        />
      </div>

      <div className="rounded bg-void/30 p-2 text-xs text-gold/50">
        Arrow keys nudge the selected shell one tile at a time.
      </div>
    </div>
  );
}

function SlotInspector({
  slot,
  dispatch,
}: {
  slot: BuilderRoomSlotState;
  dispatch: React.Dispatch<BuilderAction>;
}) {
  const update = (changes: Partial<BuilderRoomSlotState>) => {
    dispatch({ type: "UPDATE_SLOT", id: slot.slotId, changes });
  };

  return (
    <div className="space-y-3 p-3">
      <div className="rounded bg-void/30 px-2 py-1 text-xs text-silver/70">{slot.slotId}</div>

      <TextField label="ID" value={slot.slotId} onChange={(value) => update({ slotId: value })} />

      <div className="grid grid-cols-2 gap-2">
        <NumberField label="Col" value={slot.col} onChange={(value) => update({ col: value })} />
        <NumberField label="Row" value={slot.row} onChange={(value) => update({ row: value })} />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <NumberField
          label="Cols"
          value={slot.cols}
          min={1}
          onChange={(value) => update({ cols: value })}
        />
        <NumberField
          label="Rows"
          value={slot.rows}
          min={1}
          onChange={(value) => update({ rows: value })}
        />
      </div>

      <TextField
        label="Template"
        value={slot.startingTemplateId ?? ""}
        placeholder="room/example:tier_1"
        onChange={(value) => update({ startingTemplateId: value || undefined })}
      />

      <div className="flex gap-2">
        <button
          onClick={() => dispatch({ type: "DUPLICATE_SLOT", id: slot.slotId })}
          className="flex-1 rounded border border-gold/15 bg-gold/5 px-2 py-1.5 text-xs text-gold/70 transition-colors hover:bg-gold/10 hover:text-gold"
        >
          Duplicate
        </button>
        <button
          onClick={() => dispatch({ type: "DELETE_SLOT", id: slot.slotId })}
          className="flex-1 rounded border border-danger/20 bg-danger/5 px-2 py-1.5 text-xs text-danger/70 transition-colors hover:bg-danger/10 hover:text-danger"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

function LayoutList({
  state,
  dispatch,
}: {
  state: SceneBuilderState;
  dispatch: React.Dispatch<BuilderAction>;
}) {
  return (
    <div className="space-y-px p-1">
      {state.shell && (
        <button
          onClick={() => dispatch({ type: "SELECT_SHELL" })}
          className={`${glassPanelSubtleClass} flex w-full items-center justify-between rounded-lg p-2 text-left ${
            state.isShellSelected
              ? "border-gold/25 bg-gold/8"
              : "hover:border-gold/10 hover:bg-gold/3"
          }`}
        >
          <div>
            <div className="text-xs text-silver/80">Shell footprint</div>
            <div className="text-xs text-gold/50">
              {state.shell.cols}x{state.shell.rows} at {state.shell.col},{state.shell.row}
            </div>
          </div>
          {state.shell.dirty && <span className="h-1.5 w-1.5 rounded-full bg-ember/60" />}
        </button>
      )}

      {state.slots.length === 0 ? (
        <div className="p-4 text-center text-xs text-gold/50">No room slots yet</div>
      ) : (
        state.slots.map((slot) => (
          <button
            key={slot.slotId}
            onClick={() => dispatch({ type: "SELECT_SLOT", id: slot.slotId })}
            className={`${glassPanelSubtleClass} flex w-full items-center justify-between rounded-lg p-2 text-left ${
              state.selectedSlotId === slot.slotId
                ? "border-frost/25 bg-frost/8"
                : "hover:border-frost/10 hover:bg-frost/3"
            }`}
          >
            <div className="min-w-0">
              <div className="truncate text-xs text-silver/80">{slot.slotId}</div>
              <div className="text-xs text-gold/50">
                {slot.cols}x{slot.rows} at {slot.col},{slot.row}
              </div>
            </div>
            {slot.dirty && <span className="h-1.5 w-1.5 rounded-full bg-ember/60" />}
          </button>
        ))
      )}
    </div>
  );
}

type LayoutTab = "layout" | "inspector" | "warnings";

interface LayoutSidebarProps {
  state: SceneBuilderState;
  dispatch: React.Dispatch<BuilderAction>;
}

export function LayoutSidebar({ state, dispatch }: LayoutSidebarProps) {
  const selectedSlot = state.slots.find((slot) => slot.slotId === state.selectedSlotId) ?? null;
  const hasSelection = state.isShellSelected || selectedSlot !== null;
  const [overrideTab, setOverrideTab] = useState<LayoutTab | null>(null);

  useEffect(() => {
    if (hasSelection) {
      setOverrideTab(null);
    }
  }, [hasSelection]);

  const activeTab: LayoutTab = overrideTab ?? (hasSelection ? "inspector" : "layout");

  return (
    <div className="flex h-full flex-col">
      <div className="flex border-b border-gold/8">
        {(["layout", "inspector", "warnings"] as LayoutTab[]).map((tab) => {
          const count =
            tab === "layout"
              ? state.slots.length + (state.shell ? 1 : 0)
              : tab === "warnings"
                ? state.warnings.length
                : 0;
          const isActive = tab === activeTab;

          return (
            <button
              key={tab}
              onClick={() => setOverrideTab(tab)}
              className={`flex-1 border-b-2 px-1.5 py-2 text-xs font-medium uppercase tracking-[0.08em] transition-colors ${
                isActive
                  ? "border-b-gold text-gold"
                  : "border-b-transparent text-gold/50 hover:text-gold/70"
              }`}
            >
              {tab}
              {count > 0 && <span className="ml-1 text-xs text-gold/50">({count})</span>}
            </button>
          );
        })}
      </div>

      <div className="flex-1 overflow-y-auto">
        {activeTab === "warnings" ? (
          <LayoutWarningsPanel warnings={state.warnings} dispatch={dispatch} />
        ) : activeTab === "layout" ? (
          <LayoutList state={state} dispatch={dispatch} />
        ) : state.isShellSelected ? (
          <ShellInspector state={state} dispatch={dispatch} />
        ) : selectedSlot ? (
          <SlotInspector slot={selectedSlot} dispatch={dispatch} />
        ) : (
          <div className="p-4 text-center text-xs text-gold/50">
            Select shell or slot to inspect
          </div>
        )}
      </div>
    </div>
  );
}

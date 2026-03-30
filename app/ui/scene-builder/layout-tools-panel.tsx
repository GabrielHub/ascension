import type { BuilderAction, SceneBuilderState } from "./builder-types";
import { createSlot } from "./builder-types";

interface LayoutToolsPanelProps {
  state: SceneBuilderState;
  dispatch: React.Dispatch<BuilderAction>;
}

export function LayoutToolsPanel({ state, dispatch }: LayoutToolsPanelProps) {
  const shell = state.shell;

  const handleAddSlot = () => {
    const col = shell ? shell.col : 0;
    const row = shell ? shell.row : 0;
    dispatch({ type: "ADD_SLOT", slot: createSlot(col, row) });
  };

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-gold/8 px-3 py-2">
        <h3 className="font-display text-xs font-medium uppercase tracking-[0.15em] text-gold/80">
          Layout Tools
        </h3>
      </div>

      <div className="space-y-3 p-3 text-xs text-gold/35">
        <p>
          Edit the canonical shell footprint and room-slot layout for the current building stage and
          floor.
        </p>

        <button
          onClick={() => dispatch({ type: "SELECT_SHELL" })}
          className="w-full rounded border border-gold/15 bg-gold/5 px-3 py-2 text-left text-xs text-gold/70 transition-colors hover:bg-gold/10 hover:text-gold"
        >
          Select shell footprint
        </button>

        <button
          onClick={handleAddSlot}
          className="w-full rounded border border-frost/20 bg-frost/5 px-3 py-2 text-left text-xs text-frost/70 transition-colors hover:bg-frost/10 hover:text-frost"
        >
          Add room slot
        </button>

        <div className="rounded bg-void/30 p-3">
          <div className="text-xs uppercase tracking-[0.14em] text-gold/45">Current Floor</div>
          <div className="mt-2 text-silver/70">
            Shell: {shell ? `${shell.cols}x${shell.rows} at ${shell.col},${shell.row}` : "None"}
          </div>
          <div className="mt-1 text-silver/70">Slots: {state.slots.length}</div>
        </div>

        <div className="rounded bg-void/30 p-3">
          <div className="text-xs uppercase tracking-[0.14em] text-gold/45">Layout Workflow</div>
          <div className="mt-2 space-y-1 text-gold/30">
            <div>Click shell or room overlays to inspect them.</div>
            <div>Drag selected shell or slots on the canvas to reposition them.</div>
            <div>Use the inspector to resize, rename, and export canonical floor data.</div>
          </div>
        </div>
      </div>
    </div>
  );
}

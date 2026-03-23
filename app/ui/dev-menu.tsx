import type { RuntimeSession } from "app/features/runtime";

const HOUR_MS = 60 * 60 * 1000;

interface DevMenuOverlayProps {
  session: RuntimeSession;
  onClose: () => void;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-[0.6875rem] font-medium uppercase tracking-[0.2em] text-gold/60">
      {children}
    </h3>
  );
}

function CheatButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" className="btn-ghost px-2.5 py-1 text-xs" onClick={onClick}>
      {label}
    </button>
  );
}

function ResourceRow({
  label,
  value,
  onAdd,
}: {
  label: string;
  value: number;
  onAdd: (delta: number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-baseline gap-2">
        <span className="text-xs font-medium uppercase tracking-[0.15em] text-silver/70">
          {label}
        </span>
        <span className="font-[family-name:var(--font-display)] text-sm font-light tabular-nums text-silver-bright">
          {value}
        </span>
      </div>
      <div className="flex gap-1">
        <CheatButton label="+100" onClick={() => onAdd(100)} />
        <CheatButton label="+1k" onClick={() => onAdd(1000)} />
        <CheatButton label="+10k" onClick={() => onAdd(10000)} />
      </div>
    </div>
  );
}

export function DevMenuOverlay({ session, onClose }: DevMenuOverlayProps) {
  const { resources, clock } = session.phase1View;

  function setResource(
    resourceId: "resource/cash" | "resource/reputation" | "resource/intel",
    amount: number,
  ) {
    void session.commands.dispatch({ type: "sim/dev-set-resource", resourceId, amount });
  }

  function addResource(
    resourceId: "resource/cash" | "resource/reputation" | "resource/intel",
    currentValue: number,
    delta: number,
  ) {
    setResource(resourceId, currentValue + delta);
  }

  function skipTime(hours: number) {
    void session.commands.tick(hours * HOUR_MS);
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        onKeyDown={(e) => {
          if (e.key === "Escape") onClose();
        }}
        role="presentation"
      />

      {/* Panel */}
      <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
        <div
          className="glass-card pointer-events-auto w-full max-w-md p-6"
          role="dialog"
          aria-label="Dev Menu"
        >
          {/* Header */}
          <div className="mb-5 flex items-center justify-between">
            <h2 className="font-[family-name:var(--font-display)] text-base font-light tracking-[0.15em] text-gold">
              Dev Menu
            </h2>
            <button type="button" className="btn-ghost px-2 py-0.5 text-xs" onClick={onClose}>
              Close
            </button>
          </div>

          <div className="mb-5 h-px bg-gradient-to-r from-transparent via-gold/20 to-transparent" />

          {/* Resources */}
          <div className="space-y-4">
            <SectionLabel>Resources</SectionLabel>
            <div className="space-y-2.5">
              <ResourceRow
                label="Cash"
                value={resources.cash}
                onAdd={(d) => addResource("resource/cash", resources.cash, d)}
              />
              <ResourceRow
                label="Reputation"
                value={resources.reputation}
                onAdd={(d) => addResource("resource/reputation", resources.reputation, d)}
              />
              <ResourceRow
                label="Intel"
                value={resources.intel}
                onAdd={(d) => addResource("resource/intel", resources.intel, d)}
              />
            </div>
          </div>

          <div className="my-5 h-px bg-gradient-to-r from-transparent via-gold/10 to-transparent" />

          {/* Time */}
          <div className="space-y-3">
            <SectionLabel>Time</SectionLabel>
            <div className="flex items-center gap-3">
              <span className="text-xs text-silver/50">
                Day {clock.day} &middot;{" "}
                {String(Math.floor(clock.minuteOfDay / 60)).padStart(2, "0")}:
                {String(clock.minuteOfDay % 60).padStart(2, "0")}
              </span>
              <div className="flex gap-1">
                <CheatButton label="+1h" onClick={() => skipTime(1)} />
                <CheatButton label="+6h" onClick={() => skipTime(6)} />
                <CheatButton label="+1 day" onClick={() => skipTime(24)} />
              </div>
            </div>
          </div>

          <div className="my-5 h-px bg-gradient-to-r from-transparent via-gold/10 to-transparent" />

          {/* Quick Actions */}
          <div className="space-y-3">
            <SectionLabel>Quick Actions</SectionLabel>
            <div className="flex flex-wrap gap-1">
              <CheatButton
                label="Bankrupt (cash=0)"
                onClick={() => setResource("resource/cash", 0)}
              />
              <CheatButton
                label="Debt (cash=-100)"
                onClick={() => setResource("resource/cash", -100)}
              />
            </div>
          </div>

          <div className="my-5 h-px bg-gradient-to-r from-transparent via-gold/10 to-transparent" />

          {/* Debug */}
          <div className="space-y-3">
            <SectionLabel>Debug</SectionLabel>
            <CheatButton
              label="Dump State to Console"
              onClick={() => {
                console.log("[dev-menu] phase1View", session.phase1View);
                console.log("[dev-menu] worldSnapshot", session.worldSnapshot);
              }}
            />
          </div>
        </div>
      </div>
    </>
  );
}

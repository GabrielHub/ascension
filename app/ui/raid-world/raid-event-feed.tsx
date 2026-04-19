/**
 * Focus-mode event feed for active raid teams.
 *
 * Shows a scrolling feed of recent raid events for the focused team:
 * encounters, discoveries, loot pickups, team state changes, and
 * goal transitions. Compact glass card style.
 *
 * Presentation-only — typed intents, no gameplay mutation.
 */

// ── Event types ───────────────────────────────────────────────────────────

export type RaidEventKind =
  | "encounter"
  | "discovery"
  | "loot"
  | "intel"
  | "goal-change"
  | "status-change"
  | "hazard"
  | "retreat";

export interface RaidEvent {
  id: string;
  kind: RaidEventKind;
  message: string;
  /** Simulation tick or timestamp when the event occurred. */
  tick: number;
}

// ── Display config ────────────────────────────────────────────────────────

const EVENT_STYLE: Record<RaidEventKind, { icon: string; accent: string }> = {
  encounter: { icon: "\u25C6", accent: "text-ember" },
  discovery: { icon: "\u25CB", accent: "text-[rgba(100,160,220,0.9)]" },
  loot: { icon: "\u25C7", accent: "text-gold" },
  intel: { icon: "\u25CE", accent: "text-[rgba(100,180,160,0.9)]" },
  "goal-change": { icon: "\u25B8", accent: "text-gold/60" },
  "status-change": { icon: "\u25AA", accent: "text-silver/60" },
  hazard: { icon: "\u25B2", accent: "text-ember/80" },
  retreat: { icon: "\u25C0", accent: "text-silver/50" },
};

// ── Component ─────────────────────────────────────────────────────────────

function EventLine({ event }: { event: RaidEvent }) {
  const style = EVENT_STYLE[event.kind] ?? EVENT_STYLE["status-change"];

  return (
    <div className="flex items-center gap-2 py-1">
      <span className={`shrink-0 text-sm leading-none ${style.accent}`}>{style.icon}</span>
      <p className="flex-1 text-sm leading-snug text-silver/60">{event.message}</p>
      <span className="shrink-0 text-xs tabular-nums text-silver/40">T{event.tick}</span>
    </div>
  );
}

interface RaidEventFeedProps {
  /** Recent events for the focused team, newest first. */
  events: readonly RaidEvent[];
  /** Maximum events to show. Defaults to 8. */
  maxVisible?: number;
}

export function RaidEventFeed({ events, maxVisible = 8 }: RaidEventFeedProps) {
  const visible = [...events]
    .sort((a, b) => b.tick - a.tick || a.id.localeCompare(b.id))
    .slice(0, maxVisible);

  if (visible.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-[rgba(200,168,76,0.06)] px-3 py-3">
        <p className="text-center text-sm text-silver/40">No recent events</p>
      </div>
    );
  }

  return (
    <div className="space-y-0.5">
      <p className="text-sm font-medium uppercase tracking-[0.12em] text-silver/50">
        Recent Events
      </p>
      <div className="max-h-40 space-y-0 overflow-y-auto">
        {visible.map((event) => (
          <EventLine key={event.id} event={event} />
        ))}
      </div>
      {events.length > maxVisible && (
        <p className="pt-1 text-center text-xs text-silver/40">
          +{events.length - maxVisible} earlier
        </p>
      )}
    </div>
  );
}

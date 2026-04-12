import { useEffect, useRef, useState } from "react";

import type { EventLogEntry, EventLogKind } from "./view-models";
import { glassPanelClass, glassPanelSubtleClass } from "./styles";

// ── Icon mapping ────────────────────────────────────────────────────────

const KIND_ICONS: Record<EventLogKind, string> = {
  team_departure: "\u2192", // arrow right
  team_return: "\u2190", // arrow left
  injury: "\u26A0", // warning
  death: "\u2620", // skull
  morale_threshold: "\u25CE", // meter/bullseye
  loyalty_threshold: "\u25CE",
  staffing_change: "\u2616", // person
  resource_swing: "\u25C8", // coin/diamond
  event_change: "\u25C6", // alert diamond
  raid_result: "\u2691", // flag
  team_status: "\u2689", // gear/team
  room_culture: "\u25A3", // room block
  city_pressure: "\u2302", // city/house
};

const KIND_ACCENT_FALLBACK: Record<EventLogKind, string> = {
  team_departure: "text-gold/80",
  team_return: "text-gold/80",
  injury: "text-ember",
  death: "text-magma",
  morale_threshold: "text-smolder",
  loyalty_threshold: "text-smolder",
  staffing_change: "text-silver/70",
  resource_swing: "text-gold",
  event_change: "text-slate",
  raid_result: "text-ember",
  team_status: "text-gold/80",
  room_culture: "text-silver/70",
  city_pressure: "text-ember",
};

// ── Component ───────────────────────────────────────────────────────────

interface EventLogProps {
  entries: readonly EventLogEntry[];
  onEntryClick?: (entry: EventLogEntry) => void;
}

export function EventLog({ entries, onEntryClick }: EventLogProps) {
  const [expanded, setExpanded] = useState(false);
  const [lastSeenCount, setLastSeenCount] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const unreadCount = entries.length - lastSeenCount;

  // Auto-scroll to bottom when expanded and new entries arrive
  useEffect(() => {
    if (expanded && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [entries, expanded]);

  // Mark as read when expanded
  useEffect(() => {
    if (expanded) {
      setLastSeenCount(entries.length);
    }
  }, [expanded, entries.length]);

  // ── Collapsed: compact pill ──────────────────────────────────
  if (!expanded) {
    return (
      <div className="pointer-events-auto">
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className={`${glassPanelClass} flex items-center gap-2 rounded-lg px-3 py-2 shadow-lg transition-all duration-200 hover:bg-[rgba(200,168,76,0.06)]`}
        >
          <span className="text-sm text-gold/50">{"\u25C6"}</span>
          <span className="text-xs font-medium uppercase tracking-[0.15em] text-silver/50">
            Event Log
          </span>
          {unreadCount > 0 && (
            <span className="badge badge-gold ml-0.5 text-xs">{unreadCount}</span>
          )}
        </button>
      </div>
    );
  }

  // ── Expanded: chatbox window ─────────────────────────────────
  return (
    <div className="pointer-events-auto flex w-80 max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-xl shadow-[0_8px_40px_rgba(0,0,0,0.5)] lg:w-96">
      {/* Header — click to minimize */}
      <button
        type="button"
        onClick={() => setExpanded(false)}
        className={`${glassPanelClass} flex shrink-0 items-center gap-2 rounded-t-xl border-b border-[rgba(200,168,76,0.08)] px-3 py-2 text-left transition-colors duration-150 hover:bg-[rgba(200,168,76,0.04)]`}
      >
        <span className="text-sm text-gold/50">{"\u25C6"}</span>
        <h2 className="text-xs font-medium uppercase tracking-[0.15em] text-gold/60">Event Log</h2>
        <span className="ml-auto text-xs tabular-nums text-silver/30">{entries.length}</span>
        <span className="text-sm leading-none text-silver/30">{"\u2500"}</span>
      </button>

      {/* Scrolling body */}
      <div
        ref={scrollRef}
        className={`${glassPanelSubtleClass} max-h-72 flex-1 overflow-y-auto overflow-x-hidden rounded-b-xl px-1 py-1 lg:max-h-80`}
      >
        {entries.length === 0 ? (
          <div className="flex h-20 items-center justify-center">
            <p className="text-xs text-silver/25">No events yet</p>
          </div>
        ) : (
          <div className="space-y-px">
            {entries.map((entry) => (
              <EventLogRow
                key={entry.id}
                entry={entry}
                onClick={onEntryClick ? () => onEntryClick(entry) : undefined}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Single entry row ────────────────────────────────────────────────────

function EventLogRow({ entry, onClick }: { entry: EventLogEntry; onClick?: () => void }) {
  const icon = KIND_ICONS[entry.kind] ?? "\u25C6";
  const accentClass = entry.accent
    ? accentToClass(entry.accent)
    : (KIND_ACCENT_FALLBACK[entry.kind] ?? "text-silver/60");
  const isClickable = onClick !== undefined && entry.targetId !== undefined;

  return (
    <button
      type="button"
      className={`flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left transition-colors duration-150 ${
        isClickable ? "hover:bg-[rgba(200,168,76,0.04)] cursor-pointer" : "cursor-default"
      }`}
      onClick={isClickable ? onClick : undefined}
      tabIndex={isClickable ? 0 : -1}
    >
      {/* Icon */}
      <span className={`mt-0.5 shrink-0 text-xs ${accentClass}`}>{icon}</span>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <p className="break-words text-xs leading-snug text-silver/70">{entry.message}</p>
        <p className="mt-0.5 text-xs tabular-nums text-silver/25">{entry.timestamp}</p>
      </div>
    </button>
  );
}

// ── Accent color helper ─────────────────────────────────────────────────

function accentToClass(accent: string): string {
  switch (accent) {
    case "gold":
      return "text-gold/80";
    case "ember":
      return "text-ember";
    case "magma":
      return "text-magma";
    case "smolder":
      return "text-smolder";
    case "silver":
      return "text-silver/70";
    default:
      return "text-silver/60";
  }
}

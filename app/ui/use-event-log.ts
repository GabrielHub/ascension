import { useCallback, useEffect, useRef, useState } from "react";

import type { RuntimeSession } from "app/features/runtime/session";

import type { EventLogEntry, EventLogKind } from "./view-models";

// ── Types ────────────────────────────────────────────────────────────────

type ShellTab = "hq" | "operations";
type HqCategory = "rooms" | "roster" | "management" | "teams" | "inventory" | "market";
type OpsCategory = "contract" | "active" | "opportunities" | "history";

interface EventLogNavActions {
  setActiveTab: (tab: ShellTab) => void;
  setHqCategory: (cat: HqCategory | null) => void;
  setOpsCategory: (cat: OpsCategory | null) => void;
  setFocus: (payload: { targetKind: string; targetId: string } | null) => void;
}

const MAX_ENTRIES = 80;

const VALID_KINDS: Set<string> = new Set<EventLogKind>([
  "team_departure",
  "team_return",
  "injury",
  "death",
  "morale_threshold",
  "loyalty_threshold",
  "staffing_change",
  "resource_swing",
  "event_change",
  "raid_result",
  "team_status",
  "room_culture",
]);

// ── Hook ─────────────────────────────────────────────────────────────────

export function useEventLog(session: RuntimeSession | null) {
  const [entries, setEntries] = useState<EventLogEntry[]>([]);
  const idRef = useRef(0);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!session) {
      initializedRef.current = false;
      setEntries([]);
      return;
    }

    // On first session render, emit a welcome entry and drain any stale events
    if (!initializedRef.current) {
      initializedRef.current = true;
      session.drainPendingEvents(); // discard events from before UI was ready
      const day = session.worldSnapshot.time.day;
      setEntries([
        {
          id: `evt-${++idRef.current}`,
          timestamp: `day-${day}`,
          kind: "event_change",
          message: `Operations resumed — Day ${day}`,
          accent: "gold",
        },
      ]);
      return;
    }

    const drained = session.drainPendingEvents();
    if (drained.length === 0) return;

    const newEntries: EventLogEntry[] = drained.map((event) => ({
      id: `evt-${++idRef.current}`,
      timestamp: event.timestamp,
      kind: (VALID_KINDS.has(event.kind) ? event.kind : "event_change") as EventLogKind,
      message: event.message,
      accent: event.accent ?? "silver",
      ...(event.targetKind ? { targetKind: event.targetKind as EventLogEntry["targetKind"] } : {}),
      ...(event.targetId ? { targetId: event.targetId } : {}),
    }));

    setEntries((prev) => [...prev, ...newEntries].slice(-MAX_ENTRIES));
  }, [session, session?.state]);

  const handleEntryClick = useCallback((entry: EventLogEntry, actions: EventLogNavActions) => {
    if (!entry.targetKind) return;

    if (entry.targetKind === "team") {
      if (entry.kind === "team_status") {
        actions.setActiveTab("hq");
        actions.setHqCategory("teams");
        actions.setFocus(null);
        return;
      }

      if (entry.kind === "team_departure" && entry.targetId) {
        actions.setActiveTab("operations");
        actions.setOpsCategory("active");
        actions.setFocus({ targetKind: entry.targetKind, targetId: entry.targetId });
        return;
      }

      actions.setActiveTab("operations");
      actions.setOpsCategory("history");
      return;
    }

    if (!entry.targetId) {
      return;
    }

    actions.setActiveTab("hq");
    if (entry.targetKind === "room") {
      actions.setHqCategory("rooms");
    } else if (entry.targetKind === "operator") {
      actions.setHqCategory("roster");
    }
    actions.setFocus({ targetKind: entry.targetKind, targetId: entry.targetId });
  }, []);

  return { entries, handleEntryClick };
}

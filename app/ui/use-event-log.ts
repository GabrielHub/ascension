import { useEffect, useRef, useState } from "react";

import type { RuntimeSession } from "app/features/runtime/session";
import type { FocusTargetKind } from "render";

import type { EventLogEntry, EventLogKind } from "./view-models";

// ── Types ────────────────────────────────────────────────────────────────

type ShellTab = "hq" | "operations";
type HqCategory = "rooms" | "roster" | "management" | "teams" | "inventory" | "market";
type OpsCategory = "contract" | "active" | "opportunities" | "history";

interface EventLogNavActions {
  setActiveTab: (tab: ShellTab) => void;
  setHqCategory: (cat: HqCategory | null) => void;
  setOpsCategory: (cat: OpsCategory | null) => void;
  setFocus: (payload: { targetKind: FocusTargetKind; targetId: string } | null) => void;
  openOpsTeam: (teamId: string) => void;
  openOpsHistorySummary: (summaryId: string) => void;
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
  "city_pressure",
  "incident_resolved",
  "social_fallout",
]);

export function normalizeEventLogKind(kind: string): EventLogKind {
  return VALID_KINDS.has(kind) ? (kind as EventLogKind) : "event_change";
}

export function handleEventLogEntryClick(entry: EventLogEntry, actions: EventLogNavActions): void {
  if (!entry.targetKind) return;

  if (entry.targetKind === "team") {
    if (!entry.targetId) {
      actions.setActiveTab("operations");
      actions.setOpsCategory("history");
      return;
    }

    if (entry.kind === "team_departure" || entry.kind === "team_status") {
      actions.setActiveTab("operations");
      actions.openOpsTeam(entry.targetId);
      return;
    }

    if (entry.kind === "team_return" || entry.kind === "raid_result") {
      actions.setActiveTab("operations");
      actions.openOpsHistorySummary(entry.targetId);
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
  } else if (entry.targetKind === "operator" || entry.targetKind === "presenter") {
    actions.setHqCategory("roster");
  }
  actions.setFocus({ targetKind: entry.targetKind, targetId: entry.targetId });
}

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
      kind: normalizeEventLogKind(event.kind),
      message: event.message,
      accent: event.accent ?? "silver",
      ...(event.targetKind ? { targetKind: event.targetKind as EventLogEntry["targetKind"] } : {}),
      ...(event.targetId ? { targetId: event.targetId } : {}),
    }));

    setEntries((prev) => [...prev, ...newEntries].slice(-MAX_ENTRIES));
  }, [session, session?.state]);

  return { entries, handleEntryClick: handleEventLogEntryClick };
}

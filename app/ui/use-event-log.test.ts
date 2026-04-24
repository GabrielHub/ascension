import { describe, expect, it, vi } from "vitest";

import { handleEventLogEntryClick, normalizeEventLogKind } from "./use-event-log";
import type { EventLogEntry } from "./view-models";

function makeActions() {
  return {
    setActiveTab: vi.fn(),
    setHqCategory: vi.fn(),
    setOpsCategory: vi.fn(),
    setFocus: vi.fn(),
    openOpsTeam: vi.fn(),
    openOpsHistorySummary: vi.fn(),
  };
}

describe("normalizeEventLogKind", () => {
  it("preserves public and rival pressure events as first-class event-log entries", () => {
    expect(normalizeEventLogKind("public_pressure")).toBe("public_pressure");
    expect(normalizeEventLogKind("rival_pressure")).toBe("rival_pressure");
  });

  it("falls back unknown runtime event kinds to event_change", () => {
    expect(normalizeEventLogKind("unknown")).toBe("event_change");
  });
});

describe("handleEventLogEntryClick", () => {
  it("routes team status events into the operations active cascade", () => {
    const actions = makeActions();
    const entry: EventLogEntry = {
      id: "evt-1",
      timestamp: "day-1",
      kind: "team_status",
      message: "Team status changed",
      accent: "gold",
      targetKind: "team",
      targetId: "raid/1",
    };

    handleEventLogEntryClick(entry, actions);

    expect(actions.setActiveTab).toHaveBeenCalledWith("operations");
    expect(actions.openOpsTeam).toHaveBeenCalledWith("raid/1");
    expect(actions.setHqCategory).not.toHaveBeenCalled();
    expect(actions.setFocus).not.toHaveBeenCalled();
  });

  it("routes team return events into the history detail cascade", () => {
    const actions = makeActions();
    const entry: EventLogEntry = {
      id: "evt-2",
      timestamp: "day-2",
      kind: "team_return",
      message: "Team returned",
      accent: "gold",
      targetKind: "team",
      targetId: "raid/2",
    };

    handleEventLogEntryClick(entry, actions);

    expect(actions.setActiveTab).toHaveBeenCalledWith("operations");
    expect(actions.openOpsHistorySummary).toHaveBeenCalledWith("raid/2");
    expect(actions.setFocus).not.toHaveBeenCalled();
  });

  it("routes raid result events into the history detail cascade", () => {
    const actions = makeActions();
    const entry: EventLogEntry = {
      id: "evt-4",
      timestamp: "day-4",
      kind: "raid_result",
      message: "Mission complete",
      accent: "gold",
      targetKind: "team",
      targetId: "raid/4",
    };

    handleEventLogEntryClick(entry, actions);

    expect(actions.setActiveTab).toHaveBeenCalledWith("operations");
    expect(actions.openOpsHistorySummary).toHaveBeenCalledWith("raid/4");
  });

  it("keeps room events on the HQ cascade focus path", () => {
    const actions = makeActions();
    const entry: EventLogEntry = {
      id: "evt-3",
      timestamp: "day-3",
      kind: "room_culture",
      message: "Room improved",
      accent: "silver",
      targetKind: "room",
      targetId: "room/1",
    };

    handleEventLogEntryClick(entry, actions);

    expect(actions.setActiveTab).toHaveBeenCalledWith("hq");
    expect(actions.setHqCategory).toHaveBeenCalledWith("rooms");
    expect(actions.setFocus).toHaveBeenCalledWith({ targetKind: "room", targetId: "room/1" });
    expect(actions.openOpsTeam).not.toHaveBeenCalled();
  });
});

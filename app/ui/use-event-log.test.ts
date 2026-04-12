import { describe, expect, it } from "vitest";

import { normalizeEventLogKind } from "./use-event-log";

describe("normalizeEventLogKind", () => {
  it("preserves city-pressure events as first-class event-log entries", () => {
    expect(normalizeEventLogKind("city_pressure")).toBe("city_pressure");
  });

  it("falls back unknown runtime event kinds to event_change", () => {
    expect(normalizeEventLogKind("unknown")).toBe("event_change");
  });
});

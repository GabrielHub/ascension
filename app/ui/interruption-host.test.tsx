import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import type { InterruptionInstance } from "sim";

import { InterruptionHost } from "./interruption-host";

describe("interruption host", () => {
  it("renders incident subtitles with display labels instead of raw ids", () => {
    const incident: InterruptionInstance = {
      instanceId: "interruption-1",
      type: "incident",
      priority: 70,
      blockingMode: "blocking",
      createdAtMinute: 120,
      sourceSystem: "test",
      dismissible: false,
      persistence: "persistent",
      payload: {
        kind: "incident",
        incidentInstanceId: "incident-1",
        templateId: "incident/injury-complication",
        category: "injury_setback",
        title: "Recovery Complication Notice",
        briefing: "Vera Santos's recovery has hit a complication.",
        subjectSummary: "Vera Santos",
        choices: [],
        boundContext: {
          operatorIds: ["operator/vera-santos"],
        },
      },
    };

    const html = renderToStaticMarkup(
      <InterruptionHost activeInterruption={incident} onResolve={vi.fn()} onDismiss={vi.fn()} />,
    );

    expect(html).toContain("Injury Setback");
    expect(html).toContain("Vera Santos");
    expect(html).not.toContain("injury_setback");
    expect(html).not.toContain("operator/vera-santos");
  });
});

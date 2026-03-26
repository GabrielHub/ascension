import { describe, expect, it } from "vitest";

import type { PendingIncident } from "./incidents";
import { createIncidentInterruptionPayload, INCIDENT_TEMPLATES } from "./incidents";

describe("incident interruption payloads", () => {
  it("summarizes bound operators with display names instead of ids", () => {
    const template = INCIDENT_TEMPLATES.find(
      (entry) => entry.id === "incident/injury-complication",
    );
    expect(template).toBeDefined();

    const incident: PendingIncident = {
      instanceId: "incident-1",
      templateId: "incident/injury-complication",
      triggerFamily: "injury_setback",
      createdAtMinute: 120,
      boundContext: {
        operatorIds: ["operator/vera-santos"],
      },
      choices: template?.choices ?? [],
    };

    const payload = createIncidentInterruptionPayload(incident, template!, {
      "operator/vera-santos": "Vera Santos",
    });

    expect(payload.subjectSummary).toBe("Vera Santos");
  });
});

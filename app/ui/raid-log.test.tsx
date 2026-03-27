import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { RaidLog } from "./raid-log";
import type { RaidSummaryViewModel } from "./view-models";

function makeSummary(
  overrides: Partial<RaidSummaryViewModel> & { id: string },
): RaidSummaryViewModel {
  return {
    id: overrides.id,
    contractSiteId: "contract/1",
    missionName: "Clearance",
    missionId: "mission/clearance",
    startedAt: "day-1 09:00",
    endedAt: "2026-03-26T10:00:00.000Z",
    result: "success",
    reputationDelta: 7,
    cashDelta: 120,
    location: "Lower East Side",
    narrativeTags: [],
    contributingFactors: [],
    operatorOutcomes: [],
    ...overrides,
  };
}

describe("raid log", () => {
  it("renders policy attribution from raid summary contributing factors", () => {
    const html = renderToStaticMarkup(
      <RaidLog
        history={[
          makeSummary({
            id: "raid/policy",
            contributingFactors: [
              "policy:contract_posture:aggressive",
              "policy:objective_bias:boss_rush",
              "cohesion:strong",
            ],
          }),
        ]}
      />,
    );

    expect(html).toContain("Contract Posture: Aggressive");
    expect(html).toContain("Field Objectives: Boss Rush");
    expect(html).not.toContain("cohesion:strong");
  });
});

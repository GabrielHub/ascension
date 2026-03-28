import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { OpportunityBoard } from "./opportunity-board";

describe("opportunity board", () => {
  it("uses the shared strained copy for non-critical roster pressure", () => {
    const html = renderToStaticMarkup(
      <OpportunityBoard
        opportunities={[]}
        rosterPressure={{
          operatorCapacity: 4,
          livingOperatorCount: 3,
          vacancyCount: 1,
          deferredVisitorCapacity: 1,
          unavailableOperatorIds: [],
          recentDeathOperatorIds: [],
          replacementPressureLevel: "strained",
        }}
      />,
    );

    expect(html).toContain("Roster strained");
    expect(html).not.toContain("Roster thin");
  });
});

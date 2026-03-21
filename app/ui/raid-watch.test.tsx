import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { RaidWatch } from "./raid-watch";

describe("raid watch", () => {
  it("renders active raid reveal progress as a percentage without rescaling", () => {
    const html = renderToStaticMarkup(
      <RaidWatch
        activeRaids={[
          {
            id: "raid/1",
            missionName: "Clearance",
            missionId: "mission/clearance",
            startedAt: "day-1 09:00",
            revealProgress: 25,
            operatorIds: ["operator/a", "operator/b"],
            location: "district/lower-east-side",
            threat: 61,
            cohesion: 72,
            durationHours: 4,
          },
        ]}
      />,
    );

    expect(html).toContain("25%");
    expect(html).not.toContain("100%");
  });
});

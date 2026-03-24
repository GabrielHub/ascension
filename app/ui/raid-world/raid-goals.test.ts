import { describe, expect, it } from "vitest";

import { getRaidGoalPresentation } from "./raid-goals";

describe("getRaidGoalPresentation", () => {
  it("keeps a shared teal intel palette across raid surfaces", () => {
    const intel = getRaidGoalPresentation("intel");

    expect(intel.label).toBe("Gathering Intel");
    expect(intel.badgeLabel).toBe("INTEL");
    expect(intel.shortLabel).toBe("INT");
    expect(intel.color).toBe("rgba(100,180,160,0.9)");
  });

  it("keeps compact and long-form labels aligned for retreating teams", () => {
    const retreating = getRaidGoalPresentation("retreating");

    expect(retreating.label).toBe("Retreating");
    expect(retreating.badgeLabel).toBe("RETREAT");
    expect(retreating.shortLabel).toBe("RET");
  });
});

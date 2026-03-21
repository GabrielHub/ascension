import { describe, expect, it } from "vitest";

import { createTemplateRegistry } from "./index";

describe("template registry", () => {
  it("builds the aggregate registry with deterministic category counts", () => {
    const registry = createTemplateRegistry();

    expect(registry.resources).toHaveLength(3);
    expect(registry.buildings).toHaveLength(2);
    expect(registry.rooms).toHaveLength(3);
    expect(registry.upgrades).toHaveLength(5);
    expect(registry.missions.map((mission) => mission.id)).toEqual([
      "mission/clearance",
      "mission/containment",
      "mission/extraction",
    ]);
  });
});

import { describe, expect, it } from "vitest";

import { resolveOperatorBuild } from "./operator-build";

describe("resolveOperatorBuild", () => {
  it("maps current field roles to stable silhouette builds", () => {
    expect(resolveOperatorBuild("role:field_lead")).toBe("broad");
    expect(resolveOperatorBuild("role:scout")).toBe("lean");
    expect(resolveOperatorBuild("role:medic")).toBe("medium");
  });

  it("keeps legacy portrait-era archetype names working", () => {
    expect(resolveOperatorBuild("role:bruiser")).toBe("broad");
    expect(resolveOperatorBuild("role:infiltrator")).toBe("lean");
    expect(resolveOperatorBuild("role:strategist")).toBe("medium");
  });

  it("supports unprefixed and archetype-prefixed inputs", () => {
    expect(resolveOperatorBuild("field_lead")).toBe("broad");
    expect(resolveOperatorBuild("archetype:infiltrator")).toBe("lean");
  });

  it("falls back to medium for unknown roles", () => {
    expect(resolveOperatorBuild("role:unknown")).toBe("medium");
  });
});

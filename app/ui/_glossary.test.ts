import { describe, expect, it } from "vitest";

import {
  getAbilityMeta,
  getContractHintMeta,
  getCultureSummaryLabel,
  getEffectLabel,
  getEffectTypeMeta,
  getEncounterActorKindMeta,
  getEncounterConditionMeta,
  getIdentifierLabel,
  getIncidentCategoryMeta,
  getRequirementLabel,
  getRequirementTypeMeta,
  getResourceMeta,
  getRoleMeta,
  getSpecialtyMeta,
  getStatusMeta,
  getTagMeta,
  getWeaknessTargetMeta,
} from "./_glossary";

describe("ui glossary", () => {
  it("resolves role labels and short labels from the central registry", () => {
    expect(getRoleMeta("role:field_lead")).toEqual(
      expect.objectContaining({
        label: "Field Lead",
        shortLabel: "Lead",
      }),
    );
    expect(getRoleMeta("role:bruiser")).toEqual(
      expect.objectContaining({
        label: "Bruiser",
      }),
    );
  });

  it("resolves specialty and room tag labels from the same registry pattern", () => {
    expect(getSpecialtyMeta("focus:containment")).toEqual(
      expect.objectContaining({
        label: "Containment",
      }),
    );
    expect(getTagMeta("staff:maintenance")).toEqual(
      expect.objectContaining({
        label: "Maintenance",
      }),
    );
    expect(getTagMeta("room:operations")).toEqual(
      expect.objectContaining({
        label: "Operations",
      }),
    );
  });

  it("humanizes culture summaries without title-casing full prose", () => {
    expect(getCultureSummaryLabel("comfortable, steady")).toBe("Comfortable, Steady");
    expect(getCultureSummaryLabel("neutral")).toBe("Neutral");
  });

  it("humanizes contract hints from raw ids", () => {
    expect(getContractHintMeta("threat:clustered")).toEqual(
      expect.objectContaining({
        label: "Clustered",
      }),
    );
    expect(getContractHintMeta("enemy-family/tunnel-crawlers")).toEqual(
      expect.objectContaining({
        label: "Tunnel Crawlers",
      }),
    );
    expect(getContractHintMeta("boss-family/the-curator")).toEqual(
      expect.objectContaining({
        label: "The Curator",
      }),
    );
  });

  it("humanizes encounter labels through the same glossary pattern", () => {
    expect(getAbilityMeta("action/sweeping_slam")).toEqual(
      expect.objectContaining({
        label: "Sweeping Slam",
      }),
    );
    expect(getStatusMeta("guarded")).toEqual(
      expect.objectContaining({
        label: "Guarded",
      }),
    );
    expect(getEncounterConditionMeta("incapacitated")).toEqual(
      expect.objectContaining({
        label: "Down",
      }),
    );
    expect(getEncounterActorKindMeta("add")).toEqual(
      expect.objectContaining({
        label: "Enemy",
      }),
    );
    expect(getWeaknessTargetMeta("role:field_lead")).toEqual(
      expect.objectContaining({
        label: "Field Lead",
      }),
    );
  });

  it("humanizes upgrade requirement and effect types from raw ids", () => {
    expect(getRequirementTypeMeta("staff_role_min")).toEqual(
      expect.objectContaining({
        label: "Staff Role",
      }),
    );
    expect(getEffectTypeMeta("grant_operator_slot")).toEqual(
      expect.objectContaining({
        label: "Operator Slot",
      }),
    );
  });

  it("builds upgrade labels through the shared glossary helpers", () => {
    expect(
      getRequirementLabel({ type: "resource_min", resourceId: "resource/cash", minimum: 150 }),
    ).toBe("150 Cash");
    expect(
      getRequirementLabel({ type: "staff_role_min", roleTag: "staff:medical", minimum: 1 }),
    ).toBe("1 Medical");
    expect(
      getEffectLabel({ type: "modify_resource_income", resourceId: "resource/cash", amount: 6 }),
    ).toBe("+6 Cash income");
    expect(getEffectLabel({ type: "modify_attraction_weight", tag: "role:medic", amount: 2 })).toBe(
      "+2 Medic interest",
    );
  });

  it("humanizes fallback identifiers and resource labels from the same source", () => {
    expect(getIdentifierLabel("operator/vera-santos")).toBe("Vera Santos");
    expect(getResourceMeta("resource/reputation")).toEqual(
      expect.objectContaining({
        label: "Reputation",
      }),
    );
  });

  it("humanizes incident categories from raw keys", () => {
    expect(getIncidentCategoryMeta("injury_setback")).toEqual(
      expect.objectContaining({
        label: "Injury Setback",
      }),
    );
  });
});

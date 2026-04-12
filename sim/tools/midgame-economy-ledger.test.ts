import { describe, expect, it } from "vitest";

import {
  buildMidgameEconomyArtifacts,
  buildMidgameEconomyLedger,
  midgameEconomyLedgerSchema,
} from "./midgame-economy-ledger";

describe("midgame economy ledger", () => {
  it("validates the generated ledger schema", () => {
    const ledger = buildMidgameEconomyLedger();

    expect(() => midgameEconomyLedgerSchema.parse(ledger)).not.toThrow();
    expect(ledger.meta.craftRecipeCount).toBe(9);
    expect(ledger.meta.craftFamilyCount).toBe(3);
    expect(ledger.meta.craftOutputCount).toBe(9);
    expect(ledger.meta.districtCount).toBeGreaterThan(0);
  });

  it("covers all three recipe families", () => {
    const ledger = buildMidgameEconomyLedger();

    const families = new Set(ledger.ledgers.craftCosts.map((r) => r.family));
    expect(families).toContain("craft-family/field-lead-breach");
    expect(families).toContain("craft-family/scout-recon");
    expect(families).toContain("craft-family/medic-stabilization");
  });

  it("has material sources for all craft inputs", () => {
    const ledger = buildMidgameEconomyLedger();

    expect(ledger.ledgers.materialSources.length).toBeGreaterThan(0);
    // Every material source must reference at least one recipe
    for (const source of ledger.ledgers.materialSources) {
      expect(source.usedInRecipeIds.length).toBeGreaterThan(0);
    }
  });

  it("has crafted gear values for all recipe outputs", () => {
    const ledger = buildMidgameEconomyLedger();

    expect(ledger.ledgers.craftedGearValues.length).toBe(9);
    for (const gear of ledger.ledgers.craftedGearValues) {
      expect(gear.rank).toBe("d");
      expect(["weapon", "outfit-overlay", "accessory"]).toContain(gear.category);
      expect(gear.statEffects.length).toBeGreaterThan(0);
    }
  });

  it("recipe input costs are non-negative", () => {
    const ledger = buildMidgameEconomyLedger();

    for (const cost of ledger.ledgers.craftCosts) {
      expect(cost.cashCost).toBeGreaterThan(0);
      expect(cost.inputCost.min).toBeGreaterThanOrEqual(0);
      expect(cost.inputCost.max).toBeGreaterThanOrEqual(cost.inputCost.min);
      expect(cost.totalCost.min).toBe(cost.inputCost.min + cost.cashCost);
      expect(cost.totalCost.max).toBe(cost.inputCost.max + cost.cashCost);
      for (const input of cost.inputItems) {
        expect(input.quantity).toBeGreaterThan(0);
        expect(input.totalOpportunityCost).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("each recipe family has one weapon, one outfit, one accessory", () => {
    const ledger = buildMidgameEconomyLedger();

    const familyCosts = new Map<string, string[]>();
    for (const cost of ledger.ledgers.craftCosts) {
      const categories = familyCosts.get(cost.family) ?? [];
      categories.push(cost.outputCategory);
      familyCosts.set(cost.family, categories);
    }

    for (const [family, categories] of familyCosts) {
      expect(categories, `${family} must include weapon`).toContain("weapon");
      expect(categories, `${family} must include outfit-overlay`).toContain("outfit-overlay");
      expect(categories, `${family} must include accessory`).toContain("accessory");
    }
  });

  it("every recipe requires at least one district tag and one faction standing", () => {
    const ledger = buildMidgameEconomyLedger();

    for (const cost of ledger.ledgers.craftCosts) {
      expect(cost.requiredDistrictTags.length).toBeGreaterThan(0);
      expect(cost.requiredFactions.length).toBeGreaterThan(0);
    }
  });

  it("renders self-consistent economy artifacts", () => {
    const artifacts = buildMidgameEconomyArtifacts();

    expect(JSON.parse(artifacts.json)).toEqual(artifacts.ledger);
    expect(artifacts.report).toContain("# Midgame Economy Report");
    expect(artifacts.report).toContain("## Material Source Envelope");
    expect(artifacts.report).toContain("## Craft Cost Envelope");
    expect(artifacts.report).toContain("## Crafted Gear Value Envelope");
    expect(artifacts.report).toContain("## Market Fallback Comparison");
    expect(artifacts.report).toContain("Craft-time cash sink");
  });
});

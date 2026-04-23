import { describe, expect, it } from "vitest";

import {
  DEFAULT_COMBAT_PACKAGE_REGISTRY,
  deriveOperatorCombatDefaults,
  normalizeOperatorRank,
} from "./operator-combat";

describe("deriveOperatorCombatDefaults", () => {
  it("draws F/E/D field leads from the kinetic base pool", () => {
    for (const rank of ["f", "e", "d"] as const) {
      const combat = deriveOperatorCombatDefaults("role:field_lead", rank);
      expect(combat.combatPackageId).toBe("package/field-lead/kinetic/standard");
      expect(combat.rank).toBe(rank);
      expect(combat.attunementTag).toBe("attunement:kinetic");
      expect(combat.blocks).toBe(0);
    }
  });

  it("draws C/B/A field leads from the kinetic senior pool", () => {
    for (const rank of ["c", "b", "a"] as const) {
      const combat = deriveOperatorCombatDefaults("role:field_lead", rank);
      expect(combat.combatPackageId).toBe("package/field-lead/kinetic/senior");
    }
  });

  it("returns the deterministic unique package for U-rank field leads", () => {
    const combat = deriveOperatorCombatDefaults("role:field_lead", "u");
    expect(combat.combatPackageId).toBe("package/field-lead/kinetic/unique/anchor-absolute");
  });

  it("draws F/E/D scouts from the void base pool", () => {
    for (const rank of ["f", "e", "d"] as const) {
      const combat = deriveOperatorCombatDefaults("role:scout", rank);
      expect(combat.combatPackageId).toBe("package/scout/void/standard");
      expect(combat.attunementTag).toBe("attunement:void");
    }
  });

  it("draws C/B/A scouts from the void senior pool", () => {
    for (const rank of ["c", "b", "a"] as const) {
      const combat = deriveOperatorCombatDefaults("role:scout", rank);
      expect(combat.combatPackageId).toBe("package/scout/void/senior");
    }
  });

  it("draws F/E/D medics from the vital base pool", () => {
    for (const rank of ["f", "e", "d"] as const) {
      const combat = deriveOperatorCombatDefaults("role:medic", rank);
      expect(combat.combatPackageId).toBe("package/medic/vital/standard");
      expect(combat.attunementTag).toBe("attunement:vital");
    }
  });

  it("draws C/B/A medics from the vital senior pool", () => {
    for (const rank of ["c", "b", "a"] as const) {
      const combat = deriveOperatorCombatDefaults("role:medic", rank);
      expect(combat.combatPackageId).toBe("package/medic/vital/senior");
    }
  });

  it("never pulls a package whose legalRankPool excludes the recruit rank", () => {
    for (const roleTag of ["role:field_lead", "role:scout", "role:medic"]) {
      for (const rank of ["f", "e", "d", "c", "b", "a"] as const) {
        const combat = deriveOperatorCombatDefaults(roleTag, rank);
        const pkg = DEFAULT_COMBAT_PACKAGE_REGISTRY.packageById.get(combat.combatPackageId);
        expect(pkg, `package ${combat.combatPackageId} should exist`).toBeDefined();
        expect(pkg!.legalRoleTags).toContain(roleTag);
        expect(pkg!.legalRankPool).toContain(rank);
      }
    }
  });

  it("scales base stats by rank", () => {
    const f = deriveOperatorCombatDefaults("role:field_lead", "f");
    const c = deriveOperatorCombatDefaults("role:field_lead", "c");
    const a = deriveOperatorCombatDefaults("role:field_lead", "a");
    expect(c.baseStats.strength).toBeGreaterThan(f.baseStats.strength);
    expect(a.baseStats.strength).toBeGreaterThan(c.baseStats.strength);
  });
});

describe("normalizeOperatorRank", () => {
  it("accepts all seven rank letters", () => {
    for (const rank of ["f", "e", "d", "c", "b", "a", "u"]) {
      expect(normalizeOperatorRank(rank)).toBe(rank);
    }
  });

  it("lowercases uppercase input", () => {
    expect(normalizeOperatorRank("A")).toBe("a");
    expect(normalizeOperatorRank("U")).toBe("u");
  });

  it("falls back to f for unknown input", () => {
    expect(normalizeOperatorRank(undefined)).toBe("f");
    expect(normalizeOperatorRank(null)).toBe("f");
    expect(normalizeOperatorRank("")).toBe("f");
    expect(normalizeOperatorRank("z")).toBe("f");
  });
});

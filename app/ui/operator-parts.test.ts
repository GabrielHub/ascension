import { describe, expect, it } from "vitest";

import {
  findPartById,
  getLoadedParts,
  getLoadedPartsIndex,
  partSvgPath,
  resolveVisibleGear,
  searchParts,
  validatePartsIndex,
  type OperatorPartMeta,
  type OperatorPartsIndex,
  type VisibleGear,
} from "./operator-parts";

// ── Shipped index validation ──────────────────────────────────────────────

describe("validatePartsIndex against shipped index", () => {
  it("validates the shipped operator parts index with no errors", () => {
    const index = getLoadedPartsIndex();
    const errors = validatePartsIndex(index);
    expect(errors).toEqual([]);
  });

  it("shipped index contains at least one part per category", () => {
    const parts = getLoadedParts();
    const categories = new Set(parts.map((p) => p.category));
    expect(categories).toContain("weapon");
    expect(categories).toContain("outfit-overlay");
    expect(categories).toContain("accessory");
  });
});

// ── validatePartsIndex unit tests ─────────────────────────────────────────

describe("validatePartsIndex", () => {
  it("detects duplicate part ids", () => {
    const index = makeIndex([makePart({ id: "weapon/a" }), makePart({ id: "weapon/a" })]);
    const errors = validatePartsIndex(index);
    expect(errors).toContainEqual({ partId: "weapon/a", message: "Duplicate part id" });
  });

  it("detects invalid category", () => {
    const index = makeIndex([makePart({ id: "bad/one", category: "invalid" as never })]);
    const errors = validatePartsIndex(index);
    expect(errors.some((e) => e.message.includes("Invalid category"))).toBe(true);
  });

  it("detects invalid rarity", () => {
    const index = makeIndex([makePart({ id: "bad/one", rarity: "legendary" as never })]);
    const errors = validatePartsIndex(index);
    expect(errors.some((e) => e.message.includes("Invalid rarity"))).toBe(true);
  });

  it("detects empty tags array", () => {
    const index = makeIndex([makePart({ id: "bad/one", tags: [] })]);
    const errors = validatePartsIndex(index);
    expect(errors.some((e) => e.message.includes("tags must be a non-empty array"))).toBe(true);
  });

  it("detects empty paletteTags array", () => {
    const index = makeIndex([makePart({ id: "bad/one", paletteTags: [] })]);
    const errors = validatePartsIndex(index);
    expect(errors.some((e) => e.message.includes("paletteTags must be a non-empty array"))).toBe(
      true,
    );
  });

  it("detects empty roleTags array", () => {
    const index = makeIndex([makePart({ id: "bad/one", roleTags: [] })]);
    const errors = validatePartsIndex(index);
    expect(errors.some((e) => e.message.includes("roleTags must be a non-empty array"))).toBe(true);
  });

  it("detects empty bodyCompatibility array", () => {
    const index = makeIndex([makePart({ id: "bad/one", bodyCompatibility: [] })]);
    const errors = validatePartsIndex(index);
    expect(
      errors.some((e) => e.message.includes("bodyCompatibility must be a non-empty array")),
    ).toBe(true);
  });

  it("detects empty poseCompatibility array", () => {
    const index = makeIndex([makePart({ id: "bad/one", poseCompatibility: [] })]);
    const errors = validatePartsIndex(index);
    expect(
      errors.some((e) => e.message.includes("poseCompatibility must be a non-empty array")),
    ).toBe(true);
  });

  it("detects invalid body compatibility values", () => {
    const index = makeIndex([makePart({ id: "bad/one", bodyCompatibility: ["giant" as never] })]);
    const errors = validatePartsIndex(index);
    expect(errors.some((e) => e.message.includes("Invalid body compatibility"))).toBe(true);
  });

  it("returns no errors for a valid index", () => {
    const index = makeIndex([makePart({ id: "weapon/valid" })]);
    expect(validatePartsIndex(index)).toEqual([]);
  });
});

// ── searchParts ───────────────────────────────────────────────────────────

describe("searchParts", () => {
  const parts: OperatorPartMeta[] = [
    makePart({ id: "weapon/katana", category: "weapon", roleTags: ["bruiser"] }),
    makePart({
      id: "weapon/daggers",
      category: "weapon",
      roleTags: ["infiltrator"],
      bodyCompatibility: ["lean"],
    }),
    makePart({
      id: "accessory/visor",
      category: "accessory",
      roleTags: ["strategist"],
      rarity: "uncommon",
    }),
  ];

  it("filters by category", () => {
    const result = searchParts(parts, { category: "weapon" });
    expect(result.map((p) => p.id)).toEqual(["weapon/katana", "weapon/daggers"]);
  });

  it("filters by role tag", () => {
    const result = searchParts(parts, { roleTag: "infiltrator" });
    expect(result.map((p) => p.id)).toEqual(["weapon/daggers"]);
  });

  it("filters by role tag with prefix", () => {
    const result = searchParts(parts, { roleTag: "role:infiltrator" });
    expect(result.map((p) => p.id)).toEqual(["weapon/daggers"]);
  });

  it("filters by body build", () => {
    const result = searchParts(parts, { bodyBuild: "lean" });
    expect(result.map((p) => p.id)).toEqual(["weapon/daggers"]);
  });

  it("filters by rarity", () => {
    const result = searchParts(parts, { rarity: "uncommon" });
    expect(result.map((p) => p.id)).toEqual(["accessory/visor"]);
  });

  it("combines multiple filters", () => {
    const result = searchParts(parts, { category: "weapon", roleTag: "bruiser" });
    expect(result.map((p) => p.id)).toEqual(["weapon/katana"]);
  });

  it("returns all parts when query is empty", () => {
    expect(searchParts(parts, {})).toHaveLength(3);
  });

  it("filters by tags using OR semantics", () => {
    const tagged: OperatorPartMeta[] = [
      makePart({ id: "a", tags: ["melee", "blade"] }),
      makePart({ id: "b", tags: ["ranged"] }),
    ];
    const result = searchParts(tagged, { tags: ["blade"] });
    expect(result.map((p) => p.id)).toEqual(["a"]);
  });
});

// ── findPartById ──────────────────────────────────────────────────────────

describe("findPartById", () => {
  const parts: OperatorPartMeta[] = [
    makePart({ id: "weapon/katana" }),
    makePart({ id: "accessory/visor", category: "accessory" }),
  ];

  it("finds a part by id", () => {
    expect(findPartById(parts, "weapon/katana")?.id).toBe("weapon/katana");
  });

  it("returns undefined for unknown id", () => {
    expect(findPartById(parts, "weapon/unknown")).toBeUndefined();
  });
});

// ── resolveVisibleGear ────────────────────────────────────────────────────

describe("resolveVisibleGear", () => {
  const parts: OperatorPartMeta[] = [
    makePart({ id: "weapon/katana" }),
    makePart({ id: "outfit-overlay/vest", category: "outfit-overlay" }),
    makePart({ id: "accessory/visor", category: "accessory" }),
  ];

  it("passes through known gear ids", () => {
    const gear: VisibleGear = {
      weaponPartId: "weapon/katana",
      outfitOverlayPartId: "outfit-overlay/vest",
      accessoryPartId: "accessory/visor",
    };
    expect(resolveVisibleGear(gear, parts)).toEqual(gear);
  });

  it("drops unknown gear ids", () => {
    const gear: VisibleGear = {
      weaponPartId: "weapon/unknown",
      outfitOverlayPartId: "outfit-overlay/vest",
    };
    const result = resolveVisibleGear(gear, parts);
    expect(result.weaponPartId).toBeUndefined();
    expect(result.outfitOverlayPartId).toBe("outfit-overlay/vest");
  });

  it("returns empty object for undefined gear", () => {
    expect(resolveVisibleGear(undefined, parts)).toEqual({});
  });

  it("returns all-undefined fields for fully unknown gear", () => {
    const gear: VisibleGear = { weaponPartId: "weapon/nonexistent" };
    const result = resolveVisibleGear(gear, parts);
    expect(result.weaponPartId).toBeUndefined();
  });
});

// ── partSvgPath ───────────────────────────────────────────────────────────

describe("partSvgPath", () => {
  it("returns the correct public asset path", () => {
    expect(partSvgPath("weapon/katana")).toBe("/data/svg-parts/operators/parts/weapon/katana.svg");
  });
});

// ── Test helpers ──────────────────────────────────────────────────────────

function makePart(overrides: Partial<OperatorPartMeta> & { id: string }): OperatorPartMeta {
  return {
    category: "weapon",
    tags: ["melee"],
    paletteTags: ["bruiser"],
    roleTags: ["bruiser"],
    bodyCompatibility: ["broad", "medium"],
    poseCompatibility: ["standing"],
    rarity: "common",
    ...overrides,
  };
}

function makeIndex(parts: OperatorPartMeta[]): OperatorPartsIndex {
  return {
    description: "test",
    locked: "test",
    style: "test",
    viewBox: "0 0 120 160",
    parts,
  };
}

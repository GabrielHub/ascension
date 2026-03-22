import { describe, expect, it } from "vitest";

import {
  findPartById,
  getLoadedParts,
  getLoadedPartsIndex,
  getLoadedRecipes,
  getRecipeById,
  getAllRecipeIds,
  partSvgPath,
  resolveVisibleGear,
  searchParts,
  validatePartsIndex,
  type OperatorPartMeta,
  type OperatorPartsIndex,
  type VisibleGear,
} from "./operator-parts";
import {
  validateRecipe,
  deriveActorMarker,
  HEAD_SHAPES,
  EYES,
  HAIR,
  FACE_DETAILS,
  BODIES,
} from "./_portrait-parts";

// ── Shipped index validation ──────────────────────────────────────────────

describe("validatePartsIndex against shipped index", () => {
  it("validates the shipped operator parts index with no errors", () => {
    const index = getLoadedPartsIndex();
    const errors = validatePartsIndex(index);
    expect(errors).toEqual([]);
  });

  it("shipped index contains at least one part per gear category", () => {
    const parts = getLoadedParts();
    const categories = new Set(parts.map((p) => p.category));
    expect(categories).toContain("weapon");
    expect(categories).toContain("outfit-overlay");
    expect(categories).toContain("accessory");
  });

  it("shipped index contains at least one part per portrait category", () => {
    const parts = getLoadedParts();
    const categories = new Set(parts.map((p) => p.category));
    expect(categories).toContain("head-shape");
    expect(categories).toContain("hair");
    expect(categories).toContain("eyes");
    expect(categories).toContain("face-detail");
    expect(categories).toContain("body-silhouette");
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

// ── Appearance recipe tests ──────────────────────────────────────────────

describe("shipped recipes", () => {
  it("ships at least 20 recipes", () => {
    const recipes = getLoadedRecipes();
    expect(recipes.length).toBeGreaterThanOrEqual(20);
  });

  it("all shipped recipes validate with no errors", () => {
    const recipes = getLoadedRecipes();
    for (const recipe of recipes) {
      const errors = validateRecipe(recipe);
      expect(errors).toEqual([]);
    }
  });

  it("all recipe ids are unique", () => {
    const recipes = getLoadedRecipes();
    const ids = recipes.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("recipe ids are unique across the full shipped recipe set", () => {
    const allIds = getAllRecipeIds();
    expect(new Set(allIds).size).toBe(allIds.length);
  });
});

describe("getRecipeById", () => {
  it("returns a recipe for a known recipe id", () => {
    const recipe = getRecipeById("kael-001");
    expect(recipe).toBeDefined();
    expect(recipe?.name).toBe("Kael");
  });

  it("returns undefined for an unknown id", () => {
    expect(getRecipeById("nonexistent")).toBeUndefined();
  });
});

describe("portrait part registries", () => {
  it("head shapes registry has all 3 shapes", () => {
    expect(Object.keys(HEAD_SHAPES)).toEqual(
      expect.arrayContaining(["angular-jaw", "soft-oval", "moderate-jaw"]),
    );
  });

  it("eyes registry has all 8 styles", () => {
    expect(Object.keys(EYES).length).toBe(8);
  });

  it("hair registry has all 14 styles", () => {
    expect(Object.keys(HAIR).length).toBe(14);
    for (const style of Object.values(HAIR)) {
      expect(style).toHaveProperty("back");
      expect(style).toHaveProperty("front");
    }
  });

  it("face details registry has all 3 styles", () => {
    expect(Object.keys(FACE_DETAILS).length).toBe(3);
  });

  it("bodies registry has all 3 styles", () => {
    expect(Object.keys(BODIES).length).toBe(3);
  });
});

describe("validateRecipe", () => {
  it("returns errors for unknown part references", () => {
    const errors = validateRecipe({
      id: "bad",
      name: "Bad",
      headShape: "nonexistent",
      hair: "nonexistent",
      eyes: "nonexistent",
      faceDetail: "nonexistent",
      bodySilhouette: "nonexistent",
      palette: "nonexistent",
      skinTone: "nonexistent",
    });
    expect(errors.length).toBe(7);
  });

  it("returns no errors for a valid recipe", () => {
    const errors = validateRecipe({
      id: "test",
      name: "Test",
      headShape: "angular-jaw",
      hair: "swept-bangs",
      eyes: "narrow-almond",
      faceDetail: "male-standard",
      bodySilhouette: "armored-structured",
      palette: "warm-earth",
      skinTone: "medium-warm",
    });
    expect(errors).toEqual([]);
  });
});

describe("deriveActorMarker", () => {
  it("extracts marker colors from a recipe", () => {
    const recipe = getRecipeById("kael-001")!;
    const marker = deriveActorMarker(recipe, "broad");
    expect(marker.hairColor).toBe("#2a1f18");
    expect(marker.clothingColor).toBe("#3d2c20");
    expect(marker.accentColor).toBe("#c8a84c");
    expect(marker.skinColor).toBe("#d4b896");
    expect(marker.build).toBe("broad");
  });

  it("returns consistent results for the same recipe", () => {
    const recipe = getRecipeById("mira-002")!;
    const a = deriveActorMarker(recipe, "lean");
    const b = deriveActorMarker(recipe, "lean");
    expect(a).toEqual(b);
  });
});

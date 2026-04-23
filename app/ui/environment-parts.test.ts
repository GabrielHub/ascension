import { describe, expect, it } from "vitest";

import {
  buildSceneReviewGroups,
  getSceneReviewContract,
  findEnvPartById,
  getLoadedEnvParts,
  getLoadedEnvPartsIndex,
  envPartSvgPath,
  formatSceneSeriesLabel,
  searchEnvParts,
  validateEnvPartsIndex,
  ENV_LIGHTING_PRESETS,
  getEnvLightingPreset,
  defaultPresetId,
  type EnvPartMeta,
  type EnvPartsIndex,
} from "./environment-parts";

// ── Shipped index validation ──────────────────────────────────────────────

describe("validateEnvPartsIndex against shipped index", () => {
  it("validates the shipped environment parts index with no errors", () => {
    const index = getLoadedEnvPartsIndex();
    const errors = validateEnvPartsIndex(index);
    expect(errors).toEqual([]);
  });

  it("shipped index contains at least one part per category", () => {
    const parts = getLoadedEnvParts();
    const categories = new Set(parts.map((p) => p.category));
    expect(categories).toContain("prop");
    expect(categories).toContain("scene");
    expect(categories).toContain("background");
    expect(categories).toContain("actor-marker");
  });

  it("all shipped parts have non-empty tags", () => {
    const parts = getLoadedEnvParts();
    for (const part of parts) {
      expect(part.tags.length).toBeGreaterThan(0);
    }
  });

  it("scene assets obey the room-scene contract", () => {
    const parts = getLoadedEnvParts().filter((part) => part.category === "scene");

    expect(parts.length).toBeGreaterThan(0);
    parts.forEach((part) => {
      expect(part.scale).toBe("room");
      expect(part.status).toBe("approved");
      expect(part.roomFamily).not.toBeNull();
      expect(part.tags).toContain("room");
      expect(part.tags).toContain("props-only");
      expect(envPartSvgPath(part)).toContain("/recipes/");
    });
  });
});

// ── Validation error detection ────────────────────────────────────────────

describe("validateEnvPartsIndex error detection", () => {
  const baseIndex: EnvPartsIndex = {
    description: "test",
    locked: null,
    style: "test",
    building: "test",
    paths: {
      partsRoot: "/parts",
      referenceRoot: "/reference",
      recipesRoot: "/recipes",
    },
    parts: [],
  };

  it("detects duplicate ids", () => {
    const dup: EnvPartMeta = {
      id: "props/dup",
      category: "prop",
      tags: ["test"],
      scale: "prop",
      roomFamily: null,
      status: "exploration",
    };
    const errors = validateEnvPartsIndex({ ...baseIndex, parts: [dup, dup] });
    expect(errors.some((e) => e.message === "Duplicate part id")).toBe(true);
  });

  it("detects invalid category", () => {
    const bad: EnvPartMeta = {
      id: "test/bad-cat",
      category: "invalid" as EnvPartMeta["category"],
      tags: ["test"],
      scale: "prop",
      roomFamily: null,
      status: "exploration",
    };
    const errors = validateEnvPartsIndex({ ...baseIndex, parts: [bad] });
    expect(errors.some((e) => e.message.includes("Invalid category"))).toBe(true);
  });

  it("detects invalid scale", () => {
    const bad: EnvPartMeta = {
      id: "test/bad-scale",
      category: "prop",
      tags: ["test"],
      scale: "huge" as EnvPartMeta["scale"],
      roomFamily: null,
      status: "exploration",
    };
    const errors = validateEnvPartsIndex({ ...baseIndex, parts: [bad] });
    expect(errors.some((e) => e.message.includes("Invalid scale"))).toBe(true);
  });

  it("detects empty tags", () => {
    const bad: EnvPartMeta = {
      id: "test/no-tags",
      category: "prop",
      tags: [],
      scale: "prop",
      roomFamily: null,
      status: "exploration",
    };
    const errors = validateEnvPartsIndex({ ...baseIndex, parts: [bad] });
    expect(errors.some((e) => e.message.includes("tags must be"))).toBe(true);
  });

  it("detects malformed scene metadata", () => {
    const badScene: EnvPartMeta = {
      id: "recipes/bad-scene",
      category: "scene",
      tags: ["room", "interior"],
      scale: "prop",
      roomFamily: null,
      status: "exploration",
    };
    const errors = validateEnvPartsIndex({ ...baseIndex, parts: [badScene] });

    expect(errors.some((e) => e.message.includes("room scale"))).toBe(true);
    expect(errors.some((e) => e.message.includes("approved"))).toBe(true);
    expect(errors.some((e) => e.message.includes("room family"))).toBe(true);
    expect(errors.some((e) => e.message.includes('"props-only"'))).toBe(true);
  });
});

// ── Search ────────────────────────────────────────────────────────────────

describe("searchEnvParts", () => {
  const parts = getLoadedEnvParts();

  it("filters by category", () => {
    const props = searchEnvParts(parts, { category: "prop" });
    expect(props.length).toBeGreaterThan(0);
    expect(props.every((p) => p.category === "prop")).toBe(true);
  });

  it("filters by scale", () => {
    const backdrops = searchEnvParts(parts, { scale: "backdrop" });
    expect(backdrops.length).toBeGreaterThan(0);
    expect(backdrops.every((p) => p.scale === "backdrop")).toBe(true);
  });

  it("filters by room family", () => {
    const infirmary = searchEnvParts(parts, { roomFamily: "infirmary" });
    expect(infirmary.length).toBeGreaterThan(0);
    expect(infirmary.every((p) => p.roomFamily === "infirmary")).toBe(true);
  });

  it("filters by tags", () => {
    const medical = searchEnvParts(parts, { tags: ["medical"] });
    expect(medical.length).toBeGreaterThan(0);
    expect(medical.every((p) => p.tags.some((t) => t.toLowerCase() === "medical"))).toBe(true);
  });

  it("combines filters", () => {
    const medicalProps = searchEnvParts(parts, { category: "prop", tags: ["medical"] });
    expect(medicalProps.length).toBeGreaterThan(0);
    expect(medicalProps.every((p) => p.category === "prop")).toBe(true);
  });

  it("returns empty for impossible filter", () => {
    const none = searchEnvParts(parts, { category: "background", roomFamily: "infirmary" });
    expect(none).toEqual([]);
  });

  it("filters by actor-marker category", () => {
    const markers = searchEnvParts(parts, { category: "actor-marker" });
    expect(markers.length).toBeGreaterThan(0);
    expect(markers.every((p) => p.category === "actor-marker")).toBe(true);
  });

  it("filters by scene category", () => {
    const scenes = searchEnvParts(parts, { category: "scene" });
    expect(scenes.length).toBeGreaterThan(0);
    expect(scenes.every((p) => p.category === "scene")).toBe(true);
  });

  it("filters by marker scale", () => {
    const markers = searchEnvParts(parts, { scale: "marker" });
    expect(markers.length).toBeGreaterThan(0);
    expect(markers.every((p) => p.scale === "marker")).toBe(true);
  });

  it("filters actor-markers by build tag", () => {
    const broad = searchEnvParts(parts, { category: "actor-marker", tags: ["broad"] });
    expect(broad.length).toBe(1);
    expect(broad[0].id).toContain("broad");
  });
});

// ── Lookup and paths ──────────────────────────────────────────────────────

describe("findEnvPartById", () => {
  const parts = getLoadedEnvParts();

  it("finds a known part", () => {
    const result = findEnvPartById(parts, "props/iso-desk-reception");
    expect(result).toBeDefined();
    expect(result!.category).toBe("prop");
  });

  it("returns undefined for unknown id", () => {
    expect(findEnvPartById(parts, "nonexistent")).toBeUndefined();
  });
});

// ── Lighting presets ──────────────────────────────────────────────────────

describe("ENV_LIGHTING_PRESETS", () => {
  it("contains at least 6 presets", () => {
    expect(ENV_LIGHTING_PRESETS.length).toBeGreaterThanOrEqual(6);
  });

  it("all presets have unique ids", () => {
    const ids = ENV_LIGHTING_PRESETS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("all presets have non-empty labels", () => {
    for (const p of ENV_LIGHTING_PRESETS) {
      expect(p.label.length).toBeGreaterThan(0);
    }
  });

  it("all presets have background and border strings", () => {
    for (const p of ENV_LIGHTING_PRESETS) {
      expect(p.background).toBeTruthy();
      expect(p.border).toBeTruthy();
    }
  });

  it("neutral preset has no overlay", () => {
    const neutral = ENV_LIGHTING_PRESETS.find((p) => p.id === "neutral");
    expect(neutral).toBeDefined();
    expect(neutral!.overlay).toBeNull();
  });
});

describe("getEnvLightingPreset", () => {
  it("returns matching preset by id", () => {
    const dusk = getEnvLightingPreset("dusk");
    expect(dusk.id).toBe("dusk");
    expect(dusk.label).toBe("Dusk");
  });

  it("returns neutral preset for unknown id", () => {
    const fallback = getEnvLightingPreset("nonexistent");
    expect(fallback.id).toBe("neutral");
  });
});

describe("defaultPresetId", () => {
  it("returns the first preset id", () => {
    expect(defaultPresetId()).toBe(ENV_LIGHTING_PRESETS[0].id);
  });
});

describe("scene review helpers", () => {
  it("exposes the canonical room-scene geometry contract", () => {
    expect(getSceneReviewContract()).toEqual({
      building: "bodega",
      tileWidth: 96,
      tileHeight: 48,
      wallHeight: 84,
      canonicalOrigin: [200, 100],
      canonicalViewBox: {
        minX: 20,
        minY: 0,
        width: 420,
        height: 310,
      },
      roomFootprint: {
        cols: 4,
        rows: 3,
      },
    });
  });

  it("supports per-building scene review contracts", () => {
    expect(getSceneReviewContract("building/porters")).toEqual({
      building: "porters",
      tileWidth: 96,
      tileHeight: 48,
      wallHeight: 84,
      canonicalOrigin: [200, 100],
      canonicalViewBox: {
        minX: 20,
        minY: 0,
        width: 420,
        height: 310,
      },
      roomFootprint: {
        cols: 4,
        rows: 3,
      },
    });
  });

  it("builds progression scaffolds per room-scene series", () => {
    const groups = buildSceneReviewGroups(getLoadedEnvParts());

    expect(groups.map((group) => group.label)).toEqual([
      "Alley",
      "Back Office",
      "Backstock",
      "Counter",
      "Dining Area",
      "Register",
      "Supply Closet",
    ]);
    expect(groups.every((group) => group.steps.length >= 3)).toBe(true);
    expect(groups.find((group) => group.label === "Register")?.steps[0].part?.id).toBe(
      "recipes/scene-the-register",
    );
    // Dining area has 3 progressive states (base + first-aid + fully upgraded)
    const diningGroup = groups.find((group) => group.label === "Dining Area")!;
    expect(diningGroup.steps[0].part?.id).toBe("recipes/scene-the-dining-area");
    expect(diningGroup.steps[1].part?.id).toBe("recipes/scene-the-dining-area-2");
    expect(diningGroup.steps[2].part?.id).toBe("recipes/scene-the-dining-area-3");
    // Register has 2 progressive states (base + records wall)
    const registerGroup = groups.find((group) => group.label === "Register")!;
    expect(registerGroup.steps[0].part?.id).toBe("recipes/scene-the-register");
    expect(registerGroup.steps[1].part?.id).toBe("recipes/scene-the-register-2");
    expect(registerGroup.steps[2].isPlaceholder).toBe(true);
    expect(groups.find((group) => group.label === "Back Office")?.steps[0].part?.id).toBe(
      "recipes/scene-the-back-office",
    );
    expect(groups.find((group) => group.label === "Backstock")?.steps[0].part?.id).toBe(
      "recipes/scene-the-backstock",
    );
    expect(groups.find((group) => group.label === "Alley")?.steps[0].part?.id).toBe(
      "recipes/scene-the-alley",
    );
  });

  it("formats scene series labels for review", () => {
    expect(formatSceneSeriesLabel("front-desk")).toBe("Front Desk");
    expect(formatSceneSeriesLabel("supply_closet")).toBe("Supply Closet");
  });
});

// ── Shipped index style field ────────────────────────────────────────────

describe("shipped index style", () => {
  it("uses angled-isometric style", () => {
    const index = getLoadedEnvPartsIndex();
    expect(index.style).toBe("bodega-angled-isometric");
  });

  it("returns parts for Porter's waterfront building", () => {
    const index = getLoadedEnvPartsIndex("building/porters");

    expect(index.style).toBe("porters-waterfront-isometric");
    expect(index.parts.length).toBeGreaterThan(0);
    expect(getLoadedEnvParts("building/porters").length).toBeGreaterThan(0);
    expect(findEnvPartById(index.parts, "recipes/scene-the-workshop")).toBeDefined();
    expect(findEnvPartById(index.parts, "shell/porters-stacked-shell")).toBeDefined();
  });

  it("contains no flat/cross-section or room-kit entries", () => {
    const parts = getLoadedEnvParts();
    const staleIds = parts.filter(
      (p) =>
        (!p.id.includes("iso-") && p.category !== "actor-marker" && p.category !== "scene") ||
        p.id.includes("room-kits/") ||
        p.id.includes("iso-room-shell"),
    );
    expect(staleIds).toEqual([]);
  });

  it("does not retain shell or structure assets in the bodega contract", () => {
    const parts = getLoadedEnvParts();

    expect(parts.some((part) => part.category === "shell")).toBe(false);
    expect(parts.some((part) => part.category === "structure")).toBe(false);
  });
});

describe("envPartSvgPath", () => {
  it("returns reference path for exploration assets", () => {
    const part: EnvPartMeta = {
      id: "shell/bodega-exterior",
      category: "shell",
      tags: ["exterior"],
      scale: "building",
      roomFamily: null,
      status: "exploration",
    };
    expect(envPartSvgPath(part)).toBe(
      "/data/svg-environments/hq/bodega/reference/bodega-exterior.svg",
    );
  });

  it("returns parts path for approved assets", () => {
    const part: EnvPartMeta = {
      id: "shell/bodega-exterior",
      category: "shell",
      tags: ["exterior"],
      scale: "building",
      roomFamily: null,
      status: "approved",
    };
    expect(envPartSvgPath(part)).toBe(
      "/data/svg-environments/hq/bodega/parts/shell/bodega-exterior.svg",
    );
  });

  it("returns recipes path for approved scene assets", () => {
    const part: EnvPartMeta = {
      id: "recipes/scene-the-register",
      category: "scene",
      tags: ["room", "props-only"],
      scale: "room",
      roomFamily: "operations",
      status: "approved",
    };
    expect(envPartSvgPath(part)).toBe(
      "/data/svg-environments/hq/bodega/recipes/scene-the-register.svg",
    );
  });

  it("returns reference path for actor-marker exploration assets", () => {
    const part: EnvPartMeta = {
      id: "actor-markers/marker-chibi-broad",
      category: "actor-marker",
      tags: ["chibi", "broad"],
      scale: "marker",
      roomFamily: null,
      status: "exploration",
    };
    expect(envPartSvgPath(part)).toBe(
      "/data/svg-environments/hq/bodega/reference/marker-chibi-broad.svg",
    );
  });

  it("returns parts path for shipped approved prop assets", () => {
    const parts = getLoadedEnvParts();
    const prop = findEnvPartById(parts, "props/iso-desk-reception");
    expect(prop).toBeDefined();
    expect(prop!.status).toBe("approved");
    expect(envPartSvgPath(prop!)).toBe(
      "/data/svg-environments/hq/bodega/parts/props/iso-desk-reception.svg",
    );
  });

  it("returns Porter's recipe path for approved room scenes", () => {
    const index = getLoadedEnvPartsIndex("building/porters");
    const part = findEnvPartById(index.parts, "recipes/scene-the-workshop");
    expect(part).toBeDefined();
    expect(envPartSvgPath(part!, index)).toBe(
      "/data/svg-environments/hq/porters/recipes/scene-the-workshop.svg",
    );
  });
});

// ── Promoted asset status ────────────────────────────────────────────────

describe("promoted asset status", () => {
  const parts = getLoadedEnvParts();

  it("all non-actor-marker non-exploration parts are approved", () => {
    const nonMarkers = parts.filter(
      (p) => p.category !== "actor-marker" && p.status !== "exploration",
    );
    expect(nonMarkers.length).toBeGreaterThan(0);
    for (const part of nonMarkers) {
      expect(part.status).toBe("approved");
    }
  });

  it("exploration background parts are explicitly retained", () => {
    const explorationBg = parts.filter(
      (p) => p.category === "background" && p.status === "exploration",
    );
    for (const part of explorationBg) {
      expect(part.tags).toContain("backdrop");
    }
  });

  it("actor-marker parts remain exploration", () => {
    const markers = parts.filter((p) => p.category === "actor-marker");
    expect(markers.length).toBeGreaterThan(0);
    for (const marker of markers) {
      expect(marker.status).toBe("exploration");
    }
  });

  it("approved parts resolve to parts/ directory", () => {
    const approved = parts.filter((p) => p.status === "approved" && p.category !== "scene");
    for (const part of approved) {
      const path = envPartSvgPath(part);
      expect(path).toContain("/parts/");
      expect(path).not.toContain("/reference/");
    }
  });

  it("approved scene parts resolve to recipes/ directory", () => {
    const approvedScenes = parts.filter((p) => p.status === "approved" && p.category === "scene");
    expect(approvedScenes.length).toBeGreaterThan(0);
    for (const part of approvedScenes) {
      const path = envPartSvgPath(part);
      expect(path).toContain("/recipes/");
      expect(path).not.toContain("/reference/");
    }
  });

  it("filters by approved status", () => {
    const approved = searchEnvParts(parts, { status: "approved" });
    expect(approved.length).toBeGreaterThan(0);
    expect(approved.every((p) => p.status === "approved")).toBe(true);
  });
});

describe("background assets", () => {
  it("include backdrop elements in the shipped index", () => {
    const parts = getLoadedEnvParts();
    const backgrounds = searchEnvParts(parts, { category: "background" });
    expect(backgrounds.length).toBeGreaterThan(0);
    expect(backgrounds.every((p) => p.category === "background")).toBe(true);
  });

  it("contain both backdrop-scale and prop-scale background elements", () => {
    const parts = getLoadedEnvParts();
    const backgrounds = searchEnvParts(parts, { category: "background" });
    expect(backgrounds.some((p) => p.scale === "backdrop")).toBe(true);
    expect(backgrounds.some((p) => p.scale === "prop")).toBe(true);
  });
});

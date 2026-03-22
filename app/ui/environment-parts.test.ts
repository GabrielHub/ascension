import { describe, expect, it } from "vitest";

import {
  findEnvPartById,
  getLoadedEnvParts,
  getLoadedEnvPartsIndex,
  envPartSvgPath,
  searchEnvParts,
  validateEnvPartsIndex,
  ENV_LIGHTING_PRESETS,
  getEnvLightingPreset,
  defaultPresetId,
  resolveShellAssetUrl,
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
    expect(categories).toContain("shell");
    expect(categories).toContain("structure");
    expect(categories).toContain("prop");
    expect(categories).toContain("background");
    expect(categories).toContain("actor-marker");
  });

  it("all shipped parts have non-empty tags", () => {
    const parts = getLoadedEnvParts();
    for (const part of parts) {
      expect(part.tags.length).toBeGreaterThan(0);
    }
  });
});

// ── Validation error detection ────────────────────────────────────────────

describe("validateEnvPartsIndex error detection", () => {
  const baseIndex: EnvPartsIndex = {
    description: "test",
    locked: null,
    style: "test",
    building: "test",
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
});

// ── Search ────────────────────────────────────────────────────────────────

describe("searchEnvParts", () => {
  const parts = getLoadedEnvParts();

  it("filters by category", () => {
    const shells = searchEnvParts(parts, { category: "shell" });
    expect(shells.length).toBeGreaterThan(0);
    expect(shells.every((p) => p.category === "shell")).toBe(true);
  });

  it("filters by scale", () => {
    const building = searchEnvParts(parts, { scale: "building" });
    expect(building.length).toBeGreaterThan(0);
    expect(building.every((p) => p.scale === "building")).toBe(true);
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
    const none = searchEnvParts(parts, { category: "shell", roomFamily: "infirmary" });
    expect(none).toEqual([]);
  });

  it("filters by actor-marker category", () => {
    const markers = searchEnvParts(parts, { category: "actor-marker" });
    expect(markers.length).toBeGreaterThan(0);
    expect(markers.every((p) => p.category === "actor-marker")).toBe(true);
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
    const result = findEnvPartById(parts, "shell/iso-bodega-shell");
    expect(result).toBeDefined();
    expect(result!.category).toBe("shell");
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

// ── Shipped index style field ────────────────────────────────────────────

describe("shipped index style", () => {
  it("uses angled-isometric style", () => {
    const index = getLoadedEnvPartsIndex();
    expect(index.style).toBe("bodega-angled-isometric");
  });

  it("contains no flat/cross-section or room-kit entries", () => {
    const parts = getLoadedEnvParts();
    const staleIds = parts.filter(
      (p) =>
        (!p.id.includes("iso-") && p.category !== "actor-marker") ||
        p.id.includes("room-kits/") ||
        p.id.includes("iso-room-shell"),
    );
    expect(staleIds).toEqual([]);
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

  it("returns parts path for shipped approved assets", () => {
    const parts = getLoadedEnvParts();
    const shell = findEnvPartById(parts, "shell/iso-bodega-shell");
    expect(shell).toBeDefined();
    expect(shell!.status).toBe("approved");
    expect(envPartSvgPath(shell!)).toBe(
      "/data/svg-environments/hq/bodega/parts/shell/iso-bodega-shell.svg",
    );
  });
});

// ── Promoted asset status ────────────────────────────────────────────────

describe("promoted asset status", () => {
  const parts = getLoadedEnvParts();

  it("all non-actor-marker parts are approved", () => {
    const nonMarkers = parts.filter((p) => p.category !== "actor-marker");
    expect(nonMarkers.length).toBeGreaterThan(0);
    for (const part of nonMarkers) {
      expect(part.status).toBe("approved");
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
    const approved = parts.filter((p) => p.status === "approved");
    for (const part of approved) {
      const path = envPartSvgPath(part);
      expect(path).toContain("/parts/");
      expect(path).not.toContain("/reference/");
    }
  });

  it("filters by approved status", () => {
    const approved = searchEnvParts(parts, { status: "approved" });
    expect(approved.length).toBeGreaterThan(0);
    expect(approved.every((p) => p.status === "approved")).toBe(true);
  });
});

describe("resolveShellAssetUrl", () => {
  it("returns a valid parts URL for the bodega shell", () => {
    const url = resolveShellAssetUrl();
    expect(url).toContain("/parts/shell/iso-bodega-shell.svg");
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

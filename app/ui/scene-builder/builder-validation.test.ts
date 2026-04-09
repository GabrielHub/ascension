import { describe, expect, it } from "vitest";

import { validateLayout, validatePlacements } from "./builder-validation";

describe("validateLayout", () => {
  it("flags overlapping and out-of-shell slots", () => {
    const warnings = validateLayout(
      {
        col: 0,
        row: 0,
        cols: 4,
        rows: 4,
        dirty: false,
      },
      [
        {
          slotId: "slot/a",
          col: 0,
          row: 0,
          cols: 3,
          rows: 3,
          dirty: false,
        },
        {
          slotId: "slot/b",
          col: 2,
          row: 2,
          cols: 3,
          rows: 3,
          dirty: false,
        },
      ],
    );

    expect(warnings.some((warning) => warning.id.includes("slot-overlap"))).toBe(true);
    expect(warnings.some((warning) => warning.id.includes("slot-outside-shell"))).toBe(true);
  });

  it("flags missing shell footprints", () => {
    expect(validateLayout(null, [])).toEqual([
      {
        id: "missing-shell",
        targetType: "shell",
        targetId: null,
        level: "error",
        message: "No shell footprint is loaded for this floor",
      },
    ]);
  });
});

describe("validatePlacements", () => {
  it("flags decorations that overlap the HQ shell footprint", () => {
    const warnings = validatePlacements(
      [
        {
          id: "placement/inside-shell",
          assetId: "background/iso-bg-bench",
          assetUrl: "/test.svg",
          kind: "decoration",
          col: 2,
          row: 2,
          anchorMode: "iso-bottom",
          width: 200,
          height: 70,
          zIndex: 10,
          opacity: 1,
          scale: 1,
          footprintCols: 2,
          footprintRows: 1,
          dirty: false,
        },
      ],
      [
        {
          id: "background/iso-bg-bench",
          category: "prop",
          tags: ["bench"],
          scale: "prop",
          roomFamily: null,
          status: "approved",
        },
      ],
      {
        floorIndex: 0,
        elevationBandId: "ground-floor",
        shell: {
          col: 0,
          row: 0,
          cols: 6,
          rows: 6,
        },
        slots: [],
      },
    );

    expect(warnings).toContainEqual(
      expect.objectContaining({
        id: "decoration-inside-shell-placement/inside-shell",
        level: "error",
        message: "Decorations cannot overlap the HQ shell footprint",
      }),
    );
  });
});

import { describe, expect, it } from "vitest";

import { exportLayoutAsJson, exportLayoutAsTypeScript } from "./builder-export";

describe("layout export", () => {
  const shell = {
    col: 0,
    row: 0,
    cols: 12,
    rows: 18,
    dirty: true,
  };

  const slots = [
    {
      slotId: "slot/bar",
      col: 1,
      row: 6,
      cols: 10,
      rows: 4,
      startingTemplateId: "room/bar:tier_1",
      dirty: true,
    },
  ];

  it("exports layout JSON with canonical shell and slots", () => {
    expect(
      JSON.parse(exportLayoutAsJson("building/porters", 0, "ground-floor", shell, slots)),
    ).toEqual({
      buildingId: "building/porters",
      floorLayout: {
        floorIndex: 0,
        elevationBandId: "ground-floor",
        shell: {
          col: 0,
          row: 0,
          cols: 12,
          rows: 18,
        },
        slots: [
          {
            slotId: "slot/bar",
            col: 1,
            row: 6,
            cols: 10,
            rows: 4,
            startingTemplateId: "room/bar:tier_1",
          },
        ],
      },
    });
  });

  it("exports layout TypeScript as a BuildingFloorLayout constant", () => {
    const output = exportLayoutAsTypeScript("building/porters", 0, "ground-floor", shell, slots);

    expect(output).toContain(
      'import type { BuildingFloorLayout } from "content/building-layouts";',
    );
    expect(output).toContain("export const PORTERS_FLOOR_0: BuildingFloorLayout");
    expect(output).toContain('slotId: "slot/bar"');
  });

  it("preserves chamfered shell shape metadata on export", () => {
    const output = JSON.parse(
      exportLayoutAsJson(
        "building/skyscraper",
        0,
        "ground-floor",
        { ...shell, cols: 24, rows: 16, shape: { kind: "chamfered", cut: 3 } },
        [],
      ),
    );

    expect(output.floorLayout.shell.shape).toEqual({ kind: "chamfered", cut: 3 });
  });
});

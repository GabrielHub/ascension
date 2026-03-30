import { describe, expect, it } from "vitest";

import { builderReducer, INITIAL_STATE } from "./builder-state";
import { createPlacement } from "./builder-types";

describe("builderReducer decoration shell guards", () => {
  it("rejects adding decorations inside the shell footprint", () => {
    const state = {
      ...INITIAL_STATE,
      shell: { col: 0, row: 0, cols: 10, rows: 18, dirty: false },
    };
    const placement = createPlacement("background/iso-bg-awning", "/test.svg", "decoration", 5, 9, {
      footprintCols: 2,
      footprintRows: 1,
    });

    const nextState = builderReducer(state, { type: "ADD_PLACEMENT", placement });

    expect(nextState).toBe(state);
  });

  it("keeps decoration moves outside the shell but still allows exterior placements inside it", () => {
    const shell = { col: 0, row: 0, cols: 10, rows: 18, dirty: false };
    const decoration = {
      ...createPlacement("background/iso-bg-awning", "/test.svg", "decoration", 12, 19, {
        footprintCols: 2,
        footprintRows: 1,
      }),
      dirty: false,
    };
    const exterior = {
      ...createPlacement("background/iso-bg-tenement-left", "/test.svg", "exterior", 4, 8, {
        footprintCols: 5,
        footprintRows: 7,
      }),
      dirty: false,
    };
    const state = {
      ...INITIAL_STATE,
      shell,
      placements: [decoration, exterior],
    };

    const blockedDecorationState = builderReducer(state, {
      type: "MOVE_PLACEMENT",
      id: decoration.id,
      col: 5,
      row: 9,
    });
    const movedDecoration =
      blockedDecorationState.placements.find((placement) => placement.id === decoration.id) ?? null;

    expect(movedDecoration).toMatchObject({ col: 12, row: 19, dirty: false });

    const movedExteriorState = builderReducer(state, {
      type: "MOVE_PLACEMENT",
      id: exterior.id,
      col: 5,
      row: 9,
    });
    const movedExterior =
      movedExteriorState.placements.find((placement) => placement.id === exterior.id) ?? null;

    expect(movedExterior).toMatchObject({ col: 5, row: 9, dirty: true });
  });
});

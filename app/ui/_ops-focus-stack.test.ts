import { describe, expect, it } from "vitest";

import {
  categoryFromStack,
  closeAt,
  effectiveFocusFromStack,
  rootEntryForCategory,
  setBranchAt,
  stackFromFocus,
  type OpsStackEntry,
} from "./_ops-focus-stack";

const teamEntry: OpsStackEntry = {
  kind: "team",
  teamId: "team/1",
  highlightBounds: null,
};

describe("effectiveFocusFromStack", () => {
  it("returns null for an empty stack", () => {
    expect(effectiveFocusFromStack([])).toBeNull();
  });

  it("returns null when the stack only contains synthetic roots", () => {
    expect(effectiveFocusFromStack([{ kind: "active-root" }])).toBeNull();
    expect(effectiveFocusFromStack([{ kind: "contract-root" }])).toBeNull();
  });

  it("returns the team focus when present in the stack", () => {
    expect(effectiveFocusFromStack([{ kind: "active-root" }, teamEntry])).toEqual({
      targetKind: "team",
      targetId: "team/1",
      highlightBounds: null,
    });
  });

  it("ignores synthetic branch entries when deriving focus", () => {
    expect(
      effectiveFocusFromStack([{ kind: "contract-root" }, { kind: "posting-board" }]),
    ).toBeNull();
  });
});

describe("categoryFromStack", () => {
  it("returns null for an empty stack", () => {
    expect(categoryFromStack([])).toBeNull();
  });

  it("maps category roots to their own category", () => {
    expect(categoryFromStack([{ kind: "contract-root" }])).toBe("contract");
    expect(categoryFromStack([{ kind: "active-root" }])).toBe("active");
    expect(categoryFromStack([{ kind: "opportunities-root" }])).toBe("opportunities");
    expect(categoryFromStack([{ kind: "history-root" }])).toBe("history");
  });

  it("maps team focus to the active category", () => {
    expect(categoryFromStack([teamEntry])).toBe("active");
  });

  it("maps contract branches to the contract category", () => {
    expect(categoryFromStack([{ kind: "posting", postingId: "post/1" }])).toBe("contract");
    expect(categoryFromStack([{ kind: "contract-review" }])).toBe("contract");
  });
});

describe("rootEntryForCategory and stackFromFocus", () => {
  it("maps categories to their synthetic root entries", () => {
    expect(rootEntryForCategory("contract")).toEqual({ kind: "contract-root" });
    expect(rootEntryForCategory("active")).toEqual({ kind: "active-root" });
    expect(rootEntryForCategory("opportunities")).toEqual({ kind: "opportunities-root" });
    expect(rootEntryForCategory("history")).toEqual({ kind: "history-root" });
  });

  it("builds a single-entry stack from a team focus payload", () => {
    const stack = stackFromFocus({
      targetKind: "team",
      targetId: "team/42",
      highlightBounds: null,
    });
    expect(stack).toEqual([
      { kind: "active-root" },
      { kind: "team", teamId: "team/42", highlightBounds: null },
    ]);
  });

  it("returns an empty stack for unsupported focus kinds", () => {
    expect(
      stackFromFocus({ targetKind: "room", targetId: "room/1", highlightBounds: null }),
    ).toEqual([]);
  });

  it("returns an empty stack when focus is null", () => {
    expect(stackFromFocus(null)).toEqual([]);
  });
});

describe("closeAt", () => {
  const stack: OpsStackEntry[] = [
    { kind: "contract-root" },
    { kind: "posting-board" },
    { kind: "posting", postingId: "post/1" },
  ];

  it("truncates the stack and removes everything to the right of the closed index", () => {
    expect(closeAt(stack, 1)).toEqual([{ kind: "contract-root" }]);
  });

  it("clears the entire stack when closing index 0", () => {
    expect(closeAt(stack, 0)).toEqual([]);
  });

  it("treats a negative index as a full close", () => {
    expect(closeAt(stack, -1)).toEqual([]);
  });
});

describe("setBranchAt", () => {
  const stack: OpsStackEntry[] = [{ kind: "contract-root" }];

  it("appends a branch at the requested parent index", () => {
    const next = setBranchAt(stack, 0, { kind: "posting-board" });
    expect(next).toEqual([{ kind: "contract-root" }, { kind: "posting-board" }]);
  });

  it("keeps the existing branch when the new branch equals the current one", () => {
    const base: OpsStackEntry[] = [
      { kind: "contract-root" },
      { kind: "posting", postingId: "post/1" },
    ];
    const next = setBranchAt(base, 0, { kind: "posting", postingId: "post/1" });
    expect(next).toEqual(base);
  });

  it("replaces a sibling branch at the same depth", () => {
    const base: OpsStackEntry[] = [
      { kind: "contract-root" },
      { kind: "posting", postingId: "post/1" },
    ];
    const next = setBranchAt(base, 0, { kind: "posting", postingId: "post/2" });
    expect(next).toEqual([{ kind: "contract-root" }, { kind: "posting", postingId: "post/2" }]);
  });

  it("closes the branch when null is supplied", () => {
    const base: OpsStackEntry[] = [
      { kind: "contract-root" },
      { kind: "posting", postingId: "post/1" },
    ];
    expect(setBranchAt(base, 0, null)).toEqual([{ kind: "contract-root" }]);
  });
});

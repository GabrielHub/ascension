import { describe, expect, it } from "vitest";

import {
  categoryFromStack,
  closeAt,
  effectiveFocusFromStack,
  replaceRoot,
  rootEntryForCategory,
  setBranchAt,
  stackFromFocus,
  type StackFocusEntry,
} from "./_hq-focus-stack";

const roomEntry: StackFocusEntry = {
  kind: "room",
  roomId: "room/a",
  highlightBounds: null,
};
const operatorEntry: StackFocusEntry = {
  kind: "operator",
  operatorId: "op/1",
  highlightBounds: null,
};

describe("effectiveFocusFromStack", () => {
  it("returns null for an empty stack", () => {
    expect(effectiveFocusFromStack([])).toBeNull();
  });

  it("returns null when the stack only contains synthetic roots", () => {
    expect(effectiveFocusFromStack([{ kind: "rooms-root" }])).toBeNull();
    expect(effectiveFocusFromStack([{ kind: "management-root" }])).toBeNull();
  });

  it("returns the rightmost world-backed entry", () => {
    const stack: StackFocusEntry[] = [roomEntry, { kind: "room-upgrades", roomId: "room/a" }];
    expect(effectiveFocusFromStack(stack)).toEqual({
      targetKind: "room",
      targetId: "room/a",
      highlightBounds: null,
    });
  });

  it("ignores non-focus branch entries when deriving focus", () => {
    const stack: StackFocusEntry[] = [operatorEntry, { kind: "room-upgrades", roomId: "room/a" }];
    expect(effectiveFocusFromStack(stack)).toEqual({
      targetKind: "operator",
      targetId: "op/1",
      highlightBounds: null,
    });
  });
});

describe("categoryFromStack", () => {
  it("returns null for an empty stack", () => {
    expect(categoryFromStack([])).toBeNull();
  });

  it("maps category roots to their own category", () => {
    expect(categoryFromStack([{ kind: "rooms-root" }])).toBe("rooms");
    expect(categoryFromStack([{ kind: "people-root" }])).toBe("roster");
    expect(categoryFromStack([{ kind: "management-root" }])).toBe("management");
    expect(categoryFromStack([{ kind: "teams-root" }])).toBe("teams");
    expect(categoryFromStack([{ kind: "inventory-root" }])).toBe("inventory");
    expect(categoryFromStack([{ kind: "market-root" }])).toBe("market");
  });

  it("maps world-backed roots to the right category", () => {
    expect(categoryFromStack([roomEntry])).toBe("rooms");
    expect(categoryFromStack([operatorEntry])).toBe("roster");
    const visitorEntry: StackFocusEntry = {
      kind: "visitor",
      visitorId: "v/1",
      highlightBounds: null,
    };
    expect(categoryFromStack([visitorEntry])).toBe("roster");
  });

  it("returns null when the stack root is not a valid HQ category owner", () => {
    const teamEntry: StackFocusEntry = {
      kind: "team",
      teamId: "t/1",
      highlightBounds: null,
    };
    expect(categoryFromStack([teamEntry])).toBeNull();
  });
});

describe("rootEntryForCategory and stackFromFocus", () => {
  it("maps categories to their synthetic root entries", () => {
    expect(rootEntryForCategory("rooms")).toEqual({ kind: "rooms-root" });
    expect(rootEntryForCategory("roster")).toEqual({ kind: "people-root" });
    expect(rootEntryForCategory("management")).toEqual({ kind: "management-root" });
  });

  it("builds a single-entry stack from a focus payload", () => {
    const stack = stackFromFocus({
      targetKind: "visitor",
      targetId: "v/3",
      highlightBounds: null,
    });
    expect(stack).toEqual([{ kind: "visitor", visitorId: "v/3", highlightBounds: null }]);
  });

  it("returns an empty stack when focus is null", () => {
    expect(stackFromFocus(null)).toEqual([]);
  });
});

describe("closeAt", () => {
  const stack: StackFocusEntry[] = [
    roomEntry,
    { kind: "room-upgrades", roomId: "room/a" },
    { kind: "room-staffing", roomId: "room/a" },
  ];

  it("truncates the stack and removes everything to the right of the closed index", () => {
    expect(closeAt(stack, 1)).toEqual([roomEntry]);
  });

  it("clears the entire stack when closing index 0", () => {
    expect(closeAt(stack, 0)).toEqual([]);
  });

  it("treats a negative index as a full close", () => {
    expect(closeAt(stack, -1)).toEqual([]);
  });
});

describe("setBranchAt", () => {
  const stack: StackFocusEntry[] = [roomEntry];

  it("appends a branch at the requested parent index", () => {
    const next = setBranchAt(stack, 0, { kind: "room-upgrades", roomId: "room/a" });
    expect(next).toEqual([roomEntry, { kind: "room-upgrades", roomId: "room/a" }]);
  });

  it("keeps the existing branch when the new branch equals the current one", () => {
    const base: StackFocusEntry[] = [roomEntry, { kind: "room-upgrades", roomId: "room/a" }];
    const next = setBranchAt(base, 0, { kind: "room-upgrades", roomId: "room/a" });
    expect(next).toEqual(base);
  });

  it("replaces a sibling branch at the same depth", () => {
    const base: StackFocusEntry[] = [roomEntry, { kind: "room-upgrades", roomId: "room/a" }];
    const next = setBranchAt(base, 0, { kind: "room-staffing", roomId: "room/a" });
    expect(next).toEqual([roomEntry, { kind: "room-staffing", roomId: "room/a" }]);
  });

  it("closes the branch when null is supplied", () => {
    const base: StackFocusEntry[] = [roomEntry, { kind: "room-upgrades", roomId: "room/a" }];
    expect(setBranchAt(base, 0, null)).toEqual([roomEntry]);
  });
});

describe("replaceRoot", () => {
  it("replaces the root and clears every branch", () => {
    const base: StackFocusEntry[] = [roomEntry, { kind: "room-upgrades", roomId: "room/a" }];
    expect(replaceRoot(base, operatorEntry)).toEqual([operatorEntry]);
  });

  it("clears the stack when the new root is null", () => {
    const base: StackFocusEntry[] = [roomEntry];
    expect(replaceRoot(base, null)).toEqual([]);
  });
});

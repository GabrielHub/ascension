import type { FocusPayload } from "render";

export type HqCategory = "rooms" | "roster" | "management" | "teams" | "inventory" | "market";

type HighlightBounds = FocusPayload["highlightBounds"];

/**
 * One entry in the HQ cascade stack. Every entry corresponds to one rendered
 * panel. Entries may be either "world-backed" (they carry a real focus target
 * that the render and event layers consume via effectiveFocus) or purely
 * synthetic (category roots and branch surfaces that only exist inside the
 * panel layer).
 */
export type StackFocusEntry =
  // Category roots (synthetic, not world-backed).
  | { kind: "rooms-root" }
  | { kind: "people-root" }
  | { kind: "management-root" }
  | { kind: "teams-root" }
  | { kind: "inventory-root" }
  | { kind: "market-root" }
  // World-backed focus targets.
  | { kind: "room"; roomId: string; highlightBounds: HighlightBounds }
  | { kind: "operator"; operatorId: string; highlightBounds: HighlightBounds }
  | { kind: "visitor"; visitorId: string; highlightBounds: HighlightBounds }
  | { kind: "team"; teamId: string; highlightBounds: HighlightBounds }
  // Branch surfaces (synthetic, parented to a world entry).
  | { kind: "room-upgrades"; roomId: string }
  | { kind: "place-room"; slotId: string; floorIndex: number }
  | { kind: "replace-operator"; visitorId: string };

export function effectiveFocusFromStack(stack: readonly StackFocusEntry[]): FocusPayload | null {
  for (let i = stack.length - 1; i >= 0; i--) {
    const entry = stack[i]!;
    switch (entry.kind) {
      case "room":
        return {
          targetKind: "room",
          targetId: entry.roomId,
          highlightBounds: entry.highlightBounds,
        };
      case "operator":
        return {
          targetKind: "operator",
          targetId: entry.operatorId,
          highlightBounds: entry.highlightBounds,
        };
      case "visitor":
        return {
          targetKind: "visitor",
          targetId: entry.visitorId,
          highlightBounds: entry.highlightBounds,
        };
      case "team":
        return {
          targetKind: "team",
          targetId: entry.teamId,
          highlightBounds: entry.highlightBounds,
        };
      default:
        continue;
    }
  }
  return null;
}

export function categoryFromStack(stack: readonly StackFocusEntry[]): HqCategory | null {
  if (stack.length === 0) return null;
  const root = stack[0]!;
  switch (root.kind) {
    case "rooms-root":
    case "room":
    case "place-room":
    case "room-upgrades":
      return "rooms";
    case "people-root":
    case "operator":
    case "visitor":
    case "replace-operator":
      return "roster";
    case "management-root":
      return "management";
    case "teams-root":
      return "teams";
    case "inventory-root":
      return "inventory";
    case "market-root":
      return "market";
    case "team":
      return null;
  }
}

export function rootEntryForCategory(category: HqCategory): StackFocusEntry {
  switch (category) {
    case "rooms":
      return { kind: "rooms-root" };
    case "roster":
      return { kind: "people-root" };
    case "management":
      return { kind: "management-root" };
    case "teams":
      return { kind: "teams-root" };
    case "inventory":
      return { kind: "inventory-root" };
    case "market":
      return { kind: "market-root" };
  }
}

export function stackFromFocus(focus: FocusPayload | null): StackFocusEntry[] {
  if (!focus) return [];
  switch (focus.targetKind) {
    case "room":
      return [{ kind: "room", roomId: focus.targetId, highlightBounds: focus.highlightBounds }];
    case "operator":
      return [
        { kind: "operator", operatorId: focus.targetId, highlightBounds: focus.highlightBounds },
      ];
    case "visitor":
      return [
        { kind: "visitor", visitorId: focus.targetId, highlightBounds: focus.highlightBounds },
      ];
    case "team":
      return [{ kind: "team", teamId: focus.targetId, highlightBounds: focus.highlightBounds }];
    case "presenter":
      return [{ kind: "people-root" }];
  }
}

/** Close the panel at `index` and everything to its right. */
export function closeAt(stack: readonly StackFocusEntry[], index: number): StackFocusEntry[] {
  if (index < 0) return [];
  return stack.slice(0, index);
}

/**
 * Replace everything after `parentIndex` with a single branch entry. Call
 * sites pass the index of the parent panel so children can manage their own
 * branches without walking the stack.
 */
export function setBranchAt(
  stack: readonly StackFocusEntry[],
  parentIndex: number,
  branch: StackFocusEntry | null,
): StackFocusEntry[] {
  const base = stack.slice(0, parentIndex + 1);
  if (!branch) return base;
  const existing = stack[parentIndex + 1];
  if (existing && entriesEqual(existing, branch)) {
    return stack.slice(0, parentIndex + 2);
  }
  return [...base, branch];
}

export function entriesEqual(a: StackFocusEntry, b: StackFocusEntry): boolean {
  if (a.kind !== b.kind) return false;
  switch (a.kind) {
    case "room":
      return b.kind === "room" && a.roomId === b.roomId;
    case "operator":
      return b.kind === "operator" && a.operatorId === b.operatorId;
    case "visitor":
      return b.kind === "visitor" && a.visitorId === b.visitorId;
    case "team":
      return b.kind === "team" && a.teamId === b.teamId;
    case "room-upgrades":
      return b.kind === "room-upgrades" && a.roomId === b.roomId;
    case "place-room":
      return b.kind === "place-room" && a.slotId === b.slotId;
    case "replace-operator":
      return b.kind === "replace-operator" && a.visitorId === b.visitorId;
    default:
      return true;
  }
}

/**
 * Replace the stack root with a new entry, clearing every branch beneath it.
 * If the new root is null the stack is cleared. If the caller explicitly
 * wants toggle-off semantics (e.g. clicking an active category pill), it must
 * pass null itself.
 */
export function replaceRoot(
  stack: readonly StackFocusEntry[],
  next: StackFocusEntry | null,
): StackFocusEntry[] {
  if (!next) return [];
  return [next];
}

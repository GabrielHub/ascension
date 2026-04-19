import type { FocusPayload } from "render";

export type OpsCategory = "contract" | "active" | "opportunities" | "history";

type HighlightBounds = FocusPayload["highlightBounds"];

/**
 * "World-backed" entries (currently only `team`) carry a focus target that the
 * raid world consumes via `effectiveFocusFromStack`. All other entries are
 * synthetic and exist only inside the panel layer.
 */
export type OpsStackEntry =
  | { kind: "contract-root" }
  | { kind: "active-root" }
  | { kind: "opportunities-root" }
  | { kind: "history-root" }
  | { kind: "team"; teamId: string; highlightBounds: HighlightBounds }
  | { kind: "posting-board" }
  | { kind: "posting"; postingId: string }
  | { kind: "contract-review" }
  | { kind: "contract-site" }
  | { kind: "opportunity"; opportunityId: string }
  | { kind: "raid-summary"; summaryId: string };

export function effectiveFocusFromStack(stack: readonly OpsStackEntry[]): FocusPayload | null {
  for (let i = stack.length - 1; i >= 0; i--) {
    const entry = stack[i]!;
    if (entry.kind === "team") {
      return {
        targetKind: "team",
        targetId: entry.teamId,
        highlightBounds: entry.highlightBounds,
      };
    }
  }
  return null;
}

export function categoryFromStack(stack: readonly OpsStackEntry[]): OpsCategory | null {
  if (stack.length === 0) return null;
  const root = stack[0]!;
  switch (root.kind) {
    case "contract-root":
    case "posting-board":
    case "posting":
    case "contract-review":
    case "contract-site":
      return "contract";
    case "active-root":
    case "team":
      return "active";
    case "opportunities-root":
    case "opportunity":
      return "opportunities";
    case "history-root":
    case "raid-summary":
      return "history";
  }
}

export function rootEntryForCategory(category: OpsCategory): OpsStackEntry {
  switch (category) {
    case "contract":
      return { kind: "contract-root" };
    case "active":
      return { kind: "active-root" };
    case "opportunities":
      return { kind: "opportunities-root" };
    case "history":
      return { kind: "history-root" };
  }
}

export function stackFromFocus(focus: FocusPayload | null): OpsStackEntry[] {
  if (!focus) return [];
  if (focus.targetKind !== "team") return [];
  return [
    { kind: "active-root" },
    { kind: "team", teamId: focus.targetId, highlightBounds: focus.highlightBounds },
  ];
}

export function closeAt(stack: readonly OpsStackEntry[], index: number): OpsStackEntry[] {
  if (index < 0) return [];
  return stack.slice(0, index);
}

export function setBranchAt(
  stack: readonly OpsStackEntry[],
  parentIndex: number,
  branch: OpsStackEntry | null,
): OpsStackEntry[] {
  const base = stack.slice(0, parentIndex + 1);
  if (!branch) return base;
  const existing = stack[parentIndex + 1];
  if (existing && entriesEqual(existing, branch)) {
    return stack.slice(0, parentIndex + 2);
  }
  return [...base, branch];
}

export function entriesEqual(a: OpsStackEntry, b: OpsStackEntry): boolean {
  if (a.kind !== b.kind) return false;
  switch (a.kind) {
    case "team":
      return b.kind === "team" && a.teamId === b.teamId;
    case "posting":
      return b.kind === "posting" && a.postingId === b.postingId;
    case "opportunity":
      return b.kind === "opportunity" && a.opportunityId === b.opportunityId;
    case "raid-summary":
      return b.kind === "raid-summary" && a.summaryId === b.summaryId;
    default:
      return true;
  }
}

import { describe, expect, it } from "vitest";

import type { NavigationGraph } from "render/types";

import { findPath, interpolatePathPosition } from "./navigation";

describe("findPath", () => {
  it("chooses the lowest-total-cost route instead of the fewest hops", () => {
    const graph: NavigationGraph = {
      anchors: [
        { id: "room/a", roomId: "room/a", kind: "entry", x: 0, y: 0 },
        { id: "room/b", roomId: "room/b", kind: "entry", x: 10, y: 0 },
        { id: "room/c", roomId: "room/c", kind: "entry", x: 20, y: 0 },
      ],
      connectors: [
        {
          id: "a->c",
          fromAnchorId: "room/a",
          toAnchorId: "room/c",
          waypoints: [],
          traversalMs: 100,
        },
        {
          id: "a->b",
          fromAnchorId: "room/a",
          toAnchorId: "room/b",
          waypoints: [],
          traversalMs: 10,
        },
        {
          id: "b->c",
          fromAnchorId: "room/b",
          toAnchorId: "room/c",
          waypoints: [],
          traversalMs: 10,
        },
      ],
    };

    expect(findPath(graph, "room/a", "room/c")).toEqual({
      anchorIds: ["room/a", "room/b", "room/c"],
      totalMs: 20,
    });
  });
});

describe("interpolatePathPosition", () => {
  it("honors connector traversal time instead of raw path length", () => {
    const graph: NavigationGraph = {
      anchors: [
        { id: "room/a", roomId: "room/a", kind: "entry", x: 0, y: 0 },
        { id: "room/b", roomId: "room/b", kind: "entry", x: 10, y: 0 },
        { id: "room/c", roomId: "room/c", kind: "entry", x: 210, y: 0 },
      ],
      connectors: [
        {
          id: "a->b",
          fromAnchorId: "room/a",
          toAnchorId: "room/b",
          waypoints: [],
          traversalMs: 900,
        },
        {
          id: "b->c",
          fromAnchorId: "room/b",
          toAnchorId: "room/c",
          waypoints: [],
          traversalMs: 100,
        },
      ],
    };

    const position = interpolatePathPosition(
      graph,
      {
        anchorIds: ["room/a", "room/b", "room/c"],
        totalMs: 1000,
      },
      0.5,
    );

    expect(position.x).toBeGreaterThan(0);
    expect(position.x).toBeLessThan(10);
    expect(position.y).toBe(0);
  });
});

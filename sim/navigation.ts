import type { NavAnchor, NavAnchorKind, NavConnector, NavigationGraph } from "render/types";

// ── Navigation graph builder ──────────────────────────────────────────────

/**
 * Build an authored navigation graph from room layout data.
 * Each room gets anchors for entry plus one per function kind.
 * Connectors link rooms through their entry anchors with waypoints
 * that pass through a shared corridor Y band.
 */
export function buildNavigationGraph(
  rooms: readonly {
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    functionTag: string;
    entryX?: number;
    entryY?: number;
  }[],
): NavigationGraph {
  const anchors: NavAnchor[] = [];
  const connectors: NavConnector[] = [];

  // Build anchors for each room
  for (const room of rooms) {
    const cx = room.x + room.width / 2;
    const cy = room.y + room.height / 2;

    // Entry anchor at the room's door (top-center)
    anchors.push({
      id: `${room.id}/entry`,
      roomId: room.id,
      kind: "entry",
      x: room.entryX ?? cx,
      y: room.entryY ?? room.y,
    });

    // Functional anchors distributed within the room
    const kinds = getAnchorKindsForRoom(room.functionTag);
    const spacing = room.width / (kinds.length + 1);

    for (let i = 0; i < kinds.length; i++) {
      anchors.push({
        id: `${room.id}/${kinds[i]}-${i}`,
        roomId: room.id,
        kind: kinds[i],
        x: room.x + spacing * (i + 1),
        y: cy + room.height * (0.08 + (i % 2) * 0.18),
      });
    }
  }

  // Build connectors between every pair of room entry anchors
  // using a corridor band running through the interior of the building.
  const entryAnchors = anchors.filter((a) => a.kind === "entry");
  // Place the corridor at the vertical center of all rooms so operators
  // stay inside the building when moving between rooms.
  const allYMidpoints = rooms.map((r) => r.y + r.height / 2);
  const corridorY =
    allYMidpoints.length > 0 ? (Math.min(...allYMidpoints) + Math.max(...allYMidpoints)) / 2 : 0;

  for (let i = 0; i < entryAnchors.length; i++) {
    for (let j = i + 1; j < entryAnchors.length; j++) {
      const from = entryAnchors[i];
      const to = entryAnchors[j];
      const distance = Math.abs(from.x - to.x) + Math.abs(from.y - to.y);

      connectors.push({
        id: `connector/${from.id}->${to.id}`,
        fromAnchorId: from.id,
        toAnchorId: to.id,
        waypoints: [
          { x: from.x, y: corridorY },
          { x: to.x, y: corridorY },
        ],
        traversalMs: Math.max(800, distance * 3),
      });
    }
  }

  // Intra-room connectors: entry to each functional anchor
  for (const room of rooms) {
    const entry = anchors.find((a) => a.id === `${room.id}/entry`);
    if (!entry) continue;

    const roomAnchors = anchors.filter((a) => a.roomId === room.id && a.kind !== "entry");

    for (const target of roomAnchors) {
      connectors.push({
        id: `connector/${entry.id}->${target.id}`,
        fromAnchorId: entry.id,
        toAnchorId: target.id,
        waypoints: [],
        traversalMs: 400,
      });
    }
  }

  return { anchors, connectors };
}

function getAnchorKindsForRoom(functionTag: string): NavAnchorKind[] {
  switch (functionTag) {
    case "room:recovery":
      return ["recovery", "idle", "social"];
    case "room:social":
      return ["social", "idle", "work"];
    case "room:training":
      return ["work", "idle", "work"];
    case "room:operations":
      return ["work", "idle", "work"];
    case "room:staffing":
      return ["work", "idle", "social"];
    default:
      return ["idle", "work", "social"];
  }
}

// ── Path finding ──────────────────────────────────────────────────────────

export interface NavPath {
  anchorIds: readonly string[];
  totalMs: number;
}

/**
 * Find a path from one anchor to another using BFS over connectors.
 * Returns the sequence of anchor IDs and total traversal time.
 */
export function findPath(
  graph: NavigationGraph,
  fromAnchorId: string,
  toAnchorId: string,
): NavPath | null {
  if (fromAnchorId === toAnchorId) {
    return { anchorIds: [fromAnchorId], totalMs: 0 };
  }

  // Build adjacency map
  const adjacency = new Map<
    string,
    Array<{ neighborId: string; connectorId: string; ms: number }>
  >();
  for (const connector of graph.connectors) {
    if (!adjacency.has(connector.fromAnchorId)) adjacency.set(connector.fromAnchorId, []);
    if (!adjacency.has(connector.toAnchorId)) adjacency.set(connector.toAnchorId, []);
    adjacency.get(connector.fromAnchorId)!.push({
      neighborId: connector.toAnchorId,
      connectorId: connector.id,
      ms: connector.traversalMs,
    });
    adjacency.get(connector.toAnchorId)!.push({
      neighborId: connector.fromAnchorId,
      connectorId: connector.id,
      ms: connector.traversalMs,
    });
  }

  const frontier: Array<{ anchorId: string; path: string[]; pathKey: string; totalMs: number }> = [
    { anchorId: fromAnchorId, path: [fromAnchorId], pathKey: fromAnchorId, totalMs: 0 },
  ];
  const bestByAnchor = new Map<string, { totalMs: number; pathKey: string }>([
    [fromAnchorId, { totalMs: 0, pathKey: fromAnchorId }],
  ]);

  while (frontier.length > 0) {
    frontier.sort(
      (a, b) =>
        a.totalMs - b.totalMs ||
        a.path.length - b.path.length ||
        a.pathKey.localeCompare(b.pathKey),
    );
    const current = frontier.shift()!;
    const bestForCurrent = bestByAnchor.get(current.anchorId);
    if (
      !bestForCurrent ||
      current.totalMs > bestForCurrent.totalMs ||
      (current.totalMs === bestForCurrent.totalMs && current.pathKey !== bestForCurrent.pathKey)
    ) {
      continue;
    }

    if (current.anchorId === toAnchorId) {
      return { anchorIds: current.path, totalMs: current.totalMs };
    }

    const neighbors = adjacency.get(current.anchorId) ?? [];

    // Sort neighbors for deterministic path selection
    const sorted = [...neighbors].sort(
      (a, b) => a.ms - b.ms || a.neighborId.localeCompare(b.neighborId),
    );

    for (const neighbor of sorted) {
      const nextPath = [...current.path, neighbor.neighborId];
      const nextMs = current.totalMs + neighbor.ms;
      const nextPathKey = nextPath.join(">");
      const bestKnown = bestByAnchor.get(neighbor.neighborId);
      if (
        bestKnown &&
        (bestKnown.totalMs < nextMs ||
          (bestKnown.totalMs === nextMs && bestKnown.pathKey <= nextPathKey))
      ) {
        continue;
      }

      bestByAnchor.set(neighbor.neighborId, {
        totalMs: nextMs,
        pathKey: nextPathKey,
      });
      frontier.push({
        anchorId: neighbor.neighborId,
        path: nextPath,
        pathKey: nextPathKey,
        totalMs: nextMs,
      });
    }
  }

  return null;
}

// ── Interpolation ─────────────────────────────────────────────────────────

/**
 * Resolve the world-space position along a path at a given progress (0..1).
 * Interpolates linearly through anchor positions and connector waypoints.
 */
export function interpolatePathPosition(
  graph: NavigationGraph,
  path: NavPath,
  progress: number,
): { x: number; y: number } {
  const clamped = Math.max(0, Math.min(1, progress));

  if (path.anchorIds.length <= 1) {
    const anchor = graph.anchors.find((a) => a.id === path.anchorIds[0]);
    return anchor ? { x: anchor.x, y: anchor.y } : { x: 0, y: 0 };
  }

  const anchorById = new Map(graph.anchors.map((a) => [a.id, a]));
  const connectorIndex = new Map<string, NavConnector>();
  for (const c of graph.connectors) {
    connectorIndex.set(`${c.fromAnchorId}->${c.toAnchorId}`, c);
    connectorIndex.set(`${c.toAnchorId}->${c.fromAnchorId}`, c);
  }

  const legs: Array<{ traversalMs: number; points: Array<{ x: number; y: number }> }> = [];
  for (let i = 1; i < path.anchorIds.length; i++) {
    const fromAnchor = anchorById.get(path.anchorIds[i - 1]);
    const toAnchor = anchorById.get(path.anchorIds[i]);
    const connector = connectorIndex.get(`${path.anchorIds[i - 1]}->${path.anchorIds[i]}`);
    if (!fromAnchor || !toAnchor || !connector) {
      continue;
    }

    const isForward = connector.fromAnchorId === path.anchorIds[i - 1];
    const waypoints = isForward ? connector.waypoints : [...connector.waypoints].reverse();
    legs.push({
      traversalMs: connector.traversalMs,
      points: [fromAnchor, ...waypoints, toAnchor].map((point) => ({ x: point.x, y: point.y })),
    });
  }

  if (legs.length === 0) {
    const fallbackAnchor = anchorById.get(path.anchorIds[0]);
    return fallbackAnchor ? { x: fallbackAnchor.x, y: fallbackAnchor.y } : { x: 0, y: 0 };
  }

  let remainingMs = clamped * path.totalMs;
  for (const leg of legs) {
    if (remainingMs <= leg.traversalMs) {
      return interpolatePolylinePosition(
        leg.points,
        leg.traversalMs > 0 ? remainingMs / leg.traversalMs : 1,
      );
    }
    remainingMs -= leg.traversalMs;
  }

  return interpolatePolylinePosition(legs[legs.length - 1].points, 1);
}

function interpolatePolylinePosition(
  points: readonly { x: number; y: number }[],
  progress: number,
): { x: number; y: number } {
  if (points.length === 0) {
    return { x: 0, y: 0 };
  }
  if (points.length === 1) {
    return points[0];
  }

  const clamped = Math.max(0, Math.min(1, progress));
  let totalDist = 0;
  const segmentDists: number[] = [];
  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - points[i - 1].x;
    const dy = points[i].y - points[i - 1].y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    segmentDists.push(distance);
    totalDist += distance;
  }

  if (totalDist === 0) {
    return points[0];
  }

  let targetDist = clamped * totalDist;
  for (let i = 0; i < segmentDists.length; i++) {
    if (targetDist <= segmentDists[i]) {
      const segmentProgress = segmentDists[i] > 0 ? targetDist / segmentDists[i] : 0;
      return {
        x: points[i].x + (points[i + 1].x - points[i].x) * segmentProgress,
        y: points[i].y + (points[i + 1].y - points[i].y) * segmentProgress,
      };
    }
    targetDist -= segmentDists[i];
  }

  return points[points.length - 1];
}

// ── Anchor resolution ─────────────────────────────────────────────────────

/**
 * Pick the best anchor in a room for a given activity.
 * Falls back to the first available anchor if no kind match.
 */
export function resolveRoomAnchor(
  graph: NavigationGraph,
  roomId: string,
  preferredKind: NavAnchorKind,
): NavAnchor | null {
  const roomAnchors = graph.anchors.filter((a) => a.roomId === roomId);
  return (
    roomAnchors.find((a) => a.kind === preferredKind) ??
    roomAnchors.find((a) => a.kind === "idle") ??
    roomAnchors[0] ??
    null
  );
}

import type { NavAnchor, NavAnchorKind, NavConnector, NavigationGraph } from "lib/navigation-graph";

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

  for (const room of rooms) {
    const cx = room.x + room.width / 2;
    const cy = room.y + room.height / 2;

    anchors.push({
      id: `${room.id}/entry`,
      roomId: room.id,
      kind: "entry",
      x: room.entryX ?? cx,
      y: room.entryY ?? room.y,
    });

    const kinds = getAnchorKindsForRoom(room.functionTag);
    const spacing = room.width / (kinds.length + 1);

    for (let index = 0; index < kinds.length; index += 1) {
      anchors.push({
        id: `${room.id}/${kinds[index]}-${index}`,
        roomId: room.id,
        kind: kinds[index],
        x: room.x + spacing * (index + 1),
        y: cy + room.height * (0.08 + (index % 2) * 0.18),
      });
    }
  }

  const entryAnchors = anchors.filter((anchor) => anchor.kind === "entry");
  const allYMidpoints = rooms.map((room) => room.y + room.height / 2);
  const corridorY =
    allYMidpoints.length > 0 ? (Math.min(...allYMidpoints) + Math.max(...allYMidpoints)) / 2 : 0;

  for (let index = 0; index < entryAnchors.length; index += 1) {
    for (let otherIndex = index + 1; otherIndex < entryAnchors.length; otherIndex += 1) {
      const from = entryAnchors[index];
      const to = entryAnchors[otherIndex];
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

  for (const room of rooms) {
    const entry = anchors.find((anchor) => anchor.id === `${room.id}/entry`);
    if (!entry) {
      continue;
    }

    const roomAnchors = anchors.filter(
      (anchor) => anchor.roomId === room.id && anchor.kind !== "entry",
    );

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
    case "room:operations":
      return ["work", "idle", "work"];
    case "room:logistics":
      return ["work", "idle", "social"];
    default:
      return ["idle", "work", "social"];
  }
}

export interface NavPath {
  anchorIds: readonly string[];
  totalMs: number;
}

export function findPath(
  graph: NavigationGraph,
  fromAnchorId: string,
  toAnchorId: string,
): NavPath | null {
  if (fromAnchorId === toAnchorId) {
    return { anchorIds: [fromAnchorId], totalMs: 0 };
  }

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
      (left, right) =>
        left.totalMs - right.totalMs ||
        left.path.length - right.path.length ||
        left.pathKey.localeCompare(right.pathKey),
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
    const sorted = [...neighbors].sort(
      (left, right) => left.ms - right.ms || left.neighborId.localeCompare(right.neighborId),
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

export function interpolatePathPosition(
  graph: NavigationGraph,
  path: NavPath,
  progress: number,
): { x: number; y: number } {
  const clamped = Math.max(0, Math.min(1, progress));

  if (path.anchorIds.length <= 1) {
    const anchor = graph.anchors.find((candidate) => candidate.id === path.anchorIds[0]);
    return anchor ? { x: anchor.x, y: anchor.y } : { x: 0, y: 0 };
  }

  const anchorById = new Map(graph.anchors.map((anchor) => [anchor.id, anchor]));
  const connectorIndex = new Map<string, NavConnector>();
  for (const connector of graph.connectors) {
    connectorIndex.set(`${connector.fromAnchorId}->${connector.toAnchorId}`, connector);
    connectorIndex.set(`${connector.toAnchorId}->${connector.fromAnchorId}`, connector);
  }

  const legs: Array<{ traversalMs: number; points: Array<{ x: number; y: number }> }> = [];
  for (let index = 1; index < path.anchorIds.length; index += 1) {
    const fromAnchor = anchorById.get(path.anchorIds[index - 1]);
    const toAnchor = anchorById.get(path.anchorIds[index]);
    const connector = connectorIndex.get(`${path.anchorIds[index - 1]}->${path.anchorIds[index]}`);
    if (!fromAnchor || !toAnchor || !connector) {
      continue;
    }

    const isForward = connector.fromAnchorId === path.anchorIds[index - 1];
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
  for (let index = 1; index < points.length; index += 1) {
    const dx = points[index].x - points[index - 1].x;
    const dy = points[index].y - points[index - 1].y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    segmentDists.push(distance);
    totalDist += distance;
  }

  if (totalDist === 0) {
    return points[0];
  }

  let targetDist = clamped * totalDist;
  for (let index = 0; index < segmentDists.length; index += 1) {
    if (targetDist <= segmentDists[index]) {
      const segmentProgress = segmentDists[index] > 0 ? targetDist / segmentDists[index] : 0;
      return {
        x: points[index].x + (points[index + 1].x - points[index].x) * segmentProgress,
        y: points[index].y + (points[index + 1].y - points[index].y) * segmentProgress,
      };
    }
    targetDist -= segmentDists[index];
  }

  return points[points.length - 1];
}

export function resolveRoomAnchor(
  graph: NavigationGraph,
  roomId: string,
  preferredKind: NavAnchorKind,
): NavAnchor | null {
  const roomAnchors = graph.anchors.filter((anchor) => anchor.roomId === roomId);
  return (
    roomAnchors.find((anchor) => anchor.kind === preferredKind) ??
    roomAnchors.find((anchor) => anchor.kind === "idle") ??
    roomAnchors[0] ??
    null
  );
}

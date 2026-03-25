export type NavAnchorKind = "entry" | "idle" | "work" | "social" | "recovery";

export interface NavAnchor {
  id: string;
  roomId: string;
  kind: NavAnchorKind;
  x: number;
  y: number;
}

export interface NavConnector {
  id: string;
  fromAnchorId: string;
  toAnchorId: string;
  waypoints: readonly Readonly<{ x: number; y: number }>[];
  traversalMs: number;
}

export interface NavigationGraph {
  anchors: readonly NavAnchor[];
  connectors: readonly NavConnector[];
}

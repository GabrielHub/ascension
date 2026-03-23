export type { HqTimeOfDayPhase } from "lib/hq-time-phase";
export type { HqBackdropZone } from "lib/hq-environment-manifest";

import type { HqTimeOfDayPhase } from "lib/hq-time-phase";
import type { HqBackdropZone } from "lib/hq-environment-manifest";

export interface HqBackdropSnapshot {
  phase: HqTimeOfDayPhase;
  profileId: string;
  elevationBandId: string | null;
  zones: Readonly<Record<HqBackdropZone, readonly string[]>>;
  ambientTint: string;
  fogColor: string;
  shadowIntensity: number;
}

export interface CameraState {
  x: number;
  y: number;
  zoom: number;
}

export interface CameraBounds {
  minZoom: number;
  maxZoom: number;
  worldWidth: number;
  worldHeight: number;
}

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

export type ActorKind = "operator" | "staff" | "visitor";
export type ActorState =
  | "idle"
  | "moving"
  | "working"
  | "socializing"
  | "recovering"
  | "resting"
  | "training"
  | "deployed";

export interface ActorTokenPalette {
  skin: string;
  hair: string;
  clothing: string;
  accent: string;
}

export interface ActorMarker {
  id: string;
  kind: ActorKind;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  roomId: string;
  label: string;
  presetId: string;
  roleTag?: string;
  state: ActorState;
  moveProgress: number;
  tokenPalette?: ActorTokenPalette;
  portraitUrl?: string;
}

export interface WorldEffectsSnapshot {
  ambientTint: string;
  fogColor: string;
  focusDimAlpha: number;
  focusTargetId: string | null;
  shadowIntensity: number;
}

export type FocusTargetKind = "room" | "operator" | "staff" | "team";

export interface FocusPayload {
  targetKind: FocusTargetKind;
  targetId: string;
  highlightBounds: Readonly<{ x: number; y: number; width: number; height: number }> | null;
}

export interface HqFootprint {
  col: number;
  row: number;
  cols: number;
  rows: number;
}

export interface HqPoint {
  x: number;
  y: number;
}

export interface HqWorldLayout {
  tileWidth: number;
  tileHeight: number;
  wallHeight: number;
  originX: number;
  originY: number;
  worldWidth: number;
  worldHeight: number;
  minX: number;
  minY: number;
  /** World-space size of the building shell (for camera zoom limits). */
  buildingWorldSize?: { width: number; height: number };
}

export interface HqSpritePlacement {
  id: string;
  assetUrl: string;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  opacity: number;
}

export interface HqRoomNode {
  id: string;
  templateId: string;
  label: string;
  tier: number;
  isRequestedActive: boolean;
  isOperational: boolean;
  functionTag: string;
  footprint: HqFootprint;
  floorPoints: readonly HqPoint[];
  leftWallPoints: readonly HqPoint[];
  rightWallPoints: readonly HqPoint[];
  bounds: Readonly<{ x: number; y: number; width: number; height: number }>;
}

export interface HqExpansionSlotNode {
  id: string;
  label: string;
  footprint: HqFootprint;
  floorPoints: readonly HqPoint[];
  leftWallPoints: readonly HqPoint[];
  rightWallPoints: readonly HqPoint[];
  bounds: Readonly<{ x: number; y: number; width: number; height: number }>;
}

// ── Modular tile geometry ─────────────────────────────────────────────────

export interface HqFloorTile {
  col: number;
  row: number;
  tint: string;
  roomId: string;
}

export type HqWallKind = "solid" | "opening" | "window";
export type HqWallSide = "left" | "right";

export interface HqWallSegment {
  col: number;
  row: number;
  side: HqWallSide;
  kind: HqWallKind;
  tint: string;
  roomId: string;
}

export type HqPerimeterKind = "sidewalk" | "street" | "alley" | "void";

export interface HqPerimeterTile {
  col: number;
  row: number;
  kind: HqPerimeterKind;
}

export interface HqModularGeometry {
  floorTiles: readonly HqFloorTile[];
  wallSegments: readonly HqWallSegment[];
  perimeterTiles: readonly HqPerimeterTile[];
}

// ── HQ world snapshot ─────────────────────────────────────────────────────

export interface HqWorldSnapshot {
  buildingName: string;
  layout: HqWorldLayout;
  rooms: readonly HqRoomNode[];
  expansionSlots: readonly HqExpansionSlotNode[];
  modular: HqModularGeometry;
  roomProps: readonly HqSpritePlacement[];
  scenery: readonly HqSpritePlacement[];
  actors: readonly ActorMarker[];
  navGraph: NavigationGraph;
  effects: WorldEffectsSnapshot;
  backdrop: HqBackdropSnapshot | null;
  focus: FocusPayload | null;
}

export type RaidTeamGoal =
  | "exploring"
  | "looting"
  | "intel"
  | "hunting"
  | "boss"
  | "retreating"
  | "regrouping";

export interface RaidTeamMarker {
  teamId: string;
  raidId: string;
  operatorIds: readonly string[];
  x: number;
  y: number;
  goal: RaidTeamGoal;
  state: "active" | "returning" | "defeated";
}

export interface FogCell {
  x: number;
  y: number;
  revealed: boolean;
}

export type EnemyThreatLevel = "generic" | "elite" | "boss";

export interface RaidEnemyMarker {
  id: string;
  x: number;
  y: number;
  threat: EnemyThreatLevel;
  discovered: boolean;
}

export type DungeonFeatureKind = "loot-cache" | "intel-node" | "hazard-zone" | "debris-pile";

export interface DungeonFeatureMarker {
  id: string;
  x: number;
  y: number;
  kind: DungeonFeatureKind;
  discovered: boolean;
}

export interface RaidWorldSnapshot {
  dungeonName: string;
  contractSiteId: string;
  dungeonWidth: number;
  dungeonHeight: number;
  teams: readonly RaidTeamMarker[];
  enemies: readonly RaidEnemyMarker[];
  features: readonly DungeonFeatureMarker[];
  fogMask: readonly FogCell[];
  effects: WorldEffectsSnapshot;
  focus: FocusPayload | null;
}

export interface SvgPartDefinition {
  id: string;
  category: "body" | "face" | "hair" | "clothing" | "accessory";
  tags: readonly string[];
  paletteTags: readonly string[];
  roleTags: readonly string[];
  bodyCompatibility: readonly string[];
  poseCompatibility: readonly string[];
  rarity: "common" | "uncommon" | "rare";
  markup: string;
}

export interface SvgPartQuery {
  category?: SvgPartDefinition["category"];
  tags?: readonly string[];
  roleTags?: readonly string[];
  bodyCompatibility?: string;
  poseCompatibility?: string;
  paletteTag?: string;
}

export interface SvgPartMatch {
  part: SvgPartDefinition;
  score: number;
}

export interface SvgCompositionLayer {
  partId: string;
  markup: string;
  zIndex: number;
}

export interface SvgCompositionRecipe {
  layers: readonly SvgCompositionLayer[];
}

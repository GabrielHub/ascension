import { useCallback, useEffect, useRef } from "react";

import {
  applyWheelZoom,
  beginPan,
  buildFocusHighlight,
  clampCamera,
  createCameraBounds,
  createCameraState,
  createPanState,
  endPan,
  screenToWorld,
  updatePan,
  type PanState,
} from "./camera";
import type {
  ActorMarker,
  CameraBounds,
  CameraState,
  FocusPayload,
  HqBackdropSnapshot,
  HqPerimeterTile,
  HqPoint,
  HqRoomNode,
  HqSpritePlacement,
  HqTimeOfDayPhase,
  HqWallSegment,
  HqWorldSnapshot,
  RaidWorldSnapshot,
} from "./types";
import { drawAmbientTint, drawFocusDimming, drawFogOfWar } from "./world-effects";
import {
  classifyCell,
  drawChamberTile,
  drawCorridorTile,
  drawEnemyMarker,
  drawFeatureMarker,
  drawFogEdges,
  drawTeamMarker,
  RAID_VOID,
} from "app/ui/raid-world";
import { getActorPortraitUrl } from "./actor-tokens";
import { roundRect } from "./canvas-utils";
import { projectIso } from "./hq-world";
import { getHqEnvironmentRenderConfig } from "lib/hq-environment-manifest";
import { formatSlotLabel, getRoomStateLabel } from "lib/hq-room-state";

const ASSET_ROOT = getHqEnvironmentRenderConfig().paths.partsRoot;
const FONT_FAMILY = "'Inter', sans-serif";
const GOLD = "#c8a84c";
const GOLD_DIM = "rgba(200, 168, 76, 0.28)";
const SILVER_BRIGHT = "#f0ece4";
const SILVER = "rgba(224, 221, 214, 0.72)";
const ACTOR_RADIUS = 12;
const ACTOR_FILL_OPERATOR = "#c8a84c";
const ACTOR_FILL_STAFF = "rgba(224, 221, 214, 0.7)";
const ACTOR_FILL_VISITOR = "rgba(212, 84, 30, 0.8)";
const FOCUS_HIGHLIGHT_BORDER = "rgba(200, 168, 76, 0.5)";
const FOCUS_HIGHLIGHT_GLOW = "rgba(200, 168, 76, 0.12)";
const HOVER_BORDER = "rgba(200, 168, 76, 0.3)";
const RAID_FOG_CELL = 32;
const TOKEN_W = 48;
const TOKEN_H = 60;

interface CanvasViewport {
  width: number;
  height: number;
  dpr: number;
}

const DEFAULT_VIEWPORT: CanvasViewport = {
  width: 800,
  height: 600,
  dpr: 1,
};

// ── Phase-aware perimeter fill colors ──────────────────────────────────────

type PerimeterPalette = Record<HqPerimeterTile["kind"], string>;

const PERIMETER_FILLS: Record<HqTimeOfDayPhase, PerimeterPalette> = {
  day: {
    sidewalk: "#6e645a",
    street: "#3a3a44",
    alley: "#2e2e38",
    void: "#24242e",
  },
  sunrise: {
    sidewalk: "#5a4e3e",
    street: "#2e2824",
    alley: "#201c18",
    void: "#181410",
  },
  sunset: {
    sidewalk: "#5a4430",
    street: "#2c2220",
    alley: "#1e1614",
    void: "#161010",
  },
  night: {
    sidewalk: "#3c362a",
    street: "#1a1a20",
    alley: "#0e0e14",
    void: "#0a0a0e",
  },
};

const PERIMETER_STROKES: Record<HqTimeOfDayPhase, PerimeterPalette> = {
  day: {
    sidewalk: "rgba(255, 255, 255, 0.10)",
    street: "rgba(255, 255, 255, 0.04)",
    alley: "rgba(255, 255, 255, 0.03)",
    void: "rgba(255, 255, 255, 0.01)",
  },
  sunrise: {
    sidewalk: "rgba(255, 220, 180, 0.08)",
    street: "rgba(255, 220, 180, 0.03)",
    alley: "rgba(255, 220, 180, 0.02)",
    void: "rgba(255, 220, 180, 0.005)",
  },
  sunset: {
    sidewalk: "rgba(255, 180, 120, 0.10)",
    street: "rgba(255, 180, 120, 0.04)",
    alley: "rgba(255, 180, 120, 0.03)",
    void: "rgba(255, 180, 120, 0.01)",
  },
  night: {
    sidewalk: "rgba(255, 255, 255, 0.05)",
    street: "rgba(255, 255, 255, 0.02)",
    alley: "rgba(255, 255, 255, 0.015)",
    void: "rgba(255, 255, 255, 0.005)",
  },
};

// ── SVG image cache ───────────────────────────────────────────────────────

class SvgImageCache {
  private cache = new Map<string, HTMLImageElement>();
  private pending = new Map<string, Promise<HTMLImageElement>>();
  private failed = new Set<string>();

  get(url: string): HTMLImageElement | null {
    return this.cache.get(url) ?? null;
  }

  load(url: string): HTMLImageElement | null {
    const cached = this.cache.get(url);
    if (cached) return cached;
    if (this.failed.has(url)) return null;

    if (!this.pending.has(url)) {
      const promise = new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          this.cache.set(url, img);
          this.pending.delete(url);
          resolve(img);
        };
        img.onerror = () => {
          this.pending.delete(url);
          this.failed.add(url);
          reject(new Error(`Failed to load SVG: ${url}`));
        };
        img.src = url;
      });
      promise.catch(() => {}); // prevent unhandled rejection
      this.pending.set(url, promise);
    }

    return null;
  }

  hasFailed(url: string): boolean {
    return this.failed.has(url);
  }

  preloadAll(urls: readonly string[]): void {
    urls.forEach((url) => this.load(url));
  }
}

// ── Utility ───────────────────────────────────────────────────────────────

function idHash(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (h * 31 + id.charCodeAt(i)) | 0;
  }
  return h;
}

/** Simple noise for subtle per-tile color variation. */
function tileNoise(col: number, row: number): number {
  const n = Math.sin(col * 127.1 + row * 311.7) * 43758.5453;
  return n - Math.floor(n); // 0..1
}

function drawPolygon(
  ctx: CanvasRenderingContext2D,
  points: readonly HqPoint[],
  fillStyle: string | CanvasGradient,
  strokeStyle?: string,
): void {
  if (points.length === 0) return;
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].x, points[i].y);
  }
  ctx.closePath();
  ctx.fillStyle = fillStyle;
  ctx.fill();
  if (strokeStyle) {
    ctx.strokeStyle = strokeStyle;
    ctx.stroke();
  }
}

function hqProject(snapshot: HqWorldSnapshot, col: number, row: number): HqPoint {
  return projectIso(col, row, snapshot.layout.originX, snapshot.layout.originY);
}

interface GridBounds {
  minCol: number;
  maxCol: number;
  minRow: number;
  maxRow: number;
}

interface PreparedPerimeterRenderData {
  bounds: GridBounds | null;
  sortedTiles: readonly HqPerimeterTile[];
  kindMap: ReadonlyMap<string, HqPerimeterTile["kind"]>;
  centerLaneSet: ReadonlySet<string>;
}

const perimeterRenderPrepCache = new WeakMap<
  readonly HqPerimeterTile[],
  PreparedPerimeterRenderData
>();

function computeGridBounds(tiles: readonly { col: number; row: number }[]): GridBounds | null {
  if (tiles.length === 0) return null;
  let minCol = tiles[0].col;
  let maxCol = tiles[0].col;
  let minRow = tiles[0].row;
  let maxRow = tiles[0].row;
  for (let i = 1; i < tiles.length; i++) {
    const t = tiles[i];
    if (t.col < minCol) minCol = t.col;
    if (t.col > maxCol) maxCol = t.col;
    if (t.row < minRow) minRow = t.row;
    if (t.row > maxRow) maxRow = t.row;
  }
  return { minCol, maxCol, minRow, maxRow };
}

/** Diamond for a single tile using grid vertex positions (not center). */
function tileDiamond(snapshot: HqWorldSnapshot, col: number, row: number): HqPoint[] {
  const p0 = hqProject(snapshot, col, row);
  const p1 = hqProject(snapshot, col + 1, row);
  const p2 = hqProject(snapshot, col + 1, row + 1);
  const p3 = hqProject(snapshot, col, row + 1);
  return [p0, p1, p2, p3];
}

function measureCanvasViewport(canvas: HTMLCanvasElement): CanvasViewport {
  const rect = canvas.getBoundingClientRect();
  return {
    width: rect.width,
    height: rect.height,
    dpr: window.devicePixelRatio || 1,
  };
}

function syncCanvasBackingStore(canvas: HTMLCanvasElement, viewport: CanvasViewport): void {
  const nextW = Math.floor(viewport.width * viewport.dpr);
  const nextH = Math.floor(viewport.height * viewport.dpr);
  if (canvas.width !== nextW || canvas.height !== nextH) {
    canvas.width = nextW;
    canvas.height = nextH;
  }
}

export function preparePerimeterRenderData(
  tiles: readonly HqPerimeterTile[],
): PreparedPerimeterRenderData {
  const cached = perimeterRenderPrepCache.get(tiles);
  if (cached) return cached;

  const sortedTiles = tiles.slice().sort((a, b) => a.col + a.row - (b.col + b.row));
  const kindMap = new Map<string, HqPerimeterTile["kind"]>();
  for (const tile of tiles) {
    kindMap.set(`${tile.col},${tile.row}`, tile.kind);
  }

  const centerLaneSet = new Set<string>();
  for (const tile of tiles) {
    if (tile.kind !== "street") continue;
    let streetsAbove = 0;
    let streetsBelow = 0;
    for (let dr = 1; dr <= 8; dr++) {
      if (kindMap.get(`${tile.col},${tile.row - dr}`) === "street") streetsAbove++;
      else break;
    }
    for (let dr = 1; dr <= 8; dr++) {
      if (kindMap.get(`${tile.col},${tile.row + dr}`) === "street") streetsBelow++;
      else break;
    }
    if (streetsAbove >= 2 && streetsBelow >= 2) {
      centerLaneSet.add(`${tile.col},${tile.row}`);
    }
  }

  const prepared: PreparedPerimeterRenderData = {
    bounds: computeGridBounds(tiles),
    sortedTiles,
    kindMap,
    centerLaneSet,
  };
  perimeterRenderPrepCache.set(tiles, prepared);
  return prepared;
}

// ── Modular tile rendering ────────────────────────────────────────────────

function drawPerimeterTiles(ctx: CanvasRenderingContext2D, snapshot: HqWorldSnapshot): void {
  const phase: HqTimeOfDayPhase = snapshot.backdrop?.phase ?? "night";
  const fills = PERIMETER_FILLS[phase];
  const strokes = PERIMETER_STROKES[phase];
  const perimeterData = preparePerimeterRenderData(snapshot.modular.perimeterTiles);

  // Solid opaque ground plane behind the iso diamonds to prevent
  // flanking buildings bleeding through the gaps between tiles.
  // Extends well beyond tiles to cover viewport corners.
  const periBounds = perimeterData.bounds;
  if (periBounds) {
    const EXT = 30;
    const pMin = hqProject(snapshot, periBounds.minCol - EXT, periBounds.minRow - EXT);
    const pMaxCol = hqProject(snapshot, periBounds.maxCol + 1 + EXT, periBounds.minRow - EXT);
    const pMaxRow = hqProject(snapshot, periBounds.minCol - EXT, periBounds.maxRow + 1 + EXT);
    const pMax = hqProject(snapshot, periBounds.maxCol + 1 + EXT, periBounds.maxRow + 1 + EXT);
    const groundPoly: HqPoint[] = [pMin, pMaxCol, pMax, pMaxRow];
    drawPolygon(ctx, groundPoly, fills.void);
  }

  for (const tile of perimeterData.sortedTiles) {
    const fill = fills[tile.kind];
    const stroke = strokes[tile.kind];
    const pts = tileDiamond(snapshot, tile.col, tile.row);
    drawPolygon(ctx, pts, fill, stroke);

    // Sidewalk crack details
    if (tile.kind === "sidewalk") {
      const noise = tileNoise(tile.col, tile.row);
      if (noise > 0.65) {
        const cx = (pts[0].x + pts[2].x) / 2;
        const cy = (pts[0].y + pts[2].y) / 2;
        ctx.strokeStyle = "rgba(255, 255, 255, 0.03)";
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(cx - 8, cy - 2);
        ctx.lineTo(cx + 6, cy + 3);
        ctx.stroke();
      }
    }

    // Street lane markings — double yellow center line
    if (tile.kind === "street") {
      const isCenterLane = perimeterData.centerLaneSet.has(`${tile.col},${tile.row}`);

      if (isCenterLane) {
        const cx = (pts[0].x + pts[2].x) / 2;
        const cy = (pts[0].y + pts[2].y) / 2;
        // Double yellow line — two parallel iso-aligned dashes
        ctx.strokeStyle = "rgba(200, 180, 80, 0.25)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(cx - 12, cy - 6 - 1.5);
        ctx.lineTo(cx + 12, cy + 6 - 1.5);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx - 12, cy - 6 + 1.5);
        ctx.lineTo(cx + 12, cy + 6 + 1.5);
        ctx.stroke();
      }

      // Sparse road texture on all street tiles
      const noise = tileNoise(tile.col, tile.row);
      if (noise > 0.7) {
        const cx = (pts[0].x + pts[2].x) / 2;
        const cy = (pts[0].y + pts[2].y) / 2;
        ctx.fillStyle = "rgba(255, 255, 255, 0.015)";
        ctx.fillRect(cx - 6, cy - 1, 12, 2);
      }
    }

    // Curb line: where sidewalk meets street (either side)
    if (tile.kind === "sidewalk") {
      const belowKey = `${tile.col},${tile.row + 1}`;
      const aboveKey = `${tile.col},${tile.row - 1}`;
      // Curb on near side (sidewalk above street)
      if (perimeterData.kindMap.get(belowKey) === "street") {
        const p2 = hqProject(snapshot, tile.col + 1, tile.row + 1);
        const p3 = hqProject(snapshot, tile.col, tile.row + 1);
        ctx.strokeStyle = "rgba(120, 108, 80, 0.45)";
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(p3.x, p3.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      }
      // Curb on far side (street above sidewalk)
      if (perimeterData.kindMap.get(aboveKey) === "street") {
        const p0 = hqProject(snapshot, tile.col, tile.row);
        const p1 = hqProject(snapshot, tile.col + 1, tile.row);
        ctx.strokeStyle = "rgba(120, 108, 80, 0.35)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(p1.x, p1.y);
        ctx.stroke();
      }

      // Sidewalk expansion joints (perpendicular lines across tiles)
      const noise = tileNoise(tile.col, tile.row);
      if (noise > 0.4 && noise < 0.6) {
        const cx = (pts[0].x + pts[2].x) / 2;
        const cy = (pts[0].y + pts[2].y) / 2;
        // Line along row axis (-2:1 slope)
        ctx.strokeStyle = "rgba(255, 255, 255, 0.035)";
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(cx + 14, cy - 7);
        ctx.lineTo(cx - 14, cy + 7);
        ctx.stroke();
      }
    }
  }
}

function drawModularFloorTiles(
  ctx: CanvasRenderingContext2D,
  snapshot: HqWorldSnapshot,
  hoveredRoomId: string | null,
  selectedRoomId: string | null,
): void {
  const sorted = snapshot.modular.floorTiles
    .slice()
    .sort((a, b) => a.col + a.row - (b.col + b.row));

  for (const tile of sorted) {
    const noise = tileNoise(tile.col, tile.row);
    const alpha = 0.94 + noise * 0.1;
    const isHovered = tile.roomId === hoveredRoomId || tile.roomId === selectedRoomId;
    const pts = tileDiamond(snapshot, tile.col, tile.row);

    ctx.save();
    ctx.globalAlpha = alpha;

    // Base fill
    const stroke = isHovered ? HOVER_BORDER : "rgba(255, 255, 255, 0.03)";
    drawPolygon(ctx, pts, tile.tint, stroke);

    // Interior tile grid lines (subtile pattern)
    const cx = (pts[0].x + pts[2].x) / 2;
    const cy = (pts[0].y + pts[2].y) / 2;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.025)";
    ctx.lineWidth = 0.4;
    // Horizontal subtile line
    ctx.beginPath();
    ctx.moveTo(pts[3].x, pts[3].y);
    ctx.lineTo(pts[1].x, pts[1].y);
    ctx.stroke();
    // Vertical subtile line
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    ctx.lineTo(pts[2].x, pts[2].y);
    ctx.stroke();

    // Worn scuff marks (noise-driven)
    if (noise > 0.75) {
      ctx.fillStyle = "rgba(0, 0, 0, 0.04)";
      ctx.beginPath();
      ctx.ellipse(cx + (noise - 0.8) * 30, cy + 2, 6, 2, 0.3, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}

function drawExpansionSlots(ctx: CanvasRenderingContext2D, snapshot: HqWorldSnapshot): void {
  for (const slot of snapshot.expansionSlots) {
    ctx.save();

    const isLocked = slot.kind === "locked";

    if (isLocked) {
      // Locked slots: muted, closed-off treatment — owned but not yet usable
      ctx.setLineDash([4, 8]);
      drawPolygon(ctx, slot.floorPoints, "rgba(30, 28, 24, 0.6)", "rgba(80, 70, 50, 0.12)");
      drawPolygon(ctx, slot.leftWallPoints, "rgba(30, 28, 24, 0.3)", "rgba(80, 70, 50, 0.08)");
      drawPolygon(ctx, slot.rightWallPoints, "rgba(30, 28, 24, 0.35)", "rgba(80, 70, 50, 0.1)");
      ctx.setLineDash([]);

      // Draw a small lock icon
      const centerX = slot.bounds.x + slot.bounds.width / 2;
      const centerY = slot.bounds.y + slot.bounds.height / 2;

      // Lock body
      ctx.fillStyle = "rgba(80, 70, 50, 0.25)";
      ctx.fillRect(centerX - 5, centerY - 4, 10, 8);
      ctx.strokeStyle = "rgba(80, 70, 50, 0.3)";
      ctx.lineWidth = 0.8;
      ctx.strokeRect(centerX - 5, centerY - 4, 10, 8);
      // Lock shackle
      ctx.beginPath();
      ctx.arc(centerX, centerY - 4, 4, Math.PI, 0);
      ctx.stroke();

      // Label (dimmed)
      ctx.textAlign = "center";
      ctx.fillStyle = "rgba(138, 112, 64, 0.3)";
      ctx.font = `500 9px ${FONT_FAMILY}`;
      ctx.fillText(slot.label, centerX, centerY + 16);
      ctx.textAlign = "start";
    } else {
      // Available slots: gold dashed outline with "+" icon
      ctx.setLineDash([8, 6]);
      drawPolygon(ctx, slot.floorPoints, "rgba(200, 168, 76, 0.08)", "rgba(200, 168, 76, 0.28)");
      drawPolygon(ctx, slot.leftWallPoints, "rgba(200, 168, 76, 0.03)", "rgba(200, 168, 76, 0.16)");
      drawPolygon(
        ctx,
        slot.rightWallPoints,
        "rgba(200, 168, 76, 0.04)",
        "rgba(200, 168, 76, 0.18)",
      );
      ctx.setLineDash([]);

      const centerX = slot.bounds.x + slot.bounds.width / 2;
      const centerY = slot.bounds.y + slot.bounds.height / 2;
      ctx.textAlign = "center";
      ctx.fillStyle = GOLD;
      ctx.font = `500 18px ${FONT_FAMILY}`;
      ctx.fillText("+", centerX, centerY - 6);
      ctx.fillStyle = SILVER;
      ctx.font = `500 10px ${FONT_FAMILY}`;
      ctx.fillText(slot.label, centerX, centerY + 14);
      ctx.textAlign = "start";
    }

    ctx.restore();
  }
}

function drawModularWallSegments(
  ctx: CanvasRenderingContext2D,
  snapshot: HqWorldSnapshot,
  hoveredRoomId: string | null,
  selectedRoomId: string | null,
): void {
  const wallH = snapshot.layout.wallHeight;
  const sorted = snapshot.modular.wallSegments
    .slice()
    .sort((a, b) => a.col + a.row - (b.col + b.row));

  const roomMap = new Map<string, HqRoomNode>();
  for (const room of snapshot.rooms) {
    roomMap.set(room.id, room);
  }

  for (const seg of sorted) {
    if (seg.kind === "opening") {
      drawWallOpening(ctx, snapshot, seg, wallH, roomMap);
      continue;
    }

    let p0: HqPoint;
    let p1: HqPoint;

    if (seg.side === "left") {
      p0 = hqProject(snapshot, seg.col, seg.row);
      p1 = hqProject(snapshot, seg.col, seg.row + 1);
    } else {
      p0 = hqProject(snapshot, seg.col, seg.row);
      p1 = hqProject(snapshot, seg.col + 1, seg.row);
    }

    const wallPoints: HqPoint[] = [
      p0,
      p1,
      { x: p1.x, y: p1.y - wallH },
      { x: p0.x, y: p0.y - wallH },
    ];

    const isHovered = seg.roomId === hoveredRoomId || seg.roomId === selectedRoomId;
    const room = roomMap.get(seg.roomId);
    const operational = room?.isOperational ?? false;
    const active = operational || (room?.isRequestedActive ?? false);

    ctx.save();

    // Wall body with gradient for depth
    const wallGrad = ctx.createLinearGradient(p0.x, p0.y - wallH, p0.x, p0.y);
    wallGrad.addColorStop(0, seg.tint);
    wallGrad.addColorStop(0.7, seg.tint);
    wallGrad.addColorStop(1, "rgba(0, 0, 0, 0.15)");
    const wallStroke = isHovered ? HOVER_BORDER : "rgba(255, 255, 255, 0.04)";
    drawPolygon(ctx, wallPoints, wallGrad, wallStroke);

    // Top cap strip — lighter edge at wall top
    const capH = 3;
    const capPoints: HqPoint[] = [
      { x: p0.x, y: p0.y - wallH },
      { x: p1.x, y: p1.y - wallH },
      { x: p1.x, y: p1.y - wallH + capH },
      { x: p0.x, y: p0.y - wallH + capH },
    ];
    ctx.fillStyle = "rgba(255, 255, 255, 0.06)";
    ctx.beginPath();
    ctx.moveTo(capPoints[0].x, capPoints[0].y);
    for (let i = 1; i < capPoints.length; i++) ctx.lineTo(capPoints[i].x, capPoints[i].y);
    ctx.closePath();
    ctx.fill();

    // Leading edge highlight
    ctx.strokeStyle = "rgba(255, 255, 255, 0.07)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y);
    ctx.lineTo(p0.x, p0.y - wallH);
    ctx.stroke();

    // Panel groove lines (brick courses)
    ctx.strokeStyle = "rgba(0, 0, 0, 0.08)";
    ctx.lineWidth = 0.5;
    for (const frac of [0.25, 0.5, 0.75]) {
      const y0 = p0.y - wallH * frac;
      const y1 = p1.y - wallH * frac;
      ctx.beginPath();
      ctx.moveTo(p0.x, y0);
      ctx.lineTo(p1.x, y1);
      ctx.stroke();
    }
    // Lighter groove highlights just above
    ctx.strokeStyle = "rgba(255, 255, 255, 0.02)";
    for (const frac of [0.25, 0.5, 0.75]) {
      const y0 = p0.y - wallH * frac - 1;
      const y1 = p1.y - wallH * frac - 1;
      ctx.beginPath();
      ctx.moveTo(p0.x, y0);
      ctx.lineTo(p1.x, y1);
      ctx.stroke();
    }

    // Base shadow at wall-floor junction
    ctx.strokeStyle = "rgba(0, 0, 0, 0.18)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y);
    ctx.lineTo(p1.x, p1.y);
    ctx.stroke();

    // Active room warm glow on wall face
    if (active) {
      const glowGrad = ctx.createLinearGradient(p0.x, p0.y - wallH * 0.6, p0.x, p0.y);
      glowGrad.addColorStop(0, "rgba(200, 168, 76, 0)");
      glowGrad.addColorStop(0.6, "rgba(200, 168, 76, 0.04)");
      glowGrad.addColorStop(1, "rgba(200, 168, 76, 0.08)");
      drawPolygon(ctx, wallPoints, glowGrad);
    }

    ctx.restore();
  }
}

function drawWallOpening(
  ctx: CanvasRenderingContext2D,
  snapshot: HqWorldSnapshot,
  seg: HqWallSegment,
  wallH: number,
  roomMap: Map<string, HqRoomNode>,
): void {
  let p0: HqPoint;
  let p1: HqPoint;

  if (seg.side === "left") {
    p0 = hqProject(snapshot, seg.col, seg.row);
    p1 = hqProject(snapshot, seg.col, seg.row + 1);
  } else {
    p0 = hqProject(snapshot, seg.col, seg.row);
    p1 = hqProject(snapshot, seg.col + 1, seg.row);
  }

  const lintelH = wallH * 0.2;
  const jambW = 4;
  const room = roomMap.get(seg.roomId);
  const operational = room?.isOperational ?? false;
  const active = operational || (room?.isRequestedActive ?? false);

  // Lintel beam with depth
  const lintelPoints: HqPoint[] = [
    { x: p0.x, y: p0.y - wallH },
    { x: p1.x, y: p1.y - wallH },
    { x: p1.x, y: p1.y - wallH + lintelH },
    { x: p0.x, y: p0.y - wallH + lintelH },
  ];
  drawPolygon(ctx, lintelPoints, seg.tint, "rgba(255, 255, 255, 0.05)");
  // Lintel bottom edge shadow
  ctx.strokeStyle = "rgba(0, 0, 0, 0.12)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(p0.x, p0.y - wallH + lintelH);
  ctx.lineTo(p1.x, p1.y - wallH + lintelH);
  ctx.stroke();

  // Jambs with highlight
  ctx.fillStyle = seg.tint;
  ctx.fillRect(p0.x - jambW / 2, p0.y - wallH, jambW, wallH);
  ctx.fillRect(p1.x - jambW / 2, p1.y - wallH, jambW, wallH);
  // Inner jamb highlight
  ctx.fillStyle = "rgba(255, 255, 255, 0.04)";
  ctx.fillRect(p0.x + jambW / 2 - 1, p0.y - wallH + lintelH, 1, wallH - lintelH);
  ctx.fillRect(p1.x - jambW / 2, p1.y - wallH + lintelH, 1, wallH - lintelH);

  // Dark interior fill behind the opening
  const interiorPoints: HqPoint[] = [
    { x: p0.x + jambW / 2, y: p0.y - wallH + lintelH },
    { x: p1.x - jambW / 2, y: p1.y - wallH + lintelH },
    { x: p1.x - jambW / 2, y: p1.y },
    { x: p0.x + jambW / 2, y: p0.y },
  ];
  drawPolygon(ctx, interiorPoints, "#0c0c14");

  // Threshold with gold glow for active rooms
  const thresholdColor = active ? "rgba(200, 168, 76, 0.3)" : "rgba(100, 100, 110, 0.15)";
  ctx.strokeStyle = thresholdColor;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(p0.x, p0.y);
  ctx.lineTo(p1.x, p1.y);
  ctx.stroke();

  // Warm light spill from active room
  if (active) {
    ctx.save();
    const cx = (p0.x + p1.x) / 2;
    const cy = (p0.y + p1.y) / 2;
    const lightGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 40);
    lightGrad.addColorStop(0, "rgba(200, 168, 76, 0.06)");
    lightGrad.addColorStop(1, "rgba(200, 168, 76, 0)");
    ctx.fillStyle = lightGrad;
    ctx.fillRect(cx - 40, cy - 40, 80, 80);
    ctx.restore();
  }
}

// ── Room hover overlay (label on hover) ───────────────────────────────────

function drawRoomHoverLabel(ctx: CanvasRenderingContext2D, room: HqRoomNode): void {
  const labelX = room.bounds.x + 18;
  const labelY = room.bounds.y + 18;

  // Measure text to size the backdrop dynamically
  ctx.font = `500 12px ${FONT_FAMILY}`;
  const titleW = ctx.measureText(room.label).width;
  ctx.font = `400 10px ${FONT_FAMILY}`;
  const infoLines = [
    `T${room.tier}`,
    `F${room.floorIndex + 1} · ${formatSlotLabel(room.slotId)}`,
    getRoomStateLabel(room.roomStateId),
    `${room.reservedFootprint.cols}x${room.reservedFootprint.rows} -> ${room.activeFootprint.cols}x${room.activeFootprint.rows}`,
  ];
  const maxInfoW = Math.max(...infoLines.map((l) => ctx.measureText(l).width));
  const contentW = Math.max(titleW, maxInfoW);

  // Glass backdrop behind label text
  const padL = 14;
  const padR = 18;
  const padTop = 12;
  const padBottom = 14;
  const bgX = labelX - padL;
  const bgY = labelY - padTop;
  const bgW = contentW + padL + padR;
  const bgH = 58 + padTop + padBottom; // covers all 5 text lines
  const bgR = 6;

  ctx.save();
  ctx.beginPath();
  ctx.roundRect(bgX, bgY, bgW, bgH, bgR);
  ctx.fillStyle = "rgba(10, 10, 14, 0.72)";
  ctx.fill();
  ctx.strokeStyle = "rgba(200, 168, 76, 0.12)";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();

  const labelActive = room.isOperational || room.isRequestedActive;
  ctx.fillStyle = labelActive ? SILVER_BRIGHT : SILVER;
  ctx.font = `500 12px ${FONT_FAMILY}`;
  ctx.fillText(room.label, labelX, labelY);
  ctx.fillStyle = labelActive ? GOLD : GOLD_DIM;
  ctx.font = `400 10px ${FONT_FAMILY}`;
  ctx.fillText(`T${room.tier}`, labelX, labelY + 16);
  ctx.fillStyle = SILVER;
  ctx.fillText(`F${room.floorIndex + 1} · ${formatSlotLabel(room.slotId)}`, labelX, labelY + 30);
  ctx.fillText(getRoomStateLabel(room.roomStateId), labelX, labelY + 44);
  ctx.fillText(
    `${room.reservedFootprint.cols}x${room.reservedFootprint.rows} -> ${room.activeFootprint.cols}x${room.activeFootprint.rows}`,
    labelX,
    labelY + 58,
  );
}

// ── Backdrop ──────────────────────────────────────────────────────────────

/** Seeded pseudo-random for deterministic star placement. */
function seededRand(seed: number): number {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/** Phase-aware base fill colors for the HQ backdrop.
 *  Must match the darkest ground tile (void) so that the isometric
 *  diamond edges blend seamlessly into the canvas background.
 *  The sky is drawn separately by drawFlankingBuildings. */
const BACKDROP_BASE_FILLS: Record<HqTimeOfDayPhase, string> = {
  sunrise: "#181410",
  day: "#24242e",
  sunset: "#161010",
  night: "#0a0a0e",
};

function drawBackdrop(
  ctx: CanvasRenderingContext2D,
  viewW: number,
  viewH: number,
  backdrop: HqBackdropSnapshot | null,
): void {
  ctx.fillStyle = backdrop ? BACKDROP_BASE_FILLS[backdrop.phase] : "#08080c";
  ctx.fillRect(0, 0, viewW, viewH);
}

/** Resolve a backdrop zone asset ID to a full URL. */
function backdropAssetUrl(assetId: string): string {
  return `${ASSET_ROOT}/${assetId}.svg`;
}

/** Collect all backdrop zone asset URLs for preloading. */
function collectBackdropAssetUrls(backdrop: HqBackdropSnapshot): string[] {
  const urls: string[] = [];
  for (const zone of Object.values(backdrop.zones)) {
    for (const id of zone) {
      urls.push(backdropAssetUrl(id));
    }
  }
  return urls;
}

/**
 * Draw a backdrop zone's SVG assets in world space.
 * Positions are derived from the building bounds in the snapshot.
 */
export function computeBackdropZonePlacement(
  snapshot: HqWorldSnapshot,
  zone: keyof HqBackdropSnapshot["zones"],
  assetId: string,
  aspect: number,
  intrinsicHeight = 0,
  index = 0,
): Readonly<{ x: number; y: number; width: number; height: number; alpha?: number }> | null {
  const floorBounds = computeGridBounds(snapshot.modular.floorTiles);
  if (!floorBounds) return null;

  const proj = (col: number, row: number) => hqProject(snapshot, col, row);
  const bldMinCol = floorBounds.minCol;
  const bldMaxCol = floorBounds.maxCol + 1;
  const bldMinRow = floorBounds.minRow;
  const bldMaxRow = floorBounds.maxRow + 1;
  const topPt = proj(bldMinCol, bldMinRow);
  const leftPt = proj(bldMinCol, bldMaxRow);
  const rightPt = proj(bldMaxCol, bldMinRow);
  const bottomPt = proj(bldMaxCol, bldMaxRow);
  const bldW = rightPt.x - leftPt.x;
  const bldH = bottomPt.y - topPt.y;

  if (zone === "rear") {
    const width = bldW * 1.6;
    const height = width / aspect;
    return {
      x: (leftPt.x + rightPt.x) / 2 - width / 2,
      y: topPt.y - height - snapshot.layout.wallHeight,
      width,
      height,
    };
  }

  if (zone === "leftFlank") {
    const height = bldH * 1.2 + snapshot.layout.wallHeight;
    const width = height * aspect;
    return {
      x: leftPt.x - width - 20,
      y: topPt.y - snapshot.layout.wallHeight,
      width,
      height,
    };
  }

  if (zone === "rightFlank") {
    const height = bldH * 1.2 + snapshot.layout.wallHeight;
    const width = height * aspect;
    return {
      x: rightPt.x + 20,
      y: topPt.y - snapshot.layout.wallHeight,
      width,
      height,
    };
  }

  if (zone === "belowShell") {
    const width = bldW * 1.4;
    const height = width / aspect;
    return {
      x: (leftPt.x + rightPt.x) / 2 - width / 2,
      y: bottomPt.y + index * 4,
      width,
      height,
    };
  }

  if (zone === "aboveShell") {
    const width = bldW * 0.9;
    const height = width / aspect;
    return {
      x: (leftPt.x + rightPt.x) / 2 - width / 2,
      y: topPt.y - height - snapshot.layout.wallHeight * 1.2 - index * 12,
      width,
      height,
    };
  }

  if (zone === "fore") {
    const seed = idHash(assetId);
    const scale = intrinsicHeight > 100 ? 0.6 : 0.4;
    const height = bldH * scale;
    const width = height * aspect;
    const spread = bldW * 0.8;
    return {
      x: (leftPt.x + rightPt.x) / 2 - spread / 2 + seededRand(seed) * spread,
      y: bottomPt.y + 30 + seededRand(seed + 1) * 60,
      width,
      height,
    };
  }

  if (zone === "fxOverlay") {
    const seed = idHash(assetId);
    const height = bldH * 0.4;
    const width = height * aspect;
    return {
      x: leftPt.x + seededRand(seed + 3) * bldW * 0.6,
      y: bottomPt.y - height * 0.3 + seededRand(seed + 4) * 40,
      width,
      height,
      alpha: 0.5,
    };
  }

  return null;
}

function drawBackdropZone(
  ctx: CanvasRenderingContext2D,
  snapshot: HqWorldSnapshot,
  zone: keyof HqBackdropSnapshot["zones"],
  imageCache: SvgImageCache,
): void {
  const bd = snapshot.backdrop;
  if (!bd) return;
  const assetIds = bd.zones[zone];
  if (!assetIds || assetIds.length === 0) return;

  for (let i = 0; i < assetIds.length; i++) {
    const url = backdropAssetUrl(assetIds[i]);
    const img = imageCache.get(url);
    if (!img) {
      imageCache.load(url);
      continue;
    }

    const aspect = img.naturalWidth / (img.naturalHeight || 1);
    const placement = computeBackdropZonePlacement(
      snapshot,
      zone,
      assetIds[i],
      aspect,
      img.naturalHeight,
      i,
    );
    if (!placement) {
      continue;
    }
    ctx.save();
    if (placement.alpha !== undefined) {
      ctx.globalAlpha = placement.alpha;
    }
    ctx.drawImage(img, placement.x, placement.y, placement.width, placement.height);
    ctx.restore();
  }
}

// ── Flanking buildings (NYC tenement facades behind the ground plane) ─────

// ── Phase-aware flanking building palette ──────────────────────────────────

interface FlankingPalette {
  sky: string;
  farFill1: string;
  farFill2: string;
  facadeStops: [string, string, string, string, string];
  parapet: string;
  parapetHighlight: string;
  cornice: string;
  corniceAccent: string;
  windowLit: string;
  windowCool: string;
  windowDark: string;
  windowFrame: string;
  fireEscape: string;
  farWindowColor: string;
  farWindowAlphaBase: number;
  farWindowAlphaRange: number;
  windowLitAlphaBase: number;
  windowLitAlphaRange: number;
  windowLitThreshold: number;
}

const FLANKING_PALETTES: Record<HqTimeOfDayPhase, FlankingPalette> = {
  day: {
    sky: "#3a4858",
    farFill1: "#2e3440",
    farFill2: "#242a36",
    facadeStops: ["#3a3444", "#403a4c", "#483e52", "#4e4456", "#544a5c"],
    parapet: "rgba(100, 88, 72, 0.6)",
    parapetHighlight: "rgba(140, 125, 100, 0.2)",
    cornice: "rgba(100, 90, 72, 0.18)",
    corniceAccent: "rgba(100, 90, 72, 0.35)",
    windowLit: "rgba(180, 200, 220,",
    windowCool: "rgba(160, 180, 200,",
    windowDark: "rgba(20, 20, 30, 0.4)",
    windowFrame: "rgba(70, 62, 52, 0.3)",
    fireEscape: "rgba(75, 68, 58, 0.7)",
    farWindowColor: "rgba(180, 200, 220,",
    farWindowAlphaBase: 0.015,
    farWindowAlphaRange: 0.02,
    windowLitAlphaBase: 0.08,
    windowLitAlphaRange: 0.12,
    windowLitThreshold: 0.15,
  },
  sunrise: {
    sky: "#1e1812",
    farFill1: "#161210",
    farFill2: "#120e0c",
    facadeStops: ["#1e1818", "#221c1c", "#282020", "#2c2424", "#302828"],
    parapet: "rgba(90, 70, 50, 0.5)",
    parapetHighlight: "rgba(130, 100, 70, 0.15)",
    cornice: "rgba(90, 70, 50, 0.12)",
    corniceAccent: "rgba(90, 70, 50, 0.28)",
    windowLit: "rgba(255, 200, 140,",
    windowCool: "rgba(160, 180, 210,",
    windowDark: "rgba(12, 10, 10, 0.5)",
    windowFrame: "rgba(60, 50, 38, 0.25)",
    fireEscape: "rgba(60, 52, 42, 0.6)",
    farWindowColor: "rgba(255, 200, 140,",
    farWindowAlphaBase: 0.01,
    farWindowAlphaRange: 0.018,
    windowLitAlphaBase: 0.06,
    windowLitAlphaRange: 0.12,
    windowLitThreshold: 0.35,
  },
  sunset: {
    sky: "#1e1410",
    farFill1: "#18100e",
    farFill2: "#140c0a",
    facadeStops: ["#1e1414", "#221818", "#281c18", "#2e201c", "#32241e"],
    parapet: "rgba(90, 60, 40, 0.5)",
    parapetHighlight: "rgba(140, 100, 60, 0.15)",
    cornice: "rgba(90, 60, 40, 0.12)",
    corniceAccent: "rgba(90, 60, 40, 0.28)",
    windowLit: "rgba(255, 160, 80,",
    windowCool: "rgba(160, 180, 210,",
    windowDark: "rgba(12, 8, 6, 0.5)",
    windowFrame: "rgba(60, 44, 32, 0.25)",
    fireEscape: "rgba(60, 48, 38, 0.6)",
    farWindowColor: "rgba(255, 160, 80,",
    farWindowAlphaBase: 0.012,
    farWindowAlphaRange: 0.02,
    windowLitAlphaBase: 0.07,
    windowLitAlphaRange: 0.14,
    windowLitThreshold: 0.3,
  },
  night: {
    sky: "#06060a",
    farFill1: "#09090f",
    farFill2: "#07070d",
    facadeStops: ["#0b0a14", "#0e0d18", "#12101c", "#16141e", "#1a1824"],
    parapet: "rgba(70, 62, 48, 0.5)",
    parapetHighlight: "rgba(120, 105, 72, 0.12)",
    cornice: "rgba(80, 72, 55, 0.1)",
    corniceAccent: "rgba(80, 72, 55, 0.25)",
    windowLit: "rgba(200, 168, 76,",
    windowCool: "rgba(160, 180, 210,",
    windowDark: "rgba(8, 8, 16, 0.6)",
    windowFrame: "rgba(50, 44, 35, 0.25)",
    fireEscape: "rgba(55, 50, 42, 0.6)",
    farWindowColor: "rgba(200, 168, 76,",
    farWindowAlphaBase: 0.008,
    farWindowAlphaRange: 0.015,
    windowLitAlphaBase: 0.05,
    windowLitAlphaRange: 0.12,
    windowLitThreshold: 0.3,
  },
};

function drawFlankingBuildings(ctx: CanvasRenderingContext2D, snapshot: HqWorldSnapshot): void {
  const periBounds = computeGridBounds(snapshot.modular.perimeterTiles);
  if (!periBounds) return;

  const phase: HqTimeOfDayPhase = snapshot.backdrop?.phase ?? "night";
  const pal = FLANKING_PALETTES[phase];
  const proj = (col: number, row: number) => hqProject(snapshot, col, row);

  const periMinCol = periBounds.minCol;
  const periMaxCol = periBounds.maxCol + 1;
  const periMinRow = periBounds.minRow;
  const periMaxRow = periBounds.maxRow + 1;
  const topPt = proj(periMinCol, periMinRow);
  const leftPt = proj(periMinCol, periMaxRow);
  const rightPt = proj(periMaxCol, periMinRow);

  const EXT = 3000;

  // ── A. Deep background sky ──
  ctx.fillStyle = pal.sky;
  ctx.beginPath();
  ctx.moveTo(topPt.x, topPt.y);
  ctx.lineTo(leftPt.x, leftPt.y);
  ctx.lineTo(leftPt.x - EXT, leftPt.y);
  ctx.lineTo(topPt.x - EXT, topPt.y - EXT);
  ctx.lineTo(topPt.x, topPt.y - EXT);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(topPt.x, topPt.y);
  ctx.lineTo(rightPt.x, rightPt.y);
  ctx.lineTo(rightPt.x + EXT, rightPt.y);
  ctx.lineTo(topPt.x + EXT, topPt.y - EXT);
  ctx.lineTo(topPt.x, topPt.y - EXT);
  ctx.closePath();
  ctx.fill();

  const floorBounds = computeGridBounds(snapshot.modular.floorTiles);
  if (!floorBounds) return;
  const bldMinCol = floorBounds.minCol;
  const bldMaxCol = floorBounds.maxCol + 1;
  const bldMinRow = floorBounds.minRow;
  const bldMaxRow = floorBounds.maxRow + 1;
  const storyH = snapshot.layout.wallHeight;

  // ── B. Far building silhouettes (skyline depth) ──
  const bgBuildings = [
    {
      col: bldMinCol - 2,
      r0: bldMinRow - 1,
      r1: bldMaxRow + 2,
      h: storyH * 8,
      fill: pal.farFill1,
      seed: 100,
    },
    {
      col: bldMinCol - 4,
      r0: bldMinRow - 2,
      r1: bldMaxRow + 3,
      h: storyH * 10,
      fill: pal.farFill2,
      seed: 200,
    },
    {
      col: bldMaxCol + 2,
      r0: bldMinRow - 1,
      r1: bldMaxRow + 2,
      h: storyH * 7,
      fill: pal.farFill1,
      seed: 300,
    },
    {
      col: bldMaxCol + 4,
      r0: bldMinRow - 2,
      r1: bldMaxRow + 3,
      h: storyH * 9,
      fill: pal.farFill2,
      seed: 400,
    },
  ];

  for (const bg of bgBuildings) {
    const p0 = proj(bg.col, bg.r0);
    const p1 = proj(bg.col, bg.r1);
    drawPolygon(ctx, [p0, p1, { x: p1.x, y: p1.y - bg.h }, { x: p0.x, y: p0.y - bg.h }], bg.fill);

    // Sparse distant windows
    const fW = Math.abs(p1.x - p0.x);
    const fDy = p1.y - p0.y;
    if (fW < 15) continue;
    const cols = Math.min(Math.floor(fW / 10), 12);
    const rows = Math.floor(bg.h / (storyH * 0.9));
    for (let wr = 2; wr < rows; wr++) {
      for (let wc = 0; wc < cols; wc++) {
        if (seededRand(wc * 29 + wr * 43 + bg.seed) > 0.72) {
          const u = (wc + 0.5) / cols;
          const v = (wr + 0.3) / rows;
          const alpha =
            pal.farWindowAlphaBase +
            seededRand(wc * 7 + wr * 13 + bg.seed) * pal.farWindowAlphaRange;
          ctx.fillStyle = `${pal.farWindowColor} ${alpha})`;
          ctx.fillRect(p0.x + (p1.x - p0.x) * u - 1, p0.y + fDy * u - bg.h * v - 1.5, 2, 2.5);
        }
      }
    }
  }

  // ── C. Immediate neighbor facades (6-story tenements) ──
  const neighborH = storyH * 6;
  const floors = 6;

  for (const { c, side, seed } of [
    { c: bldMinCol, side: "left" as const, seed: 0 },
    { c: bldMaxCol, side: "right" as const, seed: 2 },
  ]) {
    const p0 = proj(c, bldMinRow);
    const p1 = proj(c, bldMaxRow);
    const fW = Math.abs(p1.x - p0.x);
    const fDy = p1.y - p0.y;

    // Main facade gradient
    const grad = ctx.createLinearGradient(p0.x, p0.y - neighborH, p0.x, p0.y);
    grad.addColorStop(0, pal.facadeStops[0]);
    grad.addColorStop(0.15, pal.facadeStops[1]);
    grad.addColorStop(0.5, pal.facadeStops[2]);
    grad.addColorStop(0.85, pal.facadeStops[3]);
    grad.addColorStop(1, pal.facadeStops[4]);
    drawPolygon(
      ctx,
      [p0, p1, { x: p1.x, y: p1.y - neighborH }, { x: p0.x, y: p0.y - neighborH }],
      grad,
    );

    // Rooftop parapet
    ctx.strokeStyle = pal.parapet;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y - neighborH);
    ctx.lineTo(p1.x, p1.y - neighborH);
    ctx.stroke();
    ctx.strokeStyle = pal.parapetHighlight;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y - neighborH - 1);
    ctx.lineTo(p1.x, p1.y - neighborH - 1);
    ctx.stroke();

    // Floor cornice lines
    for (let f = 1; f <= floors; f++) {
      const v = f / floors;
      const isAccent = f === floors || f === 1;
      ctx.strokeStyle = isAccent ? pal.corniceAccent : pal.cornice;
      ctx.lineWidth = isAccent ? 1.5 : 0.7;
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y - neighborH * v);
      ctx.lineTo(p1.x, p1.y - neighborH * v);
      ctx.stroke();
    }

    // Window grid
    if (fW < 20) continue;
    const winCols = Math.min(Math.floor(fW / 14), 10);
    const winW = 4;
    const winH = 5.5;

    for (let fl = 0; fl < floors; fl++) {
      for (let wc = 0; wc < winCols; wc++) {
        const u = (wc + 0.5) / winCols;
        const flV = (fl + 0.4) / floors;
        const wx = p0.x + (p1.x - p0.x) * u;
        const wy = p0.y + fDy * u - neighborH * flV;
        const rng = seededRand(wc * 17 + fl * 31 + seed * 97);
        const warmth = seededRand(wc * 13 + fl * 23 + seed * 53);

        if (rng > pal.windowLitThreshold) {
          // Lit/reflective window
          const alpha = pal.windowLitAlphaBase + warmth * pal.windowLitAlphaRange;
          ctx.fillStyle =
            warmth > 0.85 ? `${pal.windowCool} ${alpha * 0.5})` : `${pal.windowLit} ${alpha})`;
          ctx.fillRect(wx - winW / 2, wy - winH, winW, winH);
        } else {
          // Dark window
          ctx.fillStyle = pal.windowDark;
          ctx.fillRect(wx - winW / 2, wy - winH, winW, winH);
        }

        // Window frame
        ctx.strokeStyle = pal.windowFrame;
        ctx.lineWidth = 0.5;
        ctx.strokeRect(wx - winW / 2, wy - winH, winW, winH);
      }
    }

    // Fire escape (left facade only)
    if (side === "left" && fW > 40) {
      const escU = 0.4;
      ctx.strokeStyle = pal.fireEscape;
      for (let fl = 1; fl < floors; fl++) {
        const v = (fl + 0.35) / floors;
        const ex = p0.x + (p1.x - p0.x) * escU;
        const ey = p0.y + fDy * escU - neighborH * v;

        // Platform
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(ex - 8, ey);
        ctx.lineTo(ex + 8, ey);
        ctx.stroke();

        // Railing
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(ex - 8, ey);
        ctx.lineTo(ex - 8, ey - 5);
        ctx.lineTo(ex + 8, ey - 5);
        ctx.lineTo(ex + 8, ey);
        ctx.stroke();

        // Zigzag ladder to next floor
        if (fl < floors - 1) {
          const nextY = p0.y + fDy * escU - neighborH * ((fl + 1 + 0.35) / floors);
          ctx.strokeStyle = "rgba(55, 50, 42, 0.4)";
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          ctx.moveTo(ex + 4, ey);
          ctx.lineTo(ex - 2, (ey + nextY) / 2);
          ctx.lineTo(ex + 4, nextY);
          ctx.stroke();
          ctx.strokeStyle = "rgba(55, 50, 42, 0.6)";
        }
      }
    }

    // AC units on random windows
    for (let fl = 0; fl < floors; fl++) {
      for (let wc = 0; wc < winCols; wc++) {
        if (seededRand(wc * 41 + fl * 67 + seed * 113) > 0.82) {
          const u = (wc + 0.5) / winCols;
          const flV = (fl + 0.4) / floors;
          const ax = p0.x + (p1.x - p0.x) * u;
          const ay = p0.y + fDy * u - neighborH * flV;
          ctx.fillStyle = "rgba(35, 32, 28, 0.8)";
          ctx.fillRect(ax - 3.5, ay, 7, 3.5);
          ctx.strokeStyle = "rgba(25, 22, 18, 0.6)";
          ctx.lineWidth = 0.5;
          ctx.strokeRect(ax - 3.5, ay, 7, 3.5);
        }
      }
    }
  }

  // ── D. Rooftop elements ──

  // Water tower on left building
  {
    const p0 = proj(bldMinCol, bldMinRow);
    const p1 = proj(bldMinCol, bldMaxRow);
    const tx = p0.x + (p1.x - p0.x) * 0.7;
    const ty = p0.y + (p1.y - p0.y) * 0.7 - neighborH;
    const legH = 16;
    const tankH = 20;
    const tankW = 18;

    ctx.fillStyle = "rgba(18, 16, 24, 0.9)";
    // Tank barrel
    ctx.fillRect(tx - tankW / 2, ty - legH - tankH, tankW, tankH);
    // Conical roof
    ctx.beginPath();
    ctx.moveTo(tx - tankW / 2 - 1, ty - legH - tankH);
    ctx.lineTo(tx, ty - legH - tankH - 10);
    ctx.lineTo(tx + tankW / 2 + 1, ty - legH - tankH);
    ctx.closePath();
    ctx.fill();
    // Legs
    ctx.strokeStyle = "rgba(18, 16, 24, 0.85)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (const dx of [-6, 0, 6]) {
      ctx.moveTo(tx + dx, ty);
      ctx.lineTo(tx + dx * 0.8, ty - legH);
    }
    ctx.stroke();
    // Cross brace
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(tx - 5, ty - legH * 0.4);
    ctx.lineTo(tx + 5, ty - legH * 0.6);
    ctx.stroke();
  }

  // Antenna mast on right building
  {
    const p0 = proj(bldMaxCol, bldMinRow);
    const p1 = proj(bldMaxCol, bldMaxRow);
    const ax = p0.x + (p1.x - p0.x) * 0.3;
    const ay = p0.y + (p1.y - p0.y) * 0.3 - neighborH;

    ctx.strokeStyle = "rgba(18, 16, 24, 0.75)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(ax, ay - 24);
    ctx.stroke();
    // Crossbars
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(ax - 5, ay - 18);
    ctx.lineTo(ax + 5, ay - 18);
    ctx.moveTo(ax - 3, ay - 22);
    ctx.lineTo(ax + 3, ay - 22);
    ctx.stroke();
    // Guy wires
    ctx.strokeStyle = "rgba(18, 16, 24, 0.3)";
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(ax, ay - 24);
    ctx.lineTo(ax - 12, ay);
    ctx.moveTo(ax, ay - 24);
    ctx.lineTo(ax + 12, ay);
    ctx.stroke();
    // Red warning light + glow
    ctx.fillStyle = "rgba(220, 50, 50, 0.35)";
    ctx.beginPath();
    ctx.arc(ax, ay - 24, 1.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(220, 50, 50, 0.08)";
    ctx.beginPath();
    ctx.arc(ax, ay - 24, 6, 0, Math.PI * 2);
    ctx.fill();
  }

  // Vent pipes on left rooftop
  {
    const p0 = proj(bldMinCol, bldMinRow);
    const p1 = proj(bldMinCol, bldMaxRow);
    const vx = p0.x + (p1.x - p0.x) * 0.25;
    const vy = p0.y + (p1.y - p0.y) * 0.25 - neighborH;
    ctx.fillStyle = "rgba(20, 18, 26, 0.85)";
    for (const [dx, h] of [
      [-3, 8],
      [0, 12],
      [4, 6],
    ] as const) {
      ctx.fillRect(vx + dx - 1.5, vy - h, 3, h);
    }
  }
}

// ── Building shell ────────────────────────────────────────────────────────

function drawBuildingShell(ctx: CanvasRenderingContext2D, snapshot: HqWorldSnapshot): void {
  const tiles = snapshot.modular.floorTiles;
  if (tiles.length === 0) return;

  const bounds = computeGridBounds(tiles);
  if (!bounds) return;
  const { minCol, maxCol: maxColRaw, minRow, maxRow: maxRowRaw } = bounds;
  const maxCol = maxColRaw + 1;
  const maxRow = maxRowRaw + 1;
  const wallH = snapshot.layout.wallHeight;

  const topCorner = hqProject(snapshot, minCol, minRow);
  const leftCorner = hqProject(snapshot, minCol, maxRow);
  const rightCorner = hqProject(snapshot, maxCol, minRow);
  const frontCorner = hqProject(snapshot, maxCol, maxRow);

  const capH = 6;

  // Roof cap strip — left (filled, visible)
  const leftCap: HqPoint[] = [
    { x: topCorner.x, y: topCorner.y - wallH },
    { x: leftCorner.x, y: leftCorner.y - wallH },
    { x: leftCorner.x, y: leftCorner.y - wallH - capH },
    { x: topCorner.x, y: topCorner.y - wallH - capH },
  ];
  drawPolygon(ctx, leftCap, "#2a2416", "rgba(200, 168, 76, 0.2)");

  // Roof cap strip — right
  const rightCap: HqPoint[] = [
    { x: topCorner.x, y: topCorner.y - wallH },
    { x: rightCorner.x, y: rightCorner.y - wallH },
    { x: rightCorner.x, y: rightCorner.y - wallH - capH },
    { x: topCorner.x, y: topCorner.y - wallH - capH },
  ];
  drawPolygon(ctx, rightCap, "#241e12", "rgba(200, 168, 76, 0.15)");

  // Cornice line (wall top edge — gold accent)
  ctx.strokeStyle = "rgba(200, 168, 76, 0.45)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(leftCorner.x, leftCorner.y - wallH);
  ctx.lineTo(topCorner.x, topCorner.y - wallH);
  ctx.lineTo(rightCorner.x, rightCorner.y - wallH);
  ctx.stroke();

  // Corner posts (structural pillars)
  ctx.lineWidth = 3;
  for (const corner of [topCorner, leftCorner, rightCorner]) {
    // Dark post body
    ctx.strokeStyle = "#2a2416";
    ctx.beginPath();
    ctx.moveTo(corner.x, corner.y);
    ctx.lineTo(corner.x, corner.y - wallH - capH);
    ctx.stroke();
    // Gold edge highlight
    ctx.strokeStyle = "rgba(200, 168, 76, 0.22)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(corner.x + 1, corner.y);
    ctx.lineTo(corner.x + 1, corner.y - wallH - capH);
    ctx.stroke();
    ctx.lineWidth = 3;
  }

  // Front edge (building footprint line — visible bottom boundary)
  ctx.strokeStyle = "rgba(200, 168, 76, 0.35)";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(leftCorner.x, leftCorner.y);
  ctx.lineTo(frontCorner.x, frontCorner.y);
  ctx.lineTo(rightCorner.x, rightCorner.y);
  ctx.stroke();

  // Front corner post
  ctx.strokeStyle = "#2a2416";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(frontCorner.x, frontCorner.y);
  ctx.lineTo(frontCorner.x, frontCorner.y - wallH * 0.3);
  ctx.stroke();
}

// ── Sprite rendering ──────────────────────────────────────────────────────

function drawSprite(
  ctx: CanvasRenderingContext2D,
  sprite: HqSpritePlacement,
  imageCache: SvgImageCache,
): void {
  const img = imageCache.load(sprite.assetUrl);
  if (!img) return;
  ctx.save();
  ctx.globalAlpha = sprite.opacity;
  ctx.drawImage(img, sprite.x, sprite.y, sprite.width, sprite.height);
  ctx.restore();
}

// ── Actor rendering ───────────────────────────────────────────────────────

function drawChibiToken(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  img: HTMLImageElement,
  kind: ActorMarker["kind"],
): void {
  // Ground shadow ellipse
  ctx.fillStyle = "rgba(0, 0, 0, 0.25)";
  ctx.beginPath();
  ctx.ellipse(x, y + 2, TOKEN_W * 0.35, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  // Platform circle
  const platformColor =
    kind === "operator"
      ? "rgba(200, 168, 76, 0.15)"
      : kind === "staff"
        ? "rgba(200, 200, 210, 0.1)"
        : "rgba(212, 84, 30, 0.12)";
  ctx.fillStyle = platformColor;
  ctx.beginPath();
  ctx.ellipse(x, y, TOKEN_W * 0.38, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Chibi sprite
  ctx.drawImage(img, x - TOKEN_W / 2, y - TOKEN_H, TOKEN_W, TOKEN_H);

  // Subtle ring glow for operators
  if (kind === "operator") {
    ctx.strokeStyle = "rgba(200, 168, 76, 0.2)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(x, y, TOKEN_W * 0.4, 5.5, 0, 0, Math.PI * 2);
    ctx.stroke();
  } else if (kind === "visitor") {
    ctx.strokeStyle = "rgba(232, 170, 60, 0.25)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(x, y, TOKEN_W * 0.4, 5.5, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawDotToken(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  fill: string,
  kind: ActorMarker["kind"],
  label?: string,
): void {
  const r = ACTOR_RADIUS;

  // Ground shadow ellipse
  ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
  ctx.beginPath();
  ctx.ellipse(x, y + r + 2, r * 0.9, r * 0.35, 0, 0, Math.PI * 2);
  ctx.fill();

  // Outer glow ring for operators
  if (kind === "operator") {
    ctx.strokeStyle = "rgba(200, 168, 76, 0.35)";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(x, y, r + 4, 0, Math.PI * 2);
    ctx.stroke();
  } else if (kind === "staff") {
    ctx.strokeStyle = "rgba(200, 200, 210, 0.15)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(x, y, r + 3, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Main circle with gradient for depth
  const grad = ctx.createRadialGradient(x - r * 0.2, y - r * 0.2, 0, x, y, r);
  grad.addColorStop(0, "rgba(255, 255, 255, 0.15)");
  grad.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.strokeStyle = "rgba(0, 0, 0, 0.4)";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Initial letter centered in circle
  if (label) {
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `600 ${Math.round(r * 1.0)}px ${FONT_FAMILY}`;
    ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
    ctx.fillText(label[0], x, y + 0.5);
    ctx.textAlign = "start";
    ctx.textBaseline = "alphabetic";
  }
}

function drawActorLabel(
  ctx: CanvasRenderingContext2D,
  label: string,
  x: number,
  y: number,
  weight: string,
  color?: string,
): void {
  ctx.textAlign = "center";
  ctx.font = `${weight} 10px ${FONT_FAMILY}`;
  ctx.fillStyle = "rgba(6, 6, 8, 0.85)";
  ctx.fillText(label, x + 0.5, y + 0.5);
  ctx.fillText(label, x - 0.5, y + 0.5);
  ctx.fillStyle = color ?? SILVER_BRIGHT;
  ctx.fillText(label, x, y);
  ctx.textAlign = "start";
}

/** Visitor label color — a warm amber to distinguish recruitable operators. */
const VISITOR_LABEL_COLOR = "rgba(232, 170, 60, 0.95)";

function drawActor(
  ctx: CanvasRenderingContext2D,
  actor: ActorMarker,
  imageCache: SvgImageCache,
  showLabel: boolean,
  time: number,
): void {
  let { x, y } = actor;

  if (actor.moveProgress >= 1 && actor.state !== "deployed") {
    const h = idHash(actor.id);
    x += Math.sin(time * 0.0012 + h) * 2.5;
    y += Math.sin(time * 0.0008 + h * 1.7) * 1.2;
  }

  const portraitUrl =
    (actor.kind === "operator" || actor.kind === "visitor") && actor.presetId
      ? getActorPortraitUrl(actor.presetId, actor.roleTag ?? "")
      : null;
  const tokenImg = portraitUrl ? imageCache.load(portraitUrl) : null;
  if (tokenImg) {
    drawChibiToken(ctx, x, y, tokenImg, actor.kind);
    if (actor.kind === "visitor") {
      const rankLabel = actor.rank ? `(${actor.rank}) ${actor.label}` : actor.label;
      drawActorLabel(ctx, rankLabel, x, y + 12, "500", VISITOR_LABEL_COLOR);
    } else if (actor.kind === "operator" || showLabel) {
      drawActorLabel(ctx, actor.label, x, y + 12, "500");
    }
    return;
  }

  const fill =
    actor.kind === "operator"
      ? ACTOR_FILL_OPERATOR
      : actor.kind === "staff"
        ? ACTOR_FILL_STAFF
        : ACTOR_FILL_VISITOR;
  drawDotToken(ctx, x, y, fill, actor.kind, actor.label);
  if (actor.kind === "visitor") {
    const rankLabel = actor.rank ? `(${actor.rank}) ${actor.label}` : actor.label;
    drawActorLabel(ctx, rankLabel, x, y + ACTOR_RADIUS + 8, "400", VISITOR_LABEL_COLOR);
  } else if (actor.kind === "operator" || showLabel) {
    drawActorLabel(ctx, actor.label, x, y + ACTOR_RADIUS + 8, "400");
  }
}

// ── Focus highlight ───────────────────────────────────────────────────────

function drawFocusHighlightRect(ctx: CanvasRenderingContext2D, focus: FocusPayload): void {
  if (!focus.highlightBounds) return;
  const b = focus.highlightBounds;
  const isCircular = Math.abs(b.width - b.height) < 8 && b.width < 60;
  ctx.save();
  if (isCircular) {
    const cx = b.x + b.width / 2;
    const cy = b.y + b.height / 2;
    const r = Math.max(b.width, b.height) / 2 + 2;
    ctx.strokeStyle = FOCUS_HIGHLIGHT_BORDER;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = FOCUS_HIGHLIGHT_GLOW;
    ctx.fill();
  } else if (focus.targetKind !== "room") {
    // Non-room rectangular targets still get the dashed highlight.
    // Rooms rely on the floor-edge glow so the large rectangle is unnecessary.
    ctx.strokeStyle = FOCUS_HIGHLIGHT_BORDER;
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    roundRect(ctx, b.x - 4, b.y - 4, b.width + 8, b.height + 8, 10);
    ctx.stroke();
    ctx.setLineDash([]);
    roundRect(ctx, b.x - 4, b.y - 4, b.width + 8, b.height + 8, 10);
    ctx.fillStyle = FOCUS_HIGHLIGHT_GLOW;
    ctx.fill();
  }
  ctx.restore();
}

// ── Room floor decoration (procedural) ────────────────────────────────────

function drawRoomFloorEdges(ctx: CanvasRenderingContext2D, snapshot: HqWorldSnapshot): void {
  for (const room of snapshot.rooms) {
    const fp = room.floorPoints;
    if (fp.length < 4) continue;

    const roomActive = room.isOperational || room.isRequestedActive;
    const edgeColor = roomActive ? "rgba(200, 168, 76, 0.25)" : "rgba(120, 120, 130, 0.12)";
    const innerColor = roomActive ? "rgba(200, 168, 76, 0.06)" : "rgba(120, 120, 130, 0.03)";

    // Room floor border — thin gold/silver line around the room perimeter
    ctx.save();
    ctx.strokeStyle = edgeColor;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(fp[0].x, fp[0].y);
    for (let i = 1; i < fp.length; i++) ctx.lineTo(fp[i].x, fp[i].y);
    ctx.closePath();
    ctx.stroke();

    // Inner glow edge (inset border for depth)
    const cx = (fp[0].x + fp[2].x) / 2;
    const cy = (fp[0].y + fp[2].y) / 2;
    const scale = 0.92;
    ctx.strokeStyle = innerColor;
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(cx + (fp[0].x - cx) * scale, cy + (fp[0].y - cy) * scale);
    for (let i = 1; i < fp.length; i++) {
      ctx.lineTo(cx + (fp[i].x - cx) * scale, cy + (fp[i].y - cy) * scale);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }
}

function drawRoomFunctionMarker(ctx: CanvasRenderingContext2D, snapshot: HqWorldSnapshot): void {
  for (const room of snapshot.rooms) {
    if (!room.isOperational) continue;
    const fp = room.floorPoints;
    if (fp.length < 4) continue;

    // Small function icon area in upper corner of room
    const iconX = fp[0].x;
    const iconY = fp[0].y + 8;

    // Subtle function tag label
    const tagLabel = room.functionTag.replace("room:", "").toUpperCase();
    ctx.save();
    ctx.globalAlpha = 0.18;
    ctx.textAlign = "center";
    ctx.font = `600 8px ${FONT_FAMILY}`;
    ctx.fillStyle = GOLD;
    ctx.fillText(tagLabel, iconX, iconY);
    ctx.textAlign = "start";
    ctx.restore();
  }
}

// ── Main HQ draw ──────────────────────────────────────────────────────────

function drawDebugOverlays(
  ctx: CanvasRenderingContext2D,
  snapshot: HqWorldSnapshot,
  overlays: HqDebugOverlays,
): void {
  if (overlays.showRoomBounds) {
    for (const room of snapshot.rooms) {
      ctx.save();
      // Active bounds (cyan)
      ctx.strokeStyle = "rgba(0, 200, 255, 0.5)";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(
        room.activeBounds.x,
        room.activeBounds.y,
        room.activeBounds.width,
        room.activeBounds.height,
      );
      // Reserved bounds (yellow dashed)
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = "rgba(255, 200, 0, 0.35)";
      ctx.strokeRect(room.bounds.x, room.bounds.y, room.bounds.width, room.bounds.height);
      ctx.setLineDash([]);
      // Room label
      ctx.fillStyle = "rgba(0, 200, 255, 0.7)";
      ctx.font = `600 8px ${FONT_FAMILY}`;
      ctx.fillText(room.label, room.activeBounds.x + 2, room.activeBounds.y - 3);
      // Room state ID
      ctx.fillStyle = "rgba(200, 168, 76, 0.6)";
      ctx.font = `400 7px ${FONT_FAMILY}`;
      ctx.fillText(
        room.roomStateId,
        room.activeBounds.x + 2,
        room.activeBounds.y + room.activeBounds.height + 9,
      );
      ctx.restore();
    }
  }

  if (overlays.showFootprints) {
    for (const room of snapshot.rooms) {
      ctx.save();
      // Reserved footprint floor diamond (yellow, dim)
      ctx.setLineDash([3, 3]);
      ctx.strokeStyle = "rgba(255, 200, 0, 0.3)";
      ctx.lineWidth = 1;
      drawPolygonOutline(ctx, room.floorPoints, "rgba(255, 200, 0, 0.3)");
      ctx.setLineDash([]);
      // Active footprint floor diamond (cyan, brighter)
      ctx.strokeStyle = "rgba(0, 200, 255, 0.4)";
      ctx.lineWidth = 1.5;
      // Just draw active bounds outline
      ctx.strokeRect(
        room.activeBounds.x,
        room.activeBounds.y,
        room.activeBounds.width,
        room.activeBounds.height,
      );
      // Footprint label
      const fp = room.reservedFootprint;
      const afp = room.activeFootprint;
      ctx.fillStyle = "rgba(255, 200, 0, 0.5)";
      ctx.font = `400 7px ${FONT_FAMILY}`;
      ctx.fillText(
        `reserved: ${fp.cols}x${fp.rows} @(${fp.col},${fp.row})`,
        room.bounds.x + 2,
        room.bounds.y + room.bounds.height + 9,
      );
      if (
        afp.cols !== fp.cols ||
        afp.rows !== fp.rows ||
        afp.col !== fp.col ||
        afp.row !== fp.row
      ) {
        ctx.fillStyle = "rgba(0, 200, 255, 0.5)";
        ctx.fillText(
          `active: ${afp.cols}x${afp.rows} @(${afp.col},${afp.row})`,
          room.bounds.x + 2,
          room.bounds.y + room.bounds.height + 18,
        );
      }
      ctx.restore();
    }
  }

  if (overlays.showAnchors) {
    for (const anchor of snapshot.navGraph.anchors) {
      ctx.save();
      const colors: Record<string, string> = {
        entry: "rgba(255, 100, 100, 0.6)",
        idle: "rgba(100, 200, 100, 0.6)",
        work: "rgba(100, 100, 255, 0.6)",
        social: "rgba(255, 200, 100, 0.6)",
        recovery: "rgba(200, 100, 255, 0.6)",
      };
      ctx.fillStyle = colors[anchor.kind] ?? "rgba(200, 200, 200, 0.5)";
      ctx.beginPath();
      ctx.arc(anchor.x, anchor.y, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
      ctx.lineWidth = 0.5;
      ctx.stroke();
      ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
      ctx.font = `500 6px ${FONT_FAMILY}`;
      ctx.fillText(anchor.kind, anchor.x + 6, anchor.y + 2);
      ctx.restore();
    }
    // Draw connectors
    for (const conn of snapshot.navGraph.connectors) {
      ctx.save();
      ctx.strokeStyle = "rgba(200, 200, 200, 0.15)";
      ctx.lineWidth = 0.5;
      ctx.setLineDash([2, 4]);
      const from = snapshot.navGraph.anchors.find((a) => a.id === conn.fromAnchorId);
      const to = snapshot.navGraph.anchors.find((a) => a.id === conn.toAnchorId);
      if (from && to) {
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        for (const wp of conn.waypoints) {
          ctx.lineTo(wp.x, wp.y);
        }
        ctx.lineTo(to.x, to.y);
        ctx.stroke();
      }
      ctx.setLineDash([]);
      ctx.restore();
    }
  }
}

function drawPolygonOutline(
  ctx: CanvasRenderingContext2D,
  points: readonly HqPoint[],
  strokeColor: string,
): void {
  if (points.length < 2) return;
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].x, points[i].y);
  }
  ctx.closePath();
  ctx.strokeStyle = strokeColor;
  ctx.stroke();
}

function drawHqWorld(
  ctx: CanvasRenderingContext2D,
  snapshot: HqWorldSnapshot,
  focus: FocusPayload | null,
  camera: CameraState,
  viewW: number,
  viewH: number,
  imageCache: SvgImageCache,
  hoveredRoomId: string | null,
  time: number,
  debugOverlays?: HqDebugOverlays,
  pointerWorld?: { x: number; y: number } | null,
): void {
  const focusedRoomId = focus?.targetKind === "room" ? focus.targetId : null;

  drawBackdrop(ctx, viewW, viewH, snapshot.backdrop);

  ctx.save();
  ctx.translate(viewW / 2, viewH / 2);
  ctx.scale(camera.zoom, camera.zoom);
  ctx.translate(-camera.x, -camera.y);

  // 0b. Backdrop zone SVGs (rear sky behind flanking buildings)
  drawBackdropZone(ctx, snapshot, "rear", imageCache);

  // 1. Flanking buildings (drawn first, behind everything)
  drawFlankingBuildings(ctx, snapshot);

  // 1b. Backdrop flank SVGs (tenements on left/right)
  drawBackdropZone(ctx, snapshot, "leftFlank", imageCache);
  drawBackdropZone(ctx, snapshot, "rightFlank", imageCache);

  // 2. Perimeter tiles (drawn on top of flanking buildings)
  drawPerimeterTiles(ctx, snapshot);

  // 2b. Backdrop below-shell zone (street, sidewalk)
  drawBackdropZone(ctx, snapshot, "belowShell", imageCache);

  // 3. Scenery behind rooms
  snapshot.scenery
    .slice()
    .sort((a, b) => a.zIndex - b.zIndex)
    .forEach((sprite) => drawSprite(ctx, sprite, imageCache));

  // 3. Room ambient glow (under walls/floor, for operational rooms)
  for (const room of snapshot.rooms) {
    if (!room.isOperational) continue;
    const cx = room.bounds.x + room.bounds.width / 2;
    const cy = room.bounds.y + room.bounds.height / 2;
    const r = Math.max(room.bounds.width, room.bounds.height) * 0.6;
    const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    glow.addColorStop(0, "rgba(200, 168, 76, 0.06)");
    glow.addColorStop(0.5, "rgba(200, 168, 76, 0.03)");
    glow.addColorStop(1, "rgba(200, 168, 76, 0)");
    ctx.fillStyle = glow;
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  }

  // 4. Modular wall segments (back to front, drawn behind floor)
  drawModularWallSegments(ctx, snapshot, hoveredRoomId, focusedRoomId);

  // 5. Modular floor tiles (back to front)
  drawModularFloorTiles(ctx, snapshot, hoveredRoomId, focusedRoomId);
  drawExpansionSlots(ctx, snapshot);

  // 5b. Room floor edge markings
  drawRoomFloorEdges(ctx, snapshot);

  // 5c. Room function markers
  drawRoomFunctionMarker(ctx, snapshot);

  // 6. Building shell
  drawBuildingShell(ctx, snapshot);

  // 7. Room props (by zIndex)
  snapshot.roomProps
    .slice()
    .sort((a, b) => a.zIndex - b.zIndex)
    .forEach((sprite) => drawSprite(ctx, sprite, imageCache));

  // 7. Actors
  snapshot.actors.forEach((actor) => {
    const showLabel =
      actor.roomId === hoveredRoomId ||
      actor.roomId === focusedRoomId ||
      (focus?.targetKind === "operator" || focus?.targetKind === "staff"
        ? focus.targetId === actor.id
        : false);
    drawActor(ctx, actor, imageCache, showLabel, time);
  });

  // 8. Hover/selection label overlay — show for hovered room, or focused room if nothing hovered
  const labelRoomId = hoveredRoomId ?? focusedRoomId;
  if (labelRoomId) {
    const room = snapshot.rooms.find((r) => r.id === labelRoomId);
    if (room) drawRoomHoverLabel(ctx, room);
  }

  // 9. Focus highlight
  const effectiveFocus = focus ?? snapshot.focus;
  if (effectiveFocus) {
    drawFocusHighlightRect(ctx, effectiveFocus);
  }

  // 10. Backdrop foreground props
  drawBackdropZone(ctx, snapshot, "fore", imageCache);
  drawBackdropZone(ctx, snapshot, "aboveShell", imageCache);

  // 11. Debug overlay (toggle with G key in dev builds)
  drawPropDebugOverlay(ctx, snapshot);

  // 12. Spatial debug overlays (dev menu toggles)
  if (debugOverlays) {
    drawDebugOverlays(ctx, snapshot, debugOverlays);
  }

  ctx.restore();

  // 13. Pointer coordinate readout (screen-space HUD)
  if (debugOverlays?.showPointerCoords && pointerWorld) {
    ctx.save();
    ctx.fillStyle = "rgba(0, 0, 0, 0.65)";
    ctx.fillRect(viewW - 200, 8, 192, 22);
    ctx.fillStyle = "rgba(0, 200, 255, 0.8)";
    ctx.font = `500 10px ${FONT_FAMILY}`;
    ctx.fillText(
      `world: (${Math.round(pointerWorld.x)}, ${Math.round(pointerWorld.y)})`,
      viewW - 194,
      23,
    );
    ctx.restore();
  }
  drawAmbientTint(ctx, viewW, viewH, snapshot.effects);

  // FX overlay (screen-space, after ambient tint but before focus dimming)
  if (snapshot.backdrop) {
    const fxIds = snapshot.backdrop.zones.fxOverlay;
    if (fxIds.length > 0) {
      ctx.save();
      ctx.translate(viewW / 2, viewH / 2);
      ctx.scale(camera.zoom, camera.zoom);
      ctx.translate(-camera.x, -camera.y);
      drawBackdropZone(ctx, snapshot, "fxOverlay", imageCache);
      ctx.restore();
    }
  }

  // Rooms use hover-style grid/wall highlights instead of the rectangular dimming cutout
  if (effectiveFocus?.highlightBounds && effectiveFocus.targetKind !== "room") {
    const fb = effectiveFocus.highlightBounds;
    drawFocusDimming(ctx, viewW, viewH, snapshot.effects, {
      x: (fb.x - camera.x) * camera.zoom + viewW / 2,
      y: (fb.y - camera.y) * camera.zoom + viewH / 2,
      width: fb.width * camera.zoom,
      height: fb.height * camera.zoom,
    });
  }
}

// ── HQ hit testing ────────────────────────────────────────────────────────

function hitTestHqRoom(
  snapshot: HqWorldSnapshot,
  worldX: number,
  worldY: number,
): HqRoomNode | null {
  const { originX, originY, tileWidth, tileHeight } = snapshot.layout;
  // Inverse isometric projection: world → grid
  const dx = worldX - originX;
  const dy = worldY - originY;
  const col = (dx / (tileWidth / 2) + dy / (tileHeight / 2)) / 2;
  const row = (dy / (tileHeight / 2) - dx / (tileWidth / 2)) / 2;

  for (const room of snapshot.rooms) {
    const fp = room.reservedFootprint;
    if (col >= fp.col && col < fp.col + fp.cols && row >= fp.row && row < fp.row + fp.rows) {
      return room;
    }
  }
  return null;
}

function hitTestActor(
  snapshot: HqWorldSnapshot,
  worldX: number,
  worldY: number,
): ActorMarker | null {
  for (const actor of snapshot.actors) {
    const { x: ax, y: ay } = actor;
    if (actor.kind === "operator" && actor.presetId) {
      const hw = TOKEN_W / 2 + 4;
      const top = ay - TOKEN_H - 4;
      if (worldX >= ax - hw && worldX <= ax + hw && worldY >= top && worldY <= ay + 4) {
        return actor;
      }
    } else {
      const dx = worldX - ax;
      const dy = worldY - ay;
      const hitR = ACTOR_RADIUS + 6;
      if (dx * dx + dy * dy <= hitR * hitR) {
        return actor;
      }
    }
  }
  return null;
}

// ── Prop placement debug overlay (toggle with G key in dev) ──────────────

let debugGridEnabled = false;

function drawPropDebugOverlay(ctx: CanvasRenderingContext2D, snapshot: HqWorldSnapshot): void {
  if (!debugGridEnabled) return;

  // Draw tile grid lines within each room
  for (const room of snapshot.rooms) {
    const fp = room.reservedFootprint;
    ctx.save();
    ctx.globalAlpha = 0.4;

    // Draw grid lines for each tile in the room
    for (let c = fp.col; c <= fp.col + fp.cols; c++) {
      const p0 = hqProject(snapshot, c, fp.row);
      const p1 = hqProject(snapshot, c, fp.row + fp.rows);
      ctx.strokeStyle = "#ff0";
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.stroke();
    }
    for (let r = fp.row; r <= fp.row + fp.rows; r++) {
      const p0 = hqProject(snapshot, fp.col, r);
      const p1 = hqProject(snapshot, fp.col + fp.cols, r);
      ctx.strokeStyle = "#ff0";
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.stroke();
    }

    // Label tile coordinates at center of each tile
    ctx.font = "8px monospace";
    ctx.textAlign = "center";
    ctx.fillStyle = "#ff0";
    for (let c = fp.col; c < fp.col + fp.cols; c++) {
      for (let r = fp.row; r < fp.row + fp.rows; r++) {
        const center = hqProject(snapshot, c + 0.5, r + 0.5);
        ctx.fillText(`${c - fp.col},${r - fp.row}`, center.x, center.y + 3);
      }
    }
    ctx.textAlign = "start";
    ctx.restore();
  }

  // Draw prop anchor points and bounding boxes
  for (const sprite of snapshot.roomProps) {
    ctx.save();
    // Bounding box
    ctx.strokeStyle = "rgba(255, 80, 80, 0.5)";
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.strokeRect(sprite.x, sprite.y, sprite.width, sprite.height);
    ctx.setLineDash([]);

    // Anchor point (bottom-center of sprite)
    const anchorX = sprite.x + sprite.width / 2;
    const anchorY = sprite.y + sprite.height;
    ctx.fillStyle = "#f44";
    ctx.beginPath();
    ctx.arc(anchorX, anchorY, 3, 0, Math.PI * 2);
    ctx.fill();

    // Label
    const label = sprite.id.split("/").pop() ?? "";
    ctx.fillStyle = "#f88";
    ctx.font = "7px monospace";
    ctx.fillText(label, sprite.x, sprite.y - 2);
    ctx.restore();
  }
}

// ── HqWorldCanvas component ──────────────────────────────────────────────

const sharedImageCache = new SvgImageCache();

export interface HqDebugOverlays {
  showRoomBounds?: boolean;
  showFootprints?: boolean;
  showAnchors?: boolean;
  showPointerCoords?: boolean;
}

interface HqWorldCanvasProps {
  snapshot: HqWorldSnapshot;
  focus?: FocusPayload | null;
  onFocusChange?: (focus: FocusPayload | null) => void;
  debugOverlays?: HqDebugOverlays;
}

export function HqWorldCanvas({
  snapshot,
  focus = null,
  onFocusChange,
  debugOverlays,
}: HqWorldCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const snapshotRef = useRef(snapshot);
  const focusRef = useRef<FocusPayload | null>(focus);
  const onFocusChangeRef = useRef(onFocusChange);
  const debugOverlaysRef = useRef(debugOverlays);
  const cameraRef = useRef<CameraState | null>(null);
  const boundsRef = useRef<CameraBounds>(createCameraBounds(800, 600, 800, 600));
  const panRef = useRef<PanState>(createPanState());
  const animFrameRef = useRef<number>(0);
  const hoveredRoomIdRef = useRef<string | null>(null);
  const pointerWorldRef = useRef<{ x: number; y: number } | null>(null);
  const viewportRef = useRef<CanvasViewport>(DEFAULT_VIEWPORT);

  snapshotRef.current = snapshot;
  focusRef.current = focus;
  onFocusChangeRef.current = onFocusChange;
  debugOverlaysRef.current = debugOverlays;

  useEffect(() => {
    const urls = [
      ...snapshot.roomProps.map((sprite) => sprite.assetUrl),
      ...snapshot.scenery.map((sprite) => sprite.assetUrl),
      ...snapshot.actors.flatMap((actor) =>
        actor.kind === "operator" && actor.presetId
          ? [getActorPortraitUrl(actor.presetId, actor.roleTag ?? "")]
          : [],
      ),
      ...(snapshot.backdrop ? collectBackdropAssetUrls(snapshot.backdrop) : []),
    ];
    sharedImageCache.preloadAll([...new Set(urls)]);
  }, [snapshot.roomProps, snapshot.scenery, snapshot.actors, snapshot.backdrop]);

  const syncHqViewport = useCallback((canvas: HTMLCanvasElement, shouldMeasure = true) => {
    const viewport = shouldMeasure
      ? measureCanvasViewport(canvas)
      : { ...viewportRef.current, dpr: window.devicePixelRatio || viewportRef.current.dpr };
    viewportRef.current = viewport;

    const nextSnapshot = snapshotRef.current;
    boundsRef.current = createCameraBounds(
      nextSnapshot.layout.worldWidth,
      nextSnapshot.layout.worldHeight,
      viewport.width,
      viewport.height,
      nextSnapshot.layout.buildingWorldSize,
    );

    let centerX = nextSnapshot.layout.minX + nextSnapshot.layout.worldWidth / 2;
    let centerY = nextSnapshot.layout.minY + nextSnapshot.layout.worldHeight / 2;
    if (nextSnapshot.rooms.length > 0 || nextSnapshot.expansionSlots.length > 0) {
      const allPts = [...nextSnapshot.rooms, ...nextSnapshot.expansionSlots].flatMap((r) => [
        ...r.floorPoints,
        ...r.leftWallPoints,
        ...r.rightWallPoints,
      ]);
      const rxs = allPts.map((p) => p.x);
      const rys = allPts.map((p) => p.y);
      centerX = (Math.min(...rxs) + Math.max(...rxs)) / 2;
      centerY = (Math.min(...rys) + Math.max(...rys)) / 2;
    }

    const fitZoom =
      Math.min(
        viewport.width / nextSnapshot.layout.worldWidth,
        viewport.height / nextSnapshot.layout.worldHeight,
      ) * 1.5;
    const initialZoom = Math.min(
      boundsRef.current.maxZoom,
      Math.max(boundsRef.current.minZoom, fitZoom),
    );

    cameraRef.current = cameraRef.current
      ? clampCamera(
          { ...cameraRef.current, zoom: cameraRef.current.zoom || initialZoom },
          boundsRef.current,
          viewport.width,
          viewport.height,
        )
      : clampCamera(
          { x: centerX, y: centerY, zoom: initialZoom },
          boundsRef.current,
          viewport.width,
          viewport.height,
        );
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleResize = () => syncHqViewport(canvas);
    handleResize();

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(canvas);
    window.addEventListener("resize", handleResize);
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", handleResize);
    };
  }, [syncHqViewport]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    syncHqViewport(canvas, false);
  }, [
    snapshot.layout.worldWidth,
    snapshot.layout.worldHeight,
    snapshot.layout.buildingWorldSize,
    snapshot.layout.minX,
    snapshot.layout.minY,
    snapshot.rooms,
    snapshot.expansionSlots,
    syncHqViewport,
  ]);

  // G key toggles prop debug grid overlay (dev only)
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    function onKey(e: KeyboardEvent) {
      if (e.code === "KeyG" && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
        debugGridEnabled = !debugGridEnabled;
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const cv = canvas;
    const cx = ctx;

    function draw(timestamp: number) {
      if (!cameraRef.current) {
        animFrameRef.current = requestAnimationFrame(draw);
        return;
      }

      const nextDpr = window.devicePixelRatio || 1;
      if (viewportRef.current.dpr !== nextDpr) {
        viewportRef.current = { ...viewportRef.current, dpr: nextDpr };
      }
      syncCanvasBackingStore(cv, viewportRef.current);
      cx.setTransform(viewportRef.current.dpr, 0, 0, viewportRef.current.dpr, 0, 0);
      drawHqWorld(
        cx,
        snapshotRef.current,
        focusRef.current,
        cameraRef.current,
        viewportRef.current.width,
        viewportRef.current.height,
        sharedImageCache,
        hoveredRoomIdRef.current,
        timestamp,
        debugOverlaysRef.current,
        pointerWorldRef.current,
      );
      animFrameRef.current = requestAnimationFrame(draw);
    }

    animFrameRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button !== 0 || !cameraRef.current) return;
    panRef.current = beginPan(panRef.current, e.clientX, e.clientY, cameraRef.current);
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !cameraRef.current) return;
    const rect = canvas.getBoundingClientRect();
    const nextSnapshot = snapshotRef.current;

    if (panRef.current.isPanning) {
      const next = updatePan(panRef.current, e.clientX, e.clientY, cameraRef.current);
      cameraRef.current = clampCamera(next, boundsRef.current, rect.width, rect.height);
      hoveredRoomIdRef.current = null;
      canvas.style.cursor = "grabbing";
      return;
    }

    const localX = e.clientX - rect.left;
    const localY = e.clientY - rect.top;
    const world = screenToWorld(localX, localY, cameraRef.current, rect.width, rect.height);
    pointerWorldRef.current = world;
    const actor = hitTestActor(nextSnapshot, world.x, world.y);
    const room = actor ? null : hitTestHqRoom(nextSnapshot, world.x, world.y);
    hoveredRoomIdRef.current = room?.id ?? null;
    canvas.style.cursor = actor || room ? "pointer" : "default";
  }, []);

  const handleMouseUp = useCallback(() => {
    panRef.current = endPan(panRef.current);
  }, []);

  const handleMouseLeave = useCallback(() => {
    panRef.current = endPan(panRef.current);
    hoveredRoomIdRef.current = null;
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas || !cameraRef.current) return;
    const rect = canvas.getBoundingClientRect();
    const next = applyWheelZoom(
      cameraRef.current,
      boundsRef.current,
      e.deltaY,
      e.clientX - rect.left,
      e.clientY - rect.top,
      rect.width,
      rect.height,
    );
    cameraRef.current = clampCamera(next, boundsRef.current, rect.width, rect.height);
  }, []);

  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!cameraRef.current) return;
    const nextOnFocusChange = onFocusChangeRef.current;
    if (!nextOnFocusChange) return;
    const dx = Math.abs(e.clientX - panRef.current.startScreenX);
    const dy = Math.abs(e.clientY - panRef.current.startScreenY);
    if (dx > 4 || dy > 4) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const nextSnapshot = snapshotRef.current;
    const world = screenToWorld(
      e.clientX - rect.left,
      e.clientY - rect.top,
      cameraRef.current,
      rect.width,
      rect.height,
    );

    const actor = hitTestActor(nextSnapshot, world.x, world.y);
    if (actor) {
      const { x: actorX, y: actorY } = actor;
      const portraitUrl =
        (actor.kind === "operator" || actor.kind === "visitor") && actor.presetId
          ? getActorPortraitUrl(actor.presetId, actor.roleTag ?? "")
          : null;
      const hasPortrait = portraitUrl ? sharedImageCache.get(portraitUrl) !== null : false;
      const bounds = hasPortrait
        ? {
            x: actorX - TOKEN_W / 2 - 4,
            y: actorY - TOKEN_H - 4,
            width: TOKEN_W + 8,
            height: TOKEN_H + 16,
          }
        : {
            x: actorX - ACTOR_RADIUS - 8,
            y: actorY - ACTOR_RADIUS - 8,
            width: (ACTOR_RADIUS + 8) * 2,
            height: (ACTOR_RADIUS + 8) * 2,
          };
      const focusKind =
        actor.kind === "operator" ? "operator" : actor.kind === "visitor" ? "visitor" : "staff";
      nextOnFocusChange(buildFocusHighlight(focusKind, actor.id, bounds));
      return;
    }

    const room = hitTestHqRoom(nextSnapshot, world.x, world.y);
    if (room) {
      nextOnFocusChange(buildFocusHighlight("room", room.id, room.bounds));
      return;
    }

    nextOnFocusChange(null);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 h-full w-full"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      onWheel={handleWheel}
      onClick={handleClick}
      aria-label={`${snapshot.buildingName} world view`}
    />
  );
}

// ── Raid world rendering (unchanged) ──────────────────────────────────────

function drawRaidWorld(
  ctx: CanvasRenderingContext2D,
  snapshot: RaidWorldSnapshot,
  focus: FocusPayload | null,
  camera: CameraState,
  viewW: number,
  viewH: number,
  time: number,
): void {
  ctx.fillStyle = RAID_VOID;
  ctx.fillRect(0, 0, viewW, viewH);

  ctx.save();
  ctx.translate(viewW / 2, viewH / 2);
  ctx.scale(camera.zoom, camera.zoom);
  ctx.translate(-camera.x, -camera.y);

  const gridW = Math.ceil(snapshot.dungeonWidth / RAID_FOG_CELL);
  for (const cell of snapshot.fogMask) {
    if (!cell.revealed) continue;
    const px = cell.x * RAID_FOG_CELL;
    const py = cell.y * RAID_FOG_CELL;
    const kind = classifyCell(cell, snapshot.fogMask, gridW);
    if (kind === "chamber") {
      drawChamberTile(ctx, px, py, RAID_FOG_CELL);
    } else {
      drawCorridorTile(ctx, px, py, RAID_FOG_CELL);
    }
  }

  drawFogEdges(ctx, snapshot.fogMask, RAID_FOG_CELL);

  snapshot.features.forEach((feature) => drawFeatureMarker(ctx, feature, time));
  snapshot.enemies.forEach((enemy) => {
    if (enemy.discovered) {
      drawEnemyMarker(ctx, enemy.x, enemy.y, enemy.threat, time);
    }
  });
  drawFogOfWar(ctx, snapshot.fogMask, RAID_FOG_CELL, snapshot.effects);

  const effectiveFocus = focus ?? snapshot.focus;
  const focusedTeamId = effectiveFocus?.targetKind === "team" ? effectiveFocus.targetId : null;
  snapshot.teams.forEach((team) => drawTeamMarker(ctx, team, team.teamId === focusedTeamId, time));
  ctx.restore();

  drawAmbientTint(ctx, viewW, viewH, snapshot.effects);
  if (effectiveFocus?.highlightBounds) {
    const fb = effectiveFocus.highlightBounds;
    drawFocusDimming(ctx, viewW, viewH, snapshot.effects, {
      x: (fb.x - camera.x) * camera.zoom + viewW / 2,
      y: (fb.y - camera.y) * camera.zoom + viewH / 2,
      width: fb.width * camera.zoom,
      height: fb.height * camera.zoom,
    });
  }
}

interface RaidWorldCanvasProps {
  snapshot: RaidWorldSnapshot;
  focus?: FocusPayload | null;
  onFocusChange?: (focus: FocusPayload | null) => void;
}

export function RaidWorldCanvas({ snapshot, focus = null, onFocusChange }: RaidWorldCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const snapshotRef = useRef(snapshot);
  const focusRef = useRef<FocusPayload | null>(focus);
  const onFocusChangeRef = useRef(onFocusChange);
  const cameraRef = useRef<CameraState>(createCameraState(512, 512));
  const boundsRef = useRef<CameraBounds>(createCameraBounds(512, 512, 800, 600));
  const panRef = useRef<PanState>(createPanState());
  const animFrameRef = useRef<number>(0);
  const viewportRef = useRef<CanvasViewport>(DEFAULT_VIEWPORT);

  snapshotRef.current = snapshot;
  focusRef.current = focus;
  onFocusChangeRef.current = onFocusChange;

  const syncRaidViewport = useCallback((canvas: HTMLCanvasElement, shouldMeasure = true) => {
    const viewport = shouldMeasure
      ? measureCanvasViewport(canvas)
      : { ...viewportRef.current, dpr: window.devicePixelRatio || viewportRef.current.dpr };
    viewportRef.current = viewport;
    const nextSnapshot = snapshotRef.current;
    boundsRef.current = createCameraBounds(
      nextSnapshot.dungeonWidth,
      nextSnapshot.dungeonHeight,
      viewport.width,
      viewport.height,
    );
    cameraRef.current = clampCamera(
      cameraRef.current,
      boundsRef.current,
      viewport.width,
      viewport.height,
    );
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const handleResize = () => syncRaidViewport(canvas);
    handleResize();

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(canvas);
    window.addEventListener("resize", handleResize);
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", handleResize);
    };
  }, [syncRaidViewport]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    syncRaidViewport(canvas, false);
  }, [snapshot.dungeonWidth, snapshot.dungeonHeight, syncRaidViewport]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const cv = canvas;
    const cx = ctx;

    function draw(timestamp: number) {
      const nextDpr = window.devicePixelRatio || 1;
      if (viewportRef.current.dpr !== nextDpr) {
        viewportRef.current = { ...viewportRef.current, dpr: nextDpr };
      }
      syncCanvasBackingStore(cv, viewportRef.current);
      cx.setTransform(viewportRef.current.dpr, 0, 0, viewportRef.current.dpr, 0, 0);
      drawRaidWorld(
        cx,
        snapshotRef.current,
        focusRef.current,
        cameraRef.current,
        viewportRef.current.width,
        viewportRef.current.height,
        timestamp,
      );
      animFrameRef.current = requestAnimationFrame(draw);
    }

    animFrameRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button !== 0) return;
    panRef.current = beginPan(panRef.current, e.clientX, e.clientY, cameraRef.current);
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!panRef.current.isPanning) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const next = updatePan(panRef.current, e.clientX, e.clientY, cameraRef.current);
    cameraRef.current = clampCamera(next, boundsRef.current, rect.width, rect.height);
  }, []);

  const handleMouseUp = useCallback(() => {
    panRef.current = endPan(panRef.current);
  }, []);

  const handleMouseLeave = useCallback(() => {
    panRef.current = endPan(panRef.current);
    const canvas = canvasRef.current;
    if (canvas) canvas.style.cursor = "default";
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const next = applyWheelZoom(
      cameraRef.current,
      boundsRef.current,
      e.deltaY,
      e.clientX - rect.left,
      e.clientY - rect.top,
      rect.width,
      rect.height,
    );
    cameraRef.current = clampCamera(next, boundsRef.current, rect.width, rect.height);
  }, []);

  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const nextOnFocusChange = onFocusChangeRef.current;
    if (!nextOnFocusChange) return;
    const dx = Math.abs(e.clientX - panRef.current.startScreenX);
    const dy = Math.abs(e.clientY - panRef.current.startScreenY);
    if (dx > 4 || dy > 4) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const nextSnapshot = snapshotRef.current;
    const world = screenToWorld(
      e.clientX - rect.left,
      e.clientY - rect.top,
      cameraRef.current,
      rect.width,
      rect.height,
    );

    for (const team of nextSnapshot.teams) {
      const tx = world.x - team.x;
      const ty = world.y - team.y;
      if (tx * tx + ty * ty <= 100) {
        nextOnFocusChange(
          buildFocusHighlight("team", team.teamId, {
            x: team.x - 18,
            y: team.y - 18,
            width: 36,
            height: 36,
          }),
        );
        return;
      }
    }

    nextOnFocusChange(null);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 h-full w-full"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      onWheel={handleWheel}
      onClick={handleClick}
      aria-label={`${snapshot.dungeonName} raid map`}
    />
  );
}

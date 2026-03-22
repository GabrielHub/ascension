import { useCallback, useEffect, useRef, useState } from "react";

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
  HqPerimeterTile,
  HqPoint,
  HqRoomNode,
  HqSpritePlacement,
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

// ── Perimeter fill colors ─────────────────────────────────────────────────

const PERIMETER_FILLS: Record<HqPerimeterTile["kind"], string> = {
  sidewalk: "#3c362a",
  street: "#1a1a20",
  alley: "#0e0e14",
  void: "#0a0a0e",
};

const PERIMETER_STROKES: Record<HqPerimeterTile["kind"], string> = {
  sidewalk: "rgba(255, 255, 255, 0.05)",
  street: "rgba(255, 255, 255, 0.02)",
  alley: "rgba(255, 255, 255, 0.015)",
  void: "rgba(255, 255, 255, 0.005)",
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

function pointInPolygon(points: readonly HqPoint[], x: number, y: number): boolean {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const xi = points[i].x;
    const yi = points[i].y;
    const xj = points[j].x;
    const yj = points[j].y;
    const intersects =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / Math.max(yj - yi, 0.0001) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

function hqProject(snapshot: HqWorldSnapshot, col: number, row: number): HqPoint {
  return projectIso(col, row, snapshot.layout.originX, snapshot.layout.originY);
}

/** Diamond for a single tile using grid vertex positions (not center). */
function tileDiamond(snapshot: HqWorldSnapshot, col: number, row: number): HqPoint[] {
  const p0 = hqProject(snapshot, col, row);
  const p1 = hqProject(snapshot, col + 1, row);
  const p2 = hqProject(snapshot, col + 1, row + 1);
  const p3 = hqProject(snapshot, col, row + 1);
  return [p0, p1, p2, p3];
}

// ── Modular tile rendering ────────────────────────────────────────────────

function drawPerimeterTiles(ctx: CanvasRenderingContext2D, snapshot: HqWorldSnapshot): void {
  // Solid opaque ground plane behind the iso diamonds to prevent
  // flanking buildings bleeding through the gaps between tiles
  if (snapshot.modular.perimeterTiles.length > 0) {
    const pts = snapshot.modular.perimeterTiles;
    const cols = pts.map((t) => t.col);
    const rows = pts.map((t) => t.row);
    const pMin = hqProject(snapshot, Math.min(...cols), Math.min(...rows));
    const pMaxCol = hqProject(snapshot, Math.max(...cols) + 1, Math.min(...rows));
    const pMaxRow = hqProject(snapshot, Math.min(...cols), Math.max(...rows) + 1);
    const pMax = hqProject(snapshot, Math.max(...cols) + 1, Math.max(...rows) + 1);
    const groundPoly: HqPoint[] = [pMin, pMaxCol, pMax, pMaxRow];
    drawPolygon(ctx, groundPoly, "#0a0a0e");
  }

  const sorted = snapshot.modular.perimeterTiles
    .slice()
    .sort((a, b) => a.col + a.row - (b.col + b.row));

  // Build a set for quick sidewalk/street boundary lookup
  const kindMap = new Map<string, string>();
  for (const tile of snapshot.modular.perimeterTiles) {
    kindMap.set(`${tile.col},${tile.row}`, tile.kind);
  }

  for (const tile of sorted) {
    const fill = PERIMETER_FILLS[tile.kind];
    const stroke = PERIMETER_STROKES[tile.kind];
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

    // Street lane markings — iso-aligned dashed center lines
    if (tile.kind === "street") {
      // Draw center line on tiles in the middle of the street band
      const aboveKey = `${tile.col},${tile.row - 1}`;
      const belowKey = `${tile.col},${tile.row + 1}`;
      const aboveKind = kindMap.get(aboveKey);
      const belowKind = kindMap.get(belowKey);
      const isCenterLane =
        aboveKind === "street" && (belowKind === "street" || belowKind === undefined);

      if (isCenterLane) {
        const cx = (pts[0].x + pts[2].x) / 2;
        const cy = (pts[0].y + pts[2].y) / 2;
        // Iso-aligned dash along col axis direction (2:1 slope)
        ctx.strokeStyle = "rgba(200, 180, 80, 0.18)";
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(cx - 12, cy - 6);
        ctx.lineTo(cx + 12, cy + 6);
        ctx.stroke();
      }

      // Sparse road texture on all street tiles
      const noise = tileNoise(tile.col, tile.row);
      if (noise > 0.7) {
        const cx = (pts[0].x + pts[2].x) / 2;
        const cy = (pts[0].y + pts[2].y) / 2;
        ctx.fillStyle = "rgba(255, 255, 255, 0.01)";
        ctx.fillRect(cx - 6, cy - 1, 12, 2);
      }
    }

    // Curb line: where sidewalk meets street
    if (tile.kind === "sidewalk") {
      const belowKey = `${tile.col},${tile.row + 1}`;
      if (kindMap.get(belowKey) === "street") {
        const p2 = hqProject(snapshot, tile.col + 1, tile.row + 1);
        const p3 = hqProject(snapshot, tile.col, tile.row + 1);
        ctx.strokeStyle = "rgba(120, 108, 80, 0.35)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(p3.x, p3.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      }

      // Sidewalk expansion joints (perpendicular lines across tiles)
      const noise = tileNoise(tile.col, tile.row);
      if (noise > 0.4 && noise < 0.6) {
        const cx = (pts[0].x + pts[2].x) / 2;
        const cy = (pts[0].y + pts[2].y) / 2;
        // Line along row axis (-2:1 slope)
        ctx.strokeStyle = "rgba(255, 255, 255, 0.025)";
        ctx.lineWidth = 0.4;
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
): void {
  const sorted = snapshot.modular.floorTiles
    .slice()
    .sort((a, b) => a.col + a.row - (b.col + b.row));

  for (const tile of sorted) {
    const noise = tileNoise(tile.col, tile.row);
    const alpha = 0.94 + noise * 0.1;
    const isHovered = tile.roomId === hoveredRoomId;
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

function drawModularWallSegments(
  ctx: CanvasRenderingContext2D,
  snapshot: HqWorldSnapshot,
  hoveredRoomId: string | null,
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

    const isHovered = seg.roomId === hoveredRoomId;
    const operational = roomMap.get(seg.roomId)?.isOperational ?? false;

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

    // Operational room warm glow on wall face
    if (operational) {
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
  const operational = roomMap.get(seg.roomId)?.isOperational ?? false;

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

  // Threshold with gold glow for operational rooms
  const thresholdColor = operational ? "rgba(200, 168, 76, 0.3)" : "rgba(100, 100, 110, 0.15)";
  ctx.strokeStyle = thresholdColor;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(p0.x, p0.y);
  ctx.lineTo(p1.x, p1.y);
  ctx.stroke();

  // Warm light spill from operational room
  if (operational) {
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

  ctx.fillStyle = room.isOperational ? SILVER_BRIGHT : SILVER;
  ctx.font = `500 12px ${FONT_FAMILY}`;
  ctx.fillText(room.label, labelX, labelY);
  ctx.fillStyle = room.isOperational ? GOLD : GOLD_DIM;
  ctx.font = `400 10px ${FONT_FAMILY}`;
  ctx.fillText(`T${room.tier}`, labelX, labelY + 18);
}

// ── Backdrop ──────────────────────────────────────────────────────────────

/** Seeded pseudo-random for deterministic star placement. */
function seededRand(seed: number): number {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

function drawBackdrop(ctx: CanvasRenderingContext2D, viewW: number, viewH: number): void {
  // Simple dark fill — the tile ground plane and building walls cover everything
  ctx.fillStyle = "#08080c";
  ctx.fillRect(0, 0, viewW, viewH);
}

// ── Flanking buildings (massive fills behind the ground plane) ────────────

function drawFlankingBuildings(ctx: CanvasRenderingContext2D, snapshot: HqWorldSnapshot): void {
  const periTiles = snapshot.modular.perimeterTiles;
  if (periTiles.length === 0) return;

  const p = (col: number, row: number) => hqProject(snapshot, col, row);

  // Perimeter diamond corners
  const periMinCol = Math.min(...periTiles.map((t) => t.col));
  const periMaxCol = Math.max(...periTiles.map((t) => t.col)) + 1;
  const periMinRow = Math.min(...periTiles.map((t) => t.row));
  const topPt = p(periMinCol, periMinRow);
  const leftPt = p(
    periMinCol,
    periMinRow +
      (periTiles.length > 0 ? Math.max(...periTiles.map((t) => t.row)) + 1 - periMinRow : 1),
  );
  const rightPt = p(periMaxCol, periMinRow);

  // Fill the entire area above / behind the ground diamond with a uniform
  // dark color. Two massive polygons cover the left and right "buildings".
  const EXT = 3000;

  // Left building mass
  ctx.fillStyle = "#0c0b14";
  ctx.beginPath();
  ctx.moveTo(topPt.x, topPt.y);
  ctx.lineTo(leftPt.x, leftPt.y);
  ctx.lineTo(leftPt.x - EXT, leftPt.y);
  ctx.lineTo(topPt.x - EXT, topPt.y - EXT);
  ctx.lineTo(topPt.x, topPt.y - EXT);
  ctx.closePath();
  ctx.fill();

  // Right building mass
  ctx.beginPath();
  ctx.moveTo(topPt.x, topPt.y);
  ctx.lineTo(rightPt.x, rightPt.y);
  ctx.lineTo(rightPt.x + EXT, rightPt.y);
  ctx.lineTo(topPt.x + EXT, topPt.y - EXT);
  ctx.lineTo(topPt.x, topPt.y - EXT);
  ctx.closePath();
  ctx.fill();

  // Alley wall faces along the bodega edges (subtle depth detail)
  const floorTiles = snapshot.modular.floorTiles;
  if (floorTiles.length === 0) return;
  const bldMinCol = Math.min(...floorTiles.map((t) => t.col));
  const bldMaxCol = Math.max(...floorTiles.map((t) => t.col)) + 1;
  const bldMinRow = Math.min(...floorTiles.map((t) => t.row));
  const bldMaxRow = Math.max(...floorTiles.map((t) => t.row)) + 1;
  const wallH = snapshot.layout.wallHeight * 6;

  for (const { c, seed } of [
    { c: bldMinCol, seed: 0 },
    { c: bldMaxCol, seed: 2 },
  ]) {
    const p0 = p(c, bldMinRow);
    const p1 = p(c, bldMaxRow);
    const face: HqPoint[] = [p0, p1, { x: p1.x, y: p1.y - wallH }, { x: p0.x, y: p0.y - wallH }];
    const grad = ctx.createLinearGradient(p0.x, p0.y - wallH, p0.x, p0.y);
    grad.addColorStop(0, "#0c0b14");
    grad.addColorStop(0.8, "#12101a");
    grad.addColorStop(1, "#16141e");
    drawPolygon(ctx, face, grad);

    // Sparse dim windows
    const faceW = Math.abs(p1.x - p0.x);
    const faceDy = p1.y - p0.y;
    if (faceW < 20) continue;
    const winCols = Math.min(Math.floor(faceW / 18), 8);
    for (let wr = 3; wr < 10; wr++) {
      for (let wc = 0; wc < winCols; wc++) {
        const u = (wc + 0.5) / winCols;
        const v = (wr + 0.3) / 10;
        const bx = p0.x + (p1.x - p0.x) * u;
        const by = p0.y + faceDy * u - wallH * v;
        if (seededRand(wc * 17 + wr * 31 + seed * 97) > 0.65) {
          const alpha = 0.02 + seededRand(wc * 13 + wr * 23 + seed * 53) * 0.04;
          ctx.fillStyle = `rgba(200, 168, 76, ${alpha})`;
          ctx.fillRect(bx - 1.5, by - 2, 3, 3);
        }
      }
    }
  }
}

// ── Building shell ────────────────────────────────────────────────────────

function drawBuildingShell(ctx: CanvasRenderingContext2D, snapshot: HqWorldSnapshot): void {
  const tiles = snapshot.modular.floorTiles;
  if (tiles.length === 0) return;

  const minCol = Math.min(...tiles.map((t) => t.col));
  const maxCol = Math.max(...tiles.map((t) => t.col)) + 1;
  const minRow = Math.min(...tiles.map((t) => t.row));
  const maxRow = Math.max(...tiles.map((t) => t.row)) + 1;
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
): void {
  ctx.textAlign = "center";
  ctx.font = `${weight} 10px ${FONT_FAMILY}`;
  ctx.fillStyle = "rgba(6, 6, 8, 0.85)";
  ctx.fillText(label, x + 0.5, y + 0.5);
  ctx.fillText(label, x - 0.5, y + 0.5);
  ctx.fillStyle = SILVER_BRIGHT;
  ctx.fillText(label, x, y);
  ctx.textAlign = "start";
}

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
    actor.kind === "operator" && actor.presetId
      ? getActorPortraitUrl(actor.presetId, actor.roleTag ?? "")
      : null;
  const tokenImg = portraitUrl ? imageCache.load(portraitUrl) : null;
  if (tokenImg) {
    drawChibiToken(ctx, x, y, tokenImg, actor.kind);
    // Always show name for operators, on-hover for others
    if (actor.kind === "operator" || showLabel) {
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
  // Always show name for operators, on-hover for others
  if (actor.kind === "operator" || showLabel) {
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
  } else {
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

    const edgeColor = room.isOperational ? "rgba(200, 168, 76, 0.25)" : "rgba(120, 120, 130, 0.12)";
    const innerColor = room.isOperational
      ? "rgba(200, 168, 76, 0.06)"
      : "rgba(120, 120, 130, 0.03)";

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
): void {
  drawBackdrop(ctx, viewW, viewH);

  ctx.save();
  ctx.translate(viewW / 2, viewH / 2);
  ctx.scale(camera.zoom, camera.zoom);
  ctx.translate(-camera.x, -camera.y);

  // 1. Flanking buildings (drawn first, behind everything)
  drawFlankingBuildings(ctx, snapshot);

  // 2. Perimeter tiles (drawn on top of flanking buildings)
  drawPerimeterTiles(ctx, snapshot);

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
  drawModularWallSegments(ctx, snapshot, hoveredRoomId);

  // 5. Modular floor tiles (back to front)
  drawModularFloorTiles(ctx, snapshot, hoveredRoomId);

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
      (focus?.targetKind === "operator" || focus?.targetKind === "staff"
        ? focus.targetId === actor.id
        : false);
    drawActor(ctx, actor, imageCache, showLabel, time);
  });

  // 8. Hover label overlay
  if (hoveredRoomId) {
    const room = snapshot.rooms.find((r) => r.id === hoveredRoomId);
    if (room) drawRoomHoverLabel(ctx, room);
  }

  // 9. Focus highlight
  const effectiveFocus = focus ?? snapshot.focus;
  if (effectiveFocus) {
    drawFocusHighlightRect(ctx, effectiveFocus);
  }

  // 10. Debug overlay (toggle with G key in dev builds)
  drawPropDebugOverlay(ctx, snapshot);

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

// ── HQ hit testing ────────────────────────────────────────────────────────

function pointInRoom(room: HqRoomNode, x: number, y: number): boolean {
  return (
    pointInPolygon(room.floorPoints, x, y) ||
    pointInPolygon(room.leftWallPoints, x, y) ||
    pointInPolygon(room.rightWallPoints, x, y)
  );
}

function hitTestHqRoom(
  snapshot: HqWorldSnapshot,
  worldX: number,
  worldY: number,
): HqRoomNode | null {
  for (const room of [...snapshot.rooms].reverse()) {
    if (pointInRoom(room, worldX, worldY)) {
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
    const fp = room.footprint;
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

interface HqWorldCanvasProps {
  snapshot: HqWorldSnapshot;
  focus?: FocusPayload | null;
  onFocusChange?: (focus: FocusPayload | null) => void;
}

export function HqWorldCanvas({ snapshot, focus = null, onFocusChange }: HqWorldCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cameraRef = useRef<CameraState | null>(null);
  const boundsRef = useRef<CameraBounds>(createCameraBounds(800, 600, 800, 600));
  const panRef = useRef<PanState>(createPanState());
  const animFrameRef = useRef<number>(0);
  const hoveredRoomIdRef = useRef<string | null>(null);
  const [, forceRender] = useState(0);

  useEffect(() => {
    const urls = [
      ...snapshot.roomProps.map((sprite) => sprite.assetUrl),
      ...snapshot.scenery.map((sprite) => sprite.assetUrl),
      ...snapshot.actors.flatMap((actor) =>
        actor.kind === "operator" && actor.presetId
          ? [getActorPortraitUrl(actor.presetId, actor.roleTag ?? "")]
          : [],
      ),
    ];
    sharedImageCache.preloadAll([...new Set(urls)]);
  }, [snapshot.roomProps, snapshot.scenery, snapshot.actors]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeObserver = new ResizeObserver(() => {
      const rect = canvas.getBoundingClientRect();
      boundsRef.current = createCameraBounds(
        snapshot.layout.worldWidth,
        snapshot.layout.worldHeight,
        rect.width,
        rect.height,
      );
      // Center on building bounds (rooms) rather than full world for a tighter initial view
      let centerX = snapshot.layout.minX + snapshot.layout.worldWidth / 2;
      let centerY = snapshot.layout.minY + snapshot.layout.worldHeight / 2;
      if (snapshot.rooms.length > 0) {
        const allPts = snapshot.rooms.flatMap((r) => [
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
          rect.width / snapshot.layout.worldWidth,
          rect.height / snapshot.layout.worldHeight,
        ) * 1.5;
      const initialZoom = Math.min(
        boundsRef.current.maxZoom,
        Math.max(boundsRef.current.minZoom, fitZoom),
      );

      cameraRef.current = cameraRef.current
        ? clampCamera(
            { ...cameraRef.current, zoom: cameraRef.current.zoom || initialZoom },
            boundsRef.current,
            rect.width,
            rect.height,
          )
        : clampCamera(
            { x: centerX, y: centerY, zoom: initialZoom },
            boundsRef.current,
            rect.width,
            rect.height,
          );
      forceRender((n) => n + 1);
    });
    resizeObserver.observe(canvas);
    return () => resizeObserver.disconnect();
  }, [snapshot.layout]);

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

      const rect = cv.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const nextW = Math.floor(rect.width * dpr);
      const nextH = Math.floor(rect.height * dpr);
      if (cv.width !== nextW || cv.height !== nextH) {
        cv.width = nextW;
        cv.height = nextH;
      }
      cx.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawHqWorld(
        cx,
        snapshot,
        focus,
        cameraRef.current,
        rect.width,
        rect.height,
        sharedImageCache,
        hoveredRoomIdRef.current,
        timestamp,
      );
      animFrameRef.current = requestAnimationFrame(draw);
    }

    animFrameRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [focus, snapshot]);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button !== 0 || !cameraRef.current) return;
    panRef.current = beginPan(panRef.current, e.clientX, e.clientY, cameraRef.current);
  }, []);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas || !cameraRef.current) return;
      const rect = canvas.getBoundingClientRect();

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
      const actor = hitTestActor(snapshot, world.x, world.y);
      const room = actor ? null : hitTestHqRoom(snapshot, world.x, world.y);
      hoveredRoomIdRef.current = room?.id ?? null;
      canvas.style.cursor = actor || room ? "pointer" : "default";
    },
    [snapshot],
  );

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

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!onFocusChange || !cameraRef.current) return;
      const dx = Math.abs(e.clientX - panRef.current.startScreenX);
      const dy = Math.abs(e.clientY - panRef.current.startScreenY);
      if (dx > 4 || dy > 4) return;

      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const world = screenToWorld(
        e.clientX - rect.left,
        e.clientY - rect.top,
        cameraRef.current,
        rect.width,
        rect.height,
      );

      const actor = hitTestActor(snapshot, world.x, world.y);
      if (actor) {
        if (actor.kind === "visitor") {
          onFocusChange(null);
          return;
        }

        const { x: actorX, y: actorY } = actor;
        const portraitUrl =
          actor.kind === "operator" && actor.presetId
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
        onFocusChange(
          buildFocusHighlight(actor.kind === "operator" ? "operator" : "staff", actor.id, bounds),
        );
        return;
      }

      const room = hitTestHqRoom(snapshot, world.x, world.y);
      if (room) {
        onFocusChange(buildFocusHighlight("room", room.id, room.bounds));
        return;
      }

      onFocusChange(null);
    },
    [snapshot, onFocusChange],
  );

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
  const cameraRef = useRef<CameraState>(createCameraState(512, 512));
  const boundsRef = useRef<CameraBounds>(createCameraBounds(512, 512, 800, 600));
  const panRef = useRef<PanState>(createPanState());
  const animFrameRef = useRef<number>(0);
  const [, forceRender] = useState(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resizeObserver = new ResizeObserver(() => {
      const rect = canvas.getBoundingClientRect();
      boundsRef.current = createCameraBounds(
        snapshot.dungeonWidth,
        snapshot.dungeonHeight,
        rect.width,
        rect.height,
      );
      cameraRef.current = clampCamera(
        cameraRef.current,
        boundsRef.current,
        rect.width,
        rect.height,
      );
      forceRender((n) => n + 1);
    });
    resizeObserver.observe(canvas);
    return () => resizeObserver.disconnect();
  }, [snapshot.dungeonWidth, snapshot.dungeonHeight]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const cv = canvas;
    const cx = ctx;

    function draw(timestamp: number) {
      const rect = cv.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const nextW = Math.floor(rect.width * dpr);
      const nextH = Math.floor(rect.height * dpr);
      if (cv.width !== nextW || cv.height !== nextH) {
        cv.width = nextW;
        cv.height = nextH;
      }
      cx.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawRaidWorld(cx, snapshot, focus, cameraRef.current, rect.width, rect.height, timestamp);
      animFrameRef.current = requestAnimationFrame(draw);
    }

    animFrameRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [focus, snapshot]);

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

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!onFocusChange) return;
      const dx = Math.abs(e.clientX - panRef.current.startScreenX);
      const dy = Math.abs(e.clientY - panRef.current.startScreenY);
      if (dx > 4 || dy > 4) return;

      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const world = screenToWorld(
        e.clientX - rect.left,
        e.clientY - rect.top,
        cameraRef.current,
        rect.width,
        rect.height,
      );

      for (const team of snapshot.teams) {
        const tx = world.x - team.x;
        const ty = world.y - team.y;
        if (tx * tx + ty * ty <= 100) {
          onFocusChange(
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

      onFocusChange(null);
    },
    [snapshot, onFocusChange],
  );

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

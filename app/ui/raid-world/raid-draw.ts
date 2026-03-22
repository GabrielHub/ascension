/**
 * Raid canvas drawing helpers — authored visual language for the dungeon map.
 *
 * Presentation-owned. These functions are consumed by the runtime-owned
 * RaidWorldCanvas in render/world-canvas.tsx to replace the placeholder
 * tile and marker drawing with the authored raid map style.
 *
 * Intentionally lighter and more abstract than HQ drawing.
 */

import type { RaidTeamGoal, RaidTeamMarker, FogCell } from "render";

// ── Palette ─────────────────────────────────────────────────────────

const RAID_VOID = "#060810";
const CORRIDOR_FLOOR_A = "#1a2030";
const CORRIDOR_FLOOR_B = "#141a28";
const CHAMBER_FLOOR_A = "#1d2435";
const CHAMBER_FLOOR_B = "#171d2d";
const WALL_COLOR = "rgba(58,69,104,0.48)";
const GRID_ACCENT = "rgba(92,112,156,0.18)";
const GOLD = "#c8a84c";
const GOLD_DIM = "rgba(200,168,76,0.25)";
const EMBER = "rgba(212,84,30,0.6)";
const EMBER_BRIGHT = "rgba(212,84,30,0.9)";
const SILVER = "rgba(224,221,214,0.72)";
const FOG_EDGE_INNER = "rgba(6,6,8,0)";
const FOG_EDGE_OUTER = "rgba(6,6,8,0.85)";
const FONT_FAMILY = "'Inter', sans-serif";

function getViewScale(ctx: CanvasRenderingContext2D): number {
  return Math.max(Math.abs(ctx.getTransform().a), 0.001);
}

function screenPxToWorld(ctx: CanvasRenderingContext2D, px: number): number {
  return px / getViewScale(ctx);
}

function withAlpha(color: string, alpha: number): string {
  return color.replace(/[\d.]+\)\s*$/, `${alpha})`);
}

function traceRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// ── Goal color mapping ──────────────────────────────────────────────

const GOAL_COLORS: Record<RaidTeamGoal, string> = {
  exploring: "rgba(100,160,220,0.8)",
  looting: "rgba(200,168,76,0.9)",
  intel: "rgba(100,160,220,0.9)",
  hunting: "rgba(212,84,30,0.8)",
  boss: "rgba(212,84,30,0.95)",
  retreating: "rgba(224,221,214,0.5)",
  regrouping: "rgba(200,168,76,0.5)",
};

const GOAL_LABELS: Record<RaidTeamGoal, string> = {
  exploring: "EXP",
  looting: "LOOT",
  intel: "INT",
  hunting: "HUNT",
  boss: "BOSS",
  retreating: "RET",
  regrouping: "RGRP",
};

// ── Tile classification ─────────────────────────────────────────────

/** Classify a revealed cell based on its neighbors for varied rendering. */
export function classifyCell(
  cell: FogCell,
  fogMask: readonly FogCell[],
  _gridW: number,
): "corridor" | "chamber" | "edge" {
  if (!cell.revealed) return "edge";

  // Count revealed neighbors in a 3x3 area
  let revealed = 0;
  for (const other of fogMask) {
    if (Math.abs(other.x - cell.x) <= 1 && Math.abs(other.y - cell.y) <= 1 && other.revealed) {
      revealed++;
    }
  }

  // Many neighbors = open chamber, few = tight corridor
  if (revealed >= 7) return "chamber";
  return "corridor";
}

// ── Tile drawing ────────────────────────────────────────────────────

/** Draw a single revealed corridor tile. */
export function drawCorridorTile(
  ctx: CanvasRenderingContext2D,
  px: number,
  py: number,
  size: number,
): void {
  const viewScale = getViewScale(ctx);
  const edgeThickness = Math.min(size * 0.12, Math.max(1.75 / viewScale, 1.1));
  const guideLineWidth = Math.max(0.75 / viewScale, 0.35);

  // Floor gradient
  const grad = ctx.createLinearGradient(px, py, px, py + size);
  grad.addColorStop(0, CORRIDOR_FLOOR_A);
  grad.addColorStop(1, CORRIDOR_FLOOR_B);
  ctx.fillStyle = grad;
  ctx.fillRect(px, py, size, size);

  // Faint wall edge hints (top + bottom)
  ctx.fillStyle = WALL_COLOR;
  ctx.fillRect(px, py, size, edgeThickness);
  ctx.fillRect(px, py + size - edgeThickness, size, edgeThickness);

  // Grid line
  ctx.strokeStyle = "rgba(200,168,76,0.02)";
  ctx.lineWidth = guideLineWidth;
  ctx.beginPath();
  ctx.moveTo(px, py + size / 2);
  ctx.lineTo(px + size, py + size / 2);
  ctx.stroke();
}

/** Draw a single revealed chamber tile. */
export function drawChamberTile(
  ctx: CanvasRenderingContext2D,
  px: number,
  py: number,
  size: number,
): void {
  const viewScale = getViewScale(ctx);
  const accentThickness = Math.max(0.9 / viewScale, 0.5);

  // Slightly warmer floor
  const grad = ctx.createLinearGradient(px, py, px, py + size);
  grad.addColorStop(0, CHAMBER_FLOOR_A);
  grad.addColorStop(1, CHAMBER_FLOOR_B);
  ctx.fillStyle = grad;
  ctx.fillRect(px, py, size, size);

  // Ambient glow center
  const glow = ctx.createRadialGradient(
    px + size / 2,
    py + size / 2,
    0,
    px + size / 2,
    py + size / 2,
    size / 2,
  );
  glow.addColorStop(0, "rgba(200,168,76,0.03)");
  glow.addColorStop(1, "rgba(200,168,76,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(px, py, size, size);

  // Corner accents
  ctx.fillStyle = GRID_ACCENT;
  ctx.fillRect(px + 2, py + 2, 2, 0.8);
  ctx.fillRect(px + size - 4, py + 2, 2, 0.8);
  ctx.fillRect(px + 2, py + size - 3, 2, 0.8);
  ctx.fillRect(px + size - 4, py + size - 3, 2, 0.8);

  ctx.strokeStyle = "rgba(224,221,214,0.05)";
  ctx.lineWidth = accentThickness;
  ctx.strokeRect(
    px + accentThickness,
    py + accentThickness,
    size - accentThickness * 2,
    size - accentThickness * 2,
  );
}

// ── Fog drawing ─────────────────────────────────────────────────────

/** Draw soft fog edges around revealed/unrevealed boundaries. */
export function drawFogEdges(
  ctx: CanvasRenderingContext2D,
  fogMask: readonly FogCell[],
  cellSize: number,
): void {
  const edgeThickness = Math.min(
    cellSize * 0.28,
    Math.max(screenPxToWorld(ctx, 7), cellSize * 0.16),
  );
  const frontierInset = Math.max(screenPxToWorld(ctx, 1.25), cellSize * 0.035);
  const frontierLineWidth = Math.max(screenPxToWorld(ctx, 1), cellSize * 0.025);
  const revealedSet = new Set<string>();
  for (const cell of fogMask) {
    if (cell.revealed) revealedSet.add(`${cell.x},${cell.y}`);
  }

  ctx.save();
  for (const cell of fogMask) {
    if (!cell.revealed) continue;

    const px = cell.x * cellSize;
    const py = cell.y * cellSize;

    // Check each neighbor direction for fog boundary
    const neighbors = [
      { dx: 0, dy: -1, edgeX: px, edgeY: py, edgeW: cellSize, edgeH: edgeThickness },
      {
        dx: 0,
        dy: 1,
        edgeX: px,
        edgeY: py + cellSize - edgeThickness,
        edgeW: cellSize,
        edgeH: edgeThickness,
      },
      { dx: -1, dy: 0, edgeX: px, edgeY: py, edgeW: edgeThickness, edgeH: cellSize },
      {
        dx: 1,
        dy: 0,
        edgeX: px + cellSize - edgeThickness,
        edgeY: py,
        edgeW: edgeThickness,
        edgeH: cellSize,
      },
    ];
    let boundaryCount = 0;

    for (const n of neighbors) {
      const nKey = `${cell.x + n.dx},${cell.y + n.dy}`;
      if (!revealedSet.has(nKey)) {
        boundaryCount += 1;
        // This edge borders fog — draw a gradient from clear to fog
        const grad = ctx.createLinearGradient(
          px + (n.dx === 1 ? cellSize : n.dx === -1 ? 0 : cellSize / 2),
          py + (n.dy === 1 ? cellSize : n.dy === -1 ? 0 : cellSize / 2),
          px +
            (n.dx === 1 ? cellSize + edgeThickness : n.dx === -1 ? -edgeThickness : cellSize / 2),
          py +
            (n.dy === 1 ? cellSize + edgeThickness : n.dy === -1 ? -edgeThickness : cellSize / 2),
        );
        grad.addColorStop(0, FOG_EDGE_INNER);
        grad.addColorStop(1, FOG_EDGE_OUTER);

        ctx.fillStyle = grad;
        ctx.fillRect(n.edgeX, n.edgeY, n.edgeW, n.edgeH);
      }
    }

    if (boundaryCount > 0) {
      ctx.strokeStyle = boundaryCount >= 2 ? "rgba(224,221,214,0.09)" : "rgba(224,221,214,0.06)";
      ctx.lineWidth = frontierLineWidth;
      ctx.strokeRect(
        px + frontierInset,
        py + frontierInset,
        cellSize - frontierInset * 2,
        cellSize - frontierInset * 2,
      );
    }
  }
  ctx.restore();
}

function drawGoalAffordance(
  ctx: CanvasRenderingContext2D,
  team: RaidTeamMarker,
  radius: number,
  goalColor: string,
): void {
  const ringRadius = radius + screenPxToWorld(ctx, 4);
  const lineWidth = screenPxToWorld(ctx, 1.25);
  const crossRadius = radius + screenPxToWorld(ctx, 5.5);

  ctx.strokeStyle = goalColor;
  ctx.lineWidth = lineWidth;

  switch (team.goal) {
    case "exploring":
      ctx.beginPath();
      ctx.arc(team.x, team.y, ringRadius, 0, Math.PI * 2);
      ctx.stroke();
      break;
    case "looting":
      ctx.beginPath();
      ctx.moveTo(team.x, team.y - ringRadius);
      ctx.lineTo(team.x + ringRadius, team.y);
      ctx.lineTo(team.x, team.y + ringRadius);
      ctx.lineTo(team.x - ringRadius, team.y);
      ctx.closePath();
      ctx.stroke();
      break;
    case "intel":
      ctx.strokeRect(team.x - ringRadius, team.y - ringRadius, ringRadius * 2, ringRadius * 2);
      break;
    case "hunting":
      ctx.beginPath();
      ctx.moveTo(team.x - crossRadius, team.y);
      ctx.lineTo(team.x - ringRadius, team.y);
      ctx.moveTo(team.x + ringRadius, team.y);
      ctx.lineTo(team.x + crossRadius, team.y);
      ctx.moveTo(team.x, team.y - crossRadius);
      ctx.lineTo(team.x, team.y - ringRadius);
      ctx.moveTo(team.x, team.y + ringRadius);
      ctx.lineTo(team.x, team.y + crossRadius);
      ctx.stroke();
      break;
    case "boss":
      ctx.beginPath();
      ctx.arc(team.x, team.y, ringRadius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(team.x, team.y, ringRadius + screenPxToWorld(ctx, 3), 0, Math.PI * 2);
      ctx.stroke();
      break;
    case "retreating":
      ctx.setLineDash([screenPxToWorld(ctx, 4), screenPxToWorld(ctx, 2.5)]);
      ctx.beginPath();
      ctx.arc(team.x, team.y, ringRadius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      break;
    case "regrouping":
      ctx.beginPath();
      ctx.arc(team.x, team.y, ringRadius, Math.PI * 0.15, Math.PI * 0.85);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(team.x, team.y, ringRadius, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();
      break;
  }
}

// ── Team marker drawing ─────────────────────────────────────────────

/** Draw a raid team marker with goal-color coding. */
export function drawTeamMarker(
  ctx: CanvasRenderingContext2D,
  team: RaidTeamMarker,
  isFocused: boolean,
  time: number,
): void {
  const viewScale = getViewScale(ctx);
  const pxUnit = 1 / viewScale;
  const goalColor = GOAL_COLORS[team.goal] ?? GOLD;
  const isReturning = team.state === "returning";
  const isDefeated = team.state === "defeated";
  const baseAlpha = isReturning ? 0.5 : isDefeated ? 0.3 : 1.0;

  ctx.save();
  ctx.globalAlpha = baseAlpha;

  // Pulse animation for active teams
  const pulse = isFocused ? 0 : Math.sin(time * 0.003) * 0.15;
  const baseScreenRadius = isFocused ? 8.5 : 5.5 + pulse;
  const radius = baseScreenRadius * pxUnit;
  const glowRadius = radius * (isFocused ? 4 : 3.2);

  // Ambient glow
  const glow = ctx.createRadialGradient(team.x, team.y, 0, team.x, team.y, glowRadius);
  glow.addColorStop(0, withAlpha(goalColor, isFocused ? 0.28 : 0.18));
  glow.addColorStop(1, withAlpha(goalColor, 0));
  ctx.fillStyle = glow;
  ctx.fillRect(team.x - glowRadius, team.y - glowRadius, glowRadius * 2, glowRadius * 2);

  drawGoalAffordance(ctx, team, radius, goalColor);

  // Core dot
  ctx.beginPath();
  ctx.arc(team.x, team.y, radius, 0, Math.PI * 2);
  ctx.fillStyle = isDefeated ? "rgba(120,40,20,0.6)" : GOLD;
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.3)";
  ctx.lineWidth = Math.max(0.9 * pxUnit, 0.5 * pxUnit);
  ctx.stroke();

  // Inner bright point
  ctx.beginPath();
  ctx.arc(team.x - pxUnit, team.y - pxUnit, radius * 0.28, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255,255,255,0.12)";
  ctx.fill();

  // Focus ring
  if (isFocused) {
    ctx.beginPath();
    ctx.arc(team.x, team.y, radius + 4.5 * pxUnit, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(200,168,76,0.4)";
    ctx.lineWidth = 1.5 * pxUnit;
    ctx.setLineDash([4 * pxUnit, 3 * pxUnit]);
    ctx.stroke();
    ctx.setLineDash([]);

    // Corner brackets
    const br = radius + 8 * pxUnit;
    ctx.strokeStyle = "rgba(200,168,76,0.25)";
    ctx.lineWidth = pxUnit;

    ctx.beginPath();
    ctx.moveTo(team.x - br, team.y - br + 4 * pxUnit);
    ctx.lineTo(team.x - br, team.y - br);
    ctx.lineTo(team.x - br + 4 * pxUnit, team.y - br);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(team.x + br - 4 * pxUnit, team.y - br);
    ctx.lineTo(team.x + br, team.y - br);
    ctx.lineTo(team.x + br, team.y - br + 4 * pxUnit);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(team.x + br, team.y + br - 4 * pxUnit);
    ctx.lineTo(team.x + br, team.y + br);
    ctx.lineTo(team.x + br - 4 * pxUnit, team.y + br);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(team.x - br + 4 * pxUnit, team.y + br);
    ctx.lineTo(team.x - br, team.y + br);
    ctx.lineTo(team.x - br, team.y + br - 4 * pxUnit);
    ctx.stroke();
  }

  ctx.globalAlpha = 1;

  const showGoalLabel = isFocused || viewScale >= 1.35;
  if (showGoalLabel) {
    const goalLabel = GOAL_LABELS[team.goal];
    const fontPx = (isFocused ? 8.5 : 7) * pxUnit;
    const labelPadX = (isFocused ? 5 : 4) * pxUnit;
    const labelHeight = (isFocused ? 14 : 11) * pxUnit;
    const labelY = team.y + radius + (isFocused ? 8 : 6.5) * pxUnit;

    ctx.font = `600 ${fontPx}px ${FONT_FAMILY}`;
    ctx.textAlign = "center";
    const labelWidth = ctx.measureText(goalLabel).width + labelPadX * 2;
    traceRoundedRect(
      ctx,
      team.x - labelWidth / 2,
      labelY - labelHeight / 2,
      labelWidth,
      labelHeight,
      5 * pxUnit,
    );
    ctx.fillStyle = "rgba(6,8,16,0.82)";
    ctx.fill();
    ctx.strokeStyle = withAlpha(goalColor, 0.45);
    ctx.lineWidth = pxUnit;
    ctx.stroke();
    ctx.fillStyle = goalColor;
    ctx.fillText(goalLabel, team.x, labelY + fontPx * 0.3);
  }

  if (team.operatorIds.length > 1) {
    const count = String(team.operatorIds.length);
    const fontPx = 7.5 * pxUnit;
    const badgeHeight = 11 * pxUnit;
    const badgeY = team.y - radius - 6.5 * pxUnit;

    ctx.font = `600 ${fontPx}px ${FONT_FAMILY}`;
    const badgeWidth = Math.max(11 * pxUnit, ctx.measureText(count).width + 6 * pxUnit);
    traceRoundedRect(
      ctx,
      team.x - badgeWidth / 2,
      badgeY - badgeHeight / 2,
      badgeWidth,
      badgeHeight,
      5 * pxUnit,
    );
    ctx.fillStyle = "rgba(6,8,16,0.86)";
    ctx.fill();
    ctx.strokeStyle = "rgba(224,221,214,0.12)";
    ctx.lineWidth = 0.9 * pxUnit;
    ctx.stroke();
    ctx.fillStyle = SILVER;
    ctx.textAlign = "center";
    ctx.fillText(count, team.x, badgeY + fontPx * 0.3);
  }

  ctx.textAlign = "start";

  ctx.restore();
}

// ── Enemy marker drawing ────────────────────────────────────────────

export type EnemyThreatLevel = "generic" | "elite" | "boss";

/** Draw an enemy marker on the raid map. */
export function drawEnemyMarker(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  threat: EnemyThreatLevel,
  time: number,
): void {
  const size = threat === "boss" ? 8 : threat === "elite" ? 6 : 4;
  const alpha = threat === "boss" ? 0.9 : threat === "elite" ? 0.7 : 0.5;
  const pulse = Math.sin(time * 0.004 + x * 0.1) * 0.1;

  ctx.save();
  ctx.globalAlpha = alpha + pulse;

  // Threat glow
  const glow = ctx.createRadialGradient(x, y, 0, x, y, size * 2.5);
  glow.addColorStop(0, `rgba(212,84,30,${0.15 * (alpha + pulse)})`);
  glow.addColorStop(1, "rgba(212,84,30,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(x - size * 2.5, y - size * 2.5, size * 5, size * 5);

  // Diamond shape
  ctx.beginPath();
  ctx.moveTo(x, y - size);
  ctx.lineTo(x + size, y);
  ctx.lineTo(x, y + size);
  ctx.lineTo(x - size, y);
  ctx.closePath();
  ctx.fillStyle = EMBER;
  ctx.fill();
  ctx.strokeStyle = EMBER_BRIGHT;
  ctx.lineWidth = threat === "boss" ? 1.2 : 0.8;
  ctx.stroke();

  // Inner diamond for elite+
  if (threat === "elite" || threat === "boss") {
    const inner = size * 0.6;
    ctx.beginPath();
    ctx.moveTo(x, y - inner);
    ctx.lineTo(x + inner, y);
    ctx.lineTo(x, y + inner);
    ctx.lineTo(x - inner, y);
    ctx.closePath();
    ctx.strokeStyle = "rgba(255,160,80,0.3)";
    ctx.lineWidth = 0.6;
    ctx.stroke();
  }

  // Core pip
  ctx.beginPath();
  ctx.arc(x, y, threat === "boss" ? 2.5 : 1.5, 0, Math.PI * 2);
  ctx.fillStyle = EMBER_BRIGHT;
  ctx.fill();

  // Boss outer ring
  if (threat === "boss") {
    ctx.beginPath();
    ctx.arc(x, y, size + 3, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(212,84,30,0.25)";
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 2]);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  ctx.restore();
}

// ── Feature marker types ─────────────────────────────────────────────

export type DungeonFeatureKind = "loot-cache" | "intel-node" | "hazard-zone" | "debris-pile";

export interface DungeonFeatureMarker {
  x: number;
  y: number;
  kind: DungeonFeatureKind;
  discovered: boolean;
}

const FEATURE_COLORS: Record<DungeonFeatureKind, { fill: string; glow: string }> = {
  "loot-cache": {
    fill: "rgba(200,168,76,0.7)",
    glow: "rgba(200,168,76,0.15)",
  },
  "intel-node": {
    fill: "rgba(100,160,220,0.7)",
    glow: "rgba(100,160,220,0.15)",
  },
  "hazard-zone": {
    fill: "rgba(212,84,30,0.6)",
    glow: "rgba(212,84,30,0.12)",
  },
  "debris-pile": {
    fill: "rgba(120,115,100,0.5)",
    glow: "rgba(120,115,100,0.08)",
  },
};

// ── Feature marker drawing ───────────────────────────────────────────

/** Draw a loot cache marker — small diamond with gold glow. */
function drawLootCache(ctx: CanvasRenderingContext2D, x: number, y: number, time: number): void {
  const pulse = Math.sin(time * 0.002) * 0.12;
  const size = 3.5;

  // Glow
  const glow = ctx.createRadialGradient(x, y, 0, x, y, size * 3);
  glow.addColorStop(0, `rgba(200,168,76,${0.18 + pulse})`);
  glow.addColorStop(1, "rgba(200,168,76,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(x - size * 3, y - size * 3, size * 6, size * 6);

  // Diamond
  ctx.beginPath();
  ctx.moveTo(x, y - size);
  ctx.lineTo(x + size, y);
  ctx.lineTo(x, y + size);
  ctx.lineTo(x - size, y);
  ctx.closePath();
  ctx.fillStyle = GOLD;
  ctx.fill();

  // Pip
  ctx.beginPath();
  ctx.arc(x, y, 1, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255,255,255,0.2)";
  ctx.fill();
}

/** Draw an intel node marker — small circle with blue pulse. */
function drawIntelNode(ctx: CanvasRenderingContext2D, x: number, y: number, time: number): void {
  const pulse = Math.sin(time * 0.003 + 1) * 0.15;
  const radius = 3;

  // Pulse ring
  const ringRadius = radius + 4 + pulse * 6;
  ctx.beginPath();
  ctx.arc(x, y, ringRadius, 0, Math.PI * 2);
  ctx.strokeStyle = `rgba(100,160,220,${0.12 + pulse * 0.3})`;
  ctx.lineWidth = 0.6;
  ctx.stroke();

  // Glow
  const glow = ctx.createRadialGradient(x, y, 0, x, y, radius * 2.5);
  glow.addColorStop(0, `rgba(100,160,220,${0.15 + pulse})`);
  glow.addColorStop(1, "rgba(100,160,220,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(x - radius * 2.5, y - radius * 2.5, radius * 5, radius * 5);

  // Core
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(100,160,220,0.7)";
  ctx.fill();
  ctx.strokeStyle = "rgba(100,160,220,0.4)";
  ctx.lineWidth = 0.5;
  ctx.stroke();
}

/** Draw a hazard zone marker — warning triangle. */
function drawHazardZone(ctx: CanvasRenderingContext2D, x: number, y: number, time: number): void {
  const flicker = Math.sin(time * 0.005) * 0.08;
  const size = 4;

  // Glow
  const glow = ctx.createRadialGradient(x, y, 0, x, y, size * 2.5);
  glow.addColorStop(0, `rgba(212,84,30,${0.12 + flicker})`);
  glow.addColorStop(1, "rgba(212,84,30,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(x - size * 2.5, y - size * 2.5, size * 5, size * 5);

  // Triangle
  ctx.beginPath();
  ctx.moveTo(x, y - size);
  ctx.lineTo(x + size, y + size * 0.7);
  ctx.lineTo(x - size, y + size * 0.7);
  ctx.closePath();
  ctx.fillStyle = EMBER;
  ctx.fill();
  ctx.strokeStyle = EMBER_BRIGHT;
  ctx.lineWidth = 0.6;
  ctx.stroke();

  // Exclamation pip
  ctx.fillStyle = "rgba(255,200,100,0.5)";
  ctx.fillRect(x - 0.4, y - size * 0.3, 0.8, size * 0.5);
  ctx.beginPath();
  ctx.arc(x, y + size * 0.3, 0.6, 0, Math.PI * 2);
  ctx.fill();
}

/** Draw a debris pile marker — small scattered dots. */
function drawDebrisPile(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  ctx.fillStyle = "rgba(120,115,100,0.4)";

  // Scattered fragments
  const offsets = [
    [-2, -1],
    [1.5, -1.5],
    [-1, 1.5],
    [2, 0.5],
    [0, -2],
  ];
  for (const [dx, dy] of offsets) {
    ctx.beginPath();
    ctx.arc(x + dx, y + dy, 0.8 + Math.abs(dx) * 0.15, 0, Math.PI * 2);
    ctx.fill();
  }

  // Center mass
  ctx.fillStyle = "rgba(120,115,100,0.3)";
  ctx.beginPath();
  ctx.arc(x, y, 1.8, 0, Math.PI * 2);
  ctx.fill();
}

/** Draw any dungeon feature marker. Only renders discovered features. */
export function drawFeatureMarker(
  ctx: CanvasRenderingContext2D,
  feature: DungeonFeatureMarker,
  time: number,
): void {
  if (!feature.discovered) return;

  ctx.save();
  switch (feature.kind) {
    case "loot-cache":
      drawLootCache(ctx, feature.x, feature.y, time);
      break;
    case "intel-node":
      drawIntelNode(ctx, feature.x, feature.y, time);
      break;
    case "hazard-zone":
      drawHazardZone(ctx, feature.x, feature.y, time);
      break;
    case "debris-pile":
      drawDebrisPile(ctx, feature.x, feature.y);
      break;
  }
  ctx.restore();
}

// ── Exports for canvas integration ──────────────────────────────────

export {
  RAID_VOID,
  GOLD,
  GOLD_DIM,
  SILVER,
  EMBER,
  FONT_FAMILY,
  GOAL_COLORS,
  GOAL_LABELS,
  FEATURE_COLORS,
};

import type { RaidTeamGoal } from "lib/raid-team-goal";

import type {
  DungeonFeatureKind,
  DungeonFeatureMarker,
  EnemyThreatLevel,
  FogCell,
  RaidTeamMarker,
} from "./types";
import { getRaidGoalPresentation } from "./raid-goals";

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

const ALL_GOALS: RaidTeamGoal[] = [
  "exploring",
  "looting",
  "intel",
  "hunting",
  "boss",
  "retreating",
  "regrouping",
];

const GOAL_COLORS = Object.fromEntries(
  ALL_GOALS.map((g) => [g, getRaidGoalPresentation(g).color]),
) as Record<RaidTeamGoal, string>;

const GOAL_LABELS = Object.fromEntries(
  ALL_GOALS.map((g) => [g, getRaidGoalPresentation(g).shortLabel]),
) as Record<RaidTeamGoal, string>;

export function classifyCell(
  cell: FogCell,
  fogMask: readonly FogCell[],
  _gridW: number,
): "corridor" | "chamber" | "edge" {
  if (!cell.revealed) return "edge";

  let revealed = 0;
  for (const other of fogMask) {
    if (Math.abs(other.x - cell.x) <= 1 && Math.abs(other.y - cell.y) <= 1 && other.revealed) {
      revealed += 1;
    }
  }

  return revealed >= 7 ? "chamber" : "corridor";
}

export function drawCorridorTile(
  ctx: CanvasRenderingContext2D,
  px: number,
  py: number,
  size: number,
): void {
  const viewScale = getViewScale(ctx);
  const edgeThickness = Math.min(size * 0.12, Math.max(1.75 / viewScale, 1.1));
  const guideLineWidth = Math.max(0.75 / viewScale, 0.35);

  const grad = ctx.createLinearGradient(px, py, px, py + size);
  grad.addColorStop(0, CORRIDOR_FLOOR_A);
  grad.addColorStop(1, CORRIDOR_FLOOR_B);
  ctx.fillStyle = grad;
  ctx.fillRect(px, py, size, size);

  ctx.fillStyle = WALL_COLOR;
  ctx.fillRect(px, py, size, edgeThickness);
  ctx.fillRect(px, py + size - edgeThickness, size, edgeThickness);

  ctx.strokeStyle = "rgba(200,168,76,0.02)";
  ctx.lineWidth = guideLineWidth;
  ctx.beginPath();
  ctx.moveTo(px, py + size / 2);
  ctx.lineTo(px + size, py + size / 2);
  ctx.stroke();
}

export function drawChamberTile(
  ctx: CanvasRenderingContext2D,
  px: number,
  py: number,
  size: number,
): void {
  const viewScale = getViewScale(ctx);
  const accentThickness = Math.max(0.9 / viewScale, 0.5);

  const grad = ctx.createLinearGradient(px, py, px, py + size);
  grad.addColorStop(0, CHAMBER_FLOOR_A);
  grad.addColorStop(1, CHAMBER_FLOOR_B);
  ctx.fillStyle = grad;
  ctx.fillRect(px, py, size, size);

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
    if (cell.revealed) {
      revealedSet.add(`${cell.x},${cell.y}`);
    }
  }

  ctx.save();
  for (const cell of fogMask) {
    if (!cell.revealed) continue;

    const px = cell.x * cellSize;
    const py = cell.y * cellSize;
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

    for (const neighbor of neighbors) {
      const nextKey = `${cell.x + neighbor.dx},${cell.y + neighbor.dy}`;
      if (!revealedSet.has(nextKey)) {
        boundaryCount += 1;
        const grad = ctx.createLinearGradient(
          px + (neighbor.dx === 1 ? cellSize : neighbor.dx === -1 ? 0 : cellSize / 2),
          py + (neighbor.dy === 1 ? cellSize : neighbor.dy === -1 ? 0 : cellSize / 2),
          px +
            (neighbor.dx === 1
              ? cellSize + edgeThickness
              : neighbor.dx === -1
                ? -edgeThickness
                : cellSize / 2),
          py +
            (neighbor.dy === 1
              ? cellSize + edgeThickness
              : neighbor.dy === -1
                ? -edgeThickness
                : cellSize / 2),
        );
        grad.addColorStop(0, FOG_EDGE_INNER);
        grad.addColorStop(1, FOG_EDGE_OUTER);

        ctx.fillStyle = grad;
        ctx.fillRect(neighbor.edgeX, neighbor.edgeY, neighbor.edgeW, neighbor.edgeH);
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

  const pulse = isFocused ? 0 : Math.sin(time * 0.003) * 0.15;
  const baseScreenRadius = isFocused ? 8.5 : 5.5 + pulse;
  const radius = baseScreenRadius * pxUnit;
  const glowRadius = radius * (isFocused ? 4 : 3.2);

  const glow = ctx.createRadialGradient(team.x, team.y, 0, team.x, team.y, glowRadius);
  glow.addColorStop(0, withAlpha(goalColor, isFocused ? 0.28 : 0.18));
  glow.addColorStop(1, withAlpha(goalColor, 0));
  ctx.fillStyle = glow;
  ctx.fillRect(team.x - glowRadius, team.y - glowRadius, glowRadius * 2, glowRadius * 2);

  drawGoalAffordance(ctx, team, radius, goalColor);

  ctx.beginPath();
  ctx.arc(team.x, team.y, radius, 0, Math.PI * 2);
  ctx.fillStyle = isDefeated ? "rgba(120,40,20,0.6)" : GOLD;
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.3)";
  ctx.lineWidth = Math.max(0.9 * pxUnit, 0.5 * pxUnit);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(team.x - pxUnit, team.y - pxUnit, radius * 0.28, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255,255,255,0.12)";
  ctx.fill();

  if (isFocused) {
    ctx.beginPath();
    ctx.arc(team.x, team.y, radius + 4.5 * pxUnit, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(200,168,76,0.4)";
    ctx.lineWidth = 1.5 * pxUnit;
    ctx.setLineDash([4 * pxUnit, 3 * pxUnit]);
    ctx.stroke();
    ctx.setLineDash([]);
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

  ctx.textAlign = "start";
  ctx.restore();
}

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

  const glow = ctx.createRadialGradient(x, y, 0, x, y, size * 2.5);
  glow.addColorStop(0, `rgba(212,84,30,${0.15 * (alpha + pulse)})`);
  glow.addColorStop(1, "rgba(212,84,30,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(x - size * 2.5, y - size * 2.5, size * 5, size * 5);

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

  ctx.restore();
}

const FEATURE_COLORS: Record<DungeonFeatureKind, { fill: string; glow: string }> = {
  "loot-cache": { fill: "rgba(200,168,76,0.7)", glow: "rgba(200,168,76,0.15)" },
  "intel-node": { fill: "rgba(100,160,220,0.7)", glow: "rgba(100,160,220,0.15)" },
  "hazard-zone": { fill: "rgba(212,84,30,0.6)", glow: "rgba(212,84,30,0.12)" },
  "debris-pile": { fill: "rgba(120,115,100,0.5)", glow: "rgba(120,115,100,0.08)" },
};

export function drawFeatureMarker(
  ctx: CanvasRenderingContext2D,
  feature: DungeonFeatureMarker,
  time: number,
): void {
  if (!feature.discovered) return;

  ctx.save();
  const pulse = Math.sin(time * 0.003 + feature.x * 0.01) * 0.15;
  const colors = FEATURE_COLORS[feature.kind];
  const radius = feature.kind === "debris-pile" ? 2.5 : 3.5;
  const glow = ctx.createRadialGradient(feature.x, feature.y, 0, feature.x, feature.y, radius * 3);
  glow.addColorStop(0, colors.glow.replace(/[\d.]+\)\s*$/, `${0.12 + pulse})`));
  glow.addColorStop(1, colors.glow.replace(/[\d.]+\)\s*$/, "0)"));
  ctx.fillStyle = glow;
  ctx.fillRect(feature.x - radius * 3, feature.y - radius * 3, radius * 6, radius * 6);

  if (feature.kind === "hazard-zone") {
    ctx.beginPath();
    ctx.moveTo(feature.x, feature.y - radius);
    ctx.lineTo(feature.x + radius, feature.y + radius * 0.7);
    ctx.lineTo(feature.x - radius, feature.y + radius * 0.7);
    ctx.closePath();
  } else if (feature.kind === "loot-cache") {
    ctx.beginPath();
    ctx.moveTo(feature.x, feature.y - radius);
    ctx.lineTo(feature.x + radius, feature.y);
    ctx.lineTo(feature.x, feature.y + radius);
    ctx.lineTo(feature.x - radius, feature.y);
    ctx.closePath();
  } else {
    ctx.beginPath();
    ctx.arc(feature.x, feature.y, radius, 0, Math.PI * 2);
  }

  ctx.fillStyle = colors.fill;
  ctx.fill();
  ctx.restore();
}

export {
  EMBER,
  FEATURE_COLORS,
  FONT_FAMILY,
  GOLD,
  GOLD_DIM,
  GOAL_COLORS,
  GOAL_LABELS,
  RAID_VOID,
  SILVER,
};

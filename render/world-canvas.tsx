import { useEffect, useRef } from "react";

import type { WorldRenderSnapshot } from "./types";

interface WorldCanvasSurfaceProps {
  snapshot: WorldRenderSnapshot;
}

const VOID = "#060608";
const GRID_COLOR = "rgba(200, 168, 76, 0.05)";
const GRID_STEP = 32;
const NODE_RADIUS = 6;
const FONT_FAMILY = "'Inter', sans-serif";
const GOLD = "#c8a84c";
const GOLD_DIM = "rgba(200, 168, 76, 0.25)";
const SILVER_BRIGHT = "#f0ece4";
const SILVER = "rgba(224, 221, 214, 0.72)";
const OCCUPIED_FILL = "rgba(200, 168, 76, 0.12)";
const OCCUPIED_BORDER = "rgba(200, 168, 76, 0.35)";
const EMPTY_FILL = "rgba(26, 36, 64, 0.4)";
const EMPTY_BORDER = "rgba(42, 53, 85, 0.5)";
const GLOW_SHADOW = "rgba(200, 168, 76, 0.15)";

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawWorldSnapshot(canvas: HTMLCanvasElement, snapshot: WorldRenderSnapshot): void {
  const context = canvas.getContext("2d");
  if (!context) {
    return;
  }

  const dpr = window.devicePixelRatio || 1;
  const bounds = canvas.getBoundingClientRect();

  canvas.width = Math.floor(bounds.width * dpr);
  canvas.height = Math.floor(bounds.height * dpr);
  context.setTransform(dpr, 0, 0, dpr, 0, 0);
  context.clearRect(0, 0, bounds.width, bounds.height);

  context.fillStyle = VOID;
  context.fillRect(0, 0, bounds.width, bounds.height);

  context.strokeStyle = GRID_COLOR;
  context.lineWidth = 0.5;
  for (let x = 0; x < bounds.width; x += GRID_STEP) {
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x, bounds.height);
    context.stroke();
  }
  for (let y = 0; y < bounds.height; y += GRID_STEP) {
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(bounds.width, y);
    context.stroke();
  }

  snapshot.nodes.forEach((node) => {
    const isOccupied = node.isOccupied;

    context.save();
    if (isOccupied) {
      context.shadowColor = GLOW_SHADOW;
      context.shadowBlur = 20;
      context.shadowOffsetX = 0;
      context.shadowOffsetY = 4;
    }

    roundRect(context, node.x, node.y, node.width, node.height, NODE_RADIUS);
    context.fillStyle = isOccupied ? OCCUPIED_FILL : EMPTY_FILL;
    context.fill();
    context.restore();

    context.lineWidth = 1;
    roundRect(context, node.x, node.y, node.width, node.height, NODE_RADIUS);
    context.strokeStyle = isOccupied ? OCCUPIED_BORDER : EMPTY_BORDER;
    context.stroke();

    if (isOccupied) {
      const gradY = node.y;
      const gradH = node.y + 2;
      const topGlow = context.createLinearGradient(node.x, gradY, node.x + node.width, gradH);
      topGlow.addColorStop(0, "rgba(200, 168, 76, 0)");
      topGlow.addColorStop(0.5, "rgba(200, 168, 76, 0.15)");
      topGlow.addColorStop(1, "rgba(200, 168, 76, 0)");
      context.fillStyle = topGlow;
      context.fillRect(node.x + NODE_RADIUS, node.y, node.width - NODE_RADIUS * 2, 2);
    }

    context.fillStyle = isOccupied ? SILVER_BRIGHT : SILVER;
    context.font = `500 12px ${FONT_FAMILY}`;
    context.fillText(node.label, node.x + 14, node.y + 24);

    context.fillStyle = isOccupied ? GOLD : GOLD_DIM;
    context.font = `400 10px ${FONT_FAMILY}`;
    context.fillText(node.detail, node.x + 14, node.y + 42);

    if (isOccupied) {
      const dotX = node.x + node.width - 16;
      const dotY = node.y + 14;
      context.beginPath();
      context.arc(dotX, dotY, 3, 0, Math.PI * 2);
      context.fillStyle = GOLD;
      context.fill();
    }
  });
}

export function WorldCanvasSurface({ snapshot }: WorldCanvasSurfaceProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    drawWorldSnapshot(canvas, snapshot);
  }, [snapshot]);

  return (
    <div className="glass-card-inset overflow-hidden p-1">
      <canvas
        ref={canvasRef}
        className="h-[320px] w-full rounded-lg"
        aria-label={`${snapshot.title} floor plan with ${snapshot.nodes.length} rooms`}
      />
    </div>
  );
}

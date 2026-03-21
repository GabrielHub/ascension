import { useEffect, useRef } from "react";

import type { WorldRenderSnapshot } from "./types";

interface WorldCanvasSurfaceProps {
  snapshot: WorldRenderSnapshot;
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

  context.fillStyle = "#0d1118";
  context.fillRect(0, 0, bounds.width, bounds.height);

  context.strokeStyle = "rgba(248, 191, 36, 0.14)";
  for (let x = 0; x < bounds.width; x += 40) {
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x, bounds.height);
    context.stroke();
  }

  for (let y = 0; y < bounds.height; y += 40) {
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(bounds.width, y);
    context.stroke();
  }

  snapshot.nodes.forEach((node) => {
    context.fillStyle = node.fill;
    context.fillRect(node.x, node.y, node.width, node.height);

    context.strokeStyle = "rgba(255,255,255,0.18)";
    context.strokeRect(node.x, node.y, node.width, node.height);

    context.fillStyle = "#f7f5f2";
    context.font = "600 14px 'Public Sans', sans-serif";
    context.fillText(node.label, node.x + 12, node.y + 22);

    context.fillStyle = "rgba(247,245,242,0.72)";
    context.font = "500 12px 'Public Sans', sans-serif";
    context.fillText(node.detail, node.x + 12, node.y + 42);
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
    <div className="rounded-[1.75rem] border border-white/10 bg-black/25 p-4">
      <div className="flex items-center justify-between gap-4 px-2 pb-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-amber-200/70">
            Canvas world surface
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-stone-100">{snapshot.title}</h2>
          <p className="mt-1 text-sm text-stone-300">{snapshot.subtitle}</p>
        </div>
        <p className="text-right text-xs uppercase tracking-[0.25em] text-stone-500">
          {snapshot.nodes.length} scaffold nodes
        </p>
      </div>
      <canvas ref={canvasRef} className="h-[420px] w-full rounded-[1.5rem]" />
    </div>
  );
}

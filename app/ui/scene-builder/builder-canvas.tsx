/**
 * Scene builder canvas — interactive SVG surface with isometric grid,
 * shell outline, room slots, placements, and anchor markers.
 *
 * Camera model:
 *   camera.x / camera.y = world-space center of the viewport
 *   camera.zoom = scale factor (1 = natural, 2 = 2x magnification)
 *   viewBox is derived: center ± (baseSize / 2 / zoom)
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { BuildingFloorLayout } from "content/building-layouts";
import { getHqEnvironmentRenderConfig } from "lib/hq-environment-manifest";
import { projectIso } from "render/hq-world";
import type { HqPoint } from "render/types";

import type { BuilderAction, BuilderPlacement, SceneBuilderState } from "./builder-types";

const ENV = getHqEnvironmentRenderConfig();
const TILE_W = ENV.composition.tileWidth;
const TILE_H = ENV.composition.tileHeight;

const GRID_EXTEND = 8;

// Base viewport size in SVG units (what you see at zoom=1)
const BASE_W = 1400;
const BASE_H = 900;

// ── Isometric helpers ───────────────────────────────────────────────────

function isoTilePath(col: number, row: number, ox: number, oy: number): string {
  const c = projectIso(col, row, ox, oy);
  const hw = TILE_W / 2;
  const hh = TILE_H / 2;
  return `M${c.x},${c.y - hh} L${c.x + hw},${c.y} L${c.x},${c.y + hh} L${c.x - hw},${c.y} Z`;
}

function isoRectPath(
  col: number,
  row: number,
  cols: number,
  rows: number,
  ox: number,
  oy: number,
): string {
  const tl = projectIso(col, row, ox, oy);
  const tr = projectIso(col + cols, row, ox, oy);
  const br = projectIso(col + cols, row + rows, ox, oy);
  const bl = projectIso(col, row + rows, ox, oy);
  return `M${tl.x},${tl.y} L${tr.x},${tr.y} L${br.x},${br.y} L${bl.x},${bl.y} Z`;
}

// ── SVG asset loader (cached) ───────────────────────────────────────────

const svgCache = new Map<string, string>();
const svgLoadingSet = new Set<string>();
const svgListeners = new Map<string, Set<() => void>>();

function useSvgImage(url: string): string | null {
  const [dataUrl, setDataUrl] = useState<string | null>(() => svgCache.get(url) ?? null);

  useEffect(() => {
    if (svgCache.has(url)) {
      setDataUrl(svgCache.get(url)!);
      return;
    }

    const listeners = svgListeners.get(url) ?? new Set();
    const listener = () => {
      setDataUrl(svgCache.get(url) ?? null);
    };
    listeners.add(listener);
    svgListeners.set(url, listeners);

    if (!svgLoadingSet.has(url)) {
      svgLoadingSet.add(url);
      fetch(url)
        .then((r) => r.text())
        .then((svgText) => {
          const blob = new Blob([svgText], { type: "image/svg+xml" });
          const objectUrl = URL.createObjectURL(blob);
          svgCache.set(url, objectUrl);
          svgListeners.get(url)?.forEach((fn) => fn());
        })
        .catch(() => {
          svgCache.set(url, "");
          svgListeners.get(url)?.forEach((fn) => fn());
        });
    }

    return () => {
      listeners.delete(listener);
    };
  }, [url]);

  return dataUrl;
}

// ── Placement bounds helper ─────────────────────────────────────────────

function getPlacementBounds(
  p: BuilderPlacement,
  originX: number,
  originY: number,
): { x: number; y: number; w: number; h: number; anchor: HqPoint } {
  const anchor = projectIso(p.col, p.row, originX, originY);
  const ox = p.offsetX ?? 0;
  const oy = p.offsetY ?? 0;

  let x: number;
  let y: number;
  let w: number;
  let h: number;

  if (p.svgMeta) {
    const [vbMinX, vbMinY, vbW, vbH] = p.svgMeta.viewBox;
    w = vbW * p.scale;
    h = vbH * p.scale;
    x = anchor.x - (p.svgMeta.svgAnchorX - vbMinX) * p.scale + ox;
    y = anchor.y - (p.svgMeta.svgAnchorY - vbMinY) * p.scale + oy;
  } else if (p.anchorMode === "iso-center") {
    w = p.width * p.scale;
    h = p.height * p.scale;
    x = anchor.x - w / 2 + ox;
    y = anchor.y - h / 2 + oy;
  } else {
    w = p.width * p.scale;
    h = p.height * p.scale;
    x = anchor.x - w / 2 + ox;
    y = anchor.y - h + oy;
  }

  return { x, y, w, h, anchor };
}

// ── Placement sprite component ──────────────────────────────────────────

function PlacementSprite({
  placement,
  originX,
  originY,
  isSelected,
  showAnchor,
  showZIndex,
  onSelect,
  onDragStart,
}: {
  placement: BuilderPlacement;
  originX: number;
  originY: number;
  isSelected: boolean;
  showAnchor: boolean;
  showZIndex: boolean;
  onSelect: (id: string) => void;
  onDragStart: (id: string, e: React.MouseEvent) => void;
}) {
  const { x, y, w, h, anchor } = getPlacementBounds(placement, originX, originY);
  const imgSrc = useSvgImage(placement.assetUrl);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(placement.id);
    if (e.button === 0) {
      onDragStart(placement.id, e);
    }
  };

  return (
    <g onMouseDown={handleMouseDown} style={{ cursor: isSelected ? "grab" : "pointer" }}>
      {/* Hit area — slightly larger than the image for easier clicking */}
      <rect x={x - 4} y={y - 4} width={w + 8} height={h + 8} fill="transparent" stroke="none" />

      {/* Asset image */}
      {imgSrc ? (
        <image
          href={imgSrc}
          x={x}
          y={y}
          width={w}
          height={h}
          opacity={placement.opacity}
          preserveAspectRatio="none"
          style={{ pointerEvents: "none" }}
        />
      ) : (
        <rect
          x={x}
          y={y}
          width={w}
          height={h}
          fill="rgba(200,168,76,0.1)"
          stroke="rgba(200,168,76,0.3)"
          strokeWidth={1}
          strokeDasharray="4 2"
          opacity={placement.opacity}
        />
      )}

      {/* Selection highlight — anchor-centered diamond + bounding outline */}
      {isSelected && (
        <>
          {/* Bounding box */}
          <rect
            x={x - 1}
            y={y - 1}
            width={w + 2}
            height={h + 2}
            fill="none"
            stroke="rgba(200,168,76,0.4)"
            strokeWidth={1}
            strokeDasharray="6 3"
          >
            <animate
              attributeName="stroke-dashoffset"
              from="0"
              to="18"
              dur="1.5s"
              repeatCount="indefinite"
            />
          </rect>
          {/* Anchor diamond */}
          <path
            d={`M${anchor.x},${anchor.y - 8} L${anchor.x + 8},${anchor.y} L${anchor.x},${anchor.y + 8} L${anchor.x - 8},${anchor.y} Z`}
            fill="rgba(200,168,76,0.25)"
            stroke="#c8a84c"
            strokeWidth={2}
          />
          {/* Crosshair lines from anchor to edges */}
          <line
            x1={anchor.x}
            y1={y - 6}
            x2={anchor.x}
            y2={y + h + 6}
            stroke="rgba(200,168,76,0.15)"
            strokeWidth={0.5}
            strokeDasharray="3 3"
          />
          <line
            x1={x - 6}
            y1={anchor.y}
            x2={x + w + 6}
            y2={anchor.y}
            stroke="rgba(200,168,76,0.15)"
            strokeWidth={0.5}
            strokeDasharray="3 3"
          />
        </>
      )}

      {/* Anchor marker (always, when overlay enabled) */}
      {showAnchor && !isSelected && (
        <>
          <circle
            cx={anchor.x}
            cy={anchor.y}
            r={3}
            fill="rgba(200,168,76,0.5)"
            stroke="#060608"
            strokeWidth={0.5}
          />
          <line
            x1={anchor.x - 5}
            y1={anchor.y}
            x2={anchor.x + 5}
            y2={anchor.y}
            stroke="rgba(200,168,76,0.3)"
            strokeWidth={0.5}
          />
          <line
            x1={anchor.x}
            y1={anchor.y - 5}
            x2={anchor.x}
            y2={anchor.y + 5}
            stroke="rgba(200,168,76,0.3)"
            strokeWidth={0.5}
          />
        </>
      )}

      {/* Z-index label */}
      {showZIndex && (
        <text
          x={anchor.x}
          y={anchor.y - 12}
          textAnchor="middle"
          fill="#c8a84c"
          fontSize={12}
          fontFamily="Inter, sans-serif"
        >
          z:{placement.zIndex}
        </text>
      )}
    </g>
  );
}

// ── Screen ↔ world coordinate conversion ────────────────────────────────

function screenToWorld(
  clientX: number,
  clientY: number,
  svgEl: SVGSVGElement,
  camX: number,
  camY: number,
  zoom: number,
): HqPoint {
  const rect = svgEl.getBoundingClientRect();
  const normX = (clientX - rect.left) / rect.width;
  const normY = (clientY - rect.top) / rect.height;
  const vw = BASE_W / zoom;
  const vh = BASE_H / zoom;
  return {
    x: camX - vw / 2 + normX * vw,
    y: camY - vh / 2 + normY * vh,
  };
}

// Inverse-project from world-space to grid col/row (approximate)
function worldToGrid(
  wx: number,
  wy: number,
  originX: number,
  originY: number,
): { col: number; row: number } {
  const dx = wx - originX;
  const dy = wy - originY;
  const col = (dx / (TILE_W / 2) + dy / (TILE_H / 2)) / 2;
  const row = (dy / (TILE_H / 2) - dx / (TILE_W / 2)) / 2;
  return { col, row };
}

function isEditableEventTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return (
    target.isContentEditable ||
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT" ||
    target.closest("[contenteditable='true']") !== null
  );
}

// ── Main canvas component ───────────────────────────────────────────────

interface BuilderCanvasProps {
  state: SceneBuilderState;
  dispatch: React.Dispatch<BuilderAction>;
  layout: BuildingFloorLayout | undefined;
}

type InteractionMode = "idle" | "panning" | "dragging";

export function BuilderCanvas({ state, dispatch, layout }: BuilderCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const cameraRef = useRef(state.camera);
  cameraRef.current = state.camera;
  const [mode, setMode] = useState<InteractionMode>("idle");
  const interactionRef = useRef({
    startClientX: 0,
    startClientY: 0,
    startCamX: 0,
    startCamY: 0,
    dragPlacementId: "",
    dragStartCol: 0,
    dragStartRow: 0,
  });

  // World origin — center of the SVG space
  const ORIGIN_X = 600;
  const ORIGIN_Y = 200;

  const shell = layout?.shell;
  const gridMinCol = (shell?.col ?? 0) - GRID_EXTEND;
  const gridMaxCol = (shell?.col ?? 0) + (shell?.cols ?? 10) + GRID_EXTEND;
  const gridMinRow = (shell?.row ?? 0) - GRID_EXTEND;
  const gridMaxRow = (shell?.row ?? 0) + (shell?.rows ?? 18) + GRID_EXTEND;

  // ── Derive viewBox from camera state ──────────────────────────────

  const vw = BASE_W / state.camera.zoom;
  const vh = BASE_H / state.camera.zoom;
  const viewBox = `${state.camera.x - vw / 2} ${state.camera.y - vh / 2} ${vw} ${vh}`;

  // ── Zoom (scroll wheel, anchored to cursor) ───────────────────────

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const handler = (e: WheelEvent) => {
      e.preventDefault();

      const cam = cameraRef.current;
      const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
      const newZoom = Math.max(0.15, Math.min(5, cam.zoom * zoomFactor));

      const worldBefore = screenToWorld(e.clientX, e.clientY, svg, cam.x, cam.y, cam.zoom);
      const rect = svg.getBoundingClientRect();
      const normX = (e.clientX - rect.left) / rect.width;
      const normY = (e.clientY - rect.top) / rect.height;
      const newVw = BASE_W / newZoom;
      const newVh = BASE_H / newZoom;
      const newCamX = worldBefore.x - (normX - 0.5) * newVw;
      const newCamY = worldBefore.y - (normY - 0.5) * newVh;

      dispatch({ type: "SET_CAMERA", camera: { x: newCamX, y: newCamY, zoom: newZoom } });
    };

    svg.addEventListener("wheel", handler, { passive: false });
    return () => svg.removeEventListener("wheel", handler);
  }, [dispatch]);

  // ── Pan (right-click drag, middle-click drag, or space+left drag) ─

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 2 || e.button === 1 || (e.button === 0 && (e.altKey || e.shiftKey))) {
      e.preventDefault();
      const cam = cameraRef.current;
      setMode("panning");
      interactionRef.current = {
        ...interactionRef.current,
        startClientX: e.clientX,
        startClientY: e.clientY,
        startCamX: cam.x,
        startCamY: cam.y,
      };
    }
  }, []);

  // ── Drag-to-move a placement ──────────────────────────────────────

  const handleDragStart = useCallback(
    (id: string, e: React.MouseEvent) => {
      const placement = state.placements.find((p) => p.id === id);
      if (!placement) return;

      setMode("dragging");
      interactionRef.current = {
        ...interactionRef.current,
        startClientX: e.clientX,
        startClientY: e.clientY,
        dragPlacementId: id,
        dragStartCol: placement.col,
        dragStartRow: placement.row,
      };
    },
    [state.placements],
  );

  // ── Mouse move — shared for pan and drag ──────────────────────────

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const svg = svgRef.current;
      if (!svg) return;

      if (mode === "panning") {
        const cam = cameraRef.current;
        const rect = svg.getBoundingClientRect();
        const scale = BASE_W / cam.zoom / rect.width;
        const dx = (e.clientX - interactionRef.current.startClientX) * scale;
        const dy = (e.clientY - interactionRef.current.startClientY) * scale;
        dispatch({
          type: "SET_CAMERA",
          camera: {
            x: interactionRef.current.startCamX - dx,
            y: interactionRef.current.startCamY - dy,
          },
        });
      } else if (mode === "dragging") {
        const cam = cameraRef.current;
        const startWorld = screenToWorld(
          interactionRef.current.startClientX,
          interactionRef.current.startClientY,
          svg,
          cam.x,
          cam.y,
          cam.zoom,
        );
        const curWorld = screenToWorld(e.clientX, e.clientY, svg, cam.x, cam.y, cam.zoom);
        const startGrid = worldToGrid(startWorld.x, startWorld.y, ORIGIN_X, ORIGIN_Y);
        const curGrid = worldToGrid(curWorld.x, curWorld.y, ORIGIN_X, ORIGIN_Y);
        const dCol = curGrid.col - startGrid.col;
        const dRow = curGrid.row - startGrid.row;

        const snappedCol = Math.round((interactionRef.current.dragStartCol + dCol) * 2) / 2;
        const snappedRow = Math.round((interactionRef.current.dragStartRow + dRow) * 2) / 2;

        dispatch({
          type: "MOVE_PLACEMENT",
          id: interactionRef.current.dragPlacementId,
          col: snappedCol,
          row: snappedRow,
        });
      }
    },
    [mode, dispatch],
  );

  const handleMouseUp = useCallback(() => {
    setMode("idle");
  }, []);

  // Prevent context menu on right-click (we use it for pan)
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
  }, []);

  // ── Keyboard handling for nudge ───────────────────────────────────

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (isEditableEventTarget(e.target)) {
        return;
      }

      if (!state.selectedPlacementId) return;
      const step = e.shiftKey ? 0.25 : 1;

      switch (e.key) {
        case "ArrowLeft":
          e.preventDefault();
          dispatch({
            type: "NUDGE_PLACEMENT",
            id: state.selectedPlacementId,
            dCol: -step,
            dRow: 0,
          });
          break;
        case "ArrowRight":
          e.preventDefault();
          dispatch({ type: "NUDGE_PLACEMENT", id: state.selectedPlacementId, dCol: step, dRow: 0 });
          break;
        case "ArrowUp":
          e.preventDefault();
          dispatch({
            type: "NUDGE_PLACEMENT",
            id: state.selectedPlacementId,
            dCol: 0,
            dRow: -step,
          });
          break;
        case "ArrowDown":
          e.preventDefault();
          dispatch({ type: "NUDGE_PLACEMENT", id: state.selectedPlacementId, dCol: 0, dRow: step });
          break;
        case "Delete":
        case "Backspace":
          e.preventDefault();
          dispatch({ type: "DELETE_PLACEMENT", id: state.selectedPlacementId });
          break;
        case "d":
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            dispatch({ type: "DUPLICATE_PLACEMENT", id: state.selectedPlacementId });
          }
          break;
        case "Escape":
          dispatch({ type: "SELECT_PLACEMENT", id: null });
          break;
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [state.selectedPlacementId, dispatch]);

  // ── Click on empty canvas = deselect ──────────────────────────────

  const handleCanvasClick = useCallback(
    (_e: React.MouseEvent) => {
      // Only deselect if we weren't panning/dragging
      if (mode === "idle") {
        dispatch({ type: "SELECT_PLACEMENT", id: null });
      }
    },
    [mode, dispatch],
  );

  // ── Rendering ─────────────────────────────────────────────────────

  const sortedPlacements = useMemo(
    () => [...state.placements].sort((a, b) => a.zIndex - b.zIndex),
    [state.placements],
  );

  const cursorStyle = mode === "idle" ? "default" : "grabbing";

  return (
    <svg
      ref={svgRef}
      viewBox={viewBox}
      className="h-full w-full select-none"
      style={{ cursor: cursorStyle, background: "#060608" }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onClick={handleCanvasClick}
      onContextMenu={handleContextMenu}
    >
      {/* Grid tiles */}
      {state.overlays.grid &&
        Array.from({ length: gridMaxCol - gridMinCol }, (_, ci) =>
          Array.from({ length: gridMaxRow - gridMinRow }, (_, ri) => {
            const col = gridMinCol + ci;
            const row = gridMinRow + ri;
            return (
              <path
                key={`g-${col}-${row}`}
                d={isoTilePath(col, row, ORIGIN_X, ORIGIN_Y)}
                fill="none"
                stroke="rgba(200,168,76,0.06)"
                strokeWidth={0.5}
              />
            );
          }),
        )}

      {/* Building shell outline */}
      {state.overlays.shell && shell && (
        <path
          d={isoRectPath(shell.col, shell.row, shell.cols, shell.rows, ORIGIN_X, ORIGIN_Y)}
          fill="rgba(200,168,76,0.03)"
          stroke="rgba(200,168,76,0.35)"
          strokeWidth={2}
          strokeDasharray="8 4"
        />
      )}

      {/* Room slot overlays */}
      {state.overlays.rooms &&
        layout?.slots.map((slot) => {
          const center = projectIso(
            slot.col + slot.cols / 2,
            slot.row + slot.rows / 2,
            ORIGIN_X,
            ORIGIN_Y,
          );
          return (
            <g key={slot.slotId}>
              <path
                d={isoRectPath(slot.col, slot.row, slot.cols, slot.rows, ORIGIN_X, ORIGIN_Y)}
                fill="rgba(26,36,64,0.25)"
                stroke="rgba(110,184,224,0.3)"
                strokeWidth={1}
              />
              <text
                x={center.x}
                y={center.y}
                textAnchor="middle"
                dominantBaseline="central"
                fill="rgba(110,184,224,0.5)"
                fontSize={12}
                fontFamily="Inter, sans-serif"
              >
                {slot.slotId.replace("slot/", "")}
              </text>
            </g>
          );
        })}

      {/* Perimeter indicator */}
      {state.overlays.perimeter && shell && (
        <path
          d={isoRectPath(
            shell.col - 2,
            shell.row - 2,
            shell.cols + 4,
            shell.rows + 4,
            ORIGIN_X,
            ORIGIN_Y,
          )}
          fill="none"
          stroke="rgba(224,221,214,0.12)"
          strokeWidth={1}
          strokeDasharray="4 4"
        />
      )}

      {/* Placements (sorted by z-index) */}
      {sortedPlacements.map((p) => (
        <PlacementSprite
          key={p.id}
          placement={p}
          originX={ORIGIN_X}
          originY={ORIGIN_Y}
          isSelected={state.selectedPlacementId === p.id}
          showAnchor={state.overlays.anchors}
          showZIndex={state.overlays.zIndex}
          onSelect={(id) => dispatch({ type: "SELECT_PLACEMENT", id })}
          onDragStart={handleDragStart}
        />
      ))}

      {/* Grid coordinate labels (sparse, at shell corners) */}
      {state.overlays.grid && shell && (
        <>
          {[
            { col: shell.col, row: shell.row },
            { col: shell.col + shell.cols, row: shell.row },
            { col: shell.col, row: shell.row + shell.rows },
            { col: shell.col + shell.cols, row: shell.row + shell.rows },
          ].map(({ col, row }) => {
            const p = projectIso(col, row, ORIGIN_X, ORIGIN_Y);
            return (
              <text
                key={`coord-${col}-${row}`}
                x={p.x}
                y={p.y + 14}
                textAnchor="middle"
                fill="rgba(200,168,76,0.3)"
                fontSize={12}
                fontFamily="Inter, sans-serif"
              >
                {col},{row}
              </text>
            );
          })}
        </>
      )}
    </svg>
  );
}

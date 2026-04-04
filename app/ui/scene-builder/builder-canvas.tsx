/**
 * Scene builder canvas — interactive SVG surface with isometric grid,
 * shell outline, room slots, placements, and anchor markers.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  getHqBackdropManifestForBuilding,
  getHqEnvironmentRenderConfig,
} from "lib/hq-environment-manifest";
import { BACKDROP_BASE_FILLS } from "lib/hq-time-phase";
import type { HqTimeOfDayPhase } from "lib/hq-time-phase";
import { projectIso } from "render/hq-world";
import type { HqPoint } from "render/types";

import type {
  BuilderAction,
  BuilderPlacement,
  BuilderRoomSlotState,
  BuilderShell,
  SceneBuilderState,
} from "./builder-types";
import {
  BUILDER_PERIMETER_FILLS,
  BUILDER_PERIMETER_STROKES,
  buildBuilderPreviewCenterLaneSets,
  buildBuilderPreviewPerimeterKindMap,
  buildBuilderPreviewPerimeterTiles,
} from "./builder-preview-context";

const ENV = getHqEnvironmentRenderConfig();
const TILE_W = ENV.composition.tileWidth;
const TILE_H = ENV.composition.tileHeight;

const GRID_EXTEND = 8;
const BASE_W = 1400;
const BASE_H = 900;

const PHASE_SKY_STOPS: Readonly<
  Record<
    HqTimeOfDayPhase,
    readonly [
      { offset: string; color: string },
      { offset: string; color: string },
      { offset: string; color: string },
    ]
  >
> = {
  sunrise: [
    { offset: "0%", color: "rgba(241, 154, 93, 0.35)" },
    { offset: "55%", color: "rgba(101, 77, 88, 0.18)" },
    { offset: "100%", color: "rgba(24, 20, 16, 0)" },
  ],
  day: [
    { offset: "0%", color: "rgba(164, 190, 214, 0.16)" },
    { offset: "50%", color: "rgba(90, 113, 136, 0.08)" },
    { offset: "100%", color: "rgba(36, 36, 46, 0)" },
  ],
  sunset: [
    { offset: "0%", color: "rgba(255, 122, 76, 0.34)" },
    { offset: "55%", color: "rgba(122, 63, 54, 0.18)" },
    { offset: "100%", color: "rgba(22, 16, 16, 0)" },
  ],
  night: [
    { offset: "0%", color: "rgba(46, 70, 130, 0.30)" },
    { offset: "55%", color: "rgba(18, 26, 52, 0.16)" },
    { offset: "100%", color: "rgba(10, 10, 14, 0)" },
  ],
};

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

function isoCellPoints(
  col: number,
  row: number,
  ox: number,
  oy: number,
): readonly [HqPoint, HqPoint, HqPoint, HqPoint] {
  return [
    projectIso(col, row, ox, oy),
    projectIso(col + 1, row, ox, oy),
    projectIso(col + 1, row + 1, ox, oy),
    projectIso(col, row + 1, ox, oy),
  ];
}

function getIsoRectBounds(
  col: number,
  row: number,
  cols: number,
  rows: number,
  ox: number,
  oy: number,
): { minX: number; maxX: number; minY: number; maxY: number } {
  const points = [
    projectIso(col, row, ox, oy),
    projectIso(col + cols, row, ox, oy),
    projectIso(col + cols, row + rows, ox, oy),
    projectIso(col, row + rows, ox, oy),
  ];

  return {
    minX: Math.min(...points.map((point) => point.x)),
    maxX: Math.max(...points.map((point) => point.x)),
    minY: Math.min(...points.map((point) => point.y)),
    maxY: Math.max(...points.map((point) => point.y)),
  };
}

const svgCache = new Map<string, string>();
const svgLoadingSet = new Set<string>();
const svgListeners = new Map<string, Set<() => void>>();

function useSvgImage(url: string): string | null {
  const [dataUrl, setDataUrl] = useState<string | null>(() => svgCache.get(url) ?? null);

  useEffect(() => {
    if (svgCache.has(url)) {
      setDataUrl(svgCache.get(url) ?? null);
      return;
    }

    const listeners = svgListeners.get(url) ?? new Set();
    const listener = () => setDataUrl(svgCache.get(url) ?? null);
    listeners.add(listener);
    svgListeners.set(url, listeners);

    if (!svgLoadingSet.has(url)) {
      svgLoadingSet.add(url);
      fetch(url)
        .then((response) => response.text())
        .then((svgText) => {
          const blob = new Blob([svgText], { type: "image/svg+xml" });
          svgCache.set(url, URL.createObjectURL(blob));
          svgListeners.get(url)?.forEach((notify) => notify());
        })
        .catch(() => {
          svgCache.set(url, "");
          svgListeners.get(url)?.forEach((notify) => notify());
        });
    }

    return () => {
      listeners.delete(listener);
    };
  }, [url]);

  return dataUrl;
}

function getPlacementBounds(
  placement: BuilderPlacement,
  originX: number,
  originY: number,
): { x: number; y: number; w: number; h: number; anchor: HqPoint } {
  const anchor = projectIso(placement.col, placement.row, originX, originY);
  const ox = placement.offsetX ?? 0;
  const oy = placement.offsetY ?? 0;

  let x: number;
  let y: number;
  let w: number;
  let h: number;

  if (placement.svgMeta) {
    const [vbMinX, vbMinY, vbW, vbH] = placement.svgMeta.viewBox;
    w = vbW * placement.scale;
    h = vbH * placement.scale;
    x = anchor.x - (placement.svgMeta.svgAnchorX - vbMinX) * placement.scale + ox;
    y = anchor.y - (placement.svgMeta.svgAnchorY - vbMinY) * placement.scale + oy;
  } else if (placement.anchorMode === "iso-center") {
    w = placement.width * placement.scale;
    h = placement.height * placement.scale;
    x = anchor.x - w / 2 + ox;
    y = anchor.y - h / 2 + oy;
  } else {
    w = placement.width * placement.scale;
    h = placement.height * placement.scale;
    x = anchor.x - w / 2 + ox;
    y = anchor.y - h + oy;
  }

  return { x, y, w, h, anchor };
}

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

function PlacementSprite({
  placement,
  originX,
  originY,
  isSelected,
  showAnchor,
  showZIndex,
  canDrag,
  onSelect,
  onDragStart,
}: {
  placement: BuilderPlacement;
  originX: number;
  originY: number;
  isSelected: boolean;
  showAnchor: boolean;
  showZIndex: boolean;
  canDrag: boolean;
  onSelect: (id: string) => void;
  onDragStart: (id: string, event: React.MouseEvent) => void;
}) {
  const { x, y, w, h, anchor } = getPlacementBounds(placement, originX, originY);
  const imgSrc = useSvgImage(placement.assetUrl);

  return (
    <g
      onMouseDown={(event) => {
        event.stopPropagation();
        onSelect(placement.id);
        if (canDrag && event.button === 0) {
          onDragStart(placement.id, event);
        }
      }}
      onClick={(event) => event.stopPropagation()}
      style={{ cursor: canDrag ? (isSelected ? "grab" : "pointer") : "default" }}
    >
      <rect x={x - 4} y={y - 4} width={w + 8} height={h + 8} fill="transparent" stroke="none" />

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

      {isSelected && (
        <>
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
          <path
            d={`M${anchor.x},${anchor.y - 8} L${anchor.x + 8},${anchor.y} L${anchor.x},${anchor.y + 8} L${anchor.x - 8},${anchor.y} Z`}
            fill="rgba(200,168,76,0.25)"
            stroke="#c8a84c"
            strokeWidth={2}
          />
        </>
      )}

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

function SlotOverlay({
  slot,
  originX,
  originY,
  isSelected,
  canDrag,
  onSelect,
  onDragStart,
}: {
  slot: BuilderRoomSlotState;
  originX: number;
  originY: number;
  isSelected: boolean;
  canDrag: boolean;
  onSelect: (id: string) => void;
  onDragStart: (id: string, event: React.MouseEvent) => void;
}) {
  const center = projectIso(slot.col + slot.cols / 2, slot.row + slot.rows / 2, originX, originY);

  return (
    <g
      onMouseDown={(event) => {
        event.stopPropagation();
        onSelect(slot.slotId);
        if (canDrag && event.button === 0) {
          onDragStart(slot.slotId, event);
        }
      }}
      onClick={(event) => event.stopPropagation()}
      style={{ cursor: canDrag ? (isSelected ? "grab" : "pointer") : "default" }}
    >
      <path
        d={isoRectPath(slot.col, slot.row, slot.cols, slot.rows, originX, originY)}
        fill={isSelected ? "rgba(110,184,224,0.25)" : "rgba(26,36,64,0.25)"}
        stroke={isSelected ? "rgba(110,184,224,0.9)" : "rgba(110,184,224,0.3)"}
        strokeWidth={isSelected ? 2 : 1}
      />
      <text
        x={center.x}
        y={center.y}
        textAnchor="middle"
        dominantBaseline="central"
        fill={isSelected ? "rgba(221,242,255,0.85)" : "rgba(110,184,224,0.5)"}
        fontSize={12}
        fontFamily="Inter, sans-serif"
      >
        {slot.slotId.replace("slot/", "")}
      </text>
    </g>
  );
}

function ShellOverlay({
  shell,
  originX,
  originY,
  isSelected,
  canDrag,
  onSelect,
  onDragStart,
}: {
  shell: BuilderShell;
  originX: number;
  originY: number;
  isSelected: boolean;
  canDrag: boolean;
  onSelect: () => void;
  onDragStart: (event: React.MouseEvent) => void;
}) {
  return (
    <path
      d={isoRectPath(shell.col, shell.row, shell.cols, shell.rows, originX, originY)}
      fill={isSelected ? "rgba(200,168,76,0.08)" : "rgba(200,168,76,0.03)"}
      stroke={isSelected ? "rgba(200,168,76,0.8)" : "rgba(200,168,76,0.35)"}
      strokeWidth={isSelected ? 3 : 2}
      strokeDasharray="8 4"
      style={{ cursor: canDrag ? (isSelected ? "grab" : "pointer") : "default" }}
      onMouseDown={(event) => {
        event.stopPropagation();
        onSelect();
        if (canDrag && event.button === 0) {
          onDragStart(event);
        }
      }}
      onClick={(event) => event.stopPropagation()}
    />
  );
}

type InteractionMode =
  | "idle"
  | "panning"
  | "dragging-placement"
  | "dragging-slot"
  | "dragging-shell";

interface BuilderCanvasProps {
  state: SceneBuilderState;
  dispatch: React.Dispatch<BuilderAction>;
}

export function BuilderCanvas({ state, dispatch }: BuilderCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const cameraRef = useRef(state.camera);
  cameraRef.current = state.camera;

  const [mode, setMode] = useState<InteractionMode>("idle");
  const interactionRef = useRef({
    startClientX: 0,
    startClientY: 0,
    startCamX: 0,
    startCamY: 0,
    dragTargetId: "",
    dragStartCol: 0,
    dragStartRow: 0,
  });

  const originX = 600;
  const originY = 200;
  const shell = state.shell;

  const gridMinCol = (shell?.col ?? 0) - GRID_EXTEND;
  const gridMaxCol = (shell?.col ?? 0) + (shell?.cols ?? 10) + GRID_EXTEND;
  const gridMinRow = (shell?.row ?? 0) - GRID_EXTEND;
  const gridMaxRow = (shell?.row ?? 0) + (shell?.rows ?? 18) + GRID_EXTEND;

  const vw = BASE_W / state.camera.zoom;
  const vh = BASE_H / state.camera.zoom;
  const viewX = state.camera.x - vw / 2;
  const viewY = state.camera.y - vh / 2;
  const viewBox = `${viewX} ${viewY} ${vw} ${vh}`;
  const previewBackdrop = getHqBackdropManifestForBuilding(state.buildingId)?.phases[
    state.previewPhase
  ];
  const previewPerimeterTiles = useMemo(
    () => buildBuilderPreviewPerimeterTiles(shell, state.buildingId),
    [shell, state.buildingId],
  );
  const previewPerimeterKindMap = useMemo(
    () => buildBuilderPreviewPerimeterKindMap(previewPerimeterTiles),
    [previewPerimeterTiles],
  );
  const previewCenterLanes = useMemo(
    () => buildBuilderPreviewCenterLaneSets(previewPerimeterTiles),
    [previewPerimeterTiles],
  );
  const shellBounds = useMemo(
    () =>
      shell
        ? getIsoRectBounds(shell.col, shell.row, shell.cols, shell.rows, originX, originY)
        : null,
    [shell?.col, shell?.row, shell?.cols, shell?.rows, originX, originY],
  );
  const skyStops = PHASE_SKY_STOPS[state.previewPhase];
  const skyGradientId = `builder-sky-${state.previewPhase}`;
  const shellGlowId = `builder-shell-glow-${state.previewPhase}`;

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) {
      return;
    }

    const handler = (event: WheelEvent) => {
      event.preventDefault();

      const cam = cameraRef.current;
      const zoomFactor = event.deltaY > 0 ? 0.9 : 1.1;
      const newZoom = Math.max(0.15, Math.min(5, cam.zoom * zoomFactor));

      const worldBefore = screenToWorld(event.clientX, event.clientY, svg, cam.x, cam.y, cam.zoom);
      const rect = svg.getBoundingClientRect();
      const normX = (event.clientX - rect.left) / rect.width;
      const normY = (event.clientY - rect.top) / rect.height;
      const newVw = BASE_W / newZoom;
      const newVh = BASE_H / newZoom;

      dispatch({
        type: "SET_CAMERA",
        camera: {
          x: worldBefore.x - (normX - 0.5) * newVw,
          y: worldBefore.y - (normY - 0.5) * newVh,
          zoom: newZoom,
        },
      });
    };

    svg.addEventListener("wheel", handler, { passive: false });
    return () => svg.removeEventListener("wheel", handler);
  }, [dispatch]);

  const beginDrag = useCallback(
    (
      interactionMode: InteractionMode,
      id: string,
      col: number,
      row: number,
      event: React.MouseEvent,
    ) => {
      setMode(interactionMode);
      interactionRef.current = {
        ...interactionRef.current,
        startClientX: event.clientX,
        startClientY: event.clientY,
        dragTargetId: id,
        dragStartCol: col,
        dragStartRow: row,
      };
    },
    [],
  );

  const handleMouseDown = useCallback((event: React.MouseEvent) => {
    if (
      event.button === 2 ||
      event.button === 1 ||
      (event.button === 0 && (event.altKey || event.shiftKey))
    ) {
      event.preventDefault();
      const cam = cameraRef.current;
      setMode("panning");
      interactionRef.current = {
        ...interactionRef.current,
        startClientX: event.clientX,
        startClientY: event.clientY,
        startCamX: cam.x,
        startCamY: cam.y,
      };
    }
  }, []);

  const handleMouseMove = useCallback(
    (event: React.MouseEvent) => {
      const svg = svgRef.current;
      if (!svg) {
        return;
      }

      if (mode === "panning") {
        const cam = cameraRef.current;
        const rect = svg.getBoundingClientRect();
        const scale = BASE_W / cam.zoom / rect.width;
        const dx = (event.clientX - interactionRef.current.startClientX) * scale;
        const dy = (event.clientY - interactionRef.current.startClientY) * scale;
        dispatch({
          type: "SET_CAMERA",
          camera: {
            x: interactionRef.current.startCamX - dx,
            y: interactionRef.current.startCamY - dy,
          },
        });
        return;
      }

      if (mode === "idle") {
        return;
      }

      const cam = cameraRef.current;
      const startWorld = screenToWorld(
        interactionRef.current.startClientX,
        interactionRef.current.startClientY,
        svg,
        cam.x,
        cam.y,
        cam.zoom,
      );
      const currentWorld = screenToWorld(event.clientX, event.clientY, svg, cam.x, cam.y, cam.zoom);
      const startGrid = worldToGrid(startWorld.x, startWorld.y, originX, originY);
      const currentGrid = worldToGrid(currentWorld.x, currentWorld.y, originX, originY);

      const dCol = Math.round((currentGrid.col - startGrid.col) * 2) / 2;
      const dRow = Math.round((currentGrid.row - startGrid.row) * 2) / 2;
      const nextCol = interactionRef.current.dragStartCol + dCol;
      const nextRow = interactionRef.current.dragStartRow + dRow;

      if (mode === "dragging-placement") {
        dispatch({
          type: "MOVE_PLACEMENT",
          id: interactionRef.current.dragTargetId,
          col: nextCol,
          row: nextRow,
        });
      } else if (mode === "dragging-slot") {
        dispatch({
          type: "MOVE_SLOT",
          id: interactionRef.current.dragTargetId,
          col: nextCol,
          row: nextRow,
        });
      } else if (mode === "dragging-shell") {
        dispatch({ type: "MOVE_SHELL", col: nextCol, row: nextRow });
      }
    },
    [dispatch, mode],
  );

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (isEditableEventTarget(event.target)) {
        return;
      }

      const step = event.shiftKey ? 0.25 : 1;

      if (state.editorMode === "scene" && state.selectedPlacementId) {
        switch (event.key) {
          case "ArrowLeft":
            event.preventDefault();
            dispatch({
              type: "NUDGE_PLACEMENT",
              id: state.selectedPlacementId,
              dCol: -step,
              dRow: 0,
            });
            break;
          case "ArrowRight":
            event.preventDefault();
            dispatch({
              type: "NUDGE_PLACEMENT",
              id: state.selectedPlacementId,
              dCol: step,
              dRow: 0,
            });
            break;
          case "ArrowUp":
            event.preventDefault();
            dispatch({
              type: "NUDGE_PLACEMENT",
              id: state.selectedPlacementId,
              dCol: 0,
              dRow: -step,
            });
            break;
          case "ArrowDown":
            event.preventDefault();
            dispatch({
              type: "NUDGE_PLACEMENT",
              id: state.selectedPlacementId,
              dCol: 0,
              dRow: step,
            });
            break;
          case "Delete":
          case "Backspace":
            event.preventDefault();
            dispatch({ type: "DELETE_PLACEMENT", id: state.selectedPlacementId });
            break;
          case "d":
            if (event.ctrlKey || event.metaKey) {
              event.preventDefault();
              dispatch({ type: "DUPLICATE_PLACEMENT", id: state.selectedPlacementId });
            }
            break;
          case "Escape":
            dispatch({ type: "SELECT_PLACEMENT", id: null });
            break;
        }
      } else if (state.editorMode === "layout") {
        const arrowDirs: Record<string, [number, number]> = {
          ArrowLeft: [-1, 0],
          ArrowRight: [1, 0],
          ArrowUp: [0, -1],
          ArrowDown: [0, 1],
        };
        const dir = arrowDirs[event.key];

        if (dir) {
          event.preventDefault();
          const [dCol, dRow] = [dir[0] * step, dir[1] * step];
          if (state.selectedSlotId) {
            dispatch({ type: "NUDGE_SLOT", id: state.selectedSlotId, dCol, dRow });
          } else if (state.isShellSelected) {
            dispatch({ type: "NUDGE_SHELL", dCol, dRow });
          }
        } else if ((event.key === "Delete" || event.key === "Backspace") && state.selectedSlotId) {
          event.preventDefault();
          dispatch({ type: "DELETE_SLOT", id: state.selectedSlotId });
        } else if (event.key === "d" && (event.ctrlKey || event.metaKey) && state.selectedSlotId) {
          event.preventDefault();
          dispatch({ type: "DUPLICATE_SLOT", id: state.selectedSlotId });
        } else if (event.key === "Escape") {
          dispatch({ type: "SELECT_SLOT", id: null });
        }
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [
    dispatch,
    state.editorMode,
    state.isShellSelected,
    state.selectedPlacementId,
    state.selectedSlotId,
  ]);

  const handleCanvasClick = useCallback(() => {
    if (mode === "idle") {
      dispatch({ type: "SELECT_PLACEMENT", id: null });
    }
  }, [dispatch, mode]);

  const sortedPlacements = useMemo(
    () => [...state.placements].sort((left, right) => left.zIndex - right.zIndex),
    [state.placements],
  );

  return (
    <svg
      ref={svgRef}
      viewBox={viewBox}
      className="h-full w-full select-none"
      style={{ cursor: mode === "idle" ? "default" : "grabbing", background: "#060608" }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={() => setMode("idle")}
      onMouseLeave={() => setMode("idle")}
      onClick={handleCanvasClick}
      onContextMenu={(event) => event.preventDefault()}
    >
      <defs>
        <linearGradient id={skyGradientId} x1={viewX} y1={viewY} x2={viewX} y2={viewY + vh}>
          {skyStops.map((stop) => (
            <stop key={stop.offset} offset={stop.offset} stopColor={stop.color} />
          ))}
        </linearGradient>
        {shellBounds && (
          <radialGradient
            id={shellGlowId}
            cx={(shellBounds.minX + shellBounds.maxX) / 2}
            cy={shellBounds.minY - 12}
            r={Math.max(shellBounds.maxX - shellBounds.minX, shellBounds.maxY - shellBounds.minY)}
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="rgba(200, 168, 76, 0.12)" />
            <stop offset="55%" stopColor="rgba(200, 168, 76, 0.04)" />
            <stop offset="100%" stopColor="rgba(200, 168, 76, 0)" />
          </radialGradient>
        )}
      </defs>

      <rect
        x={viewX}
        y={viewY}
        width={vw}
        height={vh}
        fill={BACKDROP_BASE_FILLS[state.previewPhase]}
      />
      <rect x={viewX} y={viewY} width={vw} height={vh} fill={`url(#${skyGradientId})`} />

      {previewPerimeterTiles.map((tile) => {
        const points = isoCellPoints(tile.col, tile.row, originX, originY);
        const centerX = (points[0].x + points[2].x) / 2;
        const centerY = (points[0].y + points[2].y) / 2;
        const belowKind = previewPerimeterKindMap.get(`${tile.col},${tile.row + 1}`);
        const aboveKind = previewPerimeterKindMap.get(`${tile.col},${tile.row - 1}`);
        const tileKey = `${tile.col},${tile.row}`;
        const isRowCenter = previewCenterLanes.rowSet.has(tileKey);
        const isColCenter = previewCenterLanes.colSet.has(tileKey);

        return (
          <g key={`perimeter-${tile.col}-${tile.row}`} opacity={0.92}>
            <path
              d={`M${points[0].x},${points[0].y} L${points[1].x},${points[1].y} L${points[2].x},${points[2].y} L${points[3].x},${points[3].y} Z`}
              fill={BUILDER_PERIMETER_FILLS[state.previewPhase][tile.kind]}
              stroke={BUILDER_PERIMETER_STROKES[state.previewPhase][tile.kind]}
              strokeWidth={0.75}
            />

            {tile.kind === "street" && isRowCenter && (
              <>
                <line
                  x1={centerX - 12}
                  y1={centerY - 6 - 1.5}
                  x2={centerX + 12}
                  y2={centerY + 6 - 1.5}
                  stroke="rgba(200, 180, 80, 0.22)"
                  strokeWidth={1}
                />
                <line
                  x1={centerX - 12}
                  y1={centerY - 6 + 1.5}
                  x2={centerX + 12}
                  y2={centerY + 6 + 1.5}
                  stroke="rgba(200, 180, 80, 0.22)"
                  strokeWidth={1}
                />
              </>
            )}

            {tile.kind === "street" && isColCenter && (
              <>
                <line
                  x1={centerX - 12}
                  y1={centerY + 6 - 1.5}
                  x2={centerX + 12}
                  y2={centerY - 6 - 1.5}
                  stroke="rgba(200, 180, 80, 0.22)"
                  strokeWidth={1}
                />
                <line
                  x1={centerX - 12}
                  y1={centerY + 6 + 1.5}
                  x2={centerX + 12}
                  y2={centerY - 6 + 1.5}
                  stroke="rgba(200, 180, 80, 0.22)"
                  strokeWidth={1}
                />
              </>
            )}

            {tile.kind === "sidewalk" && belowKind === "street" && (
              <line
                x1={points[3].x}
                y1={points[3].y}
                x2={points[2].x}
                y2={points[2].y}
                stroke="rgba(120, 108, 80, 0.45)"
                strokeWidth={1.5}
              />
            )}

            {tile.kind === "sidewalk" && aboveKind === "street" && (
              <line
                x1={points[0].x}
                y1={points[0].y}
                x2={points[1].x}
                y2={points[1].y}
                stroke="rgba(120, 108, 80, 0.35)"
                strokeWidth={1.25}
              />
            )}
          </g>
        );
      })}

      {shellBounds && (
        <>
          <rect
            x={shellBounds.minX - TILE_W}
            y={shellBounds.minY - TILE_H * 1.5}
            width={shellBounds.maxX - shellBounds.minX + TILE_W * 2}
            height={shellBounds.maxY - shellBounds.minY + TILE_H * 2}
            fill={`url(#${shellGlowId})`}
            opacity={
              state.previewPhase === "night" ? 0.9 : state.previewPhase === "sunset" ? 0.65 : 0.35
            }
          />
        </>
      )}

      {state.overlays.grid &&
        Array.from({ length: gridMaxCol - gridMinCol }, (_, ci) =>
          Array.from({ length: gridMaxRow - gridMinRow }, (_, ri) => {
            const col = gridMinCol + ci;
            const row = gridMinRow + ri;
            return (
              <path
                key={`g-${col}-${row}`}
                d={isoTilePath(col, row, originX, originY)}
                fill="none"
                stroke="rgba(200,168,76,0.06)"
                strokeWidth={0.5}
              />
            );
          }),
        )}

      {state.overlays.perimeter && shell && (
        <path
          d={isoRectPath(
            shell.col - 2,
            shell.row - 2,
            shell.cols + 4,
            shell.rows + 4,
            originX,
            originY,
          )}
          fill="none"
          stroke="rgba(224,221,214,0.12)"
          strokeWidth={1}
          strokeDasharray="4 4"
        />
      )}

      {state.overlays.shell && shell && (
        <ShellOverlay
          shell={shell}
          originX={originX}
          originY={originY}
          isSelected={state.isShellSelected}
          canDrag={state.editorMode === "layout"}
          onSelect={() => dispatch({ type: "SELECT_SHELL" })}
          onDragStart={(event) => beginDrag("dragging-shell", "", shell.col, shell.row, event)}
        />
      )}

      {state.overlays.rooms &&
        state.slots.map((slot) => (
          <SlotOverlay
            key={slot.slotId}
            slot={slot}
            originX={originX}
            originY={originY}
            isSelected={state.selectedSlotId === slot.slotId}
            canDrag={state.editorMode === "layout"}
            onSelect={(id) => dispatch({ type: "SELECT_SLOT", id })}
            onDragStart={(id, event) => beginDrag("dragging-slot", id, slot.col, slot.row, event)}
          />
        ))}

      {sortedPlacements.map((placement) => (
        <PlacementSprite
          key={placement.id}
          placement={placement}
          originX={originX}
          originY={originY}
          isSelected={state.selectedPlacementId === placement.id}
          showAnchor={state.overlays.anchors}
          showZIndex={state.overlays.zIndex}
          canDrag={state.editorMode === "scene"}
          onSelect={(id) => dispatch({ type: "SELECT_PLACEMENT", id })}
          onDragStart={(id, event) =>
            beginDrag("dragging-placement", id, placement.col, placement.row, event)
          }
        />
      ))}

      {state.overlays.grid && shell && (
        <>
          {[
            { col: shell.col, row: shell.row },
            { col: shell.col + shell.cols, row: shell.row },
            { col: shell.col, row: shell.row + shell.rows },
            { col: shell.col + shell.cols, row: shell.row + shell.rows },
          ].map(({ col, row }) => {
            const point = projectIso(col, row, originX, originY);
            return (
              <text
                key={`coord-${col}-${row}`}
                x={point.x}
                y={point.y + 14}
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

      {previewBackdrop && (
        <>
          <rect
            x={viewX}
            y={viewY}
            width={vw}
            height={vh}
            fill={previewBackdrop.ambientTint}
            pointerEvents="none"
          />
          <rect
            x={viewX}
            y={viewY}
            width={vw}
            height={vh}
            fill={previewBackdrop.fogColor}
            pointerEvents="none"
          />
        </>
      )}
    </svg>
  );
}

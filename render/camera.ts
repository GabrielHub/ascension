import type { CameraBounds, CameraState, FocusPayload } from "./types";

// ── Constants ─────────────────────────────────────────────────────────────

/** Minimum zoom: full floor visible. */
const DEFAULT_MIN_ZOOM = 0.6;
/** Maximum zoom: roughly room-filling. */
const DEFAULT_MAX_ZOOM = 2.0;
/** Zoom speed per wheel tick. */
const ZOOM_STEP = 0.1;
/** Pan inertia damping (0 = instant stop, 1 = no damping). */
const PAN_DAMPING = 0.88;
/** Minimum velocity before pan snaps to zero. */
const PAN_VELOCITY_THRESHOLD = 0.3;

// ── Factory ───────────────────────────────────────────────────────────────

export function createCameraState(worldWidth: number, worldHeight: number): CameraState {
  return {
    x: worldWidth / 2,
    y: worldHeight / 2,
    zoom: 1.0,
  };
}

export function createCameraBounds(
  worldWidth: number,
  worldHeight: number,
  viewportWidth: number,
  viewportHeight: number,
): CameraBounds {
  const fitZoom = Math.min(viewportWidth / worldWidth, viewportHeight / worldHeight);
  return {
    minZoom: Math.min(DEFAULT_MAX_ZOOM, Math.max(DEFAULT_MIN_ZOOM, fitZoom * 0.9)),
    maxZoom: DEFAULT_MAX_ZOOM,
    worldWidth,
    worldHeight,
  };
}

// ── Transforms ────────────────────────────────────────────────────────────

/** Clamp a value to [min, max]. */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function clampAxis(
  position: number,
  worldSize: number,
  viewportSize: number,
  zoom: number,
): number {
  const visibleWorldSize = viewportSize / zoom;
  if (visibleWorldSize >= worldSize) {
    return worldSize / 2;
  }

  const halfViewSize = visibleWorldSize / 2;
  return clamp(position, halfViewSize, worldSize - halfViewSize);
}

/** Clamp camera position so the viewport stays within world bounds. */
export function clampCamera(
  camera: CameraState,
  bounds: CameraBounds,
  viewportWidth: number,
  viewportHeight: number,
): CameraState {
  const zoom = clamp(camera.zoom, bounds.minZoom, bounds.maxZoom);

  return {
    x: clampAxis(camera.x, bounds.worldWidth, viewportWidth, zoom),
    y: clampAxis(camera.y, bounds.worldHeight, viewportHeight, zoom),
    zoom,
  };
}

/** Convert screen coordinates to world coordinates. */
export function screenToWorld(
  screenX: number,
  screenY: number,
  camera: CameraState,
  viewportWidth: number,
  viewportHeight: number,
): { x: number; y: number } {
  return {
    x: camera.x + (screenX - viewportWidth / 2) / camera.zoom,
    y: camera.y + (screenY - viewportHeight / 2) / camera.zoom,
  };
}

/** Convert world coordinates to screen coordinates. */
export function worldToScreen(
  worldX: number,
  worldY: number,
  camera: CameraState,
  viewportWidth: number,
  viewportHeight: number,
): { x: number; y: number } {
  return {
    x: (worldX - camera.x) * camera.zoom + viewportWidth / 2,
    y: (worldY - camera.y) * camera.zoom + viewportHeight / 2,
  };
}

// ── Interaction handlers ──────────────────────────────────────────────────

export interface PanState {
  isPanning: boolean;
  startScreenX: number;
  startScreenY: number;
  startCameraX: number;
  startCameraY: number;
  velocityX: number;
  velocityY: number;
}

export function createPanState(): PanState {
  return {
    isPanning: false,
    startScreenX: 0,
    startScreenY: 0,
    startCameraX: 0,
    startCameraY: 0,
    velocityX: 0,
    velocityY: 0,
  };
}

export function beginPan(
  pan: PanState,
  screenX: number,
  screenY: number,
  camera: CameraState,
): PanState {
  return {
    isPanning: true,
    startScreenX: screenX,
    startScreenY: screenY,
    startCameraX: camera.x,
    startCameraY: camera.y,
    velocityX: 0,
    velocityY: 0,
  };
}

export function updatePan(
  pan: PanState,
  screenX: number,
  screenY: number,
  camera: CameraState,
): CameraState {
  if (!pan.isPanning) return camera;

  const dx = (pan.startScreenX - screenX) / camera.zoom;
  const dy = (pan.startScreenY - screenY) / camera.zoom;

  return {
    x: pan.startCameraX + dx,
    y: pan.startCameraY + dy,
    zoom: camera.zoom,
  };
}

export function endPan(pan: PanState): PanState {
  return { ...pan, isPanning: false };
}

/** Apply inertia damping to pan velocity. Returns remaining velocity or zero. */
export function dampPanVelocity(pan: PanState): PanState {
  const vx = pan.velocityX * PAN_DAMPING;
  const vy = pan.velocityY * PAN_DAMPING;
  const stopped = Math.abs(vx) < PAN_VELOCITY_THRESHOLD && Math.abs(vy) < PAN_VELOCITY_THRESHOLD;
  return {
    ...pan,
    velocityX: stopped ? 0 : vx,
    velocityY: stopped ? 0 : vy,
  };
}

/** Handle zoom from wheel input. Zooms toward the cursor position. */
export function applyWheelZoom(
  camera: CameraState,
  bounds: CameraBounds,
  deltaY: number,
  screenX: number,
  screenY: number,
  viewportWidth: number,
  viewportHeight: number,
): CameraState {
  const direction = deltaY > 0 ? -1 : 1;
  const newZoom = clamp(
    camera.zoom + direction * ZOOM_STEP * camera.zoom,
    bounds.minZoom,
    bounds.maxZoom,
  );

  if (newZoom === camera.zoom) return camera;

  // Zoom toward cursor: keep world point under cursor stationary
  const worldBefore = screenToWorld(screenX, screenY, camera, viewportWidth, viewportHeight);
  const afterCamera = { ...camera, zoom: newZoom };
  const worldAfter = screenToWorld(screenX, screenY, afterCamera, viewportWidth, viewportHeight);

  return {
    x: camera.x + (worldBefore.x - worldAfter.x),
    y: camera.y + (worldBefore.y - worldAfter.y),
    zoom: newZoom,
  };
}

// ── Focus ─────────────────────────────────────────────────────────────────

/**
 * Highlight a focus target without recentering the camera.
 * Returns the focus payload; the canvas renderer uses this to draw
 * the highlight overlay at the target's world-space bounds.
 */
export function buildFocusHighlight(
  targetKind: FocusPayload["targetKind"],
  targetId: string,
  bounds: { x: number; y: number; width: number; height: number } | null,
): FocusPayload {
  return {
    targetKind,
    targetId,
    highlightBounds: bounds,
  };
}

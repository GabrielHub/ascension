import { traceRoundRect } from "./canvas-utils";
import type { WorldEffectsSnapshot } from "./types";

// ── Default effects ───────────────────────────────────────────────────────

export function createDefaultEffects(): WorldEffectsSnapshot {
  return {
    ambientTint: "rgba(200, 168, 76, 0.03)",
    fogColor: "rgba(6, 6, 8, 0.85)",
    focusDimAlpha: 0,
    focusTargetId: null,
    shadowIntensity: 0.15,
  };
}

// ── Canvas rendering pipeline ─────────────────────────────────────────────

/**
 * Draw ambient tint over the entire canvas.
 * This is the first effects pass, drawn after the base world but
 * before actors and UI overlays.
 */
export function drawAmbientTint(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  effects: WorldEffectsSnapshot,
): void {
  if (!effects.ambientTint || effects.ambientTint === "transparent") return;
  ctx.fillStyle = effects.ambientTint;
  ctx.fillRect(0, 0, width, height);
}

/**
 * Draw a light shadow pass beneath objects.
 * Renders soft drop shadows at each provided position.
 */
export function drawShadowPass(
  ctx: CanvasRenderingContext2D,
  positions: readonly Readonly<{ x: number; y: number; width: number; height: number }>[],
  effects: WorldEffectsSnapshot,
): void {
  if (effects.shadowIntensity <= 0) return;

  ctx.save();
  const alpha = Math.min(1, effects.shadowIntensity);

  for (const pos of positions) {
    const gradient = ctx.createRadialGradient(
      pos.x + pos.width / 2,
      pos.y + pos.height + 4,
      0,
      pos.x + pos.width / 2,
      pos.y + pos.height + 4,
      pos.width * 0.6,
    );
    gradient.addColorStop(0, `rgba(0, 0, 0, ${alpha * 0.3})`);
    gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(pos.x - pos.width * 0.1, pos.y + pos.height - 4, pos.width * 1.2, pos.width * 0.5);
  }

  ctx.restore();
}

/**
 * Draw focus dimming over the canvas.
 * Everything outside the focus target gets dimmed.
 * The focus target area is left undimmed by clipping.
 */
export function drawFocusDimming(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  effects: WorldEffectsSnapshot,
  focusBounds: Readonly<{ x: number; y: number; width: number; height: number }> | null,
): void {
  if (effects.focusDimAlpha <= 0 || !focusBounds) return;

  ctx.save();

  // Draw dimming overlay with hole for focus target
  ctx.fillStyle = `rgba(6, 6, 8, ${effects.focusDimAlpha})`;

  ctx.beginPath();
  // Outer rect (full canvas)
  ctx.rect(0, 0, width, height);
  // Inner rect (focus target) — traced into the same path for evenodd cutout
  traceRoundRect(ctx, focusBounds.x, focusBounds.y, focusBounds.width, focusBounds.height, 8);

  ctx.fill("evenodd");
  ctx.restore();
}

/**
 * Draw restrained emissive accents on operational rooms.
 * A subtle top-edge glow on rooms that are active and occupied.
 */
export function drawEmissiveAccents(
  ctx: CanvasRenderingContext2D,
  rooms: readonly Readonly<{
    x: number;
    y: number;
    width: number;
    height: number;
    isOperational: boolean;
  }>[],
): void {
  ctx.save();

  for (const room of rooms) {
    if (!room.isOperational) continue;

    const gradient = ctx.createLinearGradient(room.x, room.y, room.x + room.width, room.y + 3);
    gradient.addColorStop(0, "rgba(200, 168, 76, 0)");
    gradient.addColorStop(0.5, "rgba(200, 168, 76, 0.12)");
    gradient.addColorStop(1, "rgba(200, 168, 76, 0)");

    ctx.fillStyle = gradient;
    ctx.fillRect(room.x + 8, room.y, room.width - 16, 2);
  }

  ctx.restore();
}

/**
 * Draw fog-of-war mask for raid dungeons.
 * Unrevealed cells are filled with the fog color.
 */
export function drawFogOfWar(
  ctx: CanvasRenderingContext2D,
  fogCells: readonly Readonly<{ x: number; y: number; revealed: boolean }>[],
  cellSize: number,
  effects: WorldEffectsSnapshot,
): void {
  if (fogCells.length === 0) return;

  ctx.save();
  ctx.fillStyle = effects.fogColor;

  for (const cell of fogCells) {
    if (cell.revealed) continue;
    ctx.fillRect(cell.x * cellSize, cell.y * cellSize, cellSize, cellSize);
  }

  ctx.restore();
}

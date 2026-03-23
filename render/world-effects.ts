import type { HqTimeOfDayPhase } from "lib/hq-time-phase";

import { traceRoundRect } from "./canvas-utils";
import type { WorldEffectsSnapshot } from "./types";

// ── Phase-specific effect presets ────────────────────────────────────────

const PHASE_EFFECTS: Readonly<
  Record<
    HqTimeOfDayPhase,
    Pick<WorldEffectsSnapshot, "ambientTint" | "fogColor" | "shadowIntensity">
  >
> = {
  sunrise: {
    ambientTint: "rgba(255, 180, 120, 0.12)",
    fogColor: "rgba(255, 200, 150, 0.08)",
    shadowIntensity: 0.3,
  },
  day: {
    ambientTint: "rgba(255, 255, 240, 0.05)",
    fogColor: "rgba(200, 210, 220, 0.04)",
    shadowIntensity: 0.5,
  },
  sunset: {
    ambientTint: "rgba(255, 140, 80, 0.15)",
    fogColor: "rgba(255, 160, 100, 0.10)",
    shadowIntensity: 0.6,
  },
  night: {
    ambientTint: "rgba(40, 60, 120, 0.20)",
    fogColor: "rgba(20, 30, 60, 0.15)",
    shadowIntensity: 0.8,
  },
};

// ── Default effects ───────────────────────────────────────────────────────

export function createDefaultEffects(phase?: HqTimeOfDayPhase): WorldEffectsSnapshot {
  if (phase) {
    const preset = PHASE_EFFECTS[phase];
    return {
      ambientTint: preset.ambientTint,
      fogColor: preset.fogColor,
      focusDimAlpha: 0,
      focusTargetId: null,
      shadowIntensity: preset.shadowIntensity,
    };
  }

  return {
    ambientTint: "rgba(200, 168, 76, 0.03)",
    fogColor: "rgba(6, 6, 8, 0.85)",
    focusDimAlpha: 0,
    focusTargetId: null,
    shadowIntensity: 0.15,
  };
}

export function createEffectsWithOverrides(
  phase: HqTimeOfDayPhase | undefined,
  overrides: Partial<Pick<WorldEffectsSnapshot, "ambientTint" | "fogColor" | "shadowIntensity">>,
): WorldEffectsSnapshot {
  const base = createDefaultEffects(phase);
  return {
    ...base,
    ambientTint: overrides.ambientTint ?? base.ambientTint,
    fogColor: overrides.fogColor ?? base.fogColor,
    shadowIntensity: overrides.shadowIntensity ?? base.shadowIntensity,
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

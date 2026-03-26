/**
 * React-based raid dungeon map — tactical command center view.
 *
 * Renders the 16×16 fog grid, team markers, enemy markers, and feature markers
 * as DOM elements with CSS transitions and motion animations. The map is
 * centered in the viewport and responds to focus changes.
 *
 * Presentation-only — reads RaidWorldSnapshot, never mutates state.
 */

import { useCallback, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";

import type {
  DungeonFeatureKind,
  DungeonFeatureMarker,
  FocusPayload,
  FogCell,
  RaidEnemyMarker,
  RaidTeamMarker,
  RaidWorldSnapshot,
} from "render";

import { getRaidGoalPresentation } from "./raid-world/raid-goals";

// ── Constants ─────────────────────────────────────────────────────────

/** World-space cell size from the sim (16×16 grid, 32px each = 512px world). */
const WORLD_CELL = 32;
/** Display cell size in CSS pixels for the grid. */
const CELL_PX = 38;
/** Total grid dimension. */
const GRID_SIZE = 16;

// ── Helpers ───────────────────────────────────────────────────────────

/** Classify a revealed cell as corridor or chamber based on neighbor count. */
function classifyCellKind(cell: FogCell, revealedSet: ReadonlySet<string>): "corridor" | "chamber" {
  let count = 0;
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (revealedSet.has(`${cell.x + dx},${cell.y + dy}`)) count++;
    }
  }
  return count >= 7 ? "chamber" : "corridor";
}

/** Convert world-space position to CSS pixel position in the grid container. */
function worldToGrid(worldX: number, worldY: number) {
  return {
    left: (worldX / WORLD_CELL) * CELL_PX,
    top: (worldY / WORLD_CELL) * CELL_PX,
  };
}

function formatTeamLabel(teamId: string): string {
  const suffix = teamId.split("/").pop();
  return suffix ? `Team ${suffix}` : "Team";
}

// ── Fog grid cell ─────────────────────────────────────────────────────

function FogGridCell({
  cell,
  kind,
  hasFogNeighborTop,
  hasFogNeighborRight,
  hasFogNeighborBottom,
  hasFogNeighborLeft,
}: {
  cell: FogCell;
  kind: "corridor" | "chamber";
  hasFogNeighborTop: boolean;
  hasFogNeighborRight: boolean;
  hasFogNeighborBottom: boolean;
  hasFogNeighborLeft: boolean;
}) {
  const isFrontier =
    hasFogNeighborTop || hasFogNeighborRight || hasFogNeighborBottom || hasFogNeighborLeft;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="absolute"
      style={{
        left: cell.x * CELL_PX,
        top: cell.y * CELL_PX,
        width: CELL_PX,
        height: CELL_PX,
      }}
    >
      {/* Base tile */}
      <div
        className={`absolute inset-0 ${
          kind === "chamber" ? "raid-cell-chamber" : "raid-cell-corridor"
        }`}
      />

      {/* Chamber ambient glow — warm light suggesting open space */}
      {kind === "chamber" && (
        <div className="absolute inset-0 rounded-[1px] bg-[radial-gradient(circle_at_center,rgba(200,168,76,0.035)_0%,transparent_65%)]" />
      )}

      {/* Chamber corner brackets */}
      {kind === "chamber" && (
        <>
          <div className="absolute left-[2px] top-[2px] h-[3px] w-[1px] bg-[rgba(200,168,76,0.08)]" />
          <div className="absolute left-[2px] top-[2px] h-[1px] w-[3px] bg-[rgba(200,168,76,0.08)]" />
          <div className="absolute right-[2px] top-[2px] h-[3px] w-[1px] bg-[rgba(200,168,76,0.08)]" />
          <div className="absolute right-[2px] top-[2px] h-[1px] w-[3px] bg-[rgba(200,168,76,0.08)]" />
          <div className="absolute bottom-[2px] left-[2px] h-[3px] w-[1px] bg-[rgba(200,168,76,0.06)]" />
          <div className="absolute bottom-[2px] left-[2px] h-[1px] w-[3px] bg-[rgba(200,168,76,0.06)]" />
          <div className="absolute bottom-[2px] right-[2px] h-[3px] w-[1px] bg-[rgba(200,168,76,0.06)]" />
          <div className="absolute bottom-[2px] right-[2px] h-[1px] w-[3px] bg-[rgba(200,168,76,0.06)]" />
        </>
      )}

      {/* Corridor subtle center guide */}
      {kind === "corridor" && (
        <div className="absolute left-0 right-0 top-1/2 h-px -translate-y-px bg-[rgba(200,168,76,0.015)]" />
      )}

      {/* Frontier glow — animated pulsing border at exploration edge */}
      {isFrontier && <div className="raid-frontier-glow absolute inset-px" />}

      {/* Directional fog fade edges — smooth transition to unrevealed */}
      {hasFogNeighborTop && (
        <div className="absolute inset-x-0 top-0 h-[50%] bg-gradient-to-b from-[rgba(6,8,16,0.75)] via-[rgba(6,8,16,0.3)] to-transparent" />
      )}
      {hasFogNeighborBottom && (
        <div className="absolute inset-x-0 bottom-0 h-[50%] bg-gradient-to-t from-[rgba(6,8,16,0.75)] via-[rgba(6,8,16,0.3)] to-transparent" />
      )}
      {hasFogNeighborLeft && (
        <div className="absolute inset-y-0 left-0 w-[50%] bg-gradient-to-r from-[rgba(6,8,16,0.75)] via-[rgba(6,8,16,0.3)] to-transparent" />
      )}
      {hasFogNeighborRight && (
        <div className="absolute inset-y-0 right-0 w-[50%] bg-gradient-to-l from-[rgba(6,8,16,0.75)] via-[rgba(6,8,16,0.3)] to-transparent" />
      )}
    </motion.div>
  );
}

// ── Team marker ───────────────────────────────────────────────────────

function TeamMarkerElement({
  team,
  isFocused,
  isDimmed,
  onClick,
}: {
  team: RaidTeamMarker;
  isFocused: boolean;
  isDimmed: boolean;
  onClick: () => void;
}) {
  const style = getRaidGoalPresentation(team.goal);
  const pos = worldToGrid(team.x, team.y);
  const isReturning = team.state === "returning";
  const isDefeated = team.state === "defeated";

  return (
    <motion.button
      type="button"
      onClick={onClick}
      className="absolute z-20 -translate-x-1/2 -translate-y-1/2 cursor-pointer"
      style={{
        left: pos.left,
        top: pos.top,
      }}
      initial={{ scale: 0, opacity: 0 }}
      animate={{
        scale: 1,
        opacity: isDimmed ? 0.3 : isDefeated ? 0.4 : isReturning ? 0.6 : 1,
        left: pos.left,
        top: pos.top,
      }}
      transition={{
        left: { type: "tween", duration: 1.4, ease: [0.25, 0.46, 0.45, 0.94] },
        top: { type: "tween", duration: 1.4, ease: [0.25, 0.46, 0.45, 0.94] },
        scale: { type: "spring", stiffness: 280, damping: 22 },
        opacity: { duration: 0.5 },
      }}
    >
      {/* Broad ambient glow */}
      <div
        className="absolute -inset-7 rounded-full"
        style={{
          background: `radial-gradient(circle, ${style.glow} 0%, transparent 65%)`,
        }}
      />

      {/* Focus ring — breathing outer ring */}
      {isFocused && (
        <motion.div
          className="absolute -inset-4 rounded-full border-2"
          style={{ borderColor: style.ring }}
          animate={{ scale: [1, 1.12, 1], opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
        />
      )}

      {/* Goal shape ring — morphs based on current goal */}
      <div
        className="absolute -inset-2.5 raid-team-ring"
        style={{
          borderColor: style.ring,
          ...(team.goal === "retreating"
            ? { borderStyle: "dashed" }
            : team.goal === "looting"
              ? { borderRadius: "3px", transform: "rotate(45deg)" }
              : team.goal === "intel"
                ? { borderRadius: "1px" }
                : {}),
        }}
      />

      {/* Core pip — the main team dot */}
      <div
        className={`relative h-3.5 w-3.5 rounded-full ${
          isDefeated ? "bg-[rgba(120,40,20,0.7)]" : ""
        }`}
        style={
          !isDefeated
            ? {
                background:
                  "radial-gradient(circle at 35% 35%, #e8d08a 0%, #c8a84c 40%, #9a7c34 100%)",
                boxShadow: `0 0 10px ${style.glow}, 0 0 3px rgba(200,168,76,0.5), inset 0 1px 2px rgba(255,255,255,0.2)`,
              }
            : undefined
        }
      >
        {/* Inner highlight — gives depth to the pip */}
        {!isDefeated && (
          <div className="absolute left-[3px] top-[3px] h-1.5 w-1.5 rounded-full bg-white/20" />
        )}
      </div>

      {/* Expanding pulse ring for active teams */}
      {!isDefeated && !isReturning && (
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{ border: `1.5px solid ${style.ring}` }}
          animate={{ scale: [1, 3], opacity: [0.4, 0] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeOut" }}
        />
      )}

      {/* Second staggered pulse for emphasis */}
      {!isDefeated && !isReturning && isFocused && (
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{ border: `1px solid ${style.ring}` }}
          animate={{ scale: [1, 2.5], opacity: [0.25, 0] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeOut", delay: 1.25 }}
        />
      )}

      {/* Goal label badge */}
      <div
        className="absolute left-1/2 top-full mt-2 -translate-x-1/2 whitespace-nowrap rounded-full px-2 py-0.5 text-[0.5rem] font-semibold tracking-[0.15em]"
        style={{
          backgroundColor: "rgba(6,8,16,0.9)",
          border: `1px solid ${style.ring}`,
          color: style.color,
          boxShadow: `0 2px 8px rgba(0,0,0,0.4)`,
        }}
      >
        <span className="mr-0.5 opacity-70">{style.icon}</span>
        {style.badgeLabel}
      </div>

      {/* Operator count badge */}
      {team.operatorIds.length > 1 && (
        <div
          className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-[rgba(6,8,16,0.92)] px-1.5 py-px text-[0.55rem] font-semibold tabular-nums text-silver/80 ring-1 ring-silver/15"
          style={{ boxShadow: "0 2px 6px rgba(0,0,0,0.3)" }}
        >
          {team.operatorIds.length}
        </div>
      )}
    </motion.button>
  );
}

// ── Enemy marker ──────────────────────────────────────────────────────

function EnemyMarkerElement({ enemy, isDimmed }: { enemy: RaidEnemyMarker; isDimmed: boolean }) {
  const pos = worldToGrid(enemy.x, enemy.y);
  const size = enemy.threat === "boss" ? 14 : enemy.threat === "elite" ? 10 : 7;
  const glowIntensity = enemy.threat === "boss" ? 0.25 : enemy.threat === "elite" ? 0.16 : 0.1;

  return (
    <motion.div
      className="absolute z-10 -translate-x-1/2 -translate-y-1/2"
      style={{ left: pos.left, top: pos.top }}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: isDimmed ? 0.2 : 1 }}
      transition={{ type: "spring", stiffness: 400, damping: 28, delay: 0.15 }}
    >
      {/* Threat glow */}
      <div
        className="absolute -inset-5 rounded-full"
        style={{
          background: `radial-gradient(circle, rgba(212,84,30,${glowIntensity}) 0%, transparent 65%)`,
        }}
      />

      {/* Diamond SVG */}
      <svg
        width={size * 2 + 4}
        height={size * 2 + 4}
        viewBox={`0 0 ${size * 2 + 4} ${size * 2 + 4}`}
        className="raid-enemy-pulse"
        style={{ animationDuration: enemy.threat === "boss" ? "3s" : "4s" }}
      >
        <defs>
          <filter id={`enemy-glow-${enemy.id}`}>
            <feGaussianBlur stdDeviation="2" />
          </filter>
          {enemy.threat === "boss" && (
            <radialGradient id={`boss-gradient-${enemy.id}`}>
              <stop offset="0%" stopColor="rgba(255,120,60,0.8)" />
              <stop offset="100%" stopColor="rgba(180,44,26,0.6)" />
            </radialGradient>
          )}
        </defs>
        {/* Glow shadow */}
        <polygon
          points={`${size + 2},2 ${size * 2 + 2},${size + 2} ${size + 2},${size * 2 + 2} 2,${size + 2}`}
          fill="rgba(212,84,30,0.3)"
          filter={`url(#enemy-glow-${enemy.id})`}
        />
        {/* Main diamond */}
        <polygon
          points={`${size + 2},2 ${size * 2 + 2},${size + 2} ${size + 2},${size * 2 + 2} 2,${size + 2}`}
          fill={enemy.threat === "boss" ? `url(#boss-gradient-${enemy.id})` : "rgba(212,84,30,0.6)"}
          stroke="rgba(212,84,30,0.9)"
          strokeWidth={enemy.threat === "boss" ? 1.5 : 0.8}
        />
        {/* Inner diamond for elite+ */}
        {(enemy.threat === "elite" || enemy.threat === "boss") && (
          <polygon
            points={`${size + 2},${size + 2 - size * 0.4} ${size + 2 + size * 0.4},${size + 2} ${size + 2},${size + 2 + size * 0.4} ${size + 2 - size * 0.4},${size + 2}`}
            fill="none"
            stroke="rgba(255,160,80,0.35)"
            strokeWidth="0.7"
          />
        )}
        {/* Core pip */}
        <circle
          cx={size + 2}
          cy={size + 2}
          r={enemy.threat === "boss" ? 3 : 1.8}
          fill={enemy.threat === "boss" ? "rgba(255,140,60,0.9)" : "rgba(212,84,30,0.9)"}
        />
        {/* Boss outer ring */}
        {enemy.threat === "boss" && (
          <circle
            cx={size + 2}
            cy={size + 2}
            r={size + 1}
            fill="none"
            stroke="rgba(212,84,30,0.3)"
            strokeWidth="1.2"
            strokeDasharray="3 2"
          >
            <animateTransform
              attributeName="transform"
              type="rotate"
              from={`0 ${size + 2} ${size + 2}`}
              to={`360 ${size + 2} ${size + 2}`}
              dur="12s"
              repeatCount="indefinite"
            />
          </circle>
        )}
      </svg>

      {/* Boss label */}
      {enemy.threat === "boss" && (
        <div className="absolute left-1/2 top-full mt-1 -translate-x-1/2 whitespace-nowrap rounded-full bg-[rgba(6,8,16,0.9)] px-1.5 py-px text-[0.45rem] font-bold uppercase tracking-[0.2em] text-ember ring-1 ring-ember/20">
          BOSS
        </div>
      )}
    </motion.div>
  );
}

// ── Feature marker ────────────────────────────────────────────────────

const FEATURE_CONFIG: Record<DungeonFeatureKind, { element: (key: string) => React.ReactNode }> = {
  "loot-cache": {
    element: (key) => (
      <svg key={key} width="16" height="16" viewBox="0 0 16 16" className="raid-feature-pulse">
        <defs>
          <filter id={`loot-glow-${key}`}>
            <feGaussianBlur stdDeviation="2.5" />
          </filter>
          <radialGradient id={`loot-fill-${key}`}>
            <stop offset="0%" stopColor="rgba(232,208,138,0.9)" />
            <stop offset="100%" stopColor="rgba(200,168,76,0.7)" />
          </radialGradient>
        </defs>
        <polygon
          points="8,1 14,8 8,15 2,8"
          fill="rgba(200,168,76,0.2)"
          filter={`url(#loot-glow-${key})`}
        />
        <polygon
          points="8,2.5 12.5,8 8,13.5 3.5,8"
          fill={`url(#loot-fill-${key})`}
          stroke="rgba(200,168,76,0.6)"
          strokeWidth="0.5"
        />
        <circle cx="8" cy="8" r="1.5" fill="rgba(255,255,255,0.25)" />
      </svg>
    ),
  },
  "intel-node": {
    element: (key) => (
      <svg key={key} width="18" height="18" viewBox="0 0 18 18" className="raid-feature-pulse">
        <circle cx="9" cy="9" r="8" fill="none" stroke="rgba(100,160,220,0.12)" strokeWidth="0.5">
          <animate attributeName="r" values="5;8;5" dur="3.5s" repeatCount="indefinite" />
          <animate
            attributeName="stroke-opacity"
            values="0.12;0.35;0.12"
            dur="3.5s"
            repeatCount="indefinite"
          />
        </circle>
        <circle cx="9" cy="9" r="5" fill="none" stroke="rgba(100,160,220,0.15)" strokeWidth="0.4">
          <animate attributeName="r" values="3.5;5;3.5" dur="3.5s" repeatCount="indefinite" />
        </circle>
        <circle
          cx="9"
          cy="9"
          r="3.5"
          fill="rgba(100,160,220,0.12)"
          stroke="rgba(100,160,220,0.4)"
          strokeWidth="0.5"
        />
        <circle cx="9" cy="9" r="2.5" fill="rgba(100,160,220,0.7)" />
        <circle cx="9" cy="9" r="1" fill="rgba(200,220,255,0.5)" />
      </svg>
    ),
  },
  "hazard-zone": {
    element: (key) => (
      <svg key={key} width="16" height="16" viewBox="0 0 16 16" className="raid-enemy-pulse">
        <defs>
          <filter id={`hazard-glow-${key}`}>
            <feGaussianBlur stdDeviation="1.5" />
          </filter>
        </defs>
        <polygon
          points="8,2 14,12 2,12"
          fill="rgba(212,84,30,0.15)"
          filter={`url(#hazard-glow-${key})`}
        />
        <polygon
          points="8,3 13,12 3,12"
          fill="rgba(212,84,30,0.6)"
          stroke="rgba(212,84,30,0.9)"
          strokeWidth="0.7"
        />
        <rect x="7.3" y="5.5" width="1.4" height="3.2" fill="rgba(255,200,100,0.6)" rx="0.4" />
        <circle cx="8" cy="10.2" r="0.7" fill="rgba(255,200,100,0.6)" />
      </svg>
    ),
  },
  "debris-pile": {
    element: (key) => (
      <svg key={key} width="16" height="16" viewBox="0 0 16 16">
        <circle cx="5.5" cy="6.5" r="1.5" fill="rgba(120,115,100,0.35)" />
        <circle cx="9.5" cy="5.5" r="1.1" fill="rgba(120,115,100,0.3)" />
        <circle cx="6.5" cy="9.5" r="1.3" fill="rgba(120,115,100,0.25)" />
        <circle cx="10" cy="9" r="1" fill="rgba(120,115,100,0.3)" />
        <circle cx="8" cy="7.5" r="2.5" fill="rgba(120,115,100,0.15)" />
      </svg>
    ),
  },
};

function FeatureMarkerElement({
  feature,
  isDimmed,
}: {
  feature: DungeonFeatureMarker;
  isDimmed: boolean;
}) {
  const pos = worldToGrid(feature.x, feature.y);
  const config = FEATURE_CONFIG[feature.kind];

  return (
    <motion.div
      className="absolute z-10 -translate-x-1/2 -translate-y-1/2"
      style={{ left: pos.left, top: pos.top }}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: isDimmed ? 0.15 : 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 22, delay: 0.2 }}
    >
      {config.element(feature.id)}
    </motion.div>
  );
}

// ── Waypoint trail ────────────────────────────────────────────────────

function WaypointTrail({ team, isFocused }: { team: RaidTeamMarker; isFocused: boolean }) {
  if (!isFocused || team.state === "defeated") return null;

  const style = getRaidGoalPresentation(team.goal);
  const pos = worldToGrid(team.x, team.y);

  return (
    <div
      className="pointer-events-none absolute z-[5] -translate-x-1/2 -translate-y-1/2"
      style={{ left: pos.left, top: pos.top }}
    >
      {/* Horizontal scan line */}
      <motion.div
        className="absolute top-0 h-px w-[800px] -translate-x-1/2 -translate-y-px"
        style={{
          background: `linear-gradient(90deg, transparent 0%, ${style.ring} 35%, ${style.color} 50%, ${style.ring} 65%, transparent 100%)`,
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: [0.1, 0.25, 0.1] }}
        transition={{ duration: 3.5, repeat: Infinity }}
      />
      {/* Vertical scan line */}
      <motion.div
        className="absolute left-0 h-[800px] w-px -translate-x-px -translate-y-1/2"
        style={{
          background: `linear-gradient(180deg, transparent 0%, ${style.ring} 35%, ${style.color} 50%, ${style.ring} 65%, transparent 100%)`,
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: [0.1, 0.25, 0.1] }}
        transition={{ duration: 3.5, repeat: Infinity }}
      />
      {/* Center crosshair diamond */}
      <motion.div
        className="absolute -left-1 -top-1 h-2 w-2 rotate-45 border"
        style={{ borderColor: style.ring }}
        animate={{ scale: [1, 1.3, 1], opacity: [0.4, 0.7, 0.4] }}
        transition={{ duration: 2, repeat: Infinity }}
      />
    </div>
  );
}

// ── Command overlay panel ────────────────────────────────────────────

function CommandPanel({ snapshot, revealPct }: { snapshot: RaidWorldSnapshot; revealPct: number }) {
  const activeTeams = snapshot.teams.filter((t) => t.state === "active").length;
  const discoveredEnemies = snapshot.enemies.filter((e) => e.discovered).length;
  const discoveredFeatures = snapshot.features.filter((f) => f.discovered).length;
  const bossPresent = snapshot.enemies.some((e) => e.discovered && e.threat === "boss");

  return (
    <div className="pointer-events-auto absolute right-0 top-0 w-64 animate-enter">
      <div className="raid-command-panel relative overflow-hidden">
        {/* Top gold accent line */}
        <div className="absolute left-0 right-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/20 to-transparent" />

        {/* District header */}
        <div className="border-b border-[rgba(200,168,76,0.06)] px-4 py-3">
          <p className="max-w-[13rem] truncate font-[family-name:var(--font-display)] text-sm font-light tracking-wide text-gold/90">
            {snapshot.dungeonName}
          </p>
          <p className="mt-0.5 text-[0.625rem] uppercase tracking-[0.2em] text-silver/40">
            Contract Site
          </p>
        </div>

        {/* Exploration progress */}
        <div className="border-b border-[rgba(200,168,76,0.04)] px-4 py-3">
          <div className="flex items-baseline justify-between">
            <span className="text-[0.625rem] uppercase tracking-[0.15em] text-silver/45">
              Explored
            </span>
            <span className="font-[family-name:var(--font-display)] text-lg font-light tabular-nums text-gold/80">
              {revealPct}
              <span className="text-xs text-gold/50">%</span>
            </span>
          </div>
          <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-[rgba(200,168,76,0.05)]">
            <motion.div
              className="h-full rounded-full"
              style={{
                background:
                  "linear-gradient(90deg, rgba(200,168,76,0.25) 0%, rgba(200,168,76,0.5) 100%)",
              }}
              animate={{ width: `${revealPct}%` }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            />
          </div>
        </div>

        {/* Status indicators */}
        <div className="space-y-2.5 px-4 py-3">
          {/* Teams */}
          <div className="flex items-center gap-2.5">
            <div className="relative flex h-4 w-4 items-center justify-center">
              <div className="h-2 w-2 rounded-full bg-gold shadow-[0_0_6px_rgba(200,168,76,0.5)]" />
              {activeTeams > 0 && (
                <div
                  className="absolute inset-0 animate-ping rounded-full bg-gold/20"
                  style={{ animationDuration: "3s" }}
                />
              )}
            </div>
            <span className="text-xs text-silver/60">
              <span className="tabular-nums text-silver/80">{activeTeams}</span>
              <span className="text-silver/40">/{snapshot.teams.length}</span> teams active
            </span>
          </div>

          {/* Threats */}
          <div className="flex items-center gap-2.5">
            <div className="flex h-4 w-4 items-center justify-center">
              <div className="h-2 w-2 rotate-45 bg-ember/80" />
            </div>
            <span className="text-xs text-silver/60">
              <span className="tabular-nums text-silver/80">{discoveredEnemies}</span> threats
              detected
            </span>
            {bossPresent && (
              <span className="rounded-full bg-magma/15 px-1.5 py-px text-[0.5rem] font-bold uppercase tracking-wider text-magma ring-1 ring-magma/20">
                Boss
              </span>
            )}
          </div>

          {/* Features */}
          <div className="flex items-center gap-2.5">
            <div className="flex h-4 w-4 items-center justify-center">
              <svg width="8" height="8" viewBox="0 0 8 8">
                <polygon
                  points="4,0.5 7.5,4 4,7.5 0.5,4"
                  fill="rgba(200,168,76,0.5)"
                  stroke="rgba(200,168,76,0.7)"
                  strokeWidth="0.5"
                />
              </svg>
            </div>
            <span className="text-xs text-silver/60">
              <span className="tabular-nums text-silver/80">{discoveredFeatures}</span> features
              found
            </span>
          </div>
        </div>

        {/* Team goal breakdown (if teams exist) */}
        {snapshot.teams.length > 0 && (
          <div className="border-t border-[rgba(200,168,76,0.04)] px-4 py-3">
            <p className="mb-2 text-[0.625rem] uppercase tracking-[0.15em] text-silver/40">
              Team Activity
            </p>
            <div className="space-y-1.5">
              {snapshot.teams.map((team) => {
                const goalStyle = getRaidGoalPresentation(team.goal);
                return (
                  <div key={team.teamId} className="flex items-center gap-2">
                    <div
                      className="h-1.5 w-1.5 rounded-full"
                      style={{
                        backgroundColor: goalStyle.color,
                        boxShadow: `0 0 4px ${goalStyle.glow}`,
                      }}
                    />
                    <span className="flex-1 text-[0.6875rem] text-silver/55">
                      {formatTeamLabel(team.teamId)}
                    </span>
                    <span
                      className="text-[0.6rem] font-medium uppercase tracking-wider"
                      style={{ color: goalStyle.color }}
                    >
                      {goalStyle.badgeLabel}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────

export interface RaidWorldViewProps {
  snapshot: RaidWorldSnapshot;
  focus?: FocusPayload | null;
  onFocusChange?: (focus: FocusPayload | null) => void;
}

export function RaidWorldView({ snapshot, focus = null, onFocusChange }: RaidWorldViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);

  // Pre-compute revealed set for neighbor lookups
  const revealedSet = useMemo(() => {
    const set = new Set<string>();
    for (const cell of snapshot.fogMask) {
      if (cell.revealed) set.add(`${cell.x},${cell.y}`);
    }
    return set;
  }, [snapshot.fogMask]);

  const revealedCells = useMemo(
    () => snapshot.fogMask.filter((c) => c.revealed),
    [snapshot.fogMask],
  );

  const revealPct = useMemo(
    () => Math.round((revealedCells.length / (snapshot.fogMask.length || 1)) * 100),
    [revealedCells, snapshot.fogMask.length],
  );

  const discoveredFeatures = useMemo(
    () => snapshot.features.filter((f) => f.discovered),
    [snapshot.features],
  );

  const discoveredEnemies = useMemo(
    () => snapshot.enemies.filter((e) => e.discovered),
    [snapshot.enemies],
  );

  const focusedTeamId = focus?.targetKind === "team" ? focus.targetId : null;
  const hasFocus = focusedTeamId !== null;

  const handleTeamClick = useCallback(
    (team: RaidTeamMarker) => {
      if (!onFocusChange) return;
      if (focusedTeamId === team.teamId) {
        onFocusChange(null);
      } else {
        onFocusChange({
          targetKind: "team",
          targetId: team.teamId,
          highlightBounds: {
            x: team.x - 18,
            y: team.y - 18,
            width: 36,
            height: 36,
          },
        });
      }
    },
    [onFocusChange, focusedTeamId],
  );

  const handleBackgroundClick = useCallback(() => {
    if (focusedTeamId && onFocusChange) {
      onFocusChange(null);
    }
  }, [focusedTeamId, onFocusChange]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.stopPropagation();
    setZoom((prev) => {
      const delta = e.deltaY > 0 ? -0.08 : 0.08;
      return Math.min(2, Math.max(0.5, prev + delta));
    });
  }, []);

  const gridSizePx = GRID_SIZE * CELL_PX;

  return (
    <div
      ref={containerRef}
      className="relative flex h-full w-full items-center justify-center overflow-hidden"
      onClick={handleBackgroundClick}
      onWheel={handleWheel}
    >
      {/* ── Layered atmospheric background ── */}
      {/* Base void */}
      <div className="absolute inset-0 bg-[#050810]" />
      {/* Deep navy radial — center is slightly brighter */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_center,rgba(20,30,55,0.2)_0%,transparent_100%)]" />
      {/* Breathing atmosphere glow */}
      <div className="raid-atmosphere-glow absolute inset-0 bg-[radial-gradient(ellipse_50%_50%_at_45%_40%,rgba(26,36,64,0.2)_0%,transparent_100%)]" />
      {/* Grid holographic lines */}
      <div
        className="raid-grid-lines absolute inset-0 opacity-60"
        style={{ backgroundSize: `${CELL_PX}px ${CELL_PX}px` }}
      />
      {/* Scanlines — subtle for depth */}
      <div className="absolute inset-0 raid-scanlines opacity-60" />
      {/* Edge vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_center,transparent_40%,rgba(5,8,16,0.6)_100%)]" />

      {/* ── Map container — centered with zoom ── */}
      <div
        className="relative transition-transform duration-300 ease-out"
        style={{
          width: gridSizePx,
          height: gridSizePx,
          transform: `scale(${zoom})`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Outer frame — subtle border with glow */}
        <div className="absolute -inset-1.5 rounded-md border border-[rgba(200,168,76,0.04)] shadow-[0_0_30px_rgba(0,0,0,0.3)]" />
        {/* Inner frame accent */}
        <div className="absolute -inset-px rounded border border-[rgba(200,168,76,0.02)]" />

        {/* Revealed fog cells */}
        <AnimatePresence>
          {revealedCells.map((cell) => {
            const kind = classifyCellKind(cell, revealedSet);
            return (
              <FogGridCell
                key={`${cell.x},${cell.y}`}
                cell={cell}
                kind={kind}
                hasFogNeighborTop={!revealedSet.has(`${cell.x},${cell.y - 1}`)}
                hasFogNeighborRight={!revealedSet.has(`${cell.x + 1},${cell.y}`)}
                hasFogNeighborBottom={!revealedSet.has(`${cell.x},${cell.y + 1}`)}
                hasFogNeighborLeft={!revealedSet.has(`${cell.x - 1},${cell.y}`)}
              />
            );
          })}
        </AnimatePresence>

        {/* Waypoint trails for focused team */}
        {snapshot.teams.map((team) => (
          <WaypointTrail
            key={`trail-${team.teamId}`}
            team={team}
            isFocused={team.teamId === focusedTeamId}
          />
        ))}

        {/* Feature markers */}
        <AnimatePresence>
          {discoveredFeatures.map((feature) => (
            <FeatureMarkerElement key={feature.id} feature={feature} isDimmed={hasFocus} />
          ))}
        </AnimatePresence>

        {/* Enemy markers */}
        <AnimatePresence>
          {discoveredEnemies.map((enemy) => (
            <EnemyMarkerElement key={enemy.id} enemy={enemy} isDimmed={hasFocus} />
          ))}
        </AnimatePresence>

        {/* Team markers */}
        {snapshot.teams.map((team) => (
          <TeamMarkerElement
            key={team.teamId}
            team={team}
            isFocused={team.teamId === focusedTeamId}
            isDimmed={hasFocus && team.teamId !== focusedTeamId}
            onClick={() => handleTeamClick(team)}
          />
        ))}
      </div>

      {/* ── Command overlay panel (top-left corner) ── */}
      <div className="pointer-events-none absolute inset-0 p-4">
        <div className="absolute left-4 top-4">
          <CommandPanel snapshot={snapshot} revealPct={revealPct} />
        </div>
      </div>
    </div>
  );
}

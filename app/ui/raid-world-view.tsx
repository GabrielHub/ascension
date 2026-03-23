/**
 * React-based raid dungeon map — replaces the canvas-based RaidWorldCanvas.
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
  RaidTeamGoal,
  RaidTeamMarker,
  RaidWorldSnapshot,
} from "render";

// ── Constants ─────────────────────────────────────────────────────────

/** World-space cell size from the sim (16×16 grid, 32px each = 512px world). */
const WORLD_CELL = 32;
/** Display cell size in CSS pixels for the grid. */
const CELL_PX = 36;
/** Total grid dimension. */
const GRID_SIZE = 16;

// ── Goal palette ──────────────────────────────────────────────────────

const GOAL_STYLE: Record<
  RaidTeamGoal,
  { color: string; glow: string; ring: string; label: string }
> = {
  exploring: {
    color: "rgb(100 160 220)",
    glow: "rgba(100,160,220,0.35)",
    ring: "rgba(100,160,220,0.5)",
    label: "EXP",
  },
  looting: {
    color: "rgb(200 168 76)",
    glow: "rgba(200,168,76,0.35)",
    ring: "rgba(200,168,76,0.5)",
    label: "LOOT",
  },
  intel: {
    color: "rgb(100 180 160)",
    glow: "rgba(100,180,160,0.35)",
    ring: "rgba(100,180,160,0.5)",
    label: "INT",
  },
  hunting: {
    color: "rgb(212 84 30)",
    glow: "rgba(212,84,30,0.35)",
    ring: "rgba(212,84,30,0.5)",
    label: "HUNT",
  },
  boss: {
    color: "rgb(180 44 26)",
    glow: "rgba(180,44,26,0.4)",
    ring: "rgba(180,44,26,0.6)",
    label: "BOSS",
  },
  retreating: {
    color: "rgb(224 221 214)",
    glow: "rgba(224,221,214,0.15)",
    ring: "rgba(224,221,214,0.25)",
    label: "RET",
  },
  regrouping: {
    color: "rgb(200 168 76)",
    glow: "rgba(200,168,76,0.2)",
    ring: "rgba(200,168,76,0.3)",
    label: "RGRP",
  },
};

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
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
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

      {/* Chamber ambient glow */}
      {kind === "chamber" && (
        <div className="absolute inset-0 rounded-[1px] bg-[radial-gradient(circle_at_center,rgba(200,168,76,0.04)_0%,transparent_70%)]" />
      )}

      {/* Corner accents for chambers */}
      {kind === "chamber" && (
        <>
          <div className="absolute left-[3px] top-[3px] h-[2px] w-[3px] bg-[rgba(92,112,156,0.22)]" />
          <div className="absolute right-[3px] top-[3px] h-[2px] w-[3px] bg-[rgba(92,112,156,0.22)]" />
          <div className="absolute bottom-[3px] left-[3px] h-[2px] w-[3px] bg-[rgba(92,112,156,0.18)]" />
          <div className="absolute bottom-[3px] right-[3px] h-[2px] w-[3px] bg-[rgba(92,112,156,0.18)]" />
        </>
      )}

      {/* Corridor center guide line */}
      {kind === "corridor" && (
        <div className="absolute left-0 right-0 top-1/2 h-px -translate-y-px bg-[rgba(200,168,76,0.025)]" />
      )}

      {/* Frontier edge glow — signals boundary of explored area */}
      {isFrontier && (
        <div className="absolute inset-px rounded-[1px] border border-[rgba(224,221,214,0.07)] shadow-[inset_0_0_6px_rgba(200,168,76,0.04)]" />
      )}

      {/* Directional fog fade edges */}
      {hasFogNeighborTop && (
        <div className="absolute inset-x-0 top-0 h-[40%] bg-gradient-to-b from-[rgba(6,8,16,0.7)] to-transparent" />
      )}
      {hasFogNeighborBottom && (
        <div className="absolute inset-x-0 bottom-0 h-[40%] bg-gradient-to-t from-[rgba(6,8,16,0.7)] to-transparent" />
      )}
      {hasFogNeighborLeft && (
        <div className="absolute inset-y-0 left-0 w-[40%] bg-gradient-to-r from-[rgba(6,8,16,0.7)] to-transparent" />
      )}
      {hasFogNeighborRight && (
        <div className="absolute inset-y-0 right-0 w-[40%] bg-gradient-to-l from-[rgba(6,8,16,0.7)] to-transparent" />
      )}
    </motion.div>
  );
}

// ── Team marker ───────────────────────────────────────────────────────

function TeamMarkerElement({
  team,
  isFocused,
  onClick,
}: {
  team: RaidTeamMarker;
  isFocused: boolean;
  onClick: () => void;
}) {
  const style = GOAL_STYLE[team.goal] ?? GOAL_STYLE.exploring;
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
        opacity: isDefeated ? 0.4 : isReturning ? 0.6 : 1,
        left: pos.left,
        top: pos.top,
      }}
      transition={{
        left: { type: "tween", duration: 1.2, ease: "easeInOut" },
        top: { type: "tween", duration: 1.2, ease: "easeInOut" },
        scale: { type: "spring", stiffness: 300, damping: 25 },
        opacity: { duration: 0.4 },
      }}
    >
      {/* Ambient glow */}
      <div
        className="absolute -inset-5 rounded-full"
        style={{
          background: `radial-gradient(circle, ${style.glow} 0%, transparent 70%)`,
        }}
      />

      {/* Focus ring */}
      {isFocused && (
        <motion.div
          className="absolute -inset-3 rounded-full border"
          style={{ borderColor: style.ring }}
          animate={{ scale: [1, 1.15, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />
      )}

      {/* Goal shape affordance ring */}
      <div
        className="absolute -inset-2 raid-team-ring"
        style={{
          borderColor: style.ring,
          ...(team.goal === "retreating"
            ? { borderStyle: "dashed" }
            : team.goal === "looting"
              ? { borderRadius: "2px", transform: "rotate(45deg)" }
              : team.goal === "intel"
                ? { borderRadius: "0" }
                : {}),
        }}
      />

      {/* Core dot */}
      <div
        className={`relative h-3 w-3 rounded-full shadow-lg ${
          isDefeated ? "bg-[rgba(120,40,20,0.7)]" : ""
        }`}
        style={
          !isDefeated
            ? {
                backgroundColor: "#c8a84c",
                boxShadow: `0 0 8px ${style.glow}, inset 0 1px 2px rgba(255,255,255,0.15)`,
              }
            : undefined
        }
      >
        {/* Inner highlight */}
        <div className="absolute left-0.5 top-0.5 h-1 w-1 rounded-full bg-white/15" />
      </div>

      {/* Pulse animation for active teams */}
      {!isDefeated && !isReturning && (
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{ backgroundColor: style.color }}
          animate={{ scale: [1, 2.5], opacity: [0.3, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
        />
      )}

      {/* Goal label */}
      <div
        className="absolute left-1/2 top-full mt-1.5 -translate-x-1/2 whitespace-nowrap rounded px-1.5 py-0.5 text-[0.55rem] font-semibold tracking-wider"
        style={{
          backgroundColor: "rgba(6,8,16,0.85)",
          border: `1px solid ${style.ring}`,
          color: style.color,
        }}
      >
        {style.label}
      </div>

      {/* Operator count badge */}
      {team.operatorIds.length > 1 && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-[rgba(6,8,16,0.88)] px-1 py-px text-[0.55rem] font-semibold tabular-nums text-silver/75 ring-1 ring-silver/12">
          {team.operatorIds.length}
        </div>
      )}
    </motion.button>
  );
}

// ── Enemy marker ──────────────────────────────────────────────────────

function EnemyMarkerElement({ enemy }: { enemy: RaidEnemyMarker }) {
  const pos = worldToGrid(enemy.x, enemy.y);
  const size = enemy.threat === "boss" ? 12 : enemy.threat === "elite" ? 9 : 6;

  return (
    <motion.div
      className="absolute z-10 -translate-x-1/2 -translate-y-1/2"
      style={{ left: pos.left, top: pos.top }}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 400, damping: 28, delay: 0.15 }}
    >
      {/* Threat glow */}
      <div
        className="absolute -inset-4 rounded-full"
        style={{
          background: `radial-gradient(circle, rgba(212,84,30,${
            enemy.threat === "boss" ? 0.2 : 0.12
          }) 0%, transparent 70%)`,
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
            <feGaussianBlur stdDeviation="1.5" />
          </filter>
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
          fill="rgba(212,84,30,0.6)"
          stroke="rgba(212,84,30,0.9)"
          strokeWidth={enemy.threat === "boss" ? 1.2 : 0.8}
        />
        {/* Inner diamond for elite+ */}
        {(enemy.threat === "elite" || enemy.threat === "boss") && (
          <polygon
            points={`${size + 2},${size + 2 - size * 0.4} ${size + 2 + size * 0.4},${size + 2} ${size + 2},${size + 2 + size * 0.4} ${size + 2 - size * 0.4},${size + 2}`}
            fill="none"
            stroke="rgba(255,160,80,0.3)"
            strokeWidth="0.6"
          />
        )}
        {/* Core pip */}
        <circle
          cx={size + 2}
          cy={size + 2}
          r={enemy.threat === "boss" ? 2.5 : 1.5}
          fill="rgba(212,84,30,0.9)"
        />
        {/* Boss outer ring */}
        {enemy.threat === "boss" && (
          <circle
            cx={size + 2}
            cy={size + 2}
            r={size + 1}
            fill="none"
            stroke="rgba(212,84,30,0.25)"
            strokeWidth="1"
            strokeDasharray="3 2"
          />
        )}
      </svg>
    </motion.div>
  );
}

// ── Feature marker ────────────────────────────────────────────────────

const FEATURE_CONFIG: Record<DungeonFeatureKind, { element: (key: string) => React.ReactNode }> = {
  "loot-cache": {
    element: (key) => (
      <svg key={key} width="14" height="14" viewBox="0 0 14 14" className="raid-feature-pulse">
        <defs>
          <filter id={`loot-glow-${key}`}>
            <feGaussianBlur stdDeviation="2" />
          </filter>
        </defs>
        <polygon
          points="7,1 12,7 7,13 2,7"
          fill="rgba(200,168,76,0.2)"
          filter={`url(#loot-glow-${key})`}
        />
        <polygon
          points="7,2 11,7 7,12 3,7"
          fill="#c8a84c"
          stroke="rgba(200,168,76,0.6)"
          strokeWidth="0.5"
        />
        <circle cx="7" cy="7" r="1.2" fill="rgba(255,255,255,0.2)" />
      </svg>
    ),
  },
  "intel-node": {
    element: (key) => (
      <svg key={key} width="16" height="16" viewBox="0 0 16 16" className="raid-feature-pulse">
        <circle cx="8" cy="8" r="7" fill="none" stroke="rgba(100,160,220,0.15)" strokeWidth="0.6">
          <animate attributeName="r" values="5;7;5" dur="3s" repeatCount="indefinite" />
          <animate
            attributeName="stroke-opacity"
            values="0.15;0.4;0.15"
            dur="3s"
            repeatCount="indefinite"
          />
        </circle>
        <circle
          cx="8"
          cy="8"
          r="3.5"
          fill="rgba(100,160,220,0.15)"
          stroke="rgba(100,160,220,0.4)"
          strokeWidth="0.5"
        />
        <circle cx="8" cy="8" r="3" fill="rgba(100,160,220,0.7)" />
      </svg>
    ),
  },
  "hazard-zone": {
    element: (key) => (
      <svg key={key} width="14" height="14" viewBox="0 0 14 14" className="raid-enemy-pulse">
        <polygon
          points="7,2 12,11 2,11"
          fill="rgba(212,84,30,0.6)"
          stroke="rgba(212,84,30,0.9)"
          strokeWidth="0.6"
        />
        <rect x="6.5" y="5" width="1" height="3" fill="rgba(255,200,100,0.5)" rx="0.3" />
        <circle cx="7" cy="9.5" r="0.6" fill="rgba(255,200,100,0.5)" />
      </svg>
    ),
  },
  "debris-pile": {
    element: (key) => (
      <svg key={key} width="14" height="14" viewBox="0 0 14 14">
        <circle cx="5" cy="6" r="1.2" fill="rgba(120,115,100,0.4)" />
        <circle cx="8.5" cy="5.5" r="0.9" fill="rgba(120,115,100,0.35)" />
        <circle cx="6" cy="8.5" r="1" fill="rgba(120,115,100,0.3)" />
        <circle cx="9" cy="8" r="0.8" fill="rgba(120,115,100,0.35)" />
        <circle cx="7" cy="7" r="2" fill="rgba(120,115,100,0.2)" />
      </svg>
    ),
  },
};

function FeatureMarkerElement({ feature }: { feature: DungeonFeatureMarker }) {
  const pos = worldToGrid(feature.x, feature.y);
  const config = FEATURE_CONFIG[feature.kind];

  return (
    <motion.div
      className="absolute z-10 -translate-x-1/2 -translate-y-1/2"
      style={{ left: pos.left, top: pos.top }}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 22, delay: 0.2 }}
    >
      {config.element(feature.id)}
    </motion.div>
  );
}

// ── Map overlay header ────────────────────────────────────────────────

function MapOverlayHeader({
  snapshot,
  revealPct,
}: {
  snapshot: RaidWorldSnapshot;
  revealPct: number;
}) {
  const activeTeams = snapshot.teams.filter((t) => t.state === "active").length;

  return (
    <div className="pointer-events-auto absolute right-[22rem] top-0 flex max-w-xs flex-col items-end gap-2">
      {/* Dungeon name */}
      <div className="animate-enter rounded-lg border border-[rgba(200,168,76,0.06)] bg-[rgba(6,6,8,0.75)] px-3 py-2 backdrop-blur-xl">
        <p className="max-w-[14rem] truncate text-xs font-medium uppercase tracking-[0.15em] text-gold/80">
          {snapshot.dungeonName}
        </p>
        <p className="mt-0.5 text-[0.6875rem] text-silver/50">Contract Site</p>
      </div>

      {/* Exploration progress */}
      <div className="animate-enter-delay-1 rounded-lg border border-[rgba(200,168,76,0.04)] bg-[rgba(6,6,8,0.6)] px-3 py-2 backdrop-blur-md">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[0.6875rem] uppercase tracking-[0.12em] text-silver/50">
            Explored
          </span>
          <span className="font-[family-name:var(--font-display)] text-xs font-light tabular-nums text-gold/70">
            {revealPct}%
          </span>
        </div>
        <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-[rgba(200,168,76,0.06)]">
          <div
            className="h-full rounded-full bg-gold/30 transition-[width] duration-700"
            style={{ width: `${revealPct}%` }}
          />
        </div>
      </div>

      {/* Team count */}
      <div className="animate-enter-delay-1 rounded-lg border border-[rgba(200,168,76,0.04)] bg-[rgba(6,6,8,0.6)] px-3 py-2 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-1.5 rounded-full bg-gold shadow-[0_0_4px_rgba(200,168,76,0.4)]" />
          <span className="text-[0.6875rem] text-silver/60">
            {activeTeams}/{snapshot.teams.length} teams active
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Waypoint trail ────────────────────────────────────────────────────

function WaypointTrail({ team, isFocused }: { team: RaidTeamMarker; isFocused: boolean }) {
  if (!isFocused || team.state === "defeated") return null;

  const style = GOAL_STYLE[team.goal] ?? GOAL_STYLE.exploring;
  const pos = worldToGrid(team.x, team.y);

  // Draw crosshair lines from team position
  return (
    <div
      className="pointer-events-none absolute z-[5] -translate-x-1/2 -translate-y-1/2"
      style={{ left: pos.left, top: pos.top }}
    >
      {/* Horizontal scan line */}
      <motion.div
        className="absolute top-0 h-px w-[600px] -translate-x-1/2 -translate-y-px"
        style={{
          background: `linear-gradient(90deg, transparent 0%, ${style.ring} 40%, ${style.ring} 60%, transparent 100%)`,
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: [0.15, 0.3, 0.15] }}
        transition={{ duration: 3, repeat: Infinity }}
      />
      {/* Vertical scan line */}
      <motion.div
        className="absolute left-0 h-[600px] w-px -translate-x-px -translate-y-1/2"
        style={{
          background: `linear-gradient(180deg, transparent 0%, ${style.ring} 40%, ${style.ring} 60%, transparent 100%)`,
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: [0.15, 0.3, 0.15] }}
        transition={{ duration: 3, repeat: Infinity }}
      />
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
      {/* Atmospheric background */}
      <div className="absolute inset-0 bg-[#060810]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(26,36,64,0.15)_0%,transparent_60%)]" />
      <div className="absolute inset-0 raid-scanlines" />

      {/* Map container — centered with zoom */}
      <div
        className="relative transition-transform duration-300 ease-out"
        style={{
          width: gridSizePx,
          height: gridSizePx,
          transform: `scale(${zoom})`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Grid border frame */}
        <div className="absolute -inset-1 rounded border border-[rgba(200,168,76,0.04)]" />

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
            <FeatureMarkerElement key={feature.id} feature={feature} />
          ))}
        </AnimatePresence>

        {/* Enemy markers */}
        <AnimatePresence>
          {discoveredEnemies.map((enemy) => (
            <EnemyMarkerElement key={enemy.id} enemy={enemy} />
          ))}
        </AnimatePresence>

        {/* Team markers */}
        {snapshot.teams.map((team) => (
          <TeamMarkerElement
            key={team.teamId}
            team={team}
            isFocused={team.teamId === focusedTeamId}
            onClick={() => handleTeamClick(team)}
          />
        ))}
      </div>

      {/* Map overlay info (top-right of this area) */}
      <div className="pointer-events-none absolute inset-0 p-4">
        <MapOverlayHeader snapshot={snapshot} revealPct={revealPct} />
      </div>
    </div>
  );
}

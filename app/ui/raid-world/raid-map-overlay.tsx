/**
 * Glass overlay for raid map status information.
 *
 * Renders on top of the full-screen raid canvas. Shows the
 * dungeon name, contract status, and fog discovery progress.
 *
 * Presentation-only — reads the RaidWorldSnapshot, never mutates state.
 */

import type { RaidWorldSnapshot } from "render";

// ── Helpers ──────────────────────────────────────────────────────────────

function computeRevealPercent(snapshot: RaidWorldSnapshot): number {
  if (snapshot.fogMask.length === 0) return 0;
  const revealed = snapshot.fogMask.filter((c) => c.revealed).length;
  return Math.round((revealed / snapshot.fogMask.length) * 100);
}

// ── Component ────────────────────────────────────────────────────────────

interface RaidMapOverlayProps {
  snapshot: RaidWorldSnapshot;
}

export function RaidMapOverlay({ snapshot }: RaidMapOverlayProps) {
  const revealPct = computeRevealPercent(snapshot);
  const teamCount = snapshot.teams.length;
  const activeTeams = snapshot.teams.filter((t) => t.state === "active").length;

  return (
    <div className="pointer-events-none absolute right-4 top-20 flex flex-col items-end gap-2">
      {/* Dungeon info chip */}
      <div className="glass-card pointer-events-auto animate-enter px-3 py-2">
        <p className="text-xs font-medium uppercase tracking-[0.15em] text-gold/80">
          {snapshot.dungeonName}
        </p>
        <p className="mt-0.5 text-[0.6875rem] text-silver/50">Contract Site</p>
      </div>

      {/* Discovery progress */}
      <div className="glass-card pointer-events-auto animate-enter-delay-1 px-3 py-2">
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
            className="h-full rounded-full bg-gold/30 transition-[width] duration-500"
            style={{ width: `${revealPct}%` }}
          />
        </div>
      </div>

      {/* Team count */}
      <div className="glass-card pointer-events-auto animate-enter-delay-1 px-3 py-2">
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-1.5 rounded-full bg-gold shadow-[0_0_4px_rgba(200,168,76,0.4)]" />
          <span className="text-[0.6875rem] text-silver/60">
            {activeTeams}/{teamCount} teams active
          </span>
        </div>
      </div>
    </div>
  );
}

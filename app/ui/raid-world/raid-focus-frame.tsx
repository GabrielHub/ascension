/**
 * Focus-mode visual frame for raid team inspection.
 *
 * When a team is clicked in the raid map, this overlay renders
 * a glass panel with the team's current state, goal, member list,
 * and optional combat encounter display.
 *
 * Portraits and enemy visuals are surfaced here, not in the base map.
 *
 * Presentation-only — typed intents, no gameplay mutation.
 */

import type { RaidTeamMarker } from "render";

import { getIdentifierLabel, getRoleMeta } from "../_glossary";
import { GoalCheckBadge, TranscriptEventLine } from "../transcript-event-display";
import type { RaidFocusedTeamDetail } from "../view-models";
import { getRaidGoalPresentation } from "./raid-goals";

// ── Types for enriched focus data ─────────────────────────────────────

export type OperatorReadiness = "ready" | "injured" | "fatigued" | "critical";

export interface FocusOperatorStatus {
  operatorId: string;
  readiness: OperatorReadiness;
  /** 0..1 health fraction, if available from runtime. */
  healthFraction: number | null;
  /** Operator field role tag, e.g. "field_lead", "scout", "medic". */
  roleTag: string | null;
}

export type EncounterThreat = "generic" | "elite" | "boss";

export interface FocusEncounter {
  enemyLabel: string;
  threat: EncounterThreat;
  /** 0..1 enemy health fraction. */
  healthFraction: number;
}

const STATE_DISPLAY: Record<string, { label: string; badge: string }> = {
  active: { label: "Active", badge: "badge-gold" },
  returning: { label: "Returning", badge: "badge-slate" },
  defeated: { label: "Defeated", badge: "badge-ember" },
};

const READINESS_STYLE: Record<OperatorReadiness, { dot: string; text: string }> = {
  ready: { dot: "bg-gold/60", text: "text-silver/70" },
  injured: { dot: "bg-ember", text: "text-ember/80" },
  fatigued: { dot: "bg-smolder", text: "text-silver/50" },
  critical: { dot: "bg-magma", text: "text-magma" },
};

const THREAT_STYLE: Record<EncounterThreat, { badge: string; label: string }> = {
  generic: { badge: "badge-slate", label: "Threat" },
  elite: { badge: "badge-ember", label: "Elite" },
  boss: { badge: "badge-ember", label: "Boss" },
};

// ── Sub-components ────────────────────────────────────────────────────────

function HealthBar({ fraction, accent }: { fraction: number; accent: string }) {
  const pct = Math.round(Math.max(0, Math.min(1, fraction)) * 100);
  return (
    <div className="h-1 w-12 overflow-hidden rounded-full bg-[rgba(200,168,76,0.06)]">
      <div
        className={`h-full rounded-full transition-[width] duration-300 ${accent}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function OperatorLine({
  operatorId,
  name,
  status,
}: {
  operatorId: string;
  name: string | null;
  status: FocusOperatorStatus | undefined;
}) {
  const readiness = status?.readiness ?? "ready";
  const style = READINESS_STYLE[readiness];
  const roleLabel = status?.roleTag ? getRoleMeta(`role:${status.roleTag}`) : null;

  return (
    <div className="flex items-center gap-2 py-0.5">
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${style.dot}`} />
      <span className={`flex-1 truncate text-xs ${style.text}`}>
        {name ?? getIdentifierLabel(operatorId)}
      </span>
      {roleLabel && (
        <span className="text-xs uppercase tracking-wider text-silver/40">
          {roleLabel.shortLabel ?? roleLabel.label}
        </span>
      )}
      {status?.healthFraction != null && (
        <HealthBar
          fraction={status.healthFraction}
          accent={
            readiness === "critical"
              ? "bg-magma"
              : readiness === "injured"
                ? "bg-ember"
                : "bg-gold/40"
          }
        />
      )}
    </div>
  );
}

function EncounterCard({ encounter }: { encounter: FocusEncounter }) {
  const threat = THREAT_STYLE[encounter.threat];
  const hpPct = Math.round(Math.max(0, Math.min(1, encounter.healthFraction)) * 100);

  return (
    <div className="flex items-center gap-2 rounded-lg border border-[rgba(212,84,30,0.08)] bg-[rgba(212,84,30,0.04)] px-3 py-2">
      {/* Threat diamond icon */}
      <svg width="12" height="12" viewBox="0 0 12 12" className="shrink-0">
        <path
          d="M6 1L11 6L6 11L1 6Z"
          fill="rgba(212,84,30,0.6)"
          stroke="rgba(212,84,30,0.9)"
          strokeWidth="0.8"
        />
        <circle cx="6" cy="6" r="1.5" fill="rgba(212,84,30,0.9)" />
      </svg>
      <div className="flex-1">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium text-silver/80">{encounter.enemyLabel}</span>
          <span className={`badge text-xs ${threat.badge}`}>{threat.label}</span>
        </div>
        <div className="mt-1 flex items-center gap-1.5">
          <div className="h-1 flex-1 overflow-hidden rounded-full bg-[rgba(212,84,30,0.08)]">
            <div
              className="h-full rounded-full bg-ember transition-[width] duration-300"
              style={{ width: `${hpPct}%` }}
            />
          </div>
          <span className="text-xs tabular-nums text-ember/60">{hpPct}%</span>
        </div>
      </div>
    </div>
  );
}

function FocusedTranscriptStream({ detail }: { detail: RaidFocusedTeamDetail }) {
  const visible = detail.events.slice(-10).reverse();
  const goalCheckSummary = detail.goalChecks;

  return (
    <div className="mt-3 space-y-2 border-t border-[rgba(200,168,76,0.04)] pt-3">
      <p className="text-sm font-medium uppercase tracking-[0.12em] text-gold/60">Transcript</p>

      {/* Goal check summary badges */}
      {goalCheckSummary.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {goalCheckSummary.map((gc, i) => {
            const badgeCls =
              gc.grade === "pass"
                ? "border-[rgba(200,168,76,0.2)] bg-[rgba(200,168,76,0.08)] text-gold/80"
                : gc.grade === "mixed"
                  ? "border-[rgba(180,180,180,0.15)] bg-[rgba(180,180,180,0.06)] text-silver/70"
                  : "border-[rgba(212,84,30,0.2)] bg-[rgba(212,84,30,0.08)] text-ember/80";
            return (
              <span
                key={`${gc.kind}-${i}`}
                className={`inline-flex items-center gap-1 rounded-sm border px-1.5 py-0.5 text-xs`}
                style={{ borderColor: undefined }}
              >
                <span className={badgeCls}>{gc.kind}</span>
                <GoalCheckBadge grade={gc.grade} />
              </span>
            );
          })}
        </div>
      )}

      {/* Enemies encountered */}
      {detail.enemiesEncountered.length > 0 && (
        <div className="flex flex-wrap gap-1">
          <span className="text-xs font-medium uppercase tracking-wider text-ember/50">
            Hostiles:
          </span>
          <span className="text-xs text-silver/50">
            {detail.enemiesEncountered.length} encountered
          </span>
        </div>
      )}

      {/* Scrollable event stream */}
      <div className="max-h-36 space-y-0.5 overflow-y-auto rounded-md bg-[rgba(6,6,8,0.25)] px-2 py-1">
        {visible.length > 0 ? (
          visible.map((evt, i) => (
            <TranscriptEventLine key={`${evt.tickOffset}-${i}`} event={evt} />
          ))
        ) : (
          <p className="py-1 text-xs text-silver/40">Awaiting events...</p>
        )}
      </div>
    </div>
  );
}

// ── Component ────────────────────────────────────────────────────────────

interface RaidFocusFrameProps {
  team: RaidTeamMarker;
  /** Operator name lookup. Returns name or null for unknown ids. */
  getOperatorName: (id: string) => string | null;
  /** Per-operator status data, keyed by operator id. */
  operatorStatuses?: ReadonlyMap<string, FocusOperatorStatus>;
  /** Active combat encounter, if the team is currently fighting. */
  encounter?: FocusEncounter | null;
  /** Transcript-backed focused team detail, when a RaidRun is available. */
  focusedDetail?: RaidFocusedTeamDetail | null;
  onDismiss: () => void;
}

export function RaidFocusFrame({
  team,
  getOperatorName,
  operatorStatuses,
  encounter,
  focusedDetail,
  onDismiss,
}: RaidFocusFrameProps) {
  const goal = getRaidGoalPresentation(team.goal);
  const state = STATE_DISPLAY[team.state] ?? STATE_DISPLAY.active;
  const inCombat = encounter != null && encounter.healthFraction > 0;

  return (
    <div className="glass-card pointer-events-auto animate-enter w-72 p-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-xs font-medium uppercase tracking-[0.15em] text-gold/80">
            Team Focus
          </h3>
          <p className="mt-1 text-sm text-silver/60">{team.operatorIds.length} operators</p>
        </div>
        <div className="flex items-center gap-1.5">
          {inCombat && <span className="badge badge-ember animate-pulse text-xs">In Combat</span>}
          <span className={`badge ${state.badge}`}>{state.label}</span>
          <button type="button" className="btn-ghost text-xs" onClick={onDismiss}>
            &times;
          </button>
        </div>
      </div>

      {/* Goal */}
      <div
        className="mt-3 flex items-center gap-2 rounded-lg border px-3 py-2"
        style={{ backgroundColor: goal.chipBackground, borderColor: goal.chipBorder }}
      >
        <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: goal.color }} />
        <span className="text-xs font-medium" style={{ color: goal.color }}>
          {goal.label}
        </span>
      </div>

      {/* Active encounter */}
      {encounter && encounter.healthFraction > 0 && (
        <div className="mt-3 space-y-1.5 border-t border-[rgba(212,84,30,0.06)] pt-3">
          <p className="text-sm font-medium uppercase tracking-[0.12em] text-ember/60">Encounter</p>
          <EncounterCard encounter={encounter} />
        </div>
      )}

      {/* Transcript-backed event stream */}
      {focusedDetail && <FocusedTranscriptStream detail={focusedDetail} />}

      {/* Team members */}
      <div className="mt-3 space-y-1 border-t border-[rgba(200,168,76,0.04)] pt-3">
        <p className="text-sm font-medium uppercase tracking-[0.12em] text-silver/50">Operators</p>
        {team.operatorIds.map((id) => (
          <OperatorLine
            key={id}
            operatorId={id}
            name={getOperatorName(id)}
            status={operatorStatuses?.get(id)}
          />
        ))}
      </div>

      {/* Position info */}
      <div className="mt-3 border-t border-[rgba(200,168,76,0.04)] pt-2">
        <p className="text-sm tabular-nums text-silver/40">
          Position: {Math.round(team.x)}, {Math.round(team.y)}
        </p>
      </div>
    </div>
  );
}

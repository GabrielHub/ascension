import { useMemo, useState } from "react";

import { OPERATOR_TIPS, RAID_TIPS, getRoleMeta, getSpecialtyMeta } from "./_glossary";
import { OperatorPortrait } from "./operator-portrait";
import { emptyStateClass, emptyStateIconClass } from "./styles";
import { TranscriptEventLine } from "./transcript-event-display";
import type { ActiveRaidViewModel, OperatorViewModel, RaidTranscriptEvent } from "./view-models";

interface RaidWatchProps {
  activeRaids: readonly ActiveRaidViewModel[];
  /** Full operator list for raid-context portrait rendering with gear overlays. */
  operators: readonly OperatorViewModel[];
  /** For testing: seed the initial selection state. */
  defaultSelectedRaidId?: string;
  /** When present, sync map focus into the selected raid card. */
  selectedRaidId?: string | null;
}

// ── Compact deployed portrait (used in zoomed-out card list) ─────────────

function DeployedOperatorPortrait({ op }: { op: OperatorViewModel }) {
  const isDead = op.lifecycle.status === "dead";
  return (
    <div className="flex flex-col items-center gap-0.5" title={op.name}>
      <div className="relative">
        <OperatorPortrait
          name={op.name}
          roleTag={op.roleTag}
          presetId={op.appearancePresetId}
          size="roster"
          visibleGear={op.visibleGear}
        />
        {isDead && <div className="absolute inset-0 rounded bg-void/50" />}
      </div>
      <span
        className={`max-w-[5rem] truncate text-[0.6875rem] ${
          isDead ? "text-magma line-through" : "text-silver/60"
        }`}
      >
        {op.name}
      </span>
      {isDead && <span className="text-[0.6875rem] font-medium text-magma">KIA</span>}
    </div>
  );
}

function TranscriptEventStream({ events }: { events: readonly RaidTranscriptEvent[] }) {
  // Show last 8 events, most recent on top
  const visible = events.slice(-8).reverse();
  return (
    <div className="mt-2 max-h-32 space-y-0.5 overflow-y-auto rounded-md bg-[rgba(6,6,8,0.3)] px-2 py-1.5">
      {visible.map((evt, i) => (
        <TranscriptEventLine key={`${evt.tickOffset}-${i}`} event={evt} />
      ))}
    </div>
  );
}

// ── Clickable raid card (zoomed-out tactical readability) ────────────────

function ActiveRaidCard({
  raid,
  operatorMap,
  isSelected,
  onSelect,
}: {
  raid: ActiveRaidViewModel;
  operatorMap: ReadonlyMap<string, OperatorViewModel>;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const progressPct = Math.min(100, Math.max(0, raid.revealProgress));
  const deployedOps = raid.operatorIds
    .map((id) => operatorMap.get(id))
    .filter((op): op is OperatorViewModel => op !== undefined);
  const casualtyCount = deployedOps.filter((op) => op.lifecycle.status === "dead").length;

  return (
    <button
      type="button"
      data-selected={isSelected || undefined}
      className={`glass-card w-full cursor-pointer p-4 text-left transition-all ${
        isSelected ? "ring-1 ring-gold/30 shadow-[0_0_16px_rgba(200,168,76,0.1)]" : ""
      }`}
      onClick={onSelect}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <h4 className="text-sm font-medium text-silver-bright">{raid.missionName}</h4>
          {raid.location && <p className="mt-0.5 text-xs text-silver/60">{raid.location}</p>}
        </div>
        <span className="badge badge-ember">Active</span>
      </div>

      <div className="mt-2 flex items-center gap-3 text-xs text-gold/70">
        {raid.operatorIds.length > 0 && <span>{raid.operatorIds.length} operators deployed</span>}
        {raid.threat > 0 && <span title={RAID_TIPS.threat}>Threat {raid.threat}</span>}
        {raid.cohesion > 0 && (
          <span title={RAID_TIPS.cohesion}>Cohesion {Math.round(raid.cohesion)}</span>
        )}
        {raid.durationHours > 0 && <span title={RAID_TIPS.duration}>{raid.durationHours}h</span>}
        {casualtyCount > 0 && (
          <span className="text-magma">
            {casualtyCount} {casualtyCount === 1 ? "casualty" : "casualties"}
          </span>
        )}
      </div>

      {/* Deployed operator portraits — raid context with visible gear */}
      {deployedOps.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {deployedOps.map((op) => (
            <DeployedOperatorPortrait key={op.id} op={op} />
          ))}
        </div>
      )}

      <div className="mt-3" title={RAID_TIPS.revealProgress}>
        <div className="flex items-center justify-between text-xs">
          <span className="uppercase tracking-wider text-gold/70">Reveal Progress</span>
          <span className="tabular-nums text-ember">{Math.round(progressPct)}%</span>
        </div>
        <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-[rgba(6,6,8,0.6)]">
          <div
            className="h-full rounded-full bg-ember/60 transition-all duration-700"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Transcript event stream — shown when RaidRun data is available */}
      {raid.transcriptEvents && raid.transcriptEvents.length > 0 && (
        <TranscriptEventStream events={raid.transcriptEvents} />
      )}
    </button>
  );
}

// ── Inspection row (detailed per-operator view in focused panel) ─────────

function OperatorInspectionRow({ op }: { op: OperatorViewModel }) {
  const isDead = op.lifecycle.status === "dead";

  return (
    <div
      className={`flex items-center gap-3 rounded-lg bg-[rgba(6,6,8,0.3)] px-3 py-2 ${
        isDead ? "opacity-60" : ""
      }`}
    >
      <div className="flex-shrink-0">
        <OperatorPortrait
          name={op.name}
          roleTag={op.roleTag}
          presetId={op.appearancePresetId}
          size="roster"
          visibleGear={op.visibleGear}
        />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span
            className={`text-xs font-medium ${
              isDead ? "text-magma line-through" : "text-silver-bright"
            }`}
          >
            {op.name}
          </span>
          {(() => {
            const role = getRoleMeta(op.roleTag);
            return (
              <span className="text-[0.6875rem] text-gold/70" title={role.tip}>
                {role.label}
              </span>
            );
          })()}
          {op.specialtyTag &&
            (() => {
              const spec = getSpecialtyMeta(op.specialtyTag);
              return (
                <span className="text-[0.6875rem] text-silver/60" title={spec.tip}>
                  {spec.label}
                </span>
              );
            })()}
          {isDead && <span className="text-[0.6875rem] font-medium text-magma">KIA</span>}
          {!isDead && op.injurySeverity > 0 && (
            <span className="text-[0.6875rem] text-ember">Injured</span>
          )}
        </div>

        {!isDead && (
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[0.6875rem]">
            <span className="text-silver/60" title={OPERATOR_TIPS.morale}>
              Morale{" "}
              <span
                className={`tabular-nums ${op.moraleCurrent < 30 ? "text-ember" : "text-silver/80"}`}
              >
                {op.moraleCurrent}
              </span>
            </span>
            <span className="text-silver/60" title={OPERATOR_TIPS.loyalty}>
              Loyalty{" "}
              <span
                className={`tabular-nums ${op.loyaltyCurrent < 30 ? "text-ember" : "text-silver/80"}`}
              >
                {op.loyaltyCurrent}
              </span>
            </span>
            <span className="text-silver/60" title={OPERATOR_TIPS.readiness}>
              Readiness <span className="tabular-nums text-silver/80">{op.readinessScore}</span>
            </span>
            {op.needFatigue > 40 && (
              <span className="text-ember" title={OPERATOR_TIPS.fatigue}>
                Fatigue {op.needFatigue}
              </span>
            )}
            {op.needStress > 40 && (
              <span className="text-ember" title={OPERATOR_TIPS.stress}>
                Stress {op.needStress}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Team inspection panel (focused detail for selected raid) ─────────────

function RaidTeamInspection({
  raid,
  operatorMap,
}: {
  raid: ActiveRaidViewModel;
  operatorMap: ReadonlyMap<string, OperatorViewModel>;
}) {
  const deployedOps = raid.operatorIds
    .map((id) => operatorMap.get(id))
    .filter((op): op is OperatorViewModel => op !== undefined);

  const livingCount = deployedOps.filter((op) => op.lifecycle.status === "active").length;
  const casualtyCount = deployedOps.length - livingCount;

  const roleBreakdown = new Map<string, { count: number; tip: string }>();
  for (const op of deployedOps) {
    const meta = getRoleMeta(op.roleTag);
    const existing = roleBreakdown.get(meta.label);
    roleBreakdown.set(meta.label, {
      count: (existing?.count ?? 0) + 1,
      tip: meta.tip,
    });
  }

  return (
    <div data-testid="raid-team-inspection" className="glass-card-inset mt-1 space-y-4 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-medium uppercase tracking-[0.15em] text-gold/80">
          Team Inspection
        </h4>
        <div className="flex items-center gap-2 text-xs text-silver/60">
          <span>{livingCount} active</span>
          {casualtyCount > 0 && <span className="text-magma">{casualtyCount} KIA</span>}
        </div>
      </div>

      {/* Team summary */}
      <div className="flex flex-wrap gap-3 text-xs">
        {raid.threat > 0 && (
          <div className="flex items-baseline gap-1" title={RAID_TIPS.threat}>
            <span className="text-gold/70">Threat</span>
            <span className="tabular-nums text-silver-bright">{raid.threat}</span>
          </div>
        )}
        {raid.cohesion > 0 && (
          <div className="flex items-baseline gap-1" title={RAID_TIPS.cohesion}>
            <span className="text-gold/70">Cohesion</span>
            <span className="tabular-nums text-silver-bright">{Math.round(raid.cohesion)}</span>
          </div>
        )}
        {raid.durationHours > 0 && (
          <div className="flex items-baseline gap-1" title={RAID_TIPS.duration}>
            <span className="text-gold/70">Duration</span>
            <span className="tabular-nums text-silver-bright">{raid.durationHours}h</span>
          </div>
        )}
        {Array.from(roleBreakdown.entries()).map(([role, { count, tip }]) => (
          <div key={role} className="flex items-baseline gap-1" title={tip}>
            <span className="text-gold/70">{role}</span>
            <span className="tabular-nums text-silver-bright">{count}</span>
          </div>
        ))}
      </div>

      {/* Per-operator inspection rows */}
      {deployedOps.length > 0 ? (
        <div className="space-y-2">
          {deployedOps.map((op) => (
            <OperatorInspectionRow key={op.id} op={op} />
          ))}
        </div>
      ) : (
        <p className="text-xs text-silver/60">No operator data available for this team</p>
      )}
    </div>
  );
}

// ── Main RaidWatch component ─────────────────────────────────────────────

export function RaidWatch({
  activeRaids,
  operators,
  defaultSelectedRaidId,
  selectedRaidId,
}: RaidWatchProps) {
  const [rawSelectedId, setRawSelectedId] = useState<string | null>(defaultSelectedRaidId ?? null);

  const operatorMap = useMemo(() => new Map(operators.map((op) => [op.id, op])), [operators]);
  const activeRaidIds = new Set(activeRaids.map((r) => r.id));

  // Derived selection: clears automatically when the focused raid disappears
  const effectiveSelectedRaidId = selectedRaidId ?? rawSelectedId;
  const normalizedSelectedRaidId =
    effectiveSelectedRaidId !== null && activeRaidIds.has(effectiveSelectedRaidId)
      ? effectiveSelectedRaidId
      : null;
  const selectedRaid = normalizedSelectedRaidId
    ? (activeRaids.find((r) => r.id === normalizedSelectedRaidId) ?? null)
    : null;

  function handleSelectRaid(raidId: string) {
    setRawSelectedId((prev) => (prev === raidId ? null : raidId));
  }

  if (activeRaids.length === 0) {
    return (
      <div
        className={`${emptyStateClass} rounded-lg border border-dashed border-gold-dim/15 py-10`}
      >
        <div className={emptyStateIconClass}>&mdash;</div>
        <p className="text-xs font-medium text-gold/70">No active raids</p>
        <p className="mt-1 text-xs text-silver/60">Operators are currently between operations</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-medium uppercase tracking-[0.15em] text-ember">
        Active Operations ({activeRaids.length})
      </h3>
      {activeRaids.map((raid) => (
        <ActiveRaidCard
          key={raid.id}
          raid={raid}
          operatorMap={operatorMap}
          isSelected={raid.id === normalizedSelectedRaidId}
          onSelect={() => handleSelectRaid(raid.id)}
        />
      ))}
      {selectedRaid && <RaidTeamInspection raid={selectedRaid} operatorMap={operatorMap} />}
    </div>
  );
}

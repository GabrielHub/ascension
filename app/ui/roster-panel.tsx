import { type ReactNode } from "react";

import { type PolicyState } from "lib/policies";

import type { OperatorViewModel, RosterPressureViewModel, VisitorViewModel } from "./view-models";
import { Tooltip } from "./_tooltip";
import { getRosterFlowSurfaceSummary } from "./policy-summaries";
import { getRoleMeta, getSpecialtyMeta } from "./_glossary";

interface RosterPanelProps {
  operators: readonly OperatorViewModel[];
  visitors: readonly VisitorViewModel[];
  rosterPressure: RosterPressureViewModel;
  policies: PolicyState;
  focusedOperatorId?: string | null;
  focusedVisitorId?: string | null;
  onSelectOperator?: (operatorId: string) => void;
  onSelectVisitor?: (visitorId: string) => void;
}

// ── Helpers ──────────────────────────────────────────────────────────────

function statusDotColor(op: OperatorViewModel): string {
  if (op.lifecycle.status === "departed") return "bg-silver/15";
  if (op.lifecycle.status === "dead") return "bg-magma";
  if (op.injurySeverity > 0) return "bg-ember";
  if (op.assignmentKind === "raid") return "bg-smolder";
  if (op.assignmentKind === "recovery") return "bg-gold-dim/60";
  if (op.assignmentKind === "room") return "bg-gold shadow-[0_0_4px_rgba(200,168,76,0.3)]";
  return "bg-silver/30";
}

function statusLabel(op: OperatorViewModel): string {
  if (op.lifecycle.status === "departed") {
    return op.lifecycle.departureReason ? `Departed (${op.lifecycle.departureReason})` : "Departed";
  }
  if (op.lifecycle.status === "dead") return "Killed in action";
  if (op.injurySeverity > 0) return `Injured (${Math.ceil(op.injuryRecoveryHours)}h)`;
  if (op.assignmentKind === "raid") return "On raid";
  if (op.assignmentKind === "recovery") return "Recovering";
  if (op.assignmentKind === "room") return "On duty";
  return "Idle";
}

function statusLabelClass(op: OperatorViewModel): string {
  if (op.lifecycle.status === "departed") return "text-silver/35";
  if (op.lifecycle.status === "dead") return "text-magma";
  if (op.injurySeverity > 0) return "text-ember";
  if (op.assignmentKind === "raid") return "text-smolder";
  return "text-silver/50";
}

// ── Operator compact row ─────────────────────────────────────────────────

function OperatorRow({
  op,
  isFocused,
  onSelect,
}: {
  op: OperatorViewModel;
  isFocused: boolean;
  onSelect: () => void;
}) {
  return (
    <div data-testid="operator-row" data-operator-id={op.id}>
      <button
        type="button"
        onClick={onSelect}
        className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left transition-all duration-200 ${
          isFocused
            ? "bg-[rgba(200,168,76,0.06)] shadow-[inset_2px_0_0_var(--color-gold)]"
            : "hover:bg-[rgba(200,168,76,0.03)]"
        }`}
      >
        <div className={`h-1.5 w-1.5 shrink-0 rounded-full ${statusDotColor(op)}`} />
        <span className="min-w-0 truncate text-xs font-medium text-silver-bright">{op.name}</span>
        {op.quitRisk && (
          <Tooltip content="Critical morale — may leave the team" side="top">
            <span className="shrink-0 text-xs text-magma">!</span>
          </Tooltip>
        )}
        {op.retentionRisk && !op.quitRisk && (
          <Tooltip content="Low loyalty — retention at risk" side="top">
            <span className="shrink-0 text-xs text-ember">!</span>
          </Tooltip>
        )}
        <span className="badge badge-gold ml-auto shrink-0">{getRoleMeta(op.roleTag).label}</span>
        <span className={`shrink-0 text-sm ${statusLabelClass(op)}`}>{statusLabel(op)}</span>
      </button>
    </div>
  );
}

// ── Fallen operator (memorial line) ──────────────────────────────────────

function FallenRow({ op }: { op: OperatorViewModel }) {
  return (
    <div className="flex items-center gap-2 px-2.5 py-1 opacity-60">
      <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-magma/50" />
      <span className="min-w-0 truncate text-xs text-silver/50 line-through">{op.name}</span>
      <Tooltip content="Killed in action" side="top">
        <span className="ml-auto text-sm text-magma/70">KIA</span>
      </Tooltip>
    </div>
  );
}

// ── Visitor row (compact, branches into cascade) ─────────────────────────

export function VisitorRow({
  visitor,
  isFocused = false,
  onSelect,
}: {
  visitor: VisitorViewModel;
  isFocused?: boolean;
  onSelect?: () => void;
}) {
  const patienceHours = Math.max(0, Math.ceil(visitor.patience / 60));
  const metaLine =
    visitor.queueState === "deferred" ? "Deferred reserve" : `${patienceHours}h patience`;
  const specialtyLabel = getSpecialtyMeta(
    visitor.specialtyTag || `focus:${visitor.desiredRoleTag.replace(/^role:/, "")}`,
  ).label;

  const content = (
    <>
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <span className="truncate text-xs font-medium text-silver-bright">{visitor.name}</span>
          <span className="ml-1.5 text-xs text-gold/60">
            {getRoleMeta(visitor.desiredRoleTag).label}
          </span>
          {visitor.queueState === "deferred" && (
            <span className="ml-1.5 rounded-full border border-gold/20 bg-gold/10 px-1.5 py-0.5 text-xs uppercase tracking-[0.12em] text-gold/70">
              Deferred
            </span>
          )}
        </div>
        <span className="shrink-0 text-xs uppercase tracking-[0.12em] text-gold/60">
          {visitor.canAccept ? "Recruit" : visitor.canReplace ? "Replace" : "Full"}
        </span>
      </div>
      <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-silver/50">
        <span>{specialtyLabel}</span>
        <span className="opacity-30">·</span>
        <span>Q{Math.round(visitor.quality)}</span>
        <span className="opacity-30">·</span>
        <span>{metaLine}</span>
      </div>
    </>
  );

  return (
    <div data-testid="visitor-row" data-visitor-id={visitor.id}>
      {onSelect ? (
        <button
          type="button"
          data-testid="visitor-open"
          data-visitor-id={visitor.id}
          onClick={onSelect}
          className={`flex w-full flex-col rounded-lg px-2.5 py-1.5 text-left transition-all duration-200 ${
            isFocused
              ? "bg-[rgba(200,168,76,0.06)] shadow-[inset_2px_0_0_var(--color-gold)]"
              : "hover:bg-[rgba(200,168,76,0.03)]"
          }`}
        >
          {content}
        </button>
      ) : (
        <div className="rounded-lg px-2.5 py-1.5">{content}</div>
      )}
    </div>
  );
}

// ── Section header ───────────────────────────────────────────────────────

function SectionHeader({
  label,
  meta,
  tip,
  dim = false,
}: {
  label: string;
  meta?: ReactNode;
  tip?: string;
  dim?: boolean;
}) {
  const labelNode = (
    <span
      className={`text-xs font-medium uppercase tracking-[0.15em] ${
        dim ? "text-silver/30" : "text-gold/70"
      }`}
    >
      {label}
    </span>
  );
  return (
    <div className="flex items-center justify-between gap-2 px-1">
      {tip ? <Tooltip content={tip}>{labelNode}</Tooltip> : labelNode}
      {meta && <span className="text-xs">{meta}</span>}
    </div>
  );
}

// ── Main panel ───────────────────────────────────────────────────────────

export function RosterPanel({
  operators,
  visitors,
  rosterPressure,
  policies,
  focusedOperatorId = null,
  focusedVisitorId = null,
  onSelectOperator,
  onSelectVisitor,
}: RosterPanelProps) {
  const livingOperators = operators.filter((op) => op.lifecycle.status === "active");
  const fallenOperators = operators.filter((op) => op.lifecycle.status === "dead");
  const activeVisitors = visitors.filter((visitor) => visitor.queueState === "active");
  const deferredVisitors = visitors.filter((visitor) => visitor.queueState === "deferred");
  const rosterFlowSummary = getRosterFlowSurfaceSummary(policies.rosterFlow);

  return (
    <div className="animate-enter space-y-3" data-testid="roster-panel">
      {rosterPressure.replacementPressureLevel !== "stable" && (
        <div
          className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm ${
            rosterPressure.replacementPressureLevel === "critical"
              ? "bg-magma/8 text-magma shadow-[inset_2px_0_0_var(--color-magma)]"
              : "bg-ember/6 text-ember shadow-[inset_2px_0_0_var(--color-ember)]"
          }`}
        >
          {rosterPressure.replacementPressureLevel === "critical"
            ? "Roster critical"
            : "Roster strained"}
          {rosterPressure.vacancyCount > 0 && (
            <span className="ml-auto text-silver/40">
              {rosterPressure.vacancyCount}{" "}
              {rosterPressure.vacancyCount === 1 ? "vacancy" : "vacancies"}
            </span>
          )}
        </div>
      )}

      <section>
        <SectionHeader
          label="Operators"
          tip="Active operators / maximum capacity"
          meta={
            <span
              data-testid="roster-operators-count"
              className={`tabular-nums ${
                rosterPressure.replacementPressureLevel === "critical"
                  ? "text-ember"
                  : rosterPressure.replacementPressureLevel === "strained"
                    ? "text-smolder"
                    : "text-gold/60"
              }`}
            >
              {rosterPressure.livingOperatorCount}/{rosterPressure.operatorCapacity}
            </span>
          }
        />
        {livingOperators.length > 0 ? (
          <div className="mt-1 space-y-0.5">
            {livingOperators.map((op) => (
              <OperatorRow
                key={op.id}
                op={op}
                isFocused={focusedOperatorId === op.id}
                onSelect={() => onSelectOperator?.(op.id)}
              />
            ))}
          </div>
        ) : (
          <p className="mt-1 px-2.5 py-2 text-sm text-silver/40">
            No operators yet. Recruit talent through your facilities.
          </p>
        )}
      </section>

      {fallenOperators.length > 0 && (
        <section>
          <SectionHeader label={`Fallen (${fallenOperators.length})`} dim />
          <div className="mt-1">
            {fallenOperators.map((op) => (
              <FallenRow key={op.id} op={op} />
            ))}
          </div>
        </section>
      )}

      <section data-testid="roster-visitors">
        <SectionHeader
          label={`Visitors (${activeVisitors.length})`}
          tip="Potential recruits passing through. Accept to add as operators"
          meta={
            rosterPressure.vacancyCount > 0 ? (
              <span className="text-ember/70">{rosterPressure.vacancyCount} to fill</span>
            ) : activeVisitors.length > 0 ? (
              <span className="text-silver/35">Roster full</span>
            ) : null
          }
        />
        <p className="mt-1 px-2.5 text-xs text-silver/50">
          Recruitment: <span className="text-gold/80">{rosterFlowSummary.label}</span>
        </p>
        {activeVisitors.length > 0 ? (
          <div className="space-y-0.5">
            {activeVisitors.map((v) => (
              <VisitorRow
                key={v.id}
                visitor={v}
                isFocused={focusedVisitorId === v.id}
                onSelect={onSelectVisitor ? () => onSelectVisitor(v.id) : undefined}
              />
            ))}
          </div>
        ) : (
          <p className="px-2.5 py-2 text-sm text-silver/30">
            {rosterPressure.vacancyCount > 0 ? "Waiting for visitors..." : "No visitors right now"}
          </p>
        )}

        {deferredVisitors.length > 0 && (
          <div className="mt-3">
            <SectionHeader
              label={`Deferred (${deferredVisitors.length})`}
              meta={
                <span className="text-silver/35">
                  Reserve {deferredVisitors.length}/{rosterPressure.deferredVisitorCapacity}
                </span>
              }
            />
            <div className="mt-1 space-y-0.5">
              {deferredVisitors.map((visitor) => (
                <VisitorRow
                  key={visitor.id}
                  visitor={visitor}
                  isFocused={focusedVisitorId === visitor.id}
                  onSelect={onSelectVisitor ? () => onSelectVisitor(visitor.id) : undefined}
                />
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

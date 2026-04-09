import { useEffect, useState } from "react";

import { type PolicyState } from "lib/policies";

import type {
  GameCallbacks,
  OperatorViewModel,
  RoomViewModel,
  RosterPressureViewModel,
  StaffViewModel,
  VisitorViewModel,
} from "./view-models";
import { Tooltip } from "./_tooltip";
import { getRosterFlowSurfaceSummary, getStaffingPrioritySurfaceSummary } from "./policy-summaries";
import { getRoleMeta, getSpecialtyMeta, getTagMeta } from "./_glossary";

interface RosterPanelProps {
  operators: readonly OperatorViewModel[];
  staff: readonly StaffViewModel[];
  visitors: readonly VisitorViewModel[];
  rooms: readonly RoomViewModel[];
  callbacks: GameCallbacks;
  rosterPressure: RosterPressureViewModel;
  policies: PolicyState;
  focusedOperatorId?: string | null;
  onSelectOperator?: (operatorId: string) => void;
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
        {/* Phase 2: risk indicators inline */}
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

// ── Staff row (compact, expandable assignment) ───────────────────────────

function StaffRow({
  member,
  rooms,
  isExpanded,
  onToggle,
  onAssign,
}: {
  member: StaffViewModel;
  rooms: readonly RoomViewModel[];
  isExpanded: boolean;
  onToggle: () => void;
  onAssign: (roomId?: string) => void;
}) {
  const assignableRooms = rooms.filter(
    (r) => r.isActive && r.assignedStaffCount < r.capacity && r.requiredStaffTag === member.roleTag,
  );
  const isAssigned = member.assignmentKind === "room";

  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left transition-all duration-200 ${
          isExpanded
            ? "bg-[rgba(200,168,76,0.06)] shadow-[inset_2px_0_0_var(--color-gold)]"
            : "hover:bg-[rgba(200,168,76,0.03)]"
        }`}
      >
        <span className="min-w-0 truncate text-xs text-silver-bright">{member.name}</span>
        <span className="badge badge-slate ml-auto shrink-0">
          {getTagMeta(member.roleTag).label}
        </span>
        <span className="shrink-0 text-sm text-silver/40">
          {isAssigned ? "assigned" : member.status}
        </span>
      </button>

      {isExpanded && (
        <div className="animate-enter ml-4 mt-1 border-l border-gold/10 pl-3 pb-1.5">
          <div className="flex items-center gap-2 text-sm text-silver/50">
            <Tooltip content="Daily wage drawn from treasury" side="top">
              <span>${member.wage}/day</span>
            </Tooltip>
            <span className="opacity-30">&middot;</span>
            <span>{member.status}</span>
          </div>
          {(assignableRooms.length > 0 || isAssigned) && (
            <div className="mt-1.5 flex flex-wrap items-center gap-1">
              {isAssigned && (
                <button
                  type="button"
                  className="btn-ghost px-2 py-0.5 text-sm"
                  onClick={() => onAssign(undefined)}
                >
                  unassign
                </button>
              )}
              {assignableRooms.map((room) => (
                <Tooltip
                  key={room.id}
                  content={`Assign to ${room.name} (${room.assignedStaffCount}/${room.capacity})`}
                  side="top"
                >
                  <button
                    type="button"
                    className="btn-ghost px-2 py-0.5 text-sm"
                    onClick={() => onAssign(room.id)}
                  >
                    {room.name.toLowerCase()}
                  </button>
                </Tooltip>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Visitor row (compact with inline actions) ────────────────────────────

function VisitorRow({
  visitor,
  replaceableOperators,
  showReplacePicker,
  onToggleReplacePicker,
  onAccept,
  onDefer,
  onReject,
  onReplace,
  onDismiss,
  rejectReputationDelta,
}: {
  visitor: VisitorViewModel;
  replaceableOperators: readonly OperatorViewModel[];
  showReplacePicker: boolean;
  onToggleReplacePicker: () => void;
  onAccept: () => void;
  onDefer: () => void;
  onReject: () => void;
  onReplace: (operatorId: string) => void;
  onDismiss: () => void;
  rejectReputationDelta: number;
}) {
  const patienceHours = Math.max(0, Math.ceil(visitor.patience / 60));
  const recruitTooltip = visitor.canAccept
    ? visitor.queueState === "deferred"
      ? `Recruit ${visitor.name} from reserve`
      : `Recruit ${visitor.name} as an operator`
    : visitor.canReplace
      ? `Replace an active operator with ${visitor.name}`
      : visitor.lockedReason || "Operator roster is full";
  const primaryLabel = visitor.canAccept
    ? "Recruit"
    : visitor.canReplace
      ? "Replace"
      : visitor.queueState === "deferred"
        ? "Hold"
        : "Full";
  const showDeferAction = visitor.queueState === "active";
  const metaLine =
    visitor.queueState === "deferred" ? "Deferred reserve" : `${patienceHours}h patience`;
  const specialtyLabel = getSpecialtyMeta(
    visitor.specialtyTag || `focus:${visitor.desiredRoleTag.replace(/^role:/, "")}`,
  ).label;
  const personaHooks = visitor.personaHooks ?? [];

  return (
    <div data-testid="visitor-row" data-visitor-id={visitor.id}>
      <div className="flex items-center gap-2 rounded-lg px-2.5 py-1.5">
        <div className="min-w-0 flex-1">
          <span className="text-xs font-medium text-silver-bright">{visitor.name}</span>
          <span className="ml-1.5 text-sm text-gold/60">
            {getRoleMeta(visitor.desiredRoleTag).label}
          </span>
          {visitor.queueState === "deferred" && (
            <span className="ml-1.5 rounded-full border border-gold/20 bg-gold/10 px-1.5 py-0.5 text-xs uppercase tracking-[0.12em] text-gold/70">
              Deferred
            </span>
          )}
          <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-sm text-silver/45">
            <span>{specialtyLabel}</span>
            <span className="opacity-30">&middot;</span>
            <span>Quality {Math.round(visitor.quality)}</span>
            <span className="opacity-30">&middot;</span>
            <span>{metaLine}</span>
            <span className="opacity-30">&middot;</span>
            <span>Loyalty {Math.round(visitor.projectedLoyalty)}</span>
          </div>
          {visitor.personaSummary && (
            <p className="mt-1 text-sm leading-relaxed text-silver/55">{visitor.personaSummary}</p>
          )}
          {personaHooks.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {personaHooks.slice(0, 2).map((hook) => (
                <span
                  key={hook}
                  className="rounded-full border border-gold/10 bg-gold/5 px-1.5 py-0.5 text-xs text-gold/65"
                >
                  {hook}
                </span>
              ))}
              {visitor.identitySource === "generated" && (
                <span className="rounded-full border border-emerald-500/20 bg-emerald-500/8 px-1.5 py-0.5 text-xs uppercase tracking-[0.12em] text-emerald-300/80">
                  AI packet
                </span>
              )}
            </div>
          )}
        </div>
        <Tooltip content={recruitTooltip} side="top">
          <button
            type="button"
            data-testid="visitor-recruit"
            data-visitor-id={visitor.id}
            className={`shrink-0 px-2 py-0.5 text-sm ${
              visitor.canAccept || visitor.canReplace
                ? "btn-primary"
                : "btn-ghost cursor-not-allowed text-silver/30"
            }`}
            onClick={
              visitor.canAccept ? onAccept : visitor.canReplace ? onToggleReplacePicker : undefined
            }
            disabled={!visitor.canAccept && !visitor.canReplace}
          >
            {primaryLabel}
          </button>
        </Tooltip>
        {showDeferAction ? (
          <Tooltip
            content={
              visitor.canDefer
                ? "Move this visitor into reserve"
                : visitor.deferLockedReason || "Deferred reserve is full"
            }
            side="top"
          >
            <button
              type="button"
              className={`btn-ghost shrink-0 px-1.5 py-0.5 text-sm ${
                visitor.canDefer ? "" : "cursor-not-allowed text-silver/30"
              }`}
              onClick={onDefer}
              disabled={!visitor.canDefer}
            >
              defer
            </button>
          </Tooltip>
        ) : (
          <Tooltip content="Remove this deferred recruit from reserve" side="top">
            <button
              type="button"
              className="btn-ghost shrink-0 px-1.5 py-0.5 text-sm"
              onClick={onDismiss}
            >
              dismiss
            </button>
          </Tooltip>
        )}
        {showDeferAction && (
          <Tooltip content={`Dismiss this visitor (${rejectReputationDelta} rep)`} side="top">
            <button
              type="button"
              data-testid="visitor-pass"
              data-visitor-id={visitor.id}
              className="btn-ghost shrink-0 px-1.5 py-0.5 text-sm"
              onClick={onReject}
            >
              pass
            </button>
          </Tooltip>
        )}
      </div>

      {showReplacePicker && visitor.canReplace && replaceableOperators.length > 0 && (
        <div className="animate-enter ml-4 mt-1.5 space-y-1.5 border-l border-gold/10 pl-3 pb-2">
          <div className="text-xs uppercase tracking-[0.12em] text-gold/50">Replace Operator</div>
          <div className="flex flex-wrap gap-1.5">
            {replaceableOperators.map((operator) => (
              <Tooltip
                key={operator.id}
                content={
                  operator.canBeReplaced
                    ? `Dismiss ${operator.name} and recruit ${visitor.name}`
                    : operator.replaceLockedReason || "Unavailable"
                }
                side="top"
              >
                <button
                  type="button"
                  className={`btn-ghost px-2 py-0.5 text-sm ${
                    operator.canBeReplaced ? "" : "cursor-not-allowed text-silver/30"
                  }`}
                  disabled={!operator.canBeReplaced}
                  onClick={() => onReplace(operator.id)}
                >
                  {operator.name}
                </button>
              </Tooltip>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Staff hire menu ──────────────────────────────────────────────────────

const HIREABLE_ROLES = [
  "staff:admin",
  "staff:reception",
  "staff:logistics",
  "staff:medical",
  "staff:maintenance",
] as const;

function StaffHireMenu({ onHire }: { onHire: (roleTag: string) => void }) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        className="btn-ghost px-1.5 py-0.5 text-sm"
        onClick={() => setOpen(true)}
      >
        + hire
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1">
      {HIREABLE_ROLES.map((roleTag) => (
        <button
          key={roleTag}
          type="button"
          className="btn-ghost px-1.5 py-0.5 text-sm"
          onClick={() => {
            onHire(roleTag);
            setOpen(false);
          }}
        >
          {getTagMeta(roleTag).label}
        </button>
      ))}
      <button
        type="button"
        className="btn-ghost px-1 py-0.5 text-sm text-silver/40"
        onClick={() => setOpen(false)}
      >
        &times;
      </button>
    </div>
  );
}

// ── Main panel ───────────────────────────────────────────────────────────

export function RosterPanel({
  operators,
  staff,
  visitors,
  rooms,
  callbacks,
  rosterPressure,
  policies,
  focusedOperatorId = null,
  onSelectOperator,
}: RosterPanelProps) {
  const [expandedStaffId, setExpandedStaffId] = useState<string | null>(null);
  const [replacementVisitorId, setReplacementVisitorId] = useState<string | null>(null);

  const livingOperators = operators.filter((op) => op.lifecycle.status === "active");
  const fallenOperators = operators.filter((op) => op.lifecycle.status === "dead");
  const activeVisitors = visitors.filter((visitor) => visitor.queueState === "active");
  const deferredVisitors = visitors.filter((visitor) => visitor.queueState === "deferred");
  const replaceableOperators = livingOperators.filter((operator) => operator.canBeReplaced);
  const staffingSummary = getStaffingPrioritySurfaceSummary(policies.staffingPriority);
  const rosterFlowSummary = getRosterFlowSurfaceSummary(policies.rosterFlow);

  const toggleStaff = (id: string) => setExpandedStaffId((prev) => (prev === id ? null : id));

  useEffect(() => {
    if (!replacementVisitorId) return;
    if (!visitors.some((visitor) => visitor.id === replacementVisitorId)) {
      setReplacementVisitorId(null);
    }
  }, [replacementVisitorId, visitors]);

  return (
    <div className="animate-enter space-y-3" data-testid="roster-panel">
      {/* ── Pressure banner ─────────────────────────────── */}
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

      {/* ── Operators ─────────────────────────────────────── */}
      <div>
        <div className="mb-1.5 flex items-center justify-between px-1">
          <h3 className="font-[family-name:var(--font-display)] text-sm font-light tracking-wide text-silver-bright">
            Operators
          </h3>
          <Tooltip content="Active operators / maximum capacity">
            <span
              data-testid="roster-operators-count"
              className={`text-sm tabular-nums ${
                rosterPressure.replacementPressureLevel === "critical"
                  ? "text-ember"
                  : rosterPressure.replacementPressureLevel === "strained"
                    ? "text-smolder"
                    : "text-gold/60"
              }`}
            >
              {rosterPressure.livingOperatorCount}/{rosterPressure.operatorCapacity}
            </span>
          </Tooltip>
        </div>

        <div className="glass-card-inset mb-2 px-2.5 py-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs uppercase tracking-[0.12em] text-gold/50">Daily Routine</span>
            <span className="text-sm text-gold">{staffingSummary.label}</span>
          </div>
          <p className="mt-1 text-sm leading-relaxed text-silver/60">{staffingSummary.summary}</p>
          <div className="mt-1.5 flex flex-wrap gap-2 text-sm text-silver/45">
            {staffingSummary.details.map((detail) => (
              <span key={detail}>{detail}</span>
            ))}
          </div>
        </div>

        {livingOperators.length > 0 ? (
          <div className="space-y-0.5">
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
          <div className="px-2.5 py-4 text-center">
            <p className="text-xs text-silver/40">No operators yet</p>
            <p className="mt-0.5 text-sm text-gold/50">Recruit talent through your facilities</p>
          </div>
        )}
      </div>

      {/* ── Fallen ────────────────────────────────────────── */}
      {fallenOperators.length > 0 && (
        <div>
          <div className="mb-0.5 px-1 text-sm uppercase tracking-[0.15em] text-silver/30">
            Fallen ({fallenOperators.length})
          </div>
          {fallenOperators.map((op) => (
            <FallenRow key={op.id} op={op} />
          ))}
        </div>
      )}

      {/* ── Divider ───────────────────────────────────────── */}
      <div className="h-px bg-gold/6" />

      {/* ── Staff ─────────────────────────────────────────── */}
      <div>
        <div className="mb-1 flex items-center justify-between px-1">
          <Tooltip content="Hired workers assigned to rooms. Not combat-capable">
            <span className="text-sm uppercase tracking-[0.15em] text-gold/60">
              Staff ({staff.length})
            </span>
          </Tooltip>
          <StaffHireMenu onHire={(roleTag) => callbacks.hireStaff(roleTag)} />
        </div>
        {staff.length > 0 ? (
          <div className="space-y-0.5">
            {staff.map((s) => (
              <StaffRow
                key={s.id}
                member={s}
                rooms={rooms}
                isExpanded={expandedStaffId === s.id}
                onToggle={() => toggleStaff(s.id)}
                onAssign={(roomId) => callbacks.assignStaff(s.id, roomId)}
              />
            ))}
          </div>
        ) : (
          <p className="px-2.5 py-2 text-sm text-silver/30">No staff hired</p>
        )}
      </div>

      {/* ── Visitors ──────────────────────────────────────── */}
      <div data-testid="roster-visitors">
        <div className="mb-1 flex items-center justify-between px-1">
          <Tooltip content="Potential recruits passing through. Accept to add as operators">
            <span className="text-sm uppercase tracking-[0.15em] text-gold/60">
              Visitors ({activeVisitors.length})
            </span>
          </Tooltip>
          {rosterPressure.vacancyCount > 0 ? (
            <Tooltip content="Open operator slots available for recruitment">
              <span className="text-sm text-ember/70">{rosterPressure.vacancyCount} to fill</span>
            </Tooltip>
          ) : activeVisitors.length > 0 ? (
            <span className="text-sm text-silver/35">Roster full</span>
          ) : null}
        </div>
        <div className="glass-card-inset mb-2 px-2.5 py-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs uppercase tracking-[0.12em] text-gold/50">
              Recruitment Policy
            </span>
            <span className="text-sm text-gold">{rosterFlowSummary.label}</span>
          </div>
          <p className="mt-1 text-sm leading-relaxed text-silver/60">{rosterFlowSummary.summary}</p>
          <div className="mt-1.5 flex flex-wrap gap-2 text-sm text-silver/45">
            {rosterFlowSummary.details.map((detail) => (
              <span key={detail}>{detail}</span>
            ))}
          </div>
        </div>
        {activeVisitors.length > 0 ? (
          <div className="space-y-0.5">
            {activeVisitors.map((v) => (
              <VisitorRow
                key={v.id}
                visitor={v}
                replaceableOperators={replaceableOperators}
                showReplacePicker={replacementVisitorId === v.id}
                onToggleReplacePicker={() =>
                  setReplacementVisitorId((current) => (current === v.id ? null : v.id))
                }
                onAccept={() => callbacks.acceptRecruit(v.id)}
                onDefer={() => callbacks.deferRecruit(v.id)}
                onReject={() => callbacks.rejectRecruit(v.id)}
                onReplace={(operatorId) => {
                  callbacks.replaceRecruit(v.id, operatorId);
                  setReplacementVisitorId(null);
                }}
                onDismiss={() => callbacks.dismissRecruit(v.id)}
                rejectReputationDelta={rosterFlowSummary.rejectReputationDelta}
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
            <div className="mb-1 flex items-center justify-between px-1">
              <span className="text-sm uppercase tracking-[0.15em] text-gold/60">
                Deferred ({deferredVisitors.length})
              </span>
              <span className="text-sm text-silver/35">
                Reserve {deferredVisitors.length}/{rosterPressure.deferredVisitorCapacity}
              </span>
            </div>
            <div className="space-y-0.5">
              {deferredVisitors.map((visitor) => (
                <VisitorRow
                  key={visitor.id}
                  visitor={visitor}
                  replaceableOperators={replaceableOperators}
                  showReplacePicker={replacementVisitorId === visitor.id}
                  onToggleReplacePicker={() =>
                    setReplacementVisitorId((current) =>
                      current === visitor.id ? null : visitor.id,
                    )
                  }
                  onAccept={() => callbacks.acceptRecruit(visitor.id)}
                  onDefer={() => callbacks.deferRecruit(visitor.id)}
                  onReject={() => callbacks.rejectRecruit(visitor.id)}
                  onReplace={(operatorId) => {
                    callbacks.replaceRecruit(visitor.id, operatorId);
                    setReplacementVisitorId(null);
                  }}
                  onDismiss={() => callbacks.dismissRecruit(visitor.id)}
                  rejectReputationDelta={rosterFlowSummary.rejectReputationDelta}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

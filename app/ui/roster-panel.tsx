import { useEffect, useState } from "react";

import type {
  GameCallbacks,
  OperatorViewModel,
  RelationshipViewModel,
  RoomViewModel,
  RosterPressureViewModel,
  StaffViewModel,
  VisitorViewModel,
} from "./view-models";
import { formatTag } from "./view-models";
import { StatBar } from "./_stat-bar";
import { OperatorPortrait } from "./operator-portrait";

interface RosterPanelProps {
  operators: readonly OperatorViewModel[];
  staff: readonly StaffViewModel[];
  visitors: readonly VisitorViewModel[];
  relationships: readonly RelationshipViewModel[];
  rooms: readonly RoomViewModel[];
  callbacks: GameCallbacks;
  rosterPressure: RosterPressureViewModel;
  focusedOperatorId?: string | null;
}

// ── Helpers ──────────────────────────────────────────────────────────────

function statusDotColor(op: OperatorViewModel): string {
  if (op.injurySeverity > 0) return "bg-ember";
  if (op.assignmentKind === "raid") return "bg-smolder";
  if (op.assignmentKind === "recovery") return "bg-gold-dim/60";
  if (op.assignmentKind === "room") return "bg-gold shadow-[0_0_4px_rgba(200,168,76,0.3)]";
  return "bg-silver/30";
}

function statusLabel(op: OperatorViewModel): string {
  if (op.injurySeverity > 0) return `Injured (${Math.ceil(op.injuryRecoveryHours)}h)`;
  if (op.assignmentKind === "raid") return "On raid";
  if (op.assignmentKind === "recovery") return "Recovering";
  if (op.assignmentKind === "room") return "On duty";
  return "Idle";
}

function statusLabelClass(op: OperatorViewModel): string {
  if (op.injurySeverity > 0) return "text-ember";
  if (op.assignmentKind === "raid") return "text-smolder";
  return "text-silver/50";
}

// ── Operator compact row ─────────────────────────────────────────────────

function OperatorRow({
  op,
  isExpanded,
  onToggle,
  bonds,
}: {
  op: OperatorViewModel;
  isExpanded: boolean;
  onToggle: () => void;
  bonds: readonly RelationshipViewModel[];
}) {
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
        <div className={`h-1.5 w-1.5 shrink-0 rounded-full ${statusDotColor(op)}`} />
        <span className="min-w-0 truncate text-xs font-medium text-silver-bright">{op.name}</span>
        <span className="badge badge-gold ml-auto shrink-0">{formatTag(op.roleTag)}</span>
        <span className={`shrink-0 text-[0.6875rem] ${statusLabelClass(op)}`}>
          {statusLabel(op)}
        </span>
      </button>

      {isExpanded && (
        <div className="animate-enter ml-4 mt-1.5 space-y-2.5 border-l border-gold/10 pl-3 pb-2">
          {/* Portrait + identity */}
          <div className="flex items-start gap-3">
            <OperatorPortrait
              name={op.name}
              roleTag={op.roleTag}
              presetId={op.appearancePresetId}
              size="card"
            />
            <div className="min-w-0 flex-1 pt-0.5">
              <div className="text-xs text-silver-bright">{op.name}</div>
              <div className="mt-0.5 flex items-center gap-1.5">
                <span className="badge badge-gold">{formatTag(op.roleTag)}</span>
                {op.specialtyTag && (
                  <span className="text-[0.6875rem] text-gold/60">
                    {formatTag(op.specialtyTag)}
                  </span>
                )}
              </div>
              {op.availableForRaid && (
                <span className="mt-1 inline-block text-[0.6875rem] text-gold/70">Raid-ready</span>
              )}
            </div>
          </div>

          {/* Stat bars */}
          <div className="grid grid-cols-2 gap-x-3 gap-y-1">
            <StatBar label="Morale" value={Math.round(op.moraleCurrent)} max={100} />
            <StatBar label="Loyalty" value={Math.round(op.loyaltyCurrent)} max={100} />
          </div>

          {/* Needs */}
          <div className="flex items-center gap-2 text-[0.6875rem] text-silver/50">
            <span>Fatigue {Math.round(op.needFatigue)}</span>
            <span className="opacity-30">&middot;</span>
            <span>Stress {Math.round(op.needStress)}</span>
          </div>

          {/* Bonds for this operator */}
          {bonds.length > 0 && (
            <div>
              <div className="mb-1 text-[0.6875rem] uppercase tracking-[0.12em] text-gold/50">
                Bonds
              </div>
              {bonds.map((rel) => {
                const partnerName =
                  rel.operatorAId === op.id ? rel.operatorBName : rel.operatorAName;
                const cohesionLabel =
                  rel.cohesion >= 50 ? "Strong" : rel.cohesion >= 20 ? "Fair" : "Fragile";
                const cohesionClass =
                  rel.cohesion >= 50
                    ? "text-gold/70"
                    : rel.cohesion >= 20
                      ? "text-silver/50"
                      : "text-ember";
                return (
                  <div
                    key={`${rel.operatorAId}-${rel.operatorBId}`}
                    className="flex items-center justify-between py-0.5 text-[0.6875rem]"
                  >
                    <span className="text-silver/70">{partnerName}</span>
                    <span className={cohesionClass}>{cohesionLabel}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Fallen operator (memorial line) ──────────────────────────────────────

function FallenRow({ op }: { op: OperatorViewModel }) {
  return (
    <div className="flex items-center gap-2 px-2.5 py-1 opacity-60">
      <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-magma/50" />
      <span className="min-w-0 truncate text-xs text-silver/50 line-through">{op.name}</span>
      <span className="ml-auto text-[0.6875rem] text-magma/70">KIA</span>
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
    (r) => r.isActive && r.occupancy < r.capacity && r.requiredStaffTag === member.roleTag,
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
        <span className="badge badge-slate ml-auto shrink-0">{formatTag(member.roleTag)}</span>
        <span className="shrink-0 text-[0.6875rem] text-silver/40">
          {isAssigned ? "assigned" : member.status}
        </span>
      </button>

      {isExpanded && (
        <div className="animate-enter ml-4 mt-1 border-l border-gold/10 pl-3 pb-1.5">
          <div className="flex items-center gap-2 text-[0.6875rem] text-silver/50">
            <span>${member.wage}/day</span>
            <span className="opacity-30">&middot;</span>
            <span>{member.status}</span>
          </div>
          {(assignableRooms.length > 0 || isAssigned) && (
            <div className="mt-1.5 flex flex-wrap items-center gap-1">
              {isAssigned && (
                <button
                  type="button"
                  className="btn-ghost px-2 py-0.5 text-[0.6875rem]"
                  onClick={() => onAssign(undefined)}
                >
                  unassign
                </button>
              )}
              {assignableRooms.map((room) => (
                <button
                  key={room.id}
                  type="button"
                  className="btn-ghost px-2 py-0.5 text-[0.6875rem]"
                  onClick={() => onAssign(room.id)}
                  title={`Assign to ${room.name}`}
                >
                  {room.name.toLowerCase()}
                </button>
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
  onAccept,
  onReject,
}: {
  visitor: VisitorViewModel;
  onAccept: () => void;
  onReject: () => void;
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg px-2.5 py-1.5">
      <div className="min-w-0 flex-1">
        <span className="text-xs font-medium text-silver-bright">{visitor.name}</span>
        <span className="ml-1.5 text-[0.6875rem] text-gold/60">
          {formatTag(visitor.desiredRoleTag)}
        </span>
      </div>
      <button
        type="button"
        className="btn-primary shrink-0 px-2 py-0.5 text-[0.6875rem]"
        onClick={onAccept}
      >
        Recruit
      </button>
      <button
        type="button"
        className="btn-ghost shrink-0 px-1.5 py-0.5 text-[0.6875rem]"
        onClick={onReject}
      >
        pass
      </button>
    </div>
  );
}

// ── Main panel ───────────────────────────────────────────────────────────

export function RosterPanel({
  operators,
  staff,
  visitors,
  relationships,
  rooms,
  callbacks,
  rosterPressure,
  focusedOperatorId = null,
}: RosterPanelProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const livingOperators = operators.filter((op) => op.lifecycle.status === "active");
  const fallenOperators = operators.filter((op) => op.lifecycle.status === "dead");

  useEffect(() => {
    if (!focusedOperatorId) return;
    setExpandedId(focusedOperatorId);
  }, [focusedOperatorId]);

  const toggle = (id: string) => setExpandedId((prev) => (prev === id ? null : id));

  return (
    <div className="animate-enter space-y-3">
      {/* ── Pressure banner ─────────────────────────────── */}
      {rosterPressure.replacementPressureLevel !== "stable" && (
        <div
          className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-[0.6875rem] ${
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
          <span
            className={`text-[0.6875rem] tabular-nums ${
              rosterPressure.replacementPressureLevel === "critical"
                ? "text-ember"
                : rosterPressure.replacementPressureLevel === "strained"
                  ? "text-smolder"
                  : "text-gold/60"
            }`}
          >
            {rosterPressure.livingOperatorCount}/{rosterPressure.operatorCapacity}
          </span>
        </div>

        {livingOperators.length > 0 ? (
          <div className="space-y-0.5">
            {livingOperators.map((op) => (
              <OperatorRow
                key={op.id}
                op={op}
                isExpanded={expandedId === op.id}
                onToggle={() => toggle(op.id)}
                bonds={relationships.filter(
                  (r) => r.operatorAId === op.id || r.operatorBId === op.id,
                )}
              />
            ))}
          </div>
        ) : (
          <div className="px-2.5 py-4 text-center">
            <p className="text-xs text-silver/40">No operators yet</p>
            <p className="mt-0.5 text-[0.6875rem] text-gold/50">
              Recruit talent through your facilities
            </p>
          </div>
        )}
      </div>

      {/* ── Fallen ────────────────────────────────────────── */}
      {fallenOperators.length > 0 && (
        <div>
          <div className="mb-0.5 px-1 text-[0.6875rem] uppercase tracking-[0.15em] text-silver/30">
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
          <span className="text-[0.6875rem] uppercase tracking-[0.15em] text-gold/60">
            Staff ({staff.length})
          </span>
          <button
            type="button"
            className="btn-ghost px-1.5 py-0.5 text-[0.6875rem]"
            onClick={() => callbacks.hireStaff("staff:admin")}
          >
            + hire
          </button>
        </div>
        {staff.length > 0 ? (
          <div className="space-y-0.5">
            {staff.map((s) => (
              <StaffRow
                key={s.id}
                member={s}
                rooms={rooms}
                isExpanded={expandedId === s.id}
                onToggle={() => toggle(s.id)}
                onAssign={(roomId) => callbacks.assignStaff(s.id, roomId)}
              />
            ))}
          </div>
        ) : (
          <p className="px-2.5 py-2 text-[0.6875rem] text-silver/30">No staff hired</p>
        )}
      </div>

      {/* ── Visitors ──────────────────────────────────────── */}
      <div>
        <div className="mb-1 flex items-center justify-between px-1">
          <span className="text-[0.6875rem] uppercase tracking-[0.15em] text-gold/60">
            Visitors ({visitors.length})
          </span>
          {rosterPressure.vacancyCount > 0 && (
            <span className="text-[0.6875rem] text-ember/70">
              {rosterPressure.vacancyCount} to fill
            </span>
          )}
        </div>
        {visitors.length > 0 ? (
          <div className="space-y-0.5">
            {visitors.map((v) => (
              <VisitorRow
                key={v.id}
                visitor={v}
                onAccept={() => callbacks.acceptRecruit(v.id)}
                onReject={() => callbacks.rejectRecruit(v.id)}
              />
            ))}
          </div>
        ) : (
          <p className="px-2.5 py-2 text-[0.6875rem] text-silver/30">
            {rosterPressure.vacancyCount > 0 ? "Waiting for visitors..." : "No visitors right now"}
          </p>
        )}
      </div>
    </div>
  );
}

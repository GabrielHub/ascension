import { useEffect, useState } from "react";

import type {
  GameCallbacks,
  OperatorViewModel,
  RelationshipViewModel,
  RoomCultureViewModel,
  RoomViewModel,
  RosterPressureViewModel,
  StaffViewModel,
  TeamViewModel,
  VisitorViewModel,
} from "./view-models";
import { formatCultureLabel, formatTag } from "./view-models";
import { StatBar } from "./_stat-bar";
import { Tooltip } from "./_tooltip";
import { getToneTip, getSignalTip } from "./_glossary";
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
  roomCultures?: readonly RoomCultureViewModel[];
  teams?: readonly TeamViewModel[];
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
  isExpanded,
  onToggle,
  bonds,
  roomCultures,
  teams,
}: {
  op: OperatorViewModel;
  isExpanded: boolean;
  onToggle: () => void;
  bonds: readonly RelationshipViewModel[];
  roomCultures: readonly RoomCultureViewModel[];
  teams: readonly TeamViewModel[];
}) {
  // Find room culture if assigned to a room
  const assignedRoomCulture =
    op.assignmentKind === "room" && op.assignmentTargetId
      ? (roomCultures.find((rc) => rc.roomId === op.assignmentTargetId) ?? null)
      : null;

  // Find team membership
  const operatorTeam = teams.find((team) => team.memberIds.includes(op.id)) ?? null;

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
        {/* Phase 2: risk indicators inline */}
        {op.quitRisk && (
          <Tooltip content="Critical morale — may leave the team" side="top">
            <span className="shrink-0 text-[0.6rem] text-magma">!</span>
          </Tooltip>
        )}
        {op.retentionRisk && !op.quitRisk && (
          <Tooltip content="Low loyalty — retention at risk" side="top">
            <span className="shrink-0 text-[0.6rem] text-ember">!</span>
          </Tooltip>
        )}
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
                <Tooltip content="Healthy and unassigned — can join a raid" side="top">
                  <span className="mt-1 inline-block text-[0.6875rem] text-gold/70">
                    Raid-ready
                  </span>
                </Tooltip>
              )}
            </div>
          </div>

          {/* Stat bars */}
          <div className="grid grid-cols-2 gap-x-3 gap-y-1">
            <StatBar
              label="Morale"
              value={Math.round(op.moraleCurrent)}
              max={100}
              tip="How the operator feels. Low morale risks refusal or departure"
            />
            <StatBar
              label="Loyalty"
              value={Math.round(op.loyaltyCurrent)}
              max={100}
              tip="Commitment to the team. Low loyalty increases quit risk"
            />
          </div>

          {/* Needs */}
          <div className="flex items-center gap-2 text-[0.6875rem] text-silver/50">
            <Tooltip content="Physical tiredness. Builds on duty, recovers at rest" side="top">
              <span>Fatigue {Math.round(op.needFatigue)}</span>
            </Tooltip>
            <span className="opacity-30">&middot;</span>
            <Tooltip content="Mental strain. Reduces effectiveness when high" side="top">
              <span>Stress {Math.round(op.needStress)}</span>
            </Tooltip>
          </div>

          {/* ── Phase 2: Explanation surfaces ──────────────────── */}
          {(op.refusalRisk || op.quitRisk || op.retentionRisk) && (
            <div className="space-y-1">
              {op.autonomyReasons.map((reason) => (
                <div
                  key={reason}
                  className={`flex items-center gap-1.5 rounded px-2 py-1 text-[0.6875rem] shadow-[inset_2px_0_0_currentColor] ${
                    op.quitRisk ? "bg-magma/8 text-magma" : "bg-ember/8 text-ember"
                  }`}
                >
                  {reason}
                </div>
              ))}
            </div>
          )}

          {/* Phase 2: Room culture summary if assigned to a room */}
          {assignedRoomCulture && (
            <div className="glass-card-inset px-2 py-1.5">
              <div className="text-[0.625rem] uppercase tracking-[0.12em] text-gold/50">
                Room: {assignedRoomCulture.roomName}
              </div>
              <div className="mt-0.5 text-[0.6875rem] text-silver/55">
                {formatCultureLabel(assignedRoomCulture.summary)}
              </div>
              <div className="mt-1 flex flex-wrap gap-1">
                <Tooltip content={getToneTip(assignedRoomCulture.tone)}>
                  <span className="badge badge-slate">
                    {formatCultureLabel(assignedRoomCulture.tone || "neutral")}
                  </span>
                </Tooltip>
                {assignedRoomCulture.signals.map((signal) => (
                  <Tooltip key={signal} content={getSignalTip(signal)}>
                    <span className="badge badge-slate">{formatCultureLabel(signal)}</span>
                  </Tooltip>
                ))}
              </div>
            </div>
          )}

          {/* Phase 2: Team affiliation */}
          {operatorTeam && (
            <div className="glass-card-inset px-2 py-1.5">
              <div className="text-[0.625rem] uppercase tracking-[0.12em] text-gold/50">Team</div>
              <div className="mt-0.5 text-[0.6875rem] text-silver/60">
                {operatorTeam.statusSummary}
              </div>
              <div className="mt-1 flex items-center gap-2 text-[0.6875rem] text-silver/50">
                <span>{operatorTeam.memberNames.join(", ")}</span>
                <span className="opacity-30">&middot;</span>
                <Tooltip content="Team coordination. Builds through shared missions" side="top">
                  <span>Cohesion {Math.round(operatorTeam.cohesion)}</span>
                </Tooltip>
              </div>
              {operatorTeam.explanationReasons.slice(0, 2).map((reason) => (
                <div key={reason} className="mt-1 text-[0.6875rem] text-silver/50">
                  {reason}
                </div>
              ))}
            </div>
          )}

          {/* Bonds for this operator */}
          {bonds.length > 0 && (
            <div>
              <Tooltip content="Interpersonal relationships formed through shared work" side="top">
                <div className="mb-1 text-[0.6875rem] uppercase tracking-[0.12em] text-gold/50">
                  Bonds
                </div>
              </Tooltip>
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
                const cohesionTip =
                  rel.cohesion >= 50
                    ? "Close bond — strong mutual trust"
                    : rel.cohesion >= 20
                      ? "Developing bond — building rapport"
                      : "Fragile bond — may weaken further";
                return (
                  <div
                    key={`${rel.operatorAId}-${rel.operatorBId}`}
                    className="flex items-center justify-between py-0.5 text-[0.6875rem]"
                  >
                    <span className="text-silver/70">{partnerName}</span>
                    <Tooltip content={cohesionTip} side="top">
                      <span className={cohesionClass}>{cohesionLabel}</span>
                    </Tooltip>
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
      <Tooltip content="Killed in action" side="top">
        <span className="ml-auto text-[0.6875rem] text-magma/70">KIA</span>
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
                  className="btn-ghost px-2 py-0.5 text-[0.6875rem]"
                  onClick={() => onAssign(undefined)}
                >
                  unassign
                </button>
              )}
              {assignableRooms.map((room) => (
                <Tooltip
                  key={room.id}
                  content={`Assign to ${room.name} (${room.occupancy}/${room.capacity})`}
                  side="top"
                >
                  <button
                    type="button"
                    className="btn-ghost px-2 py-0.5 text-[0.6875rem]"
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
  canAccept,
  onAccept,
  onReject,
}: {
  visitor: VisitorViewModel;
  canAccept: boolean;
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
      <Tooltip
        content={canAccept ? `Recruit ${visitor.name} as an operator` : "Operator roster is full"}
        side="top"
      >
        <button
          type="button"
          className={`shrink-0 px-2 py-0.5 text-[0.6875rem] ${
            canAccept ? "btn-primary" : "btn-ghost cursor-not-allowed text-silver/30"
          }`}
          onClick={onAccept}
          disabled={!canAccept}
        >
          {canAccept ? "Recruit" : "Full"}
        </button>
      </Tooltip>
      <Tooltip content="Dismiss this visitor" side="top">
        <button
          type="button"
          className="btn-ghost shrink-0 px-1.5 py-0.5 text-[0.6875rem]"
          onClick={onReject}
        >
          pass
        </button>
      </Tooltip>
    </div>
  );
}

// ── Staff hire menu ──────────────────────────────────────────────────────

const HIREABLE_ROLES = [
  { tag: "staff:admin", label: "Admin" },
  { tag: "staff:reception", label: "Reception" },
  { tag: "staff:logistics", label: "Logistics" },
  { tag: "staff:medical", label: "Medical" },
  { tag: "staff:maintenance", label: "Maintenance" },
] as const;

function StaffHireMenu({ onHire }: { onHire: (roleTag: string) => void }) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        className="btn-ghost px-1.5 py-0.5 text-[0.6875rem]"
        onClick={() => setOpen(true)}
      >
        + hire
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1">
      {HIREABLE_ROLES.map((role) => (
        <button
          key={role.tag}
          type="button"
          className="btn-ghost px-1.5 py-0.5 text-[0.6875rem]"
          onClick={() => {
            onHire(role.tag);
            setOpen(false);
          }}
        >
          {role.label}
        </button>
      ))}
      <button
        type="button"
        className="btn-ghost px-1 py-0.5 text-[0.6875rem] text-silver/40"
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
  relationships,
  rooms,
  callbacks,
  rosterPressure,
  focusedOperatorId = null,
  roomCultures = [],
  teams = [],
}: RosterPanelProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const livingOperators = operators.filter((op) => op.lifecycle.status === "active");
  const fallenOperators = operators.filter((op) => op.lifecycle.status === "dead");
  const canRecruit = rosterPressure.vacancyCount > 0;

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
          <Tooltip content="Active operators / maximum capacity">
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
          </Tooltip>
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
                roomCultures={roomCultures}
                teams={teams}
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
          <Tooltip content="Hired workers assigned to rooms. Not combat-capable">
            <span className="text-[0.6875rem] uppercase tracking-[0.15em] text-gold/60">
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
          <Tooltip content="Potential recruits passing through. Accept to add as operators">
            <span className="text-[0.6875rem] uppercase tracking-[0.15em] text-gold/60">
              Visitors ({visitors.length})
            </span>
          </Tooltip>
          {rosterPressure.vacancyCount > 0 ? (
            <Tooltip content="Open operator slots available for recruitment">
              <span className="text-[0.6875rem] text-ember/70">
                {rosterPressure.vacancyCount} to fill
              </span>
            </Tooltip>
          ) : visitors.length > 0 ? (
            <span className="text-[0.6875rem] text-silver/35">Roster full</span>
          ) : null}
        </div>
        {visitors.length > 0 ? (
          <div className="space-y-0.5">
            {visitors.map((v) => (
              <VisitorRow
                key={v.id}
                visitor={v}
                canAccept={canRecruit}
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

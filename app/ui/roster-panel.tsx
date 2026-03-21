import type {
  GameCallbacks,
  OperatorViewModel,
  RelationshipViewModel,
  RoomViewModel,
  StaffViewModel,
  VisitorViewModel,
} from "./view-models";
import { OperatorPortrait } from "./operator-portrait";

interface RosterPanelProps {
  operatorSlots: number;
  operators: readonly OperatorViewModel[];
  staff: readonly StaffViewModel[];
  visitors: readonly VisitorViewModel[];
  relationships: readonly RelationshipViewModel[];
  rooms: readonly RoomViewModel[];
  callbacks: GameCallbacks;
}

function StatBar({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div>
      <div className="flex items-center justify-between">
        <span className="text-[0.6875rem] uppercase tracking-wider text-gold/70">{label}</span>
        <span className="text-xs tabular-nums text-silver/60">{Math.round(value)}</span>
      </div>
      <div className="mt-0.5 h-1 w-full overflow-hidden rounded-full bg-[rgba(6,6,8,0.6)]">
        <div
          className="h-full rounded-full bg-gold/40 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function formatRoleTag(tag: string): string {
  return tag.replace("role:", "").replace(/_/g, " ");
}

function formatAssignment(kind: string): string {
  if (kind === "idle") return "Idle";
  if (kind === "room") return "On duty";
  if (kind === "recovery") return "Recovering";
  if (kind === "raid") return "On raid";
  return kind;
}

function formatIntent(intent: string): string {
  if (intent === "idle") return "Resting";
  if (intent === "working") return "Working";
  if (intent === "available") return "Available";
  if (intent === "recovering") return "Recovering";
  return intent.replace(/_/g, " ");
}

function OperatorRow({ op }: { op: OperatorViewModel }) {
  const injured = op.injurySeverity > 0;

  return (
    <div className="glass-card-inset p-3">
      <div className="flex items-start gap-3">
        <OperatorPortrait
          name={op.name}
          roleTag={op.roleTag}
          presetId={op.appearancePresetId}
          size="card"
        />
        <div className="min-w-0 flex-1">
          <h4 className="truncate text-xs font-medium text-silver-bright">{op.name}</h4>
          <div className="mt-0.5 flex items-center gap-1.5">
            <span className="badge badge-gold">{formatRoleTag(op.roleTag)}</span>
            {op.specialtyTag && (
              <span className="text-[0.6875rem] text-gold/70">
                {op.specialtyTag.replace("focus:", "")}
              </span>
            )}
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-0.5">
          <span className="text-[0.6875rem] text-silver/60">
            {formatAssignment(op.assignmentKind)}
          </span>
          {injured && (
            <span className="text-[0.6875rem] text-ember">
              Injured ({Math.ceil(op.injuryRecoveryHours)}h)
            </span>
          )}
        </div>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1">
        <StatBar label="Morale" value={op.moraleCurrent} max={100} />
        <StatBar label="Loyalty" value={op.loyaltyCurrent} max={100} />
      </div>

      <div className="mt-1.5 flex items-center gap-1.5 text-[0.6875rem] text-silver/60">
        <span>{formatIntent(op.intent)}</span>
        <span className="opacity-30">|</span>
        <span>Fatigue {Math.round(op.needFatigue)}</span>
        <span className="opacity-30">&middot;</span>
        <span>Stress {Math.round(op.needStress)}</span>
        {op.availableForRaid && (
          <>
            <span className="opacity-30">|</span>
            <span className="text-gold/70">Raid-ready</span>
          </>
        )}
      </div>
    </div>
  );
}

function RelationshipRow({ rel }: { rel: RelationshipViewModel }) {
  const cohesionLabel = rel.cohesion >= 50 ? "Strong" : rel.cohesion >= 20 ? "Fair" : "Fragile";

  return (
    <div className="glass-card-inset px-3 py-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-silver-bright">
          {rel.operatorAName} &amp; {rel.operatorBName}
        </span>
        <span
          className={`text-xs ${
            rel.cohesion >= 50
              ? "text-gold/70"
              : rel.cohesion >= 20
                ? "text-silver/60"
                : "text-ember"
          }`}
        >
          {cohesionLabel}
        </span>
      </div>
      <div className="mt-1 flex items-center gap-2 text-xs tabular-nums">
        <span className="text-gold/70">Trust {rel.trust}</span>
        <span className="text-ember">Friction {rel.friction}</span>
      </div>
      {rel.historyTags.length > 0 && (
        <div className="mt-1 flex flex-wrap gap-1">
          {rel.historyTags.map((tag) => (
            <span key={tag} className="text-[0.6875rem] text-silver/60">
              {tag.replace("history:", "").replace("bond:", "").replace(/_/g, " ")}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

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
    <div className="glass-card-inset px-3 py-2">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <span className="text-xs font-medium text-silver-bright">{visitor.name}</span>
          <span className="ml-1.5 text-[0.6875rem] text-gold/70">
            seeking {formatRoleTag(visitor.desiredRoleTag)}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-2 text-xs tabular-nums">
          <span className="text-gold/70">Quality {visitor.quality}</span>
          <span className="text-silver/60">Patience {visitor.patience}</span>
        </div>
      </div>
      <div className="mt-1.5 flex items-center justify-between">
        <span className="text-[0.6875rem] text-silver/60">
          Expected loyalty: {visitor.expectedLoyalty}
        </span>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            className="btn-primary px-2.5 py-1 text-[0.6875rem]"
            onClick={onAccept}
          >
            Recruit
          </button>
          <button type="button" className="btn-ghost px-2 py-1 text-[0.6875rem]" onClick={onReject}>
            pass
          </button>
        </div>
      </div>
    </div>
  );
}

function StaffRow({
  member,
  rooms,
  onAssign,
}: {
  member: StaffViewModel;
  rooms: readonly RoomViewModel[];
  onAssign: (roomId?: string) => void;
}) {
  const assignableRooms = rooms.filter(
    (r) => r.isActive && r.occupancy < r.capacity && r.requiredRoleTag === member.roleTag,
  );
  const isAssigned = member.assignmentKind === "room";

  return (
    <div className="glass-card-inset px-3 py-2">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <span className="text-xs text-silver-bright">{member.name}</span>
          <span className="ml-1.5 badge badge-slate">{formatRoleTag(member.roleTag)}</span>
        </div>
        <div className="flex shrink-0 items-center gap-2 text-[0.6875rem]">
          <span className="text-silver/60">{member.status}</span>
          <span className="text-silver/60">${member.wage}/day</span>
        </div>
      </div>
      {(assignableRooms.length > 0 || isAssigned) && (
        <div className="mt-1.5 flex items-center gap-1.5">
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
  );
}

export function RosterPanel({
  operatorSlots,
  operators,
  staff,
  visitors,
  relationships,
  rooms,
  callbacks,
}: RosterPanelProps) {
  return (
    <div className="animate-enter space-y-4">
      {/* ── Operators ─────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between">
          <h3 className="font-[family-name:var(--font-display)] text-lg font-light tracking-wide text-silver-bright">
            Roster
          </h3>
          <span className="text-xs text-gold/80">
            {operators.length}/{operatorSlots} operators
          </span>
        </div>

        {operators.length > 0 ? (
          <div className="mt-2 space-y-2">
            {operators.map((op) => (
              <OperatorRow key={op.id} op={op} />
            ))}
          </div>
        ) : (
          <div className="mt-2 glass-card-inset p-4">
            <div className="flex flex-col items-center gap-3">
              <OperatorPortrait
                name="Recruit"
                roleTag="role:bruiser"
                presetId="male-swept"
                size="card"
              />
              <div className="text-center">
                <p className="text-xs font-medium text-silver/70">No operators yet</p>
                <p className="mt-0.5 text-xs text-gold/70">
                  Recruit talent through your facilities
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Relationships / Cohesion ──────────────────── */}
      {relationships.length > 0 && (
        <div>
          <h4 className="mb-1.5 text-xs font-medium uppercase tracking-[0.15em] text-gold/80">
            Social Bonds
          </h4>
          <div className="space-y-1.5">
            {relationships.map((rel) => (
              <RelationshipRow key={`${rel.operatorAId}-${rel.operatorBId}`} rel={rel} />
            ))}
          </div>
        </div>
      )}

      {/* ── Staff ─────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-medium uppercase tracking-[0.15em] text-gold/80">
            Staff ({staff.length})
          </h4>
          <button
            type="button"
            className="btn-ghost px-2 py-0.5 text-[0.6875rem]"
            onClick={() => callbacks.hireStaff("general")}
          >
            + hire
          </button>
        </div>
        {staff.length > 0 ? (
          <div className="mt-1.5 space-y-1.5">
            {staff.map((s) => (
              <StaffRow
                key={s.id}
                member={s}
                rooms={rooms}
                onAssign={(roomId) => callbacks.assignStaff(s.id, roomId)}
              />
            ))}
          </div>
        ) : (
          <div className="mt-1.5 empty-state rounded-lg border border-dashed border-gold-dim/15 py-4">
            <p className="text-xs text-gold/70">No staff hired yet</p>
            <p className="mt-0.5 text-[0.6875rem] text-silver/60">
              Hire staff to keep rooms running
            </p>
          </div>
        )}
      </div>

      {/* ── Visitors / Recruitment ────────────────────── */}
      <div>
        <h4 className="mb-1.5 text-xs font-medium uppercase tracking-[0.15em] text-gold/80">
          Visitors ({visitors.length})
        </h4>
        {visitors.length > 0 ? (
          <div className="space-y-1.5">
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
          <div className="empty-state rounded-lg border border-dashed border-gold-dim/15 py-4">
            <p className="text-xs text-gold/70">No visitors right now</p>
            <p className="mt-0.5 text-[0.6875rem] text-silver/60">
              Talent arrives as the guild grows
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

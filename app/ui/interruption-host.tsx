import type {
  InterruptionInstance,
  IncidentPayload,
  RaidBossCommitmentPayload,
  AnnouncementPayload,
  WarningPayload,
} from "sim";

import { GameModal } from "./game-modal";

// ── Props ─────────────────────────────────────────────────────────────────

export interface InterruptionHostProps {
  activeInterruption: InterruptionInstance | null;
  onResolve: (instanceId: string, choiceId?: string) => void;
  onDismiss: () => void;
}

// ── Incident modal ────────────────────────────────────────────────────────

function IncidentModal({
  instance,
  payload,
  onResolve,
}: {
  instance: InterruptionInstance;
  payload: IncidentPayload;
  onResolve: (instanceId: string, choiceId?: string) => void;
}) {
  return (
    <GameModal
      title={payload.title}
      subtitle={`${payload.category} — ${payload.subjectSummary}`}
      dismissible={false}
    >
      <div className="space-y-5">
        <p className="text-sm leading-relaxed text-silver/80">{payload.briefing}</p>

        <div className="space-y-2">
          {payload.choices.map((choice) => (
            <button
              key={choice.choiceId}
              type="button"
              className="glass-card-inset flex w-full flex-col items-start gap-1 rounded-lg px-4 py-3 text-left transition-colors hover:border-[rgba(200,168,76,0.18)]"
              onClick={() => onResolve(instance.instanceId, choice.choiceId)}
            >
              <span className="text-sm font-medium text-silver-bright">{choice.label}</span>
              <span className="text-[0.75rem] leading-relaxed text-silver/60">
                {choice.description}
              </span>
              {choice.consequenceSummary && (
                <span className="mt-0.5 text-[0.6875rem] uppercase tracking-[0.1em] text-gold-dim">
                  {choice.consequenceSummary}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    </GameModal>
  );
}

// ── Boss commitment modal ─────────────────────────────────────────────────

function BossCommitmentModal({
  instance,
  payload,
  onResolve,
}: {
  instance: InterruptionInstance;
  payload: RaidBossCommitmentPayload;
  onResolve: (instanceId: string, choiceId?: string) => void;
}) {
  return (
    <GameModal
      title="Boss Encounter"
      subtitle="Your team has reached the floor boss. Commit to the fight or retreat."
      dismissible={false}
    >
      <div className="space-y-5">
        {/* Boss info */}
        <div className="glass-card-inset rounded-lg p-4">
          <div className="flex items-baseline justify-between gap-3">
            <h3 className="font-[family-name:var(--font-display)] text-base font-light tracking-[0.1em] text-gold">
              {payload.bossName}
            </h3>
            <span className="badge badge-ember">{payload.bossRank}</span>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-silver/70">{payload.stakeSummary}</p>
        </div>

        {/* Team condition */}
        <div className="glass-card-inset rounded-lg p-4">
          <h4 className="text-xs font-medium uppercase tracking-[0.16em] text-gold/80">
            Team Condition
          </h4>
          <p className="mt-1 text-sm text-silver/70">{payload.teamConditionSummary}</p>
          <p className="mt-1 text-[0.75rem] text-silver/50">
            {payload.operatorIds.length} operator{payload.operatorIds.length !== 1 ? "s" : ""}{" "}
            assigned
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            className="btn-ghost text-xs"
            onClick={() => onResolve(instance.instanceId, "retreat")}
          >
            retreat
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={() => onResolve(instance.instanceId, "commit")}
          >
            Commit
          </button>
        </div>
      </div>
    </GameModal>
  );
}

// ── Announcement modal ────────────────────────────────────────────────────

function AnnouncementModal({
  instance,
  payload,
  onResolve,
}: {
  instance: InterruptionInstance;
  payload: AnnouncementPayload;
  onResolve: (instanceId: string, choiceId?: string) => void;
}) {
  return (
    <GameModal
      title={payload.title}
      dismissible={false}
      footer={
        <div className="flex justify-end">
          <button
            type="button"
            className="btn-primary"
            onClick={() => onResolve(instance.instanceId)}
          >
            Acknowledge
          </button>
        </div>
      }
    >
      <p className="text-sm leading-relaxed text-silver/80">{payload.message}</p>
    </GameModal>
  );
}

// ── Warning modal ─────────────────────────────────────────────────────────

function WarningModal({
  instance,
  payload,
  onResolve,
}: {
  instance: InterruptionInstance;
  payload: WarningPayload;
  onResolve: (instanceId: string, choiceId?: string) => void;
}) {
  const isCritical = payload.severity === "critical";

  return (
    <GameModal
      title={payload.title}
      subtitle={isCritical ? "Critical — immediate attention required" : "Warning"}
      dismissible={false}
      footer={
        <div className="flex justify-end">
          <button
            type="button"
            className="btn-primary"
            onClick={() => onResolve(instance.instanceId)}
          >
            Understood
          </button>
        </div>
      }
    >
      <div
        className={`rounded-lg border px-4 py-3 text-sm leading-relaxed ${
          isCritical
            ? "border-[rgba(180,44,26,0.3)] bg-[rgba(180,44,26,0.08)] text-[#e08060]"
            : "border-[rgba(212,84,30,0.2)] bg-[rgba(212,84,30,0.06)] text-ember"
        }`}
      >
        {payload.message}
      </div>
    </GameModal>
  );
}

// ── Host component ────────────────────────────────────────────────────────

export function InterruptionHost({
  activeInterruption,
  onResolve,
  onDismiss: _onDismiss,
}: InterruptionHostProps) {
  if (!activeInterruption) {
    return null;
  }

  const { type, payload } = activeInterruption;

  // Settings interruptions are handled by the dedicated SettingsModal
  if (type === "settings") {
    return null;
  }

  switch (payload.kind) {
    case "incident":
      return (
        <IncidentModal instance={activeInterruption} payload={payload} onResolve={onResolve} />
      );

    case "raid_boss_commitment":
      return (
        <BossCommitmentModal
          instance={activeInterruption}
          payload={payload}
          onResolve={onResolve}
        />
      );

    case "announcement":
      return (
        <AnnouncementModal instance={activeInterruption} payload={payload} onResolve={onResolve} />
      );

    case "warning":
      return <WarningModal instance={activeInterruption} payload={payload} onResolve={onResolve} />;

    default:
      return null;
  }
}

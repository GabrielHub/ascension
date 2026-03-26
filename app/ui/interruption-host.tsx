import type {
  InterruptionInstance,
  IncidentPayload,
  RaidBossCommitmentPayload,
  AnnouncementPayload,
  WarningPayload,
} from "sim";
import type { GuidancePayload } from "sim/systems/interruptions";

import { GameModal } from "./game-modal";
import { getIncidentCategoryMeta } from "./_glossary";

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
  const subtitleParts = [
    getIncidentCategoryMeta(payload.category).label,
    payload.subjectSummary,
  ].filter(Boolean);

  return (
    <GameModal title={payload.title} subtitle={subtitleParts.join(" — ")} dismissible={false}>
      <div className="space-y-5">
        <p className="text-sm leading-relaxed text-silver/80">{payload.briefing}</p>

        <div className="space-y-2">
          {payload.choices.map((choice) => (
            <button
              key={choice.choiceId}
              type="button"
              className="glass-card-inset group flex w-full flex-col items-start gap-1 rounded-lg px-4 py-3 text-left transition-[background,border-color,box-shadow,color,transform] duration-200 hover:-translate-y-px hover:border-[rgba(200,168,76,0.22)] hover:bg-[linear-gradient(180deg,rgba(200,168,76,0.08)_0%,rgba(200,168,76,0.03)_100%),rgba(6,6,8,0.72)] hover:shadow-[inset_0_1px_0_rgba(240,236,228,0.04),0_10px_28px_rgba(0,0,0,0.28)] focus-visible:-translate-y-px focus-visible:border-[rgba(200,168,76,0.22)] focus-visible:bg-[linear-gradient(180deg,rgba(200,168,76,0.08)_0%,rgba(200,168,76,0.03)_100%),rgba(6,6,8,0.72)] focus-visible:shadow-[inset_0_1px_0_rgba(240,236,228,0.04),0_10px_28px_rgba(0,0,0,0.28)] focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-[rgba(200,168,76,0.35)]"
              onClick={() => onResolve(instance.instanceId, choice.choiceId)}
            >
              <span className="text-sm font-medium text-silver-bright transition-colors duration-200 group-hover:text-gold group-focus-visible:text-gold">
                {choice.label}
              </span>
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
            <span className="badge badge-ember">Rank {payload.bossRank.toUpperCase()}</span>
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

// ── Guidance modal (blocking beats) ───────────────────────────────────────

function GuidanceModal({
  instance,
  payload,
  onResolve,
}: {
  instance: InterruptionInstance;
  payload: GuidancePayload;
  onResolve: (instanceId: string, choiceId?: string) => void;
}) {
  const progressLabel =
    payload.totalMilestones > 0
      ? `Step ${payload.milestoneOrder} of ${payload.totalMilestones}`
      : undefined;

  return (
    <GameModal
      title={payload.title}
      subtitle={payload.subtitle ?? progressLabel}
      dismissible={false}
      footer={
        <div className="flex items-center justify-between gap-3">
          {progressLabel && payload.subtitle && (
            <span className="text-[0.6rem] uppercase tracking-[0.18em] text-gold-dim">
              {progressLabel}
            </span>
          )}
          <div className="ml-auto">
            <button
              type="button"
              className="btn-primary"
              onClick={() => onResolve(instance.instanceId, "acknowledged")}
            >
              {payload.ctaLabel}
            </button>
          </div>
        </div>
      }
    >
      <p className="text-sm leading-relaxed text-silver/80">{payload.body}</p>
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

    case "guidance":
      return (
        <GuidanceModal
          instance={activeInterruption}
          payload={payload as GuidancePayload}
          onResolve={onResolve}
        />
      );

    default:
      return null;
  }
}

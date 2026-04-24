import { useCallback, useEffect, useRef, type ReactNode } from "react";

import type {
  InterruptionInstance,
  IncidentPayload,
  RaidBossCommitmentPayload,
  AnnouncementPayload,
  WarningPayload,
} from "sim";
import type { GuidancePayload, RelocationPayload } from "sim/systems/interruptions";

import { GameModal } from "./game-modal";
import { getIncidentCategoryMeta } from "./_glossary";
import { PresenterPanel, type PresenterBindingProps } from "./presenter-panel";
import { RivalMoveModal } from "./rival-move-modal";

// ── Props ─────────────────────────────────────────────────────────────────

export interface InterruptionHostProps {
  activeInterruption: InterruptionInstance | null;
  guildName?: string;
  playerName?: string;
  onResolve: (instanceId: string, choiceId?: string) => void;
  onDismiss: () => void;
}

function NarrativeLayout({
  presenterId,
  presenterExpression,
  children,
}: PresenterBindingProps & {
  children: ReactNode;
}) {
  if (!presenterId) {
    return <>{children}</>;
  }

  return (
    <div className="flex flex-col gap-5 lg:flex-row lg:items-stretch">
      <PresenterPanel presenterId={presenterId} presenterExpression={presenterExpression} />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

export function IncidentContent({
  briefing,
  choices,
  onChoiceSelect,
}: {
  briefing: string;
  choices: ReadonlyArray<{
    choiceId: string;
    label: string;
    description: string;
    consequenceSummary?: string;
  }>;
  onChoiceSelect?: (choiceId: string) => void;
}) {
  return (
    <div className="space-y-5">
      <p className="text-sm leading-relaxed text-silver/80">{briefing}</p>
      <div className="space-y-2">
        {choices.map((choice) => {
          const inner = (
            <>
              <span
                className={`text-sm font-medium text-silver-bright${onChoiceSelect ? " transition-colors duration-200 group-hover:text-gold group-focus-visible:text-gold" : ""}`}
              >
                {choice.label}
              </span>
              <span className="text-sm leading-relaxed text-silver/60">{choice.description}</span>
              {choice.consequenceSummary && (
                <span className="mt-0.5 text-sm uppercase tracking-[0.1em] text-gold-dim">
                  {choice.consequenceSummary}
                </span>
              )}
            </>
          );

          return onChoiceSelect ? (
            <button
              key={choice.choiceId}
              type="button"
              className="glass-card-inset group flex w-full flex-col items-start gap-1 rounded-lg px-4 py-3 text-left transition-[background,border-color,box-shadow,color,transform] duration-200 hover:-translate-y-px hover:border-[rgba(200,168,76,0.22)] hover:bg-[linear-gradient(180deg,rgba(200,168,76,0.08)_0%,rgba(200,168,76,0.03)_100%),rgba(6,6,8,0.72)] hover:shadow-[inset_0_1px_0_rgba(240,236,228,0.04),0_10px_28px_rgba(0,0,0,0.28)] focus-visible:-translate-y-px focus-visible:border-[rgba(200,168,76,0.22)] focus-visible:bg-[linear-gradient(180deg,rgba(200,168,76,0.08)_0%,rgba(200,168,76,0.03)_100%),rgba(6,6,8,0.72)] focus-visible:shadow-[inset_0_1px_0_rgba(240,236,228,0.04),0_10px_28px_rgba(0,0,0,0.28)] focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-[rgba(200,168,76,0.35)]"
              onClick={() => onChoiceSelect(choice.choiceId)}
            >
              {inner}
            </button>
          ) : (
            <div
              key={choice.choiceId}
              className="glass-card-inset flex w-full flex-col items-start gap-1 rounded-lg px-4 py-3"
            >
              {inner}
            </div>
          );
        })}
      </div>
    </div>
  );
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
      <NarrativeLayout
        presenterId={payload.presenterId}
        presenterExpression={payload.presenterExpression}
      >
        <IncidentContent
          briefing={payload.briefing}
          choices={payload.choices}
          onChoiceSelect={(choiceId) => onResolve(instance.instanceId, choiceId)}
        />
      </NarrativeLayout>
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
      <NarrativeLayout
        presenterId={payload.presenterId}
        presenterExpression={payload.presenterExpression}
      >
        <div className="space-y-5">
          <div className="glass-card-inset rounded-lg p-4">
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="font-[family-name:var(--font-display)] text-base font-light tracking-[0.1em] text-gold">
                {payload.bossName}
              </h3>
              <span className="badge badge-ember">Rank {payload.bossRank.toUpperCase()}</span>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-silver/70">{payload.stakeSummary}</p>
          </div>

          <div className="glass-card-inset rounded-lg p-4">
            <h4 className="text-xs font-medium uppercase tracking-[0.16em] text-gold/80">
              Team Condition
            </h4>
            <p className="mt-1 text-sm text-silver/70">{payload.teamConditionSummary}</p>
            <p className="mt-1 text-sm text-silver/50">
              {payload.operatorIds.length} operator{payload.operatorIds.length !== 1 ? "s" : ""}{" "}
              assigned
            </p>
          </div>

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
      </NarrativeLayout>
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
      <NarrativeLayout
        presenterId={payload.presenterId}
        presenterExpression={payload.presenterExpression}
      >
        <p className="text-sm leading-relaxed text-silver/80">{payload.message}</p>
      </NarrativeLayout>
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
      <NarrativeLayout
        presenterId={payload.presenterId}
        presenterExpression={payload.presenterExpression}
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
      </NarrativeLayout>
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
            <span className="text-xs uppercase tracking-[0.18em] text-gold-dim">
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
      <NarrativeLayout
        presenterId={payload.presenterId}
        presenterExpression={payload.presenterExpression}
      >
        <p className="text-sm leading-relaxed text-silver/80">{payload.body}</p>
      </NarrativeLayout>
    </GameModal>
  );
}

// ── Relocation modal ─────────────────────────────────────────────────────

function RelocationModal({
  instance,
  payload,
  guildName,
  playerName,
  onResolve,
}: {
  instance: InterruptionInstance;
  payload: RelocationPayload;
  guildName?: string;
  playerName?: string;
  onResolve: (instanceId: string, choiceId?: string) => void;
}) {
  const resolvedGuildName = guildName ?? "your guild";
  const resolvedPlayerName = playerName ?? "Boss";
  const relocationCopy =
    payload.buildingToId === "building/skyscraper"
      ? {
          offerLead:
            "A lease for a licensed headquarters in Midtown Manhattan is available. Moving assistance and a transition budget are included.",
          decisionTitle: "Relocate to Ascension Tower?",
          decisionLead:
            "Accepting spends {cost} from the treasury. Porter's closes as headquarters. All operators, presenters, gear, cash, and reputation carry over. Room assignments reset in the new building.",
          decisionDetail:
            "Ascension Tower starts with 11 rooms across five floors and an 18-operator cap. Operations, recovery, training, logistics, fabrication, and rooftop staging are already built into the stack. You cannot reverse this decision, and relocation is only valid when no contract, raid, or blocking interruption is still in progress.",
          movingTitle: "Welcome to Ascension Tower",
          movingSubtitle: "Midtown, Manhattan",
          movingBody: [
            "Porter's closed as headquarters for the last time. The bar lights went dark, the office files got boxed, and the waterfront keys changed hands.",
            "The tower is brighter, quieter, and too clean to feel lived in yet. Operators drift between the lobby, the operations floor, and the rooftop trying to decide which parts feel like work and which parts finally feel like arrival.",
            "It is not comfortable yet. But it is permanent.",
          ],
        }
      : {
          offerLead:
            "A lease for a larger licensed headquarters in Red Hook, Brooklyn is available. Moving assistance and a transitional operating budget are included.",
          decisionTitle: "Relocate to Porter's?",
          decisionLead:
            "Accepting spends {cost} from the treasury. The bodega lease terminates. All operators, presenters, gear, cash, and reputation carry over. Room assignments reset in the new building.",
          decisionDetail:
            "Porter's starts with 7 rooms across two floors and a 12-operator cap. Training and dedicated recovery unlock for the first time. You cannot reverse this decision, and relocation is only valid when no contract, raid, or blocking interruption is still in progress.",
          movingTitle: "Welcome to Porter's",
          movingSubtitle: "Red Hook, Brooklyn",
          movingBody: [
            "The register closed for the last time. Aina counted out the drawer, put the keys on the counter, and turned off the lights. The bodega is behind you now.",
            "The new building is bigger, emptier, and unfamiliar. Harbor air comes through the open windows. The operators spread out across two floors, looking for places to sit. Nobody knows where anything is yet, least of all {playerName}.",
            "It is not home yet. But it will be.",
          ],
        };
  const decisionLead = relocationCopy.decisionLead.replace("{cost}", String(payload.treasuryCost));
  const movingBody = relocationCopy.movingBody.map((paragraph) =>
    paragraph.replace("{playerName}", resolvedPlayerName),
  );

  if (payload.beat === "offer") {
    return (
      <GameModal
        title="Facility Upgrade Notice"
        subtitle="City of New York — Guild Licensing Office"
        dismissible={false}
        footer={
          <div className="flex justify-end">
            <button
              type="button"
              className="btn-primary"
              onClick={() => onResolve(instance.instanceId, "continue")}
            >
              Review Offer
            </button>
          </div>
        }
      >
        <NarrativeLayout
          presenterId={payload.presenterId}
          presenterExpression={payload.presenterExpression}
        >
          <div className="space-y-4">
            <p className="text-sm leading-relaxed text-silver/80">
              {resolvedGuildName}'s performance record, facility condition, and reputation score
              qualify it for a facility upgrade under the city's guild infrastructure program.
            </p>
            <p className="text-sm leading-relaxed text-silver/80">{relocationCopy.offerLead}</p>
            <div className="glass-card-inset rounded-lg p-3">
              <p className="text-xs uppercase tracking-[0.14em] text-gold/80">
                Relocation deposit: ${payload.treasuryCost}
              </p>
              <p className="mt-1 text-sm leading-relaxed text-silver/60">
                Review the offer now. Final confirmation happens in the next step.
              </p>
            </div>
          </div>
        </NarrativeLayout>
      </GameModal>
    );
  }

  if (payload.beat === "decision") {
    return (
      <GameModal
        title={relocationCopy.decisionTitle}
        subtitle="This decision is irreversible"
        dismissible={false}
      >
        <NarrativeLayout
          presenterId={payload.presenterId}
          presenterExpression={payload.presenterExpression}
        >
          <div className="space-y-5">
            <p className="text-sm leading-relaxed text-silver/80">{decisionLead}</p>
            <div className="glass-card-inset rounded-lg p-3">
              <p className="text-xs leading-relaxed text-silver/60">
                {relocationCopy.decisionDetail}
              </p>
            </div>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                className="btn-ghost text-xs"
                onClick={() => onResolve(instance.instanceId, "defer")}
              >
                Not yet
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={() => onResolve(instance.instanceId, "accept")}
              >
                Accept and Relocate
              </button>
            </div>
          </div>
        </NarrativeLayout>
      </GameModal>
    );
  }

  // beat === "moving"
  return (
    <GameModal
      title={relocationCopy.movingTitle}
      subtitle={relocationCopy.movingSubtitle}
      dismissible={false}
      footer={
        <div className="flex justify-end">
          <button
            type="button"
            className="btn-primary"
            onClick={() => onResolve(instance.instanceId, "acknowledge")}
          >
            Begin
          </button>
        </div>
      }
    >
      <NarrativeLayout
        presenterId={payload.presenterId}
        presenterExpression={payload.presenterExpression}
      >
        <div className="space-y-4">
          <p className="text-sm leading-relaxed text-silver/80">{movingBody[0]}</p>
          <p className="text-sm leading-relaxed text-silver/80">{movingBody[1]}</p>
          <p className="text-sm leading-relaxed text-silver/60 italic">{movingBody[2]}</p>
        </div>
      </NarrativeLayout>
    </GameModal>
  );
}

// ── Host component ────────────────────────────────────────────────────────

export function InterruptionHost({
  activeInterruption,
  guildName,
  playerName,
  onResolve,
  onDismiss: _onDismiss,
}: InterruptionHostProps) {
  const resolvingInstanceRef = useRef<string | null>(null);

  useEffect(() => {
    resolvingInstanceRef.current = null;
  }, [activeInterruption?.instanceId]);

  const handleResolve = useCallback(
    (instanceId: string, choiceId?: string) => {
      if (resolvingInstanceRef.current === instanceId) {
        return;
      }

      resolvingInstanceRef.current = instanceId;
      onResolve(instanceId, choiceId);
    },
    [onResolve],
  );

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
        <IncidentModal instance={activeInterruption} payload={payload} onResolve={handleResolve} />
      );

    case "raid_boss_commitment":
      return (
        <BossCommitmentModal
          instance={activeInterruption}
          payload={payload}
          onResolve={handleResolve}
        />
      );

    case "relocation":
      return (
        <RelocationModal
          instance={activeInterruption}
          payload={payload}
          guildName={guildName}
          playerName={playerName}
          onResolve={handleResolve}
        />
      );

    case "announcement":
      return (
        <AnnouncementModal
          instance={activeInterruption}
          payload={payload}
          onResolve={handleResolve}
        />
      );

    case "warning":
      return (
        <WarningModal instance={activeInterruption} payload={payload} onResolve={handleResolve} />
      );

    case "guidance":
      return (
        <GuidanceModal instance={activeInterruption} payload={payload} onResolve={handleResolve} />
      );

    case "rival_move":
      return (
        <RivalMoveModal instance={activeInterruption} payload={payload} onResolve={handleResolve} />
      );

    default:
      return null;
  }
}

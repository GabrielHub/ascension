import { getContractHintMeta } from "./_glossary";
import type { RaidTranscriptEvent } from "./view-models";

// ── Shared transcript event styling ──────────────────────────────────────

export const TRANSCRIPT_KIND_STYLE: Record<string, { accent: string; label: string }> = {
  goal_check: { accent: "text-gold/80", label: "Check" },
  skirmish_start: { accent: "text-ember/80", label: "Skirmish" },
  skirmish_end: { accent: "text-ember/60", label: "Resolved" },
  skirmish_round: { accent: "text-ember/50", label: "Round" },
  loot_gain: { accent: "text-gold/70", label: "Loot" },
  intel_gain: { accent: "text-gold/70", label: "Intel" },
  hazard: { accent: "text-smolder", label: "Hazard" },
  injury: { accent: "text-magma", label: "Injury" },
  operator_down: { accent: "text-magma", label: "Down" },
  discover_enemy: { accent: "text-ember/70", label: "Contact" },
  discover_feature: { accent: "text-silver/60", label: "Feature" },
  boss_threshold: { accent: "text-ember", label: "Boss" },
  boss_commit: { accent: "text-ember", label: "Commit" },
  boss_result: { accent: "text-gold", label: "Boss" },
  deploy: { accent: "text-gold/60", label: "Deploy" },
  retreat_begin: { accent: "text-smolder", label: "Retreat" },
};

export function GoalCheckBadge({ grade }: { grade: string }) {
  const badgeClass =
    grade === "pass" ? "badge-gold" : grade === "mixed" ? "badge-slate" : "badge-ember";
  return <span className={`badge text-xs ${badgeClass}`}>{grade}</span>;
}

export function TranscriptEventLine({ event }: { event: RaidTranscriptEvent }) {
  const style = TRANSCRIPT_KIND_STYLE[event.kind] ?? {
    accent: "text-silver/50",
    label: event.kind,
  };
  const enemyLabel = event.enemyTemplateId
    ? getContractHintMeta(event.enemyTemplateId).label
    : null;

  return (
    <div className="flex items-start gap-1.5 py-0.5">
      <span className={`shrink-0 text-xs font-medium uppercase tracking-wider ${style.accent}`}>
        {style.label}
      </span>
      <span className="flex-1 text-xs leading-snug text-silver/55">{event.message}</span>
      {event.goalCheckGrade && <GoalCheckBadge grade={event.goalCheckGrade} />}
      {enemyLabel && <span className="shrink-0 text-xs text-ember/50">{enemyLabel}</span>}
    </div>
  );
}

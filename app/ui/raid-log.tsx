import type { RaidOperatorOutcomeViewModel, RaidSummaryViewModel } from "./view-models";
import { getNarrativeTagMeta } from "./_glossary";
import { Tooltip } from "./_tooltip";

interface RaidLogProps {
  history: readonly RaidSummaryViewModel[];
}

const RESULT_STYLES: Record<string, { badge: string; label: string }> = {
  success: { badge: "badge-gold", label: "Success" },
  failure: { badge: "badge-ember", label: "Failed" },
  mixed: { badge: "badge-slate", label: "Mixed" },
};

function formatSummaryTimestamp(endedAt: string): string {
  const endedDate = new Date(endedAt);
  if (Number.isNaN(endedDate.getTime())) return endedAt;
  return endedDate.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function OperatorOutcomeLine({ outcome }: { outcome: RaidOperatorOutcomeViewModel }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={`h-1.5 w-1.5 rounded-full ${outcome.died ? "bg-magma" : "bg-gold/40"}`} />
      <span
        className={`text-[0.6875rem] ${
          outcome.died ? "text-magma line-through" : "text-silver/60"
        }`}
      >
        {outcome.operatorName}
      </span>
      {outcome.died && <span className="text-[0.6875rem] font-medium text-magma">KIA</span>}
    </div>
  );
}

function RaidSummaryCard({ summary }: { summary: RaidSummaryViewModel }) {
  const style = RESULT_STYLES[summary.result] ?? RESULT_STYLES.mixed;
  const casualties = summary.operatorOutcomes.filter((o) => o.died);
  const endedAtLabel = formatSummaryTimestamp(summary.endedAt);
  const summaryLine = summary.location ? `${summary.location} · ${endedAtLabel}` : endedAtLabel;

  return (
    <div className="glass-card-inset p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h4 className="text-xs font-medium text-silver-bright">{summary.missionName}</h4>
          <p className="mt-0.5 text-xs text-silver/60">{summaryLine}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {casualties.length > 0 && (
            <span className="badge badge-ember">{casualties.length} KIA</span>
          )}
          <span className={`badge ${style.badge}`}>{style.label}</span>
        </div>
      </div>

      <div className="mt-2 flex items-center gap-3 text-xs">
        <span className={summary.cashDelta >= 0 ? "text-gold" : "text-danger"}>
          {summary.cashDelta >= 0 ? "+" : ""}
          {Math.round(summary.cashDelta)} cash
        </span>
        <span className={summary.reputationDelta >= 0 ? "text-gold/80" : "text-danger"}>
          {summary.reputationDelta >= 0 ? "+" : ""}
          {Math.round(summary.reputationDelta)} rep
        </span>
      </div>

      {/* Per-operator outcome lines */}
      {summary.operatorOutcomes.length > 0 && (
        <div className="mt-2 space-y-0.5 border-t border-[rgba(200,168,76,0.04)] pt-2">
          {summary.operatorOutcomes.map((outcome) => (
            <OperatorOutcomeLine key={outcome.operatorId} outcome={outcome} />
          ))}
        </div>
      )}

      {(() => {
        const displayTags = summary.narrativeTags.filter(
          (tag) =>
            !tag.startsWith("mission:") &&
            !tag.startsWith("location:") &&
            !tag.startsWith("result:"),
        );
        if (displayTags.length === 0) return null;
        return (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {displayTags.map((tag) => {
              const { label, tip } = getNarrativeTagMeta(tag);
              return (
                <Tooltip key={tag} content={tip}>
                  <span className="rounded bg-[rgba(200,168,76,0.04)] px-1.5 py-0.5 text-[0.6875rem] text-silver/60">
                    {label}
                  </span>
                </Tooltip>
              );
            })}
          </div>
        );
      })()}
    </div>
  );
}

export function RaidLog({ history }: RaidLogProps) {
  const orderedHistory = [...history].sort(
    (a, b) =>
      new Date(b.endedAt).getTime() - new Date(a.endedAt).getTime() || a.id.localeCompare(b.id),
  );

  if (history.length === 0) {
    return (
      <div className="empty-state rounded-lg border border-dashed border-gold-dim/15 py-8">
        <p className="text-xs text-silver/60">No raid history yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-medium uppercase tracking-[0.15em] text-gold/80">
        Raid History ({history.length})
      </h3>
      {orderedHistory.map((summary) => (
        <RaidSummaryCard key={summary.id} summary={summary} />
      ))}
    </div>
  );
}

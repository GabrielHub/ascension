import type { RaidSummaryViewModel } from "./view-models";

interface RaidLogProps {
  history: readonly RaidSummaryViewModel[];
}

const RESULT_STYLES: Record<string, { badge: string; label: string }> = {
  success: { badge: "badge-gold", label: "Success" },
  failure: { badge: "badge-ember", label: "Failed" },
  mixed: { badge: "badge-slate", label: "Mixed" },
};

function RaidSummaryCard({ summary }: { summary: RaidSummaryViewModel }) {
  const style = RESULT_STYLES[summary.result] ?? RESULT_STYLES.mixed;

  return (
    <div className="glass-card-inset p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h4 className="text-xs font-medium text-silver-bright">{summary.missionName}</h4>
          <p className="mt-0.5 text-xs text-silver/60">
            {summary.location || new Date(summary.endedAt).toLocaleDateString()}
          </p>
        </div>
        <span className={`badge ${style.badge}`}>{style.label}</span>
      </div>

      <div className="mt-2 flex items-center gap-3 text-xs">
        <span className={summary.cashDelta >= 0 ? "text-gold" : "text-danger"}>
          {summary.cashDelta >= 0 ? "+" : ""}
          {summary.cashDelta} cash
        </span>
        <span className={summary.reputationDelta >= 0 ? "text-gold/80" : "text-danger"}>
          {summary.reputationDelta >= 0 ? "+" : ""}
          {summary.reputationDelta} rep
        </span>
      </div>

      {summary.narrativeTags.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {summary.narrativeTags.map((tag) => (
            <span
              key={tag}
              className="rounded bg-[rgba(200,168,76,0.04)] px-1.5 py-0.5 text-[0.6875rem] text-silver/60"
            >
              {tag.replace(/_/g, " ")}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export function RaidLog({ history }: RaidLogProps) {
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
      {history.map((summary) => (
        <RaidSummaryCard key={summary.id} summary={summary} />
      ))}
    </div>
  );
}

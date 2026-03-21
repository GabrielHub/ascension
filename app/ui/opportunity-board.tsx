import type { RaidOpportunityViewModel } from "./view-models";

interface OpportunityBoardProps {
  opportunities: readonly RaidOpportunityViewModel[];
}

const THREAT_COLORS: Record<string, string> = {
  E: "text-gold/70",
  D: "text-gold/80",
  C: "text-gold",
  B: "text-ember",
  A: "text-ember",
  S: "text-smolder",
};

const STATUS_BADGE: Record<string, { className: string; label: string }> = {
  available: { className: "badge-gold", label: "Open" },
  claimed: { className: "badge-ember", label: "Claimed" },
  expired: { className: "badge-slate", label: "Expired" },
};

function OpportunityCard({ opportunity }: { opportunity: RaidOpportunityViewModel }) {
  const statusStyle = STATUS_BADGE[opportunity.status] ?? STATUS_BADGE.available;
  const threatColor = THREAT_COLORS[opportunity.threatRank] ?? "text-silver/60";

  return (
    <div className="glass-card p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h4 className="truncate text-sm font-medium text-silver-bright">
            {opportunity.missionName}
          </h4>
          <p className="mt-0.5 text-xs text-silver/60">{opportunity.location}</p>
        </div>
        <span className={`badge ${statusStyle.className}`}>{statusStyle.label}</span>
      </div>

      <div className="mt-3 flex items-center justify-between text-xs">
        <div className="flex items-center gap-3">
          <span className={threatColor}>Threat {opportunity.threatRank}</span>
          <span className="text-gold/70">Intel: {opportunity.intelConfidence}</span>
        </div>
        {opportunity.recommendedOperatorCount > 0 && (
          <span className="text-silver/60">
            {opportunity.recommendedOperatorCount} ops recommended
          </span>
        )}
      </div>

      {(opportunity.reward > 0 || opportunity.risk > 0) && (
        <div className="mt-2 flex items-center gap-3 text-xs">
          {opportunity.reward > 0 && (
            <span className="text-gold/70">Reward {opportunity.reward}</span>
          )}
          {opportunity.risk > 0 && (
            <span className="text-ember">Risk {Math.round(opportunity.risk)}</span>
          )}
        </div>
      )}

      <div className="mt-3 flex items-center gap-4 border-t border-[rgba(200,168,76,0.04)] pt-2.5 text-xs">
        <span className="text-gold/70">{opportunity.interestedCount} interested</span>
        {opportunity.claimedCount > 0 && (
          <span className="text-ember">{opportunity.claimedCount} committed</span>
        )}
      </div>
    </div>
  );
}

export function OpportunityBoard({ opportunities }: OpportunityBoardProps) {
  if (opportunities.length === 0) {
    return (
      <div className="space-y-3">
        <h3 className="text-xs font-medium uppercase tracking-[0.15em] text-gold/80">
          Raid Opportunities
        </h3>
        <div className="empty-state rounded-lg border border-dashed border-gold-dim/15 py-10">
          <div className="empty-state-icon">&#9672;</div>
          <p className="text-[0.7rem] font-medium text-gold/70">No opportunities posted</p>
          <p className="mt-1 text-xs text-silver/60">
            Opportunities appear as the guild gains reputation
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div>
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-medium uppercase tracking-[0.15em] text-gold/80">
            Raid Opportunities ({opportunities.length})
          </h3>
        </div>
        <p className="mt-0.5 text-xs text-silver/60">
          Operators evaluate and claim opportunities autonomously
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {opportunities.map((opp) => (
          <OpportunityCard key={opp.id} opportunity={opp} />
        ))}
      </div>
    </div>
  );
}

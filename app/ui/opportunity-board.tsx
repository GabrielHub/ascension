import { RAID_TIPS, getIntelMeta } from "./_glossary";
import { emptyStateClass, emptyStateIconClass } from "./styles";
import type {
  OperatorViewModel,
  RaidOpportunityViewModel,
  RosterPressureViewModel,
} from "./view-models";

interface OpportunityBoardProps {
  guildName?: string;
  opportunities: readonly RaidOpportunityViewModel[];
  rosterPressure: RosterPressureViewModel;
  operators?: readonly OperatorViewModel[];
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
          <span className={threatColor} title={RAID_TIPS.threatRank}>
            Threat {opportunity.threatRank}
          </span>
          <span
            className="text-gold/70"
            title={getIntelMeta(opportunity.intelConfidence.toLowerCase()).tip}
          >
            Intel: {opportunity.intelConfidence}
          </span>
        </div>
        {opportunity.recommendedOperatorCount > 0 && (
          <span className="text-silver/60" title={RAID_TIPS.recommended}>
            {opportunity.recommendedOperatorCount} ops recommended
          </span>
        )}
      </div>

      {(opportunity.reward > 0 || opportunity.risk > 0) && (
        <div className="mt-2 flex items-center gap-3 text-xs">
          {opportunity.reward > 0 && (
            <span className="text-gold/70" title={RAID_TIPS.reward}>
              Reward {Math.round(opportunity.reward)}
            </span>
          )}
          {opportunity.risk > 0 && (
            <span className="text-ember" title={RAID_TIPS.risk}>
              Risk {Math.round(opportunity.risk)}
            </span>
          )}
        </div>
      )}

      <div className="mt-3 flex items-center gap-4 border-t border-[rgba(200,168,76,0.04)] pt-2.5 text-xs">
        <span className="text-gold/70" title={RAID_TIPS.interested}>
          {opportunity.interestedCount} interested
        </span>
        {opportunity.claimedCount > 0 && (
          <span className="text-ember" title={RAID_TIPS.committed}>
            {opportunity.claimedCount} committed
          </span>
        )}
      </div>
    </div>
  );
}

export function OpportunityBoard({
  guildName = "the guild",
  opportunities,
  rosterPressure,
  operators = [],
}: OpportunityBoardProps) {
  const rosterThin = rosterPressure.replacementPressureLevel !== "stable";

  // Phase 2: team readiness summary
  const livingOperators = operators.filter((op) => op.lifecycle.status === "active");
  const willingCount = livingOperators.filter(
    (op) => op.availableForRaid && !op.refusalRisk,
  ).length;
  const refusingCount = livingOperators.filter((op) => op.refusalRisk).length;

  if (opportunities.length === 0) {
    return (
      <div className="space-y-3">
        <h3 className="text-xs font-medium uppercase tracking-[0.15em] text-gold/80">
          Raid Opportunities
        </h3>
        {rosterThin && <RosterThinWarning rosterPressure={rosterPressure} />}
        <div
          className={`${emptyStateClass} rounded-lg border border-dashed border-gold-dim/15 py-10`}
        >
          <div className={emptyStateIconClass}>&#9672;</div>
          <p className="text-[0.7rem] font-medium text-gold/70">No opportunities posted</p>
          <p className="mt-1 text-xs text-silver/60">
            Opportunities appear as {guildName} gains reputation
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

      {/* Phase 2: Team readiness summary */}
      {livingOperators.length > 0 && (
        <div className="flex items-center gap-3 text-[0.6875rem]">
          <span className="text-gold/70">{willingCount} willing</span>
          {refusingCount > 0 && <span className="text-ember">{refusingCount} refusing</span>}
        </div>
      )}

      {rosterThin && <RosterThinWarning rosterPressure={rosterPressure} />}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {opportunities.map((opp) => (
          <OpportunityCard key={opp.id} opportunity={opp} />
        ))}
      </div>
    </div>
  );
}

function RosterThinWarning({ rosterPressure }: { rosterPressure: RosterPressureViewModel }) {
  const isCritical = rosterPressure.replacementPressureLevel === "critical";
  return (
    <div
      className={`glass-card-inset flex items-center gap-2 px-3 py-2 ${
        isCritical ? "border-l-2 border-l-magma" : "border-l-2 border-l-ember"
      }`}
    >
      <span className={`text-xs font-medium ${isCritical ? "text-magma" : "text-ember"}`}>
        {isCritical ? "Roster critical" : "Roster strained"}
      </span>
      <span className="text-[0.6875rem] text-silver/60">
        {rosterPressure.livingOperatorCount}/{rosterPressure.operatorCapacity} on roster
        {rosterPressure.vacancyCount > 0 &&
          ` · ${rosterPressure.vacancyCount} ${rosterPressure.vacancyCount === 1 ? "vacancy" : "vacancies"}`}
      </span>
    </div>
  );
}

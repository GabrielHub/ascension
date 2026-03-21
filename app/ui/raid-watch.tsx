import type { ActiveRaidViewModel } from "./view-models";

interface RaidWatchProps {
  activeRaids: readonly ActiveRaidViewModel[];
}

function ActiveRaidCard({ raid }: { raid: ActiveRaidViewModel }) {
  const progressPct = Math.min(100, Math.max(0, raid.revealProgress));

  return (
    <div className="glass-card p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h4 className="text-sm font-medium text-silver-bright">{raid.missionName}</h4>
          {raid.location && <p className="mt-0.5 text-xs text-silver/60">{raid.location}</p>}
        </div>
        <span className="badge badge-ember">Active</span>
      </div>

      <div className="mt-2 flex items-center gap-3 text-xs text-gold/70">
        {raid.operatorIds.length > 0 && <span>{raid.operatorIds.length} operators deployed</span>}
        {raid.threat > 0 && <span>Threat {raid.threat}</span>}
        {raid.cohesion > 0 && <span>Cohesion {Math.round(raid.cohesion)}</span>}
        {raid.durationHours > 0 && <span>{raid.durationHours}h</span>}
      </div>

      <div className="mt-3">
        <div className="flex items-center justify-between text-xs">
          <span className="uppercase tracking-wider text-gold/70">Reveal Progress</span>
          <span className="tabular-nums text-ember">{Math.round(progressPct)}%</span>
        </div>
        <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-[rgba(6,6,8,0.6)]">
          <div
            className="h-full rounded-full bg-ember/60 transition-all duration-700"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>
    </div>
  );
}

export function RaidWatch({ activeRaids }: RaidWatchProps) {
  if (activeRaids.length === 0) {
    return (
      <div className="empty-state rounded-lg border border-dashed border-gold-dim/15 py-10">
        <div className="empty-state-icon">&mdash;</div>
        <p className="text-xs font-medium text-gold/70">No active raids</p>
        <p className="mt-1 text-xs text-silver/60">Operators are currently between operations</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-medium uppercase tracking-[0.15em] text-ember">
        Active Operations ({activeRaids.length})
      </h3>
      {activeRaids.map((raid) => (
        <ActiveRaidCard key={raid.id} raid={raid} />
      ))}
    </div>
  );
}

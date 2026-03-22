import { OpportunityBoard } from "./opportunity-board";
import { RaidLog } from "./raid-log";
import { RaidWatch } from "./raid-watch";
import type { FocusPayload } from "render";
import type {
  ContractSiteViewModel,
  OperationsViewModel,
  OperatorViewModel,
  RosterPressureViewModel,
} from "./view-models";

interface OperationsPanelProps {
  operations: OperationsViewModel;
  /** Full operator list for raid-context portrait rendering. */
  operators: readonly OperatorViewModel[];
  rosterPressure: RosterPressureViewModel;
  focus: FocusPayload | null;
}

function ContractSiteStatus({ contract }: { contract: ContractSiteViewModel }) {
  const isEnded = contract.bossDefeated || contract.contractLost;

  return (
    <div className="glass-card p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-xs font-medium uppercase tracking-[0.15em] text-gold/80">
            Secured Contract
          </h3>
          <p className="mt-1 text-sm font-medium text-silver-bright">{contract.missionName}</p>
          <p className="mt-0.5 text-xs text-silver/60">{contract.location}</p>
        </div>
        <span
          className={`badge ${
            contract.bossDefeated
              ? "badge-gold"
              : contract.contractLost
                ? "badge-ember"
                : "badge-slate"
          }`}
        >
          {contract.bossDefeated
            ? "Boss Defeated"
            : contract.contractLost
              ? "Contract Lost"
              : "Active"}
        </span>
      </div>

      {!isEnded && (
        <div className="mt-3 flex items-center gap-4 text-xs">
          <div className="flex items-baseline gap-1">
            <span className="text-gold/70">Threat</span>
            <span className="tabular-nums text-silver-bright">{contract.threat}</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-gold/70">Intel</span>
            <span className="tabular-nums text-silver-bright">{contract.intel}</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-gold/70">Reward</span>
            <span className="tabular-nums text-silver-bright">{Math.round(contract.reward)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export function OperationsPanel({
  operations,
  operators,
  rosterPressure,
  focus,
}: OperationsPanelProps) {
  return (
    <div className="animate-enter space-y-5">
      {operations.contractSite && <ContractSiteStatus contract={operations.contractSite} />}

      <RaidWatch
        activeRaids={operations.activeRaids}
        operators={operators}
        selectedRaidId={focus?.targetKind === "team" ? focus.targetId : null}
      />

      <OpportunityBoard opportunities={operations.opportunities} rosterPressure={rosterPressure} />

      <RaidLog history={operations.raidHistory} />
    </div>
  );
}

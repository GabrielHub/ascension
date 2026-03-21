import { OpportunityBoard } from "./opportunity-board";
import { RaidLog } from "./raid-log";
import { RaidWatch } from "./raid-watch";
import type {
  OperationsViewModel,
  OperatorViewModel,
  RosterPressureViewModel,
} from "./view-models";

interface OperationsPanelProps {
  operations: OperationsViewModel;
  /** Full operator list for raid-context portrait rendering. */
  operators: readonly OperatorViewModel[];
  rosterPressure: RosterPressureViewModel;
}

export function OperationsPanel({ operations, operators, rosterPressure }: OperationsPanelProps) {
  return (
    <div className="animate-enter space-y-6">
      <RaidWatch activeRaids={operations.activeRaids} operators={operators} />

      <OpportunityBoard opportunities={operations.opportunities} rosterPressure={rosterPressure} />

      <RaidLog history={operations.raidHistory} />
    </div>
  );
}

import { OpportunityBoard } from "./opportunity-board";
import { RaidLog } from "./raid-log";
import { RaidWatch } from "./raid-watch";
import type { OperationsViewModel } from "./view-models";

interface OperationsPanelProps {
  operations: OperationsViewModel;
}

export function OperationsPanel({ operations }: OperationsPanelProps) {
  return (
    <div className="animate-enter space-y-6">
      <RaidWatch activeRaids={operations.activeRaids} />

      <OpportunityBoard opportunities={operations.opportunities} />

      <RaidLog history={operations.raidHistory} />
    </div>
  );
}

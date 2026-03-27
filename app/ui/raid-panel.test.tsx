import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { OperationsPanel } from "./raid-panel";
import type {
  GameCallbacks,
  OperationsViewModel,
  OperatorViewModel,
  RosterPressureViewModel,
} from "./view-models";

const callbacks: Pick<GameCallbacks, "bidContract" | "advanceContract"> = {
  bidContract: vi.fn(),
  advanceContract: vi.fn(),
};

const rosterPressure: RosterPressureViewModel = {
  operatorCapacity: 7,
  livingOperatorCount: 4,
  vacancyCount: 3,
  unavailableOperatorIds: [],
  recentDeathOperatorIds: [],
  replacementPressureLevel: "stable",
};

function makeOperations(overrides: Partial<OperationsViewModel> = {}): OperationsViewModel {
  return {
    contractLifecycle: "resolved",
    contractSite: null,
    contractResult: {
      contractSiteId: "contract/1",
      missionName: "Clearance",
      siteConceptName: "Basement Annex",
      location: "Lower East Side",
      rank: "F",
      outcome: "boss_defeated",
      totalRaids: 2,
      totalCashEarned: 180,
      totalReputationEarned: 14,
      operatorDeaths: 0,
      contributingFactors: [
        "policy:contract_posture:aggressive",
        "policy:recovery_triage:full_recovery",
      ],
    },
    postedContracts: [],
    opportunities: [],
    activeRaids: [],
    raidHistory: [],
    raidWorld: null,
    minuteOfDay: 720,
    ...overrides,
  };
}

describe("operations panel", () => {
  it("shows management context in contract review surfaces", () => {
    const html = renderToStaticMarkup(
      <OperationsPanel
        operations={makeOperations()}
        operators={[] as readonly OperatorViewModel[]}
        rosterPressure={rosterPressure}
        focus={null}
        activeCategory="contract"
        callbacks={callbacks}
      />,
    );

    expect(html).toContain("Management Context");
    expect(html).toContain("Contract Posture: Aggressive");
    expect(html).toContain("Recovery Standards: Full Recovery");
  });
});

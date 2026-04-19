import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { ContractReviewBody, ContractsRootBody } from "./operations-panels";
import type { ContractResultViewModel, OperationsViewModel } from "./view-models";

const result: ContractResultViewModel = {
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
};

describe("ContractReviewBody", () => {
  it("shows management context factors on the contract result card", () => {
    const html = renderToStaticMarkup(<ContractReviewBody result={result} onAdvance={vi.fn()} />);

    expect(html).toContain("Management Context");
    expect(html).toContain("Contract Posture: Aggressive");
    expect(html).toContain("Recovery Standards: Full Recovery");
  });
});

describe("ContractsRootBody", () => {
  it("keeps a direct path from the contract root into the active operation", () => {
    const operations: OperationsViewModel = {
      contractLifecycle: "active",
      contractSite: {
        contractSiteId: "contract/site-1",
        missionName: "Clearance",
        missionId: "mission/clearance",
        siteConceptName: "Basement Annex",
        location: "Lower East Side",
        siteSummary: "Sweep the annex and secure the payload.",
        neighborhoodLabel: "Market",
        rank: "F",
        threat: 12,
        intel: 7,
        reward: 180,
        explorationProgress: 10,
        closureProgress: 10,
        closureThreshold: 100,
        requiresBossClear: false,
        bossAvailable: false,
        bossDefeated: false,
        missionCompleted: false,
        contractLost: false,
        boardIntel: { source: "street", quality: "rough" },
        knownTraits: [],
        enemyHints: [],
        lootFamilyHints: [],
        bossName: null,
        bossTags: [],
        bossWeaknesses: [],
        briefing: null,
      },
      contractResult: null,
      postedContracts: [],
      opportunities: [],
      activeRaids: [],
      raidHistory: [],
      raidWorld: null,
      minuteOfDay: 720,
    };

    const html = renderToStaticMarkup(
      <ContractsRootBody
        operations={operations}
        onOpenPostingBoard={vi.fn()}
        onOpenReview={vi.fn()}
        onOpenSite={vi.fn()}
        onOpenActiveOperation={vi.fn()}
        onAdvance={vi.fn()}
      />,
    );

    expect(html).toContain("Review site details");
    expect(html).toContain("Active operation");
  });
});

import { describe, expect, it } from "vitest";

import {
  PORTERS_CAMPAIGN_UPGRADE_SEQUENCE,
  createPortersUpgradeCampaignSeedWorld,
  runPortersUpgradeCampaign,
} from "./porters-upgrade-campaign";

describe("Porters upgrade campaign harness", () => {
  it("builds a deterministic post-relocation seed with Porter's contract board ready", () => {
    const first = createPortersUpgradeCampaignSeedWorld();
    const second = createPortersUpgradeCampaignSeedWorld();

    expect(first).toEqual(second);
    expect(first.building.activeBuildingId).toBe("building/porters");
    expect(first.postedContracts?.length ?? 0).toBeGreaterThan(0);
  });

  it("runs the canonical Porter's upgrade arc and proves the unlocked rooms are used", async () => {
    const report = await runPortersUpgradeCampaign();

    expect(report.activeBuildingId).toBe("building/porters");
    expect(report.appliedUpgradeIds).toEqual([...PORTERS_CAMPAIGN_UPGRADE_SEQUENCE]);
    expect(report.placedRoomTemplateIds).toEqual(
      expect.arrayContaining(["room/briefing_room:tier_1", "room/dock:tier_1", "room/deck:tier_1"]),
    );
    expect(report.contractBriefing).toEqual(
      expect.objectContaining({
        source: expect.stringMatching(/briefing_room/),
      }),
    );
    expect(report.latestRaidSummaryFactors).toEqual(
      expect.arrayContaining(["dock:staged", "deck:aired_out"]),
    );
  });
});

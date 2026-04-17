import { describe, expect, it } from "vitest";

import { templateRegistry as registry } from "content/templates";
import { siteConceptTemplates } from "content/templates/site-concepts";
import {
  CONTRACT_RANK_CONFIG,
  computeBossCompletionCashBonus,
  computeMissionCompletionCashBonus,
  computePostedContractEconomyBudget,
  getAvailableContractRanksForReputation,
} from "../systems/contract-economy";

/**
 * Deterministic coverage for the new C-rank skyscraper endgame band.
 *
 * The midgame ledger proved the D-rank economy; this harness focuses on the
 * envelopes that matter once the player moves into Ascension Tower:
 *
 *  - Posted-contract budgets stay inside a sensible C-rank window
 *  - C-rank boss/mission completion bonuses out-pay D-rank ones
 *  - C-rank craft recipes cost materially more cash than D-rank ones
 *  - C-rank drop tables actually reach their owning boss and family
 *  - Contract posting unlocks C only at the intended reputation threshold
 */

describe("skyscraper C-rank economy envelope", () => {
  it("exposes a C-rank rank-config budget above the D-rank band", () => {
    const dCfg = CONTRACT_RANK_CONFIG.d;
    const cCfg = CONTRACT_RANK_CONFIG.c;
    expect(cCfg.threatBase).toBeGreaterThan(dCfg.threatBase);
    expect(cCfg.rewardBase).toBeGreaterThan(dCfg.rewardBase);
    expect(cCfg.paceMultiplier).toBeGreaterThan(dCfg.paceMultiplier);
  });

  it("posts C-rank contracts with rewards above the comparable D-rank posting", () => {
    const input = {
      missionBaseDurationHours: 4,
      missionExpectedThreatTagCount: 2,
      guildIntel: 3,
      threatVariance: 0,
      intelVariance: 0,
      rewardVariance: 0,
    };

    const dBudget = computePostedContractEconomyBudget({ ...input, rank: "d" });
    const cBudget = computePostedContractEconomyBudget({ ...input, rank: "c" });

    expect(cBudget.reward).toBeGreaterThan(dBudget.reward);
    expect(cBudget.threat).toBeGreaterThan(dBudget.threat);
    expect(cBudget.risk).toBeGreaterThan(dBudget.risk);
    expect(cBudget.bidCost).toBeGreaterThan(dBudget.bidCost);
  });

  it("pays a C-rank boss clear more than a D-rank boss clear at the same reward baseline", () => {
    const reward = 140;
    const dBoss = computeBossCompletionCashBonus(reward, "d");
    const cBoss = computeBossCompletionCashBonus(reward, "c");
    expect(cBoss).toBeGreaterThan(dBoss);

    const dMission = computeMissionCompletionCashBonus(reward, "d");
    const cMission = computeMissionCompletionCashBonus(reward, "c");
    expect(cMission).toBeGreaterThan(dMission);
  });

  it("only unlocks C-rank postings at or above the reputation threshold, capped by the building", () => {
    const portersCeiling = registry.buildingById.get("building/porters")!.contractRankCeiling;
    const skyscraperCeiling = registry.buildingById.get("building/skyscraper")!.contractRankCeiling;

    // Porter's never posts C even with stellar reputation.
    expect(getAvailableContractRanksForReputation(99, portersCeiling)).not.toContain("c");

    // Skyscraper below threshold: no C yet.
    expect(getAvailableContractRanksForReputation(30, skyscraperCeiling)).not.toContain("c");

    // Skyscraper above threshold: C is on the board.
    const available = getAvailableContractRanksForReputation(60, skyscraperCeiling);
    expect(available).toContain("c");
    expect(available).toContain("d");
  });

  it("keeps C-rank craft recipes materially costlier than D-rank recipes", () => {
    const dRecipes = registry.craftRecipes.filter((recipe) => {
      const output = registry.itemById.get(recipe.outputItemId);
      return output?.rank === "d";
    });
    const cRecipes = registry.craftRecipes.filter((recipe) => {
      const output = registry.itemById.get(recipe.outputItemId);
      return output?.rank === "c";
    });

    expect(dRecipes.length).toBeGreaterThan(0);
    expect(cRecipes.length).toBeGreaterThanOrEqual(10);

    const avgDCost = dRecipes.reduce((sum, r) => sum + r.cashCost, 0) / dRecipes.length;
    const avgCCost = cRecipes.reduce((sum, r) => sum + r.cashCost, 0) / cRecipes.length;

    // Skyscraper endgame recipes should sit at least 30% above the D-rank baseline.
    expect(avgCCost).toBeGreaterThan(avgDCost * 1.3);
  });

  it("routes every C-rank boss drop table through a C-rank material or gear entry", () => {
    const cBosses = [...registry.bossById.values()].filter((boss) => boss.rank === "c");
    expect(cBosses.length).toBeGreaterThanOrEqual(6);

    for (const boss of cBosses) {
      const table = registry.dropTableById.get(boss.dropTableId);
      expect(table, `missing drop table ${boss.dropTableId}`).toBeTruthy();

      const hasCRankEntry = table!.entries.some((entry) => {
        const item = registry.itemById.get(entry.itemId);
        return item?.rank === "c";
      });
      expect(hasCRankEntry, `${boss.bossId} drops no C-rank material`).toBe(true);
    }
  });

  it("keeps every C-rank site concept bridged to the skyscraper-era districts", () => {
    const cSites = siteConceptTemplates.filter((site) => site.rankPool.includes("c"));
    for (const site of cSites) {
      expect(site.districtPool.length).toBeGreaterThan(0);
      for (const districtId of site.districtPool) {
        expect(registry.districtById.has(districtId)).toBe(true);
      }
    }
  });

  it("keeps at least one C-rank weapon, outfit, and accessory priced above the D-rank baseline", () => {
    const cItems = registry.items.filter((item) => item.rank === "c");
    const dItems = registry.items.filter((item) => item.rank === "d");

    const avgSellPrice = (items: typeof cItems) =>
      items.length === 0 ? 0 : items.reduce((sum, item) => sum + item.sellPrice, 0) / items.length;

    for (const category of ["weapon", "outfit-overlay", "accessory"] as const) {
      const cSubset = cItems.filter((item) => item.category === category);
      const dSubset = dItems.filter((item) => item.category === category);
      expect(cSubset.length).toBeGreaterThan(0);
      expect(dSubset.length).toBeGreaterThan(0);
      expect(avgSellPrice(cSubset)).toBeGreaterThan(avgSellPrice(dSubset));
    }
  });
});

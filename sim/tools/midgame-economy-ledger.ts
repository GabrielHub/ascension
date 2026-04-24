import { createTemplateRegistry } from "content/templates";
import type { CraftRecipeTemplate, ItemTemplate } from "content/templates";
import { districtTemplates } from "content/templates/districts";
import {
  siteConceptTemplates,
  type ContractRank,
  type SiteConceptTemplate,
} from "content/templates/site-concepts";
import {
  POSTED_CONTRACT_VARIANCE,
  computeBossCompletionCashBonus,
  computeMissionCompletionCashBonus,
  computePostedContractEconomyBudget,
  computeRaidCashDelta,
} from "sim/systems/contract-economy";
import { z } from "zod";

const MIDGAME_ECONOMY_LEDGER_SCHEMA_VERSION = "midgame-economy.v2";
const MIDGAME_RANK: ContractRank = "d";
const MARKET_PARITY_WINDOW = 15;

const registry = createTemplateRegistry();
const dRankSiteConcepts = siteConceptTemplates.filter((site) =>
  site.rankPool.includes(MIDGAME_RANK),
);
const combatMissions = registry.missions.filter((mission) => mission.combatProfile);
// The midgame ledger tracks only the D-rank workshop loop. C-rank endgame
// recipes are scoped to the skyscraper and live outside this ledger.
const midgameCraftRecipes = registry.craftRecipes.filter((recipe) => {
  const output = registry.itemById.get(recipe.outputItemId);
  return output?.rank === MIDGAME_RANK;
});
const craftInputItemIds = new Set(
  midgameCraftRecipes.flatMap((recipe) => recipe.inputItems.map((input) => input.itemId)),
);

const valueEnvelopeSchema = z
  .object({
    min: z.number(),
    max: z.number(),
    expected: z.number(),
  })
  .refine((value) => value.min <= value.max, {
    message: "min must be less than or equal to max",
    path: ["max"],
  });

function createEnvelope(
  min: number,
  max: number,
  expected: number,
): z.infer<typeof valueEnvelopeSchema> {
  return {
    min,
    max,
    expected: Number(expected.toFixed(2)),
  };
}

function createDeterministicEnvelope(value: number) {
  return createEnvelope(value, value, value);
}

function addEnvelope(
  left: z.infer<typeof valueEnvelopeSchema>,
  right: z.infer<typeof valueEnvelopeSchema>,
) {
  return createEnvelope(left.min + right.min, left.max + right.max, left.expected + right.expected);
}

function scaleEnvelope(value: z.infer<typeof valueEnvelopeSchema>, multiplier: number) {
  return createEnvelope(
    value.min * multiplier,
    value.max * multiplier,
    value.expected * multiplier,
  );
}

const materialSourceRowSchema = z.object({
  entryId: z.string(),
  itemId: z.string(),
  itemName: z.string(),
  sourceKind: z.literal("drop_table"),
  direction: z.literal("source"),
  sellPrice: z.number().int().nonnegative(),
  usedInRecipeIds: z.array(z.string()),
  sourceTableIds: z.array(z.string()),
  dRankSiteConceptIds: z.array(z.string()),
  dRankSiteNames: z.array(z.string()),
  notes: z.array(z.string()),
});

const craftCostRowSchema = z.object({
  entryId: z.string(),
  recipeId: z.string(),
  recipeName: z.string(),
  family: z.string(),
  outputItemId: z.string(),
  outputName: z.string(),
  outputCategory: z.string(),
  outputRank: z.string(),
  direction: z.literal("sink"),
  cashCost: z.number().int().positive(),
  inputCost: valueEnvelopeSchema,
  totalCost: valueEnvelopeSchema,
  inputItems: z.array(
    z.object({
      itemId: z.string(),
      itemName: z.string(),
      quantity: z.number().int().positive(),
      unitSellPrice: z.number().int().nonnegative(),
      totalOpportunityCost: z.number().int().nonnegative(),
    }),
  ),
  requiredDistrictTags: z.array(z.string()),
  requiredFactions: z.array(
    z.object({
      factionId: z.string(),
      factionName: z.string(),
      minimumStanding: z.number(),
    }),
  ),
  notes: z.array(z.string()),
});

const craftedGearValueRowSchema = z.object({
  entryId: z.string(),
  itemId: z.string(),
  itemName: z.string(),
  category: z.string(),
  rank: z.string(),
  sellPrice: z.number().int().nonnegative(),
  buyPrice: z.number().int().nonnegative(),
  statEffects: z.array(
    z.object({
      stat: z.string(),
      value: z.number(),
    }),
  ),
  craftedVia: z.array(z.string()),
  notes: z.array(z.string()),
});

const marketFallbackRowSchema = z.object({
  entryId: z.string(),
  itemId: z.string(),
  itemName: z.string(),
  category: z.string(),
  rank: z.string(),
  buyPrice: z.number().int().nonnegative(),
  sellPrice: z.number().int().nonnegative(),
  isDirectlyPurchasable: z.boolean(),
  notes: z.array(z.string()),
});

const dRankContractPostingRowSchema = z.object({
  entryId: z.string(),
  missionId: z.string(),
  missionName: z.string(),
  objectiveType: z.string(),
  rewardShape: z.string(),
  baseDurationHours: z.number().int().positive(),
  expectedThreatTagCount: z.number().int().nonnegative(),
  threat: valueEnvelopeSchema,
  intel: valueEnvelopeSchema,
  reward: valueEnvelopeSchema,
  risk: valueEnvelopeSchema,
  bidCost: valueEnvelopeSchema,
  notes: z.array(z.string()),
});

const dRankPayoutRowSchema = z.object({
  entryId: z.string(),
  missionId: z.string(),
  missionName: z.string(),
  successCashDelta: valueEnvelopeSchema,
  mixedCashDelta: valueEnvelopeSchema,
  failureCashDelta: valueEnvelopeSchema,
  missionCompletionBonus: valueEnvelopeSchema,
  bossCompletionBonus: valueEnvelopeSchema,
  notes: z.array(z.string()),
});

const dRankLootSaleRowSchema = z.object({
  entryId: z.string(),
  siteConceptId: z.string(),
  siteConceptName: z.string(),
  missionId: z.string(),
  missionName: z.string(),
  regularTableIds: z.array(z.string()),
  eliteTableIds: z.array(z.string()),
  bossTableId: z.string(),
  successSaleValue: valueEnvelopeSchema,
  mixedSaleValue: valueEnvelopeSchema,
  failureSaleValue: valueEnvelopeSchema,
  craftInputItemIds: z.array(z.string()),
  rareDropItemIds: z.array(z.string()),
  notes: z.array(z.string()),
});

const craftValueComparisonRowSchema = z.object({
  entryId: z.string(),
  recipeId: z.string(),
  recipeName: z.string(),
  outputItemId: z.string(),
  outputName: z.string(),
  outputCategory: z.string(),
  outputRank: z.string(),
  totalCraftCost: valueEnvelopeSchema,
  directBuyPrice: z.number().int().nonnegative(),
  fallbackMarketItemId: z.string().nullable(),
  fallbackMarketItemName: z.string().nullable(),
  fallbackMarketBuyPrice: z.number().int().nonnegative(),
  savingsVsFallback: z.number(),
  marketPosition: z.enum(["craft_advantage", "near_parity", "overpriced", "craft_only"]),
  notes: z.array(z.string()),
});

export const midgameEconomyLedgerSchema = z.object({
  schemaVersion: z.literal(MIDGAME_ECONOMY_LEDGER_SCHEMA_VERSION),
  meta: z.object({
    registryPath: z.literal("content/templates/index.ts"),
    craftRecipeCount: z.number().int().nonnegative(),
    craftFamilyCount: z.number().int().nonnegative(),
    craftOutputCount: z.number().int().nonnegative(),
    dRankMissionCount: z.number().int().nonnegative(),
    dRankSiteCount: z.number().int().nonnegative(),
    districtCount: z.number().int().nonnegative(),
  }),
  ledgers: z.object({
    materialSources: z.array(materialSourceRowSchema),
    craftCosts: z.array(craftCostRowSchema),
    craftedGearValues: z.array(craftedGearValueRowSchema),
    marketFallbacks: z.array(marketFallbackRowSchema),
    dRankContractPostings: z.array(dRankContractPostingRowSchema),
    dRankPayouts: z.array(dRankPayoutRowSchema),
    dRankLootSales: z.array(dRankLootSaleRowSchema),
    craftComparisons: z.array(craftValueComparisonRowSchema),
  }),
});

type MidgameEconomyLedger = z.infer<typeof midgameEconomyLedgerSchema>;

function collectCraftInputItems(): Map<string, { item: ItemTemplate; recipeIds: string[] }> {
  const map = new Map<string, { item: ItemTemplate; recipeIds: string[] }>();
  for (const recipe of midgameCraftRecipes) {
    for (const input of recipe.inputItems) {
      const item = registry.itemById.get(input.itemId);
      if (!item) continue;
      const existing = map.get(input.itemId);
      if (existing) {
        existing.recipeIds.push(recipe.id);
      } else {
        map.set(input.itemId, { item, recipeIds: [recipe.id] });
      }
    }
  }
  return map;
}

function getDropTableEntries(tableId: string) {
  return registry.dropTableById.get(tableId)?.entries ?? [];
}

function getSiteFamilyTableId(site: SiteConceptTemplate, suffix: "-regular" | "-elite"): string {
  const familySlug = site.enemyFamilyIds[0]?.replace("enemy-family/", "");
  const candidateId = familySlug ? `drop-table/${familySlug}${suffix}` : "";
  if (candidateId && registry.dropTableById.has(candidateId)) {
    return candidateId;
  }

  const genericId = `drop-table/dungeon-${site.rankPool[0] ?? MIDGAME_RANK}${suffix}`;
  if (registry.dropTableById.has(genericId)) {
    return genericId;
  }

  return suffix === "-regular" ? "drop-table/dungeon-f-regular" : "drop-table/dungeon-f-elite";
}

function getSiteBossTableId(site: SiteConceptTemplate): string {
  const bossTableId = registry.bossById.get(site.bossId)?.dropTableId;
  if (bossTableId && registry.dropTableById.has(bossTableId)) {
    return bossTableId;
  }

  const genericId = `drop-table/dungeon-${site.rankPool[0] ?? MIDGAME_RANK}-boss`;
  if (registry.dropTableById.has(genericId)) {
    return genericId;
  }

  return "drop-table/dungeon-f-boss";
}

function getSiteLootTableIds(site: SiteConceptTemplate) {
  return {
    regular: getSiteFamilyTableId(site, "-regular"),
    elite: getSiteFamilyTableId(site, "-elite"),
    boss: getSiteBossTableId(site),
  };
}

function computeSaleEnvelopeFromEntries(
  entries: ReturnType<typeof getDropTableEntries>,
): z.infer<typeof valueEnvelopeSchema> {
  if (entries.length === 0) {
    return createDeterministicEnvelope(0);
  }

  const totalWeight = entries.reduce((sum, entry) => sum + entry.weight, 0);
  const saleValues = entries.map((entry) => {
    const item = registry.itemById.get(entry.itemId);
    const sellPrice = item?.sellPrice ?? 0;
    const averageQuantity = (entry.minQuantity + entry.maxQuantity) / 2;
    return {
      min: entry.minQuantity * sellPrice,
      max: entry.maxQuantity * sellPrice,
      expected: totalWeight > 0 ? (entry.weight / totalWeight) * averageQuantity * sellPrice : 0,
    };
  });

  const min = Math.min(...saleValues.map((value) => value.min));
  const max = Math.max(...saleValues.map((value) => value.max));
  const expected = saleValues.reduce((sum, value) => sum + value.expected, 0);
  return createEnvelope(min, max, expected);
}

function resolveMissionGroupTableId(site: SiteConceptTemplate, genericTableId: string): string {
  if (genericTableId.endsWith("-regular")) {
    return getSiteFamilyTableId(site, "-regular");
  }
  if (genericTableId.endsWith("-elite")) {
    return getSiteFamilyTableId(site, "-elite");
  }
  return genericTableId;
}

function computeInputOpportunityCost(recipe: CraftRecipeTemplate) {
  const items = recipe.inputItems.map((input) => {
    const item = registry.itemById.get(input.itemId);
    const unitSellPrice = item?.sellPrice ?? 0;
    return {
      itemId: input.itemId,
      itemName: item?.name ?? input.itemId,
      quantity: input.quantity,
      unitSellPrice,
      totalOpportunityCost: unitSellPrice * input.quantity,
    };
  });
  const total = items.reduce((sum, item) => sum + item.totalOpportunityCost, 0);
  return { items, total };
}

function buildMaterialSources() {
  const inputs = collectCraftInputItems();

  return [...inputs.entries()].map(([itemId, { item, recipeIds }]) => {
    const sourceTableIds = registry.dropTables
      .filter((table) => table.entries.some((entry) => entry.itemId === itemId))
      .map((table) => table.id)
      .sort();
    const siteCoverage = dRankSiteConcepts.filter((site) => {
      const tables = getSiteLootTableIds(site);
      return [tables.regular, tables.elite, tables.boss].some((tableId) =>
        getDropTableEntries(tableId).some((entry) => entry.itemId === itemId),
      );
    });

    return {
      entryId: `material-source/${itemId}`,
      itemId,
      itemName: item.name,
      sourceKind: "drop_table" as const,
      direction: "source" as const,
      sellPrice: item.sellPrice,
      usedInRecipeIds: recipeIds,
      sourceTableIds,
      dRankSiteConceptIds: siteCoverage.map((site) => site.siteConceptId),
      dRankSiteNames: siteCoverage.map((site) => site.name),
      notes: [
        item.tags.includes("loot:crafting_input")
          ? "Protected from auto-sell by loot automation."
          : "Standard loot part.",
        `Appears across ${siteCoverage.length} D-rank site families.`,
      ],
    };
  });
}

function buildCraftCosts() {
  return midgameCraftRecipes.map((recipe) => {
    const output = registry.itemById.get(recipe.outputItemId);
    const { items, total } = computeInputOpportunityCost(recipe);
    const inputCost = createDeterministicEnvelope(total);
    const totalCost = createDeterministicEnvelope(total + recipe.cashCost);

    return {
      entryId: `craft-cost/${recipe.id}`,
      recipeId: recipe.id,
      recipeName: recipe.name,
      family: recipe.family,
      outputItemId: recipe.outputItemId,
      outputName: output?.name ?? recipe.outputItemId,
      outputCategory: output?.category ?? "weapon",
      outputRank: output?.rank ?? MIDGAME_RANK,
      direction: "sink" as const,
      cashCost: recipe.cashCost,
      inputCost,
      totalCost,
      inputItems: items,
      requiredDistrictTags: [...recipe.requiredDistrictTags],
      requiredFactions: Object.entries(recipe.requiredFactionStanding).map(
        ([factionId, minimumStanding]) => ({
          factionId,
          factionName: registry.factionById.get(factionId)?.name ?? factionId,
          minimumStanding,
        }),
      ),
      notes: [
        `Requires building/Porter's tier ${recipe.minimumBuildingTier}+.`,
        `Consumes ${recipe.cashCost} cash when crafted.`,
      ],
    };
  });
}

function buildCraftedGearValues() {
  const outputItems = new Map<string, { item: ItemTemplate; recipeIds: string[] }>();
  for (const recipe of midgameCraftRecipes) {
    const item = registry.itemById.get(recipe.outputItemId);
    if (!item) continue;
    const existing = outputItems.get(recipe.outputItemId);
    if (existing) {
      existing.recipeIds.push(recipe.id);
    } else {
      outputItems.set(recipe.outputItemId, { item, recipeIds: [recipe.id] });
    }
  }

  return [...outputItems.entries()].map(([itemId, { item, recipeIds }]) => ({
    entryId: `crafted-gear/${itemId}`,
    itemId,
    itemName: item.name,
    category: item.category,
    rank: item.rank,
    sellPrice: item.sellPrice,
    buyPrice: item.buyPrice,
    statEffects: item.statEffects.map((effect) => ({ stat: effect.stat, value: effect.value })),
    craftedVia: recipeIds,
    notes:
      item.buyPrice > 0
        ? ["Also available on the market as a direct purchase."]
        : ["Crafting- or boss-drop-only in the D-rank band."],
  }));
}

function buildMarketFallbacks() {
  const craftedOutputIds = new Set(midgameCraftRecipes.map((recipe) => recipe.outputItemId));

  return registry.items
    .filter(
      (item) =>
        item.rank === MIDGAME_RANK &&
        (item.category === "weapon" ||
          item.category === "outfit-overlay" ||
          item.category === "accessory") &&
        !craftedOutputIds.has(item.id),
    )
    .map((item) => ({
      entryId: `market-fallback/${item.id}`,
      itemId: item.id,
      itemName: item.name,
      category: item.category,
      rank: item.rank,
      buyPrice: item.buyPrice,
      sellPrice: item.sellPrice,
      isDirectlyPurchasable: item.buyPrice > 0,
      notes: [
        item.buyPrice > 0
          ? "Can be purchased directly without crafting."
          : "Drop-only fallback item.",
      ],
    }));
}

function buildDRankContractPostings() {
  return combatMissions.map((mission) => {
    const missionThreatTagCount = mission.expectedThreatTags.length;
    const neutralBudget = computePostedContractEconomyBudget({
      rank: MIDGAME_RANK,
      missionBaseDurationHours: mission.baseDurationHours,
      missionExpectedThreatTagCount: missionThreatTagCount,
      guildIntel: 0,
      threatVariance: 0,
      intelVariance: 0,
      rewardVariance: 0,
    });
    const budgetVariants = [
      computePostedContractEconomyBudget({
        rank: MIDGAME_RANK,
        missionBaseDurationHours: mission.baseDurationHours,
        missionExpectedThreatTagCount: missionThreatTagCount,
        guildIntel: 0,
        threatVariance: POSTED_CONTRACT_VARIANCE.threat.min,
        intelVariance: POSTED_CONTRACT_VARIANCE.intel.min,
        rewardVariance: POSTED_CONTRACT_VARIANCE.reward.min,
      }),
      computePostedContractEconomyBudget({
        rank: MIDGAME_RANK,
        missionBaseDurationHours: mission.baseDurationHours,
        missionExpectedThreatTagCount: missionThreatTagCount,
        guildIntel: 0,
        threatVariance: POSTED_CONTRACT_VARIANCE.threat.min,
        intelVariance: POSTED_CONTRACT_VARIANCE.intel.max,
        rewardVariance: POSTED_CONTRACT_VARIANCE.reward.max,
      }),
      computePostedContractEconomyBudget({
        rank: MIDGAME_RANK,
        missionBaseDurationHours: mission.baseDurationHours,
        missionExpectedThreatTagCount: missionThreatTagCount,
        guildIntel: 0,
        threatVariance: POSTED_CONTRACT_VARIANCE.threat.max,
        intelVariance: POSTED_CONTRACT_VARIANCE.intel.min,
        rewardVariance: POSTED_CONTRACT_VARIANCE.reward.min,
      }),
      computePostedContractEconomyBudget({
        rank: MIDGAME_RANK,
        missionBaseDurationHours: mission.baseDurationHours,
        missionExpectedThreatTagCount: missionThreatTagCount,
        guildIntel: 0,
        threatVariance: POSTED_CONTRACT_VARIANCE.threat.max,
        intelVariance: POSTED_CONTRACT_VARIANCE.intel.max,
        rewardVariance: POSTED_CONTRACT_VARIANCE.reward.max,
      }),
    ];

    const metricEnvelope = <K extends keyof typeof neutralBudget>(key: K) =>
      createEnvelope(
        Math.min(...budgetVariants.map((budget) => budget[key] as number)),
        Math.max(...budgetVariants.map((budget) => budget[key] as number)),
        neutralBudget[key] as number,
      );

    return {
      entryId: `d-rank-contract/${mission.id}`,
      missionId: mission.id,
      missionName: mission.name,
      objectiveType: mission.objectiveType,
      rewardShape: mission.rewardShape,
      baseDurationHours: mission.baseDurationHours,
      expectedThreatTagCount: missionThreatTagCount,
      threat: metricEnvelope("threat"),
      intel: metricEnvelope("intel"),
      reward: metricEnvelope("reward"),
      risk: metricEnvelope("risk"),
      bidCost: metricEnvelope("bidCost"),
      notes: [
        "Computed at D-rank with neutral public pressure and guild intel fixed at 0.",
        `Mission base duration: ${mission.baseDurationHours}h.`,
      ],
    };
  });
}

function buildDRankPayouts(postings: ReturnType<typeof buildDRankContractPostings>) {
  return postings.map((posting) => ({
    entryId: `d-rank-payout/${posting.missionId}`,
    missionId: posting.missionId,
    missionName: posting.missionName,
    successCashDelta: createEnvelope(
      computeRaidCashDelta("success", posting.reward.min, posting.risk.min),
      computeRaidCashDelta("success", posting.reward.max, posting.risk.max),
      computeRaidCashDelta("success", posting.reward.expected, posting.risk.expected),
    ),
    mixedCashDelta: createEnvelope(
      computeRaidCashDelta("mixed", posting.reward.min, posting.risk.min),
      computeRaidCashDelta("mixed", posting.reward.max, posting.risk.max),
      computeRaidCashDelta("mixed", posting.reward.expected, posting.risk.expected),
    ),
    failureCashDelta: createEnvelope(
      computeRaidCashDelta("failure", posting.reward.expected, posting.risk.max),
      computeRaidCashDelta("failure", posting.reward.expected, posting.risk.min),
      computeRaidCashDelta("failure", posting.reward.expected, posting.risk.expected),
    ),
    missionCompletionBonus: createEnvelope(
      computeMissionCompletionCashBonus(posting.reward.min, MIDGAME_RANK),
      computeMissionCompletionCashBonus(posting.reward.max, MIDGAME_RANK),
      computeMissionCompletionCashBonus(posting.reward.expected, MIDGAME_RANK),
    ),
    bossCompletionBonus: createEnvelope(
      computeBossCompletionCashBonus(posting.reward.min, MIDGAME_RANK),
      computeBossCompletionCashBonus(posting.reward.max, MIDGAME_RANK),
      computeBossCompletionCashBonus(posting.reward.expected, MIDGAME_RANK),
    ),
    notes: [
      "Success and mixed rows reflect immediate treasury deltas from raid resolution.",
      "Completion bonus rows model end-of-contract payouts once the site is closed out.",
    ],
  }));
}

function buildDRankLootSales() {
  return dRankSiteConcepts.flatMap((site) =>
    combatMissions.map((mission) => {
      const lootTables = getSiteLootTableIds(site);
      let successSaleValue = createDeterministicEnvelope(0);
      let mixedSaleValue = createDeterministicEnvelope(0);
      const craftInputIds = new Set<string>();
      const rareDropIds = new Set<string>();
      const regularTableIds = new Set<string>();
      const eliteTableIds = new Set<string>();

      for (const group of mission.combatProfile?.enemyGroups ?? []) {
        const tableId = resolveMissionGroupTableId(site, group.dropTableId);
        const entries = getDropTableEntries(tableId);
        const tableEnvelope = computeSaleEnvelopeFromEntries(entries);
        const successRolls = group.count;
        const mixedRolls = Math.ceil(group.count / 2);

        if (tableId.endsWith("-regular")) {
          regularTableIds.add(tableId);
        }
        if (tableId.endsWith("-elite")) {
          eliteTableIds.add(tableId);
        }
        for (const entry of entries) {
          if (craftInputItemIds.has(entry.itemId)) craftInputIds.add(entry.itemId);
          if (entry.itemId.startsWith("loot/rare-material/")) rareDropIds.add(entry.itemId);
        }

        successSaleValue = addEnvelope(
          successSaleValue,
          scaleEnvelope(tableEnvelope, successRolls),
        );
        mixedSaleValue = addEnvelope(mixedSaleValue, scaleEnvelope(tableEnvelope, mixedRolls));
      }

      const bossTableId = lootTables.boss;
      const bossEntries = getDropTableEntries(bossTableId);
      const bossEnvelope = computeSaleEnvelopeFromEntries(bossEntries);
      for (const entry of bossEntries) {
        if (craftInputItemIds.has(entry.itemId)) craftInputIds.add(entry.itemId);
        if (entry.itemId.startsWith("loot/rare-material/")) rareDropIds.add(entry.itemId);
      }
      successSaleValue = addEnvelope(successSaleValue, bossEnvelope);

      return {
        entryId: `loot-sale/${site.siteConceptId}/${mission.id}`,
        siteConceptId: site.siteConceptId,
        siteConceptName: site.name,
        missionId: mission.id,
        missionName: mission.name,
        regularTableIds: [...regularTableIds].sort(),
        eliteTableIds: [...eliteTableIds].sort(),
        bossTableId,
        successSaleValue,
        mixedSaleValue,
        failureSaleValue: createDeterministicEnvelope(0),
        craftInputItemIds: [...craftInputIds].sort(),
        rareDropItemIds: [...rareDropIds].sort(),
        notes: [
          "Values represent sell-price envelopes if the full loot haul is liquidated.",
          "Success includes the site boss roll; mixed excludes boss loot.",
        ],
      };
    }),
  );
}

function buildCraftComparisons(
  craftCosts: ReturnType<typeof buildCraftCosts>,
  marketFallbacks: ReturnType<typeof buildMarketFallbacks>,
) {
  const fallbackByCategory = new Map<string, ReturnType<typeof buildMarketFallbacks>[number][]>();

  for (const fallback of marketFallbacks) {
    const key = `${fallback.category}:${fallback.rank}`;
    const entries = fallbackByCategory.get(key) ?? [];
    entries.push(fallback);
    fallbackByCategory.set(key, entries);
  }

  return craftCosts.map((cost) => {
    const output = registry.itemById.get(cost.outputItemId);
    const directBuyPrice = output?.buyPrice ?? 0;
    const outputStatBudget = (output?.statEffects ?? []).reduce(
      (sum, effect) => sum + Math.max(0, effect.value),
      0,
    );
    const fallbackPool =
      fallbackByCategory.get(`${cost.outputCategory}:${cost.outputRank}`)?.filter((entry) => {
        if (!entry.isDirectlyPurchasable) {
          return false;
        }
        const fallbackItem = registry.itemById.get(entry.itemId);
        const fallbackStatBudget = (fallbackItem?.statEffects ?? []).reduce(
          (sum, effect) => sum + Math.max(0, effect.value),
          0,
        );
        return fallbackStatBudget >= outputStatBudget;
      }) ?? [];
    const cheapestFallback =
      fallbackPool.sort((left, right) => left.buyPrice - right.buyPrice)[0] ?? null;
    const comparisonPrice = directBuyPrice > 0 ? directBuyPrice : (cheapestFallback?.buyPrice ?? 0);
    const savingsVsFallback = comparisonPrice - cost.totalCost.expected;

    let marketPosition: "craft_advantage" | "near_parity" | "overpriced" | "craft_only" =
      "craft_only";

    if (directBuyPrice > 0 && cost.totalCost.min > directBuyPrice) {
      marketPosition = "overpriced";
    } else if (comparisonPrice === 0) {
      marketPosition = "craft_only";
    } else if (savingsVsFallback >= MARKET_PARITY_WINDOW) {
      marketPosition = "craft_advantage";
    } else if (Math.abs(savingsVsFallback) < MARKET_PARITY_WINDOW) {
      marketPosition = "near_parity";
    } else {
      marketPosition = "overpriced";
    }

    const notes: string[] = [];
    if (directBuyPrice > 0) {
      notes.push("Output is directly purchasable on the market.");
    } else {
      notes.push("Output is not directly purchasable and relies on workshop/boss access.");
    }
    if (cheapestFallback) {
      notes.push(
        `Cheapest same-slot market fallback is ${cheapestFallback.itemName} at ${cheapestFallback.buyPrice} cash.`,
      );
    }

    return {
      entryId: `craft-compare/${cost.recipeId}`,
      recipeId: cost.recipeId,
      recipeName: cost.recipeName,
      outputItemId: cost.outputItemId,
      outputName: cost.outputName,
      outputCategory: cost.outputCategory,
      outputRank: cost.outputRank,
      totalCraftCost: cost.totalCost,
      directBuyPrice,
      fallbackMarketItemId: cheapestFallback?.itemId ?? null,
      fallbackMarketItemName: cheapestFallback?.itemName ?? null,
      fallbackMarketBuyPrice: cheapestFallback?.buyPrice ?? 0,
      savingsVsFallback: Number(savingsVsFallback.toFixed(2)),
      marketPosition,
      notes,
    };
  });
}

export function buildMidgameEconomyLedger(): MidgameEconomyLedger {
  const families = new Set(midgameCraftRecipes.map((recipe) => recipe.family));
  const outputIds = new Set(midgameCraftRecipes.map((recipe) => recipe.outputItemId));
  const craftCosts = buildCraftCosts();
  const marketFallbacks = buildMarketFallbacks();
  const dRankContractPostings = buildDRankContractPostings();

  return {
    schemaVersion: MIDGAME_ECONOMY_LEDGER_SCHEMA_VERSION,
    meta: {
      registryPath: "content/templates/index.ts",
      craftRecipeCount: midgameCraftRecipes.length,
      craftFamilyCount: families.size,
      craftOutputCount: outputIds.size,
      dRankMissionCount: combatMissions.length,
      dRankSiteCount: dRankSiteConcepts.length,
      districtCount: districtTemplates.length,
    },
    ledgers: {
      materialSources: buildMaterialSources(),
      craftCosts,
      craftedGearValues: buildCraftedGearValues(),
      marketFallbacks,
      dRankContractPostings,
      dRankPayouts: buildDRankPayouts(dRankContractPostings),
      dRankLootSales: buildDRankLootSales(),
      craftComparisons: buildCraftComparisons(craftCosts, marketFallbacks),
    },
  };
}

function renderEnvelope(value: z.infer<typeof valueEnvelopeSchema>) {
  if (value.min === value.max && value.expected === value.min) {
    return `${value.min}`;
  }

  return `${value.min}-${value.max} (avg ${value.expected})`;
}

function renderMarkdownReport(ledger: MidgameEconomyLedger): string {
  const lines: string[] = [];
  lines.push("# Midgame Economy Report");
  lines.push("");
  lines.push("## Meta");
  lines.push(`- Craft recipes: ${ledger.meta.craftRecipeCount}`);
  lines.push(`- Craft families: ${ledger.meta.craftFamilyCount}`);
  lines.push(`- Distinct crafted outputs: ${ledger.meta.craftOutputCount}`);
  lines.push(`- D-rank missions: ${ledger.meta.dRankMissionCount}`);
  lines.push(`- D-rank sites: ${ledger.meta.dRankSiteCount}`);
  lines.push(`- Districts: ${ledger.meta.districtCount}`);
  lines.push("");

  lines.push("## Material Source Envelope");
  lines.push("");
  for (const row of ledger.ledgers.materialSources) {
    lines.push(
      `- **${row.itemName}** (sell: ${row.sellPrice}) — ${row.dRankSiteNames.length} D-rank sites, ${row.sourceTableIds.length} source table(s)`,
    );
  }
  lines.push("");

  lines.push("## Craft Cost Envelope");
  lines.push("");
  for (const row of ledger.ledgers.craftCosts) {
    lines.push(
      `- **${row.recipeName}** [${row.family}] → ${row.outputName} (${row.outputCategory}/${row.outputRank})`,
    );
    lines.push(`  - Craft-time cash sink: ${row.cashCost}`);
    lines.push(`  - Input opportunity cost: ${renderEnvelope(row.inputCost)}`);
    lines.push(`  - Total craft cost: ${renderEnvelope(row.totalCost)}`);
    if (row.requiredFactions.length > 0) {
      lines.push(
        `  - Faction gates: ${row.requiredFactions.map((faction) => `${faction.factionName} ≥ ${faction.minimumStanding}`).join(", ")}`,
      );
    }
    if (row.requiredDistrictTags.length > 0) {
      lines.push(`  - District tags: ${row.requiredDistrictTags.join(", ")}`);
    }
  }
  lines.push("");

  lines.push("## D-rank Contract Posting Envelope");
  lines.push("");
  for (const row of ledger.ledgers.dRankContractPostings) {
    lines.push(
      `- **${row.missionName}** (${row.objectiveType}, ${row.rewardShape}) — reward ${renderEnvelope(row.reward)}, risk ${renderEnvelope(row.risk)}, bid ${renderEnvelope(row.bidCost)}`,
    );
  }
  lines.push("");

  lines.push("## D-rank Payout Envelope");
  lines.push("");
  for (const row of ledger.ledgers.dRankPayouts) {
    lines.push(
      `- **${row.missionName}** — success ${renderEnvelope(row.successCashDelta)}, mixed ${renderEnvelope(row.mixedCashDelta)}, failure ${renderEnvelope(row.failureCashDelta)}, boss closeout ${renderEnvelope(row.bossCompletionBonus)}`,
    );
  }
  lines.push("");

  lines.push("## D-rank Loot Sale Envelope");
  lines.push("");
  for (const row of ledger.ledgers.dRankLootSales) {
    lines.push(
      `- **${row.siteConceptName} / ${row.missionName}** — success ${renderEnvelope(row.successSaleValue)}, mixed ${renderEnvelope(row.mixedSaleValue)}, craft inputs ${row.craftInputItemIds.length}, rare drops ${row.rareDropItemIds.length}`,
    );
  }
  lines.push("");

  lines.push("## Workshop vs Market");
  lines.push("");
  for (const row of ledger.ledgers.craftComparisons) {
    lines.push(
      `- **${row.outputName}** — craft ${renderEnvelope(row.totalCraftCost)}, direct buy ${row.directBuyPrice}, fallback ${row.fallbackMarketItemName ?? "none"} (${row.fallbackMarketBuyPrice}), position ${row.marketPosition}`,
    );
  }
  lines.push("");

  lines.push("## Crafted Gear Value Envelope");
  lines.push("");
  for (const row of ledger.ledgers.craftedGearValues) {
    const stats = row.statEffects.map((effect) => `${effect.stat} +${effect.value}`).join(", ");
    lines.push(
      `- **${row.itemName}** (${row.category}/${row.rank}) — sell: ${row.sellPrice}, buy: ${row.buyPrice}`,
    );
    if (stats) {
      lines.push(`  - Stats: ${stats}`);
    }
  }
  lines.push("");

  lines.push("## Market Fallback Comparison");
  lines.push("");
  for (const row of ledger.ledgers.marketFallbacks) {
    lines.push(
      `- **${row.itemName}** (${row.category}/${row.rank}) — buy: ${row.buyPrice}, sell: ${row.sellPrice}, purchasable: ${row.isDirectlyPurchasable}`,
    );
  }
  lines.push("");

  return lines.join("\n");
}

export function buildMidgameEconomyArtifacts() {
  const ledger = buildMidgameEconomyLedger();
  return {
    ledger,
    json: JSON.stringify(ledger, null, 2),
    report: renderMarkdownReport(ledger),
  };
}

import { canonicalNewGameScenario } from "content/bootstrap";
import { createTemplateRegistry } from "content/templates";
import type { DropTable, ItemTemplate, MissionTemplate, UpgradeTemplate } from "content/templates";
import { siteConceptTemplates } from "content/templates/site-concepts";
import {
  POSTED_CONTRACT_VARIANCE,
  RAID_OPPORTUNITY_VARIANCE,
  computeBossCompletionCashBonus,
  computeBossCompletionReputationBonus,
  computePostedContractEconomyBudget,
  computeRaidCashDelta,
  computeRaidOpportunityEconomyBudget,
  computeRaidReputationDelta,
  getAvailableContractRanksForReputation,
} from "../systems/contract-economy";
import {
  INCIDENT_TEMPLATES,
  OPENING_SAFE_INCIDENT_CATEGORIES,
  type IncidentChoice,
} from "../systems/incidents";
import {
  DAILY_ACTIVE_OPERATOR_PAYROLL,
  DAILY_ACTIVE_RECEPTION_STOREFRONT_INCOME,
} from "../systems/economy-constants";
import { z } from "zod";

const EARLY_CAMPAIGN_ECONOMY_LEDGER_SCHEMA_VERSION = "early-campaign-economy.v1";

const registry = createTemplateRegistry();

const numericRangeSchema = z
  .object({
    min: z.number(),
    max: z.number(),
  })
  .refine((value) => value.min <= value.max, {
    message: "min must be less than or equal to max",
    path: ["max"],
  });

const storefrontIncomeRowSchema = z.object({
  entryId: z.string(),
  label: z.string(),
  sourceKind: z.enum(["base_reception_room", "upgrade_effect"]),
  cadence: z.literal("per_day"),
  direction: z.literal("source"),
  cashDelta: numericRangeSchema,
  quantity: z.number().int().positive().optional(),
  roomTemplateId: z.string().optional(),
  upgradeId: z.string().optional(),
  notes: z.array(z.string()),
});

const payrollRowSchema = z.object({
  entryId: z.string(),
  label: z.string(),
  sourceKind: z.enum(["operator_wage", "canonical_total"]),
  cadence: z.literal("per_day"),
  direction: z.literal("sink"),
  cashDelta: numericRangeSchema,
  quantity: z.number().int().positive().optional(),
  targetId: z.string().optional(),
  notes: z.array(z.string()),
});

const contractPostingRowSchema = z.object({
  entryId: z.string(),
  missionId: z.string(),
  missionName: z.string(),
  rank: z.string(),
  cadence: z.literal("per_posting"),
  eligibleSiteConceptIds: z.array(z.string()),
  reward: numericRangeSchema,
  bidCost: numericRangeSchema,
  threat: numericRangeSchema,
  intel: numericRangeSchema,
  risk: numericRangeSchema,
  minReputation: z.number().int().nonnegative(),
  notes: z.array(z.string()),
});

const contractPayoutRowSchema = z.object({
  entryId: z.string(),
  missionId: z.string(),
  missionName: z.string(),
  payoutKind: z.enum(["raid_outcome", "boss_completion_bonus"]),
  outcome: z.enum(["success", "mixed", "failure", "boss_completion_bonus"]),
  cadence: z.enum(["per_raid", "per_contract_clear"]),
  eligibleSiteConceptIds: z.array(z.string()),
  cashDelta: numericRangeSchema,
  reputationDelta: numericRangeSchema,
  opportunityReward: numericRangeSchema.optional(),
  opportunityRisk: numericRangeSchema.optional(),
  postingReward: numericRangeSchema.optional(),
  notes: z.array(z.string()),
});

const recoverableItemRowSchema = z.object({
  entryId: z.string(),
  itemId: z.string(),
  itemName: z.string(),
  itemCategory: z.string(),
  cadence: z.literal("per_sale_unit"),
  direction: z.literal("source"),
  cashDelta: numericRangeSchema,
  dropTableIds: z.array(z.string()),
  notes: z.array(z.string()),
});

const dropTableRollRowSchema = z.object({
  entryId: z.string(),
  dropTableId: z.string(),
  cadence: z.literal("per_roll"),
  direction: z.literal("source"),
  cashDelta: numericRangeSchema,
  expectedCashDelta: z.number(),
  referencedItemIds: z.array(z.string()),
  notes: z.array(z.string()),
});

const missionLootEnvelopeRowSchema = z.object({
  entryId: z.string(),
  missionId: z.string(),
  missionName: z.string(),
  result: z.enum(["success", "mixed", "failure"]),
  cadence: z.literal("per_raid"),
  direction: z.literal("source"),
  cashDelta: numericRangeSchema,
  expectedCashDelta: z.number(),
  rolls: z.array(
    z.object({
      dropTableId: z.string(),
      count: z.number().int().nonnegative(),
    }),
  ),
  notes: z.array(z.string()),
});

const upgradeCostRowSchema = z.object({
  entryId: z.string(),
  upgradeId: z.string(),
  upgradeName: z.string(),
  targetKind: z.enum(["building", "room"]),
  targetId: z.string(),
  cadence: z.literal("one_time"),
  direction: z.literal("sink"),
  cashDelta: numericRangeSchema,
  availableInCanonicalOpening: z.boolean(),
  incomeDeltaPerDay: z.number().optional(),
  recoveryRateDelta: z.number().optional(),
  futureCashCostMultiplier: z.number().optional(),
  notes: z.array(z.string()),
});

const treatmentOrRepairRowSchema = z.object({
  entryId: z.string(),
  label: z.string(),
  referenceType: z.enum(["system", "upgrade", "incident_choice"]),
  referenceId: z.string(),
  coverage: z.enum(["direct", "indirect", "none"]),
  cadence: z.enum(["passive", "one_time", "choice"]),
  direction: z.enum(["sink", "neutral"]),
  cashDelta: numericRangeSchema,
  notes: z.array(z.string()),
});

const incidentTreasuryDeltaRowSchema = z.object({
  entryId: z.string(),
  templateId: z.string(),
  templateName: z.string(),
  category: z.string(),
  choiceId: z.string(),
  choiceLabel: z.string(),
  cadence: z.literal("per_choice"),
  direction: z.enum(["source", "sink"]),
  cashDelta: numericRangeSchema,
  openingMercyWindowAllowed: z.boolean(),
  notes: z.array(z.string()),
});

const phaseGapRowSchema = z.object({
  gapId: z.string(),
  title: z.string(),
  blocksPhase2: z.boolean(),
  detail: z.string(),
});

export const earlyCampaignEconomyLedgerSchema = z.object({
  schemaVersion: z.literal(EARLY_CAMPAIGN_ECONOMY_LEDGER_SCHEMA_VERSION),
  meta: z.object({
    scenarioId: z.literal("canonical-opening-path"),
    canonicalScenarioPath: z.literal("content/bootstrap.ts#canonicalNewGameScenario"),
    openingSpecPath: z.literal("docs/plans/opening-campaign-spec.md"),
    planPath: z.literal("docs/plans/economy-and-balance-harness-plan.md"),
    startingState: z.object({
      treasury: z.number(),
      reputation: z.number(),
      intel: z.number(),
      activeOperators: z.number().int().nonnegative(),
      activeReceptionRooms: z.number().int().nonnegative(),
      dailyStorefrontIncomeBase: z.number(),
      dailyPayroll: z.number(),
      dailyNetCashBeforeUpgrades: z.number(),
    }),
  }),
  ledgers: z.object({
    storefrontIncome: z.array(storefrontIncomeRowSchema),
    payroll: z.array(payrollRowSchema),
    contractPostings: z.array(contractPostingRowSchema),
    contractPayouts: z.array(contractPayoutRowSchema),
    lootSaleConversion: z.object({
      recoverableItems: z.array(recoverableItemRowSchema),
      dropTableRolls: z.array(dropTableRollRowSchema),
      missionResultEnvelopes: z.array(missionLootEnvelopeRowSchema),
    }),
    upgradeCosts: z.array(upgradeCostRowSchema),
    treatmentOrRepairCosts: z.array(treatmentOrRepairRowSchema),
    incidentTreasuryDeltas: z.array(incidentTreasuryDeltaRowSchema),
  }),
  gaps: z.array(phaseGapRowSchema),
});

export type EarlyCampaignEconomyLedger = z.infer<typeof earlyCampaignEconomyLedgerSchema>;

function makeRange(...values: number[]) {
  return {
    min: Math.min(...values),
    max: Math.max(...values),
  };
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function formatRange(range: { min: number; max: number }, decimals = 0): string {
  const formatter = (value: number) =>
    decimals === 0 ? `${Math.round(value)}` : value.toFixed(decimals);
  return range.min === range.max
    ? formatter(range.min)
    : `${formatter(range.min)} to ${formatter(range.max)}`;
}

function formatCashRange(range: { min: number; max: number }, decimals = 0): string {
  const formatter = (value: number) => {
    const magnitude =
      decimals === 0 ? `${Math.round(Math.abs(value))}` : Math.abs(value).toFixed(decimals);
    return `${value < 0 ? "-" : ""}$${magnitude}`;
  };
  return range.min === range.max
    ? formatter(range.min)
    : `${formatter(range.min)} to ${formatter(range.max)}`;
}

function sumTreasuryEffects(choice: IncidentChoice): number {
  return choice.effects.reduce((total, effect) => {
    return effect.kind === "treasury_delta" ? total + effect.value : total;
  }, 0);
}

function getCashRequirement(upgrade: UpgradeTemplate): number {
  return upgrade.requirements.reduce((total, requirement) => {
    return requirement.type === "resource_min" && requirement.resourceId === "resource/cash"
      ? total + requirement.minimum
      : total;
  }, 0);
}

function getOpeningEligibleSiteConceptIds(): string[] {
  const availableRanks = getAvailableContractRanksForReputation(
    canonicalNewGameScenario.guild.reputation,
  );
  return siteConceptTemplates
    .filter((concept) => concept.rankPool.some((rank) => availableRanks.includes(rank)))
    .map((concept) => concept.siteConceptId)
    .sort();
}

function buildStorefrontIncomeLedger(): EarlyCampaignEconomyLedger["ledgers"]["storefrontIncome"] {
  const activeReceptionRooms = canonicalNewGameScenario.rooms.filter((room) => {
    const template = registry.roomById.get(room.templateId);
    return template?.tags.includes("room:reception") === true;
  });

  const upgradeRows = registry.upgrades
    .map((upgrade) => {
      const incomeDelta = upgrade.effects.reduce((total, effect) => {
        return effect.type === "modify_resource_income" && effect.resourceId === "resource/cash"
          ? total + effect.amount
          : total;
      }, 0);

      if (incomeDelta === 0) {
        return null;
      }

      return {
        entryId: upgrade.id,
        label: upgrade.name,
        sourceKind: "upgrade_effect" as const,
        cadence: "per_day" as const,
        direction: "source" as const,
        cashDelta: makeRange(incomeDelta),
        upgradeId: upgrade.id,
        notes: ["Applied through deterministic building authority income modifiers."],
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);

  return [
    {
      entryId: "storefront/base-register-income",
      label: "Operational reception room income",
      sourceKind: "base_reception_room",
      cadence: "per_day",
      direction: "source",
      cashDelta: makeRange(activeReceptionRooms.length * DAILY_ACTIVE_RECEPTION_STOREFRONT_INCOME),
      quantity: activeReceptionRooms.length,
      roomTemplateId: activeReceptionRooms[0]?.templateId,
      notes: [
        `Canonical opening path starts with ${activeReceptionRooms.length} operational reception room.`,
      ],
    },
    ...upgradeRows,
  ];
}

function buildPayrollLedger(): EarlyCampaignEconomyLedger["ledgers"]["payroll"] {
  const operatorCount = canonicalNewGameScenario.operators.length;
  const operatorPayroll = operatorCount * DAILY_ACTIVE_OPERATOR_PAYROLL;
  const totalPayroll = operatorPayroll;

  return [
    {
      entryId: "payroll/active-operator-rate",
      label: "Active operator daily payroll",
      sourceKind: "operator_wage",
      cadence: "per_day",
      direction: "sink",
      cashDelta: makeRange(-operatorPayroll),
      quantity: operatorCount,
      notes: [
        `Current implementation charges $${DAILY_ACTIVE_OPERATOR_PAYROLL} per active operator per day.`,
      ],
    },
    {
      entryId: "payroll/canonical-opening-total",
      label: "Canonical opening daily payroll total",
      sourceKind: "canonical_total",
      cadence: "per_day",
      direction: "sink",
      cashDelta: makeRange(-totalPayroll),
      notes: ["4 active operators in the canonical opening seed."],
    },
  ];
}

function getMissionPostingRanges(mission: MissionTemplate, rank: "f") {
  const threatValues: number[] = [];
  const intelValues: number[] = [];
  const rewardValues: number[] = [];
  const riskValues: number[] = [];
  const bidCostValues: number[] = [];

  for (
    let threatVariance = POSTED_CONTRACT_VARIANCE.threat.min;
    threatVariance <= POSTED_CONTRACT_VARIANCE.threat.max;
    threatVariance += 1
  ) {
    for (
      let intelVariance = POSTED_CONTRACT_VARIANCE.intel.min;
      intelVariance <= POSTED_CONTRACT_VARIANCE.intel.max;
      intelVariance += 1
    ) {
      for (
        let rewardVariance = POSTED_CONTRACT_VARIANCE.reward.min;
        rewardVariance <= POSTED_CONTRACT_VARIANCE.reward.max;
        rewardVariance += 1
      ) {
        const budget = computePostedContractEconomyBudget({
          rank,
          missionBaseDurationHours: mission.baseDurationHours,
          missionExpectedThreatTagCount: mission.expectedThreatTags.length,
          guildIntel: canonicalNewGameScenario.guild.intel,
          threatVariance,
          intelVariance,
          rewardVariance,
        });

        threatValues.push(budget.threat);
        intelValues.push(budget.intel);
        rewardValues.push(budget.reward);
        riskValues.push(budget.risk);
        bidCostValues.push(budget.bidCost);
      }
    }
  }

  return {
    threat: makeRange(...threatValues),
    intel: makeRange(...intelValues),
    reward: makeRange(...rewardValues),
    risk: makeRange(...riskValues),
    bidCost: makeRange(...bidCostValues),
  };
}

function buildContractPostingLedger(): EarlyCampaignEconomyLedger["ledgers"]["contractPostings"] {
  const eligibleSiteConceptIds = getOpeningEligibleSiteConceptIds();

  return registry.missions.map((mission) => {
    const ranges = getMissionPostingRanges(mission, "f");

    return {
      entryId: `contract-posting/${mission.id}`,
      missionId: mission.id,
      missionName: mission.name,
      rank: "f",
      cadence: "per_posting",
      eligibleSiteConceptIds,
      reward: ranges.reward,
      bidCost: ranges.bidCost,
      threat: ranges.threat,
      intel: ranges.intel,
      risk: ranges.risk,
      minReputation: 0,
      notes: [
        `Opening board reputation is ${canonicalNewGameScenario.guild.reputation}, so only F-rank postings can appear.`,
      ],
    };
  });
}

function buildContractPayoutLedger(
  postingRows: EarlyCampaignEconomyLedger["ledgers"]["contractPostings"],
): EarlyCampaignEconomyLedger["ledgers"]["contractPayouts"] {
  return postingRows.flatMap((postingRow) => {
    const mission = registry.missionById.get(postingRow.missionId);
    if (!mission) {
      throw new Error(
        `Missing mission "${postingRow.missionId}" while building contract payout ledger.`,
      );
    }

    const opportunityReward = makeRange(
      computeRaidOpportunityEconomyBudget({
        contractThreat: postingRow.threat.min,
        contractIntel: postingRow.intel.max,
        contractReward: postingRow.reward.min,
        missionExpectedThreatTagCount: mission.expectedThreatTags.length,
        threatVariance: RAID_OPPORTUNITY_VARIANCE.threat.min,
        intelVariance: RAID_OPPORTUNITY_VARIANCE.intel.max,
        rewardVariance: RAID_OPPORTUNITY_VARIANCE.reward.min,
      }).reward,
      computeRaidOpportunityEconomyBudget({
        contractThreat: postingRow.threat.max,
        contractIntel: postingRow.intel.min,
        contractReward: postingRow.reward.max,
        missionExpectedThreatTagCount: mission.expectedThreatTags.length,
        threatVariance: RAID_OPPORTUNITY_VARIANCE.threat.max,
        intelVariance: RAID_OPPORTUNITY_VARIANCE.intel.min,
        rewardVariance: RAID_OPPORTUNITY_VARIANCE.reward.max,
      }).reward,
    );
    const opportunityRisk = makeRange(
      computeRaidOpportunityEconomyBudget({
        contractThreat: postingRow.threat.min,
        contractIntel: postingRow.intel.max,
        contractReward: postingRow.reward.min,
        missionExpectedThreatTagCount: mission.expectedThreatTags.length,
        threatVariance: RAID_OPPORTUNITY_VARIANCE.threat.min,
        intelVariance: RAID_OPPORTUNITY_VARIANCE.intel.max,
        rewardVariance: RAID_OPPORTUNITY_VARIANCE.reward.min,
      }).risk,
      computeRaidOpportunityEconomyBudget({
        contractThreat: postingRow.threat.max,
        contractIntel: postingRow.intel.min,
        contractReward: postingRow.reward.max,
        missionExpectedThreatTagCount: mission.expectedThreatTags.length,
        threatVariance: RAID_OPPORTUNITY_VARIANCE.threat.max,
        intelVariance: RAID_OPPORTUNITY_VARIANCE.intel.min,
        rewardVariance: RAID_OPPORTUNITY_VARIANCE.reward.max,
      }).risk,
    );

    const raidOutcomeRows = (["success", "mixed", "failure"] as const).map((outcome) => ({
      entryId: `contract-payout/${mission.id}/${outcome}`,
      missionId: mission.id,
      missionName: mission.name,
      payoutKind: "raid_outcome" as const,
      outcome,
      cadence: "per_raid" as const,
      eligibleSiteConceptIds: postingRow.eligibleSiteConceptIds,
      cashDelta: makeRange(
        computeRaidCashDelta(outcome, opportunityReward.min, opportunityRisk.max),
        computeRaidCashDelta(outcome, opportunityReward.max, opportunityRisk.min),
      ),
      reputationDelta: makeRange(computeRaidReputationDelta(outcome)),
      opportunityReward,
      opportunityRisk,
      notes: ["Derived from raid opportunity reward and risk after the contract is secured."],
    }));

    return [
      ...raidOutcomeRows,
      {
        entryId: `contract-payout/${mission.id}/boss-completion-bonus`,
        missionId: mission.id,
        missionName: mission.name,
        payoutKind: "boss_completion_bonus" as const,
        outcome: "boss_completion_bonus" as const,
        cadence: "per_contract_clear" as const,
        eligibleSiteConceptIds: postingRow.eligibleSiteConceptIds,
        cashDelta: makeRange(
          computeBossCompletionCashBonus(postingRow.reward.min, "f"),
          computeBossCompletionCashBonus(postingRow.reward.max, "f"),
        ),
        reputationDelta: makeRange(computeBossCompletionReputationBonus()),
        postingReward: postingRow.reward,
        notes: [
          "Boss-clear bonus is awarded on contract completion, separate from per-raid cash delta.",
        ],
      },
    ];
  });
}

function getDropTableValueSummary(
  dropTable: DropTable,
  itemById: ReadonlyMap<string, ItemTemplate>,
) {
  const totalWeight = dropTable.entries.reduce((sum, entry) => sum + entry.weight, 0);
  const values = dropTable.entries.map((entry) => {
    const item = itemById.get(entry.itemId);
    if (!item) {
      throw new Error(`Unknown item "${entry.itemId}" in drop table "${dropTable.id}".`);
    }

    return {
      item,
      minCash: entry.minQuantity * item.sellPrice,
      maxCash: entry.maxQuantity * item.sellPrice,
      expectedCash:
        (entry.weight / totalWeight) *
        ((entry.minQuantity + entry.maxQuantity) / 2) *
        item.sellPrice,
    };
  });

  return {
    referencedItemIds: [...new Set(dropTable.entries.map((entry) => entry.itemId))].sort(),
    cashDelta: makeRange(...values.flatMap((value) => [value.minCash, value.maxCash])),
    expectedCashDelta: round2(values.reduce((sum, value) => sum + value.expectedCash, 0)),
  };
}

function getOpeningDropTables() {
  const dropTableIds = new Set<string>();

  registry.missions.forEach((mission) => {
    mission.combatProfile?.enemyGroups.forEach((group) => {
      dropTableIds.add(group.dropTableId);
    });

    if (mission.combatProfile?.boss) {
      dropTableIds.add(mission.combatProfile.boss.dropTableId);
    }
  });

  return [...dropTableIds]
    .map((dropTableId) => {
      const dropTable = registry.dropTableById.get(dropTableId);
      if (!dropTable) {
        throw new Error(`Missing drop table "${dropTableId}" while building loot ledger.`);
      }

      return dropTable;
    })
    .sort((left, right) => left.id.localeCompare(right.id));
}

function buildLootSaleConversionLedger(): EarlyCampaignEconomyLedger["ledgers"]["lootSaleConversion"] {
  const dropTables = getOpeningDropTables();
  const referencedItemIds = [
    ...new Set(dropTables.flatMap((dropTable) => dropTable.entries.map((entry) => entry.itemId))),
  ].sort();

  const recoverableItems = referencedItemIds.map((itemId) => {
    const item = registry.itemById.get(itemId);
    if (!item) {
      throw new Error(`Missing item "${itemId}" while building recoverable item ledger.`);
    }

    const itemDropTableIds = dropTables
      .filter((dropTable) => dropTable.entries.some((entry) => entry.itemId === itemId))
      .map((dropTable) => dropTable.id);

    return {
      entryId: `loot-sale/item/${item.id}`,
      itemId: item.id,
      itemName: item.name,
      itemCategory: item.category,
      cadence: "per_sale_unit" as const,
      direction: "source" as const,
      cashDelta: makeRange(item.sellPrice),
      dropTableIds: itemDropTableIds,
      notes:
        item.category === "loot"
          ? ["Stackable loot item."]
          : ["Recoverable drop that can also be sold through the market."],
    };
  });

  const dropTableRolls = dropTables.map((dropTable) => {
    const summary = getDropTableValueSummary(dropTable, registry.itemById);

    return {
      entryId: `loot-sale/drop-table/${dropTable.id}`,
      dropTableId: dropTable.id,
      cadence: "per_roll" as const,
      direction: "source" as const,
      cashDelta: summary.cashDelta,
      expectedCashDelta: summary.expectedCashDelta,
      referencedItemIds: summary.referencedItemIds,
      notes: ["One entry is chosen per roll, then quantity is rolled inside that entry's range."],
    };
  });

  const dropTableSummaryById = new Map(dropTableRolls.map((row) => [row.dropTableId, row]));

  const missionResultEnvelopes = registry.missions.flatMap((mission) => {
    const combatProfile = mission.combatProfile;
    if (!combatProfile) {
      return [];
    }

    return (["success", "mixed", "failure"] as const).map((result) => {
      const rolls =
        result === "failure"
          ? []
          : [
              ...combatProfile.enemyGroups
                .map((group) => ({
                  dropTableId: group.dropTableId,
                  count: result === "success" ? group.count : Math.ceil(group.count / 2),
                }))
                .filter((roll) => roll.count > 0),
              ...(result === "success" && combatProfile.boss
                ? [{ dropTableId: combatProfile.boss.dropTableId, count: 1 }]
                : []),
            ];

      const minCash = rolls.reduce((sum, roll) => {
        const tableSummary = dropTableSummaryById.get(roll.dropTableId);
        return sum + (tableSummary?.cashDelta.min ?? 0) * roll.count;
      }, 0);
      const maxCash = rolls.reduce((sum, roll) => {
        const tableSummary = dropTableSummaryById.get(roll.dropTableId);
        return sum + (tableSummary?.cashDelta.max ?? 0) * roll.count;
      }, 0);
      const expectedCash = round2(
        rolls.reduce((sum, roll) => {
          const tableSummary = dropTableSummaryById.get(roll.dropTableId);
          return sum + (tableSummary?.expectedCashDelta ?? 0) * roll.count;
        }, 0),
      );

      return {
        entryId: `loot-sale/mission/${mission.id}/${result}`,
        missionId: mission.id,
        missionName: mission.name,
        result,
        cadence: "per_raid" as const,
        direction: "source" as const,
        cashDelta: makeRange(minCash, maxCash),
        expectedCashDelta: expectedCash,
        rolls,
        notes: [
          "Sell-value envelope only. Actual loot volume still depends on raid result and mission combat profile.",
        ],
      };
    });
  });

  return {
    recoverableItems,
    dropTableRolls,
    missionResultEnvelopes,
  };
}

function buildUpgradeCostLedger(): EarlyCampaignEconomyLedger["ledgers"]["upgradeCosts"] {
  const canonicalRoomTemplateIds = new Set(
    canonicalNewGameScenario.rooms.map((room) => room.templateId),
  );

  return registry.upgrades.map((upgrade) => {
    const incomeDeltaPerDay = upgrade.effects.reduce((total, effect) => {
      return effect.type === "modify_resource_income" && effect.resourceId === "resource/cash"
        ? total + effect.amount
        : total;
    }, 0);
    const recoveryRateDelta = upgrade.effects.reduce((total, effect) => {
      return effect.type === "modify_recovery_rate" ? total + effect.amount : total;
    }, 0);
    const futureCashCostMultiplier = upgrade.effects.find(
      (effect) => effect.type === "modify_resource_cost" && effect.resourceId === "resource/cash",
    );

    return {
      entryId: `upgrade-cost/${upgrade.id}`,
      upgradeId: upgrade.id,
      upgradeName: upgrade.name,
      targetKind: upgrade.target,
      targetId: upgrade.targetId,
      cadence: "one_time" as const,
      direction: "sink" as const,
      cashDelta: makeRange(-getCashRequirement(upgrade)),
      availableInCanonicalOpening:
        upgrade.target === "building"
          ? upgrade.targetId === canonicalNewGameScenario.building.activeBuildingId
          : canonicalRoomTemplateIds.has(upgrade.targetId),
      ...(incomeDeltaPerDay !== 0 ? { incomeDeltaPerDay } : {}),
      ...(recoveryRateDelta !== 0 ? { recoveryRateDelta } : {}),
      ...(futureCashCostMultiplier && "multiplier" in futureCashCostMultiplier
        ? { futureCashCostMultiplier: futureCashCostMultiplier.multiplier }
        : {}),
      notes: [
        upgrade.target === "room"
          ? `Room target must exist before purchase: ${upgrade.targetId}.`
          : `Building target: ${upgrade.targetId}.`,
      ],
    };
  });
}

function buildTreatmentOrRepairLedger(): EarlyCampaignEconomyLedger["ledgers"]["treatmentOrRepairCosts"] {
  const firstAidUpgrade = registry.upgradeById.get("upgrade/room/dining_area:first_aid_station");
  const injuryComplication = INCIDENT_TEMPLATES.find(
    (template) => template.id === "incident/injury-complication",
  );
  const supplyPinch = INCIDENT_TEMPLATES.find(
    (template) => template.id === "incident/supply-pinch",
  );

  return [
    {
      entryId: "treatment/passive-recovery",
      label: "Passive injury recovery",
      referenceType: "system",
      referenceId: "sim/systems/needs.ts",
      coverage: "none",
      cadence: "passive",
      direction: "neutral",
      cashDelta: makeRange(0),
      notes: [
        "Current implementation heals by elapsed time plus recovery modifiers. No direct treasury charge is applied.",
      ],
    },
    ...(firstAidUpgrade
      ? [
          {
            entryId: "treatment/upgrade/first-aid-station",
            label: firstAidUpgrade.name,
            referenceType: "upgrade" as const,
            referenceId: firstAidUpgrade.id,
            coverage: "indirect" as const,
            cadence: "one_time" as const,
            direction: "sink" as const,
            cashDelta: makeRange(-getCashRequirement(firstAidUpgrade)),
            notes: [
              "Improves recovery rate, but it is infrastructure spend rather than a per-treatment fee.",
            ],
          },
        ]
      : []),
    ...((injuryComplication?.choices ?? []).map((choice) => ({
      entryId: `treatment/incident/${injuryComplication!.id}/${choice.choiceId}`,
      label: `${injuryComplication!.name} - ${choice.label}`,
      referenceType: "incident_choice" as const,
      referenceId: `${injuryComplication!.id}#${choice.choiceId}`,
      coverage: "none" as const,
      cadence: "choice" as const,
      direction: "neutral" as const,
      cashDelta: makeRange(sumTreasuryEffects(choice)),
      notes: [
        "Recovery-direction choice with no direct treasury delta in the current implementation.",
      ],
    })) ?? []),
    ...((supplyPinch?.choices ?? [])
      .filter((choice) => sumTreasuryEffects(choice) !== 0)
      .map((choice) => ({
        entryId: `treatment/incident/${supplyPinch!.id}/${choice.choiceId}`,
        label: `${supplyPinch!.name} - ${choice.label}`,
        referenceType: "incident_choice" as const,
        referenceId: `${supplyPinch!.id}#${choice.choiceId}`,
        coverage: "direct" as const,
        cadence: "choice" as const,
        direction: "sink" as const,
        cashDelta: makeRange(sumTreasuryEffects(choice)),
        notes: [
          "Closest current repair/restock treasury sink; there is no standalone repair command or treatment bill.",
        ],
      })) ?? []),
  ];
}

function buildIncidentTreasuryDeltaLedger(): EarlyCampaignEconomyLedger["ledgers"]["incidentTreasuryDeltas"] {
  return INCIDENT_TEMPLATES.flatMap((template) =>
    template.choices
      .map((choice) => {
        const treasuryDelta = sumTreasuryEffects(choice);
        if (treasuryDelta === 0) {
          return null;
        }

        return {
          entryId: `incident-treasury/${template.id}/${choice.choiceId}`,
          templateId: template.id,
          templateName: template.name,
          category: template.category,
          choiceId: choice.choiceId,
          choiceLabel: choice.label,
          cadence: "per_choice" as const,
          direction: treasuryDelta >= 0 ? ("source" as const) : ("sink" as const),
          cashDelta: makeRange(treasuryDelta),
          openingMercyWindowAllowed: OPENING_SAFE_INCIDENT_CATEGORIES.includes(
            template.category as (typeof OPENING_SAFE_INCIDENT_CATEGORIES)[number],
          ),
          notes: ["Only explicit treasury_delta effects are included here."],
        };
      })
      .filter((row): row is NonNullable<typeof row> => row !== null),
  ).sort((left, right) => left.entryId.localeCompare(right.entryId));
}

function buildPhaseGaps(): EarlyCampaignEconomyLedger["gaps"] {
  return [
    {
      gapId: "gap/direct-treatment-repair-spend",
      title: "Direct treatment spend is present but still coarse",
      blocksPhase2: false,
      detail:
        "Post-raid treatment and restock now remove treasury directly, but the system is still a flat summary-level sink rather than a richer medical supply or repair economy.",
    },
    {
      gapId: "gap/envelope-thresholds",
      title: "No target-envelope thresholds yet",
      blocksPhase2: true,
      detail:
        "Phase 1 now exports the current money surfaces, but Phase 2 still needs explicit pass/fail targets for treasury flow, setback tolerance, and relocation pacing.",
    },
    {
      gapId: "gap/simulated-yield-frequency",
      title: "Loot and contract yields still need deterministic run-frequency data",
      blocksPhase2: true,
      detail:
        "This export captures static sell prices, drop-table values, and payout envelopes, but not how often each outcome occurs across canonical early runs.",
    },
  ];
}

export function buildEarlyCampaignEconomyLedger(): EarlyCampaignEconomyLedger {
  const storefrontIncome = buildStorefrontIncomeLedger();
  const payroll = buildPayrollLedger();
  const contractPostings = buildContractPostingLedger();
  const contractPayouts = buildContractPayoutLedger(contractPostings);
  const lootSaleConversion = buildLootSaleConversionLedger();
  const upgradeCosts = buildUpgradeCostLedger();
  const treatmentOrRepairCosts = buildTreatmentOrRepairLedger();
  const incidentTreasuryDeltas = buildIncidentTreasuryDeltaLedger();
  const activeReceptionRooms = canonicalNewGameScenario.rooms.filter((room) => {
    const template = registry.roomById.get(room.templateId);
    return template?.tags.includes("room:reception") === true;
  }).length;
  const dailyPayroll = -payroll.find((row) => row.entryId === "payroll/canonical-opening-total")!
    .cashDelta.min;
  const dailyStorefrontIncomeBase = activeReceptionRooms * DAILY_ACTIVE_RECEPTION_STOREFRONT_INCOME;

  return earlyCampaignEconomyLedgerSchema.parse({
    schemaVersion: EARLY_CAMPAIGN_ECONOMY_LEDGER_SCHEMA_VERSION,
    meta: {
      scenarioId: "canonical-opening-path",
      canonicalScenarioPath: "content/bootstrap.ts#canonicalNewGameScenario",
      openingSpecPath: "docs/plans/opening-campaign-spec.md",
      planPath: "docs/plans/economy-and-balance-harness-plan.md",
      startingState: {
        treasury: canonicalNewGameScenario.guild.treasury,
        reputation: canonicalNewGameScenario.guild.reputation,
        intel: canonicalNewGameScenario.guild.intel,
        activeOperators: canonicalNewGameScenario.operators.length,
        activeReceptionRooms,
        dailyStorefrontIncomeBase,
        dailyPayroll,
        dailyNetCashBeforeUpgrades: dailyStorefrontIncomeBase - dailyPayroll,
      },
    },
    ledgers: {
      storefrontIncome,
      payroll,
      contractPostings,
      contractPayouts,
      lootSaleConversion,
      upgradeCosts,
      treatmentOrRepairCosts,
      incidentTreasuryDeltas,
    },
    gaps: buildPhaseGaps(),
  });
}

export function renderEarlyCampaignEconomyLedgerJson(
  ledger: EarlyCampaignEconomyLedger = buildEarlyCampaignEconomyLedger(),
): string {
  return `${JSON.stringify(ledger, null, 2)}\n`;
}

export function renderEarlyCampaignEconomyReport(
  ledger: EarlyCampaignEconomyLedger = buildEarlyCampaignEconomyLedger(),
): string {
  const lines: string[] = [];
  const starter = ledger.meta.startingState;
  const lootMissionRows = ledger.ledgers.lootSaleConversion.missionResultEnvelopes;
  const itemRows = ledger.ledgers.lootSaleConversion.recoverableItems;

  lines.push("# Early Campaign Economy Report");
  lines.push("");
  lines.push("Grounded in the canonical opening path, not preview/bootstrap-only assumptions.");
  lines.push("");
  lines.push("## Opening Snapshot");
  lines.push("");
  lines.push(`- Starting treasury: $${starter.treasury}`);
  lines.push(`- Starting roster payroll: $${starter.dailyPayroll}/day`);
  lines.push(`- Base storefront income: $${starter.dailyStorefrontIncomeBase}/day`);
  lines.push(`- Net daily cash before upgrades: $${starter.dailyNetCashBeforeUpgrades}/day`);
  lines.push(`- Active operators: ${starter.activeOperators}`);
  lines.push("");
  lines.push("## Storefront And Payroll");
  lines.push("");
  lines.push("| Surface | Cash | Notes |");
  lines.push("| --- | ---: | --- |");
  ledger.ledgers.storefrontIncome.forEach((row) => {
    lines.push(
      `| ${row.label} | ${formatCashRange(row.cashDelta)} / day | ${row.notes.join(" ")} |`,
    );
  });
  ledger.ledgers.payroll.forEach((row) => {
    lines.push(
      `| ${row.label} | ${formatCashRange(row.cashDelta)} / day | ${row.notes.join(" ")} |`,
    );
  });
  lines.push("");
  lines.push("## Contract Board Envelope");
  lines.push("");
  lines.push("| Mission | Reward | Bid Cost | Threat | Intel | Risk |");
  lines.push("| --- | ---: | ---: | ---: | ---: | ---: |");
  ledger.ledgers.contractPostings.forEach((row) => {
    lines.push(
      `| ${row.missionName} | ${formatCashRange(row.reward)} | ${formatCashRange(row.bidCost)} | ${formatRange(row.threat)} | ${formatRange(row.intel)} | ${formatRange(row.risk)} |`,
    );
  });
  lines.push("");
  lines.push("## Raid Payout Envelope");
  lines.push("");
  lines.push("| Mission | Outcome | Cash Delta | Reputation |");
  lines.push("| --- | --- | ---: | ---: |");
  ledger.ledgers.contractPayouts.forEach((row) => {
    lines.push(
      `| ${row.missionName} | ${row.outcome.replace(/_/g, " ")} | ${formatCashRange(row.cashDelta)} | ${formatRange(row.reputationDelta)} |`,
    );
  });
  lines.push("");
  lines.push("## Loot-Sale Conversion");
  lines.push("");
  lines.push("| Recoverable Item | Sell Price | Drop Tables |");
  lines.push("| --- | ---: | --- |");
  itemRows.forEach((row) => {
    lines.push(
      `| ${row.itemName} | ${formatCashRange(row.cashDelta)} | ${row.dropTableIds.join(", ")} |`,
    );
  });
  lines.push("");
  lines.push("| Mission | Result | Sell-Value Range | Expected Sell Value |");
  lines.push("| --- | --- | ---: | ---: |");
  lootMissionRows.forEach((row) => {
    lines.push(
      `| ${row.missionName} | ${row.result} | ${formatCashRange(row.cashDelta)} | ${formatCashRange(makeRange(row.expectedCashDelta), 2)} |`,
    );
  });
  lines.push("");
  lines.push("## Upgrades");
  lines.push("");
  lines.push("| Upgrade | Cost | Extra Cash / Day | Recovery Delta | Cost Multiplier |");
  lines.push("| --- | ---: | ---: | ---: | ---: |");
  ledger.ledgers.upgradeCosts.forEach((row) => {
    lines.push(
      `| ${row.upgradeName} | ${formatCashRange(row.cashDelta)} | ${row.incomeDeltaPerDay ?? 0} | ${row.recoveryRateDelta ?? 0} | ${row.futureCashCostMultiplier ?? 1} |`,
    );
  });
  lines.push("");
  lines.push("## Treatment, Repair, And Incident Cash");
  lines.push("");
  lines.push("| Surface | Cash | Coverage |");
  lines.push("| --- | ---: | --- |");
  ledger.ledgers.treatmentOrRepairCosts.forEach((row) => {
    lines.push(`| ${row.label} | ${formatCashRange(row.cashDelta)} | ${row.coverage} |`);
  });
  lines.push("");
  lines.push("| Incident Choice | Cash | Opening-Safe Category |");
  lines.push("| --- | ---: | --- |");
  ledger.ledgers.incidentTreasuryDeltas.forEach((row) => {
    lines.push(
      `| ${row.templateName} - ${row.choiceLabel} | ${formatCashRange(row.cashDelta)} | ${row.openingMercyWindowAllowed ? "yes" : "no"} |`,
    );
  });
  lines.push("");
  lines.push("## Phase 2 Gaps");
  lines.push("");
  ledger.gaps.forEach((gap) => {
    lines.push(`- ${gap.title}: ${gap.detail}`);
  });
  lines.push("");

  return lines.join("\n");
}

export function buildEarlyCampaignEconomyArtifacts() {
  const ledger = buildEarlyCampaignEconomyLedger();

  return {
    ledger,
    json: renderEarlyCampaignEconomyLedgerJson(ledger),
    report: renderEarlyCampaignEconomyReport(ledger),
  };
}

export { EARLY_CAMPAIGN_ECONOMY_LEDGER_SCHEMA_VERSION };

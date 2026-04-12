import { createTemplateRegistry } from "content/templates";
import type { CraftRecipeTemplate, ItemTemplate } from "content/templates";
import { districtTemplates } from "content/templates/districts";
import { z } from "zod";

const MIDGAME_ECONOMY_LEDGER_SCHEMA_VERSION = "midgame-economy.v1";

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

// ── Material source envelope ────────────────────────────────────────────

const materialSourceRowSchema = z.object({
  entryId: z.string(),
  itemId: z.string(),
  itemName: z.string(),
  sourceKind: z.enum(["drop_table", "market_fallback"]),
  direction: z.literal("source"),
  sellPrice: z.number().int().nonnegative(),
  usedInRecipeIds: z.array(z.string()),
  notes: z.array(z.string()),
});

// ── Craft cost envelope ─────────────────────────────────────────────────

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
  inputCost: numericRangeSchema,
  totalCost: numericRangeSchema,
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

// ── Crafted gear value envelope ─────────────────────────────────────────

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

// ── Market fallback value ───────────────────────────────────────────────

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

// ── Schema ──────────────────────────────────────────────────────────────

export const midgameEconomyLedgerSchema = z.object({
  schemaVersion: z.literal(MIDGAME_ECONOMY_LEDGER_SCHEMA_VERSION),
  meta: z.object({
    registryPath: z.literal("content/templates/index.ts"),
    craftRecipeCount: z.number().int().nonnegative(),
    craftFamilyCount: z.number().int().nonnegative(),
    craftOutputCount: z.number().int().nonnegative(),
    districtCount: z.number().int().nonnegative(),
  }),
  ledgers: z.object({
    materialSources: z.array(materialSourceRowSchema),
    craftCosts: z.array(craftCostRowSchema),
    craftedGearValues: z.array(craftedGearValueRowSchema),
    marketFallbacks: z.array(marketFallbackRowSchema),
  }),
});

type MidgameEconomyLedger = z.infer<typeof midgameEconomyLedgerSchema>;

// ── Builder ─────────────────────────────────────────────────────────────

function collectCraftInputItems(): Map<string, { item: ItemTemplate; recipeIds: string[] }> {
  const map = new Map<string, { item: ItemTemplate; recipeIds: string[] }>();
  for (const recipe of registry.craftRecipes) {
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

function buildMaterialSources() {
  const inputs = collectCraftInputItems();
  return [...inputs.entries()].map(([itemId, { item, recipeIds }]) => ({
    entryId: `material-source/${itemId}`,
    itemId,
    itemName: item.name,
    sourceKind: "drop_table" as const,
    direction: "source" as const,
    sellPrice: item.sellPrice,
    usedInRecipeIds: recipeIds,
    notes: [
      item.tags.includes("loot:crafting_input")
        ? "Protected from auto-sell by loot automation."
        : "Standard loot part.",
    ],
  }));
}

function computeInputOpportunityCost(recipe: CraftRecipeTemplate): {
  items: Array<{
    itemId: string;
    itemName: string;
    quantity: number;
    unitSellPrice: number;
    totalOpportunityCost: number;
  }>;
  totalMin: number;
  totalMax: number;
} {
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
  const total = items.reduce((sum, i) => sum + i.totalOpportunityCost, 0);
  return { items, totalMin: total, totalMax: total };
}

function buildCraftCosts() {
  return registry.craftRecipes.map((recipe) => {
    const output = registry.itemById.get(recipe.outputItemId);
    const { items, totalMin, totalMax } = computeInputOpportunityCost(recipe);
    return {
      entryId: `craft-cost/${recipe.id}`,
      recipeId: recipe.id,
      recipeName: recipe.name,
      family: recipe.family,
      outputItemId: recipe.outputItemId,
      outputName: output?.name ?? recipe.outputItemId,
      outputCategory: output?.category ?? "weapon",
      outputRank: output?.rank ?? "d",
      direction: "sink" as const,
      cashCost: recipe.cashCost,
      inputCost: { min: totalMin, max: totalMax },
      totalCost: {
        min: totalMin + recipe.cashCost,
        max: totalMax + recipe.cashCost,
      },
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
        `Requires building/porters tier ${recipe.minimumBuildingTier}+.`,
        `Requires staffed workshop (${recipe.requiredStaffTag}).`,
        `Consumes ${recipe.cashCost} cash when crafted.`,
      ],
    };
  });
}

function buildCraftedGearValues() {
  const outputItems = new Map<string, { item: ItemTemplate; recipeIds: string[] }>();
  for (const recipe of registry.craftRecipes) {
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
    statEffects: item.statEffects.map((e) => ({ stat: e.stat, value: e.value })),
    craftedVia: recipeIds,
    notes:
      item.buyPrice > 0
        ? ["Also available on the market as a direct purchase."]
        : ["Not directly purchasable — crafting only."],
  }));
}

function buildMarketFallbacks() {
  // Collect all D-rank gear that competes with crafted output
  const craftedOutputIds = new Set(registry.craftRecipes.map((r) => r.outputItemId));
  const dRankGear = registry.items.filter(
    (item) =>
      item.rank === "d" &&
      (item.category === "weapon" ||
        item.category === "outfit-overlay" ||
        item.category === "accessory") &&
      !craftedOutputIds.has(item.id),
  );

  return dRankGear.map((item) => ({
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
        : "Drop-only — not purchasable on the market.",
    ],
  }));
}

export function buildMidgameEconomyLedger(): MidgameEconomyLedger {
  const families = new Set(registry.craftRecipes.map((r) => r.family));
  const outputIds = new Set(registry.craftRecipes.map((r) => r.outputItemId));

  return {
    schemaVersion: MIDGAME_ECONOMY_LEDGER_SCHEMA_VERSION,
    meta: {
      registryPath: "content/templates/index.ts",
      craftRecipeCount: registry.craftRecipes.length,
      craftFamilyCount: families.size,
      craftOutputCount: outputIds.size,
      districtCount: districtTemplates.length,
    },
    ledgers: {
      materialSources: buildMaterialSources(),
      craftCosts: buildCraftCosts(),
      craftedGearValues: buildCraftedGearValues(),
      marketFallbacks: buildMarketFallbacks(),
    },
  };
}

// ── Report rendering ────────────────────────────────────────────────────

function renderMarkdownReport(ledger: MidgameEconomyLedger): string {
  const lines: string[] = [];
  lines.push("# Midgame Economy Report");
  lines.push("");
  lines.push("## Meta");
  lines.push(`- Craft recipes: ${ledger.meta.craftRecipeCount}`);
  lines.push(`- Craft families: ${ledger.meta.craftFamilyCount}`);
  lines.push(`- Distinct crafted outputs: ${ledger.meta.craftOutputCount}`);
  lines.push(`- Districts: ${ledger.meta.districtCount}`);
  lines.push("");

  lines.push("## Material Source Envelope");
  lines.push("");
  for (const row of ledger.ledgers.materialSources) {
    lines.push(
      `- **${row.itemName}** (sell: ${row.sellPrice}) — used in ${row.usedInRecipeIds.length} recipe(s)`,
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
    lines.push(`  - Input opportunity cost: ${row.inputCost.min}–${row.inputCost.max}`);
    lines.push(`  - Total craft cost: ${row.totalCost.min}–${row.totalCost.max}`);
    for (const input of row.inputItems) {
      lines.push(
        `    - ${input.quantity}x ${input.itemName} (sell: ${input.unitSellPrice}, opp: ${input.totalOpportunityCost})`,
      );
    }
    if (row.requiredFactions.length > 0) {
      lines.push(
        `  - Faction gates: ${row.requiredFactions.map((f) => `${f.factionName} ≥ ${f.minimumStanding}`).join(", ")}`,
      );
    }
    if (row.requiredDistrictTags.length > 0) {
      lines.push(`  - District tags: ${row.requiredDistrictTags.join(", ")}`);
    }
  }
  lines.push("");

  lines.push("## Crafted Gear Value Envelope");
  lines.push("");
  for (const row of ledger.ledgers.craftedGearValues) {
    const stats = row.statEffects.map((e) => `${e.stat} +${e.value}`).join(", ");
    lines.push(
      `- **${row.itemName}** (${row.category}/${row.rank}) — sell: ${row.sellPrice}, buy: ${row.buyPrice}`,
    );
    if (stats) lines.push(`  - Stats: ${stats}`);
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

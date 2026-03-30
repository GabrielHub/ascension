import type { ItemRank, TemplateRegistry } from "content/templates";
import { ITEM_RANK_ORDER, getItemRankIndex } from "content/templates/shared";

import {
  BuildingAuthority,
  EquipmentAssignment,
  InventoryStack,
  OperatorIdentity,
} from "../components";
import { sellItem } from "./market";
import type { SimSystemContext } from "./types";

const EQUIPMENT_CATEGORIES = ["weapon", "outfit-overlay", "accessory"] as const;
const CRAFTING_INPUT_TAG = "loot:crafting_input";
const MONSTER_PART_TAG = "loot:monster_part";
const AUTO_SELL_JUNK_TAG = "loot:auto_sell_junk";

export interface LootAutomationSnapshot {
  autoSellEnabled: boolean;
}

export interface LootAutomationEquipmentFilter {
  category: (typeof EQUIPMENT_CATEGORIES)[number];
  sellBelowRank: ItemRank | null;
}

export interface LootAutomationView {
  autoSellEnabled: boolean;
  equipmentFilters: LootAutomationEquipmentFilter[];
  autoSellJunkMonsterParts: boolean;
}

export interface LootAutomationSweepEntry {
  itemId: string;
  quantity: number;
  revenue: number;
}

export interface LootAutomationSweepResult {
  entries: LootAutomationSweepEntry[];
  totalQuantity: number;
  totalRevenue: number;
}

export const DEFAULT_LOOT_AUTOMATION: LootAutomationSnapshot = {
  autoSellEnabled: false,
};

export function normalizeLootAutomationSnapshot(
  value?: Partial<LootAutomationSnapshot> | null,
): LootAutomationSnapshot {
  return {
    autoSellEnabled: value?.autoSellEnabled === true,
  };
}

export function isLootAutomationEnabled(context: SimSystemContext): boolean {
  return BuildingAuthority.lootAutomationEnabled[context.singletonEntities.building] === 1;
}

export function setLootAutomationEnabled(context: SimSystemContext, enabled: boolean): void {
  BuildingAuthority.lootAutomationEnabled[context.singletonEntities.building] = enabled ? 1 : 0;
}

export function buildLootAutomationView(context: SimSystemContext): LootAutomationView {
  return {
    autoSellEnabled: isLootAutomationEnabled(context),
    equipmentFilters: getEquipmentAutoSellFilters(context),
    autoSellJunkMonsterParts: true,
  };
}

export function applyLootAutomationSweep(
  context: SimSystemContext,
  scope?: readonly { itemId: string; quantity: number }[],
): LootAutomationSweepResult {
  if (!isLootAutomationEnabled(context)) {
    return {
      entries: [],
      totalQuantity: 0,
      totalRevenue: 0,
    };
  }

  const entries: LootAutomationSweepEntry[] = [];
  const protectedMonsterPartIds = buildProtectedMonsterPartIds(context.registry);
  const filtersByCategory = new Map(
    getEquipmentAutoSellFilters(context).map((filter) => [filter.category, filter.sellBelowRank]),
  );

  buildScopeCounts(context, scope).forEach((quantity, itemId) => {
    const template = context.registry.itemById.get(itemId);
    if (!template || quantity <= 0 || template.sellPrice <= 0) {
      return;
    }

    if (
      !shouldAutoSellEquipmentItem(itemId, context.registry, filtersByCategory) &&
      !isJunkMonsterPart(itemId, context.registry, protectedMonsterPartIds)
    ) {
      return;
    }

    const revenue = template.sellPrice * quantity;
    if (!sellItem(context, itemId, quantity, template.sellPrice)) {
      return;
    }

    entries.push({
      itemId,
      quantity,
      revenue,
    });
  });

  return {
    entries,
    totalQuantity: entries.reduce((sum, entry) => sum + entry.quantity, 0),
    totalRevenue: entries.reduce((sum, entry) => sum + entry.revenue, 0),
  };
}

export function describeLootAutomationSweep(
  registry: TemplateRegistry,
  result: LootAutomationSweepResult,
): string {
  const samples = result.entries.slice(0, 3).map((entry) => {
    const itemName = registry.itemById.get(entry.itemId)?.name ?? entry.itemId;
    return `${entry.quantity} ${itemName}${entry.quantity === 1 ? "" : "s"}`;
  });

  if (samples.length === 0) {
    return "";
  }

  const remainder = result.entries.length - samples.length;
  return remainder > 0 ? `${samples.join(", ")}, and ${remainder} more` : samples.join(", ");
}

export function getEquipmentAutoSellFilters(
  context: SimSystemContext,
): LootAutomationEquipmentFilter[] {
  const activeOperatorCount = getActiveOperatorCount(context);
  return EQUIPMENT_CATEGORIES.map((category) => ({
    category,
    sellBelowRank: resolveEquipmentSellBelowRank(context, category, activeOperatorCount),
  }));
}

function buildScopeCounts(
  context: SimSystemContext,
  scope?: readonly { itemId: string; quantity: number }[],
): Map<string, number> {
  if (scope) {
    const counts = new Map<string, number>();
    scope.forEach(({ itemId, quantity }) => {
      if (quantity > 0) {
        counts.set(itemId, (counts.get(itemId) ?? 0) + quantity);
      }
    });
    return counts;
  }

  return new Map(
    context.runtimeState.inventoryEntities
      .filter((entity) => InventoryStack.quantity[entity] > 0)
      .map((entity) => [InventoryStack.itemId[entity], InventoryStack.quantity[entity]]),
  );
}

function buildProtectedMonsterPartIds(registry: TemplateRegistry): ReadonlySet<string> {
  const protectedIds = new Set<string>();

  registry.prepRecipes.forEach((recipe) => {
    recipe.inputs.forEach((input) => {
      protectedIds.add(input.itemId);
    });
  });

  registry.items.forEach((item) => {
    if (item.tags.includes(CRAFTING_INPUT_TAG)) {
      protectedIds.add(item.id);
    }
  });

  return protectedIds;
}

function getActiveOperatorCount(context: SimSystemContext): number {
  return context.runtimeState.operatorEntities.filter(
    (entity) => OperatorIdentity.lifecycleStatus[entity] === "active",
  ).length;
}

function resolveEquipmentSellBelowRank(
  context: SimSystemContext,
  category: (typeof EQUIPMENT_CATEGORIES)[number],
  activeOperatorCount: number,
): ItemRank | null {
  if (activeOperatorCount <= 0) {
    return null;
  }

  for (let index = ITEM_RANK_ORDER.length - 1; index >= 0; index -= 1) {
    const rank = ITEM_RANK_ORDER[index];
    if (countItemsAtOrAboveRank(context, category, rank) >= activeOperatorCount) {
      return rank === "f" ? null : rank;
    }
  }

  return null;
}

function countItemsAtOrAboveRank(
  context: SimSystemContext,
  category: (typeof EQUIPMENT_CATEGORIES)[number],
  minimumRank: ItemRank,
): number {
  let total = 0;
  const minimumRankIndex = getItemRankIndex(minimumRank);

  context.runtimeState.inventoryEntities.forEach((entity) => {
    const itemId = InventoryStack.itemId[entity];
    const quantity = InventoryStack.quantity[entity];
    const template = context.registry.itemById.get(itemId);
    if (
      quantity > 0 &&
      template?.category === category &&
      getItemRankIndex(template.rank) >= minimumRankIndex
    ) {
      total += quantity;
    }
  });

  context.runtimeState.equipmentEntities.forEach((entity) => {
    const itemId =
      category === "weapon"
        ? EquipmentAssignment.weaponId[entity]
        : category === "outfit-overlay"
          ? EquipmentAssignment.outfitOverlayId[entity]
          : EquipmentAssignment.accessoryId[entity];

    if (!itemId) {
      return;
    }

    const template = context.registry.itemById.get(itemId);
    if (
      template?.category === category &&
      getItemRankIndex(template.rank) >= minimumRankIndex &&
      isEquippedByActiveOperator(context, EquipmentAssignment.operatorId[entity])
    ) {
      total += 1;
    }
  });

  return total;
}

function isEquippedByActiveOperator(context: SimSystemContext, operatorId: string): boolean {
  const operatorEntity = context.runtimeState.operatorEntities.find(
    (entity) => OperatorIdentity.id[entity] === operatorId,
  );
  return (
    operatorEntity !== undefined && OperatorIdentity.lifecycleStatus[operatorEntity] === "active"
  );
}

function shouldAutoSellEquipmentItem(
  itemId: string,
  registry: TemplateRegistry,
  filtersByCategory: ReadonlyMap<(typeof EQUIPMENT_CATEGORIES)[number], ItemRank | null>,
): boolean {
  const template = registry.itemById.get(itemId);
  if (
    !template ||
    (template.category !== "weapon" &&
      template.category !== "outfit-overlay" &&
      template.category !== "accessory")
  ) {
    return false;
  }

  const threshold = filtersByCategory.get(template.category);
  return threshold != null && getItemRankIndex(template.rank) < getItemRankIndex(threshold);
}

function isJunkMonsterPart(
  itemId: string,
  registry: TemplateRegistry,
  protectedMonsterPartIds: ReadonlySet<string>,
): boolean {
  const template = registry.itemById.get(itemId);
  return (
    template?.category === "loot" &&
    template.tags.includes(MONSTER_PART_TAG) &&
    template.tags.includes(AUTO_SELL_JUNK_TAG) &&
    !protectedMonsterPartIds.has(itemId)
  );
}

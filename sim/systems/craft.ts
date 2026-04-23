import type { CraftRecipeTemplate, TemplateRegistry } from "content/templates";

interface InventoryStackLike {
  itemId: string;
  quantity: number;
}

export interface CraftRecipeInputAvailability {
  itemId: string;
  quantityRequired: number;
  quantityOwned: number;
  isSatisfied: boolean;
}

export interface CraftRecipeAvailability {
  recipeId: string;
  family: string;
  name: string;
  description: string;
  outputItemId: string;
  outputQuantity: number;
  cashCost: number;
  cashOnHand: number;
  isRoomOperational: boolean;
  isBuildingTierMet: boolean;
  isDistrictMet: boolean;
  isFactionMet: boolean;
  isCashMet: boolean;
  canProduce: boolean;
  inputs: readonly CraftRecipeInputAvailability[];
  /** Faction standing shortfalls — empty when all met. */
  factionBlockers: readonly { factionId: string; required: number; current: number }[];
  /** District tags required but not matched. */
  missingDistrictTags: readonly string[];
}

interface FactionStandingLike {
  standing: number;
}

/**
 * Build availability for all craft recipes that target the given room.
 *
 * District and faction checks use the currently unlocked city-pressure state
 * to decide whether the player has access to district-linked requirements.
 */
export function buildCraftRecipeAvailability(
  roomTemplateId: string,
  isOperational: boolean,
  buildingTier: number,
  cashOnHand: number,
  inventory: readonly InventoryStackLike[],
  /** Accessible district tags unlocked through city pressure. */
  accessibleDistrictTags: readonly string[],
  /** Faction standings keyed by faction id. */
  factionStandings: Readonly<Record<string, FactionStandingLike>>,
  registry: TemplateRegistry,
): CraftRecipeAvailability[] {
  const inventoryByItem = new Map(inventory.map((s) => [s.itemId, s.quantity]));

  return registry.craftRecipes
    .filter((recipe) => recipe.requiredRoomId === roomTemplateId)
    .map((recipe) =>
      buildSingleRecipeAvailability(
        recipe,
        isOperational,
        buildingTier,
        cashOnHand,
        inventoryByItem,
        accessibleDistrictTags,
        factionStandings,
      ),
    );
}

function buildSingleRecipeAvailability(
  recipe: CraftRecipeTemplate,
  isRoomOperational: boolean,
  buildingTier: number,
  cashOnHand: number,
  inventoryByItem: ReadonlyMap<string, number>,
  accessibleDistrictTags: readonly string[],
  factionStandings: Readonly<Record<string, FactionStandingLike>>,
): CraftRecipeAvailability {
  const inputs: CraftRecipeInputAvailability[] = recipe.inputItems.map((input) => {
    const quantityOwned = inventoryByItem.get(input.itemId) ?? 0;
    return {
      itemId: input.itemId,
      quantityRequired: input.quantity,
      quantityOwned,
      isSatisfied: quantityOwned >= input.quantity,
    };
  });

  const isBuildingTierMet = buildingTier >= recipe.minimumBuildingTier;
  const isCashMet = cashOnHand >= recipe.cashCost;

  // District check: all requiredDistrictTags must be present in the unlocked district set.
  const missingDistrictTags = recipe.requiredDistrictTags.filter(
    (tag) => !accessibleDistrictTags.includes(tag),
  );
  const isDistrictMet = missingDistrictTags.length === 0;

  // Faction check: every faction standing must meet or exceed the recipe threshold.
  const factionBlockers: { factionId: string; required: number; current: number }[] = [];
  for (const [factionId, required] of Object.entries(recipe.requiredFactionStanding)) {
    const current = factionStandings[factionId]?.standing ?? 0;
    if (current < required) {
      factionBlockers.push({ factionId, required, current });
    }
  }
  const isFactionMet = factionBlockers.length === 0;

  const allInputsSatisfied = inputs.every((i) => i.isSatisfied);
  const canProduce =
    isRoomOperational &&
    isBuildingTierMet &&
    isDistrictMet &&
    isFactionMet &&
    isCashMet &&
    allInputsSatisfied;

  return {
    recipeId: recipe.id,
    family: recipe.family,
    name: recipe.name,
    description: recipe.description,
    outputItemId: recipe.outputItemId,
    outputQuantity: recipe.outputQuantity,
    cashCost: recipe.cashCost,
    cashOnHand,
    isRoomOperational,
    isBuildingTierMet,
    isDistrictMet,
    isFactionMet,
    isCashMet,
    canProduce,
    inputs,
    factionBlockers,
    missingDistrictTags,
  };
}

import type { TemplateRegistry } from "content/templates";

interface InventoryStackLike {
  itemId: string;
  quantity: number;
}

export interface PrepRecipeInputAvailability {
  itemId: string;
  quantityRequired: number;
  quantityOwned: number;
  isSatisfied: boolean;
}

export interface PrepRecipeAvailability {
  recipeId: string;
  outputItemId: string;
  outputQuantity: number;
  isRoomOperational: boolean;
  canProduce: boolean;
  inputs: readonly PrepRecipeInputAvailability[];
}

function buildInventoryQuantityByItem(
  inventory: readonly InventoryStackLike[],
): ReadonlyMap<string, number> {
  return new Map(inventory.map((stack) => [stack.itemId, stack.quantity]));
}

export function hasConsumableInventory(
  inventory: readonly InventoryStackLike[],
  registry: TemplateRegistry,
): boolean {
  return inventory.some(
    (stack) => stack.quantity > 0 && registry.itemById.get(stack.itemId)?.category === "consumable",
  );
}

export function buildPrepRecipeAvailabilityForRoom(
  roomTags: readonly string[],
  isOperational: boolean,
  inventory: readonly InventoryStackLike[],
  registry: TemplateRegistry,
): PrepRecipeAvailability[] {
  const inventoryByItem = buildInventoryQuantityByItem(inventory);

  return registry.prepRecipes
    .filter((recipe) => roomTags.includes(recipe.requiredRoomTag))
    .map((recipe) => {
      const inputs = recipe.inputs.map((input) => {
        const quantityOwned = inventoryByItem.get(input.itemId) ?? 0;
        return {
          itemId: input.itemId,
          quantityRequired: input.quantity,
          quantityOwned,
          isSatisfied: quantityOwned >= input.quantity,
        };
      });

      return {
        recipeId: recipe.id,
        outputItemId: recipe.outputItemId,
        outputQuantity: recipe.outputQuantity,
        isRoomOperational: isOperational,
        canProduce: isOperational && inputs.every((input) => input.isSatisfied),
        inputs,
      };
    });
}

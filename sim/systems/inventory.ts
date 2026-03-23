import { addComponent, addEntity, removeEntity } from "bitecs";

import {
  EquipmentAssignment,
  InjuryState,
  InventoryStack,
  NeedState,
  OperatorIdentity,
  PreferenceState,
} from "../components";
import type { SimSystemContext } from "./types";

function findStackEntity(context: SimSystemContext, itemId: string): number | undefined {
  return context.runtimeState.inventoryEntities.find(
    (entity) => InventoryStack.itemId[entity] === itemId,
  );
}

function findEquipmentEntity(context: SimSystemContext, operatorId: string): number | undefined {
  return context.runtimeState.equipmentEntities.find(
    (entity) => EquipmentAssignment.operatorId[entity] === operatorId,
  );
}

export function addToInventory(context: SimSystemContext, itemId: string, quantity: number): void {
  if (quantity <= 0) return;

  const existing = findStackEntity(context, itemId);
  if (existing !== undefined) {
    InventoryStack.quantity[existing] += quantity;
    return;
  }

  const entity = addEntity(context.world);
  addComponent(context.world, entity, InventoryStack);
  InventoryStack.itemId[entity] = itemId;
  InventoryStack.quantity[entity] = quantity;
  context.runtimeState.inventoryEntities.push(entity);
}

export function removeFromInventory(
  context: SimSystemContext,
  itemId: string,
  quantity: number,
): boolean {
  if (quantity <= 0) return false;

  const existing = findStackEntity(context, itemId);
  if (existing === undefined) return false;

  const currentQty = InventoryStack.quantity[existing];
  if (currentQty < quantity) return false;

  const remaining = currentQty - quantity;
  if (remaining === 0) {
    removeEntity(context.world, existing);
    const idx = context.runtimeState.inventoryEntities.indexOf(existing);
    if (idx >= 0) context.runtimeState.inventoryEntities.splice(idx, 1);
  } else {
    InventoryStack.quantity[existing] = remaining;
  }

  return true;
}

export function getInventoryCount(context: SimSystemContext, itemId: string): number {
  const existing = findStackEntity(context, itemId);
  if (existing === undefined) return 0;
  return InventoryStack.quantity[existing];
}

export function equipItem(
  context: SimSystemContext,
  operatorId: string,
  slot: "weapon" | "outfitOverlay" | "accessory",
  itemId: string,
): boolean {
  const operatorEntity = findOperatorEntity(context, operatorId);
  if (!removeFromInventory(context, itemId, 1)) return false;

  let equipEntity = findEquipmentEntity(context, operatorId);
  if (equipEntity === undefined) {
    equipEntity = addEntity(context.world);
    addComponent(context.world, equipEntity, EquipmentAssignment);
    EquipmentAssignment.operatorId[equipEntity] = operatorId;
    EquipmentAssignment.weaponId[equipEntity] = "";
    EquipmentAssignment.outfitOverlayId[equipEntity] = "";
    EquipmentAssignment.accessoryId[equipEntity] = "";
    context.runtimeState.equipmentEntities.push(equipEntity);
  }

  // Unequip existing item in slot first
  const previousItemId = getEquippedItemInSlot(context, operatorId, slot);
  if (previousItemId.length > 0) {
    addToInventory(context, previousItemId, 1);
  }

  switch (slot) {
    case "weapon":
      EquipmentAssignment.weaponId[equipEntity] = itemId;
      if (operatorEntity !== undefined) {
        OperatorIdentity.appearanceWeaponPartId[operatorEntity] = itemId;
      }
      break;
    case "outfitOverlay":
      EquipmentAssignment.outfitOverlayId[equipEntity] = itemId;
      if (operatorEntity !== undefined) {
        OperatorIdentity.appearanceOutfitOverlayPartId[operatorEntity] = itemId;
      }
      break;
    case "accessory":
      EquipmentAssignment.accessoryId[equipEntity] = itemId;
      if (operatorEntity !== undefined) {
        OperatorIdentity.appearanceAccessoryPartId[operatorEntity] = itemId;
      }
      break;
  }

  return true;
}

export function unequipItem(
  context: SimSystemContext,
  operatorId: string,
  slot: "weapon" | "outfitOverlay" | "accessory",
): boolean {
  const operatorEntity = findOperatorEntity(context, operatorId);
  const equipEntity = findEquipmentEntity(context, operatorId);
  if (equipEntity === undefined) return false;

  const itemId = getEquippedItemInSlot(context, operatorId, slot);
  if (itemId.length === 0) return false;

  switch (slot) {
    case "weapon":
      EquipmentAssignment.weaponId[equipEntity] = "";
      if (operatorEntity !== undefined) {
        OperatorIdentity.appearanceWeaponPartId[operatorEntity] = "";
      }
      break;
    case "outfitOverlay":
      EquipmentAssignment.outfitOverlayId[equipEntity] = "";
      if (operatorEntity !== undefined) {
        OperatorIdentity.appearanceOutfitOverlayPartId[operatorEntity] = "";
      }
      break;
    case "accessory":
      EquipmentAssignment.accessoryId[equipEntity] = "";
      if (operatorEntity !== undefined) {
        OperatorIdentity.appearanceAccessoryPartId[operatorEntity] = "";
      }
      break;
  }

  addToInventory(context, itemId, 1);
  return true;
}

function getEquippedItemInSlot(
  context: SimSystemContext,
  operatorId: string,
  slot: "weapon" | "outfitOverlay" | "accessory",
): string {
  const equipEntity = findEquipmentEntity(context, operatorId);
  if (equipEntity === undefined) return "";

  switch (slot) {
    case "weapon":
      return EquipmentAssignment.weaponId[equipEntity];
    case "outfitOverlay":
      return EquipmentAssignment.outfitOverlayId[equipEntity];
    case "accessory":
      return EquipmentAssignment.accessoryId[equipEntity];
  }
}

export type EquipmentSlot = "weapon" | "outfitOverlay" | "accessory";

export interface AccessorySelectionResult {
  itemId: string;
  reason: string;
}

function findOperatorEntity(context: SimSystemContext, operatorId: string): number | undefined {
  return context.runtimeState.operatorEntities.find(
    (entity) => OperatorIdentity.id[entity] === operatorId,
  );
}

function getRankScore(rank: string): number {
  switch (rank) {
    case "d":
      return 12;
    case "e":
      return 8;
    case "f":
      return 4;
    default:
      return 0;
  }
}

function resolveAccessoryRoleAffinity(itemId: string, roleTag: string): number {
  switch (roleTag) {
    case "role:field_lead":
      return itemId.includes("field-lead") ? 24 : itemId.includes("reinforced") ? 8 : 0;
    case "role:scout":
      return itemId.includes("scout") || itemId.includes("visor")
        ? 24
        : itemId.includes("comm")
          ? 10
          : 0;
    case "role:medic":
      return itemId.includes("medkit") ? 24 : itemId.includes("comm") ? 6 : 0;
    default:
      return 0;
  }
}

function resolveAccessoryNeedScore(
  context: SimSystemContext,
  operatorId: string,
  itemId: string,
): number {
  const operatorEntity = findOperatorEntity(context, operatorId);
  if (operatorEntity === undefined) {
    return 0;
  }

  const fatigue = NeedState.fatigue[operatorEntity];
  const stress = NeedState.stress[operatorEntity];
  const injury = InjuryState.severity[operatorEntity];

  if (itemId.includes("reinforced") && (injury >= 20 || fatigue >= 50)) {
    return 10;
  }
  if (itemId.includes("comm") && stress >= 45) {
    return 6;
  }
  if (itemId.includes("visor") && fatigue < 60 && injury < 30) {
    return 6;
  }

  return 0;
}

function resolveAccessoryPreferenceScore(
  context: SimSystemContext,
  operatorId: string,
  itemId: string,
): number {
  const operatorEntity = findOperatorEntity(context, operatorId);
  if (operatorEntity === undefined) {
    return 0;
  }

  let score = 0;

  if (
    PreferenceState.recoveryBias[operatorEntity] >= 60 &&
    (itemId.includes("medkit") || itemId.includes("reinforced"))
  ) {
    score += 8;
  }

  if (
    PreferenceState.socialBias[operatorEntity] >= 60 &&
    (itemId.includes("comm") || itemId.includes("badge"))
  ) {
    score += 6;
  }

  if (
    PreferenceState.riskTolerance[operatorEntity] >= 60 &&
    (itemId.includes("visor") || itemId.includes("binocs") || itemId.includes("scout"))
  ) {
    score += 6;
  }

  if (PreferenceState.comfortBias[operatorEntity] >= 60 && itemId.includes("scarf")) {
    score += 4;
  }

  return score;
}

function describeReason(reason: string): string {
  switch (reason) {
    case "already_equipped":
      return "Kept current accessory";
    case "role_match":
      return "Selected for role fit";
    case "needs_support":
      return "Selected for current readiness needs";
    case "preference_fit":
      return "Selected for operator preference fit";
    case "best_available":
      return "Selected as the best available shared accessory";
    case "no_eligible_accessory":
      return "No eligible accessory was available";
    default:
      return "Accessory assignment unavailable";
  }
}

export function describeAccessoryAssignment(
  context: SimSystemContext,
  operatorId: string,
  accessoryId: string,
): AccessorySelectionResult {
  if (!accessoryId) {
    return { itemId: "", reason: "no_eligible_accessory" };
  }

  const operatorEntity = findOperatorEntity(context, operatorId);
  const roleTag = operatorEntity ? OperatorIdentity.roleTag[operatorEntity] : "";
  const roleAffinity = resolveAccessoryRoleAffinity(accessoryId, roleTag);
  const needScore = resolveAccessoryNeedScore(context, operatorId, accessoryId);
  const preferenceScore = resolveAccessoryPreferenceScore(context, operatorId, accessoryId);

  if (roleAffinity >= 20) {
    return { itemId: accessoryId, reason: "role_match" };
  }
  if (needScore > 0) {
    return { itemId: accessoryId, reason: "needs_support" };
  }
  if (preferenceScore > 0) {
    return { itemId: accessoryId, reason: "preference_fit" };
  }

  return { itemId: accessoryId, reason: "best_available" };
}

export function describeAccessorySelectionReason(reason: string): string {
  return describeReason(reason);
}

/**
 * Auto-select the best available accessory for an operator being assigned to a raid.
 * Selection criteria: role tag match > rank compatibility > first available
 */
export function autoSelectAccessory(
  context: SimSystemContext,
  operatorId: string,
  roleTag: string,
): AccessorySelectionResult | null {
  const equipEntity = findEquipmentEntity(context, operatorId);
  const currentAccessory = equipEntity ? EquipmentAssignment.accessoryId[equipEntity] : "";

  // If already equipped, keep it
  if (currentAccessory.length > 0) {
    return { itemId: currentAccessory, reason: "already_equipped" };
  }

  const accessoryItems = context.runtimeState.inventoryEntities
    .filter((entity) => InventoryStack.itemId[entity].startsWith("accessory/"))
    .map((entity) => ({
      itemId: InventoryStack.itemId[entity],
      quantity: InventoryStack.quantity[entity],
    }))
    .filter((stack) => stack.quantity > 0);

  if (accessoryItems.length === 0) return null;

  const rankedAccessories = accessoryItems
    .map((item) => {
      const template = context.registry.itemById.get(item.itemId);
      const roleAffinity = resolveAccessoryRoleAffinity(item.itemId, roleTag);
      const needScore = resolveAccessoryNeedScore(context, operatorId, item.itemId);
      const preferenceScore = resolveAccessoryPreferenceScore(context, operatorId, item.itemId);
      const rankScore = getRankScore(template?.rank ?? "");
      const score = roleAffinity + needScore + preferenceScore + rankScore;

      let reason = "best_available";
      if (roleAffinity >= 20) {
        reason = "role_match";
      } else if (needScore > 0) {
        reason = "needs_support";
      } else if (preferenceScore > 0) {
        reason = "preference_fit";
      }

      return {
        ...item,
        score,
        reason,
      };
    })
    .sort((left, right) => right.score - left.score || left.itemId.localeCompare(right.itemId));

  const selected = rankedAccessories[0];
  equipItem(context, operatorId, "accessory", selected.itemId);
  return { itemId: selected.itemId, reason: selected.reason };
}

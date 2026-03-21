const EFFECT_TYPES = [
  "add_room_slot",
  "unlock_room_template",
  "unlock_room_tier",
  "modify_room_capacity",
  "modify_need_rate",
  "modify_attraction_weight",
  "modify_recovery_rate",
  "modify_training_rate",
  "modify_morale",
  "modify_resource_income",
  "modify_resource_cost",
  "grant_operator_slot",
  "modify_loyalty",
  "modify_scalar",
] as const;

export type EffectType = (typeof EFFECT_TYPES)[number];

export type EffectDefinition =
  | {
      type: "add_room_slot";
      amount: number;
    }
  | {
      type: "unlock_room_template";
      roomId: string;
    }
  | {
      type: "unlock_room_tier";
      roomId: string;
      tier: number;
    }
  | {
      type: "modify_room_capacity";
      roomId: string;
      amount: number;
    }
  | {
      type: "modify_need_rate";
      needId: string;
      multiplier: number;
    }
  | {
      type: "modify_attraction_weight";
      tag: string;
      amount: number;
    }
  | {
      type: "modify_recovery_rate";
      amount: number;
    }
  | {
      type: "modify_training_rate";
      amount: number;
    }
  | {
      type: "modify_morale";
      amount: number;
    }
  | {
      type: "modify_resource_income";
      resourceId: string;
      amount: number;
    }
  | {
      type: "modify_resource_cost";
      resourceId: string;
      multiplier: number;
    }
  | {
      type: "grant_operator_slot";
      amount: number;
    }
  | {
      type: "modify_loyalty";
      amount: number;
    }
  | {
      type: "modify_scalar";
      path: string;
      mode: "add" | "multiply";
      value: number;
    };

export interface EffectApplicationContext {
  addRoomSlot?(amount: number): void;
  unlockRoomTemplate?(roomId: string): void;
  unlockRoomTier?(roomId: string, tier: number): void;
  modifyRoomCapacity?(roomId: string, amount: number): void;
  modifyNeedRate?(needId: string, multiplier: number): void;
  modifyAttractionWeight?(tag: string, amount: number): void;
  modifyRecoveryRate?(amount: number): void;
  modifyTrainingRate?(amount: number): void;
  modifyMorale?(amount: number): void;
  modifyResourceIncome?(resourceId: string, amount: number): void;
  modifyResourceCost?(resourceId: string, multiplier: number): void;
  grantOperatorSlot?(amount: number): void;
  modifyLoyalty?(amount: number): void;
  modifyScalar?(path: string, mode: "add" | "multiply", value: number): void;
}

function validateFiniteNumber(value: number, fieldName: string): string[] {
  return Number.isFinite(value) ? [] : [`${fieldName} must be a finite number.`];
}

function validateString(value: string, fieldName: string): string[] {
  return value.trim().length > 0 ? [] : [`${fieldName} must be a non-empty string.`];
}

export function validateEffect(effect: EffectDefinition): string[] {
  switch (effect.type) {
    case "add_room_slot":
    case "grant_operator_slot":
    case "modify_recovery_rate":
    case "modify_training_rate":
    case "modify_morale":
    case "modify_loyalty":
      return validateFiniteNumber(effect.amount, "amount");
    case "unlock_room_template":
      return validateString(effect.roomId, "roomId");
    case "unlock_room_tier":
      return [
        ...validateString(effect.roomId, "roomId"),
        ...validateFiniteNumber(effect.tier, "tier"),
      ];
    case "modify_room_capacity":
      return [
        ...validateString(effect.roomId, "roomId"),
        ...validateFiniteNumber(effect.amount, "amount"),
      ];
    case "modify_need_rate":
      return [
        ...validateString(effect.needId, "needId"),
        ...validateFiniteNumber(effect.multiplier, "multiplier"),
      ];
    case "modify_attraction_weight":
      return [
        ...validateString(effect.tag, "tag"),
        ...validateFiniteNumber(effect.amount, "amount"),
      ];
    case "modify_resource_income":
      return [
        ...validateString(effect.resourceId, "resourceId"),
        ...validateFiniteNumber(effect.amount, "amount"),
      ];
    case "modify_resource_cost":
      return [
        ...validateString(effect.resourceId, "resourceId"),
        ...validateFiniteNumber(effect.multiplier, "multiplier"),
      ];
    case "modify_scalar":
      return [
        ...validateString(effect.path, "path"),
        ...validateFiniteNumber(effect.value, "value"),
      ];
  }
}

function missingHandler(effectType: EffectType): never {
  throw new Error(`No canonical effect handler was provided for "${effectType}".`);
}

export function applyEffect(effect: EffectDefinition, context: EffectApplicationContext): void {
  switch (effect.type) {
    case "add_room_slot":
      return (context.addRoomSlot ?? missingHandler)(effect.amount);
    case "unlock_room_template":
      return (context.unlockRoomTemplate ?? missingHandler)(effect.roomId);
    case "unlock_room_tier":
      return (context.unlockRoomTier ?? missingHandler)(effect.roomId, effect.tier);
    case "modify_room_capacity":
      return (context.modifyRoomCapacity ?? missingHandler)(effect.roomId, effect.amount);
    case "modify_need_rate":
      return (context.modifyNeedRate ?? missingHandler)(effect.needId, effect.multiplier);
    case "modify_attraction_weight":
      return (context.modifyAttractionWeight ?? missingHandler)(effect.tag, effect.amount);
    case "modify_recovery_rate":
      return (context.modifyRecoveryRate ?? missingHandler)(effect.amount);
    case "modify_training_rate":
      return (context.modifyTrainingRate ?? missingHandler)(effect.amount);
    case "modify_morale":
      return (context.modifyMorale ?? missingHandler)(effect.amount);
    case "modify_resource_income":
      return (context.modifyResourceIncome ?? missingHandler)(effect.resourceId, effect.amount);
    case "modify_resource_cost":
      return (context.modifyResourceCost ?? missingHandler)(effect.resourceId, effect.multiplier);
    case "grant_operator_slot":
      return (context.grantOperatorSlot ?? missingHandler)(effect.amount);
    case "modify_loyalty":
      return (context.modifyLoyalty ?? missingHandler)(effect.amount);
    case "modify_scalar":
      return (context.modifyScalar ?? missingHandler)(effect.path, effect.mode, effect.value);
  }
}

export { EFFECT_TYPES };

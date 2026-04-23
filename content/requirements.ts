const REQUIREMENT_TYPES = [
  "resource_min",
  "building_tier_min",
  "room_count_min",
  "room_tier_min",
  "operator_count_min",
  "template_tag_required",
] as const;

export type RequirementType = (typeof REQUIREMENT_TYPES)[number];

export type RequirementDefinition =
  | {
      type: "resource_min";
      resourceId: string;
      minimum: number;
    }
  | {
      type: "building_tier_min";
      buildingId: string;
      minimum: number;
    }
  | {
      type: "room_count_min";
      roomId: string;
      minimum: number;
    }
  | {
      type: "room_tier_min";
      roomId: string;
      minimum: number;
    }
  | {
      type: "operator_count_min";
      minimum: number;
    }
  | {
      type: "template_tag_required";
      tag: string;
    };

type ValueLookup = ReadonlyMap<string, number> | Record<string, number> | undefined;

export interface RequirementEvaluationContext {
  resourceBalances?: ValueLookup;
  buildingTiers?: ValueLookup;
  roomCounts?: ValueLookup;
  roomTiers?: ValueLookup;
  operatorCount?: number;
  unlockedTemplateTags?: Iterable<string>;
}

function readLookupValue(source: ValueLookup, key: string): number {
  if (!source) {
    return 0;
  }

  if (source instanceof Map) {
    return source.get(key) ?? 0;
  }

  return source[key] ?? 0;
}

function validatePositiveNumber(value: number, fieldName: string): string[] {
  return Number.isFinite(value) && value >= 0
    ? []
    : [`${fieldName} must be a finite non-negative number.`];
}

function validateString(value: string, fieldName: string): string[] {
  return value.trim().length > 0 ? [] : [`${fieldName} must be a non-empty string.`];
}

export function validateRequirement(requirement: RequirementDefinition): string[] {
  switch (requirement.type) {
    case "resource_min":
      return [
        ...validateString(requirement.resourceId, "resourceId"),
        ...validatePositiveNumber(requirement.minimum, "minimum"),
      ];
    case "building_tier_min":
      return [
        ...validateString(requirement.buildingId, "buildingId"),
        ...validatePositiveNumber(requirement.minimum, "minimum"),
      ];
    case "room_count_min":
    case "room_tier_min":
      return [
        ...validateString(requirement.roomId, "roomId"),
        ...validatePositiveNumber(requirement.minimum, "minimum"),
      ];
    case "operator_count_min":
      return validatePositiveNumber(requirement.minimum, "minimum");
    case "template_tag_required":
      return validateString(requirement.tag, "tag");
  }
}

export function evaluateRequirement(
  requirement: RequirementDefinition,
  context: RequirementEvaluationContext,
): boolean {
  switch (requirement.type) {
    case "resource_min":
      return (
        readLookupValue(context.resourceBalances, requirement.resourceId) >= requirement.minimum
      );
    case "building_tier_min":
      return readLookupValue(context.buildingTiers, requirement.buildingId) >= requirement.minimum;
    case "room_count_min":
      return readLookupValue(context.roomCounts, requirement.roomId) >= requirement.minimum;
    case "room_tier_min":
      return readLookupValue(context.roomTiers, requirement.roomId) >= requirement.minimum;
    case "operator_count_min":
      return (context.operatorCount ?? 0) >= requirement.minimum;
    case "template_tag_required":
      return new Set(context.unlockedTemplateTags ?? []).has(requirement.tag);
  }
}

export { REQUIREMENT_TYPES };

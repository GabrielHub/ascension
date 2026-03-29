import { validateEffect } from "../effects";
import { validateRequirement } from "../requirements";
import { bossById } from "./bosses";
import { buildingTemplates } from "./buildings";
import { enemyFamilyTemplates } from "./enemies";
import { eventTemplates } from "./events";
import { dropTables as dropTableData, itemTemplates } from "./items";
import { missionTemplates } from "./missions";
import { resourceTemplates } from "./resources";
import { roomTemplates } from "./rooms";
import {
  type BuildingTemplate,
  type DropTable,
  type EnemyFamilyTemplate,
  type EventTemplate,
  type ItemTemplate,
  type MissionTemplate,
  type OrdinaryEnemyTemplate,
  type ResourceTemplate,
  type RoomTemplate,
  type TemplateBase,
  type TemplateRegistry,
  type TemplateRegistryValidationIssue,
  type UpgradeTemplate,
} from "./shared";
import { upgradeTemplates } from "./upgrades";

type TemplateCategory = TemplateRegistryValidationIssue["category"];

const TEMPLATE_CATEGORY_ORDER: readonly TemplateCategory[] = [
  "resources",
  "buildings",
  "rooms",
  "upgrades",
  "missions",
  "events",
  "items",
  "dropTables",
  "enemyFamilies",
] as const;

function makeLookup<T extends TemplateBase>(
  category: TemplateCategory,
  templates: readonly T[],
  issues: TemplateRegistryValidationIssue[],
): {
  byId: ReadonlyMap<string, T>;
  indexById: ReadonlyMap<string, number>;
} {
  const byId = new Map<string, T>();
  const indexById = new Map<string, number>();

  templates.forEach((template, index) => {
    if (byId.has(template.id)) {
      issues.push({
        category,
        templateId: template.id,
        message: "Duplicate template id.",
      });
      return;
    }

    byId.set(template.id, template);
    indexById.set(template.id, index);
  });

  return { byId, indexById };
}

function validateBaseTemplate(
  category: TemplateCategory,
  template: TemplateBase,
  issues: TemplateRegistryValidationIssue[],
): void {
  if (template.id.trim().length === 0) {
    issues.push({
      category,
      templateId: template.id,
      message: "Template id must be a non-empty string.",
    });
  }

  if (template.name.trim().length === 0) {
    issues.push({
      category,
      templateId: template.id,
      message: "Template name must be a non-empty string.",
    });
  }

  const duplicateTags = template.tags.filter((tag, index) => template.tags.indexOf(tag) !== index);
  if (duplicateTags.length > 0) {
    issues.push({
      category,
      templateId: template.id,
      message: `Duplicate tags found: ${duplicateTags.join(", ")}.`,
    });
  }
}

function validateResourceTemplates(
  templates: readonly ResourceTemplate[],
  issues: TemplateRegistryValidationIssue[],
): void {
  templates.forEach((template) => {
    validateBaseTemplate("resources", template, issues);
    if (template.startingAmount < 0) {
      issues.push({
        category: "resources",
        templateId: template.id,
        message: "startingAmount must be non-negative.",
      });
    }
  });
}

function validateBuildingTemplates(
  templates: readonly BuildingTemplate[],
  upgrades: ReadonlyMap<string, UpgradeTemplate>,
  issues: TemplateRegistryValidationIssue[],
): void {
  templates.forEach((template) => {
    validateBaseTemplate("buildings", template, issues);

    template.upgradeIds.forEach((upgradeId) => {
      if (!upgrades.has(upgradeId)) {
        issues.push({
          category: "buildings",
          templateId: template.id,
          message: `Unknown upgrade reference "${upgradeId}".`,
        });
      }
    });
  });
}

function validateRoomTemplates(
  templates: readonly RoomTemplate[],
  buildings: ReadonlyMap<string, BuildingTemplate>,
  issues: TemplateRegistryValidationIssue[],
): void {
  templates.forEach((template) => {
    validateBaseTemplate("rooms", template, issues);

    template.availableInBuildings.forEach((buildingId) => {
      if (!buildings.has(buildingId)) {
        issues.push({
          category: "rooms",
          templateId: template.id,
          message: `Unknown building reference "${buildingId}".`,
        });
      }
    });
  });
}

function validateUpgradeTemplates(
  templates: readonly UpgradeTemplate[],
  buildings: ReadonlyMap<string, BuildingTemplate>,
  rooms: ReadonlyMap<string, RoomTemplate>,
  resources: ReadonlyMap<string, ResourceTemplate>,
  issues: TemplateRegistryValidationIssue[],
): void {
  templates.forEach((template) => {
    validateBaseTemplate("upgrades", template, issues);

    if (template.target === "building" && !buildings.has(template.targetId)) {
      issues.push({
        category: "upgrades",
        templateId: template.id,
        message: `Unknown building target "${template.targetId}".`,
      });
    }

    if (template.target === "room" && !rooms.has(template.targetId)) {
      issues.push({
        category: "upgrades",
        templateId: template.id,
        message: `Unknown room target "${template.targetId}".`,
      });
    }

    template.requirements.forEach((requirement, index) => {
      validateRequirement(requirement).forEach((message) => {
        issues.push({
          category: "upgrades",
          templateId: template.id,
          message: `Requirement ${index + 1}: ${message}`,
        });
      });

      if (requirement.type === "resource_min" && !resources.has(requirement.resourceId)) {
        issues.push({
          category: "upgrades",
          templateId: template.id,
          message: `Requirement ${index + 1}: unknown resource "${requirement.resourceId}".`,
        });
      }

      if (requirement.type === "building_tier_min" && !buildings.has(requirement.buildingId)) {
        issues.push({
          category: "upgrades",
          templateId: template.id,
          message: `Requirement ${index + 1}: unknown building "${requirement.buildingId}".`,
        });
      }

      if (
        (requirement.type === "room_count_min" || requirement.type === "room_tier_min") &&
        !rooms.has(requirement.roomId)
      ) {
        issues.push({
          category: "upgrades",
          templateId: template.id,
          message: `Requirement ${index + 1}: unknown room "${requirement.roomId}".`,
        });
      }
    });

    template.effects.forEach((effect, index) => {
      validateEffect(effect).forEach((message) => {
        issues.push({
          category: "upgrades",
          templateId: template.id,
          message: `Effect ${index + 1}: ${message}`,
        });
      });

      if (
        (effect.type === "unlock_room_template" ||
          effect.type === "unlock_room_tier" ||
          effect.type === "modify_room_capacity") &&
        !rooms.has(effect.roomId)
      ) {
        issues.push({
          category: "upgrades",
          templateId: template.id,
          message: `Effect ${index + 1}: unknown room "${effect.roomId}".`,
        });
      }

      if (
        (effect.type === "modify_resource_income" || effect.type === "modify_resource_cost") &&
        !resources.has(effect.resourceId)
      ) {
        issues.push({
          category: "upgrades",
          templateId: template.id,
          message: `Effect ${index + 1}: unknown resource "${effect.resourceId}".`,
        });
      }
    });
  });
}

function validateMissionTemplates(
  templates: readonly MissionTemplate[],
  issues: TemplateRegistryValidationIssue[],
): void {
  templates.forEach((template) => {
    validateBaseTemplate("missions", template, issues);
    if (template.baseDurationHours <= 0) {
      issues.push({
        category: "missions",
        templateId: template.id,
        message: "baseDurationHours must be greater than zero.",
      });
    }
  });
}

function validateEventTemplates(
  templates: readonly EventTemplate[],
  issues: TemplateRegistryValidationIssue[],
): void {
  templates.forEach((template) => {
    validateBaseTemplate("events", template, issues);
    if (template.weight <= 0) {
      issues.push({
        category: "events",
        templateId: template.id,
        message: "weight must be greater than zero.",
      });
    }
  });
}

function validateItemTemplates(
  templates: readonly ItemTemplate[],
  issues: TemplateRegistryValidationIssue[],
): void {
  templates.forEach((template) => {
    validateBaseTemplate("items", template, issues);

    if (template.buyPrice < 0) {
      issues.push({
        category: "items",
        templateId: template.id,
        message: "buyPrice must be non-negative.",
      });
    }

    if (template.sellPrice < 0) {
      issues.push({
        category: "items",
        templateId: template.id,
        message: "sellPrice must be non-negative.",
      });
    }

    if (template.buyPrice > 0 && template.sellPrice >= template.buyPrice) {
      issues.push({
        category: "items",
        templateId: template.id,
        message: "sellPrice must be less than buyPrice when the item is purchasable.",
      });
    }

    template.statEffects.forEach((effect, index) => {
      if (effect.stat.trim().length === 0) {
        issues.push({
          category: "items",
          templateId: template.id,
          message: `Stat effect ${index + 1}: stat must be a non-empty string.`,
        });
      }

      if (!Number.isFinite(effect.value)) {
        issues.push({
          category: "items",
          templateId: template.id,
          message: `Stat effect ${index + 1}: value must be a finite number.`,
        });
      }
    });
  });
}

function validateDropTables(
  tables: readonly DropTable[],
  items: ReadonlyMap<string, ItemTemplate>,
  issues: TemplateRegistryValidationIssue[],
): void {
  const seenIds = new Set<string>();

  tables.forEach((table) => {
    if (table.id.trim().length === 0) {
      issues.push({
        category: "dropTables",
        templateId: table.id,
        message: "Drop table id must be a non-empty string.",
      });
    }

    if (seenIds.has(table.id)) {
      issues.push({
        category: "dropTables",
        templateId: table.id,
        message: "Duplicate drop table id.",
      });
    }
    seenIds.add(table.id);

    if (table.entries.length === 0) {
      issues.push({
        category: "dropTables",
        templateId: table.id,
        message: "Drop table must have at least one entry.",
      });
    }

    table.entries.forEach((entry, index) => {
      if (!items.has(entry.itemId)) {
        issues.push({
          category: "dropTables",
          templateId: table.id,
          message: `Entry ${index + 1}: unknown item "${entry.itemId}".`,
        });
      }

      if (entry.weight <= 0) {
        issues.push({
          category: "dropTables",
          templateId: table.id,
          message: `Entry ${index + 1}: weight must be greater than zero.`,
        });
      }

      if (entry.minQuantity < 1) {
        issues.push({
          category: "dropTables",
          templateId: table.id,
          message: `Entry ${index + 1}: minQuantity must be at least 1.`,
        });
      }

      if (entry.maxQuantity < entry.minQuantity) {
        issues.push({
          category: "dropTables",
          templateId: table.id,
          message: `Entry ${index + 1}: maxQuantity must be >= minQuantity.`,
        });
      }
    });
  });
}

function validateEnemyFamilies(
  families: readonly EnemyFamilyTemplate[],
  dropTables: ReadonlyMap<string, DropTable>,
  issues: TemplateRegistryValidationIssue[],
): void {
  const seenFamilyIds = new Set<string>();
  const seenEnemyIds = new Set<string>();

  families.forEach((family) => {
    if (family.familyId.trim().length === 0) {
      issues.push({
        category: "enemyFamilies",
        templateId: family.familyId,
        message: "Family id must be a non-empty string.",
      });
    }

    if (seenFamilyIds.has(family.familyId)) {
      issues.push({
        category: "enemyFamilies",
        templateId: family.familyId,
        message: "Duplicate enemy family id.",
      });
    }
    seenFamilyIds.add(family.familyId);

    if (family.name.trim().length === 0) {
      issues.push({
        category: "enemyFamilies",
        templateId: family.familyId,
        message: "Family name must be a non-empty string.",
      });
    }

    if (family.members.length === 0) {
      issues.push({
        category: "enemyFamilies",
        templateId: family.familyId,
        message: "Family must have at least one member.",
      });
    }

    family.members.forEach((member) => {
      if (seenEnemyIds.has(member.enemyTemplateId)) {
        issues.push({
          category: "enemyFamilies",
          templateId: family.familyId,
          message: `Duplicate enemy template id "${member.enemyTemplateId}".`,
        });
      }
      seenEnemyIds.add(member.enemyTemplateId);

      if (member.familyId !== family.familyId) {
        issues.push({
          category: "enemyFamilies",
          templateId: family.familyId,
          message: `Member "${member.enemyTemplateId}" familyId mismatch: expected "${family.familyId}", got "${member.familyId}".`,
        });
      }

      if (member.name.trim().length === 0) {
        issues.push({
          category: "enemyFamilies",
          templateId: family.familyId,
          message: `Member "${member.enemyTemplateId}" name must be a non-empty string.`,
        });
      }

      if (!dropTables.has(member.dropTableId)) {
        issues.push({
          category: "enemyFamilies",
          templateId: family.familyId,
          message: `Member "${member.enemyTemplateId}" references unknown drop table "${member.dropTableId}".`,
        });
      }

      if (member.actions.length === 0) {
        issues.push({
          category: "enemyFamilies",
          templateId: family.familyId,
          message: `Member "${member.enemyTemplateId}" must have at least one action.`,
        });
      }

      const seenActionIds = new Set<string>();
      member.actions.forEach((action) => {
        if (seenActionIds.has(action.id)) {
          issues.push({
            category: "enemyFamilies",
            templateId: family.familyId,
            message: `Member "${member.enemyTemplateId}" has duplicate action id "${action.id}".`,
          });
        }
        seenActionIds.add(action.id);

        if (action.weight <= 0) {
          issues.push({
            category: "enemyFamilies",
            templateId: family.familyId,
            message: `Member "${member.enemyTemplateId}" action "${action.id}" weight must be greater than zero.`,
          });
        }
      });
    });
  });
}

function makeEnemyFamilyLookup(
  families: readonly EnemyFamilyTemplate[],
): ReadonlyMap<string, EnemyFamilyTemplate> {
  return new Map(families.map((f) => [f.familyId, f]));
}

function makeEnemyTemplateLookup(
  families: readonly EnemyFamilyTemplate[],
): ReadonlyMap<string, OrdinaryEnemyTemplate> {
  const byId = new Map<string, OrdinaryEnemyTemplate>();
  families.forEach((family) => {
    family.members.forEach((member) => {
      byId.set(member.enemyTemplateId, member);
    });
  });
  return byId;
}

function makeDropTableLookup(tables: readonly DropTable[]): ReadonlyMap<string, DropTable> {
  const byId = new Map<string, DropTable>();
  tables.forEach((table) => {
    byId.set(table.id, table);
  });
  return byId;
}

function formatIssues(issues: readonly TemplateRegistryValidationIssue[]): string {
  const ordered = [...issues].sort((left, right) => {
    const categoryOrder =
      TEMPLATE_CATEGORY_ORDER.indexOf(left.category) -
      TEMPLATE_CATEGORY_ORDER.indexOf(right.category);

    if (categoryOrder !== 0) {
      return categoryOrder;
    }

    if (left.templateId !== right.templateId) {
      return left.templateId.localeCompare(right.templateId);
    }

    return left.message.localeCompare(right.message);
  });

  return ordered
    .map((issue) => `${issue.category}:${issue.templateId} ${issue.message}`)
    .join("\n");
}

export function createTemplateRegistry(): TemplateRegistry {
  const issues: TemplateRegistryValidationIssue[] = [];

  const resources = [...resourceTemplates];
  const buildings = [...buildingTemplates];
  const rooms = [...roomTemplates];
  const upgrades = [...upgradeTemplates];
  const missions = [...missionTemplates];
  const events = [...eventTemplates];
  const items = [...itemTemplates];
  const dropTables = [...dropTableData];
  const enemyFamilies = [...enemyFamilyTemplates];

  const resourceLookup = makeLookup("resources", resources, issues);
  const buildingLookup = makeLookup("buildings", buildings, issues);
  const roomLookup = makeLookup("rooms", rooms, issues);
  const upgradeLookup = makeLookup("upgrades", upgrades, issues);
  const missionLookup = makeLookup("missions", missions, issues);
  const eventLookup = makeLookup("events", events, issues);
  const itemLookup = makeLookup("items", items, issues);
  const dropTableLookup = makeDropTableLookup(dropTables);
  const enemyFamilyLookup = makeEnemyFamilyLookup(enemyFamilies);
  const enemyTemplateLookup = makeEnemyTemplateLookup(enemyFamilies);

  validateResourceTemplates(resources, issues);
  validateBuildingTemplates(buildings, upgradeLookup.byId, issues);
  validateRoomTemplates(rooms, buildingLookup.byId, issues);
  validateUpgradeTemplates(
    upgrades,
    buildingLookup.byId,
    roomLookup.byId,
    resourceLookup.byId,
    issues,
  );
  validateMissionTemplates(missions, issues);
  validateEventTemplates(events, issues);
  validateItemTemplates(items, issues);
  validateDropTables(dropTables, itemLookup.byId, issues);
  validateEnemyFamilies(enemyFamilies, dropTableLookup, issues);

  if (issues.length > 0) {
    throw new Error(`Template registry validation failed.\n${formatIssues(issues)}`);
  }

  return {
    resources,
    buildings,
    rooms,
    upgrades,
    missions,
    events,
    items,
    dropTables,
    enemyFamilies,
    resourceById: resourceLookup.byId,
    buildingById: buildingLookup.byId,
    roomById: roomLookup.byId,
    upgradeById: upgradeLookup.byId,
    missionById: missionLookup.byId,
    eventById: eventLookup.byId,
    itemById: itemLookup.byId,
    dropTableById: dropTableLookup,
    enemyFamilyById: enemyFamilyLookup,
    enemyTemplateById: enemyTemplateLookup,
    bossById,
    resourceIndexById: resourceLookup.indexById,
    buildingIndexById: buildingLookup.indexById,
    roomIndexById: roomLookup.indexById,
    upgradeIndexById: upgradeLookup.indexById,
  };
}

export const templateRegistry = createTemplateRegistry();

export * from "./shared";

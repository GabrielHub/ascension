import { validateEffect } from "../effects";
import { validateRequirement } from "../requirements";
import { bossById, bossTemplates } from "./bosses";
import { buildingTemplates } from "./buildings";
import { craftRecipeTemplates } from "./crafting";
import { districtTemplates } from "./districts";
import { enemyFamilyTemplates } from "./enemies";
import { eventTemplates } from "./events";
import { factionTemplates } from "./factions";
import { dropTables as dropTableData, itemTemplates, prepRecipeTemplates } from "./items";
import { missionTemplates } from "./missions";
import { presenterTemplates } from "./presenters";
import { resourceTemplates } from "./resources";
import { roomTemplates } from "./rooms";
import { siteConceptById, siteConceptTemplates } from "./site-concepts";
import {
  type BuildingTemplate,
  type CraftRecipeTemplate,
  type DistrictTemplate,
  type DropTable,
  type EnemyFamilyTemplate,
  type EventTemplate,
  type FactionTemplate,
  type ItemTemplate,
  type MissionTemplate,
  type OrdinaryEnemyTemplate,
  type PresenterTemplate,
  type PrepRecipeTemplate,
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
  "presenters",
  "items",
  "prepRecipes",
  "dropTables",
  "enemyFamilies",
  "districts",
  "factions",
  "craftRecipes",
] as const;

function makeLookup<T extends { id: string }>(
  category: TemplateCategory,
  templates: readonly T[],
  issues: TemplateRegistryValidationIssue[],
  duplicateMessage: string = "Duplicate template id.",
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
        message: duplicateMessage,
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

function validatePresenterTemplates(
  templates: readonly PresenterTemplate[],
  roomById: ReadonlyMap<string, RoomTemplate>,
  issues: TemplateRegistryValidationIssue[],
): void {
  templates.forEach((template) => {
    validateBaseTemplate("presenters", template, issues);

    if (template.roleDescription.trim().length === 0) {
      issues.push({
        category: "presenters",
        templateId: template.id,
        message: "roleDescription must be a non-empty string.",
      });
    }

    const expressionEntries = Object.entries(template.portraitByExpression);
    if (expressionEntries.length === 0) {
      issues.push({
        category: "presenters",
        templateId: template.id,
        message: "portraitByExpression must include at least one expression asset.",
      });
    }

    if (!template.portraitByExpression[template.defaultExpression]) {
      issues.push({
        category: "presenters",
        templateId: template.id,
        message: `defaultExpression "${template.defaultExpression}" must resolve to a portrait asset.`,
      });
    }

    expressionEntries.forEach(([expression, path]) => {
      if (expression.trim().length === 0) {
        issues.push({
          category: "presenters",
          templateId: template.id,
          message: "portraitByExpression keys must be non-empty strings.",
        });
      }

      if (path.trim().length === 0) {
        issues.push({
          category: "presenters",
          templateId: template.id,
          message: `portrait asset path for expression "${expression}" must be non-empty.`,
        });
      }
    });

    if (template.generation.canonBrief.trim().length === 0) {
      issues.push({
        category: "presenters",
        templateId: template.id,
        message: "generation.canonBrief must be a non-empty string.",
      });
    }

    if (template.generation.masterPrompt.trim().length === 0) {
      issues.push({
        category: "presenters",
        templateId: template.id,
        message: "generation.masterPrompt must be a non-empty string.",
      });
    }

    if (template.allowedRoomTemplateIds.length === 0) {
      issues.push({
        category: "presenters",
        templateId: template.id,
        message: "allowedRoomTemplateIds must include at least one room template id.",
      });
    }

    const duplicateAllowedRooms = template.allowedRoomTemplateIds.filter(
      (roomId, index) => template.allowedRoomTemplateIds.indexOf(roomId) !== index,
    );
    if (duplicateAllowedRooms.length > 0) {
      issues.push({
        category: "presenters",
        templateId: template.id,
        message: `Duplicate allowedRoomTemplateIds found: ${duplicateAllowedRooms.join(", ")}.`,
      });
    }

    template.allowedRoomTemplateIds.forEach((roomId) => {
      if (!roomById.has(roomId)) {
        issues.push({
          category: "presenters",
          templateId: template.id,
          message: `allowedRoomTemplateIds references unknown room "${roomId}".`,
        });
      }
    });

    if (template.unlockFromRoomTemplateId && !roomById.has(template.unlockFromRoomTemplateId)) {
      issues.push({
        category: "presenters",
        templateId: template.id,
        message: `unlockFromRoomTemplateId references unknown room "${template.unlockFromRoomTemplateId}".`,
      });
    }

    if (
      template.unlockFromRoomTemplateId &&
      !template.allowedRoomTemplateIds.includes(template.unlockFromRoomTemplateId)
    ) {
      issues.push({
        category: "presenters",
        templateId: template.id,
        message: "unlockFromRoomTemplateId must also appear in allowedRoomTemplateIds.",
      });
    }

    if (template.domainSummary.trim().length === 0) {
      issues.push({
        category: "presenters",
        templateId: template.id,
        message: "domainSummary must be a non-empty string.",
      });
    }

    if (template.voiceBrief.trim().length === 0) {
      issues.push({
        category: "presenters",
        templateId: template.id,
        message: "voiceBrief must be a non-empty string.",
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
  tables.forEach((table) => {
    if (table.id.trim().length === 0) {
      issues.push({
        category: "dropTables",
        templateId: table.id,
        message: "Drop table id must be a non-empty string.",
      });
    }

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

function validatePrepRecipes(
  recipes: readonly PrepRecipeTemplate[],
  items: ReadonlyMap<string, ItemTemplate>,
  rooms: ReadonlyMap<string, RoomTemplate>,
  issues: TemplateRegistryValidationIssue[],
): void {
  const seenRecipeIds = new Set<string>();

  recipes.forEach((recipe) => {
    if (recipe.id.trim().length === 0) {
      issues.push({
        category: "prepRecipes",
        templateId: recipe.id,
        message: "Prep recipe id must be a non-empty string.",
      });
    }

    if (seenRecipeIds.has(recipe.id)) {
      issues.push({
        category: "prepRecipes",
        templateId: recipe.id,
        message: "Duplicate prep recipe id.",
      });
    }
    seenRecipeIds.add(recipe.id);

    if (recipe.name.trim().length === 0) {
      issues.push({
        category: "prepRecipes",
        templateId: recipe.id,
        message: "Prep recipe name must be a non-empty string.",
      });
    }

    if (recipe.description.trim().length === 0) {
      issues.push({
        category: "prepRecipes",
        templateId: recipe.id,
        message: "Prep recipe description must be a non-empty string.",
      });
    }

    if (recipe.inputs.length === 0) {
      issues.push({
        category: "prepRecipes",
        templateId: recipe.id,
        message: "Prep recipe must have at least one input.",
      });
    }

    recipe.inputs.forEach((input, index) => {
      if (!items.has(input.itemId)) {
        issues.push({
          category: "prepRecipes",
          templateId: recipe.id,
          message: `Input ${index + 1}: unknown item "${input.itemId}".`,
        });
      }

      if (input.quantity < 1) {
        issues.push({
          category: "prepRecipes",
          templateId: recipe.id,
          message: `Input ${index + 1}: quantity must be at least 1.`,
        });
      }
    });

    const outputItem = items.get(recipe.outputItemId);
    if (!outputItem) {
      issues.push({
        category: "prepRecipes",
        templateId: recipe.id,
        message: `Unknown output item "${recipe.outputItemId}".`,
      });
    } else if (outputItem.category !== "consumable") {
      issues.push({
        category: "prepRecipes",
        templateId: recipe.id,
        message: `Output item "${recipe.outputItemId}" must be a consumable.`,
      });
    }

    if (recipe.outputQuantity < 1) {
      issues.push({
        category: "prepRecipes",
        templateId: recipe.id,
        message: "outputQuantity must be at least 1.",
      });
    }

    if (recipe.requiredRoomTag.trim().length === 0) {
      issues.push({
        category: "prepRecipes",
        templateId: recipe.id,
        message: "requiredRoomTag must be a non-empty string.",
      });
      return;
    }

    const matchingRooms = Array.from(rooms.values()).filter((room) =>
      room.tags.includes(recipe.requiredRoomTag),
    );
    if (matchingRooms.length === 0) {
      issues.push({
        category: "prepRecipes",
        templateId: recipe.id,
        message: `No room template provides required tag "${recipe.requiredRoomTag}".`,
      });
    }
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

function validateDistrictTemplates(
  templates: readonly DistrictTemplate[],
  factions: ReadonlyMap<string, FactionTemplate>,
  issues: TemplateRegistryValidationIssue[],
): void {
  const seenIds = new Set<string>();

  templates.forEach((template) => {
    if (template.id.trim().length === 0) {
      issues.push({
        category: "districts",
        templateId: template.id,
        message: "id must be non-empty.",
      });
    }
    if (seenIds.has(template.id)) {
      issues.push({
        category: "districts",
        templateId: template.id,
        message: "Duplicate district id.",
      });
    }
    seenIds.add(template.id);

    if (template.name.trim().length === 0) {
      issues.push({
        category: "districts",
        templateId: template.id,
        message: "name must be non-empty.",
      });
    }

    if (template.siteConceptIds.length === 0) {
      issues.push({
        category: "districts",
        templateId: template.id,
        message: "siteConceptIds must include at least one authored site concept.",
      });
    }

    template.siteConceptIds.forEach((siteConceptId, index) => {
      const siteConcept = siteConceptById.get(siteConceptId);
      if (!siteConcept) {
        issues.push({
          category: "districts",
          templateId: template.id,
          message: `siteConceptIds[${index}]: unknown site concept "${siteConceptId}".`,
        });
        return;
      }

      if (!siteConcept.districtPool.includes(template.id)) {
        issues.push({
          category: "districts",
          templateId: template.id,
          message: `siteConceptIds[${index}]: "${siteConceptId}" does not include district "${template.id}" in its district pool.`,
        });
      }
    });

    template.primaryFactionIds.forEach((factionId, index) => {
      if (!factions.has(factionId)) {
        issues.push({
          category: "districts",
          templateId: template.id,
          message: `primaryFactionIds[${index}]: unknown faction "${factionId}".`,
        });
      }
    });
  });
}

function validateFactionTemplates(
  templates: readonly FactionTemplate[],
  issues: TemplateRegistryValidationIssue[],
): void {
  const seenIds = new Set<string>();

  templates.forEach((template) => {
    if (template.id.trim().length === 0) {
      issues.push({
        category: "factions",
        templateId: template.id,
        message: "id must be non-empty.",
      });
    }
    if (seenIds.has(template.id)) {
      issues.push({
        category: "factions",
        templateId: template.id,
        message: "Duplicate faction id.",
      });
    }
    seenIds.add(template.id);

    if (template.name.trim().length === 0) {
      issues.push({
        category: "factions",
        templateId: template.id,
        message: "name must be non-empty.",
      });
    }

    if (template.kind !== "institution" && template.kind !== "rival_guild") {
      issues.push({
        category: "factions",
        templateId: template.id,
        message: `kind must be "institution" or "rival_guild", got "${template.kind}".`,
      });
    }
  });
}

function validateCraftRecipeTemplates(
  templates: readonly CraftRecipeTemplate[],
  items: ReadonlyMap<string, ItemTemplate>,
  rooms: ReadonlyMap<string, RoomTemplate>,
  buildings: ReadonlyMap<string, BuildingTemplate>,
  factions: ReadonlyMap<string, FactionTemplate>,
  issues: TemplateRegistryValidationIssue[],
): void {
  const seenIds = new Set<string>();

  templates.forEach((template) => {
    if (template.id.trim().length === 0) {
      issues.push({
        category: "craftRecipes",
        templateId: template.id,
        message: "id must be non-empty.",
      });
    }
    if (seenIds.has(template.id)) {
      issues.push({
        category: "craftRecipes",
        templateId: template.id,
        message: "Duplicate craft recipe id.",
      });
    }
    seenIds.add(template.id);

    if (template.name.trim().length === 0) {
      issues.push({
        category: "craftRecipes",
        templateId: template.id,
        message: "name must be non-empty.",
      });
    }

    if (template.description.trim().length === 0) {
      issues.push({
        category: "craftRecipes",
        templateId: template.id,
        message: "description must be non-empty.",
      });
    }

    if (!rooms.has(template.requiredRoomId)) {
      issues.push({
        category: "craftRecipes",
        templateId: template.id,
        message: `requiredRoomId references unknown room "${template.requiredRoomId}".`,
      });
    }

    if (!buildings.has(template.minimumBuildingId)) {
      issues.push({
        category: "craftRecipes",
        templateId: template.id,
        message: `minimumBuildingId references unknown building "${template.minimumBuildingId}".`,
      });
    }

    if (template.minimumBuildingTier < 1) {
      issues.push({
        category: "craftRecipes",
        templateId: template.id,
        message: "minimumBuildingTier must be at least 1.",
      });
    }

    const outputItem = items.get(template.outputItemId);
    if (!outputItem) {
      issues.push({
        category: "craftRecipes",
        templateId: template.id,
        message: `outputItemId references unknown item "${template.outputItemId}".`,
      });
    } else if (
      outputItem.category !== "weapon" &&
      outputItem.category !== "outfit-overlay" &&
      outputItem.category !== "accessory"
    ) {
      issues.push({
        category: "craftRecipes",
        templateId: template.id,
        message: `outputItemId "${template.outputItemId}" must be durable gear.`,
      });
    }

    if (template.outputQuantity < 1) {
      issues.push({
        category: "craftRecipes",
        templateId: template.id,
        message: "outputQuantity must be at least 1.",
      });
    }

    if (!Number.isFinite(template.cashCost) || template.cashCost < 1) {
      issues.push({
        category: "craftRecipes",
        templateId: template.id,
        message: "cashCost must be a finite amount of at least 1.",
      });
    }

    if (template.inputItems.length === 0) {
      issues.push({
        category: "craftRecipes",
        templateId: template.id,
        message: "inputItems must include at least one item requirement.",
      });
    }

    template.inputItems.forEach((input, index) => {
      const inputItem = items.get(input.itemId);
      if (!inputItem) {
        issues.push({
          category: "craftRecipes",
          templateId: template.id,
          message: `inputItems[${index}]: unknown item "${input.itemId}".`,
        });
      } else if (!inputItem.tags.includes("loot:crafting_input")) {
        issues.push({
          category: "craftRecipes",
          templateId: template.id,
          message: `inputItems[${index}]: "${input.itemId}" must be tagged loot:crafting_input so loot automation does not auto-sell it.`,
        });
      }

      if (input.quantity < 1) {
        issues.push({
          category: "craftRecipes",
          templateId: template.id,
          message: `inputItems[${index}]: quantity must be at least 1.`,
        });
      }
    });

    if (template.requiredDistrictTags.length === 0) {
      issues.push({
        category: "craftRecipes",
        templateId: template.id,
        message: "requiredDistrictTags must include at least one district tag.",
      });
    }

    Object.entries(template.requiredFactionStanding).forEach(([factionId, standing]) => {
      if (!factions.has(factionId)) {
        issues.push({
          category: "craftRecipes",
          templateId: template.id,
          message: `requiredFactionStanding references unknown faction "${factionId}".`,
        });
      }

      if (!Number.isFinite(standing)) {
        issues.push({
          category: "craftRecipes",
          templateId: template.id,
          message: `requiredFactionStanding["${factionId}"] must be a finite number.`,
        });
      }
    });
  });
}

// ── Rank-tone escalation validation ────────────────────────────────────

const VALID_RANK_TONES = new Set(["grounded", "heightened", "surreal", "mythic"]);

const RANK_TO_ALLOWED_TONES: Record<string, readonly string[]> = {
  f: ["grounded"],
  e: ["grounded"],
  d: ["grounded", "heightened"],
  c: ["heightened", "surreal"],
  b: ["surreal"],
  a: ["surreal", "mythic"],
  u: ["mythic"],
};

function validateRankToneConsistency(issues: TemplateRegistryValidationIssue[]): void {
  // Validate boss rank tones match their rank
  for (const boss of bossTemplates) {
    if (!VALID_RANK_TONES.has(boss.rankTone)) {
      issues.push({
        category: "enemyFamilies",
        templateId: boss.bossId,
        message: `Boss "${boss.bossId}" has invalid rankTone "${boss.rankTone}".`,
      });
      continue;
    }
    const allowed = RANK_TO_ALLOWED_TONES[boss.rank];
    if (allowed && !allowed.includes(boss.rankTone)) {
      issues.push({
        category: "enemyFamilies",
        templateId: boss.bossId,
        message: `Boss "${boss.bossId}" rank "${boss.rank}" is incompatible with rankTone "${boss.rankTone}" (allowed: ${allowed.join(", ")}).`,
      });
    }
  }

  // Validate site concept rank tones match their rank pools
  for (const site of siteConceptTemplates) {
    if (!VALID_RANK_TONES.has(site.rankTone)) {
      issues.push({
        category: "missions",
        templateId: site.siteConceptId,
        message: `Site "${site.siteConceptId}" has invalid rankTone "${site.rankTone}".`,
      });
      continue;
    }
    for (const rank of site.rankPool) {
      const allowed = RANK_TO_ALLOWED_TONES[rank];
      if (allowed && !allowed.includes(site.rankTone)) {
        issues.push({
          category: "missions",
          templateId: site.siteConceptId,
          message: `Site "${site.siteConceptId}" rank pool includes "${rank}" but rankTone "${site.rankTone}" is not allowed for that rank (allowed: ${allowed.join(", ")}).`,
        });
      }
    }
  }
}

// ── Asset-parity validation ───────────────────────────────────────────

function validateAssetParity(
  enemyFamilies: readonly EnemyFamilyTemplate[],
  issues: TemplateRegistryValidationIssue[],
): void {
  // Validate every site concept references valid bosses and enemy families
  for (const site of siteConceptTemplates) {
    if (!bossById.has(site.bossId)) {
      issues.push({
        category: "missions",
        templateId: site.siteConceptId,
        message: `Site concept references unknown boss "${site.bossId}".`,
      });
    }
    const familyLookup = new Map(enemyFamilies.map((f) => [f.familyId, f]));
    for (const familyId of site.enemyFamilyIds) {
      if (!familyLookup.has(familyId)) {
        issues.push({
          category: "missions",
          templateId: site.siteConceptId,
          message: `Site concept references unknown enemy family "${familyId}".`,
        });
      }
    }
  }

  // Validate every boss has a drop table reference
  for (const boss of bossTemplates) {
    if (!boss.dropTableId || boss.dropTableId.trim().length === 0) {
      issues.push({
        category: "enemyFamilies",
        templateId: boss.bossId,
        message: `Boss "${boss.bossId}" is missing a drop table reference.`,
      });
    }
  }
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
  const presenters = [...presenterTemplates];
  const items = [...itemTemplates];
  const dropTables = [...dropTableData];
  const enemyFamilies = [...enemyFamilyTemplates];
  const prepRecipes = [...prepRecipeTemplates];
  const districts = [...districtTemplates];
  const factions = [...factionTemplates] as unknown as FactionTemplate[];
  const craftRecipes = [...craftRecipeTemplates] as unknown as CraftRecipeTemplate[];

  const resourceLookup = makeLookup("resources", resources, issues);
  const buildingLookup = makeLookup("buildings", buildings, issues);
  const roomLookup = makeLookup("rooms", rooms, issues);
  const upgradeLookup = makeLookup("upgrades", upgrades, issues);
  const missionLookup = makeLookup("missions", missions, issues);
  const eventLookup = makeLookup("events", events, issues);
  const presenterLookup = makeLookup("presenters", presenters, issues);
  const itemLookup = makeLookup("items", items, issues);
  const dropTableLookup = makeLookup(
    "dropTables",
    dropTables,
    issues,
    "Duplicate drop table id.",
  ).byId;
  const enemyFamilyLookup = makeEnemyFamilyLookup(enemyFamilies);
  const enemyTemplateLookup = makeEnemyTemplateLookup(enemyFamilies);

  const factionLookup = makeLookup("factions", factions, issues);
  const districtLookup = makeLookup("districts", districts, issues);
  const craftRecipeLookup = makeLookup("craftRecipes", craftRecipes, issues);

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
  validatePresenterTemplates(presenters, roomLookup.byId, issues);
  validateItemTemplates(items, issues);
  validatePrepRecipes(prepRecipes, itemLookup.byId, roomLookup.byId, issues);
  validateDropTables(dropTables, itemLookup.byId, issues);
  validateEnemyFamilies(enemyFamilies, dropTableLookup, issues);
  validateDistrictTemplates(districts, factionLookup.byId, issues);
  validateFactionTemplates(factions, issues);
  validateRankToneConsistency(issues);
  validateAssetParity(enemyFamilies, issues);
  validateCraftRecipeTemplates(
    craftRecipes,
    itemLookup.byId,
    roomLookup.byId,
    buildingLookup.byId,
    factionLookup.byId,
    issues,
  );

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
    presenters,
    items,
    dropTables,
    enemyFamilies,
    resourceById: resourceLookup.byId,
    buildingById: buildingLookup.byId,
    roomById: roomLookup.byId,
    upgradeById: upgradeLookup.byId,
    missionById: missionLookup.byId,
    eventById: eventLookup.byId,
    presenterById: presenterLookup.byId,
    itemById: itemLookup.byId,
    dropTableById: dropTableLookup,
    enemyFamilyById: enemyFamilyLookup,
    enemyTemplateById: enemyTemplateLookup,
    bossById,
    prepRecipes,
    prepRecipeById: new Map(prepRecipes.map((r) => [r.id, r])),
    districts,
    districtById: districtLookup.byId,
    factions,
    factionById: factionLookup.byId,
    craftRecipes,
    craftRecipeById: craftRecipeLookup.byId,
    resourceIndexById: resourceLookup.indexById,
    buildingIndexById: buildingLookup.indexById,
    roomIndexById: roomLookup.indexById,
    upgradeIndexById: upgradeLookup.indexById,
  };
}

export const templateRegistry = createTemplateRegistry();

export * from "./shared";

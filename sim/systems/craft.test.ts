import { addComponent, addEntity } from "bitecs";
import { describe, expect, it } from "vitest";

import { templateRegistry } from "content/templates";

import { GuildState, RoomInstance } from "../components";
import { buildCraftRecipeAvailability } from "./craft";
import { addToInventory, getInventoryCount } from "./inventory";
import { runSimCommand } from "./index";
import { createSimTestContext } from "./test-context";
import type { SimSystemContext } from "./types";

const BREACH_HAMMER_RECIPE_ID = "craft-recipe/field-lead-breach/breach-hammer";
const BREACH_HAMMER_OUTPUT_ID = "weapon/breach-hammer";

function addOperationalRoom(context: SimSystemContext, templateId: string, id: string): void {
  const templateIndex = context.registry.roomIndexById.get(templateId);
  if (templateIndex === undefined) {
    throw new Error(`Missing room template ${templateId}`);
  }

  const template = context.registry.rooms[templateIndex];
  const entity = addEntity(context.world);
  addComponent(context.world, entity, RoomInstance);

  RoomInstance.id[entity] = id;
  RoomInstance.templateIndex[entity] = templateIndex;
  RoomInstance.tier[entity] = template.tier;
  RoomInstance.floorIndex[entity] = 0;
  RoomInstance.slotId[entity] = `${id}/slot`;
  RoomInstance.roomStateId[entity] = `${id}/state`;
  RoomInstance.capacity[entity] = template.baseCapacity;
  RoomInstance.occupancy[entity] = 0;
  RoomInstance.isOperational[entity] = 1;
  RoomInstance.appliedUpgradeIds[entity] = [];
  RoomInstance.slotIndex[entity] = 0;

  context.runtimeState.roomEntities.push(entity);
}

function createCraftContext(treasury: number): SimSystemContext {
  const activeBuildingTemplateIndex =
    templateRegistry.buildingIndexById.get("building/porters") ?? 1;
  const context = createSimTestContext({
    guild: { treasury },
    building: {
      activeBuildingTemplateIndex,
      activeBuildingTier: 5,
    },
  });

  addOperationalRoom(context, "room/workshop:tier_1", "room-instance/workshop");
  context.runtimeState.publicPressure!.districts["district/bronx-overpass"].standing = 12;
  context.runtimeState.publicPressure!.factionRelationships[
    "faction/emergency-management"
  ].standing = 5;

  addToInventory(context, "loot/monster-part/fang", 3);
  addToInventory(context, "loot/monster-part/bone-shard", 2);
  addToInventory(context, "loot/monster-part/bollard-core", 1);

  return context;
}

describe("durable crafting", () => {
  it("surfaces a cash blocker in recipe availability", () => {
    const recipe = templateRegistry.craftRecipeById.get(BREACH_HAMMER_RECIPE_ID);
    expect(recipe).toBeTruthy();

    const availability = buildCraftRecipeAvailability(
      "room/workshop:tier_1",
      true,
      5,
      recipe!.cashCost - 1,
      [
        { itemId: "loot/monster-part/fang", quantity: 3 },
        { itemId: "loot/monster-part/bone-shard", quantity: 2 },
        { itemId: "loot/monster-part/bollard-core", quantity: 1 },
      ],
      ["infrastructure:highway"],
      { "faction/emergency-management": { standing: 5 } },
      templateRegistry,
    ).find((entry) => entry.recipeId === BREACH_HAMMER_RECIPE_ID);

    expect(availability).toMatchObject({
      recipeId: BREACH_HAMMER_RECIPE_ID,
      cashCost: recipe!.cashCost,
      cashOnHand: recipe!.cashCost - 1,
      isCashMet: false,
      canProduce: false,
    });
  });

  it("consumes inputs and treasury when a craft succeeds", () => {
    const context = createCraftContext(400);
    const treasuryBefore = GuildState.treasury[context.singletonEntities.guild];
    const recipe = templateRegistry.craftRecipeById.get(BREACH_HAMMER_RECIPE_ID);
    expect(recipe).toBeTruthy();

    runSimCommand(context, {
      type: "sim/craft-durable",
      recipeId: BREACH_HAMMER_RECIPE_ID,
    });

    expect(getInventoryCount(context, BREACH_HAMMER_OUTPUT_ID)).toBe(1);
    expect(getInventoryCount(context, "loot/monster-part/fang")).toBe(0);
    expect(getInventoryCount(context, "loot/monster-part/bone-shard")).toBe(0);
    expect(getInventoryCount(context, "loot/monster-part/bollard-core")).toBe(0);
    expect(GuildState.treasury[context.singletonEntities.guild]).toBe(
      treasuryBefore - recipe!.cashCost,
    );
  });

  it("does not consume inputs when treasury is short", () => {
    const recipe = templateRegistry.craftRecipeById.get(BREACH_HAMMER_RECIPE_ID);
    expect(recipe).toBeTruthy();

    const context = createCraftContext(recipe!.cashCost - 1);
    const treasuryBefore = GuildState.treasury[context.singletonEntities.guild];

    runSimCommand(context, {
      type: "sim/craft-durable",
      recipeId: BREACH_HAMMER_RECIPE_ID,
    });

    expect(getInventoryCount(context, BREACH_HAMMER_OUTPUT_ID)).toBe(0);
    expect(getInventoryCount(context, "loot/monster-part/fang")).toBe(3);
    expect(getInventoryCount(context, "loot/monster-part/bone-shard")).toBe(2);
    expect(getInventoryCount(context, "loot/monster-part/bollard-core")).toBe(1);
    expect(GuildState.treasury[context.singletonEntities.guild]).toBe(treasuryBefore);
  });
});

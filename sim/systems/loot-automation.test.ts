import { describe, expect, it } from "vitest";

import { addToInventory, getInventoryCount } from "./inventory";
import { applyLootAutomationSweep, setLootAutomationEnabled } from "./loot-automation";
import { createSimTestContext, addActiveTestOperators } from "./test-context";
import { GuildState } from "../components";

describe("loot automation", () => {
  it("auto-sells low-rank gear once higher-rank coverage meets roster demand", () => {
    const context = createSimTestContext();
    addActiveTestOperators(context, 2);
    setLootAutomationEnabled(context, true);

    addToInventory(context, "weapon/tactical-rifle", 2);
    addToInventory(context, "weapon/pipe-wrench", 1);

    const result = applyLootAutomationSweep(context, [
      { itemId: "weapon/pipe-wrench", quantity: 1 },
    ]);

    expect(result).toMatchObject({
      totalQuantity: 1,
      totalRevenue: 12,
      entries: [{ itemId: "weapon/pipe-wrench", quantity: 1, revenue: 12 }],
    });
    expect(getInventoryCount(context, "weapon/tactical-rifle")).toBe(2);
    expect(getInventoryCount(context, "weapon/pipe-wrench")).toBe(0);
    expect(GuildState.treasury[context.singletonEntities.guild]).toBe(12);
  });

  it("keeps protected crafting parts and auto-sells junk monster parts", () => {
    const context = createSimTestContext();
    setLootAutomationEnabled(context, true);

    addToInventory(context, "loot/monster-part/fang", 2);
    addToInventory(context, "loot/monster-part/drain-sludge", 2);

    const result = applyLootAutomationSweep(context);

    expect(result).toMatchObject({
      totalQuantity: 2,
      totalRevenue: 14,
      entries: [{ itemId: "loot/monster-part/drain-sludge", quantity: 2, revenue: 14 }],
    });
    expect(getInventoryCount(context, "loot/monster-part/fang")).toBe(2);
    expect(getInventoryCount(context, "loot/monster-part/drain-sludge")).toBe(0);
    expect(GuildState.treasury[context.singletonEntities.guild]).toBe(14);
  });
});

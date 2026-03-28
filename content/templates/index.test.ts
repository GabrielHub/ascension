import { describe, expect, it } from "vitest";

import {
  bootstrapScenario,
  canonicalNewGameScenario,
  previewBootstrapScenario,
} from "../bootstrap";
import { createTemplateRegistry } from "./index";

describe("template registry", () => {
  it("builds the aggregate registry with deterministic category counts", () => {
    const registry = createTemplateRegistry();

    expect(registry.resources).toHaveLength(3);
    expect(registry.buildings).toHaveLength(1);
    expect(registry.rooms).toHaveLength(7);
    expect(registry.upgrades).toHaveLength(8);
    expect(registry.missions).toHaveLength(3);
    expect(registry.events).toHaveLength(13);
    expect(registry.items).toHaveLength(31);
    expect(registry.dropTables).toHaveLength(3);
    expect(registry.missions.map((mission) => mission.id)).toEqual([
      "mission/clearance",
      "mission/containment",
      "mission/extraction",
    ]);
  });

  it("resolves all room templates by id", () => {
    const registry = createTemplateRegistry();

    const expectedRoomIds = [
      "room/register:tier_1",
      "room/counter:tier_1",
      "room/dining_area:tier_1",
      "room/supply_closet:tier_1",
      "room/back_office:tier_1",
      "room/backstock:tier_1",
      "room/alley_staging:tier_1",
    ];

    expectedRoomIds.forEach((id) => {
      expect(registry.roomById.get(id)).toBeTruthy();
    });
  });

  it("resolves all upgrade templates by id", () => {
    const registry = createTemplateRegistry();

    const expectedUpgradeIds = [
      "upgrade/building/bodega:frontage",
      "upgrade/building/bodega:annex",
      "upgrade/building/bodega:extension",
      "upgrade/room/register:records_wall",
      "upgrade/room/counter:hot_coffee",
      "upgrade/room/dining_area:first_aid_station",
      "upgrade/room/dining_area:common_table",
      "upgrade/room/supply_closet:labeled_bins",
    ];

    expectedUpgradeIds.forEach((id) => {
      expect(registry.upgradeById.get(id)).toBeTruthy();
    });
  });

  it("uses only canonical pressure tags in event templates", () => {
    const registry = createTemplateRegistry();
    const canonicalPressureTags = new Set([
      "pressure:reputation",
      "pressure:casualty",
      "pressure:morale",
      "pressure:loyalty",
      "pressure:cash",
      "pressure:time",
    ]);

    registry.events.forEach((event) => {
      event.tags
        .filter((tag) => tag.startsWith("pressure:"))
        .forEach((tag) => {
          expect(canonicalPressureTags.has(tag)).toBe(true);
        });
      event.pressureTags.forEach((tag) => {
        expect(canonicalPressureTags.has(tag)).toBe(true);
      });
    });
  });

  it("validates all event categories are represented", () => {
    const registry = createTemplateRegistry();

    const categories = new Set(registry.events.map((e) => e.category));
    expect(categories).toContain("breach_emergency");
    expect(categories).toContain("personnel_conflict");
    expect(categories).toContain("contract_deadline");
    expect(categories).toContain("economic_pressure");
    expect(categories).toContain("regulatory_scrutiny");
    expect(categories).toContain("team_friction");
    expect(categories).toContain("injury_setback");
    expect(categories).toContain("departure_warning");
    expect(categories).toContain("room_tension");
    expect(categories).toContain("supply_shortage");
    expect(categories).toContain("rival_poaching");
    expect(categories).toContain("morale_surge");
    expect(categories).toContain("contract_opportunity");
  });

  it("resolves all item templates by id", () => {
    const registry = createTemplateRegistry();

    const weaponIds = [
      "weapon/pipe-wrench",
      "weapon/kitchen-knife",
      "weapon/baseball-bat",
      "weapon/tactical-knife",
      "weapon/machete",
      "weapon/compact-crossbow",
      "weapon/reinforced-bat",
      "weapon/katana",
      "weapon/tactical-rifle",
      "weapon/dual-daggers",
    ];

    const outfitIds = [
      "outfit-overlay/padded-jacket",
      "outfit-overlay/leather-vest",
      "outfit-overlay/tactical-vest",
      "outfit-overlay/stealth-cloak",
      "outfit-overlay/heavy-plate",
      "outfit-overlay/field-medic-coat",
    ];

    const accessoryIds = [
      "accessory/comm-earpiece",
      "accessory/tactical-scarf",
      "accessory/eye-visor",
      "accessory/medkit-pouch",
      "accessory/scout-binocs",
      "accessory/field-lead-badge",
      "accessory/reinforced-gloves",
    ];

    const lootIds = [
      "loot/monster-part/fang",
      "loot/monster-part/carapace",
      "loot/monster-part/ichor",
      "loot/monster-part/bone-shard",
      "loot/monster-part/sinew",
      "loot/monster-part/crystal-eye",
      "loot/monster-part/void-residue",
      "loot/monster-part/threat-gland",
    ];

    [...weaponIds, ...outfitIds, ...accessoryIds, ...lootIds].forEach((id) => {
      expect(registry.itemById.get(id)).toBeTruthy();
    });
  });

  it("ensures all item categories have correct id prefixes", () => {
    const registry = createTemplateRegistry();

    registry.items.forEach((item) => {
      if (item.category === "weapon") {
        expect(item.id.startsWith("weapon/")).toBe(true);
      } else if (item.category === "outfit-overlay") {
        expect(item.id.startsWith("outfit-overlay/")).toBe(true);
      } else if (item.category === "accessory") {
        expect(item.id.startsWith("accessory/")).toBe(true);
      } else if (item.category === "loot") {
        expect(item.id.startsWith("loot/")).toBe(true);
      }
    });
  });

  it("ensures loot items have buyPrice of 0", () => {
    const registry = createTemplateRegistry();

    registry.items
      .filter((item) => item.category === "loot")
      .forEach((item) => {
        expect(item.buyPrice).toBe(0);
      });
  });

  it("ensures purchasable items have sellPrice less than buyPrice", () => {
    const registry = createTemplateRegistry();

    registry.items
      .filter((item) => item.buyPrice > 0)
      .forEach((item) => {
        expect(item.sellPrice).toBeLessThan(item.buyPrice);
      });
  });

  it("validates drop table entries reference existing items", () => {
    const registry = createTemplateRegistry();

    registry.dropTables.forEach((table) => {
      table.entries.forEach((entry) => {
        expect(registry.itemById.has(entry.itemId)).toBe(true);
      });
    });
  });

  it("resolves all drop tables by id", () => {
    const registry = createTemplateRegistry();

    const expectedTableIds = [
      "drop-table/dungeon-f-regular",
      "drop-table/dungeon-f-elite",
      "drop-table/dungeon-f-boss",
    ];

    expectedTableIds.forEach((id) => {
      expect(registry.dropTableById.get(id)).toBeTruthy();
    });
  });

  it("validates drop table entry weights are positive", () => {
    const registry = createTemplateRegistry();

    registry.dropTables.forEach((table) => {
      table.entries.forEach((entry) => {
        expect(entry.weight).toBeGreaterThan(0);
      });
    });
  });

  it("validates drop table quantity ranges are valid", () => {
    const registry = createTemplateRegistry();

    registry.dropTables.forEach((table) => {
      table.entries.forEach((entry) => {
        expect(entry.minQuantity).toBeGreaterThanOrEqual(1);
        expect(entry.maxQuantity).toBeGreaterThanOrEqual(entry.minQuantity);
      });
    });
  });

  it("validates all room templates stay bodega-only", () => {
    const registry = createTemplateRegistry();

    registry.rooms.forEach((room) => {
      expect(room.availableInBuildings).toEqual(["building/bodega"]);
    });
  });

  it("validates starting resource amount matches bootstrap treasury", () => {
    const registry = createTemplateRegistry();
    const cash = registry.resourceById.get("resource/cash");

    expect(cash).toBeTruthy();
    expect(cash!.startingAmount).toBe(400);
    expect(canonicalNewGameScenario.guild.treasury).toBe(400);
  });
});

describe("bootstrap validation", () => {
  it("contains the expected number of operators", () => {
    expect(bootstrapScenario.operators).toHaveLength(6);
  });

  it("contains the expected number of staff", () => {
    expect(bootstrapScenario.staff).toHaveLength(3);
  });

  it("contains the expected number of visitors", () => {
    expect(bootstrapScenario.visitors).toHaveLength(3);
  });

  it("uses valid operator ids", () => {
    bootstrapScenario.operators.forEach((op) => {
      expect(op.id).toMatch(/^operator\//);
    });
  });

  it("uses valid staff ids", () => {
    bootstrapScenario.staff.forEach((s) => {
      expect(s.id).toMatch(/^staff\//);
    });
  });

  it("uses valid visitor ids", () => {
    bootstrapScenario.visitors.forEach((v) => {
      expect(v.id).toMatch(/^visitor\//);
    });
  });

  it("has unique operator ids", () => {
    const ids = bootstrapScenario.operators.map((op) => op.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("has unique staff ids", () => {
    const ids = bootstrapScenario.staff.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("operator relationships reference valid operator ids", () => {
    const operatorIds = new Set(bootstrapScenario.operators.map((op) => op.id));

    bootstrapScenario.operatorRelationships.forEach((rel) => {
      expect(operatorIds.has(rel.operatorAId)).toBe(true);
      expect(operatorIds.has(rel.operatorBId)).toBe(true);
    });
  });

  it("operator preferred partners reference valid operator ids", () => {
    const operatorIds = new Set(bootstrapScenario.operators.map((op) => op.id));

    bootstrapScenario.operators.forEach((op) => {
      op.preferences.preferredPartnerIds.forEach((partnerId) => {
        expect(operatorIds.has(partnerId)).toBe(true);
      });
    });
  });

  it("room seeds reference valid room templates", () => {
    const registry = createTemplateRegistry();

    bootstrapScenario.rooms.forEach((room) => {
      expect(registry.roomById.has(room.templateId)).toBe(true);
    });
  });

  it("inventory items reference valid item templates", () => {
    const registry = createTemplateRegistry();

    bootstrapScenario.inventory.forEach((entry) => {
      expect(registry.itemById.has(entry.itemId)).toBe(true);
      expect(entry.quantity).toBeGreaterThan(0);
    });
  });

  it("all three operator roles are represented", () => {
    const roles = new Set(bootstrapScenario.operators.map((op) => op.identity.roleTag));
    expect(roles).toContain("role:field_lead");
    expect(roles).toContain("role:scout");
    expect(roles).toContain("role:medic");
  });

  it("all three visitor desired roles are represented", () => {
    const roles = new Set(bootstrapScenario.visitors.map((v) => v.desiredRoleTag));
    expect(roles).toContain("role:field_lead");
    expect(roles).toContain("role:scout");
    expect(roles).toContain("role:medic");
  });
});

describe("canonical new-game validation", () => {
  it("keeps the sparse canonical opening roster separate from preview bootstrap data", () => {
    expect(canonicalNewGameScenario.operators.map((operator) => operator.id)).toEqual([
      "operator/rose-vega",
      "operator/milo-hart",
      "operator/jin-tanaka",
      "operator/vera-santos",
    ]);
    expect(canonicalNewGameScenario.staff.map((staff) => staff.id)).toEqual([
      "staff/aina",
      "staff/boris",
    ]);
    expect(canonicalNewGameScenario.visitors.map((visitor) => visitor.id)).toEqual([
      "visitor/nika",
    ]);
    expect(canonicalNewGameScenario.guild.treasury).toBe(400);
    expect(canonicalNewGameScenario.inventory).toEqual([
      { itemId: "weapon/pipe-wrench", quantity: 2 },
      { itemId: "weapon/kitchen-knife", quantity: 1 },
      { itemId: "outfit-overlay/padded-jacket", quantity: 1 },
      { itemId: "accessory/comm-earpiece", quantity: 1 },
    ]);
  });

  it("preserves the denser preview bootstrap scenario", () => {
    expect(previewBootstrapScenario.operators).toHaveLength(6);
    expect(previewBootstrapScenario.staff).toHaveLength(3);
    expect(previewBootstrapScenario.visitors).toHaveLength(3);
    expect(previewBootstrapScenario.guild.treasury).toBe(500);
    expect(
      previewBootstrapScenario.inventory.some((entry) => entry.itemId === "loot/monster-part/fang"),
    ).toBe(true);
  });
});

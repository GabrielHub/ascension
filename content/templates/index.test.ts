import { describe, expect, it } from "vitest";

import {
  bootstrapScenario,
  canonicalNewGameScenario,
  previewBootstrapScenario,
} from "../bootstrap";
import { bossTemplates } from "./bosses";
import { createTemplateRegistry } from "./index";
import { siteConceptTemplates } from "./site-concepts";

describe("template registry", () => {
  it("builds the aggregate registry with deterministic category counts", () => {
    const registry = createTemplateRegistry();

    expect(registry.resources).toHaveLength(3);
    expect(registry.buildings).toHaveLength(3);
    expect(registry.rooms).toHaveLength(40);
    expect(registry.upgrades).toHaveLength(17);
    expect(registry.missions).toHaveLength(3);
    expect(registry.events).toHaveLength(25);
    expect(registry.items).toHaveLength(166);
    expect(registry.prepRecipes).toHaveLength(6);
    expect(registry.districts).toHaveLength(5);
    expect(registry.factions).toHaveLength(5);
    expect(registry.craftRecipes).toHaveLength(19);
    expect(registry.dropTables).toHaveLength(102);
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
      "weapon/crowbar",
      "weapon/box-cutter",
      "weapon/tire-iron",
      "weapon/claw-hammer",
      "weapon/chain-length",
      "weapon/nail-bat",
      "weapon/stun-baton",
      "weapon/rebar-spike",
      "weapon/tactical-knife",
      "weapon/machete",
      "weapon/compact-crossbow",
      "weapon/hand-axe",
      "weapon/reinforced-bat",
      "weapon/katana",
      "weapon/tactical-rifle",
      "weapon/dual-daggers",
      "weapon/sidearm",
      "weapon/rift-scored-blade",
      "weapon/pulse-baton",
      "weapon/breach-hammer",
      "weapon/focused-carbine",
    ];

    const outfitIds = [
      "outfit-overlay/padded-jacket",
      "outfit-overlay/leather-vest",
      "outfit-overlay/work-coveralls",
      "outfit-overlay/denim-jacket",
      "outfit-overlay/hi-vis-vest",
      "outfit-overlay/insulated-parka",
      "outfit-overlay/courier-jacket",
      "outfit-overlay/tactical-vest",
      "outfit-overlay/stealth-cloak",
      "outfit-overlay/reinforced-hoodie",
      "outfit-overlay/heavy-plate",
      "outfit-overlay/field-medic-coat",
      "outfit-overlay/ballistic-vest",
      "outfit-overlay/rift-lined-jacket",
      "outfit-overlay/signal-dampening-coat",
      "outfit-overlay/composite-plate-carrier",
    ];

    const accessoryIds = [
      "accessory/comm-earpiece",
      "accessory/tactical-scarf",
      "accessory/wrist-brace",
      "accessory/knee-pads",
      "accessory/work-gloves",
      "accessory/respirator-mask",
      "accessory/ankle-holster",
      "accessory/eye-visor",
      "accessory/medkit-pouch",
      "accessory/scout-binocs",
      "accessory/field-lead-badge",
      "accessory/shoulder-lamp",
      "accessory/reinforced-gloves",
      "accessory/utility-belt",
      "accessory/trauma-kit",
      "accessory/rift-compass",
      "accessory/dampening-earbuds",
      "accessory/stabilizer-gauntlet",
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
      "loot/monster-part/drain-sludge",
      "loot/monster-part/pipe-scale",
      "loot/monster-part/ramp-gravel",
      "loot/monster-part/bollard-core",
      "loot/monster-part/chalk-filament",
      "loot/monster-part/lesson-fragment",
      "loot/monster-part/root-fiber",
      "loot/monster-part/pollen-sac",
      "loot/monster-part/lint-clump",
      "loot/monster-part/detergent-crystal",
      "loot/monster-part/radiator-ash",
      "loot/monster-part/basement-mold",
      "loot/monster-part/echo-resin",
      "loot/monster-part/rubber-fragment",
      "loot/monster-part/frost-shard",
      "loot/monster-part/preserved-marrow",
      "loot/monster-part/ticket-stub",
      "loot/monster-part/rail-splice",
      "loot/monster-part/lacquer-bead",
      "loot/monster-part/solvent-gland",
      "loot/monster-part/oxide-flake",
      "loot/monster-part/rivet-cluster",
      "loot/monster-part/glass-tooth",
      "loot/monster-part/pawned-core",
      "loot/monster-part/celluloid-strip",
      "loot/monster-part/butter-residue",
      "loot/monster-part/algae-mat",
      "loot/monster-part/cistern-scale",
      "loot/monster-part/star-chart-shard",
      "loot/monster-part/lens-fragment",
      "loot/monster-part/pressure-seal",
      "loot/monster-part/turbine-tooth",
      "loot/monster-part/prop-residue",
      "loot/monster-part/curtain-thread",
      "loot/monster-part/culture-sample",
      "loot/monster-part/reagent-vial",
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

  it("validates prep recipes reference valid staging rooms and consumable outputs", () => {
    const registry = createTemplateRegistry();

    registry.prepRecipes.forEach((recipe) => {
      expect(recipe.requiredRoomTag).toBeTruthy();
      expect(registry.rooms.some((room) => room.tags.includes(recipe.requiredRoomTag))).toBe(true);

      const outputItem = registry.itemById.get(recipe.outputItemId);
      expect(outputItem).toBeTruthy();
      expect(outputItem?.category).toBe("consumable");
    });
  });

  it("validates craft recipes reference the correct workshop, durable outputs, and known factions", () => {
    const registry = createTemplateRegistry();

    const dCraftRoomId = "room/workshop:tier_1";
    const cCraftRoomId = "room/fabrication_bay:tier_1";

    registry.craftRecipes.forEach((recipe) => {
      const outputItem = registry.itemById.get(recipe.outputItemId);
      expect(outputItem).toBeTruthy();
      expect(["weapon", "outfit-overlay", "accessory"]).toContain(outputItem?.category);

      // Porter's-era D-rank recipes use the workshop; skyscraper C-rank
      // recipes use the Fabrication Bay. Every recipe must specify one of
      // the two authored craft rooms.
      if (recipe.minimumBuildingId === "building/porters") {
        expect(recipe.requiredRoomId).toBe(dCraftRoomId);
        expect(recipe.minimumBuildingTier).toBeGreaterThanOrEqual(5);
      } else {
        expect(recipe.minimumBuildingId).toBe("building/skyscraper");
        expect(recipe.requiredRoomId).toBe(cCraftRoomId);
        expect(recipe.minimumBuildingTier).toBeGreaterThanOrEqual(1);
      }

      expect(recipe.requiredStaffTag).toBe("staff:logistics");
      expect(recipe.cashCost).toBeGreaterThan(0);
      expect(recipe.inputItems.length).toBeGreaterThan(0);
      expect(recipe.requiredDistrictTags.length).toBeGreaterThan(0);

      recipe.inputItems.forEach((input) => {
        const inputItem = registry.itemById.get(input.itemId);
        expect(inputItem).toBeTruthy();
        expect(input.quantity).toBeGreaterThan(0);
        expect(inputItem?.tags).toContain("loot:crafting_input");
      });

      Object.keys(recipe.requiredFactionStanding).forEach((factionId) => {
        expect(registry.factionById.has(factionId)).toBe(true);
      });
    });
  });

  it("populates district site concept coverage from the authored site concept pools", () => {
    const registry = createTemplateRegistry();

    registry.districts.forEach((district) => {
      expect(district.siteConceptIds.length).toBeGreaterThan(0);
      district.siteConceptIds.forEach((siteConceptId) => {
        const siteConcept = siteConceptTemplates.find(
          (entry) => entry.siteConceptId === siteConceptId,
        );
        expect(siteConcept).toBeTruthy();
        expect(siteConcept?.districtPool).toContain(district.id);
      });
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

  it("validates all room templates belong to a known building", () => {
    const registry = createTemplateRegistry();
    const knownBuildingIds = new Set(registry.buildings.map((b) => b.id));

    registry.rooms.forEach((room) => {
      expect(room.availableInBuildings.length).toBeGreaterThan(0);
      room.availableInBuildings.forEach((buildingId) => {
        expect(knownBuildingIds.has(buildingId)).toBe(true);
      });
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

  it("tags authored bootstrap operators with grounded rank tone", () => {
    bootstrapScenario.operators.forEach((operator) => {
      expect(operator.rankTone).toBe("grounded");
    });
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

describe("rank tone contracts", () => {
  it("tags current site concepts, bosses, and items with explicit rank tone metadata", () => {
    const registry = createTemplateRegistry();

    // Rank tones escalate with rank:
    //  F/E → grounded
    //  D   → heightened (still grounded allowed for lower-band overlap)
    //  C   → heightened or surreal (skyscraper endgame bridge)
    siteConceptTemplates.forEach((siteConcept) => {
      if (siteConcept.rankPool.includes("c")) {
        expect(["heightened", "surreal"]).toContain(siteConcept.rankTone);
      } else if (siteConcept.rankPool.includes("d")) {
        expect(siteConcept.rankTone).toBe("heightened");
      } else {
        expect(siteConcept.rankTone).toBe("grounded");
      }
    });

    bossTemplates.forEach((boss) => {
      if (boss.rank === "c") {
        expect(["heightened", "surreal"]).toContain(boss.rankTone);
      } else if (boss.rank === "d") {
        expect(boss.rankTone).toBe("heightened");
      } else {
        expect(boss.rankTone).toBe("grounded");
      }
    });

    registry.items.forEach((item) => {
      if (item.rank === "c") {
        expect(["heightened", "surreal"]).toContain(item.rankTone);
      } else if (item.rank === "d") {
        expect(item.rankTone).toBe("heightened");
      } else {
        expect(item.rankTone).toBe("grounded");
      }
    });
  });
});

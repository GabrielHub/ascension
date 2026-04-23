import { describe, expect, it } from "vitest";

import { templateRegistry as registry } from "content/templates";
import {
  getBuildingFloors,
  getBuildingLayout,
  getVisibleBuildingFloors,
} from "content/building-layouts";
import {
  getHqBackdropManifestForBuilding,
  getHqEnvironmentRenderConfigForBuilding,
} from "lib/hq-environment-manifest";
import { deriveOperatorCombatDefaults } from "lib/operator-combat";
import { deriveRecruitRank, visitorQualityToRank } from "lib/visitor-rank";
import { getAvailableContractRanksForReputation } from "./contract-economy";
import { siteConceptTemplates } from "content/templates/site-concepts";
import { applySimCommand } from "./commands";
import { createSimTestContext } from "./test-context";
import { BuildingAuthority, GuildState, RoomInstance } from "../components";
import type { SimSystemContext } from "./types";

// ── Skyscraper building template ────────────────────────────────────────

describe("skyscraper building template", () => {
  it("has correct base stats", () => {
    const skyscraper = registry.buildingById.get("building/skyscraper");
    expect(skyscraper).toBeTruthy();
    expect(skyscraper!.baseRoomSlots).toBe(11);
    expect(skyscraper!.baseOperatorSlots).toBe(18);
    expect(skyscraper!.contractRankCeiling).toBe("c");
    expect(skyscraper!.baseIncome).toBe(60);
    expect(skyscraper!.recruitmentQualityBonus).toBe(2);
  });

  it("exposes the four expansion-floor upgrades in narrative order", () => {
    const skyscraper = registry.buildingById.get("building/skyscraper");
    expect(skyscraper!.upgradeIds).toEqual([
      "upgrade/building/skyscraper:nightlife_floor",
      "upgrade/building/skyscraper:specialist_training_floor",
      "upgrade/building/skyscraper:executive_floor",
      "upgrade/building/skyscraper:penthouse",
    ]);
  });
});

// ── Skyscraper rooms ────────────────────────────────────────────────────

describe("skyscraper room templates", () => {
  const starterRoomIds = [
    "room/lobby:tier_1",
    "room/reception:tier_1",
    "room/bullpen:tier_1",
    "room/situation_room:tier_1",
    "room/clinic:tier_1",
    "room/dojo:tier_1",
    "room/crew_lounge:tier_1",
    "room/supply_hall:tier_1",
    "room/fabrication_bay:tier_1",
    "room/rooftop_helipad:tier_1",
    "room/sky_garden:tier_1",
  ];

  it("all skyscraper starter rooms exist in the registry", () => {
    for (const id of starterRoomIds) {
      expect(registry.roomById.has(id)).toBe(true);
    }
  });

  it("all skyscraper rooms declare building/skyscraper in availableInBuildings", () => {
    for (const id of starterRoomIds) {
      const room = registry.roomById.get(id)!;
      expect(room.availableInBuildings).toContain("building/skyscraper");
    }
  });

  it("the Lobby is tagged as a recruitment surface", () => {
    const lobby = registry.roomById.get("room/lobby:tier_1")!;
    expect(lobby.tags).toContain("ops:recruitment");
    expect(lobby.tags).toContain("room:social");
  });

  it("the Clinic uses the recovery tag", () => {
    const clinic = registry.roomById.get("room/clinic:tier_1")!;
    expect(clinic.tags).toContain("room:recovery");
  });

  it("the Dojo carries the training tag", () => {
    const dojo = registry.roomById.get("room/dojo:tier_1")!;
    expect(dojo.tags).toContain("room:training");
  });

  it("the Supply Hall supports logistics staging", () => {
    const supplyHall = registry.roomById.get("room/supply_hall:tier_1")!;
    expect(supplyHall.tags).toContain("room:logistics");
    expect(supplyHall.tags).toContain("ops:staging");
  });

  it("the Fabrication Bay carries the crafting tag", () => {
    const fab = registry.roomById.get("room/fabrication_bay:tier_1")!;
    expect(fab.tags).toContain("ops:crafting");
  });

  it("the Helipad carries the staging tag", () => {
    const helipad = registry.roomById.get("room/rooftop_helipad:tier_1")!;
    expect(helipad.tags).toContain("ops:staging");
  });
});

// ── Skyscraper layout ───────────────────────────────────────────────────

describe("skyscraper layout", () => {
  it("starter layout ships five floors", () => {
    const floors = getBuildingFloors("building/skyscraper", 1);
    expect(floors).toHaveLength(5);
    expect(floors.map((f) => f.floorIndex)).toEqual([0, 1, 2, 3, 4]);
  });

  it("every starter floor seeds at least one starting room", () => {
    for (let floorIndex = 0; floorIndex < 5; floorIndex++) {
      const floor = getBuildingLayout("building/skyscraper", floorIndex, 1)!;
      const starterSlots = floor.slots.filter((slot) => slot.startingTemplateId);
      expect(starterSlots.length).toBeGreaterThan(0);
    }
  });

  it("every starter slot references a room template available in the skyscraper", () => {
    const floors = getBuildingFloors("building/skyscraper", 1);
    const templateIds = floors.flatMap((floor) =>
      floor.slots.filter((slot) => slot.startingTemplateId).map((slot) => slot.startingTemplateId!),
    );
    expect(templateIds).toHaveLength(11);
    for (const templateId of templateIds) {
      const template = registry.roomById.get(templateId);
      expect(template).toBeTruthy();
      expect(template!.availableInBuildings).toContain("building/skyscraper");
    }
  });

  it("renders the lobby, operations, recovery, and logistics floors as one tower stack", () => {
    expect(
      getVisibleBuildingFloors("building/skyscraper", 0, 1).map((floor) => floor.floorIndex),
    ).toEqual([0, 1, 2, 3]);
    expect(
      getVisibleBuildingFloors("building/skyscraper", 2, 1).map((floor) => floor.floorIndex),
    ).toEqual([0, 1, 2, 3]);
  });

  it("renders the rooftop as its own stand-alone floor view", () => {
    expect(
      getVisibleBuildingFloors("building/skyscraper", 4, 1).map((floor) => floor.floorIndex),
    ).toEqual([4]);
  });

  it("tags the lobby with the ground-floor elevation band", () => {
    const floors = getBuildingFloors("building/skyscraper", 1);
    expect(floors[0]!.elevationBandId).toBe("ground-floor");
    expect(floors[4]!.elevationBandId).toBe("rooftop");
  });
});

// ── Skyscraper environment wiring ───────────────────────────────────────

describe("skyscraper environment manifest", () => {
  it("resolves a render config keyed to the skyscraper building id", () => {
    const config = getHqEnvironmentRenderConfigForBuilding("building/skyscraper");
    expect(config).toBeDefined();
    expect(config.composition.sceneSystem.roomFootprint.cols).toBeGreaterThan(0);
  });

  it("exposes a backdrop manifest for the tower", () => {
    const manifest = getHqBackdropManifestForBuilding("building/skyscraper");
    expect(manifest).not.toBeNull();
    expect(manifest!.elevationBandId).toBe("ground-floor");
    expect(manifest!.profileId).toBe("skyscraper-midtown");
  });
});

// ── C-rank endgame-entry content ─────────────────────────────────────────

describe("skyscraper C-rank content packet", () => {
  it("authors at least six C-rank site concepts", () => {
    const cRankSites = siteConceptTemplates.filter((site) => site.rankPool.includes("c"));
    expect(cRankSites.length).toBeGreaterThanOrEqual(6);
    for (const site of cRankSites) {
      expect(site.rankTone).toMatch(/heightened|surreal/);
      expect(site.enemyFamilyIds.length).toBeGreaterThan(0);
      expect(site.bossId).toBeTruthy();
    }
  });

  it("every C-rank site references a registered boss and enemy family", () => {
    const cRankSites = siteConceptTemplates.filter((site) => site.rankPool.includes("c"));
    for (const site of cRankSites) {
      expect(registry.bossById.has(site.bossId), `missing boss ${site.bossId}`).toBe(true);
      for (const familyId of site.enemyFamilyIds) {
        expect(registry.enemyFamilyById.has(familyId), `missing enemy family ${familyId}`).toBe(
          true,
        );
      }
    }
  });

  it("every C-rank boss has a registered drop table", () => {
    const cRankBosses = [...registry.bossById.values()].filter((boss) => boss.rank === "c");
    expect(cRankBosses.length).toBeGreaterThanOrEqual(6);
    for (const boss of cRankBosses) {
      expect(registry.dropTableById.has(boss.dropTableId)).toBe(true);
    }
  });

  it("ships at least one C-rank weapon, outfit, and accessory", () => {
    const cRankItems = registry.items.filter((item) => item.rank === "c");
    const categories = new Set(cRankItems.map((item) => item.category));
    expect(categories).toContain("weapon");
    expect(categories).toContain("outfit-overlay");
    expect(categories).toContain("accessory");
  });

  it("adds a skyscraper-endgame craft family that outputs only C-rank gear", () => {
    const cRankRecipes = registry.craftRecipes.filter(
      (recipe) => recipe.family === "craft-family/skyscraper-endgame",
    );
    expect(cRankRecipes.length).toBeGreaterThanOrEqual(10);
    for (const recipe of cRankRecipes) {
      expect(recipe.minimumBuildingId).toBe("building/skyscraper");
      expect(recipe.requiredRoomId).toBe("room/fabrication_bay:tier_1");
      const output = registry.itemById.get(recipe.outputItemId);
      expect(output?.rank).toBe("c");
    }
  });
});

// ── C-rank contract posting ──────────────────────────────────────────────

describe("skyscraper contract ladder", () => {
  it("surfaces C-rank contracts once reputation crosses the C threshold in the skyscraper", () => {
    const skyscraperCeiling = registry.buildingById.get("building/skyscraper")!.contractRankCeiling;
    const availableAtLowRep = getAvailableContractRanksForReputation(20, skyscraperCeiling);
    expect(availableAtLowRep).not.toContain("c");

    const availableAtHighRep = getAvailableContractRanksForReputation(60, skyscraperCeiling);
    expect(availableAtHighRep).toContain("d");
    expect(availableAtHighRep).toContain("c");
  });

  it("still caps at C in the skyscraper even at high reputation", () => {
    const skyscraperCeiling = registry.buildingById.get("building/skyscraper")!.contractRankCeiling;
    const available = getAvailableContractRanksForReputation(99, skyscraperCeiling);
    expect(available).not.toContain("b");
    expect(available).not.toContain("a");
    expect(available).not.toContain("u");
  });
});

// ── Rank-aware recruit generation ────────────────────────────────────────

describe("rank-aware recruit generation", () => {
  it("produces F-rank operators at the bodega regardless of quality", () => {
    const bodegaCeiling = registry.buildingById.get("building/bodega")!.contractRankCeiling;
    expect(deriveRecruitRank(40, bodegaCeiling)).toBe("f");
    expect(deriveRecruitRank(70, bodegaCeiling)).toBe("f");
    expect(deriveRecruitRank(90, bodegaCeiling)).toBe("f");
  });

  it("spreads recruits across F/E/D at Porter's based on quality", () => {
    const portersCeiling = registry.buildingById.get("building/porters")!.contractRankCeiling;
    expect(deriveRecruitRank(30, portersCeiling)).toBe("f");
    expect(deriveRecruitRank(45, portersCeiling)).toBe("e");
    expect(deriveRecruitRank(70, portersCeiling)).toBe("d");
  });

  it("spreads recruits across E/D/C at the skyscraper based on quality", () => {
    const skyscraperCeiling = registry.buildingById.get("building/skyscraper")!.contractRankCeiling;
    expect(deriveRecruitRank(30, skyscraperCeiling)).toBe("e");
    expect(deriveRecruitRank(50, skyscraperCeiling)).toBe("d");
    expect(deriveRecruitRank(70, skyscraperCeiling)).toBe("c");
  });

  it("keeps the visitor display rank in sync with the derived recruit rank", () => {
    const skyscraperCeiling = registry.buildingById.get("building/skyscraper")!.contractRankCeiling;
    expect(visitorQualityToRank(70, skyscraperCeiling)).toBe("C");
    expect(visitorQualityToRank(50, skyscraperCeiling)).toBe("D");
    expect(visitorQualityToRank(30, skyscraperCeiling)).toBe("E");
  });

  it("produces rank-scaled combat stats for role archetypes", () => {
    const fLead = deriveOperatorCombatDefaults("role:field_lead", "f");
    const dLead = deriveOperatorCombatDefaults("role:field_lead", "d");
    const cLead = deriveOperatorCombatDefaults("role:field_lead", "c");

    expect(fLead.rank).toBe("f");
    expect(dLead.rank).toBe("d");
    expect(cLead.rank).toBe("c");
    expect(dLead.baseStats.strength).toBeGreaterThan(fLead.baseStats.strength);
    expect(cLead.baseStats.strength).toBeGreaterThan(dLead.baseStats.strength);
    // Role identity is preserved across ranks.
    expect(cLead.attunementTag).toBe(fLead.attunementTag);
    // Rank-band packages differ: senior (c) uses senior package id.
    expect(cLead.combatPackageId).not.toBe(fLead.combatPackageId);
  });

  it("still defaults to F-rank when no rank is provided (legacy callers)", () => {
    const legacy = deriveOperatorCombatDefaults("role:scout");
    expect(legacy.rank).toBe("f");
  });
});

// ── Skyscraper expansion-floor room templates ───────────────────────────

describe("skyscraper expansion-floor room templates", () => {
  const expansionRoomIds = [
    "room/club:tier_1",
    "room/green_room:tier_1",
    "room/drill_floor:tier_1",
    "room/recon_course:tier_1",
    "room/trauma_bay:tier_1",
    "room/executive_office:tier_1",
    "room/compliance_office:tier_1",
    "room/war_room:tier_1",
    "room/sky_lounge:tier_1",
    "room/private_cellar:tier_1",
  ];

  it("registers every expansion-floor room template", () => {
    for (const id of expansionRoomIds) {
      expect(registry.roomById.has(id)).toBe(true);
    }
  });

  it("scopes every expansion-floor room to building/skyscraper", () => {
    for (const id of expansionRoomIds) {
      const room = registry.roomById.get(id)!;
      expect(room.availableInBuildings).toEqual(["building/skyscraper"]);
    }
  });

  it("tags The Club and The Sky Lounge as recruitment surfaces", () => {
    expect(registry.roomById.get("room/club:tier_1")!.tags).toContain("ops:recruitment");
    expect(registry.roomById.get("room/sky_lounge:tier_1")!.tags).toContain("ops:recruitment");
  });

  it("tags every specialist-training room with the training tag", () => {
    for (const id of [
      "room/drill_floor:tier_1",
      "room/recon_course:tier_1",
      "room/trauma_bay:tier_1",
    ]) {
      expect(registry.roomById.get(id)!.tags).toContain("room:training");
    }
  });

  it("tags The Trauma Bay with training and medic role", () => {
    const trauma = registry.roomById.get("room/trauma_bay:tier_1")!;
    expect(trauma.tags).toContain("room:training");
    expect(trauma.tags).toContain("role:medic");
  });

  it("keeps The Crew Lounge and The Sky Lounge as distinct identities", () => {
    expect(registry.roomById.has("room/crew_lounge:tier_1")).toBe(true);
    expect(registry.roomById.has("room/sky_lounge:tier_1")).toBe(true);
    expect(registry.roomById.get("room/crew_lounge:tier_1")!.tags).toContain("room:recovery");
    expect(registry.roomById.get("room/sky_lounge:tier_1")!.tags).toContain("ops:recruitment");
  });
});

// ── Skyscraper expansion-floor upgrades ─────────────────────────────────

describe("skyscraper expansion upgrades", () => {
  it("Nightlife unlocks The Club and The Green Room with no prior tier requirement", () => {
    const upgrade = registry.upgradeById.get("upgrade/building/skyscraper:nightlife_floor")!;
    const tierGate = upgrade.requirements.find((req) => req.type === "building_tier_min");
    expect(tierGate).toBeUndefined();
    const unlocks = upgrade.effects.filter((e) => e.type === "unlock_room_template");
    expect(unlocks.map((e) => (e as { roomId: string }).roomId)).toEqual([
      "room/club:tier_1",
      "room/green_room:tier_1",
    ]);
  });

  it("Specialist Training requires tier 2 and unlocks all three role-specific rooms", () => {
    const upgrade = registry.upgradeById.get(
      "upgrade/building/skyscraper:specialist_training_floor",
    )!;
    const tierGate = upgrade.requirements.find((req) => req.type === "building_tier_min") as
      | { minimum: number }
      | undefined;
    expect(tierGate?.minimum).toBe(2);
    const unlocks = upgrade.effects.filter((e) => e.type === "unlock_room_template");
    expect(unlocks.map((e) => (e as { roomId: string }).roomId).sort()).toEqual([
      "room/drill_floor:tier_1",
      "room/recon_course:tier_1",
      "room/trauma_bay:tier_1",
    ]);
  });

  it("Executive requires tier 3 and unlocks the executive, compliance, and war rooms", () => {
    const upgrade = registry.upgradeById.get("upgrade/building/skyscraper:executive_floor")!;
    const tierGate = upgrade.requirements.find((req) => req.type === "building_tier_min") as
      | { minimum: number }
      | undefined;
    expect(tierGate?.minimum).toBe(3);
    const unlocks = upgrade.effects.filter((e) => e.type === "unlock_room_template");
    expect(unlocks.map((e) => (e as { roomId: string }).roomId).sort()).toEqual([
      "room/compliance_office:tier_1",
      "room/executive_office:tier_1",
      "room/war_room:tier_1",
    ]);
  });

  it("Penthouse requires tier 4 and unlocks the Sky Lounge and Private Cellar", () => {
    const upgrade = registry.upgradeById.get("upgrade/building/skyscraper:penthouse")!;
    const tierGate = upgrade.requirements.find((req) => req.type === "building_tier_min") as
      | { minimum: number }
      | undefined;
    expect(tierGate?.minimum).toBe(4);
    const unlocks = upgrade.effects.filter((e) => e.type === "unlock_room_template");
    expect(unlocks.map((e) => (e as { roomId: string }).roomId).sort()).toEqual([
      "room/private_cellar:tier_1",
      "room/sky_lounge:tier_1",
    ]);
  });

  it("upgrade costs scale monotonically across the four-step arc", () => {
    const cashByUpgrade = (
      [
        "upgrade/building/skyscraper:nightlife_floor",
        "upgrade/building/skyscraper:specialist_training_floor",
        "upgrade/building/skyscraper:executive_floor",
        "upgrade/building/skyscraper:penthouse",
      ] as const
    ).map((id) => {
      const upgrade = registry.upgradeById.get(id)!;
      const cashReq = upgrade.requirements.find(
        (req) => req.type === "resource_min" && req.resourceId === "resource/cash",
      ) as { minimum: number } | undefined;
      return cashReq!.minimum;
    });
    for (let i = 1; i < cashByUpgrade.length; i++) {
      expect(cashByUpgrade[i]).toBeGreaterThan(cashByUpgrade[i - 1]);
    }
  });

  it("fully expanded skyscraper grows by 10 room slots and 13 operator slots", () => {
    let rooms = registry.buildingById.get("building/skyscraper")!.baseRoomSlots;
    let ops = registry.buildingById.get("building/skyscraper")!.baseOperatorSlots;
    for (const upgradeId of registry.buildingById.get("building/skyscraper")!.upgradeIds) {
      for (const effect of registry.upgradeById.get(upgradeId)!.effects) {
        if (effect.type === "add_room_slot") rooms += effect.amount;
        if (effect.type === "grant_operator_slot") ops += effect.amount;
      }
    }
    expect(rooms).toBe(11 + 10);
    expect(ops).toBe(18 + 13);
  });
});

// ── Skyscraper expansion-floor layout ───────────────────────────────────

describe("skyscraper expansion layout stages", () => {
  it("baseline tier 1 stays at five floors", () => {
    expect(getBuildingFloors("building/skyscraper", 1)).toHaveLength(5);
  });

  it("each tier upgrade adds exactly one floor to the tower", () => {
    expect(getBuildingFloors("building/skyscraper", 2)).toHaveLength(6);
    expect(getBuildingFloors("building/skyscraper", 3)).toHaveLength(7);
    expect(getBuildingFloors("building/skyscraper", 4)).toHaveLength(8);
    expect(getBuildingFloors("building/skyscraper", 5)).toHaveLength(9);
  });

  it("expansion floors get unique floor indices 5-8", () => {
    const fullStack = getBuildingFloors("building/skyscraper", 5);
    const indices = fullStack.map((floor) => floor.floorIndex).sort((a, b) => a - b);
    expect(indices).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it("every expansion floor lives in the tower-core stack group", () => {
    for (const tier of [2, 3, 4, 5]) {
      const floors = getBuildingFloors("building/skyscraper", tier);
      const expansionFloor = floors.find((floor) => floor.floorIndex === tier + 3)!;
      expect(expansionFloor.stackGroupId).toBe("tower-core");
    }
  });

  it("the Rooftop stays in its own stack group at every tier", () => {
    for (const tier of [1, 2, 3, 4, 5]) {
      const rooftop = getBuildingFloors("building/skyscraper", tier).find(
        (floor) => floor.floorIndex === 4,
      )!;
      expect(rooftop.stackGroupId).toBe("rooftop");
    }
  });

  it("renders all tower-core floors together when viewing any tower-core floor", () => {
    const visibleFromLobby = getVisibleBuildingFloors("building/skyscraper", 0, 5).map(
      (floor) => floor.floorIndex,
    );
    expect(visibleFromLobby).toEqual([0, 1, 2, 3, 5, 6, 7, 8]);
  });

  it("keeps the Rooftop on its own when viewed", () => {
    expect(
      getVisibleBuildingFloors("building/skyscraper", 4, 5).map((floor) => floor.floorIndex),
    ).toEqual([4]);
  });

  it("every expansion floor seeds at least one starter room", () => {
    for (const floorIndex of [5, 6, 7, 8]) {
      const floor = getBuildingLayout("building/skyscraper", floorIndex, 5)!;
      const starterSlots = floor.slots.filter((slot) => slot.startingTemplateId);
      expect(starterSlots.length).toBeGreaterThan(0);
    }
  });

  it("every expansion floor's starter slots reference templates available in the skyscraper", () => {
    for (const floorIndex of [5, 6, 7, 8]) {
      const floor = getBuildingLayout("building/skyscraper", floorIndex, 5)!;
      for (const slot of floor.slots) {
        if (!slot.startingTemplateId) continue;
        const template = registry.roomById.get(slot.startingTemplateId)!;
        expect(template.availableInBuildings).toContain("building/skyscraper");
      }
    }
  });
});

// ── Skyscraper expansion purchase flow ─────────────────────────────────

function createSkyscraperUpgradeContext(
  options: { treasury?: number; reputation?: number; appliedUpgradeIds?: string[] } = {},
): SimSystemContext {
  const skyscraperIndex = registry.buildingIndexById.get("building/skyscraper")!;
  return createSimTestContext({
    registry,
    guild: {
      treasury: options.treasury ?? 50_000,
      // Cumulative reputation across all four expansion upgrades is 620, and
      // requirements consume reputation when applied — give the harness enough
      // headroom to walk the full arc without re-earning rep between steps.
      reputation: options.reputation ?? 2000,
      intel: 0,
    },
    building: {
      activeBuildingTemplateIndex: skyscraperIndex,
      activeBuildingTier: 1,
      activeFloorIndex: 0,
      roomSlotCount: 11,
      operatorSlotCount: 18,
      appliedUpgradeIds: options.appliedUpgradeIds ?? [],
    },
  });
}

describe("skyscraper floor purchase flow", () => {
  it("buying Nightlife bumps tier, opens the new floor, and seeds its starter rooms", () => {
    const context = createSkyscraperUpgradeContext();
    const buildingEntity = context.singletonEntities.building;

    applySimCommand(context, {
      type: "sim/purchase-building-upgrade",
      upgradeId: "upgrade/building/skyscraper:nightlife_floor",
    });

    expect(BuildingAuthority.activeBuildingTier[buildingEntity]).toBe(2);
    expect(BuildingAuthority.appliedUpgradeIds[buildingEntity]).toContain(
      "upgrade/building/skyscraper:nightlife_floor",
    );

    const floors = getBuildingFloors("building/skyscraper", 2);
    expect(floors.map((f) => f.floorIndex).sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4, 5]);

    const placedTemplateIds = context.runtimeState.roomEntities
      .map((entity) => registry.rooms[RoomInstance.templateIndex[entity]]!.id)
      .sort();
    expect(placedTemplateIds).toEqual(["room/club:tier_1", "room/green_room:tier_1"]);
    for (const entity of context.runtimeState.roomEntities) {
      expect(RoomInstance.floorIndex[entity]).toBe(5);
    }
  });

  it("refuses to buy Specialist Training before Nightlife is applied", () => {
    const context = createSkyscraperUpgradeContext();
    const buildingEntity = context.singletonEntities.building;

    applySimCommand(context, {
      type: "sim/purchase-building-upgrade",
      upgradeId: "upgrade/building/skyscraper:specialist_training_floor",
    });

    expect(BuildingAuthority.appliedUpgradeIds[buildingEntity]).not.toContain(
      "upgrade/building/skyscraper:specialist_training_floor",
    );
    expect(BuildingAuthority.activeBuildingTier[buildingEntity]).toBe(1);
    expect(context.runtimeState.roomEntities.length).toBe(0);
  });

  it("refuses to buy Penthouse straight from baseline", () => {
    const context = createSkyscraperUpgradeContext();
    const buildingEntity = context.singletonEntities.building;

    applySimCommand(context, {
      type: "sim/purchase-building-upgrade",
      upgradeId: "upgrade/building/skyscraper:penthouse",
    });

    expect(BuildingAuthority.appliedUpgradeIds[buildingEntity]).not.toContain(
      "upgrade/building/skyscraper:penthouse",
    );
    expect(BuildingAuthority.activeBuildingTier[buildingEntity]).toBe(1);
  });

  it("walks the full four-step upgrade arc and reaches a 9-floor tower", () => {
    const context = createSkyscraperUpgradeContext();
    const buildingEntity = context.singletonEntities.building;

    for (const upgradeId of [
      "upgrade/building/skyscraper:nightlife_floor",
      "upgrade/building/skyscraper:specialist_training_floor",
      "upgrade/building/skyscraper:executive_floor",
      "upgrade/building/skyscraper:penthouse",
    ] as const) {
      applySimCommand(context, { type: "sim/purchase-building-upgrade", upgradeId });
    }

    expect(BuildingAuthority.activeBuildingTier[buildingEntity]).toBe(5);
    expect(BuildingAuthority.appliedUpgradeIds[buildingEntity]).toEqual([
      "upgrade/building/skyscraper:nightlife_floor",
      "upgrade/building/skyscraper:specialist_training_floor",
      "upgrade/building/skyscraper:executive_floor",
      "upgrade/building/skyscraper:penthouse",
    ]);

    expect(getBuildingFloors("building/skyscraper", 5)).toHaveLength(9);

    const placedTemplateIds = context.runtimeState.roomEntities
      .map((entity) => registry.rooms[RoomInstance.templateIndex[entity]]!.id)
      .sort();
    expect(placedTemplateIds).toEqual([
      "room/club:tier_1",
      "room/compliance_office:tier_1",
      "room/drill_floor:tier_1",
      "room/executive_office:tier_1",
      "room/green_room:tier_1",
      "room/private_cellar:tier_1",
      "room/recon_course:tier_1",
      "room/sky_lounge:tier_1",
      "room/trauma_bay:tier_1",
      "room/war_room:tier_1",
    ]);
  });

  it("debits the treasury by the upgrade cash cost", () => {
    const context = createSkyscraperUpgradeContext({ treasury: 2000 });
    const guildEntity = context.singletonEntities.guild;

    applySimCommand(context, {
      type: "sim/purchase-building-upgrade",
      upgradeId: "upgrade/building/skyscraper:nightlife_floor",
    });

    expect(BuildingAuthority.appliedUpgradeIds[context.singletonEntities.building]).toContain(
      "upgrade/building/skyscraper:nightlife_floor",
    );
    expect(GuildState.treasury[guildEntity]).toBe(500);
  });

  it("upgrade IDs round-trip through a JSON snapshot", () => {
    const context = createSkyscraperUpgradeContext();
    const buildingEntity = context.singletonEntities.building;
    applySimCommand(context, {
      type: "sim/purchase-building-upgrade",
      upgradeId: "upgrade/building/skyscraper:nightlife_floor",
    });
    applySimCommand(context, {
      type: "sim/purchase-building-upgrade",
      upgradeId: "upgrade/building/skyscraper:specialist_training_floor",
    });

    const snapshot = JSON.parse(
      JSON.stringify({
        appliedUpgradeIds: BuildingAuthority.appliedUpgradeIds[buildingEntity],
        activeBuildingTier: BuildingAuthority.activeBuildingTier[buildingEntity],
      }),
    );

    expect(snapshot.appliedUpgradeIds).toEqual([
      "upgrade/building/skyscraper:nightlife_floor",
      "upgrade/building/skyscraper:specialist_training_floor",
    ]);
    expect(snapshot.activeBuildingTier).toBe(3);
  });
});

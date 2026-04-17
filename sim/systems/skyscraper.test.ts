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

  it("exposes no building upgrades in the baseline stack", () => {
    const skyscraper = registry.buildingById.get("building/skyscraper");
    expect(skyscraper!.upgradeIds).toEqual([]);
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
    "room/lounge:tier_1",
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

  it("the Clinic uses the recovery and medical staff tags", () => {
    const clinic = registry.roomById.get("room/clinic:tier_1")!;
    expect(clinic.tags).toContain("room:recovery");
    expect(clinic.tags).toContain("staff:medical");
  });

  it("the Dojo carries the training tag", () => {
    const dojo = registry.roomById.get("room/dojo:tier_1")!;
    expect(dojo.tags).toContain("room:training");
  });

  it("the Supply Hall supports logistics staging", () => {
    const supplyHall = registry.roomById.get("room/supply_hall:tier_1")!;
    expect(supplyHall.tags).toContain("staff:logistics");
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
    expect(available).not.toContain("s");
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
    expect(cLead.kit.skillId).toBe(fLead.kit.skillId);
    expect(cLead.attunementTag).toBe(fLead.attunementTag);
  });

  it("still defaults to F-rank when no rank is provided (legacy callers)", () => {
    const legacy = deriveOperatorCombatDefaults("role:scout");
    expect(legacy.rank).toBe("f");
  });
});

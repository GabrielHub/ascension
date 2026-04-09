import { describe, expect, it } from "vitest";

import { validateGenerationOutput } from "./schemas";

describe("AI schema quality gates", () => {
  it("rejects incident copy that drifts into forbidden fantasy language", () => {
    const result = validateGenerationOutput(
      "incident-framing",
      {
        title: "Chosen One Incident",
        briefing:
          "The chosen hero feels destiny calling from the break room while mana surges across the office. Management is expected to answer the prophecy.",
        choices: [
          {
            choiceId: "mediate",
            label: "Take the Quest",
            description: "Gather the party and honor the prophecy.",
            consequenceSummary: "Everyone feels blessed by the mana.",
            resolutionSummary: "The heroes accepted their fate.",
          },
        ],
      },
      {
        choices: [
          {
            choiceId: "mediate",
          },
        ],
      },
    );

    expect(result.ok).toBe(false);
    expect(result).toMatchObject({
      ok: false,
      error: expect.stringContaining("forbidden tone"),
    });
  });

  it("fills omitted operator identity fields from the deterministic fallback packet", () => {
    const result = validateGenerationOutput(
      "operator-identity",
      {
        specialtyTag: "focus:extraction",
        appearance: {
          presetId: "mira-002",
        },
        preferences: {
          riskTolerance: 64,
          rewardFocus: 71,
          socialBias: 47,
          trainingBias: 58,
          comfortBias: 42,
          preferredMissionTags: ["mission:retrieval", "objective:escort"],
        },
        personaSummary: "Former courier who stays calm when the route goes sideways.",
        personaHooks: ["Treats delays like routing problems.", "Reads floor plans fast."],
      },
      {
        candidateId: "candidate/test",
        guildName: "Testing Guild",
        buildingName: "Bodega HQ",
        dayNumber: 2,
        name: "Rose Vega",
        roleTag: "role:scout",
        quality: 67,
        expectedLoyalty: 59,
        allowedSpecialtyTags: ["focus:scout", "focus:extraction", "focus:containment"],
        allowedPreferredMissionTags: [
          "mission:combat",
          "objective:clear",
          "mission:stability",
          "objective:hold",
          "mission:retrieval",
          "objective:escort",
        ],
        allowedRecipes: [
          {
            id: "mira-002",
            name: "Mira",
            bodySilhouette: "elegant-light",
            palette: "cool-dark",
            skinTone: "fair-cool",
          },
        ],
        allowedVisibleGearByRecipe: [
          {
            recipeId: "mira-002",
            weaponPartIds: ["weapon/dual-daggers"],
            outfitOverlayPartIds: ["outfit-overlay/stealth-cloak"],
            accessoryPartIds: ["accessory/comm-earpiece"],
          },
        ],
        gearCatalog: {
          weapon: [{ id: "weapon/dual-daggers", tags: ["melee", "blade"], rarity: "common" }],
          outfitOverlay: [
            {
              id: "outfit-overlay/stealth-cloak",
              tags: ["cloak", "stealth"],
              rarity: "common",
            },
          ],
          accessory: [
            {
              id: "accessory/comm-earpiece",
              tags: ["earpiece", "communication"],
              rarity: "common",
            },
          ],
        },
        fallbackIdentity: {
          specialtyTag: "focus:scout",
          appearance: {
            presetId: "mira-002",
            visibleGear: {
              weaponPartId: "weapon/dual-daggers",
              outfitOverlayPartId: "outfit-overlay/stealth-cloak",
              accessoryPartId: "accessory/comm-earpiece",
            },
          },
          preferences: {
            riskTolerance: 50,
            rewardFocus: 50,
            recoveryBias: 50,
            socialBias: 50,
            trainingBias: 50,
            comfortBias: 50,
            preferredMissionTags: ["mission:retrieval"],
          },
          personaSummary: "Deterministic fallback summary.",
          personaHooks: ["Fallback hook one.", "Fallback hook two."],
        },
      },
    );

    expect(result).toMatchObject({
      ok: true,
      output: {
        specialtyTag: "focus:extraction",
        appearance: {
          presetId: "mira-002",
          visibleGear: {
            weaponPartId: "weapon/dual-daggers",
            outfitOverlayPartId: "outfit-overlay/stealth-cloak",
            accessoryPartId: "accessory/comm-earpiece",
          },
        },
        preferences: {
          riskTolerance: 64,
          rewardFocus: 71,
          recoveryBias: 50,
          socialBias: 47,
          trainingBias: 58,
          comfortBias: 42,
          preferredMissionTags: ["mission:retrieval", "objective:escort"],
        },
      },
    });
  });
});

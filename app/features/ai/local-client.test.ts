import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("app/features/desktop/bridge", () => ({
  desktopBridge: {
    isAvailable: vi.fn(() => false),
    probeAiRuntime: vi.fn(),
    generateAi: vi.fn(),
  },
}));

vi.mock("./browser-client", () => ({
  browserAiClient: {
    probe: vi.fn(),
    generate: vi.fn(),
  },
}));

import { desktopBridge } from "app/features/desktop/bridge";

import { browserAiClient } from "./browser-client";
import { localAiClient } from "./local-client";

afterEach(() => {
  vi.clearAllMocks();
});

describe("local AI client", () => {
  const config = {
    runtimeKind: "ollama" as const,
    baseUrl: "http://127.0.0.1:11434/v1",
    modelId: "gemma4:26b",
  };

  beforeEach(() => {
    vi.mocked(desktopBridge.isAvailable).mockReturnValue(false);
  });

  it("delegates to the browser client outside the desktop host", async () => {
    vi.mocked(browserAiClient.probe).mockResolvedValue({
      status: "connected",
      runtimeKind: config.runtimeKind,
      baseUrl: config.baseUrl,
      modelId: config.modelId,
      availableModels: [config.modelId],
      error: null,
      probedAt: 1,
    });

    const result = await localAiClient.probe(config);

    expect(result.status).toBe("connected");
    expect(vi.mocked(browserAiClient.probe)).toHaveBeenCalledWith(config);
    expect(vi.mocked(desktopBridge.probeAiRuntime)).not.toHaveBeenCalled();
  });

  it("uses the desktop bridge inside the Tauri host and shares response parsing", async () => {
    vi.mocked(desktopBridge.isAvailable).mockReturnValue(true);
    vi.mocked(desktopBridge.generateAi).mockResolvedValue({
      content: JSON.stringify({
        title: "Dock Delay Notice",
        briefing:
          "A delivery delay turned the dock into a paperwork argument before lunch. Everyone involved is acting like this is about principle instead of a pallet.",
        choices: [
          {
            choiceId: "expedite",
            label: "Push the Delivery",
            description: "Lean on the vendor and get the shipment moving now.",
            consequenceSummary: "Treasury takes the hit, schedule pressure eases.",
            resolutionSummary:
              "The shipment showed up late, expensive, and fast enough to keep the day from derailing.",
          },
        ],
      }),
    });

    const result = await localAiClient.generate({
      surface: "incident-framing",
      subjectId: "incident/test",
      payloadVersion: 2,
      payload: {
        incidentId: "incident/test",
        templateId: "incident/dock-delay",
        templateName: "Dock Delay Notice",
        category: "logistics_delay",
        tags: ["logistics", "dock", "porters"],
        triggerFamily: "contract_pressure",
        guildName: "Testing Guild",
        buildingId: "building/porters",
        buildingName: "Porter's",
        dayNumber: 3,
        minuteOfDay: 615,
        presenter: {
          id: "presenter/assistant",
          name: "Mara Cordero",
          roleTitle: "Assistant",
          voiceBrief: "Matter-of-fact, calm, grounded in operations.",
          domainSummary: "Contracts, operations, and campaign guidance.",
          expression: "concerned",
        },
        subjectSummary: "Rose Vega, Loading Dock",
        operators: [
          {
            id: "operator/rose",
            name: "Rose Vega",
            roleTag: "role:field_lead",
            specialtyTag: "focus:containment",
            attunementTag: "attunement:kinetic",
            rank: "f",
            traits: ["trait:steady", "trait:resolute"],
            morale: { current: 61, baseline: 67 },
            loyalty: { current: 59, baseline: 62 },
            needs: { stress: 28, fatigue: 20, hunger: 15 },
            injury: { severity: 0, recoveryHoursRemaining: 0, treated: false },
            preferences: {
              riskTolerance: 70,
              rewardFocus: 62,
              recoveryBias: 34,
              socialBias: 58,
              trainingBias: 72,
              comfortBias: 40,
              preferredMissionTags: ["mission:stability", "objective:hold"],
              preferredPartnerIds: ["operator/milo"],
            },
          },
        ],
        choices: [
          {
            choiceId: "expedite",
            defaultLabel: "Pay to Expedite",
            defaultDescription: "Spend cash to move the vendor to the front of the queue.",
            defaultConsequenceSummary: "Treasury down, pressure eased.",
            deterministicEffects: [
              { kind: "treasury_delta", targetRef: "guild", value: -40 },
              { kind: "contract_pressure_delta", targetRef: "guild", value: -8 },
            ],
          },
        ],
      },
      config,
    });

    expect(result.output).toEqual({
      title: "Dock Delay Notice",
      briefing:
        "A delivery delay turned the dock into a paperwork argument before lunch. Everyone involved is acting like this is about principle instead of a pallet.",
      choices: [
        {
          choiceId: "expedite",
          label: "Push the Delivery",
          description: "Lean on the vendor and get the shipment moving now.",
          consequenceSummary: "Treasury takes the hit, schedule pressure eases.",
          resolutionSummary:
            "The shipment showed up late, expensive, and fast enough to keep the day from derailing.",
        },
      ],
    });
    expect(vi.mocked(desktopBridge.generateAi)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(browserAiClient.generate)).not.toHaveBeenCalled();
  });
});

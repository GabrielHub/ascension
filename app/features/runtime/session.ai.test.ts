import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("app/features/ai", async () => {
  const actual = await vi.importActual<typeof import("app/features/ai")>("app/features/ai");
  return {
    ...actual,
    localAiClient: {
      probe: vi.fn(),
      generate: vi.fn(),
    },
  };
});

vi.mock("app/features/settings/storage", async () => {
  const actual = await vi.importActual<typeof import("app/features/settings/storage")>(
    "app/features/settings/storage",
  );

  return {
    ...actual,
    readGameSettings: vi.fn(() => ({
      audio: {
        sfxVolumeDb: actual.DEFAULT_SFX_VOLUME_DB,
        musicVolumeDb: actual.DEFAULT_MUSIC_VOLUME_DB,
      },
      wakeLockEnabled: true,
      tutorialEventsEnabled: true,
      ai: {
        enabled: false,
        runtimeKind: "ollama" as const,
        baseUrl: "http://127.0.0.1:11434/v1",
        modelId: "gemma4:26b",
      },
    })),
  };
});

import { localAiClient } from "app/features/ai";
import { readGameSettings } from "app/features/settings/storage";
import { deferredSimulationSystemsReady } from "sim/systems";

import { resolveRuntimeSession } from "./session";

async function waitForAssertion(assertion: () => void, timeoutMs = 2000): Promise<void> {
  const startedAt = Date.now();

  while (true) {
    try {
      assertion();
      return;
    } catch (error) {
      if (Date.now() - startedAt >= timeoutMs) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
  }
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("runtime session AI request registry", () => {
  it("reuses completed results only when the payload and transport config still match", async () => {
    vi.mocked(localAiClient.generate).mockImplementation(async (request) => ({
      surface: request.surface,
      subjectId: request.subjectId,
      payloadVersion: request.payloadVersion,
      output: {
        title: `${String(request.payload.templateName)} headline`,
        briefing: "Structured detail",
        choices: [
          {
            choiceId: "mediate",
            label: "Mediate Directly",
            description: "Sit them down and handle it now.",
            consequenceSummary: "Morale and loyalty recover a little.",
            resolutionSummary: "The meeting stayed tense, but the room settled down by the end.",
          },
        ],
      },
      runtimeKind: request.config.runtimeKind,
      modelId: request.config.modelId,
      generatedAt: 1,
    }));

    const session = await resolveRuntimeSession({ mode: "preview" });
    const subjectId = "incident/test";
    const initialPayload = {
      incidentId: subjectId,
      templateId: "incident/personnel-friction",
      templateName: "Personnel Friction Report",
      category: "personnel_conflict",
      tags: ["conflict", "morale"],
      triggerFamily: "operator_conflict",
      guildName: "Testing Guild",
      buildingId: "building/bodega",
      buildingName: "Bodega HQ",
      dayNumber: 2,
      minuteOfDay: 600,
      subjectSummary: "Rose Vega, Milo Hart",
      operators: [
        {
          id: "operator/rose",
          name: "Rose Vega",
          roleTag: "role:field_lead",
          specialtyTag: "focus:containment",
          attunementTag: "attunement:kinetic",
          rank: "f",
          traits: ["trait:steady", "trait:resolute"],
          morale: { current: 67, baseline: 67 },
          loyalty: { current: 62, baseline: 62 },
          needs: { stress: 16, fatigue: 18, hunger: 12 },
          injury: { severity: 0, recoveryHoursRemaining: 0, treated: false },
          preferences: {
            riskTolerance: 74,
            rewardFocus: 66,
            recoveryBias: 34,
            socialBias: 58,
            trainingBias: 72,
            comfortBias: 40,
            preferredMissionTags: ["mission:stability", "objective:hold"],
            preferredPartnerIds: ["operator/milo-hart"],
          },
        },
      ],
      choices: [
        {
          choiceId: "mediate",
          defaultLabel: "Mediate Directly",
          defaultDescription: "Sit both operators down and work through the friction point.",
          defaultConsequenceSummary: "Minor morale boost for both, slight loyalty increase.",
          deterministicEffects: [
            { kind: "morale_delta", targetRef: "subject_a", value: 5 },
            { kind: "morale_delta", targetRef: "subject_b", value: 5 },
            { kind: "loyalty_delta", targetRef: "subject_a", value: 3 },
            { kind: "loyalty_delta", targetRef: "subject_b", value: 3 },
          ],
        },
      ],
    };

    const first = await session.commands.generateAiSurface({
      surface: "incident-framing",
      subjectId,
      payload: initialPayload,
      triggerSource: "dev-menu",
    });
    const reused = await session.commands.generateAiSurface({
      surface: "incident-framing",
      subjectId,
      payload: { ...initialPayload },
      triggerSource: "dev-menu",
    });
    const changed = await session.commands.generateAiSurface({
      surface: "incident-framing",
      subjectId,
      payload: {
        ...initialPayload,
        templateName: "Compliance Scare",
      },
      triggerSource: "dev-menu",
    });

    expect(first.status).toBe("succeeded");
    expect(reused).toBe(first);
    expect(changed.status).toBe("succeeded");
    expect(vi.mocked(localAiClient.generate)).toHaveBeenCalledTimes(2);
    expect(session.ai.requests.get(`incident-framing:${subjectId}`)?.payload).toEqual({
      ...initialPayload,
      templateName: "Compliance Scare",
    });
  });

  it("reuses the in-flight promise for matching pending AI requests", async () => {
    let resolveGenerate:
      | ((value: Awaited<ReturnType<typeof localAiClient.generate>>) => void)
      | undefined;
    vi.mocked(localAiClient.generate).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveGenerate = resolve;
        }),
    );

    const session = await resolveRuntimeSession({ mode: "preview" });
    const subjectId = "incident/pending";
    const payload = {
      incidentId: subjectId,
      templateId: "incident/personnel-friction",
      templateName: "Personnel Friction Report",
      category: "personnel_conflict",
    };

    const firstPromise = session.commands.generateAiSurface({
      surface: "incident-framing",
      subjectId,
      payload,
      triggerSource: "dev-menu",
    });
    const secondPromise = session.commands.generateAiSurface({
      surface: "incident-framing",
      subjectId,
      payload: { ...payload },
      triggerSource: "dev-menu",
    });

    let secondSettled = false;
    void secondPromise.then(() => {
      secondSettled = true;
    });

    await Promise.resolve();

    expect(secondSettled).toBe(false);
    expect(vi.mocked(localAiClient.generate)).toHaveBeenCalledTimes(1);

    resolveGenerate?.({
      surface: "incident-framing",
      subjectId,
      payloadVersion: 1,
      output: {
        title: "Resolved",
        briefing: "Structured detail",
        choices: [],
      },
      runtimeKind: "ollama",
      modelId: "gemma4:26b",
      generatedAt: 1,
    });

    const [first, second] = await Promise.all([firstPromise, secondPromise]);

    expect(first.status).toBe("succeeded");
    expect(second).toBe(first);
    expect(session.ai.requests.get(`incident-framing:${subjectId}`)).toBe(first);
  });

  it("generates structured operator identity packets", async () => {
    vi.mocked(localAiClient.generate).mockResolvedValue({
      surface: "operator-identity",
      subjectId: "candidate/test",
      payloadVersion: 3,
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
          recoveryBias: 38,
          socialBias: 47,
          trainingBias: 58,
          comfortBias: 42,
          preferredMissionTags: ["mission:retrieval", "objective:escort"],
        },
        personaSummary:
          "Reads like a quick-moving scout who stays practical when the room gets loud.",
        personaHooks: [
          "Treats delays like a solvable routing problem.",
          "More direct in private than in a crowded room.",
        ],
      },
      runtimeKind: "ollama",
      modelId: "gemma4:26b",
      generatedAt: 1,
    });

    const session = await resolveRuntimeSession({ mode: "preview" });

    const record = await session.commands.generateAiSurface({
      surface: "operator-identity",
      subjectId: "candidate/test",
      payload: {
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
            { id: "outfit-overlay/stealth-cloak", tags: ["cloak", "stealth"], rarity: "common" },
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
          appearance: { presetId: "mira-002" },
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
      triggerSource: "dev-menu",
    });

    expect(record.status).toBe("succeeded");
    expect(record.result?.output).toEqual({
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
        recoveryBias: 38,
        socialBias: 47,
        trainingBias: 58,
        comfortBias: 42,
        preferredMissionTags: ["mission:retrieval", "objective:escort"],
      },
      personaSummary:
        "Reads like a quick-moving scout who stays practical when the room gets loud.",
      personaHooks: [
        "Treats delays like a solvable routing problem.",
        "More direct in private than in a crowded room.",
      ],
    });
    expect(vi.mocked(localAiClient.generate)).toHaveBeenCalledTimes(1);
  });

  it("generates visitor identity asynchronously and preserves it on recruit acceptance", async () => {
    vi.mocked(readGameSettings).mockReturnValue({
      audio: {
        sfxVolumeDb: -6,
        musicVolumeDb: -12,
      },
      wakeLockEnabled: true,
      tutorialEventsEnabled: true,
      ai: {
        enabled: true,
        runtimeKind: "ollama",
        baseUrl: "http://127.0.0.1:11434/v1",
        modelId: "gemma4:26b",
      },
    });
    vi.mocked(localAiClient.generate).mockImplementation(async (request) => {
      if (request.surface !== "operator-identity") {
        throw new Error(`Unexpected surface ${request.surface}`);
      }

      return {
        surface: request.surface,
        subjectId: request.subjectId,
        payloadVersion: request.payloadVersion,
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
            riskTolerance: 66,
            rewardFocus: 69,
            recoveryBias: 34,
            socialBias: 44,
            trainingBias: 63,
            comfortBias: 39,
            preferredMissionTags: ["mission:retrieval", "objective:escort"],
          },
          personaSummary:
            "Moves like a competent scout who already knows how licensed chaos behaves.",
          personaHooks: [
            "Talks like the route matters more than the story.",
            "Keeps a private list of preventable mistakes.",
          ],
        },
        runtimeKind: request.config.runtimeKind,
        modelId: request.config.modelId,
        generatedAt: 1,
      };
    });

    const session = await resolveRuntimeSession({ mode: "preview" });
    const visitorId = session.phase1View.visitors[0]!.id;

    await waitForAssertion(() => {
      const visitor = session.phase1View.visitors.find((entry) => entry.id === visitorId);
      expect(visitor?.identitySource).toBe("generated");
      expect(visitor?.specialtyTag).toBe("focus:extraction");
      expect(visitor?.appearance?.presetId).toBe("mira-002");
      expect(visitor?.personaSummary).toContain("licensed chaos");
    });

    const beforeAccept = session.phase1View.operators.length;
    await session.commands.acceptRecruit({ visitorId });

    expect(session.phase1View.operators.length).toBe(beforeAccept + 1);
    const accepted = session.phase1View.operators.at(-1)!;
    expect(accepted.identity.specialtyTag).toBe("focus:extraction");
    expect(accepted.appearance.presetId).toBe("mira-002");
    expect(accepted.appearance.visibleGear).toEqual({
      weaponPartId: "weapon/dual-daggers",
      outfitOverlayPartId: "outfit-overlay/stealth-cloak",
      accessoryPartId: "accessory/comm-earpiece",
    });
    expect(accepted.identity.personaSummary).toContain("licensed chaos");
    expect(accepted.identity.personaHooks).toEqual([
      "Talks like the route matters more than the story.",
      "Keeps a private list of preventable mistakes.",
    ]);
  });

  it("queues visitor identity generation one at a time for local AI runtimes", async () => {
    vi.mocked(readGameSettings).mockReturnValue({
      audio: {
        sfxVolumeDb: -6,
        musicVolumeDb: -12,
      },
      wakeLockEnabled: true,
      tutorialEventsEnabled: true,
      ai: {
        enabled: true,
        runtimeKind: "ollama",
        baseUrl: "http://127.0.0.1:11434/v1",
        modelId: "gemma4:26b",
      },
    });

    const pendingRequests: Array<{
      subjectId: string;
      resolve: (value: Awaited<ReturnType<typeof localAiClient.generate>>) => void;
    }> = [];

    vi.mocked(localAiClient.generate).mockImplementation(
      (request) =>
        new Promise((resolve) => {
          pendingRequests.push({
            subjectId: request.subjectId,
            resolve: (value) => resolve(value),
          });
        }),
    );

    const session = await resolveRuntimeSession({ mode: "preview" });

    await waitForAssertion(() => {
      expect(vi.mocked(localAiClient.generate)).toHaveBeenCalledTimes(1);
      expect(pendingRequests).toHaveLength(1);
    });

    const completeRequest = (subjectId: string) => ({
      surface: "operator-identity" as const,
      subjectId,
      payloadVersion: 3,
      output: {
        specialtyTag: "focus:extraction",
        appearance: {
          presetId: "mira-002",
        },
        preferences: {
          riskTolerance: 66,
          rewardFocus: 69,
          recoveryBias: 34,
          socialBias: 44,
          trainingBias: 63,
          comfortBias: 39,
          preferredMissionTags: ["mission:retrieval", "objective:escort"],
        },
        personaSummary:
          "Moves like a competent scout who already knows how licensed chaos behaves.",
        personaHooks: [
          "Talks like the route matters more than the story.",
          "Keeps a private list of preventable mistakes.",
        ],
      },
      runtimeKind: "ollama" as const,
      modelId: "gemma4:26b",
      generatedAt: 1,
    });

    pendingRequests.shift()!.resolve(completeRequest(session.phase1View.visitors[0]!.id));

    await waitForAssertion(() => {
      expect(vi.mocked(localAiClient.generate)).toHaveBeenCalledTimes(2);
      expect(pendingRequests).toHaveLength(1);
    });

    pendingRequests.shift()!.resolve(completeRequest(session.phase1View.visitors[1]!.id));

    await waitForAssertion(() => {
      expect(vi.mocked(localAiClient.generate)).toHaveBeenCalledTimes(3);
      expect(pendingRequests).toHaveLength(1);
    });

    pendingRequests.shift()!.resolve(completeRequest(session.phase1View.visitors[2]!.id));

    await waitForAssertion(() => {
      expect(
        session.phase1View.visitors.every((visitor) => visitor.identitySource === "generated"),
      ).toBe(true);
    });
  });

  it("materializes pending incidents with generated copy when AI is enabled", async () => {
    vi.mocked(readGameSettings).mockReturnValue({
      audio: {
        sfxVolumeDb: -6,
        musicVolumeDb: -12,
      },
      wakeLockEnabled: true,
      tutorialEventsEnabled: true,
      ai: {
        enabled: true,
        runtimeKind: "ollama",
        baseUrl: "http://127.0.0.1:11434/v1",
        modelId: "gemma4:26b",
      },
    });
    vi.mocked(localAiClient.generate).mockResolvedValue({
      surface: "incident-framing",
      subjectId: "incident-1",
      payloadVersion: 3,
      output: {
        title: "Dock Discipline Notice",
        briefing:
          "A delivery snafu turned into a room-wide argument before anyone finished coffee. The paperwork is thin, the tempers are not, and now management has to look like it planned for this.",
        choices: [
          {
            choiceId: "mediate",
            label: "Pull Them In",
            description: "Get the principals in a room and settle it before the shift curdles.",
            consequenceSummary: "Morale recovers a little and nobody feels publicly humiliated.",
            resolutionSummary:
              "The meeting stayed awkward, but the room stopped orbiting the argument.",
          },
          {
            choiceId: "side_with_a",
            label: "Back the Senior",
            description:
              "Side with the experienced operator and force the chain of command to hold.",
            consequenceSummary: "One operator feels protected; the other leaves angry.",
            resolutionSummary:
              "The hierarchy held, but the slight sat in the room long after the conversation ended.",
          },
          {
            choiceId: "ignore",
            label: "File It",
            description: "Log the issue and keep the day moving.",
            consequenceSummary: "Nothing costs cash, but the tension lingers.",
            resolutionSummary:
              "Nobody exploded, but the unresolved edge kept following them through the rest of the shift.",
          },
        ],
      },
      runtimeKind: "ollama",
      modelId: "gemma4:26b",
      generatedAt: 1,
    });

    const session = await resolveRuntimeSession({ mode: "preview" });
    await deferredSimulationSystemsReady;
    const [firstOperator, secondOperator] = session.phase1View.operators;
    session.simulation.runtimeState.incidentState.pendingIncident = {
      instanceId: "incident-1",
      templateId: "incident/personnel-friction",
      templateName: "Personnel Friction Report",
      category: "personnel_conflict",
      tags: ["conflict", "morale"],
      triggerFamily: "operator_conflict",
      boundContext: {
        operatorIds: [firstOperator.id, secondOperator.id],
      },
      choices: [
        {
          choiceId: "mediate",
          label: "Mediate Directly",
          description: "Sit both operators down and work through the friction point.",
          consequenceSummary: "Minor morale boost for both, slight loyalty increase.",
          effects: [
            { kind: "morale_delta", targetRef: "subject_a", value: 5 },
            { kind: "morale_delta", targetRef: "subject_b", value: 5 },
            { kind: "loyalty_delta", targetRef: "subject_a", value: 3 },
            { kind: "loyalty_delta", targetRef: "subject_b", value: 3 },
          ],
        },
        {
          choiceId: "side_with_a",
          label: "Back the Senior Operator",
          description: "Support the more experienced party to maintain chain of command.",
          consequenceSummary: "Loyalty boost for one, morale hit for the other.",
          effects: [
            { kind: "loyalty_delta", targetRef: "subject_a", value: 8 },
            { kind: "morale_delta", targetRef: "subject_b", value: -6 },
          ],
        },
        {
          choiceId: "ignore",
          label: "File and Move On",
          description: "Document the incident and let them sort it out.",
          consequenceSummary: "No immediate cost, but unresolved tension persists.",
          effects: [
            { kind: "morale_delta", targetRef: "subject_a", value: -2 },
            { kind: "morale_delta", targetRef: "subject_b", value: -2 },
          ],
        },
      ],
      presenterId: undefined,
      presenterExpression: undefined,
      createdAtMinute: 600,
    };
    await session.commands.tick(0);

    await waitForAssertion(() => {
      expect(session.phase1View.activeInterruption?.payload.kind).toBe("incident");
      expect(session.phase1View.activeInterruption?.payload.copySource).toBe("generated");
      expect(session.phase1View.activeInterruption?.payload.title).toBe("Dock Discipline Notice");
    });
  });

  it("falls back to authored copy when AI is disabled", async () => {
    vi.mocked(readGameSettings).mockReturnValue({
      audio: {
        sfxVolumeDb: -6,
        musicVolumeDb: -12,
      },
      wakeLockEnabled: true,
      tutorialEventsEnabled: true,
      ai: {
        enabled: false,
        runtimeKind: "ollama",
        baseUrl: "http://127.0.0.1:11434/v1",
        modelId: "gemma4:26b",
      },
    });

    const session = await resolveRuntimeSession({ mode: "preview" });
    await deferredSimulationSystemsReady;
    const [firstOperator, secondOperator] = session.phase1View.operators;
    session.simulation.runtimeState.incidentState.pendingIncident = {
      instanceId: "incident-authored-1",
      templateId: "incident/personnel-friction",
      templateName: "Personnel Friction Report",
      category: "personnel_conflict",
      tags: ["conflict", "morale"],
      triggerFamily: "operator_conflict",
      boundContext: {
        operatorIds: [firstOperator.id, secondOperator.id],
      },
      choices: [
        {
          choiceId: "mediate",
          label: "Mediate Directly",
          description: "Sit both operators down and work through the friction point.",
          consequenceSummary: "Minor morale boost for both, slight loyalty increase.",
          effects: [
            { kind: "morale_delta", targetRef: "subject_a", value: 5 },
            { kind: "morale_delta", targetRef: "subject_b", value: 5 },
            { kind: "loyalty_delta", targetRef: "subject_a", value: 3 },
            { kind: "loyalty_delta", targetRef: "subject_b", value: 3 },
          ],
        },
        {
          choiceId: "side_with_a",
          label: "Back the Senior Operator",
          description: "Support the more experienced party to maintain chain of command.",
          consequenceSummary: "Loyalty boost for one, morale hit for the other.",
          effects: [
            { kind: "loyalty_delta", targetRef: "subject_a", value: 8 },
            { kind: "morale_delta", targetRef: "subject_b", value: -6 },
          ],
        },
        {
          choiceId: "ignore",
          label: "File and Move On",
          description: "Document the incident and let them sort it out.",
          consequenceSummary: "No immediate cost, but unresolved tension persists.",
          effects: [
            { kind: "morale_delta", targetRef: "subject_a", value: -2 },
            { kind: "morale_delta", targetRef: "subject_b", value: -2 },
          ],
        },
      ],
      presenterId: undefined,
      presenterExpression: undefined,
      createdAtMinute: 600,
    };
    await session.commands.tick(0);

    await waitForAssertion(() => {
      expect(session.phase1View.activeInterruption?.payload.kind).toBe("incident");
      expect(session.phase1View.activeInterruption?.payload.copySource).toBe("authored");
    });

    expect(vi.mocked(localAiClient.generate)).not.toHaveBeenCalled();
  });
});

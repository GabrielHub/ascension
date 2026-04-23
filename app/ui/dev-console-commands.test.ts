import { afterEach, describe, expect, it, vi } from "vitest";

import { templateRegistry } from "content/templates";
import { saveStorage } from "save";

import {
  executeConsoleCommand,
  getCommandRegistry,
  parseCommand,
  type DevConsoleContext,
} from "./dev-console-commands";

function createContext(): DevConsoleContext {
  const dispatch = vi.fn(() => Promise.resolve());
  const stopAutoTick = vi.fn();
  const startAutoTick = vi.fn();
  const setActiveFloor = vi.fn(() => Promise.resolve());
  const probeAiRuntime = vi.fn(() => Promise.resolve());
  const generateAiSurface = vi.fn(() => Promise.resolve());
  const regenerateAiSurface = vi.fn(() => Promise.resolve());

  return {
    session: {
      mode: "preview",
      isPreview: true,
      slotId: undefined,
      ai: {
        connectionStatus: "unknown",
        lastProbe: null,
        requests: new Map(),
      },
      registry: templateRegistry,
      commands: {
        dispatch,
        tick: vi.fn(() => Promise.resolve()),
        initiateRelocation: vi.fn(() => Promise.resolve()),
        placeRoom: vi.fn(() => Promise.resolve()),
        setActiveFloor,
        setPolicy: vi.fn(() => Promise.resolve()),
        setLootFilter: vi.fn(() => Promise.resolve()),
        purchaseBuildingUpgrade: vi.fn(() => Promise.resolve()),
        purchaseRoomUpgrade: vi.fn(() => Promise.resolve()),
        acceptRecruit: vi.fn(() => Promise.resolve()),
        deferRecruit: vi.fn(() => Promise.resolve()),
        rejectRecruit: vi.fn(() => Promise.resolve()),
        replaceRecruit: vi.fn(() => Promise.resolve()),
        dismissRecruit: vi.fn(() => Promise.resolve()),
        buyItem: vi.fn(() => Promise.resolve()),
        sellItem: vi.fn(() => Promise.resolve()),
        equipItem: vi.fn(() => Promise.resolve()),
        autoAssignAccessory: vi.fn(() => Promise.resolve()),
        unequipItem: vi.fn(() => Promise.resolve()),
        prepConsumable: vi.fn(() => Promise.resolve()),
        craftDurable: vi.fn(() => Promise.resolve()),
        probeAiRuntime,
        generateAiSurface,
        regenerateAiSurface,
      },
      lifecycle: {
        startAutoTick,
        stopAutoTick,
      },
      phase1View: {
        identity: { guildName: "Testing Guild", playerName: "Test" },
        clock: { day: 2, minuteOfDay: 600 },
        resources: { cash: 500, reputation: 10, intel: 25 },
        building: {
          activeBuildingId: "building/bodega",
          activeBuildingName: "Bodega HQ",
          tier: 1,
          activeFloorIndex: 0,
          floorCount: 2,
          roomSlotCount: 4,
          operatorSlotCount: 3,
        },
        rooms: [
          {
            id: "room/gym-1",
            name: "The Gym",
            templateId: "room/gym:tier_1",
            floorIndex: 1,
            occupancy: 1,
            capacity: 3,
            isOperational: true,
          },
        ],
        visitors: [{ id: "visitor/rose", name: "Rose Vega", desiredRoleTag: "role:scout" }],
        postedContracts: [{ postingId: "posting/1", siteConceptName: "Slipyard" }],
        contractLifecycle: "bidding",
        activeInterruption: null,
        encounter: null,
        relationshipSignals: [
          {
            operatorAId: "operator/rose",
            operatorBId: "operator/milo",
            trust: 61,
            friction: 16,
            familiarity: 44,
            recentSharedOutcome: 8,
            historyTags: ["history:starting_roster", "bond:field_pair"],
            cohesion: 45,
          },
        ],
        operators: [
          {
            id: "operator/rose",
            identity: {
              name: "Rose Vega",
              roleTag: "role:scout",
              specialtyTag: "focus:extraction",
            },
            combat: {
              attunementTag: "attunement:void",
              rank: "f",
              traits: ["trait:alert", "trait:evasive"],
              combatPackageId: "package/scout/void/standard",
              blocks: 0,
              baseStats: {
                strength: 7,
                speed: 14,
                endurance: 8,
                resilience: 7,
                perception: 13,
                intelligence: 9,
              },
            },
            morale: { current: 63, baseline: 63 },
            loyalty: { current: 58, baseline: 58 },
            needs: { stress: 14, fatigue: 22, hunger: 15 },
            injury: { severity: 0, recoveryHoursRemaining: 0, treated: false },
            preferences: {
              riskTolerance: 61,
              rewardFocus: 71,
              recoveryBias: 42,
              socialBias: 46,
              trainingBias: 54,
              comfortBias: 48,
              preferredMissionTags: ["mission:retrieval", "objective:escort"],
              preferredPartnerIds: ["operator/milo"],
            },
            lifecycle: { status: "active" },
          },
          {
            id: "operator/milo",
            identity: {
              name: "Milo Hart",
              roleTag: "role:field_lead",
              specialtyTag: "focus:containment",
            },
            combat: {
              attunementTag: "attunement:kinetic",
              rank: "f",
              traits: ["trait:steady", "trait:resolute"],
              combatPackageId: "package/field-lead/kinetic/standard",
              blocks: 0,
              baseStats: {
                strength: 14,
                speed: 8,
                endurance: 13,
                resilience: 10,
                perception: 7,
                intelligence: 8,
              },
            },
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
              preferredPartnerIds: ["operator/rose"],
            },
            lifecycle: { status: "active" },
          },
        ],
      },
      state: {
        hqWorldSnapshot: null,
      },
      worldSnapshot: {
        activeRaidPackets: [],
      },
    } as unknown as DevConsoleContext["session"],
    debugOverlays: {
      showRoomBounds: false,
      showFootprints: false,
      showAnchors: false,
      showPointerCoords: false,
    },
    setDebugOverlays: vi.fn(),
    eventLogEntries: [],
  };
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("dev console commands", () => {
  it("parses subcommands and quoted arguments deterministically", () => {
    const parsed = parseCommand('/room place "room/gym:tier_1" "slot/gym" 2');

    expect(parsed?.command.name).toBe("room place");
    expect(parsed?.args).toEqual(["room/gym:tier_1", "slot/gym", "2"]);
  });

  it("lists a specific command family from the shared registry", () => {
    const result = executeConsoleCommand("/list resources", createContext());

    expect(result.status).toBe("info");
    expect(result.message).toBe("Resources commands");
    expect(result.detail).toContain("/cash <amount>");
    expect(result.detail).toContain("/resource <cash|rep|intel> <amount>");
  });

  it("returns a clear error for unknown command families", () => {
    const result = executeConsoleCommand("/list ghosts", createContext());

    expect(result.status).toBe("error");
    expect(result.message).toContain("Unknown family: ghosts");
  });

  it("dispatches day jumps through the explicit dev day command", () => {
    const ctx = createContext();
    const result = executeConsoleCommand("/day 5", ctx);

    expect(result.status).toBe("ok");
    expect(result.message).toBe("Day set to 5");
    expect(ctx.session.commands.dispatch).toHaveBeenCalledWith({
      type: "sim/dev-set-day",
      day: 5,
    });
  });

  it("resolves relative cash adjustments against the current resource value", () => {
    const ctx = createContext();
    const result = executeConsoleCommand("/cash +1000", ctx);

    expect(result.status).toBe("ok");
    expect(result.message).toBe("Cash set to 1500");
    expect(ctx.session.commands.dispatch).toHaveBeenCalledWith({
      type: "sim/dev-set-resource",
      resourceId: "resource/cash",
      amount: 1500,
    });
  });

  it("keeps the shipped /list command discoverable through the registry", () => {
    expect(getCommandRegistry().some((command) => command.name === "list")).toBe(true);
  });

  it("seeds a Porter's campaign save into an explicit slot", async () => {
    const writeSaveGame = vi.spyOn(saveStorage, "writeSaveGame").mockResolvedValue();
    const locationAssign = vi.fn();
    vi.stubGlobal("location", { assign: locationAssign });

    const result = executeConsoleCommand("/seed porters slot/2", createContext());
    await Promise.resolve();
    await Promise.resolve();

    expect(result.status).toBe("ok");
    expect(result.message).toContain("slot/2");
    expect(writeSaveGame).toHaveBeenCalledTimes(1);
    expect(writeSaveGame.mock.calls[0]?.[0].slotId).toBe("slot/2");
    expect(writeSaveGame.mock.calls[0]?.[0].metadata.guildName).toBe("Testing Guild");
    expect(writeSaveGame.mock.calls[0]?.[0].metadata.playerName).toBe("Test");
    expect(locationAssign).toHaveBeenCalledWith("/game?mode=load&slot=slot%2F2");
  });

  it("starts a forced encounter for a specific boss", () => {
    const ctx = createContext();

    const result = executeConsoleCommand("/encounter force-boss boss/the-yardmaster", ctx);

    expect(result.status).toBe("ok");
    expect(result.message).toContain("boss/the-yardmaster");
    expect(ctx.session.commands.dispatch).toHaveBeenCalledWith({
      type: "sim/encounter-start",
      activeRaidId: "dev-forced-raid",
      contractSiteId: "dev-forced-site",
      missionId: "mission/clearance",
      teamId: "dev-forced-team",
      operatorIds: [],
      bossId: "boss/the-yardmaster",
    });
  });

  it("starts a forced encounter from a specific site concept", () => {
    const ctx = createContext();

    const result = executeConsoleCommand("/encounter force-site site/collapsed-customs-house", ctx);

    expect(result.status).toBe("ok");
    expect(result.message).toContain("Collapsed Customs House");
    expect(ctx.session.commands.dispatch).toHaveBeenCalledWith({
      type: "sim/encounter-start",
      activeRaidId: "dev-forced-raid",
      contractSiteId: "site/collapsed-customs-house",
      missionId: "mission/clearance",
      teamId: "dev-forced-team",
      operatorIds: [],
      bossId: "boss/the-excise-officer",
    });
  });

  it("starts a replay encounter using the provided seed context", () => {
    const ctx = createContext();

    const result = executeConsoleCommand("/encounter replay-seed 4242 boss/the-regulator", ctx);

    expect(result.status).toBe("ok");
    expect(result.message).toContain("raid=4242");
    expect(ctx.session.commands.dispatch).toHaveBeenCalledWith({
      type: "sim/encounter-start",
      activeRaidId: "dev-replay-4242",
      contractSiteId: "dev-replay-site",
      missionId: "mission/clearance",
      teamId: "dev-replay-team",
      operatorIds: [],
      bossId: "boss/the-regulator",
    });
  });

  it("rejects invalid seed slots before scheduling a save", () => {
    const writeSaveGame = vi.spyOn(saveStorage, "writeSaveGame").mockResolvedValue();

    const result = executeConsoleCommand("/seed porters slot/99", createContext());

    expect(result.status).toBe("error");
    expect(result.message).toContain("Invalid slot: slot/99");
    expect(writeSaveGame).not.toHaveBeenCalled();
  });

  it("uses the recorded payload when regenerating an AI request", () => {
    const ctx = createContext();
    (ctx.session.ai.requests as Map<string, unknown>).set("incident-framing:test", {
      requestKey: "incident-framing:test",
      subjectId: "test",
      surface: "incident-framing",
      triggerSource: "dev-menu",
      status: "succeeded",
      runtimeKind: "ollama",
      baseUrl: "http://127.0.0.1:11434/v1",
      modelId: "gemma4:e4b",
      payload: { incidentId: "incident/test", incidentKind: "morale-drop" },
      payloadFingerprint: '{"incidentId":"incident/test","incidentKind":"morale-drop"}',
      payloadVersion: 1,
      startedAt: 1,
      finishedAt: 2,
      progress: null,
      result: null,
      error: null,
    });

    const result = executeConsoleCommand("/ai regenerate incident-framing:test", ctx);

    expect(result.status).toBe("ok");
    expect(ctx.session.commands.regenerateAiSurface).toHaveBeenCalledWith({
      surface: "incident-framing",
      subjectId: "test",
      payload: { incidentId: "incident/test", incidentKind: "morale-drop" },
      triggerSource: "dev-menu",
    });
  });

  it("builds an operator identity request from the first visitor", () => {
    const ctx = createContext();

    const result = executeConsoleCommand("/ai generate operator-identity", ctx);

    expect(result.status).toBe("ok");
    expect(result.message).toContain("Generating operator-identity");
    expect(ctx.session.commands.generateAiSurface).toHaveBeenCalledWith(
      expect.objectContaining({
        surface: "operator-identity",
        subjectId: "visitor/rose",
        triggerSource: "dev-menu",
        payload: expect.objectContaining({
          candidateId: "visitor/rose",
          roleTag: "role:scout",
          allowedSpecialtyTags: expect.arrayContaining(["focus:scout", "focus:extraction"]),
          allowedRecipes: expect.any(Array),
        }),
      }),
    );
  });
});

import { describe, expect, it, vi } from "vitest";

import type { RuntimeSession } from "app/features/runtime";

import {
  buildGameCallbacks,
  getDefaultShellNavigation,
  isFocusedGuidanceBeatSuspended,
  isTutorialSuppressibleGuidanceBeat,
  resolveInterruptionAction,
} from "./game-shell";

function createBossCommitmentInterruption(sourceSystem = "raid-system") {
  return {
    instanceId: "interruption-1",
    type: "raid_boss_commitment" as const,
    priority: 90,
    blockingMode: "blocking" as const,
    createdAtMinute: 120,
    sourceSystem,
    dismissible: false,
    persistence: "persistent" as const,
    payload: {
      kind: "raid_boss_commitment" as const,
      activeRaidId: "raid/1",
      contractSiteId: "site/1",
      missionId: "mission/1",
      teamId: "team/1",
      operatorIds: ["operator/a", "operator/b", "operator/c"],
      bossId: "boss/the-dispatcher",
      bossName: "The Dispatcher",
      bossRank: "f",
      stakeSummary: "Rank F boss encounter. 3 operators committed.",
      teamConditionSummary: "Team is in operational condition.",
    },
  };
}

function createSession(dispatch: ReturnType<typeof vi.fn>): Pick<RuntimeSession, "commands"> {
  return { commands: { dispatch } } as unknown as Pick<RuntimeSession, "commands">;
}

describe("resolveInterruptionAction", () => {
  it("resolves boss commitment through the simulation-owned interruption path", async () => {
    const dispatch = vi.fn().mockResolvedValue(undefined);

    await resolveInterruptionAction(
      createSession(dispatch),
      createBossCommitmentInterruption(),
      "interruption-1",
      "commit",
      false,
    );

    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(dispatch).toHaveBeenNthCalledWith(1, {
      type: "sim/interruption-resolve",
      instanceId: "interruption-1",
      choiceId: "commit",
    });
  });

  it("pauses dev-triggered boss encounters after starting them", async () => {
    const dispatch = vi.fn().mockResolvedValue(undefined);

    await resolveInterruptionAction(
      createSession(dispatch),
      createBossCommitmentInterruption("dev-menu"),
      "interruption-1",
      "commit",
      true,
    );

    expect(dispatch).toHaveBeenCalledTimes(2);
    expect(dispatch).toHaveBeenNthCalledWith(2, {
      type: "sim/encounter-pause",
    });
  });

  it("falls back to a plain resolve for non-commit choices", async () => {
    const dispatch = vi.fn().mockResolvedValue(undefined);

    await resolveInterruptionAction(
      createSession(dispatch),
      createBossCommitmentInterruption(),
      "interruption-1",
      "retreat",
      false,
    );

    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(dispatch).toHaveBeenCalledWith({
      type: "sim/interruption-resolve",
      instanceId: "interruption-1",
      choiceId: "retreat",
    });
  });
});

describe("getDefaultShellNavigation", () => {
  it("opens preview sessions on the HQ rooms panel", () => {
    expect(getDefaultShellNavigation({ mode: "preview" })).toEqual({
      activeTab: "hq",
      hqCategory: "rooms",
      opsCategory: "contract",
    });
  });

  it("opens slot-backed sessions on the contract board", () => {
    expect(getDefaultShellNavigation({ mode: "new", slotId: "slot/1" })).toEqual({
      activeTab: "operations",
      hqCategory: "rooms",
      opsCategory: "contract",
    });
    expect(getDefaultShellNavigation({ mode: "load", slotId: "slot/2" })).toEqual({
      activeTab: "operations",
      hqCategory: "rooms",
      opsCategory: "contract",
    });
  });
});

describe("buildGameCallbacks", () => {
  it("routes policy changes through the runtime command surface", () => {
    const setPolicy = vi.fn();
    const callbacks = buildGameCallbacks({
      commands: {
        tick: vi.fn(),
        initiateRelocation: vi.fn(),
        setRoomActive: vi.fn(),
        setPolicy,
        setLootFilter: vi.fn(),
        purchaseBuildingUpgrade: vi.fn(),
        purchaseRoomUpgrade: vi.fn(),
        acceptRecruit: vi.fn(),
        deferRecruit: vi.fn(),
        rejectRecruit: vi.fn(),
        replaceRecruit: vi.fn(),
        dismissRecruit: vi.fn(),
        hireStaff: vi.fn(),
        assignStaff: vi.fn(),
        placeRoom: vi.fn(),
        setActiveFloor: vi.fn(),
        buyItem: vi.fn(),
        sellItem: vi.fn(),
        equipItem: vi.fn(),
        autoAssignAccessory: vi.fn(),
        unequipItem: vi.fn(),
        dispatch: vi.fn(),
      },
    } as unknown as Pick<RuntimeSession, "commands">);

    callbacks?.setPolicy("objectiveBias", "boss_rush");

    expect(setPolicy).toHaveBeenCalledWith({
      policyId: "objectiveBias",
      value: "boss_rush",
    });
  });
});

describe("isTutorialSuppressibleGuidanceBeat", () => {
  it("suppresses instructional beats when tutorials are disabled", () => {
    expect(
      isTutorialSuppressibleGuidanceBeat({
        completionKind: "acknowledged",
      }),
    ).toBe(true);
    expect(
      isTutorialSuppressibleGuidanceBeat({
        completionKind: "market_opened",
      }),
    ).toBe(true);
  });

  it("preserves managerial guidance beats when tutorials are disabled", () => {
    expect(
      isTutorialSuppressibleGuidanceBeat({
        completionKind: "incident_resolved",
      }),
    ).toBe(false);
    expect(
      isTutorialSuppressibleGuidanceBeat({
        completionKind: "boss_commitment_resolved",
      }),
    ).toBe(false);
  });
});

describe("isFocusedGuidanceBeatSuspended", () => {
  it("suspends focused guidance while an encounter surface is active", () => {
    expect(isFocusedGuidanceBeatSuspended({ deliveryMode: "focused" }, null, true)).toBe(true);
  });

  it("suspends focused guidance under non-guidance interruptions", () => {
    expect(
      isFocusedGuidanceBeatSuspended(
        { deliveryMode: "focused" },
        createBossCommitmentInterruption(),
        false,
      ),
    ).toBe(true);
  });

  it("keeps blocking beats and empty state out of the suspension path", () => {
    expect(isFocusedGuidanceBeatSuspended({ deliveryMode: "blocking" }, null, true)).toBe(false);
    expect(isFocusedGuidanceBeatSuspended(null, createBossCommitmentInterruption(), true)).toBe(
      false,
    );
  });
});

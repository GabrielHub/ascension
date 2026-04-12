import { addEntity, createWorld } from "bitecs";
import { describe, it, expect } from "vitest";
import { templateRegistry } from "content/templates";
import {
  createDefaultCityState,
  cityStateToSnapshot,
  cityStateFromSnapshot,
} from "../components/city-state";
import {
  applyCityPressureOutcome,
  computeCityContractModifiers,
  emitCityPressureEvents,
  selectDistrictForConcept,
  selectSponsorFaction,
  tickCityPressureDecay,
} from "./city-pressure";
import type { SimSystemContext } from "./types";

function createEventContext(): SimSystemContext {
  const world = createWorld();

  return {
    world,
    registry: templateRegistry,
    singletonEntities: {
      guild: addEntity(world),
      time: addEntity(world),
      building: addEntity(world),
    },
    runtimeState: {
      roomEntities: [],
      operatorEntities: [],
      raidOpportunityEntities: [],
      staffEntities: [],
      visitorEntities: [],
      eventEntities: [],
      dispositionEntities: [],
      notableTieEntities: [],
      recurringTeamEntities: [],
      roomCultureEntities: [],
      inventoryEntities: [],
      equipmentEntities: [],
      nextRoomSequence: 1,
      nextOperatorSequence: 1,
      nextOpportunitySequence: 1,
      nextStaffSequence: 1,
      nextVisitorSequence: 1,
      nextRaidSequence: 1,
      nextEventSequence: 1,
      nextTeamSequence: 1,
      pendingCueIds: [],
      pendingEvents: [],
      raidPresentation: {
        contractSiteId: null,
        teams: [],
        enemies: [],
        features: [],
      },
      activeEncounter: null,
      interruptionQueue: { active: null, queue: [], nextInstanceId: 1 },
      incidentState: {
        pendingIncident: null,
        history: [],
        cooldowns: {},
        nextInstanceId: 1,
        lastEvaluationMinute: 0,
        pressureModifier: 0,
      },
      guidanceState: {
        seenBeatIds: [],
        completedBeatIds: [],
        dismissedBeatIds: [],
        activeBeatId: null,
        activeBeatView: null,
        queuedBeatIds: [],
        lastEvaluationMinute: 0,
        openingPathState: "completed",
        anchorResolutionFailures: [],
        activeBeatProgressBaseline: null,
        interactionCounts: {
          staffingActions: 0,
          upgradesPurchased: 0,
        },
        lastPurchasedUpgradeId: null,
      },
      kitRegistry: {
        regularAttacks: [],
        skills: [],
        ultimates: [],
        passives: [],
        regularAttackById: new Map(),
        skillById: new Map(),
        ultimateById: new Map(),
        passiveById: new Map(),
      },
      worldTimeFrozen: false,
      deferIncidentPresentation: false,
      cityState: createDefaultCityState(),
    },
  };
}

describe("city-pressure", () => {
  // ── Round-trip ────────────────────────────────────────────────────────

  describe("save/load round-trip", () => {
    it("round-trips default city state through snapshot", () => {
      const state = createDefaultCityState();
      const snapshot = cityStateToSnapshot(state);
      const restored = cityStateFromSnapshot(snapshot);

      expect(Object.keys(restored.districts)).toHaveLength(5);
      expect(Object.keys(restored.factions)).toHaveLength(5);
      expect(restored.districts["district/lower-east-side"].trust).toBe(50);
      expect(restored.factions["faction/city-licensing"].standing).toBe(0);
    });

    it("preserves mutated state through round-trip", () => {
      const state = createDefaultCityState();
      state.districts["district/bronx-overpass"].attention = 45;
      state.districts["district/bronx-overpass"].trust = 22;
      state.factions["faction/labor-safety"].scrutiny = 67;
      state.factions["faction/rival-guild-market"].leverage = 33;

      const snapshot = cityStateToSnapshot(state);
      const restored = cityStateFromSnapshot(snapshot);

      expect(restored.districts["district/bronx-overpass"].attention).toBe(45);
      expect(restored.districts["district/bronx-overpass"].trust).toBe(22);
      expect(restored.factions["faction/labor-safety"].scrutiny).toBe(67);
      expect(restored.factions["faction/rival-guild-market"].leverage).toBe(33);
    });
  });

  // ── Contract generation helpers ───────────────────────────────────────

  describe("contract generation", () => {
    it("selects a district from the concept's pool", () => {
      const concept = { districtPool: ["district/lower-east-side", "district/harlem-substation"] };
      const result = selectDistrictForConcept(concept, 0);
      expect(concept.districtPool).toContain(result);
    });

    it("returns default district when pool is empty", () => {
      const result = selectDistrictForConcept({ districtPool: [] }, 42);
      expect(result).toBe("district/lower-east-side");
    });

    it("selects a sponsor faction from the district's primary factions", () => {
      const result = selectSponsorFaction("district/lower-east-side", 0);
      expect(["faction/city-licensing", "faction/labor-safety"]).toContain(result);
    });

    it("returns default faction for unknown district", () => {
      const result = selectSponsorFaction("district/nonexistent", 0);
      expect(result).toBe("faction/city-licensing");
    });
  });

  // ── City contract modifiers ───────────────────────────────────────────

  describe("city contract modifiers", () => {
    it("returns neutral modifiers for default city state", () => {
      const state = createDefaultCityState();
      const mods = computeCityContractModifiers(
        state,
        "district/lower-east-side",
        "faction/city-licensing",
      );
      expect(mods.rewardMultiplier).toBe(1.0);
      expect(mods.riskMultiplier).toBe(1.0);
      expect(mods.minReputationOffset).toBe(0);
      expect(mods.pressureTags).toHaveLength(0);
    });

    it("raises reward and risk for high-attention districts", () => {
      const state = createDefaultCityState();
      state.districts["district/lower-east-side"].attention = 50;
      const mods = computeCityContractModifiers(
        state,
        "district/lower-east-side",
        "faction/city-licensing",
      );
      expect(mods.rewardMultiplier).toBeGreaterThan(1.0);
      expect(mods.riskMultiplier).toBeGreaterThan(1.0);
      expect(mods.pressureTags).toContain("pressure:high-attention");
    });

    it("raises min reputation for low-trust districts", () => {
      const state = createDefaultCityState();
      state.districts["district/lower-east-side"].trust = 20;
      const mods = computeCityContractModifiers(
        state,
        "district/lower-east-side",
        "faction/city-licensing",
      );
      expect(mods.minReputationOffset).toBeGreaterThan(0);
      expect(mods.pressureTags).toContain("pressure:low-trust");
    });

    it("raises risk for high faction scrutiny", () => {
      const state = createDefaultCityState();
      state.factions["faction/city-licensing"].scrutiny = 50;
      const mods = computeCityContractModifiers(
        state,
        "district/lower-east-side",
        "faction/city-licensing",
      );
      expect(mods.riskMultiplier).toBeGreaterThan(1.0);
      expect(mods.pressureTags).toContain("pressure:faction-scrutiny");
    });
  });

  // ── Contract-result writeback ─────────────────────────────────────────

  describe("contract-result writeback", () => {
    it("boss_defeated raises trust, lowers attention and debt, raises sponsor standing", () => {
      const state = createDefaultCityState();
      const prevTrust = state.districts["district/lower-east-side"].trust;
      const prevAttention = state.districts["district/lower-east-side"].attention;
      const prevStanding = state.factions["faction/city-licensing"].standing;

      applyCityPressureOutcome(
        state,
        "district/lower-east-side",
        "faction/city-licensing",
        "boss_defeated",
        100,
      );

      expect(state.districts["district/lower-east-side"].trust).toBeGreaterThan(prevTrust);
      expect(state.districts["district/lower-east-side"].attention).toBeLessThanOrEqual(
        prevAttention,
      );
      expect(state.factions["faction/city-licensing"].standing).toBeGreaterThan(prevStanding);
    });

    it("contract_lost erodes trust, spikes attention and debt, raises EM scrutiny", () => {
      const state = createDefaultCityState();
      const prevTrust = state.districts["district/bronx-overpass"].trust;

      applyCityPressureOutcome(
        state,
        "district/bronx-overpass",
        "faction/emergency-management",
        "contract_lost",
        200,
      );

      expect(state.districts["district/bronx-overpass"].trust).toBeLessThan(prevTrust);
      expect(state.districts["district/bronx-overpass"].attention).toBeGreaterThan(0);
      expect(state.districts["district/bronx-overpass"].containmentDebt).toBeGreaterThan(0);
      expect(state.factions["faction/emergency-management"].scrutiny).toBeGreaterThan(0);
    });

    it("operator_death raises labor-safety scrutiny and rival leverage", () => {
      const state = createDefaultCityState();

      applyCityPressureOutcome(
        state,
        "district/lower-east-side",
        "faction/labor-safety",
        "operator_death",
        300,
      );

      expect(state.factions["faction/labor-safety"].scrutiny).toBe(8);
      expect(state.factions["faction/rival-guild-market"].leverage).toBe(4);
      expect(state.districts["district/lower-east-side"].attention).toBe(5);
    });

    it("mixed outcome raises attention and debt, lowers sponsor standing", () => {
      const state = createDefaultCityState();

      applyCityPressureOutcome(
        state,
        "district/red-hook-waterfront",
        "faction/borough-contracts",
        "mixed",
        400,
      );

      expect(state.districts["district/red-hook-waterfront"].attention).toBe(4);
      expect(state.districts["district/red-hook-waterfront"].containmentDebt).toBe(5);
      expect(state.factions["faction/borough-contracts"].standing).toBe(-2);
    });

    it("clamps values to valid ranges", () => {
      const state = createDefaultCityState();
      state.districts["district/lower-east-side"].trust = 3;

      applyCityPressureOutcome(
        state,
        "district/lower-east-side",
        "faction/city-licensing",
        "contract_lost",
        500,
      );

      // trust should be clamped to 0, not go negative
      expect(state.districts["district/lower-east-side"].trust).toBe(0);
    });

    it("emits event messages for significant threshold crossings", () => {
      const state = createDefaultCityState();
      state.districts["district/lower-east-side"].containmentDebt = 48;

      const events = applyCityPressureOutcome(
        state,
        "district/lower-east-side",
        "faction/city-licensing",
        "contract_lost",
        600,
      );

      // Should emit containment debt critical event
      expect(events.some((e) => e.includes("containment debt critical"))).toBe(true);
    });

    it("emits city-pressure runtime events with the dedicated event kind", () => {
      const context = createEventContext();

      emitCityPressureEvents(context, [
        "Emergency Management scrutiny elevated",
        "Lower East Side trust improved",
      ]);

      expect(context.runtimeState.pendingEvents).toHaveLength(2);
      expect(context.runtimeState.pendingEvents[0]).toEqual(
        expect.objectContaining({
          kind: "city_pressure",
          message: "Emergency Management scrutiny elevated",
          accent: "ember",
        }),
      );
      expect(context.runtimeState.pendingEvents[1]).toEqual(
        expect.objectContaining({
          kind: "city_pressure",
          message: "Lower East Side trust improved",
          accent: "ember",
        }),
      );
    });
  });

  // ── Passive decay ─────────────────────────────────────────────────────

  describe("passive decay", () => {
    it("decays attention at an hourly rate using simulation minutes", () => {
      const state = createDefaultCityState();
      state.districts["district/lower-east-side"].attention = 20;

      tickCityPressureDecay(state, 60, 1000);

      expect(state.districts["district/lower-east-side"].attention).toBe(19.5);
    });

    it("decays scrutiny at an hourly rate using simulation minutes", () => {
      const state = createDefaultCityState();
      state.factions["faction/city-licensing"].scrutiny = 30;

      tickCityPressureDecay(state, 60, 1000);

      expect(state.factions["faction/city-licensing"].scrutiny).toBe(29.7);
    });

    it("does not decay below zero", () => {
      const state = createDefaultCityState();
      state.districts["district/lower-east-side"].attention = 0.1;

      tickCityPressureDecay(state, 60, 1000);

      expect(state.districts["district/lower-east-side"].attention).toBe(0);
    });

    it("only decays recent contract count once per inactivity window", () => {
      const state = createDefaultCityState();
      state.districts["district/lower-east-side"].recentContractCount = 2;
      state.districts["district/lower-east-side"].lastResolvedTick = 100;

      tickCityPressureDecay(state, 60, 2105);

      expect(state.districts["district/lower-east-side"].recentContractCount).toBe(1);
      expect(state.districts["district/lower-east-side"].lastResolvedTick).toBe(2100);

      tickCityPressureDecay(state, 60, 2105);

      expect(state.districts["district/lower-east-side"].recentContractCount).toBe(1);
    });
  });
});

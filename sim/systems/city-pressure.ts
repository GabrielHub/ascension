import type { CityState } from "../components/city-state";
import type { DistrictPressureSnapshot, FactionStandingSnapshot } from "save/types";
import type { DistrictTemplate, FactionTemplate } from "content/templates/shared";
import { districtTemplates } from "content/templates/districts";
import { factionTemplates } from "content/templates/factions";
import { getCurrentAbsoluteMinute, hasOperationalRoomTemplate, pushRuntimeEvent } from "./commands";
import type { SimSystemContext } from "./types";

export const SKYSCRAPER_COMPLIANCE_OFFICE_TEMPLATE_ID = "room/compliance_office:tier_1";
export const SKYSCRAPER_EXECUTIVE_OFFICE_TEMPLATE_ID = "room/executive_office:tier_1";

// Bounded so compliance alone cannot zero out regulator pressure — aggressive
// scrutiny gain still outpaces the compliance slack.
const COMPLIANCE_OFFICE_EXTRA_SCRUTINY_DECAY_PER_HOUR = 0.6;
const COMPLIANCE_OFFICE_MAX_DECAY_PER_TICK = 6;

const EXECUTIVE_OFFICE_STANDING_MULTIPLIER = 1.4;

const districtById = new Map(districtTemplates.map((d) => [d.id, d]));
const factionById = new Map(factionTemplates.map((f) => [f.id, f]));

// ── Contract outcome types used for writeback ───────────────────────────

export type CityPressureOutcome =
  | "success"
  | "boss_defeated"
  | "mixed"
  | "contract_lost"
  | "operator_death";

// ── Delta table per outcome ─────────────────────────────────────────────

interface CityDelta {
  districtTrust?: number;
  districtAttention?: number;
  containmentDebt?: number;
  sponsorStanding?: number;
  emergencyManagementScrutiny?: number;
  laborSafetyScrutiny?: number;
  boroughContractStanding?: number;
  rivalGuildLeverage?: number;
}

const OUTCOME_DELTAS: Record<CityPressureOutcome, CityDelta> = {
  success: {
    districtTrust: 4,
    districtAttention: -2,
    containmentDebt: -5,
    sponsorStanding: 3,
  },
  boss_defeated: {
    districtTrust: 8,
    districtAttention: -6,
    containmentDebt: -12,
    sponsorStanding: 6,
  },
  mixed: {
    districtAttention: 4,
    containmentDebt: 5,
    sponsorStanding: -2,
  },
  contract_lost: {
    districtTrust: -10,
    districtAttention: 12,
    containmentDebt: 14,
    emergencyManagementScrutiny: 10,
    boroughContractStanding: -8,
  },
  operator_death: {
    laborSafetyScrutiny: 8,
    districtAttention: 5,
    rivalGuildLeverage: 4,
  },
};

// ── District/faction state helpers ──────────────────────────────────────

export function getDistrictState(
  cityState: CityState,
  districtId: string,
): DistrictPressureSnapshot | undefined {
  return cityState.districts[districtId];
}

export function getFactionState(
  cityState: CityState,
  factionId: string,
): FactionStandingSnapshot | undefined {
  return cityState.factions[factionId];
}

export function lookupDistrictTemplate(districtId: string): DistrictTemplate | undefined {
  return districtById.get(districtId);
}

export function lookupFactionTemplate(factionId: string): FactionTemplate | undefined {
  return factionById.get(factionId);
}

function clampDistrict(d: DistrictPressureSnapshot): void {
  d.attention = Math.max(0, Math.min(100, d.attention));
  d.trust = Math.max(0, Math.min(100, d.trust));
  d.containmentDebt = Math.max(0, Math.min(100, d.containmentDebt));
  d.recentContractCount = Math.max(0, d.recentContractCount);
}

function clampFaction(f: FactionStandingSnapshot): void {
  f.standing = Math.max(-100, Math.min(100, f.standing));
  f.scrutiny = Math.max(0, Math.min(100, f.scrutiny));
  f.leverage = Math.max(0, Math.min(100, f.leverage));
}

// ── Direct faction deltas for incident consequence effects ──────────────

export function applyFactionStandingDelta(
  cityState: CityState,
  factionId: string,
  delta: number,
): boolean {
  const faction = cityState.factions[factionId];
  if (!faction) return false;
  faction.standing += delta;
  clampFaction(faction);
  return true;
}

export function applyFactionScrutinyDelta(
  cityState: CityState,
  factionId: string,
  delta: number,
): boolean {
  const faction = cityState.factions[factionId];
  if (!faction) return false;
  faction.scrutiny += delta;
  clampFaction(faction);
  return true;
}

// ── Writeback: apply outcome deltas to city state ───────────────────────

export interface ApplyCityPressureOutcomeOptions {
  /**
   * When true, positive faction standing deltas are scaled up. Set this
   * when the Executive Office is operational — faction reps working out
   * of a named corner suite translate contract wins into stronger
   * institutional relationships.
   */
  executiveOfficeBonus?: boolean;
}

export function applyCityPressureOutcome(
  cityState: CityState,
  districtId: string,
  sponsorFactionId: string,
  outcome: CityPressureOutcome,
  currentTick: number,
  options: ApplyCityPressureOutcomeOptions = {},
): string[] {
  const baseDelta = OUTCOME_DELTAS[outcome];
  const delta: CityDelta = { ...baseDelta };
  if (options.executiveOfficeBonus) {
    if (delta.sponsorStanding !== undefined && delta.sponsorStanding > 0) {
      delta.sponsorStanding = Math.round(
        delta.sponsorStanding * EXECUTIVE_OFFICE_STANDING_MULTIPLIER,
      );
    }
    if (delta.boroughContractStanding !== undefined && delta.boroughContractStanding > 0) {
      delta.boroughContractStanding = Math.round(
        delta.boroughContractStanding * EXECUTIVE_OFFICE_STANDING_MULTIPLIER,
      );
    }
  }
  const events: string[] = [];

  // Apply district deltas
  const district = cityState.districts[districtId];
  if (district) {
    if (delta.districtTrust) {
      const prev = district.trust;
      district.trust += delta.districtTrust;
      clampDistrict(district);
      if (Math.abs(district.trust - prev) >= 5) {
        events.push(
          delta.districtTrust > 0
            ? `${formatDistrictName(districtId)} trust improved`
            : `${formatDistrictName(districtId)} trust eroded`,
        );
      }
    }
    if (delta.districtAttention) {
      district.attention += delta.districtAttention;
      clampDistrict(district);
    }
    if (delta.containmentDebt) {
      const prev = district.containmentDebt;
      district.containmentDebt += delta.containmentDebt;
      clampDistrict(district);
      if (district.containmentDebt >= 50 && prev < 50) {
        events.push(`${formatDistrictName(districtId)} containment debt critical`);
      }
    }
    district.lastResolvedTick = currentTick;
  }

  // Apply sponsor faction deltas
  const sponsor = cityState.factions[sponsorFactionId];
  if (sponsor && delta.sponsorStanding) {
    sponsor.standing += delta.sponsorStanding;
    clampFaction(sponsor);
  }

  // Apply named faction deltas
  if (delta.emergencyManagementScrutiny) {
    const em = cityState.factions["faction/emergency-management"];
    if (em) {
      const prev = em.scrutiny;
      em.scrutiny += delta.emergencyManagementScrutiny;
      clampFaction(em);
      if (em.scrutiny >= 40 && prev < 40) {
        events.push("Emergency Management scrutiny elevated");
      }
    }
  }
  if (delta.laborSafetyScrutiny) {
    const ls = cityState.factions["faction/labor-safety"];
    if (ls) {
      const prev = ls.scrutiny;
      ls.scrutiny += delta.laborSafetyScrutiny;
      clampFaction(ls);
      if (ls.scrutiny >= 40 && prev < 40) {
        events.push("Labor & Safety Board scrutiny elevated");
      }
    }
  }
  if (delta.boroughContractStanding) {
    const bc = cityState.factions["faction/borough-contracts"];
    if (bc) {
      bc.standing += delta.boroughContractStanding;
      clampFaction(bc);
    }
  }
  if (delta.rivalGuildLeverage) {
    const rg = cityState.factions["faction/rival-guild-market"];
    if (rg) {
      rg.leverage += delta.rivalGuildLeverage;
      clampFaction(rg);
    }
  }

  return events;
}

// ── Contract modifiers from city state ──────────────────────────────────

export interface CityContractModifiers {
  rewardMultiplier: number;
  riskMultiplier: number;
  minReputationOffset: number;
  pressureTags: readonly string[];
}

export function computeCityContractModifiers(
  cityState: CityState,
  districtId: string,
  sponsorFactionId: string,
): CityContractModifiers {
  const district = cityState.districts[districtId];
  const sponsor = cityState.factions[sponsorFactionId];
  const tags: string[] = [];

  let rewardMultiplier = 1.0;
  let riskMultiplier = 1.0;
  let minReputationOffset = 0;

  if (district) {
    // High attention districts pay more but carry more risk
    if (district.attention >= 40) {
      rewardMultiplier += 0.15;
      riskMultiplier += 0.1;
      tags.push("pressure:high-attention");
    }
    // High containment debt increases risk
    if (district.containmentDebt >= 50) {
      riskMultiplier += 0.2;
      tags.push("pressure:containment-debt");
    }
    // Low trust makes jobs harder to land
    if (district.trust < 30) {
      minReputationOffset += 3;
      tags.push("pressure:low-trust");
    }
    // High trust opens easier access
    if (district.trust >= 70) {
      minReputationOffset -= 2;
    }
  }

  if (sponsor) {
    // Faction scrutiny raises risk
    if (sponsor.scrutiny >= 30) {
      riskMultiplier += sponsor.scrutiny * 0.003;
      tags.push("pressure:faction-scrutiny");
    }
    // Negative standing reduces reward
    if (sponsor.standing < -20) {
      rewardMultiplier -= 0.1;
      tags.push("pressure:poor-standing");
    }
    // Positive standing improves reward
    if (sponsor.standing >= 30) {
      rewardMultiplier += 0.08;
    }
    // Rival leverage raises risk
    if (sponsor.leverage >= 30) {
      riskMultiplier += 0.12;
      tags.push("pressure:rival-leverage");
    }
  }

  return {
    rewardMultiplier: Math.max(0.6, Math.min(1.5, rewardMultiplier)),
    riskMultiplier: Math.max(0.8, Math.min(1.6, riskMultiplier)),
    minReputationOffset,
    pressureTags: tags,
  };
}

// ── District selection for contract generation ──────────────────────────

export function selectDistrictForConcept(
  concept: { districtPool: readonly string[] },
  rngValue: number,
): string {
  const pool = concept.districtPool;
  if (pool.length === 0) return "district/lower-east-side";
  return pool[rngValue % pool.length];
}

export function selectSponsorFaction(districtId: string, rngValue: number): string {
  const districtTemplate = lookupDistrictTemplate(districtId);
  if (!districtTemplate || districtTemplate.primaryFactionIds.length === 0) {
    return "faction/city-licensing";
  }
  const pool = districtTemplate.primaryFactionIds;
  return pool[rngValue % pool.length];
}

// ── Passive tick: natural decay of district attention and faction scrutiny ─

export interface TickCityPressureDecayOptions {
  /**
   * When true, applies an additional bounded scrutiny decay across all
   * factions on top of the baseline. Set this when the Compliance Office
   * is operational. Does not decay factions that are still inside their
   * scrutiny cooldown window.
   */
  complianceOfficeActive?: boolean;
}

export function tickCityPressureDecay(
  cityState: CityState,
  elapsedMinutes: number,
  currentTick: number,
  options: TickCityPressureDecayOptions = {},
): void {
  if (elapsedMinutes <= 0) {
    return;
  }

  const elapsedHours = elapsedMinutes / 60;

  for (const district of Object.values(cityState.districts)) {
    // These rates are hourly. The system may be stepped with large or small deltas.
    if (district.attention > 0) {
      district.attention = Math.max(0, district.attention - 0.5 * elapsedHours);
    }
    if (district.containmentDebt > 0) {
      district.containmentDebt = Math.max(0, district.containmentDebt - 0.2 * elapsedHours);
    }
    if (district.recentContractCount > 0 && currentTick - district.lastResolvedTick >= 2000) {
      const decaySteps = Math.min(
        district.recentContractCount,
        Math.floor((currentTick - district.lastResolvedTick) / 2000),
      );
      district.recentContractCount = Math.max(0, district.recentContractCount - decaySteps);
      district.lastResolvedTick += decaySteps * 2000;
    }
  }

  const complianceExtra = options.complianceOfficeActive
    ? Math.min(
        COMPLIANCE_OFFICE_EXTRA_SCRUTINY_DECAY_PER_HOUR * elapsedHours,
        COMPLIANCE_OFFICE_MAX_DECAY_PER_TICK,
      )
    : 0;

  for (const faction of Object.values(cityState.factions)) {
    if (faction.scrutiny > 0) {
      let scrutinyDecay = 0.3 * elapsedHours;
      if (complianceExtra > 0 && faction.cooldownUntilTick <= currentTick) {
        scrutinyDecay += complianceExtra;
      }
      faction.scrutiny = Math.max(0, faction.scrutiny - scrutinyDecay);
    }
    if (faction.leverage > 0) {
      faction.leverage = Math.max(0, faction.leverage - 0.15 * elapsedHours);
    }
  }
}

// ── Event log helper ────────────────────────────────────────────────────

function formatDistrictName(districtId: string): string {
  const template = lookupDistrictTemplate(districtId);
  return template?.name ?? districtId.replace("district/", "");
}

// ── System tick ─────────────────────────────────────────────────────────

export const advanceCityPressureSystem = (context: SimSystemContext, _deltaMs: number): void => {
  const cityState = context.runtimeState.cityState;
  if (!cityState || _deltaMs <= 0) return;

  tickCityPressureDecay(
    cityState,
    Math.max(1, Math.floor(_deltaMs / 60000)),
    getCurrentAbsoluteMinute(context),
    {
      complianceOfficeActive: hasOperationalRoomTemplate(
        context,
        SKYSCRAPER_COMPLIANCE_OFFICE_TEMPLATE_ID,
      ),
    },
  );
};

// ── Emit city-pressure events into the runtime event log ────────────────

export function emitCityPressureEvents(context: SimSystemContext, events: readonly string[]): void {
  for (const message of events) {
    pushRuntimeEvent(context, {
      kind: "city_pressure",
      message,
      accent: "ember",
    });
  }
}

import type { PublicPressureState } from "../components/public-pressure";
import type {
  DistrictPublicPressureSnapshot,
  FactionRelationshipSnapshot,
  PublicPressureSource,
} from "save/types";
import type { DistrictTemplate, FactionTemplate } from "content/templates/shared";
import { districtTemplates } from "content/templates/districts";
import { factionTemplates } from "content/templates/factions";
import { getCurrentAbsoluteMinute, hasOperationalRoomTemplate, pushRuntimeEvent } from "./commands";
import type { SimSystemContext } from "./types";

export const SKYSCRAPER_COMPLIANCE_OFFICE_TEMPLATE_ID = "room/compliance_office:tier_1";
export const SKYSCRAPER_EXECUTIVE_OFFICE_TEMPLATE_ID = "room/executive_office:tier_1";
export const SKYSCRAPER_WAR_ROOM_TEMPLATE_ID = "room/war_room:tier_1";

const COMPLIANCE_OFFICE_EXTRA_SCORE_DECAY_PER_HOUR = 0.7;
const COMPLIANCE_OFFICE_MAX_DECAY_PER_TICK = 7;

const EXECUTIVE_OFFICE_STANDING_MULTIPLIER = 1.4;

const districtById = new Map<string, DistrictTemplate>(districtTemplates.map((d) => [d.id, d]));
const factionById = new Map<string, FactionTemplate>(factionTemplates.map((f) => [f.id, f]));

export type PublicPressureOutcome =
  | "success"
  | "boss_defeated"
  | "mixed"
  | "contract_lost"
  | "operator_death";

interface PublicPressureDelta {
  districtStanding?: number;
  districtHeat?: number;
  containment?: number;
  sponsorStanding?: number;
  boroughContractStanding?: number;
  globalScore?: number;
  source?: PublicPressureSource;
}

const OUTCOME_DELTAS: Record<PublicPressureOutcome, PublicPressureDelta> = {
  success: {
    districtStanding: 4,
    districtHeat: -2,
    containment: -5,
    sponsorStanding: 3,
    globalScore: -1,
    source: "public",
  },
  boss_defeated: {
    districtStanding: 8,
    districtHeat: -6,
    containment: -12,
    sponsorStanding: 6,
    globalScore: -3,
    source: "public",
  },
  mixed: {
    districtHeat: 4,
    containment: 5,
    sponsorStanding: -2,
    globalScore: 4,
    source: "public",
  },
  contract_lost: {
    districtStanding: -10,
    districtHeat: 12,
    containment: 14,
    boroughContractStanding: -8,
    globalScore: 12,
    source: "regulator",
  },
  operator_death: {
    districtHeat: 5,
    globalScore: 8,
    source: "regulator",
  },
};

export function getDistrictPublicPressure(
  state: PublicPressureState,
  districtId: string,
): DistrictPublicPressureSnapshot | undefined {
  return state.districts[districtId];
}

export function getFactionRelationship(
  state: PublicPressureState,
  factionId: string,
): FactionRelationshipSnapshot | undefined {
  return state.factionRelationships[factionId];
}

export function lookupDistrictTemplate(districtId: string): DistrictTemplate | undefined {
  return districtById.get(districtId);
}

export function lookupFactionTemplate(factionId: string): FactionTemplate | undefined {
  return factionById.get(factionId);
}

function clampDistrict(d: DistrictPublicPressureSnapshot): void {
  d.heat = Math.max(0, Math.min(100, d.heat));
  d.standing = Math.max(0, Math.min(100, d.standing));
  d.containment = Math.max(0, Math.min(100, d.containment));
  d.recentContractCount = Math.max(0, d.recentContractCount);
}

function clampRelationship(f: FactionRelationshipSnapshot): void {
  f.standing = Math.max(-100, Math.min(100, f.standing));
}

function clampScore(state: PublicPressureState): void {
  state.score = Math.max(0, Math.min(100, state.score));
  if (state.score === 0) {
    state.dominantSource = null;
  }
}

export function applyFactionRelationshipDelta(
  state: PublicPressureState,
  factionId: string,
  delta: number,
): boolean {
  const relationship = state.factionRelationships[factionId];
  if (!relationship) return false;
  relationship.standing += delta;
  clampRelationship(relationship);
  return true;
}

export function applyPublicPressureDelta(
  state: PublicPressureState,
  delta: number,
  source: PublicPressureSource,
): void {
  state.score += delta;
  state.dominantSource = delta >= 0 ? source : state.dominantSource;
  clampScore(state);
}

export interface ApplyPublicPressureOutcomeOptions {
  executiveOfficeBonus?: boolean;
}

export function applyPublicPressureOutcome(
  state: PublicPressureState,
  districtId: string,
  sponsorFactionId: string,
  outcome: PublicPressureOutcome,
  currentTick: number,
  options: ApplyPublicPressureOutcomeOptions = {},
): string[] {
  const baseDelta = OUTCOME_DELTAS[outcome];
  const delta: PublicPressureDelta = { ...baseDelta };
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

  const district = state.districts[districtId];
  if (district) {
    if (delta.districtStanding) {
      const prev = district.standing;
      district.standing += delta.districtStanding;
      clampDistrict(district);
      if (Math.abs(district.standing - prev) >= 5) {
        events.push(
          delta.districtStanding > 0
            ? `${formatDistrictName(districtId)} standing improved`
            : `${formatDistrictName(districtId)} standing eroded`,
        );
      }
    }
    if (delta.districtHeat) {
      district.heat += delta.districtHeat;
      clampDistrict(district);
    }
    if (delta.containment) {
      const prev = district.containment;
      district.containment += delta.containment;
      clampDistrict(district);
      if (district.containment >= 50 && prev < 50) {
        events.push(`${formatDistrictName(districtId)} containment critical`);
      }
    }
    district.lastResolvedTick = currentTick;
  }

  const sponsor = state.factionRelationships[sponsorFactionId];
  if (sponsor && delta.sponsorStanding) {
    sponsor.standing += delta.sponsorStanding;
    clampRelationship(sponsor);
  }

  if (delta.boroughContractStanding) {
    applyFactionRelationshipDelta(
      state,
      "faction/borough-contracts",
      delta.boroughContractStanding,
    );
  }

  if (delta.globalScore && delta.source) {
    const prev = state.score;
    applyPublicPressureDelta(state, delta.globalScore, delta.source);
    if (state.score >= 50 && prev < 50) {
      events.push("Public pressure exposed");
    }
  }

  return events;
}

export interface PublicContractModifiers {
  rewardMultiplier: number;
  riskMultiplier: number;
  minReputationOffset: number;
  pressureTags: readonly string[];
}

export function computePublicContractModifiers(
  state: PublicPressureState,
  districtId: string,
  sponsorFactionId: string,
): PublicContractModifiers {
  const district = state.districts[districtId];
  const sponsor = state.factionRelationships[sponsorFactionId];
  const tags: string[] = [];

  let rewardMultiplier = 1.0;
  let riskMultiplier = 1.0;
  let minReputationOffset = 0;

  if (district) {
    if (district.heat >= 40) {
      rewardMultiplier += 0.15;
      riskMultiplier += 0.1;
      tags.push("pressure:high-heat");
    }
    if (district.containment >= 50) {
      riskMultiplier += 0.2;
      tags.push("pressure:containment");
    }
    if (district.standing < 30) {
      minReputationOffset += 3;
      tags.push("pressure:low-standing");
    }
    if (district.standing >= 70) {
      minReputationOffset -= 2;
    }
  }

  if (state.score >= 50) {
    riskMultiplier += state.score * 0.002;
    tags.push("pressure:public-exposure");
  }

  if (sponsor) {
    if (sponsor.standing < -20) {
      rewardMultiplier -= 0.1;
      tags.push("pressure:poor-relationship");
    }
    if (sponsor.standing >= 30) {
      rewardMultiplier += 0.08;
    }
  }

  return {
    rewardMultiplier: Math.max(0.6, Math.min(1.5, rewardMultiplier)),
    riskMultiplier: Math.max(0.8, Math.min(1.6, riskMultiplier)),
    minReputationOffset,
    pressureTags: tags,
  };
}

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

export interface TickPublicPressureDecayOptions {
  complianceOfficeActive?: boolean;
}

export function tickPublicPressureDecay(
  state: PublicPressureState,
  elapsedMinutes: number,
  currentTick: number,
  options: TickPublicPressureDecayOptions = {},
): void {
  if (elapsedMinutes <= 0) {
    return;
  }

  const elapsedHours = elapsedMinutes / 60;

  for (const district of Object.values(state.districts)) {
    if (district.heat > 0) {
      district.heat = Math.max(0, district.heat - 0.5 * elapsedHours);
    }
    if (district.containment > 0) {
      district.containment = Math.max(0, district.containment - 0.2 * elapsedHours);
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

  let scoreDecay = 0.3 * elapsedHours;
  if (options.complianceOfficeActive) {
    scoreDecay += Math.min(
      COMPLIANCE_OFFICE_EXTRA_SCORE_DECAY_PER_HOUR * elapsedHours,
      COMPLIANCE_OFFICE_MAX_DECAY_PER_TICK,
    );
  }

  if (state.score > 0) {
    state.score = Math.max(0, state.score - scoreDecay);
    clampScore(state);
  }
}

function formatDistrictName(districtId: string): string {
  const template = lookupDistrictTemplate(districtId);
  return template?.name ?? districtId.replace("district/", "");
}

export const advancePublicPressureSystem = (context: SimSystemContext, _deltaMs: number): void => {
  const state = context.runtimeState.publicPressure;
  if (!state || _deltaMs <= 0) return;

  tickPublicPressureDecay(state, _deltaMs / 60000, getCurrentAbsoluteMinute(context), {
    complianceOfficeActive: hasOperationalRoomTemplate(
      context,
      SKYSCRAPER_COMPLIANCE_OFFICE_TEMPLATE_ID,
    ),
  });
};

export function emitPublicPressureEvents(
  context: SimSystemContext,
  events: readonly string[],
): void {
  for (const message of events) {
    pushRuntimeEvent(context, {
      kind: "public_pressure",
      message,
      accent: "ember",
    });
  }
}

import { readyToWireRivals } from "content/templates/rivals";
import type { RivalMoveTemplate } from "content/templates/rivals";
import type { RivalMoveEffect } from "content/templates/rival-records/schema";
import type { RivalInstanceSnapshot, RivalPressureSnapshot, RivalStrengthBand } from "save/types";
import {
  BuildingAuthority,
  GuildState,
  LoyaltyState,
  MoraleState,
  OperatorIdentity,
  RecurringTeam,
} from "../components";
import {
  clamp,
  getCurrentAbsoluteMinute,
  hasOperationalRoomTemplate,
  pushRuntimeEvent,
} from "./commands";
import {
  enqueueInterruption,
  type RivalMovePayload,
  type RivalMovePayloadChoice,
  type RivalMovePayloadEffect,
} from "./interruptions";
import {
  applyFactionRelationshipDelta,
  applyPublicPressureDelta,
  SKYSCRAPER_EXECUTIVE_OFFICE_TEMPLATE_ID,
  SKYSCRAPER_WAR_ROOM_TEMPLATE_ID,
} from "./public-pressure";
import { seedFromSimulationKey } from "./seed-utils";
import type { SimSystemContext } from "./types";
import { SeededRng, weightedChoice, type WeightedItem } from "../uncertainty";

const RANK_WEIGHTS: Readonly<Record<string, number>> = {
  f: 1,
  e: 2,
  d: 4,
  c: 7,
  b: 11,
  a: 16,
  s: 22,
};

const RECENT_MOVE_MEMORY = 2;
const COMPETITIVE_SCORE_PER_LADDER_STEP = 20;

function rankWeight(rank: string): number {
  return RANK_WEIGHTS[rank.toLowerCase()] ?? 1;
}

export function computeCompetitiveScore(context: SimSystemContext): number {
  const rosterScore = context.runtimeState.operatorEntities
    .filter((entity) => OperatorIdentity.lifecycleStatus[entity] === "active")
    .reduce((sum, entity) => sum + rankWeight(OperatorIdentity.rank[entity] ?? "f"), 0);
  const reputationScore = Math.max(
    0,
    Math.min(80, GuildState.reputation[context.singletonEntities.guild] * 0.8),
  );
  const buildingTierScore =
    BuildingAuthority.activeBuildingTier[context.singletonEntities.building] * 8;
  const executiveSupportScore = hasOperationalRoomTemplate(
    context,
    SKYSCRAPER_EXECUTIVE_OFFICE_TEMPLATE_ID,
  )
    ? 10
    : 0;

  return Math.round(rosterScore + reputationScore + buildingTierScore + executiveSupportScore);
}

function strengthBandFor(index: number, primaryIndex: number): RivalStrengthBand {
  if (index < primaryIndex) return "above";
  if (index > primaryIndex) return "below";
  return "peer";
}

function primaryIndexForCompetitiveScore(competitiveScore: number): number {
  return Math.max(
    0,
    Math.min(
      readyToWireRivals.length - 1,
      Math.floor(competitiveScore / COMPETITIVE_SCORE_PER_LADDER_STEP),
    ),
  );
}

function indexForRivalId(rivalId: string): number {
  return readyToWireRivals.findIndex((template) => template.id === rivalId);
}

export function seedRivalPressure(
  context: SimSystemContext,
  state: RivalPressureSnapshot,
  currentTick: number,
): boolean {
  if (readyToWireRivals.length === 0) {
    return false;
  }

  const competitiveScore = computeCompetitiveScore(context);
  const primaryIndex = primaryIndexForCompetitiveScore(competitiveScore);
  const existingById = new Map(state.rivals.map((rival) => [rival.rivalId, rival]));
  const previousPrimaryId = state.currentPrimaryRivalId;
  const primaryRivalId = previousPrimaryId ?? readyToWireRivals[primaryIndex].id;
  const strengthPrimaryIndex = Math.max(0, indexForRivalId(primaryRivalId));
  const rivals: RivalInstanceSnapshot[] = readyToWireRivals.map((template, index) => {
    const existing = existingById.get(template.id);
    const isPrimary = template.id === primaryRivalId;
    return {
      rivalId: template.id,
      ladderPosition: index + 1,
      strengthBand: strengthBandFor(index, strengthPrimaryIndex),
      intensity:
        existing?.intensity ?? (isPrimary ? Math.max(30, Math.min(75, competitiveScore)) : 15),
      aggression: existing?.aggression ?? (isPrimary ? 45 : 25),
      trend: existing?.trend ?? (isPrimary ? "rising" : "stable"),
      isPrimary,
      introducedAtTick: existing?.introducedAtTick ?? (isPrimary ? currentTick : null),
      lastMoveTick: existing?.lastMoveTick ?? null,
      recentMoveIds: existing?.recentMoveIds ?? [],
      lastMoveTicksByMoveId: existing?.lastMoveTicksByMoveId ?? {},
      departedOperatorId: existing?.departedOperatorId ?? null,
      missedProspectId: existing?.missedProspectId ?? null,
      sourceTick: existing?.sourceTick ?? (isPrimary ? currentTick : null),
      sourceReason: existing?.sourceReason ?? (isPrimary ? "war_room_unlock" : null),
    };
  });

  state.active = true;
  state.currentPrimaryRivalId = primaryRivalId;
  state.rivals = rivals;
  return previousPrimaryId === null || previousPrimaryId === undefined;
}

function isMoveCooldownReady(
  move: RivalMoveTemplate,
  rival: RivalInstanceSnapshot,
  currentTick: number,
): boolean {
  const lastMoveTick =
    rival.lastMoveTicksByMoveId?.[move.id] ?? rival.introducedAtTick ?? rival.lastMoveTick ?? 0;
  return currentTick - lastMoveTick >= move.cooldownMinutes;
}

function isRivalMoveCadenceReady(
  template: { readonly moves: readonly RivalMoveTemplate[] },
  rival: RivalInstanceSnapshot,
  currentTick: number,
): boolean {
  const shortestCooldown = Math.min(...template.moves.map((move) => move.cooldownMinutes));
  const lastMoveTick = rival.lastMoveTick ?? rival.introducedAtTick ?? 0;
  return currentTick - lastMoveTick >= shortestCooldown;
}

function getCooldownReadyMoves(
  template: { readonly moves: readonly RivalMoveTemplate[] },
  rival: RivalInstanceSnapshot,
  currentTick: number,
): RivalMoveTemplate[] {
  return template.moves.filter((move) => isMoveCooldownReady(move, rival, currentTick));
}

function getRivalMoveCandidates(
  template: { readonly moves: readonly RivalMoveTemplate[] },
  rival: RivalInstanceSnapshot,
  currentTick: number,
): RivalMoveTemplate[] {
  const cooldownReady = getCooldownReadyMoves(template, rival, currentTick);
  if (cooldownReady.length === 0) return [];

  const blockedIds = new Set(rival.recentMoveIds.slice(-RECENT_MOVE_MEMORY));
  const notRecent = cooldownReady.filter((move) => !blockedIds.has(move.id));
  return notRecent.length > 0 ? notRecent : cooldownReady;
}

export function hasEligibleCurrentRivalMove(
  state: RivalPressureSnapshot | null | undefined,
  currentTick: number,
): boolean {
  if (!state?.active || !state.currentPrimaryRivalId) return false;
  const rival = state.rivals.find((candidate) => candidate.rivalId === state.currentPrimaryRivalId);
  if (!rival) return false;
  const template = readyToWireRivals.find((candidate) => candidate.id === rival.rivalId);
  if (!template) return false;
  if (!isRivalMoveCadenceReady(template, rival, currentTick)) return false;
  return getRivalMoveCandidates(template, rival, currentTick).length > 0;
}

function selectRivalMove(
  context: SimSystemContext,
  template: { readonly moves: readonly RivalMoveTemplate[] },
  rival: RivalInstanceSnapshot,
  currentTick: number,
): RivalMoveTemplate | null {
  if (template.moves.length === 0) return null;

  const candidates = getRivalMoveCandidates(template, rival, currentTick);
  if (candidates.length === 0) return null;

  const weighted: WeightedItem<RivalMoveTemplate>[] = candidates.map((move) => ({
    item: move,
    weight: move.weight,
  }));
  return weightedChoice(
    new SeededRng(
      seedFromSimulationKey(
        context,
        `rival-move:${rival.rivalId}:${currentTick}:${rival.lastMoveTick ?? "none"}:${rival.recentMoveIds.join("|")}`,
      ),
    ),
    weighted,
  ).outcome;
}

function toPayloadEffect(effect: RivalMoveEffect): RivalMovePayloadEffect {
  return {
    kind: effect.kind,
    targetRef: effect.targetRef,
    value: effect.value,
  };
}

function toPayloadChoices(move: RivalMoveTemplate): RivalMovePayloadChoice[] {
  return move.choices.map((choice) => ({
    choiceId: choice.choiceId,
    label: choice.label,
    description: choice.description,
    consequenceSummary: choice.consequenceSummary,
    effects: choice.effects.map(toPayloadEffect),
  }));
}

function trendForIntensityDelta(delta: number): RivalInstanceSnapshot["trend"] {
  if (delta > 0) return "rising";
  if (delta < 0) return "slipping";
  return "stable";
}

export function advanceCurrentRivalMove(
  context: SimSystemContext,
  state: RivalPressureSnapshot,
  currentTick: number,
): boolean {
  if (!state.active || !state.currentPrimaryRivalId) return false;
  const rival = state.rivals.find((candidate) => candidate.rivalId === state.currentPrimaryRivalId);
  if (!rival) return false;

  const template = readyToWireRivals.find((candidate) => candidate.id === rival.rivalId);
  if (!template) return false;
  if (!isRivalMoveCadenceReady(template, rival, currentTick)) return false;

  const move = selectRivalMove(context, template, rival, currentTick);
  if (!move) return false;

  rival.lastMoveTick = currentTick;
  rival.lastMoveTicksByMoveId = {
    ...rival.lastMoveTicksByMoveId,
    [move.id]: currentTick,
  };
  rival.intensity = Math.max(0, Math.min(100, rival.intensity + move.baseIntensityDelta));
  rival.trend = trendForIntensityDelta(move.baseIntensityDelta);
  rival.recentMoveIds = [...rival.recentMoveIds, move.id].slice(-RECENT_MOVE_MEMORY);

  const warRoomActive = hasOperationalRoomTemplate(context, SKYSCRAPER_WAR_ROOM_TEMPLATE_ID);
  const warRoomMitigation = warRoomActive ? 0.65 : 1;
  const appliedPublicPressureDelta = Math.ceil(move.basePublicPressureDelta * warRoomMitigation);
  if (context.runtimeState.publicPressure) {
    applyPublicPressureDelta(
      context.runtimeState.publicPressure,
      appliedPublicPressureDelta,
      "public",
    );
  }
  const eventMessage = `${template.shortDisplayName}: ${move.briefingTemplate}`;
  pushRuntimeEvent(context, {
    kind: "rival_pressure",
    message: warRoomActive ? `${eventMessage} War Room blunted the worst of it.` : eventMessage,
    accent: "ember",
  });

  if (context.runtimeState.interruptionQueue) {
    const movePayload: RivalMovePayload = {
      kind: "rival_move",
      rivalId: template.id,
      moveTemplateId: move.id,
      shortDisplayName: template.shortDisplayName,
      guildName: template.guildName,
      leaderName: template.leader.name,
      leaderPortrait: template.assetPaths.leaderPortrait,
      insignia: template.assetPaths.insignia,
      pressureLane: template.pressureLane,
      family: move.family,
      message: eventMessage,
      briefing: move.briefingTemplate,
      intensity: rival.intensity,
      aggression: rival.aggression,
      intensityDelta: move.baseIntensityDelta,
      publicPressureDelta: appliedPublicPressureDelta,
      trend: rival.trend,
      warRoomMitigated: warRoomActive,
      dayNumber: Math.floor(currentTick / 1440) + 1,
      choices: toPayloadChoices(move),
    };
    enqueueInterruption(
      context.runtimeState.interruptionQueue,
      "rival_move",
      movePayload,
      "rival-pressure",
      currentTick,
      { dismissible: false, persistence: "persistent" },
    );
  }
  return true;
}

export const advanceRivalPressureSystem = (context: SimSystemContext, _deltaMs: number): void => {
  const state = context.runtimeState.rivalPressure;
  if (!state || _deltaMs <= 0) return;
  if (!hasOperationalRoomTemplate(context, SKYSCRAPER_WAR_ROOM_TEMPLATE_ID)) return;

  const introduced = seedRivalPressure(context, state, getCurrentAbsoluteMinute(context));
  if (introduced && state.currentPrimaryRivalId) {
    pushRuntimeEvent(context, {
      kind: "rival_pressure",
      message: "War Room put a name on the primary rival.",
      accent: "ember",
    });
    return;
  }

  advanceCurrentRivalMove(context, state, getCurrentAbsoluteMinute(context));
};

function factionPressureSourceFor(factionId: string): "regulator" | "press" | "sponsor" | "public" {
  if (factionId === "faction/borough-contracts") return "sponsor";
  if (factionId === "faction/emergency-management") return "public";
  return "regulator";
}

function factionIdFromTarget(targetRef: RivalMovePayloadEffect["targetRef"]): string | undefined {
  return targetRef.startsWith("faction:") ? targetRef.slice("faction:".length) : undefined;
}

function applyTeamDeltaAcrossOperators(
  context: SimSystemContext,
  soa: { current: number[] },
  value: number,
): void {
  context.runtimeState.operatorEntities.forEach((entity) => {
    if (OperatorIdentity.lifecycleStatus[entity] !== "active") return;
    soa.current[entity] = clamp(soa.current[entity] + value, 0, 100);
  });
}

function applyRivalMoveChoiceEffect(
  context: SimSystemContext,
  effect: RivalMovePayloadEffect,
): void {
  switch (effect.kind) {
    case "morale_delta": {
      if (effect.targetRef === "team") {
        applyTeamDeltaAcrossOperators(context, MoraleState, effect.value);
      }
      break;
    }
    case "loyalty_delta": {
      if (effect.targetRef === "team") {
        applyTeamDeltaAcrossOperators(context, LoyaltyState, effect.value);
      }
      break;
    }
    case "treasury_delta": {
      GuildState.treasury[context.singletonEntities.guild] += effect.value;
      break;
    }
    case "reputation_delta": {
      GuildState.reputation[context.singletonEntities.guild] = Math.max(
        0,
        GuildState.reputation[context.singletonEntities.guild] + effect.value,
      );
      break;
    }
    case "intel_delta": {
      GuildState.intel[context.singletonEntities.guild] = Math.max(
        0,
        GuildState.intel[context.singletonEntities.guild] + effect.value,
      );
      break;
    }
    case "team_cohesion_delta": {
      context.runtimeState.recurringTeamEntities.forEach((entity) => {
        RecurringTeam.cohesion[entity] = clamp(
          RecurringTeam.cohesion[entity] + effect.value,
          0,
          100,
        );
      });
      break;
    }
    case "contract_pressure_delta": {
      context.runtimeState.incidentState.pressureModifier = clamp(
        context.runtimeState.incidentState.pressureModifier + effect.value,
        -40,
        40,
      );
      if (context.runtimeState.publicPressure) {
        applyPublicPressureDelta(context.runtimeState.publicPressure, effect.value, "public");
      }
      break;
    }
    case "faction_relationship_delta": {
      const publicPressure = context.runtimeState.publicPressure;
      const factionId = factionIdFromTarget(effect.targetRef);
      if (publicPressure && factionId) {
        applyFactionRelationshipDelta(publicPressure, factionId, effect.value);
      }
      break;
    }
    case "public_pressure_delta": {
      const publicPressure = context.runtimeState.publicPressure;
      if (!publicPressure) break;
      const factionId = factionIdFromTarget(effect.targetRef);
      const source = factionId ? factionPressureSourceFor(factionId) : "public";
      applyPublicPressureDelta(publicPressure, effect.value, source);
      break;
    }
  }
}

export function resolveRivalMoveChoice(
  context: SimSystemContext,
  payload: RivalMovePayload,
  choiceId: string,
): boolean {
  const choice = payload.choices.find((candidate) => candidate.choiceId === choiceId);
  if (!choice) return false;
  choice.effects.forEach((effect) => applyRivalMoveChoiceEffect(context, effect));
  pushRuntimeEvent(context, {
    kind: "rival_pressure",
    message: `${payload.shortDisplayName} — ${choice.label}: ${choice.consequenceSummary}`,
    accent: "ember",
  });
  return true;
}

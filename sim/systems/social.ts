import { addComponent, addEntity, removeEntity } from "bitecs";

import {
  LoyaltyState,
  MoraleState,
  NotableTie,
  OperatorDisposition,
  OperatorIdentity,
  PreferenceState,
  RecurringTeam,
  RoomCulture,
  RoomInstance,
} from "../components";
import {
  appendHistoryTags,
  clamp,
  getPairOrder,
  getRoomTemplateForEntity,
  pushRuntimeEvent,
  removeTrackedEntity,
} from "./commands";
import type { SimSystemContext } from "./types";

export interface SocialCompatibilityRecord {
  operatorAId: string;
  operatorBId: string;
  trust: number;
  friction: number;
  familiarity: number;
  recentSharedOutcome: number;
  historyTags: string[];
}

type NotableTieStance = "trusted" | "preferred" | "resented" | "rival" | "mentorship" | "grief";

function findOperatorEntity(context: SimSystemContext, operatorId: string): number | undefined {
  return context.runtimeState.operatorEntities.find(
    (entity) => OperatorIdentity.id[entity] === operatorId,
  );
}

export function findDispositionEntity(
  context: SimSystemContext,
  operatorId: string,
): number | undefined {
  return context.runtimeState.dispositionEntities.find(
    (entity) => OperatorDisposition.operatorId[entity] === operatorId,
  );
}

function buildDispositionDefaultsFromOperator(entity: number): Pick<
  typeof OperatorDisposition,
  never
> & {
  sociability: number;
  temperament: number;
  grievanceLevel: number;
  satisfactionLevel: number;
} {
  const morale = MoraleState.current[entity] || 50;
  const loyalty = LoyaltyState.current[entity] || 50;
  return {
    sociability: clamp(Math.round((PreferenceState.socialBias[entity] || 50) * 0.9 + 10), 10, 95),
    temperament: clamp(
      Math.round(
        50 +
          (PreferenceState.riskTolerance[entity] || 50) * 0.15 -
          (PreferenceState.recoveryBias[entity] || 50) * 0.1,
      ),
      5,
      95,
    ),
    grievanceLevel: clamp(Math.max(0, Math.round(50 - morale * 0.5)), 0, 100),
    satisfactionLevel: clamp(Math.round((morale + loyalty) / 2), 0, 100),
  };
}

export function ensureOperatorDispositionEntity(
  context: SimSystemContext,
  operatorId: string,
): number | undefined {
  const existing = findDispositionEntity(context, operatorId);
  if (existing !== undefined) {
    return existing;
  }

  const operatorEntity = findOperatorEntity(context, operatorId);
  if (operatorEntity === undefined) {
    return undefined;
  }

  const entity = addEntity(context.world);
  addComponent(context.world, entity, OperatorDisposition);
  const defaults = buildDispositionDefaultsFromOperator(operatorEntity);
  OperatorDisposition.operatorId[entity] = operatorId;
  OperatorDisposition.sociability[entity] = defaults.sociability;
  OperatorDisposition.temperament[entity] = defaults.temperament;
  OperatorDisposition.grievanceLevel[entity] = defaults.grievanceLevel;
  OperatorDisposition.satisfactionLevel[entity] = defaults.satisfactionLevel;
  context.runtimeState.dispositionEntities.push(entity);
  return entity;
}

function getDispositionValues(context: SimSystemContext, operatorId: string) {
  const entity = ensureOperatorDispositionEntity(context, operatorId);
  if (entity === undefined) {
    return {
      sociability: 50,
      temperament: 50,
      grievanceLevel: 25,
      satisfactionLevel: 50,
    };
  }

  return {
    sociability: OperatorDisposition.sociability[entity],
    temperament: OperatorDisposition.temperament[entity],
    grievanceLevel: OperatorDisposition.grievanceLevel[entity],
    satisfactionLevel: OperatorDisposition.satisfactionLevel[entity],
  };
}

function getDefaultRoomCultureFromTags(tags: readonly string[]) {
  if (tags.includes("room:recovery")) {
    return { comfort: 64, tension: 22, camaraderie: 38, tone: "quiet" };
  }
  if (tags.includes("room:social")) {
    return { comfort: 61, tension: 30, camaraderie: 63, tone: "lived_in" };
  }
  if (tags.includes("room:training")) {
    return { comfort: 45, tension: 36, camaraderie: 52, tone: "focused" };
  }
  if (tags.includes("room:operations") || tags.includes("room:staffing")) {
    return { comfort: 42, tension: 47, camaraderie: 37, tone: "brisk" };
  }
  return { comfort: 50, tension: 35, camaraderie: 45, tone: "neutral" };
}

export function ensureRoomCultureEntity(
  context: SimSystemContext,
  roomId: string,
  templateTags: readonly string[],
): number | undefined {
  const existing = context.runtimeState.roomCultureEntities.find(
    (entity) => RoomCulture.roomInstanceId[entity] === roomId,
  );
  if (existing !== undefined) {
    return existing;
  }

  const entity = addEntity(context.world);
  addComponent(context.world, entity, RoomCulture);
  const defaults = getDefaultRoomCultureFromTags(templateTags);
  RoomCulture.roomInstanceId[entity] = roomId;
  RoomCulture.comfort[entity] = defaults.comfort;
  RoomCulture.tension[entity] = defaults.tension;
  RoomCulture.camaraderie[entity] = defaults.camaraderie;
  RoomCulture.tone[entity] = defaults.tone;
  context.runtimeState.roomCultureEntities.push(entity);
  return entity;
}

export function ensurePhase2StateEntities(context: SimSystemContext): void {
  context.runtimeState.operatorEntities.forEach((entity) => {
    const operatorId = OperatorIdentity.id[entity];
    if (operatorId.length > 0) {
      ensureOperatorDispositionEntity(context, operatorId);
    }
  });

  context.runtimeState.roomEntities.forEach((entity) => {
    ensureRoomCultureEntity(
      context,
      RoomInstance.id[entity],
      getRoomTemplateForEntity(context, entity).tags,
    );
  });
}

export function findNotableTieEntity(
  context: SimSystemContext,
  leftId: string,
  rightId: string,
): number | undefined {
  const [operatorAId, operatorBId] = getPairOrder(leftId, rightId);
  return context.runtimeState.notableTieEntities.find((entity) => {
    return (
      NotableTie.operatorAId[entity] === operatorAId &&
      NotableTie.operatorBId[entity] === operatorBId
    );
  });
}

export function upsertNotableTie(
  context: SimSystemContext,
  leftId: string,
  rightId: string,
  stance: NotableTieStance,
  strength: number,
): number {
  const [operatorAId, operatorBId] = getPairOrder(leftId, rightId);
  const existing = findNotableTieEntity(context, operatorAId, operatorBId);
  if (existing !== undefined) {
    NotableTie.stance[existing] = stance;
    NotableTie.strength[existing] = clamp(strength, 0, 100);
    return existing;
  }

  const entity = addEntity(context.world);
  addComponent(context.world, entity, NotableTie);
  NotableTie.operatorAId[entity] = operatorAId;
  NotableTie.operatorBId[entity] = operatorBId;
  NotableTie.stance[entity] = stance;
  NotableTie.strength[entity] = clamp(strength, 0, 100);
  context.runtimeState.notableTieEntities.push(entity);
  return entity;
}

export function findRecurringTeamForMembers(
  context: SimSystemContext,
  operatorIds: readonly string[],
): number | undefined {
  const sortedIds = [...operatorIds].sort((left, right) => left.localeCompare(right));
  return context.runtimeState.recurringTeamEntities.find((entity) => {
    const members = [...(RecurringTeam.memberIds[entity] ?? [])].sort((left, right) =>
      left.localeCompare(right),
    );
    return (
      members.length === sortedIds.length &&
      members.every((memberId, index) => memberId === sortedIds[index])
    );
  });
}

export function getRecurringTeamCohesionBonus(
  context: SimSystemContext,
  operatorIds: readonly string[],
): number {
  if (operatorIds.length < 2) {
    return 0;
  }

  const teamEntity = findRecurringTeamForMembers(context, operatorIds);
  if (teamEntity === undefined) {
    return 0;
  }
  if (RecurringTeam.damaged[teamEntity] === 1) {
    return -8;
  }
  return clamp(Math.round((RecurringTeam.cohesion[teamEntity] - 50) * 0.4), 0, 20);
}

function getTeamEntityForPair(
  context: SimSystemContext,
  leftId: string,
  rightId: string,
): number | undefined {
  return context.runtimeState.recurringTeamEntities.find((entity) => {
    const members = RecurringTeam.memberIds[entity] ?? [];
    return members.includes(leftId) && members.includes(rightId);
  });
}

function getTieAdjustments(stance: NotableTieStance, strength: number) {
  switch (stance) {
    case "trusted":
      return {
        trust: strength * 0.42,
        friction: -strength * 0.08,
        familiarity: strength * 0.18,
        outcome: strength * 0.1,
      };
    case "preferred":
      return {
        trust: strength * 0.28,
        friction: -strength * 0.06,
        familiarity: strength * 0.12,
        outcome: strength * 0.08,
      };
    case "mentorship":
      return {
        trust: strength * 0.34,
        friction: -strength * 0.04,
        familiarity: strength * 0.22,
        outcome: strength * 0.05,
      };
    case "resented":
      return {
        trust: -strength * 0.12,
        friction: strength * 0.3,
        familiarity: strength * 0.06,
        outcome: -strength * 0.14,
      };
    case "rival":
      return {
        trust: -strength * 0.08,
        friction: strength * 0.34,
        familiarity: strength * 0.14,
        outcome: -strength * 0.1,
      };
    case "grief":
      return {
        trust: strength * 0.12,
        friction: strength * 0.08,
        familiarity: strength * 0.24,
        outcome: -strength * 0.22,
      };
  }
}

export function buildSocialCompatibilityRecord(
  context: SimSystemContext,
  leftId: string,
  rightId: string,
): SocialCompatibilityRecord {
  const [operatorAId, operatorBId] = getPairOrder(leftId, rightId);
  const leftEntity = findOperatorEntity(context, operatorAId);
  const rightEntity = findOperatorEntity(context, operatorBId);
  const leftDisposition = getDispositionValues(context, operatorAId);
  const rightDisposition = getDispositionValues(context, operatorBId);

  if (leftEntity === undefined || rightEntity === undefined) {
    return {
      operatorAId,
      operatorBId,
      trust: 40,
      friction: 16,
      familiarity: 20,
      recentSharedOutcome: 0,
      historyTags: [],
    };
  }

  const roleAlignment =
    OperatorIdentity.roleTag[leftEntity] === OperatorIdentity.roleTag[rightEntity] ? 7 : 0;
  const specialtyAlignment =
    OperatorIdentity.specialtyTag[leftEntity] === OperatorIdentity.specialtyTag[rightEntity]
      ? 8
      : 0;
  const riskGap = Math.abs(
    (PreferenceState.riskTolerance[leftEntity] || 50) -
      (PreferenceState.riskTolerance[rightEntity] || 50),
  );
  const rewardGap = Math.abs(
    (PreferenceState.rewardFocus[leftEntity] || 50) -
      (PreferenceState.rewardFocus[rightEntity] || 50),
  );
  const socialBlend =
    ((PreferenceState.socialBias[leftEntity] || 50) +
      (PreferenceState.socialBias[rightEntity] || 50)) /
    2;
  const satisfactionBlend =
    (leftDisposition.satisfactionLevel + rightDisposition.satisfactionLevel) / 2;
  const grievanceBlend = (leftDisposition.grievanceLevel + rightDisposition.grievanceLevel) / 2;
  const sociabilityBlend = (leftDisposition.sociability + rightDisposition.sociability) / 2;
  const temperamentGap = Math.abs(leftDisposition.temperament - rightDisposition.temperament);
  const partnerPreferenceBonus =
    ((PreferenceState.preferredPartnerIds[leftEntity] ?? []).includes(operatorBId) ? 8 : 0) +
    ((PreferenceState.preferredPartnerIds[rightEntity] ?? []).includes(operatorAId) ? 8 : 0);

  let trust = clamp(
    36 +
      roleAlignment +
      specialtyAlignment +
      socialBlend * 0.08 +
      satisfactionBlend * 0.1 +
      sociabilityBlend * 0.05 +
      partnerPreferenceBonus -
      riskGap * 0.12 -
      grievanceBlend * 0.08 -
      temperamentGap * 0.06,
    0,
    100,
  );
  let friction = clamp(
    14 +
      riskGap * 0.16 +
      rewardGap * 0.08 +
      grievanceBlend * 0.12 +
      temperamentGap * 0.1 -
      roleAlignment -
      specialtyAlignment * 0.5 -
      satisfactionBlend * 0.06 -
      partnerPreferenceBonus * 0.5,
    0,
    100,
  );
  let familiarity = clamp(
    20 + roleAlignment + specialtyAlignment + sociabilityBlend * 0.12,
    0,
    100,
  );
  let recentSharedOutcome = 0;
  let historyTags: string[] = [];

  const notableTieEntity = findNotableTieEntity(context, operatorAId, operatorBId);
  if (notableTieEntity !== undefined) {
    const stance = NotableTie.stance[notableTieEntity] as NotableTieStance;
    const strength = NotableTie.strength[notableTieEntity];
    const adjustment = getTieAdjustments(stance, strength);
    trust += adjustment.trust;
    friction += adjustment.friction;
    familiarity += adjustment.familiarity;
    recentSharedOutcome += adjustment.outcome;
    historyTags = appendHistoryTags(historyTags, [`bond:${stance}`]);
  }

  const teamEntity = getTeamEntityForPair(context, operatorAId, operatorBId);
  if (teamEntity !== undefined) {
    const cohesion = RecurringTeam.cohesion[teamEntity];
    const raidCount = RecurringTeam.raidCount[teamEntity];
    const damaged = RecurringTeam.damaged[teamEntity] === 1;
    trust += (cohesion - 50) * 0.28;
    friction += damaged ? 8 : -3;
    familiarity += Math.min(24, raidCount * 3);
    recentSharedOutcome += (cohesion - 50) * 0.35 + (damaged ? -10 : 4);
    historyTags = appendHistoryTags(historyTags, [
      "history:recurring_team",
      damaged ? "history:damaged_team" : "history:shared_raids",
    ]);
  }

  return {
    operatorAId,
    operatorBId,
    trust: clamp(Math.round(trust), 0, 100),
    friction: clamp(Math.round(friction), 0, 100),
    familiarity: clamp(Math.round(familiarity), 0, 100),
    recentSharedOutcome: clamp(Math.round(recentSharedOutcome), -30, 30),
    historyTags,
  };
}

export function computeSocialCohesion(
  context: SimSystemContext,
  leftId: string,
  rightId: string,
): number {
  const record = buildSocialCompatibilityRecord(context, leftId, rightId);
  return clamp(
    50 +
      (record.trust - record.friction) * 0.5 +
      record.familiarity * 0.12 +
      record.recentSharedOutcome * 0.35,
    0,
    100,
  );
}

export function computeAverageSocialSignal(
  context: SimSystemContext,
  operatorId: string,
  livingOperatorIds: ReadonlySet<string>,
): number {
  const signals = [...livingOperatorIds]
    .filter((candidateId) => candidateId !== operatorId)
    .map((candidateId) => {
      const record = buildSocialCompatibilityRecord(context, operatorId, candidateId);
      return (
        record.trust -
        record.friction +
        record.familiarity * 0.35 +
        record.recentSharedOutcome * 0.4
      );
    });

  if (signals.length === 0) {
    return 32;
  }

  return signals.reduce((total, value) => total + value, 0) / signals.length;
}

export function deriveCompatibilityRelationships(
  context: SimSystemContext,
  operatorIds?: readonly string[],
): SocialCompatibilityRecord[] {
  const ids = [
    ...(operatorIds ??
      context.runtimeState.operatorEntities
        .filter((entity) => OperatorIdentity.lifecycleStatus[entity] === "active")
        .map((entity) => OperatorIdentity.id[entity])),
  ]
    .filter((id) => id.length > 0)
    .sort((left, right) => left.localeCompare(right));
  const results: SocialCompatibilityRecord[] = [];

  for (let index = 0; index < ids.length; index += 1) {
    for (let inner = index + 1; inner < ids.length; inner += 1) {
      results.push(buildSocialCompatibilityRecord(context, ids[index], ids[inner]));
    }
  }

  return results;
}

export function importLegacyRelationshipsIntoSocialState(
  context: SimSystemContext,
  records: readonly SocialCompatibilityRecord[],
): Array<{ operatorAId: string; operatorBId: string; stance: NotableTieStance; strength: number }> {
  if (context.runtimeState.notableTieEntities.length > 0) {
    return context.runtimeState.notableTieEntities.map((entity) => ({
      operatorAId: NotableTie.operatorAId[entity],
      operatorBId: NotableTie.operatorBId[entity],
      stance: NotableTie.stance[entity] as NotableTieStance,
      strength: NotableTie.strength[entity],
    }));
  }

  const ties: Array<{
    operatorAId: string;
    operatorBId: string;
    stance: NotableTieStance;
    strength: number;
  }> = [];

  records.forEach((record) => {
    const cohesion = clamp(
      50 +
        (record.trust - record.friction) * 0.5 +
        record.familiarity * 0.12 +
        record.recentSharedOutcome * 0.35,
      0,
      100,
    );
    const trustDelta = record.trust - record.friction;
    if (trustDelta >= 40 && cohesion >= 70) {
      ties.push({
        operatorAId: record.operatorAId,
        operatorBId: record.operatorBId,
        stance: record.familiarity >= 55 ? "trusted" : "preferred",
        strength: clamp(Math.round((trustDelta + cohesion) / 2), 35, 85),
      });
      return;
    }

    if (record.friction - record.trust >= 28 || record.recentSharedOutcome <= -12) {
      ties.push({
        operatorAId: record.operatorAId,
        operatorBId: record.operatorBId,
        stance: record.familiarity >= 45 ? "rival" : "resented",
        strength: clamp(Math.round((record.friction - record.trust + 60) / 2), 30, 80),
      });
    }
  });

  ties.forEach((tie) => {
    upsertNotableTie(context, tie.operatorAId, tie.operatorBId, tie.stance, tie.strength);
  });

  return ties;
}

export function ensureDispositionDefaults(context: SimSystemContext): void {
  context.runtimeState.operatorEntities.forEach((entity) => {
    const operatorId = OperatorIdentity.id[entity];
    if (operatorId.length > 0) {
      ensureOperatorDispositionEntity(context, operatorId);
    }
  });
}

function getPositiveTieEscalation(
  cohesion: number,
  raidCount: number,
  currentStance: string,
): NotableTieStance {
  if (currentStance === "mentorship" || currentStance === "trusted") {
    return currentStance as NotableTieStance;
  }
  if (cohesion >= 74 || raidCount >= 4) {
    return "trusted";
  }
  return "preferred";
}

export function updateSocialStateAfterSharedOutcome(
  context: SimSystemContext,
  operatorIds: readonly string[],
  result: "success" | "failure" | "mixed",
): void {
  const uniqueIds = [...new Set(operatorIds)].sort((left, right) => left.localeCompare(right));

  uniqueIds.forEach((operatorId) => {
    const dispositionEntity = ensureOperatorDispositionEntity(context, operatorId);
    if (dispositionEntity === undefined) {
      return;
    }

    const satisfactionDelta = result === "success" ? 3 : result === "mixed" ? 1 : -4;
    const grievanceDelta = result === "success" ? -2 : result === "mixed" ? 0 : 3;
    OperatorDisposition.satisfactionLevel[dispositionEntity] = clamp(
      OperatorDisposition.satisfactionLevel[dispositionEntity] + satisfactionDelta,
      0,
      100,
    );
    OperatorDisposition.grievanceLevel[dispositionEntity] = clamp(
      OperatorDisposition.grievanceLevel[dispositionEntity] + grievanceDelta,
      0,
      100,
    );
  });

  for (let index = 0; index < uniqueIds.length; index += 1) {
    for (let inner = index + 1; inner < uniqueIds.length; inner += 1) {
      const operatorAId = uniqueIds[index];
      const operatorBId = uniqueIds[inner];
      const existingTieEntity = findNotableTieEntity(context, operatorAId, operatorBId);
      const teamEntity = getTeamEntityForPair(context, operatorAId, operatorBId);
      const raidCount = teamEntity === undefined ? 0 : RecurringTeam.raidCount[teamEntity];
      const cohesion = computeSocialCohesion(context, operatorAId, operatorBId);

      if (existingTieEntity !== undefined) {
        const stance = NotableTie.stance[existingTieEntity] as NotableTieStance;
        const delta = result === "success" ? 6 : result === "mixed" ? 2 : -6;
        if (stance === "trusted" || stance === "preferred" || stance === "mentorship") {
          NotableTie.strength[existingTieEntity] = clamp(
            NotableTie.strength[existingTieEntity] + delta,
            0,
            100,
          );
          if (result === "success") {
            NotableTie.stance[existingTieEntity] = getPositiveTieEscalation(
              cohesion,
              raidCount,
              stance,
            );
          }
        } else if (stance === "resented" || stance === "rival") {
          const nextStrength = clamp(
            NotableTie.strength[existingTieEntity] + (result === "failure" ? 6 : -4),
            0,
            100,
          );
          if (nextStrength < 18) {
            removeEntity(context.world, existingTieEntity);
            removeTrackedEntity(context.runtimeState.notableTieEntities, existingTieEntity);
          } else {
            NotableTie.strength[existingTieEntity] = nextStrength;
          }
          if (result === "failure" && nextStrength >= 50) {
            NotableTie.stance[existingTieEntity] = "rival";
          }
        }
        continue;
      }

      if (result === "success" && (cohesion >= 66 || raidCount >= 2)) {
        upsertNotableTie(
          context,
          operatorAId,
          operatorBId,
          getPositiveTieEscalation(cohesion, raidCount, "preferred"),
          clamp(Math.round((cohesion + raidCount * 8) / 2), 36, 72),
        );
      } else if (result === "failure" && cohesion <= 38) {
        upsertNotableTie(
          context,
          operatorAId,
          operatorBId,
          raidCount >= 2 ? "rival" : "resented",
          clamp(Math.round((70 - cohesion) * 0.9), 30, 70),
        );
      }
    }
  }
}

export function applyRaidSocialOutcome(
  context: SimSystemContext,
  operatorIds: readonly string[],
  result: "success" | "failure" | "mixed",
): void {
  updateSocialStateAfterSharedOutcome(context, operatorIds, result);
}

export function describeTeamSummary(cohesion: number, raidCount: number, damaged: boolean): string {
  if (damaged) {
    return "Holding together after a recent loss. Recovery pressure is shaping every assignment.";
  }
  if (cohesion >= 75) {
    return `Locked-in crew with ${raidCount} shared raid${raidCount === 1 ? "" : "s"} behind them.`;
  }
  if (cohesion >= 58) {
    return "Steady team that has started trusting its own rhythm.";
  }
  if (cohesion >= 42) {
    return "Functional team identity, but not one that feels automatic yet.";
  }
  return "Fragile team structure that could still splinter under pressure.";
}

export function describeRoomCultureSummary(
  comfort: number,
  tension: number,
  camaraderie: number,
  tone: string,
): string {
  if (tension >= 70) {
    return `The room feels ${tone || "strained"} and brittle. People use it because they must, not because they want to linger.`;
  }
  if (comfort >= 60 && camaraderie >= 58) {
    return `The room feels ${tone || "settled"} and lived in. Staff can recover here without forcing it.`;
  }
  if (comfort >= 55) {
    return `The room feels ${tone || "serviceable"} and stable, even if it has not become a social anchor yet.`;
  }
  if (camaraderie >= 60) {
    return `The room feels ${tone || "animated"} and chatty. People make it work through each other more than the furniture.`;
  }
  return `The room feels ${tone || "neutral"} and utilitarian. It has not developed much identity yet.`;
}

// ── Phase 4: Social fallout deepening ─────────────────────────────────

/**
 * Apply social fallout after an operator death. Grief ties are created or
 * strengthened, morale and satisfaction drop for teammates, and recurring
 * teams that included the dead operator are marked as damaged.
 */
export function applySocialFalloutAfterDeath(
  context: SimSystemContext,
  deadOperatorId: string,
  teammateIds: readonly string[],
): void {
  const uniqueTeammates = [...new Set(teammateIds)].filter((id) => id !== deadOperatorId);

  // Create or strengthen grief ties between teammates and the dead operator
  for (const teammateId of uniqueTeammates) {
    const existingTie = findNotableTieEntity(context, teammateId, deadOperatorId);
    if (existingTie !== undefined) {
      NotableTie.stance[existingTie] = "grief";
      NotableTie.strength[existingTie] = clamp(NotableTie.strength[existingTie] + 20, 40, 100);
    } else {
      upsertNotableTie(context, teammateId, deadOperatorId, "grief", 55);
    }

    // Morale and satisfaction hit for each teammate
    const dispositionEntity = ensureOperatorDispositionEntity(context, teammateId);
    if (dispositionEntity !== undefined) {
      OperatorDisposition.satisfactionLevel[dispositionEntity] = clamp(
        OperatorDisposition.satisfactionLevel[dispositionEntity] - 8,
        0,
        100,
      );
      OperatorDisposition.grievanceLevel[dispositionEntity] = clamp(
        OperatorDisposition.grievanceLevel[dispositionEntity] + 6,
        0,
        100,
      );
    }

    const operatorEntity = context.runtimeState.operatorEntities.find(
      (e) => OperatorIdentity.id[e] === teammateId,
    );
    if (operatorEntity !== undefined) {
      MoraleState.current[operatorEntity] = clamp(MoraleState.current[operatorEntity] - 6, 0, 100);
      LoyaltyState.current[operatorEntity] = clamp(
        LoyaltyState.current[operatorEntity] - 3,
        0,
        100,
      );
    }
  }

  // Mark recurring teams containing the dead operator as damaged
  for (const teamEntity of context.runtimeState.recurringTeamEntities) {
    const members = RecurringTeam.memberIds[teamEntity] ?? [];
    if (members.includes(deadOperatorId)) {
      RecurringTeam.damaged[teamEntity] = 1;
      RecurringTeam.damageReason[teamEntity] = "operator_death";
      RecurringTeam.cohesion[teamEntity] = clamp(RecurringTeam.cohesion[teamEntity] - 15, 0, 100);
    }
  }

  // Create grief ties between surviving teammates
  for (let i = 0; i < uniqueTeammates.length; i += 1) {
    for (let j = i + 1; j < uniqueTeammates.length; j += 1) {
      const existingTie = findNotableTieEntity(context, uniqueTeammates[i], uniqueTeammates[j]);
      if (existingTie !== undefined) {
        // Shared grief strengthens existing bonds regardless of stance
        NotableTie.strength[existingTie] = clamp(NotableTie.strength[existingTie] + 8, 0, 100);
      }
    }
  }

  pushRuntimeEvent(context, {
    kind: "social_fallout",
    message: "The roster is absorbing the aftermath of a team death.",
    accent: "magma",
    targetKind: "operator",
    targetId: deadOperatorId,
  });
}

/**
 * Apply social fallout after a contract is lost or failed. Grievance rises,
 * satisfaction drops, and room culture tension increases in operations rooms.
 */
export function applySocialFalloutAfterContractLoss(context: SimSystemContext): void {
  // All active operators take a satisfaction and morale hit
  for (const entity of context.runtimeState.operatorEntities) {
    if (OperatorIdentity.lifecycleStatus[entity] !== "active") continue;
    const operatorId = OperatorIdentity.id[entity];
    MoraleState.current[entity] = clamp(MoraleState.current[entity] - 3, 0, 100);

    const dispositionEntity = ensureOperatorDispositionEntity(context, operatorId);
    if (dispositionEntity !== undefined) {
      OperatorDisposition.satisfactionLevel[dispositionEntity] = clamp(
        OperatorDisposition.satisfactionLevel[dispositionEntity] - 4,
        0,
        100,
      );
      OperatorDisposition.grievanceLevel[dispositionEntity] = clamp(
        OperatorDisposition.grievanceLevel[dispositionEntity] + 3,
        0,
        100,
      );
    }
  }

  // Operations and staffing rooms see tension spike
  for (const cultureEntity of context.runtimeState.roomCultureEntities) {
    const roomId = RoomCulture.roomInstanceId[cultureEntity];
    const roomEntity = context.runtimeState.roomEntities.find((e) => RoomInstance.id[e] === roomId);
    if (roomEntity === undefined) continue;
    const template = getRoomTemplateForEntity(context, roomEntity);
    if (template.tags.includes("room:operations") || template.tags.includes("room:staffing")) {
      RoomCulture.tension[cultureEntity] = clamp(RoomCulture.tension[cultureEntity] + 10, 0, 100);
      RoomCulture.camaraderie[cultureEntity] = clamp(
        RoomCulture.camaraderie[cultureEntity] - 5,
        0,
        100,
      );
    }
  }

  pushRuntimeEvent(context, {
    kind: "social_fallout",
    message: "Contract failure tightened the room and pushed the roster into a worse mood.",
    accent: "warning",
  });
}

/**
 * Apply social fallout after a public scandal or licensing hit. Reputation-
 * linked morale pressure spreads across the roster.
 */
export function applySocialFalloutAfterScandal(
  context: SimSystemContext,
  severity: "minor" | "major",
): void {
  const moraleHit = severity === "major" ? -5 : -2;
  const loyaltyHit = severity === "major" ? -3 : -1;
  const tensionSpike = severity === "major" ? 12 : 5;

  for (const entity of context.runtimeState.operatorEntities) {
    if (OperatorIdentity.lifecycleStatus[entity] !== "active") continue;
    MoraleState.current[entity] = clamp(MoraleState.current[entity] + moraleHit, 0, 100);
    LoyaltyState.current[entity] = clamp(LoyaltyState.current[entity] + loyaltyHit, 0, 100);
  }

  // All social/recovery rooms see tension spike from the scandal
  for (const cultureEntity of context.runtimeState.roomCultureEntities) {
    const roomId = RoomCulture.roomInstanceId[cultureEntity];
    const roomEntity = context.runtimeState.roomEntities.find((e) => RoomInstance.id[e] === roomId);
    if (roomEntity === undefined) continue;
    const template = getRoomTemplateForEntity(context, roomEntity);
    if (template.tags.includes("room:social") || template.tags.includes("room:recovery")) {
      RoomCulture.tension[cultureEntity] = clamp(
        RoomCulture.tension[cultureEntity] + tensionSpike,
        0,
        100,
      );
    }
  }

  pushRuntimeEvent(context, {
    kind: "social_fallout",
    message:
      severity === "major"
        ? "Institutional scrutiny is dragging morale and loyalty down across the guild."
        : "The latest scrutiny has started to depress the room.",
    accent: severity === "major" ? "magma" : "warning",
  });
}

/**
 * Apply positive social effects after a successful district recovery or
 * containment win. Morale recovers, room camaraderie improves.
 */
export function applySocialRecoveryAfterDistrictWin(context: SimSystemContext): void {
  for (const entity of context.runtimeState.operatorEntities) {
    if (OperatorIdentity.lifecycleStatus[entity] !== "active") continue;
    const operatorId = OperatorIdentity.id[entity];
    MoraleState.current[entity] = clamp(MoraleState.current[entity] + 3, 0, 100);

    const dispositionEntity = ensureOperatorDispositionEntity(context, operatorId);
    if (dispositionEntity !== undefined) {
      OperatorDisposition.satisfactionLevel[dispositionEntity] = clamp(
        OperatorDisposition.satisfactionLevel[dispositionEntity] + 4,
        0,
        100,
      );
      OperatorDisposition.grievanceLevel[dispositionEntity] = clamp(
        OperatorDisposition.grievanceLevel[dispositionEntity] - 2,
        0,
        100,
      );
    }
  }

  // Social and recovery rooms see camaraderie boost
  for (const cultureEntity of context.runtimeState.roomCultureEntities) {
    const roomId = RoomCulture.roomInstanceId[cultureEntity];
    const roomEntity = context.runtimeState.roomEntities.find((e) => RoomInstance.id[e] === roomId);
    if (roomEntity === undefined) continue;
    const template = getRoomTemplateForEntity(context, roomEntity);
    if (template.tags.includes("room:social") || template.tags.includes("room:recovery")) {
      RoomCulture.camaraderie[cultureEntity] = clamp(
        RoomCulture.camaraderie[cultureEntity] + 6,
        0,
        100,
      );
      RoomCulture.tension[cultureEntity] = clamp(RoomCulture.tension[cultureEntity] - 4, 0, 100);
    }
  }

  pushRuntimeEvent(context, {
    kind: "social_fallout",
    message: "A clean district recovery steadied the roster and eased room tension.",
    accent: "gold",
  });
}

/**
 * Apply room culture shift when an incident resolves through a specific
 * room's domain (e.g., an incident resolved in a social room changes that
 * room's culture based on the resolution tone).
 */
export function applyRoomCultureShiftFromIncident(
  context: SimSystemContext,
  roomId: string,
  resolutionTone: "positive" | "negative" | "neutral",
): void {
  const cultureEntity = context.runtimeState.roomCultureEntities.find(
    (e) => RoomCulture.roomInstanceId[e] === roomId,
  );
  if (cultureEntity === undefined) return;

  switch (resolutionTone) {
    case "positive":
      RoomCulture.tension[cultureEntity] = clamp(RoomCulture.tension[cultureEntity] - 6, 0, 100);
      RoomCulture.camaraderie[cultureEntity] = clamp(
        RoomCulture.camaraderie[cultureEntity] + 4,
        0,
        100,
      );
      RoomCulture.comfort[cultureEntity] = clamp(RoomCulture.comfort[cultureEntity] + 2, 0, 100);
      break;
    case "negative":
      RoomCulture.tension[cultureEntity] = clamp(RoomCulture.tension[cultureEntity] + 8, 0, 100);
      RoomCulture.camaraderie[cultureEntity] = clamp(
        RoomCulture.camaraderie[cultureEntity] - 4,
        0,
        100,
      );
      break;
    case "neutral":
      RoomCulture.tension[cultureEntity] = clamp(RoomCulture.tension[cultureEntity] - 2, 0, 100);
      break;
  }
}

/**
 * Apply increased retention pressure on operators involved in repeated
 * death events, poor recovery outcomes, or bad faction standing.
 */
export function applyRetentionPressureFromPatterns(
  context: SimSystemContext,
  operatorId: string,
  pattern: "repeated_death_exposure" | "poor_recovery" | "faction_hostility",
): void {
  const entity = context.runtimeState.operatorEntities.find(
    (e) => OperatorIdentity.id[e] === operatorId,
  );
  if (entity === undefined || OperatorIdentity.lifecycleStatus[entity] !== "active") return;

  const dispositionEntity = ensureOperatorDispositionEntity(context, operatorId);
  if (dispositionEntity === undefined) return;

  switch (pattern) {
    case "repeated_death_exposure":
      LoyaltyState.current[entity] = clamp(LoyaltyState.current[entity] - 5, 0, 100);
      OperatorDisposition.grievanceLevel[dispositionEntity] = clamp(
        OperatorDisposition.grievanceLevel[dispositionEntity] + 8,
        0,
        100,
      );
      OperatorDisposition.satisfactionLevel[dispositionEntity] = clamp(
        OperatorDisposition.satisfactionLevel[dispositionEntity] - 6,
        0,
        100,
      );
      break;
    case "poor_recovery":
      MoraleState.current[entity] = clamp(MoraleState.current[entity] - 4, 0, 100);
      OperatorDisposition.grievanceLevel[dispositionEntity] = clamp(
        OperatorDisposition.grievanceLevel[dispositionEntity] + 5,
        0,
        100,
      );
      break;
    case "faction_hostility":
      LoyaltyState.current[entity] = clamp(LoyaltyState.current[entity] - 3, 0, 100);
      OperatorDisposition.satisfactionLevel[dispositionEntity] = clamp(
        OperatorDisposition.satisfactionLevel[dispositionEntity] - 4,
        0,
        100,
      );
      break;
  }
}

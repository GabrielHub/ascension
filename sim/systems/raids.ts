import { addComponent, addEntity, removeEntity } from "bitecs";

import {
  AssignmentState,
  BuildingAuthority,
  GuildState,
  InjuryState,
  LoyaltyState,
  MoraleState,
  NeedState,
  OperatorIdentity,
  PreferenceState,
  RaidOpportunityState,
  RaidParticipationState,
  RelationshipState,
  ScheduleState,
} from "../components";
import {
  appendHistoryTags,
  clamp,
  formatWorldTimestamp,
  getCurrentAbsoluteMinute,
  getPairOrder,
  removeTrackedEntity,
} from "./commands";
import { reconcileAssignmentsSystem } from "./assignment";
import type { SimSystem, SimSystemContext } from "./types";

const MAX_OPEN_OPPORTUNITIES = 3;
const FORMATION_DELAY_MINUTES = 60;
const DEFAULT_OPPORTUNITY_LIFETIME_MINUTES = 300;
const OPPORTUNITY_LOCATIONS = [
  "district/lower-east-side",
  "district/queens-railyard",
  "district/bronx-overpass",
  "district/red-hook-waterfront",
  "district/harlem-substation",
] as const;

export interface RaidReadinessSignal {
  availabilityScore: number;
  willingnessScore: number;
  readinessScore: number;
  schedulePressure: number;
}

function getMissionTemplate(context: SimSystemContext, missionId: string) {
  return context.registry.missionById.get(missionId) ?? context.registry.missions[0];
}

export function getRecommendedOperatorCountForMission(baseDurationHours: number): number {
  return clamp(Math.ceil(baseDurationHours / 3), 2, 3);
}

export function computeSchedulePressure(currentBlock: string): number {
  switch (currentBlock) {
    case "raid":
      return 100;
    case "recovery":
      return 88;
    case "training":
      return 54;
    case "social":
      return 38;
    case "work":
      return 44;
    case "rest":
      return 30;
    default:
      return 18;
  }
}

function getRelationshipEntityForPair(
  context: SimSystemContext,
  leftId: string,
  rightId: string,
): number | undefined {
  const [operatorAId, operatorBId] = getPairOrder(leftId, rightId);

  return context.runtimeState.relationshipEntities.find((entity) => {
    return (
      RelationshipState.operatorAId[entity] === operatorAId &&
      RelationshipState.operatorBId[entity] === operatorBId
    );
  });
}

function getMissionPreferenceScore(entity: number, missionTags: readonly string[]): number {
  const preferredTags = PreferenceState.preferredMissionTags[entity] ?? [];
  return preferredTags.reduce((total, tag) => {
    return total + (missionTags.includes(tag) ? 9 : 0);
  }, 0);
}

function getPreferredPartnerBonus(entity: number, partnerIds: readonly string[]): number {
  const preferredPartnerIds = PreferenceState.preferredPartnerIds[entity] ?? [];
  return partnerIds.reduce((total, partnerId) => {
    return total + (preferredPartnerIds.includes(partnerId) ? 8 : 0);
  }, 0);
}

export function computeRelationshipCohesion(
  context: SimSystemContext,
  leftId: string,
  rightId: string,
): number {
  const relationshipEntity = getRelationshipEntityForPair(context, leftId, rightId);
  if (relationshipEntity === undefined) {
    return 48;
  }

  return clamp(
    50 +
      (RelationshipState.trust[relationshipEntity] -
        RelationshipState.friction[relationshipEntity]) *
        0.5 +
      RelationshipState.familiarity[relationshipEntity] * 0.12 +
      RelationshipState.recentSharedOutcome[relationshipEntity] * 0.35,
    0,
    100,
  );
}

function computeTeamCohesion(context: SimSystemContext, operatorIds: readonly string[]): number {
  if (operatorIds.length < 2) {
    return 50;
  }

  const pairScores: number[] = [];
  for (let index = 0; index < operatorIds.length; index += 1) {
    for (let otherIndex = index + 1; otherIndex < operatorIds.length; otherIndex += 1) {
      pairScores.push(
        computeRelationshipCohesion(context, operatorIds[index], operatorIds[otherIndex]),
      );
    }
  }

  if (pairScores.length === 0) {
    return 50;
  }

  return pairScores.reduce((total, value) => total + value, 0) / pairScores.length;
}

function computeRiskRewardFit(
  context: SimSystemContext,
  entity: number,
  opportunityEntity: number,
): number {
  const riskGap = Math.abs(
    PreferenceState.riskTolerance[entity] - RaidOpportunityState.risk[opportunityEntity],
  );
  const rewardPull =
    (RaidOpportunityState.reward[opportunityEntity] / 2) *
    (PreferenceState.rewardFocus[entity] / 100);
  const intelConfidence = RaidOpportunityState.intel[opportunityEntity] * 0.12;
  const missionFit = getMissionPreferenceScore(
    entity,
    getMissionTemplate(context, RaidOpportunityState.missionId[opportunityEntity]).tags,
  );

  return clamp(22 + rewardPull + intelConfidence + missionFit - riskGap * 0.4, 0, 100);
}

export function computeOperatorRaidReadiness(
  context: SimSystemContext,
  entity: number,
  opportunityEntity: number,
): RaidReadinessSignal {
  const schedulePressure = computeSchedulePressure(ScheduleState.currentBlock[entity] || "idle");
  const assignmentPenalty = AssignmentState.kind[entity] === "raid" ? 40 : 0;
  const availabilityScore = clamp(
    100 -
      InjuryState.severity[entity] * 0.85 -
      NeedState.fatigue[entity] * 0.55 -
      NeedState.stress[entity] * 0.35 -
      NeedState.hunger[entity] * 0.18 -
      schedulePressure * 0.45 -
      assignmentPenalty +
      LoyaltyState.current[entity] * 0.08,
    0,
    100,
  );
  const willingnessScore = clamp(
    availabilityScore * 0.6 +
      MoraleState.current[entity] * 0.26 +
      LoyaltyState.current[entity] * 0.18 +
      computeRiskRewardFit(context, entity, opportunityEntity) +
      (ScheduleState.currentBlock[entity] === "rest"
        ? -PreferenceState.recoveryBias[entity] * 0.12
        : 0),
    0,
    100,
  );

  return {
    availabilityScore,
    willingnessScore,
    readinessScore: clamp(
      (availabilityScore + willingnessScore) / 2 + (100 - InjuryState.severity[entity]) * 0.08,
      0,
      100,
    ),
    schedulePressure,
  };
}

function removeRaidOpportunityEntity(context: SimSystemContext, entity: number): void {
  removeEntity(context.world, entity);
  removeTrackedEntity(context.runtimeState.raidOpportunityEntities, entity);
}

function updateOpportunityLifecycle(context: SimSystemContext): void {
  const currentMinute = getCurrentAbsoluteMinute(context);

  context.runtimeState.raidOpportunityEntities.slice().forEach((entity) => {
    if (currentMinute < RaidOpportunityState.expiresAtTick[entity]) {
      return;
    }

    removeRaidOpportunityEntity(context, entity);
  });
}

function spawnRaidOpportunity(context: SimSystemContext): void {
  const buildingEntity = context.singletonEntities.building;
  const guildEntity = context.singletonEntities.guild;
  const currentMinute = getCurrentAbsoluteMinute(context);

  const livingOperatorCount = context.runtimeState.operatorEntities.filter(
    (entity) => OperatorIdentity.lifecycleStatus[entity] !== "dead",
  ).length;
  if (livingOperatorCount < 2) {
    return;
  }

  if (context.runtimeState.raidOpportunityEntities.length >= MAX_OPEN_OPPORTUNITIES) {
    return;
  }

  const spawnInterval = clamp(
    210 -
      GuildState.reputation[guildEntity] * 8 -
      (BuildingAuthority.pressure[buildingEntity] ?? 0) * 6,
    120,
    240,
  );
  const lastRaidOpportunityTick = BuildingAuthority.lastRaidOpportunityTick[buildingEntity] ?? 0;
  if (currentMinute - lastRaidOpportunityTick < spawnInterval) {
    return;
  }

  const sequence = context.runtimeState.nextOpportunitySequence;
  const missionIndex =
    (sequence +
      GuildState.reputation[guildEntity] +
      (BuildingAuthority.pressure[buildingEntity] ?? 0) +
      Math.floor(currentMinute / 120)) %
    context.registry.missions.length;
  const mission = context.registry.missions[missionIndex];
  const entity = addEntity(context.world);
  const rewardShapeBonus =
    mission.rewardShape === "hybrid" ? 22 : mission.rewardShape === "loot" ? 16 : 10;

  addComponent(context.world, entity, RaidOpportunityState);
  RaidOpportunityState.id[entity] = `opportunity/${sequence}`;
  RaidOpportunityState.missionId[entity] = mission.id;
  RaidOpportunityState.location[entity] =
    OPPORTUNITY_LOCATIONS[(sequence - 1) % OPPORTUNITY_LOCATIONS.length];
  RaidOpportunityState.threat[entity] = clamp(
    34 + mission.baseDurationHours * 8 + GuildState.reputation[guildEntity] * 2 + (sequence % 11),
    20,
    95,
  );
  RaidOpportunityState.intel[entity] = clamp(
    28 +
      GuildState.intel[guildEntity] * 18 +
      mission.expectedThreatTags.length * 6 -
      (BuildingAuthority.pressure[buildingEntity] ?? 0) * 4 +
      (sequence % 9),
    10,
    92,
  );
  RaidOpportunityState.reward[entity] = clamp(
    54 + mission.baseDurationHours * 18 + rewardShapeBonus + GuildState.reputation[guildEntity] * 4,
    40,
    180,
  );
  RaidOpportunityState.risk[entity] = clamp(
    RaidOpportunityState.threat[entity] +
      mission.expectedThreatTags.length * 4 -
      RaidOpportunityState.intel[entity] * 0.35,
    18,
    96,
  );
  RaidOpportunityState.status[entity] = "open";
  RaidOpportunityState.interestedOperatorIds[entity] = [];
  RaidOpportunityState.claimedOperatorIds[entity] = [];
  RaidOpportunityState.createdTick[entity] = currentMinute;
  RaidOpportunityState.expiresAtTick[entity] =
    currentMinute + DEFAULT_OPPORTUNITY_LIFETIME_MINUTES - mission.baseDurationHours * 10;

  context.runtimeState.raidOpportunityEntities.push(entity);
  context.runtimeState.nextOpportunitySequence += 1;
  BuildingAuthority.lastRaidOpportunityTick[buildingEntity] = currentMinute;
}

function getSortedOpportunityEntities(context: SimSystemContext): number[] {
  return [...context.runtimeState.raidOpportunityEntities].sort((left, right) => {
    const createdTickDelta =
      RaidOpportunityState.createdTick[left] - RaidOpportunityState.createdTick[right];
    if (createdTickDelta !== 0) {
      return createdTickDelta;
    }

    return RaidOpportunityState.id[left].localeCompare(RaidOpportunityState.id[right]);
  });
}

function planOpportunityTeam(
  context: SimSystemContext,
  opportunityEntity: number,
  reservedOperatorIds: Set<string>,
) {
  const mission = getMissionTemplate(context, RaidOpportunityState.missionId[opportunityEntity]);
  const minimumRaidSize = getRecommendedOperatorCountForMission(mission.baseDurationHours);

  const candidates = context.runtimeState.operatorEntities
    .filter((entity) => {
      return (
        OperatorIdentity.lifecycleStatus[entity] !== "dead" &&
        !reservedOperatorIds.has(OperatorIdentity.id[entity]) &&
        RaidParticipationState.activeRaidId[entity].length === 0 &&
        InjuryState.severity[entity] < 70
      );
    })
    .map((entity) => {
      const readiness = computeOperatorRaidReadiness(context, entity, opportunityEntity);
      return {
        entity,
        readiness,
      };
    })
    .filter(({ readiness }) => readiness.willingnessScore >= 54)
    .sort((left, right) => {
      const readinessDelta = right.readiness.willingnessScore - left.readiness.willingnessScore;
      if (readinessDelta !== 0) {
        return readinessDelta;
      }

      return OperatorIdentity.id[left.entity].localeCompare(OperatorIdentity.id[right.entity]);
    });

  const interestedOperatorIds = candidates.map(({ entity }) => OperatorIdentity.id[entity]);
  const desiredRaidSize = Math.min(
    minimumRaidSize + 1,
    Math.max(minimumRaidSize, candidates.length),
  );
  const team: typeof candidates = [];

  if (candidates.length > 0) {
    team.push(candidates[0]);
  }

  const chosenIdSet = new Set(team.map(({ entity }) => OperatorIdentity.id[entity]));

  while (team.length < desiredRaidSize) {
    const remaining = candidates.filter(
      ({ entity }) => !chosenIdSet.has(OperatorIdentity.id[entity]),
    );
    if (remaining.length === 0) {
      break;
    }

    const nextCandidate = remaining
      .map((candidate) => {
        const cohesionScore =
          team.length === 0
            ? 50
            : team.reduce((total, teammate) => {
                return (
                  total +
                  computeRelationshipCohesion(
                    context,
                    OperatorIdentity.id[teammate.entity],
                    OperatorIdentity.id[candidate.entity],
                  )
                );
              }, 0) / team.length;
        const partnerBonus = getPreferredPartnerBonus(candidate.entity, [...chosenIdSet]);
        const selectionScore =
          candidate.readiness.willingnessScore + cohesionScore * 0.35 + partnerBonus;

        return {
          candidate,
          selectionScore,
        };
      })
      .sort((left, right) => {
        const scoreDelta = right.selectionScore - left.selectionScore;
        if (scoreDelta !== 0) {
          return scoreDelta;
        }

        return OperatorIdentity.id[left.candidate.entity].localeCompare(
          OperatorIdentity.id[right.candidate.entity],
        );
      })[0];

    if (!nextCandidate) {
      break;
    }

    if (team.length >= minimumRaidSize && nextCandidate.selectionScore < 62) {
      break;
    }

    team.push(nextCandidate.candidate);
    chosenIdSet.add(OperatorIdentity.id[nextCandidate.candidate.entity]);
  }

  const teamIds = team.map(({ entity }) => OperatorIdentity.id[entity]);
  const teamCohesion = computeTeamCohesion(context, teamIds);
  const averageReadiness =
    team.reduce((total, member) => total + member.readiness.readinessScore, 0) /
    Math.max(1, team.length);

  return {
    minimumRaidSize,
    interestedOperatorIds,
    claimedOperatorIds:
      team.length >= minimumRaidSize && averageReadiness + teamCohesion * 0.2 >= 82 ? teamIds : [],
    averageReadiness,
    teamCohesion,
  };
}

function refreshOpportunityClaims(context: SimSystemContext): void {
  const currentMinute = getCurrentAbsoluteMinute(context);
  const reservedOperatorIds = new Set<string>();

  getSortedOpportunityEntities(context).forEach((opportunityEntity) => {
    const plan = planOpportunityTeam(context, opportunityEntity, reservedOperatorIds);
    const age = currentMinute - RaidOpportunityState.createdTick[opportunityEntity];

    RaidOpportunityState.interestedOperatorIds[opportunityEntity] = [...plan.interestedOperatorIds];

    if (age >= FORMATION_DELAY_MINUTES && plan.claimedOperatorIds.length > 0) {
      RaidOpportunityState.status[opportunityEntity] = "forming";
      RaidOpportunityState.claimedOperatorIds[opportunityEntity] = [...plan.claimedOperatorIds];
      plan.claimedOperatorIds.forEach((operatorId) => reservedOperatorIds.add(operatorId));
      return;
    }

    RaidOpportunityState.status[opportunityEntity] = "open";
    RaidOpportunityState.claimedOperatorIds[opportunityEntity] = [];
  });
}

function createResolutionPacket(
  context: SimSystemContext,
  opportunityEntity: number,
  operatorEntities: number[],
  averageReadiness: number,
  teamCohesion: number,
) {
  const mission = getMissionTemplate(context, RaidOpportunityState.missionId[opportunityEntity]);
  const opportunityRisk = RaidOpportunityState.risk[opportunityEntity];
  const opportunityThreat = RaidOpportunityState.threat[opportunityEntity];
  const opportunityReward = RaidOpportunityState.reward[opportunityEntity];
  const challengeScore =
    opportunityRisk +
    opportunityThreat * 0.45 +
    mission.baseDurationHours * 4 -
    RaidOpportunityState.intel[opportunityEntity] * 0.16;
  const teamScore =
    averageReadiness +
    teamCohesion * 0.4 +
    GuildState.intel[context.singletonEntities.guild] * 6 +
    mission.expectedThreatTags.length * 2;
  const result =
    teamScore >= challengeScore + 12
      ? "success"
      : teamScore >= challengeScore - 6
        ? "mixed"
        : "failure";

  return {
    result,
    reputationDelta: result === "success" ? 7 : result === "mixed" ? 2 : -5,
    cashDelta:
      result === "success"
        ? Math.round(opportunityReward)
        : result === "mixed"
          ? Math.round(opportunityReward * 0.55)
          : -Math.round(opportunityRisk * 0.5),
    operatorOutcomes: operatorEntities.map((entity, index) => {
      const injuryDelta =
        result === "failure"
          ? Math.round(opportunityRisk * 0.22) + 10 + index * 2
          : result === "mixed"
            ? Math.round(opportunityRisk * 0.12) + 4 + index
            : Math.round(opportunityRisk * 0.05) + index;
      const totalInjury = InjuryState.severity[entity] + injuryDelta;
      const died = result === "failure" && totalInjury >= 95 && opportunityRisk >= 70;

      return {
        operatorId: OperatorIdentity.id[entity],
        injuryDelta,
        moraleDelta:
          result === "failure"
            ? -10
            : result === "mixed"
              ? -3
              : 6 + Math.round(teamCohesion * 0.04),
        loyaltyDelta: result === "failure" ? -7 : result === "mixed" ? -2 : 3,
        status: injuryDelta >= 16 ? "hurt" : result === "failure" ? "shaken" : "steady",
        ...(died ? { died: true } : {}),
      };
    }),
    narrativeTags: [
      `mission:${mission.objectiveType}`,
      `location:${RaidOpportunityState.location[opportunityEntity]}`,
      `result:${result}`,
    ],
    intelMismatchTags:
      RaidOpportunityState.intel[opportunityEntity] >= 60
        ? []
        : [`intel:${mission.intelConfidenceFloor}`],
  };
}

function updateRelationshipOutcomes(
  context: SimSystemContext,
  operatorIds: readonly string[],
  result: "success" | "failure" | "mixed",
  missionObjectiveType: string,
): void {
  for (let index = 0; index < operatorIds.length; index += 1) {
    for (let otherIndex = index + 1; otherIndex < operatorIds.length; otherIndex += 1) {
      const relationshipEntity = getRelationshipEntityForPair(
        context,
        operatorIds[index],
        operatorIds[otherIndex],
      );
      if (relationshipEntity === undefined) {
        continue;
      }

      const trustDelta = result === "success" ? 6 : result === "mixed" ? 2 : -4;
      const frictionDelta = result === "success" ? -3 : result === "mixed" ? 1 : 6;
      const outcomeDelta = result === "success" ? 14 : result === "mixed" ? 4 : -12;

      RelationshipState.trust[relationshipEntity] = clamp(
        RelationshipState.trust[relationshipEntity] + trustDelta,
        0,
        100,
      );
      RelationshipState.friction[relationshipEntity] = clamp(
        RelationshipState.friction[relationshipEntity] + frictionDelta,
        0,
        100,
      );
      RelationshipState.familiarity[relationshipEntity] = clamp(
        RelationshipState.familiarity[relationshipEntity] + 4,
        0,
        100,
      );
      RelationshipState.recentSharedOutcome[relationshipEntity] = clamp(
        RelationshipState.recentSharedOutcome[relationshipEntity] * 0.35 + outcomeDelta,
        -30,
        30,
      );
      RelationshipState.historyTags[relationshipEntity] = appendHistoryTags(
        RelationshipState.historyTags[relationshipEntity] ?? [],
        [`mission:${missionObjectiveType}`, `outcome:${result}`],
      );
    }
  }
}

function launchOpportunityRaid(context: SimSystemContext, opportunityEntity: number): void {
  const mission = getMissionTemplate(context, RaidOpportunityState.missionId[opportunityEntity]);
  const claimedOperatorIds = [
    ...(RaidOpportunityState.claimedOperatorIds[opportunityEntity] ?? []),
  ];
  const operatorEntities = claimedOperatorIds
    .map((operatorId) => {
      return context.runtimeState.operatorEntities.find(
        (entity) => OperatorIdentity.id[entity] === operatorId,
      );
    })
    .filter((entity): entity is number => entity !== undefined);

  if (operatorEntities.length < getRecommendedOperatorCountForMission(mission.baseDurationHours)) {
    return;
  }

  const startedTick = getCurrentAbsoluteMinute(context);
  const raidId = `raid/${context.runtimeState.nextRaidSequence}`;
  const returnTick = startedTick + mission.baseDurationHours * 60;
  const averageReadiness =
    operatorEntities.reduce((total, entity) => {
      return (
        total + computeOperatorRaidReadiness(context, entity, opportunityEntity).readinessScore
      );
    }, 0) / Math.max(1, operatorEntities.length);
  const teamCohesion = computeTeamCohesion(context, claimedOperatorIds);

  BuildingAuthority.activeRaidPackets[context.singletonEntities.building] = [
    ...(BuildingAuthority.activeRaidPackets[context.singletonEntities.building] ?? []),
    {
      id: raidId,
      opportunityId: RaidOpportunityState.id[opportunityEntity],
      missionId: mission.id,
      location: RaidOpportunityState.location[opportunityEntity],
      startedAt: formatWorldTimestamp(context),
      startedTick,
      revealProgress: 0,
      operatorIds: claimedOperatorIds,
      returnTick,
      durationHours: mission.baseDurationHours,
      threat: RaidOpportunityState.threat[opportunityEntity],
      intel: RaidOpportunityState.intel[opportunityEntity],
      reward: RaidOpportunityState.reward[opportunityEntity],
      cohesion: teamCohesion,
      resolutionPacket: createResolutionPacket(
        context,
        opportunityEntity,
        operatorEntities,
        averageReadiness,
        teamCohesion,
      ),
    },
  ];

  operatorEntities.forEach((entity) => {
    RaidParticipationState.activeRaidId[entity] = raidId;
    RaidParticipationState.missionId[entity] = mission.id;
    RaidParticipationState.returnTick[entity] = returnTick;
    AssignmentState.kind[entity] = "raid";
    AssignmentState.targetId[entity] = raidId;
    ScheduleState.currentBlock[entity] = "raid";
  });

  GuildState.intel[context.singletonEntities.guild] = Math.max(
    0,
    GuildState.intel[context.singletonEntities.guild] - 1,
  );
  context.runtimeState.nextRaidSequence += 1;
  removeRaidOpportunityEntity(context, opportunityEntity);
}

function launchFormedRaids(context: SimSystemContext): void {
  getSortedOpportunityEntities(context)
    .filter((entity) => RaidOpportunityState.status[entity] === "forming")
    .forEach((entity) => {
      launchOpportunityRaid(context, entity);
    });
}

function resolveCompletedRaids(context: SimSystemContext, deltaMs: number): boolean {
  const buildingEntity = context.singletonEntities.building;
  if ((BuildingAuthority.activeRaidPackets[buildingEntity] ?? []).length === 0) {
    return false;
  }

  const currentMinute = getCurrentAbsoluteMinute(context);
  let resolvedRaid = false;
  const operatorEntityById = new Map(
    context.runtimeState.operatorEntities.map((entity) => [OperatorIdentity.id[entity], entity]),
  );
  const nextPackets = (BuildingAuthority.activeRaidPackets[buildingEntity] ?? []).filter(
    (packet) => {
      const totalDurationMinutes = Math.max(60, packet.durationHours * 60);
      packet.revealProgress = clamp(
        ((currentMinute - packet.startedTick) / totalDurationMinutes) * 100,
        0,
        100,
      );

      if (deltaMs <= 0 || currentMinute < packet.returnTick) {
        return true;
      }

      resolvedRaid = true;
      GuildState.treasury[context.singletonEntities.guild] += packet.resolutionPacket.cashDelta;
      GuildState.reputation[context.singletonEntities.guild] +=
        packet.resolutionPacket.reputationDelta;

      packet.resolutionPacket.operatorOutcomes.forEach((outcome) => {
        const operatorEntity = operatorEntityById.get(outcome.operatorId);
        if (operatorEntity === undefined) {
          return;
        }

        MoraleState.current[operatorEntity] = clamp(
          MoraleState.current[operatorEntity] + outcome.moraleDelta,
          0,
          100,
        );
        LoyaltyState.current[operatorEntity] = clamp(
          LoyaltyState.current[operatorEntity] + outcome.loyaltyDelta,
          0,
          100,
        );
        InjuryState.severity[operatorEntity] = clamp(
          InjuryState.severity[operatorEntity] + outcome.injuryDelta,
          0,
          100,
        );
        InjuryState.recoveryHoursRemaining[operatorEntity] = Math.max(
          InjuryState.recoveryHoursRemaining[operatorEntity],
          outcome.injuryDelta * 0.75,
        );
        RaidParticipationState.activeRaidId[operatorEntity] = "";
        RaidParticipationState.missionId[operatorEntity] = "";
        RaidParticipationState.returnTick[operatorEntity] = 0;

        if (outcome.died) {
          OperatorIdentity.lifecycleStatus[operatorEntity] = "dead";
          OperatorIdentity.deathTick[operatorEntity] = getCurrentAbsoluteMinute(context);
          OperatorIdentity.deathRaidSummaryId[operatorEntity] = packet.id;
          AssignmentState.kind[operatorEntity] = "idle";
          AssignmentState.targetId[operatorEntity] = "";
          ScheduleState.currentBlock[operatorEntity] = "idle";
          return;
        }

        AssignmentState.kind[operatorEntity] =
          InjuryState.recoveryHoursRemaining[operatorEntity] > 0 ? "recovery" : "idle";
        AssignmentState.targetId[operatorEntity] = "";
      });

      updateRelationshipOutcomes(
        context,
        packet.operatorIds,
        packet.resolutionPacket.result,
        getMissionTemplate(context, packet.missionId).objectiveType,
      );

      BuildingAuthority.raidSummaries[buildingEntity] = [
        ...(BuildingAuthority.raidSummaries[buildingEntity] ?? []),
        {
          id: packet.id,
          opportunityId: packet.opportunityId,
          missionId: packet.missionId,
          location: packet.location,
          startedAt: packet.startedAt,
          endedAt: formatWorldTimestamp(context),
          result: packet.resolutionPacket.result,
          reputationDelta: packet.resolutionPacket.reputationDelta,
          cashDelta: packet.resolutionPacket.cashDelta,
          threat: packet.threat,
          intel: packet.intel,
          reward: packet.reward,
          cohesion: packet.cohesion,
          operatorOutcomes: packet.resolutionPacket.operatorOutcomes,
          narrativeTags: packet.resolutionPacket.narrativeTags,
          intelMismatchTags: packet.resolutionPacket.intelMismatchTags,
        },
      ];

      return false;
    },
  );

  BuildingAuthority.activeRaidPackets[buildingEntity] = nextPackets;
  return resolvedRaid;
}

export const resolveRaidSystem: SimSystem = (context, deltaMs) => {
  updateOpportunityLifecycle(context);
  if (deltaMs > 0) {
    spawnRaidOpportunity(context);
  }

  refreshOpportunityClaims(context);
  if (deltaMs > 0) {
    launchFormedRaids(context);
  }

  if (resolveCompletedRaids(context, deltaMs)) {
    reconcileAssignmentsSystem(context, 0);
  }
};

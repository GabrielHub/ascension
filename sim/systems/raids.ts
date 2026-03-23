import { addComponent, addEntity, removeEntity } from "bitecs";

import {
  AssignmentState,
  BuildingAuthority,
  type ActiveRaidResolutionPacket,
  type ContractSiteState,
  GuildState,
  InjuryState,
  LoyaltyState,
  MoraleState,
  NeedState,
  NotableTie,
  OperatorDisposition,
  OperatorIdentity,
  PreferenceState,
  RaidOpportunityState,
  RaidParticipationState,
  RecurringTeam,
  RoomCulture,
  ScheduleState,
  WorldTimeState,
} from "../components";
import {
  clamp,
  formatWorldTimestamp,
  getCurrentAbsoluteMinute,
  pushRuntimeEvent,
  removeTrackedEntity,
} from "./commands";
import { reconcileAssignmentsSystem } from "./assignment";
import { addToInventory, autoSelectAccessory, unequipItem } from "./inventory";
import { computeAutonomyFlags } from "./morale";
import {
  applyRaidSocialOutcome,
  computeSocialCohesion,
  findRecurringTeamForMembers,
  findDispositionEntity,
  getRecurringTeamCohesionBonus,
  upsertNotableTie,
} from "./social";
import { SeededRng, weightedChoice, boundedRoll, seedFromKey } from "../uncertainty";
import type { RaidTeamGoal } from "render/types";
import type {
  RaidEncounterThreat,
  RaidFeatureKind,
  RaidOperatorReadiness,
  RaidPresentationEnemy,
  RaidPresentationEvent,
  RaidPresentationFeature,
  RaidPresentationTeam,
  RuntimeCueId,
  SimSystem,
  SimSystemContext,
} from "./types";

export type { RaidTeamGoal } from "render/types";

const MAX_OPEN_OPPORTUNITIES = 1;
const FORMATION_DELAY_MINUTES = 60;
const DEFAULT_OPPORTUNITY_LIFETIME_MINUTES = 300;
const OPPORTUNITY_LOCATIONS = [
  "district/lower-east-side",
  "district/queens-railyard",
  "district/bronx-overpass",
  "district/red-hook-waterfront",
  "district/harlem-substation",
] as const;

const FOG_GRID_WIDTH = 16;
const FOG_GRID_HEIGHT = 16;

export interface RaidReadinessSignal {
  availabilityScore: number;
  willingnessScore: number;
  readinessScore: number;
  schedulePressure: number;
}

function pushRuntimeCue(context: SimSystemContext, cueId: RuntimeCueId): void {
  context.runtimeState.pendingCueIds.push(cueId);
}

function getCellCenter(x: number, y: number) {
  return {
    x: x * 32 + 16,
    y: y * 32 + 16,
  };
}

function upsertRaidEvent(
  events: RaidPresentationEvent[],
  event: RaidPresentationEvent,
  maxEvents = 10,
): void {
  if (events.some((existing) => existing.id === event.id)) {
    return;
  }

  events.push(event);
  events.sort((left, right) => right.tick - left.tick || left.id.localeCompare(right.id));
  if (events.length > maxEvents) {
    events.length = maxEvents;
  }
}

function resolveRaidOperatorReadiness(entity: number): RaidOperatorReadiness {
  if (OperatorIdentity.lifecycleStatus[entity] !== "active") {
    return "critical";
  }
  if (InjuryState.severity[entity] >= 65) {
    return "critical";
  }
  if (InjuryState.severity[entity] >= 25) {
    return "injured";
  }
  if (NeedState.fatigue[entity] >= 55 || NeedState.stress[entity] >= 55) {
    return "fatigued";
  }
  return "ready";
}

function ensureRaidPresentationSeed(context: SimSystemContext, contractSiteId: string): void {
  if (context.runtimeState.raidPresentation.contractSiteId === contractSiteId) {
    return;
  }

  const rng = new SeededRng(seedFromKey(`raid-presentation:${contractSiteId}`));
  const features: RaidPresentationFeature[] = [
    {
      id: `${contractSiteId}:feature:intel-0`,
      kind: "intel-node",
      discovered: false,
      ...getCellCenter(3, 3),
    },
    {
      id: `${contractSiteId}:feature:loot-0`,
      kind: "loot-cache",
      discovered: false,
      ...getCellCenter(8, 4),
    },
    {
      id: `${contractSiteId}:feature:hazard-0`,
      kind: "hazard-zone",
      discovered: false,
      ...getCellCenter(11, 8),
    },
    {
      id: `${contractSiteId}:feature:debris-0`,
      kind: "debris-pile",
      discovered: false,
      ...getCellCenter(6, 11),
    },
  ];
  const enemies: RaidPresentationEnemy[] = [
    {
      id: `${contractSiteId}:enemy:generic-0`,
      threat: "generic",
      discovered: false,
      ...getCellCenter(4 + rng.int(0, 1), 6),
    },
    {
      id: `${contractSiteId}:enemy:elite-0`,
      threat: "elite",
      discovered: false,
      ...getCellCenter(9, 9 + rng.int(0, 1)),
    },
    {
      id: `${contractSiteId}:enemy:boss-0`,
      threat: "boss",
      discovered: false,
      ...getCellCenter(13, 13),
    },
  ];

  context.runtimeState.raidPresentation = {
    contractSiteId,
    teams: [],
    enemies,
    features,
  };
}

function revealRaidPresentationFromFog(context: SimSystemContext): void {
  const fog = BuildingAuthority.fogOfWar[context.singletonEntities.building];
  if (!fog) {
    return;
  }

  const isRevealed = (x: number, y: number) => {
    const cellX = Math.max(0, Math.min(fog.gridWidth - 1, Math.floor(x / 32)));
    const cellY = Math.max(0, Math.min(fog.gridHeight - 1, Math.floor(y / 32)));
    return fog.revealed[cellY * fog.gridWidth + cellX] === true;
  };

  context.runtimeState.raidPresentation.features.forEach((feature) => {
    feature.discovered = feature.discovered || isRevealed(feature.x, feature.y);
  });
  context.runtimeState.raidPresentation.enemies.forEach((enemy) => {
    enemy.discovered = enemy.discovered || isRevealed(enemy.x, enemy.y);
    enemy.engagedRaidId = undefined;
  });
}

function buildRaidWaypointPath(index: number) {
  const paths = [
    // Path 0: NW entry, east sweep, south hook, west return
    [
      getCellCenter(2, 2),
      getCellCenter(5, 1),
      getCellCenter(8, 3),
      getCellCenter(8, 6),
      getCellCenter(5, 7),
      getCellCenter(3, 10),
      getCellCenter(6, 12),
      getCellCenter(10, 13),
    ],
    // Path 1: SW entry, north corridor, east turn, SE descent
    [
      getCellCenter(2, 13),
      getCellCenter(2, 10),
      getCellCenter(4, 7),
      getCellCenter(7, 5),
      getCellCenter(10, 4),
      getCellCenter(12, 6),
      getCellCenter(13, 9),
      getCellCenter(11, 12),
    ],
    // Path 2: NE entry, west sweep, south hook, east finish
    [
      getCellCenter(13, 2),
      getCellCenter(11, 4),
      getCellCenter(8, 5),
      getCellCenter(5, 4),
      getCellCenter(3, 6),
      getCellCenter(4, 9),
      getCellCenter(7, 11),
      getCellCenter(10, 13),
    ],
    // Path 3: Center spiral outward
    [
      getCellCenter(8, 8),
      getCellCenter(10, 6),
      getCellCenter(12, 8),
      getCellCenter(10, 11),
      getCellCenter(6, 10),
      getCellCenter(4, 7),
      getCellCenter(6, 4),
      getCellCenter(9, 3),
    ],
    // Path 4: Zigzag through middle
    [
      getCellCenter(1, 5),
      getCellCenter(4, 3),
      getCellCenter(7, 6),
      getCellCenter(10, 3),
      getCellCenter(12, 6),
      getCellCenter(9, 9),
      getCellCenter(6, 12),
      getCellCenter(3, 14),
    ],
  ];
  return paths[index % paths.length];
}

// Equidistant segment interpolation (each segment gets equal progress share),
// unlike navigation.ts interpolatePolylinePosition which is distance-weighted.
function interpolatePath(path: readonly { x: number; y: number }[], progress: number) {
  if (path.length === 0) {
    return { x: 48, y: 48 };
  }
  if (path.length === 1) {
    return path[0];
  }

  const clamped = clamp(progress, 0, 1);
  const scaled = clamped * (path.length - 1);
  const index = Math.min(path.length - 2, Math.floor(scaled));
  const localProgress = scaled - index;
  const from = path[index];
  const to = path[index + 1];

  return {
    x: from.x + (to.x - from.x) * localProgress,
    y: from.y + (to.y - from.y) * localProgress,
  };
}

function getEncounterLabel(threat: RaidEncounterThreat): string {
  switch (threat) {
    case "boss":
      return "Boss Contact";
    case "elite":
      return "Elite Threat";
    default:
      return "Hostile Contact";
  }
}

function getFeatureEventKind(kind: RaidFeatureKind): RaidPresentationEvent["kind"] {
  switch (kind) {
    case "loot-cache":
      return "loot";
    case "intel-node":
      return "intel";
    case "hazard-zone":
      return "hazard";
    default:
      return "discovery";
  }
}

function getFeatureEventMessage(kind: RaidFeatureKind): string {
  switch (kind) {
    case "loot-cache":
      return "Team found a cache worth extracting.";
    case "intel-node":
      return "Team recovered actionable site intel.";
    case "hazard-zone":
      return "Team is navigating a hazardous zone.";
    default:
      return "Team picked through collapsed debris.";
  }
}

function getMissionTemplate(context: SimSystemContext, missionId: string) {
  const mission = context.registry.missionById.get(missionId);
  if (!mission) {
    throw new Error(`Raid system references unknown mission "${missionId}".`);
  }

  return mission;
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
  return computeSocialCohesion(context, leftId, rightId);
}

function computeTeamCohesion(context: SimSystemContext, operatorIds: readonly string[]): number {
  if (operatorIds.length < 2) {
    return 50;
  }

  const recurringTeamEntity = findRecurringTeamForMembers(context, operatorIds);
  if (recurringTeamEntity !== undefined && RecurringTeam.damaged[recurringTeamEntity] !== 1) {
    // RecurringTeam members get +15 cohesion bonus when raiding together
    return clamp(RecurringTeam.cohesion[recurringTeamEntity] + 15, 0, 100);
  }

  // Fallback to pairwise for non-team groups
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
  const contractSite = BuildingAuthority.contractSite[buildingEntity];
  const currentMinute = getCurrentAbsoluteMinute(context);

  if (!contractSite || contractSite.bossDefeated || contractSite.contractLost) {
    return;
  }

  const livingOperatorCount = context.runtimeState.operatorEntities.filter(
    (entity) => OperatorIdentity.lifecycleStatus[entity] === "active",
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
  const mission = getMissionTemplate(context, contractSite.missionId);
  const entity = addEntity(context.world);
  const rng = new SeededRng(
    seedFromKey(`contract-opportunity:${contractSite.contractSiteId}:${sequence}`),
  );
  const threatVariance = rng.int(-4, 6);
  const intelVariance = rng.int(-6, 4);
  const rewardVariance = rng.int(-8, 12);

  addComponent(context.world, entity, RaidOpportunityState);
  RaidOpportunityState.id[entity] = `opportunity/${sequence}`;
  RaidOpportunityState.missionId[entity] = mission.id;
  RaidOpportunityState.location[entity] = contractSite.location;
  RaidOpportunityState.threat[entity] = clamp(contractSite.threat + threatVariance, 20, 95);
  RaidOpportunityState.intel[entity] = clamp(contractSite.intel + intelVariance, 10, 92);
  RaidOpportunityState.reward[entity] = clamp(contractSite.reward + rewardVariance, 40, 180);
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
  pushRuntimeCue(context, "raid.opportunity");
  pushRuntimeEvent(context, {
    kind: "event_change",
    message: `New raid opportunity: ${mission.name}`,
    accent: "gold",
  });
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
      if (OperatorIdentity.lifecycleStatus[entity] !== "active") return false;
      if (reservedOperatorIds.has(OperatorIdentity.id[entity])) return false;
      if (RaidParticipationState.activeRaidId[entity].length > 0) return false;

      if (InjuryState.severity[entity] > 60) return false;

      const autonomyFlags = computeAutonomyFlags(entity);
      if (autonomyFlags.refusalRisk) {
        const refusalRng = new SeededRng(
          seedFromKey(
            `refusal:${OperatorIdentity.id[entity]}:${getCurrentAbsoluteMinute(context)}`,
          ),
        );
        if (refusalRng.chance(0.4)) return false;
      }
      return true;
    })
    .map((entity) => {
      const readiness = computeOperatorRaidReadiness(context, entity, opportunityEntity);
      const priorTeamBonus = context.runtimeState.recurringTeamEntities.reduce(
        (best, teamEntity) => {
          const members = RecurringTeam.memberIds[teamEntity] ?? [];
          if (!members.includes(OperatorIdentity.id[entity])) {
            return best;
          }
          if (RecurringTeam.damaged[teamEntity] === 1) {
            return Math.max(best, 2);
          }
          return Math.max(best, (RecurringTeam.cohesion[teamEntity] - 50) * 0.12);
        },
        0,
      );
      return {
        entity,
        readiness: {
          ...readiness,
          readinessScore: readiness.readinessScore + priorTeamBonus,
        },
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
        const candidateId = OperatorIdentity.id[candidate.entity];
        const cohesionScore =
          team.length === 0
            ? 50
            : team.reduce((total, teammate) => {
                return (
                  total +
                  computeRelationshipCohesion(
                    context,
                    OperatorIdentity.id[teammate.entity],
                    candidateId,
                  )
                );
              }, 0) / team.length;
        const recurringTeamBonus =
          team.length === 0
            ? 0
            : getRecurringTeamCohesionBonus(context, [
                ...team.map(({ entity }) => OperatorIdentity.id[entity]),
                candidateId,
              ]);
        const partnerBonus = getPreferredPartnerBonus(candidate.entity, [...chosenIdSet]);
        const selectionScore =
          candidate.readiness.willingnessScore +
          cohesionScore * 0.35 +
          recurringTeamBonus * 0.5 +
          partnerBonus;

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
): ActiveRaidResolutionPacket {
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
  const result: "success" | "failure" | "mixed" =
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
        status: (injuryDelta >= 16 ? "hurt" : result === "failure" ? "shaken" : "steady") as
          | "steady"
          | "shaken"
          | "hurt",
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

function launchOpportunityRaid(context: SimSystemContext, opportunityEntity: number): void {
  // Treasury gate: do not launch raids when the guild is in debt
  if (GuildState.treasury[context.singletonEntities.guild] < 0) {
    pushRuntimeEvent(context, {
      kind: "resource_swing",
      message: "Raid cancelled — treasury is negative",
      accent: "ember",
    });
    removeRaidOpportunityEntity(context, opportunityEntity);
    return;
  }

  const mission = getMissionTemplate(context, RaidOpportunityState.missionId[opportunityEntity]);
  const contractSite = BuildingAuthority.contractSite[context.singletonEntities.building];
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

  claimedOperatorIds.forEach((operatorId, index) => {
    const operatorEntity = operatorEntities[index];
    if (operatorEntity === undefined) {
      return;
    }

    autoSelectAccessory(context, operatorId, OperatorIdentity.roleTag[operatorEntity]);
  });

  const teamCohesion = computeTeamCohesion(context, claimedOperatorIds);

  BuildingAuthority.activeRaidPackets[context.singletonEntities.building] = [
    ...(BuildingAuthority.activeRaidPackets[context.singletonEntities.building] ?? []),
    {
      id: raidId,
      contractSiteId: contractSite?.contractSiteId ?? "",
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
  pushRuntimeCue(context, "raid.launch");
  const operatorNames = claimedOperatorIds.map((id) => {
    const opEntity = operatorEntities.find((e) => OperatorIdentity.id[e] === id);
    return opEntity !== undefined ? (OperatorIdentity.name[opEntity] ?? id) : id;
  });
  pushRuntimeEvent(context, {
    kind: "team_departure",
    message: `${operatorNames.join(", ")} departed on ${mission.name}`,
    accent: "gold",
    targetKind: "team",
    targetId: raidId,
  });
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
      pushRuntimeCue(
        context,
        packet.resolutionPacket.result === "failure"
          ? "raid.return.failure"
          : "raid.return.success",
      );

      const missionTemplate = context.registry.missions.find((m) => m.id === packet.missionId);
      const missionLabel = missionTemplate?.name ?? packet.missionId;
      const res = packet.resolutionPacket;
      const returningOperatorNames = packet.resolutionPacket.operatorOutcomes
        .filter((outcome) => !outcome.died)
        .map((outcome) => {
          const operatorEntity = operatorEntityById.get(outcome.operatorId);
          return operatorEntity === undefined
            ? outcome.operatorId
            : (OperatorIdentity.name[operatorEntity] ?? outcome.operatorId);
        });
      if (returningOperatorNames.length > 0) {
        pushRuntimeEvent(context, {
          kind: "team_return",
          message: `${returningOperatorNames.join(", ")} returned from ${missionLabel}`,
          accent: "gold",
          targetKind: "team",
          targetId: packet.id,
        });
      }
      pushRuntimeEvent(context, {
        kind: "raid_result",
        message: `${missionLabel} ended ${res.result} (${res.reputationDelta >= 0 ? "+" : ""}${res.reputationDelta} rep, ${res.cashDelta >= 0 ? "+" : ""}${res.cashDelta} cash)`,
        accent: res.result === "failure" ? "magma" : res.result === "mixed" ? "ember" : "gold",
      });

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
          const opName = OperatorIdentity.name[operatorEntity] ?? outcome.operatorId;
          unequipItem(context, outcome.operatorId, "weapon");
          unequipItem(context, outcome.operatorId, "outfitOverlay");
          unequipItem(context, outcome.operatorId, "accessory");
          OperatorIdentity.lifecycleStatus[operatorEntity] = "dead";
          OperatorIdentity.deathTick[operatorEntity] = getCurrentAbsoluteMinute(context);
          OperatorIdentity.deathRaidSummaryId[operatorEntity] = packet.id;
          OperatorIdentity.departureTick[operatorEntity] = 0;
          OperatorIdentity.departureReason[operatorEntity] = "";
          AssignmentState.kind[operatorEntity] = "idle";
          AssignmentState.targetId[operatorEntity] = "";
          ScheduleState.currentBlock[operatorEntity] = "idle";
          pushRuntimeCue(context, "raid.death");
          pushRuntimeEvent(context, {
            kind: "death",
            message: `${opName} killed in action`,
            accent: "magma",
            targetKind: "operator",
            targetId: outcome.operatorId,
          });
          return;
        }

        if (outcome.injuryDelta > 20) {
          const opName = OperatorIdentity.name[operatorEntity] ?? outcome.operatorId;
          pushRuntimeEvent(context, {
            kind: "injury",
            message: `${opName} injured during the raid`,
            accent: "ember",
            targetKind: "operator",
            targetId: outcome.operatorId,
          });
        }

        AssignmentState.kind[operatorEntity] =
          InjuryState.recoveryHoursRemaining[operatorEntity] > 0 ? "recovery" : "idle";
        AssignmentState.targetId[operatorEntity] = "";
      });

      const lootRng = new SeededRng(seedFromKey(`loot:${packet.id}:${currentMinute}`));
      const lootDrops = generateLootDrops(context, lootRng, packet.resolutionPacket.result);
      applyLootToInventory(context, lootDrops);

      const diedOperatorIds = packet.resolutionPacket.operatorOutcomes
        .filter((outcome) => outcome.died)
        .map((outcome) => outcome.operatorId);
      const survivingOperatorIds = packet.operatorIds.filter((id) => !diedOperatorIds.includes(id));

      updateRecurringTeamAfterRaid(
        context,
        packet.operatorIds,
        packet.resolutionPacket.result,
        currentMinute,
      );

      diedOperatorIds.forEach((deceasedId) => {
        createGriefTies(context, deceasedId, survivingOperatorIds);
        markTeamDamaged(context, [deceasedId], "death");
      });

      applyRaidSocialOutcome(context, packet.operatorIds, packet.resolutionPacket.result);

      const MAX_RAID_SUMMARIES = 50;
      const existingSummaries = BuildingAuthority.raidSummaries[buildingEntity] ?? [];
      const trimmed =
        existingSummaries.length >= MAX_RAID_SUMMARIES
          ? existingSummaries.slice(-MAX_RAID_SUMMARIES + 1)
          : existingSummaries;
      BuildingAuthority.raidSummaries[buildingEntity] = [
        ...trimmed,
        {
          id: packet.id,
          contractSiteId: packet.contractSiteId,
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

function updateRaidPresentation(context: SimSystemContext): void {
  const contractSite = BuildingAuthority.contractSite[context.singletonEntities.building];
  if (!contractSite || contractSite.contractLost || contractSite.bossDefeated) {
    context.runtimeState.raidPresentation.teams = [];
    return;
  }

  ensureRaidPresentationSeed(context, contractSite.contractSiteId);
  revealRaidPresentationFromFog(context);

  const activePackets =
    BuildingAuthority.activeRaidPackets[context.singletonEntities.building] ?? [];
  const previousTeams = new Map(
    context.runtimeState.raidPresentation.teams.map((team) => [team.raidId, team]),
  );
  const nextTeams: RaidPresentationTeam[] = [];
  const operatorEntityById = new Map(
    context.runtimeState.operatorEntities.map((entity) => [OperatorIdentity.id[entity], entity]),
  );
  const currentTick = getCurrentAbsoluteMinute(context);

  activePackets.forEach((packet, index) => {
    const previousTeam = previousTeams.get(packet.id);
    const operatorEntities = packet.operatorIds
      .map((operatorId) => operatorEntityById.get(operatorId))
      .filter((entity): entity is number => entity !== undefined);
    const goal =
      operatorEntities.length > 0
        ? selectTeamGoal(context, operatorEntities, packet)
        : ("exploring" as RaidTeamGoal);
    const state: RaidPresentationTeam["state"] =
      packet.revealProgress > 90
        ? packet.resolutionPacket.result === "failure"
          ? "defeated"
          : "returning"
        : "active";
    const position = interpolatePath(buildRaidWaypointPath(index), packet.revealProgress / 100);
    const operatorStatuses = operatorEntities.map((entity) => ({
      operatorId: OperatorIdentity.id[entity],
      readiness: resolveRaidOperatorReadiness(entity),
      healthFraction:
        OperatorIdentity.lifecycleStatus[entity] === "dead"
          ? 0
          : clamp(1 - InjuryState.severity[entity] / 100, 0, 1),
      roleTag: OperatorIdentity.roleTag[entity] || null,
    }));

    const nearbyEnemy = context.runtimeState.raidPresentation.enemies
      .filter((enemy) => enemy.discovered)
      .sort((left, right) => {
        const leftDistance = Math.hypot(left.x - position.x, left.y - position.y);
        const rightDistance = Math.hypot(right.x - position.x, right.y - position.y);
        return leftDistance - rightDistance;
      })[0];
    const encounter =
      nearbyEnemy && Math.hypot(nearbyEnemy.x - position.x, nearbyEnemy.y - position.y) <= 72
        ? {
            enemyLabel: getEncounterLabel(nearbyEnemy.threat),
            threat: nearbyEnemy.threat,
            healthFraction:
              nearbyEnemy.threat === "boss"
                ? clamp(1 - packet.revealProgress / 120, 0.08, 1)
                : clamp(1 - packet.revealProgress / 140, 0.2, 1),
          }
        : null;

    if (nearbyEnemy && encounter) {
      nearbyEnemy.engagedRaidId = packet.id;
    }

    const recentEvents = [...(previousTeam?.recentEvents ?? [])];
    if (!previousTeam) {
      upsertRaidEvent(recentEvents, {
        id: `${packet.id}:deploy`,
        kind: "goal-change",
        message: `Team deployed toward ${goal}.`,
        tick: currentTick,
      });
    }
    if (previousTeam?.goal !== goal) {
      upsertRaidEvent(recentEvents, {
        id: `${packet.id}:goal:${goal}:${Math.floor(packet.revealProgress / 10)}`,
        kind: "goal-change",
        message: `Team shifted focus to ${goal}.`,
        tick: currentTick,
      });
    }
    if (previousTeam?.state !== state) {
      upsertRaidEvent(recentEvents, {
        id: `${packet.id}:state:${state}:${Math.floor(packet.revealProgress / 10)}`,
        kind: state === "returning" ? "retreat" : "status-change",
        message:
          state === "returning"
            ? "Team is returning from the site."
            : state === "defeated"
              ? "Team has been overwhelmed."
              : "Team is active in the dungeon.",
        tick: currentTick,
      });
    }
    if (encounter) {
      upsertRaidEvent(recentEvents, {
        id: `${packet.id}:encounter:${encounter.threat}:${Math.floor(packet.revealProgress / 15)}`,
        kind: "encounter",
        message: `Team engaged ${encounter.enemyLabel.toLowerCase()}.`,
        tick: currentTick,
      });
    }

    context.runtimeState.raidPresentation.features.forEach((feature) => {
      if (!feature.discovered) {
        return;
      }
      const isNearby = Math.hypot(feature.x - position.x, feature.y - position.y) <= 80;
      if (!isNearby) {
        return;
      }
      upsertRaidEvent(recentEvents, {
        id: `${packet.id}:feature:${feature.id}`,
        kind: getFeatureEventKind(feature.kind),
        message: getFeatureEventMessage(feature.kind),
        tick: currentTick,
      });
    });

    nextTeams.push({
      raidId: packet.id,
      x: position.x,
      y: position.y,
      goal,
      state,
      operatorStatuses,
      encounter,
      recentEvents,
    });
  });

  context.runtimeState.raidPresentation.teams = nextTeams;
}

// ── Loot generation ──────────────────────────────────────────────────────

function getDropTableEntries(context: SimSystemContext, tableId: string) {
  return context.registry.dropTableById.get(tableId)?.entries ?? [];
}

function rollDropTable(
  rng: SeededRng,
  entries: readonly {
    itemId: string;
    weight: number;
    minQuantity: number;
    maxQuantity: number;
  }[],
): string[] {
  if (entries.length === 0) {
    return [];
  }

  const rolledEntry = weightedChoice(
    rng,
    entries.map((entry) => ({
      item: entry,
      weight: entry.weight,
    })),
  ).outcome;
  const quantity = rng.int(rolledEntry.minQuantity, rolledEntry.maxQuantity);

  return Array.from({ length: quantity }, () => rolledEntry.itemId);
}

export function generateLootDrops(
  context: SimSystemContext,
  rng: SeededRng,
  result: "success" | "failure" | "mixed",
): string[] {
  const loot: string[] = [];
  const regularEntries = getDropTableEntries(context, "drop-table/dungeon-f-regular");
  const eliteEntries = getDropTableEntries(context, "drop-table/dungeon-f-elite");
  const bossEntries = getDropTableEntries(context, "drop-table/dungeon-f-boss");
  const regularRolls = result === "success" ? 2 : result === "mixed" ? 1 : rng.chance(0.25) ? 1 : 0;

  for (let i = 0; i < regularRolls; i += 1) {
    loot.push(...rollDropTable(rng, regularEntries));
  }

  if (
    result !== "failure" &&
    eliteEntries.length > 0 &&
    rng.chance(result === "success" ? 0.5 : 0.25)
  ) {
    loot.push(...rollDropTable(rng, eliteEntries));
  }

  if (result === "success" && bossEntries.length > 0 && rng.chance(0.2)) {
    loot.push(...rollDropTable(rng, bossEntries));
  }

  return loot;
}

function applyLootToInventory(context: SimSystemContext, loot: string[]): void {
  const itemCounts = new Map<string, number>();
  loot.forEach((itemId) => {
    itemCounts.set(itemId, (itemCounts.get(itemId) ?? 0) + 1);
  });
  itemCounts.forEach((quantity, itemId) => {
    addToInventory(context, itemId, quantity);
  });
}

// ── Recurring team tracking ──────────────────────────────────────────────

function updateRecurringTeamAfterRaid(
  context: SimSystemContext,
  operatorIds: readonly string[],
  result: "success" | "failure" | "mixed",
  currentTick: number,
): void {
  let teamEntity = findRecurringTeamForMembers(context, operatorIds);

  if (teamEntity === undefined && operatorIds.length >= 2) {
    // Create a new recurring team if operators raided together
    teamEntity = addEntity(context.world);
    addComponent(context.world, teamEntity, RecurringTeam);
    RecurringTeam.id[teamEntity] = `team/${context.runtimeState.nextTeamSequence}`;
    RecurringTeam.memberIds[teamEntity] = [...operatorIds];
    RecurringTeam.cohesion[teamEntity] = 50;
    RecurringTeam.raidCount[teamEntity] = 0;
    RecurringTeam.lastRaidTick[teamEntity] = 0;
    RecurringTeam.damaged[teamEntity] = 0;
    RecurringTeam.damageReason[teamEntity] = "";
    context.runtimeState.recurringTeamEntities.push(teamEntity);
    context.runtimeState.nextTeamSequence += 1;
    const memberNames = operatorIds.map((id) => {
      const e = context.runtimeState.operatorEntities.find(
        (ent) => OperatorIdentity.id[ent] === id,
      );
      return e !== undefined ? (OperatorIdentity.name[e] ?? id) : id;
    });
    pushRuntimeEvent(context, {
      kind: "team_status",
      message: `${memberNames.join(", ")} formed a recurring team`,
      accent: "gold",
      targetKind: "team",
      targetId: RecurringTeam.id[teamEntity],
    });
  }

  if (teamEntity === undefined) return;

  RecurringTeam.raidCount[teamEntity] += 1;
  RecurringTeam.lastRaidTick[teamEntity] = currentTick;

  const cohesionDelta = result === "success" ? 8 : result === "mixed" ? 2 : -6;
  RecurringTeam.cohesion[teamEntity] = clamp(
    RecurringTeam.cohesion[teamEntity] + cohesionDelta,
    0,
    100,
  );
}

function markTeamDamaged(
  context: SimSystemContext,
  operatorIds: readonly string[],
  reason: string,
): void {
  // Find any team that contains the deceased operator
  context.runtimeState.recurringTeamEntities.forEach((entity) => {
    const members = RecurringTeam.memberIds[entity] ?? [];
    if (operatorIds.some((id) => members.includes(id))) {
      RecurringTeam.damaged[entity] = 1;
      RecurringTeam.damageReason[entity] = reason;
    }
  });
}

function createGriefTies(
  context: SimSystemContext,
  deceasedId: string,
  survivingIds: readonly string[],
): void {
  survivingIds.forEach((survivorId) => {
    upsertNotableTie(context, deceasedId, survivorId, "grief", 70);
  });
}

function disbandRecurringTeam(
  context: SimSystemContext,
  teamEntity: number,
  survivingMemberIds: readonly string[],
  reason: string,
): void {
  removeEntity(context.world, teamEntity);
  removeTrackedEntity(context.runtimeState.recurringTeamEntities, teamEntity);

  if (survivingMemberIds.length === 0) {
    return;
  }

  const survivingNames = survivingMemberIds.map((memberId) => {
    const operatorEntity = context.runtimeState.operatorEntities.find(
      (entity) => OperatorIdentity.id[entity] === memberId,
    );

    return operatorEntity === undefined
      ? memberId
      : (OperatorIdentity.name[operatorEntity] ?? memberId);
  });

  pushRuntimeEvent(context, {
    kind: "team_status",
    message: `${survivingNames.join(", ")} disbanded after ${reason.replace(/_/g, " ")}`,
    accent: "ember",
  });
}

// ── Refusal and quit logic ───────────────────────────────────────────────

function getAverageRoomComfort(context: SimSystemContext): number {
  if (context.runtimeState.roomCultureEntities.length === 0) {
    return 50;
  }

  return (
    context.runtimeState.roomCultureEntities.reduce(
      (sum, entity) => sum + RoomCulture.comfort[entity],
      0,
    ) / context.runtimeState.roomCultureEntities.length
  );
}

function getGriefTieCountForOperator(context: SimSystemContext, operatorId: string): number {
  return context.runtimeState.notableTieEntities.filter((entity) => {
    return (
      NotableTie.stance[entity] === "grief" &&
      (NotableTie.operatorAId[entity] === operatorId ||
        NotableTie.operatorBId[entity] === operatorId)
    );
  }).length;
}

function getDamagedTeamPenalty(context: SimSystemContext, operatorId: string): number {
  return context.runtimeState.recurringTeamEntities.some((entity) => {
    return (
      RecurringTeam.damaged[entity] === 1 &&
      (RecurringTeam.memberIds[entity] ?? []).includes(operatorId)
    );
  })
    ? 12
    : 0;
}

function getDepartureCheck(
  context: SimSystemContext,
  entity: number,
  rng: SeededRng,
): {
  shouldDepart: boolean;
  reason: string;
} {
  const operatorId = OperatorIdentity.id[entity];
  const flags = computeAutonomyFlags(entity);
  const dispositionEntity = findDispositionEntity(context, operatorId);
  const grievanceLevel =
    dispositionEntity === undefined ? 25 : OperatorDisposition.grievanceLevel[dispositionEntity];
  const morale = MoraleState.current[entity];
  const loyalty = LoyaltyState.current[entity];
  const avgComfort = getAverageRoomComfort(context);
  const griefTieCount = getGriefTieCountForOperator(context, operatorId);
  const damagedTeamPenalty = getDamagedTeamPenalty(context, operatorId);

  const reason =
    flags.quitRisk || morale <= loyalty ? "morale collapse" : "loss of faith in the guild";
  const roll = boundedRoll(
    rng,
    flags.quitRisk ? 28 : 12,
    [
      { label: "morale", value: Math.max(0, 22 - morale) * 1.5 },
      { label: "loyalty", value: Math.max(0, 30 - loyalty) * 1.1 },
      { label: "grievance", value: Math.max(0, grievanceLevel - 40) * 0.25 },
      { label: "injury", value: InjuryState.severity[entity] * 0.15 },
      { label: "grief", value: griefTieCount * 6 },
      { label: "team_damage", value: damagedTeamPenalty },
      { label: "room_comfort", value: Math.max(0, 48 - avgComfort) * 0.18 },
    ],
    55,
    10,
  );

  return {
    shouldDepart: roll.outcome,
    reason,
  };
}

function departOperator(context: SimSystemContext, entity: number, reason: string): void {
  const operatorId = OperatorIdentity.id[entity];
  const operatorName = OperatorIdentity.name[entity] ?? operatorId;
  const currentMinute = getCurrentAbsoluteMinute(context);

  unequipItem(context, operatorId, "weapon");
  unequipItem(context, operatorId, "outfitOverlay");
  unequipItem(context, operatorId, "accessory");

  OperatorIdentity.lifecycleStatus[entity] = "departed";
  OperatorIdentity.deathTick[entity] = 0;
  OperatorIdentity.deathRaidSummaryId[entity] = "";
  OperatorIdentity.departureTick[entity] = currentMinute;
  OperatorIdentity.departureReason[entity] = reason;
  AssignmentState.kind[entity] = "idle";
  AssignmentState.targetId[entity] = "";
  ScheduleState.currentBlock[entity] = "idle";
  RaidParticipationState.activeRaidId[entity] = "";
  RaidParticipationState.missionId[entity] = "";
  RaidParticipationState.returnTick[entity] = 0;

  markTeamDamaged(
    context,
    [operatorId],
    reason === "loss of faith in the guild" ? "retention_break" : "morale_collapse",
  );
  pushRuntimeEvent(context, {
    kind: "staffing_change",
    message: `${operatorName} left the guild after ${reason}`,
    accent: "magma",
    targetKind: "operator",
    targetId: operatorId,
  });
}

function checkRefusalAndQuit(context: SimSystemContext, rng: SeededRng): void {
  if (WorldTimeState.minuteOfDay[context.singletonEntities.time] !== 0) {
    return;
  }

  const livingOperatorEntities = context.runtimeState.operatorEntities.filter(
    (entity) => OperatorIdentity.lifecycleStatus[entity] === "active",
  );

  livingOperatorEntities.forEach((entity) => {
    const flags = computeAutonomyFlags(entity);
    if (!flags.quitRisk && !flags.retentionRisk) {
      return;
    }
    if (RaidParticipationState.activeRaidId[entity].length > 0) {
      return;
    }

    const departureCheck = getDepartureCheck(context, entity, rng);
    if (!departureCheck.shouldDepart) {
      return;
    }

    departOperator(context, entity, departureCheck.reason);
  });
}

// ── Damaged team repair vs disband ───────────────────────────────────────

function isDailyRaidConsequenceTick(context: SimSystemContext): boolean {
  return WorldTimeState.minuteOfDay[context.singletonEntities.time] === 0;
}

function processDamagedTeams(context: SimSystemContext, rng: SeededRng): void {
  const operatorEntityById = new Map<string, number>();
  for (const entity of context.runtimeState.operatorEntities) {
    operatorEntityById.set(OperatorIdentity.id[entity], entity);
  }

  context.runtimeState.recurringTeamEntities.slice().forEach((entity) => {
    if (RecurringTeam.damaged[entity] !== 1) return;

    const members = RecurringTeam.memberIds[entity] ?? [];
    const livingMembers = members.filter((memberId) => {
      const opEntity = operatorEntityById.get(memberId);
      return opEntity !== undefined && OperatorIdentity.lifecycleStatus[opEntity] === "active";
    });

    if (livingMembers.length < 2) {
      disbandRecurringTeam(
        context,
        entity,
        livingMembers,
        RecurringTeam.damageReason[entity] || "losses",
      );
      return;
    }

    let totalMorale = 0;
    let totalLoyalty = 0;
    let hasFieldLead = false;
    for (const memberId of livingMembers) {
      const opEntity = operatorEntityById.get(memberId);
      if (opEntity === undefined) continue;
      totalMorale += MoraleState.current[opEntity];
      totalLoyalty += LoyaltyState.current[opEntity];
      if (OperatorIdentity.roleTag[opEntity] === "role:field_lead") hasFieldLead = true;
    }
    const avgMorale = totalMorale / livingMembers.length;
    const avgLoyalty = totalLoyalty / livingMembers.length;

    // Count grief ties among members
    const griefCount = context.runtimeState.notableTieEntities.filter((tieEntity) => {
      return (
        NotableTie.stance[tieEntity] === "grief" &&
        (livingMembers.includes(NotableTie.operatorAId[tieEntity]) ||
          livingMembers.includes(NotableTie.operatorBId[tieEntity]))
      );
    }).length;

    // Average room culture comfort
    const avgComfort =
      context.runtimeState.roomCultureEntities.length > 0
        ? context.runtimeState.roomCultureEntities.reduce(
            (sum, rcEntity) => sum + RoomCulture.comfort[rcEntity],
            0,
          ) / context.runtimeState.roomCultureEntities.length
        : 50;

    const repairResult = boundedRoll(
      rng,
      50,
      [
        { label: "morale", value: (avgMorale - 50) * 0.4 },
        { label: "loyalty", value: (avgLoyalty - 50) * 0.3 },
        { label: "grief", value: -griefCount * 8 },
        { label: "field_lead", value: hasFieldLead ? 12 : 0 },
        { label: "room_culture", value: (avgComfort - 50) * 0.2 },
      ],
      50,
      15,
    );

    const damageReason = RecurringTeam.damageReason[entity] || "recent damage";

    if (repairResult.outcome) {
      RecurringTeam.damaged[entity] = 0;
      RecurringTeam.damageReason[entity] = "";
      RecurringTeam.memberIds[entity] = [...livingMembers];
      pushRuntimeEvent(context, {
        kind: "team_status",
        message: `${livingMembers.length}-operator team recovered from ${damageReason.replace(/_/g, " ")}`,
        accent: "gold",
        targetKind: "team",
        targetId: RecurringTeam.id[entity],
      });
    } else {
      RecurringTeam.cohesion[entity] = clamp(RecurringTeam.cohesion[entity] - 5, 0, 100);
      if (repairResult.total <= 30 || RecurringTeam.cohesion[entity] <= 20) {
        disbandRecurringTeam(context, entity, livingMembers, damageReason);
      }
    }
  });
}

export const resolveRaidSystem: SimSystem = (context, deltaMs) => {
  // Ensure a contract site exists before processing raids
  ensureContractSite(context);

  updateOpportunityLifecycle(context);
  if (deltaMs > 0) {
    spawnRaidOpportunity(context);
  }

  if (deltaMs > 0 && isDailyRaidConsequenceTick(context)) {
    const tickRng = new SeededRng(seedFromKey(`raid-tick:${getCurrentAbsoluteMinute(context)}`));
    checkRefusalAndQuit(context, tickRng);
    processDamagedTeams(context, tickRng);
  }

  refreshOpportunityClaims(context);
  if (deltaMs > 0) {
    launchFormedRaids(context);
  }

  const resolvedRaid = resolveCompletedRaids(context, deltaMs);

  // Advance fog-of-war for active raids
  if (deltaMs > 0) {
    advanceFogOfWar(context);
  }

  // Check dungeon closure conditions
  if (resolvedRaid) {
    checkDungeonClosure(context);
    reconcileAssignmentsSystem(context, 0);
  }

  updateRaidPresentation(context);
};

// ── Secured contract site ─────────────────────────────────────────────────

/**
 * Ensure the guild has one secured government contract site.
 * If no contract exists, secure one based on the current mission pool.
 * The contract determines the one active dungeon.
 */
function ensureContractSite(context: SimSystemContext): void {
  const buildingEntity = context.singletonEntities.building;
  const contractSite = BuildingAuthority.contractSite[buildingEntity];

  // Already have an active contract
  if (contractSite && !contractSite.bossDefeated && !contractSite.contractLost) {
    ensureRaidPresentationSeed(context, contractSite.contractSiteId);
    return;
  }

  // Need to secure a new contract
  const currentMinute = getCurrentAbsoluteMinute(context);
  const guildEntity = context.singletonEntities.guild;
  const reputation = GuildState.reputation[guildEntity];
  const rng = new SeededRng(seedFromKey(`contract:${currentMinute}:${reputation}`));

  // Pick a mission based on guild state
  const missionIndex = rng.int(0, context.registry.missions.length - 1);
  const mission = context.registry.missions[missionIndex];
  const locationIndex = rng.int(0, OPPORTUNITY_LOCATIONS.length - 1);

  const threat = clamp(
    34 + mission.baseDurationHours * 8 + reputation * 2 + rng.int(0, 10),
    20,
    95,
  );
  const intel = clamp(
    28 + GuildState.intel[guildEntity] * 18 + mission.expectedThreatTags.length * 6,
    10,
    92,
  );
  const reward = clamp(54 + mission.baseDurationHours * 18 + reputation * 4, 40, 180);

  const newContract: ContractSiteState = {
    contractSiteId: `contract/${currentMinute}`,
    missionId: mission.id,
    location: OPPORTUNITY_LOCATIONS[locationIndex],
    bossDefeated: false,
    contractLost: false,
    threat,
    intel,
    reward,
    securedAtTick: currentMinute,
  };

  BuildingAuthority.contractSite[buildingEntity] = newContract;

  // Initialize fog-of-war for the new dungeon
  const totalCells = FOG_GRID_WIDTH * FOG_GRID_HEIGHT;
  BuildingAuthority.fogOfWar[buildingEntity] = {
    gridWidth: FOG_GRID_WIDTH,
    gridHeight: FOG_GRID_HEIGHT,
    revealed: Array.from({ length: totalCells }, () => false),
    revealedCount: 0,
  };
  ensureRaidPresentationSeed(context, newContract.contractSiteId);
}

// ── Fog-of-war ────────────────────────────────────────────────────────────

/**
 * Advance fog-of-war based on active raid teams' reveal progress.
 * Each active raid reveals cells proportional to its reveal progress.
 */
function advanceFogOfWar(context: SimSystemContext): void {
  const buildingEntity = context.singletonEntities.building;
  const fog = BuildingAuthority.fogOfWar[buildingEntity];
  if (!fog) return;

  const activePackets = BuildingAuthority.activeRaidPackets[buildingEntity] ?? [];
  if (activePackets.length === 0) return;

  const totalCells = fog.gridWidth * fog.gridHeight;
  const currentMinute = getCurrentAbsoluteMinute(context);

  const targetRevealed = Math.min(
    totalCells,
    activePackets.reduce((total, packet) => {
      return total + Math.floor((packet.revealProgress / 100) * totalCells * 0.3);
    }, 0),
  );
  const revealBudget = Math.max(0, targetRevealed - fog.revealedCount);
  if (revealBudget === 0) {
    return;
  }

  const rng = new SeededRng(
    seedFromKey(
      `fog:${BuildingAuthority.contractSite[buildingEntity]?.contractSiteId ?? "site"}:${currentMinute}`,
    ),
  );

  // Compute current team grid positions for proximity-based reveal
  const teamGridPositions = activePackets.map((packet, packetIndex) => {
    const pos = interpolatePath(buildRaidWaypointPath(packetIndex), packet.revealProgress / 100);
    return {
      gx: Math.floor(pos.x / 32),
      gy: Math.floor(pos.y / 32),
    };
  });

  let revealed = 0;
  let attempts = 0;
  while (revealed < revealBudget && attempts < revealBudget * 4) {
    // Pick a random team to reveal around
    const team = teamGridPositions[rng.int(0, teamGridPositions.length - 1)];
    // Reveal within a radius around the team
    const radius = 3;
    const rx = team.gx + rng.int(-radius, radius);
    const ry = team.gy + rng.int(-radius, radius);
    const cx = Math.max(0, Math.min(fog.gridWidth - 1, rx));
    const cy = Math.max(0, Math.min(fog.gridHeight - 1, ry));
    const cellIndex = cy * fog.gridWidth + cx;
    if (!fog.revealed[cellIndex]) {
      fog.revealed[cellIndex] = true;
      fog.revealedCount += 1;
      revealed += 1;
    }
    attempts += 1;
  }
}

/**
 * Get the current fog-of-war reveal percentage.
 */
export function getFogRevealPercentage(context: SimSystemContext): number {
  const buildingEntity = context.singletonEntities.building;
  const fog = BuildingAuthority.fogOfWar[buildingEntity];
  if (!fog) return 0;

  const totalCells = fog.gridWidth * fog.gridHeight;
  return totalCells > 0 ? (fog.revealedCount / totalCells) * 100 : 0;
}

// ── Team goal selection ───────────────────────────────────────────────────

/**
 * Select an autonomous goal for a raid team based on team state and dungeon conditions.
 * Uses the shared uncertainty utility for weighted selection.
 */
export function selectTeamGoal(
  context: SimSystemContext,
  operatorEntities: readonly number[],
  packet: {
    id?: string;
    startedTick?: number;
    threat: number;
    intel: number;
    revealProgress: number;
  },
): RaidTeamGoal {
  const currentMinute = getCurrentAbsoluteMinute(context);
  const operatorKey = operatorEntities.map((entity) => OperatorIdentity.id[entity]).join("|");
  const rng = new SeededRng(
    seedFromKey(`goal:${packet.id ?? packet.startedTick ?? 0}:${currentMinute}:${operatorKey}`),
  );

  // Compute team aggregate stats
  const avgMorale =
    operatorEntities.reduce((sum, e) => sum + MoraleState.current[e], 0) /
    Math.max(1, operatorEntities.length);
  const avgFatigue =
    operatorEntities.reduce((sum, e) => sum + NeedState.fatigue[e], 0) /
    Math.max(1, operatorEntities.length);
  const avgRiskTolerance =
    operatorEntities.reduce((sum, e) => sum + PreferenceState.riskTolerance[e], 0) /
    Math.max(1, operatorEntities.length);

  const fogReveal = packet.revealProgress;
  const highThreat = packet.threat > 70;
  const lowIntel = packet.intel < 40;

  // Build weighted goal choices
  const choices: Array<{ item: RaidTeamGoal; weight: number }> = [
    {
      item: "exploring",
      weight: Math.max(5, 40 - fogReveal * 0.3 + (lowIntel ? 15 : 0)),
    },
    {
      item: "looting",
      weight: Math.max(5, 25 + fogReveal * 0.15 - (highThreat ? 10 : 0)),
    },
    {
      item: "intel",
      weight: Math.max(5, 20 + (lowIntel ? 20 : 0) - fogReveal * 0.1),
    },
    {
      item: "hunting",
      weight: Math.max(5, 15 + avgRiskTolerance * 0.2 + avgMorale * 0.1),
    },
    {
      item: "boss",
      weight: Math.max(
        0,
        fogReveal > 60 ? 10 + avgMorale * 0.15 + avgRiskTolerance * 0.1 - avgFatigue * 0.2 : 0,
      ),
    },
    {
      item: "retreating",
      weight: Math.max(0, avgFatigue > 60 ? avgFatigue * 0.4 - avgMorale * 0.1 : 0),
    },
    {
      item: "regrouping",
      weight: Math.max(0, avgFatigue > 40 && avgMorale < 40 ? 15 : 0),
    },
  ];

  const result = weightedChoice(rng, choices);
  return result.outcome;
}

// ── Dungeon closure ───────────────────────────────────────────────────────

/**
 * Check if the active dungeon should close.
 * Closure happens on boss defeat or contract loss.
 * Fog-of-war reveal alone never closes the dungeon.
 * Ordinary enemies continue to respawn while the dungeon is open.
 */
function checkDungeonClosure(context: SimSystemContext): void {
  const buildingEntity = context.singletonEntities.building;
  const contractSite = BuildingAuthority.contractSite[buildingEntity];
  if (!contractSite || contractSite.bossDefeated || contractSite.contractLost) return;

  const raidSummaries = (BuildingAuthority.raidSummaries[buildingEntity] ?? []).filter(
    (summary) => summary.contractSiteId === contractSite.contractSiteId,
  );

  // Check for boss defeat: a successful raid with high reveal progress
  const fog = BuildingAuthority.fogOfWar[buildingEntity];
  const totalCells = fog ? fog.gridWidth * fog.gridHeight : 1;
  const revealPct = fog ? (fog.revealedCount / totalCells) * 100 : 0;

  // Boss defeat requires >80% reveal and a successful raid outcome
  const recentSuccesses = raidSummaries.filter(
    (s) => s.result === "success" && s.missionId === contractSite.missionId && revealPct > 80,
  );

  if (recentSuccesses.length > 0) {
    const rng = new SeededRng(
      seedFromKey(`boss:${contractSite.contractSiteId}:${raidSummaries.length}`),
    );
    const bossCheck = boundedRoll(
      rng,
      revealPct,
      [
        { label: "reveal_progress", value: revealPct * 0.5 },
        { label: "recent_successes", value: recentSuccesses.length * 10 },
      ],
      120,
      15,
    );

    if (bossCheck.outcome) {
      contractSite.bossDefeated = true;
      // Award bonus for boss defeat
      GuildState.reputation[context.singletonEntities.guild] += 15;
      GuildState.treasury[context.singletonEntities.guild] += Math.round(contractSite.reward * 1.5);
    }
  }

  // Check for contract loss: too many consecutive failures
  let failureStreak = 0;
  for (let index = raidSummaries.length - 1; index >= 0; index -= 1) {
    if (raidSummaries[index].result !== "failure") {
      break;
    }

    failureStreak += 1;
  }

  if (failureStreak >= 3) {
    const rng = new SeededRng(
      seedFromKey(`loss:${contractSite.contractSiteId}:${raidSummaries.length}`),
    );
    const lossCheck = boundedRoll(
      rng,
      failureStreak * 20,
      [{ label: "consecutive_failures", value: failureStreak * 15 }],
      60,
      10,
    );

    if (lossCheck.outcome) {
      contractSite.contractLost = true;
      // Early contract loss is survivable — reputation penalty only
      GuildState.reputation[context.singletonEntities.guild] -= 8;
    }
  }
}

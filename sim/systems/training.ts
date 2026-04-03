import {
  BuildingAuthority,
  InjuryState,
  MoraleState,
  NeedState,
  OperatorIdentity,
  RoomInstance,
  ScheduleState,
  TrainingState,
} from "../components";
import { clamp, getRoomTemplateForEntity } from "./commands";
import type { SimSystem, SimSystemContext } from "./types";

export const TRAINING_DISCIPLINES = ["strength", "speed", "endurance", "resilience"] as const;

export type TrainingDiscipline = (typeof TRAINING_DISCIPLINES)[number];

export interface OperatorTrainingSnapshot {
  strength: number;
  speed: number;
  endurance: number;
  resilience: number;
}

interface TrainingRoomProfile {
  label: string;
  emphasis: Record<TrainingDiscipline, number>;
}

const TRAINING_READINESS_CAP = 100;
const BASE_TRAINING_GAIN_PER_HOUR = 9;
const PASSIVE_TRAINING_DECAY_PER_HOUR = 0.18;
const RAID_TRAINING_DECAY_PER_HOUR = 0.4;
const TRAINING_BONUS_STEP = 25;
const TRAINING_ROOM_PROFILES: Readonly<Record<string, TrainingRoomProfile>> = {
  "room/gym:tier_1": {
    label: "The Gym",
    emphasis: {
      strength: 0.4,
      speed: 0.2,
      endurance: 0.3,
      resilience: 0.1,
    },
  },
};
const DEFAULT_TRAINING_PROFILE: TrainingRoomProfile = {
  label: "Training Room",
  emphasis: {
    strength: 0.25,
    speed: 0.25,
    endurance: 0.25,
    resilience: 0.25,
  },
};

export function createDefaultOperatorTrainingSnapshot(): OperatorTrainingSnapshot {
  return {
    strength: 0,
    speed: 0,
    endurance: 0,
    resilience: 0,
  };
}

export function normalizeOperatorTrainingSnapshot(
  value?: Partial<OperatorTrainingSnapshot> | null,
): OperatorTrainingSnapshot {
  return {
    strength: clamp(value?.strength ?? 0, 0, TRAINING_READINESS_CAP),
    speed: clamp(value?.speed ?? 0, 0, TRAINING_READINESS_CAP),
    endurance: clamp(value?.endurance ?? 0, 0, TRAINING_READINESS_CAP),
    resilience: clamp(value?.resilience ?? 0, 0, TRAINING_READINESS_CAP),
  };
}

export function readOperatorTrainingSnapshot(entity: number): OperatorTrainingSnapshot {
  return normalizeOperatorTrainingSnapshot({
    strength: TrainingState.strength[entity],
    speed: TrainingState.speed[entity],
    endurance: TrainingState.endurance[entity],
    resilience: TrainingState.resilience[entity],
  });
}

export function writeOperatorTrainingSnapshot(
  entity: number,
  snapshot: OperatorTrainingSnapshot,
): void {
  TrainingState.strength[entity] = snapshot.strength;
  TrainingState.speed[entity] = snapshot.speed;
  TrainingState.endurance[entity] = snapshot.endurance;
  TrainingState.resilience[entity] = snapshot.resilience;
}

export function getTrainingDerivedBonus(readiness: number): number {
  return Math.floor(clamp(readiness, 0, TRAINING_READINESS_CAP) / TRAINING_BONUS_STEP);
}

export function getOperatorAverageTrainingReadiness(entity: number): number {
  const snapshot = readOperatorTrainingSnapshot(entity);
  return (
    (snapshot.strength + snapshot.speed + snapshot.endurance + snapshot.resilience) /
    TRAINING_DISCIPLINES.length
  );
}

export function getOperatorTrainingReadinessContribution(entity: number): number {
  const average = getOperatorAverageTrainingReadiness(entity);
  return clamp(average * 0.22, 0, 22);
}

export function getTrainingStatusLabel(averageReadiness: number): string {
  if (averageReadiness >= 75) return "Drilled";
  if (averageReadiness >= 50) return "Ready";
  if (averageReadiness >= 20) return "Conditioning";
  return "Untrained";
}

export function getTeamTrainingFactor(operatorEntities: readonly number[]): string[] {
  if (operatorEntities.length === 0) {
    return [];
  }

  const average =
    operatorEntities.reduce(
      (total, entity) => total + getOperatorAverageTrainingReadiness(entity),
      0,
    ) / operatorEntities.length;

  if (average >= 75) return ["training:drilled"];
  if (average >= 50) return ["training:prepared"];
  if (average < 20) return ["training:neglected"];
  return [];
}

export function applyPostRaidTrainingWear(entity: number, injuryDelta: number, died = false): void {
  const totalWear = died ? 10 : 2.5 + injuryDelta * 0.16;
  if (totalWear <= 0) {
    return;
  }

  const snapshot = readOperatorTrainingSnapshot(entity);
  for (const discipline of TRAINING_DISCIPLINES) {
    snapshot[discipline] = clamp(snapshot[discipline] - totalWear, 0, TRAINING_READINESS_CAP);
  }
  writeOperatorTrainingSnapshot(entity, snapshot);
}

function getTrainingRoomProfile(context: SimSystemContext): TrainingRoomProfile | null {
  const operationalTrainingRooms = context.runtimeState.roomEntities.filter((entity) => {
    const template = getRoomTemplateForEntity(context, entity);
    return template.tags.includes("room:training") && RoomInstance.isOperational[entity] === 1;
  });

  if (operationalTrainingRooms.length === 0) {
    return null;
  }

  const emphasis = {
    strength: 0,
    speed: 0,
    endurance: 0,
    resilience: 0,
  } satisfies Record<TrainingDiscipline, number>;

  operationalTrainingRooms.forEach((roomEntity) => {
    const template = getRoomTemplateForEntity(context, roomEntity);
    const profile = TRAINING_ROOM_PROFILES[template.id] ?? DEFAULT_TRAINING_PROFILE;
    for (const discipline of TRAINING_DISCIPLINES) {
      emphasis[discipline] += profile.emphasis[discipline];
    }
  });

  for (const discipline of TRAINING_DISCIPLINES) {
    emphasis[discipline] /= operationalTrainingRooms.length;
  }

  const firstTemplate = getRoomTemplateForEntity(context, operationalTrainingRooms[0]);
  const firstProfile = TRAINING_ROOM_PROFILES[firstTemplate.id] ?? DEFAULT_TRAINING_PROFILE;
  return {
    label: firstProfile.label,
    emphasis,
  };
}

function getTrainingConditionMultiplier(context: SimSystemContext, entity: number): number {
  const buildingEntity = context.singletonEntities.building;
  const trainingRateModifier = BuildingAuthority.trainingRateModifier[buildingEntity] ?? 0;
  const hungerPenalty = NeedState.hunger[entity] * 0.004;
  const fatiguePenalty = NeedState.fatigue[entity] * 0.0055;
  const stressPenalty = NeedState.stress[entity] * 0.0025;
  const injuryPenalty = InjuryState.severity[entity] * 0.006;
  const moralePenalty =
    MoraleState.current[entity] >= 45 ? 0 : (45 - MoraleState.current[entity]) * 0.004;

  return clamp(
    1 +
      trainingRateModifier -
      hungerPenalty -
      fatiguePenalty -
      stressPenalty -
      injuryPenalty -
      moralePenalty,
    0.15,
    2,
  );
}

function applyTrainingAccrual(
  entity: number,
  elapsedHours: number,
  profile: TrainingRoomProfile,
  multiplier: number,
): void {
  const snapshot = readOperatorTrainingSnapshot(entity);

  for (const discipline of TRAINING_DISCIPLINES) {
    const current = snapshot[discipline];
    const capHeadroom = 1 - current / TRAINING_READINESS_CAP;
    const gain =
      BASE_TRAINING_GAIN_PER_HOUR *
      profile.emphasis[discipline] *
      elapsedHours *
      multiplier *
      capHeadroom;
    snapshot[discipline] = clamp(current + gain, 0, TRAINING_READINESS_CAP);
  }

  writeOperatorTrainingSnapshot(entity, snapshot);
}

function applyTrainingDecay(entity: number, elapsedHours: number, currentBlock: string): void {
  const decayPerHour =
    currentBlock === "raid" ? RAID_TRAINING_DECAY_PER_HOUR : PASSIVE_TRAINING_DECAY_PER_HOUR;
  if (decayPerHour <= 0) {
    return;
  }

  const snapshot = readOperatorTrainingSnapshot(entity);
  for (const discipline of TRAINING_DISCIPLINES) {
    snapshot[discipline] = clamp(
      snapshot[discipline] - decayPerHour * elapsedHours,
      0,
      TRAINING_READINESS_CAP,
    );
  }
  writeOperatorTrainingSnapshot(entity, snapshot);
}

export const advanceTrainingSystem: SimSystem = (context, deltaMs) => {
  if (deltaMs <= 0) {
    return;
  }

  const elapsedHours = Math.max(1, Math.floor(deltaMs / 60000)) / 60;
  const profile = getTrainingRoomProfile(context);

  context.runtimeState.operatorEntities
    .filter((entity) => OperatorIdentity.lifecycleStatus[entity] === "active")
    .forEach((entity) => {
      const currentBlock = ScheduleState.currentBlock[entity] || "idle";
      if (currentBlock === "training" && profile) {
        applyTrainingAccrual(
          entity,
          elapsedHours,
          profile,
          getTrainingConditionMultiplier(context, entity),
        );
        return;
      }

      applyTrainingDecay(entity, elapsedHours, currentBlock);
    });
};

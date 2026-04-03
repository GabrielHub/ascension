import { addComponent, addEntity } from "bitecs";
import { describe, expect, it } from "vitest";

import { templateRegistry } from "content/templates";
import {
  AssignmentState,
  InjuryState,
  MoraleState,
  NeedState,
  OperatorIdentity,
  RoomInstance,
  ScheduleState,
  TrainingState,
} from "../components";
import { createSimTestContext } from "./test-context";
import {
  advanceTrainingSystem,
  readOperatorTrainingSnapshot,
  writeOperatorTrainingSnapshot,
} from "./training";
import type { SimSystemContext } from "./types";

function addTrainingOperator(
  context: SimSystemContext,
  id: string,
  overrides?: {
    hunger?: number;
    fatigue?: number;
    stress?: number;
    morale?: number;
    injury?: number;
    currentBlock?: string;
  },
): number {
  const entity = addEntity(context.world);
  addComponent(context.world, entity, OperatorIdentity);
  addComponent(context.world, entity, NeedState);
  addComponent(context.world, entity, MoraleState);
  addComponent(context.world, entity, InjuryState);
  addComponent(context.world, entity, ScheduleState);
  addComponent(context.world, entity, AssignmentState);
  addComponent(context.world, entity, TrainingState);

  OperatorIdentity.id[entity] = id;
  OperatorIdentity.name[entity] = id;
  OperatorIdentity.lifecycleStatus[entity] = "active";
  NeedState.hunger[entity] = overrides?.hunger ?? 10;
  NeedState.fatigue[entity] = overrides?.fatigue ?? 10;
  NeedState.stress[entity] = overrides?.stress ?? 10;
  MoraleState.current[entity] = overrides?.morale ?? 70;
  InjuryState.severity[entity] = overrides?.injury ?? 0;
  ScheduleState.currentBlock[entity] = overrides?.currentBlock ?? "training";
  AssignmentState.kind[entity] = "idle";
  AssignmentState.targetId[entity] = "";
  TrainingState.strength[entity] = 0;
  TrainingState.speed[entity] = 0;
  TrainingState.endurance[entity] = 0;
  TrainingState.resilience[entity] = 0;

  context.runtimeState.operatorEntities.push(entity);
  return entity;
}

function addOperationalGym(context: SimSystemContext): number {
  const entity = addEntity(context.world);
  const templateIndex = templateRegistry.roomIndexById.get("room/gym:tier_1");
  if (templateIndex === undefined) {
    throw new Error("expected room/gym:tier_1 to exist");
  }

  addComponent(context.world, entity, RoomInstance);
  RoomInstance.id[entity] = "room-instance/gym";
  RoomInstance.templateIndex[entity] = templateIndex;
  RoomInstance.tier[entity] = 1;
  RoomInstance.floorIndex[entity] = 1;
  RoomInstance.slotId[entity] = "slot/gym";
  RoomInstance.roomStateId[entity] = "room-state/gym";
  RoomInstance.capacity[entity] = 3;
  RoomInstance.occupancy[entity] = 0;
  RoomInstance.isRequestedActive[entity] = 1;
  RoomInstance.isOperational[entity] = 1;
  RoomInstance.assignedStaffCount[entity] = 0;
  RoomInstance.appliedUpgradeIds[entity] = [];

  context.runtimeState.roomEntities.push(entity);
  return entity;
}

describe("advanceTrainingSystem", () => {
  it("accrues bounded readiness through the training block when a gym is operational", () => {
    const context = createSimTestContext();
    const operator = addTrainingOperator(context, "operator/training-1");
    addOperationalGym(context);

    advanceTrainingSystem(context, 60 * 60 * 1000);

    const snapshot = readOperatorTrainingSnapshot(operator);
    expect(snapshot.strength).toBeGreaterThan(snapshot.speed);
    expect(snapshot.endurance).toBeGreaterThan(snapshot.resilience);
    expect(snapshot.strength).toBeGreaterThan(0);
  });

  it("respects readiness caps and decays when the operator is not training", () => {
    const context = createSimTestContext();
    const operator = addTrainingOperator(context, "operator/training-2");
    addOperationalGym(context);

    writeOperatorTrainingSnapshot(operator, {
      strength: 99,
      speed: 99,
      endurance: 99,
      resilience: 99,
    });

    advanceTrainingSystem(context, 8 * 60 * 60 * 1000);
    const capped = readOperatorTrainingSnapshot(operator);
    expect(capped.strength).toBeGreaterThan(99);
    expect(capped.speed).toBeGreaterThan(99);
    expect(capped.endurance).toBeGreaterThan(99);
    expect(capped.resilience).toBeGreaterThan(99);
    expect(capped.strength).toBeLessThanOrEqual(100);
    expect(capped.speed).toBeLessThanOrEqual(100);
    expect(capped.endurance).toBeLessThanOrEqual(100);
    expect(capped.resilience).toBeLessThanOrEqual(100);

    ScheduleState.currentBlock[operator] = "idle";
    advanceTrainingSystem(context, 2 * 60 * 60 * 1000);

    const afterDecay = readOperatorTrainingSnapshot(operator);
    expect(afterDecay.strength).toBeLessThan(100);
    expect(afterDecay.speed).toBeLessThan(100);
  });

  it("applies hunger and fatigue pressure to training gains", () => {
    const context = createSimTestContext();
    const healthy = addTrainingOperator(context, "operator/healthy");
    const strained = addTrainingOperator(context, "operator/strained", {
      hunger: 85,
      fatigue: 90,
      stress: 75,
      morale: 35,
      injury: 20,
    });
    addOperationalGym(context);

    advanceTrainingSystem(context, 2 * 60 * 60 * 1000);

    const healthyAverage = Object.values(readOperatorTrainingSnapshot(healthy)).reduce(
      (total, value) => total + value,
      0,
    );
    const strainedAverage = Object.values(readOperatorTrainingSnapshot(strained)).reduce(
      (total, value) => total + value,
      0,
    );

    expect(healthyAverage).toBeGreaterThan(strainedAverage);
  });
});

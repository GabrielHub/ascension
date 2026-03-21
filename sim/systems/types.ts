import type { World } from "bitecs";

import type { TemplateRegistry } from "content/templates";

export interface SimRuntimeState {
  roomEntities: number[];
  operatorEntities: number[];
  relationshipEntities: number[];
  raidOpportunityEntities: number[];
  staffEntities: number[];
  visitorEntities: number[];
  eventEntities: number[];
  nextRoomSequence: number;
  nextOperatorSequence: number;
  nextOpportunitySequence: number;
  nextStaffSequence: number;
  nextVisitorSequence: number;
  nextRaidSequence: number;
  nextEventSequence: number;
}

export interface SimSingletonEntities {
  guild: number;
  time: number;
  building: number;
}

export interface SimSystemContext {
  world: World;
  registry: TemplateRegistry;
  singletonEntities: SimSingletonEntities;
  runtimeState: SimRuntimeState;
}

export type SimSystem = (context: SimSystemContext, deltaMs: number) => void;

export interface SimSystemGroup {
  id: string;
  systems: readonly SimSystem[];
}

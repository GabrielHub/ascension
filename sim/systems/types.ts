import type { World } from "bitecs";

import type { TemplateRegistry } from "content/templates";

export interface SimSingletonEntities {
  guild: number;
  time: number;
  building: number;
}

export interface SimSystemContext {
  world: World;
  registry: TemplateRegistry;
  singletonEntities: SimSingletonEntities;
}

export type SimSystem = (context: SimSystemContext, deltaMs: number) => void;

export interface SimSystemGroup {
  id: string;
  systems: readonly SimSystem[];
}

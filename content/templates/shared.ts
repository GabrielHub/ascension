import type { EffectDefinition } from "../effects";
import type { RequirementDefinition } from "../requirements";

export interface TemplateBase {
  id: string;
  name: string;
  tags: readonly string[];
  description?: string;
}

export interface ResourceTemplate extends TemplateBase {
  kind: "resource";
  startingAmount: number;
}

export interface BuildingTemplate extends TemplateBase {
  kind: "building";
  baseTier: number;
  baseRoomSlots: number;
  baseOperatorSlots: number;
  upgradeIds: readonly string[];
}

export interface RoomTemplate extends TemplateBase {
  kind: "room";
  tier: number;
  baseCapacity: number;
  availableInBuildings: readonly string[];
}

export interface UpgradeTemplate extends TemplateBase {
  kind: "upgrade";
  target: "building" | "room";
  targetId: string;
  requirements: readonly RequirementDefinition[];
  effects: readonly EffectDefinition[];
}

export interface MissionTemplate extends TemplateBase {
  kind: "mission";
  objectiveType: "clearance" | "containment" | "extraction";
  expectedThreatTags: readonly string[];
  rewardShape: "cash" | "loot" | "hybrid";
  intelConfidenceFloor: "low" | "medium" | "high";
  baseDurationHours: number;
}

export interface EventTemplate extends TemplateBase {
  kind: "event";
  category:
    | "breach_emergency"
    | "personnel_conflict"
    | "contract_deadline"
    | "economic_pressure"
    | "regulatory_scrutiny";
  pressureTags: readonly string[];
  weight: number;
}

export interface TemplateRegistryValidationIssue {
  category: "resources" | "buildings" | "rooms" | "upgrades" | "missions" | "events";
  templateId: string;
  message: string;
}

export interface TemplateRegistry {
  resources: readonly ResourceTemplate[];
  buildings: readonly BuildingTemplate[];
  rooms: readonly RoomTemplate[];
  upgrades: readonly UpgradeTemplate[];
  missions: readonly MissionTemplate[];
  events: readonly EventTemplate[];
  resourceById: ReadonlyMap<string, ResourceTemplate>;
  buildingById: ReadonlyMap<string, BuildingTemplate>;
  roomById: ReadonlyMap<string, RoomTemplate>;
  upgradeById: ReadonlyMap<string, UpgradeTemplate>;
  missionById: ReadonlyMap<string, MissionTemplate>;
  eventById: ReadonlyMap<string, EventTemplate>;
  resourceIndexById: ReadonlyMap<string, number>;
  buildingIndexById: ReadonlyMap<string, number>;
  roomIndexById: ReadonlyMap<string, number>;
  upgradeIndexById: ReadonlyMap<string, number>;
}

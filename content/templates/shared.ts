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

export type BossTag =
  | "boss:resilience-pierce"
  | "boss:recovery-suppress"
  | "boss:speed-drain"
  | "boss:summon-pressure"
  | "boss:intel-resist"
  | "boss:area-damage";

export type BossWeaknessKind = "role" | "stat" | "tag";

export interface BossWeakness {
  kind: BossWeaknessKind;
  target: string;
  multiplier: number;
}

export interface EnemyGroupProfile {
  threat: number;
  count: number;
  dropTableId: string;
}

export interface BossProfile {
  bossId: string;
  name: string;
  rank: string;
  phases: number;
  tags: readonly BossTag[];
  weaknesses: readonly BossWeakness[];
  attack: number;
  defense: number;
  hp: number;
  speed: number;
  threat: number;
  dropTableId: string;
}

export interface MissionCombatProfile {
  enemyGroups: readonly EnemyGroupProfile[];
  boss: BossProfile | null;
}

export interface MissionTemplate extends TemplateBase {
  kind: "mission";
  objectiveType: "clearance" | "containment" | "extraction";
  expectedThreatTags: readonly string[];
  rewardShape: "cash" | "loot" | "hybrid";
  intelConfidenceFloor: "low" | "medium" | "high";
  baseDurationHours: number;
  combatProfile?: MissionCombatProfile;
}

export interface EventTemplate extends TemplateBase {
  kind: "event";
  category:
    | "breach_emergency"
    | "personnel_conflict"
    | "contract_deadline"
    | "economic_pressure"
    | "regulatory_scrutiny"
    | "team_friction"
    | "injury_setback"
    | "departure_warning"
    | "room_tension"
    | "supply_shortage"
    | "rival_poaching"
    | "morale_surge"
    | "contract_opportunity";
  pressureTags: readonly string[];
  weight: number;
}

export type ItemCategory = "weapon" | "outfit-overlay" | "accessory" | "loot";
export type ItemRank = "f" | "e" | "d" | "c" | "b" | "a" | "s";

export interface StatEffect {
  stat: string;
  value: number;
}

export interface ItemTemplate extends TemplateBase {
  kind: "item";
  category: ItemCategory;
  rank: ItemRank;
  buyPrice: number;
  sellPrice: number;
  statEffects: readonly StatEffect[];
}

export interface DropTableEntry {
  itemId: string;
  weight: number;
  minQuantity: number;
  maxQuantity: number;
}

export interface DropTable {
  id: string;
  entries: readonly DropTableEntry[];
}

export interface TemplateRegistryValidationIssue {
  category:
    | "resources"
    | "buildings"
    | "rooms"
    | "upgrades"
    | "missions"
    | "events"
    | "items"
    | "dropTables";
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
  items: readonly ItemTemplate[];
  dropTables: readonly DropTable[];
  resourceById: ReadonlyMap<string, ResourceTemplate>;
  buildingById: ReadonlyMap<string, BuildingTemplate>;
  roomById: ReadonlyMap<string, RoomTemplate>;
  upgradeById: ReadonlyMap<string, UpgradeTemplate>;
  missionById: ReadonlyMap<string, MissionTemplate>;
  eventById: ReadonlyMap<string, EventTemplate>;
  itemById: ReadonlyMap<string, ItemTemplate>;
  dropTableById: ReadonlyMap<string, DropTable>;
  resourceIndexById: ReadonlyMap<string, number>;
  buildingIndexById: ReadonlyMap<string, number>;
  roomIndexById: ReadonlyMap<string, number>;
  upgradeIndexById: ReadonlyMap<string, number>;
}

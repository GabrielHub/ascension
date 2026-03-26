import type { EffectDefinition } from "../effects";
import type { RequirementDefinition } from "../requirements";
import type { AbilityEffect, TargetingRule } from "./kits";

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
  enemyFamilyId?: string;
}

// ── Ordinary enemy templates ──────────────────────────────────────────

export type OrdinaryEnemyTag =
  | "ambush"
  | "suppression"
  | "hazard-synergy"
  | "swarm-pressure"
  | "armor-break"
  | "hit-and-run"
  | "entangle"
  | "corrosive"
  | "ranged"
  | "heavy";

export interface OrdinaryEnemyActionProfile {
  id: string;
  name: string;
  weight: number;
  basePower: number;
  targeting: "single" | "all" | "weakest";
  tags?: readonly OrdinaryEnemyTag[];
}

export interface OrdinaryEnemyTemplate {
  enemyTemplateId: string;
  familyId: string;
  name: string;
  description: string;
  attack: number;
  defense: number;
  hp: number;
  speed: number;
  threat: number;
  actions: readonly OrdinaryEnemyActionProfile[];
  tags: readonly OrdinaryEnemyTag[];
  dropTableId: string;
}

export interface EnemyFamilyTemplate {
  familyId: string;
  name: string;
  description: string;
  siteConceptIds: readonly string[];
  members: readonly OrdinaryEnemyTemplate[];
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
  encounter?: BossEncounterTemplate;
}

export interface BossEncounterTemplate {
  elapsedMinutes: number;
  phases: readonly BossEncounterPhaseTemplate[];
  actions: readonly BossEncounterActionTemplate[];
  reactionHooks?: readonly BossEncounterReactionTemplate[];
  summonDefinitions?: readonly BossEncounterSummonTemplate[];
  targetingPriority?: "highest_threat" | "lowest_hp" | "random" | "frontline";
}

export interface BossEncounterPhaseTemplate {
  phaseIndex: number;
  hpThresholdFraction: number;
  statModifiers: Partial<Record<"attack" | "defense" | "speed" | "threat", number>>;
  actionIds: readonly string[];
  onEnterEffects: readonly AbilityEffect[];
  summonIds?: readonly string[];
}

export interface BossEncounterActionTemplate {
  id: string;
  name: string;
  weight: number;
  cooldown: number;
  targeting: TargetingRule;
  effects: readonly AbilityEffect[];
  phaseIndices?: readonly number[];
}

export interface BossEncounterReactionTemplate {
  trigger: "on_phase_enter";
  target: "boss_self" | "all_allies";
  effects: readonly AbilityEffect[];
  usesRemaining: number;
}

export interface BossEncounterSummonTemplate {
  summonId: string;
  label: string;
  stats: {
    attack: number;
    defense: number;
    hp: number;
    speed: number;
    threat: number;
  };
  actions: readonly BossEncounterActionTemplate[];
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
    | "dropTables"
    | "enemyFamilies";
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
  enemyFamilies: readonly EnemyFamilyTemplate[];
  resourceById: ReadonlyMap<string, ResourceTemplate>;
  buildingById: ReadonlyMap<string, BuildingTemplate>;
  roomById: ReadonlyMap<string, RoomTemplate>;
  upgradeById: ReadonlyMap<string, UpgradeTemplate>;
  missionById: ReadonlyMap<string, MissionTemplate>;
  eventById: ReadonlyMap<string, EventTemplate>;
  itemById: ReadonlyMap<string, ItemTemplate>;
  dropTableById: ReadonlyMap<string, DropTable>;
  enemyFamilyById: ReadonlyMap<string, EnemyFamilyTemplate>;
  enemyTemplateById: ReadonlyMap<string, OrdinaryEnemyTemplate>;
  resourceIndexById: ReadonlyMap<string, number>;
  buildingIndexById: ReadonlyMap<string, number>;
  roomIndexById: ReadonlyMap<string, number>;
  upgradeIndexById: ReadonlyMap<string, number>;
}

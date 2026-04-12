import type { World } from "bitecs";

import type { TemplateRegistry } from "content/templates";
import type { KitTemplateRegistry } from "content/templates/kits";
import type { RuntimeCueId } from "lib/runtime-cues";
import type { CityState } from "../components/city-state";
import type { BossEncounterInstance } from "./encounter-types";
import type { InterruptionQueueState } from "./interruptions";
import type { IncidentState } from "./incidents";
import type { GuidanceState } from "./guidance";

export type { RuntimeCueId } from "lib/runtime-cues";

// ── Structured events for the event log ──────────────────────────────────

export interface RuntimeEvent {
  kind: string;
  message: string;
  timestamp: string;
  accent?: string;
  targetKind?: string;
  targetId?: string;
}

export type RaidPresentationGoal =
  | "exploring"
  | "looting"
  | "intel"
  | "hunting"
  | "boss"
  | "retreating"
  | "regrouping";

export type RaidPresentationTeamState = "active" | "returning" | "defeated";

export type RaidEncounterThreat = "generic" | "elite" | "boss";

export type RaidFeatureKind = "loot-cache" | "intel-node" | "hazard-zone" | "debris-pile";

export type RaidEventKind =
  | "encounter"
  | "discovery"
  | "loot"
  | "intel"
  | "goal-change"
  | "status-change"
  | "hazard"
  | "retreat";

export type RaidOperatorReadiness = "ready" | "injured" | "fatigued" | "critical";

export interface RaidPresentationOperatorStatus {
  operatorId: string;
  readiness: RaidOperatorReadiness;
  healthFraction: number | null;
  roleTag: string | null;
}

export interface RaidPresentationEncounter {
  enemyLabel: string;
  threat: RaidEncounterThreat;
  healthFraction: number;
}

export interface RaidPresentationEvent {
  id: string;
  kind: RaidEventKind;
  message: string;
  tick: number;
}

export interface RaidPresentationTeam {
  raidId: string;
  x: number;
  y: number;
  goal: RaidPresentationGoal;
  state: RaidPresentationTeamState;
  operatorStatuses: RaidPresentationOperatorStatus[];
  encounter: RaidPresentationEncounter | null;
  recentEvents: RaidPresentationEvent[];
}

export interface RaidPresentationEnemy {
  id: string;
  x: number;
  y: number;
  threat: RaidEncounterThreat;
  discovered: boolean;
  engagedRaidId?: string;
  familyId?: string;
}

export interface RaidPresentationFeature {
  id: string;
  x: number;
  y: number;
  kind: RaidFeatureKind;
  discovered: boolean;
}

export interface RaidPresentationState {
  contractSiteId: string | null;
  teams: RaidPresentationTeam[];
  enemies: RaidPresentationEnemy[];
  features: RaidPresentationFeature[];
}

export interface SimRuntimeState {
  simulationSeed?: number;
  roomEntities: number[];
  operatorEntities: number[];
  raidOpportunityEntities: number[];
  staffEntities: number[];
  visitorEntities: number[];
  eventEntities: number[];
  dispositionEntities: number[];
  notableTieEntities: number[];
  recurringTeamEntities: number[];
  roomCultureEntities: number[];
  inventoryEntities: number[];
  equipmentEntities: number[];
  nextRoomSequence: number;
  nextOperatorSequence: number;
  nextOpportunitySequence: number;
  nextStaffSequence: number;
  nextVisitorSequence: number;
  nextRaidSequence: number;
  nextEventSequence: number;
  nextTeamSequence: number;
  pendingCueIds: RuntimeCueId[];
  pendingEvents: RuntimeEvent[];
  raidPresentation: RaidPresentationState;
  // Encounter, interruption, incident, and guidance state
  activeEncounter: BossEncounterInstance | null;
  interruptionQueue: InterruptionQueueState;
  incidentState: IncidentState;
  guidanceState: GuidanceState;
  kitRegistry: KitTemplateRegistry;
  worldTimeFrozen: boolean;
  deferIncidentPresentation: boolean;
  cityState: CityState;
}

export type VisitorQueueState = "active" | "deferred";

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

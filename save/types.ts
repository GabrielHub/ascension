import type { PolicyState } from "lib/policies";

export const SAVE_SLOT_IDS = ["slot/1", "slot/2", "slot/3"] as const;
export type SaveSlotId = (typeof SAVE_SLOT_IDS)[number];

export const CURRENT_SAVE_SCHEMA_VERSION = 21;
export const CURRENT_CONTENT_COMPATIBILITY = "preproduction-track-b";

export interface SaveSlotMetadata {
  guildName: string;
  playerName: string;
  createdAt: string;
  lastPlayedAt: string;
}

export interface GuildSnapshot {
  guildName: string;
  playerName: string;
  reputation: number;
  treasury: number;
  intel: number;
}

export interface WorldTimeSnapshot {
  tick: number;
  day: number;
  minuteOfDay: number;
}

export interface BuildingSnapshot {
  activeBuildingId: string;
  activeBuildingTier: number;
  activeFloorIndex: number;
  roomSlotCount: number;
  operatorSlotCount: number;
}

export interface RoomFootprintSnapshot {
  col: number;
  row: number;
  cols: number;
  rows: number;
}

export interface RoomSnapshot {
  id: string;
  templateId: string;
  tier: number;
  floorIndex: number;
  slotId: string;
  roomStateId: string;
  capacity: number;
  occupancy: number;
  isActive?: boolean;
  appliedUpgradeIds?: string[];
  reservedFootprint: RoomFootprintSnapshot;
  activeFootprint: RoomFootprintSnapshot;
  footprint?: RoomFootprintSnapshot;
}

export type SaveStructuredRecord = Record<string, unknown>;
export type SaveCompactValue = SaveStructuredRecord | string | number | boolean | null;

export interface OperatorVisibleGearSnapshot {
  weaponPartId?: string;
  outfitOverlayPartId?: string;
  accessoryPartId?: string;
}

export interface OperatorAppearanceSnapshot {
  presetId: string;
  visibleGear?: OperatorVisibleGearSnapshot;
}

export interface OperatorLifecycleSnapshot {
  status: "active" | "dead" | "departed";
  deathTick?: number;
  deathRaidSummaryId?: string;
  departureTick?: number;
  departureReason?: string;
}

export interface OperatorCombatSnapshot {
  rank: string;
  attunementTag: string;
  traits: string[];
  combatPackageId: string;
  blocks: number;
  baseStats: {
    strength: number;
    speed: number;
    endurance: number;
    resilience: number;
    perception: number;
    intelligence: number;
  };
}

export interface OperatorTrainingSnapshot {
  strength: number;
  speed: number;
  endurance: number;
  resilience: number;
}

export interface OperatorSnapshot extends SaveStructuredRecord {
  id: string;
  lifecycle: OperatorLifecycleSnapshot;
  identity?: SaveStructuredRecord;
  preferences?: SaveStructuredRecord;
  schedule?: SaveStructuredRecord;
  needs?: SaveStructuredRecord;
  morale?: SaveStructuredRecord;
  loyalty?: SaveStructuredRecord;
  injury?: SaveStructuredRecord;
  assignment?: SaveStructuredRecord;
  appearance: OperatorAppearanceSnapshot;
  combat?: OperatorCombatSnapshot;
  training?: OperatorTrainingSnapshot;
}

export interface OperatorRelationshipSnapshot {
  operatorAId: string;
  operatorBId: string;
  trust: number;
  friction: number;
  familiarity: number;
  recentSharedOutcome: number;
  historyTags?: string[];
}

export type VisitorSnapshot = { id: string } & Record<string, unknown>;

export type ActiveEventSnapshot = { id: string } & Record<string, unknown>;

export interface RaidOpportunitySnapshot extends SaveStructuredRecord {
  id?: string;
  missionId: string;
  location?: SaveCompactValue;
  threat?: SaveCompactValue;
  intel?: SaveCompactValue;
  reward?: SaveCompactValue;
  risk?: SaveCompactValue;
  status?: SaveCompactValue;
  interestedOperatorIds?: string[];
  claimedOperatorIds?: string[];
  createdTick?: number;
  expiresAtTick?: number;
}

// ── Raid run transcript types ────────────────────────────────────────

export type RaidRunStatus =
  | "active"
  | "awaiting_boss_commitment"
  | "boss_encounter"
  | "returning"
  | "resolved";

export type RaidStepKind =
  | "deploy"
  | "move"
  | "discover_enemy"
  | "discover_feature"
  | "hazard"
  | "skirmish_start"
  | "skirmish_round"
  | "skirmish_end"
  | "goal_check"
  | "loot_gain"
  | "intel_gain"
  | "injury"
  | "operator_down"
  | "retreat_begin"
  | "boss_threshold"
  | "boss_commit"
  | "boss_retreat"
  | "boss_result"
  | "return"
  | "resolve";

export type GoalCheckKind =
  | "exploring"
  | "looting"
  | "intel"
  | "hunting"
  | "regrouping"
  | "retreating";

export type GoalCheckGrade = "pass" | "mixed" | "fail";

export interface RaidStepSnapshot {
  kind: RaidStepKind;
  tickOffset: number;
  siteNodeId?: string;
  actorIds?: string[];
  message?: string;
  deltas?: SaveStructuredRecord;
  goalCheckKind?: GoalCheckKind;
  goalCheckGrade?: GoalCheckGrade;
  enemyTemplateId?: string;
  lootItemIds?: string[];
}

export interface SiteNodeSnapshot {
  nodeId: string;
  kind:
    | "chamber"
    | "corridor"
    | "hazard"
    | "cache"
    | "intel_point"
    | "boss_approach"
    | "boss_chamber";
  x: number;
  y: number;
  edges: string[];
  enemyGroupIds?: string[];
  hazardTags?: string[];
  discovered?: boolean;
}

export interface RaidRunSnapshot {
  raidId: string;
  contractSiteId: string;
  missionId: string;
  siteSeed: number;
  teamOperatorIds: string[];
  startedTick: number;
  status: RaidRunStatus;
  currentStepIndex: number;
  steps: RaidStepSnapshot[];
  siteGraph: SiteNodeSnapshot[];
  derivedState: {
    revealedNodeIds: string[];
    discoveredEnemyIds: string[];
    discoveredFeatureIds: string[];
    operatorHp: Record<string, number>;
    operatorMaxHp: Record<string, number>;
    operatorInjury: Record<string, number>;
    currentNodeId: string;
    bossThresholdReached: boolean;
    retreating: boolean;
    lootGained: string[];
    intelGained: number;
  };
  summaryDraft?: {
    result: "success" | "failure" | "mixed";
    reputationDelta: number;
    cashDelta: number;
    contributingFactors: string[];
  };
}

export interface ActiveRaidSnapshot extends SaveStructuredRecord {
  id: string;
  contractSiteId?: string;
  missionId: string;
  startedAt: string;
  startedTick: number;
  revealProgress: number;
  operatorIds: string[];
  returnTick: number;
  durationHours: number;
  briefingSource?: string | null;
  briefingStatus?: string | null;
  resolutionPacket?: ActiveRaidResolutionSnapshot;
  raidRun?: RaidRunSnapshot;
}

export interface ActiveRaidResolutionSnapshot extends SaveStructuredRecord {
  result?: "success" | "failure" | "mixed";
  reputationDelta?: number;
  cashDelta?: number;
  operatorOutcomes?: RaidOperatorOutcomeSnapshot[];
  narrativeTags?: string[];
  intelMismatchTags?: string[];
}

export interface RaidOperatorOutcomeSnapshot extends SaveStructuredRecord {
  operatorId: string;
  died?: boolean;
}

export interface RaidSummarySnapshot extends SaveStructuredRecord {
  id: string;
  contractSiteId?: string;
  opportunityId?: string;
  missionId: string;
  location?: string;
  startedAt?: string;
  endedAt?: string;
  result: "success" | "failure" | "mixed";
  reputationDelta: number;
  cashDelta: number;
  threat?: number;
  intel?: number;
  reward?: number;
  cohesion?: number;
  treatmentCost?: number;
  operatorOutcomes?: RaidOperatorOutcomeSnapshot[];
  narrativeTags?: string[];
  intelMismatchTags?: string[];
  bossDefeated?: boolean;
  contributingFactors?: string[];
}

export interface ContractSiteSnapshot {
  contractSiteId: string;
  missionId: string;
  siteConceptId?: string;
  location: string;
  rank?: string;
  districtId?: string;
  sponsorFactionId?: string;
  bossDefeated: boolean;
  missionCompleted?: boolean;
  contractLost: boolean;
  threat: number;
  intel: number;
  reward: number;
  securedAtTick: number;
  explorationProgress?: number;
  closureProgress?: number;
  closureThreshold?: number;
  bossIntelProgress?: number;
  bossPressureProgress?: number;
  requiresBossClear?: boolean;
  bossAvailable?: boolean;
  boardIntel?: ContractBoardIntelSnapshot;
  briefing?: ContractBriefingSnapshot | null;
}

export interface ContractBoardIntelSnapshot {
  source?: string;
  quality?: string;
}

export interface ContractBriefingSnapshot {
  source: string;
  status: string;
  opportunityIntelBonus: number;
  bossIntelBonus: number;
}

export interface PostedContractSnapshot {
  postingId: string;
  missionId: string;
  siteConceptId: string;
  location: string;
  rank: string;
  threat: number;
  intel: number;
  reward: number;
  risk: number;
  bidCost: number;
  minReputation: number;
  generatedAtTick: number;
  knownTraits?: string[];
  hiddenTraitCount?: number;
  enemyHints?: string[];
  lootFamilyHints?: string[];
  bossHint?: string | null;
  neighborhoodLabel?: string;
  boardIntel?: ContractBoardIntelSnapshot;
  districtId?: string;
  sponsorFactionId?: string;
  pressureTags?: string[];
}

export interface ContractResultSnapshot {
  contractSiteId: string;
  missionId: string;
  siteConceptId: string;
  location: string;
  rank: string;
  outcome: "mission_complete" | "boss_defeated" | "contract_lost";
  totalRaids: number;
  totalCashEarned: number;
  totalReputationEarned: number;
  operatorDeaths: number;
  resolvedAtTick: number;
  districtId?: string;
  sponsorFactionId?: string;
}

export interface FogOfWarSnapshot {
  gridWidth: number;
  gridHeight: number;
  revealed: boolean[];
  revealedCount: number;
  completedRaidRevealBase?: number;
}

export interface WorldSchedulerSnapshot {
  lastPayrollDay: number;
  lastVisitorSpawnTick: number;
  lastEventTick: number;
  lastRaidOpportunityTick: number;
}

export interface OperatorDispositionSnapshot {
  operatorId: string;
  sociability: number;
  temperament: number;
  grievanceLevel: number;
  satisfactionLevel: number;
}

export interface NotableTieSnapshot {
  operatorAId: string;
  operatorBId: string;
  stance: string;
  strength: number;
}

export interface RecurringTeamSnapshot {
  id: string;
  memberIds: string[];
  cohesion: number;
  raidCount: number;
  lastRaidTick: number;
  damaged: boolean;
  damageReason: string;
}

export interface RoomCultureSnapshot {
  roomInstanceId: string;
  comfort: number;
  tension: number;
  camaraderie: number;
  tone: string;
}

export interface InventoryStackSnapshot {
  itemId: string;
  quantity: number;
}

export interface EquipmentAssignmentSnapshot {
  operatorId: string;
  weaponId: string;
  outfitOverlayId: string;
  accessoryId: string;
}

export type PolicyStateSnapshot = PolicyState;

export interface LootAutomationSnapshot {
  autoSellEnabled: boolean;
}

// ── Public pressure save state ──────────────────────────────────────

export type PublicPressureSource = "regulator" | "press" | "sponsor" | "public";

export interface DistrictPublicPressureSnapshot {
  districtId: string;
  standing: number;
  heat: number;
  containment: number;
  recentContractCount: number;
  lastResolvedTick: number;
}

export interface FactionRelationshipSnapshot {
  factionId: string;
  standing: number;
  cooldownUntilTick: number;
}

export interface PublicPressureSnapshot {
  score: number;
  dominantSource: PublicPressureSource | null;
  cooldownsBySource: Record<PublicPressureSource, number>;
  districts: DistrictPublicPressureSnapshot[];
}

export type RivalTrend = "rising" | "stable" | "slipping";
export type RivalStrengthBand = "below" | "peer" | "above";

export interface RivalInstanceSnapshot {
  rivalId: string;
  ladderPosition: number;
  strengthBand: RivalStrengthBand;
  intensity: number;
  aggression: number;
  trend: RivalTrend;
  isPrimary: boolean;
  introducedAtTick: number | null;
  lastMoveTick: number | null;
  recentMoveIds: string[];
  lastMoveTicksByMoveId?: Record<string, number>;
  departedOperatorId?: string | null;
  missedProspectId?: string | null;
  sourceTick?: number | null;
  sourceReason?: string | null;
}

export interface RivalPressureSnapshot {
  active: boolean;
  currentPrimaryRivalId: string | null;
  rivals: RivalInstanceSnapshot[];
}

export function createDefaultDistrictPublicPressure(
  districtId: string,
): DistrictPublicPressureSnapshot {
  return {
    districtId,
    standing: 50,
    heat: 0,
    containment: 0,
    recentContractCount: 0,
    lastResolvedTick: 0,
  };
}

export function createDefaultFactionRelationship(factionId: string): FactionRelationshipSnapshot {
  return { factionId, standing: 0, cooldownUntilTick: 0 };
}

export function createDefaultPublicPressure(): Omit<PublicPressureSnapshot, "districts"> {
  return {
    score: 0,
    dominantSource: null,
    cooldownsBySource: {
      regulator: 0,
      press: 0,
      sponsor: 0,
      public: 0,
    },
  };
}

export function createDefaultRivalPressure(): RivalPressureSnapshot {
  return {
    active: false,
    currentPrimaryRivalId: null,
    rivals: [],
  };
}

export interface WorldSnapshot extends SaveStructuredRecord {
  simulationSeed?: number;
  guild: GuildSnapshot;
  time: WorldTimeSnapshot;
  building: BuildingSnapshot;
  rooms: RoomSnapshot[];
  activeRaidPackets: ActiveRaidSnapshot[];
  raidSummaries: RaidSummarySnapshot[];
  appliedUpgradeIds: string[];
  operators?: OperatorSnapshot[];
  operatorRelationships?: OperatorRelationshipSnapshot[];
  visitors?: VisitorSnapshot[];
  raidOpportunities?: RaidOpportunitySnapshot[];
  activeEvents?: ActiveEventSnapshot[];
  contractSite?: ContractSiteSnapshot | null;
  fogOfWar?: FogOfWarSnapshot | null;
  contractLifecycle?: "idle" | "bidding" | "active" | "resolved";
  postedContracts?: PostedContractSnapshot[];
  contractResult?: ContractResultSnapshot | null;
  scheduler?: WorldSchedulerSnapshot;
  operatorDispositions?: OperatorDispositionSnapshot[];
  notableTies?: NotableTieSnapshot[];
  recurringTeams?: RecurringTeamSnapshot[];
  roomCultures?: RoomCultureSnapshot[];
  inventoryStacks?: InventoryStackSnapshot[];
  equipmentAssignments?: EquipmentAssignmentSnapshot[];
  policies?: PolicyStateSnapshot;
  lootAutomation?: LootAutomationSnapshot;
  activeEncounter?: object | null;
  interruptionQueue?: object | null;
  incidentState?: object | null;
  guidanceState?: object | null;
  raidRuns?: RaidRunSnapshot[];
  publicPressure?: PublicPressureSnapshot | null;
  factionRelationships?: FactionRelationshipSnapshot[];
  rivalPressure?: RivalPressureSnapshot | null;
  presenterUnlocks?: PresenterUnlockSnapshot[];
}

export interface PresenterUnlockSnapshot {
  presenterId: string;
  unlockedAtTick: number;
  unlockedAtDay: number;
}

export interface PersistedSaveGame {
  slotId: SaveSlotId;
  schemaVersion: number;
  compatibilityVersion: string;
  metadata: SaveSlotMetadata;
  world: WorldSnapshot;
}

export interface OccupiedSaveSlot {
  slotId: SaveSlotId;
  state: "occupied";
  schemaVersion: number;
  compatibilityVersion: string;
  metadata: SaveSlotMetadata;
  diagnostic?: SaveSlotDiagnostic;
}

export interface EmptySaveSlot {
  slotId: SaveSlotId;
  state: "empty";
}

export interface SaveSlotDiagnostic {
  level: "warning" | "error";
  message: string;
}

export interface UnreadableSaveSlot {
  slotId: SaveSlotId;
  state: "error";
  diagnostic: SaveSlotDiagnostic;
}

export type SaveSlotRecord = EmptySaveSlot | OccupiedSaveSlot | UnreadableSaveSlot;

export function toOccupiedSaveSlot(save: PersistedSaveGame): OccupiedSaveSlot {
  return {
    slotId: save.slotId,
    state: "occupied",
    schemaVersion: save.schemaVersion,
    compatibilityVersion: save.compatibilityVersion,
    metadata: save.metadata,
  };
}

export function createEmptySaveSlot(slotId: SaveSlotId): EmptySaveSlot {
  return { slotId, state: "empty" };
}

export function getSaveSlotNumber(slotId: SaveSlotId): number {
  return SAVE_SLOT_IDS.indexOf(slotId) + 1;
}

export function slugifySaveName(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export function buildSaveExportFileName(save: PersistedSaveGame): string {
  const guildSlug =
    slugifySaveName(save.metadata.guildName) || `slot-${getSaveSlotNumber(save.slotId)}`;
  return `ascension-${guildSlug}.json`;
}

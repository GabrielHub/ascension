export const SAVE_SLOT_IDS = ["slot/1", "slot/2", "slot/3"] as const;
export type SaveSlotId = (typeof SAVE_SLOT_IDS)[number];

export const CURRENT_SAVE_SCHEMA_VERSION = 7;
export const CURRENT_CONTENT_COMPATIBILITY = "preproduction-track-a";

export interface SaveSlotMetadata {
  guildName: string;
  createdAt: string;
  lastPlayedAt: string;
}

export interface GuildSnapshot {
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
  capacity: number;
  occupancy: number;
  isActive?: boolean;
  appliedUpgradeIds?: string[];
  footprint: RoomFootprintSnapshot;
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
  status: "active" | "dead";
  deathTick?: number;
  deathRaidSummaryId?: string;
}

export interface OperatorSnapshot {
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

export interface StaffSnapshot {
  id: string;
  name: string;
  roleTag: string;
  status: string;
  wage: number;
  assignment: SaveStructuredRecord;
  schedule?: SaveStructuredRecord;
  needs?: SaveStructuredRecord;
  morale?: SaveStructuredRecord;
  loyalty?: SaveStructuredRecord;
  injury?: SaveStructuredRecord;
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

export interface ActiveRaidSnapshot extends SaveStructuredRecord {
  id: string;
  contractSiteId?: string;
  missionId: string;
  startedAt: string;
  startedTick?: number;
  revealProgress: number;
  operatorIds?: string[];
  returnTick?: number;
  durationHours?: number;
  resolutionPacket?: SaveStructuredRecord;
}

export interface RaidOperatorOutcomeSnapshot extends SaveStructuredRecord {
  operatorId: string;
  died?: boolean;
}

export interface RaidSummarySnapshot extends SaveStructuredRecord {
  id: string;
  contractSiteId?: string;
  missionId: string;
  startedAt: string;
  endedAt: string;
  result: "success" | "failure" | "mixed";
  reputationDelta: number;
  cashDelta: number;
  operatorOutcomes?: RaidOperatorOutcomeSnapshot[];
  narrativeTags?: string[];
  intelMismatchTags?: string[];
}

export interface ContractSiteSnapshot {
  contractSiteId: string;
  missionId: string;
  location: string;
  bossDefeated: boolean;
  contractLost: boolean;
  threat: number;
  intel: number;
  reward: number;
  securedAtTick: number;
}

export interface FogOfWarSnapshot {
  gridWidth: number;
  gridHeight: number;
  revealed: boolean[];
  revealedCount: number;
}

export interface WorldSchedulerSnapshot {
  lastPayrollDay: number;
  lastVisitorSpawnTick: number;
  lastEventTick: number;
  lastRaidOpportunityTick: number;
}

export interface WorldSnapshot {
  guild: GuildSnapshot;
  time: WorldTimeSnapshot;
  building: BuildingSnapshot;
  rooms: RoomSnapshot[];
  activeRaidPackets: ActiveRaidSnapshot[];
  raidSummaries: RaidSummarySnapshot[];
  appliedUpgradeIds: string[];
  operators?: OperatorSnapshot[];
  operatorRelationships?: OperatorRelationshipSnapshot[];
  staff?: StaffSnapshot[];
  visitors?: VisitorSnapshot[];
  raidOpportunities?: RaidOpportunitySnapshot[];
  activeEvents?: ActiveEventSnapshot[];
  contractSite?: ContractSiteSnapshot | null;
  fogOfWar?: FogOfWarSnapshot | null;
  scheduler?: WorldSchedulerSnapshot;
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
}

export interface EmptySaveSlot {
  slotId: SaveSlotId;
  state: "empty";
}

export type SaveSlotRecord = EmptySaveSlot | OccupiedSaveSlot;

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

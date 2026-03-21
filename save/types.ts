export const SAVE_SLOT_IDS = ["slot/1", "slot/2", "slot/3"] as const;
export type SaveSlotId = (typeof SAVE_SLOT_IDS)[number];

export const CURRENT_SAVE_SCHEMA_VERSION = 1;
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

export interface RoomSnapshot {
  id: string;
  templateId: string;
  tier: number;
  capacity: number;
  occupancy: number;
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface ActiveRaidSnapshot {
  id: string;
  missionId: string;
  startedAt: string;
  revealProgress: number;
}

export interface RaidSummarySnapshot {
  id: string;
  missionId: string;
  startedAt: string;
  endedAt: string;
  result: "success" | "failure" | "mixed";
  reputationDelta: number;
  cashDelta: number;
}

export interface WorldSnapshot {
  guild: GuildSnapshot;
  time: WorldTimeSnapshot;
  building: BuildingSnapshot;
  rooms: RoomSnapshot[];
  activeRaidPackets: ActiveRaidSnapshot[];
  raidSummaries: RaidSummarySnapshot[];
  appliedUpgradeIds: string[];
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

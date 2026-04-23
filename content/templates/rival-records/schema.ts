export type RivalStatus =
  | "concept-draft"
  | "metadata-in-progress"
  | "metadata-approved"
  | "assets-in-progress"
  | "ready-to-wire";

export type RivalPressureLane = "prestige" | "labor-market" | "sponsor-network" | "hybrid";

export interface RivalParentGuild {
  name: string;
  origin: string;
  foundedYear: number;
  summary: string;
}

export interface RivalLeaderProfile {
  fullName: string;
  ageRange: string;
  background: string;
  isAttuned: boolean;
  operatorRank: string | null;
}

export interface RivalCopySurface {
  leaderboardName: string;
  dossierOneLiner: string;
  currentRivalOneLiner: string;
  publicBlurb: string;
  internalAuthorNote: string;
}

export interface RivalAssetPaths {
  leaderPortrait: string;
  insignia: string;
}

export interface RivalDesignNotes {
  visualBrandingNotes: string;
  leaderPortraitBrief: string;
  guildInsigniaBrief: string;
  dossierMotif: string;
}

export interface RivalRecordBase {
  id: string;
  status: RivalStatus;
  guildName: string;
  shortDisplayName: string;
  branchSuffix: string | null;
  parentGuild: RivalParentGuild | null;
  leader: RivalLeaderProfile;
  districtAnchor: string;
  districtIdHint: string;
  baseLocation: string;
  publicPitch: string;
  internalSummary: string;
  pressureStyle: string;
  pressureLane: RivalPressureLane;
  moveFamilyAffinities: readonly string[];
  rivalryFantasy: string;
  toneAndVoice: string;
  interruptionCopySamples: readonly string[];
  copy: RivalCopySurface;
}

export interface RivalAuthoringRecord extends RivalRecordBase {
  status: Exclude<RivalStatus, "ready-to-wire">;
  designNotes: RivalDesignNotes;
  assetPaths: RivalAssetPaths | null;
  assetsShipped: false;
}

export interface ReadyToWireRivalRecord extends RivalRecordBase {
  status: "ready-to-wire";
  assetPaths: RivalAssetPaths;
  assetsShipped: true;
}

export type RivalRecord = RivalAuthoringRecord | ReadyToWireRivalRecord;

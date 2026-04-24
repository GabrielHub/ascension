export type RivalPressureLane = "prestige" | "labor-market" | "sponsor-network" | "hybrid";

export interface RivalLeaderProfile {
  name: string;
}

export interface RivalCopySurface {
  currentRivalOneLiner: string;
}

export interface RivalAssetPaths {
  leaderPortrait: string;
  insignia: string;
}

export interface RivalNarrativeProfile {
  operatingBase: string;
  publicPitch: string;
  pressureStyle: string;
  rivalryFantasy: string;
  toneAndVoice: string;
}

export type RivalMoveFamily =
  | "contract_challenge"
  | "public_comparison"
  | "sponsor_interference"
  | "recruitment_market_loss"
  | "site_arrival"
  | "press_gravity";

export type RivalMoveEffectKind =
  | "morale_delta"
  | "loyalty_delta"
  | "treasury_delta"
  | "reputation_delta"
  | "intel_delta"
  | "team_cohesion_delta"
  | "contract_pressure_delta"
  | "faction_relationship_delta"
  | "public_pressure_delta";

export type RivalMoveEffectTargetRef = "guild" | "team" | `faction:${string}`;

export interface RivalMoveEffect {
  kind: RivalMoveEffectKind;
  targetRef: RivalMoveEffectTargetRef;
  value: number;
}

export interface RivalMoveChoiceTemplate {
  choiceId: string;
  label: string;
  description: string;
  consequenceSummary: string;
  effects: readonly RivalMoveEffect[];
}

export interface RivalMoveTemplate {
  id: string;
  family: RivalMoveFamily;
  weight: number;
  cooldownMinutes: number;
  briefingTemplate: string;
  basePublicPressureDelta: number;
  baseIntensityDelta: number;
  choices: readonly RivalMoveChoiceTemplate[];
}

export interface RivalRecord {
  id: string;
  guildName: string;
  shortDisplayName: string;
  leader: RivalLeaderProfile;
  pressureLane: RivalPressureLane;
  copy: RivalCopySurface;
  assetPaths: RivalAssetPaths;
  narrativeProfile: RivalNarrativeProfile;
  moves: readonly RivalMoveTemplate[];
}

export type ReadyToWireRivalRecord = RivalRecord;

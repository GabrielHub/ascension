export const CONTRACT_POSTURE_OPTIONS = ["conservative", "balanced", "aggressive"] as const;
export type ContractPostureOption = (typeof CONTRACT_POSTURE_OPTIONS)[number];

export const OBJECTIVE_BIAS_OPTIONS = [
  "thorough_sweep",
  "standard_clearance",
  "boss_rush",
] as const;
export type ObjectiveBiasOption = (typeof OBJECTIVE_BIAS_OPTIONS)[number];

export const RECOVERY_TRIAGE_OPTIONS = [
  "field_first",
  "balanced_rotation",
  "full_recovery",
] as const;
export type RecoveryTriageOption = (typeof RECOVERY_TRIAGE_OPTIONS)[number];

export const STAFFING_PRIORITY_OPTIONS = [
  "operations_focus",
  "balanced_schedule",
  "welfare_priority",
] as const;
export type StaffingPriorityOption = (typeof STAFFING_PRIORITY_OPTIONS)[number];

export const ROSTER_FLOW_OPTIONS = ["selective_intake", "open_doors", "retention_focus"] as const;
export type RosterFlowOption = (typeof ROSTER_FLOW_OPTIONS)[number];

export interface PolicyState {
  contractPosture: ContractPostureOption;
  objectiveBias: ObjectiveBiasOption;
  recoveryTriage: RecoveryTriageOption;
  staffingPriority: StaffingPriorityOption;
  rosterFlow: RosterFlowOption;
}

export type PolicyId = keyof PolicyState;
export type PolicyValue = PolicyState[PolicyId];
export type PolicyContractLifecycle = "idle" | "bidding" | "active" | "resolved";

export const DEFAULT_POLICY_STATE: PolicyState = {
  contractPosture: "balanced",
  objectiveBias: "standard_clearance",
  recoveryTriage: "balanced_rotation",
  staffingPriority: "balanced_schedule",
  rosterFlow: "open_doors",
};

const POLICY_OPTION_MAP = {
  contractPosture: CONTRACT_POSTURE_OPTIONS,
  objectiveBias: OBJECTIVE_BIAS_OPTIONS,
  recoveryTriage: RECOVERY_TRIAGE_OPTIONS,
  staffingPriority: STAFFING_PRIORITY_OPTIONS,
  rosterFlow: ROSTER_FLOW_OPTIONS,
} as const satisfies Record<PolicyId, readonly string[]>;

export interface PolicyOptionMetadata {
  label: string;
  explanation: string;
  tradeoff: string;
}

export interface PolicyFactorMetadata {
  policyId: PolicyId;
  policyLabel: string;
  optionLabel: string;
  explanation: string;
  tradeoff: string;
}

type PolicyMetadataMap = {
  [P in PolicyId]: {
    label: string;
    question: string;
    options: Record<PolicyState[P], PolicyOptionMetadata>;
  };
};

export const SHIPPED_POLICY_IDS = [
  "contractPosture",
  "objectiveBias",
  "recoveryTriage",
  "staffingPriority",
  "rosterFlow",
] as const satisfies readonly PolicyId[];

const POLICY_METADATA = {
  contractPosture: {
    label: "Contract Posture",
    question: "How cautious should the guild be about sending teams into the field?",
    options: {
      conservative: {
        label: "Cautious",
        explanation: "Teams only deploy when they're well-rested and confident.",
        tradeoff: "Fewer raids and slower income, but better outcomes and healthier morale.",
      },
      balanced: {
        label: "Standard",
        explanation: "Teams use their own judgment about when they're ready.",
        tradeoff: "Default raid pacing with no added risk or protection.",
      },
      aggressive: {
        label: "Aggressive",
        explanation: "Teams deploy even when conditions aren't ideal.",
        tradeoff: "More raids and more loot upside, but more injuries and morale strain.",
      },
    },
  },
  objectiveBias: {
    label: "Field Objectives",
    question: "What should teams prioritize once they're inside a contract site?",
    options: {
      thorough_sweep: {
        label: "Thorough Sweep",
        explanation: "Teams clear methodically for more loot and intel.",
        tradeoff: "Longer deployments pay out more, but exposure and cumulative injury risk climb.",
      },
      standard_clearance: {
        label: "Standard Clearance",
        explanation: "Teams balance exploration with progress toward the contract target.",
        tradeoff: "Default contract pacing with balanced loot, intel, and completion speed.",
      },
      boss_rush: {
        label: "Boss Rush",
        explanation: "Teams push straight for the boss instead of sweeping the site.",
        tradeoff: "Faster contract closes with less loot and higher single-encounter variance.",
      },
    },
  },
  recoveryTriage: {
    label: "Recovery Standards",
    question: "How healthy should operators be before they're cleared for field work?",
    options: {
      field_first: {
        label: "Field First",
        explanation: "Operators return to the raid pool sooner, even with lingering damage.",
        tradeoff:
          "Faster turnaround keeps raids moving, but damage and morale pressure accumulate.",
      },
      balanced_rotation: {
        label: "Balanced Rotation",
        explanation: "Operators recover at a reasonable pace without waiting for perfect health.",
        tradeoff: "Default recovery flow with moderate availability and moderate sustainability.",
      },
      full_recovery: {
        label: "Full Recovery",
        explanation: "Operators stay in recovery until they're genuinely healthy.",
        tradeoff: "Healthier, steadier deployments, but a smaller raid-ready pool at any moment.",
      },
    },
  },
  staffingPriority: {
    label: "Daily Routine",
    question: "What should operators focus on when they're not in the field?",
    options: {
      operations_focus: {
        label: "Operations Focus",
        explanation: "Operators spend more time working and less time socializing or resting.",
        tradeoff: "Higher short-term output, but morale decays when people never get a real break.",
      },
      balanced_schedule: {
        label: "Balanced Schedule",
        explanation: "Operators divide their time naturally between work, rest, and social time.",
        tradeoff: "Default room output with no extra morale push in either direction.",
      },
      welfare_priority: {
        label: "Welfare Priority",
        explanation: "Operators rest and socialize more instead of pushing constant output.",
        tradeoff: "Morale and loyalty rise, but day-to-day room output slows down.",
      },
    },
  },
  rosterFlow: {
    label: "Recruitment Policy",
    question: "How should the guild approach hiring and keeping operators?",
    options: {
      selective_intake: {
        label: "Selective Intake",
        explanation: "The guild is pickier about who walks in, waiting for better prospects.",
        tradeoff:
          "Higher-quality recruits arrive less often, and rejecting them costs more reputation.",
      },
      open_doors: {
        label: "Open Doors",
        explanation: "The guild takes whoever shows up and keeps the pipeline wide.",
        tradeoff: "Default recruitment flow with steady volume and average quality.",
      },
      retention_focus: {
        label: "Retention Focus",
        explanation: "The guild invests more in keeping the operators it already has.",
        tradeoff:
          "Departures get less likely, but replacement traffic slows when losses do happen.",
      },
    },
  },
} as const satisfies PolicyMetadataMap;

const OBJECTIVE_BIAS_ACTIVE_CONTRACT_REASON =
  "Field Objectives cannot change during an active contract because deployed teams are already committed to the current objective plan.";

const POLICY_FACTOR_TAG_MAP = {
  contract_posture: "contractPosture",
  objective_bias: "objectiveBias",
  recovery_triage: "recoveryTriage",
  staffing_priority: "staffingPriority",
  roster_flow: "rosterFlow",
} as const satisfies Record<string, PolicyId>;

export interface ContractPostureConfig {
  minimumWillingnessThreshold: number;
  riskGapPenaltyMultiplier: number;
  refusalRiskMoraleFloor: number;
  moraleDriftPerHour: number;
}

const CONTRACT_POSTURE_CONFIG = {
  conservative: {
    minimumWillingnessThreshold: 62,
    riskGapPenaltyMultiplier: 1.5,
    refusalRiskMoraleFloor: 38,
    moraleDriftPerHour: 0.04,
  },
  balanced: {
    minimumWillingnessThreshold: 54,
    riskGapPenaltyMultiplier: 1,
    refusalRiskMoraleFloor: 30,
    moraleDriftPerHour: 0,
  },
  aggressive: {
    minimumWillingnessThreshold: 46,
    riskGapPenaltyMultiplier: 0.6,
    refusalRiskMoraleFloor: 22,
    moraleDriftPerHour: -0.06,
  },
} as const satisfies Record<ContractPostureOption, ContractPostureConfig>;

export interface ObjectiveBiasConfig {
  durationMultiplier: number;
  explorationCoverageMultiplier: number;
  lootMultiplier: number;
  intelMultiplier: number;
  bossRunProgressThreshold: number;
  contractExplorationThreshold: number;
  contractPressureThreshold: number;
  goalWeightModifiers: Partial<
    Record<"exploring" | "looting" | "intel" | "hunting" | "boss", number>
  >;
}

const OBJECTIVE_BIAS_CONFIG = {
  thorough_sweep: {
    durationMultiplier: 1.25,
    explorationCoverageMultiplier: 1.3,
    lootMultiplier: 1.2,
    intelMultiplier: 1.35,
    bossRunProgressThreshold: 0.8,
    contractExplorationThreshold: 75,
    contractPressureThreshold: 55,
    goalWeightModifiers: {
      exploring: 12,
      looting: 18,
      intel: 16,
      boss: -12,
    },
  },
  standard_clearance: {
    durationMultiplier: 1,
    explorationCoverageMultiplier: 1,
    lootMultiplier: 1,
    intelMultiplier: 1,
    bossRunProgressThreshold: 0.65,
    contractExplorationThreshold: 70,
    contractPressureThreshold: 50,
    goalWeightModifiers: {},
  },
  boss_rush: {
    durationMultiplier: 0.8,
    explorationCoverageMultiplier: 0.6,
    lootMultiplier: 0.65,
    intelMultiplier: 0.5,
    bossRunProgressThreshold: 0.45,
    contractExplorationThreshold: 55,
    contractPressureThreshold: 45,
    goalWeightModifiers: {
      exploring: -10,
      looting: -14,
      intel: -12,
      hunting: 4,
      boss: 20,
    },
  },
} as const satisfies Record<ObjectiveBiasOption, ObjectiveBiasConfig>;

export interface RecoveryTriageConfig {
  injuryRaidThreshold: number;
  recoveryBlockScoreModifier: number;
  recoveryRateMultiplier: number;
  fatigueRaidPenaltyThreshold: number;
  stressMoraleContributionMultiplier: number;
}

const RECOVERY_TRIAGE_CONFIG = {
  field_first: {
    injuryRaidThreshold: 40,
    recoveryBlockScoreModifier: -15,
    recoveryRateMultiplier: 1,
    fatigueRaidPenaltyThreshold: 90,
    stressMoraleContributionMultiplier: 1.2,
  },
  balanced_rotation: {
    injuryRaidThreshold: 75,
    recoveryBlockScoreModifier: 0,
    recoveryRateMultiplier: 1.2,
    fatigueRaidPenaltyThreshold: 95,
    stressMoraleContributionMultiplier: 1,
  },
  full_recovery: {
    injuryRaidThreshold: 80,
    recoveryBlockScoreModifier: 20,
    recoveryRateMultiplier: 1.15,
    fatigueRaidPenaltyThreshold: 70,
    stressMoraleContributionMultiplier: 0.85,
  },
} as const satisfies Record<RecoveryTriageOption, RecoveryTriageConfig>;

export interface StaffingPriorityConfig {
  workBlockScoreModifier: number;
  socialBlockScoreModifier: number;
  recoveryBlockScoreModifier: number;
  restBlockScoreModifier: number;
  loyaltyDriftPerHour: number;
  moraleDriftPerHour: number;
}

const STAFFING_PRIORITY_CONFIG = {
  operations_focus: {
    workBlockScoreModifier: 12,
    socialBlockScoreModifier: -8,
    recoveryBlockScoreModifier: -6,
    restBlockScoreModifier: -4,
    loyaltyDriftPerHour: 0.03,
    moraleDriftPerHour: -0.05,
  },
  balanced_schedule: {
    workBlockScoreModifier: 0,
    socialBlockScoreModifier: 0,
    recoveryBlockScoreModifier: 0,
    restBlockScoreModifier: 0,
    loyaltyDriftPerHour: 0,
    moraleDriftPerHour: 0,
  },
  welfare_priority: {
    workBlockScoreModifier: -10,
    socialBlockScoreModifier: 12,
    recoveryBlockScoreModifier: 8,
    restBlockScoreModifier: 6,
    loyaltyDriftPerHour: 0.06,
    moraleDriftPerHour: 0.08,
  },
} as const satisfies Record<StaffingPriorityOption, StaffingPriorityConfig>;

export interface RosterFlowConfig {
  visitorSpawnIntervalMultiplier: number;
  visitorBaseQualityBonus: number;
  visitorPatienceMultiplier: number;
  departurePressureModifier: number;
  loyaltyDriftPerHour: number;
  rejectReputationDelta: number;
}

const ROSTER_FLOW_CONFIG = {
  selective_intake: {
    visitorSpawnIntervalMultiplier: 1.5,
    visitorBaseQualityBonus: 10,
    visitorPatienceMultiplier: 0.75,
    departurePressureModifier: 0,
    loyaltyDriftPerHour: 0,
    rejectReputationDelta: -2,
  },
  open_doors: {
    visitorSpawnIntervalMultiplier: 1,
    visitorBaseQualityBonus: 0,
    visitorPatienceMultiplier: 1,
    departurePressureModifier: 0,
    loyaltyDriftPerHour: 0,
    rejectReputationDelta: -1,
  },
  retention_focus: {
    visitorSpawnIntervalMultiplier: 1.3,
    visitorBaseQualityBonus: 0,
    visitorPatienceMultiplier: 1,
    departurePressureModifier: -10,
    loyaltyDriftPerHour: 0.08,
    rejectReputationDelta: -1,
  },
} as const satisfies Record<RosterFlowOption, RosterFlowConfig>;

export interface AutonomyThresholdConfig {
  refusalRiskMoraleFloor: number;
  quitRiskMoraleFloor: number;
  retentionRiskLoyaltyFloor: number;
}

export const DEFAULT_AUTONOMY_THRESHOLDS: AutonomyThresholdConfig = {
  refusalRiskMoraleFloor: 30,
  quitRiskMoraleFloor: 15,
  retentionRiskLoyaltyFloor: 25,
};

export function normalizePolicyState(value?: Partial<PolicyState> | null): PolicyState {
  return {
    contractPosture:
      value?.contractPosture && isValidPolicyValue("contractPosture", value.contractPosture)
        ? value.contractPosture
        : DEFAULT_POLICY_STATE.contractPosture,
    objectiveBias:
      value?.objectiveBias && isValidPolicyValue("objectiveBias", value.objectiveBias)
        ? value.objectiveBias
        : DEFAULT_POLICY_STATE.objectiveBias,
    recoveryTriage:
      value?.recoveryTriage && isValidPolicyValue("recoveryTriage", value.recoveryTriage)
        ? value.recoveryTriage
        : DEFAULT_POLICY_STATE.recoveryTriage,
    staffingPriority:
      value?.staffingPriority && isValidPolicyValue("staffingPriority", value.staffingPriority)
        ? value.staffingPriority
        : DEFAULT_POLICY_STATE.staffingPriority,
    rosterFlow:
      value?.rosterFlow && isValidPolicyValue("rosterFlow", value.rosterFlow)
        ? value.rosterFlow
        : DEFAULT_POLICY_STATE.rosterFlow,
  };
}

export function isPolicyId(value: string): value is PolicyId {
  return value in POLICY_OPTION_MAP;
}

export function isValidPolicyValue<P extends PolicyId>(
  policyId: P,
  value: string,
): value is PolicyState[P] {
  return (POLICY_OPTION_MAP[policyId] as readonly string[]).includes(value);
}

export function getPolicyLabel(policyId: PolicyId): string {
  return POLICY_METADATA[policyId].label;
}

export function getPolicyQuestion(policyId: PolicyId): string {
  return POLICY_METADATA[policyId].question;
}

export function getPolicyOptions<P extends PolicyId>(policyId: P): readonly PolicyState[P][] {
  return POLICY_OPTION_MAP[policyId] as readonly PolicyState[P][];
}

export function getPolicyOptionLabel<P extends PolicyId>(
  policyId: P,
  value: PolicyState[P],
): string {
  return POLICY_METADATA[policyId].options[value].label;
}

export function getPolicyOptionExplanation<P extends PolicyId>(
  policyId: P,
  value: PolicyState[P],
): string {
  return POLICY_METADATA[policyId].options[value].explanation;
}

export function getPolicyOptionTradeoff<P extends PolicyId>(
  policyId: P,
  value: PolicyState[P],
): string {
  return POLICY_METADATA[policyId].options[value].tradeoff;
}

export function getPolicyMetadata<P extends PolicyId>(policyId: P) {
  return POLICY_METADATA[policyId];
}

export function getPolicyFactorMetadata(tag: string): PolicyFactorMetadata | null {
  const [prefix, factorId, rawValue] = tag.split(":");
  if (prefix !== "policy" || !factorId || !rawValue) {
    return null;
  }

  const policyId = POLICY_FACTOR_TAG_MAP[factorId];
  if (!policyId || !isValidPolicyValue(policyId, rawValue)) {
    return null;
  }

  return {
    policyId,
    policyLabel: getPolicyLabel(policyId),
    optionLabel: getPolicyOptionLabel(policyId, rawValue),
    explanation: getPolicyOptionExplanation(policyId, rawValue),
    tradeoff: getPolicyOptionTradeoff(policyId, rawValue),
  };
}

export function getPolicyChangeAvailability(
  policyId: PolicyId,
  contractLifecycle: PolicyContractLifecycle | null | undefined,
): { disabled: boolean; reason: string | null } {
  const lifecycle = contractLifecycle ?? "bidding";
  if (policyId === "objectiveBias" && lifecycle === "active") {
    return {
      disabled: true,
      reason: OBJECTIVE_BIAS_ACTIVE_CONTRACT_REASON,
    };
  }

  return {
    disabled: false,
    reason: null,
  };
}

export function canChangePolicy(
  policyId: PolicyId,
  contractLifecycle: PolicyContractLifecycle | null | undefined,
): boolean {
  return !getPolicyChangeAvailability(policyId, contractLifecycle).disabled;
}

export function getContractPostureConfig(
  policyState?: Partial<PolicyState> | null,
): ContractPostureConfig {
  return CONTRACT_POSTURE_CONFIG[
    policyState?.contractPosture ?? DEFAULT_POLICY_STATE.contractPosture
  ];
}

export function getObjectiveBiasConfig(
  policyState?: Partial<PolicyState> | null,
): ObjectiveBiasConfig {
  return OBJECTIVE_BIAS_CONFIG[policyState?.objectiveBias ?? DEFAULT_POLICY_STATE.objectiveBias];
}

export function getRecoveryTriageConfig(
  policyState?: Partial<PolicyState> | null,
): RecoveryTriageConfig {
  return RECOVERY_TRIAGE_CONFIG[policyState?.recoveryTriage ?? DEFAULT_POLICY_STATE.recoveryTriage];
}

export function getStaffingPriorityConfig(
  policyState?: Partial<PolicyState> | null,
): StaffingPriorityConfig {
  return STAFFING_PRIORITY_CONFIG[
    policyState?.staffingPriority ?? DEFAULT_POLICY_STATE.staffingPriority
  ];
}

export function getRosterFlowConfig(policyState?: Partial<PolicyState> | null): RosterFlowConfig {
  return ROSTER_FLOW_CONFIG[policyState?.rosterFlow ?? DEFAULT_POLICY_STATE.rosterFlow];
}

export function getAutonomyThresholdsForPolicies(
  policyState?: Partial<PolicyState> | null,
): AutonomyThresholdConfig {
  const posture = getContractPostureConfig(policyState);
  return {
    ...DEFAULT_AUTONOMY_THRESHOLDS,
    refusalRiskMoraleFloor: posture.refusalRiskMoraleFloor,
  };
}

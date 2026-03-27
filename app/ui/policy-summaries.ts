import {
  getPolicyOptionExplanation,
  getPolicyOptionLabel,
  getPolicyOptionTradeoff,
  getRosterFlowConfig,
  type PolicyState,
} from "lib/policies";

import type { OperatorViewModel } from "./view-models";

export interface RecoveryStateSummary {
  statusLabel: string;
  reason: string;
  policyLines: readonly string[];
}

export interface PolicySurfaceSummary {
  label: string;
  summary: string;
  details: readonly string[];
}

export function getStaffingPrioritySurfaceSummary(
  staffingPriority: PolicyState["staffingPriority"],
): PolicySurfaceSummary {
  switch (staffingPriority) {
    case "operations_focus":
      return {
        label: getPolicyOptionLabel("staffingPriority", staffingPriority),
        summary: "Daily Routine is pushing output over recovery and social time.",
        details: [
          "Operators spend more time working and less time cooling off.",
          "Morale pressure climbs faster when the roster stays busy.",
        ],
      };
    case "welfare_priority":
      return {
        label: getPolicyOptionLabel("staffingPriority", staffingPriority),
        summary: "Daily Routine is protecting rest, social time, and morale.",
        details: [
          "Operators get more breathing room between duties.",
          "Output slows down, but the roster stabilizes more easily.",
        ],
      };
    default:
      return {
        label: getPolicyOptionLabel("staffingPriority", staffingPriority),
        summary: "Daily Routine is staying near the default balance.",
        details: [
          "Operators split time between work, rest, and social time.",
          "No extra morale push or extra output pressure is in effect.",
        ],
      };
  }
}

export function getRosterFlowSurfaceSummary(
  rosterFlow: PolicyState["rosterFlow"],
): PolicySurfaceSummary & { rejectReputationDelta: number } {
  const config = getRosterFlowConfig({ rosterFlow });

  switch (rosterFlow) {
    case "selective_intake":
      return {
        label: getPolicyOptionLabel("rosterFlow", rosterFlow),
        summary: "Recruitment is slower, prospects are stronger, and they expect faster decisions.",
        details: [
          "Visitor volume is lower than usual.",
          "Visitor quality is higher than usual.",
          "Visitor patience is shorter than usual.",
          "Departure pressure is unchanged.",
        ],
        rejectReputationDelta: config.rejectReputationDelta,
      };
    case "retention_focus":
      return {
        label: getPolicyOptionLabel("rosterFlow", rosterFlow),
        summary:
          "Recruitment slows down so the guild can spend more effort keeping current operators.",
        details: [
          "Visitor volume is lower than usual.",
          "Visitor quality stays near the default.",
          "Visitor patience stays near the default.",
          "Departure pressure is reduced for low-loyalty operators.",
        ],
        rejectReputationDelta: config.rejectReputationDelta,
      };
    default:
      return {
        label: getPolicyOptionLabel("rosterFlow", rosterFlow),
        summary: "Recruitment is running at the default pace with average-quality walk-ins.",
        details: [
          "Visitor volume is steady.",
          "Visitor quality is average.",
          "Visitor patience is standard.",
          "Departure pressure is unchanged.",
        ],
        rejectReputationDelta: config.rejectReputationDelta,
      };
  }
}

export function getRetentionPressureLine(
  rosterFlow: PolicyState["rosterFlow"],
  lifecycleStatus: OperatorViewModel["lifecycle"]["status"],
): string {
  if (rosterFlow === "retention_focus") {
    return lifecycleStatus === "departed"
      ? "Retention Focus was active, but loyalty still collapsed hard enough to lose them."
      : "Retention Focus is reducing departure pressure, but low loyalty is still dangerous.";
  }

  if (rosterFlow === "selective_intake") {
    return "Selective Intake improves incoming quality, but it does not soften departure pressure.";
  }

  return "Open Doors keeps recruitment steady, but it does not reduce departure pressure.";
}

export function getRecoveryStateSummary(
  operator: Pick<
    OperatorViewModel,
    | "assignmentKind"
    | "injurySeverity"
    | "injuryRecoveryHours"
    | "needFatigue"
    | "needStress"
    | "lifecycle"
  >,
  policies: Pick<PolicyState, "recoveryTriage" | "staffingPriority">,
): RecoveryStateSummary | null {
  if (operator.lifecycle.status !== "active") {
    return null;
  }

  if (operator.assignmentKind !== "recovery" && operator.injurySeverity <= 0) {
    return null;
  }

  let reason = "They are off the field to stabilize before the next deployment.";
  if (operator.injurySeverity > 0) {
    reason = `They are carrying injury severity ${Math.round(operator.injurySeverity)} and need about ${Math.ceil(operator.injuryRecoveryHours)} more in-game hours before that injury clears.`;
  } else if (operator.needFatigue >= 70 && operator.needStress >= 50) {
    reason = `They were pulled back because fatigue ${Math.round(operator.needFatigue)} and stress ${Math.round(operator.needStress)} are both high.`;
  } else if (operator.needFatigue >= 70) {
    reason = `They were pulled back because fatigue ${Math.round(operator.needFatigue)} is too high for safe field work.`;
  } else if (operator.needStress >= 50) {
    reason = `They were pulled back because stress ${Math.round(operator.needStress)} is still elevated.`;
  } else if (operator.assignmentKind === "recovery") {
    reason = "They are currently assigned to recovery time instead of room duty or raid work.";
  }

  const policyLines = [
    `Recovery Standards: ${getPolicyOptionLabel("recoveryTriage", policies.recoveryTriage)}. ${getPolicyOptionExplanation("recoveryTriage", policies.recoveryTriage)}`,
  ];

  if (policies.staffingPriority !== "balanced_schedule") {
    policyLines.push(
      `Daily Routine: ${getPolicyOptionLabel("staffingPriority", policies.staffingPriority)}. ${getPolicyOptionTradeoff("staffingPriority", policies.staffingPriority)}`,
    );
  }

  return {
    statusLabel: operator.assignmentKind === "recovery" ? "Recovering" : "Injured",
    reason,
    policyLines,
  };
}

/**
 * Incident System - sim system that evaluates incident triggers each tick.
 */

import { GuildState, MoraleState, OperatorIdentity } from "../components";
import { getCurrentAbsoluteMinute } from "./commands";
import type { SimSystem, SimSystemContext } from "./types";
import {
  shouldEvaluateIncidents,
  selectIncidentCandidate,
  createIncidentInterruptionPayload,
  INCIDENT_TEMPLATES,
} from "./incidents";
import { enqueueInterruption, hasBlockingInterruption } from "./interruptions";

const OPENING_INCIDENT_GATE_BEAT_ID = "guidance/opening/first-raid-flow";

export const advanceIncidentSystem: SimSystem = (context, deltaMs) => {
  // Skip incident evaluation during zero-delta initialization ticks
  if (deltaMs <= 0) return;

  const { incidentState, interruptionQueue } = context.runtimeState;
  const currentMinute = getCurrentAbsoluteMinute(context);

  // Don't evaluate if there's already a blocking interruption or the world is frozen
  if (hasBlockingInterruption(interruptionQueue)) return;
  if (context.runtimeState.worldTimeFrozen) return;
  if (
    context.runtimeState.guidanceState.openingPathState === "active" &&
    !context.runtimeState.guidanceState.completedBeatIds.includes(OPENING_INCIDENT_GATE_BEAT_ID)
  ) {
    return;
  }
  if (!shouldEvaluateIncidents(incidentState, currentMinute)) return;

  // Initialize lastEvaluationMinute on first real evaluation to prevent immediate trigger
  if (incidentState.lastEvaluationMinute === 0) {
    incidentState.lastEvaluationMinute = currentMinute;
    return;
  }

  incidentState.lastEvaluationMinute = currentMinute;

  // Compute simplified pressure from guild state
  const pressure = computeSimplifiedPressure(context);

  const candidate = selectIncidentCandidate(context, incidentState, currentMinute, pressure);
  if (!candidate) return;

  // Store as pending
  incidentState.pendingIncident = candidate;

  // Build operator name map for briefing
  const operatorNames: Record<string, string> = {};
  for (const entity of context.runtimeState.operatorEntities) {
    operatorNames[OperatorIdentity.id[entity]] = OperatorIdentity.name[entity];
  }

  // Find the template
  const template = INCIDENT_TEMPLATES.find((t) => t.id === candidate.templateId);
  if (!template) return;

  // Create interruption payload
  const payload = createIncidentInterruptionPayload(candidate, template, operatorNames);

  // Enqueue as blocking interruption
  enqueueInterruption(interruptionQueue, "incident", payload, "incident-system", currentMinute);
};

function computeSimplifiedPressure(context: SimSystemContext): number {
  const guild = context.singletonEntities.guild;
  const treasury = GuildState.treasury[guild];
  const reputation = GuildState.reputation[guild];

  // Low treasury = high pressure
  const treasuryPressure = Math.max(0, 60 - Math.min(60, treasury / 10));
  // Low reputation = moderate pressure
  const reputationPressure = Math.max(0, 30 - Math.min(30, reputation / 3));

  // Active operator morale pressure — low average morale raises pressure
  let moraleSum = 0;
  let operatorCount = 0;
  for (const entity of context.runtimeState.operatorEntities) {
    if (OperatorIdentity.lifecycleStatus[entity] !== "active") continue;
    moraleSum += MoraleState.current[entity];
    operatorCount++;
  }
  const moralePressure = operatorCount > 0 ? Math.max(0, 30 - moraleSum / operatorCount) : 0;

  return Math.min(100, treasuryPressure + reputationPressure + moralePressure + 20);
}

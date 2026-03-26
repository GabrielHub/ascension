/**
 * Interactive Pressure Incidents
 *
 * ECS-owned interactive incidents that turn passive pressure into
 * concrete stop-the-game decisions, bind to real runtime subjects,
 * resolve deterministic consequences, and use the interruption framework.
 */

import type { SimSystemContext } from "./types";
import {
  type IncidentPayload,
  type IncidentBoundContext,
  type IncidentChoiceView,
  type RaidBossCommitmentPayload,
} from "./interruptions";
import {
  GuildState,
  MoraleState,
  LoyaltyState,
  OperatorIdentity,
  WorldTimeState,
} from "../components";
import { getCurrentAbsoluteMinute, pushRuntimeEvent } from "./commands";
import { SeededRng, seedFromKey, weightedChoice, type WeightedItem } from "../uncertainty";

// ── Incident template schema ─────────────────────────────────────────────

export type IncidentTriggerFamily =
  | "operator_conflict"
  | "grief_fallout"
  | "injury_setback"
  | "rival_poaching"
  | "contract_pressure"
  | "room_breakdown"
  | "compliance_pressure"
  | "morale_opportunity"
  | "raid_boss_commitment";

export type ConsequenceKind =
  | "morale_delta"
  | "loyalty_delta"
  | "treasury_delta"
  | "reputation_delta"
  | "intel_delta"
  | "team_cohesion_delta"
  | "injury_progression"
  | "departure_risk"
  | "contract_pressure_delta";

export interface ConsequenceEffect {
  kind: ConsequenceKind;
  targetRef: "subject_a" | "subject_b" | "guild" | "team" | "room";
  value: number;
}

export interface IncidentChoice {
  choiceId: string;
  label: string;
  description: string;
  consequenceSummary: string;
  requirements?: readonly string[];
  effects: readonly ConsequenceEffect[];
}

export interface IncidentTemplate {
  id: string;
  name: string;
  category: string;
  tags: readonly string[];
  weight: number;
  triggerFamily: IncidentTriggerFamily;
  pressureTags: readonly string[];
  pressureThreshold: number;
  requiredContext: readonly string[];
  cooldownMinutes: number;
  noveltyWeight: number;
  briefingTemplate: string;
  choices: readonly IncidentChoice[];
}

// ── Incident runtime state ───────────────────────────────────────────────

export interface PendingIncident {
  instanceId: string;
  templateId: string;
  triggerFamily: IncidentTriggerFamily;
  boundContext: IncidentBoundContext;
  choices: readonly IncidentChoice[];
  createdAtMinute: number;
}

export interface IncidentHistoryEntry {
  templateId: string;
  triggerFamily: IncidentTriggerFamily;
  resolvedAtMinute: number;
  choiceId: string;
}

export interface IncidentState {
  pendingIncident: PendingIncident | null;
  history: IncidentHistoryEntry[];
  cooldowns: Record<string, number>;
  nextInstanceId: number;
  lastEvaluationMinute: number;
}

export function createIncidentState(): IncidentState {
  return {
    pendingIncident: null,
    history: [],
    cooldowns: {},
    nextInstanceId: 1,
    lastEvaluationMinute: 0,
  };
}

// ── Authored incident library ────────────────────────────────────────────

export const INCIDENT_TEMPLATES: readonly IncidentTemplate[] = [
  {
    id: "incident/personnel-friction",
    name: "Personnel Friction Report",
    category: "personnel_conflict",
    tags: ["conflict", "morale"],
    weight: 30,
    triggerFamily: "operator_conflict",
    pressureTags: ["pressure:morale", "pressure:social"],
    pressureThreshold: 40,
    requiredContext: ["operator_a", "operator_b"],
    cooldownMinutes: 480,
    noveltyWeight: 1.2,
    briefingTemplate:
      "A documented incident between {operator_a} and {operator_b} requires your intervention. The situation is affecting team readiness.",
    choices: [
      {
        choiceId: "mediate",
        label: "Mediate Directly",
        description: "Sit both operators down and work through the friction point.",
        consequenceSummary: "Minor morale boost for both, slight loyalty increase.",
        effects: [
          { kind: "morale_delta", targetRef: "subject_a", value: 5 },
          { kind: "morale_delta", targetRef: "subject_b", value: 5 },
          { kind: "loyalty_delta", targetRef: "subject_a", value: 3 },
          { kind: "loyalty_delta", targetRef: "subject_b", value: 3 },
        ],
      },
      {
        choiceId: "side_with_a",
        label: "Back the Senior Operator",
        description: "Support the more experienced party to maintain chain of command.",
        consequenceSummary: "Loyalty boost for one, morale hit for the other.",
        effects: [
          { kind: "loyalty_delta", targetRef: "subject_a", value: 8 },
          { kind: "morale_delta", targetRef: "subject_b", value: -6 },
        ],
      },
      {
        choiceId: "ignore",
        label: "File and Move On",
        description: "Document the incident and let them sort it out.",
        consequenceSummary: "No immediate cost, but unresolved tension persists.",
        effects: [
          { kind: "morale_delta", targetRef: "subject_a", value: -2 },
          { kind: "morale_delta", targetRef: "subject_b", value: -2 },
        ],
      },
    ],
  },
  {
    id: "incident/injury-complication",
    name: "Recovery Complication Notice",
    category: "injury_setback",
    tags: ["injury", "medical"],
    weight: 25,
    triggerFamily: "injury_setback",
    pressureTags: ["pressure:medical", "pressure:roster"],
    pressureThreshold: 30,
    requiredContext: ["operator_a"],
    cooldownMinutes: 720,
    noveltyWeight: 1.0,
    briefingTemplate:
      "{operator_a}'s recovery has hit a complication. The medical team needs direction.",
    choices: [
      {
        choiceId: "extended_rest",
        label: "Authorize Extended Rest",
        description: "Pull the operator from all duties until fully recovered.",
        consequenceSummary: "Slower return to duty, but reduced reinjury risk.",
        effects: [
          { kind: "morale_delta", targetRef: "subject_a", value: 4 },
          { kind: "loyalty_delta", targetRef: "subject_a", value: 5 },
        ],
      },
      {
        choiceId: "push_through",
        label: "Push Through Recovery",
        description: "Keep them on light duty. Time is a resource.",
        consequenceSummary: "Faster return, but morale and loyalty hit.",
        effects: [
          { kind: "morale_delta", targetRef: "subject_a", value: -5 },
          { kind: "loyalty_delta", targetRef: "subject_a", value: -3 },
          { kind: "injury_progression", targetRef: "subject_a", value: 10 },
        ],
      },
    ],
  },
  {
    id: "incident/rival-recruitment-offer",
    name: "External Recruitment Offer",
    category: "rival_poaching",
    tags: ["rival", "retention", "loyalty"],
    weight: 20,
    triggerFamily: "rival_poaching",
    pressureTags: ["pressure:retention", "pressure:economy"],
    pressureThreshold: 50,
    requiredContext: ["operator_a"],
    cooldownMinutes: 960,
    noveltyWeight: 1.3,
    briefingTemplate:
      "A competing guild has approached {operator_a} with a better offer. They haven't committed yet.",
    choices: [
      {
        choiceId: "counter_offer",
        label: "Make a Counter-Offer",
        description: "Match or beat the rival offer with a cash bonus.",
        consequenceSummary: "Costs treasury, but secures loyalty.",
        effects: [
          { kind: "treasury_delta", targetRef: "guild", value: -150 },
          { kind: "loyalty_delta", targetRef: "subject_a", value: 12 },
          { kind: "morale_delta", targetRef: "subject_a", value: 5 },
        ],
      },
      {
        choiceId: "appeal_to_mission",
        label: "Appeal to Mission",
        description: "Remind them why they joined. It's about the work.",
        consequenceSummary: "Free but risky. Works better with high existing loyalty.",
        effects: [
          { kind: "loyalty_delta", targetRef: "subject_a", value: 4 },
          { kind: "morale_delta", targetRef: "subject_a", value: 3 },
        ],
      },
      {
        choiceId: "let_go",
        label: "Wish Them Well",
        description: "Accept the loss. Focus resources elsewhere.",
        consequenceSummary: "Operator departure risk increases sharply.",
        effects: [
          { kind: "departure_risk", targetRef: "subject_a", value: 40 },
          { kind: "reputation_delta", targetRef: "guild", value: -3 },
        ],
      },
    ],
  },
  {
    id: "incident/contract-deadline-warning",
    name: "Contract Deadline Warning",
    category: "contract_deadline",
    tags: ["contract", "deadline", "pressure"],
    weight: 35,
    triggerFamily: "contract_pressure",
    pressureTags: ["pressure:contract", "pressure:deadline"],
    pressureThreshold: 60,
    requiredContext: [],
    cooldownMinutes: 1440,
    noveltyWeight: 0.8,
    briefingTemplate:
      "The current clearance contract is approaching its deadline. The client is getting impatient.",
    choices: [
      {
        choiceId: "push_harder",
        label: "Push Harder",
        description: "Increase raid tempo. Accept higher risk for faster progress.",
        consequenceSummary: "Contract pressure decreases, but team stress increases.",
        effects: [
          { kind: "contract_pressure_delta", targetRef: "guild", value: -15 },
          { kind: "morale_delta", targetRef: "subject_a", value: -4 },
        ],
      },
      {
        choiceId: "negotiate_extension",
        label: "Negotiate Extension",
        description: "Spend reputation to buy more time.",
        consequenceSummary: "More time, but reputation cost.",
        effects: [
          { kind: "reputation_delta", targetRef: "guild", value: -5 },
          { kind: "contract_pressure_delta", targetRef: "guild", value: -25 },
        ],
      },
      {
        choiceId: "accept_risk",
        label: "Maintain Pace",
        description: "Stay the course. The team knows the deadline.",
        consequenceSummary: "No change. Pressure continues building.",
        effects: [],
      },
    ],
  },
  {
    id: "incident/morale-windfall",
    name: "Morale Windfall",
    category: "morale_surge",
    tags: ["morale", "opportunity", "positive"],
    weight: 15,
    triggerFamily: "morale_opportunity",
    pressureTags: ["pressure:low"],
    pressureThreshold: 20,
    requiredContext: [],
    cooldownMinutes: 1440,
    noveltyWeight: 1.5,
    briefingTemplate:
      "A recent success has the team in good spirits. How do you capitalize on the momentum?",
    choices: [
      {
        choiceId: "celebrate",
        label: "Authorize Celebration",
        description: "Spend some treasury on a team event.",
        consequenceSummary: "Morale boost for everyone, minor treasury cost.",
        effects: [
          { kind: "treasury_delta", targetRef: "guild", value: -50 },
          { kind: "morale_delta", targetRef: "subject_a", value: 8 },
          { kind: "team_cohesion_delta", targetRef: "team", value: 5 },
        ],
      },
      {
        choiceId: "invest",
        label: "Invest in Training",
        description: "Channel the energy into productive improvement.",
        consequenceSummary: "Moderate morale boost, reputation gain.",
        effects: [
          { kind: "morale_delta", targetRef: "subject_a", value: 4 },
          { kind: "reputation_delta", targetRef: "guild", value: 3 },
        ],
      },
      {
        choiceId: "stay_focused",
        label: "Keep Focus",
        description: "Acknowledge the win and move on. There's work to do.",
        consequenceSummary: "No cost, no bonus. Professional.",
        effects: [{ kind: "loyalty_delta", targetRef: "subject_a", value: 2 }],
      },
    ],
  },
  {
    id: "incident/room-tension-spike",
    name: "Room Culture Incident",
    category: "room_tension",
    tags: ["room", "culture", "tension"],
    weight: 22,
    triggerFamily: "room_breakdown",
    pressureTags: ["pressure:social", "pressure:room"],
    pressureThreshold: 45,
    requiredContext: ["room"],
    cooldownMinutes: 720,
    noveltyWeight: 1.1,
    briefingTemplate:
      "Tension in the break room has escalated to the point where staff are avoiding it. Something needs to happen.",
    choices: [
      {
        choiceId: "intervene",
        label: "Direct Intervention",
        description: "Personally address the situation and set expectations.",
        consequenceSummary: "Tension drops, but takes management time.",
        effects: [
          { kind: "morale_delta", targetRef: "subject_a", value: 6 },
          { kind: "team_cohesion_delta", targetRef: "team", value: 3 },
        ],
      },
      {
        choiceId: "reassign",
        label: "Shuffle Assignments",
        description: "Move people around to break up the tension cluster.",
        consequenceSummary: "Tension addressed, but some disruption.",
        effects: [
          { kind: "morale_delta", targetRef: "subject_a", value: 2 },
          { kind: "morale_delta", targetRef: "subject_b", value: -3 },
        ],
      },
    ],
  },
  {
    id: "incident/compliance-audit",
    name: "Compliance Review Notice",
    category: "regulatory_scrutiny",
    tags: ["compliance", "regulatory", "institutional"],
    weight: 18,
    triggerFamily: "compliance_pressure",
    pressureTags: ["pressure:regulatory"],
    pressureThreshold: 55,
    requiredContext: [],
    cooldownMinutes: 2880,
    noveltyWeight: 0.9,
    briefingTemplate:
      "A regulatory review has been scheduled. The guild's operational documentation needs to be in order.",
    choices: [
      {
        choiceId: "full_compliance",
        label: "Full Compliance Push",
        description: "Divert staff to ensure everything is spotless.",
        consequenceSummary: "Treasury cost, but reputation boost and pressure relief.",
        effects: [
          { kind: "treasury_delta", targetRef: "guild", value: -100 },
          { kind: "reputation_delta", targetRef: "guild", value: 5 },
          { kind: "contract_pressure_delta", targetRef: "guild", value: -10 },
        ],
      },
      {
        choiceId: "minimal_effort",
        label: "Do the Minimum",
        description: "Meet requirements without going above and beyond.",
        consequenceSummary: "Low cost, but risk of follow-up scrutiny.",
        effects: [
          { kind: "treasury_delta", targetRef: "guild", value: -25 },
          { kind: "reputation_delta", targetRef: "guild", value: -2 },
        ],
      },
    ],
  },
];

// ── Incident evaluation and binding ──────────────────────────────────────

const EVALUATION_INTERVAL_MINUTES = 120;

export function shouldEvaluateIncidents(state: IncidentState, currentMinute: number): boolean {
  if (state.pendingIncident !== null) return false;
  return currentMinute - state.lastEvaluationMinute >= EVALUATION_INTERVAL_MINUTES;
}

export function isIncidentOnCooldown(
  state: IncidentState,
  template: IncidentTemplate,
  currentMinute: number,
): boolean {
  const lastUsed = state.cooldowns[template.id];
  if (lastUsed === undefined) return false;
  return currentMinute - lastUsed < template.cooldownMinutes;
}

export function selectIncidentCandidate(
  context: SimSystemContext,
  state: IncidentState,
  currentMinute: number,
  pressure: number,
): PendingIncident | null {
  const eligible = INCIDENT_TEMPLATES.filter((template) => {
    if (pressure < template.pressureThreshold) return false;
    if (isIncidentOnCooldown(state, template, currentMinute)) return false;
    // Check recency suppression
    const recentCount = state.history.filter(
      (h) => h.triggerFamily === template.triggerFamily && currentMinute - h.resolvedAtMinute < 480,
    ).length;
    if (recentCount >= 2) return false;
    return true;
  });

  if (eligible.length === 0) return null;

  const rng = new SeededRng(seedFromKey(`incident:${currentMinute}`));
  const weighted: WeightedItem<IncidentTemplate>[] = eligible.map((t) => ({
    item: t,
    weight: t.weight * t.noveltyWeight,
  }));

  const result = weightedChoice(rng, weighted);
  const template = result.outcome;

  // Bind concrete subjects
  const boundContext = bindIncidentSubjects(context, template);

  const incident: PendingIncident = {
    instanceId: `incident-${state.nextInstanceId++}`,
    templateId: template.id,
    triggerFamily: template.triggerFamily,
    boundContext,
    choices: template.choices,
    createdAtMinute: currentMinute,
  };

  return incident;
}

function bindIncidentSubjects(
  context: SimSystemContext,
  template: IncidentTemplate,
): IncidentBoundContext {
  const operatorIds: string[] = [];
  const activeOperators = context.runtimeState.operatorEntities.filter(
    (e) => OperatorIdentity.lifecycleStatus[e] === "active",
  );

  if (template.requiredContext.includes("operator_a") && activeOperators.length > 0) {
    // Pick the operator with lowest morale for conflict/negative incidents
    const rng = new SeededRng(
      seedFromKey(`bind:${template.id}:${context.runtimeState.nextOperatorSequence}`),
    );
    const idx = rng.int(0, activeOperators.length - 1);
    operatorIds.push(OperatorIdentity.id[activeOperators[idx]]);
  }
  if (template.requiredContext.includes("operator_b") && activeOperators.length > 1) {
    const rng = new SeededRng(
      seedFromKey(`bind-b:${template.id}:${context.runtimeState.nextOperatorSequence}`),
    );
    let idx = rng.int(0, activeOperators.length - 1);
    const firstId = operatorIds[0];
    while (OperatorIdentity.id[activeOperators[idx]] === firstId && activeOperators.length > 1) {
      idx = (idx + 1) % activeOperators.length;
    }
    operatorIds.push(OperatorIdentity.id[activeOperators[idx]]);
  }

  return {
    operatorIds,
    roomId: undefined,
    teamId: undefined,
    contractSiteId: undefined,
    bossId: undefined,
  };
}

// ── Incident resolution ──────────────────────────────────────────────────

export function resolveIncident(
  context: SimSystemContext,
  state: IncidentState,
  choiceId: string,
): boolean {
  if (!state.pendingIncident) return false;

  const incident = state.pendingIncident;
  const choice = incident.choices.find((c) => c.choiceId === choiceId);
  if (!choice) return false;

  // Apply consequence effects
  for (const effect of choice.effects) {
    applyConsequenceEffect(context, incident, effect);
  }

  // Record history
  state.history.push({
    templateId: incident.templateId,
    triggerFamily: incident.triggerFamily,
    resolvedAtMinute: getCurrentAbsoluteMinute(context),
    choiceId,
  });

  // Set cooldown
  const template = INCIDENT_TEMPLATES.find((t) => t.id === incident.templateId);
  if (template) {
    state.cooldowns[template.id] = getCurrentAbsoluteMinute(context);
  }

  // Emit event
  pushRuntimeEvent(context, {
    kind: "incident_resolved",
    message: `Incident resolved: ${choice.label}`,
    timestamp: `Day ${WorldTimeState.day[context.singletonEntities.time]}`,
    accent: "info",
  });

  state.pendingIncident = null;
  return true;
}

function applyConsequenceEffect(
  context: SimSystemContext,
  incident: PendingIncident,
  effect: ConsequenceEffect,
): void {
  switch (effect.kind) {
    case "morale_delta": {
      const targetId = resolveEffectTarget(incident, effect.targetRef);
      if (targetId) {
        const entity = context.runtimeState.operatorEntities.find(
          (e) => OperatorIdentity.id[e] === targetId,
        );
        if (entity !== undefined) {
          MoraleState.current[entity] = Math.max(
            0,
            Math.min(100, MoraleState.current[entity] + effect.value),
          );
        }
      }
      break;
    }
    case "loyalty_delta": {
      const targetId = resolveEffectTarget(incident, effect.targetRef);
      if (targetId) {
        const entity = context.runtimeState.operatorEntities.find(
          (e) => OperatorIdentity.id[e] === targetId,
        );
        if (entity !== undefined) {
          LoyaltyState.current[entity] = Math.max(
            0,
            Math.min(100, LoyaltyState.current[entity] + effect.value),
          );
        }
      }
      break;
    }
    case "treasury_delta": {
      GuildState.treasury[context.singletonEntities.guild] += effect.value;
      break;
    }
    case "reputation_delta": {
      GuildState.reputation[context.singletonEntities.guild] = Math.max(
        0,
        GuildState.reputation[context.singletonEntities.guild] + effect.value,
      );
      break;
    }
    case "intel_delta": {
      GuildState.intel[context.singletonEntities.guild] = Math.max(
        0,
        GuildState.intel[context.singletonEntities.guild] + effect.value,
      );
      break;
    }
    default:
      // team_cohesion_delta, injury_progression, departure_risk, contract_pressure_delta
      // These are tracked but have no immediate ECS effect in the first implementation
      break;
  }
}

function resolveEffectTarget(incident: PendingIncident, targetRef: string): string | undefined {
  if (targetRef === "subject_a") return incident.boundContext.operatorIds[0];
  if (targetRef === "subject_b") return incident.boundContext.operatorIds[1];
  if (targetRef === "guild") return undefined; // guild effects handled directly
  return undefined;
}

// ── Boss commitment incident ─────────────────────────────────────────────

export function createBossCommitmentPayload(
  activeRaidId: string,
  contractSiteId: string,
  missionId: string,
  teamId: string,
  operatorIds: readonly string[],
  bossId: string,
  bossName: string,
  bossRank: string,
): RaidBossCommitmentPayload {
  return {
    kind: "raid_boss_commitment",
    activeRaidId,
    contractSiteId,
    missionId,
    teamId,
    operatorIds,
    bossId,
    bossName,
    bossRank,
    stakeSummary: `Rank ${bossRank.toUpperCase()} boss encounter. ${operatorIds.length} operators committed.`,
    teamConditionSummary: "Team is in operational condition.",
  };
}

export function createIncidentInterruptionPayload(
  incident: PendingIncident,
  template: IncidentTemplate,
  operatorNames: Record<string, string>,
): IncidentPayload {
  let briefing = template.briefingTemplate;
  if (incident.boundContext.operatorIds[0]) {
    const name = operatorNames[incident.boundContext.operatorIds[0]] ?? "Unknown";
    briefing = briefing.replace("{operator_a}", name);
  }
  if (incident.boundContext.operatorIds[1]) {
    const name = operatorNames[incident.boundContext.operatorIds[1]] ?? "Unknown";
    briefing = briefing.replace("{operator_b}", name);
  }

  const choiceViews: IncidentChoiceView[] = incident.choices.map((c) => ({
    choiceId: c.choiceId,
    label: c.label,
    description: c.description,
    consequenceSummary: c.consequenceSummary,
  }));
  const subjectSummary = incident.boundContext.operatorIds
    .map((operatorId) => operatorNames[operatorId] ?? operatorId)
    .join(", ");

  return {
    kind: "incident",
    incidentInstanceId: incident.instanceId,
    templateId: incident.templateId,
    category: template.category,
    title: template.name,
    briefing,
    subjectSummary,
    choices: choiceViews,
    boundContext: incident.boundContext,
  };
}

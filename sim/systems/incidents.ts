/**
 * Interactive Pressure Incidents
 *
 * ECS-owned interactive incidents that turn passive pressure into
 * concrete stop-the-game decisions, bind to real runtime subjects,
 * resolve deterministic consequences, and use the interruption framework.
 */

import type { TemplateRegistry } from "content/templates";
import type { SimSystemContext } from "./types";
import {
  type IncidentPayload,
  type IncidentBoundContext,
  type IncidentChoiceView,
  type RaidBossCommitmentPayload,
} from "./interruptions";
import { enqueueInterruption } from "./interruptions";
import { MARA_PRESENTER_ID } from "./presenter-unlocks";
import {
  BuildingAuthority,
  GuildState,
  InjuryState,
  MoraleState,
  LoyaltyState,
  OperatorDisposition,
  OperatorIdentity,
  RecurringTeam,
  RoomInstance,
} from "../components";
import {
  BODEGA_BACK_OFFICE_TEMPLATE_ID,
  clamp,
  getCurrentAbsoluteMinute,
  hasOperationalRoomTemplate,
  pushRuntimeEvent,
} from "./commands";
import {
  applyFactionScrutinyDelta,
  applyFactionStandingDelta,
  SKYSCRAPER_COMPLIANCE_OFFICE_TEMPLATE_ID,
} from "./city-pressure";
import {
  applyRoomCultureShiftFromIncident,
  applySocialRecoveryAfterDistrictWin,
  applySocialFalloutAfterScandal,
  ensureOperatorDispositionEntity,
  findRecurringTeamForMembers,
} from "./social";
import { SeededRng, weightedChoice, type WeightedItem } from "../uncertainty";
import { seedFromSimulationKey } from "./seed-utils";

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
  | "raid_boss_commitment"
  | "district_fallout"
  | "faction_pressure"
  | "casualty_aftermath"
  | "workshop_disruption"
  | "sponsor_demand";

export type ConsequenceKind =
  | "morale_delta"
  | "loyalty_delta"
  | "treasury_delta"
  | "reputation_delta"
  | "intel_delta"
  | "team_cohesion_delta"
  | "injury_progression"
  | "departure_risk"
  | "contract_pressure_delta"
  | "faction_standing_delta"
  | "faction_scrutiny_delta";

export type ConsequenceTargetRef =
  | "subject_a"
  | "subject_b"
  | "guild"
  | "team"
  | "room"
  | `faction:${string}`;

export interface ConsequenceEffect {
  kind: ConsequenceKind;
  targetRef: ConsequenceTargetRef;
  value: number;
}

export interface IncidentChoice {
  choiceId: string;
  label: string;
  description: string;
  consequenceSummary: string;
  requirements?: readonly string[];
  requiredOperationalRoomTemplateIds?: readonly string[];
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
  requiredBuildingIds?: readonly string[];
  preferredRoomTemplateIds?: readonly string[];
  fixedFactionId?: string;
  presenterId?: string;
  presenterExpression?: string;
  choices: readonly IncidentChoice[];
}

// ── Incident runtime state ───────────────────────────────────────────────

export interface PendingIncident {
  instanceId: string;
  templateId: string;
  templateName: string;
  category: string;
  tags: readonly string[];
  triggerFamily: IncidentTriggerFamily;
  boundContext: IncidentBoundContext;
  choices: readonly IncidentChoice[];
  presenterId?: string;
  presenterExpression?: string;
  createdAtMinute: number;
}

export interface IncidentPresentationOverride {
  title?: string;
  briefing?: string;
  subjectSummary?: string;
  choices?: readonly IncidentChoiceView[];
  copySource?: "authored" | "generated";
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
  pressureModifier: number;
}

export function createIncidentState(): IncidentState {
  return {
    pendingIncident: null,
    history: [],
    cooldowns: {},
    nextInstanceId: 1,
    lastEvaluationMinute: 0,
    pressureModifier: 0,
  };
}

const OPENING_INCIDENT_LEARNED_BEAT_ID = "guidance/opening/first-incident";
const COOK_PRESENTER_ID = "presenter/cook";
const BARTENDER_PRESENTER_ID = "presenter/bartender";

export const OPENING_SAFE_INCIDENT_CATEGORIES = [
  "personnel_conflict",
  "team_friction",
  "supply_shortage",
  "morale_surge",
  "contract_opportunity",
] as const;
const OPENING_SAFE_INCIDENT_CATEGORY_SET = new Set<string>(OPENING_SAFE_INCIDENT_CATEGORIES);

const OPENING_FORCE_SEED_INCIDENT_CATEGORIES = [
  "personnel_conflict",
  "team_friction",
  "supply_shortage",
  "morale_surge",
] as const;

const SCANDAL_INCIDENT_CATEGORIES = new Set([
  "licensing_audit",
  "labor_safety",
  "regulatory_scrutiny",
  "borough_hearing",
  "district_backlash",
]);

// Selection-weight multiplier applied to scandal-category incidents when
// the Compliance Office is operational. Softens but never hides — the
// regulator still shows up, just less often.
const COMPLIANCE_OFFICE_SCANDAL_WEIGHT_MULTIPLIER = 0.55;

// Boost applied to an eligible template's weight when the skyscraper
// room referenced in preferredRoomTemplateIds is currently operational.
const PREFERRED_ROOM_WEIGHT_MULTIPLIER = 1.6;

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
    id: "incident/team-friction-brief",
    name: "Team Friction Brief",
    category: "team_friction",
    tags: ["conflict", "team", "low-stakes"],
    weight: 24,
    triggerFamily: "operator_conflict",
    pressureTags: ["pressure:social", "pressure:morale"],
    pressureThreshold: 25,
    requiredContext: ["operator_a", "operator_b"],
    cooldownMinutes: 360,
    noveltyWeight: 1.1,
    briefingTemplate:
      "{operator_a} and {operator_b} are grinding on each other after the last run. It is not a crisis yet, but it will become one if you leave it alone.",
    choices: [
      {
        choiceId: "cool_off",
        label: "Mandate a Cool-Off",
        description: "Split the pair up for the rest of the day and let the heat bleed off.",
        consequenceSummary: "Small morale recovery, no dramatic fallout.",
        effects: [
          { kind: "morale_delta", targetRef: "subject_a", value: 3 },
          { kind: "morale_delta", targetRef: "subject_b", value: 3 },
        ],
      },
      {
        choiceId: "forced_apology",
        label: "Demand an Apology",
        description: "Settle it fast and keep the room moving.",
        consequenceSummary: "One operator feels heard, the other resents the handling.",
        effects: [
          { kind: "loyalty_delta", targetRef: "subject_a", value: 4 },
          { kind: "morale_delta", targetRef: "subject_b", value: -3 },
        ],
      },
      {
        choiceId: "shrug_it_off",
        label: "Tell Them to Work It Out",
        description: "Keep management bandwidth for bigger problems.",
        consequenceSummary: "No cash cost, but the mood sours.",
        effects: [
          { kind: "morale_delta", targetRef: "subject_a", value: -2 },
          { kind: "morale_delta", targetRef: "subject_b", value: -2 },
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
    requiredContext: ["operator_a"],
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
    id: "incident/supply-pinch",
    name: "Supply Pinch",
    category: "supply_shortage",
    tags: ["supplies", "ops", "low-stakes"],
    weight: 18,
    triggerFamily: "contract_pressure",
    pressureTags: ["pressure:logistics", "pressure:economy"],
    pressureThreshold: 20,
    requiredContext: [],
    cooldownMinutes: 480,
    noveltyWeight: 1.2,
    briefingTemplate:
      "Basic field supplies are running thinner than expected. Nothing is broken yet, but you need to decide how much slack the crew gets.",
    choices: [
      {
        choiceId: "buy_restock",
        label: "Buy a Restock",
        description: "Spend cash now and keep everyone moving normally.",
        consequenceSummary: "Treasury down, pressure eased.",
        effects: [
          { kind: "treasury_delta", targetRef: "guild", value: -40 },
          { kind: "contract_pressure_delta", targetRef: "guild", value: -6 },
        ],
      },
      {
        choiceId: "ration",
        label: "Ration the Stock",
        description: "Stretch what is left until the next payout.",
        consequenceSummary: "Free now, but the crew notices.",
        effects: [
          { kind: "contract_pressure_delta", targetRef: "guild", value: -2 },
          { kind: "reputation_delta", targetRef: "guild", value: -1 },
        ],
      },
      {
        choiceId: "improvise",
        label: "Improvise Around It",
        description: "Have the team patch together workarounds from what is on hand.",
        consequenceSummary: "Low direct cost, slight intel gain from the process.",
        effects: [{ kind: "intel_delta", targetRef: "guild", value: 3 }],
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
    requiredContext: ["operator_a"],
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
    id: "incident/walk-in-contract-lead",
    name: "Walk-In Contract Lead",
    category: "contract_opportunity",
    tags: ["contract", "opportunity", "low-stakes"],
    weight: 16,
    triggerFamily: "morale_opportunity",
    pressureTags: ["pressure:low"],
    pressureThreshold: 15,
    requiredContext: [],
    cooldownMinutes: 720,
    noveltyWeight: 1.25,
    briefingTemplate:
      "A neighborhood contact has floated a small lead your way. It is not a windfall, but it could turn into the next clean job if you handle it right.",
    choices: [
      {
        choiceId: "pay_for_details",
        label: "Pay for Details",
        description: "Spend a little cash to get the full story before someone else does.",
        consequenceSummary: "Treasury down, intel up.",
        effects: [
          { kind: "treasury_delta", targetRef: "guild", value: -25 },
          { kind: "intel_delta", targetRef: "guild", value: 6 },
        ],
      },
      {
        choiceId: "take_the_meeting",
        label: "Take the Meeting",
        description: "Hear them out and work the relationship.",
        consequenceSummary: "Small reputation and intel upside.",
        effects: [
          { kind: "reputation_delta", targetRef: "guild", value: 2 },
          { kind: "intel_delta", targetRef: "guild", value: 2 },
        ],
      },
      {
        choiceId: "pass_for_now",
        label: "Pass for Now",
        description: "Keep the current workload stable.",
        consequenceSummary: "No immediate change.",
        effects: [],
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
    requiredContext: ["room", "operator_a", "operator_b"],
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
  // ── Bodega-specific incidents ──────────────────────────────────────────

  {
    id: "incident/coffee-machine-breakdown",
    name: "Coffee Machine Breakdown",
    category: "supply_shortage",
    tags: ["bodega", "supplies", "morale", "low-stakes"],
    weight: 20,
    triggerFamily: "room_breakdown",
    pressureTags: ["pressure:logistics", "pressure:morale"],
    pressureThreshold: 15,
    requiredContext: ["room", "operator_a"],
    requiredBuildingIds: ["building/bodega"],
    cooldownMinutes: 600,
    noveltyWeight: 1.3,
    briefingTemplate:
      "The coffee machine finally died. Foot traffic is already down and the operators are giving you looks. The nearest wholesale place has a refurbished unit, but it is not cheap.",
    presenterId: MARA_PRESENTER_ID,
    presenterExpression: "concerned",
    choices: [
      {
        choiceId: "buy_replacement",
        label: "Buy a Replacement",
        description: "Get a refurbished unit from the wholesale place before lunch.",
        consequenceSummary: "Treasury down, morale and reputation recovered.",
        effects: [
          { kind: "treasury_delta", targetRef: "guild", value: -65 },
          { kind: "morale_delta", targetRef: "subject_a", value: 6 },
          { kind: "reputation_delta", targetRef: "guild", value: 1 },
        ],
      },
      {
        choiceId: "bodega_coffee_run",
        label: "Send Someone for Bodega Coffee",
        description:
          "Buy drip coffee from the place around the corner until you can afford better.",
        consequenceSummary: "Small ongoing cost, morale steadied.",
        effects: [
          { kind: "treasury_delta", targetRef: "guild", value: -20 },
          { kind: "morale_delta", targetRef: "subject_a", value: 2 },
        ],
      },
      {
        choiceId: "tough_it_out",
        label: "They Can Drink Water",
        description: "The guild clears dungeons, not coffee orders.",
        consequenceSummary: "Free, but morale drops and foot traffic suffers.",
        effects: [
          { kind: "morale_delta", targetRef: "subject_a", value: -4 },
          { kind: "reputation_delta", targetRef: "guild", value: -1 },
        ],
      },
    ],
  },
  {
    id: "incident/health-inspector-visit",
    name: "Health Inspector Visit",
    category: "regulatory_scrutiny",
    tags: ["bodega", "compliance", "regulatory", "institutional"],
    weight: 18,
    triggerFamily: "compliance_pressure",
    pressureTags: ["pressure:regulatory", "pressure:reputation"],
    pressureThreshold: 30,
    requiredContext: [],
    requiredBuildingIds: ["building/bodega"],
    cooldownMinutes: 2880,
    noveltyWeight: 1.0,
    briefingTemplate:
      "A health inspector showed up unannounced. The bodega technically still has a food license and she is asking about the back room where operators eat. She has not noticed the clearance permits yet.",
    presenterId: MARA_PRESENTER_ID,
    presenterExpression: "serious",
    choices: [
      {
        choiceId: "full_tour",
        label: "Give Her the Full Tour",
        description: "Be transparent. Show the dual-use setup and hope the paperwork holds.",
        consequenceSummary: "Reputation boost if it passes, but costs time and attention.",
        effects: [
          { kind: "reputation_delta", targetRef: "guild", value: 4 },
          { kind: "treasury_delta", targetRef: "guild", value: -30 },
        ],
      },
      {
        choiceId: "redirect",
        label: "Steer Her to the Front",
        description: "Keep her in the storefront and let Aina handle the charm offensive.",
        consequenceSummary: "Passes inspection narrowly. No real cost.",
        effects: [{ kind: "reputation_delta", targetRef: "guild", value: 1 }],
      },
      {
        choiceId: "close_early",
        label: "Close Early for the Day",
        description: "Apologize, cite maintenance, and reschedule. Buy time to clean up.",
        consequenceSummary: "Loses a day of income but avoids scrutiny.",
        effects: [
          { kind: "treasury_delta", targetRef: "guild", value: -40 },
          { kind: "reputation_delta", targetRef: "guild", value: -2 },
        ],
      },
    ],
  },
  {
    id: "incident/neighborhood-complaint",
    name: "Neighborhood Noise Complaint",
    category: "room_tension",
    tags: ["bodega", "external", "noise", "community"],
    weight: 16,
    triggerFamily: "room_breakdown",
    pressureTags: ["pressure:social", "pressure:reputation"],
    pressureThreshold: 25,
    requiredContext: ["room"],
    requiredBuildingIds: ["building/bodega"],
    cooldownMinutes: 720,
    noveltyWeight: 1.2,
    briefingTemplate:
      "The upstairs tenant is at the counter again, this time with a petition. Says the operators coming and going at night are scaring the building. Three other neighbors signed it.",
    presenterId: MARA_PRESENTER_ID,
    presenterExpression: "concerned",
    choices: [
      {
        choiceId: "apologize_and_compensate",
        label: "Apologize and Offer a Gift Card",
        description: "Smooth it over with free sandwiches and a promise to keep it down.",
        consequenceSummary: "Small treasury hit, reputation protected.",
        effects: [
          { kind: "treasury_delta", targetRef: "guild", value: -35 },
          { kind: "reputation_delta", targetRef: "guild", value: 2 },
        ],
      },
      {
        choiceId: "enforce_quiet_hours",
        label: "Set Quiet Hours",
        description: "Restrict late-night operator traffic. Slows operations slightly.",
        consequenceSummary: "Reputation saved, but contract pressure up.",
        effects: [
          { kind: "reputation_delta", targetRef: "guild", value: 1 },
          { kind: "contract_pressure_delta", targetRef: "guild", value: 5 },
        ],
      },
      {
        choiceId: "ignore_petition",
        label: "Ignore the Petition",
        description: "The bodega was here first. They can call 311.",
        consequenceSummary: "No cost, but reputation hit and tension lingers.",
        effects: [{ kind: "reputation_delta", targetRef: "guild", value: -3 }],
      },
    ],
  },
  {
    id: "incident/operator-side-hustle",
    name: "Operator Side Hustle",
    category: "personnel_conflict",
    tags: ["bodega", "loyalty", "moonlighting"],
    weight: 22,
    triggerFamily: "operator_conflict",
    pressureTags: ["pressure:retention", "pressure:loyalty"],
    pressureThreshold: 35,
    requiredContext: ["operator_a"],
    requiredBuildingIds: ["building/bodega"],
    cooldownMinutes: 960,
    noveltyWeight: 1.3,
    briefingTemplate:
      "{operator_a} has been picking up freelance clearance gigs on their days off. It is technically not against policy, but they showed up to the last raid tired and unfocused.",
    presenterId: MARA_PRESENTER_ID,
    presenterExpression: "serious",
    choices: [
      {
        choiceId: "raise_pay",
        label: "Raise Their Pay",
        description: "If they need more money, give them a reason to stop looking elsewhere.",
        consequenceSummary: "Treasury down, loyalty and morale up.",
        effects: [
          { kind: "treasury_delta", targetRef: "guild", value: -80 },
          { kind: "loyalty_delta", targetRef: "subject_a", value: 10 },
          { kind: "morale_delta", targetRef: "subject_a", value: 5 },
        ],
      },
      {
        choiceId: "confront_directly",
        label: "Have the Conversation",
        description: "Tell them the guild needs them present or not at all.",
        consequenceSummary: "Loyalty test. Could go either way.",
        effects: [
          { kind: "loyalty_delta", targetRef: "subject_a", value: 3 },
          { kind: "morale_delta", targetRef: "subject_a", value: -3 },
        ],
      },
      {
        choiceId: "let_it_slide",
        label: "Look the Other Way",
        description: "Everyone hustles. Just hope it does not get worse.",
        consequenceSummary: "No confrontation, but the pattern continues.",
        effects: [{ kind: "departure_risk", targetRef: "subject_a", value: 15 }],
      },
    ],
  },
  {
    id: "incident/broken-ac-heatwave",
    name: "Heatwave with No AC",
    category: "room_tension",
    tags: ["bodega", "room", "comfort", "morale"],
    weight: 14,
    triggerFamily: "room_breakdown",
    pressureTags: ["pressure:room", "pressure:morale"],
    pressureThreshold: 20,
    requiredContext: ["room", "operator_a"],
    requiredBuildingIds: ["building/bodega"],
    cooldownMinutes: 1440,
    noveltyWeight: 1.4,
    briefingTemplate:
      "The AC is dead and it is 94 degrees outside. The dining area smells like sweat and old sandwiches. Two operators are refusing to eat in there.",
    presenterId: MARA_PRESENTER_ID,
    presenterExpression: "concerned",
    choices: [
      {
        choiceId: "emergency_repair",
        label: "Call Emergency Repair",
        description: "Pay the after-hours rate and get the AC fixed today.",
        consequenceSummary: "Treasury hit, but morale recovers fast.",
        effects: [
          { kind: "treasury_delta", targetRef: "guild", value: -90 },
          { kind: "morale_delta", targetRef: "subject_a", value: 8 },
        ],
      },
      {
        choiceId: "buy_fans",
        label: "Buy Box Fans",
        description: "Cheap, loud, and better than nothing.",
        consequenceSummary: "Small cost, partial comfort.",
        effects: [
          { kind: "treasury_delta", targetRef: "guild", value: -25 },
          { kind: "morale_delta", targetRef: "subject_a", value: 3 },
        ],
      },
      {
        choiceId: "endure",
        label: "Open the Windows",
        description: "Hope for a breeze. The city has survived worse.",
        consequenceSummary: "Free, but morale tanks.",
        effects: [{ kind: "morale_delta", targetRef: "subject_a", value: -6 }],
      },
    ],
  },
  {
    id: "incident/stray-cat-situation",
    name: "The Cat Situation",
    category: "morale_surge",
    tags: ["bodega", "morale", "community", "positive"],
    weight: 12,
    triggerFamily: "morale_opportunity",
    pressureTags: ["pressure:low"],
    pressureThreshold: 10,
    requiredContext: ["operator_a"],
    requiredBuildingIds: ["building/bodega"],
    cooldownMinutes: 2880,
    noveltyWeight: 1.6,
    briefingTemplate:
      "A stray cat has taken up residence behind the counter. The operators have named it. The neighbors are feeding it. Aina says it is technically a health code violation but nobody seems to care.",
    presenterId: MARA_PRESENTER_ID,
    presenterExpression: "amused",
    choices: [
      {
        choiceId: "keep_the_cat",
        label: "The Cat Stays",
        description: "Adopt it officially. Get it shots. The bodega has a mascot now.",
        consequenceSummary: "Small cost, morale and reputation boost.",
        effects: [
          { kind: "treasury_delta", targetRef: "guild", value: -30 },
          { kind: "morale_delta", targetRef: "subject_a", value: 10 },
          { kind: "reputation_delta", targetRef: "guild", value: 2 },
        ],
      },
      {
        choiceId: "let_it_stay_informal",
        label: "Do Not Make It Official",
        description: "Nobody asked. The cat comes and goes. So does everyone.",
        consequenceSummary: "Free morale boost, slight risk of future complaint.",
        effects: [{ kind: "morale_delta", targetRef: "subject_a", value: 6 }],
      },
      {
        choiceId: "rehome_the_cat",
        label: "Find It a Home",
        description: "Responsible, sensible, and deeply unpopular.",
        consequenceSummary: "No ongoing risk, but the team resents you for a week.",
        effects: [{ kind: "morale_delta", targetRef: "subject_a", value: -5 }],
      },
    ],
  },
  {
    id: "incident/delivery-mix-up",
    name: "Supply Delivery Mix-Up",
    category: "supply_shortage",
    tags: ["bodega", "supplies", "logistics"],
    weight: 18,
    triggerFamily: "contract_pressure",
    pressureTags: ["pressure:logistics", "pressure:economy"],
    pressureThreshold: 20,
    requiredContext: ["operator_a"],
    requiredBuildingIds: ["building/bodega"],
    cooldownMinutes: 480,
    noveltyWeight: 1.1,
    briefingTemplate:
      "The supply delivery got mixed up with the bodega's grocery order. Half the field kit is missing and there are six cases of energy drinks nobody ordered sitting in the supply closet.",
    presenterId: MARA_PRESENTER_ID,
    presenterExpression: "amused",
    choices: [
      {
        choiceId: "rush_order",
        label: "Rush a Correct Order",
        description: "Pay for expedited delivery to get the real supplies in today.",
        consequenceSummary: "Treasury down, operational readiness restored.",
        effects: [
          { kind: "treasury_delta", targetRef: "guild", value: -50 },
          { kind: "contract_pressure_delta", targetRef: "guild", value: -8 },
        ],
      },
      {
        choiceId: "sell_energy_drinks",
        label: "Sell the Energy Drinks",
        description: "Offload them to the corner store and use the cash for proper supplies.",
        consequenceSummary: "Partial recovery, creative problem-solving.",
        effects: [
          { kind: "treasury_delta", targetRef: "guild", value: 15 },
          { kind: "contract_pressure_delta", targetRef: "guild", value: -3 },
          { kind: "intel_delta", targetRef: "guild", value: 1 },
        ],
      },
      {
        choiceId: "make_do",
        label: "Improvise with What Arrived",
        description: "The operators can caffeinate and figure it out.",
        consequenceSummary: "No cost, morale boost from the absurdity, readiness takes a hit.",
        effects: [
          { kind: "morale_delta", targetRef: "subject_a", value: 3 },
          { kind: "contract_pressure_delta", targetRef: "guild", value: 4 },
        ],
      },
    ],
  },
  {
    id: "incident/former-operator-visit",
    name: "Former Operator Drops By",
    category: "personnel_conflict",
    tags: ["bodega", "retention", "loyalty", "community"],
    weight: 14,
    triggerFamily: "morale_opportunity",
    pressureTags: ["pressure:social", "pressure:morale"],
    pressureThreshold: 20,
    requiredContext: ["operator_a"],
    cooldownMinutes: 1440,
    noveltyWeight: 1.4,
    briefingTemplate:
      "Someone who used to clear sites for the guild stopped by. They are doing well — better guild, better pay, better building. {operator_a} has been quiet since the visit.",
    presenterId: MARA_PRESENTER_ID,
    presenterExpression: "concerned",
    choices: [
      {
        choiceId: "acknowledge",
        label: "Talk to Your Operator",
        description: "Check in. See where their head is at. Show you noticed.",
        consequenceSummary: "Loyalty boost from the attention.",
        effects: [
          { kind: "loyalty_delta", targetRef: "subject_a", value: 6 },
          { kind: "morale_delta", targetRef: "subject_a", value: 3 },
        ],
      },
      {
        choiceId: "team_dinner",
        label: "Buy the Team Dinner",
        description: "Remind everyone why they are here. Good food helps.",
        consequenceSummary: "Treasury down, broad morale boost.",
        effects: [
          { kind: "treasury_delta", targetRef: "guild", value: -45 },
          { kind: "morale_delta", targetRef: "subject_a", value: 7 },
          { kind: "team_cohesion_delta", targetRef: "team", value: 4 },
        ],
      },
      {
        choiceId: "say_nothing",
        label: "Let It Pass",
        description: "People visit. People leave. Focus on the work.",
        consequenceSummary: "No cost, but the mood lingers.",
        effects: [{ kind: "morale_delta", targetRef: "subject_a", value: -3 }],
      },
    ],
  },
  {
    id: "incident/deli-counter-argument",
    name: "Counter Confrontation",
    category: "personnel_conflict",
    tags: ["bodega", "conflict", "public", "recruitment"],
    weight: 20,
    triggerFamily: "operator_conflict",
    pressureTags: ["pressure:social", "pressure:reputation"],
    pressureThreshold: 30,
    requiredContext: ["operator_a", "operator_b"],
    requiredBuildingIds: ["building/bodega"],
    cooldownMinutes: 480,
    noveltyWeight: 1.15,
    briefingTemplate:
      "{operator_a} and {operator_b} got into it at the counter in front of a walk-in prospect. The visitor left. Aina is not happy.",
    presenterId: MARA_PRESENTER_ID,
    presenterExpression: "serious",
    choices: [
      {
        choiceId: "apologize_to_prospect",
        label: "Chase Down the Prospect",
        description: "Send someone after the visitor with an apology and a free coffee.",
        consequenceSummary: "Small cost, might salvage the recruit lead.",
        effects: [
          { kind: "treasury_delta", targetRef: "guild", value: -15 },
          { kind: "reputation_delta", targetRef: "guild", value: 2 },
        ],
      },
      {
        choiceId: "bench_both",
        label: "Bench Both Operators",
        description: "No raids for either of them until they can keep it professional.",
        consequenceSummary: "Both operators stew, but the message is clear.",
        effects: [
          { kind: "morale_delta", targetRef: "subject_a", value: -4 },
          { kind: "morale_delta", targetRef: "subject_b", value: -4 },
          { kind: "reputation_delta", targetRef: "guild", value: 1 },
        ],
      },
      {
        choiceId: "move_on",
        label: "Damage Control Only",
        description:
          "Clean up the counter, restock the display, hope the next visitor did not hear.",
        consequenceSummary: "No direct cost, reputation takes the hit.",
        effects: [{ kind: "reputation_delta", targetRef: "guild", value: -2 }],
      },
    ],
  },
  {
    id: "incident/power-outage",
    name: "Block-Wide Power Outage",
    category: "breach_emergency",
    tags: ["bodega", "emergency", "infrastructure"],
    weight: 12,
    triggerFamily: "contract_pressure",
    pressureTags: ["pressure:logistics", "pressure:time"],
    pressureThreshold: 40,
    requiredContext: ["operator_a"],
    requiredBuildingIds: ["building/bodega"],
    cooldownMinutes: 2880,
    noveltyWeight: 1.5,
    briefingTemplate:
      "The whole block lost power. The bodega is running on phone flashlights and whatever sunlight comes through the front window. The supply closet refrigeration is off. Con Ed says four to six hours.",
    presenterId: MARA_PRESENTER_ID,
    presenterExpression: "serious",
    choices: [
      {
        choiceId: "generator_rental",
        label: "Rent a Generator",
        description: "Keep critical systems running and show the block you have it together.",
        consequenceSummary: "Expensive, but operations continue and reputation rises.",
        effects: [
          { kind: "treasury_delta", targetRef: "guild", value: -75 },
          { kind: "reputation_delta", targetRef: "guild", value: 3 },
          { kind: "contract_pressure_delta", targetRef: "guild", value: -5 },
        ],
      },
      {
        choiceId: "candles_and_patience",
        label: "Break Out the Candles",
        description: "Wait it out. The operators have worked in darker conditions.",
        consequenceSummary: "Free, but productivity and readiness drop.",
        effects: [
          { kind: "contract_pressure_delta", targetRef: "guild", value: 8 },
          { kind: "morale_delta", targetRef: "subject_a", value: -2 },
        ],
      },
      {
        choiceId: "close_and_deploy",
        label: "Close Shop, Deploy Everyone",
        description: "No point sitting in the dark. Send teams out early.",
        consequenceSummary: "Operations advance, but stress rises.",
        effects: [
          { kind: "contract_pressure_delta", targetRef: "guild", value: -10 },
          { kind: "morale_delta", targetRef: "subject_a", value: -4 },
        ],
      },
    ],
  },

  // ── Porter's-specific incidents ──────────────────────────────────────────

  {
    id: "incident/kitchen-standards-slip",
    name: "Kitchen Standards Slip",
    category: "kitchen_quality",
    tags: ["porters", "kitchen", "quality"],
    weight: 16,
    triggerFamily: "room_breakdown",
    pressureTags: ["pressure:logistics", "pressure:room", "pressure:economy"],
    pressureThreshold: 35,
    requiredContext: ["room"],
    requiredBuildingIds: ["building/porters"],
    preferredRoomTemplateIds: ["room/prep_room:tier_1"],
    cooldownMinutes: 720,
    noveltyWeight: 1.2,
    briefingTemplate:
      "Rafi says the prep room is one sloppy delivery away from feeding the building garbage. If you want Porter's to feel like an upgrade, this gets fixed now.",
    presenterId: COOK_PRESENTER_ID,
    presenterExpression: "serious",
    choices: [
      {
        choiceId: "buy_fresh_stock",
        label: "Buy Fresh Stock",
        description: "Spend now, reset the standard, and stop the room from spiraling.",
        consequenceSummary: "Treasury down, reputation steadied.",
        effects: [
          { kind: "treasury_delta", targetRef: "guild", value: -60 },
          { kind: "reputation_delta", targetRef: "guild", value: 2 },
          { kind: "contract_pressure_delta", targetRef: "guild", value: -6 },
        ],
      },
      {
        choiceId: "tighten_the_menu",
        label: "Tighten the Menu",
        description: "Cut the weak options and ask the line to carry a smaller service cleanly.",
        consequenceSummary: "Less chaos, slight morale hit from the squeeze.",
        effects: [
          { kind: "contract_pressure_delta", targetRef: "guild", value: -4 },
          { kind: "reputation_delta", targetRef: "guild", value: 1 },
        ],
      },
      {
        choiceId: "coast_on_it",
        label: "Coast on It",
        description: "Tell Rafi to make it work until the next payout lands.",
        consequenceSummary: "No cash cost, but the room's credibility takes the hit.",
        effects: [
          { kind: "reputation_delta", targetRef: "guild", value: -2 },
          { kind: "contract_pressure_delta", targetRef: "guild", value: 6 },
        ],
      },
    ],
  },
  {
    id: "incident/bar-regulars-spillover",
    name: "Regulars Spillover",
    category: "bar_drama",
    tags: ["porters", "bar", "recruitment", "drama"],
    weight: 18,
    triggerFamily: "operator_conflict",
    pressureTags: ["pressure:social", "pressure:reputation"],
    pressureThreshold: 30,
    requiredContext: ["operator_a", "room"],
    requiredBuildingIds: ["building/porters"],
    preferredRoomTemplateIds: ["room/bar:tier_1"],
    cooldownMinutes: 600,
    noveltyWeight: 1.25,
    briefingTemplate:
      "Imani intercepted {operator_a} turning a loud booth into a room-wide problem. The bar is still salvageable if you decide how public the correction is.",
    presenterId: BARTENDER_PRESENTER_ID,
    presenterExpression: "amused",
    choices: [
      {
        choiceId: "comp_the_tab",
        label: "Comp the Tab",
        description: "Smooth the room over, pay for the damage, and keep the regulars talking.",
        consequenceSummary: "Treasury down, mood and reputation recover.",
        effects: [
          { kind: "treasury_delta", targetRef: "guild", value: -45 },
          { kind: "morale_delta", targetRef: "subject_a", value: 4 },
          { kind: "reputation_delta", targetRef: "guild", value: 2 },
        ],
      },
      {
        choiceId: "quiet_pull_aside",
        label: "Pull Them Aside",
        description: "Handle it in the back and keep the room from becoming a spectacle.",
        consequenceSummary: "Loyalty up, reputation steadied.",
        effects: [
          { kind: "loyalty_delta", targetRef: "subject_a", value: 5 },
          { kind: "reputation_delta", targetRef: "guild", value: 1 },
        ],
      },
      {
        choiceId: "make_an_example",
        label: "Make an Example",
        description: "Let everyone see the correction so the next scene dies before it starts.",
        consequenceSummary: "Reputation rises, the operator resents it.",
        effects: [
          { kind: "reputation_delta", targetRef: "guild", value: 3 },
          { kind: "morale_delta", targetRef: "subject_a", value: -4 },
        ],
      },
    ],
  },

  // ── Phase 4: Midgame social and institutional incidents ────────────────

  // ── Licensing audit ──────────────────────────────────────────────────
  {
    id: "incident/licensing-audit-routine",
    name: "Licensing Audit Notice",
    category: "licensing_audit",
    tags: ["institutional", "compliance", "district"],
    weight: 20,
    triggerFamily: "faction_pressure",
    pressureTags: ["pressure:regulatory", "pressure:reputation"],
    pressureThreshold: 45,
    requiredContext: ["district", "faction"],
    cooldownMinutes: 2880,
    noveltyWeight: 1.0,
    briefingTemplate:
      "{faction} has scheduled a routine licensing review for operations in {district}. The paperwork needs to hold up or the guild loses its operating clearance for the area.",
    choices: [
      {
        choiceId: "full_disclosure",
        label: "Full Disclosure",
        description: "Lay everything out. The documentation is either clean or it isn't.",
        consequenceSummary: "Reputation gain if clean, treasury cost for preparation.",
        effects: [
          { kind: "treasury_delta", targetRef: "guild", value: -80 },
          { kind: "reputation_delta", targetRef: "guild", value: 4 },
          { kind: "contract_pressure_delta", targetRef: "guild", value: -8 },
        ],
      },
      {
        choiceId: "selective_presentation",
        label: "Selective Presentation",
        description: "Show them what they need to see. Bury the rest in process.",
        consequenceSummary: "Cheaper, but the risk lingers.",
        effects: [
          { kind: "treasury_delta", targetRef: "guild", value: -30 },
          { kind: "reputation_delta", targetRef: "guild", value: -1 },
        ],
      },
      {
        choiceId: "stall_and_reschedule",
        label: "Stall and Reschedule",
        description: "Cite an ongoing field operation and push the date back.",
        consequenceSummary: "Bought time, increased scrutiny.",
        effects: [
          { kind: "contract_pressure_delta", targetRef: "guild", value: 10 },
          { kind: "reputation_delta", targetRef: "guild", value: -3 },
        ],
      },
    ],
  },
  {
    id: "incident/licensing-audit-expedited",
    name: "Expedited License Review",
    category: "licensing_audit",
    tags: ["institutional", "compliance", "urgent"],
    weight: 16,
    triggerFamily: "faction_pressure",
    pressureTags: ["pressure:regulatory", "pressure:contract"],
    pressureThreshold: 55,
    requiredContext: ["district", "faction"],
    cooldownMinutes: 2880,
    noveltyWeight: 0.9,
    briefingTemplate:
      "{faction} is fast-tracking a license review after the last incident in {district}. The window to respond is hours, not days.",
    choices: [
      {
        choiceId: "emergency_compliance",
        label: "Emergency Compliance Sprint",
        description: "Pull staff off the floor and get the filing done before the deadline.",
        consequenceSummary: "Expensive, but clears the record.",
        effects: [
          { kind: "treasury_delta", targetRef: "guild", value: -120 },
          { kind: "reputation_delta", targetRef: "guild", value: 5 },
          { kind: "contract_pressure_delta", targetRef: "guild", value: -12 },
        ],
      },
      {
        choiceId: "partial_response",
        label: "Partial Response",
        description: "Send what you have. Fill in the gaps at the hearing.",
        consequenceSummary: "Reputation risk, lower immediate cost.",
        effects: [
          { kind: "treasury_delta", targetRef: "guild", value: -40 },
          { kind: "reputation_delta", targetRef: "guild", value: -2 },
          { kind: "contract_pressure_delta", targetRef: "guild", value: 5 },
        ],
      },
    ],
  },

  // ── Labor safety inspection ──────────────────────────────────────────
  {
    id: "incident/labor-safety-inspection",
    name: "Labor Safety Inspection",
    category: "labor_safety",
    tags: ["institutional", "safety", "operators"],
    weight: 18,
    triggerFamily: "compliance_pressure",
    pressureTags: ["pressure:casualty", "pressure:regulatory"],
    pressureThreshold: 40,
    requiredContext: ["operator_a", "district"],
    cooldownMinutes: 1440,
    noveltyWeight: 1.1,
    briefingTemplate:
      "A labor safety review in {district} is flagging operator injury rates. {operator_a}'s recent medical record is the first item on their clipboard.",
    choices: [
      {
        choiceId: "invest_in_safety",
        label: "Invest in Safety Protocols",
        description: "Spend on proper equipment and protocols. Reduce future injury exposure.",
        consequenceSummary: "Treasury down, morale up, pressure relieved.",
        effects: [
          { kind: "treasury_delta", targetRef: "guild", value: -100 },
          { kind: "morale_delta", targetRef: "subject_a", value: 8 },
          { kind: "contract_pressure_delta", targetRef: "guild", value: -10 },
          { kind: "reputation_delta", targetRef: "guild", value: 3 },
        ],
      },
      {
        choiceId: "paper_compliance",
        label: "Paper Compliance",
        description: "File the reports that make the numbers look right.",
        consequenceSummary: "Cheap but fragile. Another inspection will be worse.",
        effects: [
          { kind: "treasury_delta", targetRef: "guild", value: -25 },
          { kind: "reputation_delta", targetRef: "guild", value: -1 },
        ],
      },
      {
        choiceId: "dispute_findings",
        label: "Dispute the Findings",
        description: "Challenge the methodology. The data is anecdotal at best.",
        consequenceSummary: "No cost, but reputation and scrutiny rise.",
        effects: [
          { kind: "reputation_delta", targetRef: "guild", value: -4 },
          { kind: "contract_pressure_delta", targetRef: "guild", value: 8 },
        ],
      },
    ],
  },
  {
    id: "incident/labor-safety-followup",
    name: "Safety Follow-Up Notice",
    category: "labor_safety",
    tags: ["institutional", "safety", "followup"],
    weight: 14,
    triggerFamily: "compliance_pressure",
    pressureTags: ["pressure:casualty", "pressure:morale"],
    pressureThreshold: 50,
    requiredContext: ["operator_a"],
    cooldownMinutes: 1440,
    noveltyWeight: 1.0,
    briefingTemplate:
      "The safety review board has returned with follow-up concerns about operator deployment conditions. {operator_a} is cited as a case study.",
    choices: [
      {
        choiceId: "mandatory_downtime",
        label: "Mandatory Recovery Downtime",
        description: "Pull the cited operator from all deployment until the board clears them.",
        consequenceSummary: "Loyalty boost, slower operations.",
        effects: [
          { kind: "loyalty_delta", targetRef: "subject_a", value: 8 },
          { kind: "morale_delta", targetRef: "subject_a", value: 5 },
          { kind: "contract_pressure_delta", targetRef: "guild", value: 6 },
        ],
      },
      {
        choiceId: "modified_duty",
        label: "Modified Duty Assignment",
        description: "Keep them active on lighter tasks. The board probably won't check.",
        consequenceSummary: "Balanced approach, minor reputation risk.",
        effects: [
          { kind: "morale_delta", targetRef: "subject_a", value: 2 },
          { kind: "reputation_delta", targetRef: "guild", value: -1 },
        ],
      },
    ],
  },

  // ── Emergency containment demand ─────────────────────────────────────
  {
    id: "incident/emergency-containment-demand",
    name: "Emergency Containment Order",
    category: "containment_demand",
    tags: ["district", "emergency", "pressure"],
    weight: 22,
    triggerFamily: "district_fallout",
    pressureTags: ["pressure:contract", "pressure:casualty"],
    pressureThreshold: 50,
    requiredContext: ["district", "operator_a"],
    cooldownMinutes: 1440,
    noveltyWeight: 1.0,
    briefingTemplate:
      "{district} has issued an emergency containment order. Breach residue from the last clearance is spreading faster than projected. {operator_a}'s team was the last unit on site.",
    choices: [
      {
        choiceId: "full_response",
        label: "Full Emergency Response",
        description: "Commit resources and operators to contain it before it escalates.",
        consequenceSummary: "Expensive, but trust and pressure both improve.",
        effects: [
          { kind: "treasury_delta", targetRef: "guild", value: -130 },
          { kind: "reputation_delta", targetRef: "guild", value: 5 },
          { kind: "contract_pressure_delta", targetRef: "guild", value: -15 },
          { kind: "morale_delta", targetRef: "subject_a", value: -3 },
        ],
      },
      {
        choiceId: "minimal_containment",
        label: "Minimal Containment",
        description: "Send a small detail. Enough to show effort, not enough to finish it.",
        consequenceSummary: "Low cost, partial resolution. The district notices.",
        effects: [
          { kind: "treasury_delta", targetRef: "guild", value: -40 },
          { kind: "contract_pressure_delta", targetRef: "guild", value: -5 },
          { kind: "reputation_delta", targetRef: "guild", value: -2 },
        ],
      },
      {
        choiceId: "deny_responsibility",
        label: "Deny Responsibility",
        description: "The clearance was clean. Whatever is spreading is not your problem.",
        consequenceSummary: "Free, but trust collapses and pressure spikes.",
        effects: [
          { kind: "reputation_delta", targetRef: "guild", value: -6 },
          { kind: "contract_pressure_delta", targetRef: "guild", value: 12 },
        ],
      },
    ],
  },
  {
    id: "incident/containment-escalation",
    name: "Containment Escalation",
    category: "containment_demand",
    tags: ["district", "emergency", "escalation"],
    weight: 16,
    triggerFamily: "district_fallout",
    pressureTags: ["pressure:contract", "pressure:reputation"],
    pressureThreshold: 60,
    requiredContext: ["district"],
    cooldownMinutes: 2880,
    noveltyWeight: 0.8,
    briefingTemplate:
      "The containment situation in {district} has escalated. The borough is threatening to revoke field clearance for all guilds operating in the area.",
    choices: [
      {
        choiceId: "lead_coalition_response",
        label: "Lead the Coalition Response",
        description: "Coordinate with other guilds. Expensive but builds lasting district trust.",
        consequenceSummary: "High treasury cost, significant reputation and pressure recovery.",
        effects: [
          { kind: "treasury_delta", targetRef: "guild", value: -180 },
          { kind: "reputation_delta", targetRef: "guild", value: 8 },
          { kind: "contract_pressure_delta", targetRef: "guild", value: -20 },
        ],
      },
      {
        choiceId: "contribute_minimally",
        label: "Contribute Minimally",
        description: "Participate enough to avoid blame. Let others carry the weight.",
        consequenceSummary: "Low cost, moderate reputation damage.",
        effects: [
          { kind: "treasury_delta", targetRef: "guild", value: -50 },
          { kind: "reputation_delta", targetRef: "guild", value: -3 },
        ],
      },
    ],
  },

  // ── Borough contract hearing ─────────────────────────────────────────
  {
    id: "incident/borough-contract-hearing",
    name: "Borough Contract Hearing",
    category: "borough_hearing",
    tags: ["institutional", "contract", "district"],
    weight: 20,
    triggerFamily: "faction_pressure",
    pressureTags: ["pressure:contract", "pressure:reputation"],
    pressureThreshold: 55,
    requiredContext: ["district", "faction"],
    cooldownMinutes: 2880,
    noveltyWeight: 0.9,
    briefingTemplate:
      "{faction} has convened a hearing about your contract performance in {district}. The board wants an accounting of timelines, casualties, and containment outcomes.",
    choices: [
      {
        choiceId: "present_full_record",
        label: "Present the Full Record",
        description: "Go in with everything. The numbers either support you or they don't.",
        consequenceSummary: "Reputation up if record is strong, treasury cost for prep.",
        effects: [
          { kind: "treasury_delta", targetRef: "guild", value: -60 },
          { kind: "reputation_delta", targetRef: "guild", value: 5 },
          { kind: "contract_pressure_delta", targetRef: "guild", value: -10 },
        ],
      },
      {
        choiceId: "send_representative",
        label: "Send a Representative",
        description: "Delegate attendance. You have a guild to run.",
        consequenceSummary: "Cheaper, but the board reads it as dismissive.",
        effects: [
          { kind: "treasury_delta", targetRef: "guild", value: -20 },
          { kind: "reputation_delta", targetRef: "guild", value: -2 },
        ],
      },
      {
        choiceId: "request_postponement",
        label: "Request Postponement",
        description: "Cite operational constraints and ask for more time.",
        consequenceSummary: "Bought time. The faction notes the delay.",
        effects: [
          { kind: "contract_pressure_delta", targetRef: "guild", value: 8 },
          { kind: "reputation_delta", targetRef: "guild", value: -1 },
        ],
      },
    ],
  },
  {
    id: "incident/borough-performance-review",
    name: "Borough Performance Review",
    category: "borough_hearing",
    tags: ["institutional", "contract", "performance"],
    weight: 16,
    triggerFamily: "faction_pressure",
    pressureTags: ["pressure:contract", "pressure:regulatory"],
    pressureThreshold: 50,
    requiredContext: ["faction"],
    cooldownMinutes: 2880,
    noveltyWeight: 0.85,
    briefingTemplate:
      "{faction} has published a quarterly performance review. Your guild is listed under the underperforming tier. The summary is public.",
    choices: [
      {
        choiceId: "public_response",
        label: "Issue a Public Response",
        description: "Contest the ranking with verifiable data. Costs time and credibility.",
        consequenceSummary: "Reputation recovery if compelling, treasury cost.",
        effects: [
          { kind: "treasury_delta", targetRef: "guild", value: -50 },
          { kind: "reputation_delta", targetRef: "guild", value: 3 },
        ],
      },
      {
        choiceId: "accept_and_improve",
        label: "Accept and Improve",
        description: "Take the hit. Use it as motivation internally.",
        consequenceSummary: "No cost, slight morale penalty.",
        effects: [{ kind: "reputation_delta", targetRef: "guild", value: -2 }],
      },
    ],
  },

  // ── Rival interference ───────────────────────────────────────────────
  {
    id: "incident/rival-contract-sabotage",
    name: "Rival Contract Interference",
    category: "rival_interference",
    tags: ["rival", "sabotage", "contract"],
    weight: 22,
    triggerFamily: "faction_pressure",
    pressureTags: ["pressure:contract", "pressure:reputation"],
    pressureThreshold: 45,
    requiredContext: ["operator_a", "faction"],
    cooldownMinutes: 1440,
    noveltyWeight: 1.2,
    briefingTemplate:
      "Intel suggests {faction} has been undermining your current contract. Field equipment has been tampered with, and {operator_a} reported interference during the last deployment.",
    choices: [
      {
        choiceId: "investigate_and_expose",
        label: "Investigate and Expose",
        description: "Document the interference and bring it to the contract board.",
        consequenceSummary: "Intel and reputation up, treasury cost for investigation.",
        effects: [
          { kind: "treasury_delta", targetRef: "guild", value: -70 },
          { kind: "intel_delta", targetRef: "guild", value: 8 },
          { kind: "reputation_delta", targetRef: "guild", value: 4 },
        ],
      },
      {
        choiceId: "harden_operations",
        label: "Harden Operations",
        description: "Increase security protocols. Don't give them another opening.",
        consequenceSummary: "Treasury cost, contract pressure eased.",
        effects: [
          { kind: "treasury_delta", targetRef: "guild", value: -50 },
          { kind: "contract_pressure_delta", targetRef: "guild", value: -8 },
        ],
      },
      {
        choiceId: "absorb_the_hit",
        label: "Absorb and Move On",
        description: "Replace what was lost. The contract board won't care who did it.",
        consequenceSummary: "Cheap but the interference continues.",
        effects: [
          { kind: "treasury_delta", targetRef: "guild", value: -30 },
          { kind: "morale_delta", targetRef: "subject_a", value: -3 },
        ],
      },
    ],
  },
  {
    id: "incident/rival-recruitment-raid",
    name: "Rival Recruitment Push",
    category: "rival_interference",
    tags: ["rival", "retention", "operators"],
    weight: 18,
    triggerFamily: "faction_pressure",
    pressureTags: ["pressure:retention", "pressure:loyalty"],
    pressureThreshold: 50,
    requiredContext: ["operator_a", "operator_b"],
    cooldownMinutes: 1440,
    noveltyWeight: 1.1,
    briefingTemplate:
      "A rival guild has been approaching your operators directly. {operator_a} and {operator_b} both received offers this week.",
    choices: [
      {
        choiceId: "retention_bonuses",
        label: "Issue Retention Bonuses",
        description: "Pay to keep them. Money talks.",
        consequenceSummary: "Treasury down, loyalty secured for both.",
        effects: [
          { kind: "treasury_delta", targetRef: "guild", value: -120 },
          { kind: "loyalty_delta", targetRef: "subject_a", value: 10 },
          { kind: "loyalty_delta", targetRef: "subject_b", value: 10 },
        ],
      },
      {
        choiceId: "team_address",
        label: "Address the Team",
        description: "Speak to the whole roster. Remind them what this guild is building.",
        consequenceSummary: "Free but less effective. Works better with high morale.",
        effects: [
          { kind: "loyalty_delta", targetRef: "subject_a", value: 4 },
          { kind: "loyalty_delta", targetRef: "subject_b", value: 4 },
          { kind: "morale_delta", targetRef: "subject_a", value: 2 },
          { kind: "morale_delta", targetRef: "subject_b", value: 2 },
        ],
      },
      {
        choiceId: "accept_attrition",
        label: "Accept Some Attrition",
        description: "If they want to leave, replacing them costs less than overpaying.",
        consequenceSummary: "Departure risk for both. Roster may thin.",
        effects: [
          { kind: "departure_risk", targetRef: "subject_a", value: 25 },
          { kind: "departure_risk", targetRef: "subject_b", value: 25 },
        ],
      },
    ],
  },

  // ── Memorial and grief fallout ───────────────────────────────────────
  {
    id: "incident/memorial-demand",
    name: "Memorial Service Demand",
    category: "grief_memorial",
    tags: ["grief", "death", "morale", "social"],
    weight: 24,
    triggerFamily: "casualty_aftermath",
    pressureTags: ["pressure:casualty", "pressure:morale"],
    pressureThreshold: 35,
    requiredContext: ["operator_a"],
    cooldownMinutes: 1440,
    noveltyWeight: 1.3,
    briefingTemplate:
      "The roster is asking for a formal memorial after the last casualty. {operator_a} has been organizing something unofficial on their own time. The team is watching how you respond.",
    choices: [
      {
        choiceId: "full_memorial",
        label: "Authorize a Full Memorial",
        description: "Stand down operations for a day. Let the guild grieve properly.",
        consequenceSummary: "Treasury cost, significant morale and team cohesion recovery.",
        effects: [
          { kind: "treasury_delta", targetRef: "guild", value: -80 },
          { kind: "morale_delta", targetRef: "subject_a", value: 10 },
          { kind: "team_cohesion_delta", targetRef: "team", value: 8 },
          { kind: "contract_pressure_delta", targetRef: "guild", value: 5 },
        ],
      },
      {
        choiceId: "quiet_acknowledgment",
        label: "Quiet Acknowledgment",
        description: "A brief moment before shift. No stand-down, but the loss is named.",
        consequenceSummary: "No cost, modest morale recovery.",
        effects: [
          { kind: "morale_delta", targetRef: "subject_a", value: 4 },
          { kind: "loyalty_delta", targetRef: "subject_a", value: 3 },
        ],
      },
      {
        choiceId: "move_forward",
        label: "Keep Moving Forward",
        description: "The mission doesn't stop. Everyone knew the risks.",
        consequenceSummary: "No cost, but grievance spikes and departure risk rises.",
        effects: [
          { kind: "morale_delta", targetRef: "subject_a", value: -6 },
          { kind: "departure_risk", targetRef: "subject_a", value: 20 },
        ],
      },
    ],
  },
  {
    id: "incident/grief-spiral",
    name: "Grief Spiral",
    category: "grief_memorial",
    tags: ["grief", "social", "retention"],
    weight: 18,
    triggerFamily: "casualty_aftermath",
    pressureTags: ["pressure:casualty", "pressure:morale"],
    pressureThreshold: 45,
    requiredContext: ["operator_a", "operator_b"],
    cooldownMinutes: 1440,
    noveltyWeight: 1.15,
    briefingTemplate:
      "{operator_a} and {operator_b} were closest to the last operator lost. Neither has been the same since. They are pulling back from assignments and the team feels it.",
    choices: [
      {
        choiceId: "paired_recovery",
        label: "Paired Recovery Detail",
        description: "Assign them low-stakes work together. Let them process side by side.",
        consequenceSummary: "Slow return, but the bond strengthens.",
        effects: [
          { kind: "morale_delta", targetRef: "subject_a", value: 6 },
          { kind: "morale_delta", targetRef: "subject_b", value: 6 },
          { kind: "team_cohesion_delta", targetRef: "team", value: 5 },
          { kind: "contract_pressure_delta", targetRef: "guild", value: 4 },
        ],
      },
      {
        choiceId: "separate_assignments",
        label: "Separate Assignments",
        description: "Split them up. The grief is feeding on itself.",
        consequenceSummary: "Faster operational recovery, but the relationship strains.",
        effects: [
          { kind: "morale_delta", targetRef: "subject_a", value: 2 },
          { kind: "morale_delta", targetRef: "subject_b", value: 2 },
          { kind: "loyalty_delta", targetRef: "subject_a", value: -3 },
          { kind: "loyalty_delta", targetRef: "subject_b", value: -3 },
        ],
      },
    ],
  },

  // ── Team fracture after casualty ─────────────────────────────────────
  {
    id: "incident/team-fracture-casualty",
    name: "Team Fracture After Loss",
    category: "team_fracture",
    tags: ["team", "casualty", "cohesion"],
    weight: 22,
    triggerFamily: "casualty_aftermath",
    pressureTags: ["pressure:casualty", "pressure:social"],
    pressureThreshold: 40,
    requiredContext: ["operator_a", "operator_b"],
    cooldownMinutes: 1440,
    noveltyWeight: 1.2,
    briefingTemplate:
      "The team that lost an operator last run is fracturing. {operator_a} blames {operator_b} for the call that got someone killed. The rest of the roster is picking sides.",
    choices: [
      {
        choiceId: "formal_review",
        label: "Formal After-Action Review",
        description:
          "Convene a structured review. Get the facts on record before the story hardens.",
        consequenceSummary: "Cohesion partially restores, morale steadies.",
        effects: [
          { kind: "morale_delta", targetRef: "subject_a", value: 4 },
          { kind: "morale_delta", targetRef: "subject_b", value: 4 },
          { kind: "team_cohesion_delta", targetRef: "team", value: 6 },
          { kind: "loyalty_delta", targetRef: "subject_a", value: 3 },
        ],
      },
      {
        choiceId: "back_the_lead",
        label: "Back the Team Lead",
        description: "Support the decision-maker publicly. Chain of command holds.",
        consequenceSummary: "One operator steadies, the other spirals.",
        effects: [
          { kind: "loyalty_delta", targetRef: "subject_a", value: -5 },
          { kind: "loyalty_delta", targetRef: "subject_b", value: 8 },
          { kind: "morale_delta", targetRef: "subject_a", value: -4 },
        ],
      },
      {
        choiceId: "dissolve_team",
        label: "Dissolve the Team",
        description: "Break the unit apart. Reassign everyone. Start fresh.",
        consequenceSummary: "Clean break, but cohesion is lost and morale dips.",
        effects: [
          { kind: "team_cohesion_delta", targetRef: "team", value: -20 },
          { kind: "morale_delta", targetRef: "subject_a", value: -3 },
          { kind: "morale_delta", targetRef: "subject_b", value: -3 },
        ],
      },
    ],
  },
  {
    id: "incident/team-confidence-collapse",
    name: "Team Confidence Collapse",
    category: "team_fracture",
    tags: ["team", "casualty", "morale"],
    weight: 16,
    triggerFamily: "casualty_aftermath",
    pressureTags: ["pressure:casualty", "pressure:morale"],
    pressureThreshold: 50,
    requiredContext: ["operator_a"],
    cooldownMinutes: 1440,
    noveltyWeight: 1.0,
    briefingTemplate:
      "The entire field team is refusing high-risk assignments after the last loss. {operator_a} is the most vocal about standing down until conditions improve.",
    choices: [
      {
        choiceId: "address_conditions",
        label: "Address Their Concerns",
        description: "Review safety protocols publicly and make visible changes.",
        consequenceSummary: "Treasury cost, but morale and cohesion recover.",
        effects: [
          { kind: "treasury_delta", targetRef: "guild", value: -60 },
          { kind: "morale_delta", targetRef: "subject_a", value: 8 },
          { kind: "team_cohesion_delta", targetRef: "team", value: 5 },
        ],
      },
      {
        choiceId: "mandatory_deployment",
        label: "Mandate Deployment",
        description: "The contract doesn't care about feelings. Everyone goes.",
        consequenceSummary: "Contract pressure eased, but loyalty and morale tank.",
        effects: [
          { kind: "contract_pressure_delta", targetRef: "guild", value: -10 },
          { kind: "morale_delta", targetRef: "subject_a", value: -6 },
          { kind: "loyalty_delta", targetRef: "subject_a", value: -5 },
          { kind: "departure_risk", targetRef: "subject_a", value: 15 },
        ],
      },
    ],
  },

  // ── District backlash after messy cleanup ────────────────────────────
  {
    id: "incident/district-backlash-cleanup",
    name: "District Backlash",
    category: "district_backlash",
    tags: ["district", "reputation", "community"],
    weight: 22,
    triggerFamily: "district_fallout",
    pressureTags: ["pressure:reputation", "pressure:contract"],
    pressureThreshold: 45,
    requiredContext: ["district"],
    cooldownMinutes: 1440,
    noveltyWeight: 1.1,
    briefingTemplate:
      "Residents in {district} are organizing against guild operations after the last messy clearance. The community board has scheduled a public comment session.",
    choices: [
      {
        choiceId: "community_outreach",
        label: "Community Outreach",
        description: "Send a representative. Listen. Offer concrete remediation.",
        consequenceSummary: "Treasury cost, reputation and trust recovery.",
        effects: [
          { kind: "treasury_delta", targetRef: "guild", value: -90 },
          { kind: "reputation_delta", targetRef: "guild", value: 5 },
          { kind: "contract_pressure_delta", targetRef: "guild", value: -10 },
        ],
      },
      {
        choiceId: "written_response",
        label: "Submit a Written Response",
        description: "Acknowledge the concern on paper. Skip the public theater.",
        consequenceSummary: "Low cost, minimal impact.",
        effects: [
          { kind: "treasury_delta", targetRef: "guild", value: -15 },
          { kind: "reputation_delta", targetRef: "guild", value: -1 },
        ],
      },
      {
        choiceId: "ignore_backlash",
        label: "Ignore the Backlash",
        description: "The guild answers to the contract board, not the community.",
        consequenceSummary: "Free, but district trust collapses.",
        effects: [
          { kind: "reputation_delta", targetRef: "guild", value: -5 },
          { kind: "contract_pressure_delta", targetRef: "guild", value: 10 },
        ],
      },
    ],
  },
  {
    id: "incident/district-property-damage-claim",
    name: "Property Damage Claim",
    category: "district_backlash",
    tags: ["district", "legal", "financial"],
    weight: 18,
    triggerFamily: "district_fallout",
    pressureTags: ["pressure:contract", "pressure:economy"],
    pressureThreshold: 40,
    requiredContext: ["district"],
    cooldownMinutes: 1440,
    noveltyWeight: 1.0,
    briefingTemplate:
      "A property damage claim from {district} has landed on your desk. Three storefronts and a fire escape, all from the last breach containment.",
    choices: [
      {
        choiceId: "settle_immediately",
        label: "Settle Immediately",
        description: "Pay the claim and move on. Clean slate.",
        consequenceSummary: "Heavy treasury cost, pressure and reputation stabilize.",
        effects: [
          { kind: "treasury_delta", targetRef: "guild", value: -150 },
          { kind: "reputation_delta", targetRef: "guild", value: 3 },
          { kind: "contract_pressure_delta", targetRef: "guild", value: -8 },
        ],
      },
      {
        choiceId: "negotiate_reduction",
        label: "Negotiate a Reduction",
        description: "Challenge the assessment. Some of that damage was pre-existing.",
        consequenceSummary: "Moderate cost, slower resolution.",
        effects: [
          { kind: "treasury_delta", targetRef: "guild", value: -80 },
          { kind: "reputation_delta", targetRef: "guild", value: -1 },
        ],
      },
      {
        choiceId: "contest_liability",
        label: "Contest Liability",
        description: "The breach caused the damage, not the guild. File a counterargument.",
        consequenceSummary: "Free, but the claim escalates and pressure rises.",
        effects: [
          { kind: "reputation_delta", targetRef: "guild", value: -4 },
          { kind: "contract_pressure_delta", targetRef: "guild", value: 12 },
        ],
      },
    ],
  },

  // ── Workshop shortage or theft ───────────────────────────────────────
  {
    id: "incident/workshop-material-shortage",
    name: "Workshop Material Shortage",
    category: "workshop_disruption",
    tags: ["workshop", "crafting", "logistics"],
    weight: 20,
    triggerFamily: "workshop_disruption",
    pressureTags: ["pressure:logistics", "pressure:economy"],
    pressureThreshold: 30,
    requiredContext: ["room"],
    cooldownMinutes: 720,
    noveltyWeight: 1.2,
    briefingTemplate:
      "The workshop is reporting a critical material shortage. Crafting has stalled and the queue is backing up. Someone miscounted the last inventory.",
    choices: [
      {
        choiceId: "emergency_procurement",
        label: "Emergency Procurement",
        description: "Buy materials at markup to get the workshop running again today.",
        consequenceSummary: "Heavy treasury cost, crafting resumes immediately.",
        effects: [
          { kind: "treasury_delta", targetRef: "guild", value: -100 },
          { kind: "contract_pressure_delta", targetRef: "guild", value: -6 },
        ],
      },
      {
        choiceId: "ration_materials",
        label: "Ration Remaining Stock",
        description: "Prioritize critical orders. Everything else waits.",
        consequenceSummary: "Cheap, but slower output and some morale friction.",
        effects: [
          { kind: "treasury_delta", targetRef: "guild", value: -20 },
          { kind: "contract_pressure_delta", targetRef: "guild", value: 4 },
        ],
      },
      {
        choiceId: "scavenge_from_raids",
        label: "Scavenge from Raid Salvage",
        description: "Repurpose field salvage. Not ideal quality, but it fills the gaps.",
        consequenceSummary: "Free, but output quality drops.",
        effects: [
          { kind: "reputation_delta", targetRef: "guild", value: -2 },
          { kind: "intel_delta", targetRef: "guild", value: 2 },
        ],
      },
    ],
  },
  {
    id: "incident/workshop-theft",
    name: "Workshop Theft",
    category: "workshop_disruption",
    tags: ["workshop", "theft", "security"],
    weight: 16,
    triggerFamily: "workshop_disruption",
    pressureTags: ["pressure:logistics", "pressure:security"],
    pressureThreshold: 40,
    requiredContext: ["room", "operator_a"],
    cooldownMinutes: 1440,
    noveltyWeight: 1.3,
    briefingTemplate:
      "Finished goods went missing from the workshop overnight. {operator_a} was last seen near the supply room. The lock wasn't forced.",
    choices: [
      {
        choiceId: "investigate_internally",
        label: "Internal Investigation",
        description: "Question the roster, check logs, find the gap in security.",
        consequenceSummary: "Intel gain, morale hit from suspicion.",
        effects: [
          { kind: "intel_delta", targetRef: "guild", value: 5 },
          { kind: "morale_delta", targetRef: "subject_a", value: -4 },
          { kind: "treasury_delta", targetRef: "guild", value: -30 },
        ],
      },
      {
        choiceId: "upgrade_security",
        label: "Upgrade Workshop Security",
        description: "Better locks, inventory tracking, and accountability.",
        consequenceSummary: "Treasury cost, prevents future incidents.",
        effects: [
          { kind: "treasury_delta", targetRef: "guild", value: -70 },
          { kind: "contract_pressure_delta", targetRef: "guild", value: -4 },
        ],
      },
      {
        choiceId: "absorb_loss",
        label: "Absorb the Loss",
        description: "Write it off. Tightening security costs more than what was taken.",
        consequenceSummary: "Free, but the pattern may continue.",
        effects: [{ kind: "reputation_delta", targetRef: "guild", value: -2 }],
      },
    ],
  },

  // ── Sponsor ultimatum on overdue contract ────────────────────────────
  {
    id: "incident/sponsor-ultimatum",
    name: "Sponsor Ultimatum",
    category: "sponsor_ultimatum",
    tags: ["sponsor", "contract", "deadline", "faction"],
    weight: 24,
    triggerFamily: "sponsor_demand",
    pressureTags: ["pressure:contract", "pressure:deadline"],
    pressureThreshold: 55,
    requiredContext: ["operator_a", "faction", "contract_site"],
    cooldownMinutes: 2880,
    noveltyWeight: 0.9,
    briefingTemplate:
      "{faction} has issued a formal ultimatum on the current contract. Deliver results within the week or the contract is pulled and awarded to a competitor.",
    choices: [
      {
        choiceId: "all_hands_push",
        label: "All-Hands Push",
        description: "Commit everything to the contract. Cancel leave, double shifts.",
        consequenceSummary: "Significant pressure relief, morale and loyalty cost.",
        effects: [
          { kind: "contract_pressure_delta", targetRef: "guild", value: -20 },
          { kind: "morale_delta", targetRef: "subject_a", value: -5 },
          { kind: "loyalty_delta", targetRef: "subject_a", value: -3 },
        ],
      },
      {
        choiceId: "negotiate_terms",
        label: "Negotiate Revised Terms",
        description: "Accept a reduced payout in exchange for extended timeline.",
        consequenceSummary: "Less pressure, less reward.",
        effects: [
          { kind: "contract_pressure_delta", targetRef: "guild", value: -12 },
          { kind: "treasury_delta", targetRef: "guild", value: -60 },
          { kind: "reputation_delta", targetRef: "guild", value: -2 },
        ],
      },
      {
        choiceId: "call_the_bluff",
        label: "Call Their Bluff",
        description: "They need you as much as you need them. Stay the course.",
        consequenceSummary: "No immediate cost, but if they aren't bluffing...",
        effects: [
          { kind: "contract_pressure_delta", targetRef: "guild", value: 8 },
          { kind: "reputation_delta", targetRef: "guild", value: -3 },
        ],
      },
    ],
  },
  {
    id: "incident/sponsor-payment-hold",
    name: "Sponsor Payment Hold",
    category: "sponsor_ultimatum",
    tags: ["sponsor", "financial", "faction"],
    weight: 18,
    triggerFamily: "sponsor_demand",
    pressureTags: ["pressure:economy", "pressure:contract"],
    pressureThreshold: 50,
    requiredContext: ["operator_a", "faction"],
    cooldownMinutes: 2880,
    noveltyWeight: 0.85,
    briefingTemplate:
      "{faction} has frozen progress payments pending a review of your operational expenses. The treasury is going to feel this immediately.",
    choices: [
      {
        choiceId: "open_the_books",
        label: "Open the Books",
        description: "Full financial transparency. If the spending is justified, the freeze lifts.",
        consequenceSummary: "No additional cost if clean. Reputation gain.",
        effects: [
          { kind: "reputation_delta", targetRef: "guild", value: 4 },
          { kind: "contract_pressure_delta", targetRef: "guild", value: -8 },
        ],
      },
      {
        choiceId: "bridge_financing",
        label: "Bridge the Gap",
        description: "Dip into reserves to keep operations running during the freeze.",
        consequenceSummary: "Treasury hit, but operations continue.",
        effects: [{ kind: "treasury_delta", targetRef: "guild", value: -100 }],
      },
      {
        choiceId: "reduce_operations",
        label: "Reduce Operations",
        description: "Scale back until the payments resume. Conserve cash.",
        consequenceSummary: "Contract pressure rises, but treasury is preserved.",
        effects: [
          { kind: "contract_pressure_delta", targetRef: "guild", value: 10 },
          { kind: "morale_delta", targetRef: "subject_a", value: -3 },
        ],
      },
    ],
  },

  // ── Skyscraper institutional pressure ────────────────────────────────
  // These templates are gated to the skyscraper and compose new pressure
  // tags (rivalry / exposure / prestige) on top of the existing family.
  // Each pairs with an Executive Floor room so compliance / executive /
  // war-room framing is picked when the relevant room is operational.
  {
    id: "incident/licensing-bureau-audit",
    name: "Licensing Bureau Audit",
    category: "licensing_audit",
    tags: ["skyscraper", "compliance", "audit", "faction"],
    weight: 22,
    triggerFamily: "compliance_pressure",
    pressureTags: ["pressure:regulatory", "pressure:exposure"],
    pressureThreshold: 55,
    requiredContext: ["faction"],
    cooldownMinutes: 2880,
    noveltyWeight: 1.05,
    briefingTemplate:
      "The Licensing Bureau has booked an on-site audit of {guildName}. Two auditors, three days of records review, and a public finding at the end. The Compliance Office can absorb the hit — quietly paying the fee is the other option.",
    requiredBuildingIds: ["building/skyscraper"],
    preferredRoomTemplateIds: ["room/compliance_office:tier_1"],
    fixedFactionId: "faction/city-licensing",
    choices: [
      {
        choiceId: "settlement_fee",
        label: "Pay the Settlement Fee",
        description: "Cut the cheque, close the file, keep the finding off the record.",
        consequenceSummary: "Cash hit, scrutiny drops, standing unchanged.",
        effects: [
          { kind: "treasury_delta", targetRef: "guild", value: -220 },
          {
            kind: "faction_scrutiny_delta",
            targetRef: "faction:faction/city-licensing",
            value: -14,
          },
        ],
      },
      {
        choiceId: "cooperate_fully",
        label: "Cooperate Fully",
        description:
          "Open the files. The Compliance Office can defend the paperwork. Scrutiny eases, standing improves.",
        consequenceSummary: "Minor rep cost, scrutiny drops hard, standing nudges up.",
        effects: [
          { kind: "reputation_delta", targetRef: "guild", value: -1 },
          {
            kind: "faction_scrutiny_delta",
            targetRef: "faction:faction/city-licensing",
            value: -18,
          },
          {
            kind: "faction_standing_delta",
            targetRef: "faction:faction/city-licensing",
            value: 5,
          },
        ],
      },
      {
        choiceId: "contest_the_audit",
        label: "Contest the Audit",
        description:
          "File a formal challenge. The paperwork is defensible, and the Bureau knows it. No cost, but scrutiny escalates if they push back.",
        consequenceSummary: "Free today, heavy scrutiny escalation, standing damaged.",
        effects: [
          {
            kind: "faction_scrutiny_delta",
            targetRef: "faction:faction/city-licensing",
            value: 16,
          },
          {
            kind: "faction_standing_delta",
            targetRef: "faction:faction/city-licensing",
            value: -10,
          },
          { kind: "contract_pressure_delta", targetRef: "guild", value: 6 },
        ],
      },
    ],
  },
  {
    id: "incident/sponsor-prestige-demand",
    name: "Sponsor Prestige Demand",
    category: "sponsor_ultimatum",
    tags: ["skyscraper", "sponsor", "prestige", "faction"],
    weight: 20,
    triggerFamily: "sponsor_demand",
    pressureTags: ["pressure:prestige", "pressure:reputation"],
    pressureThreshold: 50,
    requiredContext: ["faction"],
    cooldownMinutes: 2880,
    noveltyWeight: 1.1,
    briefingTemplate:
      "{faction} wants {guildName} on the record as the sponsor's preferred guild. A public endorsement in exchange for a visible show of loyalty — a conspicuous commitment to their political agenda. The Executive Office was built for exactly this kind of conversation.",
    requiredBuildingIds: ["building/skyscraper"],
    preferredRoomTemplateIds: ["room/executive_office:tier_1"],
    fixedFactionId: "faction/borough-contracts",
    choices: [
      {
        choiceId: "accept_endorsement",
        label: "Accept the Endorsement",
        description:
          "Stand with the sponsor. Publicly, on the record, with the {guildName} mark next to theirs.",
        consequenceSummary: "Standing climbs, reputation lifts, scrutiny unmoved.",
        effects: [
          {
            kind: "faction_standing_delta",
            targetRef: "faction:faction/borough-contracts",
            value: 14,
          },
          { kind: "reputation_delta", targetRef: "guild", value: 4 },
        ],
      },
      {
        choiceId: "quiet_favor",
        label: "Offer a Quiet Favor",
        description:
          "No public tie, but deliver something private the sponsor can use. A handshake deal, not a press release.",
        consequenceSummary: "Modest standing lift, treasury cost, no scrutiny spike.",
        effects: [
          { kind: "treasury_delta", targetRef: "guild", value: -90 },
          {
            kind: "faction_standing_delta",
            targetRef: "faction:faction/borough-contracts",
            value: 6,
          },
        ],
      },
      {
        choiceId: "decline_politely",
        label: "Decline Politely",
        description:
          "{guildName} stays out of their politics. The sponsor will not forget — and neither will the watchdogs who noticed the request in the first place.",
        consequenceSummary: "Standing falls with the sponsor; scrutiny climbs across regulators.",
        effects: [
          {
            kind: "faction_standing_delta",
            targetRef: "faction:faction/borough-contracts",
            value: -8,
          },
          {
            kind: "faction_scrutiny_delta",
            targetRef: "faction:faction/borough-contracts",
            value: 10,
          },
        ],
      },
    ],
  },
  {
    id: "incident/rival-guild-poaching-push",
    name: "Rival Guild Poaching Push",
    category: "rival_poaching",
    tags: ["skyscraper", "rival", "roster", "faction"],
    weight: 18,
    triggerFamily: "rival_poaching",
    pressureTags: ["pressure:rivalry", "pressure:loyalty"],
    pressureThreshold: 50,
    requiredContext: ["operator_a"],
    cooldownMinutes: 2160,
    noveltyWeight: 1.2,
    briefingTemplate:
      "A rival tower across the river is running a coordinated poaching campaign against {guildName}. {operator_a} is the first name on their list — the offer is already on the table. The War Room can plan a counter-op. Or the guild can absorb the loss.",
    requiredBuildingIds: ["building/skyscraper"],
    preferredRoomTemplateIds: ["room/war_room:tier_1"],
    choices: [
      {
        choiceId: "war_room_counter_op",
        label: "Run a Counter-Op",
        description:
          "War Room plans a quiet counter-move against the rival's pipeline. The hit lands on them, not on {guildName}.",
        consequenceSummary: "Loyalty steadies, rival leverage cut back, intel gained.",
        requiredOperationalRoomTemplateIds: ["room/war_room:tier_1"],
        effects: [
          { kind: "loyalty_delta", targetRef: "subject_a", value: 8 },
          {
            kind: "faction_scrutiny_delta",
            targetRef: "faction:faction/rival-guild-market",
            value: -10,
          },
          {
            kind: "faction_standing_delta",
            targetRef: "faction:faction/rival-guild-market",
            value: -6,
          },
          { kind: "intel_delta", targetRef: "guild", value: 6 },
        ],
      },
      {
        choiceId: "match_the_offer",
        label: "Match the Offer",
        description:
          "Pay whatever the rival is paying, plus a little more. {operator_a} stays, but the budget line bleeds.",
        consequenceSummary: "Treasury hit, loyalty shore-up, rival unimpeded.",
        effects: [
          { kind: "treasury_delta", targetRef: "guild", value: -160 },
          { kind: "loyalty_delta", targetRef: "subject_a", value: 5 },
        ],
      },
      {
        choiceId: "let_them_walk",
        label: "Let Them Walk",
        description:
          "If the offer is that good, matching it only buys more of the same later. Accept the loss and plan around it.",
        consequenceSummary: "Loyalty collapses, departure risk spikes, rival leverage surges.",
        effects: [
          { kind: "loyalty_delta", targetRef: "subject_a", value: -10 },
          { kind: "departure_risk", targetRef: "subject_a", value: 30 },
          {
            kind: "faction_standing_delta",
            targetRef: "faction:faction/rival-guild-market",
            value: -4,
          },
        ],
      },
    ],
  },
  {
    id: "incident/borough-contracts-hearing",
    name: "Borough Contracts Hearing",
    category: "borough_hearing",
    tags: ["skyscraper", "borough", "hearing", "faction"],
    weight: 18,
    triggerFamily: "district_fallout",
    pressureTags: ["pressure:regulatory", "pressure:reputation", "pressure:exposure"],
    pressureThreshold: 50,
    requiredContext: ["faction"],
    cooldownMinutes: 2880,
    noveltyWeight: 1.0,
    briefingTemplate:
      "The Borough Contracts Authority has scheduled a review hearing on {guildName}'s recent work. The Compliance Office has kept the paperwork clean — a plea deal is on the table if the room is open for one.",
    requiredBuildingIds: ["building/skyscraper"],
    preferredRoomTemplateIds: ["room/compliance_office:tier_1"],
    fixedFactionId: "faction/borough-contracts",
    choices: [
      {
        choiceId: "full_hearing",
        label: "Sit Through the Full Hearing",
        description:
          "Face the panel. Answer the questions. Let the record speak for itself — win or lose.",
        consequenceSummary: "Standing recovers if clean, reputation holds steady.",
        effects: [
          {
            kind: "faction_standing_delta",
            targetRef: "faction:faction/borough-contracts",
            value: 8,
          },
          {
            kind: "faction_scrutiny_delta",
            targetRef: "faction:faction/borough-contracts",
            value: -6,
          },
        ],
      },
      {
        choiceId: "compliance_plea_deal",
        label: "Take the Plea Deal",
        description:
          "Compliance Office negotiates down to a consent decree. Quiet fee, quiet record, no public testimony.",
        consequenceSummary: "Cash hit, scrutiny eased, standing mostly preserved.",
        requiredOperationalRoomTemplateIds: ["room/compliance_office:tier_1"],
        effects: [
          { kind: "treasury_delta", targetRef: "guild", value: -140 },
          {
            kind: "faction_scrutiny_delta",
            targetRef: "faction:faction/borough-contracts",
            value: -12,
          },
          {
            kind: "faction_standing_delta",
            targetRef: "faction:faction/borough-contracts",
            value: 2,
          },
        ],
      },
      {
        choiceId: "skip_the_hearing",
        label: "Skip the Hearing",
        description:
          "Send a lawyer with a written response. The board notes the absence. So does the press.",
        consequenceSummary: "Standing drops, reputation falls, scrutiny climbs.",
        effects: [
          {
            kind: "faction_standing_delta",
            targetRef: "faction:faction/borough-contracts",
            value: -12,
          },
          {
            kind: "faction_scrutiny_delta",
            targetRef: "faction:faction/borough-contracts",
            value: 10,
          },
          { kind: "reputation_delta", targetRef: "guild", value: -3 },
        ],
      },
    ],
  },
  {
    id: "incident/press-exposure-story",
    name: "Press Exposure Story",
    category: "regulatory_scrutiny",
    tags: ["skyscraper", "press", "exposure", "faction"],
    weight: 20,
    triggerFamily: "faction_pressure",
    pressureTags: ["pressure:exposure", "pressure:reputation"],
    pressureThreshold: 45,
    requiredContext: ["faction"],
    cooldownMinutes: 2160,
    noveltyWeight: 1.15,
    briefingTemplate:
      "A city desk reporter is running a story about {guildName}'s rise into the tower. Standard exposure piece — some flattering, some not. The framing is negotiable. The regulators read the paper.",
    requiredBuildingIds: ["building/skyscraper"],
    preferredRoomTemplateIds: ["room/executive_office:tier_1"],
    fixedFactionId: "faction/city-licensing",
    choices: [
      {
        choiceId: "go_on_the_record",
        label: "Go On the Record",
        description:
          "Sit for the interview in the Executive Office. Reputation climbs on a positive framing, but the Licensing Bureau starts paying closer attention.",
        consequenceSummary: "Reputation lift, regulatory scrutiny climbs.",
        effects: [
          { kind: "reputation_delta", targetRef: "guild", value: 6 },
          {
            kind: "faction_scrutiny_delta",
            targetRef: "faction:faction/city-licensing",
            value: 10,
          },
        ],
      },
      {
        choiceId: "off_the_record_background",
        label: "Off-the-Record Background",
        description:
          "Quiet background briefing, no quotes. The story still runs, but the tone is neutral. Standing with the sponsor lifts for handling it professionally.",
        consequenceSummary: "Standing lifts with the sponsor, scrutiny and reputation hold.",
        effects: [
          {
            kind: "faction_standing_delta",
            targetRef: "faction:faction/borough-contracts",
            value: 6,
          },
          {
            kind: "faction_scrutiny_delta",
            targetRef: "faction:faction/city-licensing",
            value: 3,
          },
        ],
      },
      {
        choiceId: "decline_comment",
        label: "Decline to Comment",
        description:
          "No interview, no background. The story runs anyway, framed by the reporter's assumptions. Reputation takes a hit. Scrutiny stays flat.",
        consequenceSummary: "Reputation falls, standing dips across regulators.",
        effects: [
          { kind: "reputation_delta", targetRef: "guild", value: -5 },
          {
            kind: "faction_standing_delta",
            targetRef: "faction:faction/city-licensing",
            value: -4,
          },
        ],
      },
    ],
  },
];

export function validateIncidentTemplates(
  registry: Pick<TemplateRegistry, "buildingById" | "roomById" | "presenterById" | "factionById">,
): void {
  const issues: string[] = [];

  INCIDENT_TEMPLATES.forEach((template) => {
    template.requiredBuildingIds?.forEach((buildingId) => {
      if (!registry.buildingById.has(buildingId)) {
        issues.push(`${template.id} references unknown building "${buildingId}".`);
      }
    });

    template.preferredRoomTemplateIds?.forEach((roomTemplateId) => {
      if (!registry.roomById.has(roomTemplateId)) {
        issues.push(`${template.id} references unknown room template "${roomTemplateId}".`);
      }
    });

    if (template.fixedFactionId && !registry.factionById.has(template.fixedFactionId)) {
      issues.push(`${template.id} references unknown fixed faction "${template.fixedFactionId}".`);
    }

    if (template.presenterId && !registry.presenterById.has(template.presenterId)) {
      issues.push(`${template.id} references unknown presenter "${template.presenterId}".`);
    }

    template.choices.forEach((choice) => {
      choice.requiredOperationalRoomTemplateIds?.forEach((roomTemplateId) => {
        if (!registry.roomById.has(roomTemplateId)) {
          issues.push(
            `${template.id}:${choice.choiceId} references unknown required room "${roomTemplateId}".`,
          );
        }
      });

      choice.effects.forEach((effect) => {
        if (effect.targetRef === "subject_a" && !template.requiredContext.includes("operator_a")) {
          issues.push(
            `${template.id}:${choice.choiceId} targets subject_a without requiring operator_a.`,
          );
        }
        if (effect.targetRef === "subject_b" && !template.requiredContext.includes("operator_b")) {
          issues.push(
            `${template.id}:${choice.choiceId} targets subject_b without requiring operator_b.`,
          );
        }
        if (effect.targetRef === "room" && !template.requiredContext.includes("room")) {
          issues.push(`${template.id}:${choice.choiceId} targets room without requiring room.`);
        }
        if (typeof effect.targetRef === "string" && effect.targetRef.startsWith("faction:")) {
          const factionId = effect.targetRef.slice("faction:".length);
          if (!registry.factionById.has(factionId)) {
            issues.push(
              `${template.id}:${choice.choiceId} references unknown faction "${factionId}".`,
            );
          }
          if (
            effect.kind !== "faction_standing_delta" &&
            effect.kind !== "faction_scrutiny_delta"
          ) {
            issues.push(
              `${template.id}:${choice.choiceId} targets faction but uses non-faction kind "${effect.kind}".`,
            );
          }
        }
        if (
          (effect.kind === "faction_standing_delta" || effect.kind === "faction_scrutiny_delta") &&
          !(typeof effect.targetRef === "string" && effect.targetRef.startsWith("faction:"))
        ) {
          issues.push(
            `${template.id}:${choice.choiceId} uses ${effect.kind} with non-faction targetRef "${effect.targetRef}".`,
          );
        }
      });
    });
  });

  if (issues.length > 0) {
    throw new Error(`Incident template validation failed.\n${issues.join("\n")}`);
  }
}

// ── Incident evaluation and binding ──────────────────────────────────────

const EVALUATION_INTERVAL_MINUTES = 120;

interface IncidentSelectionOptions {
  allowedCategories?: readonly string[];
  ignorePressureThreshold?: boolean;
  ignoreCooldowns?: boolean;
  ignoreRecentFamilyLimit?: boolean;
  seedKey?: string;
}

export function shouldEvaluateIncidents(state: IncidentState, currentMinute: number): boolean {
  if (state.pendingIncident !== null) return false;
  return currentMinute - state.lastEvaluationMinute >= EVALUATION_INTERVAL_MINUTES;
}

export function isOpeningFirstIncidentSequenceActive(context: SimSystemContext): boolean {
  const guidanceState = context.runtimeState.guidanceState;
  return (
    guidanceState.openingPathState === "active" &&
    !guidanceState.completedBeatIds.includes(OPENING_INCIDENT_LEARNED_BEAT_ID)
  );
}

export function isOpeningIncidentMercyWindowActive(context: SimSystemContext): boolean {
  const guidanceState = context.runtimeState.guidanceState;

  // Hard gate: mercy window always covers the first 3 contracts regardless
  // of guidance beat progression.
  const securedContracts = guidanceState.openingTiming?.securedContractCount ?? 0;
  if (securedContracts <= 3) {
    return true;
  }

  return isOpeningFirstIncidentSequenceActive(context);
}

function getActiveBuildingId(context: SimSystemContext): string | null {
  const buildingEntity = context.singletonEntities.building;
  const template =
    context.registry.buildings[BuildingAuthority.activeBuildingTemplateIndex[buildingEntity]];
  return template?.id ?? null;
}

function findEligibleIncidentRoomEntity(
  context: SimSystemContext,
  template: IncidentTemplate,
): number | undefined {
  const preferredTemplateIds = new Set(template.preferredRoomTemplateIds ?? []);

  return context.runtimeState.roomEntities.find((entity) => {
    if (RoomInstance.isOperational[entity] !== 1) {
      return false;
    }

    if (preferredTemplateIds.size === 0) {
      return true;
    }

    const roomTemplate = context.registry.rooms[RoomInstance.templateIndex[entity]];
    return roomTemplate ? preferredTemplateIds.has(roomTemplate.id) : false;
  });
}

function hasRequiredIncidentContext(
  context: SimSystemContext,
  template: IncidentTemplate,
): boolean {
  const activeOperators = context.runtimeState.operatorEntities.filter(
    (entity) => OperatorIdentity.lifecycleStatus[entity] === "active",
  );

  if (template.requiredContext.includes("operator_a") && activeOperators.length < 1) {
    return false;
  }

  if (template.requiredContext.includes("operator_b") && activeOperators.length < 2) {
    return false;
  }

  if (
    template.requiredContext.includes("room") &&
    findEligibleIncidentRoomEntity(context, template) === undefined
  ) {
    return false;
  }

  if (template.requiredContext.includes("district")) {
    const cityState = context.runtimeState.cityState;
    if (!cityState) return false;
    const contractSite = BuildingAuthority.contractSite[context.singletonEntities.building];
    const hasDistrict =
      contractSite?.districtId || Object.values(cityState.districts).some((d) => d.attention > 0);
    if (!hasDistrict) return false;
  }

  if (template.requiredContext.includes("faction")) {
    const cityState = context.runtimeState.cityState;
    if (!cityState) return false;
    const contractSite = BuildingAuthority.contractSite[context.singletonEntities.building];
    const hasFaction =
      contractSite?.sponsorFactionId ||
      Object.values(cityState.factions).some((f) => f.scrutiny > 0);
    if (!hasFaction) return false;
  }

  if (template.requiredContext.includes("contract_site")) {
    const contractSite = BuildingAuthority.contractSite[context.singletonEntities.building];
    if (!contractSite?.contractSiteId) return false;
  }

  if (template.requiredContext.includes("team")) {
    if (activeOperators.length < 2) return false;
    const hasTeam = context.runtimeState.recurringTeamEntities.length > 0;
    if (!hasTeam) return false;
  }

  return true;
}

function buildEligibleIncidentTemplates(
  context: SimSystemContext,
  state: IncidentState,
  currentMinute: number,
  pressure: number,
  options: IncidentSelectionOptions,
): IncidentTemplate[] {
  const mercyWindowActive = isOpeningIncidentMercyWindowActive(context);
  const activeBuildingId = getActiveBuildingId(context);
  const recentFamilyCounts = new Map<string, number>();
  if (!options.ignoreRecentFamilyLimit) {
    for (const historyEntry of state.history) {
      if (currentMinute - historyEntry.resolvedAtMinute >= 480) {
        continue;
      }
      recentFamilyCounts.set(
        historyEntry.triggerFamily,
        (recentFamilyCounts.get(historyEntry.triggerFamily) ?? 0) + 1,
      );
    }
  }
  return INCIDENT_TEMPLATES.filter((template) => {
    if (mercyWindowActive && !OPENING_SAFE_INCIDENT_CATEGORY_SET.has(template.category)) {
      return false;
    }
    if (
      template.requiredBuildingIds &&
      (activeBuildingId === null || !template.requiredBuildingIds.includes(activeBuildingId))
    ) {
      return false;
    }
    if (!hasRequiredIncidentContext(context, template)) {
      return false;
    }
    if (options.allowedCategories && !options.allowedCategories.includes(template.category)) {
      return false;
    }
    if (!options.ignorePressureThreshold && pressure < template.pressureThreshold) return false;
    if (!options.ignoreCooldowns && isIncidentOnCooldown(state, template, currentMinute)) {
      return false;
    }
    if (!options.ignoreRecentFamilyLimit) {
      const recentCount = recentFamilyCounts.get(template.triggerFamily) ?? 0;
      if (recentCount >= 2) return false;
    }
    if (getAvailableIncidentChoices(context, template).length === 0) {
      return false;
    }
    return true;
  });
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

export function computeIncidentTemplateSelectionWeight(
  context: SimSystemContext,
  template: IncidentTemplate,
): number {
  let weight = template.weight * template.noveltyWeight;
  const complianceOperational = hasOperationalRoomTemplate(
    context,
    SKYSCRAPER_COMPLIANCE_OFFICE_TEMPLATE_ID,
  );
  if (complianceOperational && SCANDAL_INCIDENT_CATEGORIES.has(template.category)) {
    weight *= COMPLIANCE_OFFICE_SCANDAL_WEIGHT_MULTIPLIER;
  }
  if (template.preferredRoomTemplateIds?.some((id) => hasOperationalRoomTemplate(context, id))) {
    weight *= PREFERRED_ROOM_WEIGHT_MULTIPLIER;
  }
  return weight;
}

export function selectIncidentCandidate(
  context: SimSystemContext,
  state: IncidentState,
  currentMinute: number,
  pressure: number,
  options: IncidentSelectionOptions = {},
): PendingIncident | null {
  const eligible = buildEligibleIncidentTemplates(context, state, currentMinute, pressure, options);

  if (eligible.length === 0) return null;

  const rng = new SeededRng(
    seedFromSimulationKey(context, options.seedKey ?? `incident:${currentMinute}`),
  );
  const weighted: WeightedItem<IncidentTemplate>[] = eligible.map((t) => ({
    item: t,
    weight: computeIncidentTemplateSelectionWeight(context, t),
  }));

  const result = weightedChoice(rng, weighted);
  const template = result.outcome;
  const availableChoices = getAvailableIncidentChoices(context, template);

  // Bind concrete subjects
  const boundContext = bindIncidentSubjects(context, template);

  const incident: PendingIncident = {
    instanceId: `incident-${state.nextInstanceId++}`,
    templateId: template.id,
    templateName: template.name,
    category: template.category,
    tags: [...template.tags],
    triggerFamily: template.triggerFamily,
    boundContext,
    choices: availableChoices,
    presenterId: template.presenterId,
    presenterExpression: template.presenterExpression,
    createdAtMinute: currentMinute,
  };

  return incident;
}

export function forceSeedOpeningIncident(
  context: SimSystemContext,
  state: IncidentState,
  currentMinute: number,
): PendingIncident | null {
  return selectIncidentCandidate(context, state, currentMinute, 0, {
    allowedCategories: OPENING_FORCE_SEED_INCIDENT_CATEGORIES,
    ignorePressureThreshold: true,
    ignoreCooldowns: true,
    ignoreRecentFamilyLimit: true,
    seedKey: `opening-incident:${currentMinute}:${state.nextInstanceId}`,
  });
}

function buildOperatorNameMap(context: SimSystemContext): Record<string, string> {
  const operatorNames: Record<string, string> = {};
  for (const entity of context.runtimeState.operatorEntities) {
    operatorNames[OperatorIdentity.id[entity]] = OperatorIdentity.name[entity];
  }
  return operatorNames;
}

function buildRoomNameMap(context: SimSystemContext): Record<string, string> {
  const roomNames: Record<string, string> = {};
  for (const entity of context.runtimeState.roomEntities) {
    const roomId = RoomInstance.id[entity];
    const roomTemplate = context.registry.rooms[RoomInstance.templateIndex[entity]];
    if (roomId && roomTemplate) {
      roomNames[roomId] = roomTemplate.name;
    }
  }
  return roomNames;
}

function buildDistrictNameMap(context: SimSystemContext): Record<string, string> {
  const districtNames: Record<string, string> = {};
  for (const template of context.registry.districts) {
    districtNames[template.id] = template.name;
  }
  return districtNames;
}

function buildFactionNameMap(context: SimSystemContext): Record<string, string> {
  const factionNames: Record<string, string> = {};
  for (const template of context.registry.factions) {
    factionNames[template.id] = template.name;
  }
  return factionNames;
}

function hasIncidentInterruptionForInstance(
  context: SimSystemContext,
  incidentInstanceId: string,
): boolean {
  const active = context.runtimeState.interruptionQueue.active;
  if (
    active?.payload.kind === "incident" &&
    active.payload.incidentInstanceId === incidentInstanceId
  ) {
    return true;
  }

  return context.runtimeState.interruptionQueue.queue.some(
    (instance) =>
      instance.payload.kind === "incident" &&
      instance.payload.incidentInstanceId === incidentInstanceId,
  );
}

export function queueIncident(
  context: SimSystemContext,
  state: IncidentState,
  incident: PendingIncident,
  sourceSystem: string,
): boolean {
  if (state.pendingIncident !== null) {
    return false;
  }

  const template = INCIDENT_TEMPLATES.find((entry) => entry.id === incident.templateId);
  if (!template) {
    return false;
  }

  const currentMinute = getCurrentAbsoluteMinute(context);
  state.pendingIncident = incident;
  state.lastEvaluationMinute = currentMinute;

  if (context.runtimeState.deferIncidentPresentation) {
    return true;
  }

  return materializePendingIncident(context, state, sourceSystem);
}

export function materializePendingIncident(
  context: SimSystemContext,
  state: IncidentState,
  sourceSystem: string,
  presentation?: IncidentPresentationOverride,
): boolean {
  const incident = state.pendingIncident;
  if (!incident) {
    return false;
  }

  if (hasIncidentInterruptionForInstance(context, incident.instanceId)) {
    return false;
  }

  const template = INCIDENT_TEMPLATES.find((entry) => entry.id === incident.templateId);
  if (!template) {
    return false;
  }

  const currentMinute = getCurrentAbsoluteMinute(context);
  const payload = createIncidentInterruptionPayload(
    incident,
    template,
    buildOperatorNameMap(context),
    buildRoomNameMap(context),
    presentation,
    buildDistrictNameMap(context),
    buildFactionNameMap(context),
  );
  const subjectSummary = payload.subjectSummary.trim();
  const subjectSuffix = subjectSummary.length > 0 ? ` (${subjectSummary})` : "";

  context.runtimeState.pendingCueIds.push("event.incident.open");
  pushRuntimeEvent(context, {
    kind: "event_change",
    message: `Incident: ${payload.title}${subjectSuffix} requires attention.`,
    accent: "ember",
  });

  enqueueInterruption(
    context.runtimeState.interruptionQueue,
    "incident",
    payload,
    sourceSystem,
    currentMinute,
  );
  return true;
}

function bindIncidentSubjects(
  context: SimSystemContext,
  template: IncidentTemplate,
): IncidentBoundContext {
  const operatorIds: string[] = [];
  let roomId: string | undefined;
  let districtId: string | undefined;
  let factionId: string | undefined;
  let contractSiteId: string | undefined;
  let teamId: string | undefined;
  const activeOperators = context.runtimeState.operatorEntities.filter(
    (e) => OperatorIdentity.lifecycleStatus[e] === "active",
  );

  if (template.requiredContext.includes("operator_a") && activeOperators.length > 0) {
    const rng = new SeededRng(
      seedFromSimulationKey(
        context,
        `bind:${template.id}:${context.runtimeState.nextOperatorSequence}`,
      ),
    );
    const idx = rng.int(0, activeOperators.length - 1);
    operatorIds.push(OperatorIdentity.id[activeOperators[idx]]);
  }
  if (template.requiredContext.includes("operator_b") && activeOperators.length > 1) {
    const rng = new SeededRng(
      seedFromSimulationKey(
        context,
        `bind-b:${template.id}:${context.runtimeState.nextOperatorSequence}`,
      ),
    );
    let idx = rng.int(0, activeOperators.length - 1);
    const firstId = operatorIds[0];
    while (OperatorIdentity.id[activeOperators[idx]] === firstId && activeOperators.length > 1) {
      idx = (idx + 1) % activeOperators.length;
    }
    operatorIds.push(OperatorIdentity.id[activeOperators[idx]]);
  }

  if (template.requiredContext.includes("room")) {
    const roomEntity = findEligibleIncidentRoomEntity(context, template);
    if (roomEntity !== undefined) {
      roomId = RoomInstance.id[roomEntity];
    }
  }

  // Bind district from active contract site or highest-attention district
  if (template.requiredContext.includes("district")) {
    const contractSite = BuildingAuthority.contractSite[context.singletonEntities.building];
    if (contractSite?.districtId) {
      districtId = contractSite.districtId;
    } else if (context.runtimeState.cityState) {
      const districts = Object.values(context.runtimeState.cityState.districts);
      const highest = districts.reduce<(typeof districts)[0] | undefined>(
        (best, d) => (!best || d.attention > best.attention ? d : best),
        undefined,
      );
      districtId = highest?.districtId;
    }
  }

  // Bind faction from active contract sponsor or highest-scrutiny faction
  if (template.requiredContext.includes("faction")) {
    if (template.fixedFactionId) {
      factionId = template.fixedFactionId;
    } else {
      const contractSite = BuildingAuthority.contractSite[context.singletonEntities.building];
      if (contractSite?.sponsorFactionId) {
        factionId = contractSite.sponsorFactionId;
      } else if (context.runtimeState.cityState) {
        const factions = Object.values(context.runtimeState.cityState.factions);
        const highest = factions.reduce<(typeof factions)[0] | undefined>(
          (best, f) => (!best || f.scrutiny > best.scrutiny ? f : best),
          undefined,
        );
        factionId = highest?.factionId;
      }
    }
  }

  // Bind contract site from active contract
  if (template.requiredContext.includes("contract_site")) {
    const contractSite = BuildingAuthority.contractSite[context.singletonEntities.building];
    if (contractSite?.contractSiteId) {
      contractSiteId = contractSite.contractSiteId;
    }
  }

  // Bind team from recurring teams with bound operators
  if (template.requiredContext.includes("team") && operatorIds.length >= 2) {
    const teamEntity = findRecurringTeamForMembers(context, operatorIds);
    if (teamEntity !== undefined) {
      teamId = RecurringTeam.id[teamEntity];
    }
  }

  return {
    operatorIds,
    roomId,
    teamId,
    contractSiteId,
    districtId,
    factionId,
    bossId: undefined,
  };
}

function getAvailableIncidentChoices(
  context: SimSystemContext,
  template: IncidentTemplate,
): readonly IncidentChoice[] {
  return template.choices.filter((choice) => {
    if (!choice.requiredOperationalRoomTemplateIds?.length) {
      return true;
    }

    return choice.requiredOperationalRoomTemplateIds.every((roomTemplateId) =>
      hasOperationalRoomTemplate(context, roomTemplateId),
    );
  });
}

// ── Incident resolution ──────────────────────────────────────────────────

export function resolveIncident(
  context: SimSystemContext,
  state: IncidentState,
  choiceId: string,
  payload?: IncidentPayload,
): boolean {
  if (!state.pendingIncident) return false;

  const incident = state.pendingIncident;
  const choice = incident.choices.find((c) => c.choiceId === choiceId);
  if (!choice) return false;
  const adjustedEffects = getAdjustedIncidentEffects(context, incident, choice.effects);

  // Apply consequence effects
  for (const effect of adjustedEffects) {
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

  const resolutionSummary = payload?.choices.find(
    (entry) => entry.choiceId === choiceId,
  )?.resolutionSummary;

  const netMorale = adjustedEffects.reduce(
    (sum, e) => sum + (e.kind === "morale_delta" ? e.value : 0),
    0,
  );
  const netReputation = adjustedEffects.reduce(
    (sum, e) => sum + (e.kind === "reputation_delta" ? e.value : 0),
    0,
  );

  // Apply room culture shift when incident has a bound room
  if (incident.boundContext.roomId) {
    const tone = netMorale > 0 ? "positive" : netMorale < -3 ? "negative" : "neutral";
    applyRoomCultureShiftFromIncident(context, incident.boundContext.roomId, tone);
  }

  // Apply scandal fallout for licensing/regulatory incidents with reputation loss
  if (SCANDAL_INCIDENT_CATEGORIES.has(incident.category) && netReputation < -2) {
    applySocialFalloutAfterScandal(context, netReputation <= -5 ? "major" : "minor");
  }

  // Apply district pressure writeback when district-bound incidents resolve
  if (incident.boundContext.districtId && context.runtimeState.cityState) {
    const district = context.runtimeState.cityState.districts[incident.boundContext.districtId];
    if (district) {
      if (netReputation > 0) {
        district.trust = clamp(district.trust + Math.round(netReputation * 0.5), 0, 100);
        district.attention = clamp(district.attention - Math.round(netReputation * 0.3), 0, 100);
        if (
          incident.category === "containment_demand" ||
          incident.category === "district_backlash"
        ) {
          applySocialRecoveryAfterDistrictWin(context);
        }
      } else if (netReputation < 0) {
        district.trust = clamp(district.trust + Math.round(netReputation * 0.4), 0, 100);
      }
    }
  }

  // Apply faction scrutiny adjustment when faction-bound incidents resolve
  if (incident.boundContext.factionId && context.runtimeState.cityState) {
    const faction = context.runtimeState.cityState.factions[incident.boundContext.factionId];
    if (faction) {
      if (netReputation > 0) {
        faction.scrutiny = clamp(faction.scrutiny - Math.round(netReputation * 0.3), 0, 100);
        faction.standing = clamp(faction.standing + Math.round(netReputation * 0.2), -100, 100);
      } else if (netReputation < 0) {
        faction.scrutiny = clamp(faction.scrutiny - Math.round(netReputation * 0.4), 0, 100);
      }
    }
  }

  // Emit event
  pushRuntimeEvent(context, {
    kind: "incident_resolved",
    message: resolutionSummary?.trim() || `Incident resolved: ${choice.label}`,
    accent: "info",
  });
  if (adjustedEffects !== choice.effects) {
    pushRuntimeEvent(context, {
      kind: "event_change",
      message: "The Back Office softened the compliance hit.",
      accent: "gold",
    });
  }

  state.pendingIncident = null;
  return true;
}

function getAdjustedIncidentEffects(
  context: SimSystemContext,
  incident: PendingIncident,
  effects: readonly ConsequenceEffect[],
): readonly ConsequenceEffect[] {
  if (
    incident.templateId !== "incident/compliance-audit" ||
    !hasOperationalRoomTemplate(context, BODEGA_BACK_OFFICE_TEMPLATE_ID)
  ) {
    return effects;
  }

  return effects.map((effect) => {
    if (
      (effect.kind === "treasury_delta" || effect.kind === "reputation_delta") &&
      effect.value < 0
    ) {
      return {
        ...effect,
        value: Math.ceil(effect.value * 0.6),
      };
    }

    return effect;
  });
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
    case "team_cohesion_delta": {
      // Apply to the recurring team that includes the bound operators
      const memberIds = incident.boundContext.operatorIds;
      if (memberIds.length >= 2) {
        const teamEntity = findRecurringTeamForMembers(context, memberIds);
        if (teamEntity !== undefined) {
          RecurringTeam.cohesion[teamEntity] = clamp(
            RecurringTeam.cohesion[teamEntity] + effect.value,
            0,
            100,
          );
          if (effect.value < 0 && RecurringTeam.cohesion[teamEntity] < 25) {
            RecurringTeam.damaged[teamEntity] = 1;
            RecurringTeam.damageReason[teamEntity] = "incident_fallout";
          }
        }
      }
      break;
    }
    case "injury_progression": {
      const targetId = resolveEffectTarget(incident, effect.targetRef);
      if (targetId) {
        const entity = context.runtimeState.operatorEntities.find(
          (e) => OperatorIdentity.id[e] === targetId,
        );
        if (entity !== undefined) {
          InjuryState.severity[entity] = clamp(InjuryState.severity[entity] + effect.value, 0, 100);
          if (effect.value > 0) {
            InjuryState.recoveryHoursRemaining[entity] = Math.max(
              InjuryState.recoveryHoursRemaining[entity],
              effect.value * 0.8,
            );
          }
        }
      }
      break;
    }
    case "departure_risk": {
      const targetId = resolveEffectTarget(incident, effect.targetRef);
      if (targetId) {
        const entity = context.runtimeState.operatorEntities.find(
          (e) => OperatorIdentity.id[e] === targetId,
        );
        if (entity !== undefined) {
          // Departure risk translates to loyalty erosion and grievance increase
          const loyaltyDrain = Math.round(effect.value * 0.3);
          LoyaltyState.current[entity] = clamp(LoyaltyState.current[entity] - loyaltyDrain, 0, 100);
          const dispositionEntity = ensureOperatorDispositionEntity(context, targetId);
          if (dispositionEntity !== undefined) {
            OperatorDisposition.grievanceLevel[dispositionEntity] = clamp(
              OperatorDisposition.grievanceLevel[dispositionEntity] +
                Math.round(effect.value * 0.4),
              0,
              100,
            );
            OperatorDisposition.satisfactionLevel[dispositionEntity] = clamp(
              OperatorDisposition.satisfactionLevel[dispositionEntity] -
                Math.round(effect.value * 0.2),
              0,
              100,
            );
          }
        }
      }
      break;
    }
    case "contract_pressure_delta": {
      // Only write to pressureModifier; BuildingAuthority.pressure is recomputed
      // every tick by advanceEventPressureSystem via computePressure(), which
      // already incorporates incidentPressureModifier / 5.
      context.runtimeState.incidentState.pressureModifier = clamp(
        context.runtimeState.incidentState.pressureModifier + effect.value,
        -40,
        40,
      );
      if (incident.boundContext.districtId && context.runtimeState.cityState) {
        const district = context.runtimeState.cityState.districts[incident.boundContext.districtId];
        if (district) {
          district.attention = clamp(district.attention + Math.round(effect.value * 0.5), 0, 100);
        }
      }
      if (incident.boundContext.factionId && context.runtimeState.cityState) {
        const faction = context.runtimeState.cityState.factions[incident.boundContext.factionId];
        if (faction) {
          faction.scrutiny = clamp(faction.scrutiny + Math.round(effect.value * 0.3), 0, 100);
        }
      }
      break;
    }
    case "faction_standing_delta": {
      const cityState = context.runtimeState.cityState;
      if (!cityState) break;
      const factionId = resolveFactionTarget(effect.targetRef);
      if (factionId) {
        applyFactionStandingDelta(cityState, factionId, effect.value);
      }
      break;
    }
    case "faction_scrutiny_delta": {
      const cityState = context.runtimeState.cityState;
      if (!cityState) break;
      const factionId = resolveFactionTarget(effect.targetRef);
      if (factionId) {
        applyFactionScrutinyDelta(cityState, factionId, effect.value);
      }
      break;
    }
    default:
      break;
  }
}

function resolveFactionTarget(targetRef: ConsequenceEffect["targetRef"]): string | undefined {
  if (typeof targetRef === "string" && targetRef.startsWith("faction:")) {
    return targetRef.slice("faction:".length);
  }
  return undefined;
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
    presenterId: MARA_PRESENTER_ID,
    presenterExpression: "serious",
  };
}

function getDefaultIncidentPresenterExpression(template: IncidentTemplate): string | undefined {
  switch (template.category) {
    case "morale_surge":
    case "contract_opportunity":
      return "amused";
    case "injury_setback":
    case "kitchen_quality":
      return "concerned";
    default:
      return "serious";
  }
}

export function createIncidentInterruptionPayload(
  incident: PendingIncident,
  template: IncidentTemplate,
  operatorNames: Record<string, string>,
  roomNames: Record<string, string> = {},
  presentation?: IncidentPresentationOverride,
  districtNames: Record<string, string> = {},
  factionNames: Record<string, string> = {},
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
  if (incident.boundContext.roomId) {
    const roomName = roomNames[incident.boundContext.roomId] ?? "the room";
    briefing = briefing.replace("{room}", roomName);
  }
  if (incident.boundContext.districtId) {
    const districtName = districtNames[incident.boundContext.districtId] ?? "the district";
    briefing = briefing.replace("{district}", districtName);
  }
  if (incident.boundContext.factionId) {
    const factionName = factionNames[incident.boundContext.factionId] ?? "the faction";
    briefing = briefing.replace("{faction}", factionName);
  }

  const choiceViews: IncidentChoiceView[] = incident.choices.map((c) => ({
    choiceId: c.choiceId,
    label: c.label,
    description: c.description,
    consequenceSummary: c.consequenceSummary,
  }));
  const subjectSummaryParts = incident.boundContext.operatorIds.map(
    (operatorId) => operatorNames[operatorId] ?? operatorId,
  );
  if (incident.boundContext.roomId && roomNames[incident.boundContext.roomId]) {
    subjectSummaryParts.push(roomNames[incident.boundContext.roomId]);
  }
  if (incident.boundContext.districtId && districtNames[incident.boundContext.districtId]) {
    subjectSummaryParts.push(districtNames[incident.boundContext.districtId]);
  }
  if (incident.boundContext.factionId && factionNames[incident.boundContext.factionId]) {
    subjectSummaryParts.push(factionNames[incident.boundContext.factionId]);
  }
  const subjectSummary = subjectSummaryParts.join(", ");
  const mergedChoices =
    presentation?.choices?.map((choice) => ({
      choiceId: choice.choiceId,
      label: choice.label,
      description: choice.description,
      consequenceSummary: choice.consequenceSummary,
      ...(choice.resolutionSummary ? { resolutionSummary: choice.resolutionSummary } : {}),
    })) ?? choiceViews;

  return {
    kind: "incident",
    incidentInstanceId: incident.instanceId,
    templateId: incident.templateId,
    category: template.category,
    title: presentation?.title?.trim() || template.name,
    briefing: presentation?.briefing?.trim() || briefing,
    subjectSummary: presentation?.subjectSummary?.trim() || subjectSummary,
    choices: mergedChoices,
    boundContext: incident.boundContext,
    presenterId: template.presenterId ?? MARA_PRESENTER_ID,
    presenterExpression:
      template.presenterExpression ?? getDefaultIncidentPresenterExpression(template),
    copySource: presentation?.copySource ?? "authored",
  };
}

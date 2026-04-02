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
import {
  BuildingAuthority,
  GuildState,
  MoraleState,
  LoyaltyState,
  OperatorIdentity,
  RoomInstance,
  WorldTimeState,
} from "../components";
import {
  BODEGA_BACK_OFFICE_TEMPLATE_ID,
  getCurrentAbsoluteMinute,
  hasStaffedOperationalRoomTemplate,
  pushRuntimeEvent,
} from "./commands";
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
  requiredBuildingIds?: readonly string[];
  preferredRoomTemplateIds?: readonly string[];
  presenterId?: string;
  presenterExpression?: string;
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

const OPENING_INCIDENT_LEARNED_BEAT_ID = "guidance/opening/first-incident";
const ASSISTANT_PRESENTER_ID = "presenter/assistant";
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
    requiredContext: ["room"],
    requiredBuildingIds: ["building/bodega"],
    cooldownMinutes: 600,
    noveltyWeight: 1.3,
    briefingTemplate:
      "The coffee machine finally died. Foot traffic is already down and the operators are giving you looks. The nearest wholesale place has a refurbished unit, but it is not cheap.",
    presenterId: ASSISTANT_PRESENTER_ID,
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
    presenterId: ASSISTANT_PRESENTER_ID,
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
    presenterId: ASSISTANT_PRESENTER_ID,
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
    presenterId: ASSISTANT_PRESENTER_ID,
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
    requiredContext: ["room"],
    requiredBuildingIds: ["building/bodega"],
    cooldownMinutes: 1440,
    noveltyWeight: 1.4,
    briefingTemplate:
      "The AC is dead and it is 94 degrees outside. The dining area smells like sweat and old sandwiches. Two operators are refusing to eat in there.",
    presenterId: ASSISTANT_PRESENTER_ID,
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
    requiredContext: [],
    requiredBuildingIds: ["building/bodega"],
    cooldownMinutes: 2880,
    noveltyWeight: 1.6,
    briefingTemplate:
      "A stray cat has taken up residence behind the counter. The operators have named it. The neighbors are feeding it. Aina says it is technically a health code violation but nobody seems to care.",
    presenterId: ASSISTANT_PRESENTER_ID,
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
    requiredContext: [],
    requiredBuildingIds: ["building/bodega"],
    cooldownMinutes: 480,
    noveltyWeight: 1.1,
    briefingTemplate:
      "The supply delivery got mixed up with the bodega's grocery order. Half the field kit is missing and there are six cases of energy drinks nobody ordered sitting in the supply closet.",
    presenterId: ASSISTANT_PRESENTER_ID,
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
    presenterId: ASSISTANT_PRESENTER_ID,
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
    presenterId: ASSISTANT_PRESENTER_ID,
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
    requiredContext: [],
    requiredBuildingIds: ["building/bodega"],
    cooldownMinutes: 2880,
    noveltyWeight: 1.5,
    briefingTemplate:
      "The whole block lost power. The bodega is running on phone flashlights and whatever sunlight comes through the front window. The supply closet refrigeration is off. Con Ed says four to six hours.",
    presenterId: ASSISTANT_PRESENTER_ID,
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
];

export function validateIncidentTemplates(
  registry: Pick<TemplateRegistry, "buildingById" | "roomById" | "presenterById">,
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

    if (template.presenterId && !registry.presenterById.has(template.presenterId)) {
      issues.push(`${template.id} references unknown presenter "${template.presenterId}".`);
    }
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

  const payload = createIncidentInterruptionPayload(
    incident,
    template,
    buildOperatorNameMap(context),
    buildRoomNameMap(context),
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
  const activeOperators = context.runtimeState.operatorEntities.filter(
    (e) => OperatorIdentity.lifecycleStatus[e] === "active",
  );

  if (template.requiredContext.includes("operator_a") && activeOperators.length > 0) {
    // Pick the operator with lowest morale for conflict/negative incidents
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

  return {
    operatorIds,
    roomId,
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

  // Emit event
  pushRuntimeEvent(context, {
    kind: "incident_resolved",
    message: `Incident resolved: ${choice.label}`,
    timestamp: `Day ${WorldTimeState.day[context.singletonEntities.time]}`,
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
    !hasStaffedOperationalRoomTemplate(context, BODEGA_BACK_OFFICE_TEMPLATE_ID)
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
    presenterId: ASSISTANT_PRESENTER_ID,
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
  const subjectSummary = subjectSummaryParts.join(", ");

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
    presenterId: template.presenterId ?? ASSISTANT_PRESENTER_ID,
    presenterExpression:
      template.presenterExpression ?? getDefaultIncidentPresenterExpression(template),
  };
}

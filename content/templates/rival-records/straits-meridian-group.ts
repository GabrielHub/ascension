import type { RivalRecord } from "./schema";

export const straitsMeridianGroupRivalRecord = {
  id: "rival/straits-meridian-group",
  guildName: "Straits Meridian Group",
  shortDisplayName: "Straits Meridian",
  leader: {
    name: "Celeste Tan",
  },
  pressureLane: "sponsor-network",
  copy: {
    currentRivalOneLiner:
      "Celeste Tan has not yet bothered to learn your name. Her executive assistant probably has.",
  },
  assetPaths: {
    leaderPortrait: "/data/rivals/straits-meridian-group/leader-neutral.png",
    insignia: "/data/rivals/straits-meridian-group/insignia.png",
  },
  narrativeProfile: {
    operatingBase:
      "The 47th-floor NYC executive suite at 30 Hudson Yards. Glass walls with Hudson views, an ivory marble reception desk, a single fresh orchid arrangement replaced weekly, and a locked display cabinet of inherited Peranakan nyonyaware porcelain behind her executive assistant's station. Her heirloom Peranakan silver keris rests on a wall-mounted ivory-and-silver stand in her private office — clearly readable as a ceremonial object and also clearly sharpened. The active dispatch floor sits two levels below and is run by a separate operations director imported from the Jakarta office.",
    publicPitch:
      "Straits Meridian Group — Southeast Asia's institutional clearance standard, now serving New York.",
    pressureStyle:
      "Institutional sponsor-network and regulatory leverage, with a rarely-deployed A-rank principal held in reserve. They lose to you on outer-borough intelligence, ground-level relationships, and contracts beneath their attention threshold. They beat you on consulate backing, licensing-board familiarity, Fortune-500 sponsor retainers, high-end A-rank operator poaching they can fund with signing bonuses you cannot match, and prestige Manhattan corporate clearances that are effectively pre-awarded before public bid. Celeste herself taking the field is a tier-event escalation the branch keeps as a last resort.",
    rivalryFantasy:
      "You are beneath their notice until you force them to notice. Celeste has not yet heard your name; her executive assistant probably has, in a forwarded memo. The rivalry fantasy is a slow climb from 'not on their radar' through 'flagged as a minor irritant' to 'the principal finally takes your call personally' — and, at the outermost edge, the one-off escalation where an issue gets large enough that an A-rank attuned executive who has not worn field hardware in five years comes down to the site herself.",
    toneAndVoice:
      "Crisp Singapore English with Cambridge-polished consonants. Impeccably polite in form, professionally dismissive in substance. Speaks through her executive assistant by default — you rarely get her direct voice. When she does communicate directly it is courteous, brief, and final. Private Peranakan-Hokkien or Malay asides ('alamak,' 'lah') surface only in unguarded moments with staff. Never insults. The insult is in the delegation itself. Her physical presence carries a quiet latent-threat undertone — she moves like someone who is still an A-rank operator.",
  },
  moves: [
    {
      id: "rival-move/straits-meridian/scope-dismissal",
      family: "contract_challenge",
      weight: 9,
      cooldownMinutes: 1440,
      briefingTemplate:
        "Straits Meridian Group has informed the licensing board that your bid falls outside approved scope. Counsel will copy your office on the amended award notice.",
      basePublicPressureDelta: 6,
      baseIntensityDelta: 3,
      choices: [
        {
          choiceId: "fight-scope",
          label: "File a scope objection",
          description: "Counter the award notice. Force a board review.",
          consequenceSummary: "Treasury hit. Contract salvageable.",
          effects: [
            { kind: "treasury_delta", targetRef: "guild", value: -180 },
            { kind: "contract_pressure_delta", targetRef: "guild", value: -2 },
          ],
        },
        {
          choiceId: "accept-award",
          label: "Accept the amended notice",
          description: "Regroup. Contract is gone.",
          consequenceSummary: "Morale dips. No cost.",
          effects: [
            { kind: "morale_delta", targetRef: "team", value: -2 },
            { kind: "public_pressure_delta", targetRef: "guild", value: 2 },
          ],
        },
        {
          choiceId: "press-backlash",
          label: "Seed the press angle",
          description:
            "Leak the dismissal to dungeon-beat media. Force Celeste to respond on record.",
          consequenceSummary: "Intel cost. Reputation up.",
          effects: [
            { kind: "intel_delta", targetRef: "guild", value: -2 },
            { kind: "reputation_delta", targetRef: "guild", value: 2 },
          ],
        },
      ],
    },
    {
      id: "rival-move/straits-meridian/a-rank-poach",
      family: "recruitment_market_loss",
      weight: 7,
      cooldownMinutes: 2880,
      briefingTemplate:
        "An A-rank candidate you courted for six months has signed with Straits Meridian. Signing bonus and visa sponsorship attached. The Jakarta office is rotating her onto the Hudson Yards desk next month.",
      basePublicPressureDelta: 4,
      baseIntensityDelta: 3,
      choices: [
        {
          choiceId: "counter-bonus",
          label: "Counter the signing bonus",
          description: "Match the money. Hope the relationship is real.",
          consequenceSummary: "Treasury bleeds. Long odds.",
          effects: [
            { kind: "treasury_delta", targetRef: "guild", value: -220 },
            { kind: "loyalty_delta", targetRef: "team", value: 1 },
          ],
        },
        {
          choiceId: "accept-poach",
          label: "Accept the loss",
          description: "Pivot to B-rank hires you can actually retain.",
          consequenceSummary: "Team cohesion up. Morale dips.",
          effects: [
            { kind: "team_cohesion_delta", targetRef: "team", value: 1 },
            { kind: "morale_delta", targetRef: "team", value: -2 },
          ],
        },
      ],
    },
    {
      id: "rival-move/straits-meridian/delegation-dismissal",
      family: "public_comparison",
      weight: 6,
      cooldownMinutes: 2160,
      briefingTemplate:
        "Ms. Tan's calendar is full this week. Her assistant can follow up in writing by end of business Friday if a response remains necessary.",
      basePublicPressureDelta: 3,
      baseIntensityDelta: 2,
      choices: [
        {
          choiceId: "escalate-directly",
          label: "Force direct contact",
          description: "Show up at the Hudson Yards suite without an appointment.",
          consequenceSummary: "Reputation up. Intel cost.",
          effects: [
            { kind: "reputation_delta", targetRef: "guild", value: 2 },
            { kind: "intel_delta", targetRef: "guild", value: -2 },
          ],
        },
        {
          choiceId: "accept-delegation",
          label: "Accept the delegation chain",
          description: "Work through the assistant. Wait the week.",
          consequenceSummary: "Morale dips. Contract position holds.",
          effects: [
            { kind: "morale_delta", targetRef: "team", value: -1 },
            { kind: "contract_pressure_delta", targetRef: "guild", value: -1 },
          ],
        },
      ],
    },
  ],
} satisfies RivalRecord;

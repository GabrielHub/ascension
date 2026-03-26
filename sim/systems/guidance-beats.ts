import type { GuidanceBeat } from "./guidance";

const OPENING_BEATS_MUTABLE = [
  {
    id: "guidance/opening/contracts-board-intro",
    track: "opening",
    featureIds: ["contracts"],
    milestoneOrder: 1,
    delivery: {
      mode: "blocking",
      pauseWorld: true,
      allowSkip: false,
      replayPolicy: "manual_replay",
    },
    gating: {
      requiredCompletedBeatIds: [],
    },
    bindings: {},
    copy: {
      title: "Posted Contracts",
      subtitle: "Operations Briefing",
      body: "Boss doesn\u2019t pick fights. Boss picks contracts. The board shows government-cleared sites currently accepting guild bids. Each listing carries a filing cost, a threat estimate, and whatever intel the city bothered to share. Choose carefully \u2014 once you file, that site is yours until the job is done or the contract is pulled.",
      ctaLabel: "Understood",
      fallbackBody:
        "Boss doesn\u2019t pick fights. Boss picks contracts. The board shows government-cleared sites currently accepting guild bids. Each listing carries a filing cost, a threat estimate, and whatever intel the city bothered to share. Choose carefully \u2014 once you file, that site is yours until the job is done or the contract is pulled.",
      eventLogSummary: "Operations briefing: posted contracts explained",
    },
    completion: { kind: "acknowledged" },
  },
  {
    id: "guidance/opening/choose-first-contract",
    track: "opening",
    featureIds: ["contracts", "bidding"],
    milestoneOrder: 2,
    delivery: {
      mode: "focused",
      target: "ui/ops/contract-board",
      fallbackIntent: "ops/open-contract-board",
      pauseWorld: true,
      allowSkip: false,
      replayPolicy: "manual_replay",
    },
    gating: {
      requiredCompletedBeatIds: ["guidance/opening/contracts-board-intro"],
    },
    bindings: {},
    copy: {
      title: "Secure Your First Contract",
      subtitle: "One contract at a time",
      body: "The guild handles one government clearance contract at a time. Review the posted sites, check the filing cost and threat level, and bid on the job that fits the roster. The filing fee comes out of treasury \u2014 make sure you can afford it.",
      ctaLabel: "Select a contract",
      fallbackBody:
        "Open the contract board in the Operations tab and bid on a posted site to secure your first contract.",
      eventLogSummary: "Guidance: choose your first contract from the bidding board",
    },
    completion: { kind: "contract_secured" },
  },
  {
    id: "guidance/opening/event-log-and-world-view",
    track: "opening",
    featureIds: ["event-log", "world-view"],
    milestoneOrder: 3,
    delivery: {
      mode: "focused",
      target: "ui/shared/event-log",
      pauseWorld: true,
      allowSkip: false,
      replayPolicy: "manual_replay",
    },
    gating: {
      requiredCompletedBeatIds: ["guidance/opening/choose-first-contract"],
      requireFirstContractSecured: true,
    },
    bindings: {},
    copy: {
      title: "The Event Log",
      subtitle: "Always-on notice rail",
      body: "Everything that matters shows up here. Departures, injuries, returns, morale shifts, contract updates \u2014 the event log is the guild\u2019s running paper trail. The world view behind the panels is headquarters. Both stay visible while you work.",
      ctaLabel: "Got it",
      fallbackBody:
        "The event log sits on the right edge of the screen and records every significant change in the guild.",
      eventLogSummary: "Guidance: event log and world view introduced",
    },
    completion: {
      kind: "target_opened",
      targetAnchorId: "ui/shared/event-log",
    },
  },
  {
    id: "guidance/opening/roster-readiness",
    track: "opening",
    featureIds: ["roster", "operators"],
    milestoneOrder: 4,
    delivery: {
      mode: "focused",
      target: "ui/hq/category/roster",
      fallbackIntent: "hq/open-roster",
      pauseWorld: true,
      allowSkip: false,
      replayPolicy: "manual_replay",
    },
    gating: {
      requiredCompletedBeatIds: ["guidance/opening/event-log-and-world-view"],
    },
    bindings: {},
    copy: {
      title: "Roster Readiness",
      subtitle: "Know your people",
      body: "Every operator on the roster has health, morale, loyalty, and readiness state. Morale drops from overwork, bad outcomes, and neglect. Loyalty erodes when Boss ignores what people need. Operators who hit bottom leave \u2014 or worse, refuse dangerous work at the worst possible time. Check the roster before you send anyone into a rift.",
      ctaLabel: "Got it",
      fallbackBody:
        "Open the Roster category in the HQ tab to review your operators\u2019 readiness, morale, and loyalty before deploying them.",
      eventLogSummary: "Guidance: roster readiness explained",
    },
    completion: {
      kind: "target_opened",
      targetAnchorId: "ui/hq/category/roster",
    },
  },
  {
    id: "guidance/opening/bodega-room-functions",
    track: "opening",
    featureIds: ["rooms", "bodega"],
    milestoneOrder: 5,
    delivery: {
      mode: "focused",
      target: "ui/hq/category/rooms",
      fallbackIntent: "hq/open-rooms",
      pauseWorld: true,
      allowSkip: false,
      replayPolicy: "manual_replay",
    },
    gating: {
      requiredCompletedBeatIds: ["guidance/opening/roster-readiness"],
    },
    bindings: {},
    copy: {
      title: "The Bodega",
      subtitle: "Headquarters (technically)",
      body: "This is a repurposed bodega, not a professional facility. Four rooms, each pulling double duty. The Register handles contracts and walk-in visitors. The Counter is recruitment \u2014 sandwiches and job pitches. The Dining Area covers recovery, patch-up work, and whatever passes for a social life around one table and a microwave. The Supply Closet is gear storage wedged behind the mops. Every function shares space because the guild is operating out of a corner store, not a purpose-built headquarters.",
      ctaLabel: "Got it",
      fallbackBody:
        "Open the Rooms category in the HQ tab to see the bodega\u2019s four rooms and their combined functions.",
      eventLogSummary: "Guidance: bodega rooms explained",
    },
    completion: {
      kind: "target_opened",
      targetAnchorId: "ui/hq/category/rooms",
    },
  },
  {
    id: "guidance/opening/first-raid-flow",
    track: "opening",
    featureIds: ["raids", "autonomous-behavior"],
    milestoneOrder: 6,
    delivery: {
      mode: "focused",
      target: "ui/raid/map",
      pauseWorld: true,
      allowSkip: false,
      replayPolicy: "manual_replay",
    },
    gating: {
      requiredCompletedBeatIds: ["guidance/opening/bodega-room-functions"],
      requireFirstTeamDeparture: true,
    },
    bindings: {},
    copy: {
      title: "Raid Operations",
      subtitle: "They go in. You manage what comes back.",
      body: "Operators form teams and enter the contracted site on their own initiative. They explore, fight, loot, and decide when to push deeper or pull out. Boss does not control tactics inside the rift. Boss controls conditions: who is rested, who is equipped, who is sent, and what happens when they come back injured, shaken, or not at all. Watch the raid map for team movement and the event log for results.",
      ctaLabel: "Got it",
      fallbackBody:
        "Switch to Operations to see the raid map. Teams deploy and operate autonomously \u2014 Boss manages preparation and consequences, not direct combat.",
      eventLogSummary: "Guidance: autonomous raid behavior explained",
    },
    completion: { kind: "team_departed" },
  },
  {
    id: "guidance/opening/first-incident",
    track: "opening",
    featureIds: ["incidents", "interruptions"],
    milestoneOrder: 7,
    delivery: {
      mode: "blocking",
      pauseWorld: true,
      allowSkip: false,
      replayPolicy: "manual_replay",
    },
    gating: {
      requiredCompletedBeatIds: ["guidance/opening/first-raid-flow"],
      requireFirstIncidentEligible: true,
    },
    bindings: {},
    copy: {
      title: "Incident Report",
      subtitle: "Management decision required",
      body: "The guild just flagged a situation that requires Boss\u2019s direct decision. Incidents freeze the clock and present options with real consequences \u2014 morale shifts, loyalty changes, treasury hits, or worse. Every choice lands on the roster. There is no undo. Read the briefing, weigh the options, and decide.",
      ctaLabel: "Handle it",
      fallbackBody:
        "An incident has been raised that requires your decision. The game is paused until you choose how to respond.",
      eventLogSummary: "Guidance: incident handling introduced",
    },
    completion: { kind: "incident_resolved" },
  },
  {
    id: "guidance/opening/first-loot-and-market",
    track: "opening",
    featureIds: ["loot", "market", "inventory"],
    milestoneOrder: 8,
    delivery: {
      mode: "focused",
      target: "ui/hq/category/market",
      fallbackIntent: "hq/open-market",
      pauseWorld: true,
      allowSkip: false,
      replayPolicy: "manual_replay",
    },
    gating: {
      requiredCompletedBeatIds: ["guidance/opening/first-incident"],
      requireFirstRaidReturnWithLoot: true,
    },
    bindings: {},
    copy: {
      title: "Loot and the Market",
      subtitle: "The raid-to-cash loop",
      body: "Operators haul back monster parts and occasionally salvageable gear from cleared sites. Monster parts are inventory \u2014 stackable trade goods, not trophies. Sell them on the market for cash, or hold them until crafting becomes available later. The market is also where Boss buys weapons, outfits, and accessories for the roster. Better gear means better outcomes. Better outcomes mean more loot. That is the loop.",
      ctaLabel: "Got it",
      fallbackBody:
        "Open the Market category in the HQ tab to sell recovered loot and buy equipment for your operators.",
      eventLogSummary: "Guidance: loot and market explained",
    },
    completion: { kind: "market_opened" },
  },
  {
    id: "guidance/opening/first-boss-commitment",
    track: "opening",
    featureIds: ["boss-commitment", "encounters"],
    milestoneOrder: 9,
    delivery: {
      mode: "blocking",
      pauseWorld: true,
      allowSkip: false,
      replayPolicy: "manual_replay",
    },
    gating: {
      requiredCompletedBeatIds: ["guidance/opening/first-loot-and-market"],
      requireFirstBossCommitment: true,
    },
    bindings: {},
    copy: {
      title: "Boss Commitment",
      subtitle: "The point of no return",
      body: "A team has reached the floor boss. This is not a passive update \u2014 it is a stop-the-game decision. Committing sends the team into a live encounter with real stakes: injury, death, contract closure. Retreating pulls them out alive but leaves the boss standing and the contract open. There is no partial commitment. Decide now.",
      ctaLabel: "Decide",
      fallbackBody:
        "Your team has reached the boss. The game is paused for a commitment decision \u2014 commit to the encounter or order a retreat.",
      eventLogSummary: "Guidance: boss commitment explained",
    },
    completion: { kind: "boss_commitment_resolved" },
  },
] as const satisfies readonly GuidanceBeat[];

export const OPENING_BEATS: readonly GuidanceBeat[] = OPENING_BEATS_MUTABLE;

export const OPENING_BEAT_IDS: readonly string[] = OPENING_BEATS.map((b) => b.id);

export const OPENING_BEAT_BY_ID: ReadonlyMap<string, GuidanceBeat> = new Map(
  OPENING_BEATS.map((b) => [b.id, b]),
);

export const OPENING_BEAT_COUNT: number = OPENING_BEATS.length;

import type { GuidanceBeat } from "./guidance";

const OPENING_BEATS_MUTABLE = [
  {
    id: "guidance/opening/board-briefing",
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
      body: "{playerName} does not pick fights. {playerName} picks regulated clearance work off a city board. Every listing comes with filing cost, threat, reward, and whatever intel the paperwork coughs up. This is a business, not a quest log.",
      ctaLabel: "Understood",
      fallbackBody:
        "The contract board is where {playerName} chooses government-cleared work for {guildName}.",
      eventLogSummary: "Operations briefing: posted contracts explained",
    },
    completion: { kind: "acknowledged" },
  },
  {
    id: "guidance/opening/first-contract-choice",
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
      requiredCompletedBeatIds: ["guidance/opening/board-briefing"],
    },
    bindings: {},
    copy: {
      title: "Secure Your First Contract",
      subtitle: "One job at a time",
      body: "{guildName} handles one active clearance contract at a time. Filing the bid costs cash. Review the posted sites, weigh the risk, and secure the job that this roster can actually survive.",
      ctaLabel: "Select a contract",
      fallbackBody: "Open Operations and file a bid on one posted contract.",
      eventLogSummary: "Guidance: choose your first contract from the board",
    },
    completion: { kind: "contract_secured" },
  },
  {
    id: "guidance/opening/bodega-overview",
    track: "opening",
    featureIds: ["rooms", "bodega"],
    milestoneOrder: 3,
    delivery: {
      mode: "focused",
      target: "ui/hq/category/rooms",
      fallbackIntent: "hq/open-rooms",
      pauseWorld: true,
      allowSkip: false,
      replayPolicy: "manual_replay",
    },
    gating: {
      requiredCompletedBeatIds: ["guidance/opening/first-contract-choice"],
    },
    bindings: {},
    copy: {
      title: "The Bodega",
      subtitle: "Headquarters, technically",
      body: "Four rooms, all doing too much. The Register handles contracts and walk-ins. The Counter is recruitment by way of sandwiches. The Dining Area is recovery, social life, and patch-up care. The Supply Closet is gear storage, and it starts dark until {playerName} turns it on.",
      ctaLabel: "Inspect a room",
      fallbackBody:
        "Open Rooms and inspect one room card to review what this bodega actually does.",
      eventLogSummary: "Guidance: bodega rooms explained",
    },
    completion: { kind: "room_inspected" },
  },
  {
    id: "guidance/opening/roster-and-equip",
    track: "opening",
    featureIds: ["roster", "operators", "gear"],
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
      requiredCompletedBeatIds: ["guidance/opening/bodega-overview"],
    },
    bindings: {},
    copy: {
      title: "Roster and Gear",
      subtitle: "Check the people, then the kit",
      body: "Morale, loyalty, fatigue, and injury all matter before anyone deploys. So does equipment. The guild does not have enough gear for everyone. Inspect the roster, then decide who gets the jacket and comms before the rift starts charging interest.",
      ctaLabel: "Inspect an operator",
      fallbackBody: "Open Roster and inspect one operator before the first deployment.",
      eventLogSummary: "Guidance: roster condition and early gear pressure explained",
    },
    completion: { kind: "operator_inspected" },
  },
  {
    id: "guidance/opening/first-team-departure",
    track: "opening",
    featureIds: ["raids", "autonomy"],
    milestoneOrder: 5,
    delivery: {
      mode: "focused",
      target: "ui/raid/map",
      fallbackIntent: "ops/open-raid-map",
      pauseWorld: true,
      allowSkip: false,
      replayPolicy: "manual_replay",
    },
    gating: {
      requiredCompletedBeatIds: ["guidance/opening/roster-and-equip"],
      requireFirstTeamDeparture: true,
    },
    bindings: {},
    copy: {
      title: "Raid Operations",
      subtitle: "They go in. {playerName} manages what comes back.",
      body: "Once a team deploys, they operate on their own. They scout, fight, loot, and decide when to push or peel out. {playerName} does not run tactics inside the rift. {playerName} owns preparation, staffing, equipment, and the consequences waiting at home.",
      ctaLabel: "Understood",
      fallbackBody: "Watch the raid map. Teams move and act without direct tactical control.",
      eventLogSummary: "Guidance: autonomous raid behavior explained",
    },
    completion: { kind: "team_departed", requiresManualCompletion: true },
  },
  {
    id: "guidance/opening/first-raid-return",
    track: "opening",
    featureIds: ["raids", "results"],
    milestoneOrder: 6,
    delivery: {
      mode: "focused",
      target: "ui/ops/panel/history",
      fallbackIntent: "ops/open-history",
      pauseWorld: true,
      allowSkip: false,
      replayPolicy: "manual_replay",
    },
    gating: {
      requiredCompletedBeatIds: ["guidance/opening/first-team-departure"],
      requireFirstRaidReturn: true,
    },
    bindings: {},
    copy: {
      title: "Raid Debrief",
      subtitle: "They came back. Here is the bill.",
      body: "Every return carries a cost report: loot, injuries, morale changes, and whatever the team had to do to get back out. This is where {playerName} learns what the field actually extracted from the roster.",
      ctaLabel: "Review summary",
      fallbackBody: "Raid returns change inventory, injuries, and operator condition all at once.",
      eventLogSummary: "Guidance: first raid return explained",
    },
    completion: { kind: "acknowledged" },
  },
  {
    id: "guidance/opening/roster-condition",
    track: "opening",
    featureIds: ["roster", "recovery"],
    milestoneOrder: 7,
    delivery: {
      mode: "focused",
      target: "ui/hq/category/roster",
      fallbackIntent: "hq/open-roster",
      pauseWorld: true,
      allowSkip: false,
      replayPolicy: "manual_replay",
    },
    gating: {
      requiredCompletedBeatIds: ["guidance/opening/first-raid-return"],
      requireOperatorWorn: true,
    },
    bindings: {},
    copy: {
      title: "Morning-After Condition",
      subtitle: "Rest is management",
      body: "Fatigue, injuries, and morale drops are not flavor. They change who can deploy and how badly the next contract can go. The Dining Area is where people recover because {guildName} cannot afford a proper infirmary yet.",
      ctaLabel: "Understood",
      fallbackBody: "Open Roster to review which operators came back worn down.",
      eventLogSummary: "Guidance: post-raid roster wear explained",
    },
    completion: { kind: "acknowledged" },
  },
  {
    id: "guidance/opening/first-incident",
    track: "opening",
    featureIds: ["incidents", "interruptions"],
    milestoneOrder: 8,
    delivery: {
      mode: "blocking",
      pauseWorld: true,
      allowSkip: false,
      replayPolicy: "manual_replay",
    },
    gating: {
      requiredCompletedBeatIds: ["guidance/opening/first-raid-return"],
      requireFirstIncidentEligible: true,
    },
    bindings: {},
    copy: {
      title: "Incident Report",
      subtitle: "Management decision required",
      body: "Incidents stop the clock because {playerName} has to choose. Morale, loyalty, cash, and relationships can all move here. There is no undo, and the paperwork will still be waiting after the shouting stops.",
      ctaLabel: "Handle it",
      fallbackBody:
        "An incident has landed and the simulation is paused until {playerName} responds.",
      eventLogSummary: "Guidance: incident handling introduced",
    },
    completion: { kind: "incident_resolved" },
  },
  {
    id: "guidance/opening/loot-and-market",
    track: "opening",
    featureIds: ["loot", "market", "inventory"],
    milestoneOrder: 9,
    delivery: {
      mode: "focused",
      target: "ui/hq/category/market",
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
      title: "Loot and Market",
      subtitle: "The bodega is still a business",
      body: "Monster parts are not trophies. They are cash once {playerName} sells them. The same market also buys {guildName} better weapons, outfits, and accessories. Better prep makes better raids. Better raids bring back more to sell.",
      ctaLabel: "Open market",
      fallbackBody: "Open Market to review what loot can be sold and what gear can be bought.",
      eventLogSummary: "Guidance: loot and market loop explained",
    },
    completion: { kind: "market_opened" },
  },
  {
    id: "guidance/opening/staffing-and-rooms",
    track: "opening",
    featureIds: ["staffing", "rooms"],
    milestoneOrder: 10,
    delivery: {
      mode: "focused",
      target: "ui/hq/category/rooms",
      fallbackIntent: "hq/open-rooms",
      pauseWorld: true,
      allowSkip: false,
      replayPolicy: "manual_replay",
    },
    gating: {
      requiredCompletedBeatIds: ["guidance/opening/loot-and-market"],
      requireUnassignedManagementAction: true,
    },
    bindings: {},
    copy: {
      title: "Staffing and Rooms",
      subtitle: "Payroll should buy labor",
      body: "Idle staff and dark rooms are management failures. Assign staff where they actually help, and bring dormant space online when {guildName} needs it. Boris is on the clock either way.",
      ctaLabel: "Make one management change",
      fallbackBody: "Assign staff or activate a room to keep the bodega functioning.",
      eventLogSummary: "Guidance: staffing and room activation explained",
    },
    completion: { kind: "staffing_action_taken" },
  },
  {
    id: "guidance/opening/first-upgrade",
    track: "opening",
    featureIds: ["upgrades", "rooms"],
    milestoneOrder: 11,
    delivery: {
      mode: "focused",
      target: "ui/hq/category/rooms",
      fallbackIntent: "hq/open-rooms",
      pauseWorld: true,
      allowSkip: false,
      replayPolicy: "manual_replay",
    },
    gating: {
      requiredCompletedBeatIds: ["guidance/opening/staffing-and-rooms"],
      minimumSecuredContractCount: 3,
      requireUpgradeAffordable: true,
    },
    bindings: {},
    copy: {
      title: "First Upgrade",
      subtitle: "A small improvement is still a milestone",
      body: "Upgrades are physical fixes to a cramped workplace: better records, better coffee, better recovery tools, a less embarrassing storefront. They cost real cash because making the bodega less terrible is still capital work.",
      ctaLabel: "Buy an upgrade",
      fallbackBody:
        "Open room management and purchase the first upgrade {guildName} can actually afford.",
      eventLogSummary: "Guidance: first upgrade decision explained",
    },
    completion: { kind: "upgrade_purchased" },
  },
  {
    id: "guidance/opening/setback-recovery",
    track: "opening",
    featureIds: ["recovery", "failure"],
    milestoneOrder: 12,
    delivery: {
      mode: "blocking",
      pauseWorld: true,
      allowSkip: false,
      replayPolicy: "manual_replay",
    },
    gating: {
      requiredCompletedBeatIds: ["guidance/opening/first-team-departure"],
      requireSetbackRecoveryTrigger: true,
    },
    bindings: {},
    copy: {
      title: "Setback Recovery",
      subtitle: "Bad runs are part of the job",
      body: "A failed push, a serious injury, a death warning, a lost contract. None of that means the campaign is over. It means {playerName} has to rest people, recruit replacements, and keep the lights on long enough to take the next job.",
      ctaLabel: "Understood",
      fallbackBody:
        "Setbacks are recoverable if {playerName} manages the roster and keeps work flowing.",
      eventLogSummary: "Guidance: setback recovery explained",
    },
    completion: { kind: "acknowledged" },
  },
  {
    id: "guidance/opening/boss-commitment",
    track: "opening",
    featureIds: ["boss-commitment", "encounters"],
    milestoneOrder: 13,
    delivery: {
      mode: "blocking",
      pauseWorld: true,
      allowSkip: false,
      replayPolicy: "manual_replay",
    },
    gating: {
      requiredCompletedBeatIds: ["guidance/opening/first-upgrade"],
      requireFirstBossCommitment: true,
    },
    bindings: {},
    copy: {
      title: "Boss Commitment",
      subtitle: "This one can kill the whole team",
      body: "Reaching the floor boss is not a passive update. Committing sends the team into a live encounter with real stakes. Retreat keeps them breathing, but the contract stays unfinished. Either choice belongs to {playerName}.",
      ctaLabel: "Decide",
      fallbackBody: "A team has reached the boss. The game is paused for a commitment decision.",
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

export const BODEGA_SPECIFIC_BEAT_IDS: readonly string[] = OPENING_BEATS.filter((b) =>
  b.featureIds.includes("bodega"),
).map((b) => b.id);

export const FIRST_RAID_RETURN_BEAT_ID = "guidance/opening/first-raid-return";

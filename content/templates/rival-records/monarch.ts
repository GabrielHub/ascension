import type { RivalRecord } from "./schema";

export const monarchRivalRecord = {
  id: "rival/monarch",
  guildName: "Monarch",
  shortDisplayName: "Monarch",
  leader: {
    name: 'Minjun "Jun" Park',
  },
  pressureLane: "prestige",
  copy: {
    currentRivalOneLiner:
      "Minjun Park is registered F-rank. His clearance damage logs are not. The licensing board has reopened his assessment twice and recategorized him neither time.",
  },
  assetPaths: {
    leaderPortrait: "/data/rivals/monarch/leader-neutral.png",
    insignia: "/data/rivals/monarch/insignia.png",
  },
  narrativeProfile: {
    operatingBase:
      "A converted Midtown dental office on the second floor above a 24-hour Korean bakery. The waiting room furniture is still in place — salmon-pink chairs, a children's toy box, a dusty ficus. Dispatch runs off two laptops on a reception desk that still has a sign-in clipboard. Contract filings are organized in color-coded folders on what used to be the hygienist's rolling cart. Jun's office is the old dentist's office; the chair is gone, but the overhead light arm is still bolted to the ceiling.",
    publicPitch:
      "Monarch — a new-generation clearance guild built around precision, restraint, and licensed F-rank summoner-lead Minjun Park.",
    pressureStyle:
      "Prestige pressure driven by a statistics mismatch the licensing board has not acted on. Monarch lose to you on roster breadth, operating scale, and any contract that requires a team. They beat you on signature clearances — Jun's damage numbers pass through F-rank ceilings and the board keeps not reclassifying him. The rivalry is the public watching two guilds with very different leaderboards and deciding which story they prefer: the board's paperwork, or the clearance footage.",
    rivalryFantasy:
      "Jun is quiet, unassuming, and waits for his turn. He gives short interviews, declines rank-ceremony invitations, and posts nothing. The whole city knows what the clearance logs show and what the card says, and watches to see whether he will ever confirm it himself. When your guild holds a ribbon-cutting, Jun walks past it on his way to a bakery and a bystander's phone catches him. The footage trends. Your ribbon-cutting does not.",
    toneAndVoice:
      "Quiet American-English with occasional Korean asides to his own staff. Measured, warm, genuinely humble; never self-deprecating in a performing way. Uses 'sir' and 'ma'am' with licensing officials older than he is. Will say 'the card says F, so we bid F' and mean it. Gives one-sentence post-clearance interviews. Has never posted on social.",
  },
  moves: [
    {
      id: "rival-move/monarch/solo-clearance-headline",
      family: "press_gravity",
      weight: 10,
      cooldownMinutes: 1440,
      briefingTemplate:
        "A bystander's phone clip of Jun soloing the back half of a contract you co-bid is trending at two million views. The clip is captioned 'F-rank.' The comment section is not.",
      basePublicPressureDelta: 7,
      baseIntensityDelta: 4,
      choices: [
        {
          choiceId: "file-rank-review-request",
          label: "File a formal rank-review request",
          description:
            "Ask the licensing board to reopen Jun's assessment. They have refused twice.",
          consequenceSummary: "Reputation up. Public pressure stays. Sponsors notice.",
          effects: [
            { kind: "reputation_delta", targetRef: "guild", value: 2 },
            { kind: "public_pressure_delta", targetRef: "guild", value: 2 },
          ],
        },
        {
          choiceId: "own-your-lane",
          label: "Own your lane",
          description:
            "Post a clearance recap of your crew's own contract this week. Let the numbers compete.",
          consequenceSummary: "Morale ticks. Public pressure rises further.",
          effects: [
            { kind: "morale_delta", targetRef: "team", value: 1 },
            { kind: "public_pressure_delta", targetRef: "guild", value: 4 },
          ],
        },
      ],
    },
    {
      id: "rival-move/monarch/rank-bid-cap-poach",
      family: "contract_challenge",
      weight: 7,
      cooldownMinutes: 2880,
      briefingTemplate:
        "Monarch filed a competing bid on a mid-tier contract using F-rank pricing. The licensing board's bid calculator accepted it before the client's legal had finished reading yours.",
      basePublicPressureDelta: 4,
      baseIntensityDelta: 3,
      choices: [
        {
          choiceId: "match-f-rank-margin",
          label: "Match Jun's margin",
          description: "Drop your bid to F-rank levels to hold the contract.",
          consequenceSummary: "Treasury down sharply. Contract held.",
          effects: [
            { kind: "treasury_delta", targetRef: "guild", value: -180 },
            { kind: "reputation_delta", targetRef: "guild", value: 1 },
          ],
        },
        {
          choiceId: "escalate-to-board",
          label: "Escalate the rank mismatch",
          description: "Push the licensing board to freeze Monarch's bid pending reclassification.",
          consequenceSummary: "No cash cost. Rep down short term; intel banks.",
          effects: [
            { kind: "reputation_delta", targetRef: "guild", value: -1 },
            { kind: "intel_delta", targetRef: "guild", value: 2 },
          ],
        },
      ],
    },
    {
      id: "rival-move/monarch/prestige-hire-magnet",
      family: "recruitment_market_loss",
      weight: 6,
      cooldownMinutes: 2160,
      briefingTemplate:
        "A D-rank clearance specialist you were courting accepted a roster seat at Monarch. He told your intake officer 'I want to see what the card-vs-footage gap looks like up close.'",
      basePublicPressureDelta: 3,
      baseIntensityDelta: 2,
      choices: [
        {
          choiceId: "float-prestige-counter",
          label: "Float a prestige counter",
          description:
            "Put together a signature-role offer that Monarch cannot match at their current scale.",
          consequenceSummary: "Treasury down. Recruit returns to the table.",
          effects: [
            { kind: "treasury_delta", targetRef: "guild", value: -110 },
            { kind: "team_cohesion_delta", targetRef: "team", value: 1 },
          ],
        },
        {
          choiceId: "accept-loss",
          label: "Accept the loss",
          description: "He wanted the footage, not the paycheck. That's not a bidding war.",
          consequenceSummary: "Morale slips. Intel on Monarch's hiring posture banks.",
          effects: [
            { kind: "morale_delta", targetRef: "team", value: -1 },
            { kind: "intel_delta", targetRef: "guild", value: 1 },
          ],
        },
      ],
    },
  ],
} satisfies RivalRecord;

import type { RivalRecord } from "./schema";

export const delaneyBooksRivalRecord = {
  id: "rival/delaney-books",
  guildName: "Delaney & Sons Books and Press",
  shortDisplayName: "Delaney & Sons",
  leader: {
    name: "Marcus Delaney",
  },
  pressureLane: "sponsor-network",
  copy: {
    currentRivalOneLiner:
      "Marcus Delaney writes you warm letters and commits to nothing. The block is still deciding.",
  },
  assetPaths: {
    leaderPortrait: "/data/rivals/delaney-books/leader-neutral.png",
    insignia: "/data/rivals/delaney-books/insignia.png",
  },
  narrativeProfile: {
    operatingBase:
      "A narrow three-story brownstone in Vinegar Hill. The street-level bookshop and small printing press are still open to walk-in customers, and the dispatch desk sits behind the shop counter under a bell. Contract filings share shelf space with poetry chapbooks and pressed event programs. Marcus works from a back-room office papered with signed photographs of Delaney weddings, Delaney christenings, and three generations of Delaney funerals on the same block.",
    publicPitch:
      "Delaney & Sons — since 1891, Brooklyn's neighbor on paper, now a licensed clearance guild of the same name.",
    pressureStyle:
      "Sponsor-network and community-trust pressure. Delaney lose to you on clearance throughput, roster size, and any metric that lives on the licensing board's dashboard. They beat you on deep community relationships (four generations of weddings, funerals, and small favors), on sponsor access through their print-side clients, and on the soft endorsement of every block association within two miles of the shop. The rivalry is that the neighborhood will always pick them over you on the tie-breaker.",
    rivalryFantasy:
      "Marcus is warm, unhurried, and always busy with something else. He shakes your hand at fundraisers and sincerely wishes you well. He does not compete for contracts; he quietly outlasts you on the ones the neighborhood cared about. When a sponsor cancels a dinner with you, it is because Marcus's mother hosted them for lunch first. You cannot out-neighbor a family that has been on the block since the horse-drawn era.",
    toneAndVoice:
      "Old-Brooklyn Irish-American warmth without any performance. Uses 'kiddo' unironically with people his age or older. Remembers your mother's maiden name. Never raises the price of an argument. Written correspondence on letterhead, hand-signed. Says 'we'll find a way' and means nothing by it.",
  },
  moves: [
    {
      id: "rival-move/delaney-books/sponsor-dinner-lock",
      family: "sponsor_interference",
      weight: 10,
      cooldownMinutes: 1440,
      briefingTemplate:
        "A sponsor who was reviewing your retainer had dinner at the Delaneys' last night. Marcus's mother cooked. Your proposal is now on hold pending a 'fuller picture of the neighborhood's options.'",
      basePublicPressureDelta: 4,
      baseIntensityDelta: 3,
      choices: [
        {
          choiceId: "send-counter-gift",
          label: "Send a counter-gesture",
          description:
            "A discreet retainer sweetener and a signed thank-you. Close the dinner's warmth with a cooler number.",
          consequenceSummary: "Treasury down. Sponsor holds position with you.",
          effects: [
            { kind: "treasury_delta", targetRef: "guild", value: -120 },
            { kind: "reputation_delta", targetRef: "guild", value: 1 },
          ],
        },
        {
          choiceId: "let-dinner-stand",
          label: "Let the dinner stand",
          description: "Do nothing. You cannot out-cook his mother on forty-eight hours of notice.",
          consequenceSummary: "Sponsor drifts. Public pressure ticks.",
          effects: [
            { kind: "reputation_delta", targetRef: "guild", value: -1 },
            { kind: "public_pressure_delta", targetRef: "guild", value: 3 },
          ],
        },
      ],
    },
    {
      id: "rival-move/delaney-books/block-association-endorsement",
      family: "public_comparison",
      weight: 7,
      cooldownMinutes: 2880,
      briefingTemplate:
        "Three block associations within two miles of the Delaney shop published joint endorsement letters this morning. Yours is listed as 'also operating in the district.'",
      basePublicPressureDelta: 5,
      baseIntensityDelta: 3,
      choices: [
        {
          choiceId: "host-neighborhood-night",
          label: "Host a neighborhood open-night",
          description:
            "Open the intake office for tours, coffee, and conversation. You cannot buy depth; you can buy presence.",
          consequenceSummary: "Treasury down. Reputation and morale lift.",
          effects: [
            { kind: "treasury_delta", targetRef: "guild", value: -80 },
            { kind: "reputation_delta", targetRef: "guild", value: 2 },
            { kind: "morale_delta", targetRef: "team", value: 1 },
          ],
        },
        {
          choiceId: "shrug-off-endorsement",
          label: "Ignore the endorsement",
          description: "Keep the roster working. Endorsement letters don't clear floors.",
          consequenceSummary: "No cost. Public pressure rises.",
          effects: [
            { kind: "public_pressure_delta", targetRef: "guild", value: 3 },
            { kind: "morale_delta", targetRef: "team", value: -1 },
          ],
        },
      ],
    },
    {
      id: "rival-move/delaney-books/legacy-hire-pull",
      family: "recruitment_market_loss",
      weight: 6,
      cooldownMinutes: 2160,
      briefingTemplate:
        "An applicant you interviewed twice last week turned in a retraction letter on Delaney letterhead. Marcus is her second cousin. Her grandmother asked her to hear Marcus out first.",
      basePublicPressureDelta: 2,
      baseIntensityDelta: 2,
      choices: [
        {
          choiceId: "reach-out-personally",
          label: "Reach out personally",
          description:
            "A face-to-face meeting with the applicant and her grandmother. Warm room. Honest ask.",
          consequenceSummary: "Treasury cost. Applicant returns to consideration.",
          effects: [
            { kind: "treasury_delta", targetRef: "guild", value: -60 },
            { kind: "team_cohesion_delta", targetRef: "team", value: 1 },
          ],
        },
        {
          choiceId: "respect-family-tie",
          label: "Respect the family tie",
          description:
            "Send a handwritten note wishing her well at Delaney. Don't poach on a grandmother's ask.",
          consequenceSummary: "Reputation ticks up. Pipeline shrinks.",
          effects: [
            { kind: "reputation_delta", targetRef: "guild", value: 1 },
            { kind: "team_cohesion_delta", targetRef: "team", value: -1 },
          ],
        },
      ],
    },
  ],
} satisfies RivalRecord;

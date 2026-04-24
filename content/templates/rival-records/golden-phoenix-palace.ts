import type { RivalRecord } from "./schema";

export const goldenPhoenixPalaceRivalRecord = {
  id: "rival/golden-phoenix-palace",
  guildName: "Imperial Golden Phoenix Palace",
  shortDisplayName: "Golden Phoenix",
  leader: {
    name: "Adrian Cheung",
  },
  pressureLane: "prestige",
  copy: {
    currentRivalOneLiner:
      "Adrian Cheung is starting from the same place you did — with his father's checkbook behind him.",
  },
  assetPaths: {
    leaderPortrait: "/data/rivals/golden-phoenix-palace/leader-neutral.png",
    insignia: "/data/rivals/golden-phoenix-palace/insignia.png",
  },
  narrativeProfile: {
    operatingBase:
      "The Cheung family's longtime Chinatown restaurant of the same name. The dispatch desk sits in the back office between the dry-goods shelves and the milk-tea station. Printed contract filings share counter space with placemats. Briefings happen between dim sum service.",
    publicPitch:
      "Imperial Golden Phoenix Palace — five generations of hospitality, now licensed for dungeon clearance.",
    pressureStyle:
      "Imported prestige and parent-guild recruiting muscle. They lose to you on local connections, NYC regulatory familiarity, and English-only neighborhoods. They beat you on paper credentials, transfer-in operator quality, capital runway, and the fact that their branch lead can personally clear floors.",
    rivalryFantasy:
      "This is your story, with money and a competent boss. Adrian unlocks at exactly the moment you think you have made it. He is not hostile. He is polite, slightly aloof, and genuinely treats you as a peer. He will compliment a clearance you just finished and then poach the next contract on the same block. When your team is grinding through floor two, Adrian has already cleared floor three because he went in himself.",
    toneAndVoice:
      "Internationally-schooled English. Occasional Cantonese asides to his staff. Cool, slightly distant, not rude — composed. Treats dungeon work as a real career, not a gold rush. Will sincerely say 'your bodega has very good location' and mean it.",
  },
  moves: [
    {
      id: "rival-move/golden-phoenix/parent-firm-bid",
      family: "contract_challenge",
      weight: 10,
      cooldownMinutes: 1440,
      briefingTemplate:
        "Imperial Golden Phoenix Palace — Chinatown has filed a competing bid. Our parent firm's clearance record should already be on file with the licensing board.",
      basePublicPressureDelta: 5,
      baseIntensityDelta: 3,
      choices: [
        {
          choiceId: "sharpen-bid",
          label: "Sharpen your bid",
          description: "Drop your margin to beat Adrian's on paper.",
          consequenceSummary: "Treasury down. Contract held.",
          effects: [
            { kind: "treasury_delta", targetRef: "guild", value: -140 },
            { kind: "reputation_delta", targetRef: "guild", value: 1 },
          ],
        },
        {
          choiceId: "concede-the-block",
          label: "Concede the block, hold your margin",
          description: "Let Adrian take the contract; keep the cash.",
          consequenceSummary: "No treasury cost. Reputation drops.",
          effects: [
            { kind: "reputation_delta", targetRef: "guild", value: -2 },
            { kind: "morale_delta", targetRef: "team", value: -1 },
          ],
        },
      ],
    },
    {
      id: "rival-move/golden-phoenix/branch-leader-ahead",
      family: "site_arrival",
      weight: 7,
      cooldownMinutes: 2880,
      briefingTemplate:
        "Adrian Cheung's team cleared the second floor before your operators arrived. He sends his regards.",
      basePublicPressureDelta: 6,
      baseIntensityDelta: 3,
      choices: [
        {
          choiceId: "press-forward",
          label: "Press forward on the higher floors",
          description: "Take the contract that remains and push past Adrian's ahead-position.",
          consequenceSummary: "Reputation up if you hold. Morale dips from the comparison.",
          effects: [
            { kind: "reputation_delta", targetRef: "guild", value: 2 },
            { kind: "morale_delta", targetRef: "team", value: -2 },
          ],
        },
        {
          choiceId: "pull-the-team",
          label: "Pull the team, cede the site",
          description: "Withdraw to preserve operator condition.",
          consequenceSummary: "Cohesion preserved. Public pressure rises.",
          effects: [
            { kind: "team_cohesion_delta", targetRef: "team", value: 1 },
            { kind: "public_pressure_delta", targetRef: "guild", value: 3 },
          ],
        },
      ],
    },
    {
      id: "rival-move/golden-phoenix/diaspora-recruit-pull",
      family: "recruitment_market_loss",
      weight: 6,
      cooldownMinutes: 2160,
      briefingTemplate:
        "A Cantonese-speaking recruit you interviewed twice has accepted an offer from Adrian. Parent-firm housing allowance and a transfer-in signing bonus sealed it.",
      basePublicPressureDelta: 3,
      baseIntensityDelta: 2,
      choices: [
        {
          choiceId: "float-counter",
          label: "Float a counter-offer",
          description: "Match the signing bonus on a shorter term.",
          consequenceSummary: "Treasury down. Recruit signs with you instead.",
          effects: [
            { kind: "treasury_delta", targetRef: "guild", value: -100 },
            { kind: "team_cohesion_delta", targetRef: "team", value: 1 },
          ],
        },
        {
          choiceId: "accept-loss",
          label: "Accept the loss",
          description: "Let them go; focus intake elsewhere.",
          consequenceSummary: "Morale and cohesion both slip.",
          effects: [
            { kind: "morale_delta", targetRef: "team", value: -1 },
            { kind: "team_cohesion_delta", targetRef: "team", value: -1 },
          ],
        },
      ],
    },
  ],
} satisfies RivalRecord;

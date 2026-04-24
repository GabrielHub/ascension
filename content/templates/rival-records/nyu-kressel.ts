import type { RivalRecord } from "./schema";

export const nyuKresselRivalRecord = {
  id: "rival/nyu-kressel",
  guildName: "NYU Kressel",
  shortDisplayName: "NYU Kressel",
  leader: {
    name: 'Delilah "DELILA" Marchetti',
  },
  pressureLane: "hybrid",
  copy: {
    currentRivalOneLiner:
      "DELILA has sent you a warm note thanking you for your interest. The Kressel Executive Office was not copied and will respond when it chooses.",
  },
  assetPaths: {
    leaderPortrait: "/data/rivals/nyu-kressel/leader-neutral.png",
    insignia: "/data/rivals/nyu-kressel/insignia.png",
  },
  narrativeProfile: {
    operatingBase:
      "A renovated wing of the Kressel Center on Washington Square South, tucked between Bobst Library and the Silver Center under NYU's violet-and-cream building flags. An institutional lobby in warm limestone with a central reception desk upholstered in NYU violet, a cast-bronze KRESSEL plaque under the torch glyph, and a silver-framed portrait of the Dean opposite the doors. DELILA's Public Engagement office sits just off the lobby; visitors are offered espresso from the NYU-branded machine while she finishes her previous meeting. The Kressel Executive Office occupies the third floor, is not accessible to visitors, and is where every substantive decision is routed.",
    publicPitch:
      "NYU Kressel — New York University's licensed clearance guild, operating from Washington Square under full NYC licensing since 2024.",
    pressureStyle:
      "Institutional-prestige pricing, alumni-network sponsor capture, and pipeline-recruitment pressure layered with a sincere figurehead-barrier tonal edge. NYU Kressel loses to you on decision speed, on contracts beneath NYU's institutional-attention threshold, on outer-borough intelligence, and on engagements you can route directly to a client decision-maker. NYU Kressel beats you on institutional prestige, on the alumni-bench sponsor-network advantage, on Kressel Fellowship tuition-forgiveness pipelines, on research-backed credentialing, on figurehead-curated media presence, on committee-scale bid resilience, and on figurehead-barrier routing where every player-facing interaction dies at DELILA's desk.",
    rivalryFantasy:
      "You are not competing with a person. You are competing with a two-hundred-year-old university that decided clearance was a revenue line and built a machine. The face of the machine is a former singer you genuinely like. Every meeting on Washington Square starts with DELILA greeting you by name, offering espresso, and telling you — honestly — that she'll make sure your question gets back to the team. It does. The team does not answer. Your best CAS-undergraduate recruit never applied to you because NYU had her on the Kressel Pipeline at nineteen. DELILA knows. You know she knows. Neither of you can do anything about it.",
    toneAndVoice:
      "DELILA is warmly enthusiastic, genuinely polished in an ex-performer way, and sincerely kind. Light residual industry slang from 2014 slips out unforced ('love that,' 'so real,' 'I'm obsessed with that for you') without tipping into parody. She speaks the guild's positioning in the language NYU gave her — 'the Kressel Pipeline,' 'our Executive Office,' 'the institutional review.' When you ask a substantive operational question she says 'that's such a great question — I'll make sure that gets back to the team' and genuinely intends to pass it along. The Kressel Executive Office, when it corresponds directly, is signed only with a title and 'Kressel Executive Office, New York University.' The sadness in the tone is structural, not performed.",
  },
  moves: [
    {
      id: "rival-move/nyu-kressel/institutional-competing-bid",
      family: "contract_challenge",
      weight: 9,
      cooldownMinutes: 1440,
      briefingTemplate:
        "NYU Kressel has filed a competing bid. DELILA is cc'd on the correspondence and sends her regards; the Kressel Executive Office has attached the formal bid under separate cover, unsigned.",
      basePublicPressureDelta: 5,
      baseIntensityDelta: 2,
      choices: [
        {
          choiceId: "escalate-committee",
          label: "Escalate past DELILA",
          description: "Write to the Executive Office directly. Await the unsigned reply.",
          consequenceSummary: "Intel cost. Contract position marginally held.",
          effects: [
            { kind: "intel_delta", targetRef: "guild", value: -2 },
            { kind: "contract_pressure_delta", targetRef: "guild", value: -1 },
          ],
        },
        {
          choiceId: "route-around",
          label: "Route around the Executive Office",
          description:
            "Approach the client's decision-maker directly before the committee responds.",
          consequenceSummary: "Treasury cost. Reputation up.",
          effects: [
            { kind: "treasury_delta", targetRef: "guild", value: -110 },
            { kind: "reputation_delta", targetRef: "guild", value: 2 },
          ],
        },
        {
          choiceId: "concede-gracefully",
          label: "Concede the contract",
          description: "Send DELILA a warm note and focus on work below NYU's threshold.",
          consequenceSummary: "Public pressure rises. Morale holds.",
          effects: [
            { kind: "public_pressure_delta", targetRef: "guild", value: 3 },
            { kind: "morale_delta", targetRef: "team", value: 1 },
          ],
        },
      ],
    },
    {
      id: "rival-move/nyu-kressel/pipeline-fellowship-capture",
      family: "recruitment_market_loss",
      weight: 8,
      cooldownMinutes: 2880,
      briefingTemplate:
        "Your top CAS undergraduate recruit has declined your offer. She'll be joining the NYU Kressel Pipeline Fellowship with full graduate-tuition forgiveness. DELILA has invited her to the Fellowship welcome reception at Bobst Library.",
      basePublicPressureDelta: 4,
      baseIntensityDelta: 3,
      choices: [
        {
          choiceId: "match-fellowship",
          label: "Match the fellowship economics",
          description: "Structure a multi-year package with tuition offset.",
          consequenceSummary: "Treasury hit. Loyalty holds.",
          effects: [
            { kind: "treasury_delta", targetRef: "guild", value: -140 },
            { kind: "loyalty_delta", targetRef: "team", value: 1 },
          ],
        },
        {
          choiceId: "rebuild-pipeline",
          label: "Rebuild your recruiting pipeline outside NYU",
          description: "Pivot to CUNY, Fordham, and specialist academies.",
          consequenceSummary: "Team cohesion up. Slow yield.",
          effects: [
            { kind: "team_cohesion_delta", targetRef: "team", value: 2 },
            { kind: "morale_delta", targetRef: "team", value: -1 },
          ],
        },
      ],
    },
    {
      id: "rival-move/nyu-kressel/alumni-network-capture",
      family: "sponsor_interference",
      weight: 7,
      cooldownMinutes: 2160,
      briefingTemplate:
        "The Hunters Point sponsor's general counsel is NYU Law, class of 2008. Counsel and the Kressel Executive Office are scheduled for a call Thursday afternoon. You were not copied on the invitation. DELILA has sent you a warm note about an unrelated panel next month.",
      basePublicPressureDelta: 6,
      baseIntensityDelta: 3,
      choices: [
        {
          choiceId: "counsel-outreach",
          label: "Put your counsel on a parallel track",
          description: "Force the sponsor to respond on formal terms before Thursday.",
          consequenceSummary: "Treasury cost. Contract salvageable.",
          effects: [
            { kind: "treasury_delta", targetRef: "guild", value: -90 },
            { kind: "contract_pressure_delta", targetRef: "guild", value: -2 },
          ],
        },
        {
          choiceId: "attend-panel",
          label: "Accept DELILA's panel invite",
          description: "Show up at the NYU event. Be in the room, even at the margin.",
          consequenceSummary: "Reputation up. Intel cost.",
          effects: [
            { kind: "reputation_delta", targetRef: "guild", value: 2 },
            { kind: "intel_delta", targetRef: "guild", value: -1 },
          ],
        },
        {
          choiceId: "move-on",
          label: "Move on from the contract",
          description: "Redirect bid effort to a sponsor without an NYU Law general counsel.",
          consequenceSummary: "No cost. Public pressure creeps.",
          effects: [
            { kind: "public_pressure_delta", targetRef: "guild", value: 2 },
            { kind: "morale_delta", targetRef: "team", value: -1 },
          ],
        },
      ],
    },
  ],
} satisfies RivalRecord;

import type { RivalRecord } from "./schema";

export const kinRivalRecord = {
  id: "rival/kin",
  guildName: "Kin",
  shortDisplayName: "Kin",
  leader: {
    name: "Frankie D'Amico",
  },
  pressureLane: "labor-market",
  copy: {
    currentRivalOneLiner:
      "Frankie D'Amico is U-rank, does not care about the leaderboard, and took the contract you wanted because it was close to her apartment.",
  },
  assetPaths: {
    leaderPortrait: "/data/rivals/kin/leader-neutral.png",
    insignia: "/data/rivals/kin/insignia.png",
  },
  narrativeProfile: {
    operatingBase:
      "The ground floor of a small mixed-use building on a residential Ridgewood block. The space was a Polish deli before her, and the previous tenant's painted-glass signage is still mostly intact across the front window — faded red serif spelling WOJCIK DELI. A small four-dot vinyl decal with Kin's mark on the front door is the only thing she added. Dispatch desk is a folding table. Contract filings live on a bookshelf next to a record player. The deli's original meat slicer is still in the corner. Frankie lives upstairs.",
    publicPitch:
      "Kin — a small Ridgewood clearance guild, founded and led by licensed U-rank summoner Frankie D'Amico.",
    pressureStyle:
      "Labor-market and existential-irrelevance pressure from a tier you will not reach. Kin lose to you on scale, geographic reach, and any contract Frankie finds boring. They beat you on raw clearance throughput (Frankie with three U-threat summons can solo contracts your full squad cannot), on the narrow recruiting pool they care about, and on an implicit rank asymmetry that bends every interaction. The rivalry is not about out-competing her — it is about not being in her way on the days she decides to work.",
    rivalryFantasy:
      "You are not competing with her. She operates at a tier you will never reach, and she does not care about the tier. She takes the contract you bid on because it was close to her apartment. She is polite when you run into her on site, and she does not remember your name the next time. The irritation is not that she is winning the same game; it is that she is not playing the game and is still ahead. Under the irritation is a real uncertainty — no one knows what her ceiling is, including her. The fourth summon has not arrived yet.",
    toneAndVoice:
      "Flat outer-borough New York cadence with Gen Z drawl. Drawn-out vowels, vocal-fry adjacent, 'yeah no' and 'no yeah' constructions. Direct without performing rudeness or politeness. She does not code-switch up for professional contexts and talks the same to a licensing officer as to a barista. Says 'dude' to Celeste Tan's executive assistant on the phone. Swears casually in conversation and almost never in public-facing copy, not because she is curating but because she is bored of saying it twice. Never insults — the rank gap does the work.",
  },
  moves: [
    {
      id: "rival-move/kin/unannounced-site-arrival",
      family: "site_arrival",
      weight: 10,
      cooldownMinutes: 1440,
      briefingTemplate:
        "Kin arrived on-site before your crew. Cobble has disaggregated into the alley. Verity is briefly wearing your intake officer's face. District patch logs show Kin cleared the floor before your operators deployed. No bid was filed.",
      basePublicPressureDelta: 6,
      baseIntensityDelta: 4,
      choices: [
        {
          choiceId: "file-scope-dispute",
          label: "File a scope dispute",
          description: "Escalate to the licensing board. The filing will take weeks.",
          consequenceSummary: "Treasury cost. Marginal recovery.",
          effects: [
            { kind: "treasury_delta", targetRef: "guild", value: -100 },
            { kind: "reputation_delta", targetRef: "guild", value: 1 },
          ],
        },
        {
          choiceId: "pull-out-and-absorb",
          label: "Pull out and absorb the loss",
          description: "Accept it. Rotate the crew onto the next contract.",
          consequenceSummary: "Morale dips. No out-of-pocket cost.",
          effects: [
            { kind: "morale_delta", targetRef: "team", value: -2 },
            { kind: "contract_pressure_delta", targetRef: "guild", value: -3 },
          ],
        },
      ],
    },
    {
      id: "rival-move/kin/vibes-audition-poach",
      family: "recruitment_market_loss",
      weight: 8,
      cooldownMinutes: 2880,
      briefingTemplate:
        "A weird-talented applicant you were tracking sat at Frankie's folding card table this morning. She offered them a bunk and a spot on the roster. They said yes before you could counter.",
      basePublicPressureDelta: 3,
      baseIntensityDelta: 3,
      choices: [
        {
          choiceId: "widen-net",
          label: "Widen the recruiting net",
          description: "Push into adjacent boroughs where Frankie's audition cannot reach.",
          consequenceSummary: "Treasury cost. Wider pipeline.",
          effects: [
            { kind: "treasury_delta", targetRef: "guild", value: -60 },
            { kind: "team_cohesion_delta", targetRef: "team", value: 1 },
          ],
        },
        {
          choiceId: "accept-loss",
          label: "Accept the loss",
          description: "Frankie cannot reverse-engineer her own criteria. Neither can you.",
          consequenceSummary: "Loyalty wobbles. Intel banks.",
          effects: [
            { kind: "loyalty_delta", targetRef: "team", value: -1 },
            { kind: "intel_delta", targetRef: "guild", value: 2 },
          ],
        },
      ],
    },
    {
      id: "rival-move/kin/collateral-presence",
      family: "public_comparison",
      weight: 6,
      cooldownMinutes: 2160,
      briefingTemplate:
        "A bystander filmed Cobble sitting criss-cross outside the clearance site for forty minutes. The Porter hung over a passing news camera like a spill of black wire. Frankie has not responded to the contract office.",
      basePublicPressureDelta: 4,
      baseIntensityDelta: 2,
      choices: [
        {
          choiceId: "file-complaint",
          label: "File a public-safety complaint",
          description: "Note the collateral presence on record with the district.",
          consequenceSummary: "Reputation up. Public pressure bleeds.",
          effects: [
            { kind: "reputation_delta", targetRef: "guild", value: 1 },
            { kind: "public_pressure_delta", targetRef: "guild", value: -2 },
          ],
        },
        {
          choiceId: "shrug",
          label: "Say nothing",
          description: "It is Ridgewood. The neighborhood handles it.",
          consequenceSummary: "Morale ticks. No cost.",
          effects: [
            { kind: "morale_delta", targetRef: "team", value: -1 },
            { kind: "public_pressure_delta", targetRef: "guild", value: 2 },
          ],
        },
      ],
    },
  ],
} satisfies RivalRecord;

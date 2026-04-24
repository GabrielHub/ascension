import type { RivalRecord } from "./schema";

export const keystoneRivalRecord = {
  id: "rival/keystone",
  guildName: "Keystone",
  shortDisplayName: "Keystone",
  leader: {
    name: "Aaliyah Beaumont",
  },
  pressureLane: "hybrid",
  copy: {
    currentRivalOneLiner:
      "Aaliyah Beaumont is still ranked above you on career totals from the year she was on the Dungeon Quarterly cover. Her roster looks like her on paper and does not move like her in the field.",
  },
  assetPaths: {
    leaderPortrait: "/data/rivals/keystone/leader-neutral.png",
    insignia: "/data/rivals/keystone/insignia.png",
  },
  narrativeProfile: {
    operatingBase:
      "A cast-iron loft on Greene Street between Prince and Spring, a block from the Prada and Chanel flagships. Polished concrete, exposed cast-iron columns painted matte black, gallery-white walls, and a blackened-oak reception desk. A muted wall-mounted screen plays rolling footage of her pre-injury career on loop — Aaliyah does not watch it. Upstairs: her private office with a custom ergonomic chair sized for the spinal orthosis and a framed first-cover Dungeon Quarterly print her assistant hung.",
    publicPitch:
      "Keystone — a licensed SoHo clearance firm founded by A-rank attuned Aaliyah Beaumont.",
    pressureStyle:
      "Legacy-gravity prestige and marquee sponsor-network leverage layered with a labor-market deficit the firm cannot yet hide. Keystone loses to you on real clearance throughput, on candidate judgment, on operator retention, and on any bid where the client has seen recent results rather than the pre-March highlight reel. Keystone beats you on legacy-weighted leaderboard ranking, on marquee sponsor retention, on comeback-narrative press coverage, on above-the-line candidate pipeline, on couture-brace press bleed, and on social-calendar presence at galas you cannot buy into.",
    rivalryFantasy:
      "You watched her highlight reel before you got your own license. The Suspend was on Dungeon Quarterly twice. Now she has founded her own firm eight blocks from your office, sponsors are signing retainers with her name, and she has never scouted an operator in her life. Her roster looks like her on paper and does not move like her in the field. Her assistant forwards your congratulatory email and she replies personally, asking if you want to grab coffee. The next week she passes on a candidate who has since been the best operator on your bench. She is ranked above you. She is working harder than you are. She is not getting better fast enough.",
    toneAndVoice:
      "Composed, warmly professional, dancer-trained precision in word choice — she picks phrases the way she used to pick landings. Press-ready cadence, pauses engineered to sound unrehearsed. She never raises her voice. She never insults publicly. Her frustration with her operators leaks in roster-review subtext — small pauses, the phrase 'that's close' carrying more edge than the words do. Gracious about the Suspend, gracious about the brace, gracious about comeback questions. Never references the Madison Avenue incident on record.",
  },
  moves: [
    {
      id: "rival-move/keystone/legacy-leaderboard-bid",
      family: "contract_challenge",
      weight: 9,
      cooldownMinutes: 1440,
      briefingTemplate:
        "Keystone has filed a competing bid. Aaliyah Beaumont's office has cc'd you a warm personal note and an invitation to the SoHo loft for coffee at her convenience.",
      basePublicPressureDelta: 6,
      baseIntensityDelta: 3,
      choices: [
        {
          choiceId: "accept-coffee",
          label: "Accept the coffee invite",
          description: "Sit with her in the SoHo loft. Keep it cordial.",
          consequenceSummary: "Reputation up. Contract position weakens.",
          effects: [
            { kind: "reputation_delta", targetRef: "guild", value: 2 },
            { kind: "contract_pressure_delta", targetRef: "guild", value: -2 },
          ],
        },
        {
          choiceId: "match-bid-quietly",
          label: "Match the bid",
          description: "Counter on value and skip the coffee. Let the work speak.",
          consequenceSummary: "Treasury down. Contract held.",
          effects: [
            { kind: "treasury_delta", targetRef: "guild", value: -150 },
            { kind: "contract_pressure_delta", targetRef: "guild", value: -1 },
          ],
        },
        {
          choiceId: "decline-publicly",
          label: "Publicly decline the invite",
          description: "Skip the coffee. Let aligned press frame it however it frames.",
          consequenceSummary: "Public pressure rises. Morale holds.",
          effects: [
            { kind: "public_pressure_delta", targetRef: "guild", value: 3 },
            { kind: "morale_delta", targetRef: "team", value: 1 },
          ],
        },
      ],
    },
    {
      id: "rival-move/keystone/pattern-match-recruit-loss",
      family: "recruitment_market_loss",
      weight: 7,
      cooldownMinutes: 2880,
      briefingTemplate:
        "A candidate you interviewed twice last month has signed with Keystone. Your intake notes flag that the candidate looks, on paper, very much like Aaliyah Beaumont at twenty-four.",
      basePublicPressureDelta: 3,
      baseIntensityDelta: 3,
      choices: [
        {
          choiceId: "watch-and-wait",
          label: "Watch and wait",
          description: "Aaliyah's coaching failure will return the candidate to market.",
          consequenceSummary: "No cost. Intel banks for later.",
          effects: [
            { kind: "intel_delta", targetRef: "guild", value: 2 },
            { kind: "morale_delta", targetRef: "team", value: -1 },
          ],
        },
        {
          choiceId: "sign-passed-candidates",
          label: "Sign the candidates she passed on",
          description: "Move on the operators Aaliyah's scouting filter rejected.",
          consequenceSummary: "Team cohesion up. Treasury down.",
          effects: [
            { kind: "team_cohesion_delta", targetRef: "team", value: 2 },
            { kind: "treasury_delta", targetRef: "guild", value: -80 },
          ],
        },
      ],
    },
    {
      id: "rival-move/keystone/comeback-narrative-cover",
      family: "press_gravity",
      weight: 7,
      cooldownMinutes: 2160,
      briefingTemplate:
        "Dungeon Quarterly has re-run the Suspend-cover silhouette on its fifteen-year retrospective cover this month. Keystone's press office has declined to comment. The magazine mentions the Madison Avenue incident in paragraph six.",
      basePublicPressureDelta: 5,
      baseIntensityDelta: 2,
      choices: [
        {
          choiceId: "place-counter-profile",
          label: "Place a counter-profile",
          description: "Pitch your guild's recent work to the same editors.",
          consequenceSummary: "Treasury cost. Reputation up.",
          effects: [
            { kind: "treasury_delta", targetRef: "guild", value: -70 },
            { kind: "reputation_delta", targetRef: "guild", value: 2 },
          ],
        },
        {
          choiceId: "ignore-cover",
          label: "Ignore the cover",
          description: "Keep shipping work. The comeback narrative will erode on its own.",
          consequenceSummary: "Public pressure rises. Morale holds.",
          effects: [
            { kind: "public_pressure_delta", targetRef: "guild", value: 3 },
            { kind: "morale_delta", targetRef: "team", value: 1 },
          ],
        },
      ],
    },
  ],
} satisfies RivalRecord;

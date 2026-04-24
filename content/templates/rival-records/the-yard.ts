import type { RivalRecord } from "./schema";

export const theYardRivalRecord = {
  id: "rival/the-yard",
  guildName: "The Yard",
  shortDisplayName: "The Yard",
  leader: {
    name: 'Tahmina "Mina" Hossain',
  },
  pressureLane: "labor-market",
  copy: {
    currentRivalOneLiner:
      "Mina is on-site in the damaged plate at 7am and your best Bronx recruit trained at The Yard.",
  },
  assetPaths: {
    leaderPortrait: "/data/rivals/the-yard/leader-neutral.png",
    insignia: "/data/rivals/the-yard/insignia.png",
  },
  narrativeProfile: {
    operatingBase:
      "A converted two-story former auto-body and taxi-dispatch building on a light-industrial stretch of Castle Hill Avenue, ten minutes from the Parkchester 6 stop. The original business's repainted roll-up steel gate fronts the sidewalk with THE YARD stenciled across it in oxide-red block caps. Behind the gate: a chain-link enclosed asphalt yard with weight sleds, a full-kit armor drill rack, a shield-wall drill circle chalked onto the asphalt, and a single folding card table where Mina takes walk-in applicant interviews. Ground floor: dispatch office, indoor drill space, armor lockers along one wall, a working smith's bench in the back corner where the commissioned plate is maintained. Upstairs: Mina's office and a roster bunk room with six cots.",
    publicPitch:
      "The Yard — a Bronx combat-clearance guild out of Parkchester, founded and fielded by licensed A-rank attuned Tahmina Hossain.",
    pressureStyle:
      "Pipeline-training labor-market supply layered with mid-tier combat contract absorption and visible-principal-in-the-field signal. The Yard loses to you on any contract gated by media polish, executive-suite sophistication, or sponsor-network credentialing, on above-tier and institutional contracts Mina does not pursue, and on Manhattan prestige-commercial clearances where Halcyon-adjacent client memory quietly costs the bid. The Yard beats you on Bronx and Hunts Point mid-tier combat throughput, on pipeline-trained operator supply (Mina's eight-month drill cycle produces reliable mid-tier operators from rookies other guilds will not look at), on wash-out compensation anchoring (Yard wash-outs arrive at your guild pre-hardened with Mina's tactical habits and an implicit compensation ask), on borough-native recruiting trust, and on principal-in-the-field credibility — Mina is visibly on-site in damaged commissioned plate at every Yard contract.",
    rivalryFantasy:
      "You cannot out-polish her. She does not want what you want. The Yard takes the Bronx mid-tier combat contracts your roster depends on for volume, shift after shift, and Mina is on every one of them in the damaged plate the whole industry knows the crack in. The rookie you passed on last fall is fielding for her now. The recruit you are interviewing next week trained at The Yard and did not finish, and the compensation conversation starts at a number you did not choose. You are meaningfully better-funded, better-branded, better-connected — and the trade-press profile does not run, because Mina does not sit for them, and the Bronx does not read them. The rivalry fantasy is not that Mina is winning; she is not competing for your position. The rivalry fantasy is that the city's mid-tier combat labor market has quietly reoriented around her drill yard, and her visible presence at dawn in a helmet cracked by the wipe your industry prefers not to discuss is a standing argument against the kind of guild you are trying to be.",
    toneAndVoice:
      "Direct outer-borough New York cadence with the specific flatness of a person who has been on a clearance site for four hours already when you meet her. Bronx working-class register, no code-switch up for clients or licensing officers; the same voice to a rookie on their first drill morning, to a contract office, to a sponsor's general counsel. Uses industry vocabulary flatly — 'the site,' 'the contract,' 'the roster,' 'the cycle' — without the modifiers a prestige principal would layer in. Does not perform warmth. Does not perform toughness either; the toughness is structural, not affective. Corrections are specific, brief, and not repeated. Declines are one sentence and the client does not argue. Never references Halcyon on record; when asked, replies that Halcyon is dissolved and the question is already answered. Never discusses the helmet crack; when photographed, does not remove the helmet for the shot. Low-affect, specific, present, short.",
  },
  moves: [
    {
      id: "rival-move/the-yard/commercial-contract-taken",
      family: "contract_challenge",
      weight: 9,
      cooldownMinutes: 1440,
      briefingTemplate:
        "The Yard has taken the Hunts Point commercial-clearance contract you bid on. Mina is already on-site in the damaged plate with three rookies you recognize from last winter's open-house intake.",
      basePublicPressureDelta: 5,
      baseIntensityDelta: 3,
      choices: [
        {
          choiceId: "file-scope-protest",
          label: "File a scope protest",
          description: "Challenge the award on procurement grounds.",
          consequenceSummary: "Treasury cost. Contract stays with The Yard.",
          effects: [
            { kind: "treasury_delta", targetRef: "guild", value: -140 },
            { kind: "reputation_delta", targetRef: "guild", value: -1 },
          ],
        },
        {
          choiceId: "rotate-to-next",
          label: "Rotate the crew onto the next contract",
          description: "Accept the loss. Keep shipping volume.",
          consequenceSummary: "Morale dips. No cost.",
          effects: [
            { kind: "morale_delta", targetRef: "team", value: -2 },
            { kind: "contract_pressure_delta", targetRef: "guild", value: -2 },
          ],
        },
      ],
    },
    {
      id: "rival-move/the-yard/washout-compensation-anchor",
      family: "recruitment_market_loss",
      weight: 8,
      cooldownMinutes: 2880,
      briefingTemplate:
        "A former Yard rookie has applied to your guild. She did not finish Mina's eight-month cycle. Her compensation ask is tighter than you expected and she does not negotiate on the shield-drill language in her cover letter.",
      basePublicPressureDelta: 2,
      baseIntensityDelta: 2,
      choices: [
        {
          choiceId: "accept-anchor",
          label: "Sign at her ask",
          description: "Take the pre-hardened operator at Mina's implicit compensation anchor.",
          consequenceSummary: "Treasury cost. Team cohesion up.",
          effects: [
            { kind: "treasury_delta", targetRef: "guild", value: -90 },
            { kind: "team_cohesion_delta", targetRef: "team", value: 2 },
          ],
        },
        {
          choiceId: "counter-below",
          label: "Counter below her ask",
          description: "Try to negotiate under The Yard's compensation floor.",
          consequenceSummary: "Candidate walks. Morale dips.",
          effects: [
            { kind: "morale_delta", targetRef: "team", value: -1 },
            { kind: "loyalty_delta", targetRef: "team", value: -1 },
          ],
        },
      ],
    },
    {
      id: "rival-move/the-yard/principal-at-dawn",
      family: "public_comparison",
      weight: 7,
      cooldownMinutes: 2160,
      briefingTemplate:
        "Two of your operators saw Mina at the West Farms clearance yard at 7:20 this morning. The helmet crack was visible without the hood. She nodded at them and went back to briefing her crew.",
      basePublicPressureDelta: 4,
      baseIntensityDelta: 2,
      choices: [
        {
          choiceId: "deploy-principal",
          label: "Field a visible senior on the next site",
          description:
            "Match the principal-in-the-field signal. Put a senior operator on dawn briefing.",
          consequenceSummary: "Reputation up. Morale holds.",
          effects: [
            { kind: "reputation_delta", targetRef: "guild", value: 2 },
            { kind: "morale_delta", targetRef: "team", value: 1 },
          ],
        },
        {
          choiceId: "ignore-comparison",
          label: "Keep the command structure",
          description: "Do not match the field-presence theatre.",
          consequenceSummary: "Public pressure rises. Team cohesion holds.",
          effects: [
            { kind: "public_pressure_delta", targetRef: "guild", value: 3 },
            { kind: "team_cohesion_delta", targetRef: "team", value: 1 },
          ],
        },
      ],
    },
  ],
} satisfies RivalRecord;

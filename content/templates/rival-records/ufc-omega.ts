import type { RivalRecord } from "./schema";

export const ufcOmegaRivalRecord = {
  id: "rival/ufc-omega",
  guildName: "UFC Omega",
  shortDisplayName: "Omega",
  leader: {
    name: "Maya & Aiko Brooks",
  },
  pressureLane: "hybrid",
  copy: {
    currentRivalOneLiner:
      "Maya and Aiko Brooks headline every Omega broadcast. They clear messier than you, faster than you, and on ESPN by Monday morning.",
  },
  assetPaths: {
    leaderPortrait: "/data/rivals/ufc-omega/leader-neutral.png",
    insignia: "/data/rivals/ufc-omega/insignia.png",
  },
  narrativeProfile: {
    operatingBase:
      "The Bedford-Union Armory on Bedford Avenue in Crown Heights — a Romanesque Revival redbrick drill-hall structure converted into UFC Omega's NY flagship venue in early 2024. The preserved landmark exterior fronts a fully rebuilt interior. The original drill hall is now the broadcast arena floor: a reconfigurable staging footprint that seats roughly eighteen hundred for undercard cage events and reconfigures for on-site raid-night broadcast staging, with a suspended four-sided broadcast rig, overhead lighting truss, and ringwalk tunnel cut through the south wall. Second floor: the fighters' training gym, heavy-bag row, two sparring rings, a grappling floor, weight rooms. Third floor: broadcast control, talent holding, the twins' shared private office, production meeting room, dispatch for clearance-licensing operations. Rear yard: broadcast truck bays and a loading dock.",
    publicPitch:
      "UFC Omega — combat-clearance at its highest level, broadcast live from the Bedford-Union Armory.",
    pressureStyle:
      "National-broadcast commercial edge crossed with cross-discipline labor-market recruiting, anchored by paired-unique principal talent that actually fields. UFC Omega loses to you on any contract gated by broadcast exclusion (gag orders, NDAs, survivor-sensitive work, government-adjacent contracts), on floors with no highlight value the twins cannot headline, and on late-night emergency contracts conflicting with the broadcast schedule. UFC Omega beats you on UFC-scale capital runway, on the national recruiting funnel (recruits see Omega promos during UFC cards), on the weekly ESPN-ticker ranked-league leaderboard, on bundled sponsor capture (energy drinks, fight gear, broadcast networks rolled into clearance contracts), on cross-discipline athletic recruiting, on walkout-and-weigh-in press amplification, and on the tier-event headline draw where the twins personally walk out for a PPV-scale contested clearance. The one seam running the other way is feed-mill alumni flow — Omega burns operators out in two to three years, and ring-brand alumni come onto the open market at discount.",
    rivalryFantasy:
      "You clear a Brooklyn Heights floor clean at two in the morning and file the paperwork by dawn. Nobody covers it. UFC Omega is clearing Greenpoint on the same weekend — a contract they bid against you for and won on the broadcast leg — and their pregame runs Friday at eight, Maya does the walkout, Aiko cracks her knuckles on-screen in the ringwalk tunnel, and the clip of her finishing the floor-three boss hits three million views before Sunday night. Your clearance was better work. Everybody who matters watched theirs. Two of your interview candidates signed with the Omega academy on Tuesday. The ESPN Monday ticker has Omega up a rank and lists your guild nowhere. UFC Omega are not villains — they will genuinely respect your work in post-fight interviews and name your guild on ESPN without irony. You will file your paperwork under a bridge while their post-fight presser streams in a cab window two blocks away.",
    toneAndVoice:
      "Fight-media-trained English from years of UFC walkouts, weigh-in face-offs, press junkets, and post-fight interviews. Brooklyn cadence filtered through ESPN polish — declarative, confident, unhurried, reflexively finding the camera and finding the light. Japanese-American and African-American Brooklyn inflections both surface naturally and are never code-switched away. Both use fight-sport terminology for clearance work — 'the main event,' 'the walkout,' 'the card,' 'the finish,' 'the tape,' 'camp week' — with no self-awareness that the translation is strange. Maya is the strategist register: quieter, breakdown-focused. Aiko is the showman register: camera-forward, finisher-confident. Neither is falsely humble and neither is arrogant. Warm to peers, genuinely respectful of rivals who do real work. They do not trash-talk. The insult, if there is one, is that every room they walk into is a headliner's room by default and every conversation about a competitor is a broadcast that gets clipped.",
  },
  moves: [
    {
      id: "rival-move/ufc-omega/espn-broadcast-bid",
      family: "contract_challenge",
      weight: 10,
      cooldownMinutes: 1440,
      briefingTemplate:
        "UFC Omega has filed a competing bid on the Clinton Hill residential cluster. Broadcast slot confirmed for Friday at eight. Maya and Aiko are headlining. ESPN pregame runs at seven-thirty.",
      basePublicPressureDelta: 7,
      baseIntensityDelta: 3,
      choices: [
        {
          choiceId: "counter-on-quiet",
          label: "Counter with an NDA-package pitch",
          description:
            "Pitch the client on broadcast exclusion — gag order, private walkthrough, no cameras.",
          consequenceSummary: "Treasury cost. Contract salvageable.",
          effects: [
            { kind: "treasury_delta", targetRef: "guild", value: -110 },
            { kind: "contract_pressure_delta", targetRef: "guild", value: -2 },
          ],
        },
        {
          choiceId: "match-broadcast",
          label: "Offer a counter-broadcast package",
          description: "Spin up press coverage to match Omega's production.",
          consequenceSummary: "Treasury bleeds. Reputation up.",
          effects: [
            { kind: "treasury_delta", targetRef: "guild", value: -200 },
            { kind: "reputation_delta", targetRef: "guild", value: 2 },
          ],
        },
        {
          choiceId: "concede-broadcast-leg",
          label: "Concede the broadcast-leg contract",
          description: "Accept the loss. Focus on floors Omega cannot televise.",
          consequenceSummary: "No cost. Public pressure rises.",
          effects: [
            { kind: "public_pressure_delta", targetRef: "guild", value: 4 },
            { kind: "morale_delta", targetRef: "team", value: -1 },
          ],
        },
      ],
    },
    {
      id: "rival-move/ufc-omega/academy-signing",
      family: "recruitment_market_loss",
      weight: 8,
      cooldownMinutes: 2880,
      briefingTemplate:
        "Two of your interview candidates signed with the Omega academy this week. Relocation packages included personal meetings with Maya Brooks at the Bedford-Union Armory and a walkout-track session with an Omega-sponsored production studio.",
      basePublicPressureDelta: 4,
      baseIntensityDelta: 3,
      choices: [
        {
          choiceId: "pick-up-alumni",
          label: "Pick up Omega alumni off the open market",
          description: "Move on burnt-out ring-brand alumni Omega has cycled through.",
          consequenceSummary: "Team cohesion up. Treasury cost.",
          effects: [
            { kind: "treasury_delta", targetRef: "guild", value: -90 },
            { kind: "team_cohesion_delta", targetRef: "team", value: 2 },
          ],
        },
        {
          choiceId: "pivot-pipeline",
          label: "Pivot the recruiting pipeline",
          description: "Refocus on candidates Omega does not scout.",
          consequenceSummary: "Morale holds. Intel cost.",
          effects: [
            { kind: "intel_delta", targetRef: "guild", value: -2 },
            { kind: "loyalty_delta", targetRef: "team", value: 1 },
          ],
        },
      ],
    },
    {
      id: "rival-move/ufc-omega/tonight-show-segment",
      family: "press_gravity",
      weight: 7,
      cooldownMinutes: 2160,
      briefingTemplate:
        "Maya Brooks is on The Tonight Show tomorrow. The segment is titled 'The Twins Who Fight Together.' Producers have asked whether your guild would like to be named as 'the next generation of indie shops.' They will name you either way.",
      basePublicPressureDelta: 5,
      baseIntensityDelta: 2,
      choices: [
        {
          choiceId: "engage-segment",
          label: "Accept the 'indie shops' framing",
          description: "Send a quote. Take the namecheck on the segment.",
          consequenceSummary: "Reputation up. Public pressure holds.",
          effects: [
            { kind: "reputation_delta", targetRef: "guild", value: 2 },
            { kind: "intel_delta", targetRef: "guild", value: -1 },
          ],
        },
        {
          choiceId: "decline-segment",
          label: "Decline to comment",
          description: "Let the segment run without your quote. The framing runs anyway.",
          consequenceSummary: "Morale holds. Public pressure rises.",
          effects: [
            { kind: "public_pressure_delta", targetRef: "guild", value: 3 },
            { kind: "morale_delta", targetRef: "team", value: 1 },
          ],
        },
      ],
    },
  ],
} satisfies RivalRecord;

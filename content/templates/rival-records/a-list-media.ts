import type { RivalRecord } from "./schema";

export const aListMediaRivalRecord = {
  id: "rival/a-list-media",
  guildName: "A-List Media",
  shortDisplayName: "A-List",
  leader: {
    name: "Renata Castillo",
  },
  pressureLane: "prestige",
  copy: {
    currentRivalOneLiner:
      "Ren Castillo would love to have you on the podcast. She is ranked above you on paper and has never cleared a floor.",
  },
  assetPaths: {
    leaderPortrait: "/data/rivals/a-list-media/leader-neutral.png",
    insignia: "/data/rivals/a-list-media/insignia.png",
  },
  narrativeProfile: {
    operatingBase:
      "A converted warehouse studio on Water Street in DUMBO. The ground floor is a production stage with ring-lit briefing sets, a podcast corner, and a livestream control room wired into a wall of rack-mounted encoders. A small dispatch desk sits behind a smoked-glass partition past the edit bays. Ren's back office holds a framed NY1 press credential next to her A-rank certificate, both individually lit.",
    publicPitch:
      "A-List Media — New York's livestream-native clearance firm, founded and led by A-rank attuned media veteran Ren Castillo.",
    pressureStyle:
      "Press-first narrative control with a rarely-deployed and possibly never-deployable A-rank principal. A-List loses to you on real clearance outcomes and contract execution. They beat you on press framing, livestream prestige, operator celebrity, sponsor press-packet bundling, and the ability to turn bad outcomes into sympathetic long-form content.",
    rivalryFantasy:
      "You are doing better work than A-List Media, and Ren is still above you on every leaderboard, in every sponsor's mind, in every press write-up. She is warm, supportive, and camera-friendly. Every interaction is extractive and every interaction is content. When a big contested contract comes up she announces she is personally taking the field — and then something comes up, her roster runs it, and the framing sticks anyway.",
    toneAndVoice:
      "Warm broadcast-trained English with the residual cadence of a field reporter. Declarative sentences, crisp enunciation, natural conversational pauses engineered to sound unscripted. The reflex is to reframe aggressive questions as interesting angles. She never insults — the insult is the framing she will publish about you next Tuesday.",
  },
  moves: [
    {
      id: "rival-move/a-list-media/competing-bid-podcast-invite",
      family: "contract_challenge",
      weight: 10,
      cooldownMinutes: 1440,
      briefingTemplate:
        "A-List Media has filed a competing bid — and Ren would love to have you on the pod to talk about the overlap. No gotchas, promise. Ren hosts personally.",
      basePublicPressureDelta: 6,
      baseIntensityDelta: 3,
      choices: [
        {
          choiceId: "counter-bid",
          label: "Counter-bid aggressively",
          description: "Sharpen the bid, spend to hold the contract, skip the podcast.",
          consequenceSummary: "Treasury down. Reputation held.",
          effects: [
            { kind: "treasury_delta", targetRef: "guild", value: -150 },
            { kind: "reputation_delta", targetRef: "guild", value: 1 },
          ],
        },
        {
          choiceId: "accept-podcast",
          label: "Accept the podcast invite",
          description: "Sit for the interview; the bid is a pretext for the booking.",
          consequenceSummary: "Exposure up, but intel leaks to A-List.",
          effects: [
            { kind: "reputation_delta", targetRef: "guild", value: 2 },
            { kind: "intel_delta", targetRef: "guild", value: -2 },
            { kind: "public_pressure_delta", targetRef: "guild", value: 2 },
          ],
        },
        {
          choiceId: "decline-silent",
          label: "Decline silently",
          description: "Ignore the pitch and let the bid land where it lands.",
          consequenceSummary: "No cost. The framing runs anyway.",
          effects: [
            { kind: "reputation_delta", targetRef: "guild", value: -2 },
            { kind: "public_pressure_delta", targetRef: "guild", value: 3 },
          ],
        },
      ],
    },
    {
      id: "rival-move/a-list-media/ghost-deploy-ren",
      family: "press_gravity",
      weight: 8,
      cooldownMinutes: 2880,
      briefingTemplate:
        "Ren Castillo is taking the Brooklyn Heights clearance herself this weekend. Coverage goes live Friday at eight. Quick follow-up: Ren's weekend locked up at the last minute — her team runs the site. Coverage still goes live Friday at eight.",
      basePublicPressureDelta: 7,
      baseIntensityDelta: 2,
      choices: [
        {
          choiceId: "call-it-out",
          label: "Call out the pattern publicly",
          description: "Get the ghost-deploy into industry press before Friday's broadcast.",
          consequenceSummary: "Reputation up if it lands, intel cost to place it.",
          effects: [
            { kind: "intel_delta", targetRef: "guild", value: -2 },
            { kind: "reputation_delta", targetRef: "guild", value: 2 },
            { kind: "public_pressure_delta", targetRef: "guild", value: -2 },
          ],
        },
        {
          choiceId: "stay-quiet",
          label: "Say nothing, let the coverage run",
          description: "Refuse to feed the segment and hope the story fades.",
          consequenceSummary: "Team morale dips. Framing sticks.",
          effects: [
            { kind: "morale_delta", targetRef: "team", value: -2 },
            { kind: "public_pressure_delta", targetRef: "guild", value: 3 },
          ],
        },
      ],
    },
    {
      id: "rival-move/a-list-media/docuseries-heads-up",
      family: "press_gravity",
      weight: 7,
      cooldownMinutes: 2160,
      briefingTemplate:
        "A-List Media's newest docuseries episode drops tomorrow. It is about the Queens blackout raid. Your guild is not the focus, but you are mentioned. Ren wanted to give you a heads-up.",
      basePublicPressureDelta: 5,
      baseIntensityDelta: 2,
      choices: [
        {
          choiceId: "engage-press",
          label: "Coordinate a counter-statement",
          description: "Put your counsel on the record before the episode airs.",
          consequenceSummary: "Treasury cost, reputation held.",
          effects: [
            { kind: "treasury_delta", targetRef: "guild", value: -80 },
            { kind: "reputation_delta", targetRef: "guild", value: 1 },
          ],
        },
        {
          choiceId: "no-comment",
          label: "Decline to comment",
          description: "Let the edit run. The mention is minor.",
          consequenceSummary: "No cost. Minor reputation hit.",
          effects: [
            { kind: "reputation_delta", targetRef: "guild", value: -1 },
            { kind: "public_pressure_delta", targetRef: "guild", value: 2 },
          ],
        },
        {
          choiceId: "feed-the-narrative",
          label: "Offer an on-camera interview",
          description: "Give A-List what they want and take the airtime.",
          consequenceSummary: "Short-term reputation spike, longer-term intel bleed.",
          effects: [
            { kind: "reputation_delta", targetRef: "guild", value: 2 },
            { kind: "intel_delta", targetRef: "guild", value: -3 },
          ],
        },
      ],
    },
  ],
} satisfies RivalRecord;

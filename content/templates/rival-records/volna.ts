import type { RivalRecord } from "./schema";

export const volnaRivalRecord = {
  id: "rival/volna",
  guildName: "Volna",
  shortDisplayName: "Volna",
  leader: {
    name: "Irina Weiss",
  },
  pressureLane: "sponsor-network",
  copy: {
    currentRivalOneLiner:
      "Irina Weiss appeared in her pale-amber base form at yesterday's filing, liaison-verified and time-stamped. Her skin-up form closed another of your sponsors at a Brighton Beach dinner you were not invited to.",
  },
  assetPaths: {
    leaderPortrait: "/data/rivals/volna/leader-neutral.png",
    insignia: "/data/rivals/volna/insignia.png",
  },
  narrativeProfile: {
    operatingBase:
      "An oceanfront row house on a residential Brighton Beach block, two doors down from a banquet hall. The ground floor is dispatch — heavy drapes drawn against daylight, a long glass conference table, bottled sparkling water in an ice bucket. Contract filings are kept in a fire safe in the coat closet. Liaison records — time-stamped photographs and written affidavits of Irina in base form — live in a locked binder on the reception desk. She does the filings in base form by law; every sponsor dinner since has been in skin-up.",
    publicPitch:
      "Volna — a Brighton Beach clearance guild founded by liaison-verified shifter summoner Irina Weiss.",
    pressureStyle:
      "Sponsor-network and hospitality pressure. Volna lose to you on roster size, clearance throughput, public-face coverage, and any engagement that requires a verified base-form appearance. They beat you on private sponsor access — Irina's skin-up form attends dinners you are not invited to and closes rooms your executives cannot enter. The rivalry is that the deals happen at tables you cannot see.",
    rivalryFantasy:
      "Irina is polite, careful, and correctly documented. She files everything in base form and does every sponsor dinner in skin-up, and the licensing board accepts the split. Your sponsors mention 'a very charming dinner' and decline to describe who was there. You cannot out-bid a rival whose best channel is a face you never see and whose paperwork is cleaner than yours. The irritation is not that she is winning; it is that you have no read on the room where she is winning.",
    toneAndVoice:
      "Brighton Beach Russian-American, measured and warm. Careful English with an accent she does not hide. Written correspondence uses liaison-standard phrasing ('I confirm in base form that…'). In public, she speaks little and listens carefully. Skin-up Irina's voice is not on file; the licensing board does not require it to be, and she does not volunteer it. Says 'thank you for your patience' and means it.",
  },
  moves: [
    {
      id: "rival-move/volna/skin-up-sponsor-dinner",
      family: "sponsor_interference",
      weight: 10,
      cooldownMinutes: 1440,
      briefingTemplate:
        "Your flagship sponsor attended a private Brighton Beach dinner last night. The guest list is not on paper. Your retainer renewal was postponed 'for a fuller look at regional options' this morning.",
      basePublicPressureDelta: 5,
      baseIntensityDelta: 3,
      choices: [
        {
          choiceId: "request-in-person-audit",
          label: "Request an in-person audit",
          description:
            "Ask the sponsor's legal to schedule a formal review with you in the room. Force the daylight meeting.",
          consequenceSummary: "Treasury cost. Sponsor returns to position.",
          effects: [
            { kind: "treasury_delta", targetRef: "guild", value: -140 },
            { kind: "reputation_delta", targetRef: "guild", value: 1 },
          ],
        },
        {
          choiceId: "hold-the-line",
          label: "Hold the line",
          description:
            "Do not chase the sponsor into a room you cannot enter. Work the contracts you can see.",
          consequenceSummary: "No cash cost. Public pressure rises.",
          effects: [
            { kind: "public_pressure_delta", targetRef: "guild", value: 4 },
            { kind: "morale_delta", targetRef: "team", value: -1 },
          ],
        },
      ],
    },
    {
      id: "rival-move/volna/liaison-clean-filing",
      family: "contract_challenge",
      weight: 7,
      cooldownMinutes: 2880,
      briefingTemplate:
        "Volna filed a competing bid at 2:14 AM in base form, liaison-stamped and legally unimpeachable. The licensing board's overnight review flagged nothing. Your morning team is catching up.",
      basePublicPressureDelta: 4,
      baseIntensityDelta: 3,
      choices: [
        {
          choiceId: "sharpen-bid-same-day",
          label: "Sharpen your bid same-day",
          description: "Get your own filing amended before the morning window closes.",
          consequenceSummary: "Treasury cost. Contract stays in play.",
          effects: [
            { kind: "treasury_delta", targetRef: "guild", value: -110 },
            { kind: "reputation_delta", targetRef: "guild", value: 1 },
          ],
        },
        {
          choiceId: "concede-filing",
          label: "Concede the filing",
          description: "Volna's paperwork is clean. Take the loss and work the next window.",
          consequenceSummary: "Rep dips. Intel on Volna's filing cadence banks.",
          effects: [
            { kind: "reputation_delta", targetRef: "guild", value: -1 },
            { kind: "intel_delta", targetRef: "guild", value: 2 },
          ],
        },
      ],
    },
    {
      id: "rival-move/volna/shifter-charm-poach",
      family: "recruitment_market_loss",
      weight: 6,
      cooldownMinutes: 2160,
      briefingTemplate:
        "A candidate you were holding on retainer met 'a Volna recruiter' at the Oceana banquet hall last Friday. He could not describe her face. He signed a letter of intent the next morning.",
      basePublicPressureDelta: 3,
      baseIntensityDelta: 2,
      choices: [
        {
          choiceId: "counter-with-stability",
          label: "Counter with stability",
          description:
            "Put a long-term contract and benefits package in front of him. A number he can tell his family.",
          consequenceSummary: "Treasury down. Candidate returns.",
          effects: [
            { kind: "treasury_delta", targetRef: "guild", value: -90 },
            { kind: "loyalty_delta", targetRef: "team", value: 1 },
          ],
        },
        {
          choiceId: "accept-loss",
          label: "Accept the loss",
          description:
            "You cannot out-charm a face you cannot see. Rotate intake toward candidates Volna has not met yet.",
          consequenceSummary: "Loyalty slips. Intel on Volna's recruitment posture banks.",
          effects: [
            { kind: "loyalty_delta", targetRef: "team", value: -1 },
            { kind: "intel_delta", targetRef: "guild", value: 1 },
          ],
        },
      ],
    },
  ],
} satisfies RivalRecord;

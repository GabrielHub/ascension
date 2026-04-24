import type { RivalRecord } from "./schema";

export const asgardRivalRecord = {
  id: "rival/asgard",
  guildName: "Asgard",
  shortDisplayName: "Asgard",
  leader: {
    name: 'Elias "Odin" Wren',
  },
  pressureLane: "hybrid",
  copy: {
    currentRivalOneLiner:
      "Odin would like you to shake his hand. Everyone around him has agreed not to ask what the handshake does.",
  },
  assetPaths: {
    leaderPortrait: "/data/rivals/asgard/leader-neutral.png",
    insignia: "/data/rivals/asgard/insignia.png",
  },
  narrativeProfile: {
    operatingBase:
      "A converted industrial warehouse in Tribeca. The public floor is a modern-Scandinavian timber hall with exposed oak beams, iron-framed glazing, a single long communal table, and a functioning open hearth the fire marshal argued about during inspection. A brushed-steel dispatch bullpen sits behind a glass wall at the back. Odin's mezzanine office holds a ceremonial desk of oiled blackened oak and a wall mount for Gungnir. His two corporeal ravens are present throughout the space at all times.",
    publicPitch:
      "Asgard — a private-capital clearance firm founded by Odin, operating under full NYC licensing out of Tribeca.",
    pressureStyle:
      "Capital-excess bidding and principal-centric commercial edge with a rarely-deployed, mythologically-specific principal threat. Asgard loses to you on clearance volume, outer-borough intelligence, and contracts too small to interest Odin. They beat you on tech-exit runway for loss-leader prestige bids, the principal-handshake intelligence advantage, cult-of-Odin operator retention, press-myth amplification, and the rare tier event where Odin himself appears with Gungnir and the contested bid quietly evaporates.",
    rivalryFantasy:
      "You are not competing with a firm. You are competing with a man who believes he is a god, and the people around him have quietly agreed the easiest thing is to let him believe it. You walk into his Tribeca hall and he offers his hand at the hearth with two ravens at his shoulder. The operators you trained leave to take their seat at the long table and never come back. The press cannot stop profiling him. He is a ridiculous man and genuinely dangerous, and the whole city has agreed to play along.",
    toneAndVoice:
      "Performed archaic English layered over an unscrubbed tech-founder cadence that slips at the edges. Addresses people by attunement-coded titles — warrior, seer, craftsman, thane. Refers to Huginn and Muninn by name as if they are colleagues. 'My hall,' 'the Nine.' Never breaks character when confronted. Occasional tech-founder idioms (optionality, flywheel) leak into the mythological register and no one acknowledges the leak. Warm to those inside his hall. Courteously othering to outsiders. Never raises his voice.",
  },
  moves: [
    {
      id: "rival-move/asgard/competing-bid-handshake",
      family: "contract_challenge",
      weight: 10,
      cooldownMinutes: 1440,
      briefingTemplate:
        "Asgard has filed a competing bid. The All-Father welcomes a conversation — his calendar is open this week, in his hall.",
      basePublicPressureDelta: 5,
      baseIntensityDelta: 3,
      choices: [
        {
          choiceId: "accept-the-hall",
          label: "Accept the meeting at the hall",
          description: "Shake the offered hand and sit for the conversation at the long table.",
          consequenceSummary: "Contract pressure eases. Odin leaves knowing more than you brought.",
          effects: [
            { kind: "contract_pressure_delta", targetRef: "guild", value: -2 },
            { kind: "intel_delta", targetRef: "guild", value: -3 },
          ],
        },
        {
          choiceId: "counter-by-wire",
          label: "Counter-bid in writing, skip the hall",
          description: "File your own amended bid and decline the hearth invitation.",
          consequenceSummary: "Treasury down. No handshake, no leak.",
          effects: [
            { kind: "treasury_delta", targetRef: "guild", value: -160 },
            { kind: "reputation_delta", targetRef: "guild", value: 1 },
          ],
        },
        {
          choiceId: "decline-publicly",
          label: "Publicly decline the All-Father",
          description: "Let industry press learn you refused the hand.",
          consequenceSummary: "Press gravity tilts toward Asgard.",
          effects: [
            { kind: "public_pressure_delta", targetRef: "guild", value: 4 },
            { kind: "reputation_delta", targetRef: "guild", value: -1 },
          ],
        },
      ],
    },
    {
      id: "rival-move/asgard/long-table-offer",
      family: "recruitment_market_loss",
      weight: 8,
      cooldownMinutes: 2880,
      briefingTemplate:
        "A seat at the long table has been offered to one of your operators. The decision is theirs, of course.",
      basePublicPressureDelta: 3,
      baseIntensityDelta: 2,
      choices: [
        {
          choiceId: "match-the-offer",
          label: "Match the offer",
          description: "Float a retention package above your current band.",
          consequenceSummary: "Treasury spent. Operator stays, for now.",
          effects: [
            { kind: "treasury_delta", targetRef: "guild", value: -120 },
            { kind: "loyalty_delta", targetRef: "team", value: 1 },
          ],
        },
        {
          choiceId: "let-them-walk",
          label: "Let them take the seat",
          description: "Accept the loss; the operator goes to Asgard.",
          consequenceSummary: "Morale dips. Industry notes the trend.",
          effects: [
            { kind: "morale_delta", targetRef: "team", value: -2 },
            { kind: "team_cohesion_delta", targetRef: "team", value: -1 },
            { kind: "public_pressure_delta", targetRef: "guild", value: 2 },
          ],
        },
      ],
    },
    {
      id: "rival-move/asgard/principal-field-threat",
      family: "site_arrival",
      weight: 5,
      cooldownMinutes: 4320,
      briefingTemplate:
        "Odin will be present on-site this weekend. Asgard respectfully suggests that any contested claim be withdrawn before field resolution becomes necessary.",
      basePublicPressureDelta: 8,
      baseIntensityDelta: 4,
      choices: [
        {
          choiceId: "withdraw-claim",
          label: "Withdraw the contested claim",
          description: "Pull out before the principal arrives.",
          consequenceSummary: "Treasury untouched. Reputation takes the knock.",
          effects: [
            { kind: "reputation_delta", targetRef: "guild", value: -2 },
            { kind: "contract_pressure_delta", targetRef: "guild", value: -1 },
          ],
        },
        {
          choiceId: "hold-the-site",
          label: "Hold the site",
          description: "Field your crew anyway; let Odin arrive if he arrives.",
          consequenceSummary: "Intensity spikes. Reputation up if the floor still ships.",
          effects: [
            { kind: "reputation_delta", targetRef: "guild", value: 2 },
            { kind: "morale_delta", targetRef: "team", value: -1 },
            { kind: "public_pressure_delta", targetRef: "guild", value: 3 },
          ],
        },
      ],
    },
  ],
} satisfies RivalRecord;

import type { RivalRecord } from "./schema";

export const ashfordCapitalPartnersRivalRecord = {
  id: "rival/ashford-capital-partners",
  guildName: "Ashford Capital Partners",
  shortDisplayName: "Ashford Capital",
  leader: {
    name: 'Montgomery "Monty" Ashford III',
  },
  pressureLane: "sponsor-network",
  copy: {
    currentRivalOneLiner:
      "Monty Ashford will insist you call him Monty. His mother sits on the boards you need.",
  },
  assetPaths: {
    leaderPortrait: "/data/rivals/ashford-capital-partners/leader-neutral.png",
    insignia: "/data/rivals/ashford-capital-partners/insignia.png",
  },
  narrativeProfile: {
    operatingBase:
      "A four-story Beaux-Arts limestone townhouse on East 91st between Fifth and Madison, Ashford-owned since 1906. Ground floor: preserved reception hall with original plasterwork; dispatch desk tucked behind a walnut-screened business room. Second-floor library serves as Monty's private office, anchored by an 1890s mahogany card table brought from the Knickerbocker Club. A pre-war ivory-backed deck rests in a brass case on the corner. Upper floors remain residential.",
    publicPitch:
      "Ashford Capital Partners — four generations of New York capital, now serving Upper East Side clearance.",
    pressureStyle:
      "Inherited social sponsor-network. Monty is unattuned and does not field. He loses to you on outer-borough intelligence and operationally difficult clearances. He beats you on Upper East Side residential and private-museum work, foundation-funded contracts, private-hospital networks, Ivy-alumni relationships, and any contract where an Ashford trustee seat or club membership touches the decision layer.",
    rivalryFantasy:
      "You are demonstrably the better operator and the ladder does not care. Monty is warm, genuinely likeable, and unmistakably your peer on every visible ranking even though his roster cannot do what yours can. Every contested Upper East Side contract is decided at a dinner party you were not invited to. Every expansion runs into a Landmarks review chaired by his mother's college roommate. He will insist you call him Monty. He will genuinely enjoy your company. He will also make sure the contract you needed closes to him on Friday.",
    toneAndVoice:
      "Warm Upper East Side English polished by Groton, Princeton, and a London year. First-name basis from the second interaction onward. Openly acknowledges the system is rigged in his favor and treats that acknowledgment as disarming humor. Never insults. Drops first-name references to Ted and George and Binky as if of course you would know them. Handwritten correspondence on engraved cream cardstock in a schoolboy fountain-pen hand. Typeset correspondence goes through Ashford & Dane letterhead, never ACP's — everyone understands why. Composed, slightly amused, watching-the-tells.",
  },
  moves: [
    {
      id: "rival-move/ashford/dinner-table-close",
      family: "sponsor_interference",
      weight: 10,
      cooldownMinutes: 1440,
      briefingTemplate:
        "Bit awkward — George had a word with Ted over dinner at the Brook last night and the Frick contract is going to close to us. I'm terribly sorry about the short notice. Let me buy you a drink to soften the blow. Bemelmans, Thursday?",
      basePublicPressureDelta: 4,
      baseIntensityDelta: 2,
      choices: [
        {
          choiceId: "take-the-drink",
          label: "Take the drink at Bemelmans",
          description: "Meet Monty as charming peers; salvage the relationship.",
          consequenceSummary: "Contract lost. Social channel stays open.",
          effects: [
            { kind: "contract_pressure_delta", targetRef: "guild", value: 2 },
            { kind: "reputation_delta", targetRef: "guild", value: 1 },
          ],
        },
        {
          choiceId: "escalate-counsel",
          label: "Escalate through your counsel",
          description: "File a counter-protest on procurement fairness grounds.",
          consequenceSummary: "Treasury bleeds on legal. The award stands.",
          effects: [
            { kind: "treasury_delta", targetRef: "guild", value: -200 },
            { kind: "reputation_delta", targetRef: "guild", value: -1 },
          ],
        },
        {
          choiceId: "refuse-engagement",
          label: "Refuse the drink and the call",
          description: "Do not engage; let the social debt accrue silently.",
          consequenceSummary: "Future Upper East Side contracts get harder.",
          effects: [
            { kind: "public_pressure_delta", targetRef: "guild", value: 3 },
            { kind: "contract_pressure_delta", targetRef: "guild", value: 2 },
          ],
        },
      ],
    },
    {
      id: "rival-move/ashford/townhouse-drop-in",
      family: "public_comparison",
      weight: 8,
      cooldownMinutes: 2880,
      briefingTemplate:
        'Monty Ashford dropped by your office this afternoon. He left a bottle of the \'82 and a handwritten note on engraved cream cardstock. The note is signed "Monty." The Sutton Place bid is no longer yours.',
      basePublicPressureDelta: 5,
      baseIntensityDelta: 2,
      choices: [
        {
          choiceId: "write-back",
          label: "Write a gracious note in return",
          description: "Match the register; keep the door open for next time.",
          consequenceSummary: "Reputation held. The bid is still gone.",
          effects: [
            { kind: "reputation_delta", targetRef: "guild", value: 1 },
            { kind: "morale_delta", targetRef: "team", value: -1 },
          ],
        },
        {
          choiceId: "leak-the-pattern",
          label: "Leak the pattern to trade press",
          description: "Put the inherited-social channel on record as a story.",
          consequenceSummary: "Intel spent to place it. Reputation up.",
          effects: [
            { kind: "intel_delta", targetRef: "guild", value: -2 },
            { kind: "reputation_delta", targetRef: "guild", value: 2 },
            { kind: "public_pressure_delta", targetRef: "guild", value: -1 },
          ],
        },
      ],
    },
    {
      id: "rival-move/ashford/landmarks-veto",
      family: "sponsor_interference",
      weight: 6,
      cooldownMinutes: 4320,
      briefingTemplate:
        "Monty wanted you to know before you heard it elsewhere — the Parks Commissioner pulled the East Harlem landmarks hearing off next week's calendar. His mother chairs the preservation foundation that funds the commissioner's district events. He didn't want it to come out of the blue.",
      basePublicPressureDelta: 4,
      baseIntensityDelta: 3,
      choices: [
        {
          choiceId: "file-parallel-permits",
          label: "File parallel permits through a different district",
          description: "Reroute the expansion around the frozen hearing.",
          consequenceSummary: "Treasury down. Timeline preserved.",
          effects: [
            { kind: "treasury_delta", targetRef: "guild", value: -180 },
            { kind: "contract_pressure_delta", targetRef: "guild", value: 1 },
          ],
        },
        {
          choiceId: "wait-it-out",
          label: "Wait for the calendar to open again",
          description: "Do nothing; the hearing may reappear in the next cycle.",
          consequenceSummary: "Morale dips. The clock runs on your side.",
          effects: [
            { kind: "morale_delta", targetRef: "team", value: -2 },
            { kind: "public_pressure_delta", targetRef: "guild", value: 2 },
          ],
        },
      ],
    },
  ],
} satisfies RivalRecord;

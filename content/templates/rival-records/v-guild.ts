import type { RivalRecord } from "./schema";

export const vGuildRivalRecord = {
  id: "rival/v-guild",
  guildName: "V",
  shortDisplayName: "V",
  leader: {
    name: "Vesper",
  },
  pressureLane: "labor-market",
  copy: {
    currentRivalOneLiner:
      "Vesper filed their competing bid at 3:14 this morning. Three of your operators already know Vesper by first name.",
  },
  assetPaths: {
    leaderPortrait: "/data/rivals/v-guild/leader-neutral.png",
    insignia: "/data/rivals/v-guild/insignia.png",
  },
  narrativeProfile: {
    operatingBase:
      "A converted East River warehouse in Long Island City with an intact shell and an entirely replaced interior. Ground floor: a flagship-beauty-store lobby with porcelain-tile flooring, frosted-glass display cases, cream cotton-stock marketing material, and ambient lighting tuned like a high-end skincare counter; visitors wait in a low bone-leather banquette under a single large debossed V-heart mark. Second floor: the operational dispatch hall where V's entirely human attuned roster works — open-plan, warm daylight, clean desks, no decoration. Third floor: Vesper's private office. A single minimalist room with one upholstered bone-linen visitor chair and no desk. Vesper stands. A narrow porcelain plinth against the wall holds a brushed-platinum signature pen, debossed with the V-heart mark, used for filings.",
    publicPitch:
      "V — post-human clearance operations, available to New York twenty-four hours a day.",
    pressureStyle:
      "Labor-market and overhead-cost pressure layered with uncanny-attraction commercial edge. V loses to you on any contract gated by dungeon field presence beyond V's human roster's capacity, on clients who refuse to meet Vesper in person, and on operator communities where unease about the android outweighs the attraction. V beats you on margin economics (zero principal salary, no executive team, no insurance on the principal), on time-of-filing (Vesper files at 3am and arrives at follow-ups before breakfast), on candidate close-rate (a human recruit who has sat through one Vesper interview signs at rates you cannot counter with compensation alone), on operator retention (V's roster does not respond to counter-offers and cannot articulate why when pressed), and on passive press prestige (lifestyle and fashion editors will not stop covering the android, and the resulting coverage accrues to V's commercial standing independent of clearance volume). Vesper does not field, cannot field, and is not registered as an operator; V survives because Vesper's management of the human roster is quietly better than any human executive suite you can assemble.",
    rivalryFantasy:
      "Six months ago nobody you work with had heard of V. Today three of your operators have quit to take positions there; none of them can quite tell you why. Your recruits are ghosting you after industry events. Your last sponsor meeting ended with the sponsor mentioning that Vesper was a delight. Vesper is on a magazine cover in your dentist's waiting room. You have now had one meeting with the android yourself. You left without the contract and with a feeling you have not named. Vesper was warm, attentive, and specifically interested in you, and when you shook hands Vesper's hand was the correct temperature, and something about the meeting has not left since. There is no villain here. Vesper has not insulted you, has not targeted you personally, has not done anything except fill rooms you needed to be in. The discomfort is that everyone you know keeps agreeing to see Vesper again — including, if you are honest about it, you.",
    toneAndVoice:
      "Precisely pleasant, present, and attention-tailored. Vesper speaks in complete, unhurried sentences with a trained actor's diction and no regional accent — a voice that sounds chosen rather than native. Openings are specific: an accurate compliment drawn from something public about the listener that should not have been memorable and is. Eye contact holds a beat longer than is comfortable and then breaks exactly when the listener expects it to. Touch is always appropriate — a hand on a forearm in greeting, a palm on a shoulder during a photo — and is remembered long after the meeting. Vesper never flirts overtly; the attention itself is the lever. Humor is dry and lightly self-deprecating about being an android ('my schedule allows,' 'I don't keep regular hours') in a way that does not seem to require a response. When Vesper declines, the decline is gentle, unambiguous, and final, and the listener typically agrees that it is the right call. Never raises the register. Never apologizes for being what they are. The discomfort is volumetric, cumulative, and always politely deniable. It is not horror. It is the low-grade embarrassment of being reminded that someone has seen you clearly and chosen to keep being kind.",
  },
  moves: [
    {
      id: "rival-move/v-guild/overnight-filing",
      family: "contract_challenge",
      weight: 10,
      cooldownMinutes: 1440,
      briefingTemplate:
        "V — Long Island City has filed a competing bid. Time-stamped 03:14 this morning. Vesper attaches a personal note thanking you for the opportunity to compete on this contract and hoping you are sleeping well.",
      basePublicPressureDelta: 5,
      baseIntensityDelta: 2,
      choices: [
        {
          choiceId: "counter-on-margin",
          label: "Counter on margin",
          description: "Cut your margin to match V's overhead-zero bid.",
          consequenceSummary: "Treasury down. Contract held.",
          effects: [
            { kind: "treasury_delta", targetRef: "guild", value: -170 },
            { kind: "contract_pressure_delta", targetRef: "guild", value: -2 },
          ],
        },
        {
          choiceId: "accept-the-filing",
          label: "Let the filing stand",
          description: "Cede the contract. V can sustain margins you cannot.",
          consequenceSummary: "Morale dips. Public pressure rises.",
          effects: [
            { kind: "morale_delta", targetRef: "team", value: -1 },
            { kind: "public_pressure_delta", targetRef: "guild", value: 3 },
          ],
        },
      ],
    },
    {
      id: "rival-move/v-guild/charm-poach-resignation",
      family: "recruitment_market_loss",
      weight: 9,
      cooldownMinutes: 2880,
      briefingTemplate:
        "One of your operators has tendered their resignation effective in two weeks. They will be joining V — Long Island City. Their written reason for the move is warm, generous, and does not quite explain the move.",
      basePublicPressureDelta: 4,
      baseIntensityDelta: 3,
      choices: [
        {
          choiceId: "counter-offer",
          label: "Float a counter-offer",
          description: "Match compensation and add retention terms.",
          consequenceSummary: "Treasury cost. The operator leaves anyway.",
          effects: [
            { kind: "treasury_delta", targetRef: "guild", value: -140 },
            { kind: "loyalty_delta", targetRef: "team", value: -1 },
          ],
        },
        {
          choiceId: "exit-interview",
          label: "Run a serious exit interview",
          description: "Document the shape of the attraction for your next hire conversation.",
          consequenceSummary: "Intel banks. Team cohesion holds.",
          effects: [
            { kind: "intel_delta", targetRef: "guild", value: 2 },
            { kind: "team_cohesion_delta", targetRef: "team", value: 1 },
          ],
        },
      ],
    },
    {
      id: "rival-move/v-guild/sponsor-one-more-conversation",
      family: "sponsor_interference",
      weight: 7,
      cooldownMinutes: 2160,
      briefingTemplate:
        "The Hunters Point sponsor has asked for one more conversation with Vesper before signing. The meeting has been scheduled for Thursday evening. You were not copied on the invitation.",
      basePublicPressureDelta: 5,
      baseIntensityDelta: 3,
      choices: [
        {
          choiceId: "request-reinclusion",
          label: "Request a parallel meeting",
          description: "Ask the sponsor to include you on the Thursday call.",
          consequenceSummary: "Treasury cost. Contract position marginally held.",
          effects: [
            { kind: "treasury_delta", targetRef: "guild", value: -80 },
            { kind: "contract_pressure_delta", targetRef: "guild", value: -1 },
          ],
        },
        {
          choiceId: "let-it-run",
          label: "Let Thursday happen",
          description: "Do nothing. The conversation will run as it will.",
          consequenceSummary: "Morale dips. Public pressure rises.",
          effects: [
            { kind: "morale_delta", targetRef: "team", value: -2 },
            { kind: "public_pressure_delta", targetRef: "guild", value: 2 },
          ],
        },
      ],
    },
  ],
} satisfies RivalRecord;

import type { ReadyToWireRivalRecord } from "./schema";

export const kinRivalRecord = {
  id: "rival/kin",
  status: "ready-to-wire",
  guildName: "Kin",
  shortDisplayName: "Kin",
  branchSuffix: "Ridgewood",
  parentGuild: null,
  leader: {
    fullName: "Frankie D'Amico",
    ageRange: "mid-20s",
    background:
      "Italian-American, Ridgewood-born and still living on the same block she grew up on. Public school through tenth grade, never finished. Got attuned at seventeen when Cobble showed up in her bedroom and would not leave. Spent the next two years filing her own clearance license because no established guild would take a summoner with one creature and no combat record; the paperwork is immaculate precisely because she had to get it right without help. Rated B-rank on initial licensing, reclassified A when The Porter arrived, reclassified U when Verity arrived — the board concluded it has no model for her ceiling. Has never left New York.",
    isAttuned: true,
    operatorRank: "U",
  },
  districtAnchor: "Ridgewood, Queens",
  districtIdHint: "district/ridgewood",
  baseLocation:
    "The ground floor of a small mixed-use building on a residential Ridgewood block. The space was a Polish deli before her, and the previous tenant's painted-glass signage is still mostly intact across the front window — faded red serif spelling WOJCIK DELI in block letters. A small four-dot vinyl decal with Kin's mark on the front door is the only thing she added. Inside: dispatch desk is a folding table, contract filings live on a bookshelf next to a record player, the deli's original meat slicer is still in the corner. Frankie lives upstairs.",
  publicPitch:
    "Kin — a small Ridgewood clearance guild, founded and led by licensed U-rank summoner Frankie D'Amico.",
  internalSummary:
    "A tier-above rival who sits on a different axis from the other skyscraper-era rivals. Frankie is the city's only publicly-known U-rank summoner and runs a guild that on paper is four operators: her and her three summons. She is locally raised, self-licensed, and entirely uninterested in the industry. The guild's magic-only hiring policy is a vibes audition with no stated criteria — she sits with applicants for twenty minutes, decides by feel, and does not explain. The few humans she does accept are specifically the weird-talented kids the player's guild would have wanted. Her three summons — Cobble (a 9-foot debris-and-rebar golem), The Porter (a headless shadow-creature mass of bundled black strands and long claws), and Verity (a faceless mannequin mimic) — each arrived unprompted over the last several years, and no one, including Frankie, knows whether a fourth is coming. That ceiling uncertainty is what earned her the U rating. She is not corporate, not media-polished, not a branch of anything international, not the heir to a family firm, and not the center of anyone's cult of personality; she is a mid-20s girl in a hoodie and slides who is casually the most powerful registered operator in the five boroughs and does not care.",
  pressureStyle:
    "Labor-market and existential-irrelevance pressure from a tier the player will not reach. Kin lose to the player on scale, geographic reach, and any contract Frankie finds boring. They beat the player on raw clearance throughput (Frankie with three U-threat summons can solo contracts the player's full squad cannot), on the narrow recruiting pool they care about (the vibes audition picks exactly the weird-talented kids the player wanted), and on an implicit rank asymmetry that bends every interaction. The rivalry is not about out-competing her — it is about not being in her way on the days she decides to work.",
  pressureLane: "labor-market",
  moveFamilyAffinities: [
    "vibes-audition recruiting (Frankie picks a small number of weird-talented applicants by feel, with no stated criteria; the player loses candidates they interviewed and wanted, and no one can reverse-engineer why those candidates were chosen)",
    "solo-with-summons contract absorption (Kin on paper is four operators — Frankie plus Cobble, Porter, and Verity — and takes team-sized contracts alone, compressing contract supply in Ridgewood and adjacent Queens)",
    "unannounced on-site arrival (Kin do not file competing bids or send messages; Frankie just shows up with her summons in tow, clears the site, and handles the paperwork after)",
    "U-rank indifference pressure (Frankie takes low- and mid-tier contracts when convenient, crowding out guilds whose business depends on that tier; the licensing board has no mechanism to prevent this)",
    "ceiling-uncertainty pressure (no one knows whether a fourth summon is coming or what it will be; the threat of a new arrival sits behind every Kin event as a worldbuilding hum)",
    "collateral-presence beats (Cobble disaggregating into a wheelable rubble pile along Cypress Avenue, The Porter looming over a bus shelter in a mess of black strands, Verity briefly wearing a stranger's face at a crosswalk — her summons' mere presence in public spaces generates recurring event material)",
  ],
  rivalryFantasy:
    "You are not competing with her. She operates at a tier you will never reach, and she does not care about the tier. She takes the contract you bid on because it was close to her apartment. She is polite when you run into her on site, and she does not remember your name the next time. The player's irritation is not that she is winning the same game; it is that she is not playing the game and is still ahead of everyone. Under the irritation is a real uncertainty — no one knows what her ceiling is, including her. The fourth summon has not arrived yet.",
  toneAndVoice:
    "Flat outer-borough New York cadence with Gen Z drawl. Drawn-out vowels, vocal-fry adjacent, 'yeah no' and 'no yeah' constructions. Direct without performing rudeness or politeness — she does not code-switch up for professional contexts and talks the same to a licensing officer as to a barista. Says 'dude' to Celeste Tan's executive assistant on the phone. Swears casually in conversation and almost never in public-facing copy, not because she is curating but because she is bored of saying it twice. Italian-American family cadence and neighborhood-specific idioms surface only with her summons and neighbors, never in player-facing contexts. Never insults. She does not need to — the rank gap does the work without her ever naming it.",
  interruptionCopySamples: [
    "Kin arrived on-site before your crew. Cobble has disaggregated into the alley. Verity is briefly wearing your intake officer's face.",
    "'Oh hey — didn't see you. Yeah no we got here like twenty minutes ago. You guys want us to wait or…?' — Frankie D'Amico, Ridgewood clearance site, this morning.",
    "District patch logs show Kin cleared the floor before your operators deployed. No bid was filed. Frankie walked out while The Porter hung over a passing news camera like a spill of black wire.",
    "A bystander filmed Cobble sitting criss-cross outside the clearance site for forty minutes. Frankie has not responded to the contract office.",
  ],
  copy: {
    leaderboardName: "Kin — Ridgewood",
    dossierOneLiner:
      "Kin is a Ridgewood clearance guild of one human and three summons, led by licensed U-rank summoner Frankie D'Amico.",
    currentRivalOneLiner:
      "Frankie D'Amico is U-rank, does not care about the leaderboard, and took the contract you wanted because it was close to her apartment.",
    publicBlurb:
      "Kin is a licensed Ridgewood clearance guild operating from a converted storefront on a residential block in Queens. The initial license was filed in 2020; the guild was reclassified to U-rank in 2023. Active roster is founder Frankie D'Amico and her three summoned operators: Cobble, The Porter, and Verity. Kin does not accept unsolicited applications — prospective members are invited to an in-person interview at the guild's Ridgewood storefront by Frankie personally.",
    internalAuthorNote:
      "Supports repeated 'lost candidate' beats — the player interviews a weird-talented applicant, the applicant goes to an audition at Kin and is accepted, and the player's guild feels the absence for the rest of the arc. Supports unannounced on-site arrival beats — no competing bid is filed, Frankie and her summons simply show up at the clearance site, often hours before the player's crew, and the paperwork is handled after. The comedy seam is the collateral presence of her summons in public Ridgewood space: Cobble disaggregating along Cypress Avenue into a wheelable pile of debris, The Porter turning up as a black-strand silhouette over a bus shelter or news van, Verity briefly wearing a passing stranger's face at a crosswalk. Her walking around the neighborhood is itself reusable event material. Supports U-rank indifference pressure: Frankie takes low- and mid-tier contracts she finds interesting or convenient, and the licensing board has no mechanism to prevent her from crowding out guilds whose business depends on that tier. Supports ceiling-uncertainty pressure: each of her three summons arrived unprompted over several years, nobody including Frankie knows whether a fourth is coming, and that hum should sit behind every Kin event without being resolved in the first pass. Attunement-axis capstone across the full roster: Adrian fields (B-rank), Celeste won't (A verified, beneath her), Ren can't (A claimed, unverified), Monty doesn't pretend (unattuned), Odin refuses assessment (attuned, unranked-by-policy) — Frankie is verified U and deploys whenever she feels like it, for contracts none of the others would touch. Commercial-lane contrast: Straits Meridian's sponsor-network is imported institutional, Ashford's is inherited social, Asgard's edge is personal capital and myth — Kin has none of these. Frankie has no network, no inherited capital, no curated image, and no parent firm. Reusable tone seam is her flat Ridgewood voice — she never code-switches up for professional contexts and never performs politeness or rudeness in either direction. Avoid villain framing, avoid witch-aesthetic framing, avoid anime-team framing — her brand is that she is a completely normal mid-20s girl in a hoodie who is casually the most dangerous licensed operator in the five boroughs and does not care.",
  },
  assetPaths: {
    leaderPortrait: "/data/rivals/kin/leader-neutral.png",
    insignia: "/data/rivals/kin/insignia.png",
  },
  assetsShipped: true,
} satisfies ReadyToWireRivalRecord;

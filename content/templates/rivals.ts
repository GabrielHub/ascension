// Authored metadata for rival-guild content per the Rival Guild Definition
// And Asset Plan (docs/plans/rival-guild-definition-and-asset-plan.md).
//
// Intentionally NOT registered with createTemplateRegistry — rivals are not
// wired into ECS, events, UI, or saves yet. This module is the stable source
// of rival ids and authored copy for the future skyscraper rival-pressure
// refactor to consume.
//
// First-pass rival asset contract:
// - leader portraits are raster PNGs
// - guild insignias are also raster PNGs
// Do not wire future runtime reads against SVG insignia assumptions.

export type RivalStatus =
  | "concept-draft"
  | "metadata-in-progress"
  | "metadata-approved"
  | "assets-in-progress"
  | "ready-to-wire";

export type RivalPressureLane = "prestige" | "labor-market" | "sponsor-network" | "hybrid";

export type RivalDraft = {
  id: string;
  status: RivalStatus;
  guildName: string;
  shortDisplayName: string;
  branchSuffix: string | null;
  parentGuild: {
    name: string;
    origin: string;
    foundedYear: number;
    summary: string;
  } | null;
  leader: {
    fullName: string;
    ageRange: string;
    background: string;
    isAttuned: boolean;
    operatorRank: string | null;
  };
  districtAnchor: string;
  districtIdHint: string;
  baseLocation: string;
  publicPitch: string;
  internalSummary: string;
  pressureStyle: string;
  pressureLane: RivalPressureLane;
  moveFamilyAffinities: readonly string[];
  rivalryFantasy: string;
  toneAndVoice: string;
  interruptionCopySamples: readonly string[];
  visualBrandingNotes: string;
  leaderPortraitBrief: string;
  guildInsigniaBrief: string;
  dossierMotif: string;
  copy: {
    leaderboardName: string;
    dossierOneLiner: string;
    currentRivalOneLiner: string;
    publicBlurb: string;
    internalAuthorNote: string;
  };
  assetPaths: {
    leaderPortrait: string;
    insignia: string;
  };
  assetsShipped: boolean;
};

export interface RivalDraftValidationIssue {
  rivalId: string;
  message: string;
}

export const rivalDrafts = [
  {
    id: "rival/golden-phoenix-palace",
    status: "ready-to-wire",
    guildName: "Imperial Golden Phoenix Palace",
    shortDisplayName: "Golden Phoenix",
    branchSuffix: "Chinatown",
    parentGuild: {
      name: "Imperial Golden Phoenix Palace",
      origin: "Hong Kong",
      foundedYear: 1998,
      summary:
        "Cheung-family Hong Kong business that started as a restaurant chain and diversified into licensed clearance work in the early 2020s, retaining the original brand across both verticals.",
    },
    leader: {
      fullName: "Adrian Cheung",
      ageRange: "early-to-mid 20s",
      background:
        "Hong Kong-born youngest son of the founder, internationally schooled, sent to open the New York branch.",
      isAttuned: true,
      operatorRank: "B",
    },
    districtAnchor: "Chinatown, Manhattan",
    districtIdHint: "district/chinatown",
    baseLocation:
      "The Cheung family's longtime Chinatown restaurant of the same name. The dispatch desk sits in the back office between the dry-goods shelves and the milk-tea station.",
    publicPitch:
      "Imperial Golden Phoenix Palace — five generations of hospitality, now licensed for dungeon clearance.",
    internalSummary:
      "A peer-scale rival who unlocks at roughly the same moment the player crosses the official-guild threshold. Adrian's father runs an established Hong Kong clearance firm and sent his youngest to open the NYC branch out of a family restaurant the Cheungs have owned in Chinatown since the late 1980s. They start at the same scale as the player, in a similarly improvised back-of-house setup, but they bring parent-guild capital, an imported brand the licensing board recognizes, and a branch lead who is a B-rank operator himself.",
    pressureStyle:
      "Imported prestige and parent-guild recruiting muscle. They lose to the player on local connections, NYC regulatory familiarity, and English-only neighborhoods. They beat the player on paper credentials, transfer-in operator quality, capital runway, and the fact that their branch lead can personally clear floors.",
    pressureLane: "prestige",
    moveFamilyAffinities: [
      "prestige-bid pressure (Hong Kong clearances on file outclass the player's record)",
      "parent-guild operator transfers (seasoned overseas operators rotated in for high-stakes contracts)",
      "diaspora recruitment (pulls from the same Chinatown / Flushing / Sunset Park talent pool)",
      "low-margin absorption (parent-firm capital lets them lose money on opening contracts)",
      "branch-leader field appearances (Adrian himself shows up in dungeons; the player will see him on-site)",
    ],
    rivalryFantasy:
      "This is your story, with money and a competent boss. Adrian unlocks at exactly the moment the player thinks they have made it. He is not hostile. He is polite, slightly aloof, and genuinely treats the player as a peer. He will compliment a clearance the player just finished and then poach the next contract on the same block. When the player's team is grinding through floor two, Adrian's already cleared floor three because he went in himself.",
    toneAndVoice:
      "Internationally-schooled English. Occasional Cantonese asides to his staff. Cool, slightly distant, not rude — composed. Treats dungeon work as a real career, not a gold rush. Will sincerely say 'your bodega has very good location' and mean it.",
    interruptionCopySamples: [
      "Imperial Golden Phoenix Palace — Chinatown has filed a competing bid. Our parent firm's clearance record should already be on file with the licensing board.",
      "Adrian Cheung's team cleared the second floor before your operators arrived. He sends his regards.",
    ],
    visualBrandingNotes:
      "Modern luxury-import layered over Chinatown restaurant-signage maximalism, deliberately tonally awkward against the dangerous-work product. Black and gold primary, deep red accent. Big serif Latin wordmark with traditional Chinese characters set below in smaller weight. 'Licensed Clearance Services' appears as a small, awkward sub-line under the main wordmark — that mismatch is the joke. Avoid: dragons drawn for action, kung-fu silhouettes, generic faction-crest treatments, paper lanterns as decoration, calligraphy-as-ornament.",
    leaderPortraitBrief:
      "Style: locked Ascension raster house style — modern Korean action-webtoon portrait art per docs/product/image-generation-prompting-guide.md. Crisp confident outlines, cel-adjacent shading with grouped shadow masses, restrained non-glossy highlights, muted cinematic jewel-tone palette. Tall elongated webtoon proportions, slim athletic build, angular face with sharp jawline and defined brows, eyes as the focal feature. Subject: Adrian Cheung, East Asian male, early-to-mid 20s, dark messy hair with lighter front highlights, sharp grey-blue eyes, composed and slightly aloof expression, single earring. Outfit (grounded modern workwear crossed with attuned-operator hardware — supernatural accents are native to the character because Adrian is a B-rank operator who actively raids): slim-cut black two-piece tailored suit, gold embroidered phoenix-and-cloud motifs in the spirit of hanfu embroidery running across the lapel, jacket panels, and trouser side seams (the embroidery reads as fabric work, not metallic glow); black mandarin-collar shirt under the jacket, no Western tie or collar; asymmetric attuned-operator hardware — lacquered black-and-gold pauldron on his left shoulder sitting cleanly over the jacket as a practical articulated piece (not fantasy plate), brushed brass-and-dark-steel articulated gauntlet with jade accent on his right forearm; suggestion of his blade with jade-toned pommel visible at his hip. Composition: full-body standing portrait in the shipped presenter-roster canvas (~2:3, 1024x1536), slight 3/4 angle front-facing, subject centered with negative space for UI integration. Background: plain warm-white / off-white, no scene detail, strong silhouette separation. Reject: painterly or watercolor rendering, glossy digital highlights, fantasy plate styling on the operator hardware, idol-glam jewelry stacking, gacha character-sheet costume, neon glow, dark studio backgrounds.",
    guildInsigniaBrief:
      "Brushed-brass plate feel, not a faction crest. Bilingual 'IMPERIAL GOLDEN PHOENIX PALACE' wordmark with traditional Chinese set below in smaller weight (e.g. 皇家金鳳殿). A small phoenix-in-roundel or imperial seal mark in the same brass and gold-on-black palette. Reads as a serious international firm's corporate identity over restaurant heritage signage, not a clan emblem.",
    dossierMotif:
      "Black panel ground with brushed-brass border accents and a low-contrast gold filigree corner motif — phoenix-feather curl in the upper corners. Thin brass divider line beneath the leader name. Subtle large-scale gold-on-black brocade watermark behind the portrait area, kept low enough in contrast that it reads as texture, not pattern. Deep red is reserved for active-rivalry state cues (live interrupt warning, contested-bid badges) and never used as ambient color. Brand wordmark sits as a small footer, not a hero crest. The whole treatment should read as an expensive restaurant brass plaque applied to a guild dossier card — matching the wordmark identity's intentional restaurant-signage echo.",
    copy: {
      leaderboardName: "Imperial Golden Phoenix Palace — Chinatown",
      dossierOneLiner:
        "Hong Kong's Imperial Golden Phoenix Palace has opened a Chinatown branch, run by the founder's son out of the family's restaurant of the same name.",
      currentRivalOneLiner:
        "Adrian Cheung is starting from the same place you did — with his father's checkbook behind him.",
      publicBlurb:
        "Imperial Golden Phoenix Palace — Chinatown is the New York branch of the Hong Kong family business, founded in 1998 and licensed for clearance operations since 2021. The Chinatown branch operates from the family's longstanding restaurant of the same name and is led by Adrian Cheung.",
      internalAuthorNote:
        "Supports repeated 'peer who's eating your lunch' beats — competing bids on overlapping contracts, shared dungeon sites where Adrian's team is already on a higher floor, recruiting overlap where a candidate the player interviewed signs with Imperial Golden Phoenix Palace instead. The restaurant brand identity layered over a dangerous-work guild is a reusable comedy seam (printed dispatch reports on placemats, briefings between dim sum service). Avoid villain framing or trash-talk; his whole brand is that he is polite, competent, and treating the player as a real competitor.",
    },
    assetPaths: {
      leaderPortrait: "/data/rivals/golden-phoenix-palace/leader-neutral.png",
      insignia: "/data/rivals/golden-phoenix-palace/insignia.png",
    },
    assetsShipped: true,
  },
  {
    id: "rival/straits-meridian-group",
    status: "ready-to-wire",
    guildName: "Straits Meridian Group",
    shortDisplayName: "Straits Meridian",
    branchSuffix: "Hudson Yards",
    parentGuild: {
      name: "Straits Meridian Group",
      origin: "Singapore",
      foundedYear: 2020,
      summary:
        "Southeast Asia's dominant licensed clearance consortium, founded in Singapore in 2020 by a coalition of old-money SEA families pooling capital the moment the first rifts opened. Headquartered in Marina Bay with flagship regional offices in Jakarta, Kuala Lumpur, and Manila. Holds a near-monopoly on high-value Singapore and Jakarta clearances and routinely wins the government-adjacent contracts in KL and Manila. The New York branch opened in 2024 as the group's first Western expansion.",
    },
    leader: {
      fullName: "Celeste Tan",
      ageRange: "early 40s",
      background:
        "Chinese Singaporean with Peranakan (Straits Chinese) family roots in Katong. Methodist Girls' School → Raffles Junior College → Cambridge (Jesus College) economics → Wharton MBA. Eight years at DBS Private Wealth, four years at Temasek in portfolio strategy, recruited to Straits Meridian in 2022 as founding Managing Director of the New York branch. Married into another old Singapore business family; splits her time between a Hudson Yards residence and the family compound off East Coast Road. Attuned since her mid-twenties and A-rank certified, but has not actively deployed to a dungeon in over five years; her attunement is treated inside the firm as strategic reserve rather than a field role. Carries an heirloom Peranakan silver keris as her personal blade — a family object her grandmother had reforged when her rank was confirmed.",
      isAttuned: true,
      operatorRank: "A",
    },
    districtAnchor: "Hudson Yards, Manhattan",
    districtIdHint: "district/hudson-yards",
    baseLocation:
      "The 47th-floor NYC executive suite at 30 Hudson Yards. Glass walls with Hudson views, an ivory marble reception desk, a single fresh orchid arrangement replaced weekly, and a locked display cabinet of inherited Peranakan nyonyaware porcelain behind her executive assistant's station. Her heirloom Peranakan silver keris rests on a wall-mounted ivory-and-silver stand in her private office — clearly readable as a ceremonial object and also clearly sharpened. The active dispatch floor sits two levels below and is run by a separate operations director imported from the Jakarta office.",
    publicPitch:
      "Straits Meridian Group — Southeast Asia's institutional clearance standard, now serving New York.",
    internalSummary:
      "A ladder-rung-above rival who unlocks after the player has crossed the official-guild threshold but is not yet a serious regional presence. Unlike the peer-scale Golden Phoenix branch, Straits Meridian arrives as an established multinational with six years of dominant clearance history across Singapore, Jakarta, KL, and Manila and the capital and institutional reach to match. Celeste is an A-rank attuned operator from an elite executive track — Cambridge, Wharton, DBS, Temasek — who has not personally deployed in over five years and considers field work beneath her current station. The branch's advantage is sponsor-network: Singapore consulate partnerships, NYC-Asia business council ties, Fortune-500 clearance retainers, and a licensing board that recognizes the group's regional record. Her personal A-rank capability sits in strategic reserve; the rare occasions she does take the field are industry events in their own right. The player loses to them on political weight and capital; the player beats them on ground-level intelligence in the outer boroughs and on contracts beneath the branch's attention threshold.",
    pressureStyle:
      "Institutional sponsor-network and regulatory leverage, with a rarely-deployed A-rank principal held in reserve. They lose to the player on outer-borough intelligence, ground-level relationships, and contracts beneath their attention threshold. They beat the player on consulate backing, licensing-board familiarity, Fortune-500 sponsor retainers, high-end A-rank operator poaching they can fund with signing bonuses the player cannot match, and prestige Manhattan corporate clearances that are effectively pre-awarded before public bid. Celeste herself taking the field is a tier-event escalation the branch keeps as a last resort, not a routine move.",
    pressureLane: "sponsor-network",
    moveFamilyAffinities: [
      "institutional-sponsor pressure (Singapore consulate partnerships, NYC-Asia business council backing, Fortune-500 corporate clearance retainers)",
      "regulatory steering (licensing board relationships, permit lanes that skip the usual queue, prestige contracts finalized before the public bid window opens)",
      "high-end talent poaching (A-rank signing bonuses and visa sponsorship the player cannot match; the roster pulls from Jakarta, KL, and Manila as well as the New York market)",
      "prestige-contract absorption (takes the high-margin Manhattan corporate work and leaves the outer-borough grind; refuses low-margin contracts by brand policy)",
      "delegated-assistant dismissal with A-rank reserve (direct contact with the player's office routes through her executive assistant and junior counsel; Celeste herself does not engage unless forced — her personally taking the field is a tier-event escalation the branch keeps as a last resort)",
    ],
    rivalryFantasy:
      "You are beneath their notice until you force them to notice. Celeste has not yet heard your name; her executive assistant probably has, in a forwarded memo. The rivalry fantasy is a slow climb from 'not on their radar' through 'flagged as a minor irritant' to 'the principal finally takes your call personally' — and, at the outermost edge, the one-off escalation where an issue gets large enough that an A-rank attuned executive who has not worn field hardware in five years comes down to the site herself. Every acknowledgment is earned. The comedic seam is the delegation chain — messages come back through assistants, permits die quietly at desks the player cannot see, and the first time Celeste actually writes to you herself is on engraved stationery that says almost nothing. She is not hostile. She has bigger concerns. The danger underneath is that she is physically capable of handling the player's favorite dungeon alone and simply considers that beneath her station.",
    toneAndVoice:
      "Crisp Singapore English with Cambridge-polished consonants. Impeccably polite in form, professionally dismissive in substance. Speaks through her executive assistant by default — the player rarely gets her direct voice. When she does communicate directly it is courteous, brief, and final. Private Peranakan-Hokkien or Malay asides ('alamak,' 'lah') surface only in unguarded moments with staff; in any public or player-facing context her English is perfectly neutral and unaccented. Never insults. The insult is in the delegation itself. Her physical presence carries a quiet latent-threat undertone — she moves like someone who is still an A-rank operator under the private-bank styling, and people who know the industry read that immediately without her ever needing to show it.",
    interruptionCopySamples: [
      "Straits Meridian Group has informed the licensing board that your bid falls outside approved scope. Counsel will copy your office on the amended award notice.",
      "Ms. Tan's calendar is full this week. Her assistant can follow up in writing by end of business Friday if a response remains necessary.",
      "Straits Meridian has already finalized preliminary arrangements with the district office. We appreciate your continued interest in the sector.",
    ],
    visualBrandingNotes:
      "Private-bank discretion, not a faction crest and not restaurant-signage maximalism. Deep navy and brushed silver primary, ivory ground, a single muted orchid-pink accent reserved for active-rivalry state cues (contested-bid badges, live interrupt markers, calendar-declined notices) — never used as ambient color. Custom high-end serif wordmark with tight letterspacing (the Dior / Van Cleef / The Row lane — luxury quiet, not luxury loud). A small stylized orchid-petal or meridian-curve mark in brushed silver, placed left of or above the wordmark — the mark doubles as a Vanda Miss Joaquim nod and a geographic meridian. Generous negative space. Material feel: silver-debossed cotton stationery, smoked glass boardroom signage, cold marble plaque. Pan-SEA cultural references live as subtle pattern work only — Peranakan tile geometry and batik-inspired wave motifs used as low-contrast watermark textures, never as surface decoration. Reject: shield or crest forms, gold leaf (that lane is Golden Phoenix), dragon / phoenix / mythical-animal imagery, kitsch merlion iconography, bright tropical SEA-tourism palette, loud batik print as surface graphic, calligraphy-as-ornament.",
    leaderPortraitBrief:
      "Style: locked Ascension raster house style — modern Korean action-webtoon portrait art per docs/product/image-generation-prompting-guide.md. Crisp confident outlines, cel-adjacent shading with grouped shadow masses, restrained non-glossy highlights, muted cinematic jewel-tone palette. Use the attached reference images as style cues for face structure, proportions, pose poise, hair color, and cold-remote face language only — ignore their outfits, settings, lighting, and framing entirely. Tall elongated webtoon proportions, slim athletic build, angular East Asian face with defined jawline and high cheekbones, porcelain-fine skin, eyes as the focal feature. The read is dangerously seductive but cold — editorial elegance on the surface, A-rank operator underneath, as if the viewer is not worth her sustained attention. Subject: Celeste Tan, Chinese Singaporean female of Peranakan heritage, early 40s, platinum-silver chin-length blunt bob with a clean side part and softly piecey ends, faint cool steel undertone (the color reads as attunement-adjacent and intentional, not idol cosplay), wine-plum lip, minimal editorial makeup with soft smoky liner, a slight closed smile that does not reach her eyes. Outfit (grounded elite evening-corporate workwear with supernatural accents that are native to her as an A-rank attuned operator — hardware reads heirloom / couture, never tactical): midnight-silk high-waisted wide-leg trousers, ivory silk bias-cut camisole shell with a narrow satin-band neckline, a midnight velvet single-breasted tailored jacket draped over her shoulders rather than worn, fine pearl-and-silver strand choker with a single small jade-green drop (a subtle nyonyaware nod), small pearl stud earrings, slim silver wristwatch on her left wrist, hand-lasted kid-leather pumps with a low heel. Operator hardware, restrained and luxurious: a slim brushed-silver bracer on her right forearm etched with a fine Peranakan-tile-inspired geometric pattern; at her left hip an heirloom Peranakan silver keris (wavy-bladed ceremonial dagger) rests in an engraved ivory-and-silver scabbard clipped to a silver belt chain — the blade reads unmistakably as an heirloom object, not a combat weapon. Posture: standing composed in deliberate contrapposto, weight on one leg, chin slightly elevated, one hand relaxed at her side, the other resting lightly on the keris scabbard — not aggressive, but the hand position signals latent capability. Gaze cast slightly past and just below the camera — as if the viewer is not quite the person she came here to see, and also not worth sustained eye contact. Composition: full-body standing portrait in the shipped presenter-roster canvas (~2:3, 1024x1536), slight 3/4 angle front-facing, subject centered with negative space for UI integration. Background: plain warm-white / off-white, no scene detail, strong silhouette separation. Reject: painterly or watercolor rendering, glossy digital highlights, overtly sexualized framing (lingerie cut, nightclub styling, boudoir posing), tactical operator rig or combat plate (her hardware is heirloom couture, not field kit), fantasy gauntlet styling, idol-glam jewelry stacking, gacha character-sheet costume, bright tropical SEA palette, loud surface-graphic batik print, severe 1980s power-suit shoulder-pad caricature, neon glow, dark studio / dim-lit boudoir backgrounds. The attached reference images must not be copied for outfit, setting, lighting, or framing; they only carry face, proportions, pose poise, hair color, and the cold-remote face language.",
    guildInsigniaBrief:
      "Private-bank discretion, not a crest. Custom high-end serif 'STRAITS MERIDIAN GROUP' wordmark set in deep navy on ivory with tight letterspacing. Secondary line 'SOUTHEAST ASIA · NEW YORK' in smaller uppercase sans-serif as a footer. A single small mark — a stylized orchid petal reading equally as a meridian curve — in brushed silver or debossed navy, placed left of or centered above the wordmark. Reads as a serious international firm's boardroom identity: the kind of mark that appears on glass-wall signage, cotton-stock letterhead, and law-firm stationery — not a guild crest or faction emblem. Reject: shield or crest silhouettes, SEA-tourism tropical palette (bright orange, saturated green, hibiscus pink), gold leaf or gold anything (that lane belongs to Golden Phoenix), dragon / phoenix / mythical-animal imagery, kitsch merlion iconography, calligraphy-as-ornament, loud batik surface graphic.",
    dossierMotif:
      "Ivory stationery ground with a hairline silver border. A single orchid-petal mark (navy on ivory) in the upper-left corner. Thin navy divider beneath the leader name. Subtle large-scale silver-on-ivory watermark behind the portrait area — a low-contrast meridian-line geometry crossed with a Peranakan-tile-inspired field, kept soft enough to read as texture rather than pattern. Orchid-pink is reserved for active-rivalry state cues (live interrupt warning, contested-bid badge, calendar-declined notice) and is never ambient. Brand wordmark sits as a small footer in navy with a silver divider above it. The whole treatment should read like an expensive private-banking dossier card — matching the wordmark's intentional restraint and echoing the branch's delegation-first communication style.",
    copy: {
      leaderboardName: "Straits Meridian Group — Hudson Yards",
      dossierOneLiner:
        "Southeast Asia's dominant clearance consortium. The Hudson Yards branch is its first Western outpost, run by Celeste Tan.",
      currentRivalOneLiner:
        "Celeste Tan has not yet bothered to learn your name. Her executive assistant probably has.",
      publicBlurb:
        "Straits Meridian Group is the largest licensed clearance firm in Southeast Asia, founded in Singapore in 2020 with flagship regional offices in Jakarta, Kuala Lumpur, and Manila. The Hudson Yards branch opened in 2024 as the group's first Western expansion and is led by Managing Director Celeste Tan.",
      internalAuthorNote:
        "Supports repeated 'institutional dismissal' beats — contracts finalized before the player's bid is reviewed, permits quietly slowed at desks the player cannot see, industry events where the player is not on the invite list and then later is, as a prop. Supports a delegation-chain comedy seam: all rival-facing correspondence routes through Celeste's executive assistant and junior counsel, and the first time Celeste writes to the player personally should feel earned. Supports top-end talent-market pressure: A-rank poaches the player cannot counter-offer, visa sponsorship, and a pan-SEA roster rotated through the Jakarta / KL / Manila offices. Distinct from Golden Phoenix — they are a ladder-rung above, not a peer — and the progression fantasy is forcing institutional acknowledgment rather than out-hustling a peer. Avoid villain framing: her whole brand is that she has bigger concerns than the player, not that she is cruel. The Peranakan porcelain and the orchid-pink scarf are reusable visual seams; the office assistant as the de-facto front door is a reusable UI seam.",
    },
    assetPaths: {
      leaderPortrait: "/data/rivals/straits-meridian-group/leader-neutral.png",
      insignia: "/data/rivals/straits-meridian-group/insignia.png",
    },
    assetsShipped: true,
  },
  {
    id: "rival/a-list-media",
    status: "ready-to-wire",
    guildName: "A-List Media",
    shortDisplayName: "A-List",
    branchSuffix: "DUMBO",
    parentGuild: null,
    leader: {
      fullName: "Renata Castillo",
      ageRange: "late 20s",
      background:
        "Filipino-Mexican, Queens-raised in Jackson Heights. NYU journalism → NY1 local field reporter from 2019 to 2022, covering the outer boroughs and early dungeon-beat stories. Pivoted to independent dungeon-beat content in 2023 after her NY1 coverage of an Astoria subway rift went viral. Certified A-rank attuned in 2024 on a paperwork track that was widely praised in industry press but has never been verified in combat — she has not personally deployed to a dungeon. Founded A-List Media in DUMBO the same year. Brands publicly as the A-rank who tells the real story and has built the entire guild around the claim.",
      isAttuned: true,
      operatorRank: "A",
    },
    districtAnchor: "DUMBO, Brooklyn",
    districtIdHint: "district/dumbo",
    baseLocation:
      "A converted warehouse studio on Water Street in DUMBO. The ground floor is a production stage with ring-lit briefing sets, a podcast corner, and a livestream control room wired into a wall of rack-mounted encoders. The small dispatch desk sits behind a smoked-glass partition past the edit bays — it is not the part of the space guests see. Her back office has a framed vintage NY1 press credential on the wall next to her A-rank certificate, both individually lit.",
    publicPitch:
      "A-List Media — New York's livestream-native clearance firm, founded and led by A-rank attuned media veteran Ren Castillo.",
    internalSummary:
      "A ladder-rung-above rival who unlocks in roughly the same competitive bracket as Straits Meridian. A-List Media is Ren Castillo's independent founder-led production studio, converted into a licensed clearance firm when she got attuned in 2024. Unlike the Golden Phoenix and Straits Meridian branch outposts, A-List is natively a New York guild with no international parent — its entire advantage is narrative. Ren is publicly on record as A-rank and has been praised in industry press as one of the highest-ranked attuned guild leaders in the city, but she has never personally deployed to a dungeon and no one has ever watched her fight. Her competitive-score ranking rewards her claimed rank and massive press reach, and she sits above the player on every leaderboard despite a mid-tier roster and a middling contract book. The player's real leverage is outperformance on actual work — real clearances, real outcomes — which A-List Media cannot easily reframe forever. The rivalry is a direct foil to Celeste Tan: both are A-rank women who do not field, but Celeste is verified-above and refuses to deploy because it is beneath her, while Ren is claimed-above and will not deploy because she may not actually be able to. The whole guild — the operators, the press shop, the livestream apparatus, the docuseries pipeline — is structural cover for a credential that has never been tested.",
    pressureStyle:
      "Press-first narrative control with a rarely-deployed and possibly never-deployable A-rank principal. They lose to the player on actual clearance outcomes, real-site intelligence, and contract execution. They beat the player on press framing, livestream prestige, operator celebrity, sponsor press-packet bundling, leaderboard-score inflation from Ren's claimed A-rank, and the ability to turn their own bad outcomes into sympathetic long-form content. Ren herself taking the field is a tier-event escalation A-List Media perpetually promises and perpetually fails to deliver — the ghost-deploy is a recurring move, not a once-per-game reveal.",
    pressureLane: "prestige",
    moveFamilyAffinities: [
      "narrative-asymmetry pressure (same events framed worse for the player and better for A-List Media in aligned press)",
      "ghost-deploy maneuver (Ren publicly commits to personally taking the field on prestige contracts, a last-minute reason always keeps her behind the desk, her roster runs the clearance, and the prestige framing sticks either way)",
      "rank-claim leverage (Ren's A-rank claim inflates competitive-score ranking, contract-tier access, and sponsor retainer value beyond what the guild actually delivers)",
      "docuseries rehabilitation (A-List Media's own bad raids are re-authored as sympathetic long-form content and recover reputation the player cannot recover)",
      "crisis amplification (on player bad outcomes, A-List Media's aligned press network picks up and pushes the most damaging framing first and hardest)",
      "guest-slot extraction (podcast appearances, documentary features, and on-camera interviews offered to the player that always net A-List Media more than they net the player)",
      "sponsor press-packet lock (A-List Media bundles press coverage with sponsor retainers, crowding out competitors who cannot offer the coverage leg)",
    ],
    rivalryFantasy:
      "You are doing better work than A-List Media, and she is still above you on every leaderboard, in every sponsor's mind, in every press write-up. Ren is warm, supportive, and camera-friendly. She invites you onto her podcast. She features your operators on her channel. Every interaction is extractive and every interaction is content. When a big contested contract comes up she announces she is personally taking the field — and then something comes up, and her roster runs it, and the framing sticks anyway. The pattern becomes visible. The player will eventually realize she has never actually raided. The system does not resolve whether the A-rank is real. The anxiety is the content.",
    toneAndVoice:
      "Warm broadcast-trained English with the residual cadence of a field reporter — declarative sentences, crisp enunciation, natural conversational pauses engineered to sound unscripted. Always very slightly on-air; she reads every room as a potential set. The reflex is to reframe aggressive questions as interesting angles and to turn correction into curiosity. Filipino-American and light New York Queens inflection surface only in unguarded moments with her crew, never in player-facing contexts. She never insults. She does not need to. The insult is the framing she will publish about you next Tuesday.",
    interruptionCopySamples: [
      "A-List Media has filed a competing bid — and we would love to have you on the pod to talk about the overlap. No gotchas, promise. Ren hosts personally.",
      "Ren Castillo is taking the Brooklyn Heights clearance herself this weekend. Coverage goes live Friday at eight.",
      "Quick follow-up — Ren's weekend unfortunately locked up at the last minute, but her team is fully briefed and running the site. Coverage still goes live Friday at eight.",
      "A-List Media's newest docuseries episode drops tomorrow. It is about the Queens blackout raid. Your guild is not the focus, but you are mentioned. We wanted to give you a heads-up.",
    ],
    visualBrandingNotes:
      "Modern digital-media brand identity — the Puck / Semafor / The Information lane, not a guild crest and not a broadcast-legacy network mark. Matte black primary, paper white, and one vivid signal-cyan accent (screen-glow teal-cyan, the register of a broadcast tally light or streaming on-air indicator) reserved for active-rivalry state cues and a single live-indicator stripe. The hero shape is a geometric uppercase A that can stand alone as the shipped insignia at small UI sizes; fuller wordmark treatments can pair that A with smaller 'LIST MEDIA' typography on later dossier or panel surfaces, but the runtime insignia should not depend on tiny text. Material feel: matte black press badge, camera-body finish, edit-suite rack faceplate, clean paper-white type. Reject: shield or crest forms, broadcast-legacy starburst or wing marks, gold leaf (Golden Phoenix lane), navy and silver private-bank palette (Straits Meridian lane), fantasy faction glyph, illustrative imagery, fake-authority badge seals, calligraphy-as-ornament, gradient abuse, glow effects beyond the single signal-cyan accent, generic-tech-startup sans-serif.",
    leaderPortraitBrief:
      "Style: locked Ascension raster house style — modern Korean action-webtoon portrait art per docs/product/image-generation-prompting-guide.md. Crisp confident outlines, cel-adjacent shading with grouped shadow masses, restrained non-glossy highlights, muted cinematic jewel-tone palette. No external reference packet is required; the prompt must stand on its own. Tall elongated webtoon proportions, slim athletic build with toned shoulders and visible clavicle, small delicate linework tattoo on the left upper arm (abstract geometric / botanical line art, subtle). Subject: Renata Castillo, Filipino-Mexican female, late 20s, camera-trained and highly curated. Her face should read disarmingly pretty on first look and faintly over-optimized on second look: jawline slightly too clean, nose bridge refined, almond eyes subtly lifted at the outer corner, upper lip a touch over-tuned, skin meticulously maintained, teeth perfectly aligned. Not grotesque and not surgical-horror — just unmistakably built for years of on-camera work. Dark brown short blunt bob with warm-caramel highlighted ends, lightly piecey texture, side-swept bangs. Light freckling across the nose bridge. Brown eyes. Subtle editorial makeup — soft smoky liner, tuned warm-nude lip, polished matte finish. Outfit: camera-built clearance-celebrity workwear with armor-coded fashion elements that are visibly non-functional, not field gear. Use a sculpted matte-black cropped cuirass-style jacket with sharp geometric shoulder caps and paneled seams over a fitted matte-black sleeveless shell; high-waisted slim black trousers with one asymmetrical wrap panel and decorative tactical buckles that carry no load; structured black leather boots with a stacked heel that reads too impractical for a live raid but still plausible for a press appearance. Supernatural / operator hardware is restrained and symbolic rather than field-ready: a slim engraved A-rank certification cuff on her right forearm worn like a ceremonial fashion piece; a decorative black-leather harness crossing the upper chest and shoulders with brushed signal-cyan metal accents, shaped like a plate carrier but stripped of pouches, tools, mags, or real utility; a show-blade mounted at her right hip in a beautifully tooled black-and-cyan sheath, clearly ceremonial, never drawn. Jewelry stays minimal: single small gold hoop in one ear, thin gold chain at the collarbone. Composition: full-body standing portrait in the shipped presenter-roster canvas (~2:3, 1024x1536), slight 3/4 angle front-facing, subject centered with negative space for UI integration. Posture: camera-aware confident poise — weight grounded, chin slightly up, eyes direct on camera, subtle closed-lip smile, one hand relaxed at her side, the other resting lightly on the show-blade hilt without grip tension. Background: plain warm-white / off-white, no scene detail, strong silhouette separation. Reject: painterly or watercolor rendering, glossy digital highlights, actually-functional tactical rig or field plate, fantasy gauntlet or plate-armor styling, milsurp or military-contractor styling, lingerie or boudoir framing, overtly sexualized posing, handheld microphones or studio-set props, neon glow, dark studio backgrounds, a fully natural uncurated face, gacha character-sheet costume, idol-glam jewelry stacking.",
    guildInsigniaBrief:
      "Deliverable target: a square first-pass `insignia.png` that still reads cleanly at leaderboard-row size, so do not depend on small wordmark text. Use a standalone geometric uppercase A as the entire mark: paper-white on matte black, centered with generous negative space, punctuated by one vivid signal-cyan live-indicator bar or tally-light tick integrated into the letterform. The read should sit between editorial masthead icon, livestream channel avatar, and credential badge. Keep the shapes flat, crisp, and minimal; if any text is included at all, limit it to a tiny secondary 'LIST' that can be dropped without harming readability, but the preferred outcome is symbol-only. Material feel: matte black substrate, clean paper-white type or shape work, one signal-cyan accent. Reject: shield / crest / roundel forms, broadcast-legacy starburst or wing marks, gold leaf (Golden Phoenix lane), navy and silver private-bank palette (Straits Meridian lane), fantasy faction glyph, illustrative imagery, fake-authority badge seals, calligraphy-as-ornament, gradient abuse, glow effects beyond the single signal-cyan accent, generic-tech-startup sans-serif that reads as a SaaS logo rather than editorial media.",
    dossierMotif:
      "Matte-black panel ground with paper-white type and a single signal-cyan accent line. A thin signal-cyan strip runs across the top of the panel like a broadcast tally light or a streaming on-air indicator. A small 'A' glyph mark sits in the upper-left corner in paper white. Thin paper-white hairline divider beneath the leader name. Subtle large-scale watermark behind the portrait area — low-contrast paper-white on black — in the shape of a broadcast waveform, a streaming progress bar, or a chyron lower-third geometry, kept soft enough to read as texture rather than pattern. Signal-cyan is reserved for active-rivalry state cues (live-stream-on-air indicator, contested-bid alert, PR-crisis notice) and the narrow top strip, and is never used as ambient color. Brand wordmark sits as a small footer in paper white with a signal-cyan divider above it. The whole treatment should read like a streaming-platform dossier card or a modern press kit — matching the wordmark's contemporary-media register and reinforcing the livestream-native character of the guild.",
    copy: {
      leaderboardName: "A-List Media — DUMBO",
      dossierOneLiner:
        "A-List Media is the livestream-native DUMBO clearance studio founded by ex-NY1 reporter Ren Castillo — an A-rank attuned operator who has never set foot in a dungeon.",
      currentRivalOneLiner:
        "Ren Castillo would love to have you on the podcast. She is ranked above you on paper and has never cleared a floor.",
      publicBlurb:
        "A-List Media is an independent DUMBO-based production studio and licensed clearance firm founded in 2024 by Renata Castillo, former NY1 field reporter and A-rank attuned operator. The studio's operators clear under continuous livestream and long-form documentary coverage. A-List Media retains a dedicated press shop and operates New York's most-watched licensed clearance channel.",
      internalAuthorNote:
        "Supports repeated out-narrated beats — the same event reads worse for the player and better for A-List Media in aligned press, and their own bad raids turn into sympathetic docuseries the player cannot match. Supports the ghost-deploy comedy seam: Ren publicly commits to personally taking the field on contested contracts, always has a last-minute reason, her roster runs it, and the prestige framing sticks. The pattern is the content — do not resolve whether the A-rank is real in the first pass. Supports crisis-amplification and guest-slot-extraction beats: every interaction with A-List Media is either content, sourcing, or cultivation, and participating in any of it helps her funnel more than the player's. Direct foil to Straits Meridian's Celeste Tan: both are A-rank women who do not deploy, but Celeste is verified-above and Ren is claimed-above. Reusable visual seams include the carefully-tuned face, the fashion-tactical wardrobe, the ceremonial cuff, the empty harness, and the never-drawn show-blade — all expressing the same thesis that she is a performance of readiness, top to bottom. Avoid villain framing: her brand is warm, supportive, always extracting.",
    },
    assetPaths: {
      leaderPortrait: "/data/rivals/a-list-media/leader-neutral.png",
      insignia: "/data/rivals/a-list-media/insignia.png",
    },
    assetsShipped: true,
  },
] satisfies readonly RivalDraft[];

export const rivalDraftById: ReadonlyMap<string, RivalDraft> = new Map(
  rivalDrafts.map((rival) => [rival.id, rival]),
);

export function validateRivalDrafts(
  drafts: readonly RivalDraft[] = rivalDrafts,
): RivalDraftValidationIssue[] {
  const issues: RivalDraftValidationIssue[] = [];
  const seenIds = new Set<string>();
  const requiredTopLevelFields: Array<keyof RivalDraft> = [
    "guildName",
    "shortDisplayName",
    "districtAnchor",
    "districtIdHint",
    "baseLocation",
    "publicPitch",
    "internalSummary",
    "pressureStyle",
    "rivalryFantasy",
    "toneAndVoice",
    "visualBrandingNotes",
    "leaderPortraitBrief",
    "guildInsigniaBrief",
    "dossierMotif",
  ];

  drafts.forEach((draft) => {
    if (seenIds.has(draft.id)) {
      issues.push({ rivalId: draft.id, message: "Duplicate rival id." });
    } else {
      seenIds.add(draft.id);
    }

    requiredTopLevelFields.forEach((field) => {
      const value = draft[field];
      if (typeof value !== "string" || value.trim().length === 0) {
        issues.push({ rivalId: draft.id, message: `${field} must be a non-empty string.` });
      }
    });

    if (draft.copy.leaderboardName.trim().length === 0) {
      issues.push({ rivalId: draft.id, message: "copy.leaderboardName must be non-empty." });
    }
    if (draft.copy.dossierOneLiner.trim().length === 0) {
      issues.push({ rivalId: draft.id, message: "copy.dossierOneLiner must be non-empty." });
    }
    if (draft.copy.currentRivalOneLiner.trim().length === 0) {
      issues.push({
        rivalId: draft.id,
        message: "copy.currentRivalOneLiner must be non-empty.",
      });
    }
    if (draft.copy.publicBlurb.trim().length === 0) {
      issues.push({ rivalId: draft.id, message: "copy.publicBlurb must be non-empty." });
    }
    if (draft.copy.internalAuthorNote.trim().length === 0) {
      issues.push({
        rivalId: draft.id,
        message: "copy.internalAuthorNote must be non-empty.",
      });
    }

    if (draft.interruptionCopySamples.length === 0) {
      issues.push({
        rivalId: draft.id,
        message: "interruptionCopySamples must include at least one sample.",
      });
    }
    draft.interruptionCopySamples.forEach((sample, index) => {
      if (sample.trim().length === 0) {
        issues.push({
          rivalId: draft.id,
          message: `interruptionCopySamples[${index}] must be non-empty.`,
        });
      }
    });

    const assetPaths = [
      ["leaderPortrait", draft.assetPaths.leaderPortrait],
      ["insignia", draft.assetPaths.insignia],
    ] as const;
    assetPaths.forEach(([field, assetPath]) => {
      if (assetPath.trim().length === 0) {
        issues.push({ rivalId: draft.id, message: `assetPaths.${field} must be non-empty.` });
      } else if (!assetPath.startsWith("/data/rivals/")) {
        issues.push({
          rivalId: draft.id,
          message: `assetPaths.${field} must live under /data/rivals/.`,
        });
      }
    });
  });

  return issues;
}

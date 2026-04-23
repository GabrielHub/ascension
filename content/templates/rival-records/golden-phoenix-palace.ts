import type { ReadyToWireRivalRecord } from "./schema";

export const goldenPhoenixPalaceRivalRecord = {
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
} satisfies ReadyToWireRivalRecord;

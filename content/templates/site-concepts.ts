/**
 * Site concept templates define dungeon identity independently from mission objectives.
 * A site concept determines what the place is; a mission determines what you do there.
 */

export type ContractRank = "f" | "e" | "d" | "c" | "b" | "a" | "s";

export interface SiteConceptTheme {
  accentPalette: "sewer" | "concrete" | "garden" | "aquatic" | "dust" | "neon" | "rust" | "glass";
  fogTreatmentId: string;
  markerStyleId: string;
  copyStyleTags: readonly string[];
}

export interface SiteConceptTemplate {
  siteConceptId: string;
  name: string;
  districtPool: readonly string[];
  worldSpaceLabel: string;
  conceptSummary: string;
  rankPool: readonly ContractRank[];
  threatProfileTags: readonly string[];
  hazardTags: readonly string[];
  enemyFamilyIds: readonly string[];
  bossFamilyId: string;
  lootFamilyIds: readonly string[];
  visualTheme: SiteConceptTheme;
}

export const siteConceptTemplates: readonly SiteConceptTemplate[] = [
  // ── F-rank sites ──────────────────────────────────────────────────────
  {
    siteConceptId: "site/flooded-subway-tunnel",
    name: "Flooded Subway Tunnel",
    districtPool: ["district/lower-east-side", "district/harlem-substation"],
    worldSpaceLabel: "Subway Rift — Below Street Level",
    conceptSummary:
      "A subway tunnel that kept going after the last stop. The water is warm and wrong.",
    rankPool: ["f"],
    threatProfileTags: ["threat:clustered", "threat:hazard"],
    hazardTags: ["hazard:flooding", "hazard:low-visibility"],
    enemyFamilyIds: ["enemy-family/tunnel-crawlers"],
    bossFamilyId: "boss-family/tunnel-brood",
    lootFamilyIds: ["loot-family/tunnel-salvage", "loot-family/subway-parts"],
    visualTheme: {
      accentPalette: "sewer",
      fogTreatmentId: "fog/murky-water",
      markerStyleId: "marker/organic",
      copyStyleTags: ["tone:claustrophobic", "tone:damp"],
    },
  },
  {
    siteConceptId: "site/condemned-parking-garage",
    name: "Condemned Parking Garage",
    districtPool: ["district/queens-railyard", "district/bronx-overpass"],
    worldSpaceLabel: "Parking Rift — Multi-Level Structure",
    conceptSummary:
      "Spiral ramps that don't end. Exhaust fumes that watch you. The attendant booth is still lit.",
    rankPool: ["f"],
    threatProfileTags: ["threat:mobile", "threat:ambush"],
    hazardTags: ["hazard:fumes", "hazard:poor-footing"],
    enemyFamilyIds: ["enemy-family/concrete-sentinels"],
    bossFamilyId: "boss-family/garage-warden",
    lootFamilyIds: ["loot-family/concrete-salvage", "loot-family/industrial-scrap"],
    visualTheme: {
      accentPalette: "concrete",
      fogTreatmentId: "fog/exhaust-haze",
      markerStyleId: "marker/industrial",
      copyStyleTags: ["tone:oppressive", "tone:mechanical"],
    },
  },
  {
    siteConceptId: "site/abandoned-school",
    name: "Abandoned School",
    districtPool: ["district/bronx-overpass", "district/harlem-substation"],
    worldSpaceLabel: "School Rift — Former PS 41",
    conceptSummary:
      "Hallways that loop. Classrooms that rearrange when you look away. The PA system still works.",
    rankPool: ["f", "e"],
    threatProfileTags: ["threat:unstable", "threat:hostile"],
    hazardTags: ["hazard:spatial-distortion", "hazard:noise"],
    enemyFamilyIds: ["enemy-family/chalk-swarms"],
    bossFamilyId: "boss-family/the-principal",
    lootFamilyIds: ["loot-family/institutional-salvage", "loot-family/chalk-dust"],
    visualTheme: {
      accentPalette: "dust",
      fogTreatmentId: "fog/chalk-haze",
      markerStyleId: "marker/institutional",
      copyStyleTags: ["tone:uncanny", "tone:institutional"],
    },
  },
  {
    siteConceptId: "site/overgrown-botanical-garden",
    name: "Overgrown Botanical Garden",
    districtPool: ["district/queens-railyard", "district/lower-east-side"],
    worldSpaceLabel: "Garden Rift — Former Conservatory",
    conceptSummary:
      "Aggressive growth everywhere. Greenhouse glass that heals itself. Roots that relocate rooms.",
    rankPool: ["f", "e"],
    threatProfileTags: ["threat:clustered", "threat:hazard"],
    hazardTags: ["hazard:entanglement", "hazard:pollen"],
    enemyFamilyIds: ["enemy-family/vine-constructs"],
    bossFamilyId: "boss-family/the-curator",
    lootFamilyIds: ["loot-family/botanical-salvage", "loot-family/growth-essence"],
    visualTheme: {
      accentPalette: "garden",
      fogTreatmentId: "fog/pollen-drift",
      markerStyleId: "marker/organic",
      copyStyleTags: ["tone:overgrown", "tone:patient"],
    },
  },

  // ── E-rank sites ──────────────────────────────────────────────────────
  {
    siteConceptId: "site/infested-aquarium",
    name: "Infested Aquarium Exhibit",
    districtPool: ["district/red-hook-waterfront", "district/lower-east-side"],
    worldSpaceLabel: "Aquarium Rift — Former City Aquarium",
    conceptSummary:
      "Tanks that go deeper than possible. Water that doesn't behave right. The exhibit signs are still legible.",
    rankPool: ["e"],
    threatProfileTags: ["threat:mobile", "threat:hostile"],
    hazardTags: ["hazard:flooding", "hazard:pressure"],
    enemyFamilyIds: ["enemy-family/aquatic-horrors"],
    bossFamilyId: "boss-family/the-exhibit",
    lootFamilyIds: ["loot-family/aquatic-salvage", "loot-family/deep-specimen"],
    visualTheme: {
      accentPalette: "aquatic",
      fogTreatmentId: "fog/deep-murk",
      markerStyleId: "marker/aquatic",
      copyStyleTags: ["tone:submerged", "tone:clinical"],
    },
  },
  {
    siteConceptId: "site/shuttered-department-store",
    name: "Shuttered Department Store",
    districtPool: ["district/harlem-substation", "district/queens-railyard"],
    worldSpaceLabel: "Retail Rift — Former Hensley's",
    conceptSummary:
      "Escalators to floors that shouldn't exist. Mannequins that weren't there a second ago. The fitting rooms don't open from inside.",
    rankPool: ["e"],
    threatProfileTags: ["threat:ambush", "threat:hostile"],
    hazardTags: ["hazard:spatial-distortion", "hazard:entrapment"],
    enemyFamilyIds: ["enemy-family/mannequin-stalkers"],
    bossFamilyId: "boss-family/the-floor-manager",
    lootFamilyIds: ["loot-family/retail-salvage", "loot-family/display-parts"],
    visualTheme: {
      accentPalette: "glass",
      fogTreatmentId: "fog/fluorescent-flicker",
      markerStyleId: "marker/commercial",
      copyStyleTags: ["tone:artificial", "tone:watchful"],
    },
  },
  {
    siteConceptId: "site/collapsed-construction-site",
    name: "Collapsed Construction Site",
    districtPool: ["district/bronx-overpass", "district/red-hook-waterfront"],
    worldSpaceLabel: "Construction Rift — Stalled Tower Project",
    conceptSummary:
      "Half-built floors stacked wrong. Rebar that grows. The crane still turns, but nobody's up there.",
    rankPool: ["e"],
    threatProfileTags: ["threat:clustered", "threat:hostile"],
    hazardTags: ["hazard:falling-debris", "hazard:structural-collapse"],
    enemyFamilyIds: ["enemy-family/rebar-constructs"],
    bossFamilyId: "boss-family/the-foreman",
    lootFamilyIds: ["loot-family/construction-salvage", "loot-family/structural-alloy"],
    visualTheme: {
      accentPalette: "rust",
      fogTreatmentId: "fog/dust-cloud",
      markerStyleId: "marker/industrial",
      copyStyleTags: ["tone:precarious", "tone:unfinished"],
    },
  },
  {
    siteConceptId: "site/derelict-power-station",
    name: "Derelict Power Station",
    districtPool: ["district/red-hook-waterfront", "district/harlem-substation"],
    worldSpaceLabel: "Power Rift — Former Con-Ed Substation",
    conceptSummary:
      "Transformers that hum at the wrong frequency. Cables that reach. The control room lights flicker in patterns.",
    rankPool: ["e"],
    threatProfileTags: ["threat:hazard", "threat:unstable"],
    hazardTags: ["hazard:electrical", "hazard:magnetic-interference"],
    enemyFamilyIds: ["enemy-family/conduit-crawlers"],
    bossFamilyId: "boss-family/the-transformer",
    lootFamilyIds: ["loot-family/electrical-salvage", "loot-family/charged-components"],
    visualTheme: {
      accentPalette: "neon",
      fogTreatmentId: "fog/static-field",
      markerStyleId: "marker/electrical",
      copyStyleTags: ["tone:buzzing", "tone:dangerous"],
    },
  },
];

/** Lookup map built once at module load. */
export const siteConceptById: ReadonlyMap<string, SiteConceptTemplate> = new Map(
  siteConceptTemplates.map((sc) => [sc.siteConceptId, sc]),
);

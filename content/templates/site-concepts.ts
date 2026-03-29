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
  bossId: string;
  lootThemeLabels: readonly string[];
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
    bossId: "boss/tunneler-brood-mother",
    lootThemeLabels: ["Tunnel Salvage", "Subway Parts"],
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
    bossId: "boss/sewer-warden",
    lootThemeLabels: ["Concrete Salvage", "Industrial Scrap"],
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
    bossId: "boss/phantom-stalker",
    lootThemeLabels: ["Institutional Salvage", "Chalk Dust"],
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
    bossId: "boss/the-curator",
    lootThemeLabels: ["Botanical Salvage", "Growth Essence"],
    visualTheme: {
      accentPalette: "garden",
      fogTreatmentId: "fog/pollen-drift",
      markerStyleId: "marker/organic",
      copyStyleTags: ["tone:overgrown", "tone:patient"],
    },
  },

  {
    siteConceptId: "site/flooded-laundromat-basement",
    name: "Flooded Laundromat Basement",
    districtPool: ["district/lower-east-side", "district/queens-railyard"],
    worldSpaceLabel: "Laundromat Rift — Below Street Level",
    conceptSummary:
      "The basement washers never stopped running. The water down here is hot, sudsy, and moving against the current. The dryers spin at frequencies that loosen fillings.",
    rankPool: ["f"],
    threatProfileTags: ["threat:hazard", "threat:clustered"],
    hazardTags: ["hazard:flooding", "hazard:chemical", "hazard:heat"],
    enemyFamilyIds: ["enemy-family/suds-constructs"],
    bossId: "boss/the-attendant",
    lootThemeLabels: ["Laundry Salvage", "Chemical Residue"],
    visualTheme: {
      accentPalette: "sewer",
      fogTreatmentId: "fog/steam-cloud",
      markerStyleId: "marker/industrial",
      copyStyleTags: ["tone:humid", "tone:mechanical"],
    },
  },
  {
    siteConceptId: "site/condemned-residential-basement",
    name: "Condemned Residential Basement",
    districtPool: ["district/harlem-substation", "district/bronx-overpass"],
    worldSpaceLabel: "Residential Rift — Sub-Level Apartments",
    conceptSummary:
      "Somebody's basement apartment kept going down. The furniture rearranges itself. The radiator still works, which is the most frightening part.",
    rankPool: ["f"],
    threatProfileTags: ["threat:ambush", "threat:unstable"],
    hazardTags: ["hazard:darkness", "hazard:structural-collapse"],
    enemyFamilyIds: ["enemy-family/cellar-dwellers"],
    bossId: "boss/the-super",
    lootThemeLabels: ["Domestic Salvage", "Basement Scrap"],
    visualTheme: {
      accentPalette: "dust",
      fogTreatmentId: "fog/dust-cloud",
      markerStyleId: "marker/institutional",
      copyStyleTags: ["tone:cramped", "tone:domestic"],
    },
  },
  {
    siteConceptId: "site/closed-community-center",
    name: "Closed Community Center",
    districtPool: ["district/bronx-overpass", "district/lower-east-side"],
    worldSpaceLabel: "Rec Center Rift — Former Community Hub",
    conceptSummary:
      "The gym lights are on. The scoreboard counts something. The pool has been drained but the diving board still bounces when nobody is on it.",
    rankPool: ["f"],
    threatProfileTags: ["threat:mobile", "threat:hostile"],
    hazardTags: ["hazard:noise", "hazard:spatial-distortion"],
    enemyFamilyIds: ["enemy-family/court-echoes"],
    bossId: "boss/the-referee",
    lootThemeLabels: ["Athletic Salvage", "Rec Scrap"],
    visualTheme: {
      accentPalette: "dust",
      fogTreatmentId: "fog/chalk-haze",
      markerStyleId: "marker/institutional",
      copyStyleTags: ["tone:echoing", "tone:competitive"],
    },
  },
  {
    siteConceptId: "site/corner-deli-cold-storage",
    name: "Corner Deli Cold Storage",
    districtPool: ["district/queens-railyard", "district/red-hook-waterfront"],
    worldSpaceLabel: "Cold Storage Rift — Behind The Counter",
    conceptSummary:
      "The walk-in fridge behind the deli counter goes back further than the building. The cold is wrong — it preserves things that should not be preserved.",
    rankPool: ["f"],
    threatProfileTags: ["threat:hazard", "threat:ambush"],
    hazardTags: ["hazard:cold", "hazard:low-visibility"],
    enemyFamilyIds: ["enemy-family/freezer-fauna"],
    bossId: "boss/the-stockkeeper",
    lootThemeLabels: ["Cold Salvage", "Preserved Parts"],
    visualTheme: {
      accentPalette: "glass",
      fogTreatmentId: "fog/frost-haze",
      markerStyleId: "marker/industrial",
      copyStyleTags: ["tone:frigid", "tone:preserved"],
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
    bossId: "boss/tunneler-brood-mother",
    lootThemeLabels: ["Aquatic Salvage", "Deep Specimen"],
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
    bossId: "boss/phantom-stalker",
    lootThemeLabels: ["Retail Salvage", "Display Parts"],
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
    bossId: "boss/sewer-warden",
    lootThemeLabels: ["Construction Salvage", "Structural Alloy"],
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
    bossId: "boss/sewer-warden",
    lootThemeLabels: ["Electrical Salvage", "Charged Components"],
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

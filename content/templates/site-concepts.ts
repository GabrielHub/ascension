import type { RankTone } from "./shared";

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
  rankTone: RankTone;
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
    rankTone: "grounded",
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
    rankTone: "grounded",
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
    rankTone: "grounded",
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
    rankTone: "grounded",
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
    rankTone: "grounded",
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
    rankTone: "grounded",
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
    rankTone: "grounded",
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
    rankTone: "grounded",
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

  // ── F-rank sites (continued) ──────────────────────────────────────────
  {
    siteConceptId: "site/sealed-subway-platform",
    name: "Sealed Subway Platform",
    districtPool: ["district/lower-east-side", "district/harlem-substation"],
    worldSpaceLabel: "Station Rift — Sealed Platform Below",
    conceptSummary:
      "A subway platform that was boarded up after the first week. The announcements still play. The trains that arrive are not MTA.",
    rankPool: ["f"],
    rankTone: "grounded",
    threatProfileTags: ["threat:ambush", "threat:unstable"],
    hazardTags: ["hazard:noise", "hazard:spatial-distortion"],
    enemyFamilyIds: ["enemy-family/transit-haunts"],
    bossId: "boss/the-dispatcher",
    lootThemeLabels: ["Transit Salvage", "Station Debris"],
    visualTheme: {
      accentPalette: "concrete",
      fogTreatmentId: "fog/fluorescent-flicker",
      markerStyleId: "marker/institutional",
      copyStyleTags: ["tone:echoing", "tone:mechanical"],
    },
  },
  {
    siteConceptId: "site/abandoned-nail-salon",
    name: "Abandoned Nail Salon",
    districtPool: ["district/queens-railyard", "district/lower-east-side"],
    worldSpaceLabel: "Salon Rift — Former Storefront",
    conceptSummary:
      "The ventilation failed months ago but the fumes never left. They thickened. The UV lamps are still on and the color is wrong.",
    rankPool: ["f"],
    rankTone: "grounded",
    threatProfileTags: ["threat:hazard", "threat:clustered"],
    hazardTags: ["hazard:chemical", "hazard:low-visibility"],
    enemyFamilyIds: ["enemy-family/fume-wraiths"],
    bossId: "boss/the-manicurist",
    lootThemeLabels: ["Chemical Salvage", "Lacquer Residue"],
    visualTheme: {
      accentPalette: "neon",
      fogTreatmentId: "fog/chemical-haze",
      markerStyleId: "marker/commercial",
      copyStyleTags: ["tone:acrid", "tone:claustrophobic"],
    },
  },
  {
    siteConceptId: "site/condemned-fire-escape",
    name: "Condemned Fire Escape Network",
    districtPool: ["district/bronx-overpass", "district/harlem-substation"],
    worldSpaceLabel: "Fire Escape Rift — Exterior Structure",
    conceptSummary:
      "The fire escape grew inward through the walls. Landings connect to rooms that do not exist. Going up takes you sideways.",
    rankPool: ["f"],
    rankTone: "grounded",
    threatProfileTags: ["threat:mobile", "threat:ambush"],
    hazardTags: ["hazard:poor-footing", "hazard:structural-collapse"],
    enemyFamilyIds: ["enemy-family/rust-creepers"],
    bossId: "boss/the-inspector",
    lootThemeLabels: ["Structural Salvage", "Rust Flake"],
    visualTheme: {
      accentPalette: "rust",
      fogTreatmentId: "fog/dust-cloud",
      markerStyleId: "marker/industrial",
      copyStyleTags: ["tone:vertical", "tone:unstable"],
    },
  },
  {
    siteConceptId: "site/shuttered-pawn-shop",
    name: "Shuttered Pawn Shop",
    districtPool: ["district/bronx-overpass", "district/queens-railyard"],
    worldSpaceLabel: "Pawn Shop Rift — Behind The Counter",
    conceptSummary:
      "Everything behind the security glass wants out. The display cases rearrange at night. The owner left the TV on and it shows things that have not happened yet.",
    rankPool: ["f"],
    rankTone: "grounded",
    threatProfileTags: ["threat:ambush", "threat:hostile"],
    hazardTags: ["hazard:entrapment", "hazard:noise"],
    enemyFamilyIds: ["enemy-family/display-mimics"],
    bossId: "boss/the-appraiser",
    lootThemeLabels: ["Curio Salvage", "Display Glass"],
    visualTheme: {
      accentPalette: "glass",
      fogTreatmentId: "fog/fluorescent-flicker",
      markerStyleId: "marker/commercial",
      copyStyleTags: ["tone:watchful", "tone:cluttered"],
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
    rankTone: "grounded",
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
    rankTone: "grounded",
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
    rankTone: "grounded",
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
    rankTone: "grounded",
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
  // ── E-rank sites (continued) ──────────────────────────────────────────
  {
    siteConceptId: "site/abandoned-movie-theater",
    name: "Abandoned Movie Theater",
    districtPool: ["district/bronx-overpass", "district/lower-east-side"],
    worldSpaceLabel: "Cinema Rift — Former Multiplex",
    conceptSummary:
      "The projectors never stopped running. The screens show films that were never made. The popcorn butter is warm and the concession stand lights flicker in rhythm with something breathing.",
    rankPool: ["e"],
    rankTone: "grounded",
    threatProfileTags: ["threat:ambush", "threat:hostile"],
    hazardTags: ["hazard:low-visibility", "hazard:noise"],
    enemyFamilyIds: ["enemy-family/reel-phantoms"],
    bossId: "boss/the-projectionist",
    lootThemeLabels: ["Theater Salvage", "Film Stock"],
    visualTheme: {
      accentPalette: "dust",
      fogTreatmentId: "fog/projection-haze",
      markerStyleId: "marker/commercial",
      copyStyleTags: ["tone:theatrical", "tone:watchful"],
    },
  },
  {
    siteConceptId: "site/decommissioned-water-tower",
    name: "Decommissioned Water Tower",
    districtPool: ["district/harlem-substation", "district/red-hook-waterfront"],
    worldSpaceLabel: "Water Tower Rift — Rooftop Cistern",
    conceptSummary:
      "The water tower on the roof stopped being a water tower. The water inside is too clear, too deep, and the algae growing on the inner walls glows when it hears footsteps.",
    rankPool: ["e"],
    rankTone: "grounded",
    threatProfileTags: ["threat:hazard", "threat:clustered"],
    hazardTags: ["hazard:flooding", "hazard:poor-footing"],
    enemyFamilyIds: ["enemy-family/cistern-dwellers"],
    bossId: "boss/the-valve-master",
    lootThemeLabels: ["Cistern Salvage", "Water Tower Parts"],
    visualTheme: {
      accentPalette: "sewer",
      fogTreatmentId: "fog/murky-water",
      markerStyleId: "marker/industrial",
      copyStyleTags: ["tone:submerged", "tone:claustrophobic"],
    },
  },

  // ── D-rank sites ──────────────────────────────────────────────────────
  {
    siteConceptId: "site/warped-rooftop-observatory",
    name: "Warped Rooftop Observatory",
    districtPool: ["district/red-hook-waterfront", "district/harlem-substation"],
    worldSpaceLabel: "Observatory Rift — Former University Annex",
    conceptSummary:
      "The telescope connected to somewhere it shouldn't. Stars are visible during the day inside the dome, and they're wrong stars. The dome rotates on its own, tracking something the sky doesn't contain.",
    rankPool: ["d"],
    rankTone: "heightened",
    threatProfileTags: ["threat:unstable", "threat:hostile"],
    hazardTags: ["hazard:spatial-distortion", "hazard:low-visibility"],
    enemyFamilyIds: ["enemy-family/astral-parasites"],
    bossId: "boss/the-astronomer",
    lootThemeLabels: ["Observatory Salvage", "Stellar Fragments"],
    visualTheme: {
      accentPalette: "glass",
      fogTreatmentId: "fog/starfield-drift",
      markerStyleId: "marker/institutional",
      copyStyleTags: ["tone:cosmic", "tone:cold"],
    },
  },
  {
    siteConceptId: "site/flooded-pumping-station",
    name: "Flooded Pumping Station",
    districtPool: ["district/red-hook-waterfront", "district/queens-railyard"],
    worldSpaceLabel: "Pumping Rift — Below River Level",
    conceptSummary:
      "A water pumping station under the East River. The water inside isn't river water anymore — it's too clear, too dense, and the pressure gauges read numbers that shouldn't be possible. Something in the pipes has adapted to pressures that don't occur on Earth's surface.",
    rankPool: ["d"],
    rankTone: "heightened",
    threatProfileTags: ["threat:hazard", "threat:mobile"],
    hazardTags: ["hazard:flooding", "hazard:pressure"],
    enemyFamilyIds: ["enemy-family/pressure-spawn"],
    bossId: "boss/the-engineer",
    lootThemeLabels: ["Industrial Salvage", "Pressure Components"],
    visualTheme: {
      accentPalette: "aquatic",
      fogTreatmentId: "fog/deep-murk",
      markerStyleId: "marker/industrial",
      copyStyleTags: ["tone:submerged", "tone:oppressive"],
    },
  },
  {
    siteConceptId: "site/condemned-theater-fly-loft",
    name: "Condemned Theater Fly Loft",
    districtPool: ["district/harlem-substation", "district/bronx-overpass"],
    worldSpaceLabel: "Theater Rift — Upper Rigging Level",
    conceptSummary:
      "The upper works of a condemned theater where the fly system operates itself. Sandbags swing with precision, spotlights track living targets, and the rigging ropes tie themselves into shapes that hurt to look at. Six decades of performances have seeped into the machinery.",
    rankPool: ["d"],
    rankTone: "heightened",
    threatProfileTags: ["threat:mobile", "threat:ambush"],
    hazardTags: ["hazard:falling-debris", "hazard:spatial-distortion"],
    enemyFamilyIds: ["enemy-family/stage-haunts"],
    bossId: "boss/the-director",
    lootThemeLabels: ["Theatrical Salvage", "Stage Parts"],
    visualTheme: {
      accentPalette: "dust",
      fogTreatmentId: "fog/dust-cloud",
      markerStyleId: "marker/commercial",
      copyStyleTags: ["tone:theatrical", "tone:vertical"],
    },
  },
  {
    siteConceptId: "site/sealed-biotech-lab",
    name: "Sealed Biotech Lab",
    districtPool: ["district/lower-east-side", "district/queens-railyard"],
    worldSpaceLabel: "Lab Rift — Former Startup Facility",
    conceptSummary:
      "A biotech startup's lab in a converted warehouse. The automated systems continued their experiments after evacuation. Cell cultures became organisms. Centrifuges became predators. The equipment has been iterating on its own designs and the results are not peer-reviewed.",
    rankPool: ["d"],
    rankTone: "heightened",
    threatProfileTags: ["threat:hazard", "threat:hostile"],
    hazardTags: ["hazard:chemical", "hazard:entrapment"],
    enemyFamilyIds: ["enemy-family/lab-specimens"],
    bossId: "boss/the-researcher",
    lootThemeLabels: ["Lab Salvage", "Research Specimens"],
    visualTheme: {
      accentPalette: "neon",
      fogTreatmentId: "fog/chemical-haze",
      markerStyleId: "marker/industrial",
      copyStyleTags: ["tone:clinical", "tone:dangerous"],
    },
  },
];

/** Lookup map built once at module load. */
export const siteConceptById: ReadonlyMap<string, SiteConceptTemplate> = new Map(
  siteConceptTemplates.map((sc) => [sc.siteConceptId, sc]),
);

import type { DistrictTemplate } from "./shared";
import { siteConceptTemplates } from "./site-concepts";

const siteConceptIdsByDistrictId = new Map<string, string[]>();
for (const siteConcept of siteConceptTemplates) {
  for (const districtId of siteConcept.districtPool) {
    const siteConceptIds = siteConceptIdsByDistrictId.get(districtId);
    if (siteConceptIds) {
      siteConceptIds.push(siteConcept.siteConceptId);
      continue;
    }
    siteConceptIdsByDistrictId.set(districtId, [siteConcept.siteConceptId]);
  }
}

function getDistrictSiteConceptIds(districtId: string): readonly string[] {
  return siteConceptIdsByDistrictId.get(districtId) ?? [];
}

export const districtTemplates = [
  {
    id: "district/lower-east-side",
    name: "Lower East Side",
    borough: "Manhattan",
    tags: ["tier:starter", "density:high"],
    description:
      "Narrow streets, walk-up apartments, and basement-level sites. The neighborhood where most new guilds cut their teeth on low-rank clearance work.",
    siteConceptIds: getDistrictSiteConceptIds("district/lower-east-side"),
    primaryFactionIds: ["faction/city-licensing", "faction/labor-safety"],
    pressureBias: 0,
    rewardBias: 0,
    rareMaterialDropTags: [],
  },
  {
    id: "district/queens-railyard",
    name: "Queens Railyard",
    borough: "Queens",
    tags: ["tier:midgame", "density:medium", "infrastructure:rail"],
    description:
      "Decommissioned switching yards and cargo depots where the rift found miles of unmonitored tunnel and nobody looking too closely.",
    siteConceptIds: getDistrictSiteConceptIds("district/queens-railyard"),
    primaryFactionIds: ["faction/borough-contracts", "faction/emergency-management"],
    pressureBias: 1,
    rewardBias: 1,
    rareMaterialDropTags: ["material:rail-slag"],
  },
  {
    id: "district/bronx-overpass",
    name: "Bronx Overpass",
    borough: "Bronx",
    tags: ["tier:midgame", "density:medium", "infrastructure:highway"],
    description:
      "Elevated highway interchange and the dead zones underneath. Loud, exposed, and close enough to residential blocks that containment failures make the news.",
    siteConceptIds: getDistrictSiteConceptIds("district/bronx-overpass"),
    primaryFactionIds: ["faction/emergency-management", "faction/labor-safety"],
    pressureBias: 2,
    rewardBias: 1,
    rareMaterialDropTags: ["material:overpass-aggregate"],
  },
  {
    id: "district/red-hook-waterfront",
    name: "Red Hook Waterfront",
    borough: "Brooklyn",
    tags: ["tier:midgame", "density:low", "infrastructure:port"],
    description:
      "Old shipping terminals and warehouse rows at the water's edge. Fewer eyes, but the borough contract board watches every job that touches the port.",
    siteConceptIds: getDistrictSiteConceptIds("district/red-hook-waterfront"),
    primaryFactionIds: ["faction/borough-contracts", "faction/rival-guild-market"],
    pressureBias: -1,
    rewardBias: 2,
    rareMaterialDropTags: ["material:brine-crystal"],
  },
  {
    id: "district/harlem-substation",
    name: "Harlem Substation",
    borough: "Manhattan",
    tags: ["tier:midgame", "density:high", "infrastructure:power"],
    description:
      "A transformer yard and the surrounding blocks where power grid anomalies overlap with rift activity. Licensing scrutiny is constant.",
    siteConceptIds: getDistrictSiteConceptIds("district/harlem-substation"),
    primaryFactionIds: ["faction/city-licensing", "faction/emergency-management"],
    pressureBias: 2,
    rewardBias: 1,
    rareMaterialDropTags: ["material:conduit-filament"],
  },
] satisfies readonly DistrictTemplate[];

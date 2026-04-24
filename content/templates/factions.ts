import type { FactionTemplate } from "./shared";

export const factionTemplates: readonly FactionTemplate[] = [
  {
    id: "faction/city-licensing",
    name: "City Licensing Bureau",
    kind: "institution",
    tags: ["faction:regulatory", "pressure:compliance"],
    description:
      "The municipal body that issues and revokes guild operating licenses. They care about paperwork, insurance filings, and whether your people are actually certified for the work they are doing.",
    preferredDistrictIds: ["district/lower-east-side", "district/harlem-substation"],
    incidentCategoryBias: ["regulatory_scrutiny", "contract_deadline"],
    contractModifierProfile: { bidCostMultiplier: 1.1, penaltyOnFailure: 1.2 },
    pressureResponseProfile: { scrutinyGain: 1.5, cooldownTicks: 200 },
  },
  {
    id: "faction/labor-safety",
    name: "Labor & Safety Board",
    kind: "institution",
    tags: ["faction:regulatory", "pressure:worker_safety"],
    description:
      "Oversees working conditions for attuned labor. Operator injuries, death reports, and schedule violations land on their desk.",
    preferredDistrictIds: ["district/lower-east-side", "district/bronx-overpass"],
    incidentCategoryBias: ["injury_setback", "personnel_conflict"],
    contractModifierProfile: { casualtyPenaltyMultiplier: 1.3 },
    pressureResponseProfile: { scrutinyGain: 2.0, cooldownTicks: 300 },
  },
  {
    id: "faction/emergency-management",
    name: "Emergency Management Office",
    kind: "institution",
    tags: ["faction:regulatory", "pressure:containment"],
    description:
      "Coordinates disaster response and containment enforcement. They show up when a failed clearance threatens the surrounding neighborhood.",
    preferredDistrictIds: [
      "district/bronx-overpass",
      "district/queens-railyard",
      "district/harlem-substation",
    ],
    incidentCategoryBias: ["breach_emergency", "contract_deadline"],
    contractModifierProfile: { containmentBonusMultiplier: 1.2 },
    pressureResponseProfile: { scrutinyGain: 1.8, cooldownTicks: 250 },
  },
  {
    id: "faction/borough-contracts",
    name: "Borough Contracts Authority",
    kind: "institution",
    tags: ["faction:political", "pressure:contracts"],
    description:
      "Controls borough-level contract allocation and priority bidding. Political leverage decides who gets the good jobs.",
    preferredDistrictIds: ["district/queens-railyard", "district/red-hook-waterfront"],
    incidentCategoryBias: ["contract_deadline", "economic_pressure"],
    contractModifierProfile: { priorityBidDiscount: 0.9 },
    pressureResponseProfile: { scrutinyGain: 1.0, cooldownTicks: 400 },
  },
];

import type { BuildingTemplate } from "./shared";

export const buildingTemplates = [
  {
    id: "building/bodega",
    kind: "building",
    name: "The Bodega",
    tags: ["phase:preproduction", "site:street", "tier:starter"],
    description:
      "A real neighborhood bodega running street food out front and guild business in back.",
    baseTier: 1,
    baseRoomSlots: 4,
    baseOperatorSlots: 7,
    upgradeIds: [
      "upgrade/building/bodega:frontage",
      "upgrade/building/bodega:annex",
      "upgrade/building/bodega:extension",
    ],
    contractRankCeiling: "f",
    baseIncome: 20,
  },
  {
    id: "building/porters",
    kind: "building",
    name: "Porter's",
    tags: ["phase:porter", "site:waterfront", "tier:second"],
    description:
      "A neighborhood bar and restaurant on the Red Hook waterfront. Public downstairs, operations upstairs.",
    baseTier: 1,
    baseRoomSlots: 7,
    baseOperatorSlots: 12,
    upgradeIds: [
      "upgrade/building/porters:kitchen_overhaul",
      "upgrade/building/porters:upstairs_conversion",
      "upgrade/building/porters:remodel",
      "upgrade/building/porters:waterfront",
    ],
    contractRankCeiling: "d",
    baseIncome: 35,
    recruitmentQualityBonus: 1,
  },
] satisfies readonly BuildingTemplate[];

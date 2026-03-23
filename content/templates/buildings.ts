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
    baseOperatorSlots: 6,
    upgradeIds: [
      "upgrade/building/bodega:frontage",
      "upgrade/building/bodega:annex",
      "upgrade/building/bodega:backyard_extension",
    ],
  },
  {
    id: "building/union_hall",
    kind: "building",
    name: "Union Hall",
    tags: ["site:city", "tier:midgame"],
    description: "A larger headquarters for when the guild outgrows the corner shop.",
    baseTier: 2,
    baseRoomSlots: 7,
    baseOperatorSlots: 5,
    upgradeIds: [],
  },
] satisfies readonly BuildingTemplate[];

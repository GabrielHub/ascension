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
    upgradeIds: ["upgrade/building/bodega:frontage"],
  },
] satisfies readonly BuildingTemplate[];

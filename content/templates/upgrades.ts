import type { UpgradeTemplate } from "./shared";

export const upgradeTemplates = [
  {
    id: "upgrade/building/bodega:frontage",
    kind: "upgrade",
    name: "Street-Facing Frontage",
    tags: ["upgrade:building", "progression:visibility"],
    description: "Reclaims the storefront and opens one additional room slot.",
    target: "building",
    targetId: "building/bodega",
    requirements: [
      {
        type: "resource_min",
        resourceId: "resource/cash",
        minimum: 150,
      },
    ],
    effects: [
      {
        type: "add_room_slot",
        amount: 1,
      },
    ],
  },
  {
    id: "upgrade/building/bodega:annex",
    kind: "upgrade",
    name: "Back-Alley Annex",
    tags: ["upgrade:building", "progression:rooms"],
    description: "Opens the infirmary line and expands bodega staffing room.",
    target: "building",
    targetId: "building/bodega",
    requirements: [
      {
        type: "resource_min",
        resourceId: "resource/cash",
        minimum: 220,
      },
      {
        type: "building_tier_min",
        buildingId: "building/bodega",
        minimum: 1,
      },
    ],
    effects: [
      {
        type: "unlock_room_template",
        roomId: "room/infirmary:tier_1",
      },
      {
        type: "grant_operator_slot",
        amount: 1,
      },
    ],
  },
] satisfies readonly UpgradeTemplate[];

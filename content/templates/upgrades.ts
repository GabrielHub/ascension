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
  {
    id: "upgrade/room/front_desk:records_wall",
    kind: "upgrade",
    name: "Records Wall",
    tags: ["upgrade:room", "room:operations"],
    description: "Extends intake handling capacity with a dedicated records wall.",
    target: "room",
    targetId: "room/front_desk:tier_1",
    requirements: [
      {
        type: "resource_min",
        resourceId: "resource/cash",
        minimum: 90,
      },
      {
        type: "room_count_min",
        roomId: "room/front_desk:tier_1",
        minimum: 1,
      },
    ],
    effects: [
      {
        type: "modify_room_capacity",
        roomId: "room/front_desk:tier_1",
        amount: 1,
      },
      {
        type: "modify_resource_income",
        resourceId: "resource/cash",
        amount: 6,
      },
    ],
  },
  {
    id: "upgrade/room/recruitment_space:quiet_corner",
    kind: "upgrade",
    name: "Quiet Corner",
    tags: ["upgrade:room", "room:staffing"],
    description: "Makes recruitment interviews more attractive and slightly roomier.",
    target: "room",
    targetId: "room/recruitment_space:tier_1",
    requirements: [
      {
        type: "resource_min",
        resourceId: "resource/cash",
        minimum: 110,
      },
      {
        type: "room_count_min",
        roomId: "room/recruitment_space:tier_1",
        minimum: 1,
      },
    ],
    effects: [
      {
        type: "modify_room_capacity",
        roomId: "room/recruitment_space:tier_1",
        amount: 1,
      },
      {
        type: "modify_attraction_weight",
        tag: "role:medic",
        amount: 2,
      },
    ],
  },
  {
    id: "upgrade/room/infirmary:triage_cots",
    kind: "upgrade",
    name: "Triage Cots",
    tags: ["upgrade:room", "room:recovery"],
    description: "Adds faster turn-around for recovery cases and one extra bed.",
    target: "room",
    targetId: "room/infirmary:tier_1",
    requirements: [
      {
        type: "resource_min",
        resourceId: "resource/cash",
        minimum: 130,
      },
      {
        type: "room_count_min",
        roomId: "room/infirmary:tier_1",
        minimum: 1,
      },
    ],
    effects: [
      {
        type: "modify_room_capacity",
        roomId: "room/infirmary:tier_1",
        amount: 1,
      },
      {
        type: "modify_recovery_rate",
        amount: 1,
      },
    ],
  },
] satisfies readonly UpgradeTemplate[];

import type { UpgradeTemplate } from "./shared";

export const upgradeTemplates = [
  {
    id: "upgrade/building/bodega:frontage",
    kind: "upgrade",
    name: "Street-Facing Frontage",
    tags: ["upgrade:building", "progression:visibility"],
    description:
      "Cleans up the storefront, sharpens the signage, and makes the bodega look intentional.",
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
        type: "modify_resource_income",
        resourceId: "resource/cash",
        amount: 6,
      },
      {
        type: "modify_morale",
        amount: 1,
      },
    ],
  },
  {
    id: "upgrade/building/bodega:annex",
    kind: "upgrade",
    name: "Back-Alley Annex",
    tags: ["upgrade:building", "progression:rooms"],
    description: "Absorbs the empty unit next door and gives the bodega one more usable corner.",
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
        type: "add_room_slot",
        amount: 1,
      },
      {
        type: "grant_operator_slot",
        amount: 1,
      },
    ],
  },
  {
    id: "upgrade/room/register:records_wall",
    kind: "upgrade",
    name: "Records Wall",
    tags: ["upgrade:room", "room:operations"],
    description: "Extends intake handling capacity with a dedicated records wall.",
    target: "room",
    targetId: "room/register:tier_1",
    requirements: [
      {
        type: "resource_min",
        resourceId: "resource/cash",
        minimum: 90,
      },
      {
        type: "room_count_min",
        roomId: "room/register:tier_1",
        minimum: 1,
      },
    ],
    effects: [
      {
        type: "modify_room_capacity",
        roomId: "room/register:tier_1",
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
    id: "upgrade/room/counter:hot_coffee",
    kind: "upgrade",
    name: "Hot Coffee",
    tags: ["upgrade:room", "room:social"],
    description:
      "Gets the coffee machine and counter service to a level where people come back on purpose.",
    target: "room",
    targetId: "room/counter:tier_1",
    requirements: [
      {
        type: "resource_min",
        resourceId: "resource/cash",
        minimum: 110,
      },
      {
        type: "room_count_min",
        roomId: "room/counter:tier_1",
        minimum: 1,
      },
    ],
    effects: [
      {
        type: "modify_resource_income",
        resourceId: "resource/cash",
        amount: 4,
      },
      {
        type: "modify_attraction_weight",
        tag: "role:medic",
        amount: 2,
      },
    ],
  },
  {
    id: "upgrade/room/dining_area:first_aid_station",
    kind: "upgrade",
    name: "First-Aid Station",
    tags: ["upgrade:room", "room:recovery"],
    description:
      "Adds a stocked first-aid station and a cleaner recovery corner behind the curtain.",
    target: "room",
    targetId: "room/dining_area:tier_1",
    requirements: [
      {
        type: "resource_min",
        resourceId: "resource/cash",
        minimum: 130,
      },
      {
        type: "room_count_min",
        roomId: "room/dining_area:tier_1",
        minimum: 1,
      },
    ],
    effects: [
      {
        type: "modify_morale",
        amount: 1,
      },
      {
        type: "modify_recovery_rate",
        amount: 1,
      },
    ],
  },
  {
    id: "upgrade/room/supply_closet:labeled_bins",
    kind: "upgrade",
    name: "Labeled Bins",
    tags: ["upgrade:room", "room:staffing"],
    description: "Adds shelf labels, bins, and enough order to stop losing useful gear.",
    target: "room",
    targetId: "room/supply_closet:tier_1",
    requirements: [
      {
        type: "resource_min",
        resourceId: "resource/cash",
        minimum: 100,
      },
      {
        type: "room_count_min",
        roomId: "room/supply_closet:tier_1",
        minimum: 1,
      },
    ],
    effects: [
      {
        type: "modify_room_capacity",
        roomId: "room/supply_closet:tier_1",
        amount: 1,
      },
      {
        type: "modify_resource_cost",
        resourceId: "resource/cash",
        multiplier: 0.95,
      },
    ],
  },
  {
    id: "upgrade/room/gym:heavy_bags",
    kind: "upgrade",
    name: "Heavy Bags",
    tags: ["upgrade:room", "room:training"],
    description: "Punching bags and sparring pads that improve training output.",
    target: "room",
    targetId: "room/gym:tier_1",
    requirements: [
      {
        type: "resource_min",
        resourceId: "resource/cash",
        minimum: 120,
      },
      {
        type: "room_count_min",
        roomId: "room/gym:tier_1",
        minimum: 1,
      },
    ],
    effects: [
      {
        type: "modify_training_rate",
        amount: 1,
      },
    ],
  },
  {
    id: "upgrade/room/lounge:jukebox",
    kind: "upgrade",
    name: "Jukebox",
    tags: ["upgrade:room", "room:social"],
    description: "A working jukebox that significantly lifts lounge morale.",
    target: "room",
    targetId: "room/lounge:tier_1",
    requirements: [
      {
        type: "resource_min",
        resourceId: "resource/cash",
        minimum: 80,
      },
      {
        type: "room_count_min",
        roomId: "room/lounge:tier_1",
        minimum: 1,
      },
    ],
    effects: [
      {
        type: "modify_morale",
        amount: 2,
      },
    ],
  },
  {
    id: "upgrade/building/bodega:backyard_extension",
    kind: "upgrade",
    name: "Backyard Extension",
    tags: ["upgrade:building", "progression:rooms"],
    description: "Extends the bodega into the backyard, adding room and operator capacity.",
    target: "building",
    targetId: "building/bodega",
    requirements: [
      {
        type: "resource_min",
        resourceId: "resource/cash",
        minimum: 300,
      },
      {
        type: "building_tier_min",
        buildingId: "building/bodega",
        minimum: 1,
      },
    ],
    effects: [
      {
        type: "add_room_slot",
        amount: 1,
      },
      {
        type: "grant_operator_slot",
        amount: 1,
      },
    ],
  },
] satisfies readonly UpgradeTemplate[];

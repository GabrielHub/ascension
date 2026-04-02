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
        minimum: 360,
      },
      {
        type: "resource_min",
        resourceId: "resource/reputation",
        minimum: 20,
      },
    ],
    effects: [
      {
        type: "modify_resource_income",
        resourceId: "resource/cash",
        amount: 10,
      },
      {
        type: "modify_morale",
        amount: 1,
      },
      {
        type: "modify_attraction_weight",
        tag: "role:medic",
        amount: 1,
      },
      {
        type: "modify_attraction_weight",
        tag: "role:scout",
        amount: 1,
      },
      {
        type: "modify_attraction_weight",
        tag: "role:field_lead",
        amount: 1,
      },
    ],
  },
  {
    id: "upgrade/building/bodega:annex",
    kind: "upgrade",
    name: "The Annex",
    tags: ["upgrade:building", "progression:space"],
    description:
      "Absorbs the unit next door into guild space, opening room for a real back office and a larger roster.",
    target: "building",
    targetId: "building/bodega",
    requirements: [
      {
        type: "resource_min",
        resourceId: "resource/cash",
        minimum: 350,
      },
      {
        type: "resource_min",
        resourceId: "resource/reputation",
        minimum: 25,
      },
      {
        type: "building_tier_min",
        buildingId: "building/bodega",
        minimum: 2,
      },
    ],
    effects: [
      {
        type: "add_room_slot",
        amount: 2,
      },
      {
        type: "grant_operator_slot",
        amount: 2,
      },
      {
        type: "unlock_room_template",
        roomId: "room/back_office:tier_1",
      },
      {
        type: "unlock_room_template",
        roomId: "room/backstock:tier_1",
      },
      {
        type: "modify_resource_income",
        resourceId: "resource/cash",
        amount: 4,
      },
    ],
  },
  {
    id: "upgrade/building/bodega:extension",
    kind: "upgrade",
    name: "Backyard Extension",
    tags: ["upgrade:building", "progression:space"],
    description:
      "Turns the back yard into usable guild space so the bodega can stage work without spilling into the storefront.",
    target: "building",
    targetId: "building/bodega",
    requirements: [
      {
        type: "resource_min",
        resourceId: "resource/cash",
        minimum: 500,
      },
      {
        type: "resource_min",
        resourceId: "resource/reputation",
        minimum: 35,
      },
      {
        type: "building_tier_min",
        buildingId: "building/bodega",
        minimum: 3,
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
      {
        type: "unlock_room_template",
        roomId: "room/alley_staging:tier_1",
      },
      {
        type: "modify_morale",
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
        minimum: 400,
      },
      {
        type: "resource_min",
        resourceId: "resource/reputation",
        minimum: 18,
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
        minimum: 240,
      },
      {
        type: "resource_min",
        resourceId: "resource/reputation",
        minimum: 16,
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
        type: "resource_min",
        resourceId: "resource/reputation",
        minimum: 4,
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
    id: "upgrade/room/dining_area:common_table",
    kind: "upgrade",
    name: "Common Table",
    tags: ["upgrade:room", "room:social"],
    description:
      "Replaces the folding table with a real shared surface. People linger here now instead of eating standing up.",
    target: "room",
    targetId: "room/dining_area:tier_1",
    requirements: [
      {
        type: "resource_min",
        resourceId: "resource/cash",
        minimum: 160,
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
        type: "modify_loyalty",
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
        type: "resource_min",
        resourceId: "resource/reputation",
        minimum: 5,
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
  // ── Porter's building upgrades ─────────────────────────────────────────
  {
    id: "upgrade/building/porters:kitchen_overhaul",
    kind: "upgrade",
    name: "Kitchen Overhaul",
    tags: ["upgrade:building", "progression:quality"],
    description:
      "Rebuilds the kitchen into something a health inspector would survive. Better food means better reputation and steadier income.",
    target: "building",
    targetId: "building/porters",
    requirements: [
      { type: "resource_min", resourceId: "resource/cash", minimum: 400 },
      { type: "resource_min", resourceId: "resource/reputation", minimum: 50 },
    ],
    effects: [
      { type: "modify_resource_income", resourceId: "resource/cash", amount: 10 },
      { type: "modify_morale", amount: 2 },
      { type: "modify_attraction_weight", tag: "role:medic", amount: 1 },
      { type: "modify_attraction_weight", tag: "role:scout", amount: 1 },
      { type: "modify_attraction_weight", tag: "role:field_lead", amount: 1 },
    ],
  },
  {
    id: "upgrade/building/porters:upstairs_conversion",
    kind: "upgrade",
    name: "Upstairs Conversion",
    tags: ["upgrade:building", "progression:space"],
    description:
      "Converts the remaining upstairs apartments into operational rooms. More space for planning and recovery.",
    target: "building",
    targetId: "building/porters",
    requirements: [
      { type: "resource_min", resourceId: "resource/cash", minimum: 600 },
      { type: "resource_min", resourceId: "resource/reputation", minimum: 60 },
      { type: "building_tier_min", buildingId: "building/porters", minimum: 2 },
    ],
    effects: [
      { type: "add_room_slot", amount: 2 },
      { type: "grant_operator_slot", amount: 2 },
      { type: "unlock_room_template", roomId: "room/break_room:tier_1" },
      { type: "unlock_room_template", roomId: "room/briefing_room:tier_1" },
      { type: "modify_resource_income", resourceId: "resource/cash", amount: 6 },
    ],
  },
  {
    id: "upgrade/building/porters:remodel",
    kind: "upgrade",
    name: "The Remodel",
    tags: ["upgrade:building", "progression:quality"],
    description:
      "A proper renovation. New fixtures, better lighting, and the kind of attention that makes people stay longer.",
    target: "building",
    targetId: "building/porters",
    requirements: [
      { type: "resource_min", resourceId: "resource/cash", minimum: 800 },
      { type: "resource_min", resourceId: "resource/reputation", minimum: 75 },
      { type: "building_tier_min", buildingId: "building/porters", minimum: 3 },
    ],
    effects: [
      { type: "modify_resource_income", resourceId: "resource/cash", amount: 8 },
      { type: "modify_morale", amount: 2 },
      { type: "modify_loyalty", amount: 1 },
      { type: "modify_recovery_rate", amount: 1 },
    ],
  },
  {
    id: "upgrade/building/porters:waterfront",
    kind: "upgrade",
    name: "The Waterfront",
    tags: ["upgrade:building", "progression:space"],
    description:
      "Opens the harbor-side expansion. A dock for staging and a deck for downtime, both with water and sky.",
    target: "building",
    targetId: "building/porters",
    requirements: [
      { type: "resource_min", resourceId: "resource/cash", minimum: 1000 },
      { type: "resource_min", resourceId: "resource/reputation", minimum: 90 },
      { type: "building_tier_min", buildingId: "building/porters", minimum: 4 },
    ],
    effects: [
      { type: "add_room_slot", amount: 2 },
      { type: "grant_operator_slot", amount: 4 },
      { type: "unlock_room_template", roomId: "room/dock:tier_1" },
      { type: "unlock_room_template", roomId: "room/deck:tier_1" },
      { type: "modify_morale", amount: 1 },
    ],
  },
] satisfies readonly UpgradeTemplate[];

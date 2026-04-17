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
      "Rips out the old line and puts in something a health inspector would not immediately shut down. The food gets better, the regulars start tipping, and word travels that Porter's is a place worth showing up to.",
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
      "Clears out the last of the old apartment furniture and frames in real operational rooms. The break room gets a door, the briefing room gets a whiteboard, and the guild finally has a floor the public cannot walk onto.",
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
      "Replaces the worst of the bar-and-grill wear with proper fixtures, better lighting, and paint that was not here when the previous owner left. People start staying longer, and the ones who stay start recovering faster.",
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
      "Knocks through the back wall and builds out over the water. A concrete dock for staging departures and a weathered deck for the kind of downtime you cannot get indoors.",
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
  {
    id: "upgrade/building/porters:machine_shop",
    kind: "upgrade",
    name: "Machine Shop",
    tags: ["upgrade:building", "progression:crafting"],
    description:
      "Converts the back storage bay into a proper workshop with a welding bench, parts press, and ventilation. For the first time the guild can fabricate durable gear from site materials instead of buying everything off the rack.",
    target: "building",
    targetId: "building/porters",
    requirements: [
      { type: "resource_min", resourceId: "resource/cash", minimum: 1200 },
      { type: "resource_min", resourceId: "resource/reputation", minimum: 100 },
      { type: "building_tier_min", buildingId: "building/porters", minimum: 5 },
    ],
    effects: [
      { type: "add_room_slot", amount: 1 },
      { type: "unlock_room_template", roomId: "room/workshop:tier_1" },
    ],
  },
  // ── Skyscraper floor expansions ─────────────────────────────────────
  {
    id: "upgrade/building/skyscraper:nightlife_floor",
    kind: "upgrade",
    name: "Nightlife Floor",
    tags: ["upgrade:building", "progression:space", "progression:recruitment"],
    description:
      "Leases the empty floor above the operations deck and fits it out as a full nightlife space. The marquee outside finally has the guild's name on it, and recruitment moves out of Porter's bar into a room prospects show up to because they recognize the brand.",
    target: "building",
    targetId: "building/skyscraper",
    requirements: [
      { type: "resource_min", resourceId: "resource/cash", minimum: 1500 },
      { type: "resource_min", resourceId: "resource/reputation", minimum: 100 },
    ],
    effects: [
      { type: "add_room_slot", amount: 2 },
      { type: "grant_operator_slot", amount: 3 },
      { type: "unlock_room_template", roomId: "room/club:tier_1" },
      { type: "unlock_room_template", roomId: "room/green_room:tier_1" },
      { type: "modify_morale", amount: 1 },
      { type: "modify_attraction_weight", tag: "role:field_lead", amount: 2 },
      { type: "modify_attraction_weight", tag: "role:scout", amount: 2 },
      { type: "modify_attraction_weight", tag: "role:medic", amount: 2 },
    ],
  },
  {
    id: "upgrade/building/skyscraper:specialist_training_floor",
    kind: "upgrade",
    name: "Specialist Training Floor",
    tags: ["upgrade:building", "progression:space", "progression:training"],
    description:
      "Builds out the next floor as role-specific training space. The Drill Floor for field leads, the Recon Course for scouts, the Trauma Bay for medics. The dojo on Recovery is general conditioning; this floor is for operators who already know their job and need to push their ceiling.",
    target: "building",
    targetId: "building/skyscraper",
    requirements: [
      { type: "resource_min", resourceId: "resource/cash", minimum: 2000 },
      { type: "resource_min", resourceId: "resource/reputation", minimum: 130 },
      { type: "building_tier_min", buildingId: "building/skyscraper", minimum: 2 },
    ],
    effects: [
      { type: "add_room_slot", amount: 3 },
      { type: "grant_operator_slot", amount: 4 },
      { type: "unlock_room_template", roomId: "room/drill_floor:tier_1" },
      { type: "unlock_room_template", roomId: "room/recon_course:tier_1" },
      { type: "unlock_room_template", roomId: "room/trauma_bay:tier_1" },
      { type: "modify_training_rate", amount: 2 },
    ],
  },
  {
    id: "upgrade/building/skyscraper:executive_floor",
    kind: "upgrade",
    name: "Executive Floor",
    tags: ["upgrade:building", "progression:space", "progression:institution"],
    description:
      "Fits out the upper floor as the guild's executive suite. {playerName}'s office, a compliance room for regulator-facing paperwork, and a war room for high-end mission planning. The first floor in the tower where the guild looks like an institution from the inside.",
    target: "building",
    targetId: "building/skyscraper",
    requirements: [
      { type: "resource_min", resourceId: "resource/cash", minimum: 2800 },
      { type: "resource_min", resourceId: "resource/reputation", minimum: 170 },
      { type: "building_tier_min", buildingId: "building/skyscraper", minimum: 3 },
    ],
    effects: [
      { type: "add_room_slot", amount: 3 },
      { type: "grant_operator_slot", amount: 3 },
      { type: "unlock_room_template", roomId: "room/executive_office:tier_1" },
      { type: "unlock_room_template", roomId: "room/compliance_office:tier_1" },
      { type: "unlock_room_template", roomId: "room/war_room:tier_1" },
      { type: "modify_loyalty", amount: 2 },
      { type: "modify_resource_income", resourceId: "resource/cash", amount: 18 },
    ],
  },
  {
    id: "upgrade/building/skyscraper:penthouse",
    kind: "upgrade",
    name: "Penthouse",
    tags: ["upgrade:building", "progression:space", "progression:recruitment"],
    description:
      "Closes the tower's expansion arc with the penthouse — the Sky Lounge for A-rank recruitment and the Private Cellar for the conversations that finish in private. Top of the building below the rooftop. Quiet rooms, slow drinks, and the kind of pitch that ends with a signature.",
    target: "building",
    targetId: "building/skyscraper",
    requirements: [
      { type: "resource_min", resourceId: "resource/cash", minimum: 4000 },
      { type: "resource_min", resourceId: "resource/reputation", minimum: 220 },
      { type: "building_tier_min", buildingId: "building/skyscraper", minimum: 4 },
    ],
    effects: [
      { type: "add_room_slot", amount: 2 },
      { type: "grant_operator_slot", amount: 3 },
      { type: "unlock_room_template", roomId: "room/sky_lounge:tier_1" },
      { type: "unlock_room_template", roomId: "room/private_cellar:tier_1" },
      { type: "modify_morale", amount: 2 },
      { type: "modify_attraction_weight", tag: "role:field_lead", amount: 3 },
      { type: "modify_attraction_weight", tag: "role:scout", amount: 3 },
      { type: "modify_attraction_weight", tag: "role:medic", amount: 3 },
    ],
  },
] satisfies readonly UpgradeTemplate[];

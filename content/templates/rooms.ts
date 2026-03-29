import type { RoomTemplate } from "./shared";

export const roomTemplates = [
  {
    id: "room/register:tier_1",
    kind: "room",
    name: "The Register",
    tags: ["room:operations", "staff:reception"],
    description: "The checkout counter where intake, paperwork, and walk-in visitors all collide.",
    tier: 1,
    baseCapacity: 2,
    availableInBuildings: ["building/bodega"],
  },
  {
    id: "room/counter:tier_1",
    kind: "room",
    name: "The Counter",
    tags: ["room:social", "ops:recruitment"],
    description:
      "The deli counter where Boss sells food, talks people up, and recruits whoever lingers.",
    tier: 1,
    baseCapacity: 2,
    availableInBuildings: ["building/bodega"],
  },
  {
    id: "room/dining_area:tier_1",
    kind: "room",
    name: "The Dining Area",
    tags: ["room:recovery", "room:social"],
    description:
      "The shared table where operators eat, decompress, and get patched up when the day goes bad.",
    tier: 1,
    baseCapacity: 3,
    availableInBuildings: ["building/bodega"],
  },
  {
    id: "room/supply_closet:tier_1",
    kind: "room",
    name: "Supply Closet",
    tags: ["room:staffing", "staff:logistics"],
    description:
      "A cramped back-room closet for gear, stock, paperwork overflow, and whatever else fits on the shelf.",
    tier: 1,
    baseCapacity: 2,
    availableInBuildings: ["building/bodega"],
  },
  {
    id: "room/back_office:tier_1",
    kind: "room",
    name: "The Back Office",
    tags: ["room:operations", "ops:intel", "staff:admin"],
    description:
      "A cramped annex office where contract research, permits, payroll, and the paperwork panic finally get a real door.",
    tier: 1,
    baseCapacity: 2,
    availableInBuildings: ["building/bodega"],
  },
  {
    id: "room/backstock:tier_1",
    kind: "room",
    name: "The Backstock",
    tags: ["room:staffing", "staff:logistics"],
    description:
      "The annexed unit's storage space, finally organized into something that is not a literal closet. Heavy inventory and staging work happens here.",
    tier: 1,
    baseCapacity: 2,
    availableInBuildings: ["building/bodega"],
  },
  {
    id: "room/alley_staging:tier_1",
    kind: "room",
    name: "The Alley",
    tags: ["room:operations", "ops:staging"],
    description:
      "The back alley, paved over, half-covered by a corrugated canopy. Enough space to stage a team before they leave through the back.",
    tier: 1,
    baseCapacity: 3,
    availableInBuildings: ["building/bodega"],
  },
  // ── Porter's rooms ───────────────────────────────────────────────────
  {
    id: "room/floor:tier_1",
    kind: "room",
    name: "The Floor",
    tags: ["room:social", "room:recovery"],
    description:
      "The public dining room. Meals, decompression, and the kind of loud conversation that keeps people coming back.",
    tier: 1,
    baseCapacity: 4,
    availableInBuildings: ["building/porters"],
  },
  {
    id: "room/bar:tier_1",
    kind: "room",
    name: "The Bar",
    tags: ["room:social", "ops:recruitment"],
    description:
      "Recruitment happens over drinks now. Prospects come for the atmosphere and stay for the pitch.",
    tier: 1,
    baseCapacity: 3,
    availableInBuildings: ["building/porters"],
  },
  {
    id: "room/office:tier_1",
    kind: "room",
    name: "The Office",
    tags: ["room:operations", "ops:intel", "staff:admin"],
    description:
      "An upstairs room with a real desk, filing cabinets, and a door that closes. Admin, contracts, and intel live here now.",
    tier: 1,
    baseCapacity: 2,
    availableInBuildings: ["building/porters"],
  },
  {
    id: "room/stockroom:tier_1",
    kind: "room",
    name: "The Stockroom",
    tags: ["room:staffing", "staff:logistics"],
    description:
      "Proper shelving, labeled crates, and enough floor space to stage a loadout without tripping over mops.",
    tier: 1,
    baseCapacity: 3,
    availableInBuildings: ["building/porters"],
  },
  {
    id: "room/infirmary:tier_1",
    kind: "room",
    name: "The Infirmary",
    tags: ["room:recovery", "staff:medical"],
    description:
      "The first real recovery room. A cot, a cabinet of supplies, and someone who knows how to use them.",
    tier: 1,
    baseCapacity: 2,
    availableInBuildings: ["building/porters"],
  },
  {
    id: "room/gym:tier_1",
    kind: "room",
    name: "The Gym",
    tags: ["room:training"],
    description:
      "Scrappy but real. A heavy bag, a weight bench, and enough room to swing without hitting a wall.",
    tier: 1,
    baseCapacity: 3,
    availableInBuildings: ["building/porters"],
  },
  {
    id: "room/prep_room:tier_1",
    kind: "room",
    name: "The Prep Room",
    tags: ["room:operations", "ops:staging", "staff:logistics"],
    description:
      "Staging and lightweight consumable prep from monster drops. Not a workshop, but enough to send teams out ready.",
    tier: 1,
    baseCapacity: 2,
    availableInBuildings: ["building/porters"],
  },
  {
    id: "room/break_room:tier_1",
    kind: "room",
    name: "The Break Room",
    tags: ["room:social", "room:recovery"],
    description:
      "A private upstairs space away from customers. Somewhere staff and operators can sit without performing.",
    tier: 1,
    baseCapacity: 3,
    availableInBuildings: ["building/porters"],
  },
  {
    id: "room/briefing_room:tier_1",
    kind: "room",
    name: "The Briefing Room",
    tags: ["room:operations", "ops:intel"],
    description:
      "A dedicated planning and review space with a board, a map, and enough chairs for the whole team.",
    tier: 1,
    baseCapacity: 3,
    availableInBuildings: ["building/porters"],
  },
  {
    id: "room/dock:tier_1",
    kind: "room",
    name: "The Dock",
    tags: ["room:operations", "ops:staging"],
    description:
      "Waterfront staging and departure surface. Teams leave from here when the harbor route is faster.",
    tier: 1,
    baseCapacity: 3,
    availableInBuildings: ["building/porters"],
  },
  {
    id: "room/deck:tier_1",
    kind: "room",
    name: "The Deck",
    tags: ["room:social"],
    description:
      "An open waterfront platform with harbor air and industrial skyline. Downtime with a view.",
    tier: 1,
    baseCapacity: 4,
    availableInBuildings: ["building/porters"],
  },
] satisfies readonly RoomTemplate[];

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
] satisfies readonly RoomTemplate[];

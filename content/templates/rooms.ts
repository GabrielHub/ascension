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
      "The deli counter where {playerName} sells food, talks people up, and recruits whoever lingers.",
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
      "Worn hardwood, mismatched chairs, and a ceiling fan that works when it feels like it. The public dining room where operators eat alongside regulars and nobody asks about the bruises.",
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
      "A long oak bar with too many taps and not enough stools. Prospects wander in for the drinks and leave with a business card and a vague sense of obligation.",
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
      "An upstairs room with a real desk, filing cabinets, and a door that actually closes. The first time admin work has had its own space instead of sharing a counter with sandwich orders.",
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
      "Industrial shelving, labeled crates, and enough floor space to lay out a full loadout without knocking anything over. Smells like packing tape and old wood.",
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
      "A cot with actual sheets, a locked supply cabinet, and overhead lighting that does not flicker. The first time someone getting patched up does not have to share the room with lunch.",
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
      "A heavy bag bolted to the ceiling, a weight bench that wobbles on one side, and rubber mats taped to the floor. Scrappy, but the first place operators can actually train between jobs.",
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
      "A back room with a steel table, wall hooks, and bins of salvaged monster parts. Not a workshop — more like a field kitchen where someone who knows what they are doing can turn raw drops into something useful.",
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
      "A converted apartment with a secondhand couch, a coffee maker that runs all day, and no customers. The only room in the building where nobody has to smile at strangers.",
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
      "A whiteboard, a corkboard covered in pinned photos, and a folding table big enough for the whole squad. The room where contracts stop being paperwork and start being plans.",
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
      "Creosote pilings, a concrete apron, and enough clearance to stage a full squad at the water's edge. When the harbor route is faster, teams leave from here instead of hailing a cab.",
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
      "An open platform over the water with salt air, industrial skyline, and the kind of quiet that only happens when the city is behind you. Downtime hits different out here.",
    tier: 1,
    baseCapacity: 4,
    availableInBuildings: ["building/porters"],
  },
] satisfies readonly RoomTemplate[];

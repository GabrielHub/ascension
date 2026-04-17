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
  // ── Porter's workshop ────────────────────────────────────────────────
  {
    id: "room/workshop:tier_1",
    kind: "room",
    name: "The Workshop",
    tags: ["room:operations", "ops:crafting", "staff:logistics"],
    description:
      "A converted machine shop behind the dock with a welding bench, a parts press, and ventilation that mostly works. The first place the guild can turn raw site materials into durable field gear instead of buying everything off the rack.",
    tier: 1,
    baseCapacity: 2,
    availableInBuildings: ["building/porters"],
  },
  // ── Skyscraper rooms ─────────────────────────────────────────────────
  {
    id: "room/lobby:tier_1",
    kind: "room",
    name: "The Lobby",
    tags: ["room:social", "ops:recruitment"],
    description:
      "Polished stone floor, a long reception desk under the {guildName} logo, and a wall of glass that looks out onto midtown. Prospects, clients, and couriers all check in here — the first thing anyone sees when the guild is finally an institution with an address worth printing.",
    tier: 1,
    baseCapacity: 3,
    availableInBuildings: ["building/skyscraper"],
  },
  {
    id: "room/reception:tier_1",
    kind: "room",
    name: "The Front Desk",
    tags: ["room:operations", "staff:reception"],
    description:
      "A pair of workstations behind the lobby counter. Badges printed here, calls routed here, and walk-in paperwork filed here before anybody gets further into the building. The first formal screen between the guild and the street.",
    tier: 1,
    baseCapacity: 2,
    availableInBuildings: ["building/skyscraper"],
  },
  {
    id: "room/bullpen:tier_1",
    kind: "room",
    name: "The Bullpen",
    tags: ["room:operations", "ops:intel", "staff:admin"],
    description:
      "An open operations floor with rolling chairs, a glass conference wall, and a corkboard that takes up half a corridor. Contract research, intel triage, and day-to-day coordination happen in the same room instead of being split across a kitchen office and a folding table.",
    tier: 1,
    baseCapacity: 4,
    availableInBuildings: ["building/skyscraper"],
  },
  {
    id: "room/situation_room:tier_1",
    kind: "room",
    name: "The Situation Room",
    tags: ["room:operations", "ops:intel"],
    description:
      "A glass-walled briefing space off the bullpen, with a projector, a city map, and enough chairs for a full squad plus leadership. Where secured contracts become real plans instead of improvised conversations over the bar.",
    tier: 1,
    baseCapacity: 4,
    availableInBuildings: ["building/skyscraper"],
  },
  {
    id: "room/clinic:tier_1",
    kind: "room",
    name: "The Clinic",
    tags: ["room:recovery", "staff:medical"],
    description:
      "A proper recovery suite on a quiet floor — exam bays behind curtains, a small trauma station, and locked cabinets stocked with more than the infirmary ever had. The first time guild medical feels like a clinic instead of a back-room cot.",
    tier: 1,
    baseCapacity: 4,
    availableInBuildings: ["building/skyscraper"],
  },
  {
    id: "room/dojo:tier_1",
    kind: "room",
    name: "The Dojo",
    tags: ["room:training"],
    description:
      "A full training floor with proper mats, weighted equipment, and enough clear space to run drills instead of just lifting. Taller ceilings, real coaching, and a locker wall. The gym Porter's never had room to be.",
    tier: 1,
    baseCapacity: 4,
    availableInBuildings: ["building/skyscraper"],
  },
  {
    id: "room/crew_lounge:tier_1",
    kind: "room",
    name: "The Crew Lounge",
    tags: ["room:social", "room:recovery"],
    description:
      "A crew lounge on the recovery floor — upholstered couches, dim lighting, and a window wall looking over the skyline. No customers, no public floor. Just somewhere operators can sit and breathe between shifts.",
    tier: 1,
    baseCapacity: 3,
    availableInBuildings: ["building/skyscraper"],
  },
  {
    id: "room/supply_hall:tier_1",
    kind: "room",
    name: "The Supply Hall",
    tags: ["room:staffing", "staff:logistics", "ops:staging"],
    description:
      "A logistics floor built around racks, a weighing station, and a secure cage for contract-sensitive gear. Loadouts get assembled here instead of dragged out of a stockroom, and teams can stage a departure without tripping over the bar.",
    tier: 1,
    baseCapacity: 3,
    availableInBuildings: ["building/skyscraper"],
  },
  {
    id: "room/fabrication_bay:tier_1",
    kind: "room",
    name: "The Fabrication Bay",
    tags: ["room:operations", "ops:crafting", "staff:logistics"],
    description:
      "A sealed workshop off the supply hall — lathe, press, reinforced bench, and proper ventilation piped up through the shaft. The workshop Porter's machine shop grew into, without the dock stink or the salt corrosion.",
    tier: 1,
    baseCapacity: 2,
    availableInBuildings: ["building/skyscraper"],
  },
  {
    id: "room/rooftop_helipad:tier_1",
    kind: "room",
    name: "The Helipad",
    tags: ["room:operations", "ops:staging"],
    description:
      "A rooftop pad with painted guide lines, hangar doors for the fast deployment case, and a windsock that actually tells you something. Teams cutting across the city can stage and launch from here instead of fighting traffic to a dock.",
    tier: 1,
    baseCapacity: 3,
    availableInBuildings: ["building/skyscraper"],
  },
  {
    id: "room/sky_garden:tier_1",
    kind: "room",
    name: "The Sky Garden",
    tags: ["room:social"],
    description:
      "A rooftop terrace ringed by planters and low walls, with a view that stretches across the skyline. Quiet, open, and the only place in the tower where the city feels like an audience instead of a workload. Downtime lands differently up here.",
    tier: 1,
    baseCapacity: 4,
    availableInBuildings: ["building/skyscraper"],
  },
  // ── Skyscraper Nightlife floor ───────────────────────────────────────
  {
    id: "room/club:tier_1",
    kind: "room",
    name: "The Club",
    tags: ["room:social", "ops:recruitment"],
    description:
      "A leased nightlife space inside the tower — sprung floor, full-spec sound, a glass mezzanine over the dance floor, and a marquee outside that finally has the guild's name on it. Recruitment moves out of Porter's bar and into a room where the prospects came because they recognize the brand.",
    tier: 1,
    baseCapacity: 5,
    availableInBuildings: ["building/skyscraper"],
  },
  {
    id: "room/green_room:tier_1",
    kind: "room",
    name: "The Green Room",
    tags: ["room:social", "room:recovery"],
    description:
      "Backstage decompression off the club — couches, a private bar, lockers, and a door the public never sees. The operators who work the floor for a shift come back here to come down before the city gets them again.",
    tier: 1,
    baseCapacity: 3,
    availableInBuildings: ["building/skyscraper"],
  },
  // ── Skyscraper Specialist Training floor ─────────────────────────────
  {
    id: "room/drill_floor:tier_1",
    kind: "room",
    name: "The Drill Floor",
    tags: ["room:training", "role:field_lead"],
    description:
      "An open-bay training floor configured for field-lead drills — squad movement lanes, comms benches, and a scenario board that gets rewritten between sessions. The dojo teaches conditioning; this room teaches command under load.",
    tier: 1,
    baseCapacity: 4,
    availableInBuildings: ["building/skyscraper"],
  },
  {
    id: "room/recon_course:tier_1",
    kind: "room",
    name: "The Recon Course",
    tags: ["room:training", "role:scout"],
    description:
      "A built-out scout course — sightline rigs, climb walls, low-light corridors, and a movement maze that gets rebuilt every few weeks. The kind of training a generalist gym cannot host, for the operators who already know how to read a room before walking into it.",
    tier: 1,
    baseCapacity: 3,
    availableInBuildings: ["building/skyscraper"],
  },
  {
    id: "room/trauma_bay:tier_1",
    kind: "room",
    name: "The Trauma Bay",
    tags: ["room:training", "staff:medical", "role:medic"],
    description:
      "A simulation suite with a real surgical light, training mannequins, and a wall of timed scenarios. Medics come here to run trauma calls under pressure instead of learning them in the field. The clinic patches operators; this room sharpens the people who do the patching.",
    tier: 1,
    baseCapacity: 3,
    availableInBuildings: ["building/skyscraper"],
  },
  // ── Skyscraper Executive floor ───────────────────────────────────────
  {
    id: "room/executive_office:tier_1",
    kind: "room",
    name: "The Executive Office",
    tags: ["room:operations", "staff:admin", "ops:intel"],
    description:
      "{playerName}'s office on the executive floor — a corner suite with a wide desk, a meeting table for four, and a glass door with the {guildName} mark on it. Faction reps come here. So do regulators. The first room in the tower where the player's name is on the door.",
    tier: 1,
    baseCapacity: 2,
    availableInBuildings: ["building/skyscraper"],
  },
  {
    id: "room/compliance_office:tier_1",
    kind: "room",
    name: "The Compliance Office",
    tags: ["room:operations", "staff:admin"],
    description:
      "A side office on the executive floor stacked with filing cabinets, a secure terminal, and a calendar full of audit windows. Where the guild keeps its paperwork in a state that can survive a regulator showing up unannounced.",
    tier: 1,
    baseCapacity: 2,
    availableInBuildings: ["building/skyscraper"],
  },
  {
    id: "room/war_room:tier_1",
    kind: "room",
    name: "The War Room",
    tags: ["room:operations", "ops:intel"],
    description:
      "A sealed planning suite with a wall-sized city display, a long table, and hardline comms gear. The situation room handles day-to-day raids; this room is where the high-end contracts get planned with the door closed.",
    tier: 1,
    baseCapacity: 4,
    availableInBuildings: ["building/skyscraper"],
  },
  // ── Skyscraper Penthouse floor ───────────────────────────────────────
  {
    id: "room/sky_lounge:tier_1",
    kind: "room",
    name: "The Sky Lounge",
    tags: ["room:social", "ops:recruitment"],
    description:
      "An exclusive top-floor lounge — low lighting, deep chairs, a long bar, and a window wall that opens onto the skyline. The recruitment room for prospects who would never set foot in a club. Quiet conversations, slow drinks, and the kind of pitch that ends with a signature.",
    tier: 1,
    baseCapacity: 3,
    availableInBuildings: ["building/skyscraper"],
  },
  {
    id: "room/private_cellar:tier_1",
    kind: "room",
    name: "The Private Cellar",
    tags: ["room:social", "ops:recruitment"],
    description:
      "A small room off the Sky Lounge — a single round table, racked bottles along one wall, and a door that closes properly. Where a Sky Lounge conversation moves once both sides have decided they want to finish it in private.",
    tier: 1,
    baseCapacity: 2,
    availableInBuildings: ["building/skyscraper"],
  },
] satisfies readonly RoomTemplate[];

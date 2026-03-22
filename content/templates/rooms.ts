import type { RoomTemplate } from "./shared";

export const roomTemplates = [
  {
    id: "room/front_desk:tier_1",
    kind: "room",
    name: "Front Desk",
    tags: ["room:operations", "staff:reception"],
    description: "Entry, intake, and first-pass contract handling.",
    tier: 1,
    baseCapacity: 2,
    availableInBuildings: ["building/bodega", "building/union_hall"],
  },
  {
    id: "room/recruitment_space:tier_1",
    kind: "room",
    name: "Recruitment Space",
    tags: ["room:staffing", "staff:admin"],
    description: "A small room for interviews, onboarding, and roster growth.",
    tier: 1,
    baseCapacity: 2,
    availableInBuildings: ["building/bodega", "building/union_hall"],
  },
  {
    id: "room/infirmary:tier_1",
    kind: "room",
    name: "Infirmary",
    tags: ["room:recovery", "staff:medical"],
    description: "Recovery space for field injuries and basic stabilization.",
    tier: 1,
    baseCapacity: 3,
    availableInBuildings: ["building/bodega", "building/union_hall"],
  },
] satisfies readonly RoomTemplate[];

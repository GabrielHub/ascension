import type { BuildingTemplate } from "./shared";

export const buildingTemplates = [
  {
    id: "building/bodega",
    kind: "building",
    name: "The Bodega",
    tags: ["phase:preproduction", "site:street", "tier:starter"],
    description:
      "A real neighborhood bodega running street food out front and guild business in back.",
    baseTier: 1,
    baseRoomSlots: 4,
    baseOperatorSlots: 7,
    upgradeIds: [
      "upgrade/building/bodega:frontage",
      "upgrade/building/bodega:annex",
      "upgrade/building/bodega:extension",
    ],
    contractRankCeiling: "f",
    baseIncome: 20,
  },
  {
    id: "building/porters",
    kind: "building",
    name: "Porter's",
    tags: ["phase:porter", "site:waterfront", "tier:second"],
    description:
      "A waterfront bar and grill on the Red Hook cobblestones. Neon sign out front, harbor air through the back windows, and a second floor the guild converted from old apartments into real operational space.",
    baseTier: 1,
    baseRoomSlots: 7,
    baseOperatorSlots: 12,
    upgradeIds: [
      "upgrade/building/porters:kitchen_overhaul",
      "upgrade/building/porters:upstairs_conversion",
      "upgrade/building/porters:remodel",
      "upgrade/building/porters:waterfront",
      "upgrade/building/porters:machine_shop",
    ],
    contractRankCeiling: "d",
    baseIncome: 35,
    recruitmentQualityBonus: 1,
  },
  {
    id: "building/skyscraper",
    kind: "building",
    name: "Ascension Tower",
    tags: ["phase:skyscraper", "site:midtown", "tier:final"],
    description:
      "A midtown office tower the guild finally put its name on. Mirrored glass out front, an institutional lobby, an operations floor behind a keycard door, and dedicated floors for recovery, training, and logistics stacked above. No more sharing space with a deli or a bar — this is the guild's permanent address.",
    baseTier: 1,
    baseRoomSlots: 11,
    baseOperatorSlots: 18,
    upgradeIds: [
      "upgrade/building/skyscraper:nightlife_floor",
      "upgrade/building/skyscraper:specialist_training_floor",
      "upgrade/building/skyscraper:executive_floor",
      "upgrade/building/skyscraper:penthouse",
    ],
    contractRankCeiling: "c",
    baseIncome: 60,
    recruitmentQualityBonus: 2,
  },
] satisfies readonly BuildingTemplate[];

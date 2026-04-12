import { removeEntity } from "bitecs";

import { getRosterFlowConfig } from "lib/policies";
import { selectPromotedRecruitIdentity } from "save/appearance";
import { BuildingAuthority, VisitorState } from "../components";
import {
  formatIdentityRuntimeText,
  getActiveBuildingTemplate,
  getActiveVisitorEntities,
  getCurrentAbsoluteMinute,
  getRecruitmentRoomCapacity,
  hasOperationalRecruitmentRoom,
  pushRuntimeEvent,
  removeTrackedEntity,
  spawnVisitorEntity,
} from "./commands";
import type { SimSystem } from "./types";

const VISITOR_NAMES = [
  // ── Original pool ────────────────────────────────────────────────────
  "Ari Sol",
  "Bex Mercer",
  "Corin Vale",
  "Dima Rook",
  "Esme Calder",
  "Faye Okoro",
  "Gideon Tran",
  "Hana Reeves",
  "Iker Nunes",
  "Jules Avery",
  "Kael Morrow",
  "Lina Shao",
  "Maddox Farr",
  "Nina Voss",
  "Orla Keane",
  "Penn Delacroix",
  "Quinn Becerra",
  "Renzo Malik",
  "Sage Okonkwo",
  "Tova Lindgren",
  "Kai Brennan",
  "Suki Okafor",
  "Dion Marchetti",
  "Yara Petrov",
  "Noel Baptiste",
  "Maeve Aziz",
  "Felix Ramos",
  "Lila Nakamura",
  "Tariq Byrne",
  "Zoe Asante",
  "Heath Sandoval",
  "Priya Novak",
  // ── Extended pool ────────────────────────────────────────────────────
  "Dex Alarcon",
  "Sasha Volkov",
  "Mateo Curiel",
  "Iris Yeboah",
  "Rhys Catalan",
  "Nia Baptiste",
  "Omar Khoury",
  "Juno Ferrara",
  "Leona Chu",
  "Desmond Okeke",
  "Camille Soto",
  "Tobias Wren",
  "Mira Joshi",
  "Elio Vance",
  "Ruth Delgado",
  "Anders Lam",
  "Dara Muñoz",
  "Callum Ige",
  "Petra Vogt",
  "Solomon Grey",
  "Xiomara Ruiz",
  "Bodhi Cheng",
  "Naomi Reiter",
  "Ezra Kimathi",
  "Valencia Moss",
  "Ren Akiyama",
  "Isla Guerrero",
  "Malik Strand",
  "Celeste Dao",
  "Harlan Bey",
  "Veda Fontaine",
  "Idris Macon",
  "Tessa Obi",
  "Ronan Tse",
  "Adira Pham",
  "Caspian Falk",
  "Yusuf Mbeki",
  "Brynn Salazar",
  "Kira Antonov",
  "Marcel Diop",
  "Thea Lindqvist",
  "Dominic Cao",
  "Sabine Echevarria",
  "Lennox Pierre",
  "Amara Duval",
  "Rafael Miura",
  "Wren Garza",
  "Sienna Kowalski",
  "Dante Orozco",
  "Paloma Ndiaye",
  "Jasper Kwan",
  // ── Third pool ──────────────────────────────────────────────────────
  "Zuri Odhiambo",
  "Viggo Lindahl",
  "Amira Kazemi",
  "Kenji Rosario",
  "Bianca Alvarez",
  "Ozan Demir",
  "Freya Johannsen",
  "Cassian Morel",
  "Ingrid Hauksson",
  "Lucian Bautista",
  "Nadia Orlov",
  "Thiago Costa",
  "Winona Clearwater",
  "Aki Fujimoto",
  "Estrella Moreno",
  "Tamsin Hale",
  "Enzo Aquino",
  "Yael Benzaquen",
  "Kato Bridger",
  "Sloane Macready",
  "Ravi Shukla",
  "Cleo Vandenberg",
  "Magnus Thorsen",
  "Jolene Arceneaux",
  "Daisuke Endo",
  "Lev Sokolov",
  "Gianna Rizzo",
  "Obinna Eze",
  "Mei-Lin Tao",
  "August Holm",
  "Soleil Beaumont",
  "Kian Patel",
  "Tatiana Novikova",
  "Bram Vos",
  "Nkechi Adeyemi",
  "Lorenzo Duarte",
  "Saskia Meier",
  "Farid Hosseini",
  "Emeka Nwosu",
  "Catalina Vieira",
] as const;

const VISITOR_ROLE_CYCLE = ["role:field_lead", "role:scout", "role:medic"] as const;
const BASE_VISITOR_SPAWN_INTERVAL_MINUTES = 300;
const BASE_VISITOR_PATIENCE_MINUTES = 360;

function describeArrivalPolicy(
  context: Parameters<SimSystem>[0],
  rosterFlow: "selective_intake" | "open_doors" | "retention_focus",
): string {
  switch (rosterFlow) {
    case "selective_intake":
      return "Selective Intake slows walk-ins, but better prospects do not wait long.";
    case "retention_focus":
      return formatIdentityRuntimeText(
        context,
        "Retention Focus slows walk-ins while {guildName} spends more effort keeping current operators.",
      );
    default:
      return "Open Doors keeps the visitor queue moving at a steady pace.";
  }
}

function describePatiencePolicy(
  _context: Parameters<SimSystem>[0],
  rosterFlow: "selective_intake" | "open_doors" | "retention_focus",
): string {
  switch (rosterFlow) {
    case "selective_intake":
      return "Selective Intake prospects have less patience for delays.";
    case "retention_focus":
      return "Retention Focus keeps normal patience, but fewer visitors appear.";
    default:
      return "Open Doors keeps patience and visitor flow at the default pace.";
  }
}

export const advanceVisitorPoolSystem: SimSystem = (context, deltaMs) => {
  const buildingEntity = context.singletonEntities.building;
  const rosterFlow = getRosterFlowConfig(BuildingAuthority.policies[buildingEntity]);

  const activeVisitors = getActiveVisitorEntities(context);
  activeVisitors.forEach((entity) => {
    if (deltaMs > 0) {
      VisitorState.patience[entity] -= deltaMs / 60000;
    }

    if (VisitorState.patience[entity] <= 0) {
      const name = VisitorState.name[entity] ?? "A visitor";
      removeEntity(context.world, entity);
      removeTrackedEntity(context.runtimeState.visitorEntities, entity);
      context.runtimeState.pendingCueIds.push("hq.dismiss");
      pushRuntimeEvent(context, {
        kind: "staffing_change",
        message: `${name} left — no one made an offer. ${describePatiencePolicy(
          context,
          BuildingAuthority.policies[buildingEntity]?.rosterFlow ?? "open_doors",
        )}`,
        accent: "silver",
      });
    }
  });

  if (deltaMs <= 0 || !hasOperationalRecruitmentRoom(context)) {
    return;
  }

  const maxVisitors = Math.max(1, getRecruitmentRoomCapacity(context));
  if (activeVisitors.length >= maxVisitors) {
    return;
  }

  const currentMinute = getCurrentAbsoluteMinute(context);
  const lastSpawnTick = BuildingAuthority.lastVisitorSpawnTick[buildingEntity] ?? 0;
  const spawnIntervalMinutes = Math.max(
    120,
    Math.round(BASE_VISITOR_SPAWN_INTERVAL_MINUTES * rosterFlow.visitorSpawnIntervalMultiplier),
  );
  if (currentMinute - lastSpawnTick < spawnIntervalMinutes) {
    return;
  }

  const sequence = context.runtimeState.nextVisitorSequence;
  const desiredRoleTag = VISITOR_ROLE_CYCLE[(sequence - 1) % VISITOR_ROLE_CYCLE.length];
  const attractionBonus =
    BuildingAuthority.attractionWeightByTag[buildingEntity]?.[desiredRoleTag] ?? 0;
  const buildingQualityBonus = getActiveBuildingTemplate(context).recruitmentQualityBonus ?? 0;

  // Try the promoted recruit pool first for deliberate identity coverage.
  // Falls back to the deterministic name pool when no promoted identity matches.
  const stableKey = `visitor/${sequence}`;
  const promotedIdentity = selectPromotedRecruitIdentity(stableKey, desiredRoleTag);
  const visitorName =
    promotedIdentity?.name ?? VISITOR_NAMES[(sequence - 1) % VISITOR_NAMES.length];

  spawnVisitorEntity(context, {
    name: visitorName,
    desiredRoleTag,
    specialtyTag: promotedIdentity?.specialtyTag,
    patience: Math.max(
      180,
      Math.round(BASE_VISITOR_PATIENCE_MINUTES * rosterFlow.visitorPatienceMultiplier),
    ),
    quality:
      50 + rosterFlow.visitorBaseQualityBonus + attractionBonus * 6 + buildingQualityBonus * 5,
    expectedLoyalty: 45 + attractionBonus * 4 + buildingQualityBonus * 3,
    presetId: promotedIdentity?.recipeId,
  });

  BuildingAuthority.lastVisitorSpawnTick[buildingEntity] = currentMinute;
  context.runtimeState.pendingCueIds.push("hq.visitor");
  pushRuntimeEvent(context, {
    kind: "staffing_change",
    message: `${visitorName} arrived looking for work. ${describeArrivalPolicy(
      context,
      BuildingAuthority.policies[buildingEntity]?.rosterFlow ?? "open_doors",
    )}`,
    accent: "silver",
  });
};

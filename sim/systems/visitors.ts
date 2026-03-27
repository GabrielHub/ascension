import { removeEntity } from "bitecs";

import { getRosterFlowConfig } from "lib/policies";
import { BuildingAuthority, VisitorState } from "../components";
import {
  getCurrentAbsoluteMinute,
  getRecruitmentRoomCapacity,
  hasOperationalRecruitmentRoom,
  pushRuntimeEvent,
  removeTrackedEntity,
  spawnVisitorEntity,
} from "./commands";
import type { SimSystem } from "./types";

const VISITOR_NAMES = [
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
] as const;

const VISITOR_ROLE_CYCLE = ["role:field_lead", "role:scout", "role:medic"] as const;
const BASE_VISITOR_SPAWN_INTERVAL_MINUTES = 300;
const BASE_VISITOR_PATIENCE_MINUTES = 360;

function describeArrivalPolicy(
  rosterFlow: "selective_intake" | "open_doors" | "retention_focus",
): string {
  switch (rosterFlow) {
    case "selective_intake":
      return "Selective Intake slows walk-ins, but better prospects do not wait long.";
    case "retention_focus":
      return "Retention Focus slows walk-ins while the guild spends more effort keeping current operators.";
    default:
      return "Open Doors keeps the visitor queue moving at a steady pace.";
  }
}

function describePatiencePolicy(
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

  context.runtimeState.visitorEntities.slice().forEach((entity) => {
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
        message: `${name} left — no one made an offer. ${describePatiencePolicy(BuildingAuthority.policies[buildingEntity]?.rosterFlow ?? "open_doors")}`,
        accent: "silver",
      });
    }
  });

  if (deltaMs <= 0 || !hasOperationalRecruitmentRoom(context)) {
    return;
  }

  const maxVisitors = Math.max(1, getRecruitmentRoomCapacity(context));
  if (context.runtimeState.visitorEntities.length >= maxVisitors) {
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

  spawnVisitorEntity(context, {
    name: VISITOR_NAMES[(sequence - 1) % VISITOR_NAMES.length],
    desiredRoleTag,
    patience: Math.max(
      180,
      Math.round(BASE_VISITOR_PATIENCE_MINUTES * rosterFlow.visitorPatienceMultiplier),
    ),
    quality: 50 + rosterFlow.visitorBaseQualityBonus + attractionBonus * 6,
    expectedLoyalty: 45 + attractionBonus * 4,
  });

  BuildingAuthority.lastVisitorSpawnTick[buildingEntity] = currentMinute;
  context.runtimeState.pendingCueIds.push("hq.visitor");
  pushRuntimeEvent(context, {
    kind: "staffing_change",
    message: `${VISITOR_NAMES[(sequence - 1) % VISITOR_NAMES.length]} arrived looking for work. ${describeArrivalPolicy(BuildingAuthority.policies[buildingEntity]?.rosterFlow ?? "open_doors")}`,
    accent: "silver",
  });
};

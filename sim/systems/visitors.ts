import { removeEntity } from "bitecs";

import { BuildingAuthority, VisitorState } from "../components";
import {
  getCurrentAbsoluteMinute,
  hasOperationalRecruitmentRoom,
  removeTrackedEntity,
  spawnVisitorEntity,
} from "./commands";
import type { SimSystem } from "./types";

const VISITOR_NAMES = ["Ari Sol", "Bex Mercer", "Corin Vale", "Dima Rook", "Esme Calder"] as const;

const VISITOR_ROLE_CYCLE = [
  "role:recruitment",
  "role:medic",
  "role:scout",
  "role:reception",
] as const;

export const advanceVisitorPoolSystem: SimSystem = (context, deltaMs) => {
  const buildingEntity = context.singletonEntities.building;

  context.runtimeState.visitorEntities.slice().forEach((entity) => {
    if (deltaMs > 0) {
      VisitorState.patience[entity] -= Math.max(1, Math.floor(deltaMs / 60000));
    }

    if (VisitorState.patience[entity] <= 0) {
      removeEntity(context.world, entity);
      removeTrackedEntity(context.runtimeState.visitorEntities, entity);
    }
  });

  if (deltaMs <= 0 || !hasOperationalRecruitmentRoom(context)) {
    return;
  }

  if (context.runtimeState.visitorEntities.length >= 3) {
    return;
  }

  const currentMinute = getCurrentAbsoluteMinute(context);
  const lastSpawnTick = BuildingAuthority.lastVisitorSpawnTick[buildingEntity] ?? 0;
  if (currentMinute - lastSpawnTick < 180) {
    return;
  }

  const sequence = context.runtimeState.nextVisitorSequence;
  const desiredRoleTag = VISITOR_ROLE_CYCLE[(sequence - 1) % VISITOR_ROLE_CYCLE.length];
  const attractionBonus =
    BuildingAuthority.attractionWeightByTag[buildingEntity]?.[desiredRoleTag] ?? 0;

  spawnVisitorEntity(context, {
    name: VISITOR_NAMES[(sequence - 1) % VISITOR_NAMES.length],
    desiredRoleTag,
    patience: 24,
    quality: 50 + attractionBonus * 6,
    expectedLoyalty: 45 + attractionBonus * 4,
  });

  BuildingAuthority.lastVisitorSpawnTick[buildingEntity] = currentMinute;
};

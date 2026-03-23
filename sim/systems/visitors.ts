import { removeEntity } from "bitecs";

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

export const advanceVisitorPoolSystem: SimSystem = (context, deltaMs) => {
  const buildingEntity = context.singletonEntities.building;

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
        message: `${name} left — no one made an offer`,
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
    patience: 120,
    quality: 50 + attractionBonus * 6,
    expectedLoyalty: 45 + attractionBonus * 4,
  });

  BuildingAuthority.lastVisitorSpawnTick[buildingEntity] = currentMinute;
  context.runtimeState.pendingCueIds.push("hq.visitor");
  pushRuntimeEvent(context, {
    kind: "staffing_change",
    message: `${VISITOR_NAMES[(sequence - 1) % VISITOR_NAMES.length]} arrived looking for work`,
    accent: "silver",
  });
};

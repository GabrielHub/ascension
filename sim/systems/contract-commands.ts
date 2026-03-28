import { BuildingAuthority } from "../components";
import type { SimSystemContext } from "./types";
import { bidOnContract, advanceContractPhase } from "./raids";
import { advanceGuidanceSystem } from "./guidance-system";

export function applyContractCommand(
  context: SimSystemContext,
  type: string,
  payload: Record<string, unknown>,
): boolean {
  switch (type) {
    case "sim/bid-contract": {
      const postingId = typeof payload.postingId === "string" ? payload.postingId : "";
      const secured = bidOnContract(context, postingId);
      if (secured) {
        advanceGuidanceSystem(context, 0);
      }
      return secured;
    }
    case "sim/advance-contract": {
      advanceContractPhase(context);
      return true;
    }
    case "sim/dev-force-contract-end": {
      const buildingEntity = context.singletonEntities.building;
      const contractSite = BuildingAuthority.contractSite[buildingEntity];
      if (!contractSite) return false;
      const outcome = payload.outcome === "boss_defeated" ? "boss_defeated" : "contract_lost";
      BuildingAuthority.contractSite[buildingEntity] =
        outcome === "boss_defeated"
          ? { ...contractSite, bossDefeated: true }
          : { ...contractSite, contractLost: true };
      return true;
    }
    default:
      return false;
  }
}

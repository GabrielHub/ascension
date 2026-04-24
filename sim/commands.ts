import type { PolicyId, PolicyValue } from "lib/policies";

export const STABLE_SIM_COMMAND_TYPES = [
  "sim/tick",
  "sim/place-room",
  "sim/set-active-floor",
  "sim/set-policy",
  "sim/set-loot-filter",
  "sim/purchase-building-upgrade",
  "sim/purchase-room-upgrade",
  "sim/accept-recruit",
  "sim/defer-recruit",
  "sim/reject-recruit",
  "sim/replace-recruit",
  "sim/dismiss-recruit",
  "sim/buy-item",
  "sim/sell-item",
  "sim/equip-item",
  "sim/auto-assign-accessory",
  "sim/unequip-item",
  "sim/encounter-start",
  "sim/encounter-pause",
  "sim/encounter-resume",
  "sim/encounter-step",
  "sim/encounter-retreat",
  "sim/encounter-use-intervention",
  "sim/interruption-resolve",
  "sim/interruption-dismiss",
  "sim/incident-resolve",
  "sim/incident-materialize",
  "sim/bid-contract",
  "sim/advance-contract",
  "sim/guidance-complete",
  "sim/guidance-dismiss",
  "sim/guidance-record-anchor-failure",
  "sim/guidance-reset-opening",
  "sim/initiate-relocation",
  "sim/prep-consumable",
  "sim/craft-durable",
] as const;

export type StableSimCommandType = (typeof STABLE_SIM_COMMAND_TYPES)[number];

export type SimCommand =
  | {
      type: "sim/tick";
      deltaMs: number;
    }
  | {
      type: "sim/place-room";
      templateId: string;
      slotId?: string;
      floorIndex?: number;
      footprint?: {
        col?: number;
        row?: number;
        cols?: number;
        rows?: number;
      };
    }
  | {
      type: "sim/set-active-floor";
      floorIndex: number;
    }
  | {
      type: "sim/set-policy";
      policyId: PolicyId;
      value: PolicyValue;
    }
  | {
      type: "sim/set-loot-filter";
      enabled: boolean;
    }
  | {
      type: "sim/purchase-building-upgrade";
      upgradeId: string;
    }
  | {
      type: "sim/purchase-room-upgrade";
      roomId: string;
      upgradeId: string;
    }
  | {
      type: "sim/accept-recruit";
      visitorId: string;
    }
  | {
      type: "sim/defer-recruit";
      visitorId: string;
    }
  | {
      type: "sim/reject-recruit";
      visitorId: string;
    }
  | {
      type: "sim/replace-recruit";
      visitorId: string;
      operatorId: string;
    }
  | {
      type: "sim/dismiss-recruit";
      visitorId: string;
    }
  | {
      type: "sim/visitor-update-identity";
      visitorId: string;
      specialtyTag: string;
      appearance: {
        presetId: string;
        visibleGear?: {
          weaponPartId?: string;
          outfitOverlayPartId?: string;
          accessoryPartId?: string;
        };
      };
      preferences: {
        riskTolerance: number;
        rewardFocus: number;
        recoveryBias: number;
        socialBias: number;
        trainingBias: number;
        comfortBias: number;
        preferredMissionTags: string[];
      };
      personaSummary: string;
      personaHooks: string[];
    }
  | {
      type: "sim/buy-item";
      itemId: string;
    }
  | {
      type: "sim/sell-item";
      itemId: string;
      quantity: number;
    }
  | {
      type: "sim/equip-item";
      operatorId: string;
      slot: "weapon" | "outfitOverlay" | "accessory";
      itemId: string;
    }
  | {
      type: "sim/auto-assign-accessory";
      operatorId: string;
    }
  | {
      type: "sim/unequip-item";
      operatorId: string;
      slot: "weapon" | "outfitOverlay" | "accessory";
    }
  | {
      type: "sim/encounter-start";
      activeRaidId: string;
      contractSiteId: string;
      missionId: string;
      teamId: string;
      operatorIds: string[];
      bossId: string;
    }
  | {
      type: "sim/encounter-pause";
    }
  | {
      type: "sim/encounter-resume";
    }
  | {
      type: "sim/encounter-step";
    }
  | {
      type: "sim/encounter-retreat";
    }
  | {
      type: "sim/encounter-dismiss";
    }
  | {
      type: "sim/encounter-use-intervention";
      interventionId: string;
    }
  | {
      type: "sim/interruption-resolve";
      instanceId: string;
      choiceId?: string;
    }
  | {
      type: "sim/interruption-dismiss";
    }
  | {
      type: "sim/incident-resolve";
      choiceId: string;
    }
  | {
      type: "sim/incident-materialize";
      incidentInstanceId: string;
      presentation?: {
        title?: string;
        briefing?: string;
        subjectSummary?: string;
        choices?: Array<{
          choiceId: string;
          label: string;
          description: string;
          consequenceSummary: string;
          resolutionSummary?: string;
        }>;
        copySource?: "authored" | "generated";
      };
    }
  | {
      type: "sim/bid-contract";
      postingId: string;
    }
  | {
      type: "sim/advance-contract";
    }
  | {
      type: "sim/guidance-complete";
      beatId: string;
      signal: string;
    }
  | {
      type: "sim/guidance-dismiss";
      beatId: string;
    }
  | {
      type: "sim/guidance-record-anchor-failure";
      beatId: string;
      anchorId: string;
      fallbackUsed: boolean;
    }
  | {
      type: "sim/guidance-reset-opening";
    }
  | {
      type: "sim/initiate-relocation";
    }
  | {
      type: "sim/prep-consumable";
      recipeId: string;
    }
  | {
      type: "sim/craft-durable";
      recipeId: string;
    }
  | {
      type: "sim/dev-set-resource";
      resourceId: "resource/cash" | "resource/reputation" | "resource/intel";
      amount: number;
    }
  | {
      type: "sim/dev-set-time";
      minuteOfDay: number;
    }
  | {
      type: "sim/dev-set-day";
      day: number;
    }
  | {
      type: "sim/dev-trigger-boss-commitment";
    }
  | {
      type: "sim/dev-trigger-incident";
    }
  | {
      type: "sim/dev-force-contract-end";
      outcome: "mission_complete" | "boss_defeated" | "contract_lost";
    }
  | {
      type: "sim/dev-set-district";
      districtId: string;
      field: "heat" | "standing" | "containment";
      value: number;
    }
  | {
      type: "sim/dev-set-faction";
      factionId: string;
      field: "standing";
      value: number;
    };

export interface SimCommandQueue {
  enqueue(command: SimCommand): void;
  drain(): SimCommand[];
}

export function createSimCommandQueue(): SimCommandQueue {
  const queue: SimCommand[] = [];

  return {
    enqueue(command) {
      queue.push(command);
    },

    drain() {
      return queue.splice(0, queue.length);
    },
  };
}

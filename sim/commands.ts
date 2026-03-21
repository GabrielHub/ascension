export const STABLE_SIM_COMMAND_TYPES = [
  "sim/tick",
  "sim/place-room",
  "sim/set-room-active",
  "sim/purchase-building-upgrade",
  "sim/purchase-room-upgrade",
  "sim/accept-recruit",
  "sim/reject-recruit",
  "sim/hire-staff",
  "sim/assign-staff",
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
      position?: {
        x?: number;
        y?: number;
        width?: number;
        height?: number;
      };
    }
  | {
      type: "sim/set-room-active";
      roomId: string;
      isActive: boolean;
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
      type: "sim/reject-recruit";
      visitorId: string;
    }
  | {
      type: "sim/hire-staff";
      roleTag: string;
    }
  | {
      type: "sim/assign-staff";
      staffId: string;
      roomId?: string;
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

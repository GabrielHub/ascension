export interface BootstrapRoomSeed {
  id: string;
  templateId: string;
  occupancy: number;
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface BootstrapScenario {
  guild: {
    reputation: number;
    treasury: number;
    intel: number;
  };
  time: {
    tick: number;
    day: number;
    minuteOfDay: number;
  };
  building: {
    activeBuildingId: string;
  };
  rooms: readonly BootstrapRoomSeed[];
}

export const bootstrapScenario = {
  guild: {
    reputation: 0,
    treasury: 250,
    intel: 1,
  },
  time: {
    tick: 0,
    day: 1,
    minuteOfDay: 480,
  },
  building: {
    activeBuildingId: "building/bodega",
  },
  rooms: [
    {
      id: "room-instance/front_desk",
      templateId: "room/front_desk:tier_1",
      occupancy: 1,
      position: {
        x: 80,
        y: 72,
        width: 180,
        height: 108,
      },
    },
    {
      id: "room-instance/recruitment_space",
      templateId: "room/recruitment_space:tier_1",
      occupancy: 0,
      position: {
        x: 292,
        y: 72,
        width: 208,
        height: 108,
      },
    },
  ],
} satisfies BootstrapScenario;

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
  operators: readonly {
    id: string;
    identity: {
      name: string;
      roleTag: string;
      specialtyTag: string;
    };
    preferences: {
      riskTolerance: number;
      rewardFocus: number;
      recoveryBias: number;
      socialBias: number;
      trainingBias: number;
      comfortBias: number;
      preferredMissionTags: string[];
      preferredPartnerIds: string[];
    };
    schedule: {
      currentBlock: string;
      workStartMinute: number;
      workEndMinute: number;
    };
    needs: {
      hunger: number;
      fatigue: number;
      stress: number;
    };
    morale: {
      current: number;
      baseline: number;
    };
    loyalty: {
      current: number;
      baseline: number;
    };
    injury: {
      severity: number;
      recoveryHoursRemaining: number;
      treated: boolean;
    };
    assignment: {
      kind: string;
      targetId: string;
    };
    appearance: {
      seed: number;
    };
  }[];
  operatorRelationships: readonly {
    operatorAId: string;
    operatorBId: string;
    trust: number;
    friction: number;
    familiarity: number;
    recentSharedOutcome: number;
    historyTags: string[];
  }[];
  staff: readonly {
    id: string;
    name: string;
    roleTag: string;
    status: string;
    wage: number;
    assignment: {
      kind: string;
      targetId: string;
    };
  }[];
  visitors: readonly {
    id: string;
    name: string;
    desiredRoleTag: string;
    patience: number;
    quality: number;
    expectedLoyalty: number;
  }[];
  raidOpportunities: readonly {
    id: string;
    missionId: string;
    location: string;
    threat: number;
    intel: number;
    reward: number;
    risk: number;
    status: string;
    interestedOperatorIds: string[];
    claimedOperatorIds: string[];
    createdTick: number;
    expiresAtTick: number;
  }[];
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
  operators: [
    {
      id: "operator/rose-vega",
      identity: {
        name: "Rose Vega",
        roleTag: "role:field_lead",
        specialtyTag: "focus:containment",
      },
      preferences: {
        riskTolerance: 74,
        rewardFocus: 66,
        recoveryBias: 34,
        socialBias: 58,
        trainingBias: 72,
        comfortBias: 40,
        preferredMissionTags: ["mission:stability", "objective:hold"],
        preferredPartnerIds: ["operator/milo-hart"],
      },
      schedule: {
        currentBlock: "work",
        workStartMinute: 480,
        workEndMinute: 1080,
      },
      needs: {
        hunger: 12,
        fatigue: 18,
        stress: 16,
      },
      morale: {
        current: 67,
        baseline: 67,
      },
      loyalty: {
        current: 62,
        baseline: 62,
      },
      injury: {
        severity: 0,
        recoveryHoursRemaining: 0,
        treated: false,
      },
      assignment: {
        kind: "idle",
        targetId: "",
      },
      appearance: {
        seed: 3,
      },
    },
    {
      id: "operator/milo-hart",
      identity: {
        name: "Milo Hart",
        roleTag: "role:scout",
        specialtyTag: "focus:extraction",
      },
      preferences: {
        riskTolerance: 61,
        rewardFocus: 71,
        recoveryBias: 42,
        socialBias: 46,
        trainingBias: 54,
        comfortBias: 48,
        preferredMissionTags: ["mission:retrieval", "objective:escort"],
        preferredPartnerIds: ["operator/rose-vega"],
      },
      schedule: {
        currentBlock: "work",
        workStartMinute: 480,
        workEndMinute: 1080,
      },
      needs: {
        hunger: 15,
        fatigue: 22,
        stress: 14,
      },
      morale: {
        current: 63,
        baseline: 63,
      },
      loyalty: {
        current: 58,
        baseline: 58,
      },
      injury: {
        severity: 0,
        recoveryHoursRemaining: 0,
        treated: false,
      },
      assignment: {
        kind: "idle",
        targetId: "",
      },
      appearance: {
        seed: 7,
      },
    },
  ],
  operatorRelationships: [
    {
      operatorAId: "operator/milo-hart",
      operatorBId: "operator/rose-vega",
      trust: 61,
      friction: 16,
      familiarity: 44,
      recentSharedOutcome: 8,
      historyTags: ["history:starting_roster", "bond:field_pair"],
    },
  ],
  staff: [
    {
      id: "staff/aina",
      name: "Aina Solis",
      roleTag: "role:reception",
      status: "assigned",
      wage: 18,
      assignment: {
        kind: "room",
        targetId: "room-instance/front_desk",
      },
    },
  ],
  visitors: [
    {
      id: "visitor/preview-1",
      name: "Nika Voss",
      desiredRoleTag: "role:medic",
      patience: 18,
      quality: 61,
      expectedLoyalty: 53,
    },
  ],
  raidOpportunities: [],
} satisfies BootstrapScenario;

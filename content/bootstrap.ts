import type { RankTone } from "./templates";

export interface BootstrapRoomSeed {
  id: string;
  templateId: string;
  slotId: string;
  floorIndex: number;
  occupancy: number;
  isActive?: boolean;
  reservedFootprint: {
    col: number;
    row: number;
    cols: number;
    rows: number;
  };
  activeFootprint?: {
    col: number;
    row: number;
    cols: number;
    rows: number;
  };
}

interface BootstrapInventoryEntry {
  itemId: string;
  quantity: number;
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
    rankTone: RankTone;
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
    combat: {
      rank: string;
      attunementTag: string;
      traits: string[];
      kit: {
        regularAttackId: string;
        skillId: string;
        ultimateId: string;
        passiveIds: string[];
      };
      baseStats: {
        strength: number;
        speed: number;
        endurance: number;
        resilience: number;
        perception: number;
        intelligence: number;
      };
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
  inventory: readonly BootstrapInventoryEntry[];
}

export const bootstrapScenario = {
  guild: {
    reputation: 0,
    treasury: 500,
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
      id: "room-instance/dining_area",
      templateId: "room/dining_area:tier_1",
      slotId: "slot/dining-area",
      floorIndex: 0,
      occupancy: 0,
      isActive: true,
      reservedFootprint: { col: 1, row: 15, cols: 8, rows: 3 },
    },
    {
      id: "room-instance/register",
      templateId: "room/register:tier_1",
      slotId: "slot/register",
      floorIndex: 0,
      occupancy: 1,
      isActive: true,
      reservedFootprint: { col: 0, row: 10, cols: 4, rows: 3 },
    },
    {
      id: "room-instance/counter",
      templateId: "room/counter:tier_1",
      slotId: "slot/counter",
      floorIndex: 0,
      occupancy: 0,
      isActive: true,
      reservedFootprint: { col: 6, row: 10, cols: 4, rows: 3 },
      activeFootprint: { col: 6, row: 11, cols: 4, rows: 2 },
    },
    {
      id: "room-instance/supply_closet",
      templateId: "room/supply_closet:tier_1",
      slotId: "slot/supply-closet",
      floorIndex: 0,
      occupancy: 0,
      isActive: false,
      reservedFootprint: { col: 0, row: 5, cols: 4, rows: 3 },
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
      rankTone: "grounded",
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
      combat: {
        rank: "f",
        attunementTag: "attunement:kinetic",
        traits: ["trait:steady", "trait:resolute"],
        kit: {
          regularAttackId: "kit/basic-strike",
          skillId: "kit/field-lead-skill",
          ultimateId: "kit/field-lead-ultimate",
          passiveIds: ["kit/field-lead-passive"],
        },
        baseStats: {
          strength: 14,
          speed: 8,
          endurance: 13,
          resilience: 10,
          perception: 7,
          intelligence: 8,
        },
      },
    },
    {
      id: "operator/milo-hart",
      identity: {
        name: "Milo Hart",
        roleTag: "role:scout",
        specialtyTag: "focus:extraction",
      },
      rankTone: "grounded",
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
      combat: {
        rank: "f",
        attunementTag: "attunement:void",
        traits: ["trait:alert", "trait:evasive"],
        kit: {
          regularAttackId: "kit/basic-strike",
          skillId: "kit/scout-skill",
          ultimateId: "kit/scout-ultimate",
          passiveIds: ["kit/scout-passive"],
        },
        baseStats: {
          strength: 7,
          speed: 14,
          endurance: 8,
          resilience: 7,
          perception: 13,
          intelligence: 9,
        },
      },
    },
    {
      id: "operator/jin-tanaka",
      identity: {
        name: "Jin Tanaka",
        roleTag: "role:medic",
        specialtyTag: "focus:containment",
      },
      rankTone: "grounded",
      preferences: {
        riskTolerance: 45,
        rewardFocus: 52,
        recoveryBias: 68,
        socialBias: 55,
        trainingBias: 48,
        comfortBias: 62,
        preferredMissionTags: ["mission:stability", "objective:hold"],
        preferredPartnerIds: ["operator/lena-park"],
      },
      schedule: {
        currentBlock: "work",
        workStartMinute: 480,
        workEndMinute: 1080,
      },
      needs: {
        hunger: 10,
        fatigue: 14,
        stress: 18,
      },
      morale: {
        current: 60,
        baseline: 60,
      },
      loyalty: {
        current: 55,
        baseline: 55,
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
      combat: {
        rank: "f",
        attunementTag: "attunement:vital",
        traits: ["trait:resilient", "trait:composed"],
        kit: {
          regularAttackId: "kit/basic-strike",
          skillId: "kit/medic-skill",
          ultimateId: "kit/medic-ultimate",
          passiveIds: ["kit/medic-passive"],
        },
        baseStats: {
          strength: 6,
          speed: 7,
          endurance: 9,
          resilience: 14,
          perception: 8,
          intelligence: 13,
        },
      },
    },
    {
      id: "operator/vera-santos",
      identity: {
        name: "Vera Santos",
        roleTag: "role:field_lead",
        specialtyTag: "focus:extraction",
      },
      rankTone: "grounded",
      preferences: {
        riskTolerance: 78,
        rewardFocus: 74,
        recoveryBias: 30,
        socialBias: 62,
        trainingBias: 66,
        comfortBias: 36,
        preferredMissionTags: ["mission:retrieval", "objective:escort"],
        preferredPartnerIds: ["operator/ash-okafor"],
      },
      schedule: {
        currentBlock: "work",
        workStartMinute: 480,
        workEndMinute: 1080,
      },
      needs: {
        hunger: 14,
        fatigue: 20,
        stress: 12,
      },
      morale: {
        current: 70,
        baseline: 70,
      },
      loyalty: {
        current: 65,
        baseline: 65,
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
      combat: {
        rank: "f",
        attunementTag: "attunement:kinetic",
        traits: ["trait:aggressive", "trait:steady"],
        kit: {
          regularAttackId: "kit/basic-strike",
          skillId: "kit/field-lead-skill",
          ultimateId: "kit/field-lead-ultimate",
          passiveIds: ["kit/field-lead-passive"],
        },
        baseStats: {
          strength: 15,
          speed: 9,
          endurance: 12,
          resilience: 9,
          perception: 8,
          intelligence: 7,
        },
      },
    },
    {
      id: "operator/ash-okafor",
      identity: {
        name: "Ash Okafor",
        roleTag: "role:scout",
        specialtyTag: "focus:extraction",
      },
      rankTone: "grounded",
      preferences: {
        riskTolerance: 68,
        rewardFocus: 60,
        recoveryBias: 38,
        socialBias: 42,
        trainingBias: 64,
        comfortBias: 44,
        preferredMissionTags: ["mission:retrieval", "objective:escort"],
        preferredPartnerIds: ["operator/vera-santos"],
      },
      schedule: {
        currentBlock: "work",
        workStartMinute: 480,
        workEndMinute: 1080,
      },
      needs: {
        hunger: 16,
        fatigue: 24,
        stress: 10,
      },
      morale: {
        current: 58,
        baseline: 58,
      },
      loyalty: {
        current: 60,
        baseline: 60,
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
      combat: {
        rank: "f",
        attunementTag: "attunement:void",
        traits: ["trait:alert", "trait:tenacious"],
        kit: {
          regularAttackId: "kit/basic-strike",
          skillId: "kit/scout-skill",
          ultimateId: "kit/scout-ultimate",
          passiveIds: ["kit/scout-passive"],
        },
        baseStats: {
          strength: 8,
          speed: 13,
          endurance: 9,
          resilience: 7,
          perception: 14,
          intelligence: 8,
        },
      },
    },
    {
      id: "operator/lena-park",
      identity: {
        name: "Lena Park",
        roleTag: "role:medic",
        specialtyTag: "focus:containment",
      },
      rankTone: "grounded",
      preferences: {
        riskTolerance: 40,
        rewardFocus: 48,
        recoveryBias: 72,
        socialBias: 64,
        trainingBias: 42,
        comfortBias: 58,
        preferredMissionTags: ["mission:stability", "objective:hold"],
        preferredPartnerIds: ["operator/jin-tanaka"],
      },
      schedule: {
        currentBlock: "work",
        workStartMinute: 480,
        workEndMinute: 1080,
      },
      needs: {
        hunger: 8,
        fatigue: 12,
        stress: 20,
      },
      morale: {
        current: 65,
        baseline: 65,
      },
      loyalty: {
        current: 57,
        baseline: 57,
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
      combat: {
        rank: "f",
        attunementTag: "attunement:vital",
        traits: ["trait:resilient", "trait:alert"],
        kit: {
          regularAttackId: "kit/basic-strike",
          skillId: "kit/medic-skill",
          ultimateId: "kit/medic-ultimate",
          passiveIds: ["kit/medic-passive"],
        },
        baseStats: {
          strength: 5,
          speed: 8,
          endurance: 8,
          resilience: 13,
          perception: 9,
          intelligence: 14,
        },
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
    {
      operatorAId: "operator/jin-tanaka",
      operatorBId: "operator/lena-park",
      trust: 52,
      friction: 10,
      familiarity: 38,
      recentSharedOutcome: 4,
      historyTags: ["history:starting_roster", "bond:medic_pair"],
    },
    {
      operatorAId: "operator/vera-santos",
      operatorBId: "operator/ash-okafor",
      trust: 58,
      friction: 14,
      familiarity: 40,
      recentSharedOutcome: 6,
      historyTags: ["history:starting_roster", "bond:field_pair"],
    },
  ],
  staff: [
    {
      id: "staff/aina",
      name: "Aina Solis",
      roleTag: "staff:reception",
      status: "assigned",
      wage: 18,
      assignment: {
        kind: "room",
        targetId: "room-instance/register",
      },
    },
    {
      id: "staff/boris",
      name: "Boris Petrov",
      roleTag: "staff:logistics",
      status: "idle",
      wage: 15,
      assignment: {
        kind: "idle",
        targetId: "",
      },
    },
    {
      id: "staff/carmen",
      name: "Carmen Liu",
      roleTag: "staff:maintenance",
      status: "idle",
      wage: 14,
      assignment: {
        kind: "idle",
        targetId: "",
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
    {
      id: "visitor/preview-2",
      name: "Dax Moreno",
      desiredRoleTag: "role:field_lead",
      patience: 22,
      quality: 58,
      expectedLoyalty: 50,
    },
    {
      id: "visitor/preview-3",
      name: "Quinn Reyes",
      desiredRoleTag: "role:scout",
      patience: 15,
      quality: 55,
      expectedLoyalty: 48,
    },
  ],
  raidOpportunities: [],
  inventory: [
    { itemId: "weapon/pipe-wrench", quantity: 2 },
    { itemId: "weapon/kitchen-knife", quantity: 1 },
    { itemId: "outfit-overlay/padded-jacket", quantity: 2 },
    { itemId: "accessory/comm-earpiece", quantity: 2 },
    { itemId: "accessory/tactical-scarf", quantity: 1 },
    { itemId: "loot/monster-part/fang", quantity: 3 },
  ],
} satisfies BootstrapScenario;

export const previewBootstrapScenario = bootstrapScenario;

const CANONICAL_OPERATOR_IDS = new Set([
  "operator/rose-vega",
  "operator/milo-hart",
  "operator/jin-tanaka",
  "operator/vera-santos",
]);
const CANONICAL_STAFF_IDS = new Set(["staff/aina", "staff/boris"]);
const OPERATOR_POOL_BY_ROLE = {
  "role:field_lead": ["operator/rose-vega", "operator/vera-santos"],
  "role:scout": ["operator/milo-hart", "operator/ash-okafor"],
  "role:medic": ["operator/jin-tanaka", "operator/lena-park"],
} as const;
const VISITOR_ID_BY_SOURCE_ID = {
  "visitor/preview-1": "visitor/nika",
  "visitor/preview-2": "visitor/dax",
  "visitor/preview-3": "visitor/quinn",
} as const satisfies Record<string, string>;

type BootstrapOperator = BootstrapScenario["operators"][number];
type BootstrapRelationship = BootstrapScenario["operatorRelationships"][number];
type BootstrapStaff = BootstrapScenario["staff"][number];
type BootstrapVisitor = BootstrapScenario["visitors"][number];

function createScenarioRng(seed: number): () => number {
  // Keep the opening-scenario generator sequence-stable. Replacing this with
  // sim/uncertainty's SeededRng would silently reshuffle seeded new-game starts.
  let state = seed >>> 0;
  if (state === 0) {
    state = 1;
  }
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x1_0000_0000;
  };
}

function shuffleWithRng<T>(values: readonly T[], next: () => number): T[] {
  const clone = [...values];
  for (let index = clone.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(next() * (index + 1));
    [clone[index], clone[swapIndex]] = [clone[swapIndex], clone[index]];
  }
  return clone;
}

function cloneRoomSeed(room: BootstrapRoomSeed): BootstrapRoomSeed {
  return {
    ...room,
    reservedFootprint: { ...room.reservedFootprint },
    ...(room.activeFootprint ? { activeFootprint: { ...room.activeFootprint } } : {}),
  };
}

function cloneOperator(operator: BootstrapOperator, selectedOperatorIds?: ReadonlySet<string>) {
  const preferredPartnerIds = selectedOperatorIds
    ? operator.preferences.preferredPartnerIds.filter((partnerId) =>
        selectedOperatorIds.has(partnerId),
      )
    : [...operator.preferences.preferredPartnerIds];

  return {
    ...operator,
    identity: { ...operator.identity },
    preferences: {
      ...operator.preferences,
      preferredMissionTags: [...operator.preferences.preferredMissionTags],
      preferredPartnerIds,
    },
    schedule: { ...operator.schedule },
    needs: { ...operator.needs },
    morale: { ...operator.morale },
    loyalty: { ...operator.loyalty },
    injury: { ...operator.injury },
    assignment: { ...operator.assignment },
    combat: {
      ...operator.combat,
      traits: [...operator.combat.traits],
      kit: {
        ...operator.combat.kit,
        passiveIds: [...operator.combat.kit.passiveIds],
      },
      baseStats: { ...operator.combat.baseStats },
    },
  } satisfies BootstrapOperator;
}

function cloneRelationship(relationship: BootstrapRelationship): BootstrapRelationship {
  return {
    ...relationship,
    historyTags: [...relationship.historyTags],
  };
}

function cloneStaff(staff: BootstrapStaff): BootstrapStaff {
  return {
    ...staff,
    assignment: { ...staff.assignment },
  };
}

function cloneVisitor(visitor: BootstrapVisitor): BootstrapVisitor {
  return {
    ...visitor,
    id: VISITOR_ID_BY_SOURCE_ID[visitor.id] ?? visitor.id,
  };
}

function buildCanonicalSeedScenario(): BootstrapScenario {
  const selectedOperatorIds = new Set(CANONICAL_OPERATOR_IDS);
  return {
    guild: {
      ...bootstrapScenario.guild,
      treasury: 400,
    },
    time: {
      ...bootstrapScenario.time,
    },
    building: {
      ...bootstrapScenario.building,
    },
    rooms: bootstrapScenario.rooms.map(cloneRoomSeed),
    operators: bootstrapScenario.operators
      .filter((operator) => CANONICAL_OPERATOR_IDS.has(operator.id))
      .map((operator) => {
        const clone = cloneOperator(operator, selectedOperatorIds);
        if (clone.id === "operator/vera-santos") {
          clone.morale = { current: 70, baseline: 65 };
        }
        return clone;
      }),
    operatorRelationships: bootstrapScenario.operatorRelationships
      .filter(
        (relationship) =>
          relationship.operatorAId === "operator/milo-hart" &&
          relationship.operatorBId === "operator/rose-vega",
      )
      .map(cloneRelationship),
    staff: bootstrapScenario.staff
      .filter((staff) => CANONICAL_STAFF_IDS.has(staff.id))
      .map(cloneStaff),
    visitors: [
      {
        ...cloneVisitor(bootstrapScenario.visitors[0]),
        patience: 540,
      },
    ],
    raidOpportunities: [],
    inventory: [
      { itemId: "weapon/pipe-wrench", quantity: 2 },
      { itemId: "weapon/kitchen-knife", quantity: 1 },
      { itemId: "outfit-overlay/padded-jacket", quantity: 1 },
      { itemId: "accessory/comm-earpiece", quantity: 1 },
    ],
  };
}

export function buildRandomizedNewGameScenario(seed: number): BootstrapScenario {
  if (seed === 1) {
    return buildCanonicalSeedScenario();
  }

  const next = createScenarioRng(seed);
  const operatorsById = new Map(
    bootstrapScenario.operators.map((operator) => [operator.id, operator]),
  );
  const visitorsById = new Map(bootstrapScenario.visitors.map((visitor) => [visitor.id, visitor]));

  const chosenOperators = [
    OPERATOR_POOL_BY_ROLE["role:field_lead"][
      Math.floor(next() * OPERATOR_POOL_BY_ROLE["role:field_lead"].length)
    ],
    OPERATOR_POOL_BY_ROLE["role:scout"][
      Math.floor(next() * OPERATOR_POOL_BY_ROLE["role:scout"].length)
    ],
    OPERATOR_POOL_BY_ROLE["role:medic"][
      Math.floor(next() * OPERATOR_POOL_BY_ROLE["role:medic"].length)
    ],
  ];

  const addFourthOperator = next() < 0.4;
  if (addFourthOperator) {
    const extraPool = shuffleWithRng(
      bootstrapScenario.operators
        .map((operator) => operator.id)
        .filter(
          (operatorId) =>
            !chosenOperators.includes(operatorId) &&
            operatorsById.get(operatorId)?.identity.roleTag !== "role:medic",
        ),
      next,
    );
    if (extraPool[0]) {
      chosenOperators.push(extraPool[0]);
    }
  }

  const selectedOperatorIds = new Set(chosenOperators);
  const operators = chosenOperators
    .map((operatorId) => operatorsById.get(operatorId))
    .filter((operator): operator is BootstrapOperator => operator !== undefined)
    .map((operator) => cloneOperator(operator, selectedOperatorIds));

  const relationships = shuffleWithRng(bootstrapScenario.operatorRelationships, next)
    .filter(
      (relationship) =>
        selectedOperatorIds.has(relationship.operatorAId) &&
        selectedOperatorIds.has(relationship.operatorBId),
    )
    .slice(0, 1)
    .map(cloneRelationship);

  const optionalVisitorPool = shuffleWithRng(["visitor/preview-2", "visitor/preview-3"], next);
  const visitors = [
    {
      ...cloneVisitor(visitorsById.get("visitor/preview-1")!),
      patience: 540,
    },
    ...(next() < 0.45
      ? [
          {
            ...cloneVisitor(visitorsById.get(optionalVisitorPool[0])!),
            patience: 480,
          },
        ]
      : []),
  ];

  const utilityPool = shuffleWithRng(
    [
      { itemId: "outfit-overlay/padded-jacket", quantity: 1 },
      { itemId: "accessory/comm-earpiece", quantity: 1 },
      { itemId: "accessory/tactical-scarf", quantity: 1 },
    ] as const,
    next,
  );
  const inventory = [
    { itemId: "weapon/pipe-wrench", quantity: 2 },
    { itemId: "weapon/kitchen-knife", quantity: 1 },
    utilityPool[0],
    ...(addFourthOperator && next() < 0.35 ? [utilityPool[1]] : []),
  ];

  const treasury = addFourthOperator ? 340 : 320;

  return {
    guild: {
      ...bootstrapScenario.guild,
      treasury,
    },
    time: {
      ...bootstrapScenario.time,
    },
    building: {
      ...bootstrapScenario.building,
    },
    rooms: bootstrapScenario.rooms.map(cloneRoomSeed),
    operators,
    operatorRelationships: relationships,
    staff: bootstrapScenario.staff
      .filter((staff) => CANONICAL_STAFF_IDS.has(staff.id))
      .map(cloneStaff),
    visitors,
    raidOpportunities: [],
    inventory,
  };
}

export const canonicalNewGameScenario = buildRandomizedNewGameScenario(
  1,
) satisfies BootstrapScenario;

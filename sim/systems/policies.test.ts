import { addComponent, addEntity } from "bitecs";
import { describe, expect, it } from "vitest";

import { templateRegistry } from "content/templates";
import {
  DEFAULT_POLICY_STATE,
  getAutonomyThresholdsForPolicies,
  getRecoveryTriageConfig,
} from "lib/policies";
import {
  AssignmentState,
  BuildingAuthority,
  GuildState,
  InjuryState,
  LoyaltyState,
  MoraleState,
  NeedState,
  OperatorDisposition,
  OperatorIdentity,
  PreferenceState,
  RaidOpportunityState,
  RaidParticipationState,
  RoomCulture,
  RoomInstance,
  ScheduleState,
  VisitorState,
  WorldTimeState,
} from "../components";
import { applySimCommand } from "./commands";
import { reconcileAssignmentsSystem, scoreOperatorBlocks } from "./assignment";
import { computeAutonomyFlags } from "./morale";
import { advanceNeedsSystem, computeNeedReadinessFlags } from "./needs";
import { computeOperatorRaidReadiness, getDepartureCheck } from "./raids";
import { createSimTestContext } from "./test-context";
import type { SimSystemContext } from "./types";
import { SeededRng, seedFromKey } from "../uncertainty";
import { advanceVisitorPoolSystem } from "./visitors";

function createPolicyContext(): SimSystemContext {
  return createSimTestContext({
    registry: templateRegistry,
    guild: {
      guildName: "Policy Test Guild",
      playerName: "Boss",
      reputation: 12,
      treasury: 500,
      intel: 8,
    },
    time: {
      tick: 0,
      day: 2,
      minuteOfDay: 600,
    },
    building: {
      activeBuildingTemplateIndex: 0,
      policies: DEFAULT_POLICY_STATE,
      attractionWeightByTag: {
        "role:field_lead": 0,
        "role:scout": 0,
        "role:medic": 0,
      },
    },
  });
}

function addOperator(
  context: SimSystemContext,
  overrides: Partial<{
    id: string;
    name: string;
    roleTag: string;
    riskTolerance: number;
    rewardFocus: number;
    recoveryBias: number;
    socialBias: number;
    trainingBias: number;
    comfortBias: number;
    currentBlock: string;
    workStartMinute: number;
    workEndMinute: number;
    hunger: number;
    fatigue: number;
    stress: number;
    morale: number;
    loyalty: number;
    injurySeverity: number;
    recoveryHoursRemaining: number;
  }> = {},
): number {
  const entity = addEntity(context.world);

  addComponent(context.world, entity, OperatorIdentity);
  addComponent(context.world, entity, PreferenceState);
  addComponent(context.world, entity, ScheduleState);
  addComponent(context.world, entity, NeedState);
  addComponent(context.world, entity, MoraleState);
  addComponent(context.world, entity, LoyaltyState);
  addComponent(context.world, entity, InjuryState);
  addComponent(context.world, entity, AssignmentState);
  addComponent(context.world, entity, RaidParticipationState);

  OperatorIdentity.id[entity] =
    overrides.id ?? `operator/${context.runtimeState.nextOperatorSequence}`;
  OperatorIdentity.name[entity] = overrides.name ?? "Test Operator";
  OperatorIdentity.roleTag[entity] = overrides.roleTag ?? "role:field_lead";
  OperatorIdentity.specialtyTag[entity] = "";
  OperatorIdentity.lifecycleStatus[entity] = "active";
  OperatorIdentity.deathTick[entity] = 0;
  OperatorIdentity.deathRaidSummaryId[entity] = "";
  OperatorIdentity.departureTick[entity] = 0;
  OperatorIdentity.departureReason[entity] = "";

  PreferenceState.riskTolerance[entity] = overrides.riskTolerance ?? 25;
  PreferenceState.rewardFocus[entity] = overrides.rewardFocus ?? 70;
  PreferenceState.recoveryBias[entity] = overrides.recoveryBias ?? 20;
  PreferenceState.socialBias[entity] = overrides.socialBias ?? 20;
  PreferenceState.trainingBias[entity] = overrides.trainingBias ?? 20;
  PreferenceState.comfortBias[entity] = overrides.comfortBias ?? 20;
  PreferenceState.preferredMissionTags[entity] = ["mission:clearance"];
  PreferenceState.preferredPartnerIds[entity] = [];

  ScheduleState.currentBlock[entity] = overrides.currentBlock ?? "work";
  ScheduleState.workStartMinute[entity] = overrides.workStartMinute ?? 480;
  ScheduleState.workEndMinute[entity] = overrides.workEndMinute ?? 1080;

  NeedState.hunger[entity] = overrides.hunger ?? 10;
  NeedState.fatigue[entity] = overrides.fatigue ?? 10;
  NeedState.stress[entity] = overrides.stress ?? 10;

  MoraleState.current[entity] = overrides.morale ?? 60;
  MoraleState.baseline[entity] = overrides.morale ?? 60;
  LoyaltyState.current[entity] = overrides.loyalty ?? 60;
  LoyaltyState.baseline[entity] = overrides.loyalty ?? 60;

  InjuryState.severity[entity] = overrides.injurySeverity ?? 0;
  InjuryState.recoveryHoursRemaining[entity] = overrides.recoveryHoursRemaining ?? 0;
  InjuryState.treated[entity] = 0;

  AssignmentState.kind[entity] = "idle";
  AssignmentState.targetId[entity] = "";
  RaidParticipationState.activeRaidId[entity] = "";
  RaidParticipationState.missionId[entity] = "";
  RaidParticipationState.returnTick[entity] = 0;

  context.runtimeState.operatorEntities.push(entity);
  context.runtimeState.nextOperatorSequence += 1;
  return entity;
}

function addRoom(
  context: SimSystemContext,
  templateId: string,
  id: string,
  isOperational: boolean = true,
): number {
  const templateIndex = context.registry.rooms.findIndex((template) => template.id === templateId);
  if (templateIndex < 0) {
    throw new Error(`Missing room template ${templateId}`);
  }

  const template = context.registry.rooms[templateIndex];
  const entity = addEntity(context.world);
  addComponent(context.world, entity, RoomInstance);

  RoomInstance.id[entity] = id;
  RoomInstance.templateIndex[entity] = templateIndex;
  RoomInstance.tier[entity] = template.tier;
  RoomInstance.floorIndex[entity] = 0;
  RoomInstance.slotId[entity] = `${id}/slot`;
  RoomInstance.roomStateId[entity] = `${id}/state`;
  RoomInstance.capacity[entity] = template.baseCapacity;
  RoomInstance.occupancy[entity] = 0;
  RoomInstance.isOperational[entity] = isOperational ? 1 : 0;
  RoomInstance.appliedUpgradeIds[entity] = [];
  RoomInstance.slotIndex[entity] = context.runtimeState.roomEntities.length;
  RoomInstance.reservedCol[entity] = 0;
  RoomInstance.reservedRow[entity] = 0;
  RoomInstance.reservedCols[entity] = 4;
  RoomInstance.reservedRows[entity] = 3;

  context.runtimeState.roomEntities.push(entity);
  return entity;
}

function addOpportunity(context: SimSystemContext): number {
  const entity = addEntity(context.world);
  addComponent(context.world, entity, RaidOpportunityState);

  RaidOpportunityState.id[entity] = "opportunity/test";
  RaidOpportunityState.missionId[entity] = "mission/clearance";
  RaidOpportunityState.location[entity] = "district/lower-east-side";
  RaidOpportunityState.threat[entity] = 72;
  RaidOpportunityState.intel[entity] = 50;
  RaidOpportunityState.reward[entity] = 125;
  RaidOpportunityState.risk[entity] = 82;
  RaidOpportunityState.status[entity] = "open";
  RaidOpportunityState.interestedOperatorIds[entity] = [];
  RaidOpportunityState.claimedOperatorIds[entity] = [];
  RaidOpportunityState.createdTick[entity] = 2_000;
  RaidOpportunityState.expiresAtTick[entity] = 2_500;

  context.runtimeState.raidOpportunityEntities.push(entity);
  return entity;
}

function addDisposition(
  context: SimSystemContext,
  operatorId: string,
  grievanceLevel: number,
): number {
  const entity = addEntity(context.world);
  addComponent(context.world, entity, OperatorDisposition);

  OperatorDisposition.operatorId[entity] = operatorId;
  OperatorDisposition.sociability[entity] = 50;
  OperatorDisposition.temperament[entity] = 50;
  OperatorDisposition.grievanceLevel[entity] = grievanceLevel;
  OperatorDisposition.satisfactionLevel[entity] = 30;

  context.runtimeState.dispositionEntities.push(entity);
  return entity;
}

function addRoomCulture(
  context: SimSystemContext,
  roomInstanceId: string,
  comfort: number,
): number {
  const entity = addEntity(context.world);
  addComponent(context.world, entity, RoomCulture);

  RoomCulture.roomInstanceId[entity] = roomInstanceId;
  RoomCulture.comfort[entity] = comfort;
  RoomCulture.tension[entity] = 30;
  RoomCulture.camaraderie[entity] = 40;
  RoomCulture.tone[entity] = "steady";

  context.runtimeState.roomCultureEntities.push(entity);
  return entity;
}

function addVisitor(context: SimSystemContext, visitorId: string): number {
  const entity = addEntity(context.world);
  addComponent(context.world, entity, VisitorState);

  VisitorState.id[entity] = visitorId;
  VisitorState.name[entity] = "Walk-In";
  VisitorState.desiredRoleTag[entity] = "role:scout";
  VisitorState.patience[entity] = 120;
  VisitorState.quality[entity] = 50;
  VisitorState.expectedLoyalty[entity] = 45;

  context.runtimeState.visitorEntities.push(entity);
  return entity;
}

describe("management policy systems", () => {
  it("changes raid willingness and refusal thresholds when contract posture changes", () => {
    const context = createPolicyContext();
    const operatorEntity = addOperator(context, {
      morale: 28,
      loyalty: 58,
      riskTolerance: 18,
      rewardFocus: 65,
      fatigue: 12,
      stress: 10,
    });
    const opportunityEntity = addOpportunity(context);

    BuildingAuthority.policies[context.singletonEntities.building] = {
      ...DEFAULT_POLICY_STATE,
      contractPosture: "conservative",
    };
    const conservativeReadiness = computeOperatorRaidReadiness(
      context,
      operatorEntity,
      opportunityEntity,
    );
    const conservativeFlags = computeAutonomyFlags(
      operatorEntity,
      getAutonomyThresholdsForPolicies({
        contractPosture: "conservative",
      }),
    );

    BuildingAuthority.policies[context.singletonEntities.building] = {
      ...DEFAULT_POLICY_STATE,
      contractPosture: "aggressive",
    };
    const aggressiveReadiness = computeOperatorRaidReadiness(
      context,
      operatorEntity,
      opportunityEntity,
    );
    const aggressiveFlags = computeAutonomyFlags(
      operatorEntity,
      getAutonomyThresholdsForPolicies({
        contractPosture: "aggressive",
      }),
    );

    expect(aggressiveReadiness.willingnessScore).toBeGreaterThan(
      conservativeReadiness.willingnessScore,
    );
    expect(conservativeFlags.refusalRisk).toBe(true);
    expect(aggressiveFlags.refusalRisk).toBe(false);
  });

  it("changes recovery thresholds, scheduling, and recovery pace when triage changes", () => {
    const readinessContext = createPolicyContext();
    const readinessOperator = addOperator(readinessContext, {
      injurySeverity: 70,
      fatigue: 75,
    });
    const fieldFirstFlags = computeNeedReadinessFlags(
      readinessOperator,
      getRecoveryTriageConfig({ recoveryTriage: "field_first" }),
    );
    const fullRecoveryFlags = computeNeedReadinessFlags(
      readinessOperator,
      getRecoveryTriageConfig({ recoveryTriage: "full_recovery" }),
    );

    expect(fieldFirstFlags.injuryPreventsRaid).toBe(true);
    expect(fieldFirstFlags.exhaustionPenalty).toBe(false);
    expect(fullRecoveryFlags.injuryPreventsRaid).toBe(false);
    expect(fullRecoveryFlags.exhaustionPenalty).toBe(true);

    const runRecoveryScenario = (recoveryTriage: "field_first" | "full_recovery") => {
      const context = createPolicyContext();
      addRoom(context, "room/dining_area:tier_1", "room-instance/dining");
      const operator = addOperator(context, {
        injurySeverity: 35,
        recoveryHoursRemaining: 2,
        recoveryBias: 35,
        comfortBias: 30,
        currentBlock: "rest",
        fatigue: 22,
        stress: 16,
        morale: 25,
        loyalty: 25,
      });
      BuildingAuthority.policies[context.singletonEntities.building] = {
        ...DEFAULT_POLICY_STATE,
        recoveryTriage,
      };

      const scores = scoreOperatorBlocks(
        context,
        operator,
        WorldTimeState.minuteOfDay[context.singletonEntities.time],
        new Set([OperatorIdentity.id[operator]]),
      );
      reconcileAssignmentsSystem(context, 0);
      const currentBlock = ScheduleState.currentBlock[operator];
      advanceNeedsSystem(context, 3_600_000);

      return {
        currentBlock,
        recoveryScore: scores.recovery,
        recoveryHoursRemaining: InjuryState.recoveryHoursRemaining[operator],
      };
    };

    const fieldFirstResult = runRecoveryScenario("field_first");
    const fullRecoveryResult = runRecoveryScenario("full_recovery");

    expect(fullRecoveryResult.recoveryScore).toBeGreaterThan(fieldFirstResult.recoveryScore);
    expect(fieldFirstResult.currentBlock).not.toBe("recovery");
    expect(fullRecoveryResult.currentBlock).toBe("recovery");
    expect(fullRecoveryResult.recoveryHoursRemaining).toBeLessThan(
      fieldFirstResult.recoveryHoursRemaining,
    );
  });

  it("changes operator block selection when staffing priority changes", () => {
    const getBlockForPriority = (staffingPriority: "operations_focus" | "welfare_priority") => {
      const context = createPolicyContext();
      addRoom(context, "room/dining_area:tier_1", "room-instance/dining");
      const operator = addOperator(context, {
        socialBias: 60,
        fatigue: 10,
        stress: 10,
        morale: 30,
        loyalty: 30,
      });
      BuildingAuthority.policies[context.singletonEntities.building] = {
        ...DEFAULT_POLICY_STATE,
        staffingPriority,
      };

      reconcileAssignmentsSystem(context, 0);
      return ScheduleState.currentBlock[operator];
    };

    expect(getBlockForPriority("operations_focus")).toBe("work");
    expect(getBlockForPriority("welfare_priority")).toBe("social");
  });

  it("changes visitor cadence and visitor quality when roster flow changes", () => {
    const getVisitorMetrics = (
      rosterFlow: "open_doors" | "selective_intake",
      minuteOfDay: number,
    ) => {
      const context = createPolicyContext();
      addRoom(context, "room/counter:tier_1", "room-instance/counter");
      BuildingAuthority.policies[context.singletonEntities.building] = {
        ...DEFAULT_POLICY_STATE,
        rosterFlow,
      };
      WorldTimeState.day[context.singletonEntities.time] = 1;
      WorldTimeState.minuteOfDay[context.singletonEntities.time] = minuteOfDay;

      advanceVisitorPoolSystem(context, 1_000);

      const visitorEntity = context.runtimeState.visitorEntities[0];
      if (visitorEntity === undefined) {
        return null;
      }

      return {
        quality: VisitorState.quality[visitorEntity],
        patience: VisitorState.patience[visitorEntity],
      };
    };

    expect(getVisitorMetrics("open_doors", 300)).toEqual({
      quality: 50,
      patience: 360,
    });
    expect(getVisitorMetrics("selective_intake", 300)).toBeNull();
    expect(getVisitorMetrics("selective_intake", 450)).toEqual({
      quality: 60,
      patience: 270,
    });
  });

  it("changes rejection cost and departure pressure when roster flow changes", () => {
    const rejectVisitor = (rosterFlow: "open_doors" | "selective_intake") => {
      const context = createPolicyContext();
      addVisitor(context, `visitor/${rosterFlow}`);
      BuildingAuthority.policies[context.singletonEntities.building] = {
        ...DEFAULT_POLICY_STATE,
        rosterFlow,
      };

      applySimCommand(context, {
        type: "sim/reject-recruit",
        visitorId: `visitor/${rosterFlow}`,
      });

      return {
        reputation: GuildState.reputation[context.singletonEntities.guild],
        message: context.runtimeState.pendingEvents.at(-1)?.message ?? "",
      };
    };

    expect(rejectVisitor("open_doors")).toEqual({
      reputation: 11,
      message: "Walk-In was turned away (-1 rep under Open Doors)",
    });
    expect(rejectVisitor("selective_intake")).toEqual({
      reputation: 10,
      message: "Walk-In was turned away (-2 rep under Selective Intake)",
    });

    const departureContext = createPolicyContext();
    addRoomCulture(departureContext, "room-instance/dining", 30);
    const operatorEntity = addOperator(departureContext, {
      id: "operator/departure",
      morale: 18,
      loyalty: 16,
      injurySeverity: 40,
    });
    addDisposition(departureContext, "operator/departure", 80);

    const findDifferingSeed = () => {
      for (let index = 0; index < 512; index += 1) {
        BuildingAuthority.policies[departureContext.singletonEntities.building] = {
          ...DEFAULT_POLICY_STATE,
          rosterFlow: "open_doors",
        };
        const openDoorsOutcome = getDepartureCheck(
          departureContext,
          operatorEntity,
          new SeededRng(seedFromKey(`departure-policy:${index}`)),
        ).shouldDepart;

        BuildingAuthority.policies[departureContext.singletonEntities.building] = {
          ...DEFAULT_POLICY_STATE,
          rosterFlow: "retention_focus",
        };
        const retentionOutcome = getDepartureCheck(
          departureContext,
          operatorEntity,
          new SeededRng(seedFromKey(`departure-policy:${index}`)),
        ).shouldDepart;

        if (openDoorsOutcome !== retentionOutcome) {
          return { openDoorsOutcome, retentionOutcome };
        }
      }

      return null;
    };

    expect(findDifferingSeed()).toEqual({
      openDoorsOutcome: true,
      retentionOutcome: false,
    });
  });

  it("validates set-policy commands and blocks objective bias changes on active contracts", () => {
    const context = createPolicyContext();

    applySimCommand(context, {
      type: "sim/set-policy",
      policyId: "contractPosture",
      value: "aggressive",
    });

    expect(BuildingAuthority.policies[context.singletonEntities.building]).toEqual({
      ...DEFAULT_POLICY_STATE,
      contractPosture: "aggressive",
    });
    expect(context.runtimeState.pendingEvents).toEqual([
      expect.objectContaining({
        kind: "event_change",
        message: "Boss changed Contract Posture to Aggressive.",
      }),
    ]);

    context.runtimeState.pendingEvents.length = 0;
    BuildingAuthority.contractLifecycle[context.singletonEntities.building] = "active";
    applySimCommand(context, {
      type: "sim/set-policy",
      policyId: "objectiveBias",
      value: "boss_rush",
    });

    expect(BuildingAuthority.policies[context.singletonEntities.building]?.objectiveBias).toBe(
      "standard_clearance",
    );
    expect(context.runtimeState.pendingEvents).toEqual([]);
  });
});

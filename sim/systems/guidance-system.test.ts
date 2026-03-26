import { addComponent, addEntity, createWorld } from "bitecs";
import { describe, expect, it } from "vitest";

import { templateRegistry } from "content/templates";

import { BuildingAuthority, GuildState, WorldTimeState } from "../components";
import { advanceGuidanceSystem, handleGuidanceRecordAnchorFailure } from "./guidance-system";
import { OPENING_BEAT_BY_ID, OPENING_BEAT_IDS } from "./guidance-beats";
import { applyContractCommand } from "./contract-commands";
import { applyEncounterCommand, registerGuidanceCommandHandlers } from "./encounter-commands";
import { createIncidentState } from "./incidents";
import type { InterruptionInstance } from "./interruptions";
import type { SimSystemContext } from "./types";
import {
  handleGuidanceComplete,
  handleGuidanceDismiss,
  handleGuidanceResetOpening,
} from "./guidance-system";

function createGuidanceContext(completedOpeningBeatCount: number): SimSystemContext {
  const world = createWorld();
  const guildEntity = addEntity(world);
  const timeEntity = addEntity(world);
  const buildingEntity = addEntity(world);

  addComponent(world, guildEntity, GuildState);
  addComponent(world, timeEntity, WorldTimeState);
  addComponent(world, buildingEntity, BuildingAuthority);

  GuildState.reputation[guildEntity] = 10;
  GuildState.treasury[guildEntity] = 500;
  GuildState.intel[guildEntity] = 5;

  WorldTimeState.tick[timeEntity] = 0;
  WorldTimeState.day[timeEntity] = 1;
  WorldTimeState.minuteOfDay[timeEntity] = 480;

  BuildingAuthority.contractSite[buildingEntity] = null;
  BuildingAuthority.fogOfWar[buildingEntity] = null;
  BuildingAuthority.contractLifecycle[buildingEntity] = "active";
  BuildingAuthority.postedContracts[buildingEntity] = [];
  BuildingAuthority.contractResult[buildingEntity] = null;
  BuildingAuthority.raidSummaries[buildingEntity] = [];
  BuildingAuthority.activeRaidPackets[buildingEntity] = [];
  BuildingAuthority.lastRaidOpportunityTick[buildingEntity] = 0;
  BuildingAuthority.pressure[buildingEntity] = 0;

  const completedBeatIds = OPENING_BEAT_IDS.slice(0, completedOpeningBeatCount);

  return {
    world,
    registry: templateRegistry,
    singletonEntities: { guild: guildEntity, time: timeEntity, building: buildingEntity },
    runtimeState: {
      roomEntities: [],
      operatorEntities: [],
      raidOpportunityEntities: [],
      staffEntities: [],
      visitorEntities: [],
      eventEntities: [],
      dispositionEntities: [],
      notableTieEntities: [],
      recurringTeamEntities: [],
      roomCultureEntities: [],
      inventoryEntities: [],
      equipmentEntities: [],
      nextRoomSequence: 1,
      nextOperatorSequence: 1,
      nextOpportunitySequence: 1,
      nextStaffSequence: 1,
      nextVisitorSequence: 1,
      nextRaidSequence: 1,
      nextEventSequence: 1,
      nextTeamSequence: 1,
      pendingCueIds: [],
      pendingEvents: [],
      raidPresentation: {
        contractSiteId: null,
        teams: [],
        enemies: [],
        features: [],
      },
      activeEncounter: null,
      interruptionQueue: { active: null, queue: [], nextInstanceId: 3 },
      incidentState: createIncidentState(),
      guidanceState: {
        seenBeatIds: [...completedBeatIds],
        completedBeatIds: [...completedBeatIds],
        dismissedBeatIds: [],
        activeBeatId: null,
        activeBeatView: null,
        queuedBeatIds: [],
        lastEvaluationMinute: 0,
        openingPathState: "active",
        anchorResolutionFailures: [],
      },
      kitRegistry: {
        regularAttacks: [],
        skills: [],
        ultimates: [],
        passives: [],
        regularAttackById: new Map(),
        skillById: new Map(),
        ultimateById: new Map(),
        passiveById: new Map(),
      },
      worldTimeFrozen: false,
    },
  };
}

function createIncidentInterruption(): InterruptionInstance {
  return {
    instanceId: "interruption-1",
    type: "incident",
    priority: 70,
    blockingMode: "blocking",
    createdAtMinute: 480,
    sourceSystem: "test",
    dismissible: false,
    persistence: "persistent",
    payload: {
      kind: "incident",
      incidentInstanceId: "incident-1",
      templateId: "incident/personnel-friction",
      category: "personnel_conflict",
      title: "Personnel Friction Report",
      briefing: "Two operators are at each other's throats.",
      subjectSummary: "Test Operators",
      choices: [
        {
          choiceId: "mediate",
          label: "Mediate Directly",
          description: "Sit both operators down and work through the problem.",
          consequenceSummary: "Minor morale boost for both.",
        },
      ],
      boundContext: {
        operatorIds: ["operator/a", "operator/b"],
      },
    },
  };
}

function createBossCommitmentInterruption(): InterruptionInstance {
  return {
    instanceId: "interruption-2",
    type: "raid_boss_commitment",
    priority: 90,
    blockingMode: "blocking",
    createdAtMinute: 480,
    sourceSystem: "test",
    dismissible: false,
    persistence: "persistent",
    payload: {
      kind: "raid_boss_commitment",
      activeRaidId: "raid/test",
      contractSiteId: "contract/test",
      missionId: "mission/clearance",
      teamId: "team/test",
      operatorIds: ["operator/a", "operator/b"],
      bossId: "boss/tunneler-brood-mother",
      bossName: "Tunneler Brood-Mother",
      bossRank: "f",
      stakeSummary: "Failure will hit the roster hard.",
      teamConditionSummary: "The team is bruised but still standing.",
    },
  };
}

describe("guidance system", () => {
  it("layers the first-incident guidance beat ahead of the first live incident", () => {
    const context = createGuidanceContext(6);
    context.runtimeState.incidentState.pendingIncident = {
      instanceId: "incident-1",
      templateId: "incident/personnel-friction",
      triggerFamily: "operator_conflict",
      boundContext: {
        operatorIds: ["operator/a", "operator/b"],
      },
      choices: [
        {
          choiceId: "mediate",
          label: "Mediate Directly",
          description: "Sit both operators down and work through the problem.",
          consequenceSummary: "Minor morale boost for both.",
          effects: [],
        },
      ],
      createdAtMinute: 480,
    };
    context.runtimeState.interruptionQueue.active = createIncidentInterruption();

    advanceGuidanceSystem(context, 0);

    expect(context.runtimeState.guidanceState.activeBeatId).toBe("guidance/opening/first-incident");
    expect(context.runtimeState.interruptionQueue.active?.type).toBe("guidance");
    expect(context.runtimeState.interruptionQueue.queue[0]?.type).toBe("incident");
  });

  it("completes the first-incident beat when the underlying incident is resolved", () => {
    const context = createGuidanceContext(6);
    context.runtimeState.incidentState.pendingIncident = {
      instanceId: "incident-1",
      templateId: "incident/personnel-friction",
      triggerFamily: "operator_conflict",
      boundContext: {
        operatorIds: ["operator/a", "operator/b"],
      },
      choices: [
        {
          choiceId: "mediate",
          label: "Mediate Directly",
          description: "Sit both operators down and work through the problem.",
          consequenceSummary: "Minor morale boost for both.",
          effects: [],
        },
      ],
      createdAtMinute: 480,
    };
    context.runtimeState.incidentState.nextInstanceId = 2;
    context.runtimeState.interruptionQueue.active = createIncidentInterruption();

    advanceGuidanceSystem(context, 0);

    registerGuidanceCommandHandlers({
      complete: handleGuidanceComplete,
      dismiss: handleGuidanceDismiss,
      recordAnchorFailure: handleGuidanceRecordAnchorFailure,
      resetOpening: handleGuidanceResetOpening,
    });

    applyEncounterCommand(context, "sim/interruption-resolve", {
      instanceId: "interruption-3",
    });
    applyEncounterCommand(context, "sim/interruption-resolve", {
      instanceId: "interruption-1",
      choiceId: "mediate",
    });

    expect(context.runtimeState.guidanceState.activeBeatId).toBeNull();
    expect(context.runtimeState.guidanceState.completedBeatIds).toContain(
      "guidance/opening/first-incident",
    );
  });

  it("layers the first boss-commitment guidance beat ahead of the commitment decision", () => {
    const context = createGuidanceContext(8);
    context.runtimeState.interruptionQueue.active = createBossCommitmentInterruption();

    advanceGuidanceSystem(context, 0);

    expect(context.runtimeState.guidanceState.activeBeatId).toBe(
      "guidance/opening/first-boss-commitment",
    );
    expect(context.runtimeState.interruptionQueue.active?.type).toBe("guidance");
    expect(context.runtimeState.interruptionQueue.queue[0]?.type).toBe("raid_boss_commitment");
  });

  it("advances immediately into the event-log beat when the first contract is secured", () => {
    const context = createGuidanceContext(1);
    const chooseFirstContractBeat = OPENING_BEAT_BY_ID.get(
      "guidance/opening/choose-first-contract",
    );

    if (!chooseFirstContractBeat) {
      throw new Error("Missing choose-first-contract beat definition.");
    }

    context.runtimeState.guidanceState.activeBeatId = chooseFirstContractBeat.id;
    context.runtimeState.guidanceState.activeBeatView = {
      beatId: chooseFirstContractBeat.id,
      track: chooseFirstContractBeat.track,
      deliveryMode: chooseFirstContractBeat.delivery.mode,
      target: chooseFirstContractBeat.delivery.target ?? null,
      fallbackIntent: chooseFirstContractBeat.delivery.fallbackIntent ?? null,
      copy: chooseFirstContractBeat.copy,
      milestoneOrder: chooseFirstContractBeat.milestoneOrder,
      totalMilestones: OPENING_BEAT_IDS.length,
      completionKind: chooseFirstContractBeat.completion.kind,
      pauseWorld: chooseFirstContractBeat.delivery.pauseWorld,
      allowSkip: chooseFirstContractBeat.delivery.allowSkip,
    };
    context.runtimeState.worldTimeFrozen = true;
    BuildingAuthority.contractLifecycle[context.singletonEntities.building] = "bidding";
    BuildingAuthority.postedContracts[context.singletonEntities.building] = [
      {
        postingId: "posting/test",
        missionId: "mission/clearance",
        siteConceptId: "site/flooded-subway-tunnel",
        location: "district/lower-east-side",
        rank: "f",
        threat: 40,
        intel: 50,
        reward: 80,
        risk: 35,
        bidCost: 6,
        minReputation: 0,
        generatedAtTick: 480,
        knownTraits: [],
        hiddenTraitCount: 0,
        enemyHints: [],
        lootFamilyHints: [],
        bossHint: null,
        neighborhoodLabel: "lower east side",
      },
    ];

    applyContractCommand(context, "sim/bid-contract", { postingId: "posting/test" });

    expect(context.runtimeState.guidanceState.completedBeatIds).toContain(
      "guidance/opening/choose-first-contract",
    );
    expect(context.runtimeState.guidanceState.activeBeatId).toBe(
      "guidance/opening/event-log-and-world-view",
    );
  });

  it("records anchor fallback failures through the guidance command surface", () => {
    const context = createGuidanceContext(0);

    handleGuidanceRecordAnchorFailure(
      context,
      "guidance/opening/choose-first-contract",
      "ui/ops/contract-board",
      true,
    );

    expect(context.runtimeState.guidanceState.anchorResolutionFailures).toEqual([
      {
        beatId: "guidance/opening/choose-first-contract",
        anchorId: "ui/ops/contract-board",
        attemptedAt: 480,
        fallbackUsed: true,
      },
    ]);
  });
});

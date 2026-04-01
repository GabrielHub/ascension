/**
 * Relocation Gate And Handoff System
 *
 * Evaluates the bodega relocation prerequisites, checks acceptance
 * preconditions, enqueues the multi-beat blocking interruption, and
 * executes the building swap from bodega to Porter's.
 */

import { removeEntity } from "bitecs";

import { getBuildingFloors } from "content/building-layouts";
import {
  AssignmentState,
  BuildingAuthority,
  GuildState,
  OperatorIdentity,
  RaidParticipationState,
} from "../components";
import type { SimSystemContext } from "./types";
import { enqueueInterruption, hasBlockingInterruption } from "./interruptions";
import type { RelocationPayload } from "./interruptions";
import {
  createRoomInstanceEntity,
  formatIdentityRuntimeText,
  getCurrentAbsoluteMinute,
  pushRuntimeEvent,
} from "./commands";
import { BODEGA_SPECIFIC_BEAT_IDS } from "./guidance-beats";

// ── Constants ───────────────────────────────────────────────────────────

const RELOCATION_EVENT_ID = "event/relocation/bodega-to-next-hq";
const RELOCATION_FROM = "building/bodega";
const RELOCATION_TO = "building/porters";
const RELOCATION_TREASURY_COST = 600;
const ASSISTANT_PRESENTER_ID = "presenter/assistant";

export const RELOCATION_THRESHOLDS = {
  buildingTier: 4,
  reputation: 40,
  treasury: 600,
  contractsCompleted: 20,
  activeRoster: 8,
  bossEncountersCompleted: 3,
} as const;

// ── Gate state ──────────────────────────────────────────────────────────

export interface RelocationPrerequisite {
  key: string;
  label: string;
  current: number;
  target: number;
  met: boolean;
}

export interface RelocationGateState {
  visible: boolean;
  allPrerequisitesMet: boolean;
  prerequisites: readonly RelocationPrerequisite[];
}

export interface RelocationBlocker {
  key: string;
  reason: string;
}

// ── Gate evaluation (pure query) ────────────────────────────────────────

export function evaluateRelocationGate(context: SimSystemContext): RelocationGateState {
  const { singletonEntities, runtimeState } = context;
  const buildingEntity = singletonEntities.building;
  const guildEntity = singletonEntities.guild;

  const buildingTemplate =
    context.registry.buildings[BuildingAuthority.activeBuildingTemplateIndex[buildingEntity]];
  if (!buildingTemplate || buildingTemplate.id !== RELOCATION_FROM) {
    return { visible: false, allPrerequisitesMet: false, prerequisites: [] };
  }

  const buildingTier = BuildingAuthority.activeBuildingTier[buildingEntity] ?? 1;
  const reputation = GuildState.reputation[guildEntity] ?? 0;
  const treasury = GuildState.treasury[guildEntity] ?? 0;
  const activeRoster = runtimeState.operatorEntities.filter(
    (e) => OperatorIdentity.lifecycleStatus[e] === "active",
  ).length;

  const raidSummaries = BuildingAuthority.raidSummaries[buildingEntity] ?? [];
  const contractSiteIds = new Set<string>();
  let bossEncountersCompleted = 0;
  for (const s of raidSummaries) {
    const summary = s as { contractSiteId?: string; bossDefeated?: boolean };
    if (summary.contractSiteId) contractSiteIds.add(summary.contractSiteId);
    if (summary.bossDefeated === true) bossEncountersCompleted++;
  }
  const contractsCompleted = contractSiteIds.size;

  const prerequisites: RelocationPrerequisite[] = [
    {
      key: "buildingTier",
      label: "Building fully upgraded",
      current: buildingTier,
      target: RELOCATION_THRESHOLDS.buildingTier,
      met: buildingTier >= RELOCATION_THRESHOLDS.buildingTier,
    },
    {
      key: "reputation",
      label: "Reputation",
      current: reputation,
      target: RELOCATION_THRESHOLDS.reputation,
      met: reputation >= RELOCATION_THRESHOLDS.reputation,
    },
    {
      key: "treasury",
      label: "Treasury",
      current: treasury,
      target: RELOCATION_THRESHOLDS.treasury,
      met: treasury >= RELOCATION_THRESHOLDS.treasury,
    },
    {
      key: "contractsCompleted",
      label: "Contracts completed",
      current: contractsCompleted,
      target: RELOCATION_THRESHOLDS.contractsCompleted,
      met: contractsCompleted >= RELOCATION_THRESHOLDS.contractsCompleted,
    },
    {
      key: "activeRoster",
      label: "Active roster",
      current: activeRoster,
      target: RELOCATION_THRESHOLDS.activeRoster,
      met: activeRoster >= RELOCATION_THRESHOLDS.activeRoster,
    },
    {
      key: "bossEncountersCompleted",
      label: "Boss encounters completed",
      current: bossEncountersCompleted,
      target: RELOCATION_THRESHOLDS.bossEncountersCompleted,
      met: bossEncountersCompleted >= RELOCATION_THRESHOLDS.bossEncountersCompleted,
    },
  ];

  const anyMet = prerequisites.some((p) => p.met);
  const allMet = prerequisites.every((p) => p.met);

  return { visible: anyMet, allPrerequisitesMet: allMet, prerequisites };
}

// ── Acceptance blockers ─────────────────────────────────────────────────

export function getRelocationBlockers(context: SimSystemContext): readonly RelocationBlocker[] {
  const blockers: RelocationBlocker[] = [];
  const buildingEntity = context.singletonEntities.building;

  const contractLifecycle = BuildingAuthority.contractLifecycle[buildingEntity];
  if (contractLifecycle === "active") {
    blockers.push({
      key: "active_contract",
      reason: "Complete or abandon the current contract before relocating.",
    });
  }

  const hasOperatorsMidRaid = context.runtimeState.operatorEntities.some(
    (e) =>
      OperatorIdentity.lifecycleStatus[e] === "active" &&
      RaidParticipationState.activeRaidId[e] !== "" &&
      RaidParticipationState.activeRaidId[e] !== undefined,
  );
  if (hasOperatorsMidRaid) {
    blockers.push({
      key: "mid_raid",
      reason: "All raid teams must return before relocating.",
    });
  }

  const pendingIncident = context.runtimeState.incidentState.pendingIncident;
  if (pendingIncident !== null) {
    blockers.push({
      key: "blocking_incident",
      reason: "Resolve the active incident before relocating.",
    });
  }

  if (hasBlockingInterruption(context.runtimeState.interruptionQueue)) {
    blockers.push({
      key: "blocking_interruption",
      reason: "Resolve the current interruption before relocating.",
    });
  }

  return blockers;
}

// ── Initiate relocation sequence ────────────────────────────────────────

export function initiateRelocation(context: SimSystemContext): boolean {
  const gate = evaluateRelocationGate(context);
  if (!gate.allPrerequisitesMet) return false;

  const blockers = getRelocationBlockers(context);
  if (blockers.length > 0) return false;

  const currentMinute = getCurrentAbsoluteMinute(context);
  const payload: RelocationPayload = {
    kind: "relocation",
    eventId: RELOCATION_EVENT_ID,
    beat: "offer",
    buildingFromId: RELOCATION_FROM,
    buildingToId: RELOCATION_TO,
    treasuryCost: RELOCATION_TREASURY_COST,
    presenterId: ASSISTANT_PRESENTER_ID,
    presenterExpression: "serious",
  };

  enqueueInterruption(
    context.runtimeState.interruptionQueue,
    "relocation",
    payload,
    "relocation-system",
    currentMinute,
    { blockingMode: "blocking", persistence: "persistent" },
  );

  context.runtimeState.pendingCueIds.push("hq.relocation.offer");
  pushRuntimeEvent(context, {
    kind: "event_change",
    message: formatIdentityRuntimeText(
      context,
      "The city's guild licensing office has contacted {guildName} about a facility upgrade.",
    ),
    accent: "gold",
  });

  return true;
}

// ── Beat progression ────────────────────────────────────────────────────

export function advanceRelocationBeat(
  context: SimSystemContext,
  resolvedPayload: RelocationPayload,
  choiceId: string | undefined,
): void {
  const currentMinute = getCurrentAbsoluteMinute(context);

  switch (resolvedPayload.beat) {
    case "offer": {
      // Advance to decision beat
      const decisionPayload: RelocationPayload = {
        ...resolvedPayload,
        beat: "decision",
        presenterExpression: "concerned",
      };
      enqueueInterruption(
        context.runtimeState.interruptionQueue,
        "relocation",
        decisionPayload,
        "relocation-system",
        currentMinute,
        { blockingMode: "blocking", persistence: "persistent" },
      );
      break;
    }

    case "decision": {
      if (choiceId === "accept") {
        const guildEntity = context.singletonEntities.guild;
        const blockers = getRelocationBlockers(context);
        if (blockers.length > 0) {
          pushRuntimeEvent(context, {
            kind: "event_change",
            message: blockers[0]?.reason ?? "Relocation cannot proceed right now.",
            accent: "ember",
          });
          return;
        }
        if (GuildState.treasury[guildEntity] < resolvedPayload.treasuryCost) {
          pushRuntimeEvent(context, {
            kind: "event_change",
            message:
              "The relocation deposit is no longer covered. Build the treasury back up before accepting again.",
            accent: "ember",
          });
          return;
        }

        // Debit treasury once the handoff is still valid.
        GuildState.treasury[guildEntity] -= resolvedPayload.treasuryCost;
        context.runtimeState.pendingCueIds.push("hq.relocation.confirm");

        // Enqueue the moving beat
        const movingPayload: RelocationPayload = {
          ...resolvedPayload,
          beat: "moving",
          presenterExpression: "neutral",
        };
        enqueueInterruption(
          context.runtimeState.interruptionQueue,
          "relocation",
          movingPayload,
          "relocation-system",
          currentMinute,
          { blockingMode: "blocking", persistence: "persistent" },
        );
      }
      // "defer" does nothing — the interruption was already resolved
      break;
    }

    case "moving": {
      // Execute the building handoff
      executeRelocationHandoff(context);
      break;
    }
  }
}

// ── Building handoff ────────────────────────────────────────────────────

function executeRelocationHandoff(context: SimSystemContext): void {
  const { world, registry, singletonEntities, runtimeState } = context;
  const buildingEntity = singletonEntities.building;

  // ── 1. Resolve Porter's template index ─────────────────────────────
  const portersIndex = registry.buildingIndexById.get(RELOCATION_TO);
  if (portersIndex === undefined) {
    throw new Error(`Relocation target building "${RELOCATION_TO}" not found in registry.`);
  }
  const portersTemplate = registry.buildings[portersIndex];

  // ── 2. Remove all existing room entities ───────────────────────────
  const oldRoomEntities = runtimeState.roomEntities.slice();
  for (const entity of oldRoomEntities) {
    removeEntity(world, entity);
  }
  runtimeState.roomEntities.length = 0;

  // ── 3. Remove room culture entities for old rooms ──────────────────
  const oldCultureEntities = runtimeState.roomCultureEntities.slice();
  for (const entity of oldCultureEntities) {
    removeEntity(world, entity);
  }
  runtimeState.roomCultureEntities.length = 0;

  // ── 3b. Clear any leftover raid opportunity state ───────────────────
  const oldOpportunityEntities = runtimeState.raidOpportunityEntities.slice();
  for (const entity of oldOpportunityEntities) {
    removeEntity(world, entity);
  }
  runtimeState.raidOpportunityEntities.length = 0;
  runtimeState.activeEncounter = null;
  runtimeState.raidPresentation = { contractSiteId: null, teams: [], enemies: [], features: [] };

  // ── 4. Clear staff assignments ─────────────────────────────────────
  for (const staffEntity of runtimeState.staffEntities) {
    AssignmentState.kind[staffEntity] = "idle";
    AssignmentState.targetId[staffEntity] = "";
  }

  for (const operatorEntity of runtimeState.operatorEntities) {
    if (OperatorIdentity.lifecycleStatus[operatorEntity] !== "active") {
      continue;
    }
    AssignmentState.kind[operatorEntity] = "idle";
    AssignmentState.targetId[operatorEntity] = "";
    RaidParticipationState.activeRaidId[operatorEntity] = "";
    RaidParticipationState.returnTick[operatorEntity] = 0;
  }

  // ── 5. Switch building identity ────────────────────────────────────
  BuildingAuthority.activeBuildingTemplateIndex[buildingEntity] = portersIndex;
  BuildingAuthority.activeBuildingTier[buildingEntity] = portersTemplate.baseTier;
  BuildingAuthority.activeFloorIndex[buildingEntity] = 0;
  BuildingAuthority.roomSlotCount[buildingEntity] = portersTemplate.baseRoomSlots;
  BuildingAuthority.operatorSlotCount[buildingEntity] = portersTemplate.baseOperatorSlots;
  BuildingAuthority.appliedUpgradeIds[buildingEntity] = [];
  BuildingAuthority.unlockedRoomTemplateIds[buildingEntity] = [];
  BuildingAuthority.unlockedRoomTierByTemplateId[buildingEntity] = {};

  // Reset building modifiers
  BuildingAuthority.roomCapacityModifiers[buildingEntity] = {};
  BuildingAuthority.needRateMultipliers[buildingEntity] = {};
  BuildingAuthority.attractionWeightByTag[buildingEntity] = {};
  BuildingAuthority.recoveryRateModifier[buildingEntity] = 0;
  BuildingAuthority.trainingRateModifier[buildingEntity] = 0;
  BuildingAuthority.moraleModifier[buildingEntity] = 0;
  BuildingAuthority.loyaltyModifier[buildingEntity] = 0;
  BuildingAuthority.resourceIncomeModifiers[buildingEntity] = {};
  BuildingAuthority.resourceCostMultipliers[buildingEntity] = {};

  // Reset contract-board and contract-lifecycle state
  BuildingAuthority.contractLifecycle[buildingEntity] = "idle";
  BuildingAuthority.postedContracts[buildingEntity] = [];
  BuildingAuthority.contractSite[buildingEntity] = null;
  BuildingAuthority.contractResult[buildingEntity] = null;
  BuildingAuthority.fogOfWar[buildingEntity] = null;
  BuildingAuthority.activeRaidPackets[buildingEntity] = [];
  BuildingAuthority.pressure[buildingEntity] = 0;

  // Reset visitor state
  BuildingAuthority.lastVisitorSpawnTick[buildingEntity] = 0;
  const oldVisitorEntities = runtimeState.visitorEntities.slice();
  for (const entity of oldVisitorEntities) {
    removeEntity(world, entity);
  }
  runtimeState.visitorEntities.length = 0;

  // ── 6. Place Porter's starter rooms ────────────────────────────────
  const starterFloors = getBuildingFloors(RELOCATION_TO, portersTemplate.baseTier);
  for (const floor of starterFloors) {
    for (const slot of floor.slots) {
      if (!slot.startingTemplateId) continue;

      const template = registry.roomById.get(slot.startingTemplateId);
      if (!template) continue;

      const reservedFootprint = { col: slot.col, row: slot.row, cols: slot.cols, rows: slot.rows };
      createRoomInstanceEntity(
        context,
        template.id,
        {
          floorIndex: floor.floorIndex,
          slotId: slot.slotId,
          reservedFootprint,
        },
        undefined,
        { isRequestedActive: true },
      );
    }
  }

  // ── 7. Retire bodega-specific guidance beats ────────────────────────
  const { guidanceState } = runtimeState;
  for (const beatId of BODEGA_SPECIFIC_BEAT_IDS) {
    if (guidanceState.activeBeatId === beatId) {
      guidanceState.activeBeatId = null;
      guidanceState.activeBeatView = null;
      guidanceState.activeBeatProgressBaseline = null;
    }
    const queueIdx = guidanceState.queuedBeatIds.indexOf(beatId);
    if (queueIdx >= 0) guidanceState.queuedBeatIds.splice(queueIdx, 1);
    if (!guidanceState.completedBeatIds.includes(beatId)) {
      guidanceState.completedBeatIds.push(beatId);
    }
  }

  // ── 8. Push relocation event ───────────────────────────────────────
  context.runtimeState.pendingCueIds.push("hq.relocation.land");
  pushRuntimeEvent(context, {
    kind: "relocation",
    message: formatIdentityRuntimeText(
      context,
      "{guildName} has relocated to Porter's in Red Hook. The bodega is behind you. Welcome to the waterfront.",
    ),
    accent: "gold",
  });
}

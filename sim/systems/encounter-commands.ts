/**
 * Encounter, interruption, and incident command handlers.
 *
 * Separated from commands.ts to break the circular dependency:
 * commands.ts ↔ encounter.ts ↔ commands.ts
 *
 * This module imports directly from encounter/interruption/incident modules.
 * It is called by commands.ts via a late-bound function reference.
 */

import type { RuntimeCueId, SimSystemContext } from "./types";
import { OperatorIdentity } from "../components";
import { getCurrentAbsoluteMinute, pushRuntimeEvent } from "./commands";
import {
  createBossEncounter,
  startEncounter,
  advanceEncounterTurn,
  retreatFromEncounter,
  writeEncounterOutcome,
  useIntervention,
} from "./encounter";
import { markRaidBossCommitment, resolveRaidBossEncounter, resolveRaidBossRetreat } from "./raids";
import {
  resolveActiveInterruption,
  dismissActiveInterruption,
  enqueueInterruption,
} from "./interruptions";
import {
  resolveIncident,
  createBossCommitmentPayload,
  selectIncidentCandidate,
  queueIncident,
} from "./incidents";
import type { InterventionId } from "./encounter-types";

// Lazy-bound guidance command handlers (registered after module init).
let lazyHandleGuidanceComplete:
  | ((context: SimSystemContext, beatId: string, signal: string) => void)
  | null = null;
let lazyHandleGuidanceDismiss: ((context: SimSystemContext, beatId: string) => void) | null = null;
let lazyHandleGuidanceRecordAnchorFailure:
  | ((context: SimSystemContext, beatId: string, anchorId: string, fallbackUsed: boolean) => void)
  | null = null;
let lazyHandleGuidanceResetOpening: ((context: SimSystemContext) => void) | null = null;

export function registerGuidanceCommandHandlers(handlers: {
  complete: typeof lazyHandleGuidanceComplete;
  dismiss: typeof lazyHandleGuidanceDismiss;
  recordAnchorFailure: typeof lazyHandleGuidanceRecordAnchorFailure;
  resetOpening: typeof lazyHandleGuidanceResetOpening;
}): void {
  lazyHandleGuidanceComplete = handlers.complete;
  lazyHandleGuidanceDismiss = handlers.dismiss;
  lazyHandleGuidanceRecordAnchorFailure = handlers.recordAnchorFailure;
  lazyHandleGuidanceResetOpening = handlers.resetOpening;
}

function pushRuntimeCue(context: SimSystemContext, cueId: RuntimeCueId): void {
  context.runtimeState.pendingCueIds.push(cueId);
}

function startBossEncounterFromPayload(
  context: SimSystemContext,
  payload: {
    activeRaidId: string;
    contractSiteId: string;
    missionId: string;
    teamId: string;
    operatorIds: readonly string[];
    bossId: string;
  },
): void {
  const encounter = createBossEncounter(
    context,
    payload.activeRaidId,
    payload.contractSiteId,
    payload.missionId,
    payload.teamId,
    [...payload.operatorIds],
    payload.bossId,
  );
  if (!encounter) {
    return;
  }

  markRaidBossCommitment(context, payload.activeRaidId);
  startEncounter(encounter);
  context.runtimeState.activeEncounter = encounter;
  context.runtimeState.worldTimeFrozen = true;
  pushRuntimeCue(context, "raid.boss.commit");
  const bossName =
    Object.values(encounter.actors).find((actor) => actor.kind === "boss")?.label ?? "the boss";
  pushRuntimeEvent(context, {
    kind: "encounter_start",
    message: `Boss encounter started: ${bossName}`,
    accent: "danger",
  });
}

function emitEncounterLogCues(
  context: SimSystemContext,
  encounter: NonNullable<SimSystemContext["runtimeState"]["activeEncounter"]>,
  previousLogLength: number,
): void {
  const newEntries = encounter.encounterLog.slice(previousLogLength);
  for (const entry of newEntries) {
    if (entry.actionKind === "phase_transition") {
      pushRuntimeCue(context, "raid.boss.phase");
    }
    if (entry.actionKind === "summon") {
      pushRuntimeCue(context, "raid.boss.summon");
    }
  }
}

function finalizeEncounterResolution(
  context: SimSystemContext,
  encounter: NonNullable<SimSystemContext["runtimeState"]["activeEncounter"]>,
): void {
  encounter.autoplayEnabled = false;

  const resolvedRaid = resolveRaidBossEncounter(context, encounter);
  pushRuntimeCue(
    context,
    encounter.status === "victory" ? "raid.boss.victory" : "raid.boss.failure",
  );

  if (!resolvedRaid) {
    writeEncounterOutcome(context, encounter);
  } else {
    context.runtimeState.worldTimeFrozen = false;
  }
}

export function applyEncounterCommand(
  context: SimSystemContext,
  type: string,
  payload: Record<string, unknown>,
): boolean {
  switch (type) {
    case "sim/encounter-start": {
      startBossEncounterFromPayload(context, {
        activeRaidId: payload.activeRaidId as string,
        contractSiteId: payload.contractSiteId as string,
        missionId: payload.missionId as string,
        teamId: payload.teamId as string,
        operatorIds: payload.operatorIds as string[],
        bossId: payload.bossId as string,
      });
      return true;
    }
    case "sim/encounter-pause": {
      if (context.runtimeState.activeEncounter?.status === "active") {
        context.runtimeState.activeEncounter.status = "paused";
        context.runtimeState.activeEncounter.autoplayEnabled = false;
      }
      return true;
    }
    case "sim/encounter-resume": {
      if (context.runtimeState.activeEncounter?.status === "paused") {
        context.runtimeState.activeEncounter.status = "active";
        context.runtimeState.activeEncounter.autoplayEnabled = true;
      }
      return true;
    }
    case "sim/encounter-step": {
      if (
        context.runtimeState.activeEncounter &&
        (context.runtimeState.activeEncounter.status === "active" ||
          context.runtimeState.activeEncounter.status === "paused")
      ) {
        const wasPaused = context.runtimeState.activeEncounter.status === "paused";
        if (wasPaused) {
          context.runtimeState.activeEncounter.status = "active";
        }
        const previousLogLength = context.runtimeState.activeEncounter.encounterLog.length;
        advanceEncounterTurn(context.runtimeState.activeEncounter);
        const active = context.runtimeState.activeEncounter;
        if (wasPaused && active.status === "active" && !active.autoplayEnabled) {
          active.status = "paused";
        }
        emitEncounterLogCues(context, active, previousLogLength);
        if (
          active.status !== "active" &&
          active.status !== "paused" &&
          active.status !== "pending"
        ) {
          finalizeEncounterResolution(context, active);
        }
      }
      return true;
    }
    case "sim/encounter-retreat": {
      if (
        context.runtimeState.activeEncounter &&
        (context.runtimeState.activeEncounter.status === "active" ||
          context.runtimeState.activeEncounter.status === "paused")
      ) {
        retreatFromEncounter(context.runtimeState.activeEncounter);
        finalizeEncounterResolution(context, context.runtimeState.activeEncounter);
      }
      return true;
    }
    case "sim/encounter-dismiss": {
      if (
        context.runtimeState.activeEncounter &&
        !["active", "paused", "pending"].includes(context.runtimeState.activeEncounter.status)
      ) {
        context.runtimeState.activeEncounter = null;
      }
      return true;
    }
    case "sim/encounter-use-intervention": {
      if (context.runtimeState.activeEncounter) {
        useIntervention(
          context.runtimeState.activeEncounter,
          payload.interventionId as InterventionId,
        );
      }
      return true;
    }
    case "sim/interruption-resolve": {
      const resolved = resolveActiveInterruption(context.runtimeState.interruptionQueue);
      if (resolved?.payload?.kind === "incident" && payload.choiceId) {
        resolveIncident(context, context.runtimeState.incidentState, payload.choiceId as string);
        const activeBeatId = context.runtimeState.guidanceState.activeBeatId;
        if (activeBeatId) {
          lazyHandleGuidanceComplete?.(context, activeBeatId, "incident_resolved");
        }
      }
      if (resolved?.payload?.kind === "raid_boss_commitment" && payload.choiceId === "commit") {
        startBossEncounterFromPayload(context, resolved.payload);
        const activeBeatId = context.runtimeState.guidanceState.activeBeatId;
        if (activeBeatId) {
          lazyHandleGuidanceComplete?.(context, activeBeatId, "boss_commitment_resolved");
        }
      }
      if (resolved?.payload?.kind === "raid_boss_commitment" && payload.choiceId === "retreat") {
        resolveRaidBossRetreat(context, resolved.payload.activeRaidId);
        pushRuntimeCue(context, "raid.boss.failure");
        const activeBeatId = context.runtimeState.guidanceState.activeBeatId;
        if (activeBeatId) {
          lazyHandleGuidanceComplete?.(context, activeBeatId, "boss_commitment_resolved");
        }
      }
      // Guidance interruptions: complete the beat on resolve
      if (resolved?.payload?.kind === "guidance") {
        const guidanceBeatId = (resolved.payload as { beatId?: string }).beatId;
        if (guidanceBeatId) {
          lazyHandleGuidanceComplete?.(context, guidanceBeatId, "acknowledged");
        }
      }
      return true;
    }
    case "sim/interruption-dismiss": {
      dismissActiveInterruption(context.runtimeState.interruptionQueue);
      return true;
    }
    case "sim/incident-resolve": {
      resolveIncident(context, context.runtimeState.incidentState, payload.choiceId as string);
      resolveActiveInterruption(context.runtimeState.interruptionQueue);
      const activeBeatId = context.runtimeState.guidanceState.activeBeatId;
      if (activeBeatId) {
        lazyHandleGuidanceComplete?.(context, activeBeatId, "incident_resolved");
      }
      return true;
    }
    case "sim/dev-trigger-boss-commitment": {
      const operatorIds = context.runtimeState.operatorEntities
        .filter((e) => OperatorIdentity.lifecycleStatus[e] === "active")
        .slice(0, 3)
        .map((e) => OperatorIdentity.id[e]);
      const commitPayload = createBossCommitmentPayload(
        "dev-raid-1",
        "dev-site-1",
        "mission/clearance",
        "dev-team-1",
        operatorIds,
        "boss/tunneler-brood-mother",
        "Tunneler Brood-Mother",
        "f",
      );
      const currentMinute = getCurrentAbsoluteMinute(context);
      enqueueInterruption(
        context.runtimeState.interruptionQueue,
        "raid_boss_commitment",
        commitPayload,
        "dev-menu",
        currentMinute,
      );
      pushRuntimeCue(context, "raid.boss.approach");
      return true;
    }
    case "sim/dev-trigger-incident": {
      const currentMinute = getCurrentAbsoluteMinute(context);
      const candidate = selectIncidentCandidate(
        context,
        context.runtimeState.incidentState,
        currentMinute,
        80,
      );
      if (candidate) {
        queueIncident(context, context.runtimeState.incidentState, candidate, "dev-menu");
      }
      return true;
    }
    case "sim/guidance-complete": {
      const beatId = payload.beatId as string;
      const signal = payload.signal as string;
      lazyHandleGuidanceComplete?.(context, beatId, signal);
      return true;
    }
    case "sim/guidance-dismiss": {
      const beatId = payload.beatId as string;
      lazyHandleGuidanceDismiss?.(context, beatId);
      return true;
    }
    case "sim/guidance-record-anchor-failure": {
      lazyHandleGuidanceRecordAnchorFailure?.(
        context,
        payload.beatId as string,
        payload.anchorId as string,
        payload.fallbackUsed === true,
      );
      return true;
    }
    case "sim/guidance-reset-opening": {
      lazyHandleGuidanceResetOpening?.(context);
      return true;
    }
    default:
      return false;
  }
}

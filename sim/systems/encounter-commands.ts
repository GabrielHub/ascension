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
  advanceEncounterRound,
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
  createIncidentInterruptionPayload,
  INCIDENT_TEMPLATES,
} from "./incidents";
import type { InterventionId } from "./encounter-types";

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
        if (context.runtimeState.activeEncounter.status === "paused") {
          context.runtimeState.activeEncounter.status = "active";
        }
        const previousLogLength = context.runtimeState.activeEncounter.encounterLog.length;
        advanceEncounterRound(context.runtimeState.activeEncounter);
        const active = context.runtimeState.activeEncounter;
        emitEncounterLogCues(context, active, previousLogLength);
        if (
          active.status !== "active" &&
          active.status !== "paused" &&
          active.status !== "pending"
        ) {
          const resolvedRaid = resolveRaidBossEncounter(context, active);
          pushRuntimeCue(
            context,
            active.status === "victory" ? "raid.boss.victory" : "raid.boss.failure",
          );
          if (!resolvedRaid) {
            writeEncounterOutcome(context, active);
          } else {
            context.runtimeState.worldTimeFrozen = false;
          }
          context.runtimeState.activeEncounter = null;
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
        const activeEncounter = context.runtimeState.activeEncounter;
        const resolvedRaid = resolveRaidBossEncounter(context, activeEncounter);
        pushRuntimeCue(context, "raid.boss.failure");
        if (!resolvedRaid) {
          writeEncounterOutcome(context, activeEncounter);
        } else {
          context.runtimeState.worldTimeFrozen = false;
        }
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
      }
      if (resolved?.payload?.kind === "raid_boss_commitment" && payload.choiceId === "commit") {
        startBossEncounterFromPayload(context, resolved.payload);
      }
      if (resolved?.payload?.kind === "raid_boss_commitment" && payload.choiceId === "retreat") {
        resolveRaidBossRetreat(context, resolved.payload.activeRaidId);
        pushRuntimeCue(context, "raid.boss.failure");
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
        context.runtimeState.incidentState.pendingIncident = candidate;
        const operatorNames: Record<string, string> = {};
        for (const entity of context.runtimeState.operatorEntities) {
          operatorNames[OperatorIdentity.id[entity]] = OperatorIdentity.name[entity];
        }
        const template = INCIDENT_TEMPLATES.find((t) => t.id === candidate.templateId);
        if (template) {
          const incPayload = createIncidentInterruptionPayload(candidate, template, operatorNames);
          enqueueInterruption(
            context.runtimeState.interruptionQueue,
            "incident",
            incPayload,
            "dev-menu",
            currentMinute,
          );
        }
      }
      return true;
    }
    default:
      return false;
  }
}

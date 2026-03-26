/**
 * Interruption Modal Framework
 *
 * Runtime-owned interruption system that freezes the simulation,
 * queues priority-ordered interruptions, persists gameplay-critical
 * interruptions through save/load, and hands off to typed modal adapters.
 */

// ── Interruption types ───────────────────────────────────────────────────

export type InterruptionType =
  | "settings"
  | "incident"
  | "raid_boss_commitment"
  | "announcement"
  | "warning"
  | "guidance";

export type InterruptionBlockingMode = "blocking" | "acknowledgment" | "deferrable";

export type InterruptionPersistence = "persistent" | "transient";

// ── Interruption instance ────────────────────────────────────────────────

export interface InterruptionInstance {
  instanceId: string;
  type: InterruptionType;
  priority: number;
  blockingMode: InterruptionBlockingMode;
  createdAtMinute: number;
  sourceSystem: string;
  payload: InterruptionPayload;
  dismissible: boolean;
  persistence: InterruptionPersistence;
}

// ── Typed payloads ───────────────────────────────────────────────────────

export type InterruptionPayload =
  | SettingsPayload
  | IncidentPayload
  | RaidBossCommitmentPayload
  | AnnouncementPayload
  | WarningPayload
  | GuidancePayload;

export interface SettingsPayload {
  kind: "settings";
}

export interface IncidentPayload {
  kind: "incident";
  incidentInstanceId: string;
  templateId: string;
  category: string;
  title: string;
  briefing: string;
  subjectSummary: string;
  choices: readonly IncidentChoiceView[];
  boundContext: IncidentBoundContext;
}

export interface IncidentChoiceView {
  choiceId: string;
  label: string;
  description: string;
  consequenceSummary: string;
}

export interface IncidentBoundContext {
  operatorIds: readonly string[];
  roomId?: string;
  teamId?: string;
  contractSiteId?: string;
  bossId?: string;
}

export interface RaidBossCommitmentPayload {
  kind: "raid_boss_commitment";
  activeRaidId: string;
  contractSiteId: string;
  missionId: string;
  teamId: string;
  operatorIds: readonly string[];
  bossId: string;
  bossName: string;
  bossRank: string;
  stakeSummary: string;
  teamConditionSummary: string;
}

export interface AnnouncementPayload {
  kind: "announcement";
  title: string;
  message: string;
  accent?: string;
}

export interface WarningPayload {
  kind: "warning";
  title: string;
  message: string;
  severity: "high" | "critical";
}

export interface GuidancePayload {
  kind: "guidance";
  beatId: string;
  track: string;
  title: string;
  body: string;
  subtitle?: string;
  ctaLabel: string;
  deliveryMode: string;
  milestoneOrder: number;
  totalMilestones: number;
  completionKind: string;
  fallbackBody?: string;
}

// ── Interruption queue state ─────────────────────────────────────────────

export interface InterruptionQueueState {
  active: InterruptionInstance | null;
  queue: InterruptionInstance[];
  nextInstanceId: number;
}

export function createInterruptionQueueState(): InterruptionQueueState {
  return {
    active: null,
    queue: [],
    nextInstanceId: 1,
  };
}

// ── Priority constants ───────────────────────────────────────────────────

const INTERRUPTION_PRIORITY: Record<InterruptionType, number> = {
  warning: 100,
  raid_boss_commitment: 90,
  incident: 70,
  guidance: 60,
  announcement: 50,
  settings: 10,
};

export function getDefaultPriority(type: InterruptionType): number {
  return INTERRUPTION_PRIORITY[type];
}

// ── Queue operations ─────────────────────────────────────────────────────

export function enqueueInterruption(
  state: InterruptionQueueState,
  type: InterruptionType,
  payload: InterruptionPayload,
  sourceSystem: string,
  createdAtMinute: number,
  options?: {
    priority?: number;
    blockingMode?: InterruptionBlockingMode;
    dismissible?: boolean;
    persistence?: InterruptionPersistence;
  },
): InterruptionInstance {
  const instance: InterruptionInstance = {
    instanceId: `interruption-${state.nextInstanceId++}`,
    type,
    priority: options?.priority ?? getDefaultPriority(type),
    blockingMode: options?.blockingMode ?? (type === "settings" ? "deferrable" : "blocking"),
    createdAtMinute,
    sourceSystem,
    payload,
    dismissible: options?.dismissible ?? (type === "settings" || type === "guidance"),
    persistence:
      options?.persistence ??
      (type === "settings" || type === "announcement" ? "transient" : "persistent"),
  };

  if (state.active === null) {
    state.active = instance;
  } else if (instance.priority > state.active.priority) {
    // Higher priority: preempt
    state.queue.unshift(state.active);
    state.active = instance;
  } else {
    // Insert into queue sorted by priority (descending), FIFO for equal priority
    let insertIdx = state.queue.length;
    for (let i = 0; i < state.queue.length; i++) {
      if (instance.priority > state.queue[i].priority) {
        insertIdx = i;
        break;
      }
    }
    state.queue.splice(insertIdx, 0, instance);
  }

  return instance;
}

export function resolveActiveInterruption(
  state: InterruptionQueueState,
): InterruptionInstance | null {
  const resolved = state.active;
  state.active = state.queue.shift() ?? null;
  return resolved;
}

export function dismissActiveInterruption(state: InterruptionQueueState): boolean {
  if (!state.active || !state.active.dismissible) {
    return false;
  }
  state.active = state.queue.shift() ?? null;
  return true;
}

export function hasBlockingInterruption(state: InterruptionQueueState): boolean {
  return state.active !== null && state.active.blockingMode === "blocking";
}

export function getActiveInterruption(state: InterruptionQueueState): InterruptionInstance | null {
  return state.active;
}

// ── Save/load helpers ────────────────────────────────────────────────────

export interface InterruptionQueueSnapshot {
  active: InterruptionInstance | null;
  queue: InterruptionInstance[];
  nextInstanceId: number;
}

export function snapshotInterruptionQueue(
  state: InterruptionQueueState,
): InterruptionQueueSnapshot {
  // Only persist persistent interruptions
  const filterPersistent = (inst: InterruptionInstance | null) =>
    inst && inst.persistence === "persistent" ? inst : null;

  return {
    active: filterPersistent(state.active),
    queue: state.queue.filter((inst) => inst.persistence === "persistent"),
    nextInstanceId: state.nextInstanceId,
  };
}

export function restoreInterruptionQueue(
  snapshot: InterruptionQueueSnapshot | undefined,
): InterruptionQueueState {
  if (!snapshot) {
    return createInterruptionQueueState();
  }
  return {
    active: snapshot.active,
    queue: [...snapshot.queue],
    nextInstanceId: snapshot.nextInstanceId,
  };
}

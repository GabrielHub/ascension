import { deleteStartScreenSaveSlot, listStartScreenSaveSlots } from "app/features/save-slots";
import type { RuntimeSession } from "app/features/runtime";
import type { EventLogEntry, HqViewModel, OperationsViewModel } from "app/ui/view-models";
import type { FocusPayload } from "render";
import type { SaveSlotId } from "save";

type ActiveTab = "hq" | "operations";
type HqCategory = "rooms" | "roster" | "management" | "teams" | "inventory" | "market" | null;
type OpsCategory = "contract" | "active" | "opportunities" | "history" | null;

interface BrowserDriverGuidanceState {
  activeBeatCtaLabel: string | null;
  activeBeatId: string | null;
  activeBeatTitle: string | null;
  completedBeatIds: string[];
  dismissedBeatIds: string[];
  openingPathState: string;
  openingTiming: {
    firstIncidentSeededAtMinute: number | null;
    firstRaidReturnCompletedAtMinute: number | null;
    lastTrackedContractSiteId: string | null;
    securedContractCount: number;
  };
  seenBeatIds: string[];
}

interface BrowserDriverIncidentState {
  createdAtMinute: number | null;
  instanceId: string | null;
  templateId: string | null;
}

export interface BrowserTestSnapshot {
  clock: RuntimeSession["phase1View"]["clock"];
  contracts: {
    activeRaidIds: string[];
    contractLifecycle: RuntimeSession["phase1View"]["contractLifecycle"];
    contractResult: {
      contractSiteId: string;
      outcome: "boss_defeated" | "contract_lost";
      totalRaids: number;
    } | null;
    contractSiteId: string | null;
    contractSiteName: string | null;
    postedContractIds: string[];
    postedContractNames: string[];
    raidSummaryCount: number;
  };
  eventLog: Array<{
    accent?: EventLogEntry["accent"];
    kind: EventLogEntry["kind"];
    message: string;
    targetId?: string;
    targetKind?: EventLogEntry["targetKind"];
  }>;
  guidance: BrowserDriverGuidanceState;
  incident: BrowserDriverIncidentState;
  interruption: {
    choiceLabels: string[];
    ctaLabel: string | null;
    instanceId: string;
    payloadKind: string | null;
    title: string | null;
    type: string;
  } | null;
  inventory: RuntimeSession["worldSnapshot"]["inventoryStacks"];
  navigation: {
    activeTab: ActiveTab;
    focusTargetId: string | null;
    focusTargetKind: string | null;
    hqCategory: HqCategory;
    opsCategory: OpsCategory;
  };
  resources: RuntimeSession["phase1View"]["resources"];
  roster: {
    livingOperatorIds: string[];
    operatorCapacity: number;
    operatorIds: string[];
    staffIds: string[];
    vacancyCount: number;
    visitorIds: string[];
  };
  rooms: Array<{
    id: string;
    isActive: boolean;
    isOperational: boolean;
    name: string;
    occupancy: number;
    templateId: string;
  }>;
  session: {
    isAutoTicking: boolean;
    isPaused: boolean;
    isPreview: boolean;
    isSaveBacked: boolean;
    lastSavedAt?: string;
    mode: RuntimeSession["mode"];
    persistenceError?: string;
    persistenceStatus: RuntimeSession["persistence"]["status"];
    slotId?: SaveSlotId;
    url: string;
    worldTimeFrozen: boolean;
  };
  upgrades: {
    affordableIds: string[];
    appliedIds: string[];
    building: Array<{
      id: string;
      isAffordable: boolean;
      isApplied: boolean;
      name: string;
    }>;
    rooms: Array<{
      id: string;
      isAffordable: boolean;
      isApplied: boolean;
      name: string;
      targetId: string;
    }>;
  };
}

interface BrowserDriverPayload {
  activeTab: ActiveTab;
  eventLog: readonly EventLogEntry[];
  focus: FocusPayload | null;
  hq: HqViewModel;
  hqCategory: HqCategory;
  opsCategory: OpsCategory;
  operations: OperationsViewModel;
  session: RuntimeSession;
}

declare global {
  interface Window {
    __ASCENSION_BROWSER_TEST__?: {
      getSnapshot(): BrowserTestSnapshot | null;
      listSlots(): ReturnType<typeof listStartScreenSaveSlots>;
      resetSaveSlots(): Promise<void>;
    };
  }
}

let latestSnapshot: BrowserTestSnapshot | null = null;

function readGuidanceState(session: RuntimeSession): BrowserDriverGuidanceState {
  const raw = (session.worldSnapshot as Record<string, unknown>).guidanceState;
  const data = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const openingTiming =
    data.openingTiming && typeof data.openingTiming === "object"
      ? (data.openingTiming as Record<string, unknown>)
      : {};
  const activeBeat = session.phase1View.guidance.activeBeat;

  return {
    activeBeatCtaLabel: activeBeat?.copy.ctaLabel ?? null,
    activeBeatId: typeof data.activeBeatId === "string" ? data.activeBeatId : null,
    activeBeatTitle: activeBeat?.copy.title ?? null,
    completedBeatIds: Array.isArray(data.completedBeatIds)
      ? data.completedBeatIds.filter((value): value is string => typeof value === "string")
      : [],
    dismissedBeatIds: Array.isArray(data.dismissedBeatIds)
      ? data.dismissedBeatIds.filter((value): value is string => typeof value === "string")
      : [],
    openingPathState: typeof data.openingPathState === "string" ? data.openingPathState : "unknown",
    openingTiming: {
      firstIncidentSeededAtMinute:
        typeof openingTiming.firstIncidentSeededAtMinute === "number"
          ? openingTiming.firstIncidentSeededAtMinute
          : null,
      firstRaidReturnCompletedAtMinute:
        typeof openingTiming.firstRaidReturnCompletedAtMinute === "number"
          ? openingTiming.firstRaidReturnCompletedAtMinute
          : null,
      lastTrackedContractSiteId:
        typeof openingTiming.lastTrackedContractSiteId === "string"
          ? openingTiming.lastTrackedContractSiteId
          : null,
      securedContractCount:
        typeof openingTiming.securedContractCount === "number"
          ? openingTiming.securedContractCount
          : 0,
    },
    seenBeatIds: Array.isArray(data.seenBeatIds)
      ? data.seenBeatIds.filter((value): value is string => typeof value === "string")
      : [],
  };
}

function readIncidentState(session: RuntimeSession): BrowserDriverIncidentState {
  const raw = (session.worldSnapshot as Record<string, unknown>).incidentState;
  const data = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const pendingIncident =
    data.pendingIncident && typeof data.pendingIncident === "object"
      ? (data.pendingIncident as Record<string, unknown>)
      : {};

  return {
    createdAtMinute:
      typeof pendingIncident.createdAtMinute === "number" ? pendingIncident.createdAtMinute : null,
    instanceId: typeof pendingIncident.instanceId === "string" ? pendingIncident.instanceId : null,
    templateId: typeof pendingIncident.templateId === "string" ? pendingIncident.templateId : null,
  };
}

function readInterruption(session: RuntimeSession): BrowserTestSnapshot["interruption"] {
  const interruption = session.phase1View.activeInterruption;
  if (!interruption) {
    return null;
  }

  const payload = interruption.payload as Record<string, unknown>;
  const choices = Array.isArray(payload.choices)
    ? payload.choices
        .map((choice) =>
          choice && typeof choice === "object" && typeof choice.label === "string"
            ? choice.label
            : null,
        )
        .filter((label): label is string => label !== null)
    : [];

  return {
    choiceLabels: choices,
    ctaLabel: typeof payload.ctaLabel === "string" ? payload.ctaLabel : null,
    instanceId: interruption.instanceId,
    payloadKind: typeof payload.kind === "string" ? payload.kind : null,
    title: typeof payload.title === "string" ? payload.title : null,
    type: interruption.type,
  };
}

function buildSnapshot(payload: BrowserDriverPayload): BrowserTestSnapshot {
  const { activeTab, eventLog, focus, hq, hqCategory, opsCategory, operations, session } = payload;
  const livingOperatorIds = hq.operators
    .filter((operator) => operator.lifecycle.status === "active")
    .map((operator) => operator.id);

  return {
    clock: session.phase1View.clock,
    contracts: {
      activeRaidIds: operations.activeRaids.map((raid) => raid.id),
      contractLifecycle: operations.contractLifecycle,
      contractResult: operations.contractResult
        ? {
            contractSiteId: operations.contractResult.contractSiteId,
            outcome: operations.contractResult.outcome,
            totalRaids: operations.contractResult.totalRaids,
          }
        : null,
      contractSiteId: operations.contractSite?.contractSiteId ?? null,
      contractSiteName: operations.contractSite?.siteConceptName ?? null,
      postedContractIds: operations.postedContracts.map((contract) => contract.postingId),
      postedContractNames: operations.postedContracts.map((contract) => contract.siteConceptName),
      raidSummaryCount: operations.raidHistory.length,
    },
    eventLog: eventLog.map((entry) => ({
      accent: entry.accent,
      kind: entry.kind,
      message: entry.message,
      ...(entry.targetId ? { targetId: entry.targetId } : {}),
      ...(entry.targetKind ? { targetKind: entry.targetKind } : {}),
    })),
    guidance: readGuidanceState(session),
    incident: readIncidentState(session),
    interruption: readInterruption(session),
    inventory: session.worldSnapshot.inventoryStacks.map((stack) => ({ ...stack })),
    navigation: {
      activeTab,
      focusTargetId: focus?.targetId ?? null,
      focusTargetKind: focus?.targetKind ?? null,
      hqCategory,
      opsCategory,
    },
    resources: session.phase1View.resources,
    roster: {
      livingOperatorIds,
      operatorCapacity: hq.rosterPressure.operatorCapacity,
      operatorIds: hq.operators.map((operator) => operator.id),
      staffIds: hq.staff.map((staff) => staff.id),
      vacancyCount: hq.rosterPressure.vacancyCount,
      visitorIds: hq.visitors.map((visitor) => visitor.id),
    },
    rooms: hq.rooms.map((room) => ({
      id: room.id,
      isActive: room.isActive,
      isOperational: room.isOperational,
      name: room.name,
      occupancy: room.occupancy,
      templateId: room.templateId,
    })),
    session: {
      isAutoTicking: session.isAutoTicking,
      isPaused: session.isPaused,
      isPreview: session.isPreview,
      isSaveBacked: session.isSaveBacked,
      ...(session.persistence.lastSavedAt ? { lastSavedAt: session.persistence.lastSavedAt } : {}),
      mode: session.mode,
      ...(session.persistence.errorMessage
        ? { persistenceError: session.persistence.errorMessage }
        : {}),
      persistenceStatus: session.persistence.status,
      ...(session.slotId ? { slotId: session.slotId } : {}),
      url: window.location.href,
      worldTimeFrozen: session.phase1View.worldTimeFrozen,
    },
    upgrades: {
      affordableIds: [
        ...hq.upgrades.filter((upgrade) => upgrade.isAffordable).map((upgrade) => upgrade.id),
        ...hq.roomUpgrades.filter((upgrade) => upgrade.isAffordable).map((upgrade) => upgrade.id),
      ],
      appliedIds: [
        ...hq.upgrades.filter((upgrade) => upgrade.isApplied).map((upgrade) => upgrade.id),
        ...hq.roomUpgrades.filter((upgrade) => upgrade.isApplied).map((upgrade) => upgrade.id),
      ],
      building: hq.upgrades.map((upgrade) => ({
        id: upgrade.id,
        isAffordable: upgrade.isAffordable,
        isApplied: upgrade.isApplied,
        name: upgrade.name,
      })),
      rooms: hq.roomUpgrades.map((upgrade) => ({
        id: upgrade.id,
        isAffordable: upgrade.isAffordable,
        isApplied: upgrade.isApplied,
        name: upgrade.name,
        targetId: upgrade.targetId,
      })),
    },
  };
}

export function updateBrowserTestSnapshot(payload: BrowserDriverPayload | null): void {
  if (!import.meta.env.DEV || typeof window === "undefined") {
    return;
  }

  latestSnapshot = payload ? buildSnapshot(payload) : null;
}

export function registerBrowserTestDriver(): void {
  if (!import.meta.env.DEV || typeof window === "undefined" || window.__ASCENSION_BROWSER_TEST__) {
    return;
  }

  window.__ASCENSION_BROWSER_TEST__ = {
    getSnapshot() {
      return latestSnapshot;
    },
    listSlots() {
      return listStartScreenSaveSlots();
    },
    async resetSaveSlots() {
      const slots = await listStartScreenSaveSlots();
      await Promise.all(
        slots
          .filter((slot) => slot.state === "occupied")
          .map((slot) => deleteStartScreenSaveSlot(slot.slotId)),
      );
    },
  };
}

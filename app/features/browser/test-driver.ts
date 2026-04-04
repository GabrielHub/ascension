import { deleteStartScreenSaveSlot, listStartScreenSaveSlots } from "app/features/save-slots";
import { templateRegistry } from "content/templates";
import {
  CURRENT_CONTENT_COMPATIBILITY,
  CURRENT_SAVE_SCHEMA_VERSION,
  saveStorage,
  type PersistedSaveGame,
  type SaveSlotId,
  type WorldSnapshot,
} from "save";
import type { RuntimeSession } from "app/features/runtime";
import type { EventLogEntry, HqViewModel, OperationsViewModel } from "app/ui/view-models";
import type { FocusPayload } from "render";
import {
  createAscensionSimulation,
  createBootstrapWorldSnapshot,
  createNewGameWorldSnapshot,
} from "sim";
import { createPortersUpgradeCampaignSeedWorld } from "sim/tools/porters-upgrade-campaign";
import { OPENING_BEAT_IDS } from "sim/systems/guidance-beats";

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
  building: {
    activeBuildingId: string;
    activeBuildingName: string;
    activeFloorIndex: number;
    floorCount: number;
    tier: number;
    totalRoomSlots: number;
    usedRoomSlots: number;
  };
  clock: RuntimeSession["phase1View"]["clock"];
  contracts: {
    activeRaidIds: string[];
    contractBriefing: {
      source: "briefing_room" | "briefing_room_and_prep";
      status: "briefed" | "drilled";
    } | null;
    contractLifecycle: RuntimeSession["phase1View"]["contractLifecycle"];
    contractResult: {
      contractSiteId: string;
      outcome: "mission_complete" | "boss_defeated" | "contract_lost";
      totalRaids: number;
    } | null;
    contractSiteId: string | null;
    contractSiteName: string | null;
    latestRaidSummaryFactors: string[];
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
  relocation: {
    allPrerequisitesMet: boolean;
    blockers: string[];
    completed: boolean;
    prerequisiteStates: Array<{
      current: number;
      key: string;
      met: boolean;
      target: number;
    }>;
    status: "hidden" | "in_progress" | "blocked" | "ready" | "completed";
    visible: boolean;
  };
  roster: {
    livingOperatorIds: string[];
    operatorCapacity: number;
    operatorIds: string[];
    operatorRoleTags: string[];
    staffIds: string[];
    vacancyCount: number;
    visitorIds: string[];
  };
  rooms: Array<{
    floorIndex: number;
    id: string;
    isActive: boolean;
    isOperational: boolean;
    name: string;
    occupancy: number;
    slotId: string;
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

function cloneLateBodegaOperator(
  template: NonNullable<WorldSnapshot["operators"]>[number],
  index: number,
): NonNullable<WorldSnapshot["operators"]>[number] {
  const operatorVariants = [
    {
      appearancePresetId: "mira-002",
      name: "Tessa Vale",
      roleTag: "role:scout",
      specialtyTag: "focus:extraction",
    },
    {
      appearancePresetId: "dax-008",
      name: "Marco Sun",
      roleTag: "role:field_lead",
      specialtyTag: "focus:containment",
    },
    {
      appearancePresetId: "soren-003",
      name: "Nadia Cross",
      roleTag: "role:medic",
      specialtyTag: "focus:containment",
    },
    {
      appearancePresetId: "vera-004",
      name: "Owen Pike",
      roleTag: "role:scout",
      specialtyTag: "focus:extraction",
    },
  ] as const;
  const variant = operatorVariants[index % operatorVariants.length];
  const clone = structuredClone(template);
  clone.id = `operator/late-bodega-${index + 1}`;
  clone.identity = {
    ...clone.identity,
    name: variant.name,
    roleTag: variant.roleTag,
    specialtyTag: variant.specialtyTag,
  };
  clone.appearance = {
    presetId: variant.appearancePresetId,
  };
  clone.assignment = { kind: "idle", targetId: "" };
  clone.lifecycle = { status: "active" };
  return clone;
}

function buildClosedBodegaRaidSummaries(): WorldSnapshot["raidSummaries"] {
  return Array.from({ length: 20 }, (_, index) => {
    const contractNumber = index + 1;
    return {
      id: `raid/late-bodega-${contractNumber}`,
      contractSiteId: `contract/late-bodega-${contractNumber}`,
      missionId: "mission/clearance",
      startedAt: `2026-02-${String(contractNumber).padStart(2, "0")}T18:00:00.000Z`,
      endedAt: `2026-02-${String(contractNumber).padStart(2, "0")}T20:00:00.000Z`,
      result: index % 5 === 0 ? "mixed" : "success",
      reputationDelta: index % 5 === 0 ? 3 : 5,
      cashDelta: 140 + index * 3,
      threat: 44 + (index % 4) * 6,
      intel: 58 + (index % 3) * 8,
      reward: 160 + index * 4,
      cohesion: 60 + (index % 4) * 5,
      operatorOutcomes: [],
      narrativeTags: index < 3 ? ["boss:defeated"] : [],
      intelMismatchTags: [],
      bossDefeated: index < 3,
      contributingFactors: ["phase:bodega", "promotion:ready"],
    };
  });
}

function buildCompletedOpeningGuidanceState(world: WorldSnapshot): Record<string, unknown> {
  const lastTrackedContractSiteId =
    world.raidSummaries[world.raidSummaries.length - 1]?.contractSiteId ?? null;

  return {
    seenBeatIds: [...OPENING_BEAT_IDS],
    completedBeatIds: [...OPENING_BEAT_IDS],
    dismissedBeatIds: [],
    activeBeatId: null,
    activeBeatView: null,
    queuedBeatIds: [],
    lastEvaluationMinute: 12_000,
    openingPathState: "completed",
    anchorResolutionFailures: [],
    activeBeatProgressBaseline: null,
    interactionCounts: {
      staffingActions: 12,
      upgradesPurchased: 3,
    },
    lastPurchasedUpgradeId: null,
    openingTiming: {
      firstRaidReturnCompletedAtMinute: 540,
      firstIncidentSeededAtMinute: 720,
      securedContractCount: world.raidSummaries.length,
      lastTrackedContractSiteId,
    },
  };
}

function createRelocationReadyWorld(): WorldSnapshot {
  const simulation = createAscensionSimulation(
    createBootstrapWorldSnapshot(templateRegistry),
    templateRegistry,
  );

  simulation.dispatch({ type: "sim/dev-set-resource", resourceId: "resource/cash", amount: 5000 });
  simulation.dispatch({
    type: "sim/dev-set-resource",
    resourceId: "resource/reputation",
    amount: 300,
  });
  simulation.dispatch({
    type: "sim/purchase-building-upgrade",
    upgradeId: "upgrade/building/bodega:frontage",
  });
  simulation.dispatch({
    type: "sim/purchase-building-upgrade",
    upgradeId: "upgrade/building/bodega:annex",
  });
  simulation.dispatch({
    type: "sim/place-room",
    templateId: "room/back_office:tier_1",
    floorIndex: 0,
    slotId: "slot/back-room-right",
  });
  simulation.dispatch({
    type: "sim/place-room",
    templateId: "room/backstock:tier_1",
    floorIndex: 0,
    slotId: "slot/storage-left",
  });
  simulation.dispatch({
    type: "sim/purchase-building-upgrade",
    upgradeId: "upgrade/building/bodega:extension",
  });
  simulation.dispatch({
    type: "sim/place-room",
    templateId: "room/alley_staging:tier_1",
    floorIndex: 0,
    slotId: "slot/storage-right",
  });

  const upgradedWorld = structuredClone(simulation.getWorldSnapshot());
  const baseOperators = upgradedWorld.operators ?? [];
  const extraOperators = baseOperators
    .slice(0, 4)
    .map((operator, index) => cloneLateBodegaOperator(operator, index));

  upgradedWorld.guild.treasury = 1400;
  upgradedWorld.guild.reputation = 55;
  upgradedWorld.building.activeBuildingTier = 4;
  upgradedWorld.building.roomSlotCount = 7;
  upgradedWorld.building.operatorSlotCount = 10;
  upgradedWorld.operators = [...baseOperators, ...extraOperators];
  upgradedWorld.operatorDispositions = [
    ...(upgradedWorld.operatorDispositions ?? []),
    ...extraOperators.map((operator, index) => ({
      operatorId: operator.id,
      sociability: 52 + index * 4,
      temperament: 55 - index * 3,
      grievanceLevel: 8,
      satisfactionLevel: 68,
    })),
  ];
  upgradedWorld.visitors = [];
  upgradedWorld.raidSummaries = buildClosedBodegaRaidSummaries();
  upgradedWorld.guidanceState = buildCompletedOpeningGuidanceState(upgradedWorld);
  upgradedWorld.activeRaidPackets = [];
  upgradedWorld.contractSite = null;
  upgradedWorld.contractResult = null;
  upgradedWorld.contractLifecycle = "bidding";
  upgradedWorld.fogOfWar = null;
  upgradedWorld.activeEncounter = null;
  upgradedWorld.interruptionQueue = null;
  upgradedWorld.incidentState = null;

  return createAscensionSimulation(upgradedWorld, templateRegistry).getWorldSnapshot();
}

async function seedRelocationReadySave(slotId: SaveSlotId): Promise<void> {
  const world = createRelocationReadyWorld();
  const timestamp = new Date().toISOString();
  const save: PersistedSaveGame = {
    slotId,
    schemaVersion: CURRENT_SAVE_SCHEMA_VERSION,
    compatibilityVersion: CURRENT_CONTENT_COMPATIBILITY,
    metadata: {
      guildName: world.guild.guildName,
      playerName: world.guild.playerName,
      createdAt: timestamp,
      lastPlayedAt: timestamp,
    },
    world,
  };

  await saveStorage.writeSaveGame(save);
}

async function seedPortersUpgradeCampaignSave(slotId: SaveSlotId): Promise<void> {
  const world = createPortersUpgradeCampaignSeedWorld();
  const timestamp = new Date().toISOString();
  const save: PersistedSaveGame = {
    slotId,
    schemaVersion: CURRENT_SAVE_SCHEMA_VERSION,
    compatibilityVersion: CURRENT_CONTENT_COMPATIBILITY,
    metadata: {
      guildName: world.guild.guildName,
      playerName: world.guild.playerName,
      createdAt: timestamp,
      lastPlayedAt: timestamp,
    },
    world,
  };

  await saveStorage.writeSaveGame(save);
}

async function seedNewGameSave(slotId: SaveSlotId, seed: number): Promise<void> {
  const world = createNewGameWorldSnapshot(templateRegistry, undefined, { seed });
  const timestamp = new Date().toISOString();
  const save: PersistedSaveGame = {
    slotId,
    schemaVersion: CURRENT_SAVE_SCHEMA_VERSION,
    compatibilityVersion: CURRENT_CONTENT_COMPATIBILITY,
    metadata: {
      guildName: world.guild.guildName,
      playerName: world.guild.playerName,
      createdAt: timestamp,
      lastPlayedAt: timestamp,
    },
    world,
  };

  await saveStorage.writeSaveGame(save);
}

declare global {
  interface Window {
    __ASCENSION_BROWSER_TEST__?: {
      getSnapshot(): BrowserTestSnapshot | null;
      listSlots(): ReturnType<typeof listStartScreenSaveSlots>;
      resetSaveSlots(): Promise<void>;
      seedNewGameSave(slotId?: SaveSlotId, seed?: number): Promise<void>;
      seedRelocationReadySave(slotId?: SaveSlotId): Promise<void>;
      seedPortersUpgradeCampaignSave(slotId?: SaveSlotId): Promise<void>;
    };
  }
}

let latestSnapshot: BrowserTestSnapshot | null = null;
let latestSnapshotSource: BrowserDriverPayload | null = null;

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
    building: {
      activeBuildingId: hq.building.id,
      activeBuildingName: hq.building.name,
      activeFloorIndex: hq.building.activeFloorIndex,
      floorCount: hq.building.floorCount,
      tier: hq.building.tier,
      totalRoomSlots: hq.building.totalRoomSlots,
      usedRoomSlots: hq.building.usedRoomSlots,
    },
    clock: session.phase1View.clock,
    contracts: {
      activeRaidIds: operations.activeRaids.map((raid) => raid.id),
      contractBriefing: operations.contractSite?.briefing
        ? {
            source: operations.contractSite.briefing.source,
            status: operations.contractSite.briefing.status,
          }
        : null,
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
      latestRaidSummaryFactors:
        operations.raidHistory[operations.raidHistory.length - 1]?.contributingFactors ?? [],
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
    relocation: (() => {
      if (hq.building.id !== "building/bodega") {
        return {
          allPrerequisitesMet: true,
          blockers: [],
          completed: true,
          prerequisiteStates: [],
          status: "completed" as const,
          visible: false,
        };
      }

      if (!hq.relocationGate) {
        return {
          allPrerequisitesMet: false,
          blockers: [],
          completed: false,
          prerequisiteStates: [],
          status: "hidden" as const,
          visible: false,
        };
      }

      return {
        allPrerequisitesMet: hq.relocationGate.allPrerequisitesMet,
        blockers: hq.relocationGate.blockers.map((blocker) => blocker.reason),
        completed: false,
        prerequisiteStates: hq.relocationGate.prerequisites.map((prerequisite) => ({
          current: prerequisite.current,
          key: prerequisite.key,
          met: prerequisite.met,
          target: prerequisite.target,
        })),
        status:
          hq.relocationGate.allPrerequisitesMet && hq.relocationGate.blockers.length === 0
            ? ("ready" as const)
            : hq.relocationGate.allPrerequisitesMet
              ? ("blocked" as const)
              : ("in_progress" as const),
        visible: hq.relocationGate.visible,
      };
    })(),
    roster: {
      livingOperatorIds,
      operatorCapacity: hq.rosterPressure.operatorCapacity,
      operatorIds: hq.operators.map((operator) => operator.id),
      operatorRoleTags: hq.operators.map((operator) => operator.roleTag),
      staffIds: hq.staff.map((staff) => staff.id),
      vacancyCount: hq.rosterPressure.vacancyCount,
      visitorIds: hq.visitors.map((visitor) => visitor.id),
    },
    rooms: hq.rooms.map((room) => ({
      floorIndex: room.floorIndex,
      id: room.id,
      isActive: room.isActive,
      isOperational: room.isOperational,
      name: room.name,
      occupancy: room.occupancy,
      slotId: room.slotId,
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

  latestSnapshotSource = payload;
  if (!payload) {
    latestSnapshot = null;
  }
}

export function registerBrowserTestDriver(): void {
  if (!import.meta.env.DEV || typeof window === "undefined" || window.__ASCENSION_BROWSER_TEST__) {
    return;
  }

  window.__ASCENSION_BROWSER_TEST__ = {
    getSnapshot() {
      if (latestSnapshotSource) {
        latestSnapshot = buildSnapshot(latestSnapshotSource);
        latestSnapshotSource = null;
      }
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
    async seedRelocationReadySave(slotId = "slot/1") {
      await seedRelocationReadySave(slotId);
    },
    async seedPortersUpgradeCampaignSave(slotId = "slot/1") {
      await seedPortersUpgradeCampaignSave(slotId);
    },
    async seedNewGameSave(slotId = "slot/1", seed = 1) {
      await seedNewGameSave(slotId, seed);
    },
  };
}

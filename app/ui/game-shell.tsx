import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "react-router";

import {
  createAudioEngine,
  selectMusicState,
  type AudioEngine,
  type AudioEngineState,
} from "app/features/audio";
import { updateBrowserTestSnapshot } from "app/features/browser/test-driver";
import { useGameSettings } from "app/features/settings";
import {
  parseRuntimeRouteRequest,
  useRuntimeSession,
  type RuntimeRouteRequest,
  type RuntimeSession,
} from "app/features/runtime";
import { useScreenWakeLock } from "app/features/runtime/use-screen-wake-lock";
import { HqWorldCanvas } from "render";
import {
  hasConsumableInventory,
  type EncounterActionRecord,
  type EncounterStatus,
  type InterventionId,
} from "sim";
import { getPolicyOptionLabel, type PolicyState } from "lib/policies";
import type {
  FocusPayload,
  HqDebugOverlays,
  HqWorldSnapshot,
  RaidWorldSnapshot,
  WorldEffectsSnapshot,
} from "render";

import { DevConsole } from "./dev-menu";
import { EventLog } from "./event-log";
import { HqPanel } from "./hq-panel";
import { InventoryPanel } from "./inventory-panel";
import { ManagementPanel } from "./management-panel";
import { MarketPanel } from "./market-panel";
import { OperatorPortrait } from "./operator-portrait";
import { OperatorCombatSummary } from "./operator-combat-summary";
import { RoomCultureBadges, RoomDetailPanel, RoomUpgradesBody } from "./room-detail-panel";
import {
  ActiveRootBody,
  ContractReviewBody,
  ContractSiteBody,
  ContractsRootBody,
  HistoryRootBody,
  OpportunitiesRootBody,
  OpportunityDetailBody,
  PostingBoardBody,
  PostingDetailBody,
  RaidSummaryDetailBody,
  TeamDetailBody,
} from "./operations-panels";
import { RaidWorldView } from "./raid-world-view";
import { RosterPanel } from "./roster-panel";
import { SettingsModal } from "./settings-modal";
import { StatBar } from "./_stat-bar";
import { Tooltip } from "./_tooltip";
import { PanelFrame, PanelStack, type PanelStackEntry } from "./_panel-stack";
import {
  categoryFromStack as hqCategoryFromStack,
  closeAt as hqCloseAt,
  effectiveFocusFromStack as hqEffectiveFocusFromStack,
  rootEntryForCategory as hqRootEntryForCategory,
  setBranchAt as hqSetBranchAt,
  stackFromFocus as hqStackFromFocus,
  type HqCategory,
  type StackFocusEntry,
} from "./_hq-focus-stack";
import {
  categoryFromStack as opsCategoryFromStack,
  closeAt as opsCloseAt,
  effectiveFocusFromStack as opsEffectiveFocusFromStack,
  rootEntryForCategory as opsRootEntryForCategory,
  setBranchAt as opsSetBranchAt,
  stackFromFocus as opsStackFromFocus,
  type OpsCategory,
  type OpsStackEntry,
} from "./_ops-focus-stack";
import { useEventLog } from "./use-event-log";
import {
  getRecoveryStateSummary,
  getRetentionPressureLine,
  getRosterFlowSurfaceSummary,
} from "./policy-summaries";
import { InterruptionHost } from "./interruption-host";
import { EncounterSurface } from "./encounter-surface";
import { GuidanceHost } from "./guidance-host";
import { AnchorRegistryProvider, useAnchorRegistry, useGuidanceAnchor } from "./guidance-anchor";
import { getCultureSummaryLabel, getRoleMeta, getSpecialtyMeta } from "./_glossary";
import {
  emptyStateClass,
  emptyStateIconClass,
  glassPanelClass,
  progressBarFillClass,
  tabButtonClass,
} from "./styles";
import {
  buildCityPressureView,
  buildEquipmentViewModels,
  buildHqViewFromPhase1,
  buildInventoryViewModels,
  buildLootAutomationViewModel,
  buildMarketItemViewModels,
  buildOpsViewFromPhase1,
  buildRoomCultureViewModels,
  buildTeamViewModels,
  enrichOperatorsWithAutonomy,
} from "./view-models";
import type {
  EquipmentViewModel,
  EventLogEntry,
  GameCallbacks,
  InventoryItemViewModel,
  LootAutomationViewModel,
  MarketItemViewModel,
  OperationsViewModel,
  OperatorViewModel,
  RelationshipViewModel,
  RoomCultureViewModel,
  RoomViewModel,
  RosterPressureViewModel,
  TeamViewModel,
  UpgradeViewModel,
  VisitorViewModel,
} from "./view-models";
import type { FocusOperatorStatus } from "./raid-world/raid-focus-frame";

/** Build context-aware world effects with focus dimming. */
function buildContextEffects(
  base: WorldEffectsSnapshot,
  context: "hq" | "raid",
  hasFocus: boolean,
): WorldEffectsSnapshot {
  return {
    ...base,
    ambientTint: context === "raid" ? "rgba(26, 36, 64, 0.06)" : "rgba(200, 168, 76, 0.03)",
    focusDimAlpha: hasFocus ? 0.35 : 0,
  };
}

type ShellTab = "hq" | "operations";
type ActiveGameModal = "settings" | null;

type ShellNavigationState = {
  activeTab: ShellTab;
  hqCategory: HqCategory | null;
  opsCategory: OpsCategory | null;
};

const TAB_LABELS: Record<ShellTab, string> = {
  hq: "Headquarters",
  operations: "Operations",
};

const TAB_ORDER: readonly ShellTab[] = ["hq", "operations"];

// Manual advancement stays aligned with the simulation's hour-based tick contract.
const TICK_HOUR_MS = 60 * 60 * 1000;
const PORTERS_FLOOR_LABELS: Record<number, string> = { 0: "Ground", 1: "Upper", 2: "Waterfront" };
const SKYSCRAPER_FLOOR_LABELS: Record<number, string> = {
  0: "Lobby",
  1: "Ops",
  2: "Recovery",
  3: "Logistics",
  5: "Nightlife",
  6: "Training",
  7: "Executive",
  8: "Penthouse",
  4: "Rooftop",
};
const PERSISTENT_GUIDANCE_COMPLETION_KINDS = new Set([
  "incident_resolved",
  "boss_commitment_resolved",
]);

export function isTutorialSuppressibleGuidanceBeat(
  beat: { completionKind: string } | null | undefined,
): boolean {
  if (!beat) {
    return false;
  }

  return !PERSISTENT_GUIDANCE_COMPLETION_KINDS.has(beat.completionKind);
}

type GuidanceBeatSnapshot = RuntimeSession["phase1View"]["guidance"]["activeBeat"];

export function isFocusedGuidanceBeatSuspended(
  beat: Pick<NonNullable<GuidanceBeatSnapshot>, "deliveryMode"> | null | undefined,
  activeInterruption: RuntimeSession["phase1View"]["activeInterruption"],
  hasActiveEncounter: boolean,
): boolean {
  if (!beat || beat.deliveryMode !== "focused") {
    return false;
  }

  return (
    hasActiveEncounter || (activeInterruption !== null && activeInterruption.type !== "guidance")
  );
}

export function getDefaultShellNavigation(request: RuntimeRouteRequest): ShellNavigationState {
  if (request.mode === "preview") {
    return {
      activeTab: "hq",
      hqCategory: "rooms",
      opsCategory: "contract",
    };
  }

  return {
    activeTab: "operations",
    hqCategory: "rooms",
    opsCategory: "contract",
  };
}

export async function resolveInterruptionAction(
  session: Pick<RuntimeSession, "commands">,
  activeInterruption: RuntimeSession["phase1View"]["activeInterruption"],
  instanceId: string,
  choiceId: string | undefined,
  isDevMode: boolean,
): Promise<void> {
  const startPausedForDebug =
    isDevMode &&
    activeInterruption?.type === "raid_boss_commitment" &&
    activeInterruption.payload.kind === "raid_boss_commitment" &&
    choiceId === "commit" &&
    activeInterruption.sourceSystem === "dev-menu";
  await session.commands.dispatch({ type: "sim/interruption-resolve", instanceId, choiceId });

  if (startPausedForDebug) {
    await session.commands.dispatch({ type: "sim/encounter-pause" });
  }
}

// ── Category definitions ─────────────────────────────────────────────────

const HQ_CATEGORIES: readonly { id: HqCategory; label: string; icon: string }[] = [
  { id: "rooms", label: "Rooms", icon: "\u25A3" },
  { id: "roster", label: "Roster", icon: "\u2616" },
  { id: "management", label: "Management", icon: "\u2696" },
  { id: "teams", label: "Teams", icon: "\u2689" },
  { id: "inventory", label: "Inventory", icon: "\u25A8" },
  { id: "market", label: "Market", icon: "\u25C8" },
];

export function buildGameCallbacks(
  session: Pick<RuntimeSession, "commands"> | null,
): GameCallbacks | null {
  if (!session) {
    return null;
  }

  return {
    tick: (deltaMs: number) => {
      void session.commands.tick(deltaMs);
    },
    setPolicy: (policyId, value) => {
      void session.commands.setPolicy({ policyId, value });
    },
    setLootFilterEnabled: (enabled: boolean) => {
      void session.commands.setLootFilter({ enabled });
    },
    initiateRelocation: () => {
      void session.commands.initiateRelocation();
    },
    purchaseBuildingUpgrade: (upgradeId: string) => {
      void session.commands.purchaseBuildingUpgrade({ upgradeId });
    },
    purchaseRoomUpgrade: (roomId: string, upgradeId: string) => {
      void session.commands.purchaseRoomUpgrade({ roomId, upgradeId });
    },
    acceptRecruit: (visitorId: string) => {
      void session.commands.acceptRecruit({ visitorId });
    },
    deferRecruit: (visitorId: string) => {
      void session.commands.deferRecruit({ visitorId });
    },
    rejectRecruit: (visitorId: string) => {
      void session.commands.rejectRecruit({ visitorId });
    },
    replaceRecruit: (visitorId: string, operatorId: string) => {
      void session.commands.replaceRecruit({ visitorId, operatorId });
    },
    dismissRecruit: (visitorId: string) => {
      void session.commands.dismissRecruit({ visitorId });
    },
    placeRoom: (templateId: string, floorIndex: number, slotId: string) => {
      void session.commands.placeRoom({ templateId, floorIndex, slotId });
    },
    setActiveFloor: (floorIndex: number) => {
      void session.commands.setActiveFloor({ floorIndex });
    },
    buyItem: (itemId: string) => {
      void session.commands.buyItem({ itemId });
    },
    sellItem: (itemId: string, quantity: number) => {
      void session.commands.sellItem({ itemId, quantity });
    },
    equipItem: (
      operatorId: string,
      slot: "weapon" | "outfitOverlay" | "accessory",
      itemId: string,
    ) => {
      void session.commands.equipItem({ operatorId, slot, itemId });
    },
    autoAssignAccessory: (operatorId: string) => {
      void session.commands.autoAssignAccessory({ operatorId });
    },
    unequipItem: (operatorId: string, slot: "weapon" | "outfitOverlay" | "accessory") => {
      void session.commands.unequipItem({ operatorId, slot });
    },
    bidContract: (postingId: string) => {
      void session.commands.dispatch({ type: "sim/bid-contract", postingId });
    },
    advanceContract: () => {
      void session.commands.dispatch({ type: "sim/advance-contract" });
    },
    prepConsumable: (recipeId: string) => {
      void session.commands.prepConsumable({ recipeId });
    },
    craftDurable: (recipeId: string) => {
      void session.commands.craftDurable({ recipeId });
    },
  };
}

const OPS_CATEGORIES: readonly { id: OpsCategory; label: string; icon: string }[] = [
  { id: "contract", label: "Contract", icon: "\u2691" },
  { id: "active", label: "Active Ops", icon: "\u2694" },
  { id: "opportunities", label: "Opportunities", icon: "\u2606" },
  { id: "history", label: "History", icon: "\u2630" },
];

// ── Pill button ──────────────────────────────────────────────────────────

function CategoryPill({
  label,
  icon,
  isActive,
  onClick,
  testId,
}: {
  label: string;
  icon: string;
  isActive: boolean;
  onClick: () => void;
  testId?: string;
}) {
  return (
    <button
      type="button"
      data-testid={testId}
      data-active={isActive}
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium tracking-[0.06em] transition-all duration-200 ${
        isActive
          ? "bg-[rgba(200,168,76,0.12)] text-gold border border-[rgba(200,168,76,0.25)] shadow-[0_0_8px_rgba(200,168,76,0.1)]"
          : "bg-[rgba(6,6,8,0.4)] text-silver/60 border border-[rgba(200,168,76,0.06)] hover:text-silver/80 hover:border-[rgba(200,168,76,0.12)]"
      }`}
      onClick={onClick}
    >
      <span className="text-xs">{icon}</span>
      {label}
    </button>
  );
}

// ── Shared sub-components ────────────────────────────────────────────────

function ResourceCounter({
  label,
  value,
  accent,
  tip,
  valueTestId,
}: {
  label: string;
  value: number | string;
  accent?: boolean;
  tip?: string;
  valueTestId?: string;
}) {
  const inner = (
    <div className="flex items-baseline gap-1.5">
      <span className="text-xs font-medium uppercase tracking-[0.18em] text-gold/70">{label}</span>
      <span
        data-testid={valueTestId}
        className={`font-[family-name:var(--font-display)] text-[0.85rem] font-light tabular-nums ${
          accent ? "text-gold" : "text-silver-bright"
        }`}
      >
        {value}
      </span>
    </div>
  );

  return tip ? <Tooltip content={tip}>{inner}</Tooltip> : inner;
}

function formatPersistenceTimestamp(timestamp: string | undefined): string | null {
  if (!timestamp) {
    return null;
  }

  const date = new Date(timestamp);
  if (Number.isNaN(date.valueOf())) {
    return null;
  }

  return date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDebugClock(timestamp: number): string {
  return new Date(timestamp).toISOString();
}

function getEncounterDebugEntryKey(entry: EncounterActionRecord): string {
  return [
    entry.timestamp,
    entry.round,
    entry.actorId,
    entry.actionKind,
    entry.abilityId,
    entry.targetIds.join(","),
  ].join("|");
}

function summarizeEncounterDebugEntry(entry: EncounterActionRecord): string {
  const targets = entry.targetIds.length > 0 ? ` -> ${entry.targetIds.join(", ")}` : "";
  const effects =
    entry.effects.length > 0
      ? ` | ${entry.effects
          .map((effect) => {
            const suffix = effect.blocked
              ? "blocked"
              : effect.statusApplied
                ? `${effect.effectKind}:${effect.statusApplied}`
                : effect.statusRemoved
                  ? `${effect.effectKind}:${effect.statusRemoved}`
                  : `${effect.effectKind}:${effect.value}`;
            return `${effect.targetId}:${suffix}`;
          })
          .join(", ")}`
      : "";
  return `r${entry.round} ${entry.actionKind} ${entry.actorId}${targets}${effects}`;
}

function LoadingShell() {
  return (
    <div className="flex min-h-dvh items-center justify-center">
      <div className="animate-enter text-center">
        <div className="mx-auto mb-6 h-px w-16 bg-gradient-to-r from-transparent via-gold/40 to-transparent" />
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-extralight tracking-[0.3em] text-gold/80">
          ascension
        </h1>
        <p className="mt-4 text-xs font-medium uppercase tracking-[0.2em] text-gold/70">
          Initializing
        </p>
        <div className="mx-auto mt-6 h-0.5 w-32 overflow-hidden rounded-full bg-void">
          <div className={`${progressBarFillClass} w-2/3`} />
        </div>
      </div>
    </div>
  );
}

function ErrorShell({ message }: { message: string }) {
  return (
    <div className="flex min-h-dvh items-center justify-center px-6">
      <div className="animate-enter max-w-md text-center">
        <div className="mx-auto mb-5 flex h-10 w-10 items-center justify-center rounded-full border border-danger/30 bg-danger/10">
          <span className="text-sm text-danger">!</span>
        </div>
        <h1 className="font-[family-name:var(--font-display)] text-lg font-light text-silver-bright">
          Session unavailable
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-silver/60">{message}</p>
        <Link to="/" className="btn-primary mt-6">
          Return to start
        </Link>
      </div>
    </div>
  );
}

function FocusedOperatorOverlay({
  operator,
  policies,
  relationships,
  teams,
  roomCultures,
  onDismiss,
}: {
  operator: OperatorViewModel;
  policies: PolicyState;
  relationships: readonly RelationshipViewModel[];
  teams: readonly TeamViewModel[];
  roomCultures: readonly RoomCultureViewModel[];
  onDismiss: () => void;
}) {
  const recoverySummary = getRecoveryStateSummary(operator, policies);
  const retentionLine =
    operator.retentionRisk || operator.lifecycle.status === "departed"
      ? getRetentionPressureLine(policies.rosterFlow, operator.lifecycle.status)
      : null;
  const operatorTeam = teams.find((team) => team.memberIds.includes(operator.id)) ?? null;
  const assignedRoomCulture =
    operator.assignmentKind === "room" && operator.assignmentTargetId
      ? (roomCultures.find((rc) => rc.roomId === operator.assignmentTargetId) ?? null)
      : null;
  const bonds = relationships.filter(
    (r) => r.operatorAId === operator.id || r.operatorBId === operator.id,
  );

  return (
    <div className="glass-card pointer-events-auto animate-enter flex h-full max-h-full w-full min-h-0 flex-col overflow-hidden">
      <div className="flex items-start justify-between gap-3 border-b border-[rgba(200,168,76,0.08)] p-4 pb-3">
        <div className="flex items-start gap-3">
          <OperatorPortrait
            name={operator.name}
            roleTag={operator.roleTag}
            presetId={operator.appearancePresetId}
            size="detail"
          />
          <div className="min-w-0">
            <h3 className="truncate text-sm font-medium text-silver-bright">{operator.name}</h3>
            <p className="mt-0.5 text-sm uppercase tracking-[0.12em] text-gold/70">
              {getRoleMeta(operator.roleTag).label}
            </p>
            {operator.specialtyTag && (
              <p className="mt-0.5 text-sm text-silver/60">
                {getSpecialtyMeta(operator.specialtyTag).label}
              </p>
            )}
            {operator.availableForRaid && (
              <Tooltip content="Healthy and unassigned — can join a raid" side="top">
                <span className="mt-1 inline-block text-sm text-gold/70">Raid-ready</span>
              </Tooltip>
            )}
          </div>
        </div>
        <button
          type="button"
          className="btn-ghost shrink-0 px-1.5 py-1 text-sm leading-none text-silver/50 hover:text-gold"
          onClick={onDismiss}
          aria-label="Close"
        >
          &times;
        </button>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        <div className="grid grid-cols-2 gap-2 text-xs">
          <Tooltip content="What this operator wants to do right now">
            <div className="glass-card-inset p-2">
              <p className="uppercase tracking-[0.12em] text-gold/60">Intent</p>
              <p className="mt-1 text-sm text-silver-bright">{operator.intent}</p>
            </div>
          </Tooltip>
          <Tooltip content="Overall combat readiness score">
            <div className="glass-card-inset p-2">
              <p className="uppercase tracking-[0.12em] text-gold/60">Readiness</p>
              <p className="mt-1 text-sm tabular-nums text-silver-bright">
                {Math.round(operator.readinessScore)}
              </p>
            </div>
          </Tooltip>
        </div>

        <div className="space-y-2">
          <StatBar
            label="Morale"
            value={Math.round(operator.moraleCurrent)}
            max={100}
            tip="How the operator feels. Low morale risks refusal or departure"
          />
          <StatBar
            label="Loyalty"
            value={Math.round(operator.loyaltyCurrent)}
            max={100}
            tip="Commitment to the team. Low loyalty increases quit risk"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 text-sm text-silver/60">
          <Tooltip content="Physical tiredness. Builds on duty, recovers at rest" side="top">
            <span>Fatigue {Math.round(operator.needFatigue)}</span>
          </Tooltip>
          <span className="opacity-30">&middot;</span>
          <Tooltip content="Mental strain. Reduces effectiveness when high" side="top">
            <span>Stress {Math.round(operator.needStress)}</span>
          </Tooltip>
          {operator.injurySeverity > 0 && (
            <>
              <span className="opacity-30">&middot;</span>
              <Tooltip content="Time remaining until fully recovered" side="top">
                <span className="text-ember">
                  Injured ({Math.ceil(operator.injuryRecoveryHours)}h)
                </span>
              </Tooltip>
            </>
          )}
        </div>

        {(operator.refusalRisk || operator.quitRisk || operator.retentionRisk) &&
          operator.autonomyReasons.length > 0 && (
            <div className="space-y-1">
              {operator.autonomyReasons.map((reason) => (
                <div
                  key={reason}
                  className={`flex items-center gap-1.5 rounded px-2 py-1 text-sm shadow-[inset_2px_0_0_currentColor] ${
                    operator.quitRisk ? "bg-magma/8 text-magma" : "bg-ember/8 text-ember"
                  }`}
                >
                  {reason}
                </div>
              ))}
            </div>
          )}

        {recoverySummary && (
          <div className="glass-card-inset space-y-1.5 px-2 py-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs uppercase tracking-[0.12em] text-gold/55">
                {recoverySummary.statusLabel}
              </span>
              <span className="text-xs text-ember">
                {getPolicyOptionLabel("recoveryTriage", policies.recoveryTriage)}
              </span>
            </div>
            <p className="text-sm leading-relaxed text-silver/60">{recoverySummary.reason}</p>
            {recoverySummary.policyLines.map((line) => (
              <p key={line} className="text-sm leading-relaxed text-gold/70">
                {line}
              </p>
            ))}
          </div>
        )}

        {retentionLine && (
          <div className="glass-card-inset px-2 py-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs uppercase tracking-[0.12em] text-gold/50">
                Retention Pressure
              </span>
              <span className="text-xs text-ember">
                {getPolicyOptionLabel("rosterFlow", policies.rosterFlow)}
              </span>
            </div>
            <p className="mt-0.5 text-sm leading-relaxed text-silver/60">{retentionLine}</p>
          </div>
        )}

        <div className="glass-card-inset px-2 py-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs uppercase tracking-[0.12em] text-gold/50">
              Training Readiness
            </span>
            <span className="text-sm text-gold">
              {operator.training.statusLabel} ({operator.training.average})
            </span>
          </div>
          <div className="mt-1 flex flex-wrap gap-2 text-sm text-silver/55">
            <span>STR +{operator.training.bonuses.strength}</span>
            <span>SPD +{operator.training.bonuses.speed}</span>
            <span>END +{operator.training.bonuses.endurance}</span>
            <span>RES +{operator.training.bonuses.resilience}</span>
          </div>
        </div>

        <div className="border-t border-[rgba(200,168,76,0.06)] pt-3">
          <OperatorCombatSummary combat={operator.combat} title="Field Kit" />
        </div>

        {operatorTeam && (
          <div className="glass-card-inset px-2 py-1.5">
            <div className="text-xs uppercase tracking-[0.12em] text-gold/50">Team</div>
            <div className="mt-0.5 text-sm text-silver/60">{operatorTeam.statusSummary}</div>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-silver/50">
              <span>{operatorTeam.memberNames.join(", ")}</span>
              <span className="opacity-30">&middot;</span>
              <Tooltip content="Team coordination. Builds through shared missions" side="top">
                <span>Cohesion {Math.round(operatorTeam.cohesion)}</span>
              </Tooltip>
            </div>
            {operatorTeam.explanationReasons.slice(0, 2).map((reason) => (
              <div key={reason} className="mt-1 text-sm text-silver/50">
                {reason}
              </div>
            ))}
          </div>
        )}

        {assignedRoomCulture && (
          <div className="glass-card-inset px-2 py-1.5">
            <div className="text-xs uppercase tracking-[0.12em] text-gold/50">
              Room: {assignedRoomCulture.roomName}
            </div>
            <div className="mt-0.5 text-sm text-silver/55">
              {getCultureSummaryLabel(assignedRoomCulture.summary)}
            </div>
            <RoomCultureBadges
              culture={assignedRoomCulture}
              className="mt-1 flex flex-wrap gap-1"
            />
          </div>
        )}

        {bonds.length > 0 && (
          <div>
            <Tooltip content="Interpersonal relationships formed through shared work" side="top">
              <div className="mb-1 text-sm uppercase tracking-[0.12em] text-gold/50">Bonds</div>
            </Tooltip>
            {bonds.map((rel) => {
              const partnerName =
                rel.operatorAId === operator.id ? rel.operatorBName : rel.operatorAName;
              const cohesion =
                rel.cohesion >= 50
                  ? {
                      label: "Strong",
                      className: "text-gold/70",
                      tip: "Close bond — strong mutual trust",
                    }
                  : rel.cohesion >= 20
                    ? {
                        label: "Fair",
                        className: "text-silver/50",
                        tip: "Developing bond — building rapport",
                      }
                    : {
                        label: "Fragile",
                        className: "text-ember",
                        tip: "Fragile bond — may weaken further",
                      };
              return (
                <div
                  key={`${rel.operatorAId}-${rel.operatorBId}`}
                  className="flex items-center justify-between py-0.5 text-sm"
                >
                  <span className="text-silver/70">{partnerName}</span>
                  <Tooltip content={cohesion.tip} side="top">
                    <span className={cohesion.className}>{cohesion.label}</span>
                  </Tooltip>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function FocusedRoomOverlay({
  guildName,
  room,
  buildingUpgrades,
  roomUpgrades,
  callbacks,
  roomCulture,
  onDismiss,
  onOpenUpgrades,
}: {
  guildName: string;
  room: RoomViewModel;
  buildingUpgrades: readonly UpgradeViewModel[];
  roomUpgrades: readonly UpgradeViewModel[];
  callbacks: GameCallbacks;
  roomCulture: RoomCultureViewModel | null;
  onDismiss: () => void;
  onOpenUpgrades?: () => void;
}) {
  return (
    <div className="glass-card pointer-events-auto animate-enter flex h-full max-h-full w-full min-h-0 flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto px-5 py-4">
        <RoomDetailPanel
          guildName={guildName}
          room={room}
          buildingUpgrades={buildingUpgrades}
          roomUpgrades={roomUpgrades}
          callbacks={callbacks}
          roomCulture={roomCulture}
          onClose={onDismiss}
          onOpenUpgrades={onOpenUpgrades}
        />
      </div>
    </div>
  );
}

// ── Visitor recruitment card ──────────────────────────────────────────────

function FocusedVisitorOverlay({
  visitor,
  policies,
  rosterFull,
  onRecruit,
  onDeferVisitor,
  onDismissVisitor,
  onOpenReplacePicker,
  onDismissRecruit,
  onClose,
}: {
  visitor: VisitorViewModel;
  policies: PolicyState;
  rosterFull: boolean;
  onRecruit: () => void;
  onDeferVisitor: () => void;
  onDismissVisitor: () => void;
  onOpenReplacePicker: () => void;
  onDismissRecruit: () => void;
  onClose: () => void;
}) {
  const patienceMinutes = Math.max(0, Math.ceil(visitor.patience));
  const patienceHours = Math.floor(patienceMinutes / 60);
  const patienceRemainder = patienceMinutes % 60;
  const patienceDisplay =
    patienceHours > 0 ? `${patienceHours}h ${patienceRemainder}m` : `${patienceRemainder}m`;
  const patienceFraction = Math.max(0, Math.min(1, visitor.patience / 120));
  const patienceUrgent = patienceFraction <= 0.25;
  const rosterFlowSummary = getRosterFlowSurfaceSummary(policies.rosterFlow);
  const personaHooks = visitor.personaHooks ?? [];

  return (
    <div className="glass-card pointer-events-auto animate-enter flex h-full w-full min-h-0 flex-col overflow-y-auto border-[rgba(232,170,60,0.1)] p-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <OperatorPortrait
            name={visitor.name}
            roleTag={visitor.desiredRoleTag}
            presetId={visitor.presetId}
            size="detail"
          />
          <div className="min-w-0">
            <h3 className="truncate text-sm font-medium text-silver-bright">{visitor.name}</h3>
            <p className="mt-0.5 text-sm uppercase tracking-[0.12em] text-[rgba(232,170,60,0.8)]">
              {getRoleMeta(visitor.desiredRoleTag).label}
            </p>
            <span className="badge mt-1 border-[rgba(232,170,60,0.2)] bg-[rgba(232,170,60,0.1)] text-xs text-[rgba(232,170,60,0.9)]">
              Rank {visitor.rank.toUpperCase()}
            </span>
          </div>
        </div>
        <button
          type="button"
          className="btn-ghost shrink-0 px-1.5 py-1 text-sm leading-none text-silver/50 hover:text-gold"
          onClick={onClose}
          aria-label="Close"
        >
          &times;
        </button>
      </div>

      {/* Visiting timer */}
      <div className="mt-3">
        <div className="flex items-center justify-between text-sm">
          <span className="uppercase tracking-[0.12em] text-silver/50">Visiting</span>
          <span
            className={patienceUrgent ? "tabular-nums text-ember" : "tabular-nums text-silver/60"}
          >
            {patienceDisplay} remaining
          </span>
        </div>
        <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-[rgba(6,6,8,0.6)]">
          <div
            className="h-full rounded-full transition-[width] duration-500"
            style={{
              width: `${patienceFraction * 100}%`,
              background: patienceUrgent
                ? "linear-gradient(90deg, #d4541e, #b42c1a)"
                : "linear-gradient(90deg, rgba(232, 170, 60, 0.7), rgba(200, 168, 76, 0.5))",
            }}
          />
        </div>
      </div>

      {/* Projected stats */}
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <Tooltip content="Projected starting morale if recruited">
          <div className="glass-card-inset p-2">
            <p className="uppercase tracking-[0.12em] text-[rgba(232,170,60,0.6)]">Morale</p>
            <p className="mt-1 tabular-nums text-silver-bright">{visitor.projectedMorale}</p>
          </div>
        </Tooltip>
        <Tooltip content="Projected starting loyalty if recruited">
          <div className="glass-card-inset p-2">
            <p className="uppercase tracking-[0.12em] text-[rgba(232,170,60,0.6)]">Loyalty</p>
            <p className="mt-1 tabular-nums text-silver-bright">{visitor.projectedLoyalty}</p>
          </div>
        </Tooltip>
      </div>

      {/* Quality indicator */}
      <div className="mt-2 flex items-center gap-2 text-sm text-silver/50">
        <Tooltip
          content="Quality reflects raw potential — higher quality produces better starting stats"
          side="top"
        >
          <span>Quality {Math.round(visitor.quality)}</span>
        </Tooltip>
        <span className="opacity-30">&middot;</span>
        <span>
          {
            getSpecialtyMeta(
              visitor.specialtyTag || `focus:${visitor.desiredRoleTag.replace(/^role:/, "")}`,
            ).label
          }
        </span>
        <span className="opacity-30">&middot;</span>
        <span>Patience {patienceDisplay}</span>
      </div>

      {visitor.personaSummary && (
        <div className="mt-3 rounded-lg border border-[rgba(200,168,76,0.08)] bg-[rgba(10,10,14,0.45)] px-3 py-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs uppercase tracking-[0.12em] text-[rgba(232,170,60,0.62)]">
              Recruit Read
            </span>
            {visitor.identitySource === "generated" && (
              <span className="rounded-full border border-emerald-500/20 bg-emerald-500/8 px-2 py-0.5 text-xs uppercase tracking-[0.12em] text-emerald-300/80">
                AI packet
              </span>
            )}
          </div>
          <p className="mt-1 text-sm leading-relaxed text-silver/65">{visitor.personaSummary}</p>
          {personaHooks.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {personaHooks.slice(0, 3).map((hook) => (
                <span
                  key={hook}
                  className="rounded-full border border-[rgba(200,168,76,0.12)] bg-[rgba(200,168,76,0.06)] px-2 py-0.5 text-xs text-gold/70"
                >
                  {hook}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="mt-3 rounded-lg border border-[rgba(232,170,60,0.12)] bg-[rgba(232,170,60,0.06)] px-3 py-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs uppercase tracking-[0.12em] text-[rgba(232,170,60,0.7)]">
            Recruitment Policy
          </span>
          <span className="text-sm text-[rgba(232,170,60,0.92)]">{rosterFlowSummary.label}</span>
        </div>
        <p className="mt-1 text-sm leading-relaxed text-silver/60">{rosterFlowSummary.summary}</p>
        <div className="mt-1.5 flex flex-wrap gap-2 text-sm text-silver/45">
          {rosterFlowSummary.details.slice(0, 3).map((detail) => (
            <span key={detail}>{detail}</span>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="mt-4 flex flex-wrap gap-2">
        <Tooltip
          content={
            visitor.canAccept
              ? visitor.queueState === "deferred"
                ? "Recruit this deferred candidate from reserve"
                : "Add to your operator roster"
              : visitor.canReplace
                ? "Replace an active operator with this recruit"
                : rosterFull
                  ? "Roster is full — no open operator slots"
                  : visitor.lockedReason || "Recruitment is locked right now"
          }
        >
          <button
            type="button"
            data-testid="visitor-primary-action"
            className="btn-primary flex-1"
            disabled={!visitor.canAccept && !visitor.canReplace}
            onClick={
              visitor.canAccept ? onRecruit : visitor.canReplace ? onOpenReplacePicker : undefined
            }
          >
            {visitor.canAccept ? "Recruit" : visitor.canReplace ? "Replace" : "Full"}
          </button>
        </Tooltip>
        {visitor.queueState === "active" ? (
          <>
            <Tooltip
              content={
                visitor.canDefer
                  ? "Move this visitor into reserve"
                  : visitor.deferLockedReason || "Deferred reserve is full"
              }
            >
              <button
                type="button"
                className="btn-ghost text-silver/50 hover:text-gold"
                disabled={!visitor.canDefer}
                onClick={onDeferVisitor}
              >
                Defer
              </button>
            </Tooltip>
            <Tooltip
              content={`Turn away this visitor (${rosterFlowSummary.rejectReputationDelta} rep)`}
            >
              <button
                type="button"
                className="btn-ghost text-silver/50 hover:text-ember"
                onClick={onDismissVisitor}
              >
                Pass
              </button>
            </Tooltip>
          </>
        ) : (
          <Tooltip content="Remove this deferred candidate from reserve">
            <button
              type="button"
              className="btn-ghost text-silver/50 hover:text-ember"
              onClick={onDismissRecruit}
            >
              Dismiss
            </button>
          </Tooltip>
        )}
      </div>
    </div>
  );
}

// ── Teams card (for HQ teams category) ───────────────────────────────────

function TeamsCard({ teams }: { teams: readonly TeamViewModel[] }) {
  if (teams.length === 0) {
    return (
      <div className={`${emptyStateClass} rounded-lg border border-dashed border-gold-dim/15 py-8`}>
        <div className={emptyStateIconClass}>&#9881;</div>
        <p className="text-sm font-medium text-gold/70">No recurring teams</p>
        <p className="mt-1 text-xs text-silver/60">Teams form through repeated raid pairings</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {teams.map((team) => (
        <div key={team.id} className="glass-card-inset px-3 py-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-silver-bright">
              {team.memberNames.join(", ")}
            </span>
            {team.damaged && (
              <Tooltip
                content={team.damageReason ? team.damageReason : "Team cohesion has been damaged"}
                side="top"
              >
                <span className="badge badge-ember">Damaged</span>
              </Tooltip>
            )}
          </div>
          <div className="mt-1 text-sm text-silver/60">{team.statusSummary}</div>
          {team.explanationReasons.slice(0, 2).map((reason) => (
            <div key={reason} className="mt-1 text-sm text-silver/50">
              {reason}
            </div>
          ))}
          <div className="mt-1 flex items-center gap-3 text-sm text-silver/50">
            <Tooltip content="Team coordination — builds through shared missions" side="top">
              <span>Cohesion {Math.round(team.cohesion)}</span>
            </Tooltip>
            <Tooltip content="Total raids completed together" side="top">
              <span>{team.raidCount} raids</span>
            </Tooltip>
            {team.damaged && team.damageReason && (
              <span className="text-ember">{team.damageReason}</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── HQ cascade stack rendering ──────────────────────────────────────────

interface HqStackRenderContext {
  stack: readonly StackFocusEntry[];
  hq: NonNullable<ReturnType<typeof buildHqViewFromPhase1>>;
  teams: readonly TeamViewModel[];
  roomCultures: readonly RoomCultureViewModel[];
  inventory: readonly InventoryItemViewModel[];
  lootAutomation: LootAutomationViewModel | null;
  equipment: readonly EquipmentViewModel[];
  marketItems: readonly MarketItemViewModel[];
  cityPressure: ReturnType<typeof buildCityPressureView>;
  callbacks: GameCallbacks;
  handleOperatorInspectedGuidance: () => void;
  handleFocusChange: (focus: FocusPayload | null) => void;
  onCloseAt: (index: number) => void;
  onOpenBranch: (parentIndex: number, branch: StackFocusEntry | null) => void;
}

function entryKey(entry: StackFocusEntry, index: number): string {
  switch (entry.kind) {
    case "room":
      return `${index}:room:${entry.roomId}`;
    case "operator":
      return `${index}:operator:${entry.operatorId}`;
    case "visitor":
      return `${index}:visitor:${entry.visitorId}`;
    case "team":
      return `${index}:team:${entry.teamId}`;
    case "room-upgrades":
      return `${index}:room-upgrades:${entry.roomId}`;
    case "place-room":
      return `${index}:place-room:${entry.slotId}`;
    case "replace-operator":
      return `${index}:replace-operator:${entry.visitorId}`;
    default:
      return `${index}:${entry.kind}`;
  }
}

function buildHqStackEntries(ctx: HqStackRenderContext): PanelStackEntry[] {
  const {
    stack,
    hq,
    teams,
    roomCultures,
    inventory,
    lootAutomation,
    equipment,
    marketItems,
    cityPressure,
    callbacks,
    handleOperatorInspectedGuidance,
    handleFocusChange,
    onCloseAt,
    onOpenBranch,
  } = ctx;

  return stack
    .map((entry, index): PanelStackEntry | null => {
      const close = () => onCloseAt(index);

      switch (entry.kind) {
        case "rooms-root":
          return {
            id: entryKey(entry, index),
            widthClass: "w-[28rem]",
            content: (
              <PanelFrame
                testId="panel-rooms-root"
                title={hq.building.name}
                subtitle={`Floor ${hq.building.activeFloorDisplayNumber ?? hq.building.activeFloorIndex + 1} / ${hq.building.floorCount}`}
                onClose={close}
              >
                <HqPanel
                  hq={hq}
                  focus={hqEffectiveFocusFromStack(stack)}
                  onFocusChange={handleFocusChange}
                  onOpenPlaceRoom={(slot) =>
                    onOpenBranch(index, {
                      kind: "place-room",
                      slotId: slot.id,
                      floorIndex: slot.floorIndex,
                    })
                  }
                />
              </PanelFrame>
            ),
          };

        case "room": {
          const room = hq.rooms.find((r) => r.id === entry.roomId);
          if (!room) return null;
          const roomUpgrades = hq.roomUpgrades.filter((u) => u.targetId === room.templateId);
          const roomCulture = roomCultures.find((c) => c.roomId === room.id) ?? null;
          return {
            id: entryKey(entry, index),
            widthClass: "w-[30rem]",
            content: (
              <FocusedRoomOverlay
                guildName={hq.guild.guildName}
                room={room}
                buildingUpgrades={hq.upgrades}
                roomUpgrades={roomUpgrades}
                callbacks={callbacks}
                roomCulture={roomCulture}
                onDismiss={close}
                onOpenUpgrades={() =>
                  onOpenBranch(index, { kind: "room-upgrades", roomId: room.id })
                }
              />
            ),
          };
        }

        case "room-upgrades": {
          const room = hq.rooms.find((r) => r.id === entry.roomId);
          if (!room) return null;
          const roomUpgrades = hq.roomUpgrades.filter((u) => u.targetId === room.templateId);
          return {
            id: entryKey(entry, index),
            widthClass: "w-[24rem]",
            content: (
              <PanelFrame
                testId="panel-room-upgrades"
                title="Upgrades"
                subtitle={room.name}
                onClose={close}
              >
                <RoomUpgradesBody
                  room={room}
                  buildingUpgrades={hq.upgrades}
                  roomUpgrades={roomUpgrades}
                  callbacks={callbacks}
                />
              </PanelFrame>
            ),
          };
        }

        case "place-room": {
          const slot = hq.expansionSlots.find((s) => s.id === entry.slotId);
          if (!slot) return null;
          const templates = hq.placeableRoomTemplates;
          return {
            id: entryKey(entry, index),
            widthClass: "w-[20rem]",
            content: (
              <PanelFrame
                testId="panel-place-room"
                title="Place Room"
                subtitle={slot.label}
                onClose={close}
              >
                {templates.length > 0 ? (
                  <div className="space-y-2">
                    {templates.map((tpl) => (
                      <button
                        key={tpl.id}
                        type="button"
                        className="btn-primary w-full px-2.5 py-1.5 text-left text-xs"
                        onClick={() => {
                          callbacks.placeRoom(tpl.id, slot.floorIndex, slot.slotId);
                          onCloseAt(index);
                        }}
                      >
                        {tpl.name}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-silver/50">No room templates unlocked yet.</p>
                )}
              </PanelFrame>
            ),
          };
        }

        case "people-root": {
          const branchEntry = stack[index + 1];
          const branchOperatorId = branchEntry?.kind === "operator" ? branchEntry.operatorId : null;
          const branchVisitorId = branchEntry?.kind === "visitor" ? branchEntry.visitorId : null;
          return {
            id: entryKey(entry, index),
            widthClass: "w-[26rem]",
            content: (
              <PanelFrame
                testId="panel-people-root"
                title="Roster & Visitors"
                subtitle={`${hq.rosterPressure.livingOperatorCount}/${hq.rosterPressure.operatorCapacity} operators`}
                onClose={close}
              >
                <RosterPanel
                  operators={hq.operators}
                  visitors={hq.visitors}
                  callbacks={callbacks}
                  rosterPressure={hq.rosterPressure}
                  policies={hq.policies}
                  focusedOperatorId={branchOperatorId}
                  focusedVisitorId={branchVisitorId}
                  onSelectOperator={(operatorId) => {
                    const isSame = branchOperatorId === operatorId;
                    handleOperatorInspectedGuidance();
                    onOpenBranch(
                      index,
                      isSame
                        ? null
                        : {
                            kind: "operator",
                            operatorId,
                            highlightBounds: null,
                          },
                    );
                  }}
                  onSelectVisitor={(visitorId) => {
                    const isSame = branchVisitorId === visitorId;
                    onOpenBranch(
                      index,
                      isSame
                        ? null
                        : {
                            kind: "visitor",
                            visitorId,
                            highlightBounds: null,
                          },
                    );
                  }}
                />
              </PanelFrame>
            ),
          };
        }

        case "operator": {
          const operator = hq.operators.find((o) => o.id === entry.operatorId);
          if (!operator) return null;
          return {
            id: entryKey(entry, index),
            widthClass: "w-[24rem]",
            content: (
              <FocusedOperatorOverlay
                operator={operator}
                policies={hq.policies}
                relationships={hq.relationships}
                teams={teams}
                roomCultures={roomCultures}
                onDismiss={close}
              />
            ),
          };
        }

        case "visitor": {
          const visitor = hq.visitors.find((v) => v.id === entry.visitorId);
          if (!visitor) return null;
          const rosterFull = hq.rosterPressure.vacancyCount <= 0;
          return {
            id: entryKey(entry, index),
            widthClass: "w-[22rem]",
            content: (
              <FocusedVisitorOverlay
                visitor={visitor}
                policies={hq.policies}
                rosterFull={rosterFull}
                onRecruit={() => {
                  callbacks.acceptRecruit(visitor.id);
                  close();
                }}
                onDeferVisitor={() => {
                  callbacks.deferRecruit(visitor.id);
                  close();
                }}
                onDismissVisitor={() => {
                  callbacks.rejectRecruit(visitor.id);
                  close();
                }}
                onOpenReplacePicker={() =>
                  onOpenBranch(index, { kind: "replace-operator", visitorId: visitor.id })
                }
                onDismissRecruit={() => {
                  callbacks.dismissRecruit(visitor.id);
                  close();
                }}
                onClose={close}
              />
            ),
          };
        }

        case "management-root":
          return {
            id: entryKey(entry, index),
            widthClass: "w-[32rem]",
            content: (
              <PanelFrame testId="panel-management-root" title="Management" onClose={close}>
                <ManagementPanel
                  guild={hq.guild}
                  policies={hq.policies}
                  contractLifecycle={hq.contractLifecycle}
                  building={hq.building}
                  rooms={hq.rooms}
                  upgrades={hq.upgrades}
                  operators={hq.operators}
                  relocationGate={hq.relocationGate}
                  callbacks={callbacks}
                  cityPressure={cityPressure}
                />
              </PanelFrame>
            ),
          };

        case "teams-root":
          return {
            id: entryKey(entry, index),
            widthClass: "w-[22rem]",
            content: (
              <PanelFrame testId="panel-teams-root" title="Recurring Teams" onClose={close}>
                <TeamsCard teams={teams} />
              </PanelFrame>
            ),
          };

        case "inventory-root":
          return {
            id: entryKey(entry, index),
            widthClass: "w-[30rem]",
            content: (
              <PanelFrame testId="panel-inventory-root" title="Inventory" onClose={close}>
                <InventoryPanel
                  inventory={inventory}
                  lootAutomation={lootAutomation}
                  equipment={equipment}
                  marketItems={marketItems}
                  callbacks={callbacks}
                />
              </PanelFrame>
            ),
          };

        case "market-root":
          return {
            id: entryKey(entry, index),
            widthClass: "w-[28rem]",
            content: (
              <PanelFrame testId="panel-market-root" title="Market" onClose={close}>
                <MarketPanel
                  marketItems={marketItems}
                  inventory={inventory}
                  guild={hq.guild}
                  day={hq.time.day}
                  callbacks={callbacks}
                />
              </PanelFrame>
            ),
          };

        case "replace-operator": {
          const visitor = hq.visitors.find((v) => v.id === entry.visitorId);
          if (!visitor) return null;
          const candidates = hq.operators.filter((op) => op.canBeReplaced);
          return {
            id: entryKey(entry, index),
            widthClass: "w-[18rem]",
            content: (
              <PanelFrame
                testId="panel-replace-operator"
                title="Replace"
                subtitle={visitor.name}
                onClose={close}
              >
                {candidates.length > 0 ? (
                  <div className="space-y-1.5">
                    {candidates.map((op) => (
                      <button
                        key={op.id}
                        type="button"
                        data-testid="replace-operator-candidate"
                        data-operator-id={op.id}
                        className="btn-ghost w-full px-2 py-1 text-left text-xs"
                        onClick={() => {
                          callbacks.replaceRecruit(visitor.id, op.id);
                          onCloseAt(0);
                        }}
                      >
                        {op.name}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-silver/50">No operators can be replaced right now.</p>
                )}
              </PanelFrame>
            ),
          };
        }

        case "team":
          // Team entries are operations-side; never reach HQ stack. Return null defensively.
          return null;
      }
    })
    .filter((entry): entry is PanelStackEntry => entry !== null);
}

// ── Operations cascade stack rendering ──────────────────────────────────

interface OpsStackRenderContext {
  stack: readonly OpsStackEntry[];
  operations: OperationsViewModel;
  guildName: string;
  operators: readonly OperatorViewModel[];
  rosterPressure: RosterPressureViewModel;
  raidWorldSnapshot: RaidWorldSnapshot | null;
  focusedRaidState: RuntimeSession["state"]["phase1View"]["activeRaids"][number] | null;
  focusedRaidOperatorStatuses: ReadonlyMap<string, FocusOperatorStatus> | undefined;
  callbacks: GameCallbacks;
  contractRootAnchorRef: React.RefObject<HTMLDivElement | null>;
  historyRootAnchorRef: React.RefObject<HTMLDivElement | null>;
  onCloseAt: (index: number) => void;
  onOpenBranch: (parentIndex: number, branch: OpsStackEntry | null) => void;
  onReplaceRoot: (next: OpsStackEntry | null) => void;
}

function opsEntryKey(entry: OpsStackEntry, index: number): string {
  switch (entry.kind) {
    case "team":
      return `${index}:team:${entry.teamId}`;
    case "posting":
      return `${index}:posting:${entry.postingId}`;
    case "opportunity":
      return `${index}:opportunity:${entry.opportunityId}`;
    case "raid-summary":
      return `${index}:raid-summary:${entry.summaryId}`;
    default:
      return `${index}:${entry.kind}`;
  }
}

function buildOpsStackEntries(ctx: OpsStackRenderContext): PanelStackEntry[] {
  const {
    stack,
    operations,
    guildName,
    operators,
    rosterPressure,
    raidWorldSnapshot,
    focusedRaidState,
    focusedRaidOperatorStatuses,
    callbacks,
    contractRootAnchorRef,
    historyRootAnchorRef,
    onCloseAt,
    onOpenBranch,
    onReplaceRoot,
  } = ctx;

  return stack
    .map((entry, index): PanelStackEntry | null => {
      const close = () => onCloseAt(index);
      const branchEntry = stack[index + 1];

      switch (entry.kind) {
        case "contract-root": {
          const site = operations.contractSite;
          const subtitle = site
            ? `${site.siteConceptName} — ${site.missionName}`
            : operations.contractLifecycle === "bidding"
              ? `${operations.postedContracts.length} postings on the board`
              : operations.contractLifecycle === "resolved"
                ? "Contract resolved — awaiting advance"
                : "Awaiting board refresh";
          return {
            id: opsEntryKey(entry, index),
            widthClass: "w-[26rem]",
            content: (
              <PanelFrame
                testId="panel-contract-root"
                title="Contracts"
                subtitle={subtitle}
                onClose={close}
              >
                <div ref={contractRootAnchorRef}>
                  <ContractsRootBody
                    operations={operations}
                    onOpenPostingBoard={() =>
                      onOpenBranch(
                        index,
                        branchEntry?.kind === "posting-board" ? null : { kind: "posting-board" },
                      )
                    }
                    onOpenReview={() =>
                      onOpenBranch(
                        index,
                        branchEntry?.kind === "contract-review"
                          ? null
                          : { kind: "contract-review" },
                      )
                    }
                    onOpenSite={() =>
                      onOpenBranch(
                        index,
                        branchEntry?.kind === "contract-site" ? null : { kind: "contract-site" },
                      )
                    }
                    onOpenActiveOperation={() => onReplaceRoot({ kind: "active-root" })}
                    onAdvance={callbacks.advanceContract}
                  />
                </div>
              </PanelFrame>
            ),
          };
        }

        case "posting-board": {
          const selectedPostingId = branchEntry?.kind === "posting" ? branchEntry.postingId : null;
          return {
            id: opsEntryKey(entry, index),
            widthClass: "w-[22rem]",
            content: (
              <PanelFrame
                testId="panel-posting-board"
                title="Board"
                subtitle={`${operations.postedContracts.length} postings`}
                onClose={close}
              >
                <PostingBoardBody
                  postings={operations.postedContracts}
                  selectedPostingId={selectedPostingId}
                  onSelect={(postingId) =>
                    onOpenBranch(
                      index,
                      selectedPostingId === postingId ? null : { kind: "posting", postingId },
                    )
                  }
                />
              </PanelFrame>
            ),
          };
        }

        case "posting": {
          const posting = operations.postedContracts.find((p) => p.postingId === entry.postingId);
          if (!posting) return null;
          return {
            id: opsEntryKey(entry, index),
            widthClass: "w-[26rem]",
            content: (
              <PanelFrame
                testId="panel-posting-detail"
                title={posting.siteConceptName}
                subtitle={posting.missionName}
                onClose={close}
              >
                <PostingDetailBody
                  posting={posting}
                  onBid={(postingId) => {
                    callbacks.bidContract(postingId);
                    onCloseAt(1);
                  }}
                />
              </PanelFrame>
            ),
          };
        }

        case "contract-review": {
          const result = operations.contractResult;
          if (!result) return null;
          return {
            id: opsEntryKey(entry, index),
            widthClass: "w-[24rem]",
            content: (
              <PanelFrame
                testId="panel-contract-review"
                title="Contract Review"
                subtitle={result.siteConceptName}
                onClose={close}
              >
                <ContractReviewBody
                  result={result}
                  onAdvance={() => {
                    callbacks.advanceContract();
                    onCloseAt(1);
                  }}
                />
              </PanelFrame>
            ),
          };
        }

        case "contract-site": {
          const site = operations.contractSite;
          if (!site) return null;
          return {
            id: opsEntryKey(entry, index),
            widthClass: "w-[26rem]",
            content: (
              <PanelFrame
                testId="panel-contract-site"
                title="Site Details"
                subtitle={site.siteConceptName}
                onClose={close}
              >
                <ContractSiteBody contract={site} />
              </PanelFrame>
            ),
          };
        }

        case "active-root": {
          const activeCount = operations.activeRaids.length;
          const subtitle = operations.contractSite
            ? `${operations.contractSite.siteConceptName} · ${activeCount} active raid${activeCount === 1 ? "" : "s"}`
            : activeCount > 0
              ? `${activeCount} active raid${activeCount === 1 ? "" : "s"}`
              : "No active raids";
          const focusedTeamId = branchEntry?.kind === "team" ? branchEntry.teamId : null;
          return {
            id: opsEntryKey(entry, index),
            widthClass: "w-[24rem]",
            content: (
              <PanelFrame
                testId="panel-active-root"
                title="Active Operation"
                subtitle={subtitle}
                onClose={close}
              >
                <ActiveRootBody
                  operations={operations}
                  operators={operators}
                  focusedTeamId={focusedTeamId}
                  onOpenTeam={(teamId) =>
                    onOpenBranch(
                      index,
                      focusedTeamId === teamId
                        ? null
                        : { kind: "team", teamId, highlightBounds: null },
                    )
                  }
                  onOpenSite={() =>
                    onOpenBranch(
                      index,
                      branchEntry?.kind === "contract-site" ? null : { kind: "contract-site" },
                    )
                  }
                />
              </PanelFrame>
            ),
          };
        }

        case "team": {
          const raid = operations.activeRaids.find((r) => r.id === entry.teamId);
          if (!raid) return null;
          const raidTeamMarker =
            raidWorldSnapshot?.teams.find((t) => t.teamId === entry.teamId) ?? null;
          const encounter = focusedRaidState?.encounter ?? null;
          return {
            id: opsEntryKey(entry, index),
            widthClass: "w-[28rem]",
            content: (
              <PanelFrame
                testId="panel-team-detail"
                title={raid.missionName}
                subtitle={raid.location || undefined}
                onClose={close}
              >
                <TeamDetailBody
                  raid={raid}
                  raidTeamMarker={raidTeamMarker}
                  operators={operators}
                  operatorStatuses={focusedRaidOperatorStatuses}
                  encounter={encounter}
                  onDismissFocus={close}
                />
              </PanelFrame>
            ),
          };
        }

        case "opportunities-root": {
          const selectedOpportunityId =
            branchEntry?.kind === "opportunity" ? branchEntry.opportunityId : null;
          return {
            id: opsEntryKey(entry, index),
            widthClass: "w-[24rem]",
            content: (
              <PanelFrame
                testId="panel-opportunities-root"
                title="Opportunities"
                subtitle={`${operations.opportunities.length} posted`}
                onClose={close}
              >
                <OpportunitiesRootBody
                  guildName={guildName}
                  opportunities={operations.opportunities}
                  rosterPressure={rosterPressure}
                  operators={operators}
                  selectedOpportunityId={selectedOpportunityId}
                  onSelect={(opportunityId) =>
                    onOpenBranch(
                      index,
                      selectedOpportunityId === opportunityId
                        ? null
                        : { kind: "opportunity", opportunityId },
                    )
                  }
                />
              </PanelFrame>
            ),
          };
        }

        case "opportunity": {
          const opportunity = operations.opportunities.find(
            (opp) => opp.id === entry.opportunityId,
          );
          if (!opportunity) return null;
          return {
            id: opsEntryKey(entry, index),
            widthClass: "w-[24rem]",
            content: (
              <PanelFrame
                testId="panel-opportunity-detail"
                title={opportunity.missionName}
                subtitle={opportunity.location || undefined}
                onClose={close}
              >
                <OpportunityDetailBody opportunity={opportunity} />
              </PanelFrame>
            ),
          };
        }

        case "history-root": {
          const selectedSummaryId =
            branchEntry?.kind === "raid-summary" ? branchEntry.summaryId : null;
          return {
            id: opsEntryKey(entry, index),
            widthClass: "w-[24rem]",
            content: (
              <PanelFrame
                testId="panel-history-root"
                title="Raid History"
                subtitle={`${operations.raidHistory.length} recorded`}
                onClose={close}
              >
                <div ref={historyRootAnchorRef}>
                  <HistoryRootBody
                    history={operations.raidHistory}
                    selectedSummaryId={selectedSummaryId}
                    onSelect={(summaryId) =>
                      onOpenBranch(
                        index,
                        selectedSummaryId === summaryId
                          ? null
                          : { kind: "raid-summary", summaryId },
                      )
                    }
                  />
                </div>
              </PanelFrame>
            ),
          };
        }

        case "raid-summary": {
          const summary = operations.raidHistory.find((s) => s.id === entry.summaryId);
          if (!summary) return null;
          return {
            id: opsEntryKey(entry, index),
            widthClass: "w-[26rem]",
            content: (
              <PanelFrame
                testId="panel-raid-summary-detail"
                title={summary.missionName}
                subtitle={summary.location || undefined}
                onClose={close}
              >
                <RaidSummaryDetailBody summary={summary} />
              </PanelFrame>
            ),
          };
        }
      }
    })
    .filter((entry): entry is PanelStackEntry => entry !== null);
}

// ── Main shell component ─────────────────────────────────────────────────

export function GameShell() {
  const location = useLocation();
  const request = parseRuntimeRouteRequest(location.search);
  const { status, session, errorMessage } = useRuntimeSession(request);
  const { settings, updateSettings, resetSettings } = useGameSettings();
  const initialNavigation = getDefaultShellNavigation(request);
  const [activeTab, setActiveTab] = useState<ShellTab>(initialNavigation.activeTab);
  const [activeModal, setActiveModal] = useState<ActiveGameModal>(null);
  const [devMenuOpen, setDevMenuOpen] = useState(false);
  const [debugOverlays, setDebugOverlays] = useState<HqDebugOverlays>({});
  const [hqFocusStack, setHqFocusStack] = useState<StackFocusEntry[]>(() =>
    initialNavigation.hqCategory ? [hqRootEntryForCategory(initialNavigation.hqCategory)] : [],
  );
  const [opsFocusStack, setOpsFocusStack] = useState<OpsStackEntry[]>(() =>
    initialNavigation.opsCategory ? [opsRootEntryForCategory(initialNavigation.opsCategory)] : [],
  );
  const hqCategory = useMemo<HqCategory | null>(
    () => hqCategoryFromStack(hqFocusStack),
    [hqFocusStack],
  );
  const opsCategory = useMemo<OpsCategory | null>(
    () => opsCategoryFromStack(opsFocusStack),
    [opsFocusStack],
  );
  const hqEffectiveFocus = useMemo<FocusPayload | null>(
    () => hqEffectiveFocusFromStack(hqFocusStack),
    [hqFocusStack],
  );
  const opsEffectiveFocus = useMemo<FocusPayload | null>(
    () => opsEffectiveFocusFromStack(opsFocusStack),
    [opsFocusStack],
  );
  const focus: FocusPayload | null = activeTab === "hq" ? hqEffectiveFocus : opsEffectiveFocus;
  const setFocus = useCallback(
    (next: FocusPayload | null) => {
      if (next === null) {
        if (activeTab === "hq") {
          setHqFocusStack((prev) => {
            const category = hqCategoryFromStack(prev);
            return category ? [hqRootEntryForCategory(category)] : [];
          });
        } else {
          setOpsFocusStack((prev) => {
            const category = opsCategoryFromStack(prev);
            return category ? [opsRootEntryForCategory(category)] : [];
          });
        }
        return;
      }
      if (next.targetKind === "team") {
        setOpsFocusStack(opsStackFromFocus(next));
        return;
      }
      setHqFocusStack(hqStackFromFocus(next));
    },
    [activeTab],
  );
  const setHqCategory = useCallback((next: HqCategory | null) => {
    setHqFocusStack(next ? [hqRootEntryForCategory(next)] : []);
  }, []);
  const setOpsCategory = useCallback((next: OpsCategory | null) => {
    setOpsFocusStack(next ? [opsRootEntryForCategory(next)] : []);
  }, []);
  const [audioState, setAudioState] = useState<AudioEngineState>("suspended");
  const audioEngineRef = useRef<AudioEngine | null>(null);
  const activeInterruption = session?.phase1View.activeInterruption ?? null;
  const activeEncounter = session?.phase1View.encounter ?? null;
  const runtimeOverlayActive =
    activeEncounter !== null ||
    (activeInterruption !== null && activeInterruption.type !== "settings");
  const blockingRuntimeFreeze =
    activeEncounter !== null || activeInterruption?.blockingMode === "blocking";
  const modalFreezesGame = activeModal !== null;
  const shouldPauseSimulation = modalFreezesGame || blockingRuntimeFreeze;
  const wakeLock = useScreenWakeLock(
    settings.wakeLockEnabled &&
      status === "ready" &&
      session !== undefined &&
      session.isAutoTicking &&
      !shouldPauseSimulation,
  );

  const prevTabRef = useRef<ShellTab>(activeTab);
  useEffect(() => {
    const nextNavigation = getDefaultShellNavigation(request);
    setActiveTab(nextNavigation.activeTab);
    setHqFocusStack(
      nextNavigation.hqCategory ? [hqRootEntryForCategory(nextNavigation.hqCategory)] : [],
    );
    setOpsFocusStack(
      nextNavigation.opsCategory ? [opsRootEntryForCategory(nextNavigation.opsCategory)] : [],
    );
  }, [request.mode, request.slotId]);

  useEffect(() => {
    setHqFocusStack((prev) => {
      if (prev.length === 0) return prev;
      const category = hqCategoryFromStack(prev);
      return category ? [hqRootEntryForCategory(category)] : [];
    });
    setOpsFocusStack((prev) => {
      if (prev.length === 0) return prev;
      const category = opsCategoryFromStack(prev);
      return category ? [opsRootEntryForCategory(category)] : [];
    });
    const engine = audioEngineRef.current;
    if (engine && prevTabRef.current !== activeTab) {
      if (activeTab === "hq") {
        engine.playCue("hq.open");
      } else if (prevTabRef.current === "hq") {
        engine.playCue("hq.close");
      }
    }
    prevTabRef.current = activeTab;
  }, [activeTab]);

  useEffect(() => {
    if (!import.meta.env.DEV) return;

    function onKeyDown(e: KeyboardEvent) {
      if (activeModal !== null || runtimeOverlayActive) return;
      if (e.key !== "`") return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      e.preventDefault();
      setDevMenuOpen((prev) => !prev);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeModal, runtimeOverlayActive]);

  useEffect(() => {
    if (!devMenuOpen || !runtimeOverlayActive) {
      return;
    }

    setDevMenuOpen(false);
  }, [devMenuOpen, runtimeOverlayActive]);

  useEffect(() => {
    const engine = createAudioEngine();
    audioEngineRef.current = engine;

    const syncState = (nextEngine: AudioEngine) => {
      setAudioState(nextEngine.state);
    };

    syncState(engine);
    const unsubscribe = engine.subscribe(syncState);

    return () => {
      unsubscribe();
      engine.dispose();
      audioEngineRef.current = null;
    };
  }, []);

  useEffect(() => {
    const engine = audioEngineRef.current;
    if (!engine) {
      return;
    }

    engine.setSfxVolume(settings.audio.sfxVolumeDb);
    engine.setMusicVolume(settings.audio.musicVolumeDb);
  }, [settings.audio.musicVolumeDb, settings.audio.sfxVolumeDb]);

  useEffect(() => {
    const engine = audioEngineRef.current;
    if (!engine || audioState === "running" || audioState === "closed") {
      return;
    }

    const unlockAudio = () => {
      void engine.unlock();
    };

    window.addEventListener("pointerdown", unlockAudio, { once: true });
    window.addEventListener("keydown", unlockAudio, { once: true });

    return () => {
      window.removeEventListener("pointerdown", unlockAudio);
      window.removeEventListener("keydown", unlockAudio);
    };
  }, [audioState]);

  useEffect(() => {
    const engine = audioEngineRef.current;
    if (!engine || audioState !== "running") return;
    engine.startMusic();
    return () => engine.stopMusic();
  }, [audioState]);

  useEffect(() => {
    if (!session) {
      return;
    }

    if (shouldPauseSimulation) {
      session.lifecycle.pause("screen-overlay");
    } else {
      session.lifecycle.resume("screen-overlay");
    }

    return () => {
      session.lifecycle.resume("screen-overlay");
    };
  }, [session, shouldPauseSimulation]);

  const openSettingsModal = useCallback(() => {
    setFocus(null);
    setDevMenuOpen(false);
    setActiveModal("settings");
  }, []);

  const closeActiveModal = useCallback(() => {
    setActiveModal(null);
  }, []);

  const handleSfxVolumeChange = useCallback(
    (sfxVolumeDb: number) => {
      updateSettings((currentSettings) => ({
        ...currentSettings,
        audio: {
          ...currentSettings.audio,
          sfxVolumeDb,
        },
      }));
    },
    [updateSettings],
  );

  const handleMusicVolumeChange = useCallback(
    (musicVolumeDb: number) => {
      updateSettings((currentSettings) => ({
        ...currentSettings,
        audio: {
          ...currentSettings.audio,
          musicVolumeDb,
        },
      }));
    },
    [updateSettings],
  );

  const toggleWakeLock = useCallback(() => {
    updateSettings((currentSettings) => ({
      ...currentSettings,
      wakeLockEnabled: !currentSettings.wakeLockEnabled,
    }));
  }, [updateSettings]);

  const toggleTutorialEvents = useCallback(() => {
    updateSettings((currentSettings) => ({
      ...currentSettings,
      tutorialEventsEnabled: !currentSettings.tutorialEventsEnabled,
    }));
  }, [updateSettings]);

  const resetOpeningGuidance = useCallback(() => {
    if (!session) return;
    void session.commands.dispatch({ type: "sim/guidance-reset-opening" });
  }, [session]);

  const toggleAiEnabled = useCallback(() => {
    updateSettings((s) => ({ ...s, ai: { ...s.ai, enabled: !s.ai.enabled } }));
  }, [updateSettings]);

  const setAiRuntimeKind = useCallback(
    (runtimeKind: string) => {
      updateSettings((s) => ({
        ...s,
        ai: { ...s.ai, runtimeKind: runtimeKind as "ollama" | "lm-studio" | "llama-cpp" },
      }));
    },
    [updateSettings],
  );

  const setAiBaseUrl = useCallback(
    (baseUrl: string) => {
      updateSettings((s) => ({ ...s, ai: { ...s.ai, baseUrl } }));
    },
    [updateSettings],
  );

  const setAiModelId = useCallback(
    (modelId: string) => {
      updateSettings((s) => ({ ...s, ai: { ...s.ai, modelId } }));
    },
    [updateSettings],
  );

  const probeAiRuntime = useCallback(() => {
    if (!session) return;
    void session.commands.probeAiRuntime();
  }, [session]);

  const callbacks: GameCallbacks | null = useMemo(() => buildGameCallbacks(session), [session]);

  const advanceHour = useCallback(() => {
    callbacks?.tick(TICK_HOUR_MS);
  }, [callbacks]);

  // ── Encounter & interruption handlers ──────────────────────────────────
  const handleInterruptionResolve = useCallback(
    (instanceId: string, choiceId?: string) => {
      if (!session) return;

      void resolveInterruptionAction(
        session,
        activeInterruption,
        instanceId,
        choiceId,
        import.meta.env.DEV,
      );
    },
    [activeInterruption, session],
  );

  const handleInterruptionDismiss = useCallback(() => {
    if (!session) return;
    void session.commands.dispatch({ type: "sim/interruption-dismiss" });
  }, [session]);

  const handleEncounterPause = useCallback(() => {
    if (!session) return;
    void session.commands.dispatch({ type: "sim/encounter-pause" });
  }, [session]);

  const handleEncounterResume = useCallback(() => {
    if (!session) return;
    void session.commands.dispatch({ type: "sim/encounter-resume" });
  }, [session]);

  const handleEncounterStep = useCallback(() => {
    if (!session) return;
    void session.commands.dispatch({ type: "sim/encounter-step" });
  }, [session]);

  const handleEncounterRetreat = useCallback(() => {
    if (!session) return;
    void session.commands.dispatch({ type: "sim/encounter-retreat" });
  }, [session]);

  const handleEncounterDismiss = useCallback(() => {
    if (!session) return;
    void session.commands.dispatch({ type: "sim/encounter-dismiss" });
  }, [session]);

  const handleEncounterIntervention = useCallback(
    (interventionId: string) => {
      if (!session) return;
      void session.commands.dispatch({
        type: "sim/encounter-use-intervention",
        interventionId: interventionId as InterventionId,
      });
    },
    [session],
  );

  // Derive stable primitives for encounter state to avoid re-render loops
  const encounterStatus = session?.phase1View.encounter?.status ?? null;
  const encounterAutoplay = session?.phase1View.encounter?.autoplayEnabled ?? false;

  // Encounter autoplay: advance encounter beats automatically when active.
  const encounterAutoplayRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const encounterDebugRef = useRef<{
    encounterId: string | null;
    status: EncounterStatus | null;
    loggedEntryKeys: Set<string>;
  }>({
    encounterId: null,
    status: null,
    loggedEntryKeys: new Set<string>(),
  });
  useEffect(() => {
    if (encounterAutoplayRef.current) {
      clearInterval(encounterAutoplayRef.current);
      encounterAutoplayRef.current = null;
    }
    if (!session || encounterStatus !== "active" || !encounterAutoplay) return;

    encounterAutoplayRef.current = setInterval(() => {
      void session.commands.dispatch({ type: "sim/encounter-step" });
    }, 800);

    return () => {
      if (encounterAutoplayRef.current) {
        clearInterval(encounterAutoplayRef.current);
        encounterAutoplayRef.current = null;
      }
    };
  }, [session, encounterStatus, encounterAutoplay]);

  useEffect(() => {
    if (!import.meta.env.DEV) return;

    const debugState = encounterDebugRef.current;
    const encounter = activeEncounter;

    if (!encounter) {
      if (debugState.encounterId !== null) {
        console.log(`[encounter ${formatDebugClock(Date.now())}] ${debugState.encounterId} closed`);
      }
      debugState.encounterId = null;
      debugState.status = null;
      debugState.loggedEntryKeys = new Set<string>();
      return;
    }

    if (debugState.encounterId !== encounter.encounterId) {
      debugState.encounterId = encounter.encounterId;
      debugState.status = null;
      debugState.loggedEntryKeys = new Set<string>();
      console.log(`[encounter ${formatDebugClock(Date.now())}] ${encounter.encounterId} opened`, {
        boss: encounter.bossName,
        round: encounter.currentRound,
      });
    }

    if (debugState.status !== encounter.status) {
      debugState.status = encounter.status;
      console.log(
        `[encounter ${formatDebugClock(Date.now())}] ${encounter.encounterId} status=${encounter.status}`,
        {
          round: encounter.currentRound,
          autoplayEnabled: encounter.autoplayEnabled,
        },
      );
    }

    for (const entry of encounter.recentLog) {
      const key = getEncounterDebugEntryKey(entry);
      if (debugState.loggedEntryKeys.has(key)) {
        continue;
      }
      debugState.loggedEntryKeys.add(key);
      console.log(
        `[encounter ${formatDebugClock(entry.timestamp)}] ${encounter.encounterId} ${summarizeEncounterDebugEntry(entry)}`,
        entry,
      );
    }
  }, [activeEncounter]);

  const phase1View = session?.state.phase1View ?? null;
  const deferredPhase1View = useDeferredValue(phase1View);
  const registry = session?.registry ?? null;

  const phase2 = useMemo(
    () => (session && deferredPhase1View ? session.simulation.getPhase2View() : null),
    [deferredPhase1View, session],
  );

  const hqBase = useMemo(
    () =>
      session && deferredPhase1View && registry
        ? buildHqViewFromPhase1(
            deferredPhase1View,
            registry,
            phase2?.inventory,
            session.state.worldSnapshot.cityPressure,
          )
        : null,
    [deferredPhase1View, registry, session, phase2, session?.state.worldSnapshot.cityPressure],
  );
  const operations = useMemo(
    () =>
      session && deferredPhase1View && registry
        ? buildOpsViewFromPhase1(deferredPhase1View, registry)
        : null,
    [deferredPhase1View, registry, session],
  );

  const hq = useMemo(() => {
    if (!hqBase || !phase2) return hqBase;
    return {
      ...hqBase,
      operators: enrichOperatorsWithAutonomy(hqBase.operators, phase2),
    };
  }, [hqBase, phase2]);
  const orderedFloorIndices = useMemo(() => {
    if (!hq) return [];
    return hq.building.floorOrder && hq.building.floorOrder.length > 0
      ? [...hq.building.floorOrder]
      : Array.from({ length: hq.building.floorCount }, (_, index) => index);
  }, [hq]);
  const activeFloorOrderIndex = useMemo(() => {
    if (!hq || orderedFloorIndices.length === 0) return 0;
    return Math.max(0, orderedFloorIndices.indexOf(hq.building.activeFloorIndex));
  }, [hq, orderedFloorIndices]);

  const operatorNameById = useMemo(() => {
    if (!hq) return new Map<string, string>();
    return new Map(hq.operators.map((op) => [op.id, op.name]));
  }, [hq]);

  const roomNameById = useMemo(() => {
    if (!hq) return new Map<string, string>();
    return new Map(hq.rooms.map((r) => [r.id, r.name]));
  }, [hq]);

  const hasConsumables = useMemo(
    () => (phase2 && registry ? hasConsumableInventory(phase2.inventory, registry) : false),
    [phase2, registry],
  );

  const teams: TeamViewModel[] = useMemo(
    () => (phase2 ? buildTeamViewModels(phase2, operatorNameById) : []),
    [phase2, operatorNameById],
  );

  const roomCultures: RoomCultureViewModel[] = useMemo(
    () => (phase2 ? buildRoomCultureViewModels(phase2, roomNameById) : []),
    [phase2, roomNameById],
  );

  const inventory: InventoryItemViewModel[] = useMemo(
    () => (phase2 && registry ? buildInventoryViewModels(phase2, registry) : []),
    [phase2, registry],
  );
  const lootAutomation: LootAutomationViewModel | null = useMemo(
    () => (phase2 ? buildLootAutomationViewModel(phase2.lootAutomation) : null),
    [phase2],
  );

  const equipment: EquipmentViewModel[] = useMemo(
    () => (phase2 && registry ? buildEquipmentViewModels(phase2, registry, operatorNameById) : []),
    [operatorNameById, phase2, registry],
  );

  const marketItems: MarketItemViewModel[] = useMemo(
    () => (phase2 && registry ? buildMarketItemViewModels(phase2, registry) : []),
    [phase2, registry],
  );

  const cityPressure = useMemo(
    () => buildCityPressureView(session?.state.worldSnapshot.cityPressure),
    [session?.state.worldSnapshot.cityPressure],
  );

  const { entries: eventLog, handleEntryClick: handleEventLogEntryClick } = useEventLog(
    session ?? null,
  );

  useEffect(() => {
    if (!session || !hq || !operations) {
      updateBrowserTestSnapshot(null);
      return;
    }

    updateBrowserTestSnapshot({
      activeTab,
      eventLog,
      focus,
      hq,
      hqCategory,
      opsCategory,
      operations,
      session,
    });
  }, [activeTab, eventLog, focus, hq, hqCategory, operations, opsCategory, session]);

  const rawHqWorld: HqWorldSnapshot | null = session?.state.hqWorldSnapshot ?? null;
  const rawRaidWorld: RaidWorldSnapshot | null = session?.state.raidWorldSnapshot ?? null;
  const deferredRawHqWorld = useDeferredValue(rawHqWorld);
  const deferredRawRaidWorld = useDeferredValue(rawRaidWorld);
  const hqWorldSnapshot = useMemo<HqWorldSnapshot | null>(
    () =>
      deferredRawHqWorld
        ? {
            ...deferredRawHqWorld,
            effects: buildContextEffects(deferredRawHqWorld.effects, "hq", focus !== null),
          }
        : null,
    [deferredRawHqWorld, focus],
  );
  const raidWorldSnapshot = useMemo<RaidWorldSnapshot | null>(
    () =>
      deferredRawRaidWorld
        ? {
            ...deferredRawRaidWorld,
            effects: buildContextEffects(deferredRawRaidWorld.effects, "raid", focus !== null),
          }
        : null,
    [deferredRawRaidWorld, focus],
  );

  const handleFocusChange = useCallback(
    (newFocus: FocusPayload | null) => {
      setFocus(newFocus);
      if (newFocus?.targetKind === "room" && hq) {
        const room = hq.rooms.find((r) => r.id === newFocus.targetId);
        if (room && room.floorIndex !== hq.building.activeFloorIndex) {
          callbacks.setActiveFloor(room.floorIndex);
        }
      }
    },
    [hq, callbacks, setFocus],
  );

  const navActions = useMemo(
    () => ({
      setActiveTab,
      setHqCategory,
      setOpsCategory,
      setFocus,
      openOpsTeam: (teamId: string) =>
        setOpsFocusStack([
          { kind: "active-root" },
          { kind: "team", teamId, highlightBounds: null },
        ]),
      openOpsHistorySummary: (summaryId: string) =>
        setOpsFocusStack([{ kind: "history-root" }, { kind: "raid-summary", summaryId }]),
    }),
    [setHqCategory, setFocus, setOpsCategory],
  );
  const handleEventLogClick = useCallback(
    (entry: EventLogEntry) => {
      handleEventLogEntryClick(entry, navActions);
    },
    [handleEventLogEntryClick, navActions],
  );

  // ── Guidance handlers ───────────────────────────────────────────────
  const guidanceBeat = phase1View?.guidance?.activeBeat ?? null;
  const guidanceProgress = phase1View?.guidance
    ? {
        current: phase1View.guidance.completedOpeningBeats,
        total: phase1View.guidance.totalOpeningBeats,
      }
    : { current: 0, total: 13 };
  const activeGuidanceInterruption =
    phase1View?.activeInterruption?.type === "guidance" ? phase1View.activeInterruption : null;
  const suspendFocusedGuidanceBeat = isFocusedGuidanceBeatSuspended(
    guidanceBeat,
    phase1View?.activeInterruption ?? null,
    phase1View?.encounter != null,
  );
  const suppressTutorialInterruption =
    !settings.tutorialEventsEnabled &&
    isTutorialSuppressibleGuidanceBeat(activeGuidanceInterruption?.payload);
  const suppressTutorialBeat =
    !settings.tutorialEventsEnabled &&
    guidanceBeat?.deliveryMode !== "blocking" &&
    isTutorialSuppressibleGuidanceBeat(guidanceBeat);

  const handleGuidanceComplete = useCallback(
    (beatId: string, signal: string) => {
      if (!session) return;
      void session.commands.dispatch({ type: "sim/guidance-complete", beatId, signal });
    },
    [session],
  );

  const handleGuidanceDismiss = useCallback(
    (beatId: string) => {
      if (!session) return;
      void session.commands.dispatch({ type: "sim/guidance-dismiss", beatId });
    },
    [session],
  );

  const attemptedGuidanceIntentRef = useRef<string | null>(null);
  const recordedGuidanceFallbackRef = useRef<string | null>(null);

  useEffect(() => {
    attemptedGuidanceIntentRef.current = null;
    recordedGuidanceFallbackRef.current = null;
  }, [guidanceBeat?.beatId]);

  // Anchor registration refs for guidance targets
  const anchorRegistry = useAnchorRegistry();
  const contractBoardAnchorRef = useGuidanceAnchor("ui/ops/contract-board");
  const eventLogAnchorRef = useGuidanceAnchor("ui/shared/event-log");
  const managementCategoryAnchorRef = useGuidanceAnchor("ui/hq/category/management");
  const rosterCategoryAnchorRef = useGuidanceAnchor("ui/hq/category/roster");
  const roomsCategoryAnchorRef = useGuidanceAnchor("ui/hq/category/rooms");
  const marketCategoryAnchorRef = useGuidanceAnchor("ui/hq/category/market");
  const raidMapAnchorRef = useGuidanceAnchor("ui/raid/map");
  const opsHistoryPanelAnchorRef = useGuidanceAnchor("ui/ops/panel/history");

  // Resolve anchor bounds inline so layout changes are always reflected.
  const guidanceAnchorBounds =
    guidanceBeat?.target && anchorRegistry ? anchorRegistry.getBounds(guidanceBeat.target) : null;

  const applyGuidanceFallbackIntent = useCallback(
    (intent: string) => {
      setFocus(null);

      switch (intent) {
        case "ops/open-contract-board":
          setActiveTab("operations");
          setOpsCategory("contract");
          return;
        case "ops/open-raid-map":
          setActiveTab("operations");
          return;
        case "ops/open-history":
          setActiveTab("operations");
          setOpsCategory("history");
          return;
        case "hq/open-roster":
          setActiveTab("hq");
          setHqCategory("roster");
          return;
        case "hq/open-management":
          setActiveTab("hq");
          setHqCategory("management");
          return;
        case "hq/open-rooms":
          setActiveTab("hq");
          setHqCategory("rooms");
          return;
        case "hq/open-market":
          setActiveTab("hq");
          setHqCategory("market");
          return;
        default:
          return;
      }
    },
    [setFocus, setHqCategory],
  );

  useEffect(() => {
    if (
      !guidanceBeat ||
      !session ||
      suspendFocusedGuidanceBeat ||
      guidanceBeat.deliveryMode === "blocking" ||
      !guidanceBeat.target
    ) {
      return;
    }

    if (guidanceAnchorBounds) {
      return;
    }

    if (guidanceBeat.fallbackIntent && attemptedGuidanceIntentRef.current !== guidanceBeat.beatId) {
      attemptedGuidanceIntentRef.current = guidanceBeat.beatId;
      applyGuidanceFallbackIntent(guidanceBeat.fallbackIntent);
      return;
    }

    if (recordedGuidanceFallbackRef.current === guidanceBeat.beatId) {
      return;
    }

    recordedGuidanceFallbackRef.current = guidanceBeat.beatId;
    void session.commands.dispatch({
      type: "sim/guidance-record-anchor-failure",
      beatId: guidanceBeat.beatId,
      anchorId: guidanceBeat.target,
      fallbackUsed: true,
    });
  }, [
    applyGuidanceFallbackIntent,
    guidanceAnchorBounds,
    guidanceBeat,
    session,
    suspendFocusedGuidanceBeat,
  ]);

  // Handle UI-signaled guidance completion (target_opened, market_opened)
  useEffect(() => {
    if (!guidanceBeat || !session) return;
    if (!suppressTutorialBeat) return;

    const { beatId, completionKind } = guidanceBeat;

    attemptedGuidanceIntentRef.current = null;
    recordedGuidanceFallbackRef.current = null;
    void session.commands.dispatch({
      type: "sim/guidance-complete",
      beatId,
      signal: completionKind,
    });
  }, [guidanceBeat, session, suppressTutorialBeat]);

  useEffect(() => {
    if (!guidanceBeat || !session || suspendFocusedGuidanceBeat) {
      return;
    }

    if (
      guidanceBeat.completionKind === "market_opened" &&
      activeTab === "hq" &&
      hqCategory === "market"
    ) {
      void session.commands.dispatch({
        type: "sim/guidance-complete",
        beatId: guidanceBeat.beatId,
        signal: "market_opened",
      });
    }
  }, [activeTab, guidanceBeat, hqCategory, session, suspendFocusedGuidanceBeat]);

  useEffect(() => {
    if (!guidanceBeat || !session || !focus || suspendFocusedGuidanceBeat) {
      return;
    }

    if (guidanceBeat.completionKind === "room_inspected" && focus.targetKind === "room") {
      void session.commands.dispatch({
        type: "sim/guidance-complete",
        beatId: guidanceBeat.beatId,
        signal: "room_inspected",
      });
    }
  }, [focus, guidanceBeat, session, suspendFocusedGuidanceBeat]);

  const handleOperatorInspectedGuidance = useCallback(() => {
    if (
      !session ||
      suspendFocusedGuidanceBeat ||
      guidanceBeat?.completionKind !== "operator_inspected"
    ) {
      return;
    }

    void session.commands.dispatch({
      type: "sim/guidance-complete",
      beatId: guidanceBeat.beatId,
      signal: "operator_inspected",
    });
  }, [guidanceBeat, session, suspendFocusedGuidanceBeat]);

  useEffect(() => {
    if (!session || !activeGuidanceInterruption || !suppressTutorialInterruption) {
      return;
    }

    void session.commands.dispatch({
      type: "sim/interruption-resolve",
      instanceId: activeGuidanceInterruption.instanceId,
      choiceId: "acknowledged",
    });
  }, [activeGuidanceInterruption, session, suppressTutorialInterruption]);

  useEffect(() => {
    const engine = audioEngineRef.current;
    if (!engine || audioState !== "running" || !session) {
      return;
    }

    for (const cueId of session.drainPendingCues()) {
      engine.playCue(cueId);
    }
  }, [audioState, session?.state, session]);

  // ── Derive stable audio primitives from phase1View ──
  const hasActiveEncounter = phase1View?.encounter != null;
  const hasActiveRaids = (phase1View?.activeRaids.length ?? 0) > 0;
  const hasBossApproach = phase1View?.activeInterruption?.type === "raid_boss_commitment";
  const isReviewingResult = phase1View?.contractResult != null;

  // ── Derive music state from runtime ──
  useEffect(() => {
    const engine = audioEngineRef.current;
    if (!engine || audioState !== "running") return;

    const inputs = {
      activeTab,
      hasActiveEncounter,
      hasBossApproach,
      hasActiveRaids,
      isReviewingResult,
    };

    engine.setMusicState(selectMusicState(inputs));
  }, [
    audioState,
    activeTab,
    hasActiveEncounter,
    hasBossApproach,
    hasActiveRaids,
    isReviewingResult,
  ]);

  // Derive focused raid state (must be before early returns to keep hook count stable)
  const focusedRaidState =
    activeTab === "operations" && focus?.targetKind === "team" && session
      ? (session.state.phase1View.activeRaids.find((raid) => raid.id === focus.targetId) ?? null)
      : null;
  const focusedRaidOperatorStatuses = useMemo(
    () =>
      focusedRaidState
        ? new Map(
            focusedRaidState.operatorStatuses.map((opStatus) => [opStatus.operatorId, opStatus]),
          )
        : undefined,
    [focusedRaidState],
  );

  if (status === "error") {
    return (
      <ErrorShell message={errorMessage ?? "The requested runtime session could not be opened."} />
    );
  }

  if (status === "loading" || !session || !callbacks || !hq || !operations) {
    return <LoadingShell />;
  }

  const persistenceTimestamp = formatPersistenceTimestamp(session.persistence.lastSavedAt);
  const persistenceLabel =
    session.isPreview || !session.isSaveBacked
      ? null
      : session.persistence.status === "saving"
        ? "Saving..."
        : session.persistence.status === "error"
          ? "Save error"
          : persistenceTimestamp
            ? `Saved ${persistenceTimestamp}`
            : "Save ready";
  const persistenceClassName =
    session.persistence.status === "error"
      ? "text-magma"
      : session.persistence.status === "saving"
        ? "text-gold/80"
        : "text-silver/50";

  return (
    <AnchorRegistryProvider>
      <div className="relative h-dvh w-full overflow-hidden bg-void" data-testid="game-shell">
        {/* ── Full-screen world canvas (background layer) ──────── */}
        <div className="absolute inset-0 z-0">
          {activeTab === "hq" && hqWorldSnapshot && (
            <HqWorldCanvas
              snapshot={hqWorldSnapshot}
              focus={focus}
              onFocusChange={handleFocusChange}
              debugOverlays={debugOverlays}
            />
          )}
        </div>

        {/* ── UI overlays (absolutely positioned over the canvas) ── */}
        <div className="pointer-events-none absolute inset-0 z-10">
          {/* ── Command bar (top edge) ──────────────────────────── */}
          <header
            className="pointer-events-auto animate-enter absolute left-0 right-0 top-0 border-b border-[rgba(200,168,76,0.06)] bg-[rgba(6,6,8,0.55)] backdrop-blur-2xl"
            data-testid="game-header"
          >
            <div className="mx-auto flex max-w-[1400px] items-center gap-6 px-5 py-2.5">
              {/* Guild identity */}
              <div className="flex items-center gap-3">
                <div className="h-1.5 w-1.5 rounded-full bg-gold shadow-[0_0_6px_rgba(200,168,76,0.5)]" />
                <h1
                  className="font-[family-name:var(--font-display)] text-sm font-light tracking-[0.12em] text-silver-bright"
                  data-testid="guild-name"
                >
                  {hq.guild.guildName}
                </h1>
                <span className="text-xs uppercase tracking-[0.14em] text-gold/55">
                  {hq.guild.playerName}
                </span>
                <Tooltip content="Building tier - determines room slots and upgrade access">
                  <span className="badge badge-gold">T{hq.building.tier}</span>
                </Tooltip>
                <span className="hidden text-sm text-silver/48 sm:inline">{hq.building.name}</span>
              </div>

              {/* Separator */}
              <div className="hidden h-5 w-px bg-[rgba(200,168,76,0.08)] sm:block" />

              {/* Resources */}
              <div className="hidden items-center gap-4 sm:flex">
                <ResourceCounter
                  label="Cash"
                  value={hq.guild.treasury}
                  accent
                  tip="Funds for upgrades, hiring, and purchases"
                  valueTestId="resource-cash-value"
                />
                <ResourceCounter
                  label="Rep"
                  value={hq.guild.reputation}
                  tip="Reputation — attracts better contracts and recruits"
                  valueTestId="resource-reputation-value"
                />
                <ResourceCounter
                  label="Intel"
                  value={hq.guild.intel}
                  tip="Intelligence — reveals raid opportunities"
                  valueTestId="resource-intel-value"
                />
              </div>

              {/* Push right */}
              <div className="ml-auto flex items-center gap-4">
                {/* Time + advance */}
                <div className="flex items-center gap-2">
                  <Tooltip content="Current in-game day and time of day">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-xs font-medium uppercase tracking-[0.15em] text-gold/70">
                        D{hq.time.day}
                      </span>
                      <span className="font-[family-name:var(--font-display)] text-[0.8rem] font-light tabular-nums text-silver/80">
                        {hq.time.formatted}
                      </span>
                    </div>
                  </Tooltip>
                  <Tooltip content="Advance time by one hour">
                    <button
                      type="button"
                      className="btn-ghost text-xs"
                      data-testid="advance-hour"
                      onClick={advanceHour}
                    >
                      +1h
                    </button>
                  </Tooltip>
                </div>

                {/* Capacity glance */}
                <div className="hidden items-center gap-1.5 text-xs text-silver/60 lg:flex">
                  <Tooltip content="Rooms placed / total room slots">
                    <span>
                      {hq.building.usedRoomSlots}/{hq.building.totalRoomSlots}
                    </span>
                  </Tooltip>
                  <span className="opacity-60">rooms</span>
                  <span className="mx-0.5 opacity-40">|</span>
                  <Tooltip content="Active operators / max capacity">
                    <span
                      className={
                        hq.rosterPressure.replacementPressureLevel === "critical"
                          ? "text-ember"
                          : hq.rosterPressure.replacementPressureLevel === "strained"
                            ? "text-smolder"
                            : ""
                      }
                    >
                      {hq.rosterPressure.livingOperatorCount}/{hq.rosterPressure.operatorCapacity}
                    </span>
                  </Tooltip>
                  <span className="opacity-60">ops</span>
                  {hq.rosterPressure.vacancyCount > 0 && (
                    <Tooltip content="Open operator slots that need filling">
                      <span className="text-ember">({hq.rosterPressure.vacancyCount} vacant)</span>
                    </Tooltip>
                  )}
                  {hq.rosterPressure.recentDeathOperatorIds.length > 0 && (
                    <Tooltip content="Operators recently killed in action">
                      <span className="text-magma">
                        &middot; {hq.rosterPressure.recentDeathOperatorIds.length} lost
                      </span>
                    </Tooltip>
                  )}
                </div>

                <button
                  type="button"
                  className="btn-ghost text-xs"
                  data-testid="open-settings"
                  onClick={openSettingsModal}
                >
                  settings
                </button>
                <Link to="/" className="btn-ghost text-xs" data-testid="exit-to-start">
                  exit
                </Link>
              </div>
            </div>
          </header>

          {/* ── Tab navigation + category pills (below header) ── */}
          <nav
            className="pointer-events-auto animate-enter-delay-1 absolute left-0 right-0 top-[45px] border-b border-[rgba(200,168,76,0.04)] bg-[rgba(6,6,8,0.35)] backdrop-blur-xl"
            data-testid="shell-nav"
          >
            <div className="mx-auto flex max-w-[1400px] items-center gap-0 px-5">
              {TAB_ORDER.map((tab) => (
                <button
                  key={tab}
                  type="button"
                  className={tabButtonClass}
                  data-testid={`shell-tab-${tab}`}
                  data-active={activeTab === tab}
                  onClick={() => setActiveTab(tab)}
                >
                  {TAB_LABELS[tab]}
                </button>
              ))}

              {/* Category pills */}
              <div className="ml-auto flex items-center gap-1.5 overflow-x-auto py-1">
                {activeTab === "hq" &&
                  HQ_CATEGORIES.map((cat) => {
                    const anchorRef =
                      cat.id === "management"
                        ? managementCategoryAnchorRef
                        : cat.id === "roster"
                          ? rosterCategoryAnchorRef
                          : cat.id === "rooms"
                            ? roomsCategoryAnchorRef
                            : cat.id === "market"
                              ? marketCategoryAnchorRef
                              : undefined;
                    return (
                      <div key={cat.id} ref={anchorRef}>
                        <CategoryPill
                          label={cat.label}
                          icon={cat.icon}
                          isActive={hqCategory === cat.id}
                          testId={`hq-category-${cat.id}`}
                          onClick={() => setHqCategory(hqCategory === cat.id ? null : cat.id)}
                        />
                      </div>
                    );
                  })}
                {activeTab === "operations" &&
                  OPS_CATEGORIES.map((cat) => (
                    <CategoryPill
                      key={cat.id}
                      label={cat.label}
                      icon={cat.icon}
                      isActive={opsCategory === cat.id}
                      testId={`ops-category-${cat.id}`}
                      onClick={() => setOpsCategory(opsCategory === cat.id ? null : cat.id)}
                    />
                  ))}
              </div>

              {/* Status badges */}
              <div className="hidden shrink-0 items-center gap-2 pl-3 md:flex">
                {hq.rosterPressure.replacementPressureLevel !== "stable" && (
                  <Tooltip
                    content={
                      hq.rosterPressure.replacementPressureLevel === "critical"
                        ? "Dangerously low — recruit operators urgently"
                        : "Below ideal strength — consider recruiting"
                    }
                  >
                    <span
                      className={`badge animate-enter ${
                        hq.rosterPressure.replacementPressureLevel === "critical"
                          ? "badge-ember"
                          : "badge-slate"
                      }`}
                    >
                      {hq.rosterPressure.replacementPressureLevel === "critical"
                        ? "roster critical"
                        : "roster strained"}
                    </span>
                  </Tooltip>
                )}
                {operations.activeRaids.length > 0 && (
                  <span className="badge badge-ember animate-enter">
                    {operations.activeRaids.length} active
                  </span>
                )}
                {hq.activeEvents.length > 0 && (
                  <span className="badge badge-slate animate-enter">
                    {hq.activeEvents.length} {hq.activeEvents.length === 1 ? "event" : "events"}
                  </span>
                )}
              </div>
            </div>
          </nav>

          {/* ── Operations map overlay ── */}
          {activeTab === "operations" && (
            <div
              ref={raidMapAnchorRef}
              className="pointer-events-auto absolute bottom-10 left-0 right-0 top-[85px]"
            >
              {raidWorldSnapshot ? (
                <RaidWorldView
                  snapshot={raidWorldSnapshot}
                  focus={focus}
                  onFocusChange={handleFocusChange}
                />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <p className="text-xs text-silver/40">No active contract site</p>
                </div>
              )}
            </div>
          )}

          {/* ── Left column: event log ── */}
          <div className="pointer-events-none absolute left-4 top-[92px] z-20 flex flex-col items-start gap-2">
            <div ref={eventLogAnchorRef}>
              <EventLog entries={eventLog} onEntryClick={handleEventLogClick} />
            </div>
          </div>

          {/* ── Floating HQ-world floor switcher ── */}
          {activeTab === "hq" && hq.building.floorCount > 1 && (
            <div
              className={`${glassPanelClass} pointer-events-auto animate-enter absolute left-1/2 top-[92px] z-30 flex -translate-x-1/2 items-center gap-1 rounded-full px-2 py-1`}
              data-testid="floor-switcher"
              role="group"
              aria-label="Floor navigation"
            >
              <span className="pl-1 pr-0.5 text-xs uppercase tracking-[0.15em] text-gold/70">
                Floor
              </span>
              <button
                type="button"
                data-testid="floor-step-previous"
                aria-label="Go to previous floor"
                className="rounded-full border border-[rgba(200,168,76,0.08)] bg-[rgba(6,6,8,0.35)] px-2 py-1 text-xs text-silver/70 transition-colors hover:text-silver-bright disabled:cursor-not-allowed disabled:opacity-45"
                disabled={activeFloorOrderIndex === 0}
                onClick={() =>
                  callbacks.setActiveFloor(
                    orderedFloorIndices[Math.max(0, activeFloorOrderIndex - 1)] ?? 0,
                  )
                }
              >
                <span aria-hidden="true">↓</span>
              </button>
              <div className="flex items-center gap-0.5">
                {orderedFloorIndices.map((floorIndex) => {
                  const label =
                    hq.building.id === "building/porters"
                      ? (PORTERS_FLOOR_LABELS[floorIndex] ?? String(floorIndex + 1))
                      : hq.building.id === "building/skyscraper"
                        ? (SKYSCRAPER_FLOOR_LABELS[floorIndex] ?? String(floorIndex + 1))
                        : String(floorIndex + 1);
                  const isActive = hq.building.activeFloorIndex === floorIndex;
                  return (
                    <button
                      key={floorIndex}
                      type="button"
                      data-testid="floor-select"
                      data-floor-index={floorIndex}
                      aria-pressed={isActive}
                      className={`rounded-full border px-2 py-1 text-xs uppercase tracking-[0.12em] transition-colors ${
                        isActive
                          ? "border-[rgba(200,168,76,0.28)] bg-[rgba(200,168,76,0.12)] text-gold"
                          : "border-[rgba(200,168,76,0.08)] bg-[rgba(6,6,8,0.35)] text-silver/55 hover:text-silver-bright"
                      }`}
                      onClick={() => callbacks.setActiveFloor(floorIndex)}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
              <button
                type="button"
                data-testid="floor-step-next"
                aria-label="Go to next floor"
                className="rounded-full border border-[rgba(200,168,76,0.08)] bg-[rgba(6,6,8,0.35)] px-2 py-1 text-xs text-silver/70 transition-colors hover:text-silver-bright disabled:cursor-not-allowed disabled:opacity-45"
                disabled={activeFloorOrderIndex >= orderedFloorIndices.length - 1}
                onClick={() =>
                  callbacks.setActiveFloor(
                    orderedFloorIndices[
                      Math.min(orderedFloorIndices.length - 1, activeFloorOrderIndex + 1)
                    ] ?? hq.building.activeFloorIndex,
                  )
                }
              >
                <span aria-hidden="true">↑</span>
              </button>
            </div>
          )}

          {activeTab === "hq" && hqFocusStack.length > 0 && (
            <div
              className="pointer-events-none absolute bottom-10 left-4 right-4 top-[92px] z-20 flex min-h-0 flex-col items-stretch justify-end"
              data-testid="hq-cascade-anchor"
            >
              <PanelStack
                testId="hq-cascade"
                className="max-h-full"
                entries={buildHqStackEntries({
                  stack: hqFocusStack,
                  hq,
                  teams,
                  roomCultures,
                  inventory,
                  lootAutomation,
                  equipment,
                  marketItems,
                  cityPressure,
                  callbacks,
                  handleOperatorInspectedGuidance,
                  handleFocusChange,
                  onCloseAt: (index) => setHqFocusStack((prev) => hqCloseAt(prev, index)),
                  onOpenBranch: (parentIndex, branch) =>
                    setHqFocusStack((prev) => hqSetBranchAt(prev, parentIndex, branch)),
                })}
                onClose={(index) => setHqFocusStack((prev) => hqCloseAt(prev, index))}
              />
            </div>
          )}

          {activeTab === "operations" && opsFocusStack.length > 0 && (
            <div
              className="pointer-events-none absolute bottom-10 left-4 right-4 top-[92px] z-20 flex min-h-0 flex-col items-stretch justify-end"
              data-testid="ops-cascade-anchor"
            >
              <PanelStack
                testId="ops-cascade"
                className="max-h-full"
                entries={buildOpsStackEntries({
                  stack: opsFocusStack,
                  operations,
                  guildName: hq.guild.guildName,
                  operators: hq.operators,
                  rosterPressure: hq.rosterPressure,
                  raidWorldSnapshot,
                  focusedRaidState,
                  focusedRaidOperatorStatuses,
                  callbacks,
                  contractRootAnchorRef: contractBoardAnchorRef,
                  historyRootAnchorRef: opsHistoryPanelAnchorRef,
                  onCloseAt: (index) => setOpsFocusStack((prev) => opsCloseAt(prev, index)),
                  onOpenBranch: (parentIndex, branch) =>
                    setOpsFocusStack((prev) => opsSetBranchAt(prev, parentIndex, branch)),
                  onReplaceRoot: (next) => setOpsFocusStack(next ? [next] : []),
                })}
                onClose={(index) => setOpsFocusStack((prev) => opsCloseAt(prev, index))}
              />
            </div>
          )}

          {/* ── Status strip ────────────────────────────────────── */}
          <footer className="pointer-events-auto absolute bottom-0 left-0 right-0 border-t border-[rgba(200,168,76,0.04)] bg-[rgba(6,6,8,0.5)] px-5 py-1.5 backdrop-blur-md">
            <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <span
                  className="text-sm uppercase tracking-[0.15em] text-silver/60"
                  data-testid="session-mode"
                >
                  {session.mode === "preview"
                    ? "sandbox session"
                    : session.mode === "new"
                      ? "new session"
                      : "saved session"}
                </span>
                {persistenceLabel && (
                  <span
                    data-testid="persistence-label"
                    className={`text-sm uppercase tracking-[0.12em] ${persistenceClassName}`}
                    title={session.persistence.errorMessage}
                  >
                    {persistenceLabel}
                  </span>
                )}
              </div>
              <span className="shrink-0 text-sm tabular-nums text-silver/60">
                {session.registry.rooms.length} rooms &middot; {session.registry.missions.length}{" "}
                missions
              </span>
            </div>
          </footer>
        </div>

        {import.meta.env.DEV && devMenuOpen && session && (
          <DevConsole
            session={session}
            onClose={() => setDevMenuOpen(false)}
            debugOverlays={debugOverlays}
            onDebugOverlaysChange={setDebugOverlays}
            eventLogEntries={eventLog}
          />
        )}

        {phase1View?.encounter && (
          <EncounterSurface
            encounter={phase1View.encounter}
            onPause={handleEncounterPause}
            onResume={handleEncounterResume}
            onStep={handleEncounterStep}
            onRetreat={handleEncounterRetreat}
            onDismiss={handleEncounterDismiss}
            onUseIntervention={handleEncounterIntervention}
            isDevMode={import.meta.env.DEV}
            hasConsumables={hasConsumables}
          />
        )}

        {/* ── Guidance host (focused beats with spotlight/coachmark) ── */}
        {guidanceBeat && !suppressTutorialBeat && !suspendFocusedGuidanceBeat && (
          <GuidanceHost
            activeBeat={guidanceBeat}
            anchorBounds={guidanceAnchorBounds}
            onComplete={handleGuidanceComplete}
            onDismiss={handleGuidanceDismiss}
            progress={guidanceProgress}
          />
        )}

        {phase1View?.activeInterruption &&
          phase1View.activeInterruption.type !== "settings" &&
          !(phase1View.activeInterruption.type === "guidance" && suppressTutorialInterruption) && (
            <InterruptionHost
              activeInterruption={phase1View.activeInterruption}
              guildName={hq.guild.guildName}
              playerName={hq.guild.playerName}
              onResolve={handleInterruptionResolve}
              onDismiss={handleInterruptionDismiss}
            />
          )}

        {activeModal === "settings" && (
          <SettingsModal
            settings={settings}
            audioState={audioState}
            wakeLock={wakeLock}
            aiConnectionStatus={session?.ai.connectionStatus}
            onClose={closeActiveModal}
            onSfxVolumeChange={handleSfxVolumeChange}
            onMusicVolumeChange={handleMusicVolumeChange}
            onWakeLockToggle={toggleWakeLock}
            onTutorialEventsToggle={toggleTutorialEvents}
            onReplayOpeningGuidance={resetOpeningGuidance}
            onResetDefaults={resetSettings}
            onAiEnabledToggle={toggleAiEnabled}
            onAiRuntimeKindChange={setAiRuntimeKind}
            onAiBaseUrlChange={setAiBaseUrl}
            onAiModelIdChange={setAiModelId}
            onAiProbe={probeAiRuntime}
          />
        )}
      </div>
    </AnchorRegistryProvider>
  );
}

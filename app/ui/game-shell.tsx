import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "react-router";

import { createAudioEngine, type AudioEngine, type AudioEngineState } from "app/features/audio";
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

import { DevMenuOverlay } from "./dev-menu";
import { EventLog } from "./event-log";
import { HqPanel } from "./hq-panel";
import { InventoryPanel } from "./inventory-panel";
import { ManagementPanel } from "./management-panel";
import { MarketPanel } from "./market-panel";
import { OperatorPortrait } from "./operator-portrait";
import { OperatorCombatSummary } from "./operator-combat-summary";
import { OperationsPanel } from "./raid-panel";
import { RaidEventFeed, RaidFocusFrame } from "./raid-world";
import { RaidWorldView } from "./raid-world-view";
import { RosterPanel } from "./roster-panel";
import { SettingsModal } from "./settings-modal";
import { Tooltip } from "./_tooltip";
import { useEventLog } from "./use-event-log";
import { getRecoveryStateSummary, getRosterFlowSurfaceSummary } from "./policy-summaries";
import { InterruptionHost } from "./interruption-host";
import { EncounterSurface } from "./encounter-surface";
import { GuidanceHost } from "./guidance-host";
import { AnchorRegistryProvider, useAnchorRegistry, useGuidanceAnchor } from "./guidance-anchor";
import { getRoleMeta, getSpecialtyMeta } from "./_glossary";
import {
  emptyStateClass,
  emptyStateIconClass,
  glassPanelClass,
  progressBarFillClass,
  tabButtonClass,
} from "./styles";
import {
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
  GameCallbacks,
  InventoryItemViewModel,
  LootAutomationViewModel,
  MarketItemViewModel,
  OperatorViewModel,
  RoomCultureViewModel,
  TeamViewModel,
  VisitorViewModel,
} from "./view-models";

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

type HqCategory = "rooms" | "roster" | "management" | "teams" | "inventory" | "market";
type OpsCategory = "contract" | "active" | "opportunities" | "history";

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
    setRoomActive: (roomId: string, isActive: boolean) => {
      void session.commands.setRoomActive({ roomId, isActive });
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
    hireStaff: (roleTag: string) => {
      void session.commands.hireStaff({ roleTag });
    },
    assignStaff: (staffId: string, roomId?: string) => {
      void session.commands.assignStaff({ staffId, roomId });
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
  onDismiss,
}: {
  operator: OperatorViewModel;
  policies: PolicyState;
  onDismiss: () => void;
}) {
  const recoverySummary = getRecoveryStateSummary(operator, policies);

  return (
    <div className="glass-card pointer-events-auto animate-enter w-72 p-4">
      <div className="flex items-start justify-between gap-3">
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

      <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
        <Tooltip content="What this operator wants to do right now">
          <div className="glass-card-inset p-2">
            <p className="uppercase tracking-[0.12em] text-gold/60">Intent</p>
            <p className="mt-1 text-silver-bright">{operator.intent}</p>
          </div>
        </Tooltip>
        <Tooltip content="Overall combat readiness score">
          <div className="glass-card-inset p-2">
            <p className="uppercase tracking-[0.12em] text-gold/60">Readiness</p>
            <p className="mt-1 tabular-nums text-silver-bright">
              {Math.round(operator.readinessScore)}
            </p>
          </div>
        </Tooltip>
        <Tooltip content="Low morale risks task refusal or departure">
          <div className="glass-card-inset p-2">
            <p className="uppercase tracking-[0.12em] text-gold/60">Morale</p>
            <p className="mt-1 tabular-nums text-silver-bright">
              {Math.round(operator.moraleCurrent)}
            </p>
          </div>
        </Tooltip>
        <Tooltip content="Low loyalty increases the chance of quitting">
          <div className="glass-card-inset p-2">
            <p className="uppercase tracking-[0.12em] text-gold/60">Loyalty</p>
            <p className="mt-1 tabular-nums text-silver-bright">
              {Math.round(operator.loyaltyCurrent)}
            </p>
          </div>
        </Tooltip>
      </div>

      <div className="mt-3 flex flex-wrap gap-2 text-sm text-silver/60">
        <Tooltip content="Physical tiredness. Builds on duty, recovers at rest" side="top">
          <span>Fatigue {Math.round(operator.needFatigue)}</span>
        </Tooltip>
        <Tooltip content="Mental strain. Reduces effectiveness when high" side="top">
          <span>Stress {Math.round(operator.needStress)}</span>
        </Tooltip>
        {operator.injurySeverity > 0 && (
          <Tooltip content="Time remaining until fully recovered" side="top">
            <span className="text-ember">Injured ({Math.ceil(operator.injuryRecoveryHours)}h)</span>
          </Tooltip>
        )}
        {operator.availableForRaid && (
          <Tooltip content="Healthy and unassigned — can join a raid" side="top">
            <span className="text-gold/70">Raid-ready</span>
          </Tooltip>
        )}
      </div>

      <div className="mt-3 border-t border-[rgba(200,168,76,0.06)] pt-3">
        <OperatorCombatSummary combat={operator.combat} title="Field Kit" />
      </div>

      {/* Phase 2: Autonomy risk warnings */}
      {(operator.refusalRisk || operator.quitRisk || operator.retentionRisk) && (
        <div className="mt-2 space-y-1 border-t border-[rgba(200,168,76,0.06)] pt-2">
          {operator.autonomyReasons.map((reason) => (
            <p
              key={reason}
              className={`text-sm ${operator.quitRisk ? "text-magma" : "text-ember"}`}
            >
              {reason}
            </p>
          ))}
        </div>
      )}

      {recoverySummary && (
        <div className="mt-2 space-y-1 rounded-lg border border-[rgba(200,168,76,0.08)] bg-[rgba(200,168,76,0.04)] px-3 py-2">
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
    </div>
  );
}

// ── Visitor recruitment card ──────────────────────────────────────────────

function FocusedVisitorOverlay({
  visitor,
  policies,
  rosterFull,
  replaceableOperators,
  onRecruit,
  onDeferVisitor,
  onDismissVisitor,
  onReplaceRecruit,
  onDismissRecruit,
  onClose,
}: {
  visitor: VisitorViewModel;
  policies: PolicyState;
  rosterFull: boolean;
  replaceableOperators: readonly OperatorViewModel[];
  onRecruit: () => void;
  onDeferVisitor: () => void;
  onDismissVisitor: () => void;
  onReplaceRecruit: (operatorId: string) => void;
  onDismissRecruit: () => void;
  onClose: () => void;
}) {
  const [showReplacementPicker, setShowReplacementPicker] = useState(false);
  const patienceMinutes = Math.max(0, Math.ceil(visitor.patience));
  const patienceHours = Math.floor(patienceMinutes / 60);
  const patienceRemainder = patienceMinutes % 60;
  const patienceDisplay =
    patienceHours > 0 ? `${patienceHours}h ${patienceRemainder}m` : `${patienceRemainder}m`;
  const patienceFraction = Math.max(0, Math.min(1, visitor.patience / 120));
  const patienceUrgent = patienceFraction <= 0.25;
  const rosterFlowSummary = getRosterFlowSurfaceSummary(policies.rosterFlow);

  return (
    <div className="glass-card pointer-events-auto animate-enter w-72 border-[rgba(232,170,60,0.1)] p-4">
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
        <span>Patience {patienceDisplay}</span>
      </div>

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
            className="btn-primary flex-1"
            disabled={!visitor.canAccept && !visitor.canReplace}
            onClick={
              visitor.canAccept
                ? onRecruit
                : visitor.canReplace
                  ? () => setShowReplacementPicker((current) => !current)
                  : undefined
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

      {showReplacementPicker && visitor.canReplace && replaceableOperators.length > 0 && (
        <div className="mt-3 rounded-lg border border-[rgba(232,170,60,0.12)] bg-[rgba(232,170,60,0.04)] px-3 py-2">
          <div className="text-xs uppercase tracking-[0.12em] text-[rgba(232,170,60,0.7)]">
            Replace Operator
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {replaceableOperators.map((operator) => (
              <Tooltip
                key={operator.id}
                content={
                  operator.canBeReplaced
                    ? `Dismiss ${operator.name} and recruit ${visitor.name}`
                    : operator.replaceLockedReason || "Unavailable"
                }
              >
                <button
                  type="button"
                  className={`btn-ghost px-2 py-0.5 text-sm ${
                    operator.canBeReplaced ? "" : "cursor-not-allowed text-silver/30"
                  }`}
                  disabled={!operator.canBeReplaced}
                  onClick={() => onReplaceRecruit(operator.id)}
                >
                  {operator.name}
                </button>
              </Tooltip>
            ))}
          </div>
        </div>
      )}
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

// ── Main shell component ─────────────────────────────────────────────────

export function GameShell() {
  const location = useLocation();
  const request = parseRuntimeRouteRequest(location.search);
  const { status, session, errorMessage } = useRuntimeSession(request);
  const { settings, updateSettings, resetSettings } = useGameSettings();
  const initialNavigation = getDefaultShellNavigation(request);
  const [activeTab, setActiveTab] = useState<ShellTab>(initialNavigation.activeTab);
  const [hqCategory, setHqCategory] = useState<HqCategory | null>(initialNavigation.hqCategory);
  const [opsCategory, setOpsCategory] = useState<OpsCategory | null>(initialNavigation.opsCategory);
  const [activeModal, setActiveModal] = useState<ActiveGameModal>(null);
  const [devMenuOpen, setDevMenuOpen] = useState(false);
  const [debugOverlays, setDebugOverlays] = useState<HqDebugOverlays>({});
  const [focus, setFocus] = useState<FocusPayload | null>(null);
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
    setHqCategory(nextNavigation.hqCategory);
    setOpsCategory(nextNavigation.opsCategory);
    setFocus(null);
  }, [request.mode, request.slotId]);

  useEffect(() => {
    setFocus(null);
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
  const registry = session?.registry ?? null;

  const phase2 = useMemo(
    () => (session ? session.simulation.getPhase2View() : null),
    [phase1View, session],
  );

  const hqBase = useMemo(
    () =>
      session && phase1View && registry
        ? buildHqViewFromPhase1(phase1View, registry, phase2?.inventory)
        : null,
    [phase1View, registry, session, phase2],
  );
  const operations = useMemo(
    () => (session && phase1View && registry ? buildOpsViewFromPhase1(phase1View, registry) : null),
    [phase1View, registry, session],
  );

  const hq = useMemo(() => {
    if (!hqBase || !phase2) return hqBase;
    return {
      ...hqBase,
      operators: enrichOperatorsWithAutonomy(hqBase.operators, phase2),
    };
  }, [hqBase, phase2]);

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
  const hqWorldSnapshot = useMemo<HqWorldSnapshot | null>(
    () =>
      rawHqWorld
        ? { ...rawHqWorld, effects: buildContextEffects(rawHqWorld.effects, "hq", focus !== null) }
        : null,
    [rawHqWorld, focus],
  );
  const raidWorldSnapshot = useMemo<RaidWorldSnapshot | null>(
    () =>
      rawRaidWorld
        ? {
            ...rawRaidWorld,
            effects: buildContextEffects(rawRaidWorld.effects, "raid", focus !== null),
          }
        : null,
    [rawRaidWorld, focus],
  );

  const handleFocusChange = useCallback(
    (newFocus: FocusPayload | null) => {
      setFocus(newFocus);
      if (newFocus?.targetKind === "room" && hq) {
        setHqCategory("rooms");
        const room = hq.rooms.find((r) => r.id === newFocus.targetId);
        if (room && room.floorIndex !== hq.building.activeFloorIndex) {
          callbacks.setActiveFloor(room.floorIndex);
        }
      } else if (newFocus?.targetKind === "operator" || newFocus?.targetKind === "staff") {
        setHqCategory("roster");
      }
    },
    [hq, callbacks],
  );

  const navActions = useMemo(() => ({ setActiveTab, setHqCategory, setOpsCategory, setFocus }), []);
  const handleEventLogClick = useCallback(
    (entry: { targetKind?: string; targetId?: string; kind: string }) => {
      handleEventLogEntryClick(entry as Parameters<typeof handleEventLogEntryClick>[0], navActions);
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
    [setFocus],
  );

  useEffect(() => {
    if (
      !guidanceBeat ||
      !session ||
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
  }, [applyGuidanceFallbackIntent, guidanceAnchorBounds, guidanceBeat, session]);

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
    if (!guidanceBeat || !session) {
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
      return;
    }

    // Beats with requiresManualCompletion need the user to click the CTA button.
    if (guidanceBeat.requiresManualCompletion) return;
  }, [activeTab, guidanceBeat, hqCategory, session]);

  useEffect(() => {
    if (!guidanceBeat || !session || !focus) {
      return;
    }

    if (guidanceBeat.completionKind === "room_inspected" && focus.targetKind === "room") {
      void session.commands.dispatch({
        type: "sim/guidance-complete",
        beatId: guidanceBeat.beatId,
        signal: "room_inspected",
      });
    }
  }, [focus, guidanceBeat, session]);

  const handleInspectOperator = useCallback(
    (_operatorId: string) => {
      if (!session || guidanceBeat?.completionKind !== "operator_inspected") {
        return;
      }

      void session.commands.dispatch({
        type: "sim/guidance-complete",
        beatId: guidanceBeat.beatId,
        signal: "operator_inspected",
      });
    },
    [guidanceBeat, session],
  );

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

  const focusedOperator =
    activeTab === "hq" && focus?.targetKind === "operator"
      ? (hq.operators.find((operator) => operator.id === focus.targetId) ?? null)
      : null;
  const focusedVisitor =
    activeTab === "hq" && focus?.targetKind === "visitor"
      ? (hq.visitors.find((v) => v.id === focus.targetId) ?? null)
      : null;
  const focusedRaidTeam =
    activeTab === "operations" && focus?.targetKind === "team"
      ? (raidWorldSnapshot?.teams.find((team) => team.teamId === focus.targetId) ?? null)
      : null;

  const focusedOperatorId =
    focus?.targetKind === "operator" ||
    focus?.targetKind === "staff" ||
    focus?.targetKind === "visitor"
      ? focus.targetId
      : null;
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
                {hq.building.floorCount > 1 && (
                  <div className="flex items-center gap-1">
                    <span className="text-xs uppercase tracking-[0.15em] text-gold/60">Floor</span>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: hq.building.floorCount }, (_, floorIndex) => (
                        <button
                          key={floorIndex}
                          type="button"
                          className={`rounded-full border px-2 py-1 text-xs uppercase tracking-[0.12em] transition-colors ${
                            hq.building.activeFloorIndex === floorIndex
                              ? "border-[rgba(200,168,76,0.28)] bg-[rgba(200,168,76,0.12)] text-gold"
                              : "border-[rgba(200,168,76,0.08)] bg-[rgba(6,6,8,0.35)] text-silver/55 hover:text-silver-bright"
                          }`}
                          onClick={() => callbacks.setActiveFloor(floorIndex)}
                        >
                          {floorIndex + 1}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
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
                  {hq.staff.length > 0 && (
                    <>
                      <span className="mx-0.5 opacity-40">|</span>
                      <Tooltip content="Total hired staff across all rooms">
                        <span>{hq.staff.length}</span>
                      </Tooltip>
                      <span className="opacity-60">staff</span>
                    </>
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
                      cat.id === "roster"
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

          {/* ── Right column: event log + focus panels ── */}
          <div className="pointer-events-none absolute right-4 top-[92px] z-20 flex flex-col items-end gap-2">
            <div ref={eventLogAnchorRef}>
              <EventLog entries={eventLog} onEntryClick={handleEventLogClick} />
            </div>

            {focusedOperator && (
              <FocusedOperatorOverlay
                operator={focusedOperator}
                policies={hq.policies}
                onDismiss={() => setFocus(null)}
              />
            )}

            {focusedVisitor && (
              <FocusedVisitorOverlay
                visitor={focusedVisitor}
                policies={hq.policies}
                rosterFull={hq.rosterPressure.vacancyCount <= 0}
                replaceableOperators={
                  focusedVisitor ? hq.operators.filter((operator) => operator.canBeReplaced) : []
                }
                onRecruit={() => {
                  callbacks.acceptRecruit(focusedVisitor.id);
                  setFocus(null);
                }}
                onDeferVisitor={() => {
                  callbacks.deferRecruit(focusedVisitor.id);
                  setFocus(null);
                }}
                onDismissVisitor={() => {
                  callbacks.rejectRecruit(focusedVisitor.id);
                  setFocus(null);
                }}
                onReplaceRecruit={(operatorId) => {
                  callbacks.replaceRecruit(focusedVisitor.id, operatorId);
                  setFocus(null);
                }}
                onDismissRecruit={() => {
                  callbacks.dismissRecruit(focusedVisitor.id);
                  setFocus(null);
                }}
                onClose={() => setFocus(null)}
              />
            )}

            {focusedRaidTeam && focus && (
              <>
                <RaidFocusFrame
                  team={focusedRaidTeam}
                  getOperatorName={(id) =>
                    hq.operators.find((operator) => operator.id === id)?.name ?? null
                  }
                  operatorStatuses={focusedRaidOperatorStatuses}
                  encounter={focusedRaidState?.encounter ?? null}
                  onDismiss={() => setFocus(null)}
                />
                <div
                  className={`${glassPanelClass} pointer-events-auto animate-enter w-80 rounded-xl p-4 shadow-xl`}
                >
                  <RaidEventFeed events={focusedRaidState?.recentEvents ?? []} />
                </div>
              </>
            )}
          </div>

          {/* ── Bottom panel (slides up when category selected) ── */}
          {((activeTab === "hq" && hqCategory !== null) ||
            (activeTab === "operations" && opsCategory !== null)) && (
            <div
              className={`${glassPanelClass} pointer-events-auto animate-slide-up absolute bottom-10 left-0 right-0 z-10 max-h-[45vh] overflow-y-auto rounded-xl p-4 shadow-[0_-8px_40px_rgba(0,0,0,0.4)]`}
            >
              <div
                className="flex items-start gap-3"
                data-testid="shell-bottom-panel"
                data-active-tab={activeTab}
                data-active-category={activeTab === "hq" ? (hqCategory ?? "") : (opsCategory ?? "")}
              >
                <div className="min-w-0 flex-1">
                  {activeTab === "hq" && hqCategory === "rooms" && (
                    <HqPanel
                      hq={hq}
                      callbacks={callbacks}
                      focus={focus}
                      onFocusChange={handleFocusChange}
                      onClearFocus={() => setFocus(null)}
                      roomCultures={roomCultures}
                    />
                  )}
                  {activeTab === "hq" && hqCategory === "roster" && (
                    <RosterPanel
                      operators={hq.operators}
                      staff={hq.staff}
                      visitors={hq.visitors}
                      relationships={hq.relationships}
                      rooms={hq.rooms}
                      callbacks={callbacks}
                      rosterPressure={hq.rosterPressure}
                      policies={hq.policies}
                      focusedOperatorId={focusedOperatorId}
                      roomCultures={roomCultures}
                      teams={teams}
                      onInspectOperator={handleInspectOperator}
                    />
                  )}
                  {activeTab === "hq" && hqCategory === "management" && (
                    <ManagementPanel
                      guildName={hq.guild.guildName}
                      policies={hq.policies}
                      contractLifecycle={hq.contractLifecycle}
                      building={hq.building}
                      rooms={hq.rooms}
                      relocationGate={hq.relocationGate}
                      callbacks={callbacks}
                    />
                  )}
                  {activeTab === "hq" && hqCategory === "teams" && (
                    <div className="animate-enter space-y-3">
                      <h3 className="text-xs font-medium uppercase tracking-[0.15em] text-gold/80">
                        Recurring Teams
                      </h3>
                      <TeamsCard teams={teams} />
                    </div>
                  )}
                  {activeTab === "hq" && hqCategory === "inventory" && (
                    <InventoryPanel
                      inventory={inventory}
                      lootAutomation={lootAutomation}
                      equipment={equipment}
                      marketItems={marketItems}
                      callbacks={callbacks}
                    />
                  )}
                  {activeTab === "hq" && hqCategory === "market" && (
                    <MarketPanel
                      marketItems={marketItems}
                      inventory={inventory}
                      guild={hq.guild}
                      day={hq.time.day}
                      callbacks={callbacks}
                    />
                  )}
                  {activeTab === "operations" && opsCategory && callbacks && (
                    <div
                      ref={
                        opsCategory === "contract"
                          ? contractBoardAnchorRef
                          : opsCategory === "history"
                            ? opsHistoryPanelAnchorRef
                            : undefined
                      }
                    >
                      <OperationsPanel
                        guildName={hq.guild.guildName}
                        operations={operations}
                        operators={hq.operators}
                        rosterPressure={hq.rosterPressure}
                        focus={focus}
                        activeCategory={opsCategory}
                        callbacks={callbacks}
                      />
                    </div>
                  )}
                </div>
                {/* Collapse chevron — in-flow, rightmost element at header level */}
                <button
                  type="button"
                  className="btn-ghost shrink-0 px-1.5 py-0.5 text-silver/50 hover:text-gold"
                  onClick={() => {
                    if (activeTab === "hq") setHqCategory(null);
                    else setOpsCategory(null);
                  }}
                  aria-label="Collapse panel"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M4 6L8 10L12 6"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </div>
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
          <DevMenuOverlay
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
        {guidanceBeat && !suppressTutorialBeat && (
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
            onClose={closeActiveModal}
            onSfxVolumeChange={handleSfxVolumeChange}
            onMusicVolumeChange={handleMusicVolumeChange}
            onWakeLockToggle={toggleWakeLock}
            onTutorialEventsToggle={toggleTutorialEvents}
            onReplayOpeningGuidance={resetOpeningGuidance}
            onResetDefaults={resetSettings}
          />
        )}
      </div>
    </AnchorRegistryProvider>
  );
}

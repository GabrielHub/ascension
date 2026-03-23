import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "react-router";

import { createAudioEngine, type AudioEngine, type AudioEngineState } from "app/features/audio";
import { parseRuntimeRouteRequest, useRuntimeSession } from "app/features/runtime";
import { HqWorldCanvas } from "render";
import type {
  FocusPayload,
  HqWorldSnapshot,
  RaidWorldSnapshot,
  WorldEffectsSnapshot,
} from "render";

import { DevMenuOverlay } from "./dev-menu";
import { EventLog } from "./event-log";
import { HqPanel } from "./hq-panel";
import { InventoryPanel } from "./inventory-panel";
import { MarketPanel } from "./market-panel";
import { OperatorPortrait } from "./operator-portrait";
import { OperationsPanel } from "./raid-panel";
import { RaidEventFeed, RaidFocusFrame } from "./raid-world";
import { RaidWorldView } from "./raid-world-view";
import { RosterPanel } from "./roster-panel";
import { Tooltip } from "./_tooltip";
import { useEventLog } from "./use-event-log";
import {
  buildEquipmentViewModels,
  buildHqViewFromPhase1,
  buildInventoryViewModels,
  buildMarketItemViewModels,
  buildOpsViewFromPhase1,
  buildRoomCultureViewModels,
  buildTeamViewModels,
  enrichOperatorsWithAutonomy,
  formatTag,
} from "./view-models";
import type {
  EquipmentViewModel,
  GameCallbacks,
  InventoryItemViewModel,
  MarketItemViewModel,
  OperatorViewModel,
  RoomCultureViewModel,
  TeamViewModel,
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
    focusTargetId: base.focusTargetId,
  };
}

type ShellTab = "hq" | "operations";

const TAB_LABELS: Record<ShellTab, string> = {
  hq: "Headquarters",
  operations: "Operations",
};

const TAB_ORDER: readonly ShellTab[] = ["hq", "operations"];

// Manual advancement stays aligned with the simulation's hour-based tick contract.
const TICK_HOUR_MS = 60 * 60 * 1000;

// ── Category definitions ─────────────────────────────────────────────────

type HqCategory = "rooms" | "roster" | "teams" | "inventory" | "market";
type OpsCategory = "contract" | "active" | "opportunities" | "history";

const HQ_CATEGORIES: readonly { id: HqCategory; label: string; icon: string }[] = [
  { id: "rooms", label: "Rooms", icon: "\u25A3" },
  { id: "roster", label: "Roster", icon: "\u2616" },
  { id: "teams", label: "Teams", icon: "\u2689" },
  { id: "inventory", label: "Inventory", icon: "\u25A8" },
  { id: "market", label: "Market", icon: "\u25C8" },
];

const OPS_CATEGORIES: readonly { id: OpsCategory; label: string; icon: string }[] = [
  { id: "contract", label: "Contract", icon: "\u2691" },
  { id: "active", label: "Active Raids", icon: "\u2694" },
  { id: "opportunities", label: "Opportunities", icon: "\u2606" },
  { id: "history", label: "History", icon: "\u2630" },
];

// ── Pill button ──────────────────────────────────────────────────────────

function CategoryPill({
  label,
  icon,
  isActive,
  onClick,
}: {
  label: string;
  icon: string;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[0.6875rem] font-medium tracking-[0.06em] transition-all duration-200 ${
        isActive
          ? "bg-[rgba(200,168,76,0.12)] text-gold border border-[rgba(200,168,76,0.25)] shadow-[0_0_8px_rgba(200,168,76,0.1)]"
          : "bg-[rgba(6,6,8,0.4)] text-silver/60 border border-[rgba(200,168,76,0.06)] hover:text-silver/80 hover:border-[rgba(200,168,76,0.12)]"
      }`}
      onClick={onClick}
    >
      <span className="text-[0.625rem]">{icon}</span>
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
}: {
  label: string;
  value: number | string;
  accent?: boolean;
  tip?: string;
}) {
  const inner = (
    <div className="flex items-baseline gap-1.5">
      <span className="text-xs font-medium uppercase tracking-[0.18em] text-gold/70">{label}</span>
      <span
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
          <div className="progress-bar-fill h-full w-2/3" />
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
  onDismiss,
}: {
  operator: OperatorViewModel;
  onDismiss: () => void;
}) {
  return (
    <div className="pointer-events-auto animate-enter absolute bottom-20 right-4 z-20 w-72 rounded-xl border border-[rgba(200,168,76,0.08)] bg-[rgba(6,6,8,0.85)] p-4 shadow-xl backdrop-blur-xl lg:right-[17rem]">
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
            <p className="mt-0.5 text-[0.6875rem] uppercase tracking-[0.12em] text-gold/70">
              {formatTag(operator.roleTag)}
            </p>
            {operator.specialtyTag && (
              <p className="mt-0.5 text-[0.6875rem] text-silver/60">
                {formatTag(operator.specialtyTag)}
              </p>
            )}
          </div>
        </div>
        <button type="button" className="btn-ghost px-2 py-1 text-xs" onClick={onDismiss}>
          close
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

      <div className="mt-3 flex flex-wrap gap-2 text-[0.6875rem] text-silver/60">
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

      {/* Phase 2: Autonomy risk warnings */}
      {(operator.refusalRisk || operator.quitRisk || operator.retentionRisk) && (
        <div className="mt-2 space-y-1 border-t border-[rgba(200,168,76,0.06)] pt-2">
          {operator.autonomyReasons.map((reason) => (
            <p
              key={reason}
              className={`text-[0.6875rem] ${operator.quitRisk ? "text-magma" : "text-ember"}`}
            >
              {reason}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Teams card (for HQ teams category) ───────────────────────────────────

function TeamsCard({ teams }: { teams: readonly TeamViewModel[] }) {
  if (teams.length === 0) {
    return (
      <div className="empty-state rounded-lg border border-dashed border-gold-dim/15 py-8">
        <div className="empty-state-icon">&#9881;</div>
        <p className="text-[0.7rem] font-medium text-gold/70">No recurring teams</p>
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
              <Tooltip content={team.damageReason || "Team cohesion has been damaged"} side="top">
                <span className="badge badge-ember">Damaged</span>
              </Tooltip>
            )}
          </div>
          <div className="mt-1 text-[0.6875rem] text-silver/60">{team.statusSummary}</div>
          {team.explanationReasons.slice(0, 2).map((reason) => (
            <div key={reason} className="mt-1 text-[0.6875rem] text-silver/50">
              {reason}
            </div>
          ))}
          <div className="mt-1 flex items-center gap-3 text-[0.6875rem] text-silver/50">
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
  const [activeTab, setActiveTab] = useState<ShellTab>("hq");
  const [hqCategory, setHqCategory] = useState<HqCategory | null>("rooms");
  const [opsCategory, setOpsCategory] = useState<OpsCategory | null>("contract");
  const [devMenuOpen, setDevMenuOpen] = useState(false);
  const [focus, setFocus] = useState<FocusPayload | null>(null);
  const [audioState, setAudioState] = useState<AudioEngineState>("suspended");
  const audioEngineRef = useRef<AudioEngine | null>(null);

  const prevTabRef = useRef<ShellTab>(activeTab);
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
      if (e.key !== "`") return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      e.preventDefault();
      setDevMenuOpen((prev) => !prev);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

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

  const callbacks: GameCallbacks | null = session
    ? {
        tick: (deltaMs: number) => {
          void session.commands.tick(deltaMs);
        },
        setRoomActive: (roomId: string, isActive: boolean) => {
          void session.commands.setRoomActive({ roomId, isActive });
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
        rejectRecruit: (visitorId: string) => {
          void session.commands.rejectRecruit({ visitorId });
        },
        hireStaff: (roleTag: string) => {
          void session.commands.hireStaff({ roleTag });
        },
        assignStaff: (staffId: string, roomId?: string) => {
          void session.commands.assignStaff({ staffId, roomId });
        },
        placeRoom: (templateId: string) => {
          void session.commands.placeRoom({ templateId });
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
      }
    : null;

  const advanceHour = useCallback(() => {
    callbacks?.tick(TICK_HOUR_MS);
  }, [callbacks]);

  const phase1View = session?.state.phase1View ?? null;
  const registry = session?.registry ?? null;

  const hqBase = useMemo(
    () => (session && phase1View && registry ? buildHqViewFromPhase1(phase1View, registry) : null),
    [phase1View, registry, session],
  );
  const operations = useMemo(
    () => (session && phase1View && registry ? buildOpsViewFromPhase1(phase1View, registry) : null),
    [phase1View, registry, session],
  );

  const phase2 = useMemo(
    () => (session ? session.simulation.getPhase2View() : null),
    [phase1View, session],
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

  const handleFocusChange = useCallback((newFocus: FocusPayload | null) => {
    setFocus(newFocus);
  }, []);

  const navActions = useMemo(() => ({ setActiveTab, setHqCategory, setOpsCategory, setFocus }), []);
  const handleEventLogClick = useCallback(
    (entry: { targetKind?: string; targetId?: string; kind: string }) => {
      handleEventLogEntryClick(entry as Parameters<typeof handleEventLogEntryClick>[0], navActions);
    },
    [handleEventLogEntryClick, navActions],
  );

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
  const focusedRaidTeam =
    activeTab === "operations" && focus?.targetKind === "team"
      ? (raidWorldSnapshot?.teams.find((team) => team.teamId === focus.targetId) ?? null)
      : null;

  const focusedOperatorId =
    focus?.targetKind === "operator" || focus?.targetKind === "staff" ? focus.targetId : null;
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
    <div className="relative h-dvh w-full overflow-hidden bg-void">
      {/* ── Full-screen world canvas (background layer) ──────── */}
      <div className="absolute inset-0 z-0">
        {activeTab === "hq" && hqWorldSnapshot && (
          <HqWorldCanvas
            snapshot={hqWorldSnapshot}
            focus={focus}
            onFocusChange={handleFocusChange}
          />
        )}
      </div>

      {/* ── UI overlays (absolutely positioned over the canvas) ── */}
      <div className="pointer-events-none absolute inset-0 z-10">
        {focusedOperator && (
          <FocusedOperatorOverlay operator={focusedOperator} onDismiss={() => setFocus(null)} />
        )}

        {/* ── Command bar (top edge) ──────────────────────────── */}
        <header className="pointer-events-auto animate-enter absolute left-0 right-0 top-0 border-b border-[rgba(200,168,76,0.06)] bg-[rgba(6,6,8,0.55)] backdrop-blur-2xl">
          <div className="mx-auto flex max-w-[1400px] items-center gap-6 px-5 py-2.5">
            {/* Guild identity */}
            <div className="flex items-center gap-3">
              <div className="h-1.5 w-1.5 rounded-full bg-gold shadow-[0_0_6px_rgba(200,168,76,0.5)]" />
              <h1 className="font-[family-name:var(--font-display)] text-sm font-light tracking-[0.12em] text-silver-bright">
                {hq.building.name}
              </h1>
              <Tooltip content="Building tier — determines room slots and upgrade access">
                <span className="badge badge-gold">T{hq.building.tier}</span>
              </Tooltip>
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
              />
              <ResourceCounter
                label="Rep"
                value={hq.guild.reputation}
                tip="Reputation — attracts better contracts and recruits"
              />
              <ResourceCounter
                label="Intel"
                value={hq.guild.intel}
                tip="Intelligence — reveals raid opportunities"
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
                  <button type="button" className="btn-ghost text-xs" onClick={advanceHour}>
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

              <Link to="/" className="btn-ghost text-xs">
                exit
              </Link>
            </div>
          </div>
        </header>

        {/* ── Tab navigation + category pills (below header) ── */}
        <nav className="pointer-events-auto animate-enter-delay-1 absolute left-0 right-0 top-[45px] border-b border-[rgba(200,168,76,0.04)] bg-[rgba(6,6,8,0.35)] backdrop-blur-xl">
          <div className="mx-auto flex max-w-[1400px] items-center gap-0 px-5">
            {TAB_ORDER.map((tab) => (
              <button
                key={tab}
                type="button"
                className="tab-button"
                data-active={activeTab === tab}
                onClick={() => setActiveTab(tab)}
              >
                {TAB_LABELS[tab]}
              </button>
            ))}

            {/* Category pills */}
            <div className="ml-auto flex items-center gap-1.5 overflow-x-auto py-1">
              {activeTab === "hq" &&
                HQ_CATEGORIES.map((cat) => (
                  <CategoryPill
                    key={cat.id}
                    label={cat.label}
                    icon={cat.icon}
                    isActive={hqCategory === cat.id}
                    onClick={() => setHqCategory(hqCategory === cat.id ? null : cat.id)}
                  />
                ))}
              {activeTab === "operations" &&
                OPS_CATEGORIES.map((cat) => (
                  <CategoryPill
                    key={cat.id}
                    label={cat.label}
                    icon={cat.icon}
                    isActive={opsCategory === cat.id}
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
          <div className="pointer-events-auto absolute bottom-10 left-0 right-0 top-[85px]">
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

            {focusedRaidTeam && focus && (
              <div className="pointer-events-none absolute inset-0 z-30">
                <RaidFocusFrame
                  team={focusedRaidTeam}
                  getOperatorName={(id) =>
                    hq.operators.find((operator) => operator.id === id)?.name ?? null
                  }
                  operatorStatuses={focusedRaidOperatorStatuses}
                  encounter={focusedRaidState?.encounter ?? null}
                  onDismiss={() => setFocus(null)}
                />
                <div className="glass-panel pointer-events-auto animate-enter absolute bottom-20 right-4 z-20 w-80 rounded-xl p-4 shadow-xl lg:right-[19rem]">
                  <RaidEventFeed events={focusedRaidState?.recentEvents ?? []} />
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Event log (chatbox overlay) ── */}
        <EventLog entries={eventLog} onEntryClick={handleEventLogClick} />

        {/* ── Bottom panel (slides up when category selected) ── */}
        {((activeTab === "hq" && hqCategory !== null) ||
          (activeTab === "operations" && opsCategory !== null)) && (
          <div className="glass-panel pointer-events-auto animate-slide-up absolute bottom-10 left-0 right-0 z-10 max-h-[45vh] overflow-y-auto p-4 pr-[22rem] shadow-[0_-8px_40px_rgba(0,0,0,0.4)] lg:pr-[26rem]">
            {activeTab === "hq" && hqCategory === "rooms" && (
              <HqPanel
                hq={hq}
                callbacks={callbacks}
                focus={focus}
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
                focusedOperatorId={focusedOperatorId}
                roomCultures={roomCultures}
                teams={teams}
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
                callbacks={callbacks}
              />
            )}
            {activeTab === "operations" && opsCategory && (
              <OperationsPanel
                operations={operations}
                operators={hq.operators}
                rosterPressure={hq.rosterPressure}
                focus={focus}
                activeCategory={opsCategory}
              />
            )}
          </div>
        )}

        {/* ── Status strip ────────────────────────────────────── */}
        <footer className="pointer-events-auto absolute bottom-0 left-0 right-0 border-t border-[rgba(200,168,76,0.04)] bg-[rgba(6,6,8,0.5)] px-5 py-1.5 backdrop-blur-md">
          <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="text-[0.6875rem] uppercase tracking-[0.15em] text-silver/60">
                {session.mode === "preview"
                  ? "sandbox session"
                  : session.mode === "new"
                    ? "new session"
                    : "saved session"}
              </span>
              {persistenceLabel && (
                <span
                  className={`text-[0.6875rem] uppercase tracking-[0.12em] ${persistenceClassName}`}
                  title={session.persistence.errorMessage}
                >
                  {persistenceLabel}
                </span>
              )}
            </div>
            <span className="shrink-0 text-[0.6875rem] tabular-nums text-silver/60">
              {session.registry.rooms.length} rooms &middot; {session.registry.missions.length}{" "}
              missions
            </span>
          </div>
        </footer>
      </div>

      {import.meta.env.DEV && devMenuOpen && session && (
        <DevMenuOverlay session={session} onClose={() => setDevMenuOpen(false)} />
      )}
    </div>
  );
}

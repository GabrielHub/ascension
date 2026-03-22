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
import { HqPanel } from "./hq-panel";
import { OperatorPortrait } from "./operator-portrait";
import { OperationsPanel } from "./raid-panel";
import { RaidEventFeed, RaidFocusFrame } from "./raid-world";
import { RaidWorldView } from "./raid-world-view";
import { buildHqViewFromPhase1, buildOpsViewFromPhase1, formatTag } from "./view-models";
import type { GameCallbacks, OperatorViewModel } from "./view-models";

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

const TICK_HOUR_MS = 60 * 60 * 1000;

function ResourceCounter({
  label,
  value,
  accent,
}: {
  label: string;
  value: number | string;
  accent?: boolean;
}) {
  return (
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
    <div className="pointer-events-auto animate-enter absolute bottom-20 right-4 z-20 w-72 rounded-xl border border-[rgba(200,168,76,0.08)] bg-[rgba(6,6,8,0.85)] p-4 shadow-xl backdrop-blur-xl">
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
        <div className="glass-card-inset p-2">
          <p className="uppercase tracking-[0.12em] text-gold/60">Intent</p>
          <p className="mt-1 text-silver-bright">{operator.intent}</p>
        </div>
        <div className="glass-card-inset p-2">
          <p className="uppercase tracking-[0.12em] text-gold/60">Readiness</p>
          <p className="mt-1 tabular-nums text-silver-bright">
            {Math.round(operator.readinessScore)}
          </p>
        </div>
        <div className="glass-card-inset p-2">
          <p className="uppercase tracking-[0.12em] text-gold/60">Morale</p>
          <p className="mt-1 tabular-nums text-silver-bright">
            {Math.round(operator.moraleCurrent)}
          </p>
        </div>
        <div className="glass-card-inset p-2">
          <p className="uppercase tracking-[0.12em] text-gold/60">Loyalty</p>
          <p className="mt-1 tabular-nums text-silver-bright">
            {Math.round(operator.loyaltyCurrent)}
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2 text-[0.6875rem] text-silver/60">
        <span>Fatigue {Math.round(operator.needFatigue)}</span>
        <span>Stress {Math.round(operator.needStress)}</span>
        {operator.injurySeverity > 0 && (
          <span className="text-ember">Injured ({Math.ceil(operator.injuryRecoveryHours)}h)</span>
        )}
        {operator.availableForRaid && <span className="text-gold/70">Raid-ready</span>}
      </div>
    </div>
  );
}

export function GameShell() {
  const location = useLocation();
  const request = parseRuntimeRouteRequest(location.search);
  const { status, session, errorMessage } = useRuntimeSession(request);
  const [activeTab, setActiveTab] = useState<ShellTab>("hq");
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
      }
    : null;

  const advanceHour = useCallback(() => {
    callbacks?.tick(TICK_HOUR_MS);
  }, [callbacks]);

  const hq = session ? buildHqViewFromPhase1(session.state.phase1View, session.registry) : null;
  const operations = session
    ? buildOpsViewFromPhase1(session.state.phase1View, session.registry)
    : null;
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

  useEffect(() => {
    const engine = audioEngineRef.current;
    if (!engine || audioState !== "running" || !session) {
      return;
    }

    for (const cueId of session.drainPendingCues()) {
      engine.playCue(cueId);
    }
  }, [audioState, session?.state, session]);

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
  const focusedRaidState =
    activeTab === "operations" && focus?.targetKind === "team"
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
        {/* Operations tab uses React-based RaidWorldView instead of canvas */}
        {/* Fallback: void background when no world snapshot is available */}
      </div>

      {/* ── UI overlays (absolutely positioned over the canvas) ── */}
      <div className="pointer-events-none absolute inset-0 z-10">
        {focusedOperator && (
          <FocusedOperatorOverlay operator={focusedOperator} onDismiss={() => setFocus(null)} />
        )}

        {/* ── Command bar (top edge) ──────────────────────────── */}
        <header className="pointer-events-auto animate-enter absolute left-0 right-0 top-0 border-b border-[rgba(200,168,76,0.06)] bg-[rgba(6,6,8,0.75)] backdrop-blur-xl">
          <div className="mx-auto flex max-w-[1400px] items-center gap-6 px-5 py-2.5">
            {/* Guild identity */}
            <div className="flex items-center gap-3">
              <div className="h-1.5 w-1.5 rounded-full bg-gold shadow-[0_0_6px_rgba(200,168,76,0.5)]" />
              <h1 className="font-[family-name:var(--font-display)] text-sm font-light tracking-[0.12em] text-silver-bright">
                {hq.building.name}
              </h1>
              <span className="badge badge-gold">T{hq.building.tier}</span>
            </div>

            {/* Separator */}
            <div className="hidden h-5 w-px bg-[rgba(200,168,76,0.08)] sm:block" />

            {/* Resources */}
            <div className="hidden items-center gap-4 sm:flex">
              <ResourceCounter label="Cash" value={hq.guild.treasury} accent />
              <ResourceCounter label="Rep" value={hq.guild.reputation} />
              <ResourceCounter label="Intel" value={hq.guild.intel} />
            </div>

            {/* Push right */}
            <div className="ml-auto flex items-center gap-4">
              {/* Time + advance */}
              <div className="flex items-center gap-2">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xs font-medium uppercase tracking-[0.15em] text-gold/70">
                    D{hq.time.day}
                  </span>
                  <span className="font-[family-name:var(--font-display)] text-[0.8rem] font-light tabular-nums text-silver/80">
                    {hq.time.formatted}
                  </span>
                </div>
                <button
                  type="button"
                  className="btn-ghost text-xs"
                  onClick={advanceHour}
                  title="Advance one hour"
                >
                  +1h
                </button>
              </div>

              {/* Capacity glance */}
              <div className="hidden items-center gap-1.5 text-xs text-silver/60 lg:flex">
                <span>
                  {hq.building.usedRoomSlots}/{hq.building.totalRoomSlots}
                </span>
                <span className="opacity-60">rooms</span>
                <span className="mx-0.5 opacity-40">|</span>
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
                <span className="opacity-60">ops</span>
                {hq.rosterPressure.vacancyCount > 0 && (
                  <span className="text-ember">({hq.rosterPressure.vacancyCount} vacant)</span>
                )}
                {hq.rosterPressure.recentDeathOperatorIds.length > 0 && (
                  <span className="text-magma">
                    &middot; {hq.rosterPressure.recentDeathOperatorIds.length} lost
                  </span>
                )}
                {hq.staff.length > 0 && (
                  <>
                    <span className="mx-0.5 opacity-40">|</span>
                    <span>{hq.staff.length}</span>
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

        {/* ── Tab navigation (below header) ─────────────────── */}
        <nav className="pointer-events-auto animate-enter-delay-1 absolute left-0 right-0 top-[45px] border-b border-[rgba(200,168,76,0.04)] bg-[rgba(6,6,8,0.5)] backdrop-blur-md">
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

            {/* Status badges */}
            <div className="ml-auto hidden items-center gap-2 md:flex">
              {hq.rosterPressure.replacementPressureLevel !== "stable" && (
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

        {/* ── Edge panels ── */}
        <div className="pointer-events-none absolute bottom-10 left-0 right-0 top-[85px] overflow-hidden">
          {activeTab === "hq" && (
            <div className="pointer-events-none relative h-full px-4 py-3">
              <HqPanel hq={hq} callbacks={callbacks} focus={focus} />
            </div>
          )}
          {activeTab === "operations" && (
            <div className="flex h-full">
              {/* Left sidebar panel */}
              <div className="pointer-events-auto relative h-full w-[340px] shrink-0 overflow-y-auto border-r border-[rgba(200,168,76,0.06)] bg-[rgba(6,6,8,0.78)] p-4 backdrop-blur-xl lg:w-[380px]">
                <OperationsPanel
                  operations={operations}
                  operators={hq.operators}
                  rosterPressure={hq.rosterPressure}
                  focus={focus}
                />
              </div>

              {/* Map area — centered in remaining space */}
              <div className="pointer-events-auto relative flex-1">
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

                {/* Focus overlays — positioned within the map area */}
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
                    <div className="pointer-events-auto animate-enter absolute bottom-20 right-[19rem] z-20 w-80 rounded-xl border border-[rgba(200,168,76,0.08)] bg-[rgba(6,6,8,0.82)] p-4 shadow-xl backdrop-blur-xl">
                      <RaidEventFeed events={focusedRaidState?.recentEvents ?? []} />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Status strip ────────────────────────────────────── */}
        <footer className="pointer-events-auto absolute bottom-0 left-0 right-0 border-t border-[rgba(200,168,76,0.04)] bg-[rgba(6,6,8,0.5)] px-5 py-1.5 backdrop-blur-md">
          <div className="mx-auto flex max-w-[1400px] items-center justify-between">
            <span className="text-[0.6875rem] uppercase tracking-[0.15em] text-silver/60">
              {session.mode === "preview"
                ? "sandbox session"
                : session.mode === "new"
                  ? "new session"
                  : "saved session"}
            </span>
            <span className="text-[0.6875rem] tabular-nums text-silver/60">
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

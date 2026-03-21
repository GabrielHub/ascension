import { useCallback, useMemo, useState } from "react";
import { Link, useLocation } from "react-router";

import { parseRuntimeRouteRequest, useRuntimeSession } from "app/features/runtime";

import { HqPanel } from "./hq-panel";
import { OperationsPanel } from "./raid-panel";
import { buildHqViewFromPhase1, buildOpsViewFromPhase1 } from "./view-models";
import type { GameCallbacks } from "./view-models";

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

export function GameShell() {
  const location = useLocation();
  const request = parseRuntimeRouteRequest(location.search);
  const { status, session, errorMessage } = useRuntimeSession(request);
  const [activeTab, setActiveTab] = useState<ShellTab>("hq");

  const callbacks: GameCallbacks | null = useMemo(
    () =>
      session
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
        : null,
    [session],
  );

  const advanceHour = useCallback(() => {
    callbacks?.tick(TICK_HOUR_MS);
  }, [callbacks]);

  const hq = useMemo(
    () => (session ? buildHqViewFromPhase1(session.state.phase1View, session.registry) : null),
    [session],
  );
  const operations = useMemo(
    () => (session ? buildOpsViewFromPhase1(session.state.phase1View, session.registry) : null),
    [session],
  );

  if (status === "error") {
    return (
      <ErrorShell message={errorMessage ?? "The requested runtime session could not be opened."} />
    );
  }

  if (status === "loading" || !session || !callbacks || !hq || !operations) {
    return <LoadingShell />;
  }

  const { worldRenderSnapshot } = session.state;

  return (
    <div className="flex min-h-dvh flex-col bg-void">
      {/* ── Command bar ─────────────────────────────────────── */}
      <header className="animate-enter sticky top-0 z-30 border-b border-[rgba(200,168,76,0.06)] bg-[rgba(6,6,8,0.85)] backdrop-blur-xl">
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
              <span>
                {hq.operators.length}/{hq.building.operatorSlots}
              </span>
              <span className="opacity-60">ops</span>
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

      {/* ── Tab navigation ──────────────────────────────────── */}
      <nav className="animate-enter-delay-1 border-b border-[rgba(200,168,76,0.04)] bg-[rgba(6,6,8,0.5)]">
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

      {/* ── Content ─────────────────────────────────────────── */}
      <main className="animate-enter-delay-2 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[1400px] px-5 py-5">
          {activeTab === "hq" && (
            <HqPanel hq={hq} callbacks={callbacks} worldRenderSnapshot={worldRenderSnapshot} />
          )}
          {activeTab === "operations" && <OperationsPanel operations={operations} />}
        </div>
      </main>

      {/* ── Status strip ────────────────────────────────────── */}
      <footer className="border-t border-[rgba(200,168,76,0.04)] bg-[rgba(6,6,8,0.6)] px-5 py-1.5">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between">
          <span className="text-[0.6875rem] uppercase tracking-[0.15em] text-silver/60">
            {session.mode === "preview"
              ? "preview session"
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
  );
}

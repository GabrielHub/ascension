import { useEffect, type ReactNode } from "react";

import { resolveTimeOfDayPhase, type HqTimeOfDayPhase } from "lib/hq-time-phase";
import type { HqDebugOverlays, HqWorldSnapshot } from "render";

import type { RuntimeSession } from "app/features/runtime";
import type { EventLogEntry } from "./view-models";

const HOUR_MS = 60 * 60 * 1000;

const PHASE_TARGETS: Record<HqTimeOfDayPhase, { label: string; minuteOfDay: number }> = {
  sunrise: { label: "Sunrise", minuteOfDay: 390 },
  day: { label: "Day", minuteOfDay: 720 },
  sunset: { label: "Sunset", minuteOfDay: 1140 },
  night: { label: "Night", minuteOfDay: 60 },
};

interface DevMenuOverlayProps {
  session: RuntimeSession;
  onClose: () => void;
  debugOverlays: HqDebugOverlays;
  onDebugOverlaysChange: (overlays: HqDebugOverlays) => void;
  eventLogEntries: readonly EventLogEntry[];
}

interface AgentDebugEventLogEntry {
  id: string;
  timestamp: string;
  kind: string;
  message: string;
  accent?: string;
  targetKind?: string;
  targetId?: string;
}

interface AgentDebugRoomSummary {
  id: string;
  label: string;
  roomStateId: string;
  slotId: string;
  floorIndex: number;
  isOperational: boolean;
  reservedFootprint: HqWorldSnapshot["rooms"][number]["reservedFootprint"];
  activeFootprint: HqWorldSnapshot["rooms"][number]["activeFootprint"];
  bounds: HqWorldSnapshot["rooms"][number]["bounds"];
  activeBounds: HqWorldSnapshot["rooms"][number]["activeBounds"];
}

interface AgentDebugActorSummary {
  id: string;
  kind: string;
  label: string;
  roomId: string;
  roleTag?: string;
  state: string;
  moveProgress: number;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
}

interface AgentDebugCanvasGeometry {
  roomCount: number;
  expansionSlotCount: number;
  actorCount: number;
  floorTileCount: number;
  wallSegmentCount: number;
  perimeterTileCount: number;
  navAnchorCount: number;
  navConnectorCount: number;
  rooms: AgentDebugRoomSummary[];
  expansionSlots: HqWorldSnapshot["expansionSlots"];
  actors: AgentDebugActorSummary[];
  modular: HqWorldSnapshot["modular"];
  navGraph: HqWorldSnapshot["navGraph"];
  roomProps: HqWorldSnapshot["roomProps"];
  scenery: HqWorldSnapshot["scenery"];
}

interface AgentDebugSnapshot {
  generatedAt: string;
  mode: RuntimeSession["mode"];
  isPreview: boolean;
  time: {
    day: number;
    minuteOfDay: number;
    phase: HqTimeOfDayPhase;
  };
  resources: {
    cash: number;
    reputation: number;
    intel: number;
  };
  building: {
    id: string;
    tier: number;
    activeFloorIndex: number;
    floorCount: number;
    roomSlotCount: number;
    operatorSlotCount: number;
  };
  debugOverlays: HqDebugOverlays;
  eventLog: AgentDebugEventLogEntry[];
  hqSnapshot: {
    backdrop: HqWorldSnapshot["backdrop"];
    effects: HqWorldSnapshot["effects"];
    layout: HqWorldSnapshot["layout"];
    canvasGeometry: AgentDebugCanvasGeometry;
  } | null;
}

type DebugGlobal = typeof globalThis & {
  __ASCENSION_DEBUG__?: AgentDebugSnapshot;
};

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <h3 className="text-sm font-medium uppercase tracking-[0.2em] text-gold/60">{children}</h3>
  );
}

function CheatButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" className="btn-ghost px-2.5 py-1 text-xs" onClick={onClick}>
      {label}
    </button>
  );
}

function ResourceRow({
  label,
  value,
  onAdd,
}: {
  label: string;
  value: number;
  onAdd: (delta: number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-baseline gap-2">
        <span className="text-xs font-medium uppercase tracking-[0.15em] text-silver/70">
          {label}
        </span>
        <span className="font-[family-name:var(--font-display)] text-sm font-light tabular-nums text-silver-bright">
          {value}
        </span>
      </div>
      <div className="flex gap-1">
        <CheatButton label="+100" onClick={() => onAdd(100)} />
        <CheatButton label="+1k" onClick={() => onAdd(1000)} />
        <CheatButton label="+10k" onClick={() => onAdd(10000)} />
      </div>
    </div>
  );
}

function DebugToggle({
  label,
  active,
  onToggle,
}: {
  label: string;
  active: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      className={`px-2.5 py-1 text-xs rounded ${
        active
          ? "bg-[rgba(0,200,255,0.15)] text-[rgba(0,200,255,0.8)] border border-[rgba(0,200,255,0.3)]"
          : "btn-ghost"
      }`}
      onClick={onToggle}
    >
      {label}
    </button>
  );
}

export function DevMenuOverlay({
  session,
  onClose,
  debugOverlays,
  onDebugOverlaysChange,
  eventLogEntries,
}: DevMenuOverlayProps) {
  const { resources, clock } = session.phase1View;
  const currentPhase = resolveTimeOfDayPhase(clock.minuteOfDay);
  const { building } = session.phase1View;

  function setResource(
    resourceId: "resource/cash" | "resource/reputation" | "resource/intel",
    amount: number,
  ) {
    void session.commands.dispatch({ type: "sim/dev-set-resource", resourceId, amount });
  }

  function addResource(
    resourceId: "resource/cash" | "resource/reputation" | "resource/intel",
    currentValue: number,
    delta: number,
  ) {
    setResource(resourceId, currentValue + delta);
  }

  function skipTime(hours: number) {
    void session.commands.tick(hours * HOUR_MS);
  }

  function setTimePhase(minuteOfDay: number) {
    void session.commands.dispatch({ type: "sim/dev-set-time", minuteOfDay });
  }

  function toggleFreeze() {
    if (session.isAutoTicking) {
      session.lifecycle.stopAutoTick();
    } else {
      session.lifecycle.startAutoTick();
    }
  }

  function buildEventLogDebugEntries(): AgentDebugEventLogEntry[] {
    return eventLogEntries.map((entry) => ({
      id: entry.id,
      timestamp: entry.timestamp,
      kind: entry.kind,
      message: entry.message,
      ...(entry.accent ? { accent: entry.accent } : {}),
      ...(entry.targetKind ? { targetKind: entry.targetKind } : {}),
      ...(entry.targetId ? { targetId: entry.targetId } : {}),
    }));
  }

  function buildCanvasGeometry(snapshot: HqWorldSnapshot): AgentDebugCanvasGeometry {
    return {
      roomCount: snapshot.rooms.length,
      expansionSlotCount: snapshot.expansionSlots.length,
      actorCount: snapshot.actors.length,
      floorTileCount: snapshot.modular.floorTiles.length,
      wallSegmentCount: snapshot.modular.wallSegments.length,
      perimeterTileCount: snapshot.modular.perimeterTiles.length,
      navAnchorCount: snapshot.navGraph.anchors.length,
      navConnectorCount: snapshot.navGraph.connectors.length,
      rooms: snapshot.rooms.map((room) => ({
        id: room.id,
        label: room.label,
        roomStateId: room.roomStateId,
        slotId: room.slotId,
        floorIndex: room.floorIndex,
        isOperational: room.isOperational,
        reservedFootprint: room.reservedFootprint,
        activeFootprint: room.activeFootprint,
        bounds: room.bounds,
        activeBounds: room.activeBounds,
      })),
      expansionSlots: snapshot.expansionSlots,
      actors: snapshot.actors.map((actor) => ({
        id: actor.id,
        kind: actor.kind,
        label: actor.label,
        roomId: actor.roomId,
        ...(actor.roleTag ? { roleTag: actor.roleTag } : {}),
        state: actor.state,
        moveProgress: actor.moveProgress,
        x: actor.x,
        y: actor.y,
        targetX: actor.targetX,
        targetY: actor.targetY,
      })),
      modular: snapshot.modular,
      navGraph: snapshot.navGraph,
      roomProps: snapshot.roomProps,
      scenery: snapshot.scenery,
    };
  }

  function buildAgentDebugSnapshot(): AgentDebugSnapshot {
    const snapshot = session.state.hqWorldSnapshot;
    return {
      generatedAt: new Date().toISOString(),
      mode: session.mode,
      isPreview: session.isPreview,
      time: {
        day: clock.day,
        minuteOfDay: clock.minuteOfDay,
        phase: currentPhase,
      },
      resources: {
        cash: resources.cash,
        reputation: resources.reputation,
        intel: resources.intel,
      },
      building: {
        id: building.activeBuildingId,
        tier: building.tier,
        activeFloorIndex: building.activeFloorIndex,
        floorCount: building.floorCount,
        roomSlotCount: building.roomSlotCount,
        operatorSlotCount: building.operatorSlotCount,
      },
      debugOverlays,
      eventLog: buildEventLogDebugEntries(),
      hqSnapshot: snapshot
        ? {
            backdrop: snapshot.backdrop,
            effects: snapshot.effects,
            layout: snapshot.layout,
            canvasGeometry: buildCanvasGeometry(snapshot),
          }
        : null,
    };
  }

  function publishAgentDebugSnapshot(): AgentDebugSnapshot {
    const snapshot = buildAgentDebugSnapshot();
    (globalThis as DebugGlobal).__ASCENSION_DEBUG__ = snapshot;
    return snapshot;
  }

  function logStructuredDebug(label: string, value: unknown) {
    console.log(`[dev-menu:${label}] ${JSON.stringify(value, null, 2)}`);
  }

  useEffect(() => {
    publishAgentDebugSnapshot();
  }, [clock.day, clock.minuteOfDay, currentPhase, debugOverlays, eventLogEntries, session.state]);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        onKeyDown={(e) => {
          if (e.key === "Escape") onClose();
        }}
        role="presentation"
      />

      {/* Panel */}
      <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
        <div
          className="glass-card pointer-events-auto w-full max-w-md p-6"
          role="dialog"
          aria-label="Dev Menu"
        >
          {/* Header */}
          <div className="mb-5 flex items-center justify-between">
            <h2 className="font-[family-name:var(--font-display)] text-base font-light tracking-[0.15em] text-gold">
              Dev Menu
            </h2>
            <button type="button" className="btn-ghost px-2 py-0.5 text-xs" onClick={onClose}>
              Close
            </button>
          </div>

          <div className="mb-5 h-px bg-gradient-to-r from-transparent via-gold/20 to-transparent" />

          {/* Resources */}
          <div className="space-y-4">
            <SectionLabel>Resources</SectionLabel>
            <div className="space-y-2.5">
              <ResourceRow
                label="Cash"
                value={resources.cash}
                onAdd={(d) => addResource("resource/cash", resources.cash, d)}
              />
              <ResourceRow
                label="Reputation"
                value={resources.reputation}
                onAdd={(d) => addResource("resource/reputation", resources.reputation, d)}
              />
              <ResourceRow
                label="Intel"
                value={resources.intel}
                onAdd={(d) => addResource("resource/intel", resources.intel, d)}
              />
            </div>
          </div>

          <div className="my-5 h-px bg-gradient-to-r from-transparent via-gold/10 to-transparent" />

          {/* Time */}
          <div className="space-y-3">
            <SectionLabel>Time</SectionLabel>
            <div className="flex items-center gap-3">
              <span className="text-xs text-silver/50">
                Day {clock.day} &middot;{" "}
                {String(Math.floor(clock.minuteOfDay / 60)).padStart(2, "0")}:
                {String(clock.minuteOfDay % 60).padStart(2, "0")} ({currentPhase})
              </span>
              <div className="flex gap-1">
                <CheatButton label="+1h" onClick={() => skipTime(1)} />
                <CheatButton label="+6h" onClick={() => skipTime(6)} />
                <CheatButton label="+1 day" onClick={() => skipTime(24)} />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                className={`px-2.5 py-1 text-xs rounded ${
                  session.isAutoTicking
                    ? "btn-ghost"
                    : "bg-volcanic/40 text-gold border border-volcanic/60"
                }`}
                onClick={toggleFreeze}
              >
                {session.isAutoTicking ? "Freeze" : "Frozen — Resume"}
              </button>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-[0.15em] text-silver/40">Jump to</span>
              <div className="flex gap-1">
                {Object.entries(PHASE_TARGETS).map(([key, { label, minuteOfDay }]) => (
                  <button
                    key={key}
                    type="button"
                    className={`px-2 py-1 text-xs rounded ${
                      currentPhase === key
                        ? "bg-gold/20 text-gold border border-gold/30"
                        : "btn-ghost"
                    }`}
                    onClick={() => setTimePhase(minuteOfDay)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="my-5 h-px bg-gradient-to-r from-transparent via-gold/10 to-transparent" />

          {/* Floor */}
          <div className="space-y-3">
            <SectionLabel>Floor</SectionLabel>
            <div className="flex items-center gap-3">
              <span className="text-xs text-silver/50">
                Active floor {building.activeFloorIndex + 1}/{building.floorCount}
              </span>
              {building.floorCount > 1 && (
                <div className="flex flex-wrap gap-1">
                  {Array.from({ length: building.floorCount }, (_, floorIndex) => (
                    <CheatButton
                      key={floorIndex}
                      label={`F${floorIndex + 1}`}
                      onClick={() => {
                        void session.commands.setActiveFloor({ floorIndex });
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="my-5 h-px bg-gradient-to-r from-transparent via-gold/10 to-transparent" />

          {/* Quick Actions */}
          <div className="space-y-3">
            <SectionLabel>Quick Actions</SectionLabel>
            <div className="flex flex-wrap gap-1">
              <CheatButton
                label="Bankrupt (cash=0)"
                onClick={() => setResource("resource/cash", 0)}
              />
              <CheatButton
                label="Debt (cash=-100)"
                onClick={() => setResource("resource/cash", -100)}
              />
            </div>
          </div>

          <div className="my-5 h-px bg-gradient-to-r from-transparent via-gold/10 to-transparent" />

          {/* Debug */}
          <div className="space-y-3">
            <SectionLabel>Debug</SectionLabel>
            <p className="text-sm leading-relaxed text-silver/50">
              Structured agent-inspection data is published to{" "}
              <code className="text-gold/70">window.__ASCENSION_DEBUG__</code> while this menu is
              open. Use the dumps below to push the same data into the browser console.
            </p>
            <CheatButton
              label="Dump Raw Session"
              onClick={() => {
                console.log("[dev-menu] phase1View", session.phase1View);
                console.log("[dev-menu] worldSnapshot", session.worldSnapshot);
              }}
            />
            <div className="flex flex-wrap gap-1">
              <CheatButton
                label="Dump Event Log"
                onClick={() => {
                  const snapshot = publishAgentDebugSnapshot();
                  logStructuredDebug("event-log", snapshot.eventLog);
                }}
              />
              <CheatButton
                label="Dump HQ Snapshot"
                onClick={() => {
                  const snapshot = publishAgentDebugSnapshot();
                  logStructuredDebug("hq-snapshot", snapshot.hqSnapshot);
                }}
              />
              <CheatButton
                label="Dump Canvas Geometry"
                onClick={() => {
                  const snapshot = publishAgentDebugSnapshot();
                  logStructuredDebug(
                    "canvas-geometry",
                    snapshot.hqSnapshot?.canvasGeometry ?? null,
                  );
                }}
              />
              <CheatButton
                label="Dump Agent Snapshot"
                onClick={() => {
                  logStructuredDebug("agent-snapshot", publishAgentDebugSnapshot());
                }}
              />
            </div>
          </div>

          <div className="my-5 h-px bg-gradient-to-r from-transparent via-gold/10 to-transparent" />

          {/* Spatial Debug Overlays */}
          <div className="space-y-3">
            <SectionLabel>Spatial Debug</SectionLabel>
            <div className="flex flex-wrap gap-1">
              <DebugToggle
                label="Room Bounds"
                active={!!debugOverlays.showRoomBounds}
                onToggle={() =>
                  onDebugOverlaysChange({
                    ...debugOverlays,
                    showRoomBounds: !debugOverlays.showRoomBounds,
                  })
                }
              />
              <DebugToggle
                label="Footprints"
                active={!!debugOverlays.showFootprints}
                onToggle={() =>
                  onDebugOverlaysChange({
                    ...debugOverlays,
                    showFootprints: !debugOverlays.showFootprints,
                  })
                }
              />
              <DebugToggle
                label="Nav Anchors"
                active={!!debugOverlays.showAnchors}
                onToggle={() =>
                  onDebugOverlaysChange({
                    ...debugOverlays,
                    showAnchors: !debugOverlays.showAnchors,
                  })
                }
              />
              <DebugToggle
                label="Pointer Coords"
                active={!!debugOverlays.showPointerCoords}
                onToggle={() =>
                  onDebugOverlaysChange({
                    ...debugOverlays,
                    showPointerCoords: !debugOverlays.showPointerCoords,
                  })
                }
              />
            </div>
          </div>

          <div className="my-5 h-px bg-gradient-to-r from-transparent via-gold/10 to-transparent" />

          {/* Encounter & Incidents */}
          <div className="space-y-3">
            <SectionLabel>Encounters & Incidents</SectionLabel>
            <div className="flex flex-wrap gap-1">
              <CheatButton
                label="Trigger Boss Commitment"
                onClick={() => {
                  void session.commands.dispatch({ type: "sim/dev-trigger-boss-commitment" });
                }}
              />
              <CheatButton
                label="Trigger Random Incident"
                onClick={() => {
                  void session.commands.dispatch({ type: "sim/dev-trigger-incident" });
                }}
              />
            </div>

            <SectionLabel>Contract Lifecycle</SectionLabel>
            <div className="flex flex-wrap gap-1">
              <CheatButton
                label={`Phase: ${session.phase1View.contractLifecycle}`}
                onClick={() => {}}
              />
              <CheatButton
                label="Force Boss Defeat"
                onClick={() => {
                  void session.commands.dispatch({
                    type: "sim/dev-force-contract-end",
                    outcome: "boss_defeated",
                  });
                }}
              />
              <CheatButton
                label="Force Contract Loss"
                onClick={() => {
                  void session.commands.dispatch({
                    type: "sim/dev-force-contract-end",
                    outcome: "contract_lost",
                  });
                }}
              />
              <CheatButton
                label="Advance Contract"
                onClick={() => {
                  void session.commands.dispatch({ type: "sim/advance-contract" });
                }}
              />
            </div>

            {session.phase1View.encounter && (
              <div className="space-y-2">
                <div className="text-xs text-silver/60">
                  Encounter: {session.phase1View.encounter.bossName} &mdash; Round{" "}
                  {session.phase1View.encounter.currentRound} &mdash; Phase{" "}
                  {session.phase1View.encounter.currentPhaseIndex + 1}/
                  {session.phase1View.encounter.phaseCount} &mdash; Status:{" "}
                  {session.phase1View.encounter.status}
                </div>
                <div className="text-xs text-silver/50">
                  Boss HP: {Math.round(session.phase1View.encounter.bossHpFraction * 100)}%
                </div>
                <div className="flex flex-wrap gap-1">
                  <CheatButton
                    label="Pause"
                    onClick={() => void session.commands.dispatch({ type: "sim/encounter-pause" })}
                  />
                  <CheatButton
                    label="Resume"
                    onClick={() => void session.commands.dispatch({ type: "sim/encounter-resume" })}
                  />
                  <CheatButton
                    label="Step"
                    onClick={() => void session.commands.dispatch({ type: "sim/encounter-step" })}
                  />
                  <CheatButton
                    label="Retreat"
                    onClick={() =>
                      void session.commands.dispatch({ type: "sim/encounter-retreat" })
                    }
                  />
                </div>
                <div className="flex flex-wrap gap-1">
                  <CheatButton
                    label="Dump Encounter State"
                    onClick={() => {
                      console.log("[dev-menu] encounter", session.phase1View.encounter);
                    }}
                  />
                  <CheatButton
                    label="Dump Encounter Actors"
                    onClick={() => {
                      console.log(
                        "[dev-menu] encounter actors",
                        session.phase1View.encounter?.actors,
                      );
                    }}
                  />
                  <CheatButton
                    label="Dump Encounter Log"
                    onClick={() => {
                      console.log(
                        "[dev-menu] encounter log",
                        session.phase1View.encounter?.recentLog,
                      );
                    }}
                  />
                </div>
                <div className="text-xs text-silver/40 space-y-0.5 max-h-24 overflow-y-auto">
                  {session.phase1View.encounter.actors.map((actor) => (
                    <div key={actor.actorId}>
                      [{actor.side}] {actor.label}: {actor.currentHp}/{actor.maxHp} HP
                      {actor.shield > 0 ? ` +${actor.shield} shield` : ""}
                      {actor.condition !== "alive" ? ` (${actor.condition})` : ""}
                      {actor.activeStatuses.length > 0
                        ? ` [${actor.activeStatuses.map((s) => s.statusId).join(",")}]`
                        : ""}
                    </div>
                  ))}
                </div>
                <div className="text-xs text-silver/40">
                  Interventions:{" "}
                  {session.phase1View.encounter.interventions
                    .filter((i) => i.usesRemaining > 0)
                    .map((i) => `${i.interventionId}(${i.usesRemaining})`)
                    .join(", ") || "none available"}
                </div>
              </div>
            )}

            {session.phase1View.activeInterruption && (
              <div className="text-xs text-silver/60">
                Active Interruption: {session.phase1View.activeInterruption.type} (
                {session.phase1View.activeInterruption.instanceId})
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

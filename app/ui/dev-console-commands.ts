import { resolveTimeOfDayPhase, type HqTimeOfDayPhase } from "lib/hq-time-phase";
import { isPolicyId, isValidPolicyValue, type PolicyId, type PolicyValue } from "lib/policies";
import type { HqDebugOverlays, HqWorldSnapshot } from "render";

import type { RuntimeSession } from "app/features/runtime";
import type { EventLogEntry } from "./view-models";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DevConsoleResult {
  status: "ok" | "error" | "warn" | "info";
  message: string;
  detail?: string;
}

type DevConsoleSession = Pick<
  RuntimeSession,
  "commands" | "isPreview" | "lifecycle" | "mode" | "phase1View" | "state" | "worldSnapshot"
>;

export interface DevConsoleContext {
  session: DevConsoleSession;
  debugOverlays: HqDebugOverlays;
  setDebugOverlays: (next: HqDebugOverlays) => void;
  eventLogEntries: readonly EventLogEntry[];
}

export interface DevConsoleCommand {
  name: string;
  aliases?: string[];
  family: string;
  args: string;
  help: string;
  examples: string[];
  execute: (args: string[], ctx: DevConsoleContext) => DevConsoleResult;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const HOUR_MS = 60 * 60 * 1000;

const PHASE_TARGETS: Record<HqTimeOfDayPhase, number> = {
  sunrise: 390,
  day: 720,
  sunset: 1140,
  night: 60,
};

function ok(message: string, detail?: string): DevConsoleResult {
  return { status: "ok", message, detail };
}

function err(message: string): DevConsoleResult {
  return { status: "error", message };
}

function info(message: string, detail?: string): DevConsoleResult {
  return { status: "info", message, detail };
}

function getCommandFamilies(): readonly string[] {
  return [...groupedCommandRegistry.keys()];
}

function findCommandFamily(raw: string): string | null {
  const normalized = raw.trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  return getCommandFamilies().find((family) => family.toLowerCase() === normalized) ?? null;
}

function formatCommandSummary(command: DevConsoleCommand): string {
  const aliasStr = command.aliases?.length ? ` (${command.aliases.join(", ")})` : "";
  return `  /${command.name}${command.args ? ` ${command.args}` : ""}${aliasStr} — ${command.help}`;
}

function formatCommandFamilyDetail(family: string): string {
  const commands = groupedCommandRegistry.get(family) ?? [];
  return commands.map((command) => formatCommandSummary(command)).join("\n");
}

function formatCommandReferenceDetail(): string {
  const lines: string[] = [];
  for (const family of getCommandFamilies()) {
    lines.push(`\n[${family}]`);
    lines.push(formatCommandFamilyDetail(family));
  }
  return lines.join("\n");
}

function parseDuration(raw: string): number | null {
  const match = raw.match(/^(\d+(?:\.\d+)?)(h|m|d|s)$/i);
  if (!match) {
    const num = Number(raw);
    return Number.isFinite(num) ? num * HOUR_MS : null;
  }
  const value = parseFloat(match[1]);
  switch (match[2].toLowerCase()) {
    case "s":
      return value * 1000;
    case "m":
      return value * 60 * 1000;
    case "h":
      return value * HOUR_MS;
    case "d":
      return value * 24 * HOUR_MS;
    default:
      return null;
  }
}

function parseTime(raw: string): number | null {
  const match = raw.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return hours * 60 + minutes;
}

function formatTime(minuteOfDay: number): string {
  const h = String(Math.floor(minuteOfDay / 60)).padStart(2, "0");
  const m = String(minuteOfDay % 60).padStart(2, "0");
  return `${h}:${m}`;
}

// ---------------------------------------------------------------------------
// Agent Debug Snapshot (preserved from old dev-menu for browser automation)
// ---------------------------------------------------------------------------

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

export interface AgentDebugSnapshot {
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

export function buildAgentDebugSnapshot(ctx: DevConsoleContext): AgentDebugSnapshot {
  const { session, debugOverlays, eventLogEntries } = ctx;
  const { resources, clock, building } = session.phase1View;
  const currentPhase = resolveTimeOfDayPhase(clock.minuteOfDay);
  const snapshot = session.state.hqWorldSnapshot;

  return {
    generatedAt: new Date().toISOString(),
    mode: session.mode,
    isPreview: session.isPreview,
    time: { day: clock.day, minuteOfDay: clock.minuteOfDay, phase: currentPhase },
    resources: { cash: resources.cash, reputation: resources.reputation, intel: resources.intel },
    building: {
      id: building.activeBuildingId,
      tier: building.tier,
      activeFloorIndex: building.activeFloorIndex,
      floorCount: building.floorCount,
      roomSlotCount: building.roomSlotCount,
      operatorSlotCount: building.operatorSlotCount,
    },
    debugOverlays,
    eventLog: eventLogEntries.map((entry) => ({
      id: entry.id,
      timestamp: entry.timestamp,
      kind: entry.kind,
      message: entry.message,
      ...(entry.accent ? { accent: entry.accent } : {}),
      ...(entry.targetKind ? { targetKind: entry.targetKind } : {}),
      ...(entry.targetId ? { targetId: entry.targetId } : {}),
    })),
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

export function publishAgentDebugSnapshot(ctx: DevConsoleContext): AgentDebugSnapshot {
  const snapshot = buildAgentDebugSnapshot(ctx);
  (globalThis as DebugGlobal).__ASCENSION_DEBUG__ = snapshot;
  return snapshot;
}

// ---------------------------------------------------------------------------
// Command Registry
// ---------------------------------------------------------------------------

const COMMANDS: DevConsoleCommand[] = [
  // ── Shell & Discovery ──────────────────────────────────────────────────
  {
    name: "help",
    family: "Shell",
    args: "[command]",
    help: "Show all commands or help for a specific command",
    examples: ["/help", "/help cash"],
    execute: (args) => {
      if (args.length === 0) {
        return info("Command Reference", formatCommandReferenceDetail());
      }
      const target = args.join(" ").toLowerCase();
      const cmd = findCommandDef(target);
      if (!cmd) return err(`Unknown command: ${target}`);
      const aliasStr = cmd.aliases?.length ? `\nAliases: ${cmd.aliases.join(", ")}` : "";
      const exStr = cmd.examples.map((ex) => `  ${ex}`).join("\n");
      return info(`/${cmd.name} ${cmd.args}`, `${cmd.help}${aliasStr}\n\nExamples:\n${exStr}`);
    },
  },
  {
    name: "list",
    family: "Shell",
    args: "<family>",
    help: "List commands for one family",
    examples: ["/list shell", "/list rooms", "/list debug"],
    execute: (args) => {
      if (args.length === 0) {
        return err(`Usage: /list <family>. Families: ${getCommandFamilies().join(", ")}`);
      }

      const family = findCommandFamily(args.join(" "));
      if (!family) {
        return err(`Unknown family: ${args.join(" ")}. Use ${getCommandFamilies().join(", ")}.`);
      }

      return info(`${family} commands`, formatCommandFamilyDetail(family));
    },
  },
  {
    name: "clear",
    family: "Shell",
    args: "",
    help: "Clear the console transcript",
    examples: ["/clear"],
    execute: () => ok(""),
  },
  {
    name: "history",
    family: "Shell",
    args: "",
    help: "Show command history",
    examples: ["/history"],
    execute: () => ok(""),
  },

  // ── Session, Time & Floors ─────────────────────────────────────────────
  {
    name: "freeze",
    family: "Time",
    args: "",
    help: "Pause auto-ticking",
    examples: ["/freeze"],
    execute: (_args, ctx) => {
      ctx.session.lifecycle.stopAutoTick();
      return ok("Auto-tick frozen");
    },
  },
  {
    name: "resume",
    family: "Time",
    args: "",
    help: "Resume auto-ticking",
    examples: ["/resume"],
    execute: (_args, ctx) => {
      ctx.session.lifecycle.startAutoTick();
      return ok("Auto-tick resumed");
    },
  },
  {
    name: "tick",
    family: "Time",
    args: "<duration>",
    help: "Advance time by duration (e.g. 1h, 30m, 1d, or raw hours)",
    examples: ["/tick 1h", "/tick 6h", "/tick 1d", "/tick 30m"],
    execute: (args, ctx) => {
      if (args.length < 1) return err("Usage: /tick <duration>");
      const ms = parseDuration(args[0]);
      if (ms === null) return err(`Invalid duration: ${args[0]}. Use 1h, 30m, 1d, etc.`);
      void ctx.session.commands.tick(ms);
      return ok(`Ticked ${args[0]}`);
    },
  },
  {
    name: "time",
    family: "Time",
    args: "<hh:mm>",
    help: "Set time of day",
    examples: ["/time 06:30", "/time 12:00", "/time 19:00"],
    execute: (args, ctx) => {
      if (args.length < 1) return err("Usage: /time <hh:mm>");
      const minuteOfDay = parseTime(args[0]);
      if (minuteOfDay === null) return err(`Invalid time: ${args[0]}. Use HH:MM format.`);
      void ctx.session.commands.dispatch({ type: "sim/dev-set-time", minuteOfDay });
      return ok(`Time set to ${formatTime(minuteOfDay)}`);
    },
  },
  {
    name: "phase",
    family: "Time",
    args: "<sunrise|day|sunset|night>",
    help: "Jump to a time-of-day phase",
    examples: ["/phase sunrise", "/phase night"],
    execute: (args, ctx) => {
      if (args.length < 1) return err("Usage: /phase <sunrise|day|sunset|night>");
      const phase = args[0].toLowerCase() as HqTimeOfDayPhase;
      const minuteOfDay = PHASE_TARGETS[phase];
      if (minuteOfDay === undefined)
        return err(`Unknown phase: ${args[0]}. Use sunrise, day, sunset, or night.`);
      void ctx.session.commands.dispatch({ type: "sim/dev-set-time", minuteOfDay });
      return ok(`Jumped to ${phase} (${formatTime(minuteOfDay)})`);
    },
  },
  {
    name: "day",
    family: "Time",
    args: "<number>",
    help: "Set the current day",
    examples: ["/day 5", "/day 30"],
    execute: (args, ctx) => {
      if (args.length < 1) return err("Usage: /day <number>");
      const day = parseInt(args[0], 10);
      if (!Number.isFinite(day) || day < 1) return err(`Invalid day: ${args[0]}`);
      void ctx.session.commands.dispatch({ type: "sim/dev-set-day", day });
      return ok(`Day set to ${day}`);
    },
  },
  {
    name: "floor",
    family: "Time",
    args: "<number>",
    help: "Set active floor (1-indexed)",
    examples: ["/floor 1", "/floor 2"],
    execute: (args, ctx) => {
      if (args.length < 1) return err("Usage: /floor <number>");
      const num = parseInt(args[0], 10);
      if (!Number.isFinite(num) || num < 1) return err(`Invalid floor: ${args[0]}`);
      const floorIndex = num - 1;
      const { floorCount } = ctx.session.phase1View.building;
      if (floorIndex >= floorCount)
        return err(`Floor ${num} does not exist (building has ${floorCount} floors)`);
      void ctx.session.commands.setActiveFloor({ floorIndex });
      return ok(`Active floor set to ${num}`);
    },
  },

  // ── Resources & Economy ────────────────────────────────────────────────
  {
    name: "cash",
    family: "Resources",
    args: "<amount>",
    help: "Set cash to an amount (prefix +/- to add/subtract)",
    examples: ["/cash 5000", "/cash +1000", "/cash -100"],
    execute: (args, ctx) => {
      if (args.length < 1) return err("Usage: /cash <amount>");
      const amount = resolveAmount(args[0], ctx.session.phase1View.resources.cash);
      if (amount === null) return err(`Invalid amount: ${args[0]}`);
      void ctx.session.commands.dispatch({
        type: "sim/dev-set-resource",
        resourceId: "resource/cash",
        amount,
      });
      return ok(`Cash set to ${amount}`);
    },
  },
  {
    name: "rep",
    aliases: ["reputation"],
    family: "Resources",
    args: "<amount>",
    help: "Set reputation to an amount (prefix +/- to add/subtract)",
    examples: ["/rep 100", "/rep +50"],
    execute: (args, ctx) => {
      if (args.length < 1) return err("Usage: /rep <amount>");
      const amount = resolveAmount(args[0], ctx.session.phase1View.resources.reputation);
      if (amount === null) return err(`Invalid amount: ${args[0]}`);
      void ctx.session.commands.dispatch({
        type: "sim/dev-set-resource",
        resourceId: "resource/reputation",
        amount,
      });
      return ok(`Reputation set to ${amount}`);
    },
  },
  {
    name: "intel",
    family: "Resources",
    args: "<amount>",
    help: "Set intel to an amount (prefix +/- to add/subtract)",
    examples: ["/intel 500", "/intel +200"],
    execute: (args, ctx) => {
      if (args.length < 1) return err("Usage: /intel <amount>");
      const amount = resolveAmount(args[0], ctx.session.phase1View.resources.intel);
      if (amount === null) return err(`Invalid amount: ${args[0]}`);
      void ctx.session.commands.dispatch({
        type: "sim/dev-set-resource",
        resourceId: "resource/intel",
        amount,
      });
      return ok(`Intel set to ${amount}`);
    },
  },
  {
    name: "resource",
    family: "Resources",
    args: "<cash|rep|intel> <amount>",
    help: "Set a resource by name",
    examples: ["/resource cash 5000", "/resource rep +50"],
    execute: (args, ctx) => {
      if (args.length < 2) return err("Usage: /resource <cash|rep|intel> <amount>");
      const resourceMap: Record<
        string,
        {
          id: "resource/cash" | "resource/reputation" | "resource/intel";
          key: "cash" | "reputation" | "intel";
        }
      > = {
        cash: { id: "resource/cash", key: "cash" },
        rep: { id: "resource/reputation", key: "reputation" },
        reputation: { id: "resource/reputation", key: "reputation" },
        intel: { id: "resource/intel", key: "intel" },
      };
      const entry = resourceMap[args[0].toLowerCase()];
      if (!entry) return err(`Unknown resource: ${args[0]}. Use cash, rep, or intel.`);
      const amount = resolveAmount(args[1], ctx.session.phase1View.resources[entry.key]);
      if (amount === null) return err(`Invalid amount: ${args[1]}`);
      void ctx.session.commands.dispatch({
        type: "sim/dev-set-resource",
        resourceId: entry.id,
        amount,
      });
      return ok(`${entry.key} set to ${amount}`);
    },
  },

  // ── Building, Rooms & Upgrades ─────────────────────────────────────────
  {
    name: "room place",
    family: "Rooms",
    args: "<template> [slot] [floor]",
    help: "Place a room from a template ID",
    examples: [
      "/room place room/back_office:tier_1",
      "/room place room/backstock:tier_1 slot/storage-left 1",
    ],
    execute: (args, ctx) => {
      if (args.length < 1) return err("Usage: /room place <template> [slot] [floor]");
      const templateId = args[0];
      const slotId = args[1];
      const floorIndex = args[2] ? parseInt(args[2], 10) - 1 : undefined;
      void ctx.session.commands.placeRoom({ templateId, slotId, floorIndex });
      return ok(`Placing room ${templateId}`);
    },
  },
  {
    name: "room on",
    family: "Rooms",
    args: "<room>",
    help: "Activate a room by ID",
    examples: ["/room on room/0"],
    execute: (args, ctx) => {
      if (args.length < 1) return err("Usage: /room on <roomId>");
      const roomId = resolveRoomId(args[0], ctx);
      if (!roomId) return err(`Room not found: ${args[0]}`);
      void ctx.session.commands.setRoomActive({ roomId, isActive: true });
      return ok(`Activated ${roomId}`);
    },
  },
  {
    name: "room off",
    family: "Rooms",
    args: "<room>",
    help: "Deactivate a room by ID",
    examples: ["/room off room/0"],
    execute: (args, ctx) => {
      if (args.length < 1) return err("Usage: /room off <roomId>");
      const roomId = resolveRoomId(args[0], ctx);
      if (!roomId) return err(`Room not found: ${args[0]}`);
      void ctx.session.commands.setRoomActive({ roomId, isActive: false });
      return ok(`Deactivated ${roomId}`);
    },
  },
  {
    name: "upgrade building",
    family: "Rooms",
    args: "<upgradeId>",
    help: "Purchase a building upgrade",
    examples: ["/upgrade building upgrade/building/bodega:frontage"],
    execute: (args, ctx) => {
      if (args.length < 1) return err("Usage: /upgrade building <upgradeId>");
      void ctx.session.commands.purchaseBuildingUpgrade({ upgradeId: args[0] });
      return ok(`Purchased building upgrade ${args[0]}`);
    },
  },
  {
    name: "upgrade room",
    family: "Rooms",
    args: "<room> <upgradeId>",
    help: "Purchase a room upgrade",
    examples: ["/upgrade room room/0 upgrade/room/back_office:secure_filing"],
    execute: (args, ctx) => {
      if (args.length < 2) return err("Usage: /upgrade room <roomId> <upgradeId>");
      const roomId = resolveRoomId(args[0], ctx);
      if (!roomId) return err(`Room not found: ${args[0]}`);
      void ctx.session.commands.purchaseRoomUpgrade({ roomId, upgradeId: args[1] });
      return ok(`Purchased room upgrade ${args[1]} for ${roomId}`);
    },
  },
  {
    name: "relocate",
    family: "Rooms",
    args: "",
    help: "Initiate building relocation",
    examples: ["/relocate"],
    execute: (_args, ctx) => {
      void ctx.session.commands.initiateRelocation();
      return ok("Relocation initiated");
    },
  },

  // ── Roster, Visitors, Staff & Policies ─────────────────────────────────
  {
    name: "visitor accept",
    family: "Roster",
    args: "<visitor>",
    help: "Accept a visitor as a recruit",
    examples: ["/visitor accept visitor/0"],
    execute: (args, ctx) => {
      if (args.length < 1) return err("Usage: /visitor accept <visitorId>");
      const visitorId = resolveVisitorId(args[0], ctx);
      if (!visitorId) return err(`Visitor not found: ${args[0]}`);
      void ctx.session.commands.acceptRecruit({ visitorId });
      return ok(`Accepted ${visitorId}`);
    },
  },
  {
    name: "visitor defer",
    family: "Roster",
    args: "<visitor>",
    help: "Defer a visitor",
    examples: ["/visitor defer visitor/0"],
    execute: (args, ctx) => {
      if (args.length < 1) return err("Usage: /visitor defer <visitorId>");
      const visitorId = resolveVisitorId(args[0], ctx);
      if (!visitorId) return err(`Visitor not found: ${args[0]}`);
      void ctx.session.commands.deferRecruit({ visitorId });
      return ok(`Deferred ${visitorId}`);
    },
  },
  {
    name: "visitor reject",
    family: "Roster",
    args: "<visitor>",
    help: "Reject a visitor",
    examples: ["/visitor reject visitor/0"],
    execute: (args, ctx) => {
      if (args.length < 1) return err("Usage: /visitor reject <visitorId>");
      const visitorId = resolveVisitorId(args[0], ctx);
      if (!visitorId) return err(`Visitor not found: ${args[0]}`);
      void ctx.session.commands.rejectRecruit({ visitorId });
      return ok(`Rejected ${visitorId}`);
    },
  },
  {
    name: "visitor replace",
    family: "Roster",
    args: "<visitor> <operator>",
    help: "Replace an operator with a visitor",
    examples: ["/visitor replace visitor/0 operator/0"],
    execute: (args, ctx) => {
      if (args.length < 2) return err("Usage: /visitor replace <visitorId> <operatorId>");
      const visitorId = resolveVisitorId(args[0], ctx);
      if (!visitorId) return err(`Visitor not found: ${args[0]}`);
      void ctx.session.commands.replaceRecruit({ visitorId, operatorId: args[1] });
      return ok(`Replacing operator with ${visitorId}`);
    },
  },
  {
    name: "visitor dismiss",
    family: "Roster",
    args: "<visitor>",
    help: "Dismiss a visitor",
    examples: ["/visitor dismiss visitor/0"],
    execute: (args, ctx) => {
      if (args.length < 1) return err("Usage: /visitor dismiss <visitorId>");
      const visitorId = resolveVisitorId(args[0], ctx);
      if (!visitorId) return err(`Visitor not found: ${args[0]}`);
      void ctx.session.commands.dismissRecruit({ visitorId });
      return ok(`Dismissed ${visitorId}`);
    },
  },
  {
    name: "staff hire",
    family: "Roster",
    args: "<role>",
    help: "Hire a staff member by role tag",
    examples: ["/staff hire role:clerk"],
    execute: (args, ctx) => {
      if (args.length < 1) return err("Usage: /staff hire <roleTag>");
      void ctx.session.commands.hireStaff({ roleTag: args[0] });
      return ok(`Hired staff with role ${args[0]}`);
    },
  },
  {
    name: "staff assign",
    family: "Roster",
    args: "<staff> [room]",
    help: "Assign a staff member to a room (omit room to unassign)",
    examples: ["/staff assign staff/0 room/0", "/staff assign staff/0"],
    execute: (args, ctx) => {
      if (args.length < 1) return err("Usage: /staff assign <staffId> [roomId]");
      const roomId = args[1] ? resolveRoomId(args[1], ctx) : undefined;
      void ctx.session.commands.assignStaff({ staffId: args[0], roomId: roomId ?? undefined });
      return ok(roomId ? `Assigned ${args[0]} to ${roomId}` : `Unassigned ${args[0]}`);
    },
  },
  {
    name: "policy",
    family: "Roster",
    args: "<policyId> <value>",
    help: "Set a policy value",
    examples: ["/policy contractPosture aggressive", "/policy recoveryTriage full_recovery"],
    execute: (args, ctx) => {
      if (args.length < 2) return err("Usage: /policy <policyId> <value>");
      const policyId = args[0];
      const value = args[1];
      if (!isPolicyId(policyId)) return err(`Unknown policy: ${policyId}`);
      if (!isValidPolicyValue(policyId, value))
        return err(`Invalid value for ${policyId}: ${value}`);
      void ctx.session.commands.setPolicy({
        policyId: policyId as PolicyId,
        value: value as PolicyValue,
      });
      return ok(`${policyId} set to ${value}`);
    },
  },
  {
    name: "loot-filter",
    family: "Roster",
    args: "<on|off>",
    help: "Toggle loot filter automation",
    examples: ["/loot-filter on", "/loot-filter off"],
    execute: (args, ctx) => {
      if (args.length < 1) return err("Usage: /loot-filter <on|off>");
      const enabled = args[0].toLowerCase() === "on";
      void ctx.session.commands.setLootFilter({ enabled });
      return ok(`Loot filter ${enabled ? "enabled" : "disabled"}`);
    },
  },

  // ── Inventory, Equipment & Prep ────────────────────────────────────────
  {
    name: "buy",
    family: "Inventory",
    args: "<item>",
    help: "Buy an item by ID",
    examples: ["/buy item/basic_medkit"],
    execute: (args, ctx) => {
      if (args.length < 1) return err("Usage: /buy <itemId>");
      void ctx.session.commands.buyItem({ itemId: args[0] });
      return ok(`Bought ${args[0]}`);
    },
  },
  {
    name: "sell",
    family: "Inventory",
    args: "<item> <quantity>",
    help: "Sell items by ID and quantity",
    examples: ["/sell item/basic_medkit 1"],
    execute: (args, ctx) => {
      if (args.length < 2) return err("Usage: /sell <itemId> <quantity>");
      const quantity = parseInt(args[1], 10);
      if (!Number.isFinite(quantity) || quantity < 1) return err(`Invalid quantity: ${args[1]}`);
      void ctx.session.commands.sellItem({ itemId: args[0], quantity });
      return ok(`Sold ${quantity}x ${args[0]}`);
    },
  },
  {
    name: "equip",
    family: "Inventory",
    args: "<operator> <weapon|outfit|accessory> <item>",
    help: "Equip an item on an operator",
    examples: ["/equip operator/0 weapon item/basic_blade"],
    execute: (args, ctx) => {
      if (args.length < 3) return err("Usage: /equip <operatorId> <slot> <itemId>");
      const slotMap: Record<string, "weapon" | "outfitOverlay" | "accessory"> = {
        weapon: "weapon",
        outfit: "outfitOverlay",
        accessory: "accessory",
      };
      const slot = slotMap[args[1].toLowerCase()];
      if (!slot) return err(`Invalid slot: ${args[1]}. Use weapon, outfit, or accessory.`);
      void ctx.session.commands.equipItem({ operatorId: args[0], slot, itemId: args[2] });
      return ok(`Equipped ${args[2]} on ${args[0]} (${args[1]})`);
    },
  },
  {
    name: "unequip",
    family: "Inventory",
    args: "<operator> <weapon|outfit|accessory>",
    help: "Unequip a slot from an operator",
    examples: ["/unequip operator/0 weapon"],
    execute: (args, ctx) => {
      if (args.length < 2) return err("Usage: /unequip <operatorId> <slot>");
      const slotMap: Record<string, "weapon" | "outfitOverlay" | "accessory"> = {
        weapon: "weapon",
        outfit: "outfitOverlay",
        accessory: "accessory",
      };
      const slot = slotMap[args[1].toLowerCase()];
      if (!slot) return err(`Invalid slot: ${args[1]}. Use weapon, outfit, or accessory.`);
      void ctx.session.commands.unequipItem({ operatorId: args[0], slot });
      return ok(`Unequipped ${args[1]} from ${args[0]}`);
    },
  },
  {
    name: "accessory auto",
    family: "Inventory",
    args: "<operator>",
    help: "Auto-assign best accessory to an operator",
    examples: ["/accessory auto operator/0"],
    execute: (args, ctx) => {
      if (args.length < 1) return err("Usage: /accessory auto <operatorId>");
      void ctx.session.commands.autoAssignAccessory({ operatorId: args[0] });
      return ok(`Auto-assigned accessory to ${args[0]}`);
    },
  },
  {
    name: "prep",
    family: "Inventory",
    args: "<recipe>",
    help: "Prepare a consumable from a recipe",
    examples: ["/prep recipe/basic_ration"],
    execute: (args, ctx) => {
      if (args.length < 1) return err("Usage: /prep <recipeId>");
      void ctx.session.commands.prepConsumable({ recipeId: args[0] });
      return ok(`Prepping ${args[0]}`);
    },
  },

  // ── Contracts, Incidents & Encounters ──────────────────────────────────
  {
    name: "contract bid",
    family: "Contracts",
    args: "<posting>",
    help: "Bid on a contract posting",
    examples: ["/contract bid posting/0"],
    execute: (args, ctx) => {
      if (args.length < 1) return err("Usage: /contract bid <postingId>");
      void ctx.session.commands.dispatch({ type: "sim/bid-contract", postingId: args[0] });
      return ok(`Bid on ${args[0]}`);
    },
  },
  {
    name: "contract advance",
    family: "Contracts",
    args: "",
    help: "Advance contract progression",
    examples: ["/contract advance"],
    execute: (_args, ctx) => {
      void ctx.session.commands.dispatch({ type: "sim/advance-contract" });
      return ok(`Contract advanced (phase: ${ctx.session.phase1View.contractLifecycle})`);
    },
  },
  {
    name: "contract outcome",
    family: "Contracts",
    args: "<mission_complete|boss_defeated|contract_lost>",
    help: "Force a contract end with a specific outcome",
    examples: ["/contract outcome boss_defeated", "/contract outcome contract_lost"],
    execute: (args, ctx) => {
      if (args.length < 1) return err("Usage: /contract outcome <outcome>");
      const validOutcomes = ["mission_complete", "boss_defeated", "contract_lost"] as const;
      const outcome = args[0] as (typeof validOutcomes)[number];
      if (!validOutcomes.includes(outcome))
        return err(
          `Invalid outcome: ${args[0]}. Use mission_complete, boss_defeated, or contract_lost.`,
        );
      void ctx.session.commands.dispatch({ type: "sim/dev-force-contract-end", outcome });
      return ok(`Forced contract end: ${outcome}`);
    },
  },
  {
    name: "incident trigger",
    aliases: ["incident"],
    family: "Contracts",
    args: "",
    help: "Trigger a random incident",
    examples: ["/incident trigger"],
    execute: (_args, ctx) => {
      void ctx.session.commands.dispatch({ type: "sim/dev-trigger-incident" });
      return ok("Incident triggered");
    },
  },
  {
    name: "boss-commitment",
    family: "Contracts",
    args: "",
    help: "Trigger a boss commitment interruption",
    examples: ["/boss-commitment"],
    execute: (_args, ctx) => {
      void ctx.session.commands.dispatch({ type: "sim/dev-trigger-boss-commitment" });
      return ok("Boss commitment triggered");
    },
  },
  {
    name: "encounter pause",
    family: "Encounter",
    args: "",
    help: "Pause the active encounter",
    examples: ["/encounter pause"],
    execute: (_args, ctx) => {
      void ctx.session.commands.dispatch({ type: "sim/encounter-pause" });
      return ok("Encounter paused");
    },
  },
  {
    name: "encounter resume",
    family: "Encounter",
    args: "",
    help: "Resume the active encounter",
    examples: ["/encounter resume"],
    execute: (_args, ctx) => {
      void ctx.session.commands.dispatch({ type: "sim/encounter-resume" });
      return ok("Encounter resumed");
    },
  },
  {
    name: "encounter step",
    family: "Encounter",
    args: "",
    help: "Step one turn in the encounter",
    examples: ["/encounter step"],
    execute: (_args, ctx) => {
      void ctx.session.commands.dispatch({ type: "sim/encounter-step" });
      return ok("Encounter stepped");
    },
  },
  {
    name: "encounter retreat",
    family: "Encounter",
    args: "",
    help: "Retreat from the active encounter",
    examples: ["/encounter retreat"],
    execute: (_args, ctx) => {
      void ctx.session.commands.dispatch({ type: "sim/encounter-retreat" });
      return ok("Encounter retreat");
    },
  },
  {
    name: "encounter intervention",
    family: "Encounter",
    args: "<intervention>",
    help: "Use an encounter intervention",
    examples: ["/encounter intervention morale_boost"],
    execute: (args, ctx) => {
      if (args.length < 1) return err("Usage: /encounter intervention <interventionId>");
      void ctx.session.commands.dispatch({
        type: "sim/encounter-use-intervention",
        interventionId: args[0],
      });
      return ok(`Used intervention ${args[0]}`);
    },
  },

  // ── Guidance, Interruptions & Debug ────────────────────────────────────
  {
    name: "guidance reset-opening",
    aliases: ["reset-opening"],
    family: "Debug",
    args: "",
    help: "Reset the opening guidance sequence",
    examples: ["/guidance reset-opening"],
    execute: (_args, ctx) => {
      void ctx.session.commands.dispatch({ type: "sim/guidance-reset-opening" });
      return ok("Opening guidance reset");
    },
  },
  {
    name: "interruption resolve",
    family: "Debug",
    args: "[choice]",
    help: "Resolve the active interruption, optionally with a choice ID",
    examples: ["/interruption resolve", "/interruption resolve choice_accept"],
    execute: (args, ctx) => {
      const interruption = ctx.session.phase1View.activeInterruption;
      if (!interruption) return err("No active interruption");
      if (args.length > 0) {
        void ctx.session.commands.dispatch({
          type: "sim/interruption-resolve",
          instanceId: interruption.instanceId,
          choiceId: args[0],
        });
        return ok(`Resolved interruption with choice: ${args[0]}`);
      }
      void ctx.session.commands.dispatch({ type: "sim/interruption-dismiss" });
      return ok("Dismissed interruption");
    },
  },
  {
    name: "dump session",
    family: "Debug",
    args: "",
    help: "Dump session state to console",
    examples: ["/dump session"],
    execute: (_args, ctx) => {
      console.log("[dev-console] phase1View", ctx.session.phase1View);
      console.log("[dev-console] worldSnapshot", ctx.session.worldSnapshot);
      return ok("Session dumped to browser console");
    },
  },
  {
    name: "dump event-log",
    family: "Debug",
    args: "",
    help: "Dump event log to console",
    examples: ["/dump event-log"],
    execute: (_args, ctx) => {
      const snapshot = publishAgentDebugSnapshot(ctx);
      console.log("[dev-console:event-log]", JSON.stringify(snapshot.eventLog, null, 2));
      return ok(`Event log dumped (${snapshot.eventLog.length} entries)`);
    },
  },
  {
    name: "dump hq",
    family: "Debug",
    args: "",
    help: "Dump HQ snapshot to console",
    examples: ["/dump hq"],
    execute: (_args, ctx) => {
      const snapshot = publishAgentDebugSnapshot(ctx);
      console.log("[dev-console:hq-snapshot]", JSON.stringify(snapshot.hqSnapshot, null, 2));
      return ok("HQ snapshot dumped to browser console");
    },
  },
  {
    name: "dump encounter",
    family: "Debug",
    args: "",
    help: "Dump encounter state to console",
    examples: ["/dump encounter"],
    execute: (_args, ctx) => {
      const encounter = ctx.session.phase1View.encounter;
      if (!encounter) return err("No active encounter");
      console.log("[dev-console:encounter]", encounter);
      return ok(
        `Encounter: ${encounter.bossName} R${encounter.currentRound} — ${encounter.status}`,
      );
    },
  },
  {
    name: "dump agent",
    family: "Debug",
    args: "",
    help: "Dump full agent debug snapshot to console and window.__ASCENSION_DEBUG__",
    examples: ["/dump agent"],
    execute: (_args, ctx) => {
      const snapshot = publishAgentDebugSnapshot(ctx);
      console.log("[dev-console:agent-snapshot]", JSON.stringify(snapshot, null, 2));
      return ok("Agent snapshot published to window.__ASCENSION_DEBUG__");
    },
  },
  {
    name: "overlay",
    family: "Debug",
    args: "<room-bounds|footprints|anchors|pointer> <on|off>",
    help: "Toggle a spatial debug overlay",
    examples: ["/overlay room-bounds on", "/overlay footprints off"],
    execute: (args, ctx) => {
      if (args.length < 2) return err("Usage: /overlay <name> <on|off>");
      const overlayMap: Record<string, keyof HqDebugOverlays> = {
        "room-bounds": "showRoomBounds",
        footprints: "showFootprints",
        anchors: "showAnchors",
        pointer: "showPointerCoords",
      };
      const key = overlayMap[args[0].toLowerCase()];
      if (!key)
        return err(
          `Unknown overlay: ${args[0]}. Use room-bounds, footprints, anchors, or pointer.`,
        );
      const enabled = args[1].toLowerCase() === "on";
      ctx.setDebugOverlays({ ...ctx.debugOverlays, [key]: enabled });
      return ok(`${args[0]} overlay ${enabled ? "enabled" : "disabled"}`);
    },
  },
  {
    name: "inspect",
    family: "Debug",
    args: "<rooms|operators|visitors|staff|contracts|encounter>",
    help: "Inspect current game state for a category",
    examples: ["/inspect rooms", "/inspect operators", "/inspect contracts"],
    execute: (args, ctx) => {
      if (args.length < 1) return err("Usage: /inspect <category>");
      const category = args[0].toLowerCase();
      const pv = ctx.session.phase1View;

      switch (category) {
        case "rooms": {
          const lines = pv.rooms.map(
            (r) =>
              `  ${r.id} [${r.templateId}] F${r.floorIndex + 1} ${r.isOperational ? "ON" : "OFF"} ${r.occupancy}/${r.capacity}`,
          );
          return info(`Rooms (${pv.rooms.length})`, lines.join("\n") || "  (none)");
        }
        case "operators": {
          const ops = pv.operators ?? [];
          const lines = ops.map(
            (op) =>
              `  ${op.id} ${op.identity.name} [${op.identity.roleTag}] ${op.lifecycle.status}`,
          );
          return info(`Operators (${ops.length})`, lines.join("\n") || "  (none)");
        }
        case "visitors": {
          const visitors = pv.visitors ?? [];
          const lines = visitors.map((v) => `  ${v.id} ${v.name} [${v.desiredRoleTag}]`);
          return info(`Visitors (${visitors.length})`, lines.join("\n") || "  (none)");
        }
        case "staff": {
          const ws = ctx.session.worldSnapshot;
          const staff = ws.staff ?? [];
          const lines = staff.map((s) => {
            const assignmentRecord = s.assignment as Record<string, unknown> | undefined;
            const targetId =
              assignmentRecord && typeof assignmentRecord.targetId === "string"
                ? assignmentRecord.targetId
                : "(unassigned)";
            return `  ${s.id} ${s.name} [${s.roleTag}] → ${targetId}`;
          });
          return info(`Staff (${staff.length})`, lines.join("\n") || "  (none)");
        }
        case "contracts": {
          const lifecycle = pv.contractLifecycle;
          const posted = pv.postedContracts ?? [];
          const lines = [
            `  Phase: ${lifecycle}`,
            ...posted.map((p) => `  ${p.postingId} ${p.siteConceptName}`),
          ];
          return info("Contracts", lines.join("\n"));
        }
        case "encounter": {
          if (!pv.encounter) return info("Encounter", "  No active encounter");
          const enc = pv.encounter;
          const actors = enc.actors.map(
            (a) =>
              `  [${a.side}] ${a.label} HP:${a.currentHp}/${a.maxHp}${a.condition !== "alive" ? ` (${a.condition})` : ""}`,
          );
          return info(
            `Encounter: ${enc.bossName}`,
            `  Round ${enc.currentRound} Phase ${enc.currentPhaseIndex + 1}/${enc.phaseCount} Status: ${enc.status}\n  Boss HP: ${Math.round(enc.bossHpFraction * 100)}%\n${actors.join("\n")}`,
          );
        }
        case "raid":
        case "raids": {
          const ws = ctx.session.worldSnapshot;
          const raids = ws.activeRaidPackets ?? [];
          const lines = raids.map((r) => `  ${r.id}`);
          return info(`Active Raids (${raids.length})`, lines.join("\n") || "  (none)");
        }
        default:
          return err(
            `Unknown category: ${category}. Use rooms, operators, visitors, staff, contracts, encounter, or raids.`,
          );
      }
    },
  },
];

// ---------------------------------------------------------------------------
// Entity resolution helpers
// ---------------------------------------------------------------------------

function resolveAmount(raw: string, current: number): number | null {
  if (raw.startsWith("+") || raw.startsWith("-")) {
    const delta = parseFloat(raw);
    return Number.isFinite(delta) ? current + delta : null;
  }
  const num = parseFloat(raw);
  return Number.isFinite(num) ? num : null;
}

function resolveRoomId(raw: string, ctx: DevConsoleContext): string | null {
  const rooms = ctx.session.phase1View.rooms;
  const direct = rooms.find((r) => r.id === raw);
  if (direct) return direct.id;
  const byName = rooms.find((r) => r.name.toLowerCase().includes(raw.toLowerCase()));
  return byName?.id ?? null;
}

function resolveVisitorId(raw: string, ctx: DevConsoleContext): string | null {
  const visitors = ctx.session.phase1View.visitors ?? [];
  const direct = visitors.find((v) => v.id === raw);
  if (direct) return direct.id;
  const byName = visitors.find((v) => v.name.toLowerCase().includes(raw.toLowerCase()));
  return byName?.id ?? null;
}

// ---------------------------------------------------------------------------
// Parser & Executor
// ---------------------------------------------------------------------------

function tokenize(input: string): string[] {
  const tokens: string[] = [];
  let current = "";
  let inQuote = false;
  let quoteChar = "";

  for (const char of input) {
    if (inQuote) {
      if (char === quoteChar) {
        inQuote = false;
      } else {
        current += char;
      }
    } else if (char === '"' || char === "'") {
      inQuote = true;
      quoteChar = char;
    } else if (char === " " || char === "\t") {
      if (current) {
        tokens.push(current);
        current = "";
      }
    } else {
      current += char;
    }
  }
  if (current) tokens.push(current);
  return tokens;
}

// Build a lookup map from name/aliases → command
const commandLookup = new Map<string, DevConsoleCommand>();
for (const cmd of COMMANDS) {
  commandLookup.set(cmd.name, cmd);
  for (const alias of cmd.aliases ?? []) {
    commandLookup.set(alias, cmd);
  }
}

function findCommandDef(name: string): DevConsoleCommand | undefined {
  return commandLookup.get(name);
}

export function getCommandRegistry(): readonly DevConsoleCommand[] {
  return COMMANDS;
}

export const groupedCommandRegistry: ReadonlyMap<string, readonly DevConsoleCommand[]> = (() => {
  const grouped = new Map<string, DevConsoleCommand[]>();
  for (const cmd of COMMANDS) {
    const list = grouped.get(cmd.family) ?? [];
    list.push(cmd);
    grouped.set(cmd.family, list);
  }
  return grouped;
})();

export interface ParsedExecution {
  command: DevConsoleCommand;
  args: string[];
}

export function parseCommand(input: string): ParsedExecution | null {
  let raw = input.trim();
  if (raw.startsWith("/")) raw = raw.slice(1);
  if (!raw) return null;

  const tokens = tokenize(raw);
  if (tokens.length === 0) return null;

  // Try two-word match first (subcommands like "room place")
  if (tokens.length >= 2) {
    const twoWord = `${tokens[0]} ${tokens[1]}`.toLowerCase();
    const cmd = findCommandDef(twoWord);
    if (cmd) return { command: cmd, args: tokens.slice(2) };
  }

  // Single-word match
  const cmd = findCommandDef(tokens[0].toLowerCase());
  if (cmd) return { command: cmd, args: tokens.slice(1) };

  return null;
}

export function executeConsoleCommand(input: string, ctx: DevConsoleContext): DevConsoleResult {
  const parsed = parseCommand(input);
  if (!parsed) {
    const raw = input.trim().startsWith("/") ? input.trim().slice(1) : input.trim();
    const firstWord = raw.split(/\s/)[0];
    return err(`Unknown command: ${firstWord}. Type /help to see available commands.`);
  }
  return parsed.command.execute(parsed.args, ctx);
}

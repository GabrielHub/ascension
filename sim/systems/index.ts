import {
  applySimCommand,
  registerEncounterCommandHandler,
  registerContractCommandHandler,
} from "./commands";
import { refreshBuildingAuthoritySystem } from "./building-progression";
import { reconcileAssignmentsSystem } from "./assignment";
import { advanceEconomySystem } from "./economy";
import { advanceEventPressureSystem } from "./events";
import { advanceMoraleSystem } from "./morale";
import { advanceNeedsSystem } from "./needs";
import { resolveRaidSystem } from "./raids";
import { updateRoomOperationsSystem } from "./room-operations";
import { advanceWorldTimeSystem } from "./time";
import { advanceVisitorPoolSystem } from "./visitors";
import type { SimSystem, SimSystemContext, SimSystemGroup } from "./types";

const noopSystem: SimSystem = () => {};

/** Conditionally skips time advance when encounter is active. */
const conditionalTimeSystem: SimSystem = (context, deltaMs) => {
  if (context.runtimeState.worldTimeFrozen) return;
  advanceWorldTimeSystem(context, deltaMs);
};

// Lazy-loaded incident system to break circular import chain.
// incident-system -> incidents -> commands -> (cycle via systems barrel)
let incidentSystemFn: SimSystem | null = null;
let deferredSystemBootstrapError: Error | null = null;
const lazyIncidentSystem: SimSystem = (context, deltaMs) => {
  if (deferredSystemBootstrapError) {
    throw deferredSystemBootstrapError;
  }
  if (!incidentSystemFn) return; // Not yet loaded, skip silently
  incidentSystemFn(context, deltaMs);
};

function isEnvironmentTeardownError(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.name === "EnvironmentTeardownError" ||
      error.message.includes("after the environment was torn down"))
  );
}

export const simSystemSchedule: readonly SimSystemGroup[] = [
  { id: "time", systems: [conditionalTimeSystem] },
  { id: "spawning", systems: [advanceVisitorPoolSystem] },
  { id: "requirements", systems: [refreshBuildingAuthoritySystem] },
  { id: "rooms", systems: [updateRoomOperationsSystem] },
  { id: "planning", systems: [reconcileAssignmentsSystem] },
  { id: "needs", systems: [advanceNeedsSystem] },
  { id: "pathfinding", systems: [noopSystem] },
  { id: "movement", systems: [noopSystem] },
  { id: "raids", systems: [resolveRaidSystem] },
  { id: "economy", systems: [advanceEconomySystem] },
  { id: "events", systems: [advanceEventPressureSystem] },
  { id: "incidents", systems: [lazyIncidentSystem] },
  { id: "morale", systems: [advanceMoraleSystem] },
  { id: "animation", systems: [noopSystem] },
  { id: "rendering", systems: [noopSystem] },
] as const;

// Register encounter commands and incident system after module init completes.
// These modules have transitive imports that re-enter this barrel, so they
// must load after the initial evaluation finishes.
void Promise.all([
  import("./encounter-commands"),
  import("./incident-system"),
  import("./contract-commands"),
])
  .then(([encounterMod, incidentMod, contractMod]) => {
    registerEncounterCommandHandler(encounterMod.applyEncounterCommand);
    incidentSystemFn = incidentMod.advanceIncidentSystem;
    registerContractCommandHandler(contractMod.applyContractCommand);
  })
  .catch((error) => {
    if (isEnvironmentTeardownError(error)) {
      return;
    }

    deferredSystemBootstrapError =
      error instanceof Error
        ? error
        : new Error(`Deferred system bootstrap failed: ${String(error)}`);
  });

export function runSimCommand(
  context: SimSystemContext,
  command: import("../commands").SimCommand,
) {
  if (deferredSystemBootstrapError) {
    throw deferredSystemBootstrapError;
  }
  applySimCommand(context, command);
}

export function runSimSystemSchedule(context: SimSystemContext, deltaMs: number): void {
  if (deferredSystemBootstrapError) {
    throw deferredSystemBootstrapError;
  }
  simSystemSchedule.forEach((group) => {
    group.systems.forEach((system) => system(context, deltaMs));
  });
}

export * from "./derived-stats";
export * from "./inventory";
export * from "./market";
export * from "./raids";
export * from "./social";
export * from "./types";
// encounter-types, incidents, incident-system, and interruptions are NOT
// re-exported here to avoid circular init-time dependency chains.
// Import them directly from their source modules when needed.

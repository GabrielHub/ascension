import {
  createDefaultDistrictPublicPressure,
  createDefaultFactionRelationship,
  createDefaultPublicPressure,
  createDefaultRivalPressure,
  type DistrictPublicPressureSnapshot,
  type FactionRelationshipSnapshot,
  type PublicPressureSnapshot,
  type RivalPressureSnapshot,
} from "save/types";
import { districtTemplates } from "content/templates/districts";
import { factionTemplates } from "content/templates/factions";

export interface PublicPressureState {
  score: number;
  dominantSource: PublicPressureSnapshot["dominantSource"];
  cooldownsBySource: PublicPressureSnapshot["cooldownsBySource"];
  districts: Record<string, DistrictPublicPressureSnapshot>;
  factionRelationships: Record<string, FactionRelationshipSnapshot>;
}

export function createDefaultPublicPressureState(): PublicPressureState {
  const districts: Record<string, DistrictPublicPressureSnapshot> = {};
  for (const t of districtTemplates) {
    districts[t.id] = createDefaultDistrictPublicPressure(t.id);
  }

  const factionRelationships: Record<string, FactionRelationshipSnapshot> = {};
  for (const t of factionTemplates) {
    factionRelationships[t.id] = createDefaultFactionRelationship(t.id);
  }

  return {
    ...createDefaultPublicPressure(),
    districts,
    factionRelationships,
  };
}

export function publicPressureStateToSnapshot(state: PublicPressureState): {
  publicPressure: PublicPressureSnapshot;
  factionRelationships: FactionRelationshipSnapshot[];
} {
  return {
    publicPressure: {
      score: state.score,
      dominantSource: state.dominantSource,
      cooldownsBySource: { ...state.cooldownsBySource },
      districts: Object.values(state.districts),
    },
    factionRelationships: Object.values(state.factionRelationships),
  };
}

export function publicPressureStateFromSnapshots(
  publicPressure: PublicPressureSnapshot,
  factionRelationships: readonly FactionRelationshipSnapshot[],
): PublicPressureState {
  const districts: Record<string, DistrictPublicPressureSnapshot> = {};
  for (const d of publicPressure.districts) {
    districts[d.districtId] = { ...d };
  }

  const relationships: Record<string, FactionRelationshipSnapshot> = {};
  for (const f of factionRelationships) {
    relationships[f.factionId] = { ...f };
  }

  return {
    score: publicPressure.score,
    dominantSource: publicPressure.dominantSource,
    cooldownsBySource: { ...publicPressure.cooldownsBySource },
    districts,
    factionRelationships: relationships,
  };
}

export function createDefaultRivalPressureState(): RivalPressureSnapshot {
  return createDefaultRivalPressure();
}

export function rivalPressureStateToSnapshot(
  state: RivalPressureSnapshot | undefined,
): RivalPressureSnapshot {
  return state
    ? { ...state, rivals: state.rivals.map((rival) => ({ ...rival })) }
    : createDefaultRivalPressure();
}

export function rivalPressureStateFromSnapshot(
  snapshot: RivalPressureSnapshot | null | undefined,
): RivalPressureSnapshot {
  if (!snapshot) {
    return createDefaultRivalPressure();
  }

  return {
    active: snapshot.active,
    currentPrimaryRivalId: snapshot.currentPrimaryRivalId,
    rivals: snapshot.rivals.map((rival) => ({ ...rival })),
  };
}

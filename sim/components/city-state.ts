import {
  createDefaultDistrictPressure,
  createDefaultFactionStanding,
  type CityPressureSnapshot,
  type DistrictPressureSnapshot,
  type FactionStandingSnapshot,
} from "save/types";
import { districtTemplates } from "content/templates/districts";
import { factionTemplates } from "content/templates/factions";

export interface CityState {
  districts: Record<string, DistrictPressureSnapshot>;
  factions: Record<string, FactionStandingSnapshot>;
}

export function createDefaultCityState(): CityState {
  const districts: Record<string, DistrictPressureSnapshot> = {};
  for (const t of districtTemplates) {
    districts[t.id] = createDefaultDistrictPressure(t.id);
  }

  const factions: Record<string, FactionStandingSnapshot> = {};
  for (const t of factionTemplates) {
    factions[t.id] = createDefaultFactionStanding(t.id);
  }

  return { districts, factions };
}

export function cityStateToSnapshot(state: CityState): CityPressureSnapshot {
  return {
    districts: Object.values(state.districts),
    factions: Object.values(state.factions),
  };
}

export function cityStateFromSnapshot(snapshot: CityPressureSnapshot): CityState {
  const districts: Record<string, DistrictPressureSnapshot> = {};
  for (const d of snapshot.districts) {
    districts[d.districtId] = { ...d };
  }

  const factions: Record<string, FactionStandingSnapshot> = {};
  for (const f of snapshot.factions) {
    factions[f.factionId] = { ...f };
  }

  return { districts, factions };
}

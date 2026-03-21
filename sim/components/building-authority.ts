import { soa } from "bitecs";

export const BuildingAuthority = soa({
  activeBuildingTemplateIndex: [] as number[],
  activeBuildingTier: [] as number[],
  roomSlotCount: [] as number[],
  operatorSlotCount: [] as number[],
});

import { soa } from "bitecs";

export const OperatorIdentity = soa({
  id: [] as string[],
  name: [] as string[],
  roleTag: [] as string[],
  specialtyTag: [] as string[],
  appearancePresetId: [] as string[],
  appearanceWeaponPartId: [] as string[],
  appearanceOutfitOverlayPartId: [] as string[],
  appearanceAccessoryPartId: [] as string[],
  lifecycleStatus: [] as string[],
  deathTick: [] as number[],
  deathRaidSummaryId: [] as string[],
  departureTick: [] as number[],
  departureReason: [] as string[],
});

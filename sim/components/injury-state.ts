import { soa } from "bitecs";

export const InjuryState = soa({
  severity: [] as number[],
  recoveryHoursRemaining: [] as number[],
  treated: [] as number[],
});

import { soa } from "bitecs";

export const EventState = soa({
  id: [] as string[],
  templateIndex: [] as number[],
  severity: [] as number[],
  remainingHours: [] as number[],
  pressureContribution: [] as number[],
});

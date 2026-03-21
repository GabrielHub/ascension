import { soa } from "bitecs";

export const ScheduleState = soa({
  currentBlock: [] as string[],
  workStartMinute: [] as number[],
  workEndMinute: [] as number[],
});

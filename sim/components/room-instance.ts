import { soa } from "bitecs";

export const RoomInstance = soa({
  templateIndex: [] as number[],
  tier: [] as number[],
  capacity: [] as number[],
  occupancy: [] as number[],
});

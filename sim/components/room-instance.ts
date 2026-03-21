import { soa } from "bitecs";

export const RoomInstance = soa({
  id: [] as string[],
  templateIndex: [] as number[],
  tier: [] as number[],
  capacity: [] as number[],
  occupancy: [] as number[],
  isRequestedActive: [] as number[],
  isOperational: [] as number[],
  assignedStaffCount: [] as number[],
  appliedUpgradeIds: [] as string[][],
  slotIndex: [] as number[],
});

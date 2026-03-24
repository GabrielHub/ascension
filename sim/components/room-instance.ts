import { soa } from "bitecs";

export const RoomInstance = soa({
  id: [] as string[],
  templateIndex: [] as number[],
  tier: [] as number[],
  floorIndex: [] as number[],
  slotId: [] as string[],
  roomStateId: [] as string[],
  capacity: [] as number[],
  occupancy: [] as number[],
  isRequestedActive: [] as number[],
  isOperational: [] as number[],
  assignedStaffCount: [] as number[],
  appliedUpgradeIds: [] as string[][],
  slotIndex: [] as number[],
  reservedCol: [] as number[],
  reservedRow: [] as number[],
  reservedCols: [] as number[],
  reservedRows: [] as number[],
});

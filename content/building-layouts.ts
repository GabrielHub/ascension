/**
 * Fixed building layouts define the full physical shell of each HQ building
 * type. Room slots, corridors, and the outer boundary are all defined upfront
 * so the building size never changes as the player adds or removes rooms.
 *
 * Any cell inside the shell that is not a room slot is automatically rendered
 * as a corridor tile (internal hallway).
 */

export interface BuildingRoomSlot {
  /** Stable slot identifier (e.g. "slot/0"). */
  slotId: string;
  /** Grid footprint for this slot. */
  col: number;
  row: number;
  cols: number;
  rows: number;
  /** If set, the room template placed here at game start. */
  startingTemplateId?: string;
}

export interface BuildingLayout {
  /** Which building template this layout belongs to. */
  buildingId: string;
  /** Outer shell footprint (encompasses all rooms + corridors). */
  shell: { col: number; row: number; cols: number; rows: number };
  /** All room slots in front-to-back order. */
  slots: readonly BuildingRoomSlot[];
}

// ── Bodega ───────────────────────────────────────────────────────────────────
//
// Layout (10 cols × 18 rows, front = high row numbers):
//
//  Row 0–2:    [Slot 5  4×3 @ col 0]  ··2-col gap··  [Slot 6  4×3 @ col 6]
//  Row 3–4:    [============ 2-row corridor ============]
//  Row 5–7:    [Slot 3  4×3 @ col 0]  ··2-col gap··  [Slot 4  4×3 @ col 6]
//  Row 8–9:    [============ 2-row corridor ============]
//  Row 10–12:  [Register 4×3 @ col 0] ··2-col gap··  [Counter 4×3 @ col 6]
//  Row 13–14:  [============ 2-row corridor ============]
//  Row 15–17:  ·1· [====== Dining Area 8×3 ======] ·1·

export const BODEGA_LAYOUT: BuildingLayout = {
  buildingId: "building/bodega",
  shell: { col: 0, row: 0, cols: 10, rows: 18 },
  slots: [
    // Slot 0 — Dining Area (double-wide, centered front)
    {
      slotId: "slot/0",
      col: 1,
      row: 15,
      cols: 8,
      rows: 3,
      startingTemplateId: "room/dining_area:tier_1",
    },
    // Slot 1 — Register (middle-left)
    {
      slotId: "slot/1",
      col: 0,
      row: 10,
      cols: 4,
      rows: 3,
      startingTemplateId: "room/register:tier_1",
    },
    // Slot 2 — Counter (middle-right)
    {
      slotId: "slot/2",
      col: 6,
      row: 10,
      cols: 4,
      rows: 3,
      startingTemplateId: "room/counter:tier_1",
    },
    // Slot 3 — back-left (locked)
    { slotId: "slot/3", col: 0, row: 5, cols: 4, rows: 3 },
    // Slot 4 — back-right (locked)
    { slotId: "slot/4", col: 6, row: 5, cols: 4, rows: 3 },
    // Slot 5 — far-back-left (locked)
    { slotId: "slot/5", col: 0, row: 0, cols: 4, rows: 3 },
    // Slot 6 — far-back-right (locked)
    { slotId: "slot/6", col: 6, row: 0, cols: 4, rows: 3 },
  ],
};

// ── Lookup ───────────────────────────────────────────────────────────────────

const LAYOUTS_BY_BUILDING: Record<string, BuildingLayout> = {
  [BODEGA_LAYOUT.buildingId]: BODEGA_LAYOUT,
};

export function getBuildingLayout(buildingId: string): BuildingLayout | undefined {
  return LAYOUTS_BY_BUILDING[buildingId];
}

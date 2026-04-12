import { useCallback, useMemo } from "react";

import { buildFocusHighlight, type FocusPayload } from "render";

import { BodegaFloor } from "./bodega-floor";
import type { GameCallbacks, HqViewModel, RoomCultureViewModel } from "./view-models";

/** Build a lookup from roomId → culture for efficient access in the floor strip. */
function buildCultureMap(
  cultures: readonly RoomCultureViewModel[],
): ReadonlyMap<string, RoomCultureViewModel> {
  const map = new Map<string, RoomCultureViewModel>();
  for (const c of cultures) map.set(c.roomId, c);
  return map;
}

interface HqPanelProps {
  hq: HqViewModel;
  callbacks: GameCallbacks;
  focus: FocusPayload | null;
  onFocusChange?: (focus: FocusPayload | null) => void;
  roomCultures?: readonly RoomCultureViewModel[];
}

export function HqPanel({ hq, callbacks, focus, onFocusChange, roomCultures = [] }: HqPanelProps) {
  const cultureMap = useMemo(() => buildCultureMap(roomCultures), [roomCultures]);
  const selectedRoomId = focus?.targetKind === "room" ? focus.targetId : null;
  const currentFloorRooms = hq.rooms.filter(
    (room) => room.floorIndex === hq.building.activeFloorIndex,
  );
  const currentFloorExpansionSlots = hq.expansionSlots.filter(
    (slot) => slot.floorIndex === hq.building.activeFloorIndex,
  );
  const currentFloorTotalSlots = currentFloorRooms.length + currentFloorExpansionSlots.length;
  const handleSelectRoom = useCallback(
    (roomId: string) => {
      if (!onFocusChange) return;
      onFocusChange(selectedRoomId === roomId ? null : buildFocusHighlight("room", roomId, null));
    },
    [onFocusChange, selectedRoomId],
  );
  const handlePlaceRoom = useCallback(
    (templateId: string, floorIndex: number, slotId: string) => {
      onFocusChange?.(null);
      callbacks.placeRoom(templateId, floorIndex, slotId);
    },
    [callbacks, onFocusChange],
  );

  return (
    <div className="animate-enter space-y-4">
      {/* Room strip — full width */}
      <div>
        <div className="flex items-center justify-between pb-2">
          <div className="flex items-center gap-3">
            <h2 className="text-xs font-medium uppercase tracking-[0.18em] text-gold/80">
              {hq.building.name}
            </h2>
            <span className="text-xs tabular-nums text-silver/60">
              Floor {hq.building.activeFloorIndex + 1}/{hq.building.floorCount}
            </span>
            {hq.building.id === "building/porters" && (
              <span className="badge badge-slate">
                {hq.building.activeFloorIndex === 0
                  ? "Public"
                  : hq.building.activeFloorIndex === 1
                    ? "Private"
                    : "Waterfront"}
              </span>
            )}
          </div>
          <span className="text-xs tabular-nums text-silver/60">
            {currentFloorRooms.length} rooms / {currentFloorTotalSlots} slots
          </span>
        </div>
        <p className="pb-2 text-xs leading-relaxed text-silver/45">
          {hq.building.id === "building/porters"
            ? hq.building.activeFloorIndex === 0
              ? "Ground floor — worn hardwood and loud conversation. The bar and dining room keep regulars coming through while operators eat alongside them."
              : hq.building.activeFloorIndex === 1
                ? "Upstairs — converted apartments turned real operational rooms. Admin, recovery, training, and prep behind doors that actually close."
                : "Waterfront — concrete dock and weathered deck over harbor water. Staging and decompression where the salt air does half the work."
            : "The whole operation runs out of one floor. Every room doubles as something else."}
        </p>
        <BodegaFloor
          rooms={currentFloorRooms}
          expansionSlots={currentFloorExpansionSlots}
          placeableTemplates={hq.placeableRoomTemplates}
          selectedRoomId={selectedRoomId}
          onSelectRoom={handleSelectRoom}
          onPlaceRoom={handlePlaceRoom}
          cultureMap={cultureMap}
        />
      </div>
    </div>
  );
}

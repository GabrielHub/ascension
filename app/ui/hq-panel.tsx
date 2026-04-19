import { useCallback, useMemo } from "react";

import { buildFocusHighlight, type FocusPayload } from "render";

import { BodegaFloor } from "./bodega-floor";
import type { ExpansionSlotViewModel, HqViewModel } from "./view-models";

interface HqPanelProps {
  hq: HqViewModel;
  focus: FocusPayload | null;
  onFocusChange?: (focus: FocusPayload | null) => void;
  onOpenPlaceRoom: (slot: ExpansionSlotViewModel) => void;
}

export function HqPanel({ hq, focus, onFocusChange, onOpenPlaceRoom }: HqPanelProps) {
  const selectedRoomId = focus?.targetKind === "room" ? focus.targetId : null;
  const { currentFloorRooms, currentFloorExpansionSlots } = useMemo(() => {
    return {
      currentFloorRooms: hq.rooms.filter(
        (room) => room.floorIndex === hq.building.activeFloorIndex,
      ),
      currentFloorExpansionSlots: hq.expansionSlots.filter(
        (slot) => slot.floorIndex === hq.building.activeFloorIndex,
      ),
    };
  }, [hq.rooms, hq.expansionSlots, hq.building.activeFloorIndex]);
  const handleSelectRoom = useCallback(
    (roomId: string) => {
      if (!onFocusChange) return;
      onFocusChange(selectedRoomId === roomId ? null : buildFocusHighlight("room", roomId, null));
    },
    [onFocusChange, selectedRoomId],
  );

  return (
    <BodegaFloor
      rooms={currentFloorRooms}
      expansionSlots={currentFloorExpansionSlots}
      selectedRoomId={selectedRoomId}
      onSelectRoom={handleSelectRoom}
      onOpenPlaceRoom={onOpenPlaceRoom}
    />
  );
}

import { useCallback, useMemo } from "react";

import { buildFocusHighlight, type FocusPayload } from "render";

import { BodegaFloor } from "./bodega-floor";
import { RoomDetailPanel } from "./room-detail-panel";
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
  onClearFocus?: () => void;
  roomCultures?: readonly RoomCultureViewModel[];
}

export function HqPanel({
  hq,
  callbacks,
  focus,
  onFocusChange,
  onClearFocus,
  roomCultures = [],
}: HqPanelProps) {
  const cultureMap = useMemo(() => buildCultureMap(roomCultures), [roomCultures]);
  const selectedRoomId = focus?.targetKind === "room" ? focus.targetId : null;
  const selectedRoom = hq.rooms.find((r) => r.id === selectedRoomId) ?? null;
  const currentFloorRooms = hq.rooms.filter(
    (room) => room.floorIndex === hq.building.activeFloorIndex,
  );
  const currentFloorExpansionSlots = hq.expansionSlots.filter(
    (slot) => slot.floorIndex === hq.building.activeFloorIndex,
  );
  const currentFloorTotalSlots = currentFloorRooms.length + currentFloorExpansionSlots.length;

  const selectedRoomUpgrades = selectedRoom
    ? hq.roomUpgrades.filter((u) => u.targetId === selectedRoom.templateId)
    : [];

  const selectedRoomCulture = selectedRoom ? (cultureMap.get(selectedRoom.id) ?? null) : null;
  const handleSelectRoom = useCallback(
    (roomId: string) => {
      if (!onFocusChange) return;
      onFocusChange(selectedRoomId === roomId ? null : buildFocusHighlight("room", roomId, null));
    },
    [onFocusChange, selectedRoomId],
  );
  const handleClearRoom = useCallback(() => {
    if (onFocusChange) {
      onFocusChange(null);
      return;
    }
    onClearFocus?.();
  }, [onClearFocus, onFocusChange]);

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
          expansionSlots={hq.expansionSlots}
          placeableTemplates={hq.placeableRoomTemplates}
          selectedRoomId={selectedRoomId}
          onSelectRoom={handleSelectRoom}
          onPlaceRoom={callbacks.placeRoom}
          cultureMap={cultureMap}
        />
      </div>

      {/* Room detail — full width below room strip */}
      {selectedRoom && (
        <div className="border-t border-[rgba(200,168,76,0.06)] pt-4">
          <div className="flex items-start justify-between">
            <div className="min-w-0 flex-1">
              <RoomDetailPanel
                guildName={hq.guild.guildName}
                room={selectedRoom}
                buildingUpgrades={hq.upgrades}
                roomUpgrades={selectedRoomUpgrades}
                callbacks={callbacks}
                roomCulture={selectedRoomCulture}
              />
            </div>
            <button
              type="button"
              className="btn-ghost ml-3 shrink-0 px-1.5 py-1 text-sm leading-none text-silver/40 hover:text-silver-bright"
              onClick={handleClearRoom}
              aria-label="Close room detail"
            >
              &times;
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

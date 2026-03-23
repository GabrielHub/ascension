import { useEffect, useMemo, useState } from "react";

import type { FocusPayload } from "render";

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
  onClearFocus?: () => void;
  roomCultures?: readonly RoomCultureViewModel[];
}

export function HqPanel({ hq, callbacks, focus, onClearFocus, roomCultures = [] }: HqPanelProps) {
  const cultureMap = useMemo(() => buildCultureMap(roomCultures), [roomCultures]);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);

  useEffect(() => {
    if (!focus) return;

    if (focus.targetKind === "room") {
      setSelectedRoomId(focus.targetId);
    }
  }, [focus]);

  // Sync selection from world canvas focus
  const effectiveRoomId = focus?.targetKind === "room" ? focus.targetId : selectedRoomId;

  const selectedRoom = hq.rooms.find((r) => r.id === effectiveRoomId) ?? null;

  const selectedRoomUpgrades = selectedRoom
    ? hq.roomUpgrades.filter((u) => u.targetId === selectedRoom.templateId)
    : [];

  const selectedRoomCulture = selectedRoom ? (cultureMap.get(selectedRoom.id) ?? null) : null;

  return (
    <div className="animate-enter space-y-4">
      {/* Room strip — full width */}
      <div>
        <div className="flex items-center justify-between pb-2">
          <h2 className="text-xs font-medium uppercase tracking-[0.18em] text-gold/80">Rooms</h2>
          <span className="text-xs tabular-nums text-silver/60">
            {hq.rooms.filter((r) => r.isActive).length}/{hq.rooms.length} active
          </span>
        </div>
        <BodegaFloor
          rooms={hq.rooms}
          emptySlots={hq.emptySlots}
          placeableTemplates={hq.placeableRoomTemplates}
          selectedRoomId={effectiveRoomId}
          onSelectRoom={setSelectedRoomId}
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
                room={selectedRoom}
                buildingUpgrades={hq.upgrades}
                roomUpgrades={selectedRoomUpgrades}
                callbacks={callbacks}
                roomCulture={selectedRoomCulture}
              />
            </div>
            <button
              type="button"
              className="ml-3 shrink-0 text-silver/40 transition-colors hover:text-silver-bright"
              onClick={() => {
                setSelectedRoomId(null);
                onClearFocus?.();
              }}
              aria-label="Close room detail"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              >
                <path d="M4 4l8 8M12 4l-8 8" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

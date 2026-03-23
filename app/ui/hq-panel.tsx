import { useEffect, useState } from "react";

import type { FocusPayload } from "render";

import { BodegaFloor } from "./bodega-floor";
import { RoomDetailPanel } from "./room-detail-panel";
import type { GameCallbacks, HqViewModel, RoomCultureViewModel } from "./view-models";

interface HqPanelProps {
  hq: HqViewModel;
  callbacks: GameCallbacks;
  focus: FocusPayload | null;
  roomCultures?: readonly RoomCultureViewModel[];
}

export function HqPanel({ hq, callbacks, focus, roomCultures = [] }: HqPanelProps) {
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

  const selectedRoomCulture = selectedRoom
    ? (roomCultures.find((rc) => rc.roomId === selectedRoom.id) ?? null)
    : null;

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
        <div className="overflow-x-auto overflow-y-hidden">
          <BodegaFloor
            rooms={hq.rooms}
            emptySlots={hq.emptySlots}
            placeableTemplates={hq.placeableRoomTemplates}
            selectedRoomId={effectiveRoomId}
            onSelectRoom={setSelectedRoomId}
            onPlaceRoom={callbacks.placeRoom}
          />
        </div>
        {roomCultures.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {roomCultures.map((culture) => (
              <button
                key={culture.roomId}
                type="button"
                className={`rounded-full border px-2.5 py-1 text-left transition-colors ${
                  effectiveRoomId === culture.roomId
                    ? "border-gold/30 bg-[rgba(200,168,76,0.08)]"
                    : "border-[rgba(200,168,76,0.08)] bg-[rgba(6,6,8,0.32)] hover:border-gold/20"
                }`}
                onClick={() => setSelectedRoomId(culture.roomId)}
              >
                <div className="text-[0.625rem] uppercase tracking-[0.12em] text-gold/55">
                  {culture.roomName}
                </div>
                <div className="text-[0.6875rem] text-silver/60">
                  {culture.tone || "neutral"}
                  {culture.signals[0] ? ` • ${culture.signals[0]}` : ""}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Room detail — full width below room strip */}
      {selectedRoom && (
        <div className="border-t border-[rgba(200,168,76,0.06)] pt-4">
          <RoomDetailPanel
            room={selectedRoom}
            buildingUpgrades={hq.upgrades}
            roomUpgrades={selectedRoomUpgrades}
            callbacks={callbacks}
            roomCulture={selectedRoomCulture}
          />
        </div>
      )}
    </div>
  );
}

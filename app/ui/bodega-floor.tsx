import { useState } from "react";

import type { EmptySlotViewModel, PlaceableRoomTemplate, RoomViewModel } from "./view-models";

interface BodegaFloorProps {
  rooms: readonly RoomViewModel[];
  emptySlots: readonly EmptySlotViewModel[];
  placeableTemplates: readonly PlaceableRoomTemplate[];
  selectedRoomId: string | null;
  onSelectRoom: (roomId: string) => void;
  onPlaceRoom: (templateId: string) => void;
}

function RoomCard({
  room,
  isSelected,
  onSelect,
}: {
  room: RoomViewModel;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const occupancyRatio = room.capacity > 0 ? room.occupancy / room.capacity : 0;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`glass-card group relative w-full cursor-pointer p-4 text-left transition-all duration-300 ${
        isSelected ? "border-[rgba(200,168,76,0.3)] shadow-[0_0_24px_rgba(200,168,76,0.1)]" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-medium text-silver-bright">{room.name}</h3>
          <p className="mt-0.5 text-xs leading-relaxed text-silver/60">{room.description}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {room.isOperational ? (
            <div
              className="h-2 w-2 rounded-full bg-gold shadow-[0_0_6px_rgba(200,168,76,0.4)]"
              title="Operational — fully staffed"
            />
          ) : room.isActive ? (
            <div className="h-2 w-2 rounded-full bg-gold-dim/50" title="Active — needs staff" />
          ) : (
            <div className="h-2 w-2 rounded-full bg-slate" title="Inactive" />
          )}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="badge badge-gold">T{room.tier}</span>
          {room.tags
            .filter((t) => t.startsWith("role:"))
            .map((tag) => (
              <span key={tag} className="badge badge-slate">
                {tag.split(":")[1]}
              </span>
            ))}
          {!room.isActive && <span className="text-[0.6875rem] text-silver/60">Inactive</span>}
        </div>
        <span
          className={`text-xs tabular-nums ${room.isOperational ? "text-gold" : "text-gold/70"}`}
        >
          {room.occupancy}/{room.capacity}
        </span>
      </div>

      <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-[rgba(6,6,8,0.6)]">
        <div
          className="h-full rounded-full bg-gold/40 transition-all duration-500"
          style={{ width: `${occupancyRatio * 100}%` }}
        />
      </div>
    </button>
  );
}

function EmptySlotCard({
  index,
  placeableTemplates,
  onPlaceRoom,
}: {
  index: number;
  placeableTemplates: readonly PlaceableRoomTemplate[];
  onPlaceRoom: (templateId: string) => void;
}) {
  const [showPicker, setShowPicker] = useState(false);

  if (placeableTemplates.length === 0) {
    return (
      <div className="glass-card-inset flex min-h-[120px] flex-col items-center justify-center gap-2 p-4 opacity-50">
        <div className="flex h-8 w-8 items-center justify-center rounded-full border border-dashed border-gold-dim/30">
          <span className="text-sm text-gold/70">+</span>
        </div>
        <span className="text-xs uppercase tracking-[0.15em] text-silver/60">Slot {index + 1}</span>
      </div>
    );
  }

  if (showPicker) {
    return (
      <div className="glass-card-inset min-h-[120px] p-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-[0.12em] text-gold/80">
            Place a room
          </span>
          <button
            type="button"
            className="text-[0.6875rem] text-silver/60 hover:text-gold/80"
            onClick={() => setShowPicker(false)}
          >
            cancel
          </button>
        </div>
        <div className="space-y-1.5">
          {placeableTemplates.map((t) => (
            <button
              key={t.id}
              type="button"
              className="btn-primary w-full px-2.5 py-1.5 text-[0.6875rem]"
              onClick={() => {
                onPlaceRoom(t.id);
                setShowPicker(false);
              }}
            >
              {t.name}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      className="glass-card-inset flex min-h-[120px] w-full cursor-pointer flex-col items-center justify-center gap-2 p-4 opacity-70 transition-opacity hover:opacity-100"
      onClick={() => setShowPicker(true)}
    >
      <div className="flex h-8 w-8 items-center justify-center rounded-full border border-dashed border-gold-dim/30">
        <span className="text-sm text-gold/70">+</span>
      </div>
      <span className="text-xs uppercase tracking-[0.15em] text-silver/60">Build room</span>
    </button>
  );
}

export function BodegaFloor({
  rooms,
  emptySlots,
  placeableTemplates,
  selectedRoomId,
  onSelectRoom,
  onPlaceRoom,
}: BodegaFloorProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {rooms.map((room) => (
        <RoomCard
          key={room.id}
          room={room}
          isSelected={selectedRoomId === room.id}
          onSelect={() => onSelectRoom(room.id)}
        />
      ))}
      {emptySlots.map((slot) => (
        <EmptySlotCard
          key={`empty-${slot.index}`}
          index={slot.index}
          placeableTemplates={placeableTemplates}
          onPlaceRoom={onPlaceRoom}
        />
      ))}
    </div>
  );
}

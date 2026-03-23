import { useState } from "react";

import type {
  EmptySlotViewModel,
  PlaceableRoomTemplate,
  RoomCultureViewModel,
  RoomViewModel,
} from "./view-models";
import { formatCultureLabel } from "./view-models";
import { Tooltip } from "./_tooltip";
import { getTagTip, getToneTip, getSignalTip } from "./_glossary";

interface BodegaFloorProps {
  rooms: readonly RoomViewModel[];
  emptySlots: readonly EmptySlotViewModel[];
  placeableTemplates: readonly PlaceableRoomTemplate[];
  selectedRoomId: string | null;
  onSelectRoom: (roomId: string) => void;
  onPlaceRoom: (templateId: string) => void;
  cultureMap?: ReadonlyMap<string, RoomCultureViewModel>;
}

function StatusDot({ room }: { room: RoomViewModel }) {
  if (room.isOperational) {
    return (
      <Tooltip content="Fully staffed and operational">
        <span className="inline-block h-2 w-2 shrink-0 rounded-full bg-gold shadow-[0_0_6px_rgba(200,168,76,0.4)]" />
      </Tooltip>
    );
  }
  if (room.isActive) {
    return (
      <Tooltip content="Active but understaffed">
        <span className="inline-block h-2 w-2 shrink-0 rounded-full bg-gold-dim/50" />
      </Tooltip>
    );
  }
  return (
    <Tooltip content="Inactive — not generating benefits">
      <span className="inline-block h-2 w-2 shrink-0 rounded-full bg-slate" />
    </Tooltip>
  );
}

function RoomCard({
  room,
  isSelected,
  onSelect,
  culture,
}: {
  room: RoomViewModel;
  isSelected: boolean;
  onSelect: () => void;
  culture?: RoomCultureViewModel;
}) {
  const occupancyRatio = room.capacity > 0 ? room.occupancy / room.capacity : 0;
  const upgradeCount = room.appliedUpgradeIds.length;
  const highlightTags = room.tags.filter(
    (tag) => tag.startsWith("room:") || tag.startsWith("staff:") || tag.startsWith("ops:"),
  );

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`glass-card group relative min-w-0 flex-1 cursor-pointer p-3 text-left transition-all duration-300 ${
        isSelected ? "border-[rgba(200,168,76,0.3)] shadow-[0_0_24px_rgba(200,168,76,0.1)]" : ""
      }`}
    >
      {/* Top row: status dot, name, tier badge, occupancy */}
      <div className="flex items-center gap-2.5">
        <StatusDot room={room} />
        <span className="min-w-0 truncate text-sm font-medium text-silver-bright">{room.name}</span>
        <div className="ml-auto flex shrink-0 items-center gap-2">
          {upgradeCount > 0 && (
            <Tooltip content={`${upgradeCount} upgrade${upgradeCount > 1 ? "s" : ""} applied`}>
              <span className="badge badge-gold">+{upgradeCount}</span>
            </Tooltip>
          )}
          <Tooltip content="Room tier — higher tiers unlock upgrades">
            <span className="badge badge-gold">T{room.tier}</span>
          </Tooltip>
          <Tooltip content="Staff assigned / max capacity">
            <span
              className={`text-xs tabular-nums ${room.isOperational ? "text-gold" : "text-gold/70"}`}
            >
              {room.occupancy}/{room.capacity}
            </span>
          </Tooltip>
        </div>
      </div>

      {/* Description + role tags */}
      <div className="mt-1.5 flex items-center gap-2">
        <p className="min-w-0 truncate text-[0.6875rem] leading-snug text-silver/50">
          {room.description}
        </p>
        {highlightTags.slice(0, 2).map((tag) => (
          <Tooltip key={tag} content={getTagTip(tag)}>
            <span className="badge badge-slate shrink-0">
              {tag.split(":")[1]?.replace(/_/g, " ")}
            </span>
          </Tooltip>
        ))}
        {!room.isActive && (
          <span className="shrink-0 text-[0.6875rem] text-silver/40">Inactive</span>
        )}
      </div>

      {/* Culture tone */}
      {culture && (
        <div className="mt-1.5 flex items-center gap-1.5 text-[0.625rem] text-silver/45">
          <Tooltip content={getToneTip(culture.tone)} side="top">
            <span>{formatCultureLabel(culture.tone || "neutral")}</span>
          </Tooltip>
          {culture.signals[0] && (
            <>
              <span className="opacity-40">&middot;</span>
              <Tooltip content={getSignalTip(culture.signals[0])} side="top">
                <span>{formatCultureLabel(culture.signals[0])}</span>
              </Tooltip>
            </>
          )}
        </div>
      )}

      {/* Occupancy bar across bottom */}
      <div className="mt-2 h-0.5 w-full overflow-hidden rounded-full bg-[rgba(6,6,8,0.6)]">
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
      <div className="glass-card-inset flex min-w-0 flex-1 items-center justify-center gap-2.5 p-3 opacity-50">
        <div className="flex h-6 w-6 items-center justify-center rounded-full border border-dashed border-gold-dim/30">
          <span className="text-xs text-gold/70">+</span>
        </div>
        <span className="text-xs uppercase tracking-[0.15em] text-silver/60">Slot {index + 1}</span>
      </div>
    );
  }

  if (showPicker) {
    return (
      <div className="glass-card-inset min-w-0 flex-1 p-3">
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
        <div className="flex flex-wrap gap-1.5">
          {placeableTemplates.map((t) => (
            <button
              key={t.id}
              type="button"
              className="btn-primary px-2.5 py-1.5 text-[0.6875rem]"
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
      className="glass-card-inset flex min-w-0 flex-1 cursor-pointer items-center justify-center gap-2.5 p-3 opacity-70 transition-opacity hover:opacity-100"
      onClick={() => setShowPicker(true)}
    >
      <div className="flex h-6 w-6 items-center justify-center rounded-full border border-dashed border-gold-dim/30">
        <span className="text-xs text-gold/70">+</span>
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
  cultureMap,
}: BodegaFloorProps) {
  return (
    <div className="flex gap-3">
      {rooms.map((room) => (
        <RoomCard
          key={room.id}
          room={room}
          isSelected={selectedRoomId === room.id}
          onSelect={() => onSelectRoom(room.id)}
          culture={cultureMap?.get(room.id)}
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

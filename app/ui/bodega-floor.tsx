import { useState } from "react";

import { formatSlotLabel } from "lib/hq-room-state";

import type {
  ExpansionSlotViewModel,
  PlaceableRoomTemplate,
  RoomCultureViewModel,
  RoomViewModel,
} from "./view-models";
import { Tooltip } from "./_tooltip";
import { getSignalMeta, getTagMeta, getToneMeta } from "./_glossary";

function formatFootprintLabel(room: RoomViewModel): string {
  const reserved = `${room.reservedFootprint.cols}x${room.reservedFootprint.rows}`;
  const active = `${room.activeFootprint.cols}x${room.activeFootprint.rows}`;
  return reserved === active ? reserved : `${reserved} -> ${active}`;
}

export function getRoomProgressRatio(room: RoomViewModel): number {
  if (!room.requiredStaffTag) {
    return room.isOperational ? 1 : room.isActive ? 0.5 : 0;
  }

  return room.capacity > 0 ? room.assignedStaffCount / room.capacity : 0;
}

export function getRoomStatusTip(room: RoomViewModel): string {
  if (room.isOperational) {
    if (!room.requiredStaffTag) {
      return "Active and delivering its passive room benefits";
    }

    return room.assignedStaffCount >= room.capacity
      ? "Fully staffed and operational"
      : "Operational, with room for more staff to improve throughput";
  }
  if (room.isActive) {
    return room.requiredStaffTag
      ? "Active, but not yet staffed enough to operate"
      : "Active and available for guild use";
  }
  return "Inactive - not generating benefits";
}

export function getRoomStaffingLabel(room: RoomViewModel): string {
  if (!room.requiredStaffTag) {
    return room.isActive ? "No staff needed" : "Passive room";
  }

  return `${room.assignedStaffCount}/${room.capacity}`;
}

function StatusDot({ room }: { room: RoomViewModel }) {
  if (room.isOperational) {
    return (
      <Tooltip content={getRoomStatusTip(room)}>
        <span className="inline-block h-2 w-2 shrink-0 rounded-full bg-gold shadow-[0_0_6px_rgba(200,168,76,0.4)]" />
      </Tooltip>
    );
  }
  if (room.isActive) {
    return (
      <Tooltip content={getRoomStatusTip(room)}>
        <span className="inline-block h-2 w-2 shrink-0 rounded-full bg-gold-dim/50" />
      </Tooltip>
    );
  }
  return (
    <Tooltip content={getRoomStatusTip(room)}>
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
  const occupancyRatio = getRoomProgressRatio(room);
  const upgradeCount = room.appliedUpgradeIds.length;
  const staffTagMeta = room.requiredStaffTag ? getTagMeta(room.requiredStaffTag) : null;
  const highlightTags = room.tags.filter(
    (tag) => tag.startsWith("room:") || tag.startsWith("staff:") || tag.startsWith("ops:"),
  );

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`glass-card group relative w-full cursor-pointer p-3 text-left transition-all duration-300 ${
        isSelected ? "border-[rgba(200,168,76,0.3)] shadow-[0_0_24px_rgba(200,168,76,0.1)]" : ""
      }`}
    >
      <div className="flex items-center gap-2.5">
        <StatusDot room={room} />
        <span className="min-w-0 truncate text-sm font-medium text-silver-bright">{room.name}</span>
        <div className="ml-auto flex shrink-0 items-center gap-2">
          {upgradeCount > 0 && (
            <Tooltip content={`${upgradeCount} upgrade${upgradeCount > 1 ? "s" : ""} applied`}>
              <span className="badge badge-gold">+{upgradeCount}</span>
            </Tooltip>
          )}
          <Tooltip content="Room tier - higher tiers unlock upgrades">
            <span className="badge badge-gold">T{room.tier}</span>
          </Tooltip>
          <Tooltip
            content={
              room.requiredStaffTag
                ? "Assigned staff / staffing needed for full output"
                : "This room does not need dedicated staff to function"
            }
          >
            <span
              className={`text-xs tabular-nums ${room.isOperational ? "text-gold" : "text-gold/70"}`}
            >
              {getRoomStaffingLabel(room)}
            </span>
          </Tooltip>
        </div>
      </div>

      <div className="mt-1.5 flex items-center gap-2">
        <p className="min-w-0 truncate text-[0.6875rem] leading-snug text-silver/50">
          {room.description}
        </p>
        {highlightTags.slice(0, 2).map((tag) => (
          <Tooltip key={tag} content={getTagMeta(tag).tip}>
            <span className="badge badge-slate shrink-0">{getTagMeta(tag).label}</span>
          </Tooltip>
        ))}
        {!room.isActive && (
          <span className="shrink-0 text-[0.6875rem] text-silver/40">Inactive</span>
        )}
      </div>

      <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[0.625rem] text-silver/55">
        <span className="badge badge-slate">Floor {room.floorIndex + 1}</span>
        <span className="badge badge-slate">{formatSlotLabel(room.slotId)}</span>
        <Tooltip content={`Reserved vs active footprint: ${formatFootprintLabel(room)}`}>
          <span className="badge badge-slate">{formatFootprintLabel(room)}</span>
        </Tooltip>
        {staffTagMeta ? (
          <Tooltip content={staffTagMeta.tip}>
            <span className="badge badge-slate">{staffTagMeta.label}</span>
          </Tooltip>
        ) : (
          <span className="badge badge-slate">No dedicated staff</span>
        )}
      </div>

      {culture && (
        <div className="mt-1.5 flex items-center gap-1.5 text-[0.625rem] text-silver/45">
          <Tooltip content={getToneMeta(culture.tone || "neutral").tip} side="top">
            <span>{getToneMeta(culture.tone || "neutral").label}</span>
          </Tooltip>
          {culture.signals[0] && (
            <>
              <span className="opacity-40">&middot;</span>
              <Tooltip content={getSignalMeta(culture.signals[0]).tip} side="top">
                <span>{getSignalMeta(culture.signals[0]).label}</span>
              </Tooltip>
            </>
          )}
        </div>
      )}

      <div className="mt-2 h-0.5 w-full overflow-hidden rounded-full bg-[rgba(6,6,8,0.6)]">
        <div
          className="h-full rounded-full bg-gold/40 transition-all duration-500"
          style={{ width: `${occupancyRatio * 100}%` }}
        />
      </div>
    </button>
  );
}

function ExpansionSlotCard({
  slot,
  placeableTemplates,
  onPlaceRoom,
}: {
  slot: ExpansionSlotViewModel;
  placeableTemplates: readonly PlaceableRoomTemplate[];
  onPlaceRoom: (templateId: string, floorIndex: number, slotId: string) => void;
}) {
  const [showPicker, setShowPicker] = useState(false);
  const isAvailable = slot.kind === "available";

  if (!isAvailable) {
    return (
      <div className="glass-card-inset flex min-w-0 flex-col gap-2 p-3 opacity-65">
        <div className="flex items-center gap-2">
          <span className="badge badge-slate uppercase tracking-[0.14em]">Locked</span>
          <span className="min-w-0 truncate text-sm text-silver-bright">{slot.label}</span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 text-[0.625rem] text-silver/55">
          <span className="badge badge-slate">Floor {slot.floorIndex + 1}</span>
          <span className="badge badge-slate">{formatSlotLabel(slot.slotId)}</span>
          <Tooltip content="Reserved interior footprint">
            <span className="badge badge-slate">
              {slot.footprint.cols}x{slot.footprint.rows}
            </span>
          </Tooltip>
        </div>
      </div>
    );
  }

  if (showPicker) {
    return (
      <div className="glass-card-inset min-w-0 p-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <span className="text-xs font-medium uppercase tracking-[0.12em] text-gold/80">
              Place a room
            </span>
            <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[0.625rem] text-silver/55">
              <span className="badge badge-slate">Floor {slot.floorIndex + 1}</span>
              <span className="badge badge-slate">{formatSlotLabel(slot.slotId)}</span>
            </div>
          </div>
          <button
            type="button"
            className="text-[0.6875rem] text-silver/60 hover:text-gold/80"
            onClick={() => setShowPicker(false)}
          >
            cancel
          </button>
        </div>
        {placeableTemplates.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {placeableTemplates.map((template) => (
              <button
                key={template.id}
                type="button"
                className="btn-primary px-2.5 py-1.5 text-[0.6875rem]"
                onClick={() => {
                  onPlaceRoom(template.id, slot.floorIndex, slot.slotId);
                  setShowPicker(false);
                }}
              >
                {template.name}
              </button>
            ))}
          </div>
        ) : (
          <div className="text-xs text-silver/50">No room templates are unlocked yet.</div>
        )}
      </div>
    );
  }

  return (
    <button
      type="button"
      className="glass-card-inset flex min-w-0 cursor-pointer flex-col gap-2 p-3 text-left opacity-85 transition-opacity hover:opacity-100"
      onClick={() => setShowPicker(true)}
    >
      <div className="flex items-center gap-2">
        <span className="badge badge-gold uppercase tracking-[0.14em]">Open</span>
        <span className="min-w-0 truncate text-sm text-silver-bright">{slot.label}</span>
      </div>
      <div className="flex flex-wrap items-center gap-1.5 text-[0.625rem] text-silver/55">
        <span className="badge badge-slate">Floor {slot.floorIndex + 1}</span>
        <span className="badge badge-slate">{formatSlotLabel(slot.slotId)}</span>
        <Tooltip content="Reserved interior footprint">
          <span className="badge badge-slate">
            {slot.footprint.cols}x{slot.footprint.rows}
          </span>
        </Tooltip>
      </div>
      <div className="text-xs uppercase tracking-[0.15em] text-gold/70">Build room</div>
    </button>
  );
}

export function BodegaFloor({
  rooms,
  expansionSlots,
  placeableTemplates,
  selectedRoomId,
  onSelectRoom,
  onPlaceRoom,
  cultureMap,
}: BodegaFloorProps) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-[0.6875rem] font-medium uppercase tracking-[0.18em] text-gold/70">
            Current Floor Rooms
          </h3>
          <span className="text-xs text-silver/55">
            {rooms.length} room{rooms.length === 1 ? "" : "s"}
          </span>
        </div>
        <div className="space-y-2">
          {rooms.length > 0 ? (
            rooms.map((room) => (
              <RoomCard
                key={room.id}
                room={room}
                isSelected={selectedRoomId === room.id}
                onSelect={() => onSelectRoom(room.id)}
                culture={cultureMap?.get(room.id)}
              />
            ))
          ) : (
            <div className="glass-card-inset p-4 text-sm text-silver/50">
              No rooms are placed on this floor yet.
            </div>
          )}
        </div>
      </section>

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-[0.6875rem] font-medium uppercase tracking-[0.18em] text-gold/70">
            Available Slots
          </h3>
          <span className="text-xs text-silver/55">
            {expansionSlots.length} slot{expansionSlots.length === 1 ? "" : "s"}
          </span>
        </div>
        <div className="space-y-2">
          {expansionSlots.length > 0 ? (
            expansionSlots.map((slot) => (
              <ExpansionSlotCard
                key={slot.id}
                slot={slot}
                placeableTemplates={placeableTemplates}
                onPlaceRoom={onPlaceRoom}
              />
            ))
          ) : (
            <div className="glass-card-inset p-4 text-sm text-silver/50">
              No expansion slots are available on this floor.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

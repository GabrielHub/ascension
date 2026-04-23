import type { ExpansionSlotViewModel, RoomViewModel } from "./view-models";
import { Tooltip } from "./_tooltip";

export function getRoomProgressRatio(room: RoomViewModel): number {
  return room.isOperational ? 1 : 0;
}

export function getRoomStatusTip(room: RoomViewModel): string {
  if (room.isOperational) {
    return "Operational";
  }
  return "Blocked by incident, damage, or construction";
}

export function getRoomOperationalLabel(room: RoomViewModel): string {
  return room.isOperational ? "Online" : "Blocked";
}

function StatusDot({ room }: { room: RoomViewModel }) {
  if (room.isOperational) {
    return (
      <Tooltip content={getRoomStatusTip(room)}>
        <span className="inline-block h-2 w-2 shrink-0 rounded-full bg-gold shadow-[0_0_6px_rgba(200,168,76,0.4)]" />
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
}: {
  room: RoomViewModel;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const occupancyRatio = getRoomProgressRatio(room);
  const upgradeCount = room.appliedUpgradeIds.length;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`glass-card group relative w-full cursor-pointer px-3 py-2 text-left transition-all duration-200 ${
        isSelected ? "border-[rgba(200,168,76,0.3)] shadow-[0_0_18px_rgba(200,168,76,0.08)]" : ""
      }`}
    >
      <div className="flex items-center gap-2">
        <StatusDot room={room} />
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-silver-bright">
          {room.name}
        </span>
        {upgradeCount > 0 && (
          <Tooltip content={`${upgradeCount} upgrade${upgradeCount > 1 ? "s" : ""} applied`}>
            <span className="badge badge-gold shrink-0">+{upgradeCount}</span>
          </Tooltip>
        )}
        <Tooltip content="Room tier — higher tiers unlock upgrades">
          <span className="badge badge-gold shrink-0">T{room.tier}</span>
        </Tooltip>
        <Tooltip content={getRoomStatusTip(room)}>
          <span
            className={`shrink-0 text-xs tabular-nums ${
              room.isOperational ? "text-gold" : "text-gold/60"
            }`}
          >
            {getRoomOperationalLabel(room)}
          </span>
        </Tooltip>
      </div>

      {!room.isOperational && (
        <div className="mt-1 text-xs uppercase tracking-[0.12em] text-silver/40">Blocked</div>
      )}

      <div className="mt-1.5 h-0.5 w-full overflow-hidden rounded-full bg-[rgba(6,6,8,0.6)]">
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
  onOpenPlaceRoom,
}: {
  slot: ExpansionSlotViewModel;
  onOpenPlaceRoom: (slot: ExpansionSlotViewModel) => void;
}) {
  const isAvailable = slot.kind === "available";

  if (!isAvailable) {
    return (
      <div className="glass-card-inset flex min-w-0 items-center gap-2 px-3 py-2 opacity-60">
        <span className="badge badge-slate">Locked</span>
        <span className="min-w-0 flex-1 truncate text-sm text-silver/70">{slot.label}</span>
      </div>
    );
  }

  return (
    <button
      type="button"
      data-testid="expansion-slot-available"
      data-slot-id={slot.slotId}
      className="glass-card-inset flex min-w-0 cursor-pointer items-center gap-2 px-3 py-2 text-left opacity-90 transition-opacity hover:opacity-100"
      onClick={() => onOpenPlaceRoom(slot)}
    >
      <span className="badge badge-gold">Open</span>
      <span className="min-w-0 flex-1 truncate text-sm text-silver-bright">{slot.label}</span>
      <span className="shrink-0 text-xs uppercase tracking-[0.15em] text-gold/70">build →</span>
    </button>
  );
}

interface BodegaFloorProps {
  rooms: readonly RoomViewModel[];
  expansionSlots: readonly ExpansionSlotViewModel[];
  selectedRoomId: string | null;
  onSelectRoom: (roomId: string) => void;
  onOpenPlaceRoom: (slot: ExpansionSlotViewModel) => void;
}

export function BodegaFloor({
  rooms,
  expansionSlots,
  selectedRoomId,
  onSelectRoom,
  onOpenPlaceRoom,
}: BodegaFloorProps) {
  return (
    <div className="space-y-3">
      {rooms.length > 0 ? (
        <div className="space-y-1.5">
          {rooms.map((room) => (
            <RoomCard
              key={room.id}
              room={room}
              isSelected={selectedRoomId === room.id}
              onSelect={() => onSelectRoom(room.id)}
            />
          ))}
        </div>
      ) : (
        <div className="glass-card-inset p-3 text-sm text-silver/50">
          No rooms are placed on this floor yet.
        </div>
      )}

      {expansionSlots.length > 0 && (
        <div className="space-y-1.5">
          <div className="pt-1 text-xs font-medium uppercase tracking-[0.18em] text-gold/55">
            Available slots
          </div>
          {expansionSlots.map((slot) => (
            <ExpansionSlotCard key={slot.id} slot={slot} onOpenPlaceRoom={onOpenPlaceRoom} />
          ))}
        </div>
      )}
    </div>
  );
}

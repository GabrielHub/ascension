import type { GameCallbacks, RoomViewModel, UpgradeViewModel } from "./view-models";
import { formatTag } from "./view-models";

interface RoomDetailPanelProps {
  room: RoomViewModel | null;
  buildingUpgrades: readonly UpgradeViewModel[];
  roomUpgrades: readonly UpgradeViewModel[];
  callbacks: GameCallbacks;
}

function UpgradeCard({
  upgrade,
  onPurchase,
}: {
  upgrade: UpgradeViewModel;
  onPurchase: () => void;
}) {
  return (
    <div className={`glass-card-inset p-3 ${upgrade.isApplied ? "opacity-50" : ""}`}>
      <div className="flex items-start justify-between gap-2">
        <h4 className="text-xs font-medium text-silver-bright">{upgrade.name}</h4>
        {upgrade.isApplied && <span className="badge badge-gold">Applied</span>}
      </div>
      <p className="mt-1 text-xs leading-relaxed text-silver/60">{upgrade.description}</p>

      {upgrade.requirements.length > 0 && (
        <div className="mt-2">
          <span className="text-xs font-medium uppercase tracking-[0.12em] text-gold/70">
            Requires
          </span>
          <div className="mt-0.5 flex flex-wrap gap-1">
            {upgrade.requirements.map((req) => (
              <span
                key={req.type + req.label}
                className="rounded bg-[rgba(6,6,8,0.5)] px-1.5 py-0.5 text-xs text-silver/60"
              >
                {req.label}
              </span>
            ))}
          </div>
        </div>
      )}

      {upgrade.effects.length > 0 && (
        <div className="mt-2">
          <span className="text-xs font-medium uppercase tracking-[0.12em] text-gold/70">
            Effects
          </span>
          <div className="mt-0.5 flex flex-wrap gap-1">
            {upgrade.effects.map((eff) => (
              <span
                key={eff.type + eff.label}
                className="rounded bg-[rgba(200,168,76,0.06)] px-1.5 py-0.5 text-xs text-gold"
              >
                {eff.label}
              </span>
            ))}
          </div>
        </div>
      )}

      {!upgrade.isApplied && (
        <button
          type="button"
          disabled={!upgrade.isAffordable}
          className="btn-primary mt-3 w-full text-xs"
          onClick={onPurchase}
        >
          {upgrade.isAffordable ? "Purchase" : "Not affordable"}
        </button>
      )}
    </div>
  );
}

export function RoomDetailPanel({
  room,
  buildingUpgrades,
  roomUpgrades,
  callbacks,
}: RoomDetailPanelProps) {
  if (!room) {
    return (
      <div className="empty-state py-12">
        <div className="empty-state-icon">&#9633;</div>
        <p className="text-xs text-gold/70">No room selected</p>
        <p className="mt-1 text-xs text-silver/60">Click a room in the world view</p>
      </div>
    );
  }

  const occupancyPct = room.capacity > 0 ? (room.occupancy / room.capacity) * 100 : 0;

  return (
    <div className="animate-enter space-y-4">
      <div>
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-[family-name:var(--font-display)] text-lg font-light tracking-wide text-silver-bright">
            {room.name}
          </h3>
          <div className="flex items-center gap-1.5">
            {room.isOperational ? (
              <span className="badge badge-gold">Operational</span>
            ) : room.isActive ? (
              <span className="badge badge-slate">Understaffed</span>
            ) : (
              <span className="badge badge-slate">Inactive</span>
            )}
          </div>
        </div>
        <p className="mt-1 text-xs leading-relaxed text-silver/60">{room.description}</p>
      </div>

      {/* Room activation toggle */}
      <button
        type="button"
        className={room.isActive ? "btn-ghost w-full text-xs" : "btn-primary w-full text-xs"}
        onClick={() => callbacks.setRoomActive(room.id, !room.isActive)}
      >
        {room.isActive ? "Deactivate room" : "Activate room"}
      </button>

      <div className="grid grid-cols-3 gap-2">
        <div className="glass-card-inset p-2 text-center">
          <div className="text-xs uppercase tracking-wider text-gold/70">Tier</div>
          <div className="mt-0.5 text-sm font-medium text-silver-bright">{room.tier}</div>
        </div>
        <div className="glass-card-inset p-2 text-center">
          <div className="text-xs uppercase tracking-wider text-gold/70">Staff</div>
          <div className="mt-0.5 text-sm font-medium tabular-nums text-silver-bright">
            {room.occupancy}/{room.capacity}
          </div>
        </div>
        <div className="glass-card-inset p-2 text-center">
          <div className="text-xs uppercase tracking-wider text-gold/70">Load</div>
          <div className="mt-0.5 text-sm font-medium text-silver-bright">
            {Math.round(occupancyPct)}%
          </div>
        </div>
      </div>

      <div className="h-1.5 w-full overflow-hidden rounded-full bg-[rgba(6,6,8,0.6)]">
        <div className="progress-bar-fill" style={{ width: `${occupancyPct}%` }} />
      </div>

      {room.requiredStaffTag && (
        <div className="text-xs text-gold/70">
          Requires <span className="text-gold/80">{formatTag(room.requiredStaffTag)}</span> staff
        </div>
      )}

      <div className="flex flex-wrap gap-1">
        {room.tags.map((tag) => (
          <span key={tag} className="badge badge-slate">
            {tag.split(":").pop()}
          </span>
        ))}
      </div>

      {buildingUpgrades.length > 0 && (
        <div>
          <h4 className="mb-2 text-xs font-medium uppercase tracking-[0.15em] text-gold/80">
            Building Upgrades
          </h4>
          <div className="space-y-2">
            {buildingUpgrades.map((u) => (
              <UpgradeCard
                key={u.id}
                upgrade={u}
                onPurchase={() => callbacks.purchaseBuildingUpgrade(u.id)}
              />
            ))}
          </div>
        </div>
      )}

      {roomUpgrades.length > 0 && (
        <div>
          <h4 className="mb-2 text-xs font-medium uppercase tracking-[0.15em] text-gold/80">
            Room Upgrades
          </h4>
          <div className="space-y-2">
            {roomUpgrades.map((u) => (
              <UpgradeCard
                key={u.id}
                upgrade={u}
                onPurchase={() => callbacks.purchaseRoomUpgrade(room.id, u.id)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

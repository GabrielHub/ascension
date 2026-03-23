import type {
  GameCallbacks,
  RoomCultureViewModel,
  RoomViewModel,
  UpgradeViewModel,
} from "./view-models";
import { formatTag } from "./view-models";

interface RoomDetailPanelProps {
  room: RoomViewModel | null;
  buildingUpgrades: readonly UpgradeViewModel[];
  roomUpgrades: readonly UpgradeViewModel[];
  callbacks: GameCallbacks;
  roomCulture?: RoomCultureViewModel | null;
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
  roomCulture,
}: RoomDetailPanelProps) {
  if (!room) return null;

  const occupancyPct = room.capacity > 0 ? (room.occupancy / room.capacity) * 100 : 0;
  const hasUpgrades = buildingUpgrades.length > 0 || roomUpgrades.length > 0;

  return (
    <div className="animate-enter">
      {/* Header row: name + badge + description | activate button */}
      <div className="flex items-start gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            <h3 className="font-[family-name:var(--font-display)] text-lg font-light tracking-wide text-silver-bright">
              {room.name}
            </h3>
            {room.isOperational ? (
              <span className="badge badge-gold">Operational</span>
            ) : room.isActive ? (
              <span className="badge badge-slate">Understaffed</span>
            ) : (
              <span className="badge badge-slate">Inactive</span>
            )}
          </div>
          <p className="mt-1 text-xs leading-relaxed text-silver/60">{room.description}</p>
        </div>
        <button
          type="button"
          className={`shrink-0 ${room.isActive ? "btn-ghost text-xs" : "btn-primary text-xs"}`}
          onClick={() => callbacks.setRoomActive(room.id, !room.isActive)}
        >
          {room.isActive ? "Deactivate room" : "Activate room"}
        </button>
      </div>

      {/* Body: stats column + upgrades columns */}
      <div className="mt-4 flex gap-6">
        {/* Stats */}
        <div className={`space-y-3 ${hasUpgrades ? "w-56 shrink-0" : "w-full max-w-xs"}`}>
          <div className="grid grid-cols-3 gap-2">
            <div className="glass-card-inset p-2 text-center">
              <div className="text-[0.625rem] uppercase tracking-wider text-gold/70">Tier</div>
              <div className="mt-0.5 text-sm font-medium text-silver-bright">{room.tier}</div>
            </div>
            <div className="glass-card-inset p-2 text-center">
              <div className="text-[0.625rem] uppercase tracking-wider text-gold/70">Staff</div>
              <div className="mt-0.5 text-sm font-medium tabular-nums text-silver-bright">
                {room.occupancy}/{room.capacity}
              </div>
            </div>
            <div className="glass-card-inset p-2 text-center">
              <div className="text-[0.625rem] uppercase tracking-wider text-gold/70">Load</div>
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
              Requires <span className="text-gold/80">{formatTag(room.requiredStaffTag)}</span>{" "}
              staff
            </div>
          )}

          <div className="flex flex-wrap gap-1">
            {room.tags.map((tag) => (
              <span key={tag} className="badge badge-slate">
                {tag.split(":").pop()}
              </span>
            ))}
          </div>

          {roomCulture && (
            <div className="space-y-1.5 border-t border-[rgba(200,168,76,0.06)] pt-3">
              <h4 className="text-[0.6875rem] font-medium uppercase tracking-[0.12em] text-gold/70">
                Room Culture
              </h4>
              <div className="glass-card-inset space-y-2 p-3">
                <div>
                  <div className="text-[0.625rem] uppercase tracking-wider text-gold/60">Tone</div>
                  <div className="mt-0.5 text-xs text-silver-bright">{roomCulture.summary}</div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <span className="badge badge-slate">{roomCulture.tone || "neutral"}</span>
                  {roomCulture.signals.map((signal) => (
                    <span key={signal} className="badge badge-slate">
                      {signal}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Upgrades — fill remaining width */}
        {hasUpgrades && (
          <div className="min-w-0 flex-1">
            <div className="grid auto-cols-fr grid-flow-col gap-4">
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
          </div>
        )}
      </div>
    </div>
  );
}

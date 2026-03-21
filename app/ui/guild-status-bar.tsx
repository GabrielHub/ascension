import type { BuildingViewModel, GuildViewModel, TimeViewModel } from "./view-models";

interface GuildStatusBarProps {
  guild: GuildViewModel;
  time: TimeViewModel;
  building: BuildingViewModel;
}

function ResourcePill({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-medium uppercase tracking-[0.15em] text-gold/80">{label}</span>
      <span className="font-[family-name:var(--font-display)] text-sm font-light text-silver-bright">
        {value}
      </span>
    </div>
  );
}

export function GuildStatusBar({ guild, time, building }: GuildStatusBarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-b border-[rgba(200,168,76,0.06)] px-5 py-3">
      <div className="flex items-center gap-3">
        <h1 className="font-[family-name:var(--font-display)] text-lg font-light tracking-[0.08em] text-gold">
          {building.name}
        </h1>
        <span className="badge badge-gold">Tier {building.tier}</span>
      </div>

      <div className="flex items-center gap-5">
        <ResourcePill label="Cash" value={guild.treasury} />
        <ResourcePill label="Rep" value={guild.reputation} />
        <ResourcePill label="Intel" value={guild.intel} />
        <div className="mx-1 h-4 w-px bg-[rgba(200,168,76,0.1)]" />
        <ResourcePill label="Day" value={time.day} />
        <ResourcePill label="" value={time.formatted} />
      </div>

      <div className="flex items-center gap-2 text-xs text-gold/80">
        <span>
          {building.usedRoomSlots}/{building.totalRoomSlots} rooms
        </span>
        <span className="opacity-40">|</span>
        <span>{building.operatorSlots} op slots</span>
      </div>
    </div>
  );
}

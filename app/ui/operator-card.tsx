import { OperatorPortrait } from "./operator-portrait";

interface OperatorCardProps {
  name?: string;
  roleTag?: string;
  presetId?: string;
  morale?: number;
  loyalty?: number;
}

function StatBar({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div>
      <div className="flex items-center justify-between">
        <span className="text-[0.6875rem] uppercase tracking-wider text-gold/70">{label}</span>
        <span className="text-xs tabular-nums text-silver/60">{value}</span>
      </div>
      <div className="mt-0.5 h-1 w-full overflow-hidden rounded-full bg-[rgba(6,6,8,0.6)]">
        <div
          className="h-full rounded-full bg-gold/40 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function OperatorCard({
  name = "Unknown Operator",
  roleTag = "role:bruiser",
  presetId = "male-swept",
  morale = 50,
  loyalty = 50,
}: OperatorCardProps) {
  return (
    <div className="glass-card p-4">
      <div className="flex items-start gap-4">
        <OperatorPortrait name={name} roleTag={roleTag} presetId={presetId} size="card" />
        <div className="min-w-0 flex-1">
          <h4 className="truncate text-sm font-medium text-silver-bright">{name}</h4>
          <span className="badge badge-gold mt-1">{roleTag.replace("role:", "")}</span>
          <div className="mt-3 space-y-2">
            <StatBar label="Morale" value={morale} max={100} />
            <StatBar label="Loyalty" value={loyalty} max={100} />
          </div>
        </div>
      </div>
    </div>
  );
}

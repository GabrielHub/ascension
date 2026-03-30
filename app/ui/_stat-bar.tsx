import { Tooltip } from "./_tooltip";

interface StatBarProps {
  label: string;
  value: number;
  max: number;
  /** Optional tooltip explaining what this stat does. */
  tip?: string;
}

export function StatBar({ label, value, max, tip }: StatBarProps) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div>
      <div className="flex items-center justify-between">
        {tip ? (
          <Tooltip content={tip} side="top">
            <span className="text-sm uppercase tracking-wider text-gold/70">{label}</span>
          </Tooltip>
        ) : (
          <span className="text-sm uppercase tracking-wider text-gold/70">{label}</span>
        )}
        <span className="text-sm tabular-nums text-silver/50">{value}</span>
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

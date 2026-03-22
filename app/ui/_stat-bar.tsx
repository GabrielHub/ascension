interface StatBarProps {
  label: string;
  value: number;
  max: number;
}

export function StatBar({ label, value, max }: StatBarProps) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div>
      <div className="flex items-center justify-between">
        <span className="text-[0.6875rem] uppercase tracking-wider text-gold/70">{label}</span>
        <span className="text-[0.6875rem] tabular-nums text-silver/50">{value}</span>
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

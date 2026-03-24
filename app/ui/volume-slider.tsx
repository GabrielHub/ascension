export interface VolumeSliderProps {
  label: string;
  value: number;
  onChange: (db: number) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
}

export function VolumeSlider({
  label,
  value,
  onChange,
  min = -40,
  max = 0,
  disabled,
}: VolumeSliderProps) {
  const pct = ((value - min) / (max - min)) * 100;

  return (
    <div className="flex items-center gap-3">
      <span className="w-20 text-[0.625rem] font-medium uppercase tracking-[0.2em] text-gold/55">
        {label}
      </span>
      <div className="relative flex-1">
        <div className="pointer-events-none absolute top-1/2 right-0 left-0 h-[2px] -translate-y-1/2 rounded-full bg-[rgba(200,168,76,0.08)]" />
        <div
          className="pointer-events-none absolute top-1/2 left-0 h-[2px] -translate-y-1/2 rounded-full bg-gold/35"
          style={{ width: `${pct}%` }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={1}
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(Number(event.target.value))}
          className="relative z-10 w-full cursor-pointer appearance-none bg-transparent
            [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3
            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full
            [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-gold/40
            [&::-webkit-slider-thumb]:bg-gold/80 [&::-webkit-slider-thumb]:shadow-[0_0_6px_rgba(200,168,76,0.3)]
            [&::-webkit-slider-thumb]:transition-shadow [&::-webkit-slider-thumb]:duration-200
            [&::-webkit-slider-thumb]:hover:shadow-[0_0_12px_rgba(200,168,76,0.5)]
            disabled:cursor-not-allowed disabled:opacity-30"
        />
      </div>
      <span className="w-14 text-right font-[family-name:var(--font-display)] text-[0.6875rem] tabular-nums text-silver/55">
        {value} dB
      </span>
    </div>
  );
}

import type { SvgCompositionRecipe } from "./types";

interface OperatorDetailSvgProps {
  recipe: SvgCompositionRecipe;
  size?: "sm" | "md" | "lg";
  label?: string;
}

const SIZE_MAP = {
  sm: "h-24 w-24",
  md: "h-40 w-40",
  lg: "h-56 w-56",
} as const;

export function OperatorDetailSvg({
  recipe,
  size = "md",
  label = "Operator portrait",
}: OperatorDetailSvgProps) {
  return (
    <div className={`${SIZE_MAP[size]} relative mx-auto`}>
      <svg
        viewBox={recipe.viewBox}
        className="h-full w-full rounded-xl border border-[rgba(200,168,76,0.1)] bg-[rgba(6,6,8,0.6)]"
        role="img"
        aria-label={label}
      >
        <defs>
          <radialGradient id="portrait-glow" cx="50%" cy="40%" r="60%">
            <stop offset="0%" stopColor="rgba(200,168,76,0.08)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0)" />
          </radialGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#portrait-glow)" />
        {recipe.layers.map((layer) => (
          <g key={layer.partId} dangerouslySetInnerHTML={{ __html: layer.markup }} />
        ))}
      </svg>
    </div>
  );
}

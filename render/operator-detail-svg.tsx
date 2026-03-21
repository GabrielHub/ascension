import type { SvgCompositionRecipe } from "./types";

interface OperatorDetailSvgProps {
  recipe: SvgCompositionRecipe;
}

export function OperatorDetailSvg({ recipe }: OperatorDetailSvgProps) {
  return (
    <svg
      viewBox={recipe.viewBox}
      className="h-56 w-full rounded-[1.5rem] border border-white/10 bg-stone-950/80"
      role="img"
      aria-label="Live SVG detail scaffold"
    >
      {recipe.layers.map((layer) => (
        <g key={layer.partId} dangerouslySetInnerHTML={{ __html: layer.markup }} />
      ))}
    </svg>
  );
}

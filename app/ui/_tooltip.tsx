import type { ReactNode } from "react";

interface TooltipProps {
  /** Text shown in the tooltip bubble. Empty string = no tooltip rendered. */
  content: string;
  children: ReactNode;
  /** Preferred placement relative to the trigger element. */
  side?: "top" | "bottom";
}

/**
 * Lightweight hover tooltip that matches the glass/gold design language.
 * Renders an inline-flex wrapper so it slots into any flex or inline context.
 */
export function Tooltip({ content, children, side = "bottom" }: TooltipProps) {
  if (!content) return <>{children}</>;

  const bubblePositionClass =
    side === "top"
      ? "bottom-full left-1/2 mb-[6px] -translate-x-1/2"
      : "top-full left-1/2 mt-[6px] -translate-x-1/2";

  return (
    <span className="group relative inline-flex items-center">
      {children}
      <span
        className={`pointer-events-none absolute z-50 w-max max-w-[220px] rounded-md border border-[rgba(200,168,76,0.15)] bg-[rgba(15,14,18,0.95)] px-2.5 py-1.5 text-[0.6875rem] leading-[1.4] font-normal whitespace-normal text-silver/85 opacity-0 shadow-[0_4px_20px_rgba(0,0,0,0.6)] backdrop-blur-[12px] transition-opacity delay-300 duration-150 group-hover:opacity-100 ${bubblePositionClass}`}
        role="tooltip"
      >
        {content}
      </span>
    </span>
  );
}

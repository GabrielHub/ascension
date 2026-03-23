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
 * All visual styling lives in app.css under `.tooltip-*` classes.
 */
export function Tooltip({ content, children, side = "bottom" }: TooltipProps) {
  if (!content) return <>{children}</>;

  return (
    <span className="tooltip-anchor">
      {children}
      <span
        className={`tooltip-bubble ${side === "top" ? "tooltip-top" : "tooltip-bottom"}`}
        role="tooltip"
      >
        {content}
      </span>
    </span>
  );
}

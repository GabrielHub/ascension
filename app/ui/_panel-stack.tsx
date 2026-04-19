import { useCallback, useEffect, type ReactNode } from "react";

import { glassPanelClass } from "./styles";

export interface PanelStackEntry {
  id: string;
  /** Tailwind width class override; defaults to a mid-size intrinsic panel. */
  widthClass?: string;
  /** Fully-rendered panel body. Frame is supplied via PanelFrame, not by the stack. */
  content: ReactNode;
}

export interface PanelStackProps {
  entries: readonly PanelStackEntry[];
  /** Called when Esc is pressed or a panel's close control fires close-at-index. */
  onClose: (index: number) => void;
  testId?: string;
  /** Optional className for the outer stack container. */
  className?: string;
}

/**
 * Cascading right-anchored panel stack. Panels render left-to-right inside the
 * stack. Closing an inner panel truncates everything to its right. Esc closes
 * the rightmost panel. Panels never overlap; on overflow the stack scrolls
 * horizontally. Each entry's width is intrinsic (sized to content) unless an
 * explicit widthClass is supplied.
 */
export function PanelStack({ entries, onClose, testId, className }: PanelStackProps) {
  const lastIndex = entries.length - 1;

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (lastIndex < 0) return;
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (target?.isContentEditable) return;
      event.preventDefault();
      onClose(lastIndex);
    },
    [lastIndex, onClose],
  );

  useEffect(() => {
    if (lastIndex < 0) return;
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown, lastIndex]);

  if (entries.length === 0) {
    return null;
  }

  return (
    <div
      data-testid={testId}
      className={`pointer-events-auto flex min-h-0 flex-row items-stretch justify-end gap-2 overflow-x-auto overflow-y-hidden ${className ?? ""}`}
    >
      {entries.map((entry, index) => (
        <div
          key={entry.id}
          data-panel-index={index}
          data-panel-id={entry.id}
          className={`flex min-h-0 shrink-0 flex-col ${entry.widthClass ?? "w-[24rem]"}`}
        >
          {entry.content}
        </div>
      ))}
    </div>
  );
}

export interface PanelFrameProps {
  title: ReactNode;
  subtitle?: ReactNode;
  /** Small control row rendered between the title and the close button. */
  headerExtra?: ReactNode;
  onClose?: () => void;
  testId?: string;
  children: ReactNode;
  /** Set to true when the panel body should not scroll (form pickers, etc.). */
  scroll?: boolean;
}

/**
 * Standard framing for a panel inside a PanelStack. Provides a compact header
 * with title, optional subtitle, extra control row, and close button, plus a
 * scrollable body. Panels should not define their own glass chrome.
 */
export function PanelFrame({
  title,
  subtitle,
  headerExtra,
  onClose,
  testId,
  children,
  scroll = true,
}: PanelFrameProps) {
  return (
    <div
      data-testid={testId}
      className={`${glassPanelClass} animate-enter flex h-full min-h-0 flex-col overflow-hidden rounded-xl`}
    >
      <div className="flex items-start justify-between gap-2 border-b border-[rgba(200,168,76,0.08)] px-4 py-3">
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium text-silver-bright">{title}</div>
          {subtitle && <div className="mt-0.5 text-xs text-silver/55">{subtitle}</div>}
        </div>
        {headerExtra && <div className="flex shrink-0 items-center gap-1.5">{headerExtra}</div>}
        {onClose && (
          <button
            type="button"
            className="btn-ghost shrink-0 px-1.5 py-1 text-sm leading-none text-silver/50 hover:text-gold"
            aria-label="Close panel"
            data-testid={testId ? `${testId}-close` : undefined}
            onClick={onClose}
          >
            &times;
          </button>
        )}
      </div>
      <div className={scroll ? "flex-1 overflow-y-auto px-4 py-3" : "flex-1 px-4 py-3"}>
        {children}
      </div>
    </div>
  );
}

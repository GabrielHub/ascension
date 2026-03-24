import { useEffect, useId, useRef, type ReactNode } from "react";

export interface GameModalProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  onClose?: () => void;
  dismissible?: boolean;
  widthClassName?: string;
  footer?: ReactNode;
}

export function GameModal({
  title,
  subtitle,
  children,
  onClose,
  dismissible = true,
  widthClassName = "max-w-2xl",
  footer,
}: GameModalProps) {
  const titleId = useId();
  const subtitleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    panelRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!dismissible || !onClose) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") {
        return;
      }

      event.preventDefault();
      onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [dismissible, onClose]);

  return (
    <>
      <div
        className="fixed inset-0 z-[70] bg-[rgba(0,0,0,0.72)] backdrop-blur-md"
        onClick={dismissible ? onClose : undefined}
        aria-hidden="true"
      />
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-5 pointer-events-none sm:p-8">
        <div
          ref={panelRef}
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={subtitle ? subtitleId : undefined}
          className={`glass-panel pointer-events-auto flex max-h-[min(88dvh,820px)] w-full flex-col overflow-hidden rounded-2xl border-[rgba(200,168,76,0.12)] shadow-[0_28px_96px_rgba(0,0,0,0.68)] outline-none ${widthClassName}`}
        >
          <div className="flex items-start justify-between gap-4 border-b border-[rgba(200,168,76,0.08)] px-5 py-4 sm:px-6">
            <div className="min-w-0">
              <h2
                id={titleId}
                className="font-[family-name:var(--font-display)] text-lg font-light tracking-[0.14em] text-gold"
              >
                {title}
              </h2>
              {subtitle && (
                <p id={subtitleId} className="mt-1 text-sm leading-relaxed text-silver/60">
                  {subtitle}
                </p>
              )}
            </div>
            {dismissible && onClose && (
              <button
                type="button"
                className="btn-ghost shrink-0 px-2 py-1 text-xs"
                onClick={onClose}
              >
                close
              </button>
            )}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">{children}</div>

          {footer && (
            <div className="border-t border-[rgba(200,168,76,0.08)] px-5 py-4 sm:px-6">
              {footer}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

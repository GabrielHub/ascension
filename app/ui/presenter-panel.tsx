import { templateRegistry } from "content/templates";

import { glassPanelSubtleClass } from "./styles";

export interface PresenterBindingProps {
  presenterId?: string;
  presenterExpression?: string;
}

export interface ResolvedPresenterView {
  id: string;
  name: string;
  roleDescription: string;
  expression: string;
  portraitSrc: string;
}

type PresenterPanelVariant = "modal" | "compact";

function resolvePresenterView({
  presenterId,
  presenterExpression,
}: PresenterBindingProps): ResolvedPresenterView | null {
  if (!presenterId) {
    return null;
  }

  const presenter = templateRegistry.presenterById.get(presenterId);
  if (!presenter) {
    return null;
  }

  const expression =
    presenterExpression && presenter.portraitByExpression[presenterExpression]
      ? presenterExpression
      : presenter.defaultExpression;
  const portraitSrc =
    presenter.portraitByExpression[expression] ??
    presenter.portraitByExpression[presenter.defaultExpression];

  if (!portraitSrc) {
    return null;
  }

  return {
    id: presenter.id,
    name: presenter.name,
    roleDescription: presenter.roleDescription,
    expression,
    portraitSrc,
  };
}

function PortraitFrame({
  presenter,
  className,
  imageClassName,
}: {
  presenter: ResolvedPresenterView;
  className: string;
  imageClassName: string;
}) {
  const portraitMask =
    "radial-gradient(ellipse 82% 88% at 50% 36%, rgba(0,0,0,1) 54%, rgba(0,0,0,0.98) 66%, rgba(0,0,0,0.78) 76%, rgba(0,0,0,0.28) 86%, transparent 94%)";

  return (
    <div
      className={`relative isolate overflow-hidden rounded-[1.25rem] border border-[rgba(200,168,76,0.12)] bg-[radial-gradient(circle_at_50%_18%,rgba(255,247,232,0.18),transparent_30%),radial-gradient(circle_at_24%_18%,rgba(208,188,129,0.18),transparent_34%),linear-gradient(180deg,rgba(42,38,30,0.9)_0%,rgba(11,11,13,0.98)_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_18px_48px_rgba(0,0,0,0.34)] ${className}`}
    >
      <div className="pointer-events-none absolute inset-[7%] rounded-[1.1rem] bg-[radial-gradient(ellipse_at_50%_18%,rgba(255,250,242,0.98)_0%,rgba(245,236,220,0.94)_34%,rgba(193,171,126,0.22)_66%,transparent_86%)] opacity-95" />
      <div className="pointer-events-none absolute inset-x-4 top-3 h-px bg-gradient-to-r from-transparent via-[rgba(240,228,188,0.28)] to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[rgba(0,0,0,0.45)] to-transparent" />
      <img
        src={presenter.portraitSrc}
        alt={`${presenter.name} portrait`}
        className={`pointer-events-none relative z-[1] h-full w-full object-cover object-top drop-shadow-[0_18px_36px_rgba(0,0,0,0.2)] ${imageClassName}`}
        loading="lazy"
        style={{
          maskImage: portraitMask,
          WebkitMaskImage: portraitMask,
        }}
      />
    </div>
  );
}

export function PresenterPanel({
  presenterId,
  presenterExpression,
  variant = "modal",
}: PresenterBindingProps & {
  variant?: PresenterPanelVariant;
}) {
  const presenter = resolvePresenterView({ presenterId, presenterExpression });
  if (!presenter) {
    return null;
  }

  if (variant === "compact") {
    return (
      <div className={`flex items-center gap-3 rounded-2xl px-3 py-3 ${glassPanelSubtleClass}`}>
        <PortraitFrame
          presenter={presenter}
          className="h-24 w-20 shrink-0"
          imageClassName="scale-[1.06]"
        />
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-[0.24em] text-gold-dim">Presenter</p>
          <p className="mt-1 font-[family-name:var(--font-display)] text-sm tracking-[0.1em] text-gold">
            {presenter.name}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-silver/70">{presenter.roleDescription}</p>
        </div>
      </div>
    );
  }

  return (
    <aside className="w-full max-w-[16rem] shrink-0">
      <div className="space-y-3">
        <PortraitFrame
          presenter={presenter}
          className="aspect-[4/5] w-full"
          imageClassName="scale-[1.04]"
        />
        <div className={`${glassPanelSubtleClass} rounded-2xl px-4 py-3`}>
          <p className="text-xs font-medium uppercase tracking-[0.24em] text-gold-dim">Presenter</p>
          <h3 className="mt-1 font-[family-name:var(--font-display)] text-base tracking-[0.12em] text-gold">
            {presenter.name}
          </h3>
          <p className="mt-1 text-sm leading-relaxed text-silver/70">{presenter.roleDescription}</p>
        </div>
      </div>
    </aside>
  );
}

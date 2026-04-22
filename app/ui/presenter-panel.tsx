import { templateRegistry } from "content/templates";

export interface PresenterBindingProps {
  presenterId?: string;
  presenterExpression?: string;
}

export interface ResolvedPresenterView {
  id: string;
  name: string;
  roleTitle: string;
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
    roleTitle: presenter.roleTitle,
    roleDescription: presenter.roleDescription,
    expression,
    portraitSrc,
  };
}

function ModalPresenter({ presenter }: { presenter: ResolvedPresenterView }) {
  return (
    <aside className="flex w-full shrink-0 flex-col sm:max-w-[15rem]">
      <div className="sm:hidden">
        <CompactPresenter presenter={presenter} />
      </div>
      <div className="hidden flex-1 sm:block">
        <div className="presenter-velvet__pedestal">
          <div className="presenter-velvet__aura" />
          <span className="presenter-velvet__bokeh presenter-velvet__bokeh--1" />
          <span className="presenter-velvet__bokeh presenter-velvet__bokeh--2" />
          <span className="presenter-velvet__bokeh presenter-velvet__bokeh--3" />
          <span className="presenter-velvet__bokeh presenter-velvet__bokeh--4" />
          <div className="presenter-velvet__corner presenter-velvet__corner--tr" />
          <div className="presenter-velvet__corner presenter-velvet__corner--bl" />
          <img
            src={presenter.portraitSrc}
            alt={`${presenter.name} portrait`}
            className="presenter-velvet__character"
          />
          <div className="presenter-velvet__caption">
            <h3
              className="presenter-velvet__caption-role"
              title={presenter.roleDescription}
              tabIndex={0}
              aria-label={`${presenter.roleTitle}. ${presenter.roleDescription}`}
            >
              {presenter.roleTitle}
            </h3>
            <span className="presenter-velvet__caption-diamond" aria-hidden="true" />
            <p className="presenter-velvet__caption-name">{presenter.name}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}

function CompactPresenter({ presenter }: { presenter: ResolvedPresenterView }) {
  const stageBackground = `url("${presenter.portraitSrc}"), radial-gradient(circle at 50% 55%, rgba(200, 168, 76, 0.6) 0%, rgba(200, 168, 76, 0.28) 48%, rgba(200, 168, 76, 0.08) 78%, transparent 100%)`;

  return (
    <div className="presenter-velvet-compact">
      <div
        className="presenter-velvet-compact__stage"
        style={{ backgroundImage: stageBackground }}
        role="img"
        aria-label={`${presenter.name} portrait`}
      />
      <div className="min-w-0">
        <p
          className="presenter-velvet-compact__role"
          title={presenter.roleDescription}
          tabIndex={0}
          aria-label={`${presenter.roleTitle}. ${presenter.roleDescription}`}
        >
          {presenter.roleTitle}
        </p>
        <p className="presenter-velvet-compact__name">{presenter.name}</p>
      </div>
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

  return variant === "compact" ? (
    <CompactPresenter presenter={presenter} />
  ) : (
    <ModalPresenter presenter={presenter} />
  );
}

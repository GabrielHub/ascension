import { Link, useLocation } from "react-router";

import { parseRuntimeRouteRequest, useRuntimeSession } from "app/features/runtime";
import { OperatorDetailSvg, WorldCanvasSurface } from "render";

function RuntimeStatePanel({ title, body }: { title: string; body: string }) {
  return (
    <main className="min-h-dvh px-6 py-8 lg:px-10">
      <div className="mx-auto max-w-4xl rounded-[2rem] border border-white/10 bg-black/20 p-6 shadow-[0_32px_100px_rgba(0,0,0,0.28)] backdrop-blur lg:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.45em] text-amber-200/75">
          Main Game Shell
        </p>
        <h1 className="mt-3 font-[family-name:var(--font-display)] text-4xl text-stone-50">
          {title}
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-7 text-stone-300">{body}</p>
        <Link
          to="/"
          className="mt-6 inline-flex rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-stone-200 hover:border-white/30 hover:text-white"
        >
          Return to start screen
        </Link>
      </div>
    </main>
  );
}

export function GameShell() {
  const location = useLocation();
  const request = parseRuntimeRouteRequest(location.search);
  const { status, session, errorMessage } = useRuntimeSession(request);

  if (status === "error") {
    return (
      <RuntimeStatePanel
        title="Runtime session unavailable"
        body={errorMessage ?? "The requested runtime session could not be opened."}
      />
    );
  }

  if (status === "loading" || !session) {
    return (
      <RuntimeStatePanel
        title="Opening runtime surface"
        body="The shell is loading the selected local save slot and assembling the preproduction runtime."
      />
    );
  }

  const shellSections = [
    {
      title: "Template registry",
      detail: `${session.registry.resources.length} resources, ${session.registry.rooms.length} rooms, ${session.registry.upgrades.length} upgrades loaded through one validated aggregate registry.`,
    },
    {
      title: "ECS ownership",
      detail: `Singletons for guild, time, and building state are live. ${session.simulation.roomEntities.length} room entities are mounted into the bootstrap world.`,
    },
    {
      title: "Render boundary",
      detail: `${session.svgCatalog.length} SVG parts validate separately from the canvas world view, keeping gameplay rules out of presentation code.`,
    },
  ] as const;

  const runtimeLabel =
    session.mode === "preview"
      ? "Preview runtime"
      : `Slot ${session.slotId?.split("/")[1]} ${session.mode === "new" ? "created" : "loaded"}`;

  return (
    <main className="min-h-dvh px-6 py-8 lg:px-10">
      <div className="mx-auto max-w-6xl rounded-[2rem] border border-white/10 bg-black/20 p-6 shadow-[0_32px_100px_rgba(0,0,0,0.28)] backdrop-blur lg:p-8">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.45em] text-amber-200/75">
              Main Game Shell
            </p>
            <h1 className="mt-3 font-[family-name:var(--font-display)] text-5xl text-stone-50">
              Placeholder runtime surface
            </h1>
            <p className="mt-3 text-sm uppercase tracking-[0.28em] text-stone-400">
              {runtimeLabel}
            </p>
          </div>

          <Link
            to="/"
            className="rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-stone-200 hover:border-white/30 hover:text-white"
          >
            Return to start screen
          </Link>
        </header>

        <section className="mt-8 grid gap-6 xl:grid-cols-[1.6fr_0.8fr]">
          <WorldCanvasSurface snapshot={session.worldRenderSnapshot} />

          <aside className="rounded-[1.75rem] border border-white/10 bg-black/25 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-amber-200/70">
              Live SVG detail scaffold
            </p>
            <h2 className="mt-3 text-2xl font-semibold text-stone-100">Focused operator preview</h2>
            <p className="mt-2 text-sm leading-6 text-stone-300">
              Canvas handles world-scale placement. Focused inspection keeps the live-SVG path open
              for later operator detail views.
            </p>
            <div className="mt-5">
              <OperatorDetailSvg recipe={session.operatorDetailRecipe} />
            </div>
          </aside>
        </section>

        <section className="mt-6 rounded-[1.75rem] border border-dashed border-amber-200/25 bg-amber-100/5 px-6 py-8">
          <p className="text-sm uppercase tracking-[0.35em] text-stone-400">Track A status</p>
          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            {shellSections.map((section) => (
              <article
                key={section.title}
                className="rounded-[1.25rem] border border-white/10 bg-black/25 p-5"
              >
                <h2 className="text-lg font-semibold text-stone-100">{section.title}</h2>
                <p className="mt-2 text-sm leading-6 text-stone-300">{section.detail}</p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

import { useMemo } from "react";
import { Link } from "react-router";

import {
  buildIncidentFramingPreviewPayload,
  buildOperatorIdentityPreviewPayload,
  buildSystemPrompt,
  buildUserPrompt,
  PROMPT_CANON_SOURCE_PATHS,
  PROMPT_GUIDANCE_REFERENCES,
  type AiGenerationSurface,
  type AiRequestRecord,
  type IncidentFramingOutput,
  type OperatorIdentityOutput,
} from "app/features/ai";
import { useRuntimeSession } from "app/features/runtime";
import { useGameSettings } from "app/features/settings";
import { getActorPortraitUrl } from "render";

import { getIncidentCategoryMeta, getSpecialtyMeta } from "./_glossary";
import { IncidentContent } from "./interruption-host";
import { OperatorPortrait } from "./operator-portrait";
import { VisitorRow } from "./roster-panel";
import { glassPanelClass, glassPanelSubtleClass } from "./styles";
import { buildHqViewFromPhase1, type HqViewModel } from "./view-models";

function formatGuidanceReferenceLabel(reference: string): string {
  if (reference.includes("cloud.google.com") && reference.includes("gemini-3")) {
    return "Gemini 3 prompting guide (Google Vertex AI)";
  }
  if (reference.includes("developers.openai.com")) {
    return "OpenAI prompt guidance";
  }
  return reference;
}

function formatElapsedMs(startedAt: number | null, finishedAt: number | null): string | null {
  if (!startedAt) {
    return null;
  }

  const elapsedMs = Math.max(0, (finishedAt ?? Date.now()) - startedAt);
  if (elapsedMs < 1000) {
    return `${elapsedMs}ms`;
  }

  return `${(elapsedMs / 1000).toFixed(elapsedMs >= 10_000 ? 0 : 1)}s`;
}

function formatRequestPhase(record: AiRequestRecord | undefined): string | null {
  const phase = record?.progress?.phase;
  switch (phase) {
    case "queued":
      return "queued";
    case "requesting":
      return "requesting runtime";
    case "streaming":
      return "streaming response";
    case "validating":
      return "validating output";
    case "repairing":
      return "repairing invalid JSON";
    default:
      return null;
  }
}

function IncidentFramingPreview({
  output,
  payload,
}: {
  output: IncidentFramingOutput;
  payload: Record<string, unknown>;
}) {
  const category = typeof payload.category === "string" ? payload.category : "";
  const subjectSummary = typeof payload.subjectSummary === "string" ? payload.subjectSummary : "";
  const subtitleParts = [
    category ? getIncidentCategoryMeta(category).label : "",
    subjectSummary,
  ].filter(Boolean);

  return (
    <div
      className={`overflow-hidden rounded-2xl ${glassPanelClass}`}
      style={{ borderColor: "rgba(200,168,76,0.12)" }}
    >
      <div className="border-b border-[rgba(200,168,76,0.08)] px-5 py-4">
        <h3 className="font-[family-name:var(--font-display)] text-lg font-light tracking-[0.14em] text-gold">
          {output.title}
        </h3>
        {subtitleParts.length > 0 && (
          <p className="mt-1 text-sm leading-relaxed text-silver/60">{subtitleParts.join(" — ")}</p>
        )}
      </div>
      <div className="px-5 py-5">
        <IncidentContent briefing={output.briefing} choices={output.choices} />
      </div>
    </div>
  );
}

function OperatorIdentityPreview({
  hqView,
  output,
  subjectId,
}: {
  hqView: HqViewModel | null;
  output: OperatorIdentityOutput;
  subjectId: string;
}) {
  const baseVisitor = hqView?.visitors.find((visitor) => visitor.id === subjectId) ?? null;
  const previewVisitor = baseVisitor
    ? {
        ...baseVisitor,
        specialtyTag: output.specialtyTag,
        presetId: output.appearance.presetId,
        personaSummary: output.personaSummary,
        personaHooks: output.personaHooks,
        identitySource: "generated" as const,
      }
    : null;
  const appearance = output.appearance;
  const tokenUrl = previewVisitor
    ? getActorPortraitUrl(appearance.presetId, previewVisitor.desiredRoleTag)
    : null;
  const visibleGearEntries = Object.entries(appearance.visibleGear ?? {}).filter(
    ([, partId]) => typeof partId === "string" && partId.length > 0,
  );

  return (
    <div className="space-y-3">
      {previewVisitor ? (
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.75fr)]">
          <div className="rounded-xl border border-[rgba(200,168,76,0.06)] bg-[rgba(6,6,8,0.45)] p-4">
            <div className="flex flex-wrap items-start gap-4">
              <div>
                <span className="text-xs uppercase tracking-[0.14em] text-gold/60">Portrait</span>
                <div className="mt-2">
                  <OperatorPortrait
                    name={previewVisitor.name}
                    roleTag={previewVisitor.desiredRoleTag}
                    presetId={appearance.presetId}
                    size="detail"
                  />
                </div>
              </div>
              <div>
                <span className="text-xs uppercase tracking-[0.14em] text-gold/60">HQ Token</span>
                <div className="mt-2 flex h-28 w-20 items-center justify-center rounded-lg border border-[rgba(200,168,76,0.04)] bg-[rgba(6,6,8,0.5)]">
                  {tokenUrl ? (
                    <img
                      src={tokenUrl}
                      alt={`${previewVisitor.name} HQ token`}
                      className="h-24 w-[4.8rem]"
                    />
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-[rgba(200,168,76,0.06)] bg-[rgba(6,6,8,0.45)] p-4">
            <span className="text-xs uppercase tracking-[0.14em] text-gold/60">
              Appearance Contract
            </span>
            <div className="mt-3 space-y-3">
              <div>
                <span className="text-xs uppercase tracking-[0.12em] text-silver/45">Recipe</span>
                <p className="mt-1 text-sm text-silver-bright">{appearance.presetId}</p>
              </div>
              <div>
                <span className="text-xs uppercase tracking-[0.12em] text-silver/45">Role</span>
                <p className="mt-1 text-sm text-silver/75">{previewVisitor.desiredRoleTag}</p>
              </div>
              <div>
                <span className="text-xs uppercase tracking-[0.12em] text-silver/45">
                  Visible Gear
                </span>
                {visibleGearEntries.length > 0 ? (
                  <ul className="mt-1 space-y-1">
                    {visibleGearEntries.map(([slot, partId]) => (
                      <li key={slot} className="text-sm text-silver/75">
                        {slot}: {partId}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-1 text-sm text-silver/45">None selected</p>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {previewVisitor ? (
        <div className="glass-card-inset rounded-xl px-2.5 py-2">
          <VisitorRow visitor={previewVisitor} />
        </div>
      ) : null}
      <div className="space-y-3 rounded-xl border border-[rgba(200,168,76,0.06)] bg-[rgba(6,6,8,0.45)] p-4">
        <div>
          <span className="text-xs uppercase tracking-[0.14em] text-gold/60">Specialty</span>
          <p className="mt-1 text-sm text-silver-bright">
            {getSpecialtyMeta(output.specialtyTag).label}
          </p>
        </div>
        <div>
          <span className="text-xs uppercase tracking-[0.14em] text-gold/60">Persona</span>
          <p className="mt-1 text-sm leading-relaxed text-silver/80">{output.personaSummary}</p>
        </div>
        {output.personaHooks.length > 0 && (
          <div>
            <span className="text-xs uppercase tracking-[0.14em] text-gold/60">Hooks</span>
            <ul className="mt-1 space-y-1">
              {output.personaHooks.map((hook, i) => (
                <li key={i} className="text-sm text-silver/65">
                  {hook}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

function SurfaceCard({
  title,
  surface,
  subjectId,
  payload,
  hqPreview,
  record,
  onGenerate,
  onRegenerate,
}: {
  title: string;
  surface: AiGenerationSurface;
  subjectId: string;
  payload: Record<string, unknown> | null;
  hqPreview: HqViewModel | null;
  record: AiRequestRecord | undefined;
  onGenerate: () => void;
  onRegenerate: () => void;
}) {
  const systemPrompt = useMemo(() => buildSystemPrompt(surface), [surface]);
  const userPrompt = useMemo(
    () => (payload ? buildUserPrompt(surface, payload) : ""),
    [payload, surface],
  );
  const elapsed = formatElapsedMs(record?.startedAt ?? null, record?.finishedAt ?? null);
  const phase = formatRequestPhase(record);
  const progressMessage = record?.progress?.message;
  const partialText = record?.progress?.partialText;
  const isPending = record?.status === "pending";

  return (
    <section
      className="glass-card flex flex-col overflow-hidden xl:row-span-3 xl:grid xl:grid-rows-[subgrid] xl:gap-y-0"
      data-testid={`ai-surface-${surface}`}
    >
      <div className="border-b border-[rgba(200,168,76,0.06)] px-6 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="font-[family-name:var(--font-display)] text-lg font-light tracking-wide text-silver-bright">
              {title}
            </h2>
            <p className="mt-1 text-sm text-silver/55">
              Subject: <span className="text-silver-bright">{subjectId}</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div
              className={`rounded-full px-2 py-1 text-xs uppercase tracking-[0.14em] ${
                record?.status === "succeeded"
                  ? "border border-emerald-500/20 bg-emerald-500/8 text-emerald-300/85"
                  : record?.status === "failed"
                    ? "border border-ember/20 bg-ember/10 text-ember"
                    : record?.status === "pending"
                      ? "border border-gold/20 bg-gold/10 text-gold"
                      : "border border-[rgba(200,168,76,0.08)] bg-[rgba(6,6,8,0.35)] text-silver/55"
              }`}
            >
              {record?.status ?? "idle"}
            </div>
            <button
              type="button"
              className="btn-primary"
              onClick={onGenerate}
              disabled={!payload || isPending}
            >
              generate
            </button>
            <button
              type="button"
              className="btn-ghost text-xs"
              onClick={onRegenerate}
              disabled={!payload || isPending}
            >
              regenerate
            </button>
          </div>
        </div>
        {(phase || elapsed || progressMessage) && (
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-silver/55">
            {phase && (
              <span data-testid={`ai-status-phase-${surface}`}>
                Phase: <span className="text-silver-bright">{phase}</span>
              </span>
            )}
            {record?.progress && (
              <span data-testid={`ai-status-attempt-${surface}`}>
                Attempt: <span className="text-silver-bright">{record.progress.attempt}</span>
              </span>
            )}
            {elapsed && (
              <span data-testid={`ai-status-elapsed-${surface}`}>
                Elapsed: <span className="text-silver-bright">{elapsed}</span>
              </span>
            )}
            {record?.progress && (
              <span data-testid={`ai-status-chars-${surface}`}>
                Chars:{" "}
                <span className="text-silver-bright">{record.progress.receivedCharacters}</span>
              </span>
            )}
          </div>
        )}
        {progressMessage && (
          <p
            className="mt-2 text-xs leading-relaxed text-silver/55"
            data-testid={`ai-status-message-${surface}`}
          >
            {progressMessage}
          </p>
        )}
        {record?.error && <p className="mt-3 text-sm leading-relaxed text-ember">{record.error}</p>}
      </div>

      <div className="flex-1 px-6 py-6">
        {record?.result ? (
          <>
            {surface === "incident-framing" && payload && (
              <IncidentFramingPreview
                output={record.result.output as unknown as IncidentFramingOutput}
                payload={payload}
              />
            )}
            {surface === "operator-identity" && payload && (
              <OperatorIdentityPreview
                hqView={hqPreview}
                output={record.result.output as unknown as OperatorIdentityOutput}
                subjectId={subjectId}
              />
            )}
          </>
        ) : (
          <div className="flex items-center justify-center rounded-2xl border border-dashed border-[rgba(200,168,76,0.1)] bg-[rgba(6,6,8,0.25)] py-16">
            <p className="text-sm text-silver/35">
              {isPending ? (progressMessage ?? "Generating…") : "Generate to see in-game preview"}
            </p>
          </div>
        )}
      </div>

      <div className="space-y-2 border-t border-[rgba(200,168,76,0.06)] px-6 py-4">
        <details className={`rounded-xl p-4 ${glassPanelClass}`}>
          <summary className="cursor-pointer text-xs uppercase tracking-[0.18em] text-gold/70">
            Request Debug
          </summary>
          <pre
            className="mt-3 overflow-x-auto whitespace-pre-wrap text-xs leading-relaxed text-silver/75"
            data-testid={`ai-debug-${surface}`}
            tabIndex={0}
          >
            {record
              ? JSON.stringify(
                  {
                    requestKey: record.requestKey,
                    status: record.status,
                    phase: record.progress?.phase ?? null,
                    attempt: record.progress?.attempt ?? null,
                    elapsed,
                    runtime: record.runtimeKind,
                    model: record.modelId,
                    receivedCharacters: record.progress?.receivedCharacters ?? 0,
                    startedAt: record.startedAt,
                    finishedAt: record.finishedAt,
                    error: record.error,
                  },
                  null,
                  2,
                )
              : "No request recorded yet."}
          </pre>
        </details>

        <details className={`rounded-xl p-4 ${glassPanelClass}`}>
          <summary className="cursor-pointer text-xs uppercase tracking-[0.18em] text-gold/70">
            Stream Trace
          </summary>
          <pre
            className="mt-3 overflow-x-auto whitespace-pre-wrap text-xs leading-relaxed text-silver/75"
            data-testid={`ai-stream-${surface}`}
            tabIndex={0}
          >
            {partialText ?? "No streamed response received yet."}
          </pre>
        </details>

        {record?.result && (
          <details className={`rounded-xl p-4 ${glassPanelClass}`}>
            <summary className="cursor-pointer text-xs uppercase tracking-[0.18em] text-gold/70">
              Raw Output
            </summary>
            <pre
              className="mt-3 overflow-x-auto text-xs leading-relaxed text-silver/75"
              data-testid={`ai-output-${surface}`}
              tabIndex={0}
            >
              {JSON.stringify(record.result.output, null, 2)}
            </pre>
          </details>
        )}

        <details className={`rounded-xl p-4 ${glassPanelClass}`}>
          <summary className="cursor-pointer text-xs uppercase tracking-[0.18em] text-gold/70">
            Payload
          </summary>
          <pre className="mt-3 overflow-x-auto text-xs leading-relaxed text-silver/75" tabIndex={0}>
            {payload ? JSON.stringify(payload, null, 2) : "No payload available."}
          </pre>
        </details>

        <details className={`rounded-xl p-4 ${glassPanelClass}`}>
          <summary className="cursor-pointer text-xs uppercase tracking-[0.18em] text-gold/70">
            System Prompt
          </summary>
          <pre
            className="mt-3 overflow-x-auto whitespace-pre-wrap text-xs leading-relaxed text-silver/75"
            tabIndex={0}
          >
            {systemPrompt}
          </pre>
        </details>

        <details className={`rounded-xl p-4 ${glassPanelClass}`}>
          <summary className="cursor-pointer text-xs uppercase tracking-[0.18em] text-gold/70">
            User Prompt
          </summary>
          <pre
            className="mt-3 overflow-x-auto whitespace-pre-wrap text-xs leading-relaxed text-silver/75"
            tabIndex={0}
          >
            {userPrompt}
          </pre>
        </details>
      </div>
    </section>
  );
}

export function AiPlaygroundPage() {
  const { settings } = useGameSettings();
  const { status, session, errorMessage } = useRuntimeSession({ mode: "preview" });
  const hqPreview = useMemo(
    () => (session ? buildHqViewFromPhase1(session.phase1View, session.registry) : null),
    [session],
  );

  const incidentSurface = useMemo(() => {
    if (!session) {
      return null;
    }

    const subjectId = "playground/incident-framing";
    const payload = buildIncidentFramingPreviewPayload(session, {
      incidentId: "incident/playground",
      templateId: "incident/personnel-friction",
      originTag: "playground",
    });
    return {
      title: "Incident Framing",
      surface: "incident-framing" as const,
      subjectId,
      payload,
      requestKey: `incident-framing:${subjectId}`,
    };
  }, [session]);

  const operatorSurface = useMemo(() => {
    if (!session) {
      return null;
    }

    const visitor = session.phase1View.visitors[0];
    const payload = visitor ? buildOperatorIdentityPreviewPayload(session, visitor) : null;
    const subjectId =
      typeof payload?.candidateId === "string"
        ? payload.candidateId
        : "playground/operator-identity";

    return {
      title: "Operator Identity",
      surface: "operator-identity" as const,
      subjectId,
      payload,
      requestKey: `operator-identity:${subjectId}`,
    };
  }, [session]);

  const surfaces = [incidentSurface, operatorSurface].filter(
    (entry): entry is NonNullable<typeof entry> => entry !== null,
  );

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(200,168,76,0.08),transparent_35%),linear-gradient(180deg,#060608_0%,#0c1224_48%,#060608_100%)]">
      <div className="mx-auto flex max-w-[1280px] flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
        <header className="glass-card overflow-hidden">
          <div className="grid gap-6 px-6 py-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(340px,0.9fr)]">
            <div>
              <div className="text-xs uppercase tracking-[0.22em] text-gold/65">AI Playground</div>
              <h1 className="mt-3 font-[family-name:var(--font-display)] text-4xl font-light tracking-[0.04em] text-silver-bright sm:text-5xl">
                Prompt and payload bench
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-silver/65 sm:text-base">
                A non-persistent preview session for inspecting the exact system prompt, structured
                payload, and validated JSON that AI generation runs hit before anything lands in
                gameplay. Use it to sanity-check tone, grounding, and schema drift against a real
                local runtime.
              </p>
              <div className="mt-5 flex flex-wrap gap-2 text-xs uppercase tracking-[0.14em] text-silver/55">
                <span className="rounded-full border border-gold/12 bg-gold/6 px-3 py-1">
                  Runtime: {settings.ai.runtimeKind}
                </span>
                <span className="rounded-full border border-gold/12 bg-gold/6 px-3 py-1">
                  Model: {settings.ai.modelId}
                </span>
                <span className="rounded-full border border-gold/12 bg-gold/6 px-3 py-1">
                  Auto AI: {settings.ai.enabled ? "enabled" : "disabled"}
                </span>
              </div>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link to="/" className="btn-ghost text-xs">
                  back to start screen
                </Link>
                <Link to="/game?mode=preview" className="btn-ghost text-xs">
                  open sandbox
                </Link>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => void session?.commands.probeAiRuntime()}
                  disabled={!session}
                >
                  probe runtime
                </button>
              </div>
            </div>

            <div className={`rounded-2xl p-5 ${glassPanelClass}`}>
              <div className="text-xs uppercase tracking-[0.18em] text-gold/60">Grounding</div>
              <p className="mt-3 text-sm leading-relaxed text-silver/65">
                System prompts are composed from world canon and tightened with structured-prompt
                guidance so small local models stay on tone and emit valid JSON.
              </p>
              <div className="mt-4 space-y-4">
                <div>
                  <div className="text-xs uppercase tracking-[0.14em] text-silver/45">
                    World canon sources
                  </div>
                  <ul className="mt-2 space-y-1 text-sm text-silver/65">
                    {PROMPT_CANON_SOURCE_PATHS.map((path) => (
                      <li key={path}>{path}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-[0.14em] text-silver/45">
                    Prompt guidance
                  </div>
                  <ul className="mt-2 space-y-1 text-sm text-silver/65">
                    {PROMPT_GUIDANCE_REFERENCES.map((reference) => (
                      <li key={reference}>
                        <a
                          href={reference}
                          target="_blank"
                          rel="noreferrer"
                          className="text-silver/70 hover:text-silver-bright"
                        >
                          {formatGuidanceReferenceLabel(reference)}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-xl border border-[rgba(200,168,76,0.06)] bg-[rgba(6,6,8,0.55)] px-4 py-3 text-sm leading-relaxed text-silver/60">
                  Connection status:{" "}
                  <span
                    className="text-silver-bright"
                    data-testid="ai-playground-connection-status"
                  >
                    {session?.ai.connectionStatus ?? "unknown"}
                  </span>
                  {session?.ai.lastProbe?.error && (
                    <div className="mt-2 text-ember">{session.ai.lastProbe.error}</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </header>

        {status === "loading" && (
          <div className={`rounded-2xl p-6 ${glassPanelSubtleClass}`}>
            <p className="text-sm text-silver/65">Opening preview runtime session…</p>
          </div>
        )}

        {status === "error" && (
          <div className={`rounded-2xl p-6 ${glassPanelSubtleClass}`}>
            <p className="text-sm text-ember">{errorMessage}</p>
          </div>
        )}

        {status === "ready" && (
          <div className="grid gap-6 xl:grid-cols-2 xl:grid-rows-[auto_1fr_auto]">
            {surfaces.map((entry) => (
              <SurfaceCard
                key={entry.requestKey}
                title={entry.title}
                surface={entry.surface}
                subjectId={entry.subjectId}
                payload={entry.payload}
                hqPreview={hqPreview}
                record={session?.ai.requests.get(entry.requestKey)}
                onGenerate={() => {
                  if (!session || !entry.payload) {
                    return;
                  }

                  void session.commands.generateAiSurface({
                    surface: entry.surface,
                    subjectId: entry.subjectId,
                    payload: entry.payload,
                    triggerSource: "tooling",
                  });
                }}
                onRegenerate={() => {
                  if (!session || !entry.payload) {
                    return;
                  }

                  void session.commands.regenerateAiSurface({
                    surface: entry.surface,
                    subjectId: entry.subjectId,
                    payload: entry.payload,
                    triggerSource: "tooling",
                  });
                }}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

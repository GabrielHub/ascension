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
} from "app/features/ai";
import { useRuntimeSession } from "app/features/runtime";
import { useGameSettings } from "app/features/settings";

import { glassPanelClass, glassPanelSubtleClass } from "./styles";

function formatGuidanceReferenceLabel(reference: string): string {
  if (reference.includes("cloud.google.com") && reference.includes("gemini-3")) {
    return "Gemini 3 prompting guide (Google Vertex AI)";
  }
  if (reference.includes("developers.openai.com")) {
    return "OpenAI prompt guidance";
  }
  return reference;
}

function SurfaceCard({
  title,
  surface,
  subjectId,
  payload,
  record,
  onGenerate,
  onRegenerate,
}: {
  title: string;
  surface: AiGenerationSurface;
  subjectId: string;
  payload: Record<string, unknown> | null;
  record: AiRequestRecord | undefined;
  onGenerate: () => void;
  onRegenerate: () => void;
}) {
  const systemPrompt = useMemo(() => buildSystemPrompt(surface), [surface]);
  const userPrompt = useMemo(
    () => (payload ? buildUserPrompt(surface, payload) : ""),
    [payload, surface],
  );

  return (
    <section className="glass-card overflow-hidden" data-testid={`ai-surface-${surface}`}>
      <div className="border-b border-[rgba(200,168,76,0.06)] px-6 py-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-lg font-light tracking-wide text-silver-bright">
              {title}
            </h2>
            <p className="mt-1 text-sm text-silver/55">
              Subject: <span className="text-silver-bright">{subjectId}</span>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-primary" onClick={onGenerate} disabled={!payload}>
              generate
            </button>
            <button
              type="button"
              className="btn-ghost text-xs"
              onClick={onRegenerate}
              disabled={!payload}
            >
              regenerate
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-4 px-6 py-5">
        <div className={`rounded-xl p-4 ${glassPanelSubtleClass}`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-xs uppercase tracking-[0.18em] text-gold/60">Request State</div>
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
          </div>
          {record?.error && (
            <p className="mt-3 text-sm leading-relaxed text-ember">{record.error}</p>
          )}
          {record?.result && (
            <pre
              className="mt-3 overflow-x-auto rounded-lg border border-[rgba(200,168,76,0.06)] bg-[rgba(6,6,8,0.6)] p-3 text-xs leading-relaxed text-silver/75"
              data-testid={`ai-output-${surface}`}
              tabIndex={0}
            >
              {JSON.stringify(record.result.output, null, 2)}
            </pre>
          )}
        </div>

        <details className={`rounded-xl p-4 ${glassPanelClass}`} open>
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

  const surfaces = [incidentSurface, operatorSurface].filter(Boolean);

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
          <div className="grid gap-6 xl:grid-cols-2">
            {surfaces.map((entry) => (
              <SurfaceCard
                key={entry.requestKey}
                title={entry.title}
                surface={entry.surface}
                subjectId={entry.subjectId}
                payload={entry.payload}
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

import type {
  AiGenerationOptions,
  AiGenerationProgress,
  AiGenerationRequest,
  AiGenerationResult,
  AiRuntimeProbeResult,
  LocalAiTransportConfig,
} from "./types";
import { buildSystemPrompt, buildUserPrompt } from "./prompts";
import { validateGenerationOutput } from "./schemas";

// ── OpenAI-compatible chat completions transport ────────────────────

interface ChatCompletionMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface ChatCompletionRequest {
  model: string;
  messages: ChatCompletionMessage[];
  stream: boolean;
  max_tokens?: number;
  reasoning_effort?: "none";
  temperature?: number;
  response_format?: { type: "json_object" };
}

interface ChatCompletionResponse {
  choices: { message: { content: string } }[];
}

interface ChatCompletionChunk {
  choices?: Array<{
    delta?: {
      content?: string;
    };
    message?: {
      content?: string;
    };
  }>;
}

interface ModelListResponse {
  data: { id: string }[];
}

const PROBE_TIMEOUT_MS = 5000;
const GENERATE_TIMEOUT_MS = 180000;

function formatTimeoutError(timeoutMs: number): string {
  return `Timed out after ${Math.round(timeoutMs / 1000)}s waiting for the AI runtime response.`;
}

async function fetchJson<T>(
  url: string,
  init?: RequestInit,
  timeoutMs = GENERATE_TIMEOUT_MS,
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...init,
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json() as Promise<T>;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(formatTimeoutError(timeoutMs));
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function buildChatCompletionRequest(
  request: AiGenerationRequest,
  mode: "primary" | "repair",
): ChatCompletionRequest {
  const systemPrompt =
    mode === "repair"
      ? [
          buildSystemPrompt(request.surface),
          "",
          "RETRY MODE",
          "- The previous answer was empty or invalid.",
          "- Retry with compact valid JSON only on a single line.",
          "- Do not repeat words, leave strings unfinished, or omit required fields.",
        ].join("\n")
      : buildSystemPrompt(request.surface);
  const userPrompt =
    mode === "repair"
      ? [
          buildUserPrompt(request.surface, request.payload),
          "",
          "RETRY INSTRUCTION",
          "- Respond with one minified JSON object only.",
          "- Preserve every required choiceId exactly once.",
        ].join("\n")
      : buildUserPrompt(request.surface, request.payload);

  const maxTokens = getMaxCompletionTokens(request.surface);

  return {
    model: request.config.modelId,
    stream: true,
    ...(maxTokens !== null ? { max_tokens: maxTokens } : {}),
    ...(request.config.runtimeKind === "ollama" ? { reasoning_effort: "none" as const } : {}),
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: mode === "repair" ? 0.1 : 0.2,
    ...(mode === "primary" ? { response_format: { type: "json_object" as const } } : {}),
  };
}

export function getMaxCompletionTokens(surface: AiGenerationRequest["surface"]): number | null {
  switch (surface) {
    case "incident-framing":
      return null;
    case "operator-identity":
      return 450;
    default:
      return null;
  }
}

function stripMarkdownCodeFence(rawContent: string): string | null {
  const match = rawContent.trim().match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return match?.[1]?.trim() ?? null;
}

function extractFirstJsonObject(rawContent: string): string | null {
  let start = -1;
  let depth = 0;
  let inString = false;
  let escape = false;

  for (let index = 0; index < rawContent.length; index += 1) {
    const char = rawContent[index];

    if (inString) {
      if (escape) {
        escape = false;
      } else if (char === "\\") {
        escape = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }

    if (char === "{") {
      if (depth === 0) {
        start = index;
      }
      depth += 1;
      continue;
    }

    if (char === "}" && depth > 0) {
      depth -= 1;
      if (depth === 0 && start >= 0) {
        return rawContent.slice(start, index + 1);
      }
    }
  }

  return null;
}

function parseModelJson(rawContent: string): unknown {
  const candidates = [
    rawContent.trim(),
    stripMarkdownCodeFence(rawContent),
    extractFirstJsonObject(rawContent),
  ].filter(
    (candidate): candidate is string => typeof candidate === "string" && candidate.length > 0,
  );

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch {
      // Try the next recovery strategy.
    }
  }

  throw new Error(`Failed to parse JSON from model response: ${rawContent.slice(0, 200)}`);
}

function findValidatedStreamJson(
  request: Pick<AiGenerationRequest, "surface" | "payload">,
  rawContent: string,
): string | null {
  const candidate = extractFirstJsonObject(rawContent);
  if (!candidate) {
    return null;
  }

  try {
    const parsed = JSON.parse(candidate);
    const validation = validateGenerationOutput(request.surface, parsed, request.payload);
    return validation.ok ? candidate : null;
  } catch {
    return null;
  }
}

function emitProgress(
  options: AiGenerationOptions | undefined,
  progress: Omit<AiGenerationProgress, "updatedAt">,
): void {
  options?.onProgress?.({
    ...progress,
    updatedAt: Date.now(),
  });
}

function summarizeStreamEvent(data: string): string {
  const normalized = data.replaceAll(/\s+/g, " ").trim();
  return normalized.length > 180 ? `${normalized.slice(0, 177)}...` : normalized;
}

function getStreamingDeltaContent(payload: unknown): string {
  if (!payload || typeof payload !== "object") {
    return "";
  }

  const chunk = payload as ChatCompletionChunk;
  const choice = chunk.choices?.[0];
  if (!choice) {
    return "";
  }

  if (typeof choice.delta?.content === "string") {
    return choice.delta.content;
  }

  if (typeof choice.message?.content === "string") {
    return choice.message.content;
  }

  return "";
}

async function readChatCompletionStream(
  request: Pick<AiGenerationRequest, "surface" | "payload">,
  response: Response,
  options: AiGenerationOptions | undefined,
  attempt: 1 | 2,
): Promise<string> {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("text/event-stream")) {
    const json = (await response.json()) as ChatCompletionResponse;
    const rawContent = json.choices[0]?.message?.content;
    if (!rawContent) {
      throw new Error("No content in chat completion response");
    }

    emitProgress(options, {
      phase: "streaming",
      attempt,
      message: "Received full response.",
      receivedCharacters: rawContent.length,
      partialText: rawContent,
    });

    return rawContent;
  }

  const body = response.body;
  if (!body) {
    throw new Error("Streaming response body was unavailable.");
  }

  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let content = "";
  let sawDone = false;
  let eventCount = 0;
  let nonContentEventCount = 0;
  let lastEventData: string | null = null;

  emitProgress(options, {
    phase: "streaming",
    attempt,
    message: "Waiting for streamed response…",
    receivedCharacters: 0,
    partialText: null,
  });

  while (true) {
    const { value, done } = await reader.read();
    if (done) {
      buffer += decoder.decode();
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    buffer = buffer.replaceAll("\r\n", "\n");

    let separatorIndex = buffer.indexOf("\n\n");
    while (separatorIndex >= 0) {
      const eventBlock = buffer.slice(0, separatorIndex).trim();
      buffer = buffer.slice(separatorIndex + 2);
      separatorIndex = buffer.indexOf("\n\n");

      if (!eventBlock) {
        continue;
      }

      const data = eventBlock
        .split("\n")
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice(5).trim())
        .join("\n");

      if (!data) {
        continue;
      }

      eventCount += 1;
      lastEventData = data;

      if (data === "[DONE]") {
        sawDone = true;
        break;
      }

      let parsedChunk: unknown;
      try {
        parsedChunk = JSON.parse(data);
      } catch {
        throw new Error(`Failed to parse streamed event JSON: ${summarizeStreamEvent(data)}`);
      }

      const delta = getStreamingDeltaContent(parsedChunk);
      if (!delta) {
        nonContentEventCount += 1;
        continue;
      }

      content += delta;
      emitProgress(options, {
        phase: "streaming",
        attempt,
        message: `Streaming response… ${content.length} chars received.`,
        receivedCharacters: content.length,
        partialText: content,
      });

      const validatedJson = findValidatedStreamJson(request, content);
      if (validatedJson) {
        emitProgress(options, {
          phase: "validating",
          attempt,
          message: "Detected a valid JSON object. Finalizing early…",
          receivedCharacters: validatedJson.length,
          partialText: validatedJson,
        });
        await reader.cancel();
        return validatedJson;
      }
    }

    if (sawDone) {
      break;
    }
  }

  if (content.length === 0) {
    const streamSummary =
      eventCount > 0
        ? `Received ${eventCount} stream events (${nonContentEventCount} without content).`
        : "Received no stream events.";
    const lastEventSummary =
      lastEventData && lastEventData !== "[DONE]"
        ? ` Last event: ${summarizeStreamEvent(lastEventData)}`
        : "";
    throw new Error(
      `No content in streamed chat completion response. ${streamSummary}${lastEventSummary}`,
    );
  }

  return content;
}

export function parseGenerationContent(
  request: Pick<
    AiGenerationRequest,
    "surface" | "subjectId" | "payload" | "payloadVersion" | "config"
  >,
  rawContent: string,
): AiGenerationResult {
  const parsed = parseModelJson(rawContent);

  const validation = validateGenerationOutput(request.surface, parsed, request.payload);
  if (!validation.ok) {
    throw new Error(`Schema validation failed: ${validation.error}`);
  }

  return {
    surface: request.surface,
    subjectId: request.subjectId,
    payloadVersion: request.payloadVersion,
    output: validation.output,
    runtimeKind: request.config.runtimeKind,
    modelId: request.config.modelId,
    generatedAt: Date.now(),
  };
}

export async function probeRuntime(config: LocalAiTransportConfig): Promise<AiRuntimeProbeResult> {
  const now = Date.now();

  try {
    const modelsUrl = `${config.baseUrl}/models`;
    const modelsResponse = await fetchJson<ModelListResponse>(
      modelsUrl,
      undefined,
      PROBE_TIMEOUT_MS,
    );
    const availableModels = modelsResponse.data.map((m) => m.id);
    const modelFound = availableModels.some(
      (id) => id === config.modelId || id.startsWith(`${config.modelId}:`),
    );

    return {
      status: modelFound ? "connected" : "model-missing",
      runtimeKind: config.runtimeKind,
      baseUrl: config.baseUrl,
      modelId: config.modelId,
      availableModels,
      error: modelFound ? null : `Model "${config.modelId}" not found in available models`,
      probedAt: now,
    };
  } catch (err) {
    return {
      status: "unavailable",
      runtimeKind: config.runtimeKind,
      baseUrl: config.baseUrl,
      modelId: config.modelId,
      availableModels: [],
      error: err instanceof Error ? err.message : "Unknown error",
      probedAt: now,
    };
  }
}

export async function generate(
  request: AiGenerationRequest,
  options?: AiGenerationOptions,
): Promise<AiGenerationResult> {
  const completionsUrl = `${request.config.baseUrl}/chat/completions`;

  async function requestRawContent(mode: "primary" | "repair"): Promise<string> {
    const attempt = mode === "repair" ? 2 : 1;
    const body = buildChatCompletionRequest(request, mode);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), GENERATE_TIMEOUT_MS);

    emitProgress(options, {
      phase: mode === "repair" ? "repairing" : "requesting",
      attempt,
      message:
        mode === "repair"
          ? "Retrying with a stricter JSON repair prompt…"
          : "Sending request to the AI runtime…",
      receivedCharacters: 0,
      partialText: null,
    });

    try {
      const response = await fetch(completionsUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      emitProgress(options, {
        phase: "streaming",
        attempt,
        message: "Runtime accepted the request. Waiting for output…",
        receivedCharacters: 0,
        partialText: null,
      });

      const rawContent = await readChatCompletionStream(request, response, options, attempt);
      clearTimeout(timeout);
      return rawContent;
    } catch (error) {
      clearTimeout(timeout);
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error(formatTimeoutError(GENERATE_TIMEOUT_MS));
      }

      throw error;
    }
  }

  try {
    const rawContent = await requestRawContent("primary");
    emitProgress(options, {
      phase: "validating",
      attempt: 1,
      message: "Validating streamed JSON against the surface schema…",
      receivedCharacters: rawContent.length,
      partialText: rawContent,
    });
    return parseGenerationContent(request, rawContent);
  } catch (primaryError) {
    try {
      emitProgress(options, {
        phase: "repairing",
        attempt: 2,
        message: "Primary response was invalid. Retrying with a repair prompt…",
        receivedCharacters: 0,
        partialText: null,
      });
      const rawContent = await requestRawContent("repair");
      emitProgress(options, {
        phase: "validating",
        attempt: 2,
        message: "Validating repaired JSON against the surface schema…",
        receivedCharacters: rawContent.length,
        partialText: rawContent,
      });
      return parseGenerationContent(request, rawContent);
    } catch {
      throw primaryError;
    }
  }
}

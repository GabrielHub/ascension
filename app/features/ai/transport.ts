import type {
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
  temperature?: number;
  response_format?: { type: "json_object" };
}

interface ChatCompletionResponse {
  choices: { message: { content: string } }[];
}

interface ModelListResponse {
  data: { id: string }[];
}

const PROBE_TIMEOUT_MS = 5000;
const GENERATE_TIMEOUT_MS = 180000;

async function fetchJson<T>(
  url: string,
  init?: RequestInit,
  timeoutMs = GENERATE_TIMEOUT_MS,
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  const response = await fetch(url, {
    ...init,
    signal: controller.signal,
  }).finally(() => {
    clearTimeout(timeout);
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  return response.json() as Promise<T>;
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

  return {
    model: request.config.modelId,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: mode === "repair" ? 0.1 : 0.2,
    ...(mode === "primary" ? { response_format: { type: "json_object" as const } } : {}),
  };
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

export async function generate(request: AiGenerationRequest): Promise<AiGenerationResult> {
  const completionsUrl = `${request.config.baseUrl}/chat/completions`;

  async function requestRawContent(mode: "primary" | "repair"): Promise<string> {
    const body = buildChatCompletionRequest(request, mode);
    const response = await fetchJson<ChatCompletionResponse>(
      completionsUrl,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
      GENERATE_TIMEOUT_MS,
    );

    const rawContent = response.choices[0]?.message?.content;
    if (!rawContent) {
      throw new Error("No content in chat completion response");
    }

    return rawContent;
  }

  try {
    return parseGenerationContent(request, await requestRawContent("primary"));
  } catch (primaryError) {
    try {
      return parseGenerationContent(request, await requestRawContent("repair"));
    } catch {
      throw primaryError;
    }
  }
}

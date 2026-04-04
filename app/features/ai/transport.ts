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

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  return response.json() as Promise<T>;
}

function buildChatCompletionRequest(request: AiGenerationRequest): ChatCompletionRequest {
  return {
    model: request.config.modelId,
    messages: [
      { role: "system", content: buildSystemPrompt(request.surface) },
      { role: "user", content: buildUserPrompt(request.surface, request.payload) },
    ],
    temperature: 0.7,
    response_format: { type: "json_object" },
  };
}

export function parseGenerationContent(
  request: Pick<
    AiGenerationRequest,
    "surface" | "subjectId" | "payload" | "payloadVersion" | "config"
  >,
  rawContent: string,
): AiGenerationResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawContent);
  } catch {
    throw new Error(`Failed to parse JSON from model response: ${rawContent.slice(0, 200)}`);
  }

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
    const modelsResponse = await fetchJson<ModelListResponse>(modelsUrl);
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
  const body = buildChatCompletionRequest(request);

  const completionsUrl = `${request.config.baseUrl}/chat/completions`;
  const response = await fetchJson<ChatCompletionResponse>(completionsUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const rawContent = response.choices[0]?.message?.content;
  if (!rawContent) {
    throw new Error("No content in chat completion response");
  }

  return parseGenerationContent(request, rawContent);
}

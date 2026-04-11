import { desktopBridge } from "app/features/desktop/bridge";

import { browserAiClient } from "./browser-client";
import { buildSystemPrompt, buildUserPrompt } from "./prompts";
import { getMaxCompletionTokens, parseGenerationContent } from "./transport";
import type {
  AiGenerationOptions,
  AiGenerationRequest,
  AiGenerationResult,
  AiRuntimeProbeResult,
  AiTransportClient,
  LocalAiTransportConfig,
} from "./types";

function buildDesktopSystemPrompt(
  request: AiGenerationRequest,
  mode: "primary" | "repair",
): string {
  if (mode === "primary") {
    return buildSystemPrompt(request.surface);
  }

  return [
    buildSystemPrompt(request.surface),
    "",
    "RETRY MODE",
    "- The previous answer was empty or invalid.",
    "- Retry with compact valid JSON only on a single line.",
    "- Do not repeat words, leave strings unfinished, or omit required fields.",
  ].join("\n");
}

function buildDesktopUserPrompt(request: AiGenerationRequest, mode: "primary" | "repair"): string {
  if (mode === "primary") {
    return buildUserPrompt(request.surface, request.payload);
  }

  return [
    buildUserPrompt(request.surface, request.payload),
    "",
    "RETRY INSTRUCTION",
    "- Respond with one minified JSON object only.",
    "- Preserve every required choiceId exactly once.",
  ].join("\n");
}

/**
 * Host-aware AI transport client.
 * Browser builds use fetch directly; the desktop host proxies requests through
 * Tauri so the runtime can stay local without depending on WebView networking.
 */
export const localAiClient: AiTransportClient = {
  async probe(config: LocalAiTransportConfig): Promise<AiRuntimeProbeResult> {
    if (!desktopBridge.isAvailable()) {
      return browserAiClient.probe(config);
    }

    const now = Date.now();

    try {
      const result = await desktopBridge.probeAiRuntime(config.baseUrl, config.modelId);
      return {
        status:
          result.status === "connected" || result.status === "model-missing"
            ? result.status
            : "unavailable",
        runtimeKind: config.runtimeKind,
        baseUrl: config.baseUrl,
        modelId: config.modelId,
        availableModels: result.availableModels,
        error: result.error,
        probedAt: now,
      };
    } catch (error) {
      return {
        status: "unavailable",
        runtimeKind: config.runtimeKind,
        baseUrl: config.baseUrl,
        modelId: config.modelId,
        availableModels: [],
        error: error instanceof Error ? error.message : "Unknown error",
        probedAt: now,
      };
    }
  },

  async generate(
    request: AiGenerationRequest,
    options?: AiGenerationOptions,
  ): Promise<AiGenerationResult> {
    if (!desktopBridge.isAvailable()) {
      return browserAiClient.generate(request, options);
    }

    const requestDesktopContent = async (mode: "primary" | "repair"): Promise<string> => {
      const maxTokens = getMaxCompletionTokens(request.surface);
      const response = await desktopBridge.generateAi(
        {
          baseUrl: request.config.baseUrl,
          modelId: request.config.modelId,
          runtimeKind: request.config.runtimeKind,
          ...(maxTokens !== null ? { maxTokens } : {}),
          systemPrompt: buildDesktopSystemPrompt(request, mode),
          userPrompt: buildDesktopUserPrompt(request, mode),
        },
        options,
      );

      return response.content;
    };

    try {
      return parseGenerationContent(request, await requestDesktopContent("primary"));
    } catch (primaryError) {
      try {
        options?.onProgress?.({
          phase: "repairing",
          attempt: 2,
          message: "Primary response was invalid. Retrying with a repair prompt…",
          receivedCharacters: 0,
          partialText: null,
          updatedAt: Date.now(),
        });
        return parseGenerationContent(request, await requestDesktopContent("repair"));
      } catch {
        throw primaryError;
      }
    }
  },
};

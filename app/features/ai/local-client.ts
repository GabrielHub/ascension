import { desktopBridge } from "app/features/desktop/bridge";

import { browserAiClient } from "./browser-client";
import { buildSystemPrompt, buildUserPrompt } from "./prompts";
import { parseGenerationContent } from "./transport";
import type {
  AiGenerationRequest,
  AiGenerationResult,
  AiRuntimeProbeResult,
  AiTransportClient,
  LocalAiTransportConfig,
} from "./types";

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

  async generate(request: AiGenerationRequest): Promise<AiGenerationResult> {
    if (!desktopBridge.isAvailable()) {
      return browserAiClient.generate(request);
    }

    const response = await desktopBridge.generateAi({
      baseUrl: request.config.baseUrl,
      modelId: request.config.modelId,
      systemPrompt: buildSystemPrompt(request.surface),
      userPrompt: buildUserPrompt(request.surface, request.payload),
    });

    return parseGenerationContent(request, response.content);
  },
};

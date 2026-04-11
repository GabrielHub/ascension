import type {
  AiGenerationOptions,
  AiGenerationRequest,
  AiGenerationResult,
  AiRuntimeProbeResult,
  AiTransportClient,
  LocalAiTransportConfig,
} from "./types";
import { generate, probeRuntime } from "./transport";

/**
 * Browser-local AI transport client.
 * Calls the local runtime directly from the browser via fetch.
 */
export const browserAiClient: AiTransportClient = {
  probe(config: LocalAiTransportConfig): Promise<AiRuntimeProbeResult> {
    return probeRuntime(config);
  },
  generate(
    request: AiGenerationRequest,
    options?: AiGenerationOptions,
  ): Promise<AiGenerationResult> {
    return generate(request, options);
  },
};

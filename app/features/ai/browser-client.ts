import type {
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
  generate(request: AiGenerationRequest): Promise<AiGenerationResult> {
    return generate(request);
  },
};

import type { AiRuntimeKind } from "../settings/storage";

// ── Transport ───────────────────────────────────────────────────────

export interface LocalAiTransportConfig {
  runtimeKind: AiRuntimeKind;
  baseUrl: string;
  modelId: string;
}

export type AiGenerationSurface = "incident-framing" | "operator-identity";

export interface AiGenerationRequest {
  surface: AiGenerationSurface;
  subjectId: string;
  payload: Record<string, unknown>;
  payloadVersion: number;
  config: LocalAiTransportConfig;
}

export interface AiGenerationResult {
  surface: AiGenerationSurface;
  subjectId: string;
  payloadVersion: number;
  output: Record<string, unknown>;
  runtimeKind: AiRuntimeKind;
  modelId: string;
  generatedAt: number;
}

export type AiConnectionStatus = "unknown" | "connected" | "unavailable" | "model-missing";

export interface AiRuntimeProbeResult {
  status: AiConnectionStatus;
  runtimeKind: AiRuntimeKind;
  baseUrl: string;
  modelId: string;
  availableModels: readonly string[];
  error: string | null;
  probedAt: number;
}

// ── Request registry ────────────────────────────────────────────────

export type AiRequestStatus = "idle" | "pending" | "succeeded" | "failed";

export type AiRequestTriggerSource = "auto" | "dev-menu" | "tooling";

export interface AiRequestRecord {
  requestKey: string;
  subjectId: string;
  surface: AiGenerationSurface;
  triggerSource: AiRequestTriggerSource;
  status: AiRequestStatus;
  runtimeKind: AiRuntimeKind;
  baseUrl: string;
  modelId: string;
  payload: Record<string, unknown>;
  payloadFingerprint: string;
  payloadVersion: number;
  startedAt: number | null;
  finishedAt: number | null;
  result: AiGenerationResult | null;
  error: string | null;
}

export interface AiRequestRegistry {
  readonly records: ReadonlyMap<string, AiRequestRecord>;
}

// ── Transport client interface ──────────────────────────────────────

export interface AiTransportClient {
  probe(config: LocalAiTransportConfig): Promise<AiRuntimeProbeResult>;
  generate(request: AiGenerationRequest): Promise<AiGenerationResult>;
}

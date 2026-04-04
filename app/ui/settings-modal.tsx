import type { AudioEngineState } from "app/features/audio";
import { MAX_VOLUME_DB, MIN_VOLUME_DB, type GameSettings } from "app/features/settings";
import type { AiConnectionStatus } from "app/features/ai";
import { RUNTIME_DEFAULT_URLS, type AiRuntimeKind } from "app/features/settings/storage";
import type { ScreenWakeLockState } from "app/features/runtime/use-screen-wake-lock";

import { GameModal } from "./game-modal";
import { VolumeSlider } from "./volume-slider";

function renderWakeLockMessage(wakeLock: ScreenWakeLockState, enabled: boolean): string {
  if (!enabled) {
    return "Screen wake lock is disabled.";
  }

  switch (wakeLock.status) {
    case "unsupported":
      return "This browser does not expose the screen wake lock API.";
    case "requesting":
      return "Requesting a wake lock for the active simulation.";
    case "active":
      return "The screen will stay awake while the simulation is running in the foreground.";
    case "error":
      return wakeLock.errorMessage ?? "The browser rejected the wake lock request.";
    default:
      return "A wake lock will be requested while the simulation is running in the foreground.";
  }
}

function ToggleButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm uppercase tracking-[0.12em] transition-colors ${
        active
          ? "border-[rgba(200,168,76,0.3)] bg-[rgba(200,168,76,0.12)] text-gold"
          : "border-[rgba(200,168,76,0.08)] bg-[rgba(6,6,8,0.35)] text-silver/60 hover:text-silver-bright"
      }`}
      onClick={onClick}
      aria-pressed={active}
    >
      <span
        className={`h-2 w-2 rounded-full ${active ? "bg-gold shadow-[0_0_8px_rgba(200,168,76,0.5)]" : "bg-silver/30"}`}
      />
      {label}
    </button>
  );
}

function formatConnectionStatus(status: AiConnectionStatus): string {
  switch (status) {
    case "connected":
      return "Connected";
    case "unavailable":
      return "Runtime unavailable";
    case "model-missing":
      return "Model not found";
    default:
      return "Not checked";
  }
}

const RUNTIME_OPTIONS: { value: AiRuntimeKind; label: string }[] = [
  { value: "ollama", label: "Ollama" },
  { value: "lm-studio", label: "LM Studio" },
  { value: "llama-cpp", label: "llama.cpp" },
];

/** Curated presets from the Ollama library (updated 2026-04). */
const MODEL_PRESETS: { value: string; label: string }[] = [
  { value: "gemma4:26b", label: "Gemma 4 — 26B" },
  { value: "gemma4:e4b", label: "Gemma 4 — e4b (MoE)" },
  { value: "qwen3.5:27b", label: "Qwen 3.5 — 27B" },
  { value: "qwen3.5:9b", label: "Qwen 3.5 — 9B" },
  { value: "qwen3.5:4b", label: "Qwen 3.5 — 4B" },
  { value: "qwen3:8b", label: "Qwen 3 — 8B" },
  { value: "gemma3:12b", label: "Gemma 3 — 12B" },
  { value: "gemma3:4b", label: "Gemma 3 — 4B" },
  { value: "phi4:14b", label: "Phi 4 — 14B" },
  { value: "mistral-small:24b", label: "Mistral Small — 24B" },
  { value: "mistral:7b", label: "Mistral — 7B" },
  { value: "llama3.2:3b", label: "Llama 3.2 — 3B" },
];

const CUSTOM_MODEL_SENTINEL = "__custom__";

function getModelHint(runtime: AiRuntimeKind, model: string): string {
  switch (runtime) {
    case "ollama":
      return `Install with: ollama pull ${model}`;
    case "lm-studio":
      return "Enter the model identifier loaded in LM Studio";
    case "llama-cpp":
      return "llama.cpp serves whichever model is loaded at startup";
  }
}

export interface SettingsModalProps {
  settings: GameSettings;
  audioState: AudioEngineState;
  wakeLock: ScreenWakeLockState;
  aiConnectionStatus?: AiConnectionStatus;
  onClose: () => void;
  onSfxVolumeChange: (db: number) => void;
  onMusicVolumeChange: (db: number) => void;
  onWakeLockToggle: () => void;
  onTutorialEventsToggle: () => void;
  onReplayOpeningGuidance?: () => void;
  onResetDefaults: () => void;
  onAiEnabledToggle?: () => void;
  onAiRuntimeKindChange?: (kind: AiRuntimeKind) => void;
  onAiBaseUrlChange?: (url: string) => void;
  onAiModelIdChange?: (modelId: string) => void;
  onAiProbe?: () => void;
}

export function SettingsModal({
  settings,
  audioState,
  wakeLock,
  aiConnectionStatus = "unknown",
  onClose,
  onSfxVolumeChange,
  onMusicVolumeChange,
  onWakeLockToggle,
  onTutorialEventsToggle,
  onReplayOpeningGuidance,
  onResetDefaults,
  onAiEnabledToggle,
  onAiRuntimeKindChange,
  onAiBaseUrlChange,
  onAiModelIdChange,
  onAiProbe,
}: SettingsModalProps) {
  const wakeLockEnabled = settings.wakeLockEnabled;
  const tutorialEventsEnabled = settings.tutorialEventsEnabled;
  const ai = settings.ai;

  return (
    <GameModal
      title="Settings"
      subtitle="This modal owns the screen and pauses the simulation while it is open."
      onClose={onClose}
      footer={
        <div className="flex items-center justify-between gap-3">
          <button type="button" className="btn-ghost text-xs" onClick={onResetDefaults}>
            reset defaults
          </button>
          <button type="button" className="btn-primary" onClick={onClose}>
            return to game
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        <section className="space-y-3">
          <div>
            <h3 className="text-xs font-medium uppercase tracking-[0.16em] text-gold/80">Audio</h3>
            <p className="mt-1 text-sm text-silver/60">
              Adjust local playback levels for this device. Audio status:{" "}
              <span className="text-silver-bright">
                {audioState === "running"
                  ? "ready"
                  : audioState === "closed"
                    ? "closed"
                    : "awaiting unlock"}
              </span>
              .
            </p>
          </div>

          <div className="glass-card-inset space-y-4 p-4">
            <VolumeSlider
              label="SFX"
              value={settings.audio.sfxVolumeDb}
              onChange={onSfxVolumeChange}
              min={MIN_VOLUME_DB}
              max={MAX_VOLUME_DB}
            />
            <VolumeSlider
              label="Music"
              value={settings.audio.musicVolumeDb}
              onChange={onMusicVolumeChange}
              min={MIN_VOLUME_DB}
              max={MAX_VOLUME_DB}
            />
          </div>
        </section>

        <section className="space-y-3">
          <div>
            <h3 className="text-xs font-medium uppercase tracking-[0.16em] text-gold/80">
              Display
            </h3>
            <p className="mt-1 text-sm text-silver/60">
              Control long-session behavior while the simulation is actively running.
            </p>
          </div>

          <div className="glass-card-inset space-y-3 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm text-silver-bright">Keep screen awake</div>
                <p className="mt-1 text-sm leading-relaxed text-silver/60">
                  Prevent the display from sleeping while the game is actively running in the
                  foreground.
                </p>
              </div>
              <ToggleButton
                active={wakeLockEnabled}
                label={wakeLockEnabled ? "enabled" : "disabled"}
                onClick={onWakeLockToggle}
              />
            </div>

            <div className="rounded-lg border border-[rgba(200,168,76,0.06)] bg-[rgba(6,6,8,0.4)] px-3 py-2 text-sm leading-relaxed text-silver/55">
              {renderWakeLockMessage(wakeLock, wakeLockEnabled)}
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <div>
            <h3 className="text-xs font-medium uppercase tracking-[0.16em] text-gold/80">
              Guidance
            </h3>
            <p className="mt-1 text-sm text-silver/60">
              Control tutorial-only walkthroughs without suppressing gameplay-owned narrative
              interruptions.
            </p>
          </div>

          <div className="glass-card-inset space-y-4 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm text-silver-bright">Tutorial events</div>
                <p className="mt-1 text-sm leading-relaxed text-silver/60">
                  Toggle guided highlights and onboarding coachmarks. Narrative interruption
                  briefings still appear when the simulation requires a managerial decision.
                </p>
              </div>
              <ToggleButton
                active={tutorialEventsEnabled}
                label={tutorialEventsEnabled ? "enabled" : "disabled"}
                onClick={onTutorialEventsToggle}
              />
            </div>

            {onReplayOpeningGuidance && (
              <div className="flex items-center justify-between gap-3 rounded-lg border border-[rgba(200,168,76,0.06)] bg-[rgba(6,6,8,0.4)] px-3 py-3">
                <div>
                  <div className="text-sm text-silver-bright">Replay opening walkthrough</div>
                  <p className="mt-1 text-sm leading-relaxed text-silver/60">
                    Reset the opening guidance sequence for this active run.
                  </p>
                </div>
                <button
                  type="button"
                  className="btn-ghost text-xs"
                  onClick={onReplayOpeningGuidance}
                >
                  reset opening
                </button>
              </div>
            )}
          </div>
        </section>

        <section className="space-y-3">
          <div>
            <h3 className="text-xs font-medium uppercase tracking-[0.16em] text-gold/80">
              Local AI
            </h3>
            <p className="mt-1 text-sm text-silver/60">
              Optional local inference for generative variety. Requires a local runtime like Ollama.
            </p>
          </div>

          <div className="glass-card-inset space-y-4 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm text-silver-bright">AI generation</div>
                <p className="mt-1 text-sm leading-relaxed text-silver/60">
                  Enable optional AI-generated content variety. The game is fully playable without
                  this.
                </p>
              </div>
              {onAiEnabledToggle && (
                <ToggleButton
                  active={ai.enabled}
                  label={ai.enabled ? "enabled" : "disabled"}
                  onClick={onAiEnabledToggle}
                />
              )}
            </div>

            {ai.enabled && (
              <>
                <div>
                  <label className="text-xs uppercase tracking-wider text-gold/60">Runtime</label>
                  <select
                    aria-label="AI runtime"
                    className="mt-1 w-full rounded border border-[rgba(200,168,76,0.1)] bg-[rgba(6,6,8,0.5)] px-2 py-1.5 text-sm text-silver-bright"
                    value={ai.runtimeKind}
                    onChange={(e) => {
                      const kind = e.target.value as AiRuntimeKind;
                      onAiRuntimeKindChange?.(kind);
                      onAiBaseUrlChange?.(RUNTIME_DEFAULT_URLS[kind]);
                    }}
                  >
                    {RUNTIME_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs uppercase tracking-wider text-gold/60">Model</label>
                  {(() => {
                    const isPreset = MODEL_PRESETS.some((p) => p.value === ai.modelId);
                    return (
                      <>
                        <select
                          aria-label="AI model"
                          className="mt-1 w-full rounded border border-[rgba(200,168,76,0.1)] bg-[rgba(6,6,8,0.5)] px-2 py-1.5 text-sm text-silver-bright"
                          value={isPreset ? ai.modelId : CUSTOM_MODEL_SENTINEL}
                          onChange={(e) => {
                            const v = e.target.value;
                            if (v !== CUSTOM_MODEL_SENTINEL) {
                              onAiModelIdChange?.(v);
                            }
                          }}
                        >
                          {MODEL_PRESETS.map((m) => (
                            <option key={m.value} value={m.value}>
                              {m.label}
                            </option>
                          ))}
                          <option value={CUSTOM_MODEL_SENTINEL}>Custom…</option>
                        </select>
                        {!isPreset && (
                          <input
                            type="text"
                            aria-label="Custom AI model tag"
                            placeholder="e.g. deepseek-r1:14b"
                            className="mt-2 w-full rounded border border-[rgba(200,168,76,0.1)] bg-[rgba(6,6,8,0.5)] px-2 py-1.5 text-sm text-silver-bright"
                            value={ai.modelId}
                            onChange={(e) => onAiModelIdChange?.(e.target.value)}
                          />
                        )}
                      </>
                    );
                  })()}
                  <p className="mt-1.5 text-xs leading-relaxed text-silver/40">
                    {getModelHint(ai.runtimeKind, ai.modelId)}
                  </p>
                </div>

                <div className="flex items-center justify-between gap-3 rounded-lg border border-[rgba(200,168,76,0.06)] bg-[rgba(6,6,8,0.4)] px-3 py-2">
                  <div className="text-sm text-silver-bright">
                    Connection:{" "}
                    <span
                      className={
                        aiConnectionStatus === "connected"
                          ? "text-gold"
                          : aiConnectionStatus === "unavailable" ||
                              aiConnectionStatus === "model-missing"
                            ? "text-ember"
                            : "text-silver/60"
                      }
                    >
                      {formatConnectionStatus(aiConnectionStatus)}
                    </span>
                  </div>
                  {onAiProbe && (
                    <button type="button" className="btn-ghost text-xs" onClick={onAiProbe}>
                      test connection
                    </button>
                  )}
                </div>

                <details className="group">
                  <summary className="cursor-pointer text-xs uppercase tracking-wider text-gold/40 transition-colors select-none hover:text-gold/60">
                    Connection details
                  </summary>
                  <div className="mt-2">
                    <label className="text-xs uppercase tracking-wider text-gold/60">
                      Base URL
                    </label>
                    <input
                      type="text"
                      aria-label="AI base URL"
                      className="mt-1 w-full rounded border border-[rgba(200,168,76,0.1)] bg-[rgba(6,6,8,0.5)] px-2 py-1.5 text-sm text-silver-bright"
                      value={ai.baseUrl}
                      onChange={(e) => onAiBaseUrlChange?.(e.target.value)}
                    />
                    <p className="mt-1.5 text-xs leading-relaxed text-silver/40">
                      Auto-configured for{" "}
                      {RUNTIME_OPTIONS.find((o) => o.value === ai.runtimeKind)?.label ??
                        ai.runtimeKind}
                      . Change only if using a custom endpoint.
                    </p>
                  </div>
                </details>
              </>
            )}
          </div>
        </section>
      </div>
    </GameModal>
  );
}

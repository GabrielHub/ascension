import type { AudioEngineState } from "app/features/audio";
import { MAX_VOLUME_DB, MIN_VOLUME_DB, type GameSettings } from "app/features/settings";
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
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[0.6875rem] uppercase tracking-[0.12em] transition-colors ${
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

export interface SettingsModalProps {
  settings: GameSettings;
  audioState: AudioEngineState;
  wakeLock: ScreenWakeLockState;
  onClose: () => void;
  onSfxVolumeChange: (db: number) => void;
  onMusicVolumeChange: (db: number) => void;
  onWakeLockToggle: () => void;
  onResetDefaults: () => void;
}

export function SettingsModal({
  settings,
  audioState,
  wakeLock,
  onClose,
  onSfxVolumeChange,
  onMusicVolumeChange,
  onWakeLockToggle,
  onResetDefaults,
}: SettingsModalProps) {
  const wakeLockEnabled = settings.wakeLockEnabled;

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

            <div className="rounded-lg border border-[rgba(200,168,76,0.06)] bg-[rgba(6,6,8,0.4)] px-3 py-2 text-[0.75rem] leading-relaxed text-silver/55">
              {renderWakeLockMessage(wakeLock, wakeLockEnabled)}
            </div>
          </div>
        </section>
      </div>
    </GameModal>
  );
}

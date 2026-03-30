import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router";

import {
  STARTER_CUES,
  createAudioEngine,
  groupCuesByCategory,
  type AudioCueDefinition,
  type AudioCueCategory,
  type AudioEngine,
  type AudioEngineState,
} from "app/features/audio";
import { glassCardNavyClass } from "./styles";

/* ═══════════════════════════════════════════════════════════════════════════
   Audio Playground — Phase 1 SFX & Ambience Review Surface
   Audition, compare, and approve cues before they ship in-game.
   ═══════════════════════════════════════════════════════════════════════════ */

const CATEGORY_META: Record<string, { title: string; subtitle: string }> = {
  hq: {
    title: "HQ Cues",
    subtitle: "Headquarters management transitions",
  },
  room: {
    title: "Room Cues",
    subtitle: "Room placement and state changes",
  },
  staff: {
    title: "Staff Cues",
    subtitle: "Staff hiring and assignment feedback",
  },
  operator: {
    title: "Operator Cues",
    subtitle: "Operator recruitment and roster events",
  },
  raid: {
    title: "Raid Cues",
    subtitle: "Raid deployment, return, and loss events",
  },
  event: {
    title: "Event Cues",
    subtitle: "Pressure and system events",
  },
};

const CATEGORY_ORDER: readonly AudioCueCategory[] = [
  "hq",
  "room",
  "staff",
  "operator",
  "raid",
  "event",
];
const DEFAULT_SFX_VOLUME = -6;
const DEFAULT_MUSIC_VOLUME = -12;

// ──────────────────────────────────────────────────────────────────────────
// Volume slider — gold-accented range control
// ──────────────────────────────────────────────────────────────────────────

function VolumeSlider({
  label,
  value,
  onChange,
  min = -40,
  max = 0,
  disabled,
}: {
  label: string;
  value: number;
  onChange: (db: number) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
}) {
  const pct = ((value - min) / (max - min)) * 100;

  return (
    <div className="flex items-center gap-3">
      <span className="w-20 text-xs font-medium uppercase tracking-[0.2em] text-gold/50">
        {label}
      </span>
      <div className="relative flex-1">
        <div className="pointer-events-none absolute top-1/2 right-0 left-0 h-[2px] -translate-y-1/2 rounded-full bg-[rgba(200,168,76,0.08)]" />
        <div
          className="pointer-events-none absolute top-1/2 left-0 h-[2px] -translate-y-1/2 rounded-full bg-gold/30"
          style={{ width: `${pct}%` }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={1}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(Number(e.target.value))}
          className="relative z-10 w-full cursor-pointer appearance-none bg-transparent
            [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3
            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full
            [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-gold/40
            [&::-webkit-slider-thumb]:bg-gold/80 [&::-webkit-slider-thumb]:shadow-[0_0_6px_rgba(200,168,76,0.3)]
            [&::-webkit-slider-thumb]:transition-shadow [&::-webkit-slider-thumb]:duration-200
            [&::-webkit-slider-thumb]:hover:shadow-[0_0_12px_rgba(200,168,76,0.5)]
            disabled:opacity-30 disabled:cursor-not-allowed"
        />
      </div>
      <span className="w-12 text-right font-[family-name:var(--font-display)] text-sm tabular-nums text-silver/50">
        {value} dB
      </span>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// SFX cue row — play button with pulse feedback
// ──────────────────────────────────────────────────────────────────────────

function SfxCueRow({
  cue,
  engine,
  index,
}: {
  cue: AudioCueDefinition;
  engine: AudioEngine | null;
  index: number;
}) {
  const [playing, setPlaying] = useState(false);
  const resetTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (resetTimerRef.current !== null) {
        window.clearTimeout(resetTimerRef.current);
      }
    };
  }, []);

  const handlePlay = useCallback(() => {
    if (!engine || engine.state !== "running") return;
    engine.playCue(cue.id);
    setPlaying(true);

    if (resetTimerRef.current !== null) {
      window.clearTimeout(resetTimerRef.current);
    }

    resetTimerRef.current = window.setTimeout(() => {
      setPlaying(false);
      resetTimerRef.current = null;
    }, 400);
  }, [engine, cue.id]);

  const isReady = engine?.state === "running";

  return (
    <div
      className="animate-enter flex items-center gap-4 rounded-lg border border-[rgba(200,168,76,0.04)] bg-[rgba(15,14,18,0.25)] px-4 py-3 transition-colors duration-300 hover:border-[rgba(200,168,76,0.12)]"
      style={{ animationDelay: `${100 + index * 40}ms` }}
    >
      {/* Play button */}
      <button
        type="button"
        onClick={handlePlay}
        disabled={!isReady}
        className="group relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-gold/15 bg-[rgba(200,168,76,0.06)] transition-all duration-300 hover:border-gold/40 hover:bg-gold/15 hover:shadow-[0_0_16px_rgba(200,168,76,0.15)] disabled:opacity-25 disabled:cursor-not-allowed disabled:hover:border-gold/15 disabled:hover:bg-[rgba(200,168,76,0.06)] disabled:hover:shadow-none"
      >
        {/* Play triangle */}
        <svg
          width="10"
          height="12"
          viewBox="0 0 10 12"
          className="ml-0.5 text-gold/70 transition-colors duration-200 group-hover:text-gold"
        >
          <path d="M0 0 L10 6 L0 12 Z" fill="currentColor" />
        </svg>
        {/* Pulse ring on play */}
        {playing && (
          <span
            className="absolute inset-0 rounded-full border border-gold/50"
            style={{
              animation: "cue-pulse 400ms ease-out forwards",
            }}
          />
        )}
      </button>

      {/* Label and description */}
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="font-[family-name:var(--font-display)] text-sm font-light tracking-wide text-silver-bright">
            {cue.label}
          </span>
          <span className="badge badge-gold text-xs">{cue.id}</span>
        </div>
        <p className="mt-0.5 text-sm leading-relaxed text-silver/50">{cue.description}</p>
      </div>

      {/* Playback indicator dot */}
      <div
        className="h-1.5 w-1.5 shrink-0 rounded-full transition-all duration-300"
        style={{
          background: playing ? "var(--color-gold)" : "rgba(200,168,76,0.15)",
          boxShadow: playing ? "0 0 8px rgba(200,168,76,0.5)" : "none",
        }}
      />
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Category section
// ──────────────────────────────────────────────────────────────────────────

function CategorySection({
  categoryKey,
  cues,
  engine,
  sectionIndex,
}: {
  categoryKey: string;
  cues: AudioCueDefinition[];
  engine: AudioEngine | null;
  sectionIndex: number;
}) {
  const meta = CATEGORY_META[categoryKey];
  if (!meta) return null;

  return (
    <section
      className="glass-card animate-enter overflow-hidden"
      style={{ animationDelay: `${60 + sectionIndex * 80}ms` }}
    >
      {/* Section header */}
      <div className="border-b border-[rgba(200,168,76,0.06)] px-6 py-5">
        <h2 className="font-[family-name:var(--font-display)] text-lg font-light tracking-wide text-silver-bright">
          {meta.title}
        </h2>
        <p className="mt-1 text-xs text-silver/60">{meta.subtitle}</p>
      </div>

      {/* Cue rows */}
      <div className="space-y-3 px-6 py-5">
        {cues.map((cue, i) => (
          <SfxCueRow key={cue.id} cue={cue} engine={engine} index={i} />
        ))}
      </div>
    </section>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Page component
// ──────────────────────────────────────────────────────────────────────────

export function AudioPlaygroundPage() {
  const engineRef = useRef<AudioEngine | null>(null);
  const [engineState, setEngineState] = useState<AudioEngineState>("suspended");
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const [sfxVolume, setSfxVolume] = useState(DEFAULT_SFX_VOLUME);
  const [musicVolume, setMusicVolume] = useState(DEFAULT_MUSIC_VOLUME);

  const syncEngineState = useCallback((engine: AudioEngine) => {
    setEngineState(engine.state);
    setIsMusicPlaying(engine.isMusicPlaying);
    setSfxVolume(Math.round(engine.sfxVolume));
    setMusicVolume(Math.round(engine.musicVolume));
  }, []);

  // Create engine once, dispose on unmount
  useEffect(() => {
    const engine = createAudioEngine();
    engineRef.current = engine;

    syncEngineState(engine);
    const unsub = engine.subscribe(syncEngineState);

    return () => {
      unsub();
      engine.dispose();
      engineRef.current = null;
    };
  }, [syncEngineState]);

  const handleUnlock = useCallback(async () => {
    await engineRef.current?.unlock();
  }, []);

  const handleSfxVolume = useCallback((db: number) => {
    engineRef.current?.setSfxVolume(db);
  }, []);

  const handleMusicVolume = useCallback((db: number) => {
    engineRef.current?.setMusicVolume(db);
  }, []);

  const handleToggleMusic = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;
    if (engine.isMusicPlaying) {
      engine.stopMusic();
    } else {
      engine.startMusic();
    }
  }, []);

  const handleResetMix = useCallback(() => {
    engineRef.current?.setSfxVolume(DEFAULT_SFX_VOLUME);
    engineRef.current?.setMusicVolume(DEFAULT_MUSIC_VOLUME);
  }, []);

  const grouped = groupCuesByCategory();
  const isRunning = engineState === "running";
  const engine = isRunning ? engineRef.current : null;
  const sfxCount = STARTER_CUES.filter((cue) => cue.kind === "sfx").length;

  return (
    <div className="min-h-dvh bg-void">
      {/* Header */}
      <header className="animate-enter border-b border-[rgba(200,168,76,0.06)] bg-[rgba(6,6,8,0.7)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center gap-4 px-6 py-4">
          <Link to="/" className="btn-ghost text-xs">
            &larr; back
          </Link>
          <div className="h-4 w-px bg-[rgba(200,168,76,0.08)]" />
          <div className="flex-1">
            <h1 className="font-[family-name:var(--font-display)] text-sm font-light tracking-[0.15em] text-gold">
              Audio Playground &mdash; SFX &amp; Ambience
            </h1>
            <p className="mt-0.5 text-sm text-silver/60">
              Phase 1 cue review &mdash; SFX-first rollout with restrained ambience beds
            </p>
          </div>
          <Link to="/svg-playground" className="btn-ghost text-xs">
            svg playground &rarr;
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-8 px-6 py-8">
        {/* Engine status + unlock */}
        <section
          className="glass-card animate-enter overflow-hidden px-6 py-5"
          style={{ animationDelay: "60ms" }}
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-[family-name:var(--font-display)] text-base font-light tracking-wide text-silver-bright">
                Audio Engine
              </h2>
              <div className="mt-2 flex items-center gap-2">
                <div
                  className="h-2 w-2 rounded-full transition-colors duration-300"
                  style={{
                    background: isRunning ? "#4ade80" : "var(--color-gold-dim)",
                    boxShadow: isRunning ? "0 0 8px rgba(74,222,128,0.4)" : "none",
                  }}
                />
                <span className="text-xs text-silver/60">
                  {engineState === "suspended" &&
                    "Audio context suspended — click unlock to enable playback"}
                  {engineState === "running" &&
                    "Audio context running — all cues available for preview"}
                  {engineState === "closed" && "Audio engine disposed"}
                </span>
              </div>
              <p className="mt-2 text-sm text-silver/55">
                Music:{" "}
                <span className="text-silver-bright">{isMusicPlaying ? "Playing" : "Stopped"}</span>
              </p>
            </div>

            {!isRunning && engineState !== "closed" && (
              <button type="button" onClick={handleUnlock} className="btn-primary">
                Unlock Audio
              </button>
            )}
          </div>

          {/* Gain staging */}
          {isRunning && (
            <div className="mt-5 space-y-3 border-t border-[rgba(200,168,76,0.06)] pt-5">
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handleToggleMusic}
                  className="btn-ghost px-3 py-1 text-sm"
                >
                  {isMusicPlaying ? "Stop Music" : "Start Music"}
                </button>
                <button
                  type="button"
                  onClick={handleResetMix}
                  className="btn-ghost px-3 py-1 text-sm"
                >
                  Reset Mix
                </button>
                <span className="text-sm text-silver/55">
                  {sfxCount} SFX cues &middot; intermittent ambient music
                </span>
              </div>
              <p className="mb-3 text-xs font-medium uppercase tracking-[0.2em] text-gold/50">
                Gain Staging
              </p>
              <VolumeSlider label="SFX" value={sfxVolume} onChange={handleSfxVolume} />
              <VolumeSlider label="Music" value={musicVolume} onChange={handleMusicVolume} />
            </div>
          )}
        </section>

        {/* Cue categories */}
        {CATEGORY_ORDER.map((catKey, sectionIdx) => {
          const cues = grouped.get(catKey);
          if (!cues?.length) return null;

          return (
            <CategorySection
              key={catKey}
              categoryKey={catKey}
              cues={cues}
              engine={engine}
              sectionIndex={sectionIdx}
            />
          );
        })}

        {/* Cue namespace reference */}
        <section className={`${glassCardNavyClass} p-6`}>
          <h2 className="font-[family-name:var(--font-display)] text-base font-light tracking-wide text-silver-bright">
            Cue Namespace
          </h2>
          <div className="mt-4 space-y-3 text-xs leading-relaxed text-silver">
            <p>
              <strong className="text-gold">SFX-first rollout:</strong> All cues use synthesized
              Tone.js voices. Replace synth implementations with sampled audio after human approval
              in this playground.
            </p>
            <p>
              <strong className="text-gold">Namespace convention:</strong> Cue IDs follow the locked
              contract namespace &mdash; <code className="text-gold/60">hq.*</code>,{" "}
              <code className="text-gold/60">room.*</code>,{" "}
              <code className="text-gold/60">staff.*</code>,{" "}
              <code className="text-gold/60">operator.*</code>,{" "}
              <code className="text-gold/60">raid.*</code>,{" "}
              <code className="text-gold/60">event.*</code>,{" "}
              <code className="text-gold/60">ambience.*</code>
            </p>
            <p>
              <strong className="text-gold">Transient only:</strong> Audio playback state is never
              serialized into saves. The engine is rebuilt from scratch on session load.
            </p>
          </div>
          <div className="mt-5 flex items-center gap-3">
            <span className="badge badge-gold">sfx-first</span>
            <span className="badge badge-slate">{STARTER_CUES.length} cues</span>
            <span className="text-xs text-silver/60">
              Tone.js runtime &mdash; synth voices for Phase 1 review
            </span>
          </div>
        </section>
      </main>
    </div>
  );
}

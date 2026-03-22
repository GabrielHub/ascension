/**
 * Audio engine wrapping Tone.js for Phase 1.
 *
 * Owns: AudioContext unlock, bus routing, cue playback, ambience management.
 * Does not own: cue definitions (see cues.ts), save persistence (never).
 *
 * Playback state is entirely transient. Nothing from this module is serialized.
 */

import * as Tone from "tone";

import { STARTER_CUE_MAP, type AudioCueId, type CuePlayContext } from "./cues";
import { createMusicScheduler } from "./music";

// ─── Engine state ────────────────────────────────────────────────────────────

export type AudioEngineState = "suspended" | "running" | "closed";

export interface AudioEngine {
  readonly state: AudioEngineState;
  readonly sfxVolume: number;
  readonly musicVolume: number;
  readonly activeAmbienceId: AudioCueId | null;
  readonly isMusicPlaying: boolean;

  unlock(): Promise<void>;
  playCue(id: AudioCueId): void;
  startAmbience(id: AudioCueId): void;
  stopAmbience(): void;
  startMusic(): void;
  stopMusic(): void;
  setSfxVolume(db: number): void;
  setMusicVolume(db: number): void;
  dispose(): void;

  subscribe(listener: AudioEngineListener): () => void;
}

export type AudioEngineListener = (engine: AudioEngine) => void;

// ─── Implementation ──────────────────────────────────────────────────────────

export function createAudioEngine(): AudioEngine {
  const sfxBus = new Tone.Channel({ volume: -6 }).toDestination();
  const ambienceBus = new Tone.Channel({ volume: -12 }).toDestination();
  const listeners = new Set<AudioEngineListener>();
  const music = createMusicScheduler({ Tone, bus: ambienceBus });

  let closed = false;
  let activeAmbienceId: AudioCueId | null = null;
  let ambienceStopFn: (() => void) | undefined;

  const notify = () => {
    listeners.forEach((fn) => fn(engine));
  };

  const getPlayContext = (
    registerActiveAmbienceStop: CuePlayContext["registerActiveAmbienceStop"] = () => undefined,
  ): CuePlayContext => ({
    Tone,
    sfxBus,
    ambienceBus,
    registerActiveAmbienceStop,
  });

  const engine: AudioEngine = {
    get state(): AudioEngineState {
      if (closed) return "closed";
      return Tone.getContext().state === "running" ? "running" : "suspended";
    },

    get sfxVolume() {
      return sfxBus.volume.value;
    },

    get musicVolume() {
      return ambienceBus.volume.value;
    },

    get isMusicPlaying() {
      return music.playing;
    },

    get activeAmbienceId() {
      return activeAmbienceId;
    },

    async unlock() {
      if (closed) return;
      await Tone.start();
      notify();
    },

    playCue(id) {
      if (closed || engine.state !== "running") return;

      const cue = STARTER_CUE_MAP.get(id);
      if (!cue || cue.kind !== "sfx") return;

      cue.play(getPlayContext());
    },

    startAmbience(id) {
      if (closed || engine.state !== "running") return;

      const cue = STARTER_CUE_MAP.get(id);
      if (!cue || cue.kind !== "ambience") return;
      if (activeAmbienceId === id && ambienceStopFn) return;

      if (ambienceStopFn) {
        ambienceStopFn();
        ambienceStopFn = undefined;
      }

      let nextAmbienceStop: (() => void) | undefined;
      cue.play(
        getPlayContext((stop) => {
          nextAmbienceStop = stop;
        }),
      );

      ambienceStopFn = nextAmbienceStop;
      activeAmbienceId = id;
      notify();
    },

    stopAmbience() {
      const hadActiveAmbience = activeAmbienceId !== null || ambienceStopFn !== undefined;
      if (ambienceStopFn) {
        ambienceStopFn();
        ambienceStopFn = undefined;
      }

      if (!hadActiveAmbience) {
        return;
      }

      activeAmbienceId = null;
      notify();
    },

    startMusic() {
      if (closed || engine.state !== "running") return;
      music.start();
      notify();
    },

    stopMusic() {
      music.stop();
      notify();
    },

    setSfxVolume(db) {
      sfxBus.volume.value = db;
      notify();
    },

    setMusicVolume(db) {
      ambienceBus.volume.value = db;
      notify();
    },

    dispose() {
      if (closed) return;
      closed = true;

      if (ambienceStopFn) {
        ambienceStopFn();
        ambienceStopFn = undefined;
      }
      activeAmbienceId = null;

      music.dispose();
      sfxBus.dispose();
      ambienceBus.dispose();
      listeners.clear();
    },

    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };

  return engine;
}

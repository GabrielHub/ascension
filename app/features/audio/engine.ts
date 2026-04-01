/**
 * Audio engine wrapping Tone.js for Phase 1.
 *
 * Owns: AudioContext unlock, bus routing, cue playback, music scheduling.
 * Does not own: cue definitions (see cues.ts), save persistence (never).
 *
 * Playback state is entirely transient. Nothing from this module is serialized.
 */

import * as Tone from "tone";

import { STARTER_CUE_MAP, type AudioCueId, type CuePlayContext } from "./cues";
import { createMusicScheduler } from "./music";
import type { MusicState } from "./state";

// ─── Engine state ────────────────────────────────────────────────────────────

export type AudioEngineState = "suspended" | "running" | "closed";

export interface AudioEngine {
  readonly state: AudioEngineState;
  readonly sfxVolume: number;
  readonly musicVolume: number;
  readonly isMusicPlaying: boolean;
  readonly musicState: MusicState;

  unlock(): Promise<void>;
  playCue(id: AudioCueId): void;
  startMusic(): void;
  stopMusic(): void;
  setMusicState(state: MusicState): void;
  setSfxVolume(db: number): void;
  setMusicVolume(db: number): void;
  dispose(): void;

  subscribe(listener: AudioEngineListener): () => void;
}

export type AudioEngineListener = (engine: AudioEngine) => void;

// ─── Implementation ──────────────────────────────────────────────────────────

export function createAudioEngine(): AudioEngine {
  const sfxBus = new Tone.Channel({ volume: -6 }).toDestination();
  const musicBus = new Tone.Channel({ volume: -12 }).toDestination();
  const listeners = new Set<AudioEngineListener>();
  const music = createMusicScheduler({ Tone, bus: musicBus });

  let closed = false;

  const notify = () => {
    listeners.forEach((fn) => fn(engine));
  };

  const getPlayContext = (): CuePlayContext => ({
    Tone,
    sfxBus,
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
      return musicBus.volume.value;
    },

    get isMusicPlaying() {
      return music.playing;
    },

    get musicState(): MusicState {
      return music.currentState;
    },

    async unlock() {
      if (closed) return;
      await Tone.start();
      notify();
    },

    playCue(id) {
      if (closed || engine.state !== "running") return;

      const cue = STARTER_CUE_MAP.get(id);
      if (!cue) return;

      cue.play(getPlayContext());
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

    setMusicState(state: MusicState) {
      music.setState(state);
    },

    setSfxVolume(db) {
      sfxBus.volume.value = db;
      notify();
    },

    setMusicVolume(db) {
      musicBus.volume.value = db;
      notify();
    },

    dispose() {
      if (closed) return;
      closed = true;

      music.dispose();
      sfxBus.dispose();
      musicBus.dispose();
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

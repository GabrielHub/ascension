/**
 * Intermittent ambient music — Minecraft-style sparse piano phrases.
 *
 * Plays short pentatonic melodic fragments with random silences between them.
 * Each phrase uses a single PolySynth that is disposed after the notes ring out.
 * The scheduler owns no persistent audio state.
 */

import type * as Tone from "tone";

// ─── Public types ───────────────────────────────────────────────────────────

export interface MusicSchedulerContext {
  Tone: typeof Tone;
  bus: Tone.Channel;
}

export interface MusicScheduler {
  readonly playing: boolean;
  start(): void;
  stop(): void;
  dispose(): void;
}

// ─── Phrase definitions ─────────────────────────────────────────────────────

interface PhraseNote {
  note: string;
  /** Seconds from phrase start. */
  time: number;
  /** Hold duration in seconds. */
  dur: number;
}

/**
 * Short pentatonic melodic fragments — sparse, contemplative, single-instrument.
 * Scale: C major pentatonic (C D E G A), octaves 4-5.
 */
const PHRASES: readonly (readonly PhraseNote[])[] = [
  // Gentle ascent
  [
    { note: "C4", time: 0, dur: 2.5 },
    { note: "E4", time: 2.0, dur: 2.0 },
    { note: "G4", time: 4.0, dur: 3.0 },
  ],
  // Arch shape
  [
    { note: "E4", time: 0, dur: 2.0 },
    { note: "G4", time: 1.8, dur: 2.0 },
    { note: "A4", time: 3.5, dur: 2.5 },
    { note: "G4", time: 5.5, dur: 3.0 },
  ],
  // Slow descent
  [
    { note: "A4", time: 0, dur: 2.5 },
    { note: "G4", time: 2.2, dur: 2.0 },
    { note: "E4", time: 4.0, dur: 2.5 },
    { note: "D4", time: 6.0, dur: 3.0 },
  ],
  // Sparse wide intervals
  [
    { note: "C5", time: 0, dur: 3.0 },
    { note: "G4", time: 3.5, dur: 3.0 },
    { note: "C4", time: 7.0, dur: 4.0 },
  ],
  // Small gentle steps
  [
    { note: "D4", time: 0, dur: 2.0 },
    { note: "E4", time: 1.5, dur: 2.0 },
    { note: "D4", time: 3.0, dur: 2.5 },
    { note: "C4", time: 5.0, dur: 3.0 },
  ],
  // Reach up and settle back
  [
    { note: "G4", time: 0, dur: 2.0 },
    { note: "A4", time: 1.8, dur: 2.0 },
    { note: "C5", time: 3.5, dur: 3.0 },
    { note: "A4", time: 6.0, dur: 2.5 },
    { note: "G4", time: 8.0, dur: 3.5 },
  ],
  // Two notes, wide apart
  [
    { note: "E4", time: 0, dur: 3.5 },
    { note: "C5", time: 4.0, dur: 4.0 },
  ],
  // Quicker rhythm
  [
    { note: "G4", time: 0, dur: 1.5 },
    { note: "A4", time: 1.2, dur: 1.5 },
    { note: "G4", time: 2.4, dur: 1.5 },
    { note: "E4", time: 3.6, dur: 2.0 },
    { note: "D4", time: 5.0, dur: 3.0 },
  ],
  // Descending thirds
  [
    { note: "A4", time: 0, dur: 2.5 },
    { note: "E4", time: 2.5, dur: 2.5 },
    { note: "G4", time: 5.0, dur: 2.0 },
    { note: "D4", time: 7.0, dur: 3.5 },
  ],
  // Octave mirror
  [
    { note: "E5", time: 0, dur: 3.0 },
    { note: "E4", time: 4.0, dur: 3.5 },
  ],
];

// ─── Timing ─────────────────────────────────────────────────────────────────

const GAP_MIN_S = 12;
const GAP_MAX_S = 35;
const FIRST_DELAY_MIN_S = 3;
const FIRST_DELAY_MAX_S = 8;
const SYNTH_DB = -10;
const RING_BUFFER_S = 5;

// ─── Helpers ────────────────────────────────────────────────────────────────

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function phraseDuration(phrase: readonly PhraseNote[]): number {
  let end = 0;
  for (const n of phrase) {
    const ne = n.time + n.dur;
    if (ne > end) end = ne;
  }
  return end;
}

// ─── Scheduler factory ──────────────────────────────────────────────────────

export function createMusicScheduler(ctx: MusicSchedulerContext): MusicScheduler {
  const { Tone, bus } = ctx;

  let active = false;
  let disposed = false;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let lastIdx = -1;

  interface Disposable {
    dispose(): void;
  }
  const live = new Set<Disposable>();

  function pick(): readonly PhraseNote[] {
    let idx: number;
    do {
      idx = Math.floor(Math.random() * PHRASES.length);
    } while (idx === lastIdx && PHRASES.length > 1);
    lastIdx = idx;
    return PHRASES[idx];
  }

  function play(phrase: readonly PhraseNote[]): void {
    if (!active || disposed) return;

    const synth = new Tone.PolySynth(Tone.Synth, {
      maxPolyphony: phrase.length,
      options: {
        oscillator: { type: "sine" as const },
        envelope: { attack: 0.05, decay: 1.2, sustain: 0.15, release: 3.0 },
      },
    }).connect(bus);
    synth.volume.value = SYNTH_DB;
    live.add(synth);

    const now = Tone.now();
    for (const n of phrase) {
      synth.triggerAttackRelease(n.note, n.dur, now + n.time);
    }

    const disposeMs = (phraseDuration(phrase) + RING_BUFFER_S) * 1000;
    setTimeout(() => {
      live.delete(synth);
      synth.dispose();
    }, disposeMs);
  }

  function scheduleNext(delaySec: number): void {
    if (!active || disposed) return;

    timer = setTimeout(() => {
      timer = null;
      if (!active || disposed) return;

      const phrase = pick();
      play(phrase);

      scheduleNext(phraseDuration(phrase) + rand(GAP_MIN_S, GAP_MAX_S));
    }, delaySec * 1000);
  }

  function clearLive(): void {
    for (const s of live) {
      try {
        s.dispose();
      } catch {
        /* already disposed */
      }
    }
    live.clear();
  }

  return {
    get playing() {
      return active;
    },

    start() {
      if (active || disposed) return;
      active = true;
      scheduleNext(rand(FIRST_DELAY_MIN_S, FIRST_DELAY_MAX_S));
    },

    stop() {
      active = false;
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
      clearLive();
    },

    dispose() {
      if (disposed) return;
      disposed = true;
      active = false;
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
      clearLive();
    },
  };
}

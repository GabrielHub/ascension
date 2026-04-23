/**
 * State-aware ambient music scheduler.
 *
 * Replaces the original global non-stateful scheduler with state-derived
 * phrase families. Each music state (hq, operations, raid-exploration,
 * boss-tension, boss-encounter, decompression) has its own phrase set,
 * synth character, and timing feel.
 *
 * The scheduler owns no persistent audio state. Music state is derived
 * from runtime game state by the shell via audio selectors.
 */

import type * as Tone from "tone";

import type { MusicState } from "./state";

// ─── Public types ───────────────────────────────────────────────────────────

export interface MusicSchedulerContext {
  Tone: typeof Tone;
  bus: Tone.Channel;
}

export interface MusicScheduler {
  readonly playing: boolean;
  readonly currentState: MusicState;
  start(): void;
  stop(): void;
  setState(state: MusicState): void;
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

interface MusicFamily {
  phrases: readonly (readonly PhraseNote[])[];
  oscillator: OscillatorType;
  envelope: { attack: number; decay: number; sustain: number; release: number };
  volumeDb: number;
  gapMin: number;
  gapMax: number;
  firstDelayMin: number;
  firstDelayMax: number;
}

// ─── HQ: Warm, contemplative pentatonic. C major pentatonic (C D E G A). ────

const HQ_PHRASES: readonly (readonly PhraseNote[])[] = [
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

// ─── Operations: Watchful, sparse, slightly tenser. D minor pentatonic. ─────

const OPS_PHRASES: readonly (readonly PhraseNote[])[] = [
  [
    { note: "D4", time: 0, dur: 3.0 },
    { note: "F4", time: 3.5, dur: 2.5 },
    { note: "A4", time: 6.0, dur: 3.0 },
  ],
  [
    { note: "A4", time: 0, dur: 2.0 },
    { note: "G4", time: 2.5, dur: 2.5 },
    { note: "F4", time: 5.0, dur: 3.0 },
  ],
  [
    { note: "D4", time: 0, dur: 2.5 },
    { note: "C5", time: 4.0, dur: 3.5 },
  ],
  [
    { note: "F4", time: 0, dur: 2.0 },
    { note: "G4", time: 2.0, dur: 2.0 },
    { note: "A4", time: 4.0, dur: 2.0 },
    { note: "G4", time: 6.0, dur: 3.0 },
  ],
  [
    { note: "C5", time: 0, dur: 3.0 },
    { note: "A4", time: 3.5, dur: 2.5 },
    { note: "D4", time: 6.5, dur: 4.0 },
  ],
];

// ─── Raid exploration: Dark, deliberate. A minor (A B C E). Lower register. ──

const RAID_PHRASES: readonly (readonly PhraseNote[])[] = [
  [
    { note: "A3", time: 0, dur: 3.5 },
    { note: "C4", time: 4.0, dur: 2.5 },
    { note: "E4", time: 7.0, dur: 3.0 },
  ],
  [
    { note: "E4", time: 0, dur: 2.5 },
    { note: "C4", time: 3.0, dur: 2.5 },
    { note: "B3", time: 6.0, dur: 3.5 },
  ],
  [
    { note: "A3", time: 0, dur: 4.0 },
    { note: "E4", time: 5.0, dur: 4.0 },
  ],
  [
    { note: "C4", time: 0, dur: 2.0 },
    { note: "B3", time: 2.5, dur: 2.0 },
    { note: "A3", time: 5.0, dur: 3.5 },
  ],
  [
    { note: "E3", time: 0, dur: 3.0 },
    { note: "A3", time: 4.0, dur: 3.0 },
    { note: "C4", time: 7.5, dur: 3.5 },
  ],
];

// ─── Boss tension: Dissonant, unsettled. Tritone intervals, sparse. ─────────

const TENSION_PHRASES: readonly (readonly PhraseNote[])[] = [
  [
    { note: "F3", time: 0, dur: 4.0 },
    { note: "B3", time: 5.0, dur: 4.0 },
  ],
  [
    { note: "Bb3", time: 0, dur: 3.0 },
    { note: "E3", time: 4.0, dur: 3.5 },
    { note: "Bb3", time: 8.0, dur: 4.0 },
  ],
  [
    { note: "E3", time: 0, dur: 3.5 },
    { note: "F3", time: 4.5, dur: 3.5 },
  ],
  [
    { note: "B2", time: 0, dur: 5.0 },
    { note: "F3", time: 6.0, dur: 5.0 },
  ],
];

// ─── Boss encounter: Intense, rhythmic, chromatic motion. ───────────────────

const ENCOUNTER_PHRASES: readonly (readonly PhraseNote[])[] = [
  [
    { note: "C3", time: 0, dur: 1.0 },
    { note: "Db3", time: 1.2, dur: 1.0 },
    { note: "C3", time: 2.4, dur: 1.0 },
    { note: "Eb3", time: 3.6, dur: 1.5 },
    { note: "C3", time: 5.5, dur: 2.0 },
  ],
  [
    { note: "Ab3", time: 0, dur: 1.5 },
    { note: "G3", time: 1.8, dur: 1.5 },
    { note: "F3", time: 3.6, dur: 1.5 },
    { note: "E3", time: 5.4, dur: 2.0 },
  ],
  [
    { note: "E3", time: 0, dur: 1.2 },
    { note: "F3", time: 1.5, dur: 1.2 },
    { note: "Ab3", time: 3.0, dur: 1.5 },
    { note: "G3", time: 4.8, dur: 2.5 },
  ],
  [
    { note: "C3", time: 0, dur: 2.0 },
    { note: "G3", time: 2.5, dur: 1.5 },
    { note: "Ab3", time: 4.5, dur: 1.5 },
    { note: "Bb3", time: 6.5, dur: 2.0 },
  ],
];

// ─── Decompression: Resolved, airy, settling. F major (F A C). ──────────────

const DECOMP_PHRASES: readonly (readonly PhraseNote[])[] = [
  [
    { note: "F4", time: 0, dur: 3.5 },
    { note: "A4", time: 4.0, dur: 3.0 },
    { note: "C5", time: 7.5, dur: 4.0 },
  ],
  [
    { note: "C5", time: 0, dur: 3.0 },
    { note: "A4", time: 3.5, dur: 3.0 },
    { note: "F4", time: 7.0, dur: 4.0 },
  ],
  [
    { note: "A4", time: 0, dur: 4.0 },
    { note: "F4", time: 5.0, dur: 4.0 },
  ],
  [
    { note: "F4", time: 0, dur: 2.5 },
    { note: "C5", time: 3.0, dur: 2.5 },
    { note: "A4", time: 6.0, dur: 3.5 },
    { note: "F4", time: 10.0, dur: 4.0 },
  ],
];

// ─── Family definitions ─────────────────────────────────────────────────────

const MUSIC_FAMILIES: Record<MusicState, MusicFamily> = {
  hq: {
    phrases: HQ_PHRASES,
    oscillator: "sine",
    envelope: { attack: 0.05, decay: 1.2, sustain: 0.15, release: 3.0 },
    volumeDb: -10,
    gapMin: 12,
    gapMax: 35,
    firstDelayMin: 3,
    firstDelayMax: 8,
  },
  operations: {
    phrases: OPS_PHRASES,
    oscillator: "triangle",
    envelope: { attack: 0.04, decay: 1.0, sustain: 0.1, release: 2.5 },
    volumeDb: -11,
    gapMin: 15,
    gapMax: 40,
    firstDelayMin: 4,
    firstDelayMax: 10,
  },
  "raid-exploration": {
    phrases: RAID_PHRASES,
    oscillator: "sine",
    envelope: { attack: 0.08, decay: 1.5, sustain: 0.2, release: 3.5 },
    volumeDb: -12,
    gapMin: 10,
    gapMax: 25,
    firstDelayMin: 2,
    firstDelayMax: 6,
  },
  "boss-tension": {
    phrases: TENSION_PHRASES,
    oscillator: "sawtooth",
    envelope: { attack: 0.1, decay: 2.0, sustain: 0.3, release: 4.0 },
    volumeDb: -14,
    gapMin: 6,
    gapMax: 15,
    firstDelayMin: 1,
    firstDelayMax: 4,
  },
  "boss-encounter": {
    phrases: ENCOUNTER_PHRASES,
    oscillator: "square",
    envelope: { attack: 0.02, decay: 0.8, sustain: 0.1, release: 1.5 },
    volumeDb: -13,
    gapMin: 4,
    gapMax: 10,
    firstDelayMin: 1,
    firstDelayMax: 3,
  },
  decompression: {
    phrases: DECOMP_PHRASES,
    oscillator: "sine",
    envelope: { attack: 0.1, decay: 1.8, sustain: 0.25, release: 4.0 },
    volumeDb: -11,
    gapMin: 15,
    gapMax: 40,
    firstDelayMin: 3,
    firstDelayMax: 8,
  },
};

// ─── Timing ─────────────────────────────────────────────────────────────────

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
  let musicState: MusicState = "hq";

  interface Disposable {
    dispose(): void;
  }
  const live = new Set<Disposable>();

  function getFamily(): MusicFamily {
    return MUSIC_FAMILIES[musicState];
  }

  function pick(): readonly PhraseNote[] {
    const family = getFamily();
    let idx: number;
    do {
      idx = Math.floor(Math.random() * family.phrases.length);
    } while (idx === lastIdx && family.phrases.length > 1);
    lastIdx = idx;
    return family.phrases[idx];
  }

  function play(phrase: readonly PhraseNote[]): void {
    if (!active || disposed) return;

    const family = getFamily();
    const synth = new Tone.PolySynth({
      voice: Tone.Synth,
      maxPolyphony: phrase.length,
      options: {
        oscillator: { type: family.oscillator as OscillatorType },
        envelope: family.envelope,
      },
    }).connect(bus);
    synth.volume.value = family.volumeDb;
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

      const family = getFamily();
      const phrase = pick();
      play(phrase);

      scheduleNext(phraseDuration(phrase) + rand(family.gapMin, family.gapMax));
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

    get currentState() {
      return musicState;
    },

    start() {
      if (active || disposed) return;
      active = true;
      const family = getFamily();
      scheduleNext(rand(family.firstDelayMin, family.firstDelayMax));
    },

    stop() {
      active = false;
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
      clearLive();
    },

    setState(state: MusicState) {
      if (state === musicState) return;
      musicState = state;
      lastIdx = -1;

      // If playing, reschedule from the new state's timing.
      // Let currently ringing notes ring out naturally.
      if (active) {
        if (timer !== null) {
          clearTimeout(timer);
          timer = null;
        }
        const family = getFamily();
        scheduleNext(rand(family.firstDelayMin, family.firstDelayMax));
      }
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

/**
 * Audio cue definitions for Phase 1.
 *
 * Cue IDs follow the locked namespace from the contract-lock plan:
 * hq.*, room.*, staff.*, operator.*, raid.*, event.*, ambience.*
 *
 * Each cue defines metadata for the playground and a Tone.js play function
 * that receives the target bus node. Cues must not hold persistent state.
 */

import type * as Tone from "tone";

// ─── Cue ID namespace ────────────────────────────────────────────────────────

export const AUDIO_CUE_IDS = [
  "hq.open",
  "hq.close",
  "hq.upgrade",
  "hq.visitor",
  "hq.dismiss",
  "room.place",
  "room.activate",
  "room.deactivate",
  "staff.hire",
  "staff.assign",
  "operator.recruit",
  "raid.launch",
  "raid.return.success",
  "raid.return.failure",
  "raid.death",
  "raid.opportunity",
  "event.pressure",
] as const;

export type AudioCueId = (typeof AUDIO_CUE_IDS)[number];

export type AudioCueCategory = "hq" | "room" | "staff" | "operator" | "raid" | "event" | "ambience";

export function getCueCategory(id: AudioCueId): AudioCueCategory {
  const prefix = id.split(".")[0];
  return prefix as AudioCueCategory;
}

// ─── Cue definition ──────────────────────────────────────────────────────────

export interface AudioCueDefinition {
  id: AudioCueId;
  label: string;
  description: string;
  category: AudioCueCategory;
  kind: "sfx" | "ambience";
  play: (ctx: CuePlayContext) => void;
}

export interface CuePlayContext {
  Tone: typeof Tone;
  sfxBus: Tone.Channel;
  ambienceBus: Tone.Channel;
  registerActiveAmbienceStop: (stop: () => void) => void;
}

// ─── SFX play helpers ────────────────────────────────────────────────────────

function sfx(meta: Omit<AudioCueDefinition, "kind" | "category">): AudioCueDefinition {
  return { ...meta, kind: "sfx", category: getCueCategory(meta.id) };
}

// ─── Starter cue catalog ────────────────────────────────────────────────────

export const STARTER_CUES: readonly AudioCueDefinition[] = [
  // ── HQ ──
  sfx({
    id: "hq.open",
    label: "HQ Open",
    description: "Warm ascending chime when entering headquarters view.",
    play({ Tone, sfxBus }) {
      const synth = new Tone.Synth({
        oscillator: { type: "triangle" },
        envelope: { attack: 0.01, decay: 0.2, sustain: 0, release: 0.3 },
      }).connect(sfxBus);
      const now = Tone.now();
      synth.triggerAttackRelease("C5", "16n", now);
      synth.triggerAttackRelease("E5", "16n", now + 0.1);
      synth.triggerAttackRelease("G5", "16n", now + 0.2);
      setTimeout(() => synth.dispose(), 2000);
    },
  }),

  sfx({
    id: "hq.close",
    label: "HQ Close",
    description: "Gentle descending tone when leaving headquarters view.",
    play({ Tone, sfxBus }) {
      const synth = new Tone.Synth({
        oscillator: { type: "triangle" },
        envelope: { attack: 0.01, decay: 0.25, sustain: 0, release: 0.4 },
      }).connect(sfxBus);
      const now = Tone.now();
      synth.triggerAttackRelease("G4", "16n", now);
      synth.triggerAttackRelease("E4", "16n", now + 0.1);
      synth.triggerAttackRelease("C4", "16n", now + 0.2);
      setTimeout(() => synth.dispose(), 2000);
    },
  }),

  sfx({
    id: "hq.upgrade",
    label: "Upgrade Purchase",
    description: "Satisfying rising chord when purchasing an upgrade.",
    play({ Tone, sfxBus }) {
      const synth = new Tone.PolySynth(Tone.Synth, {
        options: {
          oscillator: { type: "triangle" },
          envelope: { attack: 0.01, decay: 0.2, sustain: 0.05, release: 0.4 },
        },
      }).connect(sfxBus);
      const now = Tone.now();
      synth.triggerAttackRelease("G4", "16n", now);
      synth.triggerAttackRelease(["B4", "D5"], "8n", now + 0.1);
      synth.triggerAttackRelease("G5", "8n", now + 0.22);
      setTimeout(() => synth.dispose(), 2000);
    },
  }),

  sfx({
    id: "hq.visitor",
    label: "Visitor Arrives",
    description: "Soft doorbell notification when a visitor arrives at HQ.",
    play({ Tone, sfxBus }) {
      const synth = new Tone.Synth({
        oscillator: { type: "sine" },
        envelope: { attack: 0.01, decay: 0.15, sustain: 0, release: 0.2 },
      }).connect(sfxBus);
      synth.volume.value = -8;
      const now = Tone.now();
      synth.triggerAttackRelease("E5", "32n", now);
      synth.triggerAttackRelease("G5", "16n", now + 0.12);
      setTimeout(() => synth.dispose(), 1000);
    },
  }),

  sfx({
    id: "hq.dismiss",
    label: "Visitor Dismissed",
    description: "Soft departure tone when a visitor leaves or is rejected.",
    play({ Tone, sfxBus }) {
      const synth = new Tone.Synth({
        oscillator: { type: "triangle" },
        envelope: { attack: 0.01, decay: 0.18, sustain: 0, release: 0.25 },
      }).connect(sfxBus);
      synth.volume.value = -6;
      const now = Tone.now();
      synth.triggerAttackRelease("D4", "16n", now);
      synth.triggerAttackRelease("Bb3", "8n", now + 0.1);
      setTimeout(() => synth.dispose(), 1500);
    },
  }),

  // ── Room ──
  sfx({
    id: "room.place",
    label: "Room Place",
    description: "Solid satisfying thud when placing a new room.",
    play({ Tone, sfxBus }) {
      const synth = new Tone.MembraneSynth({
        pitchDecay: 0.01,
        octaves: 4,
        envelope: { attack: 0.001, decay: 0.15, sustain: 0, release: 0.1 },
      }).connect(sfxBus);
      synth.triggerAttackRelease("C2", "16n");
      setTimeout(() => synth.dispose(), 1000);
    },
  }),

  sfx({
    id: "room.activate",
    label: "Room Activate",
    description: "Bright ping when a room comes online.",
    play({ Tone, sfxBus }) {
      const synth = new Tone.Synth({
        oscillator: { type: "sine" },
        envelope: { attack: 0.005, decay: 0.15, sustain: 0, release: 0.2 },
      }).connect(sfxBus);
      synth.triggerAttackRelease("E5", "16n");
      setTimeout(() => synth.dispose(), 1000);
    },
  }),

  sfx({
    id: "room.deactivate",
    label: "Room Deactivate",
    description: "Muted low thud when a room goes offline.",
    play({ Tone, sfxBus }) {
      const synth = new Tone.MembraneSynth({
        pitchDecay: 0.02,
        octaves: 3,
        envelope: { attack: 0.001, decay: 0.2, sustain: 0, release: 0.15 },
      }).connect(sfxBus);
      synth.triggerAttackRelease("E2", "8n");
      setTimeout(() => synth.dispose(), 1000);
    },
  }),

  // ── Staff ──
  sfx({
    id: "staff.hire",
    label: "Staff Hire",
    description: "Double confirmation tone when hiring new staff.",
    play({ Tone, sfxBus }) {
      const synth = new Tone.Synth({
        oscillator: { type: "triangle" },
        envelope: { attack: 0.01, decay: 0.12, sustain: 0, release: 0.15 },
      }).connect(sfxBus);
      const now = Tone.now();
      synth.triggerAttackRelease("G4", "32n", now);
      synth.triggerAttackRelease("C5", "32n", now + 0.08);
      setTimeout(() => synth.dispose(), 1000);
    },
  }),

  sfx({
    id: "staff.assign",
    label: "Staff Assign",
    description: "Subtle click when assigning staff to a room.",
    play({ Tone, sfxBus }) {
      const synth = new Tone.NoiseSynth({
        noise: { type: "white" },
        envelope: { attack: 0.001, decay: 0.04, sustain: 0, release: 0.01 },
      }).connect(sfxBus);
      synth.triggerAttackRelease("32n");
      setTimeout(() => synth.dispose(), 500);
    },
  }),

  // ── Operator ──
  sfx({
    id: "operator.recruit",
    label: "Operator Recruit",
    description: "Rising chord when accepting a new operator.",
    play({ Tone, sfxBus }) {
      const synth = new Tone.PolySynth(Tone.Synth, {
        options: {
          oscillator: { type: "triangle" },
          envelope: { attack: 0.02, decay: 0.3, sustain: 0.1, release: 0.5 },
        },
      }).connect(sfxBus);
      synth.triggerAttackRelease(["C4", "E4", "G4", "C5"], "4n");
      setTimeout(() => synth.dispose(), 2000);
    },
  }),

  // ── Raid ──
  sfx({
    id: "raid.launch",
    label: "Raid Launch",
    description: "Tense metallic hit when a raid team deploys.",
    play({ Tone, sfxBus }) {
      const synth = new Tone.MetalSynth({
        frequency: 200,
        envelope: { attack: 0.001, decay: 0.2, release: 0.15 },
        harmonicity: 3.1,
        modulationIndex: 16,
        resonance: 2000,
        octaves: 1,
      }).connect(sfxBus);
      synth.volume.value = -12;
      synth.triggerAttackRelease("16n");
      setTimeout(() => synth.dispose(), 1500);
    },
  }),

  sfx({
    id: "raid.return.success",
    label: "Raid Success",
    description: "Triumphant short fanfare on successful raid return.",
    play({ Tone, sfxBus }) {
      const synth = new Tone.PolySynth(Tone.Synth, {
        options: {
          oscillator: { type: "triangle" },
          envelope: { attack: 0.02, decay: 0.2, sustain: 0.1, release: 0.4 },
        },
      }).connect(sfxBus);
      const now = Tone.now();
      synth.triggerAttackRelease(["C4", "E4", "G4"], "8n", now);
      synth.triggerAttackRelease(["C5", "E5", "G5"], "4n", now + 0.2);
      setTimeout(() => synth.dispose(), 2000);
    },
  }),

  sfx({
    id: "raid.return.failure",
    label: "Raid Failure",
    description: "Somber descending tone on failed raid return.",
    play({ Tone, sfxBus }) {
      const synth = new Tone.Synth({
        oscillator: { type: "sine" },
        envelope: { attack: 0.05, decay: 0.4, sustain: 0.1, release: 0.6 },
      }).connect(sfxBus);
      const now = Tone.now();
      synth.triggerAttackRelease("Eb4", "4n", now);
      synth.triggerAttackRelease("Bb3", "2n", now + 0.3);
      setTimeout(() => synth.dispose(), 3000);
    },
  }),

  sfx({
    id: "raid.death",
    label: "Operator Death",
    description: "Heavy low sustained tone for permanent operator loss.",
    play({ Tone, sfxBus }) {
      const synth = new Tone.Synth({
        oscillator: { type: "sine" },
        envelope: { attack: 0.1, decay: 0.8, sustain: 0.2, release: 1.0 },
      }).connect(sfxBus);
      synth.volume.value = -6;
      synth.triggerAttackRelease("C2", "1n");
      setTimeout(() => synth.dispose(), 4000);
    },
  }),

  sfx({
    id: "raid.opportunity",
    label: "Raid Opportunity",
    description: "Crisp alert when a new raid opportunity becomes available.",
    play({ Tone, sfxBus }) {
      const synth = new Tone.Synth({
        oscillator: { type: "square" },
        envelope: { attack: 0.005, decay: 0.1, sustain: 0, release: 0.08 },
      }).connect(sfxBus);
      synth.volume.value = -10;
      const now = Tone.now();
      synth.triggerAttackRelease("G4", "32n", now);
      synth.triggerAttackRelease("D5", "16n", now + 0.1);
      setTimeout(() => synth.dispose(), 1000);
    },
  }),

  // ── Event ──
  sfx({
    id: "event.pressure",
    label: "Pressure Event",
    description: "Sharp alert tone for incoming pressure events.",
    play({ Tone, sfxBus }) {
      const synth = new Tone.Synth({
        oscillator: { type: "square" },
        envelope: { attack: 0.001, decay: 0.08, sustain: 0, release: 0.05 },
      }).connect(sfxBus);
      synth.volume.value = -10;
      const now = Tone.now();
      synth.triggerAttackRelease("Bb5", "32n", now);
      synth.triggerAttackRelease("Bb5", "32n", now + 0.15);
      setTimeout(() => synth.dispose(), 1000);
    },
  }),
];

export const STARTER_CUE_MAP = new Map<AudioCueId, AudioCueDefinition>(
  STARTER_CUES.map((cue) => [cue.id, cue]),
);

export function groupCuesByCategory(): Map<AudioCueCategory, AudioCueDefinition[]> {
  const groups = new Map<AudioCueCategory, AudioCueDefinition[]>();
  for (const cue of STARTER_CUES) {
    const list = groups.get(cue.category) ?? [];
    list.push(cue);
    groups.set(cue.category, list);
  }
  return groups;
}

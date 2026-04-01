/**
 * Audio cue definitions for Phase 1.
 *
 * Cue IDs follow the locked namespace from the contract-lock plan:
 * hq.*, room.*, staff.*, operator.*, raid.*, event.*
 *
 * Each cue defines metadata for the playground and a Tone.js play function
 * that receives the target SFX bus. Cues must not hold persistent state.
 */

import type * as Tone from "tone";
import { RUNTIME_CUE_IDS } from "lib/runtime-cues";

// ─── Cue ID namespace ────────────────────────────────────────────────────────

const APP_ONLY_AUDIO_CUE_IDS = [
  // ── HQ ──
  "hq.open",
  "hq.close",
  "hq.upgrade",
  "hq.floor.switch",
  "hq.market.buy",
  "hq.market.sell",
  "hq.equip",
  "hq.unequip",
  "hq.prep",
  // ── Room ──
  "room.place",
  "room.activate",
  "room.deactivate",
  // ── Staff ──
  "staff.hire",
  "staff.assign",
  // ── Operator ──
  "operator.recruit",
  "raid.contract.bid",
  "raid.contract.advance",
  // ── Event ──
  "event.incident.resolve",
  "event.interruption.resolve",
] as const;

export const AUDIO_CUE_IDS = [...APP_ONLY_AUDIO_CUE_IDS, ...RUNTIME_CUE_IDS] as const;

export type AudioCueId = (typeof AUDIO_CUE_IDS)[number];

export type AudioCueCategory = "hq" | "room" | "staff" | "operator" | "raid" | "event";

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
  kind: "sfx";
  play: (ctx: CuePlayContext) => void;
}

export interface CuePlayContext {
  Tone: typeof Tone;
  sfxBus: Tone.Channel;
}

// ─── SFX play helpers ────────────────────────────────────────────────────────

function sfx(meta: Omit<AudioCueDefinition, "kind" | "category">): AudioCueDefinition {
  return { ...meta, kind: "sfx", category: getCueCategory(meta.id) };
}

/** Factory for two-note coin chime SFX (shared by market buy/sell). */
function coinChimePlayer(noteA: string, noteB: string): AudioCueDefinition["play"] {
  return ({ Tone, sfxBus }) => {
    const synth = new Tone.Synth({
      oscillator: { type: "triangle" },
      envelope: { attack: 0.005, decay: 0.12, sustain: 0, release: 0.15 },
    }).connect(sfxBus);
    synth.volume.value = -8;
    const now = Tone.now();
    synth.triggerAttackRelease(noteA, "32n", now);
    synth.triggerAttackRelease(noteB, "32n", now + 0.06);
    setTimeout(() => synth.dispose(), 800);
  };
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
    id: "raid.boss.approach",
    label: "Boss Approach",
    description: "Low alert pulse when a raid reaches the boss threshold.",
    play({ Tone, sfxBus }) {
      const synth = new Tone.Synth({
        oscillator: { type: "sawtooth" },
        envelope: { attack: 0.01, decay: 0.25, sustain: 0.05, release: 0.3 },
      }).connect(sfxBus);
      synth.volume.value = -11;
      const now = Tone.now();
      synth.triggerAttackRelease("F2", "8n", now);
      synth.triggerAttackRelease("Bb2", "8n", now + 0.18);
      setTimeout(() => synth.dispose(), 1800);
    },
  }),

  sfx({
    id: "raid.boss.commit",
    label: "Boss Commit",
    description: "Sharp activation hit when Boss commits the team to the encounter.",
    play({ Tone, sfxBus }) {
      const synth = new Tone.MetalSynth({
        frequency: 260,
        envelope: { attack: 0.001, decay: 0.28, release: 0.18 },
        harmonicity: 4,
        modulationIndex: 20,
        resonance: 2600,
        octaves: 1.5,
      }).connect(sfxBus);
      synth.volume.value = -10;
      synth.triggerAttackRelease("16n");
      setTimeout(() => synth.dispose(), 1500);
    },
  }),

  sfx({
    id: "raid.boss.phase",
    label: "Boss Phase Shift",
    description: "Rising unstable sweep for a boss phase transition.",
    play({ Tone, sfxBus }) {
      const synth = new Tone.Synth({
        oscillator: { type: "square" },
        envelope: { attack: 0.02, decay: 0.3, sustain: 0.1, release: 0.35 },
      }).connect(sfxBus);
      synth.volume.value = -8;
      const now = Tone.now();
      synth.triggerAttackRelease("C4", "16n", now);
      synth.triggerAttackRelease("G4", "16n", now + 0.08);
      synth.triggerAttackRelease("D5", "8n", now + 0.18);
      setTimeout(() => synth.dispose(), 1800);
    },
  }),

  sfx({
    id: "raid.boss.summon",
    label: "Boss Summon",
    description: "Staccato chittering tone when the boss brings adds into play.",
    play({ Tone, sfxBus }) {
      const synth = new Tone.Synth({
        oscillator: { type: "triangle" },
        envelope: { attack: 0.001, decay: 0.08, sustain: 0, release: 0.05 },
      }).connect(sfxBus);
      synth.volume.value = -10;
      const now = Tone.now();
      synth.triggerAttackRelease("A4", "32n", now);
      synth.triggerAttackRelease("C5", "32n", now + 0.05);
      synth.triggerAttackRelease("E5", "32n", now + 0.1);
      setTimeout(() => synth.dispose(), 1200);
    },
  }),

  sfx({
    id: "raid.boss.victory",
    label: "Boss Victory",
    description: "Short brass-like fanfare on boss defeat.",
    play({ Tone, sfxBus }) {
      const synth = new Tone.PolySynth(Tone.Synth, {
        options: {
          oscillator: { type: "triangle" },
          envelope: { attack: 0.02, decay: 0.24, sustain: 0.08, release: 0.45 },
        },
      }).connect(sfxBus);
      const now = Tone.now();
      synth.triggerAttackRelease(["C4", "G4"], "8n", now);
      synth.triggerAttackRelease(["E4", "B4", "E5"], "4n", now + 0.16);
      setTimeout(() => synth.dispose(), 2200);
    },
  }),

  sfx({
    id: "raid.boss.failure",
    label: "Boss Failure",
    description: "Muted descending alarm for retreats or failed boss encounters.",
    play({ Tone, sfxBus }) {
      const synth = new Tone.Synth({
        oscillator: { type: "sine" },
        envelope: { attack: 0.02, decay: 0.3, sustain: 0.06, release: 0.5 },
      }).connect(sfxBus);
      synth.volume.value = -8;
      const now = Tone.now();
      synth.triggerAttackRelease("D4", "8n", now);
      synth.triggerAttackRelease("Bb3", "8n", now + 0.18);
      synth.triggerAttackRelease("F3", "4n", now + 0.34);
      setTimeout(() => synth.dispose(), 2200);
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

  // ── HQ (new) ──
  sfx({
    id: "hq.floor.switch",
    label: "Floor Switch",
    description: "Soft elevator-like whoosh when switching floors.",
    play({ Tone, sfxBus }) {
      const synth = new Tone.NoiseSynth({
        noise: { type: "pink" },
        envelope: { attack: 0.02, decay: 0.15, sustain: 0, release: 0.1 },
      }).connect(sfxBus);
      synth.volume.value = -14;
      synth.triggerAttackRelease("8n");
      setTimeout(() => synth.dispose(), 800);
    },
  }),

  sfx({
    id: "hq.market.buy",
    label: "Market Buy",
    description: "Bright coin-like chime when purchasing an item.",
    play: coinChimePlayer("A5", "E5"),
  }),

  sfx({
    id: "hq.market.sell",
    label: "Market Sell",
    description: "Descending coin tone when selling an item.",
    play: coinChimePlayer("E5", "A4"),
  }),

  sfx({
    id: "hq.equip",
    label: "Equip Item",
    description: "Short metallic lock-in when equipping gear.",
    play({ Tone, sfxBus }) {
      const synth = new Tone.MetalSynth({
        frequency: 300,
        envelope: { attack: 0.001, decay: 0.08, release: 0.05 },
        harmonicity: 5,
        modulationIndex: 8,
        resonance: 3000,
        octaves: 1,
      }).connect(sfxBus);
      synth.volume.value = -16;
      synth.triggerAttackRelease("32n");
      setTimeout(() => synth.dispose(), 600);
    },
  }),

  sfx({
    id: "hq.unequip",
    label: "Unequip Item",
    description: "Soft release click when unequipping gear.",
    play({ Tone, sfxBus }) {
      const synth = new Tone.NoiseSynth({
        noise: { type: "white" },
        envelope: { attack: 0.001, decay: 0.06, sustain: 0, release: 0.02 },
      }).connect(sfxBus);
      synth.volume.value = -12;
      synth.triggerAttackRelease("32n");
      setTimeout(() => synth.dispose(), 500);
    },
  }),

  sfx({
    id: "hq.prep",
    label: "Prep Consumable",
    description: "Bubbling mortar-and-pestle tone when prepping a consumable.",
    play({ Tone, sfxBus }) {
      const synth = new Tone.Synth({
        oscillator: { type: "sine" },
        envelope: { attack: 0.01, decay: 0.1, sustain: 0.02, release: 0.15 },
      }).connect(sfxBus);
      synth.volume.value = -8;
      const now = Tone.now();
      synth.triggerAttackRelease("G4", "32n", now);
      synth.triggerAttackRelease("B4", "32n", now + 0.08);
      synth.triggerAttackRelease("D5", "32n", now + 0.16);
      setTimeout(() => synth.dispose(), 1000);
    },
  }),

  sfx({
    id: "hq.relocation.offer",
    label: "Relocation Offer",
    description: "Anticipatory ascending tone when relocation is offered.",
    play({ Tone, sfxBus }) {
      const synth = new Tone.Synth({
        oscillator: { type: "sine" },
        envelope: { attack: 0.03, decay: 0.3, sustain: 0.1, release: 0.4 },
      }).connect(sfxBus);
      const now = Tone.now();
      synth.triggerAttackRelease("C4", "8n", now);
      synth.triggerAttackRelease("E4", "8n", now + 0.2);
      synth.triggerAttackRelease("G4", "8n", now + 0.4);
      synth.triggerAttackRelease("C5", "4n", now + 0.6);
      setTimeout(() => synth.dispose(), 2500);
    },
  }),

  sfx({
    id: "hq.relocation.confirm",
    label: "Relocation Confirmed",
    description: "Grand chord when relocation is confirmed.",
    play({ Tone, sfxBus }) {
      const synth = new Tone.PolySynth(Tone.Synth, {
        options: {
          oscillator: { type: "triangle" },
          envelope: { attack: 0.04, decay: 0.4, sustain: 0.15, release: 0.6 },
        },
      }).connect(sfxBus);
      const now = Tone.now();
      synth.triggerAttackRelease(["C4", "E4", "G4"], "4n", now);
      synth.triggerAttackRelease(["C5", "E5", "G5"], "2n", now + 0.25);
      setTimeout(() => synth.dispose(), 3000);
    },
  }),

  sfx({
    id: "hq.relocation.land",
    label: "Relocation Landing",
    description: "Warm arrival tone when settling into the new headquarters.",
    play({ Tone, sfxBus }) {
      const synth = new Tone.PolySynth(Tone.Synth, {
        options: {
          oscillator: { type: "sine" },
          envelope: { attack: 0.08, decay: 0.5, sustain: 0.2, release: 0.8 },
        },
      }).connect(sfxBus);
      synth.volume.value = -4;
      synth.triggerAttackRelease(["G3", "B3", "D4", "G4"], "1n");
      setTimeout(() => synth.dispose(), 4000);
    },
  }),

  // ── Raid (new) ──
  sfx({
    id: "raid.contract.bid",
    label: "Contract Bid",
    description: "Confident stamp when bidding on a contract.",
    play({ Tone, sfxBus }) {
      const synth = new Tone.MembraneSynth({
        pitchDecay: 0.01,
        octaves: 3,
        envelope: { attack: 0.001, decay: 0.12, sustain: 0, release: 0.08 },
      }).connect(sfxBus);
      synth.volume.value = -6;
      synth.triggerAttackRelease("G2", "16n");
      setTimeout(() => synth.dispose(), 800);
    },
  }),

  sfx({
    id: "raid.contract.advance",
    label: "Contract Advance",
    description: "Short forward step when advancing to the next contract cycle.",
    play({ Tone, sfxBus }) {
      const synth = new Tone.Synth({
        oscillator: { type: "triangle" },
        envelope: { attack: 0.01, decay: 0.15, sustain: 0, release: 0.12 },
      }).connect(sfxBus);
      synth.volume.value = -8;
      const now = Tone.now();
      synth.triggerAttackRelease("D4", "32n", now);
      synth.triggerAttackRelease("G4", "16n", now + 0.08);
      setTimeout(() => synth.dispose(), 800);
    },
  }),

  // ── Event (existing + new) ──
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

  sfx({
    id: "event.incident.open",
    label: "Incident Open",
    description: "Urgent attention tone when an incident demands a decision.",
    play({ Tone, sfxBus }) {
      const synth = new Tone.Synth({
        oscillator: { type: "sawtooth" },
        envelope: { attack: 0.005, decay: 0.15, sustain: 0.03, release: 0.2 },
      }).connect(sfxBus);
      synth.volume.value = -9;
      const now = Tone.now();
      synth.triggerAttackRelease("Eb4", "16n", now);
      synth.triggerAttackRelease("Ab4", "16n", now + 0.12);
      setTimeout(() => synth.dispose(), 1200);
    },
  }),

  sfx({
    id: "event.incident.resolve",
    label: "Incident Resolved",
    description: "Settling tone when an incident decision is made.",
    play({ Tone, sfxBus }) {
      const synth = new Tone.Synth({
        oscillator: { type: "triangle" },
        envelope: { attack: 0.01, decay: 0.2, sustain: 0, release: 0.25 },
      }).connect(sfxBus);
      synth.volume.value = -8;
      const now = Tone.now();
      synth.triggerAttackRelease("Ab4", "16n", now);
      synth.triggerAttackRelease("Eb4", "8n", now + 0.1);
      setTimeout(() => synth.dispose(), 1200);
    },
  }),

  sfx({
    id: "event.interruption.open",
    label: "Interruption Open",
    description: "Soft attention chime when an interruption surfaces.",
    play({ Tone, sfxBus }) {
      const synth = new Tone.Synth({
        oscillator: { type: "sine" },
        envelope: { attack: 0.01, decay: 0.18, sustain: 0.02, release: 0.2 },
      }).connect(sfxBus);
      synth.volume.value = -8;
      const now = Tone.now();
      synth.triggerAttackRelease("D5", "16n", now);
      synth.triggerAttackRelease("F#5", "16n", now + 0.1);
      setTimeout(() => synth.dispose(), 1000);
    },
  }),

  sfx({
    id: "event.interruption.resolve",
    label: "Interruption Resolved",
    description: "Soft close when an interruption is resolved or dismissed.",
    play({ Tone, sfxBus }) {
      const synth = new Tone.Synth({
        oscillator: { type: "sine" },
        envelope: { attack: 0.01, decay: 0.15, sustain: 0, release: 0.18 },
      }).connect(sfxBus);
      synth.volume.value = -10;
      synth.triggerAttackRelease("F#4", "16n");
      setTimeout(() => synth.dispose(), 800);
    },
  }),

  sfx({
    id: "event.guidance.beat",
    label: "Guidance Beat",
    description: "Gentle nudge tone when a guidance beat appears.",
    play({ Tone, sfxBus }) {
      const synth = new Tone.Synth({
        oscillator: { type: "sine" },
        envelope: { attack: 0.02, decay: 0.2, sustain: 0, release: 0.25 },
      }).connect(sfxBus);
      synth.volume.value = -12;
      synth.triggerAttackRelease("A4", "16n");
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

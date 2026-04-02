import type { BossProfile } from "./shared";

/**
 * Standalone boss template registry.
 *
 * Each site concept references a bossId from this registry. The boss is the
 * dungeon anchor — different mission types at the same site face the same boss.
 *
 * The 3 original bosses are duplicated here from missions.ts so the registry
 * is the single authoritative source for boss encounter data going forward.
 */
export const bossTemplates: readonly BossProfile[] = [
  // ── Existing bosses (extracted from missions.ts) ────────────────────

  {
    bossId: "boss/tunneler-brood-mother",
    name: "Tunneler Brood-Mother",
    rank: "f",
    phases: 2,
    tags: ["boss:area-damage", "boss:summon-pressure"],
    weaknesses: [{ kind: "role", target: "role:field_lead", multiplier: 1.3 }],
    attack: 35,
    defense: 25,
    hp: 100,
    speed: 20,
    threat: 60,
    dropTableId: "drop-table/tunneler-brood-mother",
    encounter: {
      elapsedMinutes: 42,
      targetingPriority: "frontline",
      phases: [
        {
          phaseIndex: 0,
          hpThresholdFraction: 1,
          statModifiers: {},
          actionIds: ["action/brood-rush", "action/tunnel-breach", "action/chitin-screech"],
          onEnterEffects: [],
        },
        {
          phaseIndex: 1,
          hpThresholdFraction: 0.55,
          statModifiers: { attack: 4, speed: 3 },
          actionIds: [
            "action/brood-rush",
            "action/tunnel-breach",
            "action/egg-burst",
            "action/feeding-frenzy",
          ],
          onEnterEffects: [{ kind: "apply_status", statusId: "hastened", duration: 2, potency: 8 }],
          summonIds: ["summon/broodling"],
        },
      ],
      actions: [
        {
          id: "action/brood-rush",
          name: "Brood Rush",
          weight: 36,
          cooldown: 0,
          targeting: "enemy_single",
          effects: [
            { kind: "damage", basePower: 15, scalingStat: "strength", scalingFactor: 0.85 },
          ],
        },
        {
          id: "action/tunnel-breach",
          name: "Tunnel Breach",
          weight: 26,
          cooldown: 2,
          targeting: "all_enemies",
          effects: [
            { kind: "damage", basePower: 8, scalingStat: "strength", scalingFactor: 0.6 },
            { kind: "apply_status", statusId: "staggered", duration: 1, potency: 10 },
          ],
        },
        {
          id: "action/chitin-screech",
          name: "Chitin Screech",
          weight: 18,
          cooldown: 3,
          targeting: "all_enemies",
          effects: [{ kind: "apply_status", statusId: "suppressed", duration: 2, potency: 8 }],
        },
        {
          id: "action/egg-burst",
          name: "Egg Burst",
          weight: 12,
          cooldown: 3,
          targeting: "enemy_single",
          effects: [
            { kind: "damage", basePower: 20, scalingStat: "strength", scalingFactor: 1 },
            { kind: "apply_status", statusId: "bleeding", duration: 2, potency: 8 },
          ],
          phaseIndices: [1],
        },
        {
          id: "action/feeding-frenzy",
          name: "Feeding Frenzy",
          weight: 8,
          cooldown: 4,
          targeting: "enemy_lowest_hp",
          effects: [
            { kind: "damage", basePower: 24, scalingStat: "strength", scalingFactor: 1.05 },
          ],
          phaseIndices: [1],
        },
      ],
      reactionHooks: [
        {
          trigger: "on_phase_enter",
          target: "all_allies",
          effects: [{ kind: "damage", basePower: 10, scalingStat: "strength", scalingFactor: 0.5 }],
          usesRemaining: 1,
        },
      ],
      summonDefinitions: [
        {
          summonId: "summon/broodling",
          label: "Broodling",
          stats: { attack: 7, defense: 5, hp: 28, speed: 12, threat: 24 },
          actions: [
            {
              id: "action/broodling-bite",
              name: "Broodling Bite",
              weight: 100,
              cooldown: 0,
              targeting: "enemy_lowest_hp",
              effects: [
                { kind: "damage", basePower: 7, scalingStat: "strength", scalingFactor: 0.4 },
              ],
            },
          ],
        },
      ],
    },
  },

  {
    bossId: "boss/sewer-warden",
    name: "Sewer Warden",
    rank: "f",
    phases: 1,
    tags: ["boss:resilience-pierce", "boss:recovery-suppress"],
    weaknesses: [{ kind: "stat", target: "resilience", multiplier: 1.25 }],
    attack: 28,
    defense: 35,
    hp: 80,
    speed: 15,
    threat: 50,
    dropTableId: "drop-table/sewer-warden",
    encounter: {
      elapsedMinutes: 34,
      targetingPriority: "highest_threat",
      phases: [
        {
          phaseIndex: 0,
          hpThresholdFraction: 1,
          statModifiers: {},
          actionIds: ["action/pipe-lash", "action/backflow", "action/maintenance-seal"],
          onEnterEffects: [],
        },
      ],
      actions: [
        {
          id: "action/pipe-lash",
          name: "Pipe Lash",
          weight: 42,
          cooldown: 0,
          targeting: "enemy_highest_threat",
          effects: [{ kind: "damage", basePower: 13, scalingStat: "strength", scalingFactor: 0.8 }],
        },
        {
          id: "action/backflow",
          name: "Backflow",
          weight: 32,
          cooldown: 2,
          targeting: "all_enemies",
          effects: [
            { kind: "damage", basePower: 7, scalingStat: "strength", scalingFactor: 0.45 },
            { kind: "apply_status", statusId: "slowed", duration: 2, potency: 8 },
          ],
        },
        {
          id: "action/maintenance-seal",
          name: "Maintenance Seal",
          weight: 26,
          cooldown: 3,
          targeting: "boss",
          effects: [
            { kind: "shield", basePower: 14, scalingStat: "resilience", scalingFactor: 0.35 },
          ],
        },
      ],
    },
  },

  {
    bossId: "boss/phantom-stalker",
    name: "Phantom Stalker",
    rank: "f",
    phases: 2,
    tags: ["boss:speed-drain", "boss:intel-resist"],
    weaknesses: [
      { kind: "role", target: "role:scout", multiplier: 1.35 },
      { kind: "stat", target: "perception", multiplier: 1.2 },
    ],
    attack: 40,
    defense: 20,
    hp: 70,
    speed: 45,
    threat: 55,
    dropTableId: "drop-table/phantom-stalker",
    encounter: {
      elapsedMinutes: 36,
      targetingPriority: "lowest_hp",
      phases: [
        {
          phaseIndex: 0,
          hpThresholdFraction: 1,
          statModifiers: {},
          actionIds: ["action/blindside", "action/signal-fade", "action/afterimage-pounce"],
          onEnterEffects: [],
        },
        {
          phaseIndex: 1,
          hpThresholdFraction: 0.5,
          statModifiers: { speed: 6, attack: 3 },
          actionIds: [
            "action/blindside",
            "action/signal-fade",
            "action/afterimage-pounce",
            "action/vanishing-angle",
          ],
          onEnterEffects: [
            { kind: "apply_status", statusId: "fortified", duration: 2, potency: 6 },
          ],
        },
      ],
      actions: [
        {
          id: "action/blindside",
          name: "Blindside",
          weight: 34,
          cooldown: 0,
          targeting: "enemy_lowest_hp",
          effects: [{ kind: "damage", basePower: 14, scalingStat: "strength", scalingFactor: 0.9 }],
        },
        {
          id: "action/signal-fade",
          name: "Signal Fade",
          weight: 28,
          cooldown: 2,
          targeting: "all_enemies",
          effects: [
            { kind: "apply_status", statusId: "suppressed", duration: 2, potency: 8 },
            { kind: "modify_threat", delta: -8 },
          ],
        },
        {
          id: "action/afterimage-pounce",
          name: "Afterimage Pounce",
          weight: 22,
          cooldown: 2,
          targeting: "random_enemy",
          effects: [
            { kind: "damage", basePower: 18, scalingStat: "strength", scalingFactor: 0.95 },
            { kind: "apply_status", statusId: "marked", duration: 2, potency: 6 },
          ],
        },
        {
          id: "action/vanishing-angle",
          name: "Vanishing Angle",
          weight: 16,
          cooldown: 4,
          targeting: "enemy_single",
          effects: [
            { kind: "damage", basePower: 24, scalingStat: "strength", scalingFactor: 1.1 },
            { kind: "apply_status", statusId: "exposed", duration: 2, potency: 8 },
          ],
          phaseIndices: [1],
        },
      ],
      reactionHooks: [
        {
          trigger: "on_phase_enter",
          target: "boss_self",
          effects: [
            { kind: "shield", basePower: 12, scalingStat: "resilience", scalingFactor: 0.25 },
          ],
          usesRemaining: 1,
        },
      ],
    },
  },

  // ── F-rank bosses (expanded pool) ──────────────────────────────────

  {
    bossId: "boss/the-curator",
    name: "The Curator",
    rank: "f",
    phases: 2,
    tags: ["boss:recovery-suppress", "boss:summon-pressure"],
    weaknesses: [{ kind: "stat", target: "strength", multiplier: 1.25 }],
    attack: 30,
    defense: 22,
    hp: 85,
    speed: 18,
    threat: 52,
    dropTableId: "drop-table/the-curator",
    encounter: {
      elapsedMinutes: 38,
      targetingPriority: "lowest_hp",
      phases: [
        {
          phaseIndex: 0,
          hpThresholdFraction: 1,
          statModifiers: {},
          actionIds: ["action/thorn-lash", "action/pollen-cloud", "action/root-cage"],
          onEnterEffects: [],
        },
        {
          phaseIndex: 1,
          hpThresholdFraction: 0.5,
          statModifiers: { attack: 3, defense: 2 },
          actionIds: [
            "action/thorn-lash",
            "action/pollen-cloud",
            "action/root-cage",
            "action/overgrowth",
          ],
          onEnterEffects: [
            { kind: "apply_status", statusId: "suppressed", duration: 2, potency: 6 },
          ],
          summonIds: ["summon/vine-tendril"],
        },
      ],
      actions: [
        {
          id: "action/thorn-lash",
          name: "Thorn Lash",
          weight: 36,
          cooldown: 0,
          targeting: "enemy_single",
          effects: [{ kind: "damage", basePower: 14, scalingStat: "strength", scalingFactor: 0.8 }],
        },
        {
          id: "action/pollen-cloud",
          name: "Pollen Cloud",
          weight: 26,
          cooldown: 2,
          targeting: "all_enemies",
          effects: [
            { kind: "damage", basePower: 6, scalingStat: "strength", scalingFactor: 0.4 },
            { kind: "apply_status", statusId: "slowed", duration: 2, potency: 8 },
          ],
        },
        {
          id: "action/root-cage",
          name: "Root Cage",
          weight: 22,
          cooldown: 3,
          targeting: "enemy_lowest_hp",
          effects: [
            { kind: "damage", basePower: 10, scalingStat: "strength", scalingFactor: 0.6 },
            { kind: "apply_status", statusId: "staggered", duration: 2, potency: 10 },
          ],
        },
        {
          id: "action/overgrowth",
          name: "Overgrowth",
          weight: 16,
          cooldown: 4,
          targeting: "all_enemies",
          effects: [
            { kind: "damage", basePower: 16, scalingStat: "strength", scalingFactor: 0.9 },
            { kind: "apply_status", statusId: "bleeding", duration: 2, potency: 6 },
          ],
          phaseIndices: [1],
        },
      ],
      reactionHooks: [
        {
          trigger: "on_phase_enter",
          target: "boss_self",
          effects: [
            { kind: "shield", basePower: 10, scalingStat: "resilience", scalingFactor: 0.3 },
          ],
          usesRemaining: 1,
        },
      ],
      summonDefinitions: [
        {
          summonId: "summon/vine-tendril",
          label: "Vine Tendril",
          stats: { attack: 6, defense: 4, hp: 22, speed: 10, threat: 18 },
          actions: [
            {
              id: "action/vine-tendril-grab",
              name: "Vine Grab",
              weight: 100,
              cooldown: 0,
              targeting: "enemy_lowest_hp",
              effects: [
                { kind: "damage", basePower: 6, scalingStat: "strength", scalingFactor: 0.35 },
              ],
            },
          ],
        },
      ],
    },
  },

  {
    bossId: "boss/the-attendant",
    name: "The Attendant",
    rank: "f",
    phases: 2,
    tags: ["boss:area-damage", "boss:recovery-suppress"],
    weaknesses: [{ kind: "role", target: "role:scout", multiplier: 1.3 }],
    attack: 32,
    defense: 28,
    hp: 90,
    speed: 16,
    threat: 55,
    dropTableId: "drop-table/the-attendant",
    encounter: {
      elapsedMinutes: 38,
      targetingPriority: "highest_threat",
      phases: [
        {
          phaseIndex: 0,
          hpThresholdFraction: 1,
          statModifiers: {},
          actionIds: ["action/spin-cycle", "action/steam-blast", "action/detergent-burn"],
          onEnterEffects: [],
        },
        {
          phaseIndex: 1,
          hpThresholdFraction: 0.5,
          statModifiers: { attack: 3, speed: 2 },
          actionIds: [
            "action/spin-cycle",
            "action/steam-blast",
            "action/detergent-burn",
            "action/rinse-cycle",
          ],
          onEnterEffects: [{ kind: "apply_status", statusId: "hastened", duration: 2, potency: 6 }],
        },
      ],
      actions: [
        {
          id: "action/spin-cycle",
          name: "Spin Cycle",
          weight: 34,
          cooldown: 0,
          targeting: "enemy_single",
          effects: [
            { kind: "damage", basePower: 16, scalingStat: "strength", scalingFactor: 0.85 },
          ],
        },
        {
          id: "action/steam-blast",
          name: "Steam Blast",
          weight: 28,
          cooldown: 2,
          targeting: "all_enemies",
          effects: [
            { kind: "damage", basePower: 8, scalingStat: "strength", scalingFactor: 0.5 },
            { kind: "apply_status", statusId: "suppressed", duration: 2, potency: 8 },
          ],
        },
        {
          id: "action/detergent-burn",
          name: "Detergent Burn",
          weight: 22,
          cooldown: 3,
          targeting: "enemy_lowest_hp",
          effects: [
            { kind: "damage", basePower: 12, scalingStat: "strength", scalingFactor: 0.7 },
            { kind: "apply_status", statusId: "bleeding", duration: 2, potency: 6 },
          ],
        },
        {
          id: "action/rinse-cycle",
          name: "Rinse Cycle",
          weight: 16,
          cooldown: 4,
          targeting: "all_enemies",
          effects: [
            { kind: "damage", basePower: 18, scalingStat: "strength", scalingFactor: 0.9 },
            { kind: "apply_status", statusId: "slowed", duration: 2, potency: 8 },
          ],
          phaseIndices: [1],
        },
      ],
    },
  },

  {
    bossId: "boss/the-super",
    name: "The Super",
    rank: "f",
    phases: 2,
    tags: ["boss:resilience-pierce", "boss:summon-pressure"],
    weaknesses: [{ kind: "stat", target: "strength", multiplier: 1.25 }],
    attack: 34,
    defense: 30,
    hp: 95,
    speed: 14,
    threat: 58,
    dropTableId: "drop-table/the-super",
    encounter: {
      elapsedMinutes: 40,
      targetingPriority: "frontline",
      phases: [
        {
          phaseIndex: 0,
          hpThresholdFraction: 1,
          statModifiers: {},
          actionIds: [
            "action/master-key-strike",
            "action/boiler-burst",
            "action/maintenance-round",
          ],
          onEnterEffects: [],
        },
        {
          phaseIndex: 1,
          hpThresholdFraction: 0.5,
          statModifiers: { attack: 4, defense: 2 },
          actionIds: [
            "action/master-key-strike",
            "action/boiler-burst",
            "action/maintenance-round",
            "action/fix-it-up",
          ],
          onEnterEffects: [
            { kind: "apply_status", statusId: "fortified", duration: 2, potency: 8 },
          ],
          summonIds: ["summon/radiator-pest"],
        },
      ],
      actions: [
        {
          id: "action/master-key-strike",
          name: "Master Key Strike",
          weight: 34,
          cooldown: 0,
          targeting: "enemy_single",
          effects: [{ kind: "damage", basePower: 16, scalingStat: "strength", scalingFactor: 0.9 }],
        },
        {
          id: "action/boiler-burst",
          name: "Boiler Burst",
          weight: 26,
          cooldown: 2,
          targeting: "all_enemies",
          effects: [
            { kind: "damage", basePower: 10, scalingStat: "strength", scalingFactor: 0.6 },
            { kind: "apply_status", statusId: "staggered", duration: 1, potency: 8 },
          ],
        },
        {
          id: "action/maintenance-round",
          name: "Maintenance Round",
          weight: 24,
          cooldown: 3,
          targeting: "boss",
          effects: [
            { kind: "shield", basePower: 12, scalingStat: "resilience", scalingFactor: 0.35 },
          ],
        },
        {
          id: "action/fix-it-up",
          name: "Fix-It-Up",
          weight: 16,
          cooldown: 4,
          targeting: "enemy_highest_threat",
          effects: [
            { kind: "damage", basePower: 20, scalingStat: "strength", scalingFactor: 1.0 },
            { kind: "apply_status", statusId: "exposed", duration: 2, potency: 8 },
          ],
          phaseIndices: [1],
        },
      ],
      summonDefinitions: [
        {
          summonId: "summon/radiator-pest",
          label: "Radiator Pest",
          stats: { attack: 6, defense: 6, hp: 24, speed: 10, threat: 20 },
          actions: [
            {
              id: "action/radiator-pest-hiss",
              name: "Steam Hiss",
              weight: 100,
              cooldown: 0,
              targeting: "enemy_lowest_hp",
              effects: [
                { kind: "damage", basePower: 6, scalingStat: "strength", scalingFactor: 0.35 },
              ],
            },
          ],
        },
      ],
    },
  },

  {
    bossId: "boss/the-referee",
    name: "The Referee",
    rank: "f",
    phases: 1,
    tags: ["boss:speed-drain", "boss:area-damage"],
    weaknesses: [{ kind: "role", target: "role:field_lead", multiplier: 1.3 }],
    attack: 36,
    defense: 18,
    hp: 75,
    speed: 28,
    threat: 50,
    dropTableId: "drop-table/the-referee",
    encounter: {
      elapsedMinutes: 32,
      targetingPriority: "random",
      phases: [
        {
          phaseIndex: 0,
          hpThresholdFraction: 1,
          statModifiers: {},
          actionIds: [
            "action/technical-foul",
            "action/penalty-whistle",
            "action/full-court-press",
            "action/ejection",
          ],
          onEnterEffects: [],
        },
      ],
      actions: [
        {
          id: "action/technical-foul",
          name: "Technical Foul",
          weight: 32,
          cooldown: 0,
          targeting: "enemy_single",
          effects: [{ kind: "damage", basePower: 16, scalingStat: "strength", scalingFactor: 0.9 }],
        },
        {
          id: "action/penalty-whistle",
          name: "Penalty Whistle",
          weight: 28,
          cooldown: 2,
          targeting: "all_enemies",
          effects: [
            { kind: "apply_status", statusId: "slowed", duration: 2, potency: 10 },
            { kind: "apply_status", statusId: "suppressed", duration: 1, potency: 6 },
          ],
        },
        {
          id: "action/full-court-press",
          name: "Full Court Press",
          weight: 24,
          cooldown: 2,
          targeting: "all_enemies",
          effects: [
            { kind: "damage", basePower: 10, scalingStat: "strength", scalingFactor: 0.65 },
            { kind: "apply_status", statusId: "staggered", duration: 1, potency: 8 },
          ],
        },
        {
          id: "action/ejection",
          name: "Ejection",
          weight: 16,
          cooldown: 4,
          targeting: "random_enemy",
          effects: [
            { kind: "damage", basePower: 22, scalingStat: "strength", scalingFactor: 1.05 },
            { kind: "apply_status", statusId: "exposed", duration: 2, potency: 8 },
          ],
        },
      ],
    },
  },

  {
    bossId: "boss/the-stockkeeper",
    name: "The Stockkeeper",
    rank: "f",
    phases: 2,
    tags: ["boss:intel-resist", "boss:recovery-suppress"],
    weaknesses: [{ kind: "stat", target: "endurance", multiplier: 1.25 }],
    attack: 26,
    defense: 34,
    hp: 88,
    speed: 12,
    threat: 48,
    dropTableId: "drop-table/the-stockkeeper",
    encounter: {
      elapsedMinutes: 36,
      targetingPriority: "lowest_hp",
      phases: [
        {
          phaseIndex: 0,
          hpThresholdFraction: 1,
          statModifiers: {},
          actionIds: ["action/shelf-slam", "action/flash-freeze", "action/cold-lock"],
          onEnterEffects: [],
        },
        {
          phaseIndex: 1,
          hpThresholdFraction: 0.45,
          statModifiers: { defense: 4, attack: 2 },
          actionIds: [
            "action/shelf-slam",
            "action/flash-freeze",
            "action/cold-lock",
            "action/inventory-check",
          ],
          onEnterEffects: [
            { kind: "apply_status", statusId: "fortified", duration: 3, potency: 8 },
          ],
        },
      ],
      actions: [
        {
          id: "action/shelf-slam",
          name: "Shelf Slam",
          weight: 34,
          cooldown: 0,
          targeting: "enemy_single",
          effects: [
            { kind: "damage", basePower: 12, scalingStat: "strength", scalingFactor: 0.75 },
          ],
        },
        {
          id: "action/flash-freeze",
          name: "Flash Freeze",
          weight: 28,
          cooldown: 2,
          targeting: "all_enemies",
          effects: [
            { kind: "damage", basePower: 6, scalingStat: "strength", scalingFactor: 0.4 },
            { kind: "apply_status", statusId: "slowed", duration: 2, potency: 10 },
          ],
        },
        {
          id: "action/cold-lock",
          name: "Cold Lock",
          weight: 22,
          cooldown: 3,
          targeting: "enemy_lowest_hp",
          effects: [
            { kind: "damage", basePower: 10, scalingStat: "strength", scalingFactor: 0.6 },
            { kind: "apply_status", statusId: "suppressed", duration: 2, potency: 8 },
          ],
        },
        {
          id: "action/inventory-check",
          name: "Inventory Check",
          weight: 16,
          cooldown: 4,
          targeting: "all_enemies",
          effects: [
            { kind: "damage", basePower: 14, scalingStat: "strength", scalingFactor: 0.8 },
            { kind: "apply_status", statusId: "exposed", duration: 2, potency: 6 },
          ],
          phaseIndices: [1],
        },
      ],
      reactionHooks: [
        {
          trigger: "on_phase_enter",
          target: "boss_self",
          effects: [
            { kind: "shield", basePower: 14, scalingStat: "resilience", scalingFactor: 0.4 },
          ],
          usesRemaining: 1,
        },
      ],
    },
  },

  // ── F-rank site bosses ──────────────────────────────────────────────

  {
    bossId: "boss/the-dispatcher",
    name: "The Dispatcher",
    rank: "f",
    phases: 2,
    tags: ["boss:speed-drain", "boss:area-damage"],
    weaknesses: [{ kind: "role", target: "role:scout", multiplier: 1.3 }],
    attack: 33,
    defense: 24,
    hp: 92,
    speed: 22,
    threat: 56,
    dropTableId: "drop-table/the-dispatcher",
    encounter: {
      elapsedMinutes: 38,
      targetingPriority: "random",
      phases: [
        {
          phaseIndex: 0,
          hpThresholdFraction: 1,
          statModifiers: {},
          actionIds: ["action/track-switch", "action/arrival-bell", "action/third-rail-arc"],
          onEnterEffects: [],
        },
        {
          phaseIndex: 1,
          hpThresholdFraction: 0.5,
          statModifiers: { speed: 5, attack: 3 },
          actionIds: [
            "action/track-switch",
            "action/arrival-bell",
            "action/third-rail-arc",
            "action/express-service",
          ],
          onEnterEffects: [{ kind: "apply_status", statusId: "hastened", duration: 2, potency: 8 }],
        },
      ],
      actions: [
        {
          id: "action/track-switch",
          name: "Track Switch",
          weight: 34,
          cooldown: 0,
          targeting: "enemy_single",
          effects: [
            { kind: "damage", basePower: 14, scalingStat: "strength", scalingFactor: 0.85 },
          ],
        },
        {
          id: "action/arrival-bell",
          name: "Arrival Bell",
          weight: 26,
          cooldown: 2,
          targeting: "all_enemies",
          effects: [
            { kind: "apply_status", statusId: "suppressed", duration: 2, potency: 10 },
            { kind: "apply_status", statusId: "slowed", duration: 1, potency: 6 },
          ],
        },
        {
          id: "action/third-rail-arc",
          name: "Third Rail Arc",
          weight: 24,
          cooldown: 2,
          targeting: "random_enemy",
          effects: [
            { kind: "damage", basePower: 18, scalingStat: "strength", scalingFactor: 0.9 },
            { kind: "apply_status", statusId: "staggered", duration: 1, potency: 8 },
          ],
        },
        {
          id: "action/express-service",
          name: "Express Service",
          weight: 16,
          cooldown: 4,
          targeting: "all_enemies",
          effects: [
            { kind: "damage", basePower: 20, scalingStat: "strength", scalingFactor: 1.0 },
            { kind: "apply_status", statusId: "exposed", duration: 2, potency: 8 },
          ],
          phaseIndices: [1],
        },
      ],
      reactionHooks: [
        {
          trigger: "on_phase_enter",
          target: "all_allies",
          effects: [{ kind: "damage", basePower: 8, scalingStat: "strength", scalingFactor: 0.4 }],
          usesRemaining: 1,
        },
      ],
    },
  },

  {
    bossId: "boss/the-manicurist",
    name: "The Manicurist",
    rank: "f",
    phases: 2,
    tags: ["boss:recovery-suppress", "boss:area-damage"],
    weaknesses: [{ kind: "stat", target: "endurance", multiplier: 1.3 }],
    attack: 30,
    defense: 20,
    hp: 78,
    speed: 24,
    threat: 52,
    dropTableId: "drop-table/the-manicurist",
    encounter: {
      elapsedMinutes: 34,
      targetingPriority: "lowest_hp",
      phases: [
        {
          phaseIndex: 0,
          hpThresholdFraction: 1,
          statModifiers: {},
          actionIds: ["action/cuticle-shear", "action/acetone-fog", "action/uv-flash"],
          onEnterEffects: [],
        },
        {
          phaseIndex: 1,
          hpThresholdFraction: 0.5,
          statModifiers: { attack: 4, speed: 2 },
          actionIds: [
            "action/cuticle-shear",
            "action/acetone-fog",
            "action/uv-flash",
            "action/polish-peel",
          ],
          onEnterEffects: [{ kind: "apply_status", statusId: "exposed", duration: 2, potency: 8 }],
        },
      ],
      actions: [
        {
          id: "action/cuticle-shear",
          name: "Cuticle Shear",
          weight: 34,
          cooldown: 0,
          targeting: "enemy_single",
          effects: [
            { kind: "damage", basePower: 15, scalingStat: "strength", scalingFactor: 0.9 },
            { kind: "apply_status", statusId: "bleeding", duration: 2, potency: 5 },
          ],
        },
        {
          id: "action/acetone-fog",
          name: "Acetone Fog",
          weight: 28,
          cooldown: 2,
          targeting: "all_enemies",
          effects: [
            { kind: "damage", basePower: 7, scalingStat: "strength", scalingFactor: 0.5 },
            { kind: "apply_status", statusId: "suppressed", duration: 2, potency: 8 },
          ],
        },
        {
          id: "action/uv-flash",
          name: "UV Flash",
          weight: 22,
          cooldown: 3,
          targeting: "all_enemies",
          effects: [
            { kind: "apply_status", statusId: "staggered", duration: 1, potency: 10 },
            { kind: "apply_status", statusId: "exposed", duration: 1, potency: 6 },
          ],
        },
        {
          id: "action/polish-peel",
          name: "Polish Peel",
          weight: 16,
          cooldown: 4,
          targeting: "enemy_lowest_hp",
          effects: [
            { kind: "damage", basePower: 22, scalingStat: "strength", scalingFactor: 1.05 },
          ],
          phaseIndices: [1],
        },
      ],
    },
  },

  {
    bossId: "boss/the-inspector",
    name: "The Inspector",
    rank: "f",
    phases: 2,
    tags: ["boss:resilience-pierce", "boss:summon-pressure"],
    weaknesses: [{ kind: "role", target: "role:field_lead", multiplier: 1.25 }],
    attack: 32,
    defense: 28,
    hp: 96,
    speed: 16,
    threat: 58,
    dropTableId: "drop-table/the-inspector",
    encounter: {
      elapsedMinutes: 40,
      targetingPriority: "highest_threat",
      phases: [
        {
          phaseIndex: 0,
          hpThresholdFraction: 1,
          statModifiers: {},
          actionIds: [
            "action/code-violation",
            "action/structural-condemnation",
            "action/clipboard-guard",
          ],
          onEnterEffects: [],
        },
        {
          phaseIndex: 1,
          hpThresholdFraction: 0.5,
          statModifiers: { defense: 4, attack: 2 },
          actionIds: [
            "action/code-violation",
            "action/structural-condemnation",
            "action/clipboard-guard",
            "action/final-notice",
          ],
          onEnterEffects: [
            { kind: "apply_status", statusId: "fortified", duration: 3, potency: 8 },
          ],
          summonIds: ["summon/loose-bolt-swarm"],
        },
      ],
      actions: [
        {
          id: "action/code-violation",
          name: "Code Violation",
          weight: 34,
          cooldown: 0,
          targeting: "enemy_single",
          effects: [
            { kind: "damage", basePower: 14, scalingStat: "strength", scalingFactor: 0.85 },
          ],
        },
        {
          id: "action/structural-condemnation",
          name: "Structural Condemnation",
          weight: 26,
          cooldown: 2,
          targeting: "all_enemies",
          effects: [
            { kind: "damage", basePower: 8, scalingStat: "strength", scalingFactor: 0.6 },
            { kind: "apply_status", statusId: "slowed", duration: 2, potency: 8 },
          ],
        },
        {
          id: "action/clipboard-guard",
          name: "Clipboard Guard",
          weight: 24,
          cooldown: 3,
          targeting: "boss",
          effects: [
            { kind: "shield", basePower: 14, scalingStat: "resilience", scalingFactor: 0.35 },
          ],
        },
        {
          id: "action/final-notice",
          name: "Final Notice",
          weight: 16,
          cooldown: 4,
          targeting: "enemy_highest_threat",
          effects: [
            { kind: "damage", basePower: 22, scalingStat: "strength", scalingFactor: 1.0 },
            { kind: "apply_status", statusId: "exposed", duration: 2, potency: 8 },
          ],
          phaseIndices: [1],
        },
      ],
      summonDefinitions: [
        {
          summonId: "summon/loose-bolt-swarm",
          label: "Loose Bolt Swarm",
          stats: { attack: 7, defense: 3, hp: 20, speed: 14, threat: 18 },
          actions: [
            {
              id: "action/loose-bolt-swarm/rivet-pelt",
              name: "Rivet Pelt",
              weight: 100,
              cooldown: 0,
              targeting: "random_enemy",
              effects: [
                { kind: "damage", basePower: 7, scalingStat: "strength", scalingFactor: 0.4 },
              ],
            },
          ],
        },
      ],
    },
  },

  {
    bossId: "boss/the-appraiser",
    name: "The Appraiser",
    rank: "f",
    phases: 2,
    tags: ["boss:intel-resist", "boss:speed-drain"],
    weaknesses: [
      { kind: "stat", target: "perception", multiplier: 1.25 },
      { kind: "role", target: "role:medic", multiplier: 1.2 },
    ],
    attack: 28,
    defense: 26,
    hp: 86,
    speed: 20,
    threat: 54,
    dropTableId: "drop-table/the-appraiser",
    encounter: {
      elapsedMinutes: 36,
      targetingPriority: "lowest_hp",
      phases: [
        {
          phaseIndex: 0,
          hpThresholdFraction: 1,
          statModifiers: {},
          actionIds: ["action/price-check", "action/glass-case-slam", "action/counterfeit-flash"],
          onEnterEffects: [],
        },
        {
          phaseIndex: 1,
          hpThresholdFraction: 0.5,
          statModifiers: { speed: 4, attack: 3 },
          actionIds: [
            "action/price-check",
            "action/glass-case-slam",
            "action/counterfeit-flash",
            "action/final-offer",
          ],
          onEnterEffects: [{ kind: "apply_status", statusId: "hastened", duration: 2, potency: 6 }],
        },
      ],
      actions: [
        {
          id: "action/price-check",
          name: "Price Check",
          weight: 32,
          cooldown: 0,
          targeting: "enemy_single",
          effects: [
            { kind: "damage", basePower: 13, scalingStat: "strength", scalingFactor: 0.8 },
            { kind: "apply_status", statusId: "marked", duration: 2, potency: 6 },
          ],
        },
        {
          id: "action/glass-case-slam",
          name: "Glass Case Slam",
          weight: 28,
          cooldown: 2,
          targeting: "all_enemies",
          effects: [
            { kind: "damage", basePower: 9, scalingStat: "strength", scalingFactor: 0.55 },
            { kind: "apply_status", statusId: "staggered", duration: 1, potency: 8 },
          ],
        },
        {
          id: "action/counterfeit-flash",
          name: "Counterfeit Flash",
          weight: 24,
          cooldown: 3,
          targeting: "all_enemies",
          effects: [{ kind: "apply_status", statusId: "suppressed", duration: 2, potency: 10 }],
        },
        {
          id: "action/final-offer",
          name: "Final Offer",
          weight: 16,
          cooldown: 4,
          targeting: "enemy_lowest_hp",
          effects: [
            { kind: "damage", basePower: 24, scalingStat: "strength", scalingFactor: 1.1 },
            { kind: "apply_status", statusId: "bleeding", duration: 2, potency: 8 },
          ],
          phaseIndices: [1],
        },
      ],
      reactionHooks: [
        {
          trigger: "on_phase_enter",
          target: "boss_self",
          effects: [
            { kind: "shield", basePower: 12, scalingStat: "resilience", scalingFactor: 0.3 },
          ],
          usesRemaining: 1,
        },
      ],
    },
  },
  // ── E-rank bosses ────────────────────────────────────────────────────

  {
    bossId: "boss/the-projectionist",
    name: "The Projectionist",
    rank: "e",
    phases: 2,
    tags: ["boss:area-damage", "boss:recovery-suppress"],
    weaknesses: [{ kind: "role", target: "role:scout", multiplier: 1.3 }],
    attack: 38,
    defense: 26,
    hp: 110,
    speed: 20,
    threat: 62,
    dropTableId: "drop-table/the-projectionist",
    encounter: {
      elapsedMinutes: 40,
      targetingPriority: "random",
      phases: [
        {
          phaseIndex: 0,
          hpThresholdFraction: 1,
          statModifiers: {},
          actionIds: ["action/burn-reel-boss", "action/frame-skip", "action/audience-flash"],
          onEnterEffects: [],
        },
        {
          phaseIndex: 1,
          hpThresholdFraction: 0.5,
          statModifiers: { attack: 5, speed: 3 },
          actionIds: [
            "action/burn-reel-boss",
            "action/frame-skip",
            "action/audience-flash",
            "action/final-cut",
          ],
          onEnterEffects: [
            { kind: "apply_status", statusId: "hastened", duration: 2, potency: 10 },
          ],
        },
      ],
      actions: [
        {
          id: "action/burn-reel-boss",
          name: "Burn Reel",
          weight: 34,
          cooldown: 0,
          targeting: "enemy_single",
          effects: [{ kind: "damage", basePower: 16, scalingStat: "strength", scalingFactor: 0.9 }],
        },
        {
          id: "action/frame-skip",
          name: "Frame Skip",
          weight: 26,
          cooldown: 2,
          targeting: "random_enemy",
          effects: [
            { kind: "damage", basePower: 20, scalingStat: "strength", scalingFactor: 0.85 },
            { kind: "apply_status", statusId: "staggered", duration: 1, potency: 10 },
          ],
        },
        {
          id: "action/audience-flash",
          name: "Audience Flash",
          weight: 24,
          cooldown: 3,
          targeting: "all_enemies",
          effects: [
            { kind: "apply_status", statusId: "suppressed", duration: 2, potency: 10 },
            { kind: "apply_status", statusId: "slowed", duration: 1, potency: 6 },
          ],
        },
        {
          id: "action/final-cut",
          name: "Final Cut",
          weight: 16,
          cooldown: 4,
          targeting: "enemy_lowest_hp",
          effects: [
            { kind: "damage", basePower: 24, scalingStat: "strength", scalingFactor: 1.1 },
            { kind: "apply_status", statusId: "bleeding", duration: 2, potency: 10 },
          ],
          phaseIndices: [1],
        },
      ],
      reactionHooks: [
        {
          trigger: "on_phase_enter",
          target: "all_allies",
          effects: [{ kind: "apply_status", statusId: "suppressed", duration: 1, potency: 8 }],
          usesRemaining: 1,
        },
      ],
    },
  },

  {
    bossId: "boss/the-valve-master",
    name: "The Valve Master",
    rank: "e",
    phases: 2,
    tags: ["boss:area-damage", "boss:resilience-pierce"],
    weaknesses: [{ kind: "stat", target: "endurance", multiplier: 1.3 }],
    attack: 34,
    defense: 30,
    hp: 115,
    speed: 16,
    threat: 64,
    dropTableId: "drop-table/the-valve-master",
    encounter: {
      elapsedMinutes: 42,
      targetingPriority: "frontline",
      phases: [
        {
          phaseIndex: 0,
          hpThresholdFraction: 1,
          statModifiers: {},
          actionIds: ["action/pressure-blast", "action/valve-lock", "action/flood-pulse"],
          onEnterEffects: [],
        },
        {
          phaseIndex: 1,
          hpThresholdFraction: 0.45,
          statModifiers: { defense: 5, attack: 3 },
          actionIds: [
            "action/pressure-blast",
            "action/valve-lock",
            "action/flood-pulse",
            "action/emergency-vent",
          ],
          onEnterEffects: [
            { kind: "apply_status", statusId: "fortified", duration: 3, potency: 10 },
          ],
        },
      ],
      actions: [
        {
          id: "action/pressure-blast",
          name: "Pressure Blast",
          weight: 34,
          cooldown: 0,
          targeting: "enemy_single",
          effects: [
            { kind: "damage", basePower: 14, scalingStat: "strength", scalingFactor: 0.85 },
          ],
        },
        {
          id: "action/valve-lock",
          name: "Valve Lock",
          weight: 26,
          cooldown: 2,
          targeting: "enemy_single",
          effects: [
            { kind: "damage", basePower: 10, scalingStat: "strength", scalingFactor: 0.6 },
            { kind: "apply_status", statusId: "suppressed", duration: 2, potency: 10 },
          ],
        },
        {
          id: "action/flood-pulse",
          name: "Flood Pulse",
          weight: 24,
          cooldown: 3,
          targeting: "all_enemies",
          effects: [
            { kind: "damage", basePower: 10, scalingStat: "strength", scalingFactor: 0.5 },
            { kind: "apply_status", statusId: "slowed", duration: 2, potency: 8 },
          ],
        },
        {
          id: "action/emergency-vent",
          name: "Emergency Vent",
          weight: 16,
          cooldown: 4,
          targeting: "all_enemies",
          effects: [
            { kind: "damage", basePower: 18, scalingStat: "strength", scalingFactor: 0.9 },
            { kind: "apply_status", statusId: "exposed", duration: 2, potency: 8 },
          ],
          phaseIndices: [1],
        },
      ],
      reactionHooks: [
        {
          trigger: "on_phase_enter",
          target: "boss_self",
          effects: [
            { kind: "shield", basePower: 16, scalingStat: "resilience", scalingFactor: 0.5 },
          ],
          usesRemaining: 1,
        },
      ],
    },
  },

  // ── D-rank bosses ────────────────────────────────────────────────────

  {
    bossId: "boss/the-astronomer",
    name: "The Astronomer",
    rank: "d",
    phases: 3,
    tags: ["boss:area-damage", "boss:intel-resist", "boss:speed-drain"],
    weaknesses: [
      { kind: "role", target: "role:scout", multiplier: 1.3 },
      { kind: "stat", target: "perception", multiplier: 1.2 },
    ],
    attack: 45,
    defense: 32,
    hp: 160,
    speed: 22,
    threat: 82,
    dropTableId: "drop-table/the-astronomer",
    encounter: {
      elapsedMinutes: 48,
      targetingPriority: "random",
      phases: [
        {
          phaseIndex: 0,
          hpThresholdFraction: 1,
          statModifiers: {},
          actionIds: ["action/stellar-lens", "action/dome-rotation", "action/wrong-star"],
          onEnterEffects: [],
        },
        {
          phaseIndex: 1,
          hpThresholdFraction: 0.6,
          statModifiers: { speed: 4, attack: 4 },
          actionIds: [
            "action/stellar-lens",
            "action/dome-rotation",
            "action/wrong-star",
            "action/constellation-collapse",
          ],
          onEnterEffects: [
            { kind: "apply_status", statusId: "hastened", duration: 2, potency: 10 },
          ],
        },
        {
          phaseIndex: 2,
          hpThresholdFraction: 0.3,
          statModifiers: { speed: 8, attack: 8, defense: -4 },
          actionIds: [
            "action/stellar-lens",
            "action/wrong-star",
            "action/constellation-collapse",
            "action/event-horizon",
          ],
          onEnterEffects: [
            { kind: "apply_status", statusId: "hastened", duration: 3, potency: 14 },
          ],
          summonIds: ["summon/lens-swarm"],
        },
      ],
      actions: [
        {
          id: "action/stellar-lens",
          name: "Stellar Lens",
          weight: 30,
          cooldown: 0,
          targeting: "enemy_single",
          effects: [{ kind: "damage", basePower: 18, scalingStat: "strength", scalingFactor: 0.9 }],
        },
        {
          id: "action/dome-rotation",
          name: "Dome Rotation",
          weight: 22,
          cooldown: 2,
          targeting: "all_enemies",
          effects: [
            { kind: "damage", basePower: 10, scalingStat: "strength", scalingFactor: 0.5 },
            { kind: "apply_status", statusId: "staggered", duration: 1, potency: 10 },
          ],
        },
        {
          id: "action/wrong-star",
          name: "Wrong Star",
          weight: 24,
          cooldown: 3,
          targeting: "all_enemies",
          effects: [{ kind: "apply_status", statusId: "suppressed", duration: 2, potency: 12 }],
        },
        {
          id: "action/constellation-collapse",
          name: "Constellation Collapse",
          weight: 14,
          cooldown: 3,
          targeting: "random_enemy",
          effects: [
            { kind: "damage", basePower: 26, scalingStat: "strength", scalingFactor: 1.1 },
            { kind: "apply_status", statusId: "exposed", duration: 2, potency: 10 },
          ],
          phaseIndices: [1, 2],
        },
        {
          id: "action/event-horizon",
          name: "Event Horizon",
          weight: 10,
          cooldown: 5,
          targeting: "all_enemies",
          effects: [
            { kind: "damage", basePower: 22, scalingStat: "strength", scalingFactor: 1.0 },
            { kind: "apply_status", statusId: "bleeding", duration: 3, potency: 10 },
          ],
          phaseIndices: [2],
        },
      ],
      reactionHooks: [
        {
          trigger: "on_phase_enter",
          target: "all_allies",
          effects: [{ kind: "damage", basePower: 10, scalingStat: "strength", scalingFactor: 0.4 }],
          usesRemaining: 2,
        },
      ],
      summonDefinitions: [
        {
          summonId: "summon/lens-swarm",
          label: "Lens Swarm",
          stats: { attack: 10, defense: 4, hp: 25, speed: 18, threat: 22 },
          actions: [
            {
              id: "action/lens-swarm/refraction-burst",
              name: "Refraction Burst",
              weight: 100,
              cooldown: 0,
              targeting: "random_enemy",
              effects: [
                { kind: "damage", basePower: 8, scalingStat: "strength", scalingFactor: 0.4 },
              ],
            },
          ],
        },
      ],
    },
  },

  {
    bossId: "boss/the-engineer",
    name: "The Engineer",
    rank: "d",
    phases: 3,
    tags: ["boss:resilience-pierce", "boss:area-damage", "boss:summon-pressure"],
    weaknesses: [
      { kind: "role", target: "role:field_lead", multiplier: 1.3 },
      { kind: "stat", target: "resilience", multiplier: 1.2 },
    ],
    attack: 42,
    defense: 38,
    hp: 175,
    speed: 16,
    threat: 86,
    dropTableId: "drop-table/the-engineer",
    encounter: {
      elapsedMinutes: 50,
      targetingPriority: "frontline",
      phases: [
        {
          phaseIndex: 0,
          hpThresholdFraction: 1,
          statModifiers: {},
          actionIds: ["action/pipe-lance", "action/pressure-wave", "action/valve-seal"],
          onEnterEffects: [],
        },
        {
          phaseIndex: 1,
          hpThresholdFraction: 0.6,
          statModifiers: { defense: 6, attack: 3 },
          actionIds: [
            "action/pipe-lance",
            "action/pressure-wave",
            "action/valve-seal",
            "action/main-break",
          ],
          onEnterEffects: [
            { kind: "apply_status", statusId: "fortified", duration: 3, potency: 12 },
          ],
          summonIds: ["summon/pressure-node"],
        },
        {
          phaseIndex: 2,
          hpThresholdFraction: 0.25,
          statModifiers: { defense: 10, attack: 6 },
          actionIds: [
            "action/pipe-lance",
            "action/pressure-wave",
            "action/main-break",
            "action/total-flood",
          ],
          onEnterEffects: [
            { kind: "apply_status", statusId: "fortified", duration: 4, potency: 14 },
          ],
        },
      ],
      actions: [
        {
          id: "action/pipe-lance",
          name: "Pipe Lance",
          weight: 32,
          cooldown: 0,
          targeting: "enemy_single",
          effects: [
            { kind: "damage", basePower: 18, scalingStat: "strength", scalingFactor: 0.85 },
          ],
        },
        {
          id: "action/pressure-wave",
          name: "Pressure Wave",
          weight: 24,
          cooldown: 2,
          targeting: "all_enemies",
          effects: [
            { kind: "damage", basePower: 12, scalingStat: "strength", scalingFactor: 0.6 },
            { kind: "apply_status", statusId: "slowed", duration: 2, potency: 10 },
          ],
        },
        {
          id: "action/valve-seal",
          name: "Valve Seal",
          weight: 22,
          cooldown: 3,
          targeting: "enemy_single",
          effects: [
            { kind: "damage", basePower: 10, scalingStat: "strength", scalingFactor: 0.5 },
            { kind: "apply_status", statusId: "suppressed", duration: 2, potency: 12 },
          ],
        },
        {
          id: "action/main-break",
          name: "Main Break",
          weight: 14,
          cooldown: 4,
          targeting: "all_enemies",
          effects: [
            { kind: "damage", basePower: 20, scalingStat: "strength", scalingFactor: 1.0 },
            { kind: "apply_status", statusId: "staggered", duration: 1, potency: 10 },
          ],
          phaseIndices: [1, 2],
        },
        {
          id: "action/total-flood",
          name: "Total Flood",
          weight: 8,
          cooldown: 5,
          targeting: "all_enemies",
          effects: [
            { kind: "damage", basePower: 24, scalingStat: "strength", scalingFactor: 1.1 },
            { kind: "apply_status", statusId: "exposed", duration: 2, potency: 10 },
          ],
          phaseIndices: [2],
        },
      ],
      reactionHooks: [
        {
          trigger: "on_phase_enter",
          target: "boss_self",
          effects: [
            { kind: "shield", basePower: 20, scalingStat: "resilience", scalingFactor: 0.5 },
          ],
          usesRemaining: 2,
        },
      ],
      summonDefinitions: [
        {
          summonId: "summon/pressure-node",
          label: "Pressure Node",
          stats: { attack: 8, defense: 6, hp: 30, speed: 10, threat: 20 },
          actions: [
            {
              id: "action/pressure-node/burst",
              name: "Burst",
              weight: 100,
              cooldown: 0,
              targeting: "random_enemy",
              effects: [
                { kind: "damage", basePower: 10, scalingStat: "strength", scalingFactor: 0.5 },
              ],
            },
          ],
        },
      ],
    },
  },

  {
    bossId: "boss/the-director",
    name: "The Director",
    rank: "d",
    phases: 3,
    tags: ["boss:speed-drain", "boss:recovery-suppress", "boss:area-damage"],
    weaknesses: [
      { kind: "role", target: "role:medic", multiplier: 1.3 },
      { kind: "stat", target: "endurance", multiplier: 1.2 },
    ],
    attack: 48,
    defense: 28,
    hp: 150,
    speed: 24,
    threat: 80,
    dropTableId: "drop-table/the-director",
    encounter: {
      elapsedMinutes: 46,
      targetingPriority: "lowest_hp",
      phases: [
        {
          phaseIndex: 0,
          hpThresholdFraction: 1,
          statModifiers: {},
          actionIds: ["action/cue-strike", "action/blackout", "action/curtain-call"],
          onEnterEffects: [],
        },
        {
          phaseIndex: 1,
          hpThresholdFraction: 0.6,
          statModifiers: { speed: 5, attack: 4 },
          actionIds: [
            "action/cue-strike",
            "action/blackout",
            "action/curtain-call",
            "action/standing-ovation",
          ],
          onEnterEffects: [
            { kind: "apply_status", statusId: "hastened", duration: 2, potency: 12 },
          ],
        },
        {
          phaseIndex: 2,
          hpThresholdFraction: 0.25,
          statModifiers: { speed: 10, attack: 8, defense: -5 },
          actionIds: [
            "action/cue-strike",
            "action/curtain-call",
            "action/standing-ovation",
            "action/encore",
          ],
          onEnterEffects: [
            { kind: "apply_status", statusId: "hastened", duration: 3, potency: 14 },
          ],
        },
      ],
      actions: [
        {
          id: "action/cue-strike",
          name: "Cue Strike",
          weight: 30,
          cooldown: 0,
          targeting: "enemy_single",
          effects: [{ kind: "damage", basePower: 20, scalingStat: "strength", scalingFactor: 0.9 }],
        },
        {
          id: "action/blackout",
          name: "Blackout",
          weight: 24,
          cooldown: 3,
          targeting: "all_enemies",
          effects: [
            { kind: "apply_status", statusId: "suppressed", duration: 2, potency: 12 },
            { kind: "apply_status", statusId: "slowed", duration: 2, potency: 8 },
          ],
        },
        {
          id: "action/curtain-call",
          name: "Curtain Call",
          weight: 24,
          cooldown: 2,
          targeting: "random_enemy",
          effects: [
            { kind: "damage", basePower: 24, scalingStat: "strength", scalingFactor: 1.0 },
            { kind: "apply_status", statusId: "staggered", duration: 1, potency: 10 },
          ],
        },
        {
          id: "action/standing-ovation",
          name: "Standing Ovation",
          weight: 14,
          cooldown: 4,
          targeting: "all_enemies",
          effects: [
            { kind: "damage", basePower: 16, scalingStat: "strength", scalingFactor: 0.8 },
            { kind: "apply_status", statusId: "bleeding", duration: 2, potency: 10 },
          ],
          phaseIndices: [1, 2],
        },
        {
          id: "action/encore",
          name: "Encore",
          weight: 8,
          cooldown: 5,
          targeting: "enemy_lowest_hp",
          effects: [
            { kind: "damage", basePower: 30, scalingStat: "strength", scalingFactor: 1.2 },
            { kind: "apply_status", statusId: "exposed", duration: 2, potency: 12 },
          ],
          phaseIndices: [2],
        },
      ],
      reactionHooks: [
        {
          trigger: "on_phase_enter",
          target: "all_allies",
          effects: [{ kind: "damage", basePower: 12, scalingStat: "strength", scalingFactor: 0.5 }],
          usesRemaining: 2,
        },
      ],
    },
  },

  {
    bossId: "boss/the-researcher",
    name: "The Researcher",
    rank: "d",
    phases: 3,
    tags: ["boss:recovery-suppress", "boss:summon-pressure", "boss:resilience-pierce"],
    weaknesses: [
      { kind: "stat", target: "speed", multiplier: 1.25 },
      { kind: "role", target: "role:scout", multiplier: 1.2 },
    ],
    attack: 44,
    defense: 30,
    hp: 165,
    speed: 20,
    threat: 84,
    dropTableId: "drop-table/the-researcher",
    encounter: {
      elapsedMinutes: 48,
      targetingPriority: "lowest_hp",
      phases: [
        {
          phaseIndex: 0,
          hpThresholdFraction: 1,
          statModifiers: {},
          actionIds: ["action/syringe-volley", "action/centrifuge-pulse", "action/reagent-cloud"],
          onEnterEffects: [],
        },
        {
          phaseIndex: 1,
          hpThresholdFraction: 0.55,
          statModifiers: { attack: 5, speed: 4 },
          actionIds: [
            "action/syringe-volley",
            "action/centrifuge-pulse",
            "action/reagent-cloud",
            "action/experimental-injection",
          ],
          onEnterEffects: [
            { kind: "apply_status", statusId: "hastened", duration: 2, potency: 10 },
          ],
          summonIds: ["summon/culture-cluster"],
        },
        {
          phaseIndex: 2,
          hpThresholdFraction: 0.25,
          statModifiers: { attack: 10, speed: 6, defense: -3 },
          actionIds: [
            "action/syringe-volley",
            "action/reagent-cloud",
            "action/experimental-injection",
            "action/containment-breach",
          ],
          onEnterEffects: [
            { kind: "apply_status", statusId: "hastened", duration: 3, potency: 14 },
          ],
        },
      ],
      actions: [
        {
          id: "action/syringe-volley",
          name: "Syringe Volley",
          weight: 30,
          cooldown: 0,
          targeting: "enemy_single",
          effects: [
            { kind: "damage", basePower: 18, scalingStat: "strength", scalingFactor: 0.85 },
            { kind: "apply_status", statusId: "bleeding", duration: 1, potency: 6 },
          ],
        },
        {
          id: "action/centrifuge-pulse",
          name: "Centrifuge Pulse",
          weight: 24,
          cooldown: 2,
          targeting: "all_enemies",
          effects: [
            { kind: "damage", basePower: 12, scalingStat: "strength", scalingFactor: 0.6 },
            { kind: "apply_status", statusId: "staggered", duration: 1, potency: 10 },
          ],
        },
        {
          id: "action/reagent-cloud",
          name: "Reagent Cloud",
          weight: 22,
          cooldown: 3,
          targeting: "all_enemies",
          effects: [{ kind: "apply_status", statusId: "suppressed", duration: 2, potency: 12 }],
        },
        {
          id: "action/experimental-injection",
          name: "Experimental Injection",
          weight: 16,
          cooldown: 4,
          targeting: "enemy_lowest_hp",
          effects: [
            { kind: "damage", basePower: 26, scalingStat: "strength", scalingFactor: 1.1 },
            { kind: "apply_status", statusId: "exposed", duration: 2, potency: 10 },
          ],
          phaseIndices: [1, 2],
        },
        {
          id: "action/containment-breach",
          name: "Containment Breach",
          weight: 8,
          cooldown: 5,
          targeting: "all_enemies",
          effects: [
            { kind: "damage", basePower: 22, scalingStat: "strength", scalingFactor: 1.0 },
            { kind: "apply_status", statusId: "bleeding", duration: 3, potency: 12 },
          ],
          phaseIndices: [2],
        },
      ],
      reactionHooks: [
        {
          trigger: "on_phase_enter",
          target: "boss_self",
          effects: [
            { kind: "shield", basePower: 18, scalingStat: "resilience", scalingFactor: 0.4 },
          ],
          usesRemaining: 2,
        },
      ],
      summonDefinitions: [
        {
          summonId: "summon/culture-cluster",
          label: "Culture Cluster",
          stats: { attack: 10, defense: 4, hp: 22, speed: 16, threat: 20 },
          actions: [
            {
              id: "action/culture-cluster/acid-spit",
              name: "Acid Spit",
              weight: 100,
              cooldown: 0,
              targeting: "random_enemy",
              effects: [
                { kind: "damage", basePower: 8, scalingStat: "strength", scalingFactor: 0.4 },
              ],
            },
          ],
        },
      ],
    },
  },
];

export const bossById: ReadonlyMap<string, BossProfile> = new Map(
  bossTemplates.map((b) => [b.bossId, b]),
);

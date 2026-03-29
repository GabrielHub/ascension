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

  // ── New bosses ──────────────────────────────────────────────────────

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
];

export const bossById: ReadonlyMap<string, BossProfile> = new Map(
  bossTemplates.map((b) => [b.bossId, b]),
);

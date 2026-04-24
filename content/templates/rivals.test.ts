import { describe, expect, it } from "vitest";

import { validateRivalRecords } from "./rivals";
import type { RivalRecord } from "./rival-records/schema";

function makeCompleteRival(overrides: Partial<RivalRecord> = {}): RivalRecord {
  return {
    id: "rival/test",
    guildName: "Test Guild",
    shortDisplayName: "Test",
    leader: { name: "Test Leader" },
    pressureLane: "hybrid",
    copy: { currentRivalOneLiner: "One line." },
    assetPaths: {
      leaderPortrait: "/data/rivals/test/leader-neutral.png",
      insignia: "/data/rivals/test/insignia.png",
    },
    narrativeProfile: {
      operatingBase: "Base.",
      publicPitch: "Pitch.",
      pressureStyle: "Style.",
      rivalryFantasy: "Fantasy.",
      toneAndVoice: "Tone.",
    },
    moves: [
      makeMove("rival-move/test/one"),
      makeMove("rival-move/test/two"),
      makeMove("rival-move/test/three"),
    ],
    ...overrides,
  } satisfies RivalRecord;
}

function makeMove(id: string): RivalRecord["moves"][number] {
  return {
    id,
    family: "contract_challenge",
    weight: 5,
    cooldownMinutes: 720,
    briefingTemplate: "A briefing.",
    basePublicPressureDelta: 2,
    baseIntensityDelta: 2,
    choices: [
      {
        choiceId: "accept",
        label: "Accept",
        description: "Accept the move.",
        consequenceSummary: "Treasury down.",
        effects: [{ kind: "treasury_delta", targetRef: "guild", value: -50 }],
      },
      {
        choiceId: "decline",
        label: "Decline",
        description: "Decline the move.",
        consequenceSummary: "Reputation down.",
        effects: [{ kind: "reputation_delta", targetRef: "guild", value: -1 }],
      },
    ],
  };
}

describe("validateRivalRecords", () => {
  it("accepts a complete rival record", () => {
    expect(validateRivalRecords([makeCompleteRival()])).toEqual([]);
  });

  it("rejects a rival without a narrative profile", () => {
    const rival = makeCompleteRival({
      narrativeProfile: {
        operatingBase: "",
        publicPitch: "",
        pressureStyle: "",
        rivalryFantasy: "",
        toneAndVoice: "",
      },
    });
    const issues = validateRivalRecords([rival]);
    expect(issues.length).toBeGreaterThan(0);
    expect(issues.every((issue) => issue.rivalId === rival.id)).toBe(true);
    expect(issues.some((issue) => issue.message.includes("narrativeProfile"))).toBe(true);
  });

  it("rejects a rival with fewer than three moves", () => {
    const rival = makeCompleteRival({
      moves: [makeMove("rival-move/test/one"), makeMove("rival-move/test/two")],
    });
    const issues = validateRivalRecords([rival]);
    expect(issues.some((issue) => issue.message.includes("at least three templates"))).toBe(true);
  });

  it("rejects a move with an empty choice effects list", () => {
    const rival = makeCompleteRival({
      moves: [
        {
          ...makeMove("rival-move/test/one"),
          choices: [
            {
              choiceId: "accept",
              label: "Accept",
              description: "desc",
              consequenceSummary: "summary",
              effects: [],
            },
            {
              choiceId: "decline",
              label: "Decline",
              description: "desc",
              consequenceSummary: "summary",
              effects: [{ kind: "reputation_delta", targetRef: "guild", value: -1 }],
            },
          ],
        },
        makeMove("rival-move/test/two"),
        makeMove("rival-move/test/three"),
      ],
    });
    const issues = validateRivalRecords([rival]);
    expect(issues.some((issue) => issue.message.includes("at least one effect"))).toBe(true);
  });

  it("rejects a move with an unsupported effect kind", () => {
    const rival = makeCompleteRival({
      moves: [
        {
          ...makeMove("rival-move/test/one"),
          choices: [
            {
              choiceId: "accept",
              label: "Accept",
              description: "desc",
              consequenceSummary: "summary",
              effects: [{ kind: "made_up_kind" as never, targetRef: "guild", value: 1 }],
            },
            {
              choiceId: "decline",
              label: "Decline",
              description: "desc",
              consequenceSummary: "summary",
              effects: [{ kind: "reputation_delta", targetRef: "guild", value: -1 }],
            },
          ],
        },
        makeMove("rival-move/test/two"),
        makeMove("rival-move/test/three"),
      ],
    });
    const issues = validateRivalRecords([rival]);
    expect(issues.some((issue) => issue.message.includes("unsupported kind"))).toBe(true);
  });

  it("rejects duplicate move ids within the same rival", () => {
    const rival = makeCompleteRival({
      moves: [
        makeMove("rival-move/test/same"),
        makeMove("rival-move/test/same"),
        makeMove("rival-move/test/three"),
      ],
    });
    const issues = validateRivalRecords([rival]);
    expect(issues.some((issue) => issue.message.includes("duplicate id"))).toBe(true);
  });
});

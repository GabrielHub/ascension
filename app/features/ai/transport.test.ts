import { afterEach, describe, expect, it, vi } from "vitest";

import { generate, parseGenerationContent } from "./transport";

const request = {
  surface: "incident-framing" as const,
  subjectId: "incident/test",
  payloadVersion: 2,
  config: {
    runtimeKind: "ollama" as const,
    baseUrl: "http://127.0.0.1:11434/v1",
    modelId: "gemma4:26b",
  },
  payload: {
    incidentId: "incident/test",
    templateId: "incident/personnel-friction",
    templateName: "Personnel Friction Report",
    category: "personnel_conflict",
    tags: ["conflict", "morale"],
    triggerFamily: "operator_conflict",
    guildName: "Testing Guild",
    buildingId: "building/bodega",
    buildingName: "Bodega HQ",
    dayNumber: 2,
    minuteOfDay: 600,
    presenter: {
      id: "presenter/assistant",
      name: "Mara Cordero",
      roleTitle: "Assistant",
      voiceBrief: "Matter-of-fact, calm, grounded in operations.",
      domainSummary: "Contracts, operations, and campaign guidance.",
      expression: "concerned",
    },
    subjectSummary: "Rose Vega, Milo Hart",
    operators: [],
    choices: [
      {
        choiceId: "mediate",
        defaultLabel: "Mediate Directly",
        defaultDescription: "Sit both operators down and work through the friction point.",
        defaultConsequenceSummary: "Minor morale boost for both, slight loyalty increase.",
        deterministicEffects: [
          { kind: "morale_delta", targetRef: "subject_a", value: 5 },
          { kind: "morale_delta", targetRef: "subject_b", value: 5 },
        ],
      },
    ],
  },
};

describe("AI transport parsing", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("accepts JSON wrapped in prose from a local model", () => {
    const result = parseGenerationContent(
      request,
      `Here is the requested object:\n${JSON.stringify({
        title: "Personnel Friction Notice",
        briefing:
          "Two operators let a small procedural dispute spread across the room before anybody finished their coffee. Management needs to settle the tone before the rest of the shift starts taking sides.",
        choices: [
          {
            choiceId: "mediate",
            label: "Pull Them In",
            description: "Get the principals in a room and settle it before the shift curdles.",
            consequenceSummary: "Morale recovers a little and the room calms down.",
            resolutionSummary:
              "The meeting stayed awkward, but the argument stopped owning the day.",
          },
        ],
      })}`,
    );

    expect(result.output).toMatchObject({
      title: "Personnel Friction Notice",
      choices: [{ choiceId: "mediate" }],
    });
  });

  it("accepts JSON wrapped in a fenced code block", () => {
    const result = parseGenerationContent(
      request,
      [
        "```json",
        '{"title":"Shift Conduct Notice","briefing":"A staffing dispute spilled into the room before the day properly started. Management has to close it down before it becomes the shift\\u0027s only topic.","choices":[{"choiceId":"mediate","label":"Close the Door","description":"Bring the operators in and settle it before everyone else starts commenting.","consequenceSummary":"The issue cools off without becoming a spectacle.","resolutionSummary":"The room stayed tense for a minute, then everyone got back to work."}]}',
        "```",
      ].join("\n"),
    );

    expect(result.output).toMatchObject({
      title: "Shift Conduct Notice",
      choices: [{ choiceId: "mediate" }],
    });
  });

  it("accumulates streamed chat completion chunks through the shared generate path", async () => {
    const rawJson = JSON.stringify({
      title: "Personnel Friction Notice",
      briefing:
        "Two operators let a small procedural dispute spread across the room before anybody finished their coffee. Management needs to settle the tone before the rest of the shift starts taking sides.",
      choices: [
        {
          choiceId: "mediate",
          label: "Pull Them In",
          description: "Get the principals in a room and settle it before the shift curdles.",
          consequenceSummary: "Morale recovers a little and the room calms down.",
          resolutionSummary: "The meeting stayed awkward, but the argument stopped owning the day.",
        },
      ],
    });
    const chunks = [rawJson.slice(0, 48), rawJson.slice(48, 120), rawJson.slice(120)];
    const streamBody = new ReadableStream({
      start(controller) {
        for (const chunk of chunks) {
          controller.enqueue(
            new TextEncoder().encode(
              `data: ${JSON.stringify({ choices: [{ delta: { content: chunk } }] })}\n\n`,
            ),
          );
        }
        controller.enqueue(new TextEncoder().encode("data: [DONE]\n\n"));
        controller.close();
      },
    });

    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(streamBody, {
            status: 200,
            headers: {
              "Content-Type": "text/event-stream",
            },
          }),
      ),
    );

    const progress = vi.fn();
    const result = await generate(request, {
      onProgress: progress,
    });

    expect(result.output).toMatchObject({
      title: "Personnel Friction Notice",
      choices: [{ choiceId: "mediate" }],
    });
    expect(progress).toHaveBeenCalled();
    expect(progress.mock.calls.some(([event]) => event.phase === "streaming")).toBe(true);
    expect(progress.mock.calls.some(([event]) => event.phase === "validating")).toBe(true);
  });
});

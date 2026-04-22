import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import type { InterruptionInstance } from "sim";

import { InterruptionHost } from "./interruption-host";

describe("interruption host", () => {
  it("renders incident subtitles with display labels instead of raw ids", () => {
    const incident: InterruptionInstance = {
      instanceId: "interruption-1",
      type: "incident",
      priority: 70,
      blockingMode: "blocking",
      createdAtMinute: 120,
      sourceSystem: "test",
      dismissible: false,
      persistence: "persistent",
      payload: {
        kind: "incident",
        incidentInstanceId: "incident-1",
        templateId: "incident/injury-complication",
        category: "injury_setback",
        title: "Recovery Complication Notice",
        briefing: "Vera Santos's recovery has hit a complication.",
        subjectSummary: "Vera Santos",
        choices: [],
        boundContext: {
          operatorIds: ["operator/vera-santos"],
        },
        presenterId: "presenter/assistant",
        presenterExpression: "concerned",
      },
    };

    const html = renderToStaticMarkup(
      <InterruptionHost activeInterruption={incident} onResolve={vi.fn()} onDismiss={vi.fn()} />,
    );

    expect(html).toContain("Injury Setback");
    expect(html).toContain("Vera Santos");
    expect(html).toContain("Mara Cordero");
    expect(html).toContain("/data/presenters/assistant/concerned.png");
    expect(html).not.toContain("injury_setback");
    expect(html).not.toContain("operator/vera-santos");
  });

  it("renders incident choices with interactive hover utility classes", () => {
    const incident: InterruptionInstance = {
      instanceId: "interruption-choices",
      type: "incident",
      priority: 70,
      blockingMode: "blocking",
      createdAtMinute: 120,
      sourceSystem: "test",
      dismissible: false,
      persistence: "persistent",
      payload: {
        kind: "incident",
        incidentInstanceId: "incident-choices",
        templateId: "incident/test-choice",
        category: "injury_setback",
        title: "Recovery Complication Notice",
        briefing: "Vera Santos's recovery has hit a complication.",
        subjectSummary: "Vera Santos",
        choices: [
          {
            choiceId: "choice-1",
            label: "Push through",
            description: "Accept a painful treatment plan with a faster recovery window.",
            consequenceSummary: "Morale drops slightly",
          },
        ],
        boundContext: {
          operatorIds: ["operator/vera-santos"],
        },
      },
    };

    const html = renderToStaticMarkup(
      <InterruptionHost activeInterruption={incident} onResolve={vi.fn()} onDismiss={vi.fn()} />,
    );

    expect(html).toContain("group-hover:text-gold");
    expect(html).toContain("hover:border-[rgba(200,168,76,0.22)]");
    expect(html).toContain("Push through");
  });

  it("renders skyscraper relocation decision copy against the final HQ target", () => {
    const interruption: InterruptionInstance = {
      instanceId: "interruption-relocation-skyscraper",
      type: "relocation",
      priority: 85,
      blockingMode: "blocking",
      createdAtMinute: 120,
      sourceSystem: "relocation-system",
      dismissible: false,
      persistence: "persistent",
      payload: {
        kind: "relocation",
        eventId: "event/relocation/porters-to-skyscraper",
        beat: "decision",
        buildingFromId: "building/porters",
        buildingToId: "building/skyscraper",
        treasuryCost: 3000,
        presenterId: "presenter/assistant",
        presenterExpression: "concerned",
      },
    };

    const html = renderToStaticMarkup(
      <InterruptionHost
        activeInterruption={interruption}
        onResolve={vi.fn()}
        onDismiss={vi.fn()}
      />,
    );

    expect(html).toContain("Relocate to Ascension Tower?");
    expect(html).toContain("Porter&#x27;s closes as headquarters.");
    expect(html).toContain("Ascension Tower starts with 11 rooms across five floors");
    expect(html).not.toContain("Relocate to Porter's?");
    expect(html).not.toContain("The bodega lease terminates.");
  });

  it("renders skyscraper relocation landing copy for the tower arrival", () => {
    const interruption: InterruptionInstance = {
      instanceId: "interruption-relocation-skyscraper-moving",
      type: "relocation",
      priority: 85,
      blockingMode: "blocking",
      createdAtMinute: 120,
      sourceSystem: "relocation-system",
      dismissible: false,
      persistence: "persistent",
      payload: {
        kind: "relocation",
        eventId: "event/relocation/porters-to-skyscraper",
        beat: "moving",
        buildingFromId: "building/porters",
        buildingToId: "building/skyscraper",
        treasuryCost: 3000,
        presenterId: "presenter/assistant",
        presenterExpression: "neutral",
      },
    };

    const html = renderToStaticMarkup(
      <InterruptionHost
        activeInterruption={interruption}
        guildName="Ascension Guild"
        playerName="Testing"
        onResolve={vi.fn()}
        onDismiss={vi.fn()}
      />,
    );

    expect(html).toContain("Welcome to Ascension Tower");
    expect(html).toContain("Midtown, Manhattan");
    expect(html).toContain("Porter&#x27;s closed as headquarters for the last time.");
    expect(html).toContain("It is not comfortable yet. But it is permanent.");
    expect(html).not.toContain("Welcome to Porter's");
    expect(html).not.toContain("Red Hook, Brooklyn");
  });
});

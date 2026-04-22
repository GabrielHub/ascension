import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { GuidanceHost } from "./guidance-host";

describe("guidance host", () => {
  it("renders presenter-bound fallback guidance with portrait metadata", () => {
    const html = renderToStaticMarkup(
      <GuidanceHost
        activeBeat={{
          beatId: "guidance/opening/board-briefing",
          track: "opening",
          deliveryMode: "focused",
          target: null,
          fallbackIntent: null,
          presenterId: "presenter/assistant",
          presenterExpression: "serious",
          copy: {
            title: "Welcome, Boss",
            subtitle: "Operations Briefing",
            body: "Pick a contract and keep the lights on.",
            ctaLabel: "Understood",
          },
          milestoneOrder: 1,
          totalMilestones: 13,
          completionKind: "acknowledged",
          requiresManualCompletion: true,
          pauseWorld: true,
          allowSkip: false,
        }}
        anchorBounds={null}
        onComplete={vi.fn()}
        onDismiss={vi.fn()}
        progress={{ current: 0, total: 13 }}
      />,
    );

    expect(html).toContain("Mara Cordero");
    expect(html).toContain("/data/presenters/assistant/serious.png");
    expect(html).toContain("Operations Briefing");
  });

  it("keeps rendering cleanly when no presenter is bound", () => {
    const html = renderToStaticMarkup(
      <GuidanceHost
        activeBeat={{
          beatId: "guidance/opening/first-contract-choice",
          track: "opening",
          deliveryMode: "focused",
          target: null,
          fallbackIntent: null,
          copy: {
            title: "Secure Your First Contract",
            body: "Open the board and file one bid.",
            ctaLabel: "Select a contract",
          },
          milestoneOrder: 2,
          totalMilestones: 13,
          completionKind: "contract_secured",
          pauseWorld: true,
          allowSkip: false,
        }}
        anchorBounds={null}
        onComplete={vi.fn()}
        onDismiss={vi.fn()}
        progress={{ current: 1, total: 13 }}
      />,
    );

    expect(html).toContain("Secure Your First Contract");
    expect(html).not.toContain("Presenter");
    expect(html).not.toContain("/data/presenters/");
  });
});

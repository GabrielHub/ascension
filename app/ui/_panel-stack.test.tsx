import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { PanelFrame, PanelStack, type PanelStackEntry } from "./_panel-stack";

function buildEntry(id: string, label: string): PanelStackEntry {
  return {
    id,
    content: (
      <PanelFrame title={label} testId={`panel-${id}`}>
        <div data-testid={`body-${id}`}>{label}</div>
      </PanelFrame>
    ),
  };
}

describe("PanelStack", () => {
  it("renders nothing when the stack is empty", () => {
    const html = renderToStaticMarkup(<PanelStack entries={[]} onClose={() => {}} />);
    expect(html).toBe("");
  });

  it("renders each entry in order with its id and index", () => {
    const entries = [buildEntry("root", "Root"), buildEntry("branch", "Branch")];
    const html = renderToStaticMarkup(
      <PanelStack entries={entries} onClose={() => {}} testId="stack" />,
    );

    expect(html).toContain('data-testid="stack"');
    expect(html).toContain('data-panel-id="root"');
    expect(html).toContain('data-panel-id="branch"');
    expect(html).toContain('data-panel-index="0"');
    expect(html).toContain('data-panel-index="1"');
    expect(html.indexOf("Root")).toBeLessThan(html.indexOf("Branch"));
  });

  it("applies the per-entry width class when supplied", () => {
    const entries: PanelStackEntry[] = [
      { id: "wide", widthClass: "w-[32rem]", content: <div>wide</div> },
      { id: "default", content: <div>default</div> },
    ];
    const html = renderToStaticMarkup(<PanelStack entries={entries} onClose={() => {}} />);

    expect(html).toContain("w-[32rem]");
    expect(html).toContain("w-[24rem]");
  });

  it("renders the close control inside PanelFrame when onClose is provided", () => {
    const onClose = vi.fn();
    const html = renderToStaticMarkup(
      <PanelFrame title="Sample" onClose={onClose} testId="sample">
        body
      </PanelFrame>,
    );

    expect(html).toContain('data-testid="sample-close"');
    expect(html).toContain('aria-label="Close panel"');
    expect(onClose).not.toHaveBeenCalled();
  });

  it("omits the close control when no onClose is supplied", () => {
    const html = renderToStaticMarkup(<PanelFrame title="Sample">body</PanelFrame>);
    expect(html).not.toContain('aria-label="Close panel"');
  });

  it("marks the outer container as horizontally scrollable so stacked panels never overlap", () => {
    const entries = [buildEntry("a", "A"), buildEntry("b", "B"), buildEntry("c", "C")];
    const html = renderToStaticMarkup(
      <PanelStack entries={entries} onClose={() => {}} testId="stack" />,
    );

    expect(html).toContain("overflow-x-auto");
    expect(html).toContain("justify-end");
  });
});

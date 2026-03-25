import * as z from "zod/v4";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { TauriDesktopHarness, type ScenarioName } from "../harness";

const server = new McpServer({
  name: "ascension-tauri-test",
  version: "0.1.0",
});

let harness: TauriDesktopHarness | undefined;

function getHarness(): TauriDesktopHarness {
  if (!harness) {
    harness = new TauriDesktopHarness();
  }

  return harness;
}

function textResult(value: unknown) {
  return {
    content: [
      {
        type: "text" as const,
        text: typeof value === "string" ? value : JSON.stringify(value, null, 2),
      },
    ],
  };
}

server.registerTool(
  "app_launch",
  {
    description: "Launch the Ascension Tauri desktop app through tauri-driver.",
    inputSchema: {},
  },
  async () => {
    await getHarness().launch();
    return textResult({ ok: true });
  },
);

server.registerTool(
  "app_close",
  {
    description: "Close the Ascension Tauri desktop app and the tauri-driver session.",
    inputSchema: {},
  },
  async () => {
    await getHarness().close();
    return textResult({ ok: true });
  },
);

server.registerTool(
  "page_snapshot",
  {
    description: "Return the current page DOM snapshot from the Tauri app.",
    inputSchema: {},
  },
  async () => textResult(await getHarness().pageSnapshot()),
);

server.registerTool(
  "click",
  {
    description: "Click a DOM element in the Tauri app using a CSS selector.",
    inputSchema: {
      selector: z.string(),
    },
  },
  async ({ selector }) => {
    await getHarness().click(selector);
    return textResult({ ok: true });
  },
);

server.registerTool(
  "type",
  {
    description: "Type text into a DOM element in the Tauri app using a CSS selector.",
    inputSchema: {
      selector: z.string(),
      text: z.string(),
    },
  },
  async ({ selector, text }) => {
    await getHarness().type(selector, text);
    return textResult({ ok: true });
  },
);

server.registerTool(
  "press_key",
  {
    description: "Press a keyboard key in the active Tauri app window.",
    inputSchema: {
      key: z.string(),
    },
  },
  async ({ key }) => {
    await getHarness().pressKey(key);
    return textResult({ ok: true });
  },
);

server.registerTool(
  "wait_for_text",
  {
    description: "Wait until the current Tauri page contains the given text.",
    inputSchema: {
      text: z.string(),
      timeoutMs: z.number().optional(),
    },
  },
  async ({ text, timeoutMs }) => {
    await getHarness().waitForText(text, timeoutMs);
    return textResult({ ok: true });
  },
);

server.registerTool(
  "wait_for_selector",
  {
    description: "Wait until a DOM element exists in the Tauri app.",
    inputSchema: {
      selector: z.string(),
      timeoutMs: z.number().optional(),
    },
  },
  async ({ selector, timeoutMs }) => {
    await getHarness().waitForSelector(selector, timeoutMs);
    return textResult({ ok: true });
  },
);

server.registerTool(
  "wait_for_selector_gone",
  {
    description: "Wait until a DOM element no longer exists in the Tauri app.",
    inputSchema: {
      selector: z.string(),
      timeoutMs: z.number().optional(),
    },
  },
  async ({ selector, timeoutMs }) => {
    await getHarness().waitForSelectorGone(selector, timeoutMs);
    return textResult({ ok: true });
  },
);

server.registerTool(
  "take_screenshot",
  {
    description: "Capture a screenshot from the Tauri app.",
    inputSchema: {
      filename: z.string().optional(),
    },
  },
  async ({ filename }) => textResult(await getHarness().takeScreenshot(filename)),
);

server.registerTool(
  "exists",
  {
    description: "Check whether a DOM element exists in the Tauri app.",
    inputSchema: {
      selector: z.string(),
    },
  },
  async ({ selector }) => textResult(await getHarness().exists(selector)),
);

server.registerTool(
  "count",
  {
    description: "Count matching DOM elements in the Tauri app.",
    inputSchema: {
      selector: z.string(),
    },
  },
  async ({ selector }) => textResult(await getHarness().count(selector)),
);

server.registerTool(
  "get_text",
  {
    description: "Read text from the first DOM element matching a selector in the Tauri app.",
    inputSchema: {
      selector: z.string(),
    },
  },
  async ({ selector }) => textResult(await getHarness().getText(selector)),
);

server.registerTool(
  "list_texts",
  {
    description: "Read text from all DOM elements matching a selector in the Tauri app.",
    inputSchema: {
      selector: z.string(),
    },
  },
  async ({ selector }) => textResult(await getHarness().listTexts(selector)),
);

server.registerTool(
  "click_by_text",
  {
    description: "Click the nth matching clickable element by visible text in the Tauri app.",
    inputSchema: {
      exact: z.boolean().optional(),
      index: z.number().optional(),
      selector: z.string().optional(),
      text: z.string(),
    },
  },
  async ({ exact, index, selector, text }) => {
    await getHarness().clickByText(text, { exact, index, selector });
    return textResult({ ok: true });
  },
);

server.registerTool(
  "read_console",
  {
    description: "Read browser console logs from the Tauri app session.",
    inputSchema: {},
  },
  async () => textResult(await getHarness().readConsole()),
);

server.registerTool(
  "read_network",
  {
    description: "Read captured network logs from the Tauri app session if available.",
    inputSchema: {},
  },
  async () => textResult(await getHarness().readNetwork()),
);

server.registerTool(
  "run_script",
  {
    description: "Run JavaScript in the Tauri app page context.",
    inputSchema: {
      args: z.array(z.unknown()).optional(),
      source: z.string(),
    },
  },
  async ({ args, source }) => textResult(await getHarness().runScript(source, args ?? [])),
);

server.registerTool(
  "set_window_size",
  {
    description: "Resize the Tauri app window.",
    inputSchema: {
      height: z.number(),
      width: z.number(),
    },
  },
  async ({ height, width }) => {
    await getHarness().setWindowSize(width, height);
    return textResult({ ok: true });
  },
);

server.registerTool(
  "run_scenario",
  {
    description: "Run a checked-in Tauri desktop scenario helper.",
    inputSchema: {
      destinationPath: z.string().optional(),
      name: z.enum([
        "start-screen",
        "sandbox-entry",
        "new-game",
        "load-slot",
        "delete-slot",
        "import-slot",
        "export-slot",
      ] satisfies [ScenarioName, ...ScenarioName[]]),
      slotId: z.string().optional(),
      sourcePath: z.string().optional(),
    },
  },
  async ({ destinationPath, name, slotId, sourcePath }) =>
    textResult(await getHarness().runScenario(name, { destinationPath, slotId, sourcePath })),
);

const transport = new StdioServerTransport();
await server.connect(transport);

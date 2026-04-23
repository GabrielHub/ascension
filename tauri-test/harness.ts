import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { spawn, spawnSync, type ChildProcess } from "node:child_process";

import { remote, type Browser } from "webdriverio";

import {
  ensureTauriArtifactDirs,
  tauriArtifactsDir,
  tauriLogsDir,
  tauriScreenshotsDir,
  timestampedArtifactPath,
} from "./paths";

export interface ScenarioParams {
  destinationPath?: string;
  slotId?: string;
  sourcePath?: string;
}

export type ScenarioName =
  | "start-screen"
  | "sandbox-entry"
  | "new-game"
  | "load-slot"
  | "delete-slot"
  | "import-slot"
  | "export-slot";

function waitForPort(port: number, timeoutMs: number): Promise<void> {
  const startedAt = Date.now();

  return new Promise((resolve, reject) => {
    const tryConnect = () => {
      const socket = net.createConnection({ host: "127.0.0.1", port });
      socket.on("connect", () => {
        socket.end();
        resolve();
      });
      socket.on("error", () => {
        socket.destroy();
        if (Date.now() - startedAt >= timeoutMs) {
          reject(new Error(`Timed out waiting for port ${port}.`));
          return;
        }

        setTimeout(tryConnect, 250);
      });
    };

    tryConnect();
  });
}

function resolveTauriDriverPath(): string {
  return (
    process.env.TAURI_DRIVER_PATH ??
    path.join(
      os.homedir(),
      ".cargo",
      "bin",
      process.platform === "win32" ? "tauri-driver.exe" : "tauri-driver",
    )
  );
}

function resolveApplicationPath(): string {
  const targetDir = resolveCargoTargetDir();
  return (
    process.env.TAURI_APPLICATION_PATH ??
    path.join(
      targetDir,
      "release",
      process.platform === "win32" ? "ascension-desktop.exe" : "ascension-desktop",
    )
  );
}

function resolveCargoTargetDir(): string {
  const configured = process.env.CARGO_TARGET_DIR;
  if (!configured) {
    return path.resolve("src-tauri", "target");
  }

  return path.isAbsolute(configured) ? configured : path.resolve(configured);
}

function resolveTauriCliCommand(): { command: string; args: string[] } {
  return {
    command: process.execPath,
    args: [path.resolve("node_modules", "@tauri-apps", "cli", "tauri.js"), "build", "--no-bundle"],
  };
}

function ensureExecutableExists(filePath: string, label: string): void {
  if (!fs.existsSync(filePath)) {
    throw new Error(`${label} was not found at ${filePath}.`);
  }
}

function buildDesktopBinary(applicationPath: string): void {
  const targetDir = resolveCargoTargetDir();
  fs.mkdirSync(targetDir, { recursive: true });
  const cli = resolveTauriCliCommand();

  const result = spawnSync(cli.command, cli.args, {
    cwd: process.cwd(),
    stdio: "inherit",
    env: {
      ...process.env,
      CARGO_TARGET_DIR: targetDir,
    },
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(`tauri build failed with exit code ${result.status ?? "unknown"}.`);
  }

  ensureExecutableExists(applicationPath, "Built desktop application");
}

export class TauriDesktopHarness {
  private browser?: Browser;
  private driverProcess?: ChildProcess;

  async launch(): Promise<void> {
    ensureTauriArtifactDirs();
    const applicationPath = resolveApplicationPath();
    buildDesktopBinary(applicationPath);

    const driverPath = resolveTauriDriverPath();
    ensureExecutableExists(driverPath, "tauri-driver");

    this.driverProcess = spawn(driverPath, [], {
      cwd: process.cwd(),
      stdio: "inherit",
    });

    await waitForPort(4444, 15000);

    this.browser = await remote({
      hostname: "127.0.0.1",
      port: 4444,
      path: "/",
      logLevel: "error",
      capabilities: {
        "tauri:options": {
          application: applicationPath,
        },
      } as object,
    });

    await this.waitUntil(
      async () => {
        const ready = await this.runScript<boolean>(
          "return Boolean(window.__ASCENSION_DESKTOP_TEST__);",
        );
        return ready;
      },
      15000,
      "Timed out waiting for the desktop test driver to register.",
    );
  }

  async close(): Promise<void> {
    try {
      if (this.browser) {
        await this.browser.deleteSession();
      }
    } finally {
      this.browser = undefined;
      if (this.driverProcess) {
        this.driverProcess.kill();
        this.driverProcess = undefined;
      }
    }
  }

  async getUrl(): Promise<string> {
    this.assertBrowser();
    return this.browser!.getUrl();
  }

  async pageSnapshot(): Promise<string> {
    this.assertBrowser();
    return this.browser!.getPageSource();
  }

  async click(selector: string): Promise<void> {
    this.assertBrowser();
    await this.browser!.$(selector).click();
  }

  async type(selector: string, text: string): Promise<void> {
    this.assertBrowser();
    const element = await this.browser!.$(selector);
    await element.setValue(text);
  }

  async pressKey(key: string): Promise<void> {
    this.assertBrowser();
    await this.browser!.keys(key);
  }

  async waitForText(text: string, timeoutMs = 15000): Promise<void> {
    await this.waitUntil(
      async () => (await this.pageSnapshot()).includes(text),
      timeoutMs,
      `Timed out waiting for text: ${text}`,
    );
  }

  async waitForSelector(selector: string, timeoutMs = 15000): Promise<void> {
    this.assertBrowser();
    const element = await this.browser!.$(selector);
    await element.waitForExist({ timeout: timeoutMs });
  }

  async waitForSelectorGone(selector: string, timeoutMs = 15000): Promise<void> {
    this.assertBrowser();
    const element = await this.browser!.$(selector);
    await element.waitForExist({ timeout: timeoutMs, reverse: true });
  }

  async exists(selector: string): Promise<boolean> {
    this.assertBrowser();
    return (await this.browser!.$(selector)).isExisting();
  }

  async count(selector: string): Promise<number> {
    this.assertBrowser();
    return (await this.browser!.$$(selector)).length;
  }

  async getText(selector: string): Promise<string | null> {
    return this.runScript<string | null>(
      `
      const [selector] = args;
      const element = document.querySelector(selector);
      if (!element) {
        return null;
      }

      return String(element.textContent ?? "").replace(/\\s+/g, " ").trim();
      `,
      [selector],
    );
  }

  async listTexts(selector: string): Promise<string[]> {
    return this.runScript<string[]>(
      `
      const [selector] = args;
      return Array.from(document.querySelectorAll(selector)).map((element) =>
        String(element.textContent ?? "").replace(/\\s+/g, " ").trim(),
      );
      `,
      [selector],
    );
  }

  async clickByText(
    text: string,
    options: {
      exact?: boolean;
      index?: number;
      selector?: string;
    } = {},
  ): Promise<void> {
    const clicked = await this.runScript<boolean>(
      `
      const [targetText, selector, exact, index] = args;
      const normalize = (value) => String(value ?? "").replace(/\\s+/g, " ").trim();
      const expected = normalize(targetText);
      const elements = Array.from(
        document.querySelectorAll(selector || "button, a, [role='button']")
      ).filter((element) => {
        const textValue = normalize(element.textContent);
        return exact ? textValue === expected : textValue.includes(expected);
      });
      const element = elements[index ?? 0];
      if (!element) {
        return false;
      }
      element.scrollIntoView({ block: "center", inline: "center" });
      if (typeof element.click === "function") {
        element.click();
        return true;
      }
      return false;
      `,
      [
        text,
        options.selector ?? "button, a, [role='button']",
        options.exact ?? false,
        options.index ?? 0,
      ],
    );

    if (!clicked) {
      throw new Error(`Unable to find clickable element containing text "${text}".`);
    }
  }

  async takeScreenshot(filename?: string): Promise<string> {
    this.assertBrowser();
    const target = filename
      ? path.resolve(filename)
      : timestampedArtifactPath(tauriScreenshotsDir, "tauri", "png");
    await this.browser!.saveScreenshot(target);
    return target;
  }

  async readConsole(): Promise<string[]> {
    this.assertBrowser();

    try {
      return (await this.browser!.getLogs("browser")).map((entry) => String(entry));
    } catch {
      return [];
    }
  }

  async readNetwork(): Promise<string[]> {
    return [];
  }

  async runScript<T>(source: string, args: unknown[] = []): Promise<T> {
    this.assertBrowser();

    const result = (await this.browser!.executeAsync(
      (
        scriptSource: string,
        scriptArgs: unknown[],
        done: (value: { ok: boolean; value?: unknown; error?: string }) => void,
      ) => {
        Promise.resolve()
          .then(() => {
            const fn = new Function("args", scriptSource) as (args: unknown[]) => unknown;
            return fn(scriptArgs);
          })
          .then((value) => done({ ok: true, value }))
          .catch((error) =>
            done({ ok: false, error: error instanceof Error ? error.message : String(error) }),
          );
      },
      source,
      args,
    )) as { ok: boolean; value?: T; error?: string };

    if (!result.ok) {
      throw new Error(result.error ?? "Unknown browser script failure.");
    }

    return result.value as T;
  }

  async setWindowSize(width: number, height: number): Promise<void> {
    this.assertBrowser();
    await this.browser!.setWindowSize(width, height);
  }

  async runScenario(name: ScenarioName, params: ScenarioParams = {}): Promise<unknown> {
    switch (name) {
      case "start-screen":
        await this.waitForText("ascension");
        return this.runScript("return window.__ASCENSION_DESKTOP_TEST__.listSlots();");
      case "sandbox-entry":
        await this.runScript("return window.__ASCENSION_DESKTOP_TEST__.enterSandbox();");
        await this.waitForText("Headquarters");
        return { ok: true };
      case "new-game":
        if (!params.slotId) {
          throw new Error("new-game requires slotId.");
        }
        await this.runScript("return window.__ASCENSION_DESKTOP_TEST__.newGame(args[0]);", [
          params.slotId,
        ]);
        await this.waitForText("Headquarters");
        return { ok: true };
      case "load-slot":
        if (!params.slotId) {
          throw new Error("load-slot requires slotId.");
        }
        await this.runScript("return window.__ASCENSION_DESKTOP_TEST__.loadGame(args[0]);", [
          params.slotId,
        ]);
        await this.waitForText("Headquarters");
        return { ok: true };
      case "delete-slot":
        if (!params.slotId) {
          throw new Error("delete-slot requires slotId.");
        }
        await this.runScript("return window.__ASCENSION_DESKTOP_TEST__.deleteSlot(args[0]);", [
          params.slotId,
        ]);
        return this.runScript("return window.__ASCENSION_DESKTOP_TEST__.listSlots();");
      case "import-slot":
        if (!params.slotId || !params.sourcePath) {
          throw new Error("import-slot requires slotId and sourcePath.");
        }
        await this.runScript(
          "return window.__ASCENSION_DESKTOP_TEST__.importSlot(args[0], args[1]);",
          [params.slotId, params.sourcePath],
        );
        return this.runScript("return window.__ASCENSION_DESKTOP_TEST__.listSlots();");
      case "export-slot":
        if (!params.slotId || !params.destinationPath) {
          throw new Error("export-slot requires slotId and destinationPath.");
        }
        await this.runScript(
          "return window.__ASCENSION_DESKTOP_TEST__.exportSlot(args[0], args[1]);",
          [params.slotId, params.destinationPath],
        );
        return {
          destinationPath: params.destinationPath,
        };
      default:
        throw new Error(`Unsupported scenario: ${name satisfies never}`);
    }
  }

  logPath(prefix: string): string {
    return timestampedArtifactPath(tauriLogsDir, prefix, "log");
  }

  artifactPath(prefix: string, extension: string): string {
    return timestampedArtifactPath(tauriArtifactsDir, prefix, extension);
  }

  private assertBrowser(): void {
    if (!this.browser) {
      throw new Error("The Tauri desktop harness has not been launched.");
    }
  }

  private async waitUntil(
    predicate: () => Promise<boolean>,
    timeoutMs: number,
    timeoutMessage: string,
  ): Promise<void> {
    const startedAt = Date.now();

    while (Date.now() - startedAt < timeoutMs) {
      if (await predicate()) {
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, 250));
    }

    throw new Error(timeoutMessage);
  }
}

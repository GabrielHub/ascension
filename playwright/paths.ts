import fs from "node:fs";
import path from "node:path";

export const playwrightRoot = path.resolve("playwright");
export const playwrightScreenshotsDir = path.join(playwrightRoot, "screenshots");
export const playwrightLogsDir = path.join(playwrightRoot, "logs");
export const playwrightArtifactsDir = path.join(playwrightRoot, "artifacts");

const playwrightArtifactDirs = [
  playwrightScreenshotsDir,
  playwrightLogsDir,
  playwrightArtifactsDir,
] as const;

export function ensurePlaywrightArtifactDirs(): void {
  for (const directory of playwrightArtifactDirs) {
    fs.mkdirSync(directory, { recursive: true });
  }
}

export function timestampedArtifactPath(
  directory: string,
  prefix: string,
  extension: string,
): string {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  return path.join(directory, `${prefix}-${stamp}.${extension}`);
}

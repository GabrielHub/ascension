import fs from "node:fs";
import path from "node:path";

export const tauriTestRoot = path.resolve("tauri-test");
export const tauriScreenshotsDir = path.join(tauriTestRoot, "screenshots");
export const tauriLogsDir = path.join(tauriTestRoot, "logs");
export const tauriArtifactsDir = path.join(tauriTestRoot, "artifacts");
const tauriArtifactDirs = [tauriScreenshotsDir, tauriLogsDir, tauriArtifactsDir] as const;

export function ensureTauriArtifactDirs(): void {
  for (const directory of tauriArtifactDirs) {
    fs.mkdirSync(directory, { recursive: true });
  }
}

export function clearTauriArtifactDirs(): void {
  ensureTauriArtifactDirs();

  for (const directory of tauriArtifactDirs) {
    for (const entry of fs.readdirSync(directory)) {
      if (entry === ".gitkeep") {
        continue;
      }

      fs.rmSync(path.join(directory, entry), { force: true, recursive: true });
    }
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

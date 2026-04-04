import { invoke } from "@tauri-apps/api/core";

import type { SaveSlotId } from "save/types";

import { isDesktopHostEnvironment } from "./environment";

export interface DesktopSlotFiles {
  slotId: SaveSlotId;
  primaryJson: string | null;
  backupJson: string | null;
}

export interface DesktopHostEnvironment {
  platform: string;
  appLocalDataDir: string;
  saveDir: string;
  exportDir: string;
  logDir: string;
}

export interface DesktopFileExportResult {
  cancelled: boolean;
  destinationPath?: string;
}

export interface DesktopFileImportResult {
  cancelled: boolean;
  sourcePath?: string;
  json?: string;
}

function assertDesktopHost(): void {
  if (!isDesktopHostEnvironment()) {
    throw new Error("The desktop bridge is only available inside the Tauri desktop host.");
  }
}

export const desktopBridge = {
  isAvailable(): boolean {
    return isDesktopHostEnvironment();
  },

  async getEnvironment(): Promise<DesktopHostEnvironment> {
    assertDesktopHost();
    return invoke("desktop_host_get_environment");
  },

  async readSlotFiles(slotId: SaveSlotId): Promise<DesktopSlotFiles> {
    assertDesktopHost();
    return invoke("desktop_save_read_slot_files", { slotId });
  },

  async writeSlotFile(slotId: SaveSlotId, json: string): Promise<void> {
    assertDesktopHost();
    await invoke("desktop_save_write_slot", { slotId, json });
  },

  async deleteSlotFiles(slotId: SaveSlotId): Promise<void> {
    assertDesktopHost();
    await invoke("desktop_save_delete_slot", { slotId });
  },

  async exportJson(
    json: string,
    suggestedFileName: string,
    destinationPath?: string,
  ): Promise<DesktopFileExportResult> {
    assertDesktopHost();
    return invoke("desktop_save_export_json", {
      json,
      suggestedFileName,
      destinationPath,
    });
  },

  async importJson(sourcePath?: string): Promise<DesktopFileImportResult> {
    assertDesktopHost();
    return invoke("desktop_save_import_json", {
      sourcePath,
    });
  },

  async probeAiRuntime(
    baseUrl: string,
    modelId: string,
  ): Promise<{
    status: string;
    availableModels: string[];
    error: string | null;
  }> {
    assertDesktopHost();
    return invoke("desktop_ai_probe_runtime", { baseUrl, modelId });
  },

  async generateAi(request: {
    baseUrl: string;
    modelId: string;
    systemPrompt: string;
    userPrompt: string;
  }): Promise<{ content: string }> {
    assertDesktopHost();
    return invoke("desktop_ai_generate", { request });
  },
};

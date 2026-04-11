import { exec } from "node:child_process";
import path from "node:path";

import type { PluginOption } from "vite-plus";

export function createSvgCatalogWatcherPlugin(): PluginOption {
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  return {
    name: "ascension-svg-catalog-watcher",
    apply: "serve",
    configureServer(server) {
      const publicData = path.resolve("public", "data");

      function regenerate() {
        exec("npx tsx scripts/generate-svg-asset-catalog.ts", (error, stdout, stderr) => {
          if (error) {
            server.config.logger.error(
              `[svg-catalog] Regeneration failed: ${stderr || error.message}`,
            );
            return;
          }
          server.config.logger.info(`[svg-catalog] ${stdout.trim()}`);

          const catalogPath = path.resolve("content", "data", "svg-asset-catalog.json");
          const modules = server.moduleGraph.getModulesByFile(catalogPath);
          if (modules) {
            for (const mod of modules) {
              server.moduleGraph.invalidateModule(mod);
            }
          }
          server.hot.send({ type: "full-reload" });
        });
      }

      function onSvgChange(filePath: string) {
        const normalized = filePath.replace(/\\/g, "/");
        if (!normalized.includes("public/data/") || !normalized.endsWith(".svg")) return;

        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(regenerate, 300);
      }

      server.watcher.on("add", onSvgChange);
      server.watcher.on("unlink", onSvgChange);
      server.watcher.on("change", onSvgChange);

      server.watcher.add(path.join(publicData, "**", "*.svg"));
    },
  };
}

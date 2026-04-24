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
      const publicRoot = path.resolve("public");

      function isPublicSvg(filePath: string): boolean {
        const normalized = path.resolve(filePath).replace(/\\/g, "/");
        return normalized.includes("/public/data/") && normalized.endsWith(".svg");
      }

      function toPublicUrl(filePath: string): string {
        const relativePath = path.relative(publicRoot, path.resolve(filePath)).replace(/\\/g, "/");
        return `/${relativePath}`;
      }

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

      function onSvgTreeChange(filePath: string) {
        if (!isPublicSvg(filePath)) return;

        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(regenerate, 300);
      }

      function onSvgContentChange(filePath: string) {
        if (!isPublicSvg(filePath)) return;

        server.hot.send({
          type: "custom",
          event: "ascension:svg-assets-changed",
          data: { path: toPublicUrl(filePath) },
        });
      }

      server.watcher.on("add", onSvgTreeChange);
      server.watcher.on("unlink", onSvgTreeChange);
      server.watcher.on("change", onSvgContentChange);

      server.watcher.add(path.join(publicData, "**", "*.svg"));
    },
  };
}

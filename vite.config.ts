import fs from "node:fs/promises";
import path from "node:path";

import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, type PluginOption, type UserConfig } from "vite-plus";

function stripDeprecatedEsbuildConfig(
  config: UserConfig | null | undefined,
): UserConfig | null | undefined {
  if (!config || !("esbuild" in config) || config.esbuild === undefined) {
    return config;
  }

  const { esbuild: _ignored, ...sanitizedConfig } = config;
  return sanitizedConfig;
}

function wrapPluginOption(pluginOption: PluginOption): PluginOption {
  if (!pluginOption) {
    return pluginOption;
  }

  if (Array.isArray(pluginOption)) {
    return pluginOption.map((plugin) => wrapPluginOption(plugin));
  }

  if (typeof pluginOption === "object" && "name" in pluginOption && "config" in pluginOption) {
    const originalConfig = pluginOption.config;

    if (!originalConfig) {
      return pluginOption;
    }

    const wrappedPlugin = { ...pluginOption };

    if (typeof originalConfig === "function") {
      wrappedPlugin.config = async (...args) => {
        const config = await originalConfig(...args);
        return stripDeprecatedEsbuildConfig(config);
      };
      return wrappedPlugin;
    }

    wrappedPlugin.config = {
      ...originalConfig,
      handler: async (...args) => {
        const config = await originalConfig.handler?.(...args);
        return stripDeprecatedEsbuildConfig(config);
      },
    };
    return wrappedPlugin;
  }

  return pluginOption;
}

function reactRouterWithoutDeprecatedEsbuild(): PluginOption {
  return wrapPluginOption(reactRouter());
}

interface ClientManifestEntry {
  css?: string[];
  file: string;
  imports?: string[];
}

interface ClientManifest {
  [key: string]: ClientManifestEntry;
}

interface StaticRouteDefinition {
  hasErrorBoundary: boolean;
  id: string;
  index?: boolean;
  key: string;
  parentId?: string;
  path?: string;
}

const STATIC_ROUTE_DEFINITIONS: StaticRouteDefinition[] = [
  {
    hasErrorBoundary: true,
    id: "root",
    key: "app/root.tsx?__react-router-build-client-route",
    path: "",
  },
  {
    id: "routes/start-screen",
    index: true,
    key: "app/routes/start-screen.tsx?__react-router-build-client-route",
    parentId: "root",
  },
  {
    id: "routes/game",
    key: "app/routes/game.tsx?__react-router-build-client-route",
    parentId: "root",
    path: "game",
  },
  {
    id: "routes/svg-playground",
    key: "app/routes/svg-playground.tsx?__react-router-build-client-route",
    parentId: "root",
    path: "svg-playground",
  },
  {
    id: "routes/svg-assets",
    key: "app/routes/svg-assets.tsx?__react-router-build-client-route",
    parentId: "root",
    path: "svg-assets",
  },
  {
    id: "routes/audio-playground",
    key: "app/routes/audio-playground.tsx?__react-router-build-client-route",
    parentId: "root",
    path: "audio-playground",
  },
];

function toPublicPath(filePath: string): string {
  return `/${filePath.replace(/\\/g, "/")}`;
}

function resolveImports(manifest: ClientManifest, entry: ClientManifestEntry): string[] {
  return (entry.imports ?? [])
    .map((importKey) => manifest[importKey])
    .filter((importEntry): importEntry is ClientManifestEntry => importEntry !== undefined)
    .map((importEntry) => toPublicPath(importEntry.file));
}

function createTauriStaticEntryPlugin(): PluginOption {
  return {
    name: "ascension-tauri-static-entry",
    apply: "build",
    async closeBundle() {
      const clientBuildDir = path.resolve("build", "client");
      const manifestPath = path.join(clientBuildDir, ".vite", "manifest.json");
      const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8")) as ClientManifest;

      const entryClientKey = "app/entry.client.tsx";
      const entryClient = manifest[entryClientKey];
      const rootRoute = manifest["app/root.tsx?__react-router-build-client-route"];

      if (!entryClient) {
        throw new Error(`Missing ${entryClientKey} in ${manifestPath}.`);
      }

      if (!rootRoute) {
        throw new Error(`Missing root route entry in ${manifestPath}.`);
      }

      const routeManifest = Object.fromEntries(
        STATIC_ROUTE_DEFINITIONS.map((route) => {
          const routeEntry = manifest[route.key];

          if (!routeEntry) {
            throw new Error(`Missing ${route.key} in ${manifestPath}.`);
          }

          return [
            route.id,
            {
              caseSensitive: undefined,
              clientActionModule: undefined,
              clientLoaderModule: undefined,
              clientMiddlewareModule: undefined,
              hasAction: false,
              hasClientAction: false,
              hasClientLoader: false,
              hasClientMiddleware: false,
              hasDefaultExport: true,
              hasErrorBoundary: route.hasErrorBoundary,
              hasLoader: false,
              hydrateFallbackModule: undefined,
              id: route.id,
              imports: resolveImports(manifest, routeEntry),
              index: route.index,
              module: toPublicPath(routeEntry.file),
              parentId: route.parentId,
              path: route.path,
            },
          ];
        }),
      );

      const browserManifest = {
        entry: {
          imports: resolveImports(manifest, entryClient),
          module: toPublicPath(entryClient.file),
        },
        routeDiscovery: {
          mode: "initial",
        },
        routes: routeManifest,
        sri: undefined,
        url: "/assets/react-router-browser-manifest.js",
        version: "desktop-static",
      };

      const routeImports = STATIC_ROUTE_DEFINITIONS.map((route, index) => {
        const routeEntry = manifest[route.key]!;
        return `import * as route${index} from "${toPublicPath(routeEntry.file)}";`;
      }).join("\n");

      const routeModuleAssignments = STATIC_ROUTE_DEFINITIONS.map(
        (route, index) => `"${route.id}": route${index}`,
      ).join(", ");

      const stylesheets = (rootRoute.css ?? [])
        .map((cssPath) => `<link rel="stylesheet" href="${toPublicPath(cssPath)}"/>`)
        .join("");

      const modulePreloads = Array.from(
        new Set([
          entryClient.file,
          ...resolveImports(manifest, entryClient).map((importPath) => importPath.slice(1)),
          ...STATIC_ROUTE_DEFINITIONS.flatMap((route) => {
            const routeEntry = manifest[route.key]!;
            return [
              routeEntry.file,
              ...resolveImports(manifest, routeEntry).map((importPath) => importPath.slice(1)),
            ];
          }),
        ]),
      )
        .map((filePath) => `<link rel="modulepreload" href="${toPublicPath(filePath)}"/>`)
        .join("");

      const fontPreloads = [
        "/fonts/inter-400.ttf",
        "/fonts/inter-500.ttf",
        "/fonts/outfit-200.ttf",
        "/fonts/outfit-300.ttf",
        "/fonts/outfit-400.ttf",
        "/fonts/outfit-600.ttf",
      ]
        .map(
          (href) =>
            `<link rel="preload" href="${href}" as="font" type="font/ttf" crossorigin="anonymous"/>`,
        )
        .join("");

      const html = `<!DOCTYPE html>
<html lang="en" data-ascension-static-shell="true">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Ascension</title>
    <meta
      name="description"
      content="Ascension start screen shell for the local-first preproduction build."
    />
    ${fontPreloads}
    ${modulePreloads}
    ${stylesheets}
  </head>
  <body>
    <script>
      window.__reactRouterManifest = ${JSON.stringify(browserManifest)};
      window.__reactRouterContext = {
        basename: "/",
        future: {
          unstable_optimizeDeps: false,
          unstable_previewServerPrerendering: false,
          unstable_subResourceIntegrity: false,
          unstable_trailingSlashAwareDataRequests: false,
          v8_middleware: false,
          v8_splitRouteModules: false,
          v8_viteEnvironmentApi: false
        },
        routeDiscovery: { mode: "initial" },
        ssr: false,
        isSpaMode: false,
        criticalCss: ""
      };
      window.__reactRouterContext.stream = new ReadableStream({
        start(controller) {
          window.__reactRouterContext.streamController = controller;
        }
      }).pipeThrough(new TextEncoderStream());
    </script>
    <script type="module">
      ${routeImports}
      window.__reactRouterRouteModules = { ${routeModuleAssignments} };
      import("${toPublicPath(entryClient.file)}");
    </script>
    <script>
      window.__reactRouterContext.streamController.enqueue(
        "[{\\"_1\\":2,\\"_3\\":-5,\\"_4\\":-5},\\"loaderData\\",{},\\"actionData\\",\\"errors\\"]\\n"
      );
      window.__reactRouterContext.streamController.close();
    </script>
  </body>
</html>
`;

      await fs.writeFile(path.join(clientBuildDir, "index.html"), html, "utf8");
    },
  };
}

export default defineConfig({
  staged: {
    "*": "vp check --fix",
  },
  server: {
    host: "127.0.0.1",
    port: 5173,
  },
  resolve: {
    tsconfigPaths: true,
  },
  plugins: [tailwindcss(), reactRouterWithoutDeprecatedEsbuild(), createTauriStaticEntryPlugin()],
});

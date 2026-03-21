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

export default defineConfig({
  staged: {
    "*": "vp check --fix",
  },
  resolve: {
    tsconfigPaths: true,
  },
  plugins: [tailwindcss(), reactRouterWithoutDeprecatedEsbuild()],
});

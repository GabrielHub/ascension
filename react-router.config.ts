import type { Config } from "@react-router/dev/config";

export default {
  // Ascension is a local-first client app. Keep the router in SPA mode.
  ssr: false,
  routeDiscovery: {
    mode: "initial",
  },
} satisfies Config;

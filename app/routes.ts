import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/start-screen.tsx"),
  route("game", "routes/game.tsx"),
] satisfies RouteConfig;

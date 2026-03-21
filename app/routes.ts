import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/start-screen.tsx"),
  route("game", "routes/game.tsx"),
  route("svg-playground", "routes/svg-playground.tsx"),
] satisfies RouteConfig;

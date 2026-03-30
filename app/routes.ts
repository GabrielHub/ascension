import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/start-screen.tsx"),
  route("game", "routes/game.tsx"),
  route("scene-builder", "routes/scene-builder.tsx"),
  route("svg-playground", "routes/svg-playground.tsx"),
  route("svg-assets", "routes/svg-assets.tsx"),
  route("audio-playground", "routes/audio-playground.tsx"),
] satisfies RouteConfig;

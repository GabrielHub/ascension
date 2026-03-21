import { GameShell } from "../ui/game-shell";

export function meta() {
  return [
    { title: "Ascension | Game Shell" },
    {
      name: "description",
      content: "Ascension gameplay shell placeholder with routing limited to app shell concerns.",
    },
  ];
}

export default function GameRoute() {
  return <GameShell />;
}

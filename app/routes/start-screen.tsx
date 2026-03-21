import { StartScreenShell } from "../ui/start-screen-shell";

export function meta() {
  return [
    { title: "Ascension" },
    {
      name: "description",
      content: "Ascension start screen shell for the local-first preproduction build.",
    },
  ];
}

export default function StartScreenRoute() {
  return <StartScreenShell />;
}

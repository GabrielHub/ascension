import { AudioPlaygroundPage } from "../ui/audio-playground-page";

export function meta() {
  return [
    { title: "Ascension | Audio Playground" },
    {
      name: "description",
      content: "Audio cue playground — gameplay cue and music review before in-game rollout.",
    },
  ];
}

export default function AudioPlaygroundRoute() {
  return <AudioPlaygroundPage />;
}

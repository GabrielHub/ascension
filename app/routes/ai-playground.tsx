import { AiPlaygroundPage } from "../ui/ai-playground-page";

export function meta() {
  return [
    { title: "Ascension | AI Playground" },
    {
      name: "description",
      content:
        "Canon-grounded local AI tooling for inspecting prompts, payloads, and validated outputs.",
    },
  ];
}

export default function AiPlaygroundRoute() {
  return <AiPlaygroundPage />;
}

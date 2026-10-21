import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import { fixture, handover } from "../packages/schema/src/fixtures";
import { passages } from "../services/core/documents";
import { timeline } from "@pragyan/schema";
import fs from "node:fs/promises";
await fs.mkdir("artifacts", { recursive: true });
const serveUrl = await bundle({ entryPoint: "packages/video/src/index.tsx" });
const common = {
  workflow: "concept" as const,
  language: "english" as const,
  audience: "beginner" as const,
  context: "",
  sourceText: "",
};
for (const [name, revision, index] of [
  ["network", fixture({ ...common, title: "How the internet works" }, []), 0],
  ["binary", fixture({ ...common, title: "Binary search" }, []), 1],
  ["math", fixture({ ...common, title: "Binary search" }, []), 2],
  [
    "material",
    fixture(
      {
        ...common,
        title: "A safer equipment handover",
        workflow: "material",
        sourceText: handover,
      },
      passages(handover),
    ),
    0,
  ],
] as const) {
  const t = timeline(revision);
  await renderStill({
    serveUrl,
    composition: await selectComposition({
      serveUrl,
      id: "Pragyan",
      inputProps: { revision, audioUrls: {} },
    }),
    inputProps: { revision, audioUrls: {} },
    frame: t.scenes[index].start + 120,
    output: `artifacts/review-${name}.png`,
  });
  console.log(`Rendered ${name} review frame`);
}

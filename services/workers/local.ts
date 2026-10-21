import "dotenv/config";
import { worker } from "./runtime";
import type { Job } from "../core/model";
if (process.env.RUNTIME === "aws")
  throw new Error("The local worker must not use AWS adapters");
console.log(
  "Local worker: fixture generation, system speech, real local Remotion export. No paid API calls.",
);
let stopping = false;
process.on("SIGINT", () => {
  stopping = true;
});
process.on("SIGTERM", () => {
  stopping = true;
});
while (!stopping) {
  try {
    await worker.reconcile();
    for (const row of await worker.service.store.jobs()) {
      const j = row as Job;
      if (j.stage === "queued") await worker.process(j.id, j.queue);
      else if (j.stage === "rendering") await worker.complete(j.id);
    }
  } catch (e) {
    console.error(
      "Local worker iteration failed",
      e instanceof Error ? e.name : "unknown",
    );
  }
  await new Promise((r) => setTimeout(r, 1500));
}

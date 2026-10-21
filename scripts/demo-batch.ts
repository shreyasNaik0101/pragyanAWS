import fs from "node:fs/promises";
import { handover } from "../packages/schema/src/fixtures";
const base = "http://127.0.0.1:4000/api";
let cookie = "";
async function call(path: string, method = "GET", body?: unknown) {
  const r = await fetch(base + path, {
    method,
    headers: {
      "content-type": "application/json",
      cookie,
      "idempotency-key": crypto.randomUUID(),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (r.headers.has("set-cookie"))
    cookie = r.headers.get("set-cookie")!.split(";")[0];
  const value = (await r.json()) as any;
  if (!r.ok) throw new Error(value.error);
  return value;
}
await call("/auth/local", "POST", { persona: "maya" });
const measurements = [];
for (const [name, title, workflow, sourceText] of [
  ["binary", "Binary search, one decision at a time", "concept", ""],
  ["handover", "A safer equipment handover", "material", handover],
]) {
  const start = Date.now();
  const j = await call("/projects", "POST", {
    title,
    workflow,
    sourceText,
    language: "english",
    audience: "beginner",
    context: "",
  });
  async function wait(id: string) {
    let last = "";
    for (let i = 0; i < 600; i++) {
      const job = await call(`/jobs/${id}`);
      const state = `${name}: ${job.stage} ${job.progress === undefined ? "" : Math.round(job.progress * 100) + "%"}`;
      if (last !== state) {
        last = state;
        console.log(state);
      }
      if (job.stage === "complete") return job;
      if (["failed", "needs_review"].includes(job.stage))
        throw new Error(job.error);
      await new Promise((r) => setTimeout(r, 1500));
    }
    throw new Error("Timed out");
  }
  await wait(j.id);
  const detail = await call("/projects/" + j.projectId);
  const exported = await call(`/projects/${j.projectId}/exports`, "POST", {
    revision: detail.project.revision,
    approved: true,
  });
  const completed = await wait(exported.id);
  const refs = await call(`/jobs/${completed.id}/artifacts`);
  const video = await fetch(refs.video);
  const bytes = Buffer.from(await video.arrayBuffer());
  await fs.writeFile(`artifacts/${name}-local.mp4`, bytes);
  await fs.writeFile(
    `artifacts/${name}-local.vtt`,
    await (await fetch(refs.captions)).text(),
  );
  measurements.push({
    name,
    projectId: j.projectId,
    jobId: exported.id,
    elapsedMs: Date.now() - start,
    videoBytes: bytes.length,
    cloudVerified: false,
  });
  await fs.writeFile(
    "artifacts/local-batch.json",
    JSON.stringify(measurements, null, 2),
  );
}

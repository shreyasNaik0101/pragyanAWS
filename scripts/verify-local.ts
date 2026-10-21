import fs from "node:fs/promises";
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
  const data = (await r.json()) as any;
  if (!r.ok) throw new Error(`${path}: ${r.status} ${data.error}`);
  return data;
}
const started = Date.now();
await call("/auth/local", "POST", { persona: "maya" });
console.log("Signed in to local Maya workspace");
const created = await call("/projects", "POST", {
  title: "How a request travels across the internet",
  workflow: "concept",
  language: "english",
  audience: "beginner",
  context: "",
  sourceText: "",
});
async function wait(id: string) {
  let last = "";
  for (let i = 0; i < 600; i++) {
    const job = await call("/jobs/" + id);
    const state = `${job.stage} ${job.progress === undefined ? "" : Math.round(job.progress * 100) + "%"}`;
    if (state !== last) {
      console.log(state);
      last = state;
    }
    if (job.stage === "complete") return job;
    if (["failed", "needs_review", "cancelled"].includes(job.stage))
      throw new Error(job.error || job.stage);
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error("Local verification timed out");
}
await wait(created.id);
const detail = await call("/projects/" + created.projectId);
console.log(
  `Prepared revision ${detail.project.revision}: ${detail.revision.scenes.length} narrated scenes`,
);
const exported = await call(`/projects/${created.projectId}/exports`, "POST", {
  revision: detail.project.revision,
  approved: true,
});
const done = await wait(exported.id);
const artifacts = await call(`/jobs/${done.id}/artifacts`);
const video = await fetch(artifacts.video),
  caption = await fetch(artifacts.captions);
if (!video.ok || !caption.ok) throw new Error("Artifact retrieval failed");
const bytes = Buffer.from(await video.arrayBuffer());
if (bytes.subarray(4, 8).toString() !== "ftyp")
  throw new Error("Output is not an MP4");
const vtt = await caption.text();
if (!vtt.startsWith("WEBVTT")) throw new Error("Caption file is invalid");
await fs.mkdir("artifacts", { recursive: true });
await fs.writeFile("artifacts/network-local.mp4", bytes);
await fs.writeFile("artifacts/network-local.vtt", vtt);
const report = {
  verifiedAt: new Date().toISOString(),
  mode: "local",
  projectId: created.projectId,
  revision: done.revision,
  jobId: done.id,
  videoBytes: bytes.length,
  elapsedMs: Date.now() - started,
  paidCalls: 0,
  cloudVerified: false,
};
await fs.writeFile(
  "artifacts/local-verification.json",
  JSON.stringify(report, null, 2),
);
console.log(JSON.stringify(report, null, 2));

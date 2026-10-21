import assert from "node:assert/strict";
import fs from "node:fs/promises";

// Read-only HTTP checks against artifacts from verify-local/demo-batch after a process restart.
const base = "http://127.0.0.1:4000/api";
async function login(persona: string) {
  const response = await fetch(`${base}/auth/local`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ persona }),
  });
  assert.equal(response.status, 200);
  return response.headers.get("set-cookie")!.split(";")[0];
}
const first = JSON.parse(
  await fs.readFile("artifacts/local-verification.json", "utf8"),
);
const batch = JSON.parse(
  await fs.readFile("artifacts/local-batch.json", "utf8"),
);
const maya = await login("maya"),
  arjun = await login("arjun");
const verified = [];
for (const item of [first, ...batch]) {
  const jobResponse = await fetch(`${base}/jobs/${item.jobId}`, {
    headers: { cookie: maya },
  });
  assert.equal(jobResponse.status, 200);
  const job = (await jobResponse.json()) as any;
  assert.equal(job.stage, "complete");
  const denied = await fetch(`${base}/jobs/${item.jobId}/artifacts`, {
    headers: { cookie: arjun },
  });
  assert.equal(denied.status, 404);
  const artifactResponse = await fetch(`${base}/jobs/${item.jobId}/artifacts`, {
    headers: { cookie: maya },
  });
  assert.equal(artifactResponse.status, 200);
  const artifacts = (await artifactResponse.json()) as any;
  const video = await fetch(artifacts.video, {
    headers: { range: "bytes=0-31" },
  });
  assert.equal(video.status, 206);
  const bytes = Buffer.from(await video.arrayBuffer());
  assert.equal(bytes.subarray(4, 8).toString(), "ftyp");
  const captions = await fetch(artifacts.captions);
  assert.equal(captions.status, 200);
  assert.match(await captions.text(), /^WEBVTT/);
  verified.push({
    jobId: item.jobId,
    stage: job.stage,
    crossUserStatus: denied.status,
    videoRangeStatus: video.status,
  });
}
const report = {
  verifiedAt: new Date().toISOString(),
  mode: "local",
  verified,
  browserVerified: false,
  cloudVerified: false,
};
await fs.writeFile(
  "artifacts/restart-verification.json",
  JSON.stringify(report, null, 2),
);
console.log(JSON.stringify(report, null, 2));

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createHmac } from "node:crypto";
import request from "supertest";
import { LocalStore, LocalBlobs } from "../services/core/storage";
import { Service, audioFingerprint } from "../services/core/service";
import { LocalQueue } from "../services/core/queue";
import { Worker, type Renderer } from "../services/workers/engine";
import { fixture, handover } from "../packages/schema/src/fixtures";
import { RevisionSchema, timeline, captions, FPS } from "@pragyan/schema";
import { passages, extractPdf } from "../services/core/documents";
import { acceptCallback } from "../services/core/callback";
import { createApp } from "../services/api/app";
import { diagramNodes } from "../services/core/providers";
import type { Job } from "../services/core/model";
const input = {
  title: "How the internet works",
  workflow: "concept" as const,
  language: "english" as const,
  audience: "beginner" as const,
  context: "",
  sourceText: "",
};
test("generated diagram coordinates stay inside the visible card area", () => {
  const nodes = diagramNodes([
    { label: "Start", x: 0, y: 0 },
    { label: "Middle", x: 50, y: 50 },
    { label: "End", x: 100, y: 100 },
  ]);
  assert.deepEqual(nodes.map(({ x, y }) => [x, y]), [[10, 20], [50, 50], [90, 80]]);
  const pixelLike = diagramNodes([
    { label: "A", x: 100, y: 100 },
    { label: "B", x: 200, y: 100 },
    { label: "C", x: 300, y: 100 },
  ]);
  assert.deepEqual(pixelLike.map(({ x, y }) => [x, y]), [[10, 80], [50, 80], [90, 80]]);
});
async function setup(t: any) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "pragyan-test-"));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  const store = new LocalStore(dir),
    blobs = new LocalBlobs(dir),
    service = new Service(store, blobs, new LocalQueue());
  let speaks = 0,
    submissions = 0,
    failAt = -1;
  const renderer: Renderer = {
    async submit(j) {
      submissions++;
      return { renderId: "render-" + j.id, bucketName: "test" };
    },
    async poll(j) {
      return {
        done: true,
        progress: 1,
        outputKey: `users/${j.owner}/projects/${j.projectId}/exports/test.mp4`,
      };
    },
  };
  const worker = new Worker(
    service,
    {
      async generate(i, s) {
        return fixture(i, s);
      },
      async speak() {
        speaks++;
        if (speaks === failAt)
          throw new Error("Injected local narration failure");
        return {
          bytes: Buffer.from("test audio"),
          seconds: 8,
          provider: "test",
          type: "audio/wav",
        };
      },
    },
    renderer,
  );
  return {
    dir,
    store,
    blobs,
    service,
    worker,
    renderer,
    speaks: () => speaks,
    submissions: () => submissions,
    fail: (n: number) => {
      failAt = n;
    },
  };
}
async function prepared(
  ctx: Awaited<ReturnType<typeof setup>>,
  owner = "alice",
) {
  const j = await ctx.service.create(owner, input, "create-1234");
  await ctx.worker.process(j.id, "prepare");
  await ctx.worker.process(j.id, "narrate");
  return ctx.service.revision(owner, j.projectId);
}
test("bounded schemas, exact frame timing and captions use one timeline", () => {
  const r = fixture(input, []);
  r.scenes[0].audio = { status: "ready", seconds: 3.14159 };
  const frames = timeline(r);
  assert.equal(frames.scenes[0].frames, Math.ceil(3.44159 * FPS));
  assert.equal(
    frames.totalFrames,
    frames.scenes.reduce((n, s) => n + s.frames, 0),
  );
  assert.match(captions(r), /00:00:03.458/);
  assert.throws(() => RevisionSchema.parse({ ...r, scenes: [] }));
  assert.throws(() =>
    RevisionSchema.parse({ ...r, scenes: [...r.scenes, ...r.scenes] }),
  );
  r.scenes[0].visual.audio_url = "https://untrusted.example/audio.mp3";
  assert.throws(() => RevisionSchema.parse(r));
});
test("source links cannot cite invented passages; PDF text is extracted and scans rejected", async () => {
  const sources = passages(handover);
  const r = fixture(
    { ...input, workflow: "material", sourceText: handover },
    sources,
  );
  assert.equal(r.scenes[0].basis, "source");
  r.scenes[0].sourceIds = ["invented"];
  assert.throws(() => RevisionSchema.parse(r));
  const extracted = await extractPdf(
    pdf(
      "Inspect the equipment before the shift. Record damage and contact the supervisor.",
    ),
  );
  assert.equal(extracted[0].page, 1);
  assert.match(extracted[0].text, /Inspect the equipment/);
  await assert.rejects(extractPdf(pdf("")), /No readable text/);
  await assert.rejects(extractPdf(Buffer.from("not a pdf")), /PDF/);
});
test("projects and jobs survive new service instances, duplicate queue deliveries charge once", async (t) => {
  const c = await setup(t);
  const j = await c.service.create("alice", input, "repeat-key");
  assert.equal((await c.service.create("alice", input, "repeat-key")).id, j.id);
  await Promise.all([
    c.worker.process(j.id, "prepare"),
    c.worker.process(j.id, "prepare"),
  ]);
  await c.worker.process(j.id, "narrate");
  await c.worker.process(j.id, "narrate");
  assert.equal(c.speaks(), 3);
  const restarted = new Service(
    new LocalStore(c.dir),
    new LocalBlobs(c.dir),
    new LocalQueue(),
  );
  const r = await restarted.revision("alice", j.projectId);
  assert.equal(r.project.revision, 1);
  assert.equal(r.revision?.scenes.length, 3);
  assert.equal((await c.service.usage("alice")).preparations, 1);
});
test("ownership rejects cross-user project, job, save, delete and artifact discovery", async (t) => {
  const c = await setup(t);
  const { project, revision } = await prepared(c);
  const jobs = await c.store.list("alice", "JOB");
  await assert.rejects(c.service.project("bob", project.id), /not found/);
  await assert.rejects(c.service.job("bob", jobs[0].id), /not found/);
  await assert.rejects(
    c.service.save("bob", project.id, 1, revision),
    /not found/,
  );
  await assert.rejects(c.service.remove("bob", project.id), /not found/);
  assert.deepEqual(await c.store.list("bob", "PROJECT"), []);
});
test("revision conflicts preserve saved work; narration edits invalidate audio; visual edits reuse it", async (t) => {
  const c = await setup(t);
  const { project, revision } = await prepared(c);
  const r = structuredClone(revision!);
  r.scenes[0].title = "A clearer heading";
  let saved = await c.service.save("alice", project.id, 1, r);
  assert.equal(saved.revision.scenes[0].audio.status, "ready");
  await assert.rejects(
    c.service.save("alice", project.id, 1, r),
    /newer revision/,
  );
  r.scenes[0].narration = "Changed narration";
  saved = await c.service.save("alice", project.id, 2, r);
  assert.equal(saved.revision.scenes[0].audio.status, "stale");
  assert.equal(saved.revision.scenes[1].audio.status, "ready");
  await assert.rejects(
    c.service.export("alice", project.id, 3, "export-key"),
    /current narration/,
  );
});
test("partial narration is visible, blocks export, targeted retry only synthesizes failed scene", async (t) => {
  const c = await setup(t);
  c.fail(2);
  const { project, revision } = await prepared(c);
  assert.equal(revision!.scenes[1].audio.status, "failed");
  assert.equal((await c.store.list("alice", "JOB"))[0].stage, "failed");
  await assert.rejects(
    c.service.export("alice", project.id, 1, "export-key"),
    /current narration/,
  );
  const j = await c.service.narrate(
    "alice",
    project.id,
    1,
    revision!.scenes[1].id,
  );
  await c.worker.process(j.id, "narrate");
  assert.equal(c.speaks(), 4);
  assert.equal(
    (await c.service.revision("alice", project.id)).revision!.scenes[1].audio
      .status,
    "ready",
  );
});
test("exports are immutable, idempotent, globally bounded and completed durably", async (t) => {
  const c = await setup(t);
  const { project, revision } = await prepared(c);
  const j = await c.service.export("alice", project.id, 1, "export-first");
  assert.equal(
    (await c.service.export("alice", project.id, 1, "export-first")).id,
    j.id,
  );
  await assert.rejects(
    c.service.export("alice", project.id, 1, "export-next"),
    /One active/,
  );
  revision!.title = "Edited after export";
  await c.service.save("alice", project.id, 1, revision);
  assert.equal(
    JSON.parse((await c.blobs.get(j.snapshotKey)).toString()).title,
    input.title,
  );
  await Promise.all([
    c.worker.process(j.id, "render"),
    c.worker.process(j.id, "render"),
  ]);
  assert.equal(c.submissions(), 1);
  await c.worker.complete(j.id);
  await c.worker.complete(j.id);
  const done = await c.service.job("alice", j.id);
  assert.equal(done.stage, "complete");
  assert.ok(done.captionKey);
  assert.equal((await c.service.usage("alice")).active, 0);
  assert.equal((await c.store.get("active:SYSTEM"))?.exports, 0);
});
test("daily limit and export disable switch are enforced before render submission", async (t) => {
  const c = await setup(t);
  const { project } = await prepared(c);
  for (let i = 0; i < 3; i++) {
    const j = await c.service.export("alice", project.id, 1, `export-${i}`);
    await c.worker.process(j.id, "render");
    await c.worker.complete(j.id);
  }
  await assert.rejects(
    c.service.export("alice", project.id, 1, "export-four"),
    /Daily exports/,
  );
  process.env.EXPORTS_ENABLED = "false";
  try {
    await assert.rejects(
      c.service.export("alice", project.id, 1, "export-off"),
      /disabled/,
    );
  } finally {
    delete process.env.EXPORTS_ENABLED;
  }
});
test("signed callbacks reject tampering and mismatches, duplicates do not release quota twice", async (t) => {
  const c = await setup(t);
  const { project } = await prepared(c);
  const j = await c.service.export("alice", project.id, 1, "export-callback");
  await c.worker.process(j.id, "render");
  const current = await c.service.job("alice", j.id);
  const body = {
    type: "success",
    renderId: current.renderId,
    bucketName: "test",
    expectedBucketOwner: "test",
    customData: { jobId: j.id, rendererVersion: j.rendererVersion },
  };
  const sig = createHmac("sha512", "secret")
    .update(JSON.stringify(body))
    .digest("hex");
  await assert.rejects(
    acceptCallback(c.service, body, "sha512=wrong", "secret"),
    /Invalid callback/,
  );
  await acceptCallback(c.service, body, "sha512=" + sig, "secret");
  await acceptCallback(c.service, body, "sha512=" + sig, "secret");
  await c.worker.complete(j.id);
  await acceptCallback(c.service, body, "sha512=" + sig, "secret");
  assert.equal((await c.service.usage("alice")).active, 0);
  const changed = { ...body, renderId: "someone-else" };
  await assert.rejects(
    acceptCallback(
      c.service,
      changed,
      "sha512=" +
        createHmac("sha512", "secret")
          .update(JSON.stringify(changed))
          .digest("hex"),
      "secret",
    ),
    /mismatch/,
  );
});
test("stalled preparation resumes; unknown external submission is never resubmitted automatically", async (t) => {
  const c = await setup(t);
  const j = await c.service.create("alice", input, "stall-create");
  const claimed = await c.worker.claim(j.id, "prepare");
  await c.worker.update(claimed!, { leaseUntil: Date.now() - 1 });
  await c.worker.reconcile();
  assert.equal((await c.service.job("alice", j.id)).stage, "queued");
  await c.worker.process(j.id, "prepare");
  await c.worker.process(j.id, "narrate");
  const exported = await c.service.export(
    "alice",
    j.projectId,
    1,
    "stall-export",
  );
  const submit = await c.worker.claim(exported.id, "render");
  await c.worker.update(submit!, { leaseUntil: Date.now() - 1 });
  await c.worker.reconcile();
  await c.worker.process(exported.id, "render");
  assert.equal(
    (await c.service.job("alice", exported.id)).stage,
    "needs_review",
  );
  assert.equal(c.submissions(), 0);
});
test("audio cache key includes text, language, voice and renderer; changed text cannot inject asset keys", async (t) => {
  const c = await setup(t);
  const { project, revision: r } = await prepared(c);
  const old = audioFingerprint(r!, r!.scenes[0]);
  r!.language = "hindi";
  assert.notEqual(audioFingerprint(r!, r!.scenes[0]), old);
  r!.language = "english";
  r!.voice = "different";
  assert.notEqual(audioFingerprint(r!, r!.scenes[0]), old);
  r!.scenes[0].audio.key = "users/bob/private.audio";
  r!.voice = "default";
  const saved = await c.service.save("alice", project.id, 1, r);
  assert.notEqual(
    saved.revision.scenes[0].audio.key,
    "users/bob/private.audio",
  );
});
test("Express rejects anonymous and cross-user requests, local media requires short-lived signature", async (t) => {
  const c = await setup(t);
  const app = createApp(c.service, false);
  await request(app).get("/api/projects").expect(401);
  const alice = request.agent(app),
    bob = request.agent(app);
  await alice.post("/api/auth/local").send({ persona: "maya" }).expect(200);
  await bob.post("/api/auth/local").send({ persona: "arjun" }).expect(200);
  const created = await alice
    .post("/api/projects")
    .set("idempotency-key", "api-create")
    .send(input)
    .expect(202);
  await bob.get("/api/projects/" + created.body.projectId).expect(404);
  await bob.get("/api/jobs/" + created.body.id).expect(404);
  await alice.get("/api/projects/" + created.body.projectId).expect(200);
  await alice
    .post("/api/projects")
    .set("Origin", "https://evil.example")
    .set("idempotency-key", "api-evil")
    .send(input)
    .expect(403);
  await request(app)
    .get("/api/media?key=users/maya/test.mp4&exp=9999999999&sig=bad")
    .expect(403);
});
test("global export reservation rejects another owner and blocks deletion even with a stale job index", async (t) => {
  const c = await setup(t);
  const alice = await prepared(c, "alice");
  const bob = await prepared(c, "bob");
  const job = await c.service.export(
    "alice",
    alice.project.id,
    1,
    "global-alice",
  );
  await assert.rejects(
    c.service.export("bob", bob.project.id, 1, "global-bob"),
    /active|concurrency|export/i,
  );
  const originalList = c.store.list.bind(c.store);
  c.store.list = async (owner, kind) =>
    kind === "JOB" ? [] : originalList(owner, kind);
  await assert.rejects(
    c.service.remove("alice", alice.project.id),
    /active jobs/,
  );
  await c.worker.process(job.id, "render");
  await c.worker.complete(job.id);
  assert.equal(
    (await c.service.project("alice", alice.project.id)).exporting,
    undefined,
  );
  await c.service.export("bob", bob.project.id, 1, "global-bob");
});
test("deletion revokes project access immediately and reconciliation retries failed artifact cleanup", async (t) => {
  const c = await setup(t);
  const { project } = await prepared(c);
  const revisionKey = project.revisionKey!;
  const originalRemove = c.blobs.removePrefix.bind(c.blobs);
  c.blobs.removePrefix = async () => {
    throw new Error("storage unavailable");
  };
  await assert.rejects(
    c.service.remove("alice", project.id),
    /storage unavailable/,
  );
  await assert.rejects(c.service.project("alice", project.id), /not found/);
  assert.equal((await c.store.list("SYSTEM", "CLEANUP")).length, 1);
  c.blobs.removePrefix = originalRemove;
  await c.worker.reconcile();
  await assert.rejects(c.blobs.get(revisionKey));
  assert.equal((await c.store.list("SYSTEM", "CLEANUP")).length, 0);
  await c.service.remove("alice", project.id);
  await assert.rejects(c.service.remove("bob", project.id), /not found/);
});
test("a failed queue send retains a durable job that reconciliation dispatches", async (t) => {
  const c = await setup(t);
  c.service.queue = {
    async send() {
      throw new Error("queue unavailable");
    },
  };
  const job = await c.service.create("alice", input, "outbox-test");
  assert.equal((await c.service.job("alice", job.id)).stage, "queued");
  const dispatched: string[] = [];
  c.service.queue = {
    async send(_queue, id) {
      dispatched.push(id);
    },
  };
  await c.worker.reconcile();
  assert.deepEqual(dispatched, [job.id]);
});
function pdf(text: string) {
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${text.length + 34} >>\nstream\nBT /F1 12 Tf 40 740 Td (${text}) Tj ET\nendstream`,
  ];
  let doc = "%PDF-1.4\n";
  const offsets = [0];
  for (let i = 0; i < objects.length; i++) {
    offsets.push(Buffer.byteLength(doc));
    doc += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`;
  }
  const x = Buffer.byteLength(doc);
  doc += `xref\n0 6\n0000000000 65535 f \n${offsets
    .slice(1)
    .map((n) => String(n).padStart(10, "0") + " 00000 n ")
    .join("\n")}\ntrailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${x}\n%%EOF`;
  return Buffer.from(doc);
}

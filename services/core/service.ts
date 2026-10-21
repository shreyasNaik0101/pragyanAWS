import { createHash, randomUUID } from "node:crypto";
import {
  CreateSchema,
  RevisionSchema,
  RENDERER_VERSION,
  LIMITS,
  type Revision,
} from "@pragyan/schema";
import {
  Conflict,
  type Store,
  type Blobs,
  type Row,
  type Write,
} from "./storage";
import { type Project, type Job, now, projectPrefix } from "./model";
export class AppError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export const hash = (v: unknown) =>
  createHash("sha256").update(JSON.stringify(v)).digest("hex");
export function audioFingerprint(r: Revision, s: Revision["scenes"][number]) {
  return hash({
    text: s.narration,
    language: r.language,
    voice: r.voice,
    provider:
      process.env.RUNTIME === "aws"
        ? r.language === "english" || r.language === "hindi"
          ? "polly-neural-v1"
          : "sarvam-bulbul-v2"
        : process.env.LOCAL_TTS || "system",
    renderer: r.rendererVersion,
  });
}
export interface Queue {
  send(queue: Job["queue"], id: string): Promise<void>;
}
export class Service {
  constructor(
    public store: Store,
    public blobs: Blobs,
    public queue: Queue,
  ) {}
  async project(owner: string, id: string) {
    const p = await this.store.get<Project>(id);
    if (!p || p.kind !== "PROJECT" || p.owner !== owner || p.deleted)
      throw new AppError(404, "Project not found");
    return p;
  }
  async job(owner: string, id: string) {
    const j = await this.store.get<Job>(id);
    if (!j || j.kind !== "JOB" || j.owner !== owner)
      throw new AppError(404, "Job not found");
    await this.project(owner, j.projectId);
    return j;
  }
  async revision(owner: string, id: string) {
    const p = await this.project(owner, id);
    return {
      project: p,
      revision: p.revisionKey
        ? RevisionSchema.parse(
            JSON.parse((await this.blobs.get(p.revisionKey)).toString()),
          )
        : null,
    };
  }
  async enqueue(j: Job) {
    try {
      await this.queue.send(j.queue, j.id);
    } catch {
      console.warn(JSON.stringify({ event: "outbox_pending", jobId: j.id }));
    }
    return j;
  }
  private async commitWithArtifact(writes: Write[], newKey: string) {
    try {
      await this.store.transaction(writes);
    } catch (error) {
      // Only delete on a known rejected transaction. An ambiguous network error
      // may have committed; removing that object could corrupt a saved revision.
      if (error instanceof Conflict) {
        await this.blobs.removePrefix(newKey).catch(() => {
          console.warn(JSON.stringify({ event: "orphan_cleanup_pending" }));
        });
      }
      throw error;
    }
  }
  async retry(owner: string, id: string) {
    const old = await this.job(owner, id);
    const p = await this.project(owner, old.projectId);
    if (old.stage !== "failed")
      throw new AppError(409, "Only failed jobs can be retried");
    if (old.type === "export")
      return this.export(owner, p.id, p.revision, randomUUID());
    if (p.preparing) throw new AppError(409, "Preparation is already active");
    if (p.revisionKey) return this.narrate(owner, p.id, p.revision);
    const j = this.baseJob(owner, p, old.type, old.snapshotKey);
    j.queue = old.queue === "narrate" ? "narrate" : "prepare";
    await this.store.transaction([
      ...(await this.reservation(owner, j.type)),
      { value: j, expected: null },
      {
        value: { ...p, preparing: j.id, v: p.v + 1, updatedAt: now() },
        expected: p.v,
      },
    ]);
    return this.enqueue(j);
  }
  async usage(owner: string) {
    const day = now().slice(0, 10);
    const daily = await this.store.get(`usage:${owner}:${day}`);
    const active = await this.store.get(`active:${owner}`);
    return {
      exports: daily?.exports || 0,
      preparations: daily?.preparations || 0,
      active: active?.exports || 0,
      limits: LIMITS,
      exportsEnabled: process.env.EXPORTS_ENABLED !== "false",
      mode: process.env.RUNTIME === "aws" ? "aws" : "local",
    };
  }
  private async reservation(
    owner: string,
    type: Job["type"],
  ): Promise<Write[]> {
    const day = now().slice(0, 10);
    const id = `usage:${owner}:${day}`,
      old = await this.store.get(id);
    const row: Row = old || {
      id,
      owner,
      kind: "USAGE",
      v: 0,
      exports: 0,
      preparations: 0,
    };
    const field = type === "export" ? "exports" : "preparations";
    if (
      row[field] >=
      (type === "export" ? LIMITS.exportsPerDay : LIMITS.preparationsPerDay)
    )
      throw new AppError(429, `Daily ${field} limit reached`);
    const writes: Write[] = [
      {
        value: { ...row, [field]: row[field] + 1, v: row.v + 1 },
        expected: old?.v ?? null,
      },
    ];
    for (const who of type === "export" ? [owner, "SYSTEM"] : [owner]) {
      const aid = `active:${who}`,
        a = await this.store.get(aid);
      const val = a || {
        id: aid,
        owner: who,
        kind: "ACTIVE",
        v: 0,
        exports: 0,
        preparations: 0,
      };
      if (val[field] >= 1)
        throw new AppError(
          429,
          `One active ${field === "exports" ? "export" : "preparation"} at a time. Wait for it to finish.`,
        );
      writes.push({
        value: { ...val, [field]: val[field] + 1, v: val.v + 1 },
        expected: a?.v ?? null,
      });
    }
    return writes;
  }
  private baseJob(
    owner: string,
    p: Project,
    type: Job["type"],
    key: string,
  ): Job {
    return {
      id: randomUUID(),
      owner,
      kind: "JOB",
      v: 1,
      projectId: p.id,
      type,
      stage: "queued",
      queue:
        type === "export"
          ? "render"
          : type === "narrate"
            ? "narrate"
            : "prepare",
      revision: p.revision,
      snapshotKey: key,
      attempts: 0,
      createdAt: now(),
      updatedAt: now(),
      quotaDay: now().slice(0, 10),
      rendererVersion: RENDERER_VERSION,
    };
  }
  async create(owner: string, input: unknown, idempotency: string) {
    const parsed = CreateSchema.parse(input);
    const rid = `request:${owner}:${hash(idempotency)}`,
      prior = await this.store.get(rid);
    if (prior) {
      if (prior.digest !== hash(parsed))
        throw new AppError(
          409,
          "Idempotency key already used for different input",
        );
      return this.job(owner, prior.jobId);
    }
    const p: Project = {
      id: randomUUID(),
      owner,
      kind: "PROJECT",
      v: 1,
      title: parsed.title,
      workflow: parsed.workflow,
      language: parsed.language,
      revision: 0,
      createdAt: now(),
      updatedAt: now(),
    };
    if (parsed.sourceKey) {
      const upload = await this.store.get(`upload:${hash(parsed.sourceKey)}`);
      if (!upload || upload.owner !== owner || !upload.ready)
        throw new AppError(400, "Upload is not ready");
    }
    const reservation = await this.reservation(owner, "prepare");
    const key = `${projectPrefix(owner, p.id)}/inputs/${randomUUID()}.json`;
    await this.blobs.put(
      key,
      JSON.stringify({ input: parsed }),
      "application/json",
    );
    const job = this.baseJob(owner, p, "prepare", key);
    p.preparing = job.id;
    await this.commitWithArtifact(
      [
        ...reservation,
        { value: p, expected: null },
        { value: job, expected: null },
        {
          value: {
            id: rid,
            owner,
            kind: "REQUEST",
            v: 1,
            jobId: job.id,
            digest: hash(parsed),
          },
          expected: null,
        },
      ],
      key,
    );
    return this.enqueue(job);
  }
  async save(
    owner: string,
    id: string,
    expectedRevision: number,
    input: unknown,
  ) {
    const p = await this.project(owner, id);
    if (p.preparing) throw new AppError(409, "Preparation is still active");
    if (p.revision !== expectedRevision)
      throw new AppError(409, "A newer revision exists. Reload before saving.");
    const revision = RevisionSchema.parse(input);
    const previous = p.revisionKey
      ? RevisionSchema.parse(
          JSON.parse((await this.blobs.get(p.revisionKey)).toString()),
        )
      : null;
    if (
      JSON.stringify(revision.sources) !==
      JSON.stringify(previous?.sources || [])
    )
      throw new AppError(400, "Source passages are immutable");
    for (const s of revision.scenes) {
      const old = previous?.scenes.find((x) => x.id === s.id);
      s.visual.text = s.narration;
      delete s.visual.audio_url;
      s.audio =
        old &&
        old.audio.status === "ready" &&
        old.audio.fingerprint === audioFingerprint(revision, s)
          ? old.audio
          : { status: old?.audio.key ? "stale" : "missing" };
    }
    const key = `${projectPrefix(owner, id)}/revisions/${p.revision + 1}-${randomUUID()}.json`;
    await this.blobs.put(key, JSON.stringify(revision), "application/json");
    const next = {
      ...p,
      title: revision.title,
      language: revision.language,
      revision: p.revision + 1,
      revisionKey: key,
      v: p.v + 1,
      updatedAt: now(),
    };
    await this.commitWithArtifact(
      [
        { value: next, expected: p.v },
        {
          value: {
            id: `revision:${id}:${next.revision}`,
            owner,
            kind: "REVISION",
            v: 1,
            projectId: id,
            revision: next.revision,
            key,
            createdAt: now(),
          },
          expected: null,
        },
      ],
      key,
    );
    return { project: next, revision };
  }
  async narrate(
    owner: string,
    id: string,
    revisionNumber: number,
    sceneId?: string,
  ) {
    const { project: p, revision } = await this.revision(owner, id);
    if (!revision || p.revision !== revisionNumber || p.preparing)
      throw new AppError(409, "Save and reload the latest revision first");
    if (sceneId && !revision.scenes.some((s) => s.id === sceneId))
      throw new AppError(400, "Unknown scene");
    const reservation = await this.reservation(owner, "narrate");
    const key = `${projectPrefix(owner, id)}/work/${randomUUID()}.json`;
    await this.blobs.put(
      key,
      JSON.stringify({ revision, sceneId }),
      "application/json",
    );
    const job = this.baseJob(owner, p, "narrate", key);
    await this.commitWithArtifact(
      [
        ...reservation,
        { value: job, expected: null },
        { value: { ...p, v: p.v + 1, preparing: job.id }, expected: p.v },
      ],
      key,
    );
    return this.enqueue(job);
  }
  async export(
    owner: string,
    id: string,
    revisionNumber: number,
    idempotency: string,
  ) {
    if (process.env.EXPORTS_ENABLED === "false")
      throw new AppError(503, "Exports are temporarily disabled");
    const { project: p, revision } = await this.revision(owner, id);
    if (!revision || p.revision !== revisionNumber || p.preparing)
      throw new AppError(409, "Save the latest revision before exporting");
    const rid = `export:${owner}:${hash(idempotency)}`,
      prior = await this.store.get(rid);
    if (prior) {
      if (prior.projectId !== id || prior.revision !== revisionNumber)
        throw new AppError(409, "Idempotency key mismatch");
      return this.job(owner, prior.jobId);
    }
    if (
      revision.scenes.some(
        (s) =>
          s.audio.status !== "ready" ||
          s.audio.fingerprint !== audioFingerprint(revision, s),
      )
    )
      throw new AppError(
        409,
        "Every scene needs current narration. Regenerate missing or stale audio first.",
      );
    const j = this.baseJob(owner, p, "export", p.revisionKey!);
    j.renderFunction = process.env.REMOTION_FUNCTION;
    j.renderSite = process.env.REMOTION_SITE;
    await this.store.transaction([
      ...(await this.reservation(owner, "export")),
      { value: j, expected: null },
      {
        value: { ...p, exporting: j.id, v: p.v + 1, updatedAt: now() },
        expected: p.v,
      },
      {
        value: {
          id: rid,
          owner,
          kind: "REQUEST",
          v: 1,
          jobId: j.id,
          projectId: id,
          revision: revisionNumber,
        },
        expected: null,
      },
    ]);
    return this.enqueue(j);
  }
  async finish(
    j: Job,
    stage: "complete" | "failed" | "cancelled",
    extra: Partial<Job> = {},
    projectWrite?: Write,
  ) {
    for (let attempt = 0; attempt < 8; attempt++) {
      const current = await this.store.get<Job>(j.id);
      if (!current || current.released) return;
      const field = j.type === "export" ? "exports" : "preparations";
      const writes: Write[] = [];
      for (const who of j.type === "export" ? [j.owner, "SYSTEM"] : [j.owner]) {
        const a = await this.store.get(`active:${who}`);
        if (a)
          writes.push({
            value: { ...a, [field]: Math.max(0, a[field] - 1), v: a.v + 1 },
            expected: a.v,
          });
      }
      const p = await this.store.get<Project>(j.projectId);
      if (projectWrite) writes.push(projectWrite);
      else if (p && (p.preparing === j.id || p.exporting === j.id))
        writes.push({
          value: {
            ...p,
            preparing: p.preparing === j.id ? undefined : p.preparing,
            exporting: p.exporting === j.id ? undefined : p.exporting,
            v: p.v + 1,
            updatedAt: now(),
          },
          expected: p.v,
        });
      writes.push({
        value: {
          ...current,
          ...extra,
          stage,
          released: true,
          leaseUntil: 0,
          v: current.v + 1,
          updatedAt: now(),
        },
        expected: current.v,
      });
      try {
        await this.store.transaction(writes);
        console.log(
          JSON.stringify({
            event: "job_finished",
            jobId: j.id,
            stage,
            elapsedMs: Date.now() - Date.parse(j.createdAt),
          }),
        );
        return;
      } catch (e) {
        if (!(e instanceof Conflict) || projectWrite) throw e;
      }
    }
    throw new Conflict();
  }
  async remove(owner: string, id: string) {
    const p = await this.store.get<Project>(id);
    if (!p || p.kind !== "PROJECT" || p.owner !== owner)
      throw new AppError(404, "Project not found");
    const cleanupId = `cleanup:${id}`;
    if (p.deleted) {
      await this.cleanupProject(cleanupId);
      return;
    }
    const active = (await this.store.list(owner, "JOB")).some(
      (j) =>
        j.projectId === id &&
        !["complete", "failed", "cancelled"].includes(j.stage),
    );
    if (active || p.preparing || p.exporting)
      throw new AppError(
        409,
        "Wait for active jobs or resolve uncertain exports before deleting",
      );
    await this.store.transaction([
      {
        value: { ...p, deleted: true, v: p.v + 1, updatedAt: now() },
        expected: p.v,
      },
      {
        value: {
          id: cleanupId,
          owner: "SYSTEM",
          kind: "CLEANUP",
          v: 1,
          projectOwner: owner,
          projectId: id,
        },
        expected: null,
      },
    ]);
    // Access is revoked before deletion; the durable cleanup record survives a storage outage.
    await this.cleanupProject(cleanupId);
  }
  async cleanupProject(id: string) {
    const cleanup = await this.store.get(id);
    if (!cleanup || cleanup.kind !== "CLEANUP") return;
    const p = await this.store.get<Project>(cleanup.projectId);
    if (!p?.deleted || p.owner !== cleanup.projectOwner) return;
    await this.blobs.removePrefix(projectPrefix(p.owner, p.id) + "/");
    await this.store.transaction([
      {
        value: {
          ...cleanup,
          kind: "CLEANED",
          v: cleanup.v + 1,
          expiresAt: Math.floor(Date.now() / 1000) + 86400,
        },
        expected: cleanup.v,
      },
    ]);
  }
}

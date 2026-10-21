import { randomUUID } from "node:crypto";
import { RevisionSchema, captions, type Revision } from "@pragyan/schema";
import { type Service, audioFingerprint, AppError } from "../core/service";
import { type Job, type Project, now, projectPrefix } from "../core/model";
import { Conflict } from "../core/storage";
import { passages, extractPdf } from "../core/documents";
import type { Providers } from "../core/providers";
export interface Renderer {
  submit(
    job: Job,
    revision: Revision,
    urls: Record<string, string>,
    progress: (n: number) => Promise<void>,
  ): Promise<{ renderId: string; bucketName: string; outputKey?: string }>;
  poll(job: Job): Promise<{
    done: boolean;
    failed?: string;
    progress: number;
    outputKey?: string;
  }>;
}
export class Worker {
  constructor(
    public service: Service,
    public providers: Providers,
    public renderer: Renderer,
  ) {}
  async update(j: Job, patch: Partial<Job>) {
    const next = { ...j, ...patch, v: j.v + 1, updatedAt: now() };
    await this.service.store.transaction([{ value: next, expected: j.v }]);
    return next;
  }
  async claim(id: string, queue: Job["queue"]) {
    const j = await this.service.store.get<Job>(id);
    if (!j || j.queue !== queue || j.stage !== "queued") return;
    try {
      return await this.update(j, {
        stage:
          queue === "prepare"
            ? "preparing"
            : queue === "narrate"
              ? "narrating"
              : "submitting",
        attempts: j.attempts + 1,
        leaseUntil: Date.now() + 600000,
      });
    } catch (e) {
      if (e instanceof Conflict) return;
      throw e;
    }
  }
  async process(id: string, queue: Job["queue"]) {
    if (queue === "completion") return this.complete(id);
    let j = await this.claim(id, queue);
    if (!j) return;
    console.log(
      JSON.stringify({
        event: "job_claimed",
        jobId: id,
        stage: j.stage,
        attempt: j.attempts,
      }),
    );
    try {
      const p = await this.service.project(j.owner, j.projectId);
      if (queue === "prepare") {
        const { input } = JSON.parse(
          (await this.service.blobs.get(j.snapshotKey)).toString(),
        );
        const sources =
          input.workflow === "material"
            ? input.sourceKey
              ? await extractPdf(await this.service.blobs.get(input.sourceKey))
              : passages(input.sourceText)
            : [];
        const revision = await this.providers.generate(input, sources);
        const key = `${projectPrefix(j.owner, j.projectId)}/work/${randomUUID()}.json`;
        await this.service.blobs.put(
          key,
          JSON.stringify({ revision }),
          "application/json",
        );
        j = await this.update(j, {
          snapshotKey: key,
          stage: "queued",
          queue: "narrate",
          attempts: 0,
          leaseUntil: 0,
        });
        await this.service.enqueue(j);
      } else if (queue === "narrate") await this.narrate(j, p);
      else {
        const revision = RevisionSchema.parse(
          JSON.parse((await this.service.blobs.get(j.snapshotKey)).toString()),
        );
        if (
          revision.scenes.some(
            (s) =>
              s.audio.status !== "ready" ||
              s.audio.fingerprint !== audioFingerprint(revision, s),
          )
        )
          throw new AppError(
            409,
            "Export snapshot has stale or missing narration",
          );
        const urls: Record<string, string> = {};
        for (const s of revision.scenes)
          urls[s.id] = await this.service.blobs.url(s.audio.key!, 3600);
        const result = await this.renderer.submit(
          j,
          revision,
          urls,
          async (progress) => {
            const latest = await this.service.store.get<Job>(j!.id);
            if (latest && latest.stage === "submitting")
              j = await this.update(latest, {
                progress,
                leaseUntil: Date.now() + 600000,
              });
          },
        );
        // A signed callback can arrive before this write. Merge against current state.
        const current = await this.service.store.get<Job>(j.id);
        if (!current || current.released) return;
        if (current.renderId && current.renderId !== result.renderId)
          throw new Error("Render identity mismatch");
        j = await this.update(current, {
          ...result,
          stage: "rendering",
          queue: "completion",
          leaseUntil: Date.now() + 1200000,
        });
        await this.service.enqueue(j);
      }
    } catch (e: any) {
      const current = await this.service.store.get<Job>(id);
      if (!current || current.released) return;
      const error = publicError(e);
      if (queue === "render" && !(e instanceof AppError)) {
        await this.update(current, {
          stage: "needs_review",
          error:
            "Render submission outcome is uncertain. Reconciliation will use a signed callback or known render ID; no automatic second render will be submitted.",
        });
      } else if (isRetryable(e) && current.attempts < 3) {
        await this.update(current, { stage: "queued", leaseUntil: 0, error });
        throw e;
      } else await this.service.finish(current, "failed", { error });
    }
  }
  async narrate(j: Job, p: Project) {
    let { revision, sceneId } = JSON.parse(
      (await this.service.blobs.get(j.snapshotKey)).toString(),
    ) as { revision: Revision; sceneId?: string };
    revision = RevisionSchema.parse(revision);
    for (const s of revision.scenes) {
      if (sceneId && s.id !== sceneId) continue;
      const fingerprint = audioFingerprint(revision, s);
      if (s.audio.status === "ready" && s.audio.fingerprint === fingerprint)
        continue;
      const key = `${projectPrefix(j.owner, j.projectId)}/audio/${fingerprint}.audio`;
      try {
        let bytes: Buffer | undefined;
        try {
          bytes = await this.service.blobs.get(key + ".json");
        } catch {}
        if (bytes) {
          s.audio = JSON.parse(bytes.toString());
        } else {
          const result = await this.providers.speak(
            s.narration,
            revision.language,
            revision.voice,
          );
          await this.service.blobs.put(key, result.bytes, result.type);
          s.audio = {
            status: "ready",
            key,
            seconds: result.seconds,
            fingerprint,
            provider: result.provider,
          };
          await this.service.blobs.put(
            key + ".json",
            JSON.stringify(s.audio),
            "application/json",
          );
        }
      } catch (e) {
        s.audio = { status: "failed", error: publicError(e) };
      }
      const workKey = `${projectPrefix(j.owner, j.projectId)}/work/${randomUUID()}.json`;
      await this.service.blobs.put(
        workKey,
        JSON.stringify({ revision, sceneId }),
        "application/json",
      );
      j = await this.update(j, {
        snapshotKey: workKey,
        progress:
          revision.scenes.filter((s) => s.audio.status === "ready").length /
          revision.scenes.length,
        leaseUntil: Date.now() + 600000,
      });
    }
    RevisionSchema.parse(revision);
    const current = await this.service.project(j.owner, p.id);
    if (current.preparing !== j.id || current.revision !== j.revision)
      throw new AppError(
        409,
        "Project changed while preparing; prepared revision cannot overwrite it",
      );
    const key = `${projectPrefix(j.owner, p.id)}/revisions/${current.revision + 1}-${randomUUID()}.json`;
    await this.service.blobs.put(
      key,
      JSON.stringify(revision),
      "application/json",
    );
    const next = {
      ...current,
      v: current.v + 1,
      revision: current.revision + 1,
      revisionKey: key,
      preparing: undefined,
      updatedAt: now(),
    };
    const partial = revision.scenes.some((s) => s.audio.status !== "ready");
    await this.service.finish(
      j,
      partial ? "failed" : "complete",
      {
        error: partial
          ? "Some scenes need narration. Review the scene errors and retry only those scenes."
          : undefined,
        snapshotKey: key,
        progress: 1,
      },
      { value: next, expected: current.v },
    );
  }
  async complete(id: string) {
    const j = await this.service.store.get<Job>(id);
    if (
      !j ||
      j.released ||
      !j.renderId ||
      !["rendering", "needs_review"].includes(j.stage)
    )
      return;
    const result = await this.renderer.poll(j);
    if (result.failed)
      return this.service.finish(j, "failed", { error: result.failed });
    if (result.done) {
      if (!result.outputKey)
        throw new Error("Renderer finished without output");
      const revision = RevisionSchema.parse(
        JSON.parse((await this.service.blobs.get(j.snapshotKey)).toString()),
      );
      const captionKey = `${projectPrefix(j.owner, j.projectId)}/exports/${j.id}.vtt`;
      await this.service.blobs.put(captionKey, captions(revision), "text/vtt");
      return this.service.finish(j, "complete", {
        outputKey: result.outputKey,
        captionKey,
        progress: 1,
      });
    }
    try {
      await this.update(j, { progress: result.progress });
    } catch (e) {
      if (!(e instanceof Conflict)) throw e;
    }
  }
  async reconcile() {
    for (const cleanup of (
      await this.service.store.list("SYSTEM", "CLEANUP")
    ).slice(0, 100)) {
      try {
        await this.service.cleanupProject(cleanup.id);
      } catch {
        console.warn(
          JSON.stringify({
            event: "cleanup_pending",
            projectId: cleanup.projectId,
          }),
        );
      }
    }
    for (const j of (await this.service.store.jobs()).slice(0, 100) as Job[]) {
      try {
        if (j.stage === "queued") {
          if (Date.now() - Date.parse(j.createdAt) > 86400000)
            await this.service.finish(j, "failed", {
              error: "Queued job expired after 24 hours. Create a new request.",
            });
          else await this.service.enqueue(j);
        } else if (j.renderId) {
          if (Date.now() - Date.parse(j.createdAt) > 3600000)
            await this.service.finish(j, "failed", {
              error:
                "Render exceeded the one-hour reconciliation window. Inspect the render in AWS before retrying.",
            });
          else await this.complete(j.id);
        } else if (j.leaseUntil && j.leaseUntil < Date.now()) {
          if (j.stage === "submitting")
            await this.update(j, {
              stage: "needs_review",
              error:
                "Submission lease expired without a render identifier. Automatic resubmission is disabled to prevent duplicate charges.",
            });
          else if (j.attempts < 3)
            await this.update(j, {
              stage: "queued",
              leaseUntil: 0,
              error: "Worker interrupted; retrying from durable artifacts.",
            });
          else
            await this.service.finish(j, "failed", {
              error: "Worker stalled repeatedly. Review logs and retry.",
            });
        }
      } catch (e) {
        if (!(e instanceof Conflict))
          console.error(
            JSON.stringify({
              event: "reconcile_error",
              jobId: j.id,
              error: publicError(e),
            }),
          );
      }
    }
  }
}
export function publicError(e: unknown) {
  if (e instanceof AppError) return e.message;
  const message =
    e instanceof Error ? e.message : "Unexpected processing error";
  if (
    /LOCAL_|Local |Narration |GENERATION_INVALID|PDF|Injected |shorter than|Required secret|configured|Unsupported/.test(
      message,
    )
  )
    return message.slice(0, 220);
  if ((e as any)?.name === "ZodError")
    return "Generated scenes or timing did not pass validation. Shorten narration or retry preparation.";
  return "Processing failed. Check the job ID in logs, then retry.";
}
function isRetryable(e: any) {
  return (
    [
      "ThrottlingException",
      "ServiceUnavailableException",
      "TimeoutError",
      "NetworkingError",
    ].includes(e?.name) || e?.$metadata?.httpStatusCode >= 500
  );
}

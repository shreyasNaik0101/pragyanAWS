import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import {
  renderMediaOnLambda,
  getRenderProgress,
} from "@remotion/lambda/client";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { timeline, type Revision } from "@pragyan/schema";
import type { Renderer } from "./engine";
import type { Job } from "../core/model";
import { projectPrefix } from "../core/model";
import type { Blobs } from "../core/storage";
import { secret } from "../core/providers";
export class LocalRenderer implements Renderer {
  private bundled?: Promise<string>;
  constructor(private blobs: Blobs) {}
  async submit(
    job: Job,
    revision: Revision,
    urls: Record<string, string>,
    progress: (n: number) => Promise<void>,
  ) {
    const { bundle } = await import("@remotion/bundler");
    const { selectComposition, renderMedia } =
      await import("@remotion/renderer");
    this.bundled ||= bundle({
      entryPoint: path.resolve("packages/video/src/index.tsx"),
    });
    const serveUrl = await this.bundled;
    const inputProps = { revision, audioUrls: urls };
    const composition = await selectComposition({
      serveUrl,
      id: "Pragyan",
      inputProps,
    });
    const output = path.join(os.tmpdir(), `pragyan-${job.id}.mp4`);
    let last = 0;
    let pending = Promise.resolve();
    await renderMedia({
      serveUrl,
      composition,
      inputProps,
      codec: "h264",
      outputLocation: output,
      concurrency: 1,
      crf: 23,
      x264Preset: "fast",
      timeoutInMilliseconds: 120000,
      onProgress: ({ progress: n }) => {
        if (Date.now() - last > 2500) {
          last = Date.now();
          pending = pending.then(() => progress(n));
        }
      },
      chromiumOptions: { gl: "angle" },
    });
    await pending;
    const key = `${projectPrefix(job.owner, job.projectId)}/exports/${job.id}.mp4`;
    await this.blobs.put(key, await fs.readFile(output), "video/mp4");
    await fs.unlink(output);
    return { renderId: job.id, bucketName: "local", outputKey: key };
  }
  async poll(job: Job) {
    return { done: true, progress: 1, outputKey: job.outputKey };
  }
}
export class LambdaRenderer implements Renderer {
  constructor(private blobs: Blobs) {}
  async submit(job: Job, revision: Revision, urls: Record<string, string>) {
    if (!job.renderFunction || !job.renderSite)
      throw new Error("Remotion renderer is not configured");
    const webhook = process.env.CALLBACK_URL
      ? {
          url: process.env.CALLBACK_URL,
          secret: await secret(process.env.WEBHOOK_SECRET_ARN!),
          customData: { jobId: job.id, rendererVersion: job.rendererVersion },
        }
      : null;
    return renderMediaOnLambda({
      region: (process.env.AWS_REGION || "us-east-1") as "us-east-1",
      functionName: job.renderFunction,
      serveUrl: job.renderSite,
      composition: "Pragyan",
      inputProps: { revision, audioUrls: urls },
      codec: "h264",
      // This dedicated render bucket disables object ACLs. Only trusted site
      // files are public through its prefix-scoped bucket policy.
      privacy: "no-acl",
      forceBucketName: process.env.REMOTION_BUCKET,
      deleteAfter: "1-day",
      concurrency: 2,
      maxRetries: 1,
      logLevel: "warn",
      timeoutInMilliseconds: 120000,
      webhook,
      downloadBehavior: { type: "download", fileName: `pragyan-${job.id}.mp4` },
    });
  }
  async poll(job: Job) {
    const r = await getRenderProgress({
      region: (process.env.AWS_REGION || "us-east-1") as "us-east-1",
      functionName: job.renderFunction!,
      bucketName: job.bucketName!,
      renderId: job.renderId!,
    });
    if (r.fatalErrorEncountered)
      return {
        done: false,
        progress: r.overallProgress,
        failed:
          "The renderer reported a fatal error. Inspect the render logs and retry this saved revision.",
      };
    if (!r.done) return { done: false, progress: r.overallProgress };
    // Only copy the SDK-reported key from the known render bucket; never fetch a callback URL.
    if (!r.outputFile) throw new Error("Missing render output");
    const url = new URL(r.outputFile);
    const region = process.env.AWS_REGION || "us-east-1";
    const pathStyle = url.hostname === `s3.${region}.amazonaws.com`;
    const virtualHost = url.hostname === `${job.bucketName}.s3.${region}.amazonaws.com`;
    if (url.protocol !== "https:" || (!pathStyle && !virtualHost))
      throw new Error("Unexpected render output host");
    const prefix = pathStyle ? `/${job.bucketName}/` : "/";
    if (!url.pathname.startsWith(prefix))
      throw new Error("Unexpected render output bucket");
    const key = decodeURIComponent(url.pathname.slice(prefix.length));
    if (!key.startsWith(`renders/${job.renderId}/`))
      throw new Error("Unexpected render output key");
    const object = await new S3Client({}).send(
      new GetObjectCommand({ Bucket: job.bucketName, Key: key }),
    );
    const outputKey = `${projectPrefix(job.owner, job.projectId)}/exports/${job.id}.mp4`;
    await this.blobs.put(
      outputKey,
      Buffer.from(await object.Body!.transformToByteArray()),
      "video/mp4",
    );
    return { done: true, progress: 1, outputKey };
  }
}

import { validateWebhookSignature } from "@remotion/lambda/client";
import { z } from "zod";
import { AppError, type Service } from "./service";
import { type Job, now } from "./model";
export async function acceptCallback(
  service: Service,
  body: unknown,
  signature: string,
  secret: string,
) {
  try {
    validateWebhookSignature({
      body: body as any,
      signatureHeader: signature,
      secret,
    });
  } catch {
    throw new AppError(401, "Invalid callback signature");
  }
  const payload = z
    .object({
      type: z.enum(["success", "error", "timeout"]),
      renderId: z.string().min(1),
      bucketName: z.string().min(1),
      expectedBucketOwner: z.string(),
      customData: z.object({ jobId: z.string(), rendererVersion: z.string() }),
    })
    .parse(body);
  const j = await service.store.get<Job>(payload.customData.jobId);
  if (
    !j ||
    j.type !== "export" ||
    j.rendererVersion !== payload.customData.rendererVersion
  )
    throw new AppError(400, "Unknown callback job");
  if (
    process.env.AWS_ACCOUNT_ID &&
    payload.expectedBucketOwner !== process.env.AWS_ACCOUNT_ID
  )
    throw new AppError(400, "Unexpected render account");
  if (
    process.env.REMOTION_BUCKET &&
    payload.bucketName !== process.env.REMOTION_BUCKET
  )
    throw new AppError(400, "Unexpected render bucket");
  if (j.renderId && j.renderId !== payload.renderId)
    throw new AppError(409, "Render identity mismatch");
  if (j.released) return;
  if (!["submitting", "rendering", "needs_review"].includes(j.stage))
    throw new AppError(409, "Job is not awaiting a renderer");
  const next: Job = {
    ...j,
    renderId: payload.renderId,
    bucketName: payload.bucketName,
    stage: "rendering",
    queue: "completion",
    leaseUntil: Date.now() + 1200000,
    updatedAt: now(),
    v: j.v + 1,
  };
  await service.store.transaction([{ value: next, expected: j.v }]);
  await service.enqueue(next);
}

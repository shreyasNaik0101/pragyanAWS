import "dotenv/config";
import { service } from "../services/core/runtime";
import { now, type Job } from "../services/core/model";
import { randomUUID } from "node:crypto";
const args = process.argv.slice(2),
  arg = (name: string) => args[args.indexOf(name) + 1];
if (!args.includes("--job"))
  throw new Error(
    "Usage: recover-job --job UUID --render RENDER_ID --bucket BUCKET, or --abandon after verifying no render is running",
  );
if (
  process.env.RUNTIME === "aws" &&
  process.env.PRAGYAN_OPERATOR_APPROVED !== "1"
)
  throw new Error(
    "Cloud mutation disabled. Obtain explicit operator approval first.",
  );
const j = await service.store.get<Job>(arg("--job"));
if (!j || j.stage !== "needs_review" || j.type !== "export")
  throw new Error("Only uncertain export jobs can be recovered");
if (args.includes("--abandon")) {
  await service.finish(j, "failed", {
    error:
      "Operator verified render state and released the uncertain submission. An explicit new export can now be requested.",
  });
} else {
  const renderId = arg("--render"),
    bucketName = arg("--bucket");
  if (
    !renderId ||
    !bucketName ||
    args.indexOf("--render") < 0 ||
    args.indexOf("--bucket") < 0
  )
    throw new Error("Supply a verified render ID and bucket");
  if (
    process.env.RUNTIME === "aws" &&
    bucketName !== process.env.REMOTION_BUCKET
  )
    throw new Error("Bucket does not match the configured renderer");
  const next: Job = {
    ...j,
    renderId,
    bucketName,
    stage: "rendering",
    queue: "completion",
    leaseUntil: Date.now() + 1200000,
    v: j.v + 1,
    updatedAt: now(),
  };
  await service.store.transaction([{ value: next, expected: j.v }]);
  await service.enqueue(next);
}
await service.store.transaction([
  {
    value: {
      id: `audit:${randomUUID()}`,
      owner: "SYSTEM",
      kind: "AUDIT",
      v: 1,
      jobId: j.id,
      action: args.includes("--abandon")
        ? "abandon-uncertain"
        : "attach-render",
      at: now(),
    },
    expected: null,
  },
]);
console.log("Recovery recorded for job", j.id);

import type { SQSEvent } from "aws-lambda";
import { worker } from "./runtime";
import type { Job } from "../core/model";
const consume = (queue: Job["queue"]) => async (event: SQSEvent) => {
  const batchItemFailures = [];
  for (const record of event.Records) {
    try {
      const { jobId } = JSON.parse(record.body);
      if (typeof jobId !== "string") throw new Error("Invalid message");
      await worker.process(jobId, queue);
    } catch {
      batchItemFailures.push({ itemIdentifier: record.messageId });
    }
  }
  return { batchItemFailures };
};
export const preparation = consume("prepare");
export const narration = consume("narrate");
export const submission = consume("render");
export const completion = consume("completion");
export const reconciliation = async () => worker.reconcile();

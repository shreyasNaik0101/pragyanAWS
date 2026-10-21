import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";
import type { Queue } from "./service";
import type { Job } from "./model";
export class SqsQueue implements Queue {
  private client = new SQSClient({});
  async send(queue: Job["queue"], id: string) {
    await this.client.send(
      new SendMessageCommand({
        QueueUrl: process.env[`QUEUE_${queue.toUpperCase()}`]!,
        MessageBody: JSON.stringify({ jobId: id }),
      }),
    );
  }
}
// The durable queued JOB row is the local queue. A separate process consumes it.
export class LocalQueue implements Queue {
  async send() {}
}

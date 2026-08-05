import { Queue } from "bullmq";
import { redis } from "@/lib/redis";

export type WebhookJobType = "PROCESS_FACEBOOK_LEAD" | "PROCESS_WHATSAPP_MESSAGE" | "PROCESS_WHATSAPP_STATUS";

export interface WebhookJob {
  type: WebhookJobType;
  eventId: string; // The ID of the WebhookEvent in the database
}

const QUEUE_NAME = "webhook-jobs";

export const webhookQueue = new Queue(QUEUE_NAME, {
  connection: redis,
  defaultJobOptions: {
    attempts: 5,
    backoff: {
      type: "exponential",
      delay: 5000,
    },
    removeOnComplete: true,
    removeOnFail: false,
  },
});

export const WebhookQueueService = {
  async enqueue(type: WebhookJobType, eventId: string) {
    const job: WebhookJob = { type, eventId };
    const bullJob = await webhookQueue.add(type, job);
    return bullJob.id;
  }
};

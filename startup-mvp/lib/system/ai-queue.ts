import { Queue } from "bullmq";
import { redis } from "@/lib/redis";

export type AIJobType = "PLANNER" | "RISK_PREDICTION" | "BALANCER";

export interface AIJob {
    type: AIJobType;
    payload: any;
    projectId?: string;
    teamMemberIds?: string[];
}

const QUEUE_NAME = "ai-jobs";

/**
 * Enterprise AI Queue System (BullMQ)
 * Offloads 15-second LLM generations to background workers with exponential backoff.
 */
export const aiQueue = new Queue(QUEUE_NAME, {
    connection: redis,
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: "exponential",
            delay: 5000,
        },
        removeOnComplete: true,
        removeOnFail: false,
    },
});

export const AIQueueService = {
    async enqueue(type: AIJobType, payload: any, projectId?: string, teamMemberIds?: string[]) {
        const job: AIJob = { type, payload, projectId, teamMemberIds };
        
        // Push to BullMQ natively
        const bullJob = await aiQueue.add(type, job);
        return bullJob.id;
    }
};

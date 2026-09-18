import { Worker, Job } from "bullmq";
import { redis } from "@/lib/redis";
import { AIJob } from "./ai-queue";
import { broadcastProjectEvent } from "@/lib/system/realtime";

// AI Executors
import { executeAiPlanner } from "@/app/actions/ai/planner.action";
import { executeAiRiskPrediction } from "@/app/actions/ai/risk.action";
import { executeAiBalancer } from "@/app/actions/ai/balancer.action";

const QUEUE_NAME = "ai-jobs";

export const aiWorker = new Worker<AIJob>(
    QUEUE_NAME,
    async (job: Job<AIJob>) => {
        const { type, payload, projectId, teamMemberIds } = job.data;
        let result: any = null;

        try {
            switch (type) {
                case "PLANNER":
                    result = await executeAiPlanner(projectId!, payload.prompt);
                    break;
                case "RISK_PREDICTION":
                    result = await executeAiRiskPrediction(projectId!);
                    break;
                case "BALANCER":
                    result = await executeAiBalancer(projectId!, teamMemberIds || []);
                    break;
                default:
                    throw new Error(`Unknown AI Job Type: ${type}`);
            }

            if (!result.success) {
                throw new Error(result.error); // Throw to trigger BullMQ exponential backoff
            }

            // Fire Realtime Success Event to the Client UI
            if (projectId) {
                await broadcastProjectEvent(projectId, "PROJECT_UPDATED", {
                    type,
                    status: "COMPLETED",
                    data: result.data,
                    jobId: job.id
                });
            }

            return result.data;

        } catch (error: any) {
            console.error(`[BullMQ] AI Job Failed: ${job.id}`, error);
            
            // Fire Realtime Failure Event to the Client UI
            if (projectId) {
                await broadcastProjectEvent(projectId, "PROJECT_UPDATED", {
                    type,
                    status: "FAILED",
                    error: error.message,
                    jobId: job.id
                });
            }

            throw error; // Let BullMQ handle retry mechanism
        }
    },
    {
        connection: redis,
        concurrency: 5 // Process up to 5 LLM requests concurrently to avoid OpenAI rate limits
    }
);

aiWorker.on('completed', job => {
    console.log(`[BullMQ] AI Job ${job.id} has completed!`);
});

aiWorker.on('failed', (job, err) => {
    console.error(`[BullMQ] AI Job ${job?.id} has failed with ${err.message}`);
});

aiWorker.on('error', (err) => {
    // Suppress unhandled error crash when Redis is temporarily offline/reconnecting
});

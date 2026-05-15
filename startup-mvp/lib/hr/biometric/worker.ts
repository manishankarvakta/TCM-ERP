import { Worker, Job } from "bullmq";
import { redis } from "@/lib/redis";
import { prisma } from "@/lib/prisma";
import { processBiometricLogs } from "./processor";
import { BiometricJobData } from "./queue";

export const biometricWorker = new Worker(
  "biometric-sync",
  async (job: Job<BiometricJobData>) => {
    const { syncLogId, rawLogs } = job.data;
    
    console.log(`Starting job ${job.id} for SyncLog ${syncLogId} with ${rawLogs.length} logs`);

    try {
      // 1. Update SyncLog status to PROCESSING
      await prisma.biometricSyncLog.update({
        where: { id: syncLogId },
        data: { status: "PROCESSING" as any },
      });

      // 2. Process logs in chunks to avoid memory/timeout issues
      const CHUNK_SIZE = job.data.chunkSize || 100;
      let processedCount = 0;

      for (let i = 0; i < rawLogs.length; i += CHUNK_SIZE) {
        const chunk = rawLogs.slice(i, i + CHUNK_SIZE);
        await processBiometricLogs(chunk);
        
        processedCount += chunk.length;
        const progress = Math.round((processedCount / rawLogs.length) * 100);
        await job.updateProgress(progress);
        
        console.log(`SyncLog ${syncLogId}: Processed ${processedCount}/${rawLogs.length} (${progress}%)`);
      }

      // 3. Update SyncLog status to COMPLETED
      await prisma.biometricSyncLog.update({
        where: { id: syncLogId },
        data: { status: "COMPLETED" as any },
      });

      return { success: true, processed: rawLogs.length };
    } catch (error) {
      console.error(`Error in biometric worker for job ${job.id}:`, error);
      
      // Update status to FAILED
      await prisma.biometricSyncLog.update({
        where: { id: syncLogId },
        data: { 
          status: "FAILED" as any,
          errorMessage: error instanceof Error ? error.message : "Unknown error in worker"
        },
      });

      throw error; // Let BullMQ handle retry
    }
  },
  {
    connection: redis,
    concurrency: 1, // Process one sync at a time to maintain data integrity
  }
);

biometricWorker.on("completed", (job) => {
  console.log(`Job ${job.id} has completed!`);
});

biometricWorker.on("failed", (job, err) => {
  console.log(`Job ${job?.id} has failed with ${err.message}`);
});

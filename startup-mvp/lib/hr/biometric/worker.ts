import { Worker, Job } from "bullmq";
import { redis } from "@/lib/redis";
import { prisma } from "@/lib/prisma";
import { processNormalizedChunk } from "./sync-service";
import { BiometricJobData } from "./queue";

export const biometricWorker = new Worker(
  "biometric-sync",
  async (job: Job<BiometricJobData>) => {
    const { syncLogId, rawData, vendor, deviceId } = job.data;
    const logs = rawData || [];
    
    console.log(`Starting job ${job.id} for SyncLog ${syncLogId} with ${logs.length} logs`);

    try {
      // 1. Update SyncLog status to PROCESSING
      if (syncLogId) {
        await prisma.biometricSyncLog.update({
          where: { id: syncLogId },
          data: { status: "PROCESSING" as any },
        });
      }

      // 2. Process logs in chunks to avoid memory/timeout issues
      const CHUNK_SIZE = job.data.chunkSize || 100;
      let processedCount = 0;

      for (let i = 0; i < logs.length; i += CHUNK_SIZE) {
        const chunk = logs.slice(i, i + CHUNK_SIZE);
        await processNormalizedChunk({
          vendor: vendor || "ZKTECO",
          rawData: chunk,
          deviceId,
        });
        
        processedCount += chunk.length;
        const progress = Math.round((processedCount / logs.length) * 100);
        await job.updateProgress(progress);
        
        console.log(`SyncLog ${syncLogId}: Processed ${processedCount}/${logs.length} (${progress}%)`);
      }

      // 3. Update SyncLog status to COMPLETED
      if (syncLogId) {
        await prisma.biometricSyncLog.update({
          where: { id: syncLogId },
          data: { status: "COMPLETED" as any },
        });
      }

      return { success: true, processed: logs.length };
    } catch (error) {
      console.error(`Error in biometric worker for job ${job.id}:`, error);
      
      // Update status to FAILED
      if (syncLogId) {
        await prisma.biometricSyncLog.update({
          where: { id: syncLogId },
          data: { 
            status: "FAILED" as any,
            errorMessage: error instanceof Error ? error.message : "Unknown error in worker"
          },
        });
      }

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

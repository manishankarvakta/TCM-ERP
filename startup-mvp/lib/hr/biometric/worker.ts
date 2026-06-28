import { Worker, Job } from "bullmq";
import { redis } from "@/lib/redis";
import { prisma } from "@/lib/prisma";
import { processNormalizedChunk } from "./sync-service";
import { processBiometricAttendance } from "./processor";
import { BiometricJobData, BiometricJobType } from "./queue";

console.log("🚀 Biometric Worker instantiated and listening for jobs on 'biometric-sync' queue!");

export const biometricWorker = new Worker(
  "biometric-sync",
  async (job: Job<BiometricJobData>) => {
    const { type } = job.data;

    if (type === BiometricJobType.SYNC_LOGS) {
      const { syncLogId, rawData, vendor, deviceId } = job.data;
      if (!syncLogId) {
        throw new Error("syncLogId is required for SYNC_LOGS job");
      }
      
      console.log(`Starting job ${job.id} (SYNC_LOGS) for SyncLog ${syncLogId} with ${rawData?.length || 0} logs`);

      try {
        // 1. Update SyncLog status to PROCESSING
        await prisma.biometricSyncLog.update({
          where: { id: syncLogId },
          data: { status: "PROCESSING" as any },
        });

        // 2. Process logs in chunks to avoid memory/timeout issues
        const CHUNK_SIZE = job.data.chunkSize || 100;
        let processedCount = 0;
        const dataArray = rawData || [];

        for (let i = 0; i < dataArray.length; i += CHUNK_SIZE) {
          const chunk = dataArray.slice(i, i + CHUNK_SIZE);
          await processNormalizedChunk({
            vendor: vendor!,
            rawData: chunk,
            deviceId,
          });
          
          processedCount += chunk.length;
          const progress = Math.round((processedCount / dataArray.length) * 100);
          await job.updateProgress(progress);
          
          console.log(`SyncLog ${syncLogId}: Processed ${processedCount}/${dataArray.length} (${progress}%)`);
        }

        // 3. Update SyncLog status to COMPLETED
        await prisma.biometricSyncLog.update({
          where: { id: syncLogId },
          data: { status: "COMPLETED" as any },
        });

        console.log(`✅ SYNC_LOGS Job ${job.id} completely finished. Processed total: ${dataArray.length} records.`);
        return { success: true, processed: dataArray.length };
      } catch (error) {
        console.error(`Error in biometric worker for job ${job.id} (SYNC_LOGS):`, error);
        
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
    } else if (type === BiometricJobType.PROCESS_ATTENDANCE) {
      const { startDate, endDate, employeeId } = job.data;
      if (!startDate || !endDate) {
        throw new Error("startDate and endDate are required for PROCESS_ATTENDANCE job");
      }

      console.log(`Starting job ${job.id} (PROCESS_ATTENDANCE) for range ${startDate} to ${endDate} (employee: ${employeeId || 'all'})`);

      try {
        const result = await processBiometricAttendance(
          new Date(startDate),
          new Date(endDate),
          employeeId
        );

        if (!result.success) {
          throw new Error(result.error || "Failed to process biometric attendance");
        }

        console.log(`✅ PROCESS_ATTENDANCE Job ${job.id} completely finished for range ${startDate} to ${endDate}.`);
        return result;
      } catch (error) {
        console.error(`Error in biometric worker for job ${job.id} (PROCESS_ATTENDANCE):`, error);
        throw error;
      }
    } else {
      throw new Error(`Unsupported job type: ${type}`);
    }
  },
  {
    connection: redis as any,
    concurrency: 1, // Process one sync at a time to maintain data integrity
  }
);

biometricWorker.on("completed", (job) => {
  console.log(`Job ${job.id} has completed!`);
});

biometricWorker.on("failed", (job, err) => {
  console.log(`Job ${job?.id} has failed with ${err.message}`);
});

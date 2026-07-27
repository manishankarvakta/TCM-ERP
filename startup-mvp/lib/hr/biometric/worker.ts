import { Worker, Job } from "bullmq";
import { redis } from "@/lib/redis";
import { prisma } from "@/lib/prisma";
import { processNormalizedChunk } from "./sync-service";
import { processBiometricAttendance } from "./processor";
import { normalizeBiometricLogs } from "./normalization";
import { biometricQueue, BiometricJobType, BiometricJobData } from "./queue";

export const biometricWorker = new Worker(
  "biometric-sync",
  async (job: Job<BiometricJobData>) => {
    const { type, syncLogId, rawData, vendor, deviceId, startDate, endDate, employeeId } = job.data;
    
    console.log(`Starting job ${job.id} of type ${type || "SYNC_LOGS"}`);

    try {
      if (type === BiometricJobType.PROCESS_ATTENDANCE) {
        if (!startDate || !endDate) {
          throw new Error("Missing date range for attendance processing");
        }
        console.log(`Processing attendance from ${startDate} to ${endDate} for employee ${employeeId || "all"}`);
        const result = await processBiometricAttendance(new Date(startDate), new Date(endDate), employeeId);
        return result;
      }

      // Default fallback or explicit SYNC_LOGS
      const logs = rawData || [];
      console.log(`Starting SYNC_LOGS job for SyncLog ${syncLogId} with ${logs.length} logs`);

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

        // 4. Auto-trigger attendance processing for the range of dates synced
        if (logs.length > 0) {
          try {
            const normalized = normalizeBiometricLogs(vendor || "ZKTeco", logs);
            const timestamps = normalized
              .map(l => new Date(l.timestamp).getTime())
              .filter(t => !isNaN(t));
            
            if (timestamps.length > 0) {
              const minTime = Math.min(...timestamps);
              const maxTime = Math.max(...timestamps);
              
              const minDate = new Date(minTime);
              const maxDate = new Date(maxTime);
              
              console.log(`Auto-queuing attendance processing from ${minDate.toISOString()} to ${maxDate.toISOString()}`);
              await biometricQueue.add(`auto-process-${syncLogId}-${Date.now()}`, {
                type: BiometricJobType.PROCESS_ATTENDANCE,
                startDate: minDate,
                endDate: maxDate,
              });
            } else {
              console.log("No valid timestamps found in logs, skipping auto-queuing of attendance processing.");
            }
          } catch (err) {
            console.error("Failed to auto-trigger attendance processing:", err);
          }
        }
      }

      return { success: true, processed: logs.length };
    } catch (error) {
      console.error(`Error in biometric worker for job ${job.id}:`, error);
      
      // Update status to FAILED
      if (type !== BiometricJobType.PROCESS_ATTENDANCE && syncLogId) {
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


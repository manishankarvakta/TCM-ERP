import { biometricWorker } from "../lib/hr/biometric/worker";
import { Queue } from "bullmq";
import { redis } from "../lib/redis";
import { prisma } from "../lib/prisma";

async function main() {
  console.log("=== RETRYING FAILED BIOMETRIC JOBS ===");
  
  const queue = new Queue("biometric-sync", { connection: redis });
  
  const failedJobs = await queue.getFailed();
  console.log(`Failed jobs found in queue: ${failedJobs.length}`);
  
  biometricWorker.on("completed", (job) => {
    console.log(`[Worker] Job ${job.id} (${job.data.type}) completed successfully!`);
  });

  biometricWorker.on("failed", (job, err) => {
    console.error(`[Worker] Job ${job?.id} failed with error:`, err.message);
  });

  if (failedJobs.length > 0) {
    console.log("Retrying failed jobs...");
    for (const job of failedJobs) {
      console.log(`- Retrying job ${job.id} (type: ${job.data.type})`);
      await job.retry();
    }
  } else {
    console.log("No failed jobs to retry.");
  }
  
  console.log("Worker is listening. Keeping script active for 50 seconds to process jobs...");
  await new Promise((resolve) => setTimeout(resolve, 50000));
  
  console.log("Shutting down worker and queue...");
  await biometricWorker.close();
  await queue.close();
  
  // Final count of logs
  const logsCount = await prisma.attendanceLog.count();
  const attendanceCount = await prisma.attendance.count();
  console.log(`=== STATS AFTER RUN ===`);
  console.log(`Total AttendanceLogs in DB: ${logsCount}`);
  console.log(`Total Attendance records in DB: ${attendanceCount}`);
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    console.log("Prisma disconnected.");
  });

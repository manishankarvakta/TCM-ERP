import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import type { Prisma, QueueJob } from "@prisma/client";

export interface QueueJobOptions {
  organizationId: string;
  referenceId?: string;
  maxAttempts?: number;
  availableAt?: Date;
}

const workerId = `worker-${process.pid}-${crypto.randomBytes(4).toString("hex")}`;

/**
 * Queue a new background job
 */
export async function queueJob(
  type: string,
  payload: Prisma.InputJsonValue,
  options: QueueJobOptions
): Promise<QueueJob> {
  return prisma.queueJob.create({
    data: {
      organizationId: options.organizationId,
      type,
      referenceId: options.referenceId || null,
      payload: payload ?? {},
      status: "PENDING",
      maxAttempts: options.maxAttempts ?? 5,
      availableAt: options.availableAt ?? new Date(),
    },
  });
}

/**
 * Atomically claim a single available job from the queue
 * Supports lease expiration reclaiming for crash recovery
 */
export async function claimNextJob(leaseSeconds = 300): Promise<QueueJob | null> {
  const leaseUntil = new Date(Date.now() + leaseSeconds * 1000);
  
  try {
    // Atomically find and update a job using FOR UPDATE SKIP LOCKED
    const claimedJobs = await prisma.$queryRawUnsafe<QueueJob[]>(`
      UPDATE "QueueJob"
      SET 
        "status" = 'CLAIMED',
        "claimedBy" = $1,
        "claimedAt" = NOW(),
        "leaseUntil" = $2,
        "attempts" = "attempts" + 1,
        "updatedAt" = NOW()
      WHERE "id" = (
        SELECT "id"
        FROM "QueueJob"
        WHERE 
          (
            "status" = 'PENDING' 
            OR "status" = 'FAILED'
            OR (("status" = 'CLAIMED' OR "status" = 'RUNNING') AND "leaseUntil" <= NOW())
          )
          AND "availableAt" <= NOW()
          AND "attempts" < "maxAttempts"
        ORDER BY "availableAt" ASC
        LIMIT 1
        FOR UPDATE SKIP LOCKED
      )
      RETURNING *;
    `, workerId, leaseUntil);
    
    if (claimedJobs && claimedJobs.length > 0) {
      return claimedJobs[0];
    }
  } catch (error) {
    console.error("Error claiming job from queue:", error);
  }
  
  return null;
}

/**
 * Mark a claimed job as successfully completed
 */
export async function completeJob(jobId: string): Promise<QueueJob> {
  return prisma.queueJob.update({
    where: { id: jobId },
    data: {
      status: "SUCCEEDED",
      claimedBy: null,
      leaseUntil: null,
    },
  });
}

/**
 * Handle job failure with exponential backoff or transition to DEAD_LETTER
 */
export async function failJob(
  jobId: string,
  error: Error | string,
  errorCode = "JOB_ERROR"
): Promise<QueueJob> {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorStack = error instanceof Error ? error.stack : undefined;
  
  const job = await prisma.queueJob.findUnique({
    where: { id: jobId },
  });
  
  if (!job) {
    throw new Error(`Job ${jobId} not found`);
  }
  
  const isLastAttempt = job.attempts >= job.maxAttempts;
  const newStatus = isLastAttempt ? "DEAD_LETTER" : "FAILED";
  
  // Exponential backoff: 10s, 20s, 40s, 80s... max 1 hour
  const backoffMultiplier = Math.pow(2, Math.max(0, job.attempts - 1));
  const backoffSeconds = Math.min(3600, 10 * backoffMultiplier);
  const nextAvailableAt = new Date(Date.now() + backoffSeconds * 1000);
  
  return prisma.queueJob.update({
    where: { id: jobId },
    data: {
      status: newStatus,
      claimedBy: null,
      leaseUntil: null,
      availableAt: isLastAttempt ? job.availableAt : nextAvailableAt,
      errorCode,
      errorSummary: errorMessage.substring(0, 1000) + (errorStack ? `\nStack: ${errorStack.substring(0, 1000)}` : ""),
    },
  });
}

/**
 * Manually retry a failed or dead-letter job
 */
export async function retryJobManually(jobId: string): Promise<QueueJob> {
  const job = await prisma.queueJob.findUnique({
    where: { id: jobId },
  });
  
  if (!job) {
    throw new Error(`Job ${jobId} not found`);
  }
  
  return prisma.queueJob.update({
    where: { id: jobId },
    data: {
      status: "PENDING",
      attempts: 0,
      availableAt: new Date(),
      claimedBy: null,
      leaseUntil: null,
      errorCode: null,
      errorSummary: null,
    },
  });
}

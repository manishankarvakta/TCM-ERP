import { Queue } from "bullmq";
import { redis } from "@/lib/redis";

const QUEUE_NAME = "biometric-sync";

export const biometricQueue = new Queue(QUEUE_NAME, {
  connection: redis as any,
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

export enum BiometricJobType {
  SYNC_LOGS = "SYNC_LOGS",
  PROCESS_ATTENDANCE = "PROCESS_ATTENDANCE",
}

export type BiometricJobData = {
  type: BiometricJobType;
  syncLogId?: string;
  vendor?: string;
  rawData?: any[];
  deviceId?: string;
  syncedBy?: string;
  startDate?: Date | string;
  endDate?: Date | string;
  employeeId?: string;
  chunkSize?: number;
};

// Import worker to register it when queue is loaded
import "./worker";


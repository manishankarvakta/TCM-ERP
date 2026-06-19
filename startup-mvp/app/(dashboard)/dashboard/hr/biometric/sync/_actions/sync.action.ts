"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  reprocessRawLogsByDeviceAndDate,
  reprocessUnknownPunchesByDeviceAndDate,
  reprocessFailedSyncsByDeviceAndDate,
  queueTestAdmsHistoricalQuery
} from "@/lib/hr/biometric/reprocess-service";

export async function actionReprocessRawLogs(deviceId: string, fromDateStr: string, toDateStr: string) {
  try {
    const fromDate = new Date(fromDateStr);
    const toDate = new Date(toDateStr);
    const result = await reprocessRawLogsByDeviceAndDate(deviceId, fromDate, toDate);
    revalidatePath("/dashboard/hr/biometric/sync");
    return result;
  } catch (error: any) {
    console.error("Action error:", error);
    return { success: false, error: error.message || "Failed to reprocess raw logs" };
  }
}

export async function actionReprocessUnknownPunches(deviceId: string, fromDateStr: string, toDateStr: string) {
  try {
    const fromDate = new Date(fromDateStr);
    const toDate = new Date(toDateStr);
    const result = await reprocessUnknownPunchesByDeviceAndDate(deviceId, fromDate, toDate);
    revalidatePath("/dashboard/hr/biometric/sync");
    return result;
  } catch (error: any) {
    console.error("Action error:", error);
    return { success: false, error: error.message || "Failed to reprocess unknown punches" };
  }
}

export async function actionReprocessFailedSyncs(deviceId: string, fromDateStr: string, toDateStr: string) {
  try {
    const fromDate = new Date(fromDateStr);
    const toDate = new Date(toDateStr);
    const result = await reprocessFailedSyncsByDeviceAndDate(deviceId, fromDate, toDate);
    revalidatePath("/dashboard/hr/biometric/sync");
    return result;
  } catch (error: any) {
    console.error("Action error:", error);
    return { success: false, error: error.message || "Failed to reprocess failed syncs" };
  }
}

export async function actionTestAdmsHistoricalQuery(deviceId: string) {
  try {
    const result = await queueTestAdmsHistoricalQuery(deviceId);
    revalidatePath("/dashboard/hr/biometric/sync");
    return result;
  } catch (error: any) {
    console.error("Action error:", error);
    return { success: false, error: error.message || "Failed to queue ADMS test query" };
  }
}

export async function getBiometricSyncHistoryAction(deviceId: string) {
  try {
    const history = await prisma.biometricSyncLog.findMany({
      where: { deviceId },
      orderBy: { syncTime: "desc" },
      take: 20
    });
    return { success: true, history };
  } catch (error: any) {
    console.error("Action error:", error);
    return { success: false, error: error.message || "Failed to fetch sync history" };
  }
}

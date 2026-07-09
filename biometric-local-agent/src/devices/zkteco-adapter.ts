// @ts-ignore
import ZKLib from "node-zklib";
import { logger } from "../logger";

export interface NormalizedPunch {
  deviceUserId: string;
  timestamp: Date;
  punchType?: string;
  verifyMode?: string;
  workCode?: string;
  rawData: any;
}

export class ZKTEcoAdapter {
  /**
   * Tests the connection to the ZKTeco device
   */
  static async testConnection(ipAddress: string, port: number = 4370, timeoutMs: number = 10000): Promise<{ success: boolean; error: string | null }> {
    logger.info(`Testing ZKTeco connection at ${ipAddress}:${port}`);
    // Initialize ZKLib: ip, port, timeout, inport
    const zkInstance = new ZKLib(ipAddress, port, timeoutMs, 4000);

    try {
      await zkInstance.createSocket();
      // Confirm connection by calling a basic query
      await zkInstance.getPlatform();
      await zkInstance.disconnect();
      return { success: true, error: null };
    } catch (err: any) {
      logger.error(`ZKTeco connection test failed for ${ipAddress}:${port}`, err);
      try {
        await zkInstance.disconnect();
      } catch (e) {}
      return { success: false, error: err.message || "Connection failed" };
    }
  }

  /**
   * Pulls attendance records from the ZKTeco device
   */
  static async pullAttendance(ipAddress: string, port: number = 4370, timeoutMs: number = 10000): Promise<{ success: boolean; punches: NormalizedPunch[]; error: string | null }> {
    logger.info(`Pulling ZKTeco attendance logs from ${ipAddress}:${port}`);
    const zkInstance = new ZKLib(ipAddress, port, timeoutMs, 4000);

    try {
      await zkInstance.createSocket();
      const logs = await zkInstance.getAttendances();
      await zkInstance.disconnect();

      if (!logs || !logs.data) {
        return { success: true, punches: [], error: null };
      }

      const punches: NormalizedPunch[] = logs.data.map((log: any) => {
        // zklib returns: { deviceUserId: '1', recordTime: '2023-01-01 09:00:00' }
        const timestamp = new Date(log.recordTime);
        return {
          deviceUserId: String(log.deviceUserId),
          timestamp,
          punchType: String(log.punchType || "0"),
          verifyMode: String(log.verifyMode || "1"),
          workCode: String(log.workCode || "0"),
          rawData: log
        };
      });

      return { success: true, punches, error: null };
    } catch (err: any) {
      logger.error(`Failed to pull ZKTeco attendance from ${ipAddress}:${port}`, err);
      try {
        await zkInstance.disconnect();
      } catch (e) {}
      return { success: false, punches: [], error: err.message || "Failed to retrieve logs" };
    }
  }

  /**
   * Pulls users currently registered on the ZKTeco device
   */
  static async pullUsers(ipAddress: string, port: number = 4370, timeoutMs: number = 10000): Promise<{ success: boolean; userIds: string[]; error: string | null }> {
    logger.info(`Pulling ZKTeco users from ${ipAddress}:${port}`);
    const zkInstance = new ZKLib(ipAddress, port, timeoutMs, 4000);

    try {
      await zkInstance.createSocket();
      const users = await zkInstance.getUsers();
      await zkInstance.disconnect();

      if (!users || !users.data) {
        return { success: true, userIds: [], error: null };
      }

      const userIds: string[] = users.data
        .filter((u: any) => u.userId)
        .map((u: any) => String(u.userId));

      return { success: true, userIds, error: null };
    } catch (err: any) {
      logger.error(`Failed to pull ZKTeco users from ${ipAddress}:${port}`, err);
      try {
        await zkInstance.disconnect();
      } catch (e) {}
      return { success: false, userIds: [], error: err.message || "Failed to retrieve users" };
    }
  }
}

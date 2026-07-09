import { JsonDb } from "./json-db";
import { generatePunchId } from "../utils/hash";

export interface AttendanceCacheRecord {
  id: string; // Generated hash ID
  vendor: string;
  deviceId: string;
  serialNumber?: string;
  deviceUserId: string;
  timestamp: string; // ISO String
  punchType?: string;
  verifyMode?: string;
  workCode?: string;
  syncStatus: "PENDING" | "SYNCED" | "FAILED";
  retryCount: number;
  rawData: any;
  createdAt: string; // ISO String
  syncedAt: string | null;
  lastError: string | null;
}

export interface AttendanceCache {
  records: AttendanceCacheRecord[];
}

export class AttendanceStore {
  private static FILE_NAME = "attendance-cache.json";

  /**
   * Reads all records from the attendance cache
   */
  static getCache(): AttendanceCache {
    return JsonDb.read<AttendanceCache>(this.FILE_NAME, { records: [] });
  }

  /**
   * Writes the full cache to disk
   */
  static saveCache(cache: AttendanceCache): boolean {
    return JsonDb.write<AttendanceCache>(this.FILE_NAME, cache);
  }

  /**
   * Adds new records to the cache if they don't already exist.
   * Returns the count of newly added records.
   */
  static addRecords(
    deviceId: string,
    vendor: string,
    serialNumber: string | undefined,
    punches: Array<{
      deviceUserId: string;
      timestamp: Date | string;
      punchType?: string;
      verifyMode?: string;
      workCode?: string;
      rawData: any;
    }>
  ): number {
    const cache = this.getCache();
    const existingIds = new Set(cache.records.map((r) => r.id));
    let addedCount = 0;

    const nowStr = new Date().toISOString();

    for (const punch of punches) {
      const punchTimeStr = typeof punch.timestamp === "string" 
        ? punch.timestamp 
        : punch.timestamp.toISOString();
        
      const id = generatePunchId(deviceId, punch.deviceUserId, punchTimeStr);

      if (!existingIds.has(id)) {
        const record: AttendanceCacheRecord = {
          id,
          vendor,
          deviceId,
          serialNumber,
          deviceUserId: punch.deviceUserId,
          timestamp: punchTimeStr,
          punchType: punch.punchType || "0",
          verifyMode: punch.verifyMode || "1",
          workCode: punch.workCode || "0",
          syncStatus: "PENDING",
          retryCount: 0,
          rawData: punch.rawData || {},
          createdAt: nowStr,
          syncedAt: null,
          lastError: null
        };
        cache.records.push(record);
        existingIds.add(id);
        addedCount++;
      }
    }

    if (addedCount > 0) {
      this.saveCache(cache);
    }

    return addedCount;
  }

  /**
   * Gets pending records that are ready for sync (PENDING or FAILED, with retryCount < maxRetries)
   */
  static getPendingRecords(maxRetries: number, batchSize: number): AttendanceCacheRecord[] {
    const cache = this.getCache();
    return cache.records
      .filter((r) => (r.syncStatus === "PENDING" || r.syncStatus === "FAILED") && r.retryCount < maxRetries)
      .slice(0, batchSize);
  }

  /**
   * Updates sync status for a batch of records
   */
  static updateSyncStatuses(
    updates: Array<{
      id: string;
      status: "SYNCED" | "FAILED";
      error?: string;
    }>
  ): void {
    const cache = this.getCache();
    const updateMap = new Map(updates.map((u) => [u.id, u]));

    let modified = false;
    const nowStr = new Date().toISOString();

    for (const record of cache.records) {
      const update = updateMap.get(record.id);
      if (update) {
        record.syncStatus = update.status;
        if (update.status === "SYNCED") {
          record.syncedAt = nowStr;
          record.lastError = null;
        } else {
          record.retryCount += 1;
          record.lastError = update.error || "Failed to sync";
        }
        modified = true;
      }
    }

    if (modified) {
      this.saveCache(cache);
    }
  }

  /**
   * Retrieves summary counts for heartbeat status
   */
  static getStatusSummary(maxRetries: number): { pending: number; failed: number } {
    const cache = this.getCache();
    let pending = 0;
    let failed = 0;

    for (const r of cache.records) {
      if (r.syncStatus === "PENDING") {
        pending++;
      } else if (r.syncStatus === "FAILED") {
        if (r.retryCount >= maxRetries) {
          failed++;
        } else {
          pending++; // Still retryable, so it's considered pending sync
        }
      }
    }

    return { pending, failed };
  }
}

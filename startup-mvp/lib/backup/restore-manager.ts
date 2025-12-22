/**
 * Restore Progress Manager
 * 
 * Singleton class for managing active restore operations and progress tracking.
 * Uses Redis for persistence across serverless function invocations.
 */

import type { RestoreProgress, RestoreStatus } from '@/types/backup';
import { now } from './utils';
import { redis } from '@/lib/redis';

/**
 * Callback function for progress updates
 */
type ProgressCallback = (progress: RestoreProgress) => void;

/**
 * Redis key prefix for restore operations
 */
const REDIS_PREFIX = 'restore:';
const REDIS_TTL = 60 * 60; // 1 hour TTL for restore data

/**
 * Singleton class managing active restore operations and their progress
 */
export class RestoreManager {
  private static instance: RestoreManager | null = null;

  /** Map of restore ID to progress data */
  private activeRestores: Map<string, RestoreProgress>;

  /** Map of restore ID to set of subscriber callbacks */
  private progressCallbacks: Map<string, Set<ProgressCallback>>;

  /** Maximum time to keep completed restore data (1 hour) */
  private readonly CLEANUP_TIMEOUT = 60 * 60 * 1000;

  private constructor() {
    this.activeRestores = new Map();
    this.progressCallbacks = new Map();

    // Start cleanup interval to remove old completed restores
    this.startCleanupInterval();
  }

  /**
   * Get the singleton instance
   */
  public static getInstance(): RestoreManager {
    if (!RestoreManager.instance) {
      RestoreManager.instance = new RestoreManager();
    }
    return RestoreManager.instance;
  }

  /**
   * Create a new restore operation
   * @param backupId - ID of backup being restored
   * @returns Unique restore operation ID
   */
  public createRestore(backupId: string): string {
    const restoreId = `restore-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    const progress: RestoreProgress = {
      restoreId,
      status: 'IDLE',
      progress: 0,
      stage: 'Initializing restore operation',
      logs: [`[${new Date().toISOString()}] Restore operation created for backup ${backupId}`],
      startTime: now(),
      estimatedCompletion: null,
      stats: {},
      error: null,
    };

    this.activeRestores.set(restoreId, progress);
    this.progressCallbacks.set(restoreId, new Set());

    // Persist to Redis
    this.saveToRedis(restoreId, progress).catch((error) => {
      console.error(`Failed to save restore ${restoreId} to Redis:`, error);
    });

    return restoreId;
  }

  /**
   * Update progress for a restore operation
   * @param restoreId - Restore operation ID
   * @param update - Partial progress update
   */
  public async updateProgress(restoreId: string, update: Partial<RestoreProgress>): Promise<void> {
    let current = this.activeRestores.get(restoreId);
    
    // If not in memory, try to load from Redis
    if (!current) {
      current = await this.loadFromRedis(restoreId);
      if (!current) {
        console.warn(`Attempted to update non-existent restore: ${restoreId}`);
        return;
      }
    }

    // Merge update with current progress
    const updatedProgress: RestoreProgress = {
      ...current,
      ...update,
      // Preserve certain fields that shouldn't be overwritten
      restoreId: current.restoreId,
      startTime: current.startTime,
      logs: update.logs ? [...current.logs, ...update.logs] : current.logs,
      stats: update.stats ? { ...current.stats, ...update.stats } : current.stats,
    };

    this.activeRestores.set(restoreId, updatedProgress);

    // Persist to Redis
    await this.saveToRedis(restoreId, updatedProgress).catch((error) => {
      console.error(`Failed to update restore ${restoreId} in Redis:`, error);
    });

    // Notify all subscribers
    this.notifySubscribers(restoreId, updatedProgress);
  }

  /**
   * Add a log entry to a restore operation
   * @param restoreId - Restore operation ID
   * @param message - Log message
   * @param level - Log level (info, warn, error)
   */
  public addLog(restoreId: string, message: string, level: 'info' | 'warn' | 'error' = 'info'): void {
    const current = this.activeRestores.get(restoreId);
    
    if (!current) {
      return;
    }

    const timestamp = new Date().toISOString();
    const prefix = level === 'error' ? '❌' : level === 'warn' ? '⚠️' : '✓';
    const logEntry = `[${timestamp}] ${prefix} ${message}`;

    current.logs.push(logEntry);
    this.activeRestores.set(restoreId, current);

    // Notify subscribers
    this.notifySubscribers(restoreId, current);
  }

  /**
   * Update restore status
   * @param restoreId - Restore operation ID
   * @param status - New status
   * @param stage - Optional stage description
   */
  public updateStatus(
    restoreId: string,
    status: RestoreStatus,
    stage?: string
  ): void {
    this.updateProgress(restoreId, {
      status,
      ...(stage && { stage }),
    });
  }

  /**
   * Get current progress for a restore operation
   * @param restoreId - Restore operation ID
   * @returns Current progress or null if not found
   */
  public async getProgress(restoreId: string): Promise<RestoreProgress | null> {
    // Check memory first
    let progress = this.activeRestores.get(restoreId);
    
    // If not in memory, try Redis
    if (!progress) {
      progress = await this.loadFromRedis(restoreId);
      if (progress) {
        // Cache in memory
        this.activeRestores.set(restoreId, progress);
        if (!this.progressCallbacks.has(restoreId)) {
          this.progressCallbacks.set(restoreId, new Set());
        }
      }
    }
    
    return progress || null;
  }

  /**
   * Subscribe to progress updates for a restore operation
   * @param restoreId - Restore operation ID
   * @param callback - Function to call on progress updates
   * @returns Unsubscribe function
   */
  public subscribeToProgress(restoreId: string, callback: ProgressCallback): () => void {
    let callbacks = this.progressCallbacks.get(restoreId);
    
    if (!callbacks) {
      callbacks = new Set();
      this.progressCallbacks.set(restoreId, callbacks);
    }

    callbacks.add(callback);

    // Return unsubscribe function
    return () => {
      const cbs = this.progressCallbacks.get(restoreId);
      if (cbs) {
        cbs.delete(callback);
      }
    };
  }

  /**
   * Mark a restore as completed successfully
   * @param restoreId - Restore operation ID
   */
  public completeRestore(restoreId: string): void {
    this.updateProgress(restoreId, {
      status: 'COMPLETED',
      progress: 100,
      stage: 'Restore completed successfully',
    });

    this.addLog(restoreId, 'Restore operation completed successfully');

    // Schedule cleanup
    this.scheduleCleanup(restoreId);
  }

  /**
   * Mark a restore as failed
   * @param restoreId - Restore operation ID
   * @param error - Error message
   * @param errorDetails - Detailed error information
   */
  public failRestore(restoreId: string, error: string, errorDetails?: string): void {
    this.updateProgress(restoreId, {
      status: 'FAILED',
      stage: 'Restore failed',
      error,
      errorDetails,
    });

    this.addLog(restoreId, `Restore failed: ${error}`, 'error');

    // Schedule cleanup
    this.scheduleCleanup(restoreId);
  }

  /**
   * Check if a restore operation exists
   * @param restoreId - Restore operation ID
   * @returns True if restore exists
   */
  public async exists(restoreId: string): Promise<boolean> {
    // Check memory first
    if (this.activeRestores.has(restoreId)) {
      return true;
    }
    
    // Check Redis
    try {
      const redisKey = `${REDIS_PREFIX}${restoreId}`;
      const exists = await redis.exists(redisKey);
      return exists === 1;
    } catch (error) {
      console.error(`Failed to check restore existence in Redis:`, error);
      return false;
    }
  }

  /**
   * Cancel a restore operation
   * @param restoreId - Restore operation ID
   */
  public cancelRestore(restoreId: string): void {
    this.updateProgress(restoreId, {
      status: 'FAILED',
      stage: 'Restore cancelled by user',
      error: 'Operation cancelled',
    });

    this.addLog(restoreId, 'Restore operation cancelled', 'warn');

    // Immediate cleanup for cancelled operations
    setTimeout(() => this.cleanup(restoreId), 5000);
  }

  /**
   * Get all active restores
   * @returns Array of all restore progress objects
   */
  public getAllRestores(): RestoreProgress[] {
    return Array.from(this.activeRestores.values());
  }

  /**
   * Get count of active (running) restores
   * @returns Number of running restores
   */
  public getActiveCount(): number {
    return Array.from(this.activeRestores.values()).filter(
      (restore) => restore.status !== 'COMPLETED' && restore.status !== 'FAILED'
    ).length;
  }

  /**
   * Notify all subscribers of progress update
   */
  private notifySubscribers(restoreId: string, progress: RestoreProgress): void {
    const callbacks = this.progressCallbacks.get(restoreId);
    
    if (callbacks) {
      callbacks.forEach((callback) => {
        try {
          callback(progress);
        } catch (error) {
          console.error('Error in progress callback:', error);
        }
      });
    }
  }

  /**
   * Save restore progress to Redis
   */
  private async saveToRedis(restoreId: string, progress: RestoreProgress): Promise<void> {
    const redisKey = `${REDIS_PREFIX}${restoreId}`;
    await redis.setex(redisKey, REDIS_TTL, JSON.stringify(progress));
  }

  /**
   * Load restore progress from Redis
   */
  private async loadFromRedis(restoreId: string): Promise<RestoreProgress | null> {
    try {
      const redisKey = `${REDIS_PREFIX}${restoreId}`;
      const data = await redis.get(redisKey);
      
      if (!data) {
        return null;
      }
      
      return JSON.parse(data) as RestoreProgress;
    } catch (error) {
      console.error(`Failed to load restore ${restoreId} from Redis:`, error);
      return null;
    }
  }

  /**
   * Delete restore data from Redis
   */
  private async deleteFromRedis(restoreId: string): Promise<void> {
    const redisKey = `${REDIS_PREFIX}${restoreId}`;
    await redis.del(redisKey);
  }

  /**
   * Schedule cleanup of completed restore after timeout
   */
  private scheduleCleanup(restoreId: string): void {
    setTimeout(() => {
      this.cleanup(restoreId);
    }, this.CLEANUP_TIMEOUT);
  }

  /**
   * Remove restore data and callbacks
   */
  private async cleanup(restoreId: string): Promise<void> {
    this.activeRestores.delete(restoreId);
    this.progressCallbacks.delete(restoreId);
    
    // Delete from Redis
    await this.deleteFromRedis(restoreId).catch((error) => {
      console.error(`Failed to delete restore ${restoreId} from Redis:`, error);
    });
    
    console.log(`[RestoreManager] Cleaned up restore: ${restoreId}`);
  }

  /**
   * Start periodic cleanup of old completed restores
   */
  private startCleanupInterval(): void {
    setInterval(() => {
      const now = Date.now();
      const cutoffTime = now - this.CLEANUP_TIMEOUT;

      for (const [restoreId, progress] of this.activeRestores.entries()) {
        // Only cleanup completed or failed restores
        if (progress.status === 'COMPLETED' || progress.status === 'FAILED') {
          const startTime = new Date(progress.startTime).getTime();
          
          if (startTime < cutoffTime) {
            this.cleanup(restoreId);
          }
        }
      }
    }, 5 * 60 * 1000); // Check every 5 minutes
  }
}

/**
 * Get the global RestoreManager instance
 */
export function getRestoreManager(): RestoreManager {
  return RestoreManager.getInstance();
}


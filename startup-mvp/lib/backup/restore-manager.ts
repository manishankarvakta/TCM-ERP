/**
 * Restore Progress Manager
 * 
 * Singleton class for managing active restore operations and progress tracking.
 */

import type { RestoreProgress, RestoreStatus } from '@/types/backup';
import { now } from './utils';

/**
 * Global type declaration for HMR-safe singleton
 */
declare global {
  var restoreManager: RestoreManager | undefined;
}

/**
 * Callback function for progress updates
 */
type ProgressCallback = (progress: RestoreProgress) => void;

/**
 * Singleton class managing active restore operations and their progress
 */
export class RestoreManager {
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
   * Get the singleton instance (HMR-safe)
   */
  public static getInstance(): RestoreManager {
    // Use globalThis to persist across HMR reloads in Next.js
    if (!global.restoreManager) {
      global.restoreManager = new RestoreManager();
      console.log('[RestoreManager] Created new singleton instance');
    }
    return global.restoreManager;
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

    return restoreId;
  }

  /**
   * Update progress for a restore operation
   * @param restoreId - Restore operation ID
   * @param update - Partial progress update
   */
  public updateProgress(restoreId: string, update: Partial<RestoreProgress>): void {
    const current = this.activeRestores.get(restoreId);
    
    if (!current) {
      console.warn(`Attempted to update non-existent restore: ${restoreId}`);
      return;
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
  public getProgress(restoreId: string): RestoreProgress | null {
    return this.activeRestores.get(restoreId) || null;
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
  public exists(restoreId: string): boolean {
    return this.activeRestores.has(restoreId);
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
  private cleanup(restoreId: string): void {
    this.activeRestores.delete(restoreId);
    this.progressCallbacks.delete(restoreId);
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


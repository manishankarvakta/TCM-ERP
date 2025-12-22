/**
 * Progress tracking system for backup and restore operations
 * Uses PostgreSQL database for persistent, cross-instance storage
 */

import { prisma } from "@/lib/prisma";

export interface BackupProgress {
  operationId: string;
  type: 'backup' | 'restore';
  stage: string;
  progress: number; // 0-100
  currentTable?: string;
  currentRecord?: string; // e.g., "User: John Doe" or "Item: ES-130-90"
  totalTables: number;
  completedTables: number;
  totalRecords: number;
  completedRecords: number;
  errors: number;
  status: 'running' | 'completed' | 'failed';
  errorMessage?: string;
  startedAt: Date;
  completedAt?: Date;
}

// Clean up completed operations after 1 hour
const COMPLETED_TTL = 60 * 60 * 1000; // Keep completed for 1 hour

/**
 * Generate a unique operation ID
 */
export function generateOperationId(): string {
  return `op_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Initialize progress tracking for an operation
 */
export async function initProgress(
  operationId: string,
  type: 'backup' | 'restore',
  totalTables: number,
  totalRecords: number = 0
): Promise<void> {
  try {
    await prisma.backupProgress.create({
      data: {
        id: operationId,
        type,
        stage: 'Initializing',
        progress: 0,
        totalTables,
        completedTables: 0,
        totalRecords,
        completedRecords: 0,
        errors: 0,
        status: 'running',
      },
    });
    
    console.log(`[Progress] ✅ Initialized ${type} progress for ${operationId}`, {
      operationId,
      type,
      totalTables,
      totalRecords,
    });
  } catch (error) {
    console.error(`[Progress] ❌ Failed to initialize progress for ${operationId}:`, error);
    throw error;
  }
}

/**
 * Update progress for an operation
 */
export async function updateProgress(
  operationId: string,
  updates: Partial<Omit<BackupProgress, 'operationId' | 'startedAt'>>
): Promise<void> {
  try {
    const data: any = {};
    
    if (updates.stage !== undefined) data.stage = updates.stage;
    if (updates.progress !== undefined) data.progress = updates.progress;
    if (updates.currentTable !== undefined) data.currentTable = updates.currentTable;
    if (updates.currentRecord !== undefined) data.currentRecord = updates.currentRecord;
    if (updates.totalTables !== undefined) data.totalTables = updates.totalTables;
    if (updates.completedTables !== undefined) data.completedTables = updates.completedTables;
    if (updates.totalRecords !== undefined) data.totalRecords = updates.totalRecords;
    if (updates.completedRecords !== undefined) data.completedRecords = updates.completedRecords;
    if (updates.errors !== undefined) data.errors = updates.errors;
    if (updates.status !== undefined) data.status = updates.status;
    if (updates.errorMessage !== undefined) data.errorMessage = updates.errorMessage;
    if (updates.completedAt !== undefined) data.completedAt = updates.completedAt;

    await prisma.backupProgress.update({
      where: { id: operationId },
      data,
    });
    
    console.log(`[Progress] 📊 Updated progress for ${operationId}`, {
      operationId,
      stage: updates.stage,
      progress: updates.progress,
    });
  } catch (error) {
    console.warn(`[Progress] ⚠️ Failed to update progress for ${operationId}:`, error);
    // Don't throw - progress updates shouldn't break the main operation
  }
}

/**
 * Update progress with table and record information
 */
export async function updateProgressWithRecord(
  operationId: string,
  table: string,
  recordIdentifier: string,
  completedRecords: number,
  totalRecords: number
): Promise<void> {
  try {
    // Calculate progress percentage
    const progress = totalRecords > 0 
      ? Math.round((completedRecords / totalRecords) * 100) 
      : 0;

    await prisma.backupProgress.update({
      where: { id: operationId },
      data: {
        currentTable: table,
        currentRecord: recordIdentifier,
        completedRecords,
        totalRecords,
        progress,
      },
    });
  } catch (error) {
    console.warn(`[Progress] ⚠️ Failed to update progress with record for ${operationId}:`, error);
  }
}

/**
 * Mark a table as completed
 */
export async function completeTable(
  operationId: string,
  table: string
): Promise<void> {
  try {
    // Get current progress to calculate new values
    const current = await prisma.backupProgress.findUnique({
      where: { id: operationId },
    });

    if (!current) {
      return;
    }

    const completedTables = current.completedTables + 1;
    const stage = `Completed ${completedTables}/${current.totalTables} tables`;

    // Calculate progress based on tables
    let progress = 0;
    if (current.totalTables > 0) {
      const tableProgress = Math.round((completedTables / current.totalTables) * 100);
      // Combine with record progress if available
      if (current.totalRecords > 0) {
        const recordProgress = Math.round((current.completedRecords / current.totalRecords) * 100);
        progress = Math.round((tableProgress + recordProgress) / 2);
      } else {
        progress = tableProgress;
      }
    }

    await prisma.backupProgress.update({
      where: { id: operationId },
      data: {
        completedTables,
        currentTable: table,
        stage,
        progress,
      },
    });
  } catch (error) {
    console.warn(`[Progress] ⚠️ Failed to complete table for ${operationId}:`, error);
  }
}

/**
 * Mark operation as completed
 */
export async function completeProgress(operationId: string): Promise<void> {
  try {
    await prisma.backupProgress.update({
      where: { id: operationId },
      data: {
        status: 'completed',
        progress: 100,
        completedAt: new Date(),
        stage: 'Completed',
      },
    });
    
    console.log(`[Progress] ✅ Marked ${operationId} as completed`);
  } catch (error) {
    console.warn(`[Progress] ⚠️ Failed to complete progress for ${operationId}:`, error);
  }
}

/**
 * Mark operation as failed
 */
export async function failProgress(operationId: string, errorMessage: string): Promise<void> {
  try {
    await prisma.backupProgress.update({
      where: { id: operationId },
      data: {
        status: 'failed',
        errorMessage,
        completedAt: new Date(),
        stage: 'Failed',
      },
    });
    
    console.log(`[Progress] ❌ Marked ${operationId} as failed: ${errorMessage}`);
  } catch (error) {
    console.warn(`[Progress] ⚠️ Failed to mark progress as failed for ${operationId}:`, error);
  }
}

/**
 * Get current progress for an operation
 */
export async function getProgress(operationId: string): Promise<BackupProgress | null> {
  try {
    const progress = await prisma.backupProgress.findUnique({
      where: { id: operationId },
    });

    if (!progress) {
      console.log(`[Progress] ❌ Progress not found for ${operationId}`);
      return null;
    }

    console.log(`[Progress] ✅ Found progress for ${operationId}`, {
      operationId,
      stage: progress.stage,
      progress: progress.progress,
      status: progress.status,
    });

    // Map database model to interface
    return {
      operationId: progress.id,
      type: progress.type as 'backup' | 'restore',
      stage: progress.stage,
      progress: progress.progress,
      currentTable: progress.currentTable || undefined,
      currentRecord: progress.currentRecord || undefined,
      totalTables: progress.totalTables,
      completedTables: progress.completedTables,
      totalRecords: progress.totalRecords,
      completedRecords: progress.completedRecords,
      errors: progress.errors,
      status: progress.status as 'running' | 'completed' | 'failed',
      errorMessage: progress.errorMessage || undefined,
      startedAt: progress.startedAt,
      completedAt: progress.completedAt || undefined,
    };
  } catch (error) {
    console.error(`[Progress] ❌ Error getting progress for ${operationId}:`, error);
    return null;
  }
}

/**
 * Clean up old completed operations
 */
export async function cleanupOldProgress(): Promise<void> {
  try {
    const cutoffDate = new Date(Date.now() - COMPLETED_TTL);
    
    const result = await prisma.backupProgress.deleteMany({
      where: {
        OR: [
          { status: 'completed' },
          { status: 'failed' },
        ],
        completedAt: {
          lt: cutoffDate,
        },
      },
    });
    
    if (result.count > 0) {
      console.log(`[Progress] 🧹 Cleaned up ${result.count} old progress records`);
    }
  } catch (error) {
    console.error(`[Progress] ❌ Error cleaning up old progress:`, error);
  }
}

// Debug helper to check if progress exists
export async function hasProgress(operationId: string): Promise<boolean> {
  try {
    const count = await prisma.backupProgress.count({
      where: { id: operationId },
    });
    return count > 0;
  } catch (error) {
    console.error(`[Progress] ❌ Error checking progress existence:`, error);
    return false;
  }
}

// Debug helper to get all operation IDs
export async function getAllOperationIds(): Promise<string[]> {
  try {
    const records = await prisma.backupProgress.findMany({
      select: { id: true },
    });
    return records.map(r => r.id);
  } catch (error) {
    console.error(`[Progress] ❌ Error getting all operation IDs:`, error);
    return [];
  }
}

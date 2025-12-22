/**
 * Custom hook for managing backup operations
 */

import { useState, useEffect, useCallback } from 'react';
import type {
  BackupListItem,
  BackupType,
  BackupCreationOptions,
  ApiResponse,
  BackupListResponse,
  BackupCreationResponse,
} from '@/types/backup';
import { isApiSuccess } from '@/types/backup';

interface UseBackupsReturn {
  backups: BackupListItem[];
  loading: boolean;
  error: string | null;
  creating: boolean;
  fetchBackups: () => Promise<void>;
  createBackup: (type: BackupType, options?: BackupCreationOptions) => Promise<void>;
  deleteBackup: (backupId: string) => Promise<void>;
  downloadBackup: (backupId: string) => void;
  uploadBackup: (file: File) => Promise<void>;
  uploading: boolean;
}

export function useBackups(): UseBackupsReturn {
  const [backups, setBackups] = useState<BackupListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [uploading, setUploading] = useState(false);

  /**
   * Fetch all backups from the API
   */
  const fetchBackups = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/backup/list');
      const data: ApiResponse<BackupListResponse> = await response.json();

      if (isApiSuccess(data)) {
        setBackups(data.data.backups);
      } else {
        setError(data.error.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch backups');
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Create a new backup
   */
  const createBackup = useCallback(
    async (type: BackupType, options?: BackupCreationOptions) => {
      setCreating(true);
      setError(null);

      try {
        const response = await fetch('/api/backup/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type, options }),
        });

        const data: ApiResponse<BackupCreationResponse> = await response.json();

        if (isApiSuccess(data)) {
          // Refresh backup list
          await fetchBackups();
        } else {
          setError(data.error.error);
          throw new Error(data.error.error);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to create backup';
        setError(errorMessage);
        throw err;
      } finally {
        setCreating(false);
      }
    },
    [fetchBackups]
  );

  /**
   * Delete a backup
   */
  const deleteBackup = useCallback(
    async (backupId: string) => {
      setError(null);

      try {
        const response = await fetch(`/api/backup/${backupId}`, {
          method: 'DELETE',
        });

        const data: ApiResponse = await response.json();

        if (isApiSuccess(data)) {
          // Remove from local state immediately for better UX
          setBackups((prev) => prev.filter((b) => b.metadata.id !== backupId));
        } else {
          setError(data.error.error);
          throw new Error(data.error.error);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to delete backup';
        setError(errorMessage);
        throw err;
      }
    },
    []
  );

  /**
   * Download a backup file
   */
  const downloadBackup = useCallback((backupId: string) => {
    // Create hidden anchor element and trigger download in same page
    const url = `/api/backup/${backupId}/download`;
    const link = document.createElement('a');
    link.href = url;
    link.download = `${backupId}.zip`;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, []);

  /**
   * Upload a backup file
   */
  const uploadBackup = useCallback(
    async (file: File) => {
      setUploading(true);
      setError(null);

      try {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('/api/backup/upload', {
          method: 'POST',
          body: formData,
        });

        const data: ApiResponse = await response.json();

        if (isApiSuccess(data)) {
          // Refresh backup list
          await fetchBackups();
        } else {
          setError(data.error.error);
          throw new Error(data.error.error);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to upload backup';
        setError(errorMessage);
        throw err;
      } finally {
        setUploading(false);
      }
    },
    [fetchBackups]
  );

  // Fetch backups on mount
  useEffect(() => {
    fetchBackups();
  }, [fetchBackups]);

  return {
    backups,
    loading,
    error,
    creating,
    uploading,
    fetchBackups,
    createBackup,
    deleteBackup,
    downloadBackup,
    uploadBackup,
  };
}


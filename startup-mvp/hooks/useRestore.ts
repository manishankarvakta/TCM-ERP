/**
 * Custom hook for managing restore operations with real-time progress tracking
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import type {
  RestoreProgress,
  RestoreOptions,
  ApiResponse,
  RestoreInitiationResponse,
} from '@/types/backup';
import { isApiSuccess } from '@/types/backup';

interface UseRestoreReturn {
  progress: RestoreProgress | null;
  isRestoring: boolean;
  error: string | null;
  startRestore: (backupId: string, options?: RestoreOptions) => Promise<void>;
  cancelRestore: () => void;
}

export function useRestore(): UseRestoreReturn {
  const [progress, setProgress] = useState<RestoreProgress | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Use ref to store EventSource so it persists across renders
  const eventSourceRef = useRef<EventSource | null>(null);

  /**
   * Start a restore operation
   */
  const startRestore = useCallback(
    async (backupId: string, options?: RestoreOptions) => {
      setError(null);
      setIsRestoring(true);
      setProgress(null);

      try {
        // Step 1: Initiate restore operation
        const response = await fetch(`/api/backup/${backupId}/restore`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ options: options || {} }),
        });

        const data: ApiResponse<RestoreInitiationResponse> = await response.json();

        if (!isApiSuccess(data)) {
          throw new Error(data.error.error);
        }

        const { restoreId, progressUrl } = data.data;

        console.log(`[Restore] Started restore ${restoreId}, connecting to SSE...`);

        // Step 2: Connect to SSE for progress updates
        const eventSource = new EventSource(progressUrl);
        eventSourceRef.current = eventSource;

        eventSource.onmessage = (event) => {
          try {
            const progressData: RestoreProgress = JSON.parse(event.data);
            setProgress(progressData);

            // Check if restore is complete or failed
            if (progressData.status === 'COMPLETED') {
              console.log('[Restore] Restore completed successfully');
              setIsRestoring(false);
              eventSource.close();
              eventSourceRef.current = null;
            } else if (progressData.status === 'FAILED') {
              console.error('[Restore] Restore failed:', progressData.error);
              setError(progressData.error || 'Restore failed');
              setIsRestoring(false);
              eventSource.close();
              eventSourceRef.current = null;
            }
          } catch (err) {
            console.error('[Restore] Failed to parse progress data:', err);
          }
        };

        eventSource.onerror = (err) => {
          console.error('[Restore] SSE connection error:', err);
          setError('Lost connection to restore progress stream');
          setIsRestoring(false);
          eventSource.close();
          eventSourceRef.current = null;
        };
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to start restore';
        setError(errorMessage);
        setIsRestoring(false);
        throw err;
      }
    },
    []
  );

  /**
   * Cancel the current restore operation
   */
  const cancelRestore = useCallback(() => {
    if (eventSourceRef.current) {
      console.log('[Restore] Cancelling restore...');
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    setIsRestoring(false);
    setProgress(null);
    setError('Restore cancelled by user');
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, []);

  return {
    progress,
    isRestoring,
    error,
    startRestore,
    cancelRestore,
  };
}


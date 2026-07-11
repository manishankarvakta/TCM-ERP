/**
 * GET /api/backup/restore/[restoreId]/progress
 * Server-Sent Events endpoint for real-time restore progress
 */

import { NextRequest } from 'next/server';
import { getRestoreManager } from '@/lib/backup/restore-manager';
import { SSE_KEEPALIVE_INTERVAL } from '@/lib/backup/config';

interface RouteContext {
  params: Promise<{
    restoreId: string;
  }>;
}

export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  const { restoreId } = await context.params;
  const manager = getRestoreManager();

  // Check if restore exists
  if (!manager.exists(restoreId)) {
    return new Response(
      JSON.stringify({
        error: 'Restore operation not found',
      }),
      {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  // Create SSE stream
  const stream = new ReadableStream({
    start(controller) {
      let isClosed = false;
      const encoder = new TextEncoder();
      let isClosed = false;
      let unsubscribe: (() => void) | null = null;
      let keepAliveInterval: NodeJS.Timeout | null = null;
      let timeoutId: NodeJS.Timeout | null = null;

      const cleanup = () => {
        if (isClosed) return;
        isClosed = true;

        if (keepAliveInterval) clearInterval(keepAliveInterval);
        if (timeoutId) clearTimeout(timeoutId);
        if (unsubscribe) {
          try {
            unsubscribe();
          } catch (e) {
            // Ignore
          }
        }

        try {
          controller.close();
        } catch (e) {
          // Ignore
        }
      };

      const safeClose = () => {
        if (!isClosed) {
          isClosed = true;
          try {
            controller.close();
          } catch (e) {
            // Ignore if already closed
          }
        }
      };

      // Send data helper
      const sendData = (data: any) => {
        if (isClosed) return;
<<<<<<< HEAD
        try {
          const message = `data: ${JSON.stringify(data)}\n\n`;
          controller.enqueue(encoder.encode(message));
        } catch (error) {
          cleanup();
=======
        const message = `data: ${JSON.stringify(data)}\n\n`;
        try {
          controller.enqueue(encoder.encode(message));
        } catch (e) {
          isClosed = true;
>>>>>>> 4ad3d1a5cf2ce2fb4ed496f7b788e565b63db387
        }
      };

      // Send initial progress
      const initialProgress = manager.getProgress(restoreId);
      if (initialProgress) {
        sendData(initialProgress);
      }

      // Subscribe to progress updates
      unsubscribe = manager.subscribeToProgress(restoreId, (progress) => {
        sendData(progress);

        // Close stream when restore is completed or failed
        if (progress.status === 'COMPLETED' || progress.status === 'FAILED') {
          setTimeout(() => {
<<<<<<< HEAD
            cleanup();
=======
            safeClose();
>>>>>>> 4ad3d1a5cf2ce2fb4ed496f7b788e565b63db387
          }, 1000); // Give client time to receive final update
        }
      });

      // Keep-alive ping to prevent connection timeout
<<<<<<< HEAD
      keepAliveInterval = setInterval(() => {
        if (isClosed) return;
=======
      const keepAliveInterval = setInterval(() => {
        if (isClosed) {
          clearInterval(keepAliveInterval);
          return;
        }
>>>>>>> 4ad3d1a5cf2ce2fb4ed496f7b788e565b63db387
        try {
          controller.enqueue(encoder.encode(': keep-alive\n\n'));
        } catch (error) {
<<<<<<< HEAD
          cleanup();
=======
          // Connection closed
          isClosed = true;
          clearInterval(keepAliveInterval);
>>>>>>> 4ad3d1a5cf2ce2fb4ed496f7b788e565b63db387
        }
      }, SSE_KEEPALIVE_INTERVAL);

      // Cleanup on connection close
      request.signal.addEventListener('abort', () => {
        console.log(`[SSE] Client disconnected from restore ${restoreId}`);
<<<<<<< HEAD
        cleanup();
=======
        clearInterval(keepAliveInterval);
        unsubscribe();
        safeClose();
>>>>>>> 4ad3d1a5cf2ce2fb4ed496f7b788e565b63db387
      });

      // Auto-close after timeout if restore is stuck
      timeoutId = setTimeout(() => {
        const currentProgress = manager.getProgress(restoreId);
        if (
          currentProgress &&
          currentProgress.status !== 'COMPLETED' &&
          currentProgress.status !== 'FAILED'
        ) {
          console.warn(`[SSE] Restore ${restoreId} timed out`);
          sendData({
            ...currentProgress,
            status: 'FAILED',
            error: 'Restore operation timed out',
          });
        }
<<<<<<< HEAD
        cleanup();
=======
        clearInterval(keepAliveInterval);
        unsubscribe();
        safeClose();
>>>>>>> 4ad3d1a5cf2ce2fb4ed496f7b788e565b63db387
      }, 60 * 60 * 1000); // 1 hour timeout
    },
  });

  // Return SSE response
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable nginx buffering
    },
  });
}


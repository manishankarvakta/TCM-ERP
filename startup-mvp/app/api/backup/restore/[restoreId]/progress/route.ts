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
      const encoder = new TextEncoder();

      // Send data helper
      const sendData = (data: any) => {
        const message = `data: ${JSON.stringify(data)}\n\n`;
        controller.enqueue(encoder.encode(message));
      };

      // Send initial progress
      const initialProgress = manager.getProgress(restoreId);
      if (initialProgress) {
        sendData(initialProgress);
      }

      // Subscribe to progress updates
      const unsubscribe = manager.subscribeToProgress(restoreId, (progress) => {
        sendData(progress);

        // Close stream when restore is completed or failed
        if (progress.status === 'COMPLETED' || progress.status === 'FAILED') {
          setTimeout(() => {
            controller.close();
          }, 1000); // Give client time to receive final update
        }
      });

      // Keep-alive ping to prevent connection timeout
      const keepAliveInterval = setInterval(() => {
        try {
          // Send comment as keep-alive (doesn't trigger 'message' event in client)
          controller.enqueue(encoder.encode(': keep-alive\n\n'));
        } catch (error) {
          // Connection closed
          clearInterval(keepAliveInterval);
        }
      }, SSE_KEEPALIVE_INTERVAL);

      // Cleanup on connection close
      request.signal.addEventListener('abort', () => {
        console.log(`[SSE] Client disconnected from restore ${restoreId}`);
        clearInterval(keepAliveInterval);
        unsubscribe();
        controller.close();
      });

      // Auto-close after timeout if restore is stuck
      const timeoutId = setTimeout(() => {
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
        clearInterval(keepAliveInterval);
        unsubscribe();
        controller.close();
      }, 60 * 60 * 1000); // 1 hour timeout

      // Cleanup timeout on manual close
      request.signal.addEventListener('abort', () => {
        clearTimeout(timeoutId);
      });
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


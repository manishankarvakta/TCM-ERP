import { createActivityRecord } from './activity-ledger';
import { createNotification } from './notifications';
import { SystemEventPayload } from './types';
import { ActivityType } from './activity-types';
import { redis } from '../redis';

/**
 * Unified System Event Emitter
 * Handles logging to timeline, sending notifications, and publishing realtime Socket events.
 */
export async function emitSystemEvent(payload: SystemEventPayload) {
  // 1. Log to Timeline (Always)
  try {
    await createActivityRecord({
      type: payload.eventType || ActivityType.STATUS_CHANGED,
      actorId: payload.actorId,
      subject: payload.description || `System Event: ${payload.eventType}`,
      description: payload.description,
      contextType: payload.entityType,
      contextId: payload.entityId,
      metadata: payload.metadata as any,
    });
  } catch (error) {
    console.error(`[System] Failed to log timeline event for ${payload.entityType}:${payload.entityId}`, error);
    // Suppress error to avoid failing the main action
  }

  // 2. Broadcast to Realtime Socket.IO Engine via Redis
  try {
    const room = `entity:${payload.entityType}:${payload.entityId}`;
    redis.publish('realtime-events', JSON.stringify({
      room,
      event: payload.eventType || 'SYSTEM_EVENT',
      data: payload
    })).catch(err => {
       console.error(`[System] Redis emit failed (silent)`, err);
    });
  } catch (error) {
    console.error(`[System] Failed to broadcast realtime event`, error);
  }

  // 3. Send Notification (If configured)
  if (payload.notification) {
    try {
        await createNotification({
            recipientId: payload.notification.recipientId,
            type: payload.notification.type,
            title: payload.notification.title,
            message: payload.notification.message,
            entityType: payload.entityType,
            entityId: payload.entityId
        });
    } catch (error) {
        console.error(`[System] Failed to send notification to ${payload.notification.recipientId}`, error);
    }
  }
}

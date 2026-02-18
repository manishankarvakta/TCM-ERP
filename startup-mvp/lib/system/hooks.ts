import { createActivityRecord } from './activity-ledger';
import { createNotification } from './notifications';
import { SystemEventPayload } from './types';
import { ActivityType } from './activity-types';

/**
 * Unified System Event Emitter
 * Handles logging to timeline and sending notifications in a safe, non-blocking way.
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

  // 2. Send Notification (If configured)
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

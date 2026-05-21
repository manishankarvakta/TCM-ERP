import { redis } from "@/lib/redis";

/**
 * Enterprise Realtime Publisher
 * 
 * Safely offloads websocket broadcasting to the external Socket.IO Node worker
 * via Redis Pub/Sub, preventing Next.js API timeouts during heavy collaboration.
 */

export const RealtimeEvents = {
    PROJECT_UPDATED: "PROJECT_UPDATED",
    TASK_UPDATED: "TASK_UPDATED",
    TASK_MOVED: "TASK_MOVED",
    NOTIFICATION_RECEIVED: "NOTIFICATION_RECEIVED"
} as const;

/**
 * Broadcasts an event to all users currently viewing a specific Project Workspace.
 */
export function broadcastProjectEvent(projectId: string, event: keyof typeof RealtimeEvents, payload: any) {
    try {
        const message = JSON.stringify({
            room: `entity:project:${projectId}`,
            event: RealtimeEvents[event],
            data: payload
        });
        
        // Fire and Forget - Non-blocking
        redis.publish("realtime-events", message).catch((err) => {
            console.error("[Realtime] Failed to publish project event to Redis:", err);
        });
    } catch (error) {
        console.error("[Realtime] Payload serialization error:", error);
    }
}

/**
 * Broadcasts a private event directly to a specific user's personal inbox room.
 */
export function broadcastUserEvent(userId: string, event: keyof typeof RealtimeEvents, payload: any) {
    try {
        const message = JSON.stringify({
            room: `user:${userId}`,
            event: RealtimeEvents[event],
            data: payload
        });
        
        // Fire and Forget - Non-blocking
        redis.publish("realtime-events", message).catch((err) => {
            console.error("[Realtime] Failed to publish user event to Redis:", err);
        });
    } catch (error) {
        console.error("[Realtime] Payload serialization error:", error);
    }
}

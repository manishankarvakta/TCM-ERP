import { prisma } from "@/lib/prisma";
import { SystemEntityType, SystemNotificationType } from "./types";
import { broadcastUserEvent } from "./realtime";

export const SystemNotificationDomain = {
  async create(data: {
    title: string;
    message: string;
    type: SystemNotificationType;
    recipientId: string;
    entityType?: SystemEntityType;
    entityId?: string;
    createdBy?: string;
  }) {
    // Maps to Notification model in schema
    const notification = await (prisma as any).notification.create({
      data: {
        title: data.title,
        message: data.message,
        type: data.type, // Make sure enum or string matches
        userId: data.recipientId, // Schema uses userId
        entityType: data.entityType,
        entityId: data.entityId,
        createdBy: data.createdBy,
        isRead: false,
      },
    });

    try {
      broadcastUserEvent(data.recipientId, "NOTIFICATION_RECEIVED", {
        title: data.title,
        message: data.message,
        type: data.type,
        entityType: data.entityType,
        entityId: data.entityId,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("[Realtime Notification] Failed to broadcast to user:", error);
    }

    return notification;
  },

  async markAsRead(id: string) {
    return await prisma.notification.update({
      where: { id },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
  },

  async markAllAsRead(userId: string) {
    return await prisma.notification.updateMany({
      where: {
        userId,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
  },

  async getUnread(userId: string) {
    return await prisma.notification.findMany({
      where: {
        userId,
        isRead: false,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  },
  
  async getAll(userId: string, limit = 50) {
      return await prisma.notification.findMany({
          where: { userId },
          orderBy: { createdAt: "desc" },
          take: limit
      });
  }
};

// Aliased helper
export const createNotification = SystemNotificationDomain.create;

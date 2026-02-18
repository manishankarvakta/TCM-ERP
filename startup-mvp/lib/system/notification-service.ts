import { prisma } from "@/lib/prisma";
import { EntityRef } from "./entity-ref";

export const NotificationService = {
  async createNotification(
    userId: string,
    type: string,
    title: string,
    message: string,
    entityRef?: EntityRef
  ) {
    return await prisma.notification.create({
      data: {
        userId,
        type,
        title,
        message,
        entityType: entityRef?.entityType,
        entityId: entityRef?.entityId,
      },
    });
  },

  async createBulkNotification(
    userIds: string[],
    type: string,
    title: string,
    message: string,
    entityRef?: EntityRef
  ) {
    if (userIds.length === 0) return;

    return await prisma.notification.createMany({
      data: userIds.map((userId) => ({
        userId,
        type,
        title,
        message,
        entityType: entityRef?.entityType,
        entityId: entityRef?.entityId,
      })),
    });
  },
  
  async getUserNotifications(userId: string, limit = 50) {
      return await prisma.notification.findMany({
          where: { userId },
          orderBy: { createdAt: 'desc' },
          take: limit
      });
  },
  
  async markNotificationRead(id: string) {
      return await prisma.notification.update({
          where: { id },
          data: { isRead: true } // Note: readAt was not in requested fields, but I kept it in schema. 
          // User requested: markNotificationRead. 
          // I will just update isRead as per request.
      });
  },
  
  async markAllRead(userId: string) {
      return await prisma.notification.updateMany({
          where: { userId, isRead: false },
          data: { isRead: true }
      });
  }
};
